# 🎯 Week 4 Implementation Kickoff: Consumer Service

**Status**: Ready to Start  
**Progress**: 50% Complete (Week 1-3 Done)  
**Branch**: `feature/pos-integration`  
**Last Commit**: c396117f

---

## 📋 Quick Context

### What's Done ✅
- **Week 1-2**: POS Demo Service (Express.js, 15 tests, Docker)
- **Week 3**: Logs Ingest API (FastAPI, 20+ tests, Kafka + Postgres)

### What's Next ⏳
- **Week 4**: Consumer Service (Kafka consumer, rule engine, alert persistence)

### Architecture Status
```
POS Demo → Logs Ingest → [Consumer] → Alerts → [Admin UI]
           ✅ Done        ↓ NOW    ✅ Path Ready  ⏳ Week 5
                      This Week
```

---

## 🎯 Week 4 Objectives

### Primary Goal
Implement a Kafka consumer that:
1. Subscribes to `pos-logs` topic from Logs Ingest API
2. Detects errors using rule engine (PRICE_MISSING, database errors, etc.)
3. Creates alert records in Postgres
4. Tracks status and Jira integration

### Acceptance Criteria
- ✅ Consumer subscribes to Kafka pos-logs topic
- ✅ PRICE_MISSING rule detector implemented and tested
- ✅ Alerts persisted to Postgres alerts table
- ✅ Full type hints and docstrings
- ✅ 8+ comprehensive tests
- ✅ Production-ready code quality

---

## 🏗️ Architecture: Week 4 Addition

```
Kafka Topic: pos-logs
    │
    ├─→ Log Event (from Logs Ingest API)
    │   {
    │     "request_id": "req-123",
    │     "service": "pos-demo",
    │     "error_code": "PRICE_MISSING",
    │     "message": "Product price is null",
    │     "timestamp": "2025-11-18T19:00:00Z"
    │   }
    │
    └─→ Consumer Service (Week 4)
        │
        ├─→ Rule Engine: Detect error_code
        │   │
        │   ├─→ PRICE_MISSING → Alert (severity: critical)
        │   ├─→ DATABASE_ERROR → Alert (severity: warning)
        │   └─→ [More rules...]
        │
        └─→ Create Alert Record
            {
              "issue_code": "PRICE_MISSING",
              "severity": "critical",
              "suggested_fix": "Check product pricing configuration",
              "confidence": 1.0,
              "raw_log": {...},
              "status": "open",
              "jira_issue_key": null,
              "created_at": "2025-11-18T19:00:00Z"
            }
            │
            └─→ Postgres: alerts table
```

---

## 📁 Files to Create

### 1. `python-services/models/alert.py` (80-120 lines)

**Purpose**: SQLAlchemy ORM model for alerts table

**Content**:
```python
# Alert model with fields:
# - id: UUID primary key
# - issue_code: String (PRICE_MISSING, DATABASE_ERROR, etc.)
# - severity: Enum (critical, warning, info)
# - suggested_fix: String
# - confidence: Float (0.0-1.0)
# - raw_log: JSON field (store original log)
# - status: Enum (open, acknowledged, resolved)
# - jira_issue_key: String (nullable, for tracking)
# - created_at: DateTime
# - updated_at: DateTime
# - resolved_at: DateTime (nullable)
```

**Key Methods**:
- `from_log_event()` - Create alert from log event
- `__repr__()` - For debugging
- Table creation/migration support

### 2. `python-services/rules/detectors.py` (100-150 lines)

**Purpose**: Rule detection engine

**Content**:
```python
# Rule detectors as functions:

# def detect_price_missing(log_event) -> Optional[AlertData]
#   - Check if error_code == "PRICE_MISSING"
#   - Return AlertData with severity=critical, suggested_fix

# def detect_database_error(log_event) -> Optional[AlertData]
#   - Check if error_code starts with "DATABASE_"
#   - Return AlertData with severity=warning

# def detect_all_rules(log_event) -> Optional[AlertData]
#   - Apply all detectors in sequence
#   - Return first matching alert
#   - Return None if no match

# class AlertData (dataclass)
#   - issue_code: str
#   - severity: str
#   - suggested_fix: str
#   - confidence: float
```

**Rule Mapping**:
| Error Code | Severity | Suggested Fix |
|-----------|----------|---------------|
| PRICE_MISSING | critical | Check product pricing configuration |
| DATABASE_ERROR | warning | Verify database connection |
| TIMEOUT | info | Monitor system performance |
| INVALID_ORDER | critical | Validate order structure |

### 3. `python-services/consumer_service.py` (150-200 lines)

**Purpose**: Kafka consumer with rule detection and alert persistence

**Content**:
```python
# Consumer Service:

# class ConsumerService:
#   - Connect to Kafka broker
#   - Subscribe to pos-logs topic
#   - Process messages:
#     1. Parse log event
#     2. Detect rules
#     3. Create alert in DB
#   - Error handling & retry logic
#   - Logging with request_id

# Main loop:
# consumer = ConsumerService()
# consumer.start()  # Runs forever
```

