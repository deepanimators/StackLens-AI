# Copilot Instructions for StackLens AI Phase 1 Development

This document codifies the automated checks and verification requirements that **must** be performed before marking any PR as ready for merge.

## Pre-Commit Verification (Local)

Before pushing to GitHub, Copilot must execute:

### 1. Lint & Format
```bash
npm run lint
npm run lint:fix  # auto-fix if needed
```
**Requirement**: Zero warnings. If ESLint fails, fix before commit.

### 2. Type Checking
```bash
npm run check  # TypeScript
# For Python:
ruff check .
mypy python-services/ --ignore-missing-imports
```
**Requirement**: Zero errors. Types must be strict.

### 3. Unit Tests
```bash
npm run test:unit
# For Python:
pytest python-services/ -v
```
**Requirement**: All tests passing. If any fail:
1. Re-run with `-k <test-name> -vv` to capture stack trace
2. Attempt automated fix (e.g., mock setup, type fixes)
3. If still failing, create a `bug/<test-name>` issue and stop (do not push)

### 4. Coverage Report
```bash
npm run test:unit -- --coverage
```
**Requirement**: Coverage ≥85%. Report the %:
```
Line    Stmt    Branch  Func
────────────────────────────
78%     82%     71%     85%  ← PASS if all ≥85%
```
If below threshold, add tests until threshold met.

### 5. Secret Scan
```bash
git diff HEAD~1 HEAD | git-secrets --scan --cached
# Fallback: trufflehog filesystem . --json
```
**Requirement**: Zero secrets found. If detected:
1. Remove immediately
2. Rotate any exposed tokens
3. Use GitHub Secrets for sensitive values

### 6. Docker Build & Test
```bash
docker-compose -f docker-compose.test.yml up --build -d
npm run test:integration
docker-compose -f docker-compose.test.yml down
```
**Requirement**: Services build and tests pass. Logs captured for PR artifacts.

## Pre-Push Verification (Before opening PR)

### 7. Storybook (for UI changes)
If UI components changed:
```bash
npm run storybook:build
```
**Requirement**: Storybook builds without errors. At least 5 component stories present.

### 8. End-to-End Test (Full workflow)
For integration features (like Phase 1 POS):
```bash
npm run test:e2e -- --project e2e-chromium
```
**Requirement**: E2E tests pass. Simulate the full flow:
- POS places order → logs ingest → consumer → DB alert → admin UI → Jira ticket

## PR Creation & CI Validation

### 9. PR Template
Every PR **must** include:
- [ ] Title: `[feature] <short desc>` or `[fix]` or `[ci]`
- [ ] Description: list of files changed, test summary, how to run locally
- [ ] All checklists from `.github/pull_request_template.md` completed
- [ ] Acceptance criteria listed for Phase 1 features
- [ ] Link to related issues

### 10. GitHub Actions CI
CI workflow (`.github/workflows/ci.yml`) enforces:
- ✅ Linting (eslint, ruff, mypy)
- ✅ Unit tests pass with coverage ≥85%
- ✅ Docker Compose integration tests pass
- ✅ E2E tests pass (headless)
- ✅ Security scans (npm audit, safety for Python)
- ✅ No secrets detected (trufflehog)

**If CI fails**: Do NOT merge. Copilot must:
1. Review the failing job logs
2. Run the failing test locally with `--verbose`
3. Identify root cause (test harness, mock setup, type issue, etc.)
4. Commit fix and re-push
5. Wait for CI to re-run

## Code Review Verification

### 11. Required Approvals
- ✅ At least **2 reviewers** must approve
- ✅ Reviewers check the PR review checklist (see CONTRIBUTING.md)
- ✅ No "Request Changes" feedback unresolved

### 12. Branch Protection Rules
On `develop` and `staging`:
- [ ] Require PR reviews: 2 approvals
- [ ] Require status checks to pass (all CI jobs)
- [ ] Require branches up to date before merge
- [ ] Restrict who can push (maintainers only)
- [ ] Dismiss stale PR approvals on new commits

## Acceptance Criteria Verification (Phase 1)

For Phase 1 (POS integration), Copilot must verify:

1. **Alert Creation**: Order product with `price=null` in POS demo → alert in Postgres within 10 seconds
   ```bash
   curl -X POST http://localhost:3001/order \
     -H "Content-Type: application/json" \
     -d '{"product_id": "null-price-product"}'
   # Wait 10 seconds
   psql $DATABASE_URL -c "SELECT * FROM alerts ORDER BY created_at DESC LIMIT 1"
   ```

2. **Admin UI Alert Display**: Alert visible in dashboard with real-time updates
   - Start all services: `docker-compose up -d`
   - Open http://localhost:5173/admin/alerts
   - Assert alert appears within 5 seconds of creation

3. **Jira Ticket Creation**: Click "Create Jira" → ticket created in test project
   - Mock or real Jira test project configured
   - Verify `alerts.jira_issue_key` populated

4. **All Tests Pass**: No failures in unit, integration, or E2E
   - Coverage ≥85%
   - CI green

5. **No Secrets**: `git-secrets` and `trufflehog` pass
   - No API keys, tokens, or credentials in code
   - Sensitive values in GitHub Secrets or `.env.example` template

## Merge Approval

Only merge after:
- ✅ CI status checks all pass
- ✅ ≥2 reviewers approved
- ✅ No merge conflicts (branch up to date with develop)
- ✅ All acceptance criteria met (for Phase 1 features)
- ✅ Copilot pre-commit and PR verification complete

## Copilot Failure Handling

If Copilot detects a failure:

1. **Trivial Fixes** (auto-fixable):
   - Lint errors: `npm run lint:fix`
   - Type errors: Add explicit type annotations
   - Import issues: Add missing imports
   - → Re-run tests, commit, re-push

2. **Non-Trivial Failures** (require human review):
   - Test logic failure: Create `bug/<test-name>` issue with:
     - Failing test code
     - Stack trace
     - Expected vs actual behavior
     - Proposed fix (if possible)
   - → Stop and notify human (do not push)

3. **External Service Failures** (e.g., Kafka unavailable):
   - Retry test with backoff: `--retry 3`
   - Check Docker Compose service health: `docker-compose ps`
   - If persistent: Create issue and notify

## Summary

**COPILOT WORKFLOW**:
1. Run local checks (lint, type, unit, coverage, secrets, docker, storybook)
2. Fix any failures automatically if possible
3. Commit with conventional message
4. Push and open PR with required template
5. Wait for CI to pass
6. Notify reviewers for approval
7. Merge only after 2 approvals + CI green

**HUMAN WORKFLOW**:
1. Review PR with checklist
2. Ask questions or request changes (if needed)
3. Approve if meets criteria
4. Copilot merges after 2 approvals

---

For questions or issues, refer to CONTRIBUTING.md or contact @maintainers.
