# Phase 1 Implementation Guide: POS Integration with StackLens AI

This guide provides the exact implementation roadmap for Phase 1 (POS integration) of the StackLens AI platform.

## Overview

Phase 1 establishes the end-to-end flow:
```
POS Demo (Node) 
  ↓ [Order with null price]
  ↓ [Structured JSON log]
Log Shipper (Filebeat/Fluent Bit)
  ↓ [JSON logs]
  ↓
Logs Ingest API (FastAPI)
  ↓ [Validate, store]
  ↓ Kafka (topic: pos-logs) OR Postgres (raw_logs)
  ↓
Consumer Service (Python)
  ↓ [Parse, rule detection]
  ↓ [Create alert: PRICE_MISSING]
Alert Persistence (Postgres)
  ↓
Admin UI (React)
  ↓ [Real-time update via WebSocket]
  ↓ [Click: Create Jira]
Jira Integration
  ↓ [Ticket created in test project]
```

**Acceptance Criteria**:
1. Alert appears in Postgres within 10 seconds
2. Alert visible in Admin UI dashboard with real-time updates
3. Jira ticket created when "Create Jira" clicked
4. All tests pass (unit, integration, E2E)
5. No secrets in code

---

## Step 1: Repository Setup (1-2 hours)

### 1.1 Branching Strategy
```bash
# Create main integration branch
git checkout develop
git pull origin develop
git checkout -b feature/pos-integration
```

Target for PRs: `develop` (never main)

### 1.2 Environment Configuration
Create `.env.example` at root:
```bash
# Backend
POSTGRES_URL=postgresql://user:pass@localhost:5432/stacklens
KAFKA_BROKERS=localhost:9092
REDIS_URL=redis://localhost:6379

# Jira Integration (for testing only)
JIRA_BASE_URL=https://test-jira.atlassian.net
JIRA_USER=test@company.com
JIRA_TOKEN=${JIRA_TOKEN}  # Set via GitHub Secrets
JIRA_PROJECT_KEY=TEST

# Logging
LOG_LEVEL=debug
NODE_ENV=development
```

### 1.3 Docker Compose Base (docker-compose.yml)
Update root `docker-compose.yml` to include:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: stacklens
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
    ports:
      - "9092:9092"
    depends_on:
      - zookeeper

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    ports:
      - "2181:2181"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

## Step 2: POS Demo Service Enhancement (4-6 hours)

### Location: `demo-pos-app/`

### 2.1 Update package.json with Winston logging
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "winston": "^3.11.0",
    "uuid": "^9.0.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "supertest": "^6.3.0",
    "@types/jest": "^29.0.0"
  }
}
```

### 2.2 Products Model & API
File: `demo-pos-app/src/models/product.ts`
```typescript
export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number | null;  // Can be null to trigger alert
}

export const SEED_PRODUCTS: Product[] = [
  { id: "p1", name: "Laptop", sku: "LAP001", price: 999.99 },
  { id: "p2", name: "Mouse", sku: "MOU001", price: null },  // Triggers alert
  { id: "p3", name: "Keyboard", sku: "KEY001", price: 49.99 },
];
```

### 2.3 Structured Logging
File: `demo-pos-app/src/logger.ts`
```typescript
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

export const createLogger = () => {
  return winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.json(),
    ),
    defaultMeta: {
      service: 'pos-demo',
      env: process.env.NODE_ENV || 'development',
      app_version: '1.0.0',
    },
    transports: [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' }),
      new winston.transports.Console(),
    ],
  });
};

export const logOrder = (logger: any, {
  request_id,
  user_id,
  product_id,
  action,
  level,
  message,
  price,
  error_code,
}: any) => {
  logger.log(level, message, {
    request_id,
    user_id,
    product_id,
    action,
    price,
    error_code,
    timestamp: new Date().toISOString(),
  });
};
```

### 2.4 Order Endpoint
File: `demo-pos-app/src/routes/order.ts`
```typescript
import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logOrder } from '../logger';
import { SEED_PRODUCTS } from '../models/product';

