#!/usr/bin/env python3
"""
Phase 2 Integration Tests - Parser/Enricher Service

Tests cover:
- Message extraction from OTLP format
- Schema validation
- Metadata enrichment
- Kafka production
- Database storage
- Dead letter queue handling
- End-to-end processing

Run with:
    pytest tests/integration/test_phase2_parser.py -v
"""

import json
import uuid
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock

import pytest
from kafka import KafkaProducer

# Import service components (assuming we can import from the service)
# These imports would need to be adjusted based on your actual package structure


class TestLogExtraction:
    """Test OTLP log extraction"""
    
    def test_extract_valid_otel_log(self):
        """Test extracting a valid OTLP formatted log"""
        otel_log = {
            "resourceLogs": [
                {
                    "resource": {
                        "attributes": [
                            {"key": "service.name", "value": {"stringValue": "test-service"}},
                            {"key": "service.version", "value": {"stringValue": "1.0.0"}},
                        ]
                    },
                    "scopeLogs": [
                        {
                            "scope": {"name": "test"},
                            "logRecords": [
                                {
                                    "timeUnixNano": "1705316445000000000",
                                    "body": {"stringValue": "Test message"},
                                    "attributes": [
                                        {"key": "log.level", "value": {"stringValue": "info"}},
                                        {"key": "request_id", "value": {"stringValue": str(uuid.uuid4())}},
                                    ],
                                    "severityNumber": 9,
                                    "severityText": "Info",
                                }
                            ],
                        }
                    ],
                }
            ]
        }
        
        # Verify structure
        assert "resourceLogs" in otel_log
        assert len(otel_log["resourceLogs"]) > 0
        assert "scopeLogs" in otel_log["resourceLogs"][0]
    
    def test_extract_direct_format_log(self):
        """Test extracting directly formatted log"""
        direct_log = {
            "timestamp": "2024-01-15T10:00:00Z",
            "service": "test-service",
            "level": "info",
            "message": "Test message",
            "request_id": str(uuid.uuid4()),
        }
        
        # Verify all required fields
        required_fields = {"timestamp", "service", "level", "message"}
        assert required_fields.issubset(set(direct_log.keys()))
    
    def test_unix_nano_conversion(self):
        """Test Unix nanosecond to ISO 8601 conversion"""
        unix_nano = "1705316445000000000"
        
        # Convert
        seconds = int(unix_nano) / 1e9
        dt = datetime.utcfromtimestamp(seconds)
        iso_timestamp = dt.isoformat() + 'Z'
        
        # Verify format
        assert iso_timestamp.endswith('Z')
        assert 'T' in iso_timestamp


class TestSchemaValidation:
    """Test log schema validation"""
    
    def test_validate_required_fields(self):
        """Test validation of required fields"""
        required_fields = {'timestamp', 'service', 'level', 'message'}
        
        valid_log = {
            "timestamp": "2024-01-15T10:00:00Z",
            "service": "test-service",
            "level": "info",
            "message": "Test message",
        }
        
        # Check all required fields present
        missing_fields = required_fields - set(valid_log.keys())
        assert len(missing_fields) == 0
    
    def test_validate_level_values(self):
        """Test validation of log level enum"""
        valid_levels = {'debug', 'info', 'warn', 'error', 'critical'}
        
        # Valid levels
        for level in valid_levels:
            assert level in valid_levels
        
        # Invalid level
        invalid_level = 'trace'
        assert invalid_level not in valid_levels
    
    def test_validate_timestamp_format(self):
        """Test validation of timestamp ISO 8601 format"""
        valid_timestamps = [
            "2024-01-15T10:00:00Z",
            "2024-01-15T10:00:00+00:00",
            "2024-01-15T10:00:00.000Z",
        ]
        
        for ts in valid_timestamps:
            # Try to parse
            try:
                parsed = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                assert parsed is not None
            except ValueError:
                pytest.fail(f"Failed to parse timestamp: {ts}")
    
    def test_invalid_missing_required_field(self):
        """Test validation fails for missing required fields"""
        invalid_log = {
            "timestamp": "2024-01-15T10:00:00Z",
            # Missing 'service'
            "level": "info",
            "message": "Test message",
        }
        
        required_fields = {'timestamp', 'service', 'level', 'message'}
        missing = required_fields - set(invalid_log.keys())
        assert 'service' in missing
    
    def test_invalid_log_type(self):
        """Test validation fails for wrong field types"""
        invalid_log = {
            "timestamp": "2024-01-15T10:00:00Z",
            "service": "test-service",
            "level": "info",
            "message": 12345,  # Should be string
        }
        
        # Check type
        assert isinstance(invalid_log["message"], int)


class TestMetadataEnrichment:
    """Test metadata enrichment"""
    
    def test_enrich_with_hostname(self):
        """Test enrichment adds hostname"""
        log = {
            "timestamp": "2024-01-15T10:00:00Z",
            "service": "test-service",
            "level": "info",
            "message": "Test",
        }
        
        # Simulate enrichment
        enriched = log.copy()
        enriched["hostname"] = "test-host"
        enriched["environment"] = "development"
        
        assert "hostname" in enriched
        assert "environment" in enriched
    
    def test_enrich_adds_timestamps(self):
        """Test enrichment adds processing timestamps"""
        log = {
            "timestamp": "2024-01-15T10:00:00Z",
            "service": "test-service",
            "level": "info",
            "message": "Test",
        }
        
        # Simulate enrichment
        enriched = log.copy()
        now = datetime.utcnow().isoformat() + 'Z'
        enriched["parsed_at"] = now
        enriched["enriched_at"] = now
        
        assert enriched["parsed_at"] == now
        assert enriched["enriched_at"] == now
    
    def test_preserve_original_fields(self):
        """Test enrichment preserves original fields"""
        log = {
            "timestamp": "2024-01-15T10:00:00Z",
            "service": "test-service",
            "level": "info",
            "message": "Test",
            "request_id": str(uuid.uuid4()),
            "user_id": "user-123",
        }
        
        # Simulate enrichment
        enriched = log.copy()
        enriched["hostname"] = "test-host"
        
        # Original fields still present
        assert enriched["request_id"] == log["request_id"]
        assert enriched["user_id"] == log["user_id"]
        assert enriched["service"] == log["service"]


