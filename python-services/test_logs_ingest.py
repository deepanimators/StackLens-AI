"""
Unit and integration tests for Logs Ingest API.

Tests cover:
  - Valid log ingestion with all fields
  - Schema validation (required fields, data types)
  - Optional field handling
  - Error responses
  - Health check endpoint
"""

import pytest
import json
from datetime import datetime
from fastapi.testclient import TestClient
from logs_ingest_service import app, LogEventSchema, LOG_STORE


@pytest.fixture
def client():
    """FastAPI test client"""
    return TestClient(app)


@pytest.fixture(autouse=True)
def clear_log_store():
    """Clear in-memory log store before each test"""
    LOG_STORE.clear()
    yield
    LOG_STORE.clear()


class TestLogsIngestValid:
    """Tests for valid log ingestion"""

    def test_ingest_valid_log_all_fields(self, client):
        """Test ingesting a complete log event with all fields"""
        payload = {
            "request_id": "req-12345",
            "service": "pos-demo",
            "env": "development",
            "timestamp": "2025-11-18T17:21:35.683Z",
            "action": "create_order",
            "level": "error",
            "message": "Order creation failed: product has null price",
            "product_id": "prod_mouse_defect",
            "price": None,
            "quantity": 1,
            "error_code": "PRICE_MISSING",
            "user_id": "user456",
            "app_version": "1.0.0",
        }

        response = client.post("/api/logs/ingest", json=payload)

        assert response.status_code == 202
        assert response.json()["status"] == "accepted"
        assert response.json()["request_id"] == "req-12345"
        assert "timestamp" in response.json()

    def test_ingest_valid_log_minimal_fields(self, client):
        """Test ingesting a log with only required fields"""
        payload = {
            "request_id": "req-minimal",
            "service": "pos-demo",
            "env": "test",
            "timestamp": "2025-11-18T10:00:00.000Z",
            "action": "list_products",
            "level": "info",
            "message": "Products retrieved",
        }

        response = client.post("/api/logs/ingest", json=payload)

        assert response.status_code == 202
        assert response.json()["request_id"] == "req-minimal"

    def test_ingest_valid_log_with_optional_fields(self, client):
        """Test ingesting a log with some optional fields"""
        payload = {
            "request_id": "req-optional",
            "service": "pos-demo",
            "env": "production",
            "timestamp": "2025-11-18T12:00:00.000Z",
            "action": "create_order",
            "level": "warn",
            "message": "Order warning",
            "user_id": "user789",
            "error_code": "WARNING_CODE",
        }

        response = client.post("/api/logs/ingest", json=payload)

        assert response.status_code == 202

    def test_ingest_price_missing_alert(self, client):
        """Test ingesting the specific PRICE_MISSING alert from POS service"""
        payload = {
            "request_id": "alert-price-missing-001",
            "service": "pos-demo",
            "env": "development",
            "timestamp": "2025-11-18T17:21:35.683Z",
            "action": "create_order",
            "level": "error",
            "message": "Order creation failed: product has null price",
            "product_id": "prod_mouse_defect",
            "price": None,
            "error_code": "PRICE_MISSING",
            "user_id": "user456",
        }

        response = client.post("/api/logs/ingest", json=payload)

        assert response.status_code == 202
        assert response.json()["status"] == "accepted"


class TestLogsIngestValidation:
    """Tests for schema validation"""

    def test_ingest_missing_required_field_request_id(self, client):
        """Test validation fails when request_id is missing"""
        payload = {
            "service": "pos-demo",
            "env": "test",
            "timestamp": "2025-11-18T10:00:00.000Z",
            "action": "test",
            "level": "info",
            "message": "Test",
        }

        response = client.post("/api/logs/ingest", json=payload)

        assert response.status_code == 422  # Validation error

    def test_ingest_missing_required_field_service(self, client):
        """Test validation fails when service is missing"""
        payload = {
            "request_id": "req-001",
            "env": "test",
            "timestamp": "2025-11-18T10:00:00.000Z",
            "action": "test",
            "level": "info",
            "message": "Test",
        }

        response = client.post("/api/logs/ingest", json=payload)

        assert response.status_code == 422

    def test_ingest_missing_required_field_timestamp(self, client):
        """Test validation fails when timestamp is missing"""
        payload = {
            "request_id": "req-001",
            "service": "pos-demo",
            "env": "test",
            "action": "test",
            "level": "info",
            "message": "Test",
        }

        response = client.post("/api/logs/ingest", json=payload)

        assert response.status_code == 422

    def test_ingest_invalid_timestamp_format(self, client):
        """Test validation fails with invalid timestamp format"""
        payload = {
            "request_id": "req-001",
            "service": "pos-demo",
            "env": "test",
            "timestamp": "not-a-timestamp",
            "action": "test",
            "level": "info",
            "message": "Test",
        }

        response = client.post("/api/logs/ingest", json=payload)

        assert response.status_code == 422

    def test_ingest_invalid_log_level(self, client):
        """Test validation fails with invalid log level"""
        payload = {
            "request_id": "req-001",
            "service": "pos-demo",
            "env": "test",
            "timestamp": "2025-11-18T10:00:00.000Z",
            "action": "test",
            "level": "invalid_level",
            "message": "Test",
        }

        response = client.post("/api/logs/ingest", json=payload)

        assert response.status_code == 422

    def test_ingest_valid_log_levels(self, client):
        """Test all valid log levels are accepted"""
        valid_levels = ['debug', 'info', 'warn', 'error', 'critical']

        for level in valid_levels:
            payload = {
                "request_id": f"req-{level}",
                "service": "pos-demo",
                "env": "test",
                "timestamp": "2025-11-18T10:00:00.000Z",
                "action": "test",
                "level": level,
                "message": f"Test with {level}",
            }

            response = client.post("/api/logs/ingest", json=payload)
            assert response.status_code == 202, f"Failed for level: {level}"


