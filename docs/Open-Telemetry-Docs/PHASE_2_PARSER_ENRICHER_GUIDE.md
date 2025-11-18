# Phase 2: Parser/Enricher Service - Comprehensive Guide

## 📋 Overview

Phase 2 implements the **Parser/Enricher Service**, the core component of the StackLens OTEL Pipeline. This service:

1. **Consumes** raw logs from Kafka (`otel-logs` topic)
2. **Parses** OTLP (OpenTelemetry Log Protocol) format
3. **Validates** logs against a defined schema
4. **Enriches** logs with metadata (hostname, environment, processing timestamps)
5. **Stores** enriched logs in PostgreSQL
6. **Produces** enriched logs to Kafka (`stacklens-enriched` topic)
7. **Routes** invalid logs to Dead Letter Queue (`stacklens-dlq`)

## 🏗️ Architecture

```
Input Stream (Kafka)
        ↓
    otel-logs topic
        ↓
    [Consumer Group]
        ↓
    Batch Collection (100 logs or 5s)
        ↓
    ┌────────────────────────────┐
    │ Parser/Enricher Service    │
    │                            │
    │  1. Extract OTLP Format    │
    │  2. Validate Schema        │
    │  3. Enrich Metadata        │
    │  4. Store in PostgreSQL    │
    │  5. Produce to Kafka       │
    └────────────────────────────┘
        ↓          ↓          ↓
    Valid   Database   Kafka Out
    Logs    Storage    (enriched)
        ↓
    DLQ Topic
    (invalid/errors)
```

## 📦 Components

### 1. ParserEnricherService (Main Orchestrator)

**File**: `python-services/parser_enricher_service.py`

**Responsibilities**:
- Kafka consumer group management
- PostgreSQL connection pooling
- Message processing loop
- Statistics collection
- Graceful shutdown

**Key Methods**:
```python
run()                    # Main message processing loop
process_message()        # Single message processing pipeline
send_to_dlq()           # Error handling
get_statistics()        # Health metrics
shutdown()              # Graceful cleanup
```

**Configuration**:
```python
KAFKA_BROKERS           = os.getenv("KAFKA_BROKERS", "localhost:9092")
KAFKA_INPUT_TOPIC       = "otel-logs"
KAFKA_OUTPUT_TOPIC      = "stacklens-enriched"
KAFKA_DLQ_TOPIC         = "stacklens-dlq"
KAFKA_CONSUMER_GROUP    = "parser-enricher-group"

BATCH_SIZE              = 100           # Messages per batch
BATCH_TIMEOUT           = 5             # Seconds
KAFKA_SESSION_TIMEOUT   = 30000         # ms
KAFKA_MAX_POLL_RECORDS  = 100

DB_HOST                 = os.getenv("DB_HOST", "localhost")
DB_PORT                 = os.getenv("DB_PORT", "5432")
DB_NAME                 = os.getenv("DB_NAME", "stacklens")
DB_USER                 = os.getenv("DB_USER", "stacklens")
DB_PASSWORD             = os.getenv("DB_PASSWORD", "")
DB_POOL_SIZE            = 5             # Connection pool size
```

### 2. SchemaValidator

**Validates** that logs conform to required structure:

**Required Fields**:
- `timestamp` (ISO 8601 format, required)
- `service` (string, required)
- `level` (enum: debug, info, warn, error, critical, required)
- `message` (string, required)

**Optional Fields**:
- `request_id` (string, UUID format)
- `trace_id` (string)
- `span_id` (string)
- `user_id` (string)
- `session_id` (string)
- `action` (string)
- `resource_id` (string)
- Custom fields (passed through)

**Validation Steps**:
1. Check all required fields present
2. Validate field types (timestamp is string, level is in enum)
3. Validate timestamp ISO 8601 format
4. Validate log level is valid severity

### 3. MetadataEnricher

**Adds** enrichment metadata to validated logs:

**Added Fields**:
- `hostname` - System hostname where service runs
- `environment` - Environment name (dev/staging/prod)
- `parsed_at` - When log was parsed (ISO 8601)
- `enriched_at` - When metadata added (ISO 8601)
- `service_version` - Service version from config

**Future Enhancements**:
- Geo-IP lookup for client IPs
- User profile enrichment
- Business context lookup
- Performance metrics

### 4. Database Schema

**File**: `python-services/schema.sql`

**Tables**:

#### enriched_logs (Main Table)
```sql
CREATE TABLE enriched_logs (
  id BIGSERIAL PRIMARY KEY,
  
  -- Core Log Fields
  timestamp TIMESTAMP WITH TIME ZONE,      -- Original log timestamp
  service VARCHAR(255),                    -- Service name
  level VARCHAR(50),                       -- Log level (debug/info/warn/error/critical)
  message TEXT,                            -- Log message
  
  -- Correlation IDs
  trace_id VARCHAR(32),                    -- Distributed trace ID
  span_id VARCHAR(32),                     -- Trace span ID
  request_id UUID,                         -- Request tracking ID
  session_id UUID,                         -- Session tracking ID
  correlation_id UUID,                     -- General correlation ID
  
  -- Business Context
  user_id VARCHAR(255),                    -- User identifier
  action VARCHAR(255),                     -- User action
  resource_id VARCHAR(255),                -- Resource identifier
  
  -- Error Tracking
  error_code VARCHAR(50),                  -- Error classification
  error_message TEXT,                      -- Detailed error message
  stack_trace TEXT,                        -- Stack trace for debugging
  
  -- Enrichment Metadata
  hostname VARCHAR(255),                   -- Host where log originated
  environment VARCHAR(50),                 -- Environment (dev/staging/prod)
  service_version VARCHAR(50),             -- Service version
  
  -- Processing Timestamps
  parsed_at TIMESTAMP WITH TIME ZONE,      -- When parsed by service
  enriched_at TIMESTAMP WITH TIME ZONE,    -- When enriched
  stored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Additional Context
  metadata JSONB,                          -- Arbitrary additional fields
  source_ip VARCHAR(45),                   -- Client IP (IPv4 or IPv6)
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes** (8 total for query performance):
```sql
INDEX idx_enriched_logs_timestamp        -- For time-range queries
INDEX idx_enriched_logs_service          -- For service filtering
INDEX idx_enriched_logs_level            -- For error/critical filtering
INDEX idx_enriched_logs_trace_id         -- For distributed tracing
INDEX idx_enriched_logs_request_id       -- For request tracking
INDEX idx_enriched_logs_error_code       -- For error aggregation
INDEX idx_enriched_logs_action           -- For action analytics
INDEX idx_enriched_logs_composite        -- Composite (timestamp, service, level)
```

#### dlq_messages (Dead Letter Queue)
```sql
CREATE TABLE dlq_messages (
  id BIGSERIAL PRIMARY KEY,
  original_message JSONB,                  -- Original message that failed
  error_reason VARCHAR(500),               -- Why it failed
  error_details JSONB,                     -- Detailed error info
  retry_count INTEGER DEFAULT 0,           -- Retry attempts
  last_retry_at TIMESTAMP,                 -- Last retry timestamp
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### parser_metadata (Run Statistics)
```sql
CREATE TABLE parser_metadata (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  total_messages_processed BIGINT,
  successful_messages BIGINT,
  failed_messages BIGINT,
  average_processing_time_ms FLOAT
);
```

#### audit_log (System Events)
```sql
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50),
  event_data JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

#### raw_logs (Optional Archive)
```sql
CREATE TABLE raw_logs (
  id BIGSERIAL PRIMARY KEY,
  original_otel_log JSONB,                 -- Full OTLP format
  stored_at TIMESTAMP DEFAULT NOW()
);
```

**Views** (For Common Queries):

```sql
-- Logs by service (last 24 hours)
CREATE VIEW v_logs_by_service AS
SELECT service, level, COUNT(*) as count
FROM enriched_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY service, level;

-- Error logs (last 7 days)
CREATE VIEW v_error_logs AS
SELECT timestamp, service, error_code, error_message, stack_trace
FROM enriched_logs
WHERE level IN ('error', 'critical')
AND timestamp > NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;

-- DLQ summary
CREATE VIEW v_dlq_summary AS
SELECT error_reason, COUNT(*) as count, MAX(created_at) as last_occurrence
FROM dlq_messages
GROUP BY error_reason;
```

## 🔄 Processing Pipeline

### Step 1: Extract OTLP Format

**Input** (OTLP Protocol):
```json
{
  "resourceLogs": [
    {
      "resource": {
        "attributes": [
          {"key": "service.name", "value": {"stringValue": "order-service"}},
          {"key": "service.version", "value": {"stringValue": "1.0.0"}}
        ]
      },
      "scopeLogs": [
        {
          "scope": {"name": "app"},
          "logRecords": [
            {
              "timeUnixNano": "1705316445000000000",
              "body": {"stringValue": "Order created"},
              "severityNumber": 9,
              "severityText": "Info",
              "attributes": [
                {"key": "request_id", "value": {"stringValue": "req-123"}},
                {"key": "user_id", "value": {"stringValue": "user-456"}}
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Extracted Fields**:
- Service name from `resource.attributes[service.name]`
- Log timestamp from `logRecords[timeUnixNano]` (convert from nanoseconds)
- Message from `logRecords[body.stringValue]`
- Level from `logRecords[severityText]`
- Additional attributes from `logRecords[attributes][]`

### Step 2: Validate Schema

**Checks**:
- Required fields present (timestamp, service, level, message)
- Field types correct
- Timestamp is valid ISO 8601
- Level is one of: debug, info, warn, error, critical

**Failure Route**: → DLQ (Dead Letter Queue)

### Step 3: Enrich Metadata

**Adds**:
- `hostname` - System hostname
- `environment` - Config environment
- `parsed_at` - Current timestamp (parsing complete)
- `enriched_at` - Current timestamp (enrichment complete)

**Preserves**:
- All original fields
- Optional correlation IDs
- Business context fields

### Step 4: Store in PostgreSQL

**Insert** into `enriched_logs` table:
- All parsed + enriched fields
- Stored_at timestamp
- Metadata as JSONB

**Failure Route**: → Log error, → DLQ

### Step 5: Produce to Kafka

**Output Topic**: `stacklens-enriched`

**Message**:
```json
{
  "timestamp": "2024-01-15T10:00:00Z",
  "service": "order-service",
  "level": "info",
  "message": "Order created",
  "request_id": "req-123",
  "user_id": "user-456",
  "hostname": "pod-1",
  "environment": "production",
  "parsed_at": "2024-01-15T10:00:00.100Z",
  "enriched_at": "2024-01-15T10:00:00.150Z"
}
```

## 🚀 Deployment

### Local Development

1. **Start PostgreSQL**:
```bash
docker run -d --name stacklens-db \
  -e POSTGRES_PASSWORD=stacklens \
  -e POSTGRES_USER=stacklens \
  -e POSTGRES_DB=stacklens \
  -p 5432:5432 \
  postgres:15
```

2. **Initialize Schema**:
```bash
psql -h localhost -U stacklens -d stacklens \
  -f python-services/schema.sql
```

3. **Start Kafka** (via Docker):
```bash
docker-compose up -d kafka zookeeper
```

4. **Install Dependencies**:
```bash
pip install -r python-services/requirements-phase2.txt
```

5. **Start Service**:
```bash
cd python-services
KAFKA_BROKERS=localhost:9092 \
DB_HOST=localhost \
DB_USER=stacklens \
DB_PASSWORD=stacklens \
DB_NAME=stacklens \
python parser_enricher_service.py
```

### Docker Deployment

1. **Build Image**:
```bash
docker build -f python-services/Dockerfile.phase2 \
  -t stacklens/parser-enricher:latest \
  .
```

2. **Run Container**:
```bash
docker run -d \
  --name parser-enricher \
  -e KAFKA_BROKERS=kafka:9092 \
  -e DB_HOST=postgres \
  -e DB_USER=stacklens \
  -e DB_PASSWORD=stacklens \
  -e DB_NAME=stacklens \
  --network stacklens-network \
  stacklens/parser-enricher:latest
```

3. **Docker Compose**:
See `docker-compose.yml` for full stack orchestration.

## 🧪 Testing

### Unit Tests

**File**: `tests/unit/test_parser_enricher.py`

```bash
pytest tests/unit/test_parser_enricher.py -v
```

### Integration Tests

**File**: `tests/integration/test_phase2_parser.py`

```bash
pytest tests/integration/test_phase2_parser.py -v
```

**Coverage**:
- OTLP log extraction
- Schema validation
- Metadata enrichment
- Kafka production
- Database storage
- DLQ routing
- End-to-end processing

### Manual Testing

1. **Send test message to Kafka**:
```bash
kafka-console-producer --broker-list localhost:9092 \
  --topic otel-logs < test-message.json
```

2. **Verify output**:
```bash
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic stacklens-enriched \
  --from-beginning
```

3. **Query database**:
```sql
SELECT * FROM enriched_logs ORDER BY stored_at DESC LIMIT 10;
SELECT * FROM dlq_messages;
SELECT COUNT(*) FROM enriched_logs WHERE level = 'error';
```

## 📊 Monitoring

### Health Checks

**Service Health Endpoint**: `http://localhost:8000/health`

**Response**:
```json
{
  "status": "healthy",
  "kafka_connected": true,
  "database_connected": true,
  "messages_processed": 1250,
  "processing_rate_msgs_per_sec": 25.5,
  "error_rate": 0.02
}
```

### Metrics to Track

- **Processing Rate**: Messages per second
- **Error Rate**: Failed messages / total messages
- **DLQ Messages**: Count of invalid messages
- **Database Latency**: Insert time per message
- **Kafka Lag**: Consumer group lag

### Logs

**Log Levels**:
- `DEBUG`: Detailed tracing (disabled in production)
- `INFO`: Service events (startups, completions)
- `WARNING`: Non-fatal issues
- `ERROR`: Failed messages (sent to DLQ)
- `CRITICAL`: Service failures

**Log Format**:
```
[2024-01-15 10:00:00,123] [INFO] [ParserEnricherService] Started processing batch (100 messages)
[2024-01-15 10:00:00,456] [ERROR] [ParserEnricherService] Schema validation failed: Missing field 'service'
[2024-01-15 10:00:01,789] [INFO] [ParserEnricherService] Batch complete: 98 valid, 2 invalid (2.0% error rate)
```

## ⚠️ Error Handling

### Validation Errors
- **Missing required fields**: → DLQ with error reason
- **Invalid field types**: → DLQ with type error
- **Invalid timestamp**: → DLQ with format error

### Processing Errors
- **Database connection lost**: Service retries, logs to WARNING
- **Database insert failure**: → DLQ with error details
- **Kafka producer error**: → DLQ, retry later

### Graceful Shutdown
- Flushes pending messages to Kafka
- Closes database connections
- Reports final statistics
- Exit code 0 on success

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| KAFKA_BROKERS | localhost:9092 | Kafka broker addresses |
| KAFKA_CONSUMER_GROUP | parser-enricher-group | Consumer group name |
| KAFKA_SESSION_TIMEOUT | 30000 | Session timeout (ms) |
| KAFKA_MAX_POLL_RECORDS | 100 | Max records per poll |
| DB_HOST | localhost | PostgreSQL host |
| DB_PORT | 5432 | PostgreSQL port |
| DB_NAME | stacklens | Database name |
| DB_USER | stacklens | Database user |
| DB_PASSWORD | | Database password |
| DB_POOL_SIZE | 5 | Connection pool size |
| BATCH_SIZE | 100 | Messages per batch |
| BATCH_TIMEOUT | 5 | Batch timeout (seconds) |
| SERVICE_NAME | parser-enricher | Service name |
| ENVIRONMENT | production | Environment name |
| LOG_LEVEL | INFO | Logging level |

## 📝 Future Enhancements

### Phase 2 Extensions
- Geo-IP enrichment for client IPs
- User profile enrichment from microservices
- Business event correlation
- Performance metric extraction
- Custom field mapping configuration

### Performance Optimizations
- Batch database inserts (vs. one per message)
- Connection pooling optimization
- Message compression in Kafka
- Async processing with asyncio

### Advanced Features
- Dead letter queue reprocessing
- Schema evolution handling
- Custom transformation plugins
- Real-time alerting on patterns

## 🐛 Troubleshooting

### Service Won't Start
```
Check:
1. Kafka brokers reachable: nc -zv localhost 9092
2. PostgreSQL accessible: psql -h localhost -U stacklens -d stacklens
3. Database schema created: SELECT * FROM information_schema.tables;
```

### High Error Rate
```
Check:
1. Incoming message format: kafka-console-consumer --topic otel-logs
2. Database space: SELECT pg_database_size('stacklens');
3. Kafka topic retention: kafka-topics --describe --topic otel-logs
```

### Database Slow Inserts
```
Solutions:
1. Check indexes: SELECT * FROM pg_stat_indexes;
2. Increase pool size: DB_POOL_SIZE=10
3. Batch multiple inserts
```

## 📚 References

- [OpenTelemetry Protocol Specification](https://opentelemetry.io/docs/specs/otel/protocol/)
- [Kafka Python Client](https://kafka-python.readthedocs.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Python Logging](https://docs.python.org/3/library/logging.html)

## ✅ Checklist - Phase 2 Completion

- [ ] Schema created and verified in PostgreSQL
- [ ] Service starts without errors
- [ ] Service connects to Kafka and PostgreSQL
- [ ] Can process sample OTLP messages
- [ ] Enriched logs appear in database
- [ ] Enriched messages appear in Kafka output topic
- [ ] Invalid messages routed to DLQ
- [ ] Metrics and statistics collected
- [ ] Docker image builds successfully
- [ ] Integration tests pass (90%+ coverage)
- [ ] Documentation complete and reviewed
- [ ] Service handles graceful shutdown

---

**Next Phase**: Phase 3 - Advanced Enrichment & Analytics
