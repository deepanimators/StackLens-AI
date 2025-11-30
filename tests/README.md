# StackLens AI - Comprehensive Testing Guide

## 📋 Overview

This document provides a complete guide to the testing infrastructure for StackLens AI, including unit tests, integration tests, API tests, E2E tests, and performance tests using Playwright.

## 🧪 Test Types

### 1. **Unit Tests** (`tests/unit/`)
Tests individual components and functions in isolation.

```typescript
// Component testing
tests/unit/components/error-card.test.ts
tests/unit/components/dashboard.test.ts
tests/unit/components/filters.test.ts
tests/unit/components/multi-select-dropdown.test.ts
```

### 2. **Integration Tests** (`tests/integration/`)
Tests interactions between multiple components or services.

```typescript
// Service integration
tests/integration/ai-service.test.ts
tests/integration/ml-service.test.ts
tests/integration/error-detection.test.ts
tests/integration/rag-service.test.ts
```

### 3. **API Tests** (`tests/api/`)
Tests all REST API endpoints.

```typescript
tests/api/auth-upload.test.ts      // Authentication & file upload
tests/api/errors.test.ts            // Error management APIs
tests/api/ml.test.ts                // ML prediction APIs
tests/api/stores-kiosks.test.ts     // Store & kiosk APIs
```

### 4. **E2E Tests** (`tests/e2e/`)
Tests complete user workflows end-to-end.

```typescript
tests/e2e/auth.test.ts              // Login/logout flows
tests/e2e/upload.test.ts            // File upload workflows
tests/e2e/dashboard.test.ts         // Dashboard interactions
tests/e2e/filtering.test.ts         // Error filtering
tests/e2e/analysis.test.ts          // AI analysis workflows
```

### 5. **Performance Tests** (`tests/performance/`)
Tests application performance and load times.

```typescript
tests/performance/page-load.test.ts
tests/performance/api-response.test.ts
tests/performance/file-upload.test.ts
```

### 6. **Accessibility Tests** (`tests/accessibility/`)
Tests WCAG compliance and accessibility.

```typescript
tests/accessibility/a11y.test.ts
tests/accessibility/keyboard-nav.test.ts
tests/accessibility/screen-reader.test.ts
```

## 🚀 Setup

### 1. Install Dependencies

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### 2. Install Additional Test Dependencies

```bash
npm install --save-dev \
  @axe-core/playwright \
  @playwright/test \
  playwright-lighthouse \
  lighthouse
```

### 3. Configure Environment Variables

Create `tests/.env.test`:

```env
TEST_USER_EMAIL=test@stacklens.app
TEST_USER_PASSWORD=Test@12345
TEST_FIREBASE_TOKEN=your-test-token
VITE_API_URL=http://localhost:4000
TEST_DATABASE_URL=./db/test-stacklens.db
```

### 4. Setup Test Database

```bash
# Create test database
cp db/stacklens.db db/test-stacklens.db

# Or use SQL script
npm run db:test:setup
```

## 🎯 Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# API tests only
npm run test:api

# E2E tests only
npm run test:e2e

# Performance tests only
npm run test:performance

# Accessibility tests only
npm run test:a11y
```

### Run Tests by Browser

```bash
# Chromium only
npx playwright test --project=e2e-chromium

# Firefox only
npx playwright test --project=e2e-firefox

# WebKit only
npx playwright test --project=e2e-webkit

# Mobile
npx playwright test --project=mobile-safari
npx playwright test --project=mobile-chrome
```

### Run Tests in UI Mode

```bash
npx playwright test --ui
```

### Run Tests in Debug Mode

```bash
npx playwright test --debug
```

### Run Tests with Specific Tags

```bash
# Run only smoke tests
npx playwright test --grep @smoke

# Run only critical tests
npx playwright test --grep @critical

