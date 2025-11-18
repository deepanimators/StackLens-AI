# Phase 1 Implementation: Master Index & Quick Reference

**Project**: StackLens AI - POS Integration with Real-Time Alerts  
**Status**: ✅ READY FOR IMPLEMENTATION  
**Timeline**: 4-6 weeks  
**Target Release**: `develop` branch (then QA → staging → main)

---

## 📋 Documentation Index

Read these in order:

| # | Document | Purpose | Read Time |
|---|----------|---------|-----------|
| 1 | **PHASE_1_EXECUTIVE_SUMMARY.md** | Start here - overview & quick start | 10 min |
| 2 | **PHASE_1_IMPLEMENTATION_GUIDE.md** | Complete technical specification | 30 min |
| 3 | **PHASE_1_CHECKLIST.md** | Week-by-week implementation plan | 15 min |
| 4 | **DOCKER_COMPOSE_SETUP.md** | Local testing infrastructure | 10 min |
| 5 | **CONTRIBUTING.md** | Repository governance & branching | 10 min |
| 6 | **.github/COPILOT_INSTRUCTIONS.md** | Automated verification rules | 5 min |

**Total**: ~80 minutes to fully understand Phase 1

---

## 🚀 Quick Start (5 min)

### Prerequisites
```bash
# Check your environment
node --version   # Should be 18+
python --version # Should be 3.9+
docker --version # Should be installed
git --version    # Should be installed
```

### One-Time Setup
```bash
# Clone repo (if not already done)
git clone https://github.com/deepanimators/StackLens-AI.git
cd StackLens-AI

# Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/pos-integration

# Install dependencies
npm install
pip install -r python-services/requirements.txt
```

### Verify Setup
```bash
# Start test stack
docker-compose -f docker-compose.test.yml up --build

# In another terminal, verify services
docker-compose -f docker-compose.test.yml ps
# Should show: postgres, kafka, zookeeper, redis, logs-ingest, consumer, pos-demo, web

# Test endpoints
curl http://localhost:3001/health
curl http://localhost:8001/health
```

### First Test: Place an Order
```bash
# In new terminal, place order with null price
curl -X POST http://localhost:3001/api/order \
  -H "Content-Type: application/json" \
  -d '{"product_id": "prod_mouse_defect", "user_id": "user123"}'

# Wait 10 seconds...

# Check if alert was created
docker-compose -f docker-compose.test.yml exec postgres \
  psql -U postgres -d stacklens_test \
  -c "SELECT id, issue_code, severity, status FROM alerts ORDER BY created_at DESC LIMIT 1;"
```

Expected output:
```
                   id                    | issue_code |  severity  | status
----------------------------------------+------------+------------+--------
 12345678-1234-1234-1234-123456789012    | PRICE_MISSING | critical   | NEW
(1 row)
```

✅ **Success!** Alert created within 10 seconds.

---

## 📁 Code Skeleton Files

All production-ready boilerplate code is documented in `PHASE_1_IMPLEMENTATION_GUIDE.md` under "Complete Code Skeleton" section.

### Files to Create (with code provided):

**Week 1-2: POS Service (Node/Express)**
```
demo-pos-app/src/types/index.ts
demo-pos-app/src/logger.ts
demo-pos-app/src/db/seed.ts
demo-pos-app/src/routes/products.ts
demo-pos-app/src/routes/orders.ts
demo-pos-app/src/index.ts
demo-pos-app/test/orders.test.ts
demo-pos-app/Dockerfile
demo-pos-app/jest.config.js
```

**Week 3: Logs Ingest (FastAPI)**
```
python-services/logs_ingest_service.py
python-services/test_logs_ingest.py
```

**Week 4: Consumer & Analyzer (Python)**
```
python-services/models/alert.py
python-services/rules/detectors.py
python-services/consumer_service.py
python-services/test_consumer.py
```

**Week 5: Frontend (React)**
```
apps/web/src/utils/logger.ts
apps/web/src/utils/logger.test.ts
apps/web/src/components/ErrorBoundary.tsx
apps/web/src/pages/admin/AlertsDashboard.tsx
apps/web/src/components/AlertRow.tsx
```

✅ **All code is provided** - Just copy & paste!

---

## ✅ Acceptance Criteria (Must Pass Before Merge)

### Functional (Must Work)
```
☐ Order product with price=null
  → Alert appears in Postgres within 10 seconds
  → Raw log JSON visible
  
☐ Alert Dashboard
  → Displays alert in real-time
  → Shows issue_code, severity, confidence
  
☐ Create Jira Ticket
  → Click button → Ticket created in test project
  → Jira key persisted to DB and shown in UI
```