export const createOrderRouter = (logger: any) => {
  const router = express.Router();

  router.post('/order', (req: Request, res: Response) => {
    const request_id = uuidv4();
    const { product_id, user_id } = req.body;

    const product = SEED_PRODUCTS.find(p => p.id === product_id);

    if (!product) {
      logOrder(logger, {
        request_id,
        user_id: user_id || 'unknown',
        product_id,
        action: 'create_order',
        level: 'error',
        message: 'Product not found',
        error_code: 'PRODUCT_NOT_FOUND',
      });
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.price === null) {
      logOrder(logger, {
        request_id,
        user_id: user_id || 'unknown',
        product_id,
        action: 'create_order',
        level: 'error',
        message: 'Product price is null',
        price: null,
        error_code: 'PRICE_MISSING',
      });
      return res.status(400).json({ error: 'Product price is missing', error_code: 'PRICE_MISSING' });
    }

    logOrder(logger, {
      request_id,
      user_id: user_id || 'unknown',
      product_id,
      action: 'create_order',
      level: 'info',
      message: 'Order created successfully',
      price: product.price,
    });

    res.status(201).json({
      order_id: uuidv4(),
      product_id,
      price: product.price,
      created_at: new Date(),
    });
  });

  return router;
};
```

### 2.5 Tests
File: `demo-pos-app/test/order.test.ts`
```typescript
import request from 'supertest';
import express from 'express';
import { createOrderRouter } from '../src/routes/order';
import { createLogger } from '../src/logger';

describe('POST /order', () => {
  let app: any;
  let logger: any;

  beforeEach(() => {
    app = express();
    logger = createLogger();
    app.use(express.json());
    app.use(createOrderRouter(logger));
  });

  test('ordering valid product succeeds', async () => {
    const res = await request(app)
      .post('/order')
      .send({ product_id: 'p1', user_id: 'user123' });
    
    expect(res.status).toBe(201);
    expect(res.body.order_id).toBeDefined();
    expect(res.body.price).toBe(999.99);
  });

  test('ordering product with null price logs JSON error and returns 400', async () => {
    const res = await request(app)
      .post('/order')
      .send({ product_id: 'p2', user_id: 'user456' });
    
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('PRICE_MISSING');
  });

  test('ordering non-existent product returns 404', async () => {
    const res = await request(app)
      .post('/order')
      .send({ product_id: 'p999', user_id: 'user789' });
    
    expect(res.status).toBe(404);
  });
});
```

### 2.6 Dockerfile
File: `demo-pos-app/Dockerfile`
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY src ./src
COPY tsconfig.json ./
RUN npm run build
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

---

## Step 3: Logs Ingest API (FastAPI) (4-6 hours)

### Location: `python-services/logs_ingest_service.py`

### 3.1 FastAPI Service Skeleton
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime
import json
import os

app = FastAPI(title="StackLens Logs Ingest")

class LogEvent(BaseModel):
    request_id: str
    service: str
    env: str
    timestamp: str
    user_id: str | None = None
    product_id: str | None = None
    action: str
    level: str
    message: str
    price: float | None = None
    error_code: str | None = None
    stack: str | None = None
    app_version: str | None = None

@app.post("/api/logs/ingest", status_code=202)
async def ingest_log(event: LogEvent):
    """
    Ingest structured log event.
    Validate with Pydantic, write to Kafka (or Postgres fallback).
    """
    try:
        # Try Kafka
        if os.getenv('KAFKA_BROKERS'):
            # producer.send('pos-logs', value=event.dict())
            pass
        else:
            # Fallback to Postgres
            # INSERT into raw_logs (data) VALUES (event_json)
            pass
        
        return {"status": "accepted", "request_id": event.request_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok"}
```

### 3.2 Unit Tests
File: `python-services/test_logs_ingest.py`
```python
import pytest
from logs_ingest_service import app, LogEvent

@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    return TestClient(app)

def test_ingest_valid_log(client):
    payload = {
        "request_id": "req-123",
        "service": "pos-demo",
        "env": "test",
        "timestamp": "2024-01-15T10:00:00Z",
        "action": "create_order",
        "level": "error",
        "message": "Order failed",
        "error_code": "PRICE_MISSING",
    }
    response = client.post("/api/logs/ingest", json=payload)
    assert response.status_code == 202
    assert response.json()["request_id"] == "req-123"

def test_ingest_invalid_log(client):
    payload = {"service": "pos-demo"}  # Missing required fields
    response = client.post("/api/logs/ingest", json=payload)
    assert response.status_code == 422  # Validation error
```

---

## Step 4: Consumer + Rule Engine (4-6 hours)

### Location: `python-services/consumer_service.py`

### 4.1 Alert Model
File: `python-services/models/alert.py`
```python
from datetime import datetime
from sqlalchemy import Column, String, Integer, JSON, DateTime, create_engine
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True)
    issue_code = Column(String)  # e.g., "PRICE_MISSING"
    severity = Column(String)  # "critical", "warning", "info"
    suggested_fix = Column(String)
    confidence = Column(Integer)  # 0-100
    raw_log = Column(JSON)
    status = Column(String, default="NEW")  # NEW, ACKNOWLEDGED, RESOLVED
    jira_issue_key = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```