# Skip flaky tests
npx playwright test --grep-invert @flaky
```

## 📊 Test Reports

### Generate HTML Report

```bash
npx playwright show-report
```

### Generate JUnit Report (for CI/CD)

Reports are automatically generated in `test-results/junit.xml`

### Generate JSON Report

Reports are automatically generated in `test-results/results.json`

### View Coverage Report

```bash
npm run test:coverage
```

## 🔧 Test Configuration

### Playwright Config (`playwright.config.ts`)

```typescript
export default defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  
  use: {
    baseURL: 'http://localhost:4000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

## 📝 Writing Tests

### Test Structure

```typescript
import { test, expect } from '../fixtures';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.goto('/path');
    
    // Act
    await page.click('button');
    
    // Assert
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

### Using Custom Fixtures

```typescript
import { test, expect, authenticatedPage } from '../fixtures';

test('authenticated flow', async ({ authenticatedPage }) => {
  // Page is already authenticated
  await expect(authenticatedPage.locator('[data-testid="user-profile"]')).toBeVisible();
});
```

### Using Helper Functions

```typescript
import { test, expect, uploadFile, waitForAnalysis } from '../fixtures';

test('upload and analyze', async ({ authenticatedPage }) => {
  await uploadFile(authenticatedPage, 'test-file.xlsx');
  await waitForAnalysis(authenticatedPage);
  
  await expect(authenticatedPage.locator('[data-testid="analysis-complete"]')).toBeVisible();
});
```

## 🎨 Best Practices

### 1. **Use Data Test IDs**

```tsx
// In React components
<div data-testid="error-card">
  <span data-testid="error-severity">{severity}</span>
  <p data-testid="error-message">{message}</p>
</div>
```

```typescript
// In tests
await page.locator('[data-testid="error-card"]').click();
```

### 2. **Use Page Object Model (POM)**

```typescript
// pages/login.page.ts
export class LoginPage {
  constructor(private page: Page) {}
  
  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);
    await this.page.click('[data-testid="login-btn"]');
  }
}

// In tests
const loginPage = new LoginPage(page);
await loginPage.login('test@example.com', 'password');
```

### 3. **Wait for Network Requests**

```typescript
await page.waitForResponse('**/api/errors');
```

### 4. **Mock API Responses**

```typescript
await page.route('**/api/errors', (route) => {
  route.fulfill({
    status: 200,
    body: JSON.stringify([{ id: 1, message: 'Test error' }]),
  });
});
```

### 5. **Use Proper Assertions**

```typescript
// Good
await expect(page.locator('.error')).toHaveText('Error message');

// Avoid
const text = await page.locator('.error').textContent();
expect(text).toBe('Error message');
```

## 🔄 CI/CD Integration

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
  image: mcr.microsoft.com/playwright:v1.40.0
  script:
    - npm ci
    - npm test
  artifacts:
    when: always
    paths:
      - test-results/
    reports:
      junit: test-results/junit.xml
```

## 📈 Coverage

### Enable Coverage

```bash
npm run test:coverage
```

### Coverage Reports

- **HTML**: `coverage/index.html`
- **lcov**: `coverage/lcov.info`
- **JSON**: `coverage/coverage.json`

### Coverage Thresholds

```json
{
  "nyc": {
    "branches": 80,
    "lines": 80,
    "functions": 80,
    "statements": 80
  }
}
```

## 🐛 Debugging Tests

### Debug Mode

```bash
npx playwright test --debug
```

### Pause Test Execution

```typescript
test('debug test', async ({ page }) => {
  await page.goto('/');
  await page.pause(); // Opens Playwright Inspector
});
```

### Console Logs

```typescript
page.on('console', msg => console.log('PAGE LOG:', msg.text()));
```

### Screenshots

```typescript
await page.screenshot({ path: 'screenshot.png' });
```

### Video Recording

```typescript
// In playwright.config.ts
use: {
  video: 'on', // or 'retain-on-failure'
}
```

## 📊 Test Metrics

### Key Metrics to Track

1. **Test Coverage**: % of code covered by tests
2. **Test Success Rate**: % of passing tests
3. **Test Duration**: Time to run all tests
4. **Flaky Tests**: Tests that fail intermittently
5. **Code Quality**: Linting and type errors

### Viewing Metrics

```bash
# Test summary
npm run test:summary

# Coverage report
npm run test:coverage

# Performance report
npm run test:perf
```

## 🎯 Test Checklist

### Before Committing

- [ ] All tests pass locally
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Added tests for new features
- [ ] Updated existing tests if needed
- [ ] Test coverage > 80%
- [ ] All critical paths tested

### Before Deploying

- [ ] All E2E tests pass
- [ ] Performance tests within thresholds
- [ ] Accessibility tests pass
- [ ] API tests pass
- [ ] No flaky tests

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Testing Library](https://testing-library.com)
- [Web Accessibility](https://www.w3.org/WAI/)

## 🆘 Troubleshooting

### Tests Timing Out

```typescript
// Increase timeout for specific test
test('slow test', async ({ page }) => {
  test.setTimeout(60000);
  // ...
});
```

### Flaky Tests

```typescript
// Retry flaky tests
test('flaky test', async ({ page }) => {
  test.retry(2);
  // ...
});
```

### Authentication Issues

```typescript
// Use stored auth state
test.use({ storageState: 'tests/.auth/user.json' });
```

### Network Issues

```typescript
// Wait for network idle
await page.goto('/', { waitUntil: 'networkidle' });
```

---

**Happy Testing! 🧪✨**

For questions or issues, please refer to the [main documentation](../README.md) or open an issue on GitHub.
