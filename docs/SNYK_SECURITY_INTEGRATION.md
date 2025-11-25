# Snyk Security Integration Guide

## Overview

StackLens AI uses Snyk for comprehensive security scanning across multiple layers of the application stack. This document describes the integration setup and how to use it effectively.

## What is Snyk?

Snyk is a developer-first security platform that helps find and fix vulnerabilities in:
- Open source dependencies (npm, pip, etc.)
- Container images (Docker)
- Infrastructure as Code (IaC)
- Source code (SAST)

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SNYK SECURITY SCANNING PIPELINE                   │
└─────────────────────────────────────────────────────────────────────┘

GitHub Pull Request / Push
        │
        ▼
┌───────────────────────────────────────────────────────────────────┐
│                     Snyk GitHub Actions Workflow                    │
│                     (.github/workflows/snyk-security.yml)           │
└───────────────────────────────────────────────────────────────────┘
        │
        ├─────────────────┬─────────────────┬─────────────────┐
        ▼                 ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  Node.js Scan │ │  Python Scan  │ │  Docker Scan  │ │   IaC Scan    │
│  (npm deps)   │ │  (pip deps)   │ │  (images)     │ │  (config)     │
└───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
        │                 │                 │                 │
        └─────────────────┴─────────────────┴─────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │    GitHub Security Tab   │
                    │    (SARIF Reports)       │
                    └─────────────────────────┘
```

## Scan Types

### 1. Node.js Dependency Scanning
Scans `package.json` and `package-lock.json` for known vulnerabilities in npm dependencies.

**What it detects:**
- Known CVEs in npm packages
- Outdated dependencies with security issues
- Transitive dependency vulnerabilities

### 2. Python Dependency Scanning
Scans `requirements.txt` and Python dependencies for security issues.

**What it detects:**
- Vulnerabilities in Python packages (including PyTorch, transformers, etc.)
- Outdated packages with known security issues
- Dependency chain vulnerabilities

### 3. Docker Image Scanning
Scans Dockerfiles and built images for container-level vulnerabilities.

**What it detects:**
- Base image vulnerabilities
- OS-level package issues
- Container misconfigurations

### 4. Infrastructure as Code (IaC) Scanning
Scans configuration files for security best practices.

**What it detects:**
- Docker Compose misconfigurations
- Kubernetes manifest issues
- CI/CD configuration vulnerabilities

### 5. Code Analysis (SAST)
Static Application Security Testing for source code.

**What it detects:**
- Code injection vulnerabilities
- Hardcoded secrets
- Security anti-patterns

## Setup Instructions

### 1. Generate Snyk Token

1. Create a free account at [snyk.io](https://snyk.io)
2. Go to **Account Settings** → **General**
3. Find your **Auth Token** or click **Generate new token**
4. Copy the token for the next step

### 2. Add Token to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `SNYK_TOKEN`
5. Value: Paste your Snyk token
6. Click **Add secret**

### 3. Enable GitHub Security Features

1. Go to **Settings** → **Code security and analysis**
2. Enable **Dependency graph**
3. Enable **Dependabot alerts**
4. Enable **Code scanning alerts** (for SARIF upload)

## Configuration Files

### .snyk Policy File
The `.snyk` file in the repository root configures Snyk behavior:

```yaml
# Snyk Policy File
version: v1.25.0

# Ignore specific vulnerabilities (use with caution)
ignore: {}

