# GitHub Branch Protection Setup Guide

## 🔒 Required Setup for PR Merge Protection

### Step 1: Enable Branch Protection Rules

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Branches**
3. Click **Add branch protection rule** or edit existing rule for `main` branch

### Step 2: Configure Protection Rules

Apply these settings for the `main` branch:

#### ✅ **Protect matching branches**
- Branch name pattern: `main`

#### ✅ **Require a pull request before merging**
- ✅ **Required approvals**: 1 (adjust as needed)
- ✅ **Dismiss stale pull request approvals when new commits are pushed**
- ✅ **Require review from Code Owners** (if you have CODEOWNERS file)

#### ✅ **Require status checks to pass before merging**
- ✅ **Require branches to be up to date before merging**

**Add these required status checks:**
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

#### ✅ **Additional Settings (Recommended)**
- ✅ **Require conversation resolution before merging**
- ✅ **Require signed commits** (optional, for extra security)
- ✅ **Require linear history** (optional, prevents merge commits)
- ✅ **Do not allow bypassing the above settings** (prevents admins from bypassing)
- ✅ **Restrict who can push to matching branches** (optional)

### Step 3: Save Rules

Click **Create** or **Save changes**

---

## 📋 Workflow Features

### What the Workflow Does:

1. **Code Quality Checks** ✅
   - TypeScript type checking
   - ESLint linting
   - Security vulnerability audit

2. **Build Verification** ✅
   - Builds frontend (Vite)
   - Builds backend (Node.js)
   - Uploads build artifacts

3. **Test Execution** ✅
   - **Unit Tests** (160+ tests) - Fast, no servers needed
   - **Integration Tests** (110+ tests) - Both frontend + backend
   - **API Tests** (120+ tests) - Backend API testing
   - **E2E Tests** (80+ tests) - Full user flows across 3 browsers
   - **UI Component Tests** (105+ tests) - Component interactions
   - **Functional Tests** (100+ tests) - Complex workflows

4. **Multi-Browser Testing** 🌐
   - Chromium (Chrome/Edge)
   - Firefox
   - WebKit (Safari)

5. **Artifact Collection** 📦
   - Test results
   - Screenshots on failure
   - Playwright HTML reports
   - Build artifacts

6. **Summary Reports** 📊
   - GitHub step summary with pass/fail status
   - Detailed test results in artifacts
   - Screenshots for debugging failures

---

## 🚀 How It Works

### When a PR is Created/Updated:

1. **Trigger**: Workflow runs automatically on:
   - Pull request opened
   - New commits pushed to PR
   - PR reopened

2. **Parallel Execution**: Jobs run in parallel for speed:
   ```
   Code Quality ─┬─> Build
                 ├─> Unit Tests
                 ├─> Integration Tests
                 ├─> API Tests
                 └─> UI Tests
   
   Build ─────────> E2E Tests (3 browsers in parallel)
                 └─> Functional Tests
   
   All Jobs ─────> Test Summary
                 └─> Required Checks
   ```

3. **Status Checks**: GitHub shows live status:
   - ⏳ Yellow: Running
   - ✅ Green: Passed
   - ❌ Red: Failed

4. **Merge Protection**: 
   - If ALL checks pass → ✅ "Merge" button enabled
   - If ANY check fails → ❌ "Merge" button disabled

### Viewing Test Results:

1. **In PR**: Click "Details" next to any check
2. **Artifacts**: Download test reports from workflow run
3. **Summary**: View in GitHub Actions summary tab

---

## 🔧 Customization Options

### Adjust Timeout Values

If tests take longer, increase timeouts:

```yaml
# In .github/workflows/pr-tests.yml
jobs:
  unit-tests:
    timeout-minutes: 10  # Increase this
```

### Add/Remove Test Categories

Comment out jobs you don't need:

```yaml
# needs: [code-quality, build, unit-tests]  # Removed integration-tests
```

### Change Required Checks

In branch protection, add/remove status check names to match your needs.

