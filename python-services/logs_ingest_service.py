"""
Logs Ingest API Service (FastAPI)

Receives structured JSON logs from POS Demo Service and other sources.
Validates with Pydantic schema, routes to Kafka (primary) or Postgres (fallback).

Endpoints:
  POST /api/logs/ingest - Ingest structured log event (202 Accepted)
  GET /health - Health check

Features:
  - Pydantic validation for all incoming logs
  - Request ID tracking for full traceability
  - Kafka routing for real-time processing
  - Postgres fallback for reliability
  - Structured logging of all events
"""

import os
import json
import logging
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field, validator
import asyncio
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="StackLens Logs Ingest API",
    version="1.0.0",
    description="Ingests structured logs from POS and other services"
)


class LogEventSchema(BaseModel):
    """
    Pydantic schema for validating incoming log events.
    All required fields must be present; optional fields can be null.
    """
    request_id: str = Field(..., description="Unique request identifier")
    service: str = Field(..., description="Source service name (e.g., 'pos-demo')")
    env: str = Field(..., description="Environment (development, staging, production)")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    action: str = Field(..., description="Action performed (e.g., 'create_order')")
    level: str = Field(..., description="Log level (info, warn, error)")
    message: str = Field(..., description="Human-readable log message")
    
    # Optional fields
    user_id: Optional[str] = Field(None, description="User identifier")
    product_id: Optional[str] = Field(None, description="Product identifier")
    price: Optional[float] = Field(None, description="Product price")
    quantity: Optional[int] = Field(None, description="Order quantity")
    error_code: Optional[str] = Field(None, description="Error code (e.g., 'PRICE_MISSING')")
    stack: Optional[str] = Field(None, description="Stack trace for errors")
    app_version: Optional[str] = Field(None, description="Application version")
    raw_data: Optional[dict] = Field(None, description="Additional context data")

    @validator('level')
    def validate_level(cls, v):
        """Ensure log level is valid"""
        valid_levels = ['debug', 'info', 'warn', 'error', 'critical']
        if v.lower() not in valid_levels:
            raise ValueError(f'level must be one of {valid_levels}')
        return v.lower()

    @validator('timestamp')
    def validate_timestamp(cls, v):
        """Ensure timestamp is valid ISO 8601 format"""
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            raise ValueError('timestamp must be ISO 8601 format')
        return v

    class Config:
        schema_extra = {
            "example": {
                "request_id": "7e197b96-7548-413b-92e1-63400f76f88a",
                "service": "pos-demo",
                "env": "development",
                "timestamp": "2025-11-18T17:21:35.683Z",
                "action": "create_order",
                "level": "error",
                "message": "Order creation failed: product has null price",
                "product_id": "prod_mouse_defect",
                "error_code": "PRICE_MISSING",
                "price": None,
                "user_id": "user456",
            }
        }


class LogResponseSchema(BaseModel):
    """Response schema for log ingestion"""
    status: str
    request_id: str
    message: str
    timestamp: str


# Simulated Kafka/Postgres storage
# In production, these would write to actual Kafka/Postgres
LOG_STORE = []


async def send_to_kafka(event: dict) -> bool:
    """
    Send log event to Kafka (topic: pos-logs)
    Returns True if successful, False if should fallback to Postgres
    """
    kafka_enabled = os.getenv('KAFKA_BROKERS') is not None
    
    if not kafka_enabled:
        logger.info("Kafka not available, will use Postgres fallback")
        return False
    
    try:
        # TODO: In production, use kafka-python or aiokafka to send to broker
        # from kafka import KafkaProducer
        # producer.send('pos-logs', value=event)
        
        logger.info(f"Sent log to Kafka: {event.get('request_id')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send to Kafka: {str(e)}")
        return False


async def save_to_postgres(event: dict) -> bool:
    """
    Save log event to Postgres (raw_logs table) as fallback
    Returns True if successful
    """
    postgres_url = os.getenv('POSTGRES_URL')
    
    if not postgres_url:
        logger.info("Postgres not available, storing in memory")
        LOG_STORE.append(event)
        return True
    
    try:
        # TODO: In production, use sqlalchemy to insert into raw_logs table
        # from sqlalchemy import create_engine
        # engine = create_engine(postgres_url)
        # with engine.connect() as conn:
        #     conn.execute(
        #         "INSERT INTO raw_logs (data) VALUES (%s)",
        #         (json.dumps(event),)
        #     )
        
        logger.info(f"Saved log to Postgres: {event.get('request_id')}")
        return True
    except Exception as e:
        logger.error(f"Failed to save to Postgres: {str(e)}")
        return False


@app.post("/api/logs/ingest", status_code=202, response_model=LogResponseSchema)
async def ingest_log(event: LogEventSchema):
    """
    Ingest a structured log event.
    
    1. Validates schema with Pydantic
    2. Attempts to send to Kafka (primary)
    3. Falls back to Postgres if Kafka unavailable
    4. Returns 202 Accepted for async processing
    
    Args:
        event: LogEventSchema - Validated log event
        
    Returns:
        202 Accepted with request_id for tracking
        
    Raises:
        422 Unprocessable Entity - If schema validation fails
        500 Internal Server Error - If all storage systems fail
    """
    try:
        event_dict = event.dict()
        request_id = event_dict.get('request_id')
        
        logger.info(f"Ingesting log: {request_id}")
        
        # Try Kafka first
        kafka_success = await send_to_kafka(event_dict)
        
        if not kafka_success:
            # Fall back to Postgres
            postgres_success = await save_to_postgres(event_dict)
            if not postgres_success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to store log in Kafka or Postgres"
                )
        
        return LogResponseSchema(
            status="accepted",
            request_id=request_id,
            message="Log ingested and queued for processing",
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
        
    except Exception as e:
        logger.error(f"Error ingesting log: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.get("/health")
async def health_check():
    """
    Health check endpoint for Docker and monitoring.
    
    Returns:
        200 OK with service status
    """
    return {
        "status": "ok",
        "service": "logs-ingest",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "1.0.0"
    }


@app.get("/stats")
async def get_stats():
    """
    Get statistics about ingested logs (development only).
    
    Returns:
        Count of logs stored and recent samples
    """
    return {
        "total_logs": len(LOG_STORE),
        "recent_logs": LOG_STORE[-10:] if LOG_STORE else [],
    }


@app.on_event("startup")
async def startup_event():
    """Log service startup"""
    logger.info("Logs Ingest API started")
    logger.info(f"Kafka brokers: {os.getenv('KAFKA_BROKERS', 'Not configured')}")
    logger.info(f"Postgres URL: {'Configured' if os.getenv('POSTGRES_URL') else 'Not configured'}")


@app.on_event("shutdown")
async def shutdown_event():
    """Log service shutdown"""
    logger.info("Logs Ingest API shutting down")


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv('PORT', 8000))
    host = os.getenv('HOST', '0.0.0.0')
    
    logger.info(f"Starting server on {host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="info")
