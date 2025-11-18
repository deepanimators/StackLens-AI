# Phase 1 Implementation Checklist

**Project**: StackLens AI - POS Integration  
**Target Branch**: `feature/pos-integration`  
**Target for Merge**: `develop`  
**Timeline**: 4-6 weeks (sprints of 1 week each)

---

## Week 1: Foundation & Setup

### Repository & Documentation
- [ ] Create branch: `git checkout -b feature/pos-integration`
- [ ] Add `CONTRIBUTING.md` with branching strategy and testing requirements
- [ ] Add `.github/pull_request_template.md` with checklist
- [ ] Add `.github/COPILOT_INSTRUCTIONS.md` with automated checks
- [ ] Create `docs/PHASE_1_IMPLEMENTATION_GUIDE.md`
- [ ] Create `.env.example` with all required variables
- [ ] Add `.github/workflows/ci.yml` with full CI pipeline
- [ ] Create `docker-compose.test.yml` with Kafka, Postgres, etc.

### Deliverables
- [ ] Documentation complete and reviewed
- [ ] CI pipeline working
- [ ] Local environment setup verified

---

## Week 2-3: Core Services Implementation

### POS Demo Service (`demo-pos-app/`)
- [ ] Add Winston logging with structured JSON format
- [ ] Implement Products API with model (id, name, sku, price|null)
- [ ] Implement POST /order endpoint
- [ ] Add error handling and logging for PRICE_MISSING
- [ ] Create unit tests (jest + supertest) for:
  - [ ] test_order_success
  - [ ] test_order_price_missing_logs_json
  - [ ] test_order_not_found
- [ ] Add Dockerfile and docker-compose entry
- [ ] Add npm scripts: `dev`, `build`, `test`, `start`
- [ ] README with setup instructions
- [ ] Local test: `npm test` passes with ≥85% coverage

### Logs Ingest API (`python-services/logs_ingest_service.py`)
- [ ] FastAPI service with POST /api/logs/ingest
- [ ] Pydantic schema for LogEvent
- [ ] Kafka producer (with fallback to Postgres)
- [ ] Unit tests for:
  - [ ] test_ingest_valid_log
  - [ ] test_ingest_invalid_log (422 response)
  - [ ] test_kafka_fallback
- [ ] Dockerfile and compose service
- [ ] Local test: `pytest python-services/ -v` passes

### Deliverables
- [ ] POS service logs structured JSON to file
- [ ] Logs ingest accepts and validates logs
- [ ] All unit tests passing
- [ ] Docker builds successfully

---

## Week 4: Consumer & Analytics

### Consumer Service (`python-services/consumer_service.py`)
- [ ] Kafka consumer for `pos-logs` topic
- [ ] Alert model: `alerts(id, issue_code, severity, suggested_fix, confidence, raw_log, status, created_at, jira_issue_key)`
- [ ] Rule engine with `detect_price_missing()` function
- [ ] Alert persistence to Postgres
- [ ] WebSocket event broadcast (stub for now)
- [ ] Integration tests:
  - [ ] test_price_missing_creates_alert
  - [ ] test_alert_persists_to_db
  - [ ] test_alert_within_10_seconds
- [ ] Local test with docker-compose: `docker-compose -f docker-compose.test.yml up --build`

### Analyzer Module (`python-services/analyzer_service.py`)
- [ ] Analyzer interface: `analyze(log) -> AnalysisResult`
- [ ] Deterministic rules for PRICE_MISSING and 2-3 other cases
- [ ] XGBoost pipeline scaffold (training script stub)
- [ ] Unit tests for analyzer output
- [ ] DB persistence for analysis results

### Deliverables
- [ ] Alert appears in Postgres within 10 seconds of order
- [ ] Analyzer correctly identifies issues
- [ ] Integration tests passing
- [ ] All services start in docker-compose

---

## Week 5: Jira & Frontend

### Jira Connector (`python-services/integrations/jira.py`)
- [ ] `create_ticket(alert_id) -> jira_issue_key`
- [ ] Retry logic with exponential backoff
- [ ] Configuration via env: JIRA_BASE_URL, JIRA_USER, JIRA_TOKEN, JIRA_PROJECT_KEY
- [ ] Update alerts table with jira_issue_key
- [ ] Unit tests mocking HTTP calls
- [ ] Manual script: `python create_ticket_for_alert.py --id <alert_id>`
- [ ] Local test: `pytest python-services/test_jira.py -v`

### Admin UI Pages (`apps/web/src/pages/admin/`)
- [ ] **Alerts Dashboard** (/admin/alerts):
  - [ ] Table showing all alerts
  - [ ] Real-time updates via WebSocket
  - [ ] Status: NEW, ACKNOWLEDGED, RESOLVED
  - [ ] Severity badges (critical, warning, info)
- [ ] **Alert Detail Page** (/admin/alerts/:id):
  - [ ] Raw JSON log viewer
  - [ ] Suggested fix card
  - [ ] Confidence score
  - [ ] "Create Jira Ticket" button
  - [ ] Jira link (if ticket exists)
