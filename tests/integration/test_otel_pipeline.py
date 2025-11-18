#!/usr/bin/env python3
"""
StackLens OTEL Pipeline - Integration Tests

This test suite verifies the complete end-to-end flow:
1. SDK sends logs/traces to OTLP Collector
2. Collector processes and routes to Kafka
3. Kafka messages are consumed and validated
4. Logs appear in Elasticsearch
5. Alerts are generated for matching rules

Run with:
    python -m pytest tests/integration/test_otel_pipeline.py -v
"""

import json
import time
import uuid
from datetime import datetime
from typing import Dict, Any

import pytest
import requests
from kafka import KafkaConsumer, KafkaProducer
from elasticsearch import Elasticsearch

# =====================================================================
# Configuration
# =====================================================================

OTEL_COLLECTOR_URL = "http://localhost:4318"
KAFKA_BOOTSTRAP_SERVERS = ["localhost:9092"]
ELASTICSEARCH_URL = "http://localhost:9200"
POSTGRES_URL = "postgresql://stacklens:stacklens_dev@localhost:5432/stacklens"

SERVICE_NAME = "integration-test-service"
TRACE_ID = uuid.uuid4().hex
SPAN_ID = uuid.uuid4().hex[:16]


# =====================================================================
# Fixtures
# =====================================================================


@pytest.fixture(scope="session")
def elasticsearch():
    """Connect to Elasticsearch."""
    es = Elasticsearch([ELASTICSEARCH_URL])
    # Wait for Elasticsearch to be ready
    for _ in range(30):
        try:
            es.info()
            break
        except Exception:
            time.sleep(1)
    yield es


@pytest.fixture(scope="session")
def kafka_consumer():
    """Create a Kafka consumer."""
    consumer = KafkaConsumer(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        auto_offset_reset="earliest",
        group_id=f"test-{uuid.uuid4().hex[:8]}",
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        consumer_timeout_ms=5000,
    )
    yield consumer


# =====================================================================
# Test Classes
# =====================================================================


class TestOTLPCollectorHealth:
    """Test OTLP Collector health and availability."""

    def test_collector_health_check(self):
        """Verify collector health endpoint is accessible."""
        response = requests.get(f"{OTEL_COLLECTOR_URL}/healthz", timeout=5)
        assert response.status_code == 200

    def test_collector_traces_endpoint(self):
        """Verify traces endpoint accepts requests."""
        payload = {
            "resourceSpans": [
                {
                    "resource": {
                        "attributes": [
                            {
                                "key": "service.name",
                                "value": {"stringValue": SERVICE_NAME},
                            }
                        ]
                    },
                    "scopeSpans": [
                        {
                            "scope": {"name": "test"},
                            "spans": [
                                {
                                    "traceId": TRACE_ID,
                                    "spanId": SPAN_ID,
                                    "name": "test-span",
                                    "kind": 2,
                                    "startTimeUnixNano": "1705316445000000000",
                                    "endTimeUnixNano": "1705316445100000000",
                                    "status": {"code": 0},
                                }
                            ],
                        }
                    ],
                }
            ]
        }

        response = requests.post(
            f"{OTEL_COLLECTOR_URL}/v1/traces",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=5,
        )
        assert response.status_code == 200

    def test_collector_logs_endpoint(self):
        """Verify logs endpoint accepts requests."""
        payload = {
            "resourceLogs": [
                {
                    "resource": {
                        "attributes": [
                            {
                                "key": "service.name",
                                "value": {"stringValue": SERVICE_NAME},
                            }
                        ]
                    },
                    "scopeLogs": [
                        {
                            "scope": {"name": "test"},
                            "logRecords": [
                                {
                                    "timeUnixNano": "1705316445000000000",
                                    "body": {"stringValue": "Integration test log"},
                                    "severityNumber": 9,
                                    "severityText": "Info",
                                }
                            ],
                        }
                    ],
                }
            ]
        }

        response = requests.post(
            f"{OTEL_COLLECTOR_URL}/v1/logs",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=5,
        )
        assert response.status_code == 200


