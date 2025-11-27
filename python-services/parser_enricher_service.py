#!/usr/bin/env python3
"""
StackLens OTEL Parser/Enricher Service

Phase 2 of the OpenTelemetry Pipeline

This service:
1. Consumes raw logs from the 'otel-logs' Kafka topic
2. Validates logs against the log schema
3. Enriches logs with metadata (geo, host, environment)
4. Produces enriched logs to the 'stacklens-enriched' topic
5. Handles errors and dead-letter queueing

Architecture:
  otel-logs (Kafka) → Parser → Validator → Enricher → stacklens-enriched (Kafka)
                                ↓ (invalid)
                          stacklens-dlq (Kafka)

Environment Variables:
  KAFKA_BOOTSTRAP_SERVERS - Kafka servers (default: localhost:9092)
  KAFKA_INPUT_TOPIC - Input topic (default: otel-logs)
  KAFKA_OUTPUT_TOPIC - Output topic (default: stacklens-enriched)
  KAFKA_DLQ_TOPIC - Dead letter queue topic (default: stacklens-dlq)
  POSTGRES_URL - PostgreSQL connection string
  LOG_LEVEL - Logging level (default: INFO)
  BATCH_SIZE - Number of logs to process before flushing (default: 100)
  FLUSH_INTERVAL - Seconds between flushes (default: 5)
"""

import os
import sys
import json
import logging
import time
import gzip
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import uuid

from kafka import KafkaConsumer, KafkaProducer
from kafka.errors import KafkaError
import psycopg2
import psycopg2.extras
from psycopg2.pool import SimpleConnectionPool

# =====================================================================
# Configuration
# =====================================================================

KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092').split(',')
KAFKA_INPUT_TOPIC = os.getenv('KAFKA_INPUT_TOPIC', 'otel-logs')
KAFKA_OUTPUT_TOPIC = os.getenv('KAFKA_OUTPUT_TOPIC', 'stacklens-enriched')
KAFKA_DLQ_TOPIC = os.getenv('KAFKA_DLQ_TOPIC', 'stacklens-dlq')
POSTGRES_URL = os.getenv('POSTGRES_URL', 'postgresql://stacklens:stacklens_dev@localhost:5432/stacklens')
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
BATCH_SIZE = int(os.getenv('BATCH_SIZE', '100'))
FLUSH_INTERVAL = int(os.getenv('FLUSH_INTERVAL', '5'))
SERVICE_NAME = 'stacklens-parser-enricher'
SERVICE_VERSION = '1.0.0'

# =====================================================================
# Logging Setup
# =====================================================================

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='[%(asctime)s] [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

# =====================================================================
# Data Models
# =====================================================================

class LogSeverity(Enum):
    """Log severity levels"""
    DEBUG = 'debug'
    INFO = 'info'
    WARN = 'warn'
    ERROR = 'error'
    CRITICAL = 'critical'


@dataclass
class EnrichedLog:
    """Enriched log record with metadata"""
    timestamp: str
    service: str
    level: str
    message: str
    trace_id: Optional[str] = None
    span_id: Optional[str] = None
    request_id: Optional[str] = None
    user_id: Optional[str] = None
    product_id: Optional[str] = None
    error_code: Optional[str] = None
    status: Optional[int] = None
    action: Optional[str] = None
    app_version: Optional[str] = None
    
    # Enrichment fields
    geo_country: Optional[str] = None
    geo_region: Optional[str] = None
    hostname: Optional[str] = None
    environment: Optional[str] = None
    parsed_at: str = None  # When parsed
    enriched_at: str = None  # When enriched
    parser_version: str = SERVICE_VERSION
    
    def __post_init__(self):
        if self.parsed_at is None:
            self.parsed_at = datetime.utcnow().isoformat() + 'Z'
        if self.enriched_at is None:
            self.enriched_at = datetime.utcnow().isoformat() + 'Z'
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)
    
    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict())


# =====================================================================
# Schema Validator
# =====================================================================