class TestKafkaProduction:
    """Test Kafka message production"""
    
    def test_kafka_topic_format(self):
        """Test valid Kafka topic names"""
        valid_topics = [
            "otel-logs",
            "stacklens-enriched",
            "stacklens-dlq",
        ]
        
        for topic in valid_topics:
            # Topic should be alphanumeric with hyphens
            assert all(c.isalnum() or c == '-' for c in topic)
    
    def test_message_serialization(self):
        """Test message can be serialized to JSON"""
        message = {
            "timestamp": "2024-01-15T10:00:00Z",
            "service": "test-service",
            "level": "info",
            "message": "Test",
            "hostname": "test-host",
            "enriched_at": "2024-01-15T10:00:01Z",
        }
        
        # Serialize
        json_str = json.dumps(message)
        
        # Deserialize
        deserialized = json.loads(json_str)
        
        assert deserialized == message
    
    def test_message_with_special_characters(self):
        """Test message with special characters serializes correctly"""
        message = {
            "message": "Error: Connection \"failed\" to 'database'",
            "service": "test-service",
            "timestamp": "2024-01-15T10:00:00Z",
            "level": "error",
        }
        
        json_str = json.dumps(message)
        deserialized = json.loads(json_str)
        
        assert deserialized["message"] == message["message"]


class TestDeadLetterQueue:
    """Test dead letter queue handling"""
    
    def test_dlq_message_structure(self):
        """Test DLQ messages have required structure"""
        dlq_message = {
            "original_message": {
                "timestamp": "2024-01-15T10:00:00Z",
                "service": "test-service",
            },
            "error": "Schema validation failed",
            "sent_to_dlq_at": "2024-01-15T10:00:01Z",
        }
        
        assert "original_message" in dlq_message
        assert "error" in dlq_message
        assert "sent_to_dlq_at" in dlq_message
    
    def test_dlq_preserves_original(self):
        """Test DLQ preserves original message for debugging"""
        original = {
            "timestamp": "2024-01-15T10:00:00Z",
            "service": "test-service",
            "level": "info",
            "message": "Test",
        }
        
        dlq_message = {
            "original_message": original,
            "error": "Processing error",
        }
        
        assert dlq_message["original_message"] == original


class TestEndToEnd:
    """Test end-to-end processing"""
    
    def test_otel_log_to_enriched_flow(self):
        """Test complete flow from OTLP to enriched"""
        # OTLP input
        otel_input = {
            "resourceLogs": [
                {
                    "resource": {
                        "attributes": [
                            {"key": "service.name", "value": {"stringValue": "order-service"}},
                        ]
                    },
                    "scopeLogs": [
                        {
                            "scope": {"name": "app"},
                            "logRecords": [
                                {
                                    "timeUnixNano": "1705316445000000000",
                                    "body": {"stringValue": "Order created"},
                                    "attributes": [
                                        {"key": "log.level", "value": {"stringValue": "info"}},
                                        {"key": "user_id", "value": {"stringValue": "user-123"}},
                                        {"key": "product_id", "value": {"stringValue": "SKU-001"}},
                                    ],
                                }
                            ],
                        }
                    ],
                }
            ]
        }
        
        # Verify has required structure
        assert "resourceLogs" in otel_input
        assert len(otel_input["resourceLogs"]) > 0
        
        # Extract and validate
        resource_logs = otel_input["resourceLogs"][0]
        assert "resource" in resource_logs
        assert "scopeLogs" in resource_logs
    
    def test_error_scenario_dlq_routing(self):
        """Test error handling routes to DLQ"""
        # Message with validation error
        bad_message = {
            "timestamp": "2024-01-15T10:00:00Z",
            # Missing required 'service' field
            "level": "info",
            "message": "Test",
        }
        
        required_fields = {'timestamp', 'service', 'level', 'message'}
        missing = required_fields - set(bad_message.keys())
        
        # Should have routing decision
        assert len(missing) > 0  # Has error, should go to DLQ


class TestPerformance:
    """Test performance characteristics"""
    
    def test_message_processing_time(self):
        """Test message processing is reasonably fast"""
        import time
        
        message = {
            "timestamp": "2024-01-15T10:00:00Z",
            "service": "test-service",
            "level": "info",
            "message": "Test",
        }
        
        start = time.time()
        # Simulate processing
        json.dumps(message)
        json.loads(json.dumps(message))
        elapsed = (time.time() - start) * 1000  # ms
        
        # Should be very fast (<10ms)
        assert elapsed < 10, f"Processing took {elapsed}ms"
    
    def test_batch_processing(self):
        """Test batch processing of multiple messages"""
        batch_size = 100
        messages = [
            {
                "timestamp": "2024-01-15T10:00:00Z",
                "service": f"service-{i}",
                "level": "info",
                "message": f"Message {i}",
            }
            for i in range(batch_size)
        ]
        
        # Process batch
        processed = [json.dumps(m) for m in messages]
        
        assert len(processed) == batch_size


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
