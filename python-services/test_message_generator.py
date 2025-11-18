#!/usr/bin/env python3
"""
Phase 2 Test Message Generator - OTEL Log Format

This script generates test messages in OTEL (OpenTelemetry) protocol format
and sends them to Kafka for the Parser/Enricher Service to process.

Usage:
    python test_message_generator.py --count 10 --topic otel-logs --broker localhost:9092
    
Output:
    - OTEL formatted logs sent to Kafka
    - Test report with processing results
"""

import json
import uuid
import argparse
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any
from kafka import KafkaProducer
from kafka.errors import KafkaError
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='[%(asctime)s] [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)


class OTELMessageGenerator:
    """Generate OTEL protocol formatted log messages"""
    
    SERVICES = [
        "order-service",
        "payment-service",
        "user-service",
        "inventory-service",
        "notification-service",
    ]
    
    LOG_LEVELS = [
        ("DEBUG", 1),
        ("INFO", 9),
        ("WARN", 13),
        ("ERROR", 17),
        ("CRITICAL", 21),
    ]
    
    MESSAGES = {
        "order-service": [
            "Order created successfully",
            "Payment processing started",
            "Inventory reserved",
            "Order failed: payment declined",
            "Order confirmed and shipped",
        ],
        "payment-service": [
            "Payment authorized",
            "Payment captured",
            "Payment failed: insufficient funds",
            "Refund processed",
            "Transaction timeout",
        ],
        "user-service": [
            "User logged in",
            "User registered",
            "Profile updated",
            "Password reset requested",
            "2FA verification failed",
        ],
        "inventory-service": [
            "Stock updated",
            "Low stock alert",
            "Item out of stock",
            "Inventory sync completed",
            "Warehouse transfer initiated",
        ],
        "notification-service": [
            "Email sent successfully",
            "SMS delivery confirmed",
            "Push notification sent",
            "Email bounce received",
            "Notification queue overflowing",
        ],
    }
    
    ACTIONS = [
        "CREATE",
        "READ",
        "UPDATE",
        "DELETE",
        "PROCESS",
        "VERIFY",
        "SYNC",
        "TRANSFORM",
    ]
    
    @staticmethod
    def generate_otel_log(
        service: str = None,
        level: str = None,
        message: str = None,
        error: bool = False,
        include_correlation_ids: bool = True,
    ) -> Dict[str, Any]:
        """
        Generate a single OTEL protocol log message
        
        Args:
            service: Service name (random if None)
            level: Log level (random if None)
            message: Log message (random if None)
            error: Include error details
            include_correlation_ids: Include trace/span IDs
            
        Returns:
            OTEL formatted log dict
        """
        if service is None:
            service = OTELMessageGenerator.SERVICES[
                hash(time.time()) % len(OTELMessageGenerator.SERVICES)
            ]
        
        if level is None:
            level, severity = OTELMessageGenerator.LOG_LEVELS[
                hash(time.time()) % len(OTELMessageGenerator.LOG_LEVELS)
            ]
        else:
            severity = next(
                (s for l, s in OTELMessageGenerator.LOG_LEVELS if l == level),
                9
            )
        
        if message is None:
            messages = OTELMessageGenerator.MESSAGES.get(service, ["Log entry"])
            message = messages[hash(time.time()) % len(messages)]
        
        # Generate IDs
        request_id = str(uuid.uuid4())
        trace_id = uuid.uuid4().hex
        span_id = uuid.uuid4().hex[:16]
        
        # Timestamps
        now = datetime.utcnow()
        unix_nano = int(now.timestamp() * 1e9)
        
        # Build attributes
        attributes = [
            {"key": "request_id", "value": {"stringValue": request_id}},
            {"key": "user_id", "value": {"stringValue": f"user-{uuid.uuid4().hex[:8]}"}},
            {"key": "action", "value": {"stringValue": OTELMessageGenerator.ACTIONS[hash(time.time()) % len(OTELMessageGenerator.ACTIONS)]}},
            {"key": "log.level", "value": {"stringValue": level}},
        ]
        
        if include_correlation_ids:
            attributes.extend([
                {"key": "trace_id", "value": {"stringValue": trace_id}},
                {"key": "span_id", "value": {"stringValue": span_id}},
            ])
        
        if error:
            attributes.extend([
                {"key": "error_code", "value": {"stringValue": f"ERR-{uuid.uuid4().hex[:4].upper()}"}},
                {"key": "error_message", "value": {"stringValue": "Detailed error information"}},
            ])
        
        # Build OTEL log
        otel_log = {
            "resourceLogs": [
                {
                    "resource": {
                        "attributes": [
                            {"key": "service.name", "value": {"stringValue": service}},
                            {"key": "service.version", "value": {"stringValue": "1.0.0"}},
                            {"key": "service.instance.id", "value": {"stringValue": f"pod-{uuid.uuid4().hex[:8]}"}},
                        ]
                    },
                    "scopeLogs": [
                        {
                            "scope": {
                                "name": "stacklens",
                                "version": "1.0.0",
                            },
                            "logRecords": [
                                {
                                    "timeUnixNano": str(unix_nano),
                                    "observedTimeUnixNano": str(unix_nano),
                                    "severityNumber": severity,
                                    "severityText": level,
                                    "body": {"stringValue": message},
                                    "attributes": attributes,
                                    "droppedAttributesCount": 0,
                                    "flags": 0,
                                    "traceId": trace_id,
                                    "spanId": span_id,
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        
        return otel_log
    
    @staticmethod
    def generate_batch(
        count: int = 10,
        error_rate: float = 0.1,
        include_correlation_ids: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Generate a batch of OTEL logs
        
        Args:
            count: Number of logs to generate
            error_rate: Proportion of error logs (0.0 - 1.0)
            include_correlation_ids: Include trace/span IDs
            
        Returns:
            List of OTEL formatted logs
        """
        logs = []
        error_count = int(count * error_rate)
        
        for i in range(count):
            is_error = i < error_count
            log = OTELMessageGenerator.generate_otel_log(
                error=is_error,
                include_correlation_ids=include_correlation_ids,
            )
            logs.append(log)
        
        return logs


class KafkaTestProducer:
    """Send test messages to Kafka"""
    
    def __init__(self, bootstrap_servers: str, topic: str):
        """
        Initialize Kafka producer
        
        Args:
            bootstrap_servers: Kafka broker addresses (e.g., "localhost:9092")
            topic: Target Kafka topic
        """
        self.bootstrap_servers = bootstrap_servers
        self.topic = topic
        self.producer = None
        self.messages_sent = 0
        self.messages_failed = 0
    
    def connect(self):
        """Connect to Kafka"""
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                acks='all',
                retries=3,
                request_timeout_ms=10000,
            )
            logger.info(f"Connected to Kafka: {self.bootstrap_servers}")
        except Exception as e:
            logger.error(f"Failed to connect to Kafka: {e}")
            raise
    
    def send_message(self, message: Dict[str, Any], key: str = None) -> bool:
        """
        Send a single message to Kafka
        
        Args:
            message: Message dict
            key: Message key (optional)
            
        Returns:
            True if sent, False if failed
        """
        try:
            future = self.producer.send(
                self.topic,
                value=message,
                key=key.encode('utf-8') if key else None,
            )
            
            # Wait for confirmation
            record_metadata = future.get(timeout=10)
            
            self.messages_sent += 1
            logger.debug(f"Message sent to {self.topic} partition {record_metadata.partition}")
            return True
            
        except KafkaError as e:
            logger.error(f"Kafka error: {e}")
            self.messages_failed += 1
            return False
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            self.messages_failed += 1
            return False
    
    def send_batch(self, messages: List[Dict[str, Any]]) -> int:
        """
        Send a batch of messages
        
        Args:
            messages: List of message dicts
            
        Returns:
            Number of successfully sent messages
        """
        successful = 0
        for i, message in enumerate(messages):
            if self.send_message(message, key=f"msg-{i}"):
                successful += 1
            
            if (i + 1) % 10 == 0:
                logger.info(f"Sent {i + 1}/{len(messages)} messages")
        
        return successful
    
    def close(self):
        """Close Kafka producer"""
        if self.producer:
            self.producer.flush()
            self.producer.close()
            logger.info("Kafka producer closed")


def validate_otel_format(log: Dict[str, Any]) -> tuple[bool, str]:
    """
    Validate OTEL log format
    
    Args:
        log: OTEL formatted log dict
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    required_fields = ["resourceLogs"]
    for field in required_fields:
        if field not in log:
            return False, f"Missing required field: {field}"
    
    resource_logs = log.get("resourceLogs", [])
    if not resource_logs:
        return False, "resourceLogs is empty"
    
    for rl in resource_logs:
        if "resource" not in rl or "scopeLogs" not in rl:
            return False, "resourceLogs item missing resource or scopeLogs"
        
        scope_logs = rl.get("scopeLogs", [])
        for sl in scope_logs:
            if "logRecords" not in sl:
                return False, "scopeLogs item missing logRecords"
            
            log_records = sl.get("logRecords", [])
            for lr in log_records:
                required = ["timeUnixNano", "body", "attributes"]
                for field in required:
                    if field not in lr:
                        return False, f"logRecord missing field: {field}"
    
    return True, "Valid OTEL format"


def main():
    """Main test execution"""
    parser = argparse.ArgumentParser(
        description="Phase 2 Test Message Generator - OTEL Log Format"
    )
    parser.add_argument(
        "--count",
        type=int,
        default=10,
        help="Number of test messages to generate",
    )
    parser.add_argument(
        "--broker",
        default="localhost:9092",
        help="Kafka broker address",
    )
    parser.add_argument(
        "--topic",
        default="otel-logs",
        help="Target Kafka topic",
    )
    parser.add_argument(
        "--error-rate",
        type=float,
        default=0.1,
        help="Proportion of error logs (0.0-1.0)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0,
        help="Delay between messages (seconds)",
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Generate and validate messages without sending",
    )
    
    args = parser.parse_args()
    
    logger.info(f"Starting Phase 2 Test Message Generator")
    logger.info(f"  Count: {args.count}")
    logger.info(f"  Broker: {args.broker}")
    logger.info(f"  Topic: {args.topic}")
    logger.info(f"  Error Rate: {args.error_rate:.1%}")
    
    # Generate messages
    logger.info("Generating test messages...")
    generator = OTELMessageGenerator()
    messages = generator.generate_batch(
        count=args.count,
        error_rate=args.error_rate,
    )
    logger.info(f"Generated {len(messages)} messages")
    
    # Validate messages
    logger.info("Validating OTEL format...")
    valid_count = 0
    for i, msg in enumerate(messages):
        is_valid, error = validate_otel_format(msg)
        if is_valid:
            valid_count += 1
        else:
            logger.warning(f"Message {i} validation error: {error}")
    
    logger.info(f"Validation: {valid_count}/{len(messages)} messages valid")
    
    # Show sample
    logger.info("\nSample message (first message):")
    print(json.dumps(messages[0], indent=2))
    
    # Send to Kafka if not validate-only
    if not args.validate_only:
        logger.info("\nConnecting to Kafka...")
        producer = KafkaTestProducer(args.broker, args.topic)
        
        try:
            producer.connect()
            
            logger.info("Sending messages to Kafka...")
            for i, message in enumerate(messages):
                producer.send_message(message, key=f"msg-{i}")
                
                if args.delay > 0:
                    time.sleep(args.delay)
                
                if (i + 1) % 10 == 0:
                    logger.info(f"Sent {i + 1}/{len(messages)} messages")
            
            logger.info(f"\n✅ Test Complete!")
            logger.info(f"   Sent: {producer.messages_sent}")
            logger.info(f"   Failed: {producer.messages_failed}")
            logger.info(f"   Success Rate: {(producer.messages_sent/len(messages))*100:.1f}%")
            
        except Exception as e:
            logger.error(f"Error: {e}")
            return 1
        finally:
            producer.close()
    
    return 0


if __name__ == "__main__":
    exit(main())