**Key Features**:
- Kafka consumer group: `stacklens-consumer-group`
- Topic: `pos-logs`
- Auto commit: true (after processing)
- Error handling: Log errors, continue processing
- Database session management
- Structured JSON logging

### 4. `python-services/test_consumer.py` (250-350 lines)

**Purpose**: pytest tests for consumer and detectors

**Test Structure**:
```python
# TestRuleDetectors (4-5 tests)
#   - test_detect_price_missing
#   - test_detect_database_error
#   - test_no_rule_match
#   - test_detect_with_multiple_rules

# TestConsumerService (3-4 tests)
#   - test_consumer_processes_message
#   - test_consumer_creates_alert
#   - test_consumer_error_handling
#   - test_consumer_persistence

# Integration Tests (1-2 tests)
#   - test_full_flow_kafka_to_db
#   - test_multiple_logs_batched
```

**Test Fixtures**:
- Mock Kafka consumer
- Mock database session
- Sample log events
- Alert factory

---

## 🛠️ Implementation Plan

### Step 1: Set Up Database Model (30 min)
1. Create `python-services/models/alert.py`
2. Define Alert SQLAlchemy model
3. Create database migration/table creation
4. Write model docstrings

### Step 2: Implement Rule Engine (45 min)
1. Create `python-services/rules/detectors.py`
2. Implement AlertData dataclass
3. Implement detector functions
4. Add docstrings and type hints
5. Create rule mapping table

### Step 3: Implement Consumer Service (60 min)
1. Create `python-services/consumer_service.py`
2. Implement ConsumerService class
3. Kafka consumer connection logic
4. Message processing loop
5. Error handling and logging
6. Database session management

### Step 4: Write Tests (60 min)
1. Create `python-services/test_consumer.py`
2. Create test fixtures
3. Write rule detector tests
4. Write consumer service tests
5. Write integration tests
6. Run and verify all tests

### Step 5: Documentation & Cleanup (30 min)
1. Create WEEK_4_COMPLETION_REPORT.md
2. Update PHASE_1_PROGRESS.md
3. Create verification script
4. Commit with descriptive message

**Total Estimated Time**: 3.5 hours

---

## 📚 Reference Material

### Previous Week Documentation
- `WEEK_1_2_COMPLETION_REPORT.md` - POS Demo details
- `WEEK_3_COMPLETION_REPORT.md` - Logs Ingest API details
- `docs/PHASE_1_IMPLEMENTATION_GUIDE.md` - Full specification

### Code Examples (Existing)
- **Pydantic Model**: See `logs_ingest_service.py` LogEventSchema
- **FastAPI**: See `logs_ingest_service.py` app structure
- **pytest Tests**: See `test_logs_ingest.py` test patterns
- **Type Hints**: See all Python services for type hint patterns

### External References
- Kafka Python Client: `from kafka import KafkaConsumer`
- SQLAlchemy: `from sqlalchemy import Column, String, create_engine`
- pytest: `from pytest import fixture, mark`

---

## 🔗 Data Models

### Input: LogEvent (from Logs Ingest API)
```python
{
  "request_id": "req-123456",
  "service": "pos-demo",
  "error_code": "PRICE_MISSING",        # ← Key field for rule detection
  "message": "Product price is null",
  "log_level": "error",
  "timestamp": "2025-11-18T19:00:00Z",
  
  # Optional fields:
  "user_id": "user-789",
  "session_id": "sess-456",
  "order_id": "order-123",
  "product_id": "prod-mouse-defect",
  "additional_context": {...},
  "source_ip": "192.168.1.1",
  "endpoint": "/order"
}
```

### Output: Alert Record (for Postgres)
```python
{
  "id": "alert-abc123",                           # UUID
  "issue_code": "PRICE_MISSING",                  # From error_code
  "severity": "critical",                         # Enum: critical, warning, info
  "suggested_fix": "Check product pricing...",    # From rule mapping
  "confidence": 1.0,                              # Float 0.0-1.0
  "raw_log": {...},                               # Full original log event
  "status": "open",                               # Enum: open, acknowledged, resolved
  "jira_issue_key": null,                         # Populated by Admin UI
  "created_at": "2025-11-18T19:00:00Z",           # Auto
  "updated_at": "2025-11-18T19:00:00Z",           # Auto
  "resolved_at": null,                            # Set when resolved
  "metadata": {
    "request_id": "req-123456",
    "service": "pos-demo",
    "log_level": "error"
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests (Rule Detectors)
```python
def test_detect_price_missing():
    log_event = {
        "error_code": "PRICE_MISSING",
        "message": "Product price is null"
    }
    alert = detect_price_missing(log_event)
    assert alert.issue_code == "PRICE_MISSING"
    assert alert.severity == "critical"