### 4.2 Rule Detection
File: `python-services/rules/price_missing_rule.py`
```python
def detect_price_missing(log_event: dict) -> dict | None:
    """
    Rule: if action == 'create_order' and error_code == 'PRICE_MISSING'
    Return alert dict or None if rule doesn't match
    """
    if (log_event.get('action') == 'create_order' and 
        log_event.get('error_code') == 'PRICE_MISSING'):
        
        return {
            'issue_code': 'PRICE_MISSING',
            'severity': 'critical',
            'suggested_fix': 'Update product pricing in database. Check for data migration issues.',
            'confidence': 95,
        }
    return None
```

### 4.3 Consumer Service
File: `python-services/consumer_service.py`
```python
from kafka import KafkaConsumer
import json
import uuid
from datetime import datetime
from models.alert import Alert, Base
from rules.price_missing_rule import detect_price_missing
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

# Setup
engine = create_engine(os.getenv('POSTGRES_URL'))
Base.metadata.create_all(engine)

consumer = KafkaConsumer(
    'pos-logs',
    bootstrap_servers=os.getenv('KAFKA_BROKERS', 'localhost:9092'),
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

def consume_logs():
    for message in consumer:
        log_event = message.value
        
        # Detect rules
        alert_info = detect_price_missing(log_event)
        
        if alert_info:
            # Persist alert
            with Session(engine) as session:
                alert = Alert(
                    id=str(uuid.uuid4()),
                    issue_code=alert_info['issue_code'],
                    severity=alert_info['severity'],
                    suggested_fix=alert_info['suggested_fix'],
                    confidence=alert_info['confidence'],
                    raw_log=log_event,
                    status='NEW',
                    created_at=datetime.utcnow(),
                )
                session.add(alert)
                session.commit()
                
                # TODO: Send WebSocket event to admin UI
                print(f"Alert created: {alert.id}")

if __name__ == '__main__':
    consume_logs()
```

### 4.4 Integration Tests
File: `python-services/test_consumer_integration.py`
```python
import pytest
import time
from consumer_service import consume_logs

def test_price_missing_creates_alert(kafka_container, postgres_container):
    """
    Integration test:
    1. Send PRICE_MISSING log to Kafka
    2. Run consumer
    3. Assert alert created in Postgres
    """
    # Send log
    producer.send('pos-logs', value={
        'action': 'create_order',
        'error_code': 'PRICE_MISSING',
        'product_id': 'p2',
        'price': None,
    })
    
    # Consume
    consume_logs()  # blocks
    
    # Assert
    with Session(engine) as session:
        alert = session.query(Alert).filter_by(issue_code='PRICE_MISSING').first()
        assert alert is not None
        assert alert.status == 'NEW'
```

---

## Step 5: Analyzer ML Stub (2-3 hours)

### Location: `python-services/analyzer_service.py`

```python
from dataclasses import dataclass

@dataclass
class AnalysisResult:
    issue_code: str
    severity: str
    suggested_fix: str
    automation_possible: bool
    confidence: int

class Analyzer:
    def analyze(self, log_event: dict) -> AnalysisResult:
        """
        Deterministic rules for now.
        TODO: Add ML classifier (XGBoost)
        """
        error_code = log_event.get('error_code')
        
        if error_code == 'PRICE_MISSING':
            return AnalysisResult(
                issue_code='PRICE_MISSING',
                severity='critical',
                suggested_fix='Update product pricing in database. Check for data migration issues.',
                automation_possible=False,
                confidence=95,
            )
        
        return AnalysisResult(
            issue_code='UNKNOWN',
            severity='warning',
            suggested_fix='Manual review required',
            automation_possible=False,
            confidence=10,
        )
```

---

## Step 6: Jira Connector (3-4 hours)

### Location: `python-services/integrations/jira.py`

```python
import requests
import os
from tenacity import retry, wait_exponential, stop_after_attempt

@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
def create_ticket(alert_id: str, alert_data: dict) -> str:
    """
    Create Jira ticket for alert.
    Retry with exponential backoff.
    Return Jira issue key.
    """
    url = f"{os.getenv('JIRA_BASE_URL')}/rest/api/3/issue"
    
    payload = {
        "fields": {
            "project": {"key": os.getenv('JIRA_PROJECT_KEY')},
            "issuetype": {"name": "Bug"},
            "summary": f"StackLens Alert: {alert_data['issue_code']}",
            "description": f"Alert ID: {alert_id}\n\nRaw Log:\n{json.dumps(alert_data['raw_log'], indent=2)}",
        }
    }
    
    response = requests.post(
        url,
        json=payload,
        auth=(os.getenv('JIRA_USER'), os.getenv('JIRA_TOKEN')),
    )
    response.raise_for_status()
    
    issue_key = response.json()['key']
    
    # Update alert with Jira key
    with Session(engine) as session:
        alert = session.query(Alert).filter_by(id=alert_id).first()
        alert.jira_issue_key = issue_key
        session.commit()
    
    return issue_key
```

---