- [ ] **Jira Settings Page** (/admin/settings/jira):
  - [ ] Form: project_key, test credentials
  - [ ] "Test Connection" button
  - [ ] Backend API: POST /api/admin/jira/validate
- [ ] ErrorBoundary + logger for client-side errors

### Client-Side Logger & Error Capture (`apps/web/src/utils/logger.ts`)
- [ ] Logger module with batching
- [ ] POST to /api/logs/ingest on client events
- [ ] `window.onerror` handler
- [ ] `window.onunhandledrejection` handler
- [ ] ErrorBoundary component
- [ ] Unit tests with jest + fetch mocks
- [ ] Integration with logs ingest API

### UI Components & Storybook
- [ ] **AlertRow** component (table row for alert)
- [ ] **AlertDetail** component
- [ ] **LogViewer** component (JSON syntax highlighting)
- [ ] **SuggestedFixCard** component
- [ ] **JiraSettingsForm** component
- [ ] **Storybook stories** (≥5 stories with different states):
  - [ ] AlertRow - critical alert
  - [ ] AlertRow - warning alert
  - [ ] AlertDetail - with Jira linked
  - [ ] LogViewer - large JSON
  - [ ] JiraSettingsForm - validated
- [ ] Jest tests for all components

### Deliverables
- [ ] Admin UI dashboard displays alerts in real-time
- [ ] Clicking "Create Jira" creates ticket in test project
- [ ] Jira link appears on alert after creation
- [ ] Storybook builds with ≥5 stories
- [ ] All component tests passing

---

## Week 6: Testing & Hardening

### End-to-End Test (`tests/e2e/pos-integration.test.ts`)
- [ ] **Scenario 1**: Place order with price=null
  - [ ] HTTP POST /order with product_id
  - [ ] Wait for alert to appear in Postgres
  - [ ] Assert alert exists with PRICE_MISSING code
  - [ ] Assert created_at within 10 seconds
- [ ] **Scenario 2**: Alert appears in Admin UI
  - [ ] Login as admin
  - [ ] Navigate to /admin/alerts
  - [ ] Assert alert visible (with poll/timeout)
  - [ ] Click alert to open detail page
- [ ] **Scenario 3**: Create Jira Ticket
  - [ ] On detail page, click "Create Jira"
  - [ ] Assert Jira ticket created (or mock recorded)
  - [ ] Assert jira_issue_key in DB and displayed in UI

### Performance & Load Testing (optional)
- [ ] Simulate 100+ concurrent orders
- [ ] Assert consumer keeps up (no lag)
- [ ] Assert no data loss

### Security Hardening
- [ ] Secrets not committed: `git-secrets --install`
- [ ] GitHub Secrets configured: `JIRA_TOKEN`
- [ ] Rate limiting on /api/logs/ingest
- [ ] RBAC for admin endpoints
- [ ] Input validation + sanitization
- [ ] Error messages don't expose internals

### Documentation
- [ ] README with start/test/build instructions
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Deployment guide for staging
- [ ] Troubleshooting guide

### Deliverables
- [ ] E2E tests passing: `npm run test:e2e`
- [ ] Coverage ≥85% across all services
- [ ] No secrets in code
- [ ] Security scan passes (npm audit, safety)
- [ ] Documentation complete

---

## Pre-Merge Verification

### Final Checklist
- [ ] All branches up to date with develop
- [ ] All tests passing locally and in CI
- [ ] Coverage reports generated (≥85%)
- [ ] Linting: eslint, ruff, mypy all green
- [ ] Security: npm audit, safety, trufflehog all green
- [ ] Docker build succeeds
- [ ] Storybook builds successfully
- [ ] No conflicts with develop branch
- [ ] PR description complete with test summary
- [ ] 2 approvals from reviewers
- [ ] All acceptance criteria met

### Acceptance Criteria for Phase 1

**Must Pass Before Merge**:
1. ✅ When a user orders a product with price=null from POS demo, an alert with issue_code=PRICE_MISSING must be present in Postgres within 10 seconds.
2. ✅ Admin UI shows the alert in Alerts Dashboard in real time with raw JSON log displayed.
3. ✅ Clicking "Create Jira" produces a Jira issue in the configured test project or a recorded failure with retry options; the Jira key is persisted to DB and shown in UI.
4. ✅ All unit, integration, and E2E tests for this flow pass in CI.
5. ✅ No secrets in code; Jira token stored in GitHub Secrets; all changes in branch feature/pos-integration.

### Merge Steps
1. Ensure all CI checks pass
2. Request 2 reviewers to approve
3. After approval, merge to `develop` with message: `[feature] Phase 1: POS integration with StackLens`
4. Create release notes for `develop` branch
5. Tag version (e.g., `v1.1.0-beta`)

---

## Post-Merge Tasks

### Monitoring
- [ ] Monitor Prod/Staging alerts dashboard for errors
- [ ] Check consumer lag in Kafka
- [ ] Monitor API response times