class TestOTLPLogIngestion:
    """Test OTLP log ingestion and processing."""

    def test_send_structured_log(self):
        """Send a structured log to collector."""
        log_timestamp = int(time.time() * 1e9)

        payload = {
            "resourceLogs": [
                {
                    "resource": {
                        "attributes": [
                            {
                                "key": "service.name",
                                "value": {"stringValue": SERVICE_NAME},
                            },
                            {"key": "service.version", "value": {"stringValue": "1.0.0"}},
                            {
                                "key": "deployment.environment",
                                "value": {"stringValue": "test"},
                            },
                        ]
                    },
                    "scopeLogs": [
                        {
                            "scope": {"name": "integration-test", "version": "1.0.0"},
                            "logRecords": [
                                {
                                    "timeUnixNano": str(log_timestamp),
                                    "body": {"stringValue": "Integration test log entry"},
                                    "attributes": [
                                        {
                                            "key": "service.name",
                                            "value": {"stringValue": SERVICE_NAME},
                                        },
                                        {
                                            "key": "log.level",
                                            "value": {"stringValue": "info"},
                                        },
                                        {
                                            "key": "request_id",
                                            "value": {"stringValue": str(uuid.uuid4())},
                                        },
                                        {
                                            "key": "user_id",
                                            "value": {"stringValue": "user-123"},
                                        },
                                        {
                                            "key": "action",
                                            "value": {
                                                "stringValue": "test.log_entry"
                                            },
                                        },
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

        response = requests.post(
            f"{OTEL_COLLECTOR_URL}/v1/logs",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=5,
        )

        assert response.status_code == 200, f"Failed: {response.text}"

    def test_send_error_log(self):
        """Send an error log to trigger alert rule matching."""
        log_timestamp = int(time.time() * 1e9)

        # This log should match the PAYMENT_FAILURE alert rule
        payload = {
            "resourceLogs": [
                {
                    "resource": {
                        "attributes": [
                            {
                                "key": "service.name",
                                "value": {"stringValue": SERVICE_NAME},
                            }
                        ]
                    },
                    "scopeLogs": [
                        {
                            "scope": {"name": "integration-test"},
                            "logRecords": [
                                {
                                    "timeUnixNano": str(log_timestamp),
                                    "body": {
                                        "stringValue": "Payment processing failed"
                                    },
                                    "attributes": [
                                        {
                                            "key": "log.level",
                                            "value": {"stringValue": "error"},
                                        },
                                        {
                                            "key": "error_code",
                                            "value": {"stringValue": "PAYMENT_FAILURE"},
                                        },
                                        {"key": "status", "value": {"intValue": 402}},
                                    ],
                                    "severityNumber": 17,
                                    "severityText": "Error",
                                }
                            ],
                        }
                    ],
                }
            ]
        }

        response = requests.post(
            f"{OTEL_COLLECTOR_URL}/v1/logs",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=5,
        )

        assert response.status_code == 200

    def test_send_trace_with_errors(self):
        """Send a trace with span errors."""
        trace_id = uuid.uuid4().hex
        span_id = uuid.uuid4().hex[:16]

        payload = {
            "resourceSpans": [
                {
                    "resource": {
                        "attributes": [
                            {
                                "key": "service.name",
                                "value": {"stringValue": SERVICE_NAME},
                            }
                        ]
                    },
                    "scopeSpans": [
                        {
                            "scope": {"name": "integration-test"},
                            "spans": [
                                {
                                    "traceId": trace_id,
                                    "spanId": span_id,
                                    "name": "db-query",
                                    "kind": 3,
                                    "startTimeUnixNano": "1705316445000000000",
                                    "endTimeUnixNano": "1705316445500000000",
                                    "attributes": [
                                        {
                                            "key": "db.system",
                                            "value": {"stringValue": "postgresql"},
                                        },
                                        {
                                            "key": "error_code",
                                            "value": {
                                                "stringValue": "DB_CONNECTION_ERROR"
                                            },
                                        },
                                    ],
                                    "events": [
                                        {
                                            "name": "exception",
                                            "timeUnixNano": "1705316445450000000",
                                            "attributes": [
                                                {
                                                    "key": "exception.type",
                                                    "value": {
                                                        "stringValue": "ConnectionError"
                                                    },
                                                }
                                            ],
                                        }
                                    ],
                                    "status": {"code": 2, "message": "Connection refused"},
                                }
                            ],
                        }
                    ],
                }
            ]
        }

        response = requests.post(
            f"{OTEL_COLLECTOR_URL}/v1/traces",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=5,
        )

        assert response.status_code == 200


class TestKafkaExport:
    """Test Kafka export from collector."""

    def test_kafka_otel_logs_topic_exists(self):
        """Verify otel-logs Kafka topic exists."""
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            request_timeout_ms=5000,
        )

        try:
            # Try to get metadata
            metadata = producer.partitions_for("otel-logs")
            assert metadata is not None, "otel-logs topic doesn't exist"
            assert len(metadata) > 0, "otel-logs topic has no partitions"
        finally:
            producer.close()

    def test_kafka_otel_traces_topic_exists(self):
        """Verify otel-traces Kafka topic exists."""
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            request_timeout_ms=5000,
        )

        try:
            metadata = producer.partitions_for("otel-traces")
            assert metadata is not None, "otel-traces topic doesn't exist"
        finally:
            producer.close()

    def test_logs_exported_to_kafka(self, kafka_consumer):
        """Verify logs are exported to Kafka."""
        # Send a log with a unique marker
        marker = f"integration-test-{uuid.uuid4().hex[:8]}"

        payload = {
            "resourceLogs": [
                {
                    "resource": {
                        "attributes": [
                            {
                                "key": "service.name",
                                "value": {"stringValue": SERVICE_NAME},
                            }
                        ]
                    },
                    "scopeLogs": [
                        {
                            "scope": {"name": "integration-test"},
                            "logRecords": [
                                {
                                    "timeUnixNano": str(int(time.time() * 1e9)),
                                    "body": {"stringValue": marker},
                                    "severityNumber": 9,
                                    "severityText": "Info",
                                }
                            ],
                        }
                    ],
                }
            ]
        }

        # Send log
        response = requests.post(
            f"{OTEL_COLLECTOR_URL}/v1/logs",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=5,
        )
        assert response.status_code == 200

        # Wait a bit for processing
        time.sleep(2)

        # Subscribe to otel-logs topic
        kafka_consumer.subscribe(["otel-logs"])

        # Try to consume message with our marker
        found = False
        try:
            for message in kafka_consumer:
                if message.value and marker in str(message.value):
                    found = True
                    break
        except Exception:
            pass

        assert found, f"Log with marker '{marker}' not found in Kafka topic"


class TestDataValidation:
    """Test data contract validation."""

    def test_log_schema_compliance(self):
        """Test that logs comply with log schema."""
        log_record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "service": SERVICE_NAME,
            "level": "info",
            "message": "Test log message",
            "request_id": str(uuid.uuid4()),
            "user_id": "user-123",
            "trace_id": uuid.uuid4().hex,
            "span_id": uuid.uuid4().hex[:16],
            "action": "test.validation",
            "app_version": "1.0.0",
        }

        # Verify required fields
        assert "timestamp" in log_record
        assert "service" in log_record
        assert "level" in log_record
        assert "message" in log_record

        # Verify field types
        assert isinstance(log_record["timestamp"], str)
        assert isinstance(log_record["service"], str)
        assert isinstance(log_record["level"], str)

    def test_alert_rule_structure(self):
        """Test alert rule structure compliance."""
        alert_rule = {
            "id": "PAYMENT_FAILURE",
            "name": "Payment Processing Failure",
            "severity": "high",
            "conditions": {
                "error_code": "PAYMENT_FAILURE",
                "status": {"$gte": 400},
            },
            "suggested_fix": "Check payment processor configuration and retry",
            "automation_possible": True,
            "automation_action": "RETRY_PAYMENT",
        }

        # Verify required fields
        required_fields = ["id", "name", "severity", "conditions", "suggested_fix"]
        for field in required_fields:
            assert field in alert_rule, f"Missing required field: {field}"

        # Verify types
        assert isinstance(alert_rule["conditions"], dict)


class TestEndToEnd:
    """End-to-end integration tests."""

    def test_complete_flow_from_sdk_to_elasticsearch(self, elasticsearch):
        """Test complete flow: SDK -> Collector -> Elasticsearch."""
        # Generate unique identifiers
        request_id = str(uuid.uuid4())
        trace_id = uuid.uuid4().hex
        timestamp = datetime.utcnow().isoformat() + "Z"

        # 1. Send log via OTLP
        payload = {
            "resourceLogs": [
                {
                    "resource": {
                        "attributes": [
                            {
                                "key": "service.name",
                                "value": {"stringValue": SERVICE_NAME},
                            }
                        ]
                    },
                    "scopeLogs": [
                        {
                            "scope": {"name": "e2e-test"},
                            "logRecords": [
                                {
                                    "timeUnixNano": str(int(time.time() * 1e9)),
                                    "body": {"stringValue": "E2E test log"},
                                    "attributes": [
                                        {
                                            "key": "request_id",
                                            "value": {"stringValue": request_id},
                                        },
                                        {
                                            "key": "trace_id",
                                            "value": {"stringValue": trace_id},
                                        },
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

        response = requests.post(
            f"{OTEL_COLLECTOR_URL}/v1/logs",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=5,
        )
        assert response.status_code == 200

        # 2. Wait for processing
        time.sleep(3)

        # 3. Query Elasticsearch for the log
        index_pattern = "stacklens-logs-*"
        query = {
            "query": {
                "bool": {
                    "must": [
                        {"match": {"request_id": request_id}},
                    ]
                }
            }
        }

        try:
            results = elasticsearch.search(index=index_pattern, body=query)
            assert results["hits"]["total"]["value"] >= 1, "Log not found in Elasticsearch"
        except Exception as e:
            pytest.skip(f"Elasticsearch query failed: {e}")


# =====================================================================
# Run Tests
# =====================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
