# Quick Test Execution Guide

## 🚀 Quick Start

### Fastest Way to Run Tests

```bash
# Start servers in one terminal
npm run dev

# Run tests in another terminal
npm test
```

---

## 📋 Test Commands

### Run All Tests

```bash
npm test                    # All tests (requires servers running)
npm run test:with-servers   # Auto-start servers, run tests, cleanup
```

### Run Specific Test Categories

```bash
npm run test:unit          # Unit tests (160+ tests)
npm run test:integration   # Integration tests (110+ tests)
npm run test:api          # API tests (120+ tests)
npm run test:functional   # Functional workflow tests (100+ tests)
npm run test:ui           # UI component tests (105+ tests)
npm run test:e2e          # End-to-end tests (80+ tests)
```

### Run Tests in Specific Files

```bash
npx playwright test tests/unit/utilities.test.ts
npx playwright test tests/integration/services.test.ts
npx playwright test tests/api/comprehensive.test.ts
```

### Run Tests with Options

```bash
# Run in headed mode (see browser)
SKIP_SERVER=true npx playwright test --headed

# Run in debug mode
SKIP_SERVER=true npx playwright test --debug

# Run specific test by name
SKIP_SERVER=true npx playwright test -g "should handle pagination"

# Run in UI mode (interactive)
SKIP_SERVER=true npx playwright test --ui

# Run with specific browser
SKIP_SERVER=true npx playwright test --project=chromium
SKIP_SERVER=true npx playwright test --project=firefox
SKIP_SERVER=true npx playwright test --project=webkit
```

---

## 🔧 Server Management

### Option 1: Manual Server Control (Recommended)

**Terminal 1 - Start Servers:**
```bash
npm run dev              # Both frontend + backend
# OR
npm run dev:client       # Frontend only (port 5173)
npm run dev:server       # Backend only (port 5000)
```

**Terminal 2 - Run Tests:**
```bash
npm test                 # All tests
npm run test:unit        # Specific category
```

### Option 2: Automatic Server Management

```bash
# Script handles everything
./test-with-servers.sh

# OR via npm
npm run test:with-servers
```

This script will:
1. Kill existing processes on ports 5173 and 5000
2. Start backend server (port 5000)
3. Start frontend dev server (port 5173)
4. Wait for both to be ready
5. Run all Playwright tests
6. Clean up processes when done

---

## 📊 View Test Results

### HTML Report

```bash
# Open the report
npx playwright show-report

# Report location
open playwright-report/index.html
```

### Test Results (JSON/XML)

```
test-results/
├── results.json          # JSON format
├── junit.xml            # JUnit XML format
└── html/                # HTML report (deprecated, use playwright-report/)
```

---

## 🐛 Debugging Tests

### Debug Specific Test

```bash
SKIP_SERVER=true npx playwright test -g "test name" --debug
```

### Slow Down Tests

```bash
SKIP_SERVER=true npx playwright test --headed --slow-mo=1000
```

### Save Test Videos

```bash
SKIP_SERVER=true npx playwright test --headed --video=on
```

### Take Screenshots on Failure

Tests already configured to take screenshots on failure. Find them in:
```
test-results/
└── <test-name>/
    ├── test-failed-1.png
    └── trace.zip
```

### View Traces

```bash
npx playwright show-trace test-results/<test-name>/trace.zip
```

---

## ⚡ Performance Tips

### Run Tests in Parallel

```bash
# Default: Uses all CPU cores
SKIP_SERVER=true npx playwright test

# Limit workers
SKIP_SERVER=true npx playwright test --workers=4

# Run serially (1 worker)
SKIP_SERVER=true npx playwright test --workers=1
```

### Run Only Changed Tests

```bash
# Run tests related to changed files
SKIP_SERVER=true npx playwright test --only-changed
```

### Retry Failed Tests

```bash
# Retry failed tests 2 times (already configured)
SKIP_SERVER=true npx playwright test --retries=2
```

---

## 🎯 Common Scenarios

### Before Committing Code

```bash
# Run all tests
npm run test:with-servers

# Or with manual servers
npm run dev              # Terminal 1
npm test                 # Terminal 2
```

### Quick Smoke Test

```bash
# Run critical E2E tests only
npm run test:e2e
```

### Test Specific Feature

```bash
# Example: Test error management
SKIP_SERVER=true npx playwright test -g "error"

# Example: Test authentication
SKIP_SERVER=true npx playwright test -g "auth"
```

### CI/CD Pipeline

```bash
# Recommended for CI/CD
SKIP_SERVER=true npx playwright test --reporter=junit,html
```

---

## 🔍 Troubleshooting

### Port Already in Use

```bash
# Kill processes on ports 5173 and 5000
lsof -ti:5173 | xargs kill -9
lsof -ti:5000 | xargs kill -9

# Then start fresh
npm run dev
```

### Test Timeout

```bash
# Increase timeout globally
SKIP_SERVER=true npx playwright test --timeout=60000
```

### WebServer Not Starting

```bash
# Don't use auto webServer, start manually
npm run dev              # Terminal 1
npm test                 # Terminal 2
```

### Tests Fail Randomly

```bash
# Run serially to avoid race conditions
SKIP_SERVER=true npx playwright test --workers=1

# Or increase retries
SKIP_SERVER=true npx playwright test --retries=3
```

---

## 📝 Test File Locations

```
tests/
├── unit/
│   └── utilities.test.ts        (160+ tests)
├── integration/
│   └── services.test.ts         (110+ tests)
├── api/
│   └── comprehensive.test.ts    (120+ tests)
├── functional/
│   └── workflows.test.ts        (100+ tests)
├── ui/
│   └── components.test.ts       (105+ tests)
└── e2e/
    └── enhanced.test.ts         (80+ tests)
```

---

## 🎬 Example Workflows

### Full Test Run (Production)

```bash
# Terminal 1
npm run dev

# Terminal 2
npm test

# View report
npx playwright show-report
```

### Quick Dev Check

```bash
# Terminal 1
npm run dev

# Terminal 2 - Run only unit and integration tests
npm run test:unit
npm run test:integration
```

### Debug Single Failing Test

```bash
# Terminal 1
npm run dev

# Terminal 2
SKIP_SERVER=true npx playwright test -g "failing test name" --debug
```

---

## 📚 Additional Resources

- **Playwright Docs**: https://playwright.dev
- **Test Configuration**: `playwright.config.ts`
- **Test Summary**: `docs/TEST_SUITE_EXPANSION_SUMMARY.md`
- **Project README**: `README.md`

---

## ✅ Checklist Before Running Tests

- [ ] Node.js and npm installed
- [ ] Dependencies installed (`npm install`)
- [ ] Playwright browsers installed (`npx playwright install`)
- [ ] Ports 5173 and 5000 available
- [ ] Backend server configured properly
- [ ] Frontend environment variables set

---

## 🚨 Quick Fixes

### If tests fail due to missing servers:

```bash
# Start servers manually
npm run dev
```

### If Playwright browsers missing:

```bash
npx playwright install
```

### If port conflicts:

```bash
# Kill processes
lsof -ti:5173 | xargs kill -9
lsof -ti:5000 | xargs kill -9
```

### Reset everything:

```bash
# Kill servers
lsof -ti:5173,5000 | xargs kill -9

# Clean test artifacts
rm -rf test-results/ playwright-report/

# Fresh start
npm run dev              # Terminal 1
npm test                 # Terminal 2
```

---

**Happy Testing! 🎉**
