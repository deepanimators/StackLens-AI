# Required Status Checks - Quick Reference

Copy these exact names when setting up branch protection rules in GitHub:

```
Code Quality & Linting
Build Application
Unit Tests
Integration Tests
API Tests
E2E Tests (chromium)
E2E Tests (firefox)
E2E Tests (webkit)
UI Component Tests
Functional Workflow Tests
All Required Checks Passed
```

## Alternative: Minimal Required Checks

If you want faster PRs, use only these critical checks:

```
Code Quality & Linting
Build Application
Unit Tests
E2E Tests (chromium)
All Required Checks Passed
```

## How to Add Status Checks in GitHub:

1. Go to: **Settings** → **Branches** → **Edit rule for `main`**
2. Check: ✅ **Require status checks to pass before merging**
3. Search box: Type each check name above
4. Click each one to add it
5. Click: **Save changes**

## Expected Workflow Duration:

- **Minimal checks**: ~8-12 minutes
- **All checks**: ~15-25 minutes (runs in parallel)

## Status Check Meanings:

| Check | Purpose | Blocks Merge If |
|-------|---------|-----------------|
| Code Quality & Linting | TypeScript + ESLint | Code has type errors or lint issues |
| Build Application | Frontend + Backend build | Build fails |
| Unit Tests | 160+ unit tests | Any unit test fails |
| Integration Tests | 110+ integration tests | Any integration test fails |
| API Tests | 120+ API endpoint tests | Any API test fails |
| E2E Tests (chromium) | Chrome browser E2E | Any E2E test fails in Chrome |
| E2E Tests (firefox) | Firefox browser E2E | Any E2E test fails in Firefox |
| E2E Tests (webkit) | Safari browser E2E | Any E2E test fails in Safari |
| UI Component Tests | 105+ component tests | Any UI test fails |
| Functional Workflow Tests | 100+ workflow tests | Any workflow test fails |
| All Required Checks Passed | Final gate | Any above check fails |

---

**Note**: The `All Required Checks Passed` job is the final gatekeeper - it checks that ALL other jobs succeeded.