# Exclude paths from scanning
exclude:
  global:
    - node_modules/**
    - dist/**
    - python-services/venv/**
```

### Ignoring Vulnerabilities
To ignore a specific vulnerability (with justification):

```yaml
ignore:
  SNYK-JS-EXAMPLE-123456:
    - '*':
        reason: 'No fix available, risk accepted by security team'
        expires: 2025-12-31T00:00:00.000Z
        created: 2024-01-01T00:00:00.000Z
```

## Workflow Details

### Trigger Events
- **Push** to `main` or `develop` branches
- **Pull requests** targeting `main` or `develop`
- **Scheduled** daily at midnight UTC (for continuous monitoring)

### Severity Threshold
By default, only **high** and **critical** severity vulnerabilities are flagged:

```yaml
args: --severity-threshold=high
```

To include medium severity:
```yaml
args: --severity-threshold=medium
```

## Viewing Results

### GitHub Security Tab
1. Go to your repository
2. Click **Security** tab
3. View **Code scanning alerts** for SARIF results
4. View **Dependabot alerts** for dependency issues

### Snyk Dashboard
1. Log in to [app.snyk.io](https://app.snyk.io)
2. View your projects and their security status
3. Get detailed remediation advice
4. Track vulnerability trends over time

### Workflow Summary
Each workflow run generates a summary in the **Actions** tab:

```
## 🔒 Security Scan Summary

### Snyk Security Scans:
| Scan Type | Status |
|-----------|--------|
| Node.js Dependencies | success |
| Python Dependencies | success |
| Docker Images | success |
| Infrastructure as Code | success |
| Code Analysis | success |
```

## Best Practices

### 1. Regular Monitoring
- Review security alerts daily
- Prioritize critical and high severity issues
- Set up Slack/email notifications for new alerts

### 2. Fix Vulnerabilities Promptly
```bash
# For npm dependencies
npm audit fix

# For Python dependencies
pip install --upgrade <vulnerable-package>
```

### 3. Use Snyk CLI Locally
```bash
# Install Snyk CLI
npm install -g snyk

# Authenticate
snyk auth

# Test for vulnerabilities
snyk test

# Monitor project (continuous monitoring)
snyk monitor
```

### 4. Review Before Ignoring
Before ignoring any vulnerability:
1. Understand the risk
2. Document the justification
3. Set an expiration date
4. Get security team approval

## Integration with CI/CD

### Blocking Merges
To block PRs with security issues, modify the workflow:

```yaml
- name: Run Snyk to check for vulnerabilities
  uses: snyk/actions/node@master
  continue-on-error: false  # Change to false to fail the build
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### Required Status Check
1. Go to **Settings** → **Branches**
2. Click **Add rule** or edit existing rule
3. Enable **Require status checks to pass before merging**
4. Add `Snyk Node.js Security Scan` (and other scan jobs) as required

## Troubleshooting

### Token Issues
```
Error: Missing SNYK_TOKEN
```
**Solution:** Ensure `SNYK_TOKEN` is added to repository secrets.

### SARIF Upload Fails
```
Error: Resource not accessible by integration
```
**Solution:** Enable **Code scanning** in repository security settings.

### Large Repository Timeouts
```
Error: Timeout during scan
```
**Solution:** Increase `timeout-minutes` in the workflow or use `.snyk` to exclude large directories.

## Support Resources

- [Snyk Documentation](https://docs.snyk.io/)
- [Snyk GitHub Action](https://github.com/snyk/actions)
- [Snyk CLI Reference](https://docs.snyk.io/snyk-cli/cli-reference)
- [GitHub Security Features](https://docs.github.com/en/code-security)

---

## PyTorch Security Considerations

Since StackLens AI uses PyTorch for deep learning models, Snyk also scans Python dependencies for vulnerabilities in:

- `torch` (PyTorch core)
- `torchvision` (computer vision)
- `torchaudio` (audio processing)
- `transformers` (Hugging Face)
- `sentence-transformers` (embeddings)

### Common PyTorch Security Alerts

1. **Pickle Deserialization**: PyTorch models use pickle format which can be unsafe
   - Mitigation: Only load models from trusted sources
   
2. **Dependency Vulnerabilities**: Transitive dependencies may have issues
   - Mitigation: Keep PyTorch updated to latest stable version

3. **CUDA/cuDNN Issues**: GPU libraries may have vulnerabilities
   - Mitigation: Use official NVIDIA Docker images

### Keeping PyTorch Secure

```bash
# Update PyTorch to latest stable
pip install --upgrade torch torchvision torchaudio

# Check for vulnerabilities
snyk test --file=python-services/requirements.txt
```

---

**Document Version:** 1.0  
**Last Updated:** November 2024