### Quality (Must Pass)
```
☐ Unit Tests: 100% passing, ≥85% coverage
☐ Integration Tests: 100% passing
☐ E2E Tests: 100% passing (headless)
☐ Linting: eslint, ruff, mypy all green
☐ Security: npm audit, safety, trufflehog green
☐ No secrets in code
```

### Process (Must Complete)
```
☐ All work on feature/pos-integration branch
☐ PR with required checklist completed
☐ 2+ approvals from reviewers
☐ CI pipeline passing
☐ Code review checklist verified
```

---

## 🔄 Development Workflow

### Daily Workflow
```bash
# Start your day
git pull origin develop
docker-compose -f docker-compose.test.yml up --build

# Make changes
# ... edit files ...

# Test locally
npm run lint
npm run test:unit
npm run test:integration

# Commit
git add .
git commit -m "[component] Brief description"

# End of day
git push origin feature/pos-integration
```

### Before Opening PR
```bash
# Run full verification
npm run lint
npm run check
npm test -- --coverage
docker-compose -f docker-compose.test.yml up --build
npm run test:integration
npm run test:e2e

# Check for secrets
git-secrets --scan
trufflehog filesystem . --json

# If all green, open PR
git push origin feature/pos-integration
# Go to GitHub and create PR
```

### After PR Opened
1. Wait for CI to complete (~20 minutes)
2. Request 2 reviewers
3. Address feedback
4. After 2 approvals, merge to `develop`

---

## 🧪 Testing Commands

### Quick Test (2 min)
```bash
npm run test:unit -- --testPathPattern="orders|logger"
```

### Full Test Suite (20 min)
```bash
npm run lint
npm run check
npm run test:unit -- --coverage
npm run test:integration
npm run test:e2e
```

### Test Specific Service
```bash
# POS service
cd demo-pos-app && npm test

# Python services
pytest python-services/test_*.py -v --cov

# React components
npm run test -- apps/web/src/utils/logger.test.ts
```

### Test End-to-End Flow
```bash
# Terminal 1: Start services
docker-compose -f docker-compose.test.yml up --build

# Terminal 2: Run E2E tests
npm run test:e2e

# Terminal 3: Manual testing
curl -X POST http://localhost:3001/api/order \
  -H "Content-Type: application/json" \
  -d '{"product_id": "prod_mouse_defect", "user_id": "test"}'
```

---

## 🔧 Debugging

### Alert not appearing?
```bash
# 1. Check logs ingest is running
docker-compose -f docker-compose.test.yml logs logs-ingest -f

# 2. Manually call logs ingest
curl -X POST http://localhost:8001/api/logs/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "test-123",
    "service": "test",
    "env": "test",
    "timestamp": "2024-01-15T10:00:00Z",
    "action": "create_order",
    "level": "error",
    "message": "test",
    "error_code": "PRICE_MISSING"
  }'

# 3. Check consumer is processing
docker-compose -f docker-compose.test.yml logs consumer -f

# 4. Verify alert in DB
docker-compose -f docker-compose.test.yml exec postgres \
  psql -U postgres -d stacklens_test \
  -c "SELECT * FROM alerts LIMIT 1;"
```

### Tests failing?
```bash
# Get full error details
npm run test:unit -- --verbose 2>&1 | tee test-output.log

# Run single test
npm run test:unit -- --testNamePattern="order price missing"

# Debug with console output
npm run test:unit -- --detectOpenHandles
```

### Docker not starting?
```bash
# Check for port conflicts
lsof -i :3001
lsof -i :5432
lsof -i :9092

# Kill process if needed
kill -9 <PID>

# Rebuild images
docker-compose -f docker-compose.test.yml build --no-cache

# Start with debug logging
docker-compose -f docker-compose.test.yml logs -f
```

---

## 📊 Progress Tracking

Use this table to track implementation progress:

| Week | Component | Tasks | Status |
|------|-----------|-------|--------|
| 1-2 | POS Demo | Products API, Orders, Logging, Tests, Docker | ⏳ |
| 3 | Logs Ingest | FastAPI, Validation, Tests | ⏳ |
| 4 | Consumer | Rules, Alerts, Persistence, Tests | ⏳ |
| 5 | Frontend | Logger, ErrorBoundary, Admin UI, Jira Button | ⏳ |
| 6 | Testing | E2E, Hardening, Docs, Merge | ⏳ |

Update status:
- ⏳ Not started
- 🔄 In progress
- ✅ Complete
- ❌ Blocked

---

## 🎯 Success Metrics

When Phase 1 is done, you should have:

| Metric | Target | ✅ |
|--------|--------|-----|
| Code Coverage | ≥85% | ☐ |
| Unit Tests Passing | 100% | ☐ |
| Integration Tests Passing | 100% | ☐ |
| E2E Tests Passing | 100% | ☐ |
| Alert Latency | <10 seconds | ☐ |
| Secrets Found | 0 | ☐ |
| Security Vulnerabilities | 0 critical | ☐ |
| Linting Issues | 0 | ☐ |
| Type Errors | 0 | ☐ |
| CI Pipeline Passing | Yes | ☐ |
| Jira Integration Working | Yes | ☐ |
| Real-Time UI Updates | Yes | ☐ |

---

## 📞 Getting Help

### Documentation
- **Architecture Q's**: See PHASE_1_IMPLEMENTATION_GUIDE.md
- **Code examples**: See code skeleton in this doc or PHASE_1_IMPLEMENTATION_GUIDE.md
- **Testing help**: See DOCKER_COMPOSE_SETUP.md
- **Repo rules**: See CONTRIBUTING.md
- **CI checks**: See .github/COPILOT_INSTRUCTIONS.md

### Common Issues
```
Q: Service won't start
A: Check docker-compose logs, verify ports aren't in use

Q: Tests failing
A: Run with --verbose, check docker-compose is running

Q: Can't connect to database
A: Verify postgres service is healthy: docker-compose ps

Q: Alert not appearing
A: Check logs-ingest, consumer, and kafka services

Q: Secret accidentally committed
A: Run `git rm --cached <file>`, then `git commit --amend`
```

### Emergency Contacts
- 🏢 Architecture: Refer to PHASE_1_IMPLEMENTATION_GUIDE.md
- 🐛 Bugs: Create issue with error logs
- 💬 Questions: Post in #dev-questions Slack

---

## 🎓 Learning Resources

- [Node/Express Guide](https://expressjs.com/en/guide/routing.html)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [PostgreSQL JSON Support](https://www.postgresql.org/docs/15/datatype-json.html)
- [Kafka Consumer Tutorial](https://kafka.apache.org/quickstart)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Jest Testing](https://jestjs.io/docs/getting-started)
- [Playwright E2E](https://playwright.dev/docs/intro)

---

## 📋 Pre-Implementation Checklist

Before starting coding:
- [ ] Read PHASE_1_EXECUTIVE_SUMMARY.md (10 min)
- [ ] Understand acceptance criteria (5 min)
- [ ] Review code skeleton in PHASE_1_IMPLEMENTATION_GUIDE.md (10 min)
- [ ] Verify dev environment (Node 18+, Python 3.9+, Docker) (5 min)
- [ ] Create feature branch (2 min)
- [ ] Set up docker-compose locally (5 min)
- [ ] Test first order → alert flow manually (10 min)
- [ ] Ready to code! 🚀

**Total setup time**: ~45 minutes

---

## 🔐 Security Reminders

**Before Every Commit**:
```bash
# Scan for secrets
git-secrets --scan --cached

# Verify no credentials in code
grep -r "password\|token\|secret" --include="*.ts" --include="*.py" . 2>/dev/null

# Check .env.example doesn't have real values
cat .env.example
```

**Never Commit**:
- ❌ API keys or tokens
- ❌ Database credentials
- ❌ Private keys
- ❌ OAuth secrets
- ❌ Passwords

**Always Use**:
- ✅ GitHub Secrets for CI
- ✅ Environment variables
- ✅ .env.example template
- ✅ git-secrets hooks

---

## 🏁 Final Checklist Before Merge

```
BEFORE OPENING PR:
☐ All tests pass locally
☐ No secrets in code
☐ Coverage ≥85%
☐ Code follows conventions
☐ Comments explain non-obvious code

WHEN OPENING PR:
☐ Use PR template
☐ List all files changed
☐ Include test results
☐ Reference acceptance criteria
☐ Request 2 reviewers

BEFORE MERGE:
☐ CI pipeline passing
☐ 2+ approvals received
☐ No merge conflicts
☐ All feedback addressed
☐ All acceptance criteria met
```

---

## 📞 Contact & Support

| Topic | Resource |
|-------|----------|
| Questions | GitHub Issues or Slack #dev-questions |
| Bugs | Create issue with logs and reproduction steps |
| Architecture | PHASE_1_IMPLEMENTATION_GUIDE.md |
| Testing | DOCKER_COMPOSE_SETUP.md |
| Governance | CONTRIBUTING.md |
| Copilot Rules | .github/COPILOT_INSTRUCTIONS.md |

---

## 🎉 You're Ready!

You now have:
✅ Complete specification  
✅ Production-ready code skeleton  
✅ CI/CD pipeline  
✅ Testing infrastructure  
✅ Documentation  
✅ Governance & review process  

**Next step**: Start with Week 1 checklist in PHASE_1_CHECKLIST.md

**Good luck!** 🚀

---

**Last Updated**: January 2024  
**Version**: 1.0.0  
**Phase 1 Status**: Ready for Implementation