class TestLogsIngestEndpoints:
    """Tests for API endpoints"""

    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/health")

        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        assert response.json()["service"] == "logs-ingest"
        assert "timestamp" in response.json()

    def test_stats_endpoint_empty(self, client):
        """Test stats endpoint when no logs ingested"""
        response = client.get("/stats")

        assert response.status_code == 200
        assert response.json()["total_logs"] == 0
        assert response.json()["recent_logs"] == []

    def test_stats_endpoint_with_logs(self, client):
        """Test stats endpoint after ingesting logs"""
        # Ingest a log
        payload = {
            "request_id": "req-stats",
            "service": "pos-demo",
            "env": "test",
            "timestamp": "2025-11-18T10:00:00.000Z",
            "action": "test",
            "level": "info",
            "message": "Test",
        }
        client.post("/api/logs/ingest", json=payload)

        # Check stats
        response = client.get("/stats")

        assert response.status_code == 200
        assert response.json()["total_logs"] >= 1


class TestLogsIngestErrorHandling:
    """Tests for error handling"""

    def test_ingest_empty_body(self, client):
        """Test error handling for empty request body"""
        response = client.post("/api/logs/ingest", json={})

        assert response.status_code == 422

    def test_ingest_invalid_json(self, client):
        """Test error handling for invalid JSON"""
        response = client.post(
            "/api/logs/ingest",
            content="invalid json",
            headers={"Content-Type": "application/json"}
        )

        assert response.status_code in [400, 422]

    def test_ingest_wrong_data_type_price(self, client):
        """Test validation fails when price is not a number"""
        payload = {
            "request_id": "req-001",
            "service": "pos-demo",
            "env": "test",
            "timestamp": "2025-11-18T10:00:00.000Z",
            "action": "test",
            "level": "info",
            "message": "Test",
            "price": "not-a-number",  # Should be float or None
        }

        response = client.post("/api/logs/ingest", json=payload)

        assert response.status_code == 422

    def test_ingest_wrong_data_type_quantity(self, client):
        """Test validation fails when quantity is not an integer"""
        payload = {
            "request_id": "req-001",
            "service": "pos-demo",
            "env": "test",
            "timestamp": "2025-11-18T10:00:00.000Z",
            "action": "test",
            "level": "info",
            "message": "Test",
            "quantity": "not-an-int",  # Should be int or None
        }

        response = client.post("/api/logs/ingest", json=payload)

        assert response.status_code == 422


class TestLogsIngestIntegration:
    """Integration tests"""

    def test_multiple_logs_sequence(self, client):
        """Test ingesting multiple logs in sequence"""
        request_ids = []

        for i in range(5):
            payload = {
                "request_id": f"req-sequence-{i}",
                "service": "pos-demo",
                "env": "test",
                "timestamp": "2025-11-18T10:00:00.000Z",
                "action": f"action_{i}",
                "level": "info",
                "message": f"Message {i}",
            }

            response = client.post("/api/logs/ingest", json=payload)
            assert response.status_code == 202
            request_ids.append(response.json()["request_id"])

        # Verify all request IDs are unique
        assert len(set(request_ids)) == 5

    def test_log_with_raw_data(self, client):
        """Test ingesting log with raw_data field"""
        payload = {
            "request_id": "req-with-raw",
            "service": "pos-demo",
            "env": "test",
            "timestamp": "2025-11-18T10:00:00.000Z",
            "action": "test",
            "level": "info",
            "message": "Test with raw data",
            "raw_data": {
                "custom_field": "custom_value",
                "nested": {"key": "value"},
            },
        }

        response = client.post("/api/logs/ingest", json=payload)

        assert response.status_code == 202
