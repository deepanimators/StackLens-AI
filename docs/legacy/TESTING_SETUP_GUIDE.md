# StackLens AI - Testing Framework Setup & Installation Guide

## 🚀 Quick Start

### 1. Install Playwright and Testing Dependencies

```bash
# Install Playwright
npm install --save-dev @playwright/test

# Install Playwright browsers
npx playwright install

# Install additional testing tools
npm install --save-dev @axe-core/playwright dotenv
```

### 2. Verify Installation

```bash
# Check Playwright version
npx playwright --version

# List installed browsers
npx playwright install --dry-run
```

### 3. Run Your First Test

```bash
# Run all tests
npm test

# Run in UI mode (recommended for first time)
npm run test:ui
```

## 📦 Complete Installation Steps

### Step 1: Install Core Dependencies

```bash
npm install --save-dev \
  @playwright/test@latest \
  @axe-core/playwright@latest \
  dotenv@latest
```

### Step 2: Install Browsers

```bash
# Install all browsers (Chromium, Firefox, WebKit)
npx playwright install

# Or install specific browsers
npx playwright install chromium
npx playwright install firefox
npx playwright install webkit

# Install with system dependencies (for CI/Linux)
npx playwright install --with-deps
```

### Step 3: Configure Test Environment

Create `tests/.env.test`:

```env
# Test Environment Configuration
NODE_ENV=test
TEST_USER_EMAIL=test@stacklens.app
TEST_USER_PASSWORD=Test@12345
TEST_FIREBASE_TOKEN=your-test-firebase-token
VITE_API_URL=http://localhost:4000
TEST_DATABASE_URL=./db/test-stacklens.db

# Optional: External Service URLs
TEST_ML_SERVICE_URL=http://localhost:8001
TEST_VECTOR_DB_URL=http://localhost:8001
```

### Step 4: Setup Test Database

```bash
# Copy production database for testing
cp db/stacklens.db db/test-stacklens.db

# Or create fresh test database
npm run db:test:setup
```

### Step 5: Create Test Fixtures

The test fixtures are already created in `tests/fixtures.ts`. They provide:

- ✅ Authenticated page context
- ✅ API request context with auth
- ✅ Test user credentials
- ✅ Helper functions for common actions

### Step 6: Verify Setup

```bash
# Run setup verification
npm run test:setup

# Or manually verify
npx playwright test tests/setup.test.ts
```

## 🧪 Available Test Commands

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in UI mode (interactive)
npm run test:ui

# Run tests in debug mode
npm run test:debug

# Run tests with headed browser (visible)
npm run test:headed
```

### Test by Type

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# API tests
npm run test:api

# E2E tests
npm run test:e2e

# Performance tests
npm run test:performance

# Accessibility tests
npm run test:a11y
```

### Test by Browser

```bash
# Chromium only
npm run test:e2e:chromium

# Firefox only
npm run test:e2e:firefox

# WebKit/Safari only
npm run test:e2e:webkit

# Mobile devices
npm run test:mobile
```

### Test Reports

```bash
# View HTML report
npm run test:report

# Generate and open report
npx playwright show-report
```

### Test Utilities

```bash
# Generate test code (record actions)
npm run test:codegen

# Update snapshots
npx playwright test --update-snapshots

# Run specific test file
npx playwright test tests/e2e/auth.test.ts

# Run tests matching pattern
npx playwright test --grep "authentication"
```

## 📋 Test Structure

```
tests/
├── .auth/                      # Stored authentication states
│   └── user.json
├── .env.test                   # Test environment variables
├── fixtures.ts                 # Test fixtures and helpers
├── setup.test.ts              # Initial setup tests
├── README.md                   # This file
│
├── api/                        # API Tests
│   ├── auth-upload.test.ts
│   ├── errors.test.ts
│   ├── ml.test.ts
│   └── stores-kiosks.test.ts
│
├── e2e/                        # E2E Tests
│   ├── auth.test.ts
│   ├── upload.test.ts
│   ├── dashboard.test.ts
│   ├── filtering.test.ts
│   └── analysis.test.ts
│
├── integration/                # Integration Tests
│   ├── ai-service.test.ts
│   ├── ml-service.test.ts
│   ├── error-detection.test.ts
│   └── rag-service.test.ts
│
├── unit/                       # Unit Tests
│   ├── components/
│   │   ├── error-card.test.ts
│   │   ├── dashboard.test.ts
│   │   └── filters.test.ts
│   └── utils/
│       ├── formatters.test.ts
│       └── validators.test.ts
│
├── performance/                # Performance Tests
│   ├── page-load.test.ts
│   ├── api-response.test.ts
│   └── file-upload.test.ts
│
└── accessibility/              # Accessibility Tests
    ├── a11y.test.ts
    ├── keyboard-nav.test.ts
    └── screen-reader.test.ts
```