```

### Integration Tests (Full Flow)
```python
def test_full_flow_kafka_to_db():
    # 1. Publish log event to Kafka
    # 2. Consumer processes it
    # 3. Alert created in DB
    # 4. Verify alert record exists
    # 5. Verify status is "open"
```

### Error Case Tests
```python
def test_consumer_handles_invalid_message():
    # Publish malformed JSON to Kafka
    # Consumer logs error
    # Continue processing next message
    # No crash
```

---

## ✅ Success Criteria

### Code Quality
- [x] Full type hints on all functions
- [x] Docstrings on all classes/functions
- [x] Error handling on all paths
- [x] No hardcoded values (use env vars)
- [x] Follows existing code patterns

### Testing
- [x] 8+ comprehensive tests
- [x] Unit tests for rule detectors
- [x] Integration tests for consumer
- [x] Error case coverage
- [x] All tests passing

### Functionality
- [x] Consumer subscribes to Kafka topic
- [x] Processes log events
- [x] Detects PRICE_MISSING rule
- [x] Creates alert records
- [x] Persists to Postgres

### Documentation
- [x] WEEK_4_COMPLETION_REPORT.md
- [x] API documentation
- [x] Deployment guide
- [x] Inline code comments

---

## 🚀 Quick Start Commands

### Before Starting
```bash
# Ensure on correct branch
git checkout feature/pos-integration

# Verify Python environment
python3 --version

# Install/update dependencies
pip install -r python-services/requirements_ingest.txt
pip install sqlalchemy psycopg2-binary kafka-python  # Week 4 deps
```

### Running Tests
```bash
# All tests
cd python-services && pytest test_consumer.py -v

# Specific test
pytest test_consumer.py::TestRuleDetectors::test_detect_price_missing -v

# With coverage
pytest test_consumer.py --cov=consumer_service --cov=rules.detectors
```

### Checking Code Quality
```bash
# Type checking (if using mypy)
mypy consumer_service.py

# Linting
pylint consumer_service.py

# Code formatting (if using black)
black consumer_service.py
```

---

## 📞 Support References

### Error Messages
- **ModuleNotFoundError: No module named 'kafka'** → Install: `pip install kafka-python`
- **ModuleNotFoundError: No module named 'sqlalchemy'** → Install: `pip install sqlalchemy`
- **Connection refused (Kafka)** → Ensure Kafka broker running (check docker-compose)
- **No module named 'psycopg2'** → Install: `pip install psycopg2-binary`

### Common Issues & Fixes
1. **Consumer not receiving messages**: Check topic name (should be `pos-logs`)
2. **Database connection error**: Verify POSTGRES_* env vars
3. **Tests failing**: Ensure fixtures properly mocking Kafka
4. **Type hints errors**: Use from `typing import Optional, List, Dict`

---

## 📅 Timeline

**Start**: Now (Week 4 kickoff)  
**End**: When all tests passing + documented  
**Estimated Duration**: 3-4 hours

**Milestones**:
- [ ] Models created & tested (30 min)
- [ ] Rule detectors implemented (45 min)
- [ ] Consumer service complete (60 min)
- [ ] All tests passing (60 min)
- [ ] Documentation & commit (30 min)

---

## 🎯 Next After Week 4

Once Week 4 complete:
- **Week 5**: Admin UI & Jira integration
- **Week 6**: E2E testing & final verification
- **Merge**: Feature branch → develop → main

---

## 📝 File Checklist

### To Create
- [ ] `python-services/models/__init__.py` (if not exists)
- [ ] `python-services/models/alert.py` (80-120 lines)
- [ ] `python-services/rules/__init__.py` (if not exists)
- [ ] `python-services/rules/detectors.py` (100-150 lines)
- [ ] `python-services/consumer_service.py` (150-200 lines)
- [ ] `python-services/test_consumer.py` (250-350 lines)
- [ ] `WEEK_4_COMPLETION_REPORT.md` (documentation)

### To Update
- [ ] `python-services/requirements_ingest.txt` (add consumer deps)
- [ ] `PHASE_1_PROGRESS.md` (update progress)
- [ ] Git commits (well-formatted with description)

### To Verify
- [ ] All tests passing (pytest)
- [ ] Type hints correct (optional: mypy)
- [ ] Code follows patterns (compare to Week 3)
- [ ] Docstrings complete
- [ ] Error handling present

---

## 🎊 You're Ready!

Everything is set up for Week 4 success:
- ✅ Architecture documented
- ✅ Data models defined
- ✅ Test strategy clear
- ✅ File structure planned
- ✅ Reference material available

**Start with Step 1**: Create `models/alert.py`

**Good luck! 🚀**

---

**Branch**: `feature/pos-integration`  
**Status**: Ready for Week 4  
**Progress**: 50% → 66% (after Week 4)