class SchemaValidator:
    """Validates logs against the log schema"""
    
    REQUIRED_FIELDS = {'timestamp', 'service', 'level', 'message'}
    VALID_LEVELS = {'debug', 'info', 'warn', 'error', 'critical'}
    
    def __init__(self):
        self.total_validated = 0
        self.total_valid = 0
        self.total_invalid = 0
    
    def validate(self, log_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Validate log against schema.
        
        Returns: (is_valid, error_message)
        """
        self.total_validated += 1
        
        # Check required fields
        missing_fields = self.REQUIRED_FIELDS - set(log_data.keys())
        if missing_fields:
            error = f"Missing required fields: {missing_fields}"
            self.total_invalid += 1
            return False, error
        
        # Validate types
        if not isinstance(log_data.get('timestamp'), str):
            self.total_invalid += 1
            return False, "timestamp must be string (ISO 8601)"
        
        if not isinstance(log_data.get('service'), str):
            self.total_invalid += 1
            return False, "service must be string"
        
        if not isinstance(log_data.get('message'), str):
            self.total_invalid += 1
            return False, "message must be string"
        
        # Validate level
        level = log_data.get('level', '').lower()
        if level not in self.VALID_LEVELS:
            self.total_invalid += 1
            return False, f"Invalid level. Must be one of: {self.VALID_LEVELS}"
        
        # Validate timestamp format (basic check)
        try:
            datetime.fromisoformat(log_data['timestamp'].replace('Z', '+00:00'))
        except (ValueError, TypeError):
            self.total_invalid += 1
            return False, "timestamp must be ISO 8601 format"
        
        self.total_valid += 1
        return True, None
    
    def get_stats(self) -> Dict[str, int]:
        """Get validation statistics"""
        return {
            'total_validated': self.total_validated,
            'total_valid': self.total_valid,
            'total_invalid': self.total_invalid,
        }


# =====================================================================
# Metadata Enricher
# =====================================================================

class MetadataEnricher:
    """Enriches logs with metadata"""
    
    def __init__(self, db_pool=None):
        self.db_pool = db_pool
        self.total_enriched = 0
        self.geo_cache = {}  # Simple cache for geo lookups
        self.host_info = self._get_host_info()
    
    def _get_host_info(self) -> Dict[str, str]:
        """Get host information"""
        import socket
        try:
            return {
                'hostname': socket.gethostname(),
                'environment': os.getenv('ENVIRONMENT', 'development'),
            }
        except Exception as e:
            logger.warning(f"Failed to get host info: {e}")
            return {
                'hostname': 'unknown',
                'environment': os.getenv('ENVIRONMENT', 'development'),
            }
    
    def enrich(self, log: EnrichedLog) -> EnrichedLog:
        """
        Enrich log with metadata.
        
        Adds:
        - hostname
        - environment
        - geo information (if IP available in future)
        - parsing metadata
        """
        self.total_enriched += 1
        
        # Add host information
        log.hostname = self.host_info['hostname']
        log.environment = self.host_info['environment']
        
        # Add enrichment timestamp
        log.enriched_at = datetime.utcnow().isoformat() + 'Z'
        
        return log
    
    def get_stats(self) -> Dict[str, Any]:
        """Get enrichment statistics"""
        return {
            'total_enriched': self.total_enriched,
            'host_info': self.host_info,
        }


# =====================================================================
# Parser/Enricher Service
# =====================================================================

class ParserEnricherService:
    """
    Main service: consumes logs, validates, enriches, and produces.
    """
    
    def __init__(self):
        logger.info(f"Initializing {SERVICE_NAME} v{SERVICE_VERSION}")
        
        # Initialize components
        self.validator = SchemaValidator()
        self.enricher = MetadataEnricher()
        
        # Initialize Kafka consumer
        self.consumer = KafkaConsumer(
            KAFKA_INPUT_TOPIC,
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            group_id=f'{SERVICE_NAME}-{uuid.uuid4().hex[:8]}',
            auto_offset_reset='earliest',
            value_deserializer=lambda m: json.loads(m.decode('utf-8')) if m else None,
            max_poll_records=BATCH_SIZE,
            session_timeout_ms=30000,
            heartbeat_interval_ms=10000,
        )
        
        # Initialize Kafka producer
        self.producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            acks='all',
            retries=3,
            request_timeout_ms=30000,
        )
        
        # Initialize PostgreSQL connection pool
        try:
            self.db_pool = SimpleConnectionPool(1, 5, POSTGRES_URL)
        except Exception as e:
            logger.error(f"Failed to initialize database pool: {e}")
            self.db_pool = None
        
        # Statistics
        self.stats = {
            'started_at': datetime.utcnow().isoformat(),
            'total_consumed': 0,
            'total_produced': 0,
            'total_dlq': 0,
        }
        
        logger.info(f"✓ {SERVICE_NAME} initialized successfully")
        logger.info(f"  Input topic: {KAFKA_INPUT_TOPIC}")
        logger.info(f"  Output topic: {KAFKA_OUTPUT_TOPIC}")
        logger.info(f"  DLQ topic: {KAFKA_DLQ_TOPIC}")
    
    def _extract_otel_log(self, raw_log: Dict[str, Any]) -> Dict[str, Any]:
        """Extract log fields from OTLP format"""
        try:
            # Handle OTLP resourceLogs format
            if 'resourceLogs' in raw_log:
                resource_logs = raw_log['resourceLogs']
                if resource_logs and len(resource_logs) > 0:
                    resource = resource_logs[0].get('resource', {})
                    scope_logs = resource_logs[0].get('scopeLogs', [])
                    
                    if scope_logs and len(scope_logs) > 0:
                        log_records = scope_logs[0].get('logRecords', [])
                        if log_records:
                            record = log_records[0]
                            
                            # Extract fields
                            timestamp = self._convert_unix_nano_to_iso(
                                record.get('timeUnixNano')
                            )
                            
                            body = record.get('body', {})
                            message = body.get('stringValue', '')
                            
                            attributes = {}
                            for attr in record.get('attributes', []):
                                key = attr.get('key')
                                value = attr.get('value', {}).get('stringValue')
                                if key and value:
                                    attributes[key] = value
                            
                            return {
                                'timestamp': timestamp,
                                'service': attributes.get('service.name', 'unknown'),
                                'level': attributes.get('log.level', 'info').lower(),
                                'message': message,
                                'trace_id': attributes.get('trace_id'),
                                'span_id': attributes.get('span_id'),
                                'request_id': attributes.get('request_id'),
                                'user_id': attributes.get('user_id'),
                                'product_id': attributes.get('product_id'),
                                'error_code': attributes.get('error_code'),
                                'status': int(attributes.get('status', 0)) if attributes.get('status') else None,
                                'action': attributes.get('action'),
                                'app_version': attributes.get('app_version'),
                            }
            
            # Handle direct format (already parsed)
            if all(k in raw_log for k in ['timestamp', 'service', 'message']):
                return raw_log
            
        except Exception as e:
            logger.warning(f"Error extracting OTLP log: {e}")
        
        return None
    
    def _convert_unix_nano_to_iso(self, unix_nano: str) -> str:
        """Convert Unix nanoseconds to ISO 8601 format"""
        try:
            if unix_nano:
                seconds = int(unix_nano) / 1e9
                dt = datetime.utcfromtimestamp(seconds)
                return dt.isoformat() + 'Z'
        except Exception:
            pass
        
        return datetime.utcnow().isoformat() + 'Z'
    
    def _store_log(self, enriched_log: EnrichedLog) -> bool:
        """Store enriched log in PostgreSQL"""
        if not self.db_pool:
            return False
        
        try:
            conn = self.db_pool.getconn()
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO enriched_logs (
                    timestamp, service, level, message,
                    trace_id, span_id, request_id, user_id,
                    product_id, error_code, status, action,
                    app_version, hostname, environment,
                    parsed_at, enriched_at, parser_version
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                enriched_log.timestamp,
                enriched_log.service,
                enriched_log.level,
                enriched_log.message,
                enriched_log.trace_id,
                enriched_log.span_id,
                enriched_log.request_id,
                enriched_log.user_id,
                enriched_log.product_id,
                enriched_log.error_code,
                enriched_log.status,
                enriched_log.action,
                enriched_log.app_version,
                enriched_log.hostname,
                enriched_log.environment,
                enriched_log.parsed_at,
                enriched_log.enriched_at,
                enriched_log.parser_version,
            ))
            
            conn.commit()
            self.db_pool.putconn(conn)
            return True
        except Exception as e:
            logger.error(f"Error storing log in database: {e}")
            return False
    
    def process_message(self, key: bytes, value: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Process a single message.
        
        Returns: (success, error_message)
        """
        try:
            # Extract log from OTLP format
            extracted_log = self._extract_otel_log(value)
            if not extracted_log:
                return False, "Failed to extract log fields"
            
            # Validate
            is_valid, error = self.validator.validate(extracted_log)
            if not is_valid:
                return False, f"Validation failed: {error}"
            
            # Create enriched log
            enriched_log = EnrichedLog(**{
                k: v for k, v in extracted_log.items()
                if k in EnrichedLog.__dataclass_fields__
            })
            
            # Enrich
            enriched_log = self.enricher.enrich(enriched_log)
            
            # Store in database
            self._store_log(enriched_log)
            
            # Produce to output topic
            future = self.producer.send(
                KAFKA_OUTPUT_TOPIC,
                key=key,
                value=enriched_log.to_dict()
            )
            
            # Wait for send to complete
            try:
                record_metadata = future.get(timeout=10)
                logger.debug(f"Produced to {record_metadata.topic}:{record_metadata.partition}:{record_metadata.offset}")
            except KafkaError as e:
                logger.error(f"Failed to produce message: {e}")
                return False, f"Kafka produce error: {e}"
            
            self.stats['total_produced'] += 1
            return True, None
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            return False, str(e)
    
    def send_to_dlq(self, key: bytes, value: Dict[str, Any], error: str):
        """Send failed message to dead letter queue"""
        try:
            dlq_message = {
                'original_message': value,
                'error': error,
                'sent_to_dlq_at': datetime.utcnow().isoformat() + 'Z',
                'service': SERVICE_NAME,
            }
            
            self.producer.send(KAFKA_DLQ_TOPIC, key=key, value=dlq_message)
            self.stats['total_dlq'] += 1
            logger.warning(f"Sent message to DLQ: {error}")
        except Exception as e:
            logger.error(f"Failed to send to DLQ: {e}")
    
    def run(self):
        """Main service loop"""
        logger.info("Starting message processing loop...")
        
        last_flush = time.time()
        batch_count = 0
        
        try:
            for message in self.consumer:
                try:
                    self.stats['total_consumed'] += 1
                    batch_count += 1
                    
                    # Process message
                    success, error = self.process_message(message.key, message.value)
                    
                    if not success:
                        self.send_to_dlq(message.key, message.value, error or "Unknown error")
                    
                    # Flush if batch full or timeout reached
                    if batch_count >= BATCH_SIZE or (time.time() - last_flush) >= FLUSH_INTERVAL:
                        self.producer.flush()
                        elapsed = time.time() - last_flush
                        logger.info(f"Flushed {batch_count} messages in {elapsed:.2f}s | " +
                                  f"Total: consumed={self.stats['total_consumed']}, " +
                                  f"produced={self.stats['total_produced']}, " +
                                  f"dlq={self.stats['total_dlq']}")
                        batch_count = 0
                        last_flush = time.time()
                    
                except Exception as e:
                    logger.error(f"Error in message processing loop: {e}")
                    self.send_to_dlq(message.key, message.value, str(e))
        
        except KeyboardInterrupt:
            logger.info("Received shutdown signal")
        
        finally:
            self.shutdown()
    
    def shutdown(self):
        """Graceful shutdown"""
        logger.info("Shutting down gracefully...")
        
        try:
            self.producer.flush()
            self.producer.close()
            logger.info("✓ Kafka producer closed")
        except Exception as e:
            logger.error(f"Error closing producer: {e}")
        
        try:
            self.consumer.close()
            logger.info("✓ Kafka consumer closed")
        except Exception as e:
            logger.error(f"Error closing consumer: {e}")
        
        if self.db_pool:
            try:
                self.db_pool.closeall()
                logger.info("✓ Database connections closed")
            except Exception as e:
                logger.error(f"Error closing database pool: {e}")
        
        # Log final statistics
        logger.info("Final Statistics:")
        logger.info(f"  Started: {self.stats['started_at']}")
        logger.info(f"  Total consumed: {self.stats['total_consumed']}")
        logger.info(f"  Total produced: {self.stats['total_produced']}")
        logger.info(f"  Total DLQ: {self.stats['total_dlq']}")
        logger.info(f"  Validation stats: {self.validator.get_stats()}")
        logger.info(f"  Enrichment stats: {self.enricher.get_stats()}")
        logger.info("✓ Service stopped")


# =====================================================================
# Main
# =====================================================================

def main():
    """Main entry point"""
    try:
        service = ParserEnricherService()
        service.run()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