### Modify Node/Python Versions

```yaml
env:
  NODE_VERSION: '20.x'    # Change to '18.x' or '21.x'
  PYTHON_VERSION: '3.11'  # Change to '3.10' or '3.12'
```

---

## 📊 Expected Test Counts

| Category | Test Count | Duration |
|----------|-----------|----------|
| Unit Tests | 160+ | ~2-3 min |
| Integration Tests | 110+ | ~5-7 min |
| API Tests | 120+ | ~4-6 min |
| E2E Tests (per browser) | 80+ | ~8-10 min |
| UI Tests | 105+ | ~4-6 min |
| Functional Tests | 100+ | ~6-8 min |
| **Total** | **675+** | **~15-25 min** |

*Note: Tests run in parallel, so total time is much less than sum of all durations*

---

## 🐛 Troubleshooting

### Tests Failing in CI but Pass Locally?

**Common causes:**
1. **Server startup timing** - Increase wait time in workflow
2. **Environment variables** - Add secrets to GitHub repo settings
3. **Database issues** - Use in-memory DB for tests
4. **Network timeouts** - Increase Playwright timeout

**Fix:**
```yaml
# Add to test steps
- name: Debug environment
  run: |
    echo "Node version: $(node --version)"
    echo "NPM version: $(npm --version)"
    curl -I http://localhost:5173
    curl -I http://localhost:5000/health
```

### Workflow Taking Too Long?

**Optimization strategies:**
1. **Cache dependencies** - Already enabled with `cache: 'npm'`
2. **Run fewer browsers** - Remove webkit/firefox if not critical
3. **Reduce retries** - Adjust in `playwright.config.ts`
4. **Split tests** - Run critical tests first, others nightly

### Need to Skip CI for WIP?

Add to commit message:
```
[skip ci] Work in progress

or

[ci skip] WIP: refactoring
```

---

## 🔐 Environment Variables & Secrets

If your tests need API keys or secrets:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add secrets:
   ```
   OPENAI_API_KEY=sk-...
   FIREBASE_CONFIG={"apiKey": "..."}
   DATABASE_URL=postgresql://...
   ```

4. Use in workflow:
   ```yaml
   env:
     OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
   ```

---

## 📈 Advanced Configuration

### Matrix Testing (Multiple Node Versions)

```yaml
jobs:
  test:
    strategy:
      matrix:
        node-version: [18.x, 20.x, 21.x]
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
```

### Scheduled Tests (Nightly)

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM daily
  pull_request:
    branches: [main]
```

### Performance Testing

```yaml
jobs:
  performance:
    steps:
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            http://localhost:5173
```

---

## ✅ Checklist: First Time Setup

- [ ] Create `.github/workflows/pr-tests.yml` (done above)
- [ ] Push workflow file to repository
- [ ] Enable GitHub Actions in repository settings
- [ ] Set up branch protection rules on `main`
- [ ] Add required status checks
- [ ] Test with a sample PR
- [ ] Add any necessary secrets
- [ ] Update README with badge (see below)

### Add Status Badge to README

```markdown
[![Tests](https://github.com/deepanimators/StackLens-AI/actions/workflows/pr-tests.yml/badge.svg)](https://github.com/deepanimators/StackLens-AI/actions/workflows/pr-tests.yml)
```

---

## 🎯 Success Criteria

Your PR workflow is correctly set up when:

✅ Workflow runs automatically on every PR  
✅ All test jobs execute successfully  
✅ Merge button is disabled until all checks pass  
✅ Test results are visible in PR  
✅ Artifacts are uploaded for debugging  
✅ Summary shows clear pass/fail status  

---

## 📞 Support

If you encounter issues:

1. Check workflow logs in **Actions** tab
2. Review test artifacts
3. Check branch protection settings
4. Verify secrets are set correctly
5. Ensure Playwright browsers are installed

---

**Status**: Ready to use! 🚀

Once you push this workflow and configure branch protection, all PRs will require passing tests before merge.