## Step 7: Admin UI Pages (6-8 hours)

### Location: `apps/web/src/pages/admin/`

### 7.1 Alerts Dashboard
File: `apps/web/src/pages/admin/AlertsDashboard.tsx`
```typescript
import { useEffect, useState } from 'react';
import { AlertRow } from '../../components/AlertRow';
import { useWebSocket } from '../../hooks/useWebSocket';

export default function AlertsDashboard() {
  const [alerts, setAlerts] = useState([]);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    // Fetch initial alerts
    fetch('/api/alerts')
      .then(r => r.json())
      .then(data => setAlerts(data));

    // Subscribe to real-time updates
    const unsubscribe = subscribe('alert:created', (newAlert) => {
      setAlerts([newAlert, ...alerts]);
    });

    return unsubscribe;
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Alerts Dashboard</h1>
      <table className="w-full mt-4">
        <thead>
          <tr>
            <th>ID</th>
            <th>Issue Code</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map(alert => <AlertRow key={alert.id} alert={alert} />)}
        </tbody>
      </table>
    </div>
  );
}
```

### 7.2 Storybook Story
File: `apps/web/src/components/AlertRow.stories.tsx`
```typescript
import { Meta, StoryObj } from '@storybook/react';
import { AlertRow } from './AlertRow';

const meta: Meta<typeof AlertRow> = {
  component: AlertRow,
};

export default meta;

export const Critical: StoryObj = {
  args: {
    alert: {
      id: 'alert-1',
      issue_code: 'PRICE_MISSING',
      severity: 'critical',
      status: 'NEW',
      created_at: new Date(),
    },
  },
};
```

---

## Step 8: Docker Compose Test Stack (2-3 hours)

### File: `docker-compose.test.yml`

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: stacklens_test
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    ports:
      - "9092:9092"
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    ports:
      - "2181:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  logs-ingest:
    build:
      context: ./python-services
      dockerfile: Dockerfile
    ports:
      - "8001:8000"
    depends_on:
      - postgres
      - kafka
    environment:
      POSTGRES_URL: postgresql://postgres:postgres@postgres:5432/stacklens_test
      KAFKA_BROKERS: kafka:9092

  consumer:
    build:
      context: ./python-services
      dockerfile: Dockerfile
    depends_on:
      - postgres
      - kafka
    environment:
      POSTGRES_URL: postgresql://postgres:postgres@postgres:5432/stacklens_test
      KAFKA_BROKERS: kafka:9092
    command: python consumer_service.py

  pos-demo:
    build:
      context: ./demo-pos-app
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: test
```

---

## Step 9: CI Pipeline (3-4 hours)

### File: `.github/workflows/ci.yml`

(See detailed workflow in next section)

---

## Step 10: Tests & Verification

### Test Suite Summary

| Suite | Command | Time | Coverage |
|-------|---------|------|----------|
| Unit | `npm run test:unit && pytest python-services/` | 2min | ≥85% |
| Integration | `npm run test:integration` | 5min | ≥85% |
| E2E | `npm run test:e2e` | 10min | N/A |
| **Total** | **All** | **~20min** | **≥85%** |

### Acceptance Criteria Checklist

- [ ] POS demo service logs structured JSON
- [ ] Logs ingest accepts and validates schema
- [ ] Consumer detects PRICE_MISSING rule
- [ ] Alert persisted to Postgres within 10 seconds
- [ ] Admin UI displays alert with real-time updates
- [ ] Jira connector creates ticket
- [ ] No secrets committed
- [ ] All tests passing
- [ ] Coverage ≥85%
- [ ] CI green

---

## Troubleshooting

### Alert not appearing in Postgres (within 10s)
1. Check logs ingest is running: `docker logs logs-ingest`
2. Verify Kafka broker: `kafka-topics.sh --list --bootstrap-server localhost:9092`
3. Check consumer logs: `docker logs consumer`
4. Query alerts table: `SELECT * FROM alerts ORDER BY created_at DESC;`

### Admin UI not updating in real-time
1. Verify WebSocket connection: Check browser DevTools Network tab
2. Check backend WebSocket server logs
3. Verify alert is persisted to DB first

### Jira ticket not created
1. Check JIRA_TOKEN is set: `echo $JIRA_TOKEN`
2. Verify test project is accessible
3. Check Jira connector logs: `grep -i "jira" logs/consumer.log`

---

## Next Steps (Phase 2)

Once Phase 1 is complete and merged to `develop`:
1. Harden: secrets management, RBAC, rate limiting
2. Add ML classifier training pipeline
3. Add Elasticsearch for log searching
4. Add metrics and monitoring (Prometheus, Grafana)
5. Performance testing (k6/locust)

See `PHASE_1_IMPLEMENTATION_PLAN.md` for detailed timeline.
