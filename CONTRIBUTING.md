# Contributing to StackLens AI

Thank you for contributing to StackLens AI! This document outlines our development workflow, branching strategy, and quality standards.

## Branching Strategy

We follow a structured branching model to ensure code quality and traceability:

### Main Branches
- **`main`**: Production-ready code. Only merged from `staging` after QA approval.
- **`staging`**: Pre-production testing and integration. All feature branches merge here first.
- **`develop`**: Active development branch. Target for all feature PRs.

### Feature Branches
All new work must be done on feature branches:
- `feature/<short-description>` — New features (e.g., `feature/pos-integration`)
- `fix/<short-description>` — Bug fixes (e.g., `fix/kafka-consumer-offset`)
- `ci/<short-description>` — CI/build improvements (e.g., `ci/alerts-tests`)
- `docs/<short-description>` — Documentation updates (e.g., `docs/api-reference`)

**Rule**: Never push directly to `main`, `staging`, or `develop`. All changes must go through PRs with tests and code review.

## Pull Request Workflow

1. **Create a feature branch** from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/<your-feature>
   ```

2. **Commit with clear messages**:
   ```bash
   git commit -m "[component] Brief description of change"
   ```

3. **Run all tests locally** (see "Testing" section):
   ```bash
   npm test
   npm run lint
   npm run test:integration
   ```

4. **Push and open a PR** targeting `develop`:
   ```bash
   git push origin feature/<your-feature>
   ```

5. **Use the PR template** (see `.github/pull_request_template.md`):
   - Describe what changed and why
   - List affected services/files
   - Include test results and coverage
   - Check off the review checklist

6. **Wait for CI to pass** and **at least 2 approvals** before merging.

## Testing Requirements

### Unit Tests
- Must cover all new functions/methods at **≥85% coverage**
- Run: `npm run test:unit` (JavaScript) or `pytest` (Python)

### Integration Tests
- Must validate component interactions (e.g., logs → Kafka → consumer → DB)
- Run: `npm run test:integration`

### E2E Tests
- Must test the full user workflow (e.g., place order → alert in UI → Jira ticket)
- Run: `npm run test:e2e` (local or in CI)

### Linting & Type Checking
- JavaScript/TypeScript: `npm run lint` (eslint, no warnings allowed)
- Python: `ruff check` and `mypy` checks enforced in CI
- Run `npm run lint:fix` to auto-fix issues

### Code Quality Checks
- No secrets (checked with `git-secrets` / `trufflehog`)
- Coverage report generated (must meet 85% threshold)
- Docker Compose tests pass: `docker-compose -f docker-compose.test.yml up --build`

## Code Review Checklist

Reviewers must verify:
- [ ] **No secrets committed** (no API keys, tokens, credentials)
- [ ] **Structured logging** (JSON format, consistent field names)
- [ ] **API documentation** (OpenAPI/Swagger for new endpoints)
- [ ] **Tests are meaningful** (not just code coverage, but logic coverage)
- [ ] **Docker/infra configs** are sane for staging/production
- [ ] **Storybook stories added** for UI components
- [ ] **Migration plan** documented for schema changes (Postgres/Elasticsearch)
- [ ] **Performance considerations** (batching, backpressure, error handling)

## Local Development Setup

### Prerequisites
- Node.js 18+
- Python 3.9+
- Docker & Docker Compose
- Git (with `.git-secrets` configured)

### Installation
```bash
# Clone repo
git clone https://github.com/deepanimators/StackLens-AI.git
cd StackLens-AI

# Install dependencies
npm install
cd python-services && pip install -r requirements.txt && cd ..

# Copy env file
cp .env.example .env

# Start services
docker-compose up -d postgres kafka zookeeper elasticsearch
npm run dev
```

### Running Tests Locally
```bash
# All tests
npm test

# Specific suite
npm run test:unit
npm run test:integration
npm run test:e2e

# With coverage
npm run test -- --coverage

# Watch mode
npm run test:watch
```

### Docker Testing
```bash
# Start test stack
docker-compose -f docker-compose.test.yml up --build

# Run integration tests
npm run test:integration

# View logs
docker-compose -f docker-compose.test.yml logs -f consumer
```

## Commit Message Guidelines

Follow conventional commits for clarity:
```
[component] Brief description (50 chars max)

Longer explanation of what changed and why (wrap at 72 chars).
Fixes: #123
Related: #456
```

Examples:
- `[logs-ingest] Add Pydantic schema validation`
- `[consumer] Fix offset commit on alert creation`
- `[ui] Add Jira settings page with form validation`

## CI/CD Pipeline

Our CI runs on every PR and enforces:
1. ✅ All tests pass (unit, integration, E2E)
2. ✅ Linting passes (eslint, ruff, mypy)
3. ✅ Coverage ≥85%
4. ✅ No secrets detected
5. ✅ Security scans pass (npm audit, safety for Python)

See `.github/workflows/ci.yml` for full details.

## Phase 1 Acceptance Criteria

When implementing Phase 1 (POS integration), your changes must meet:
1. ✅ Ordering a product with `price=null` creates an alert in Postgres within 10 seconds
2. ✅ Alert visible in Admin Alerts dashboard in real time
3. ✅ "Create Jira" button produces a ticket in the test project
4. ✅ All tests pass in CI (unit, integration, E2E)
5. ✅ No secrets in code; Jira token in GitHub Secrets

## Getting Help

- **Questions**: Post in #dev-questions Slack channel
- **Bugs**: Open an issue with reproduction steps
- **Architecture discussions**: Schedule a sync with @maintainers
- **Documentation**: See `/docs` folder or run `npm run docs`

## License

All contributions are licensed under MIT. By submitting a PR, you agree to license your code under MIT.

---

**Happy coding!** 🚀
