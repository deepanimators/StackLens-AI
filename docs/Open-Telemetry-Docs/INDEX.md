# StackLens AI Deploy - Project Index & Navigation Guide

## 🚀 Quick Links

### Current Status
- **Phase 4**: ✅ COMPLETE (Real-Time Analytics)
- **Progress**: 21,052+ lines | 80% complete
- **Next**: Phase 5 - ML & Anomaly Detection

### Start Here
1. **Project Overview**: [`PROJECT_COMPLETE_STATUS.md`](#project-overview-documents)
2. **Quick Start**: [`PHASE_4_QUICKSTART.md`](#quick-start-guides)
3. **Architecture**: [`PHASE_4_ANALYTICS_GUIDE.md`](#detailed-guides)

---

## 📁 File Structure

```
StackLens-AI-Deploy/
├── python-services/                 # Python service implementations
│   ├── analytics_service.py         # Phase 4: Real-time analytics
│   ├── analytics_schema.sql         # Phase 4: Time-series database
│   ├── dashboard_api.py             # Phase 4: REST API endpoints
│   ├── enrichment_service.py        # Phase 3: Enrichment pipeline
│   ├── enrichment_schema.sql        # Phase 3: Enrichment database
│   ├── parser_service.py            # Phase 2: Log parsing
│   ├── parser_schema.sql            # Phase 2: Parser database
│   ├── enricher_service.py          # Phase 2: Enrichment
│   ├── enricher_schema.sql          # Phase 2: Enricher database
│   ├── collector_service.py         # Phase 1: Log collection
│   ├── collector_schema.sql         # Phase 1: Collector database
│   ├── processor.py                 # Phase 0: Log processing
│   ├── processor_schema.sql         # Phase 0: Processor database
│   ├── requirements-phase4.txt      # Phase 4: Python dependencies
│   ├── requirements-phase3.txt      # Phase 3: Python dependencies
│   ├── requirements-parser.txt      # Phase 2: Python dependencies
│   ├── requirements-collector.txt   # Phase 1: Python dependencies
│   └── requirements-processor.txt   # Phase 0: Python dependencies
│
├── tests/
│   └── integration/
│       ├── test_phase4_analytics.py # Phase 4: 24 test cases
│       ├── test_phase3_enrichment.py# Phase 3: 20 test cases
│       ├── test_parser.py           # Phase 2: 20 test cases (parser)
│       ├── test_enricher.py         # Phase 2: 16 test cases (enricher)
│       ├── test_collector.py        # Phase 1: 16 test cases
│       └── test_processor.py        # Phase 0: 18 test cases
│
├── infrastructure/
│   └── docker/
│       ├── analytics.Dockerfile     # Phase 4: Analytics service container
│       ├── dashboard.Dockerfile     # Phase 4: Dashboard API container
│       ├── enrichment.Dockerfile    # Phase 3: Enrichment container
│       ├── parser.Dockerfile        # Phase 2: Parser container
│       ├── collector.Dockerfile     # Phase 1: Collector container
│       └── processor.Dockerfile     # Phase 0: Processor container
│
├── docs/
│   ├── PROJECT_COMPLETE_STATUS.md   # 📍 Overall project status
│   ├── PHASE_4_ANALYTICS_GUIDE.md   # 📍 Phase 4: Detailed guide
│   ├── PHASE_4_QUICKSTART.md        # 📍 Phase 4: Quick start
│   ├── PHASE_4_COMPLETION_SUMMARY.md# 📍 Phase 4: Completion summary
│   ├── PHASE_3_ENRICHMENT_GUIDE.md
│   ├── PHASE_3_QUICKSTART.md
│   ├── PHASE_3_COMPLETION_SUMMARY.md
│   ├── PHASE_2_GUIDE.md
│   ├── PHASE_1_GUIDE.md
│   ├── PHASE_0_GUIDE.md
│   └── [Other documentation files]
│
├── docker-compose-phase4.yml        # Phase 4: Docker Compose (6 services)
├── docker-compose-phase3.yml        # Phase 3: Docker Compose (6 services)
├── docker-compose-phase2.yml        # Phase 2: Docker Compose
├── docker-compose-collector.yml     # Phase 1: Docker Compose
├── docker-compose-processor.yml     # Phase 0: Docker Compose
│
└── [Root configuration files]
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── eslint.config.js
    └── README.md
```

---

## 📚 Documentation Index

### Project Overview Documents
| Document | Purpose | Length | Status |
|----------|---------|--------|--------|
| [`PROJECT_COMPLETE_STATUS.md`](./PROJECT_COMPLETE_STATUS.md) | Full project overview, all phases | 3,000+ lines | ✅ Current |
| [`PHASE_4_COMPLETION_SUMMARY.md`](./PHASE_4_COMPLETION_SUMMARY.md) | Phase 4 completion details | 400+ lines | ✅ Current |

### Quick Start Guides
| Guide | Phase | Time | Steps | Status |
|-------|-------|------|-------|--------|
| [`PHASE_4_QUICKSTART.md`](./PHASE_4_QUICKSTART.md) | 4: Analytics | 5 min | 10 | ✅ |
| [`PHASE_3_QUICKSTART.md`](./PHASE_3_QUICKSTART.md) | 3: Enrichment | 5 min | 10 | ✅ |
| `PHASE_2_QUICKSTART.md` | 2: Parsing | 5 min | 10 | ✅ |
| `PHASE_1_QUICKSTART.md` | 1: Collection | 5 min | 10 | ✅ |
| `PHASE_0_QUICKSTART.md` | 0: Processing | 5 min | 10 | ✅ |

### Detailed Guides
| Guide | Phase | Topics | Length | Status |
|-------|-------|--------|--------|--------|
| [`PHASE_4_ANALYTICS_GUIDE.md`](./PHASE_4_ANALYTICS_GUIDE.md) | 4 | Architecture, Schema, API, Deployment | 3,200+ lines | ✅ |
| [`PHASE_3_ENRICHMENT_GUIDE.md`](./PHASE_3_ENRICHMENT_GUIDE.md) | 3 | 3-stage enrichment, caching, DLQ | 2,200+ lines | ✅ |
| `PHASE_2_GUIDE.md` | 2 | Parsing, enrichment, schema | 2,400+ lines | ✅ |
| `PHASE_1_GUIDE.md` | 1 | Collection, APIs, protocols | 1,200+ lines | ✅ |
| `PHASE_0_GUIDE.md` | 0 | Processing, ML, pipeline | 1,500+ lines | ✅ |

### Completion Summaries
| Summary | Phase | Purpose | Status |
|---------|-------|---------|--------|
| [`PHASE_4_COMPLETION_SUMMARY.md`](./PHASE_4_COMPLETION_SUMMARY.md) | 4 | Deliverables, metrics, readiness | ✅ |
| [`PHASE_3_COMPLETION_SUMMARY.md`](./PHASE_3_COMPLETION_SUMMARY.md) | 3 | Deliverables, features, metrics | ✅ |
| Other completion summaries | 0-2 | Phase details | ✅ |

---

## 🔗 Documentation Navigation by Task

### I want to...

#### Get Started Quickly
1. **Read Project Overview**: [`PROJECT_COMPLETE_STATUS.md`](./PROJECT_COMPLETE_STATUS.md) (15 min)
2. **Run Phase 4 Services**: [`PHASE_4_QUICKSTART.md`](./PHASE_4_QUICKSTART.md) (10 min)
3. **Test the System**: Follow 10-step quick start guide

#### Understand Architecture
1. **System Overview**: [`PROJECT_COMPLETE_STATUS.md`](#architecture-section) (System Architecture)
2. **Phase 4 Details**: [`PHASE_4_ANALYTICS_GUIDE.md`](#architecture-section)
3. **Database Schema**: [`PHASE_4_ANALYTICS_GUIDE.md`](#database-schema-section)

#### Deploy to Production
1. **Review Checklist**: [`PHASE_4_ANALYTICS_GUIDE.md`](#production-readiness-section)
2. **Deployment Options**: [`PHASE_4_ANALYTICS_GUIDE.md`](#deployment-section)
3. **Docker Compose**: `docker-compose-phase4.yml`
4. **Kubernetes Ready**: See deployment section

#### Use Dashboard API
1. **API Reference**: [`PHASE_4_ANALYTICS_GUIDE.md`](#dashboard-api-endpoints)
2. **Query Examples**: [`PHASE_4_QUICKSTART.md`](#common-endpoints-reference)
3. **Endpoints**: 12 REST endpoints documented with examples

#### Configure Alert Rules
1. **Alert Rules Guide**: [`PHASE_4_ANALYTICS_GUIDE.md`](#default-alert-rules)
2. **Examples**: SQL insert statements
3. **Operators**: `>`, `<`, `>=`, `<=`, `==` supported

#### Troubleshoot Issues
1. **Common Problems**: [`PHASE_4_ANALYTICS_GUIDE.md`](#troubleshooting)
2. **Quick Fixes**: [`PHASE_4_QUICKSTART.md`](#troubleshooting)
3. **Database Queries**: Check metrics and logs

#### Write Tests
1. **Test Structure**: `tests/integration/test_phase4_analytics.py` (example)
2. **24 Test Cases**: 6 test classes covering all components
3. **Run Tests**: `pytest tests/integration/test_phase4_analytics.py -v`

#### Monitor System
1. **Monitoring Setup**: [`PHASE_4_ANALYTICS_GUIDE.md`](#monitoring)
2. **Prometheus Metrics**: Port 8004
3. **Health Endpoints**: `GET /health`, `GET /stats`

#### Customize for My Use Case
1. **Schema Customization**: Edit `analytics_schema.sql`
2. **Alert Rules**: Add custom rules to `analytics_alert_rules` table
3. **API Extensions**: Add endpoints to `dashboard_api.py`
4. **Configuration**: Environment variables in `docker-compose-phase4.yml`

#### Plan Phase 5 (ML)
1. **Current Status**: 80% complete (4 of 5 phases)
2. **Phase 5 Readiness**: [`PROJECT_COMPLETE_STATUS.md`](#roadmap-phase-5)
3. **ML Architecture**: See project overview

---

## 📊 Phase Progression

### Phase 0: Log Processing ✅
- **Status**: Complete
- **Files**: `processor.py` (350+ lines), `processor_schema.sql`, tests, docker
- **Key Feature**: ML-powered log classification
- **Guide**: `PHASE_0_GUIDE.md`

### Phase 1: Log Collection ✅
- **Status**: Complete
- **Files**: `collector_service.py` (400+ lines), schema, tests, docker
- **Key Feature**: Multi-protocol collection (syslog, HTTP/REST)
- **Guide**: `PHASE_1_GUIDE.md`

### Phase 2: Parsing & Enrichment ✅
- **Status**: Complete
- **Files**: `parser_service.py`, `enricher_service.py`, schemas, tests, docker
- **Key Feature**: Grok parsing, metadata extraction, normalization
- **Guide**: `PHASE_2_GUIDE.md`

### Phase 3: Advanced Enrichment ✅
- **Status**: Complete
- **Files**: `enrichment_service.py` (579 lines), schema, tests, docker
- **Key Feature**: 3-stage enrichment (Geo-IP, User, Business) with caching
- **Guide**: [`PHASE_3_ENRICHMENT_GUIDE.md`](./PHASE_3_ENRICHMENT_GUIDE.md)
- **Quick Start**: [`PHASE_3_QUICKSTART.md`](./PHASE_3_QUICKSTART.md)

### Phase 4: Real-Time Analytics ✅ 🔥 CURRENT
- **Status**: Complete
- **Files**: `analytics_service.py`, `analytics_schema.sql`, `dashboard_api.py`, tests, docker
- **Key Feature**: Time-series aggregation, alert rules, dashboard API
- **Guide**: [`PHASE_4_ANALYTICS_GUIDE.md`](./PHASE_4_ANALYTICS_GUIDE.md)
- **Quick Start**: [`PHASE_4_QUICKSTART.md`](./PHASE_4_QUICKSTART.md)
- **Summary**: [`PHASE_4_COMPLETION_SUMMARY.md`](./PHASE_4_COMPLETION_SUMMARY.md)

### Phase 5: ML & Anomaly Detection 🚧
- **Status**: Ready to begin
- **Planned Features**: Anomaly detection, pattern recognition, predictive analytics
- **Estimated**: 5,000+ lines
- **Timeline**: Next phase

---

## 💻 Code Statistics

### By Phase
```
Phase 0: 4,600 lines  ✅
Phase 1: 3,650 lines  ✅
Phase 2: 5,422 lines  ✅
Phase 3: 5,280 lines  ✅
Phase 4: 2,100 lines  ✅
─────────────────────
Total: 21,052 lines
```

### By Type
```
Python:        14,500+ lines
SQL:           2,000+ lines
Tests:         2,200+ lines
Documentation: 2,352+ lines
Config/Docker: ~500 lines
```

### By Component
```
Services:      12 Python files
Schemas:       5 SQL files
Tests:         5 test files
Docker:        6 Dockerfiles
Documentation: 10+ guides
```

---

## 🛠️ Quick Reference Commands

### Start Services
```bash
# Phase 4 (Current)
docker-compose -f docker-compose-phase4.yml up -d

# Phase 3
docker-compose -f docker-compose-phase3.yml up -d

# All phases
docker-compose -f docker-compose-phase4.yml up -d
docker-compose -f docker-compose-phase3.yml up -d
```

### Check Health
```bash
# Phase 4 API
curl http://localhost:8005/health

# Database
psql -h localhost -U stacklens_user -d stacklens -c "SELECT 1;"

# Kafka
docker exec stacklens-kafka-analytics kafka-broker-api-versions --bootstrap-server=localhost:9092
```

### View Logs
```bash
# Analytics Service
docker-compose -f docker-compose-phase4.yml logs -f analytics-service

# Dashboard API
docker-compose -f docker-compose-phase4.yml logs -f dashboard-api

# All services
docker-compose -f docker-compose-phase4.yml logs -f
```

### Run Tests
```bash
# Phase 4 tests
pytest tests/integration/test_phase4_analytics.py -v

# All tests
pytest tests/integration/ -v

# With coverage
pytest tests/integration/ --cov=python-services --cov-report=html
```

### Query Data
```bash
# Recent metrics
curl "http://localhost:8005/metrics?window=1min&limit=10"

# Health status
curl http://localhost:8005/health-status

# Active alerts
curl "http://localhost:8005/alerts?status=active"

# SLA
curl "http://localhost:8005/sla?days=7"
```

### Database Access
```bash
# Connect
psql -h localhost -U stacklens_user -d stacklens

# View metrics
SELECT * FROM analytics_metrics_1min ORDER BY timestamp DESC LIMIT 10;

# View alerts
SELECT * FROM analytics_alerts WHERE status = 'open';

# Check SLA
SELECT service, analytics_calculate_sla(service, CURRENT_TIMESTAMP - INTERVAL '7 days') FROM analytics_metrics_1hour GROUP BY service;
```

---

## 🎯 Common Workflows

### Workflow 1: First Time Setup (30 minutes)
1. Read: `PROJECT_COMPLETE_STATUS.md` (15 min)
2. Follow: `PHASE_4_QUICKSTART.md` step 1-5 (10 min)
3. Test: Query dashboard API (5 min)
4. Explore: Database and Kafka UI

### Workflow 2: Deploy to Production
1. Review: `PHASE_4_ANALYTICS_GUIDE.md` Deployment section
2. Prepare: Environment configuration
3. Deploy: Docker Compose or Kubernetes
4. Monitor: Health checks and logs
5. Validate: Performance tests

### Workflow 3: Add Custom Alert
1. Read: `PHASE_4_ANALYTICS_GUIDE.md` Alert Rules section
2. Connect: PostgreSQL `psql`
3. Insert: New rule to `analytics_alert_rules`
4. Test: Create scenario to trigger alert
5. Verify: Alert appears in dashboard

### Workflow 4: Troubleshoot Issue
1. Check: Service logs with `docker-compose logs -f`
2. Verify: Database connectivity
3. Inspect: Kafka messages
4. Review: `PHASE_4_ANALYTICS_GUIDE.md` Troubleshooting section
5. Fix: Configuration or restart services

### Workflow 5: Understand Data Flow
1. Start: `PROJECT_COMPLETE_STATUS.md` architecture section
2. Trace: Each phase's input/output
3. Examine: Source code comments
4. Study: `PHASE_4_ANALYTICS_GUIDE.md` data flow section
5. Practice: Send test data and track through system

---

## 📞 Support Matrix

| Issue | Resource | Document |
|-------|----------|----------|
| Service won't start | Logs + troubleshooting | `PHASE_4_QUICKSTART.md` |
| API returning errors | API reference | `PHASE_4_ANALYTICS_GUIDE.md` |
| High latency | Performance tuning | `PHASE_4_ANALYTICS_GUIDE.md` |
| Missing data | Data flow | `PHASE_4_ANALYTICS_GUIDE.md` |
| Database issues | SQL queries | `PHASE_4_ANALYTICS_GUIDE.md` |
| Alert not triggering | Rule configuration | `PHASE_4_ANALYTICS_GUIDE.md` |
| Need architecture help | System design | `PROJECT_COMPLETE_STATUS.md` |

---

## 🗺️ Documentation Map

```
Start Here
    ↓
PROJECT_COMPLETE_STATUS.md (80% overview)
    ↓
Choose Your Path:
    ├─→ Want quick demo? → PHASE_4_QUICKSTART.md (10 steps)
    ├─→ Need architecture? → PHASE_4_ANALYTICS_GUIDE.md (detailed)
    ├─→ Deploy to prod? → PHASE_4_ANALYTICS_GUIDE.md (deployment section)
    ├─→ Write tests? → test_phase4_analytics.py (examples)
    ├─→ Troubleshoot? → PHASE_4_QUICKSTART.md (troubleshooting)
    └─→ Advanced config? → python-services/ (source code)
```

---

## 📝 File Conventions

### Documentation Files
- `PHASE_X_GUIDE.md` - Comprehensive guide (2,000+ lines)
- `PHASE_X_QUICKSTART.md` - Quick start (300-400 lines, 10 steps)
- `PHASE_X_COMPLETION_SUMMARY.md` - Completion details

### Code Files
- `*_service.py` - Main service implementation
- `*_schema.sql` - Database schema
- `test_*.py` - Integration tests
- `*_api.py` - API service
- `requirements-*.txt` - Python dependencies

### Configuration
- `docker-compose-*.yml` - Docker Compose files
- `*.Dockerfile` - Container definitions
- `.env` files - Environment configuration

---

## ✅ Verification Checklist

Before using the system, verify:
- [ ] Docker & Docker Compose installed
- [ ] Read `PROJECT_COMPLETE_STATUS.md`
- [ ] Ports available (5432, 9092, 8004, 8005, 8080)
- [ ] Services start: `docker-compose -f docker-compose-phase4.yml up -d`
- [ ] Health check passes: `curl http://localhost:8005/health`
- [ ] Database accessible: `psql -h localhost -U stacklens_user -d stacklens -c "SELECT 1;"`
- [ ] Tests pass: `pytest tests/integration/test_phase4_analytics.py -v`

---

## 🚀 Next Steps

1. **Read**: [`PROJECT_COMPLETE_STATUS.md`](./PROJECT_COMPLETE_STATUS.md) (15 min)
2. **Run**: [`PHASE_4_QUICKSTART.md`](./PHASE_4_QUICKSTART.md) (10 min)
3. **Explore**: Query data with dashboard API (5 min)
4. **Learn**: Read [`PHASE_4_ANALYTICS_GUIDE.md`](./PHASE_4_ANALYTICS_GUIDE.md) (30 min)
5. **Extend**: Customize for your needs

---

**Last Updated**: 2024-01-15  
**Project Status**: 80% Complete (Phase 4 ✅)  
**Next Phase**: Phase 5 - ML & Anomaly Detection 🚧