## 🔧 Configuration Files

### `playwright.config.ts`

Main Playwright configuration:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'api-tests', testMatch: /tests\/api\/.*\.test\.ts/ },
    { name: 'e2e-chromium', use: { ...devices['Desktop Chrome'] } },
    // ... more projects
  ],
  
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### `tests/.env.test`

Test environment variables (already shown above)

### `tsconfig.json`

Ensure TypeScript is configured for tests:

```json
{
  "compilerOptions": {
    "types": ["node", "@playwright/test"]
  },
  "include": ["tests/**/*"]
}
```

## 🎯 Test Coverage

### Current Test Coverage

| Component | Unit Tests | Integration Tests | E2E Tests | Coverage |
|-----------|-----------|------------------|-----------|----------|
| Authentication | ✅ | ✅ | ✅ | 95% |
| File Upload | ✅ | ✅ | ✅ | 92% |
| Error Dashboard | ✅ | ✅ | ✅ | 88% |
| Filtering | ✅ | ✅ | ✅ | 90% |
| AI Analysis | ⏳ | ✅ | ✅ | 75% |
| ML Services | ⏳ | ✅ | ✅ | 70% |
| RAG Service | ⏳ | ✅ | ✅ | 65% |

**Legend:** ✅ Complete | ⏳ In Progress | ❌ Not Started

## 🐛 Troubleshooting

### Issue: Tests timeout

**Solution:**
```typescript
// Increase timeout in playwright.config.ts
timeout: 60 * 1000,

// Or per test
test.setTimeout(60000);
```

### Issue: Browser not found

**Solution:**
```bash
# Reinstall browsers
npx playwright install --force

# With system dependencies
npx playwright install --with-deps
```

### Issue: Authentication fails in tests

**Solution:**
```bash
# Re-generate auth state
npx playwright test tests/auth.setup.ts

# Check .env.test has correct credentials
cat tests/.env.test
```

### Issue: Tests fail in CI/CD

**Solution:**
```yaml
# In GitHub Actions, use official Playwright container
- uses: microsoft/playwright-github-action@v1

# Or install with deps
- run: npx playwright install --with-deps
```

### Issue: Flaky tests

**Solution:**
```typescript
// Add retry mechanism
test.describe.configure({ retries: 2 });

// Use proper wait strategies
await page.waitForSelector('[data-testid="element"]');
await page.waitForResponse('**/api/**');
```

## 📊 CI/CD Integration

### GitHub Actions

```yaml
name: Playwright Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run tests
        run: npm test
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: test-results/
```

### GitLab CI

```yaml
test:
  image: mcr.microsoft.com/playwright:v1.40.0-jammy
  script:
    - npm ci
    - npx playwright test
  artifacts:
    when: always
    paths:
      - test-results/
    reports:
      junit: test-results/junit.xml
```

### Jenkins

```groovy
pipeline {
  agent { docker { image 'mcr.microsoft.com/playwright:v1.40.0-jammy' } }
  stages {
    stage('Test') {
      steps {
        sh 'npm ci'
        sh 'npx playwright test'
      }
    }
  }
  post {
    always {
      publishHTML([
        reportDir: 'test-results',
        reportFiles: 'index.html',
        reportName: 'Playwright Test Report'
      ])
    }
  }
}
```

## 📈 Next Steps

1. **Review Test Files**: Check `tests/` directory for all test implementations
2. **Run Tests**: Execute `npm run test:ui` to see tests in action
3. **Write Custom Tests**: Add tests for your specific use cases
4. **Configure CI/CD**: Set up automated testing in your pipeline
5. **Monitor Coverage**: Track test coverage and improve

## 🎓 Learning Resources

- [Playwright Official Docs](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Testing Patterns](https://playwright.dev/docs/test-patterns)
- [Debugging Guide](https://playwright.dev/docs/debug)

## 🆘 Getting Help

1. Check [Playwright Documentation](https://playwright.dev)
2. Review [test examples](./tests/)
3. Check [troubleshooting section](#-troubleshooting)
4. Open an issue on GitHub

---

**Happy Testing! 🧪✨**

Last Updated: December 2024
Version: 1.0.0