### Documentation
- [ ] Update main README
- [ ] Publish Storybook to GitHub Pages
- [ ] Create blog post or release notes

### Planning Phase 2
- [ ] Schedule Phase 2 kickoff
- [ ] Prioritize next features (ML, Elasticsearch, metrics)
- [ ] Update project roadmap

---

## Testing Summary

| Suite | Location | Metrics | Time |
|-------|----------|---------|------|
| Unit - POS | demo-pos-app/test/ | ≥85% | 1min |
| Unit - Python | python-services/test_*.py | ≥85% | 2min |
| Unit - React | apps/web/src/**/*.test.tsx | ≥85% | 2min |
| Integration | tests/integration/ | ≥85% | 5min |
| E2E | tests/e2e/ | N/A | 10min |
| **TOTAL** | **All** | **≥85%** | **~20min** |

---

## File Structure

```
StackLens-AI-Deploy/
├── CONTRIBUTING.md                         ✓ [Week 1]
├── .github/
│   ├── COPILOT_INSTRUCTIONS.md            ✓ [Week 1]
│   ├── pull_request_template.md            ✓ [Week 1]
│   ├── workflows/
│   │   └── ci.yml                          ✓ [Week 1]
├── .env.example                            ✓ [Week 1]
├── docker-compose.test.yml                 ✓ [Week 1]
├── docker-compose.yml                      ✓ [Week 1]
├── demo-pos-app/
│   ├── src/
│   │   ├── index.ts
│   │   ├── logger.ts                       ✓ [Week 2]
│   │   ├── models/product.ts               ✓ [Week 2]
│   │   └── routes/order.ts                 ✓ [Week 2]
│   ├── test/
│   │   └── order.test.ts                   ✓ [Week 2]
│   ├── Dockerfile                          ✓ [Week 2]
│   └── package.json
├── python-services/
│   ├── logs_ingest_service.py              ✓ [Week 3]
│   ├── consumer_service.py                 ✓ [Week 4]
│   ├── analyzer_service.py                 ✓ [Week 4]
│   ├── integrations/
│   │   └── jira.py                         ✓ [Week 5]
│   ├── models/
│   │   └── alert.py                        ✓ [Week 4]
│   ├── rules/
│   │   └── price_missing_rule.py           ✓ [Week 4]
│   ├── test_*.py                           ✓ [Weeks 3-5]
│   ├── Dockerfile
│   └── requirements.txt
├── apps/
│   └── web/src/
│       ├── pages/admin/
│       │   ├── AlertsDashboard.tsx         ✓ [Week 5]
│       │   ├── AlertDetail.tsx             ✓ [Week 5]
│       │   └── JiraSettings.tsx            ✓ [Week 5]
│       ├── components/
│       │   ├── AlertRow.tsx                ✓ [Week 5]
│       │   ├── AlertRow.stories.tsx        ✓ [Week 5]
│       │   ├── LogViewer.tsx               ✓ [Week 5]
│       │   ├── ErrorBoundary.tsx           ✓ [Week 5]
│       │   └── *.test.tsx
│       ├── utils/
│       │   ├── logger.ts                   ✓ [Week 5]
│       │   └── logger.test.ts              ✓ [Week 5]
│       └── hooks/
│           └── useWebSocket.ts             ✓ [Week 5]
├── tests/
│   ├── integration/
│   │   └── pos-alerts.test.ts              ✓ [Week 4]
│   └── e2e/
│       └── pos-integration.test.ts         ✓ [Week 6]
└── docs/
    ├── PHASE_1_IMPLEMENTATION_GUIDE.md     ✓ [Week 1]
    └── PHASE_1_DEPLOYMENT.md               ✓ [Week 6]
```

---

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Code Coverage | ≥85% | TBD | ⏳ |
| Unit Tests Passing | 100% | TBD | ⏳ |
| Integration Tests Passing | 100% | TBD | ⏳ |
| E2E Tests Passing | 100% | TBD | ⏳ |
| CI Pipeline Green | Yes | TBD | ⏳ |
| Secrets Detected | 0 | TBD | ⏳ |
| Alert latency (target: <10s) | <10s | TBD | ⏳ |

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Kafka consumer lag | Alerts delayed | Add monitoring, optimize batch size |
| WebSocket disconnections | Real-time updates fail | Add reconnection logic, heartbeat |
| Jira API rate limiting | Tickets not created | Add queue, retry logic, batching |
| Database migration failures | Data loss | Test migrations in staging first |
| Secrets exposed | Security breach | Use git-secrets, GitHub Secrets, code review |

---

## Questions & Support

- **Architecture**: See `docs/PHASE_1_IMPLEMENTATION_GUIDE.md`
- **Setup Issues**: See `demo-pos-app/README.md` and `TROUBLESHOOTING.md`
- **CI Failures**: Check `.github/workflows/ci.yml` and `COPILOT_INSTRUCTIONS.md`
- **Jira Integration**: See `python-services/integrations/jira.py` comments

---

**Phase 1 Ready?** All items checked ✓ and merged to `develop`! 🎉
