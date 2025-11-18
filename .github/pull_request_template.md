## Description
<!-- Provide a brief description of your changes -->

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentation update
- [ ] Dependency update
- [ ] CI/Infrastructure change

## Related Issues
Closes #(issue number)

## Changes Made
<!-- List the specific files changed and what was modified -->
- 
- 
- 

## Testing
<!-- Describe the tests you added and how to verify changes -->

### Unit Tests
- [ ] Added unit tests
- [ ] Coverage: ____%
- [ ] Run with: `npm run test:unit`

### Integration Tests
- [ ] Added integration tests
- [ ] Run with: `npm run test:integration`

### E2E Tests
- [ ] Added E2E tests (if applicable)
- [ ] Run with: `npm run test:e2e`

### Manual Testing
<!-- Provide steps to manually verify the changes -->
1. 
2. 
3. 

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

## Checklist

### Code Quality
- [ ] Linting passes: `npm run lint`
- [ ] Type checking passes: `npm run check`
- [ ] No console errors in tests
- [ ] Code follows project conventions
- [ ] Comments added for complex logic

### Testing
- [ ] Unit tests added & passing
- [ ] Integration tests added & passing
- [ ] E2E tests added & passing (if applicable)
- [ ] Coverage threshold met (≥85%)

### Documentation
- [ ] README updated (if needed)
- [ ] API documentation updated (if new endpoints)
- [ ] Storybook stories added (for UI components)
- [ ] Comments added for non-obvious code

### Security & Secrets
- [ ] No secrets committed (API keys, tokens, etc.)
- [ ] All environment variables use .env.example template
- [ ] Secrets stored in GitHub Secrets (for CI)
- [ ] No credentials in code or config files

### Docker & Infrastructure
- [ ] Docker image builds successfully: `docker build .`
- [ ] docker-compose.yml updated (if new services)
- [ ] Services can start: `docker-compose up -d`
- [ ] All tests pass in docker-compose: `docker-compose -f docker-compose.test.yml up --build`

### Performance & Logging
- [ ] Structured JSON logging used (no console.log in production)
- [ ] Error handling is robust
- [ ] No obvious performance regressions
- [ ] Large datasets tested (if applicable)

### Accessibility & UX
- [ ] UI components are keyboard accessible (if applicable)
- [ ] ARIA labels added (if applicable)
- [ ] No console warnings about react-router, hooks, etc.

## Breaking Changes
<!-- Describe any breaking changes and migration path -->
- [ ] No breaking changes
- [ ] Breaking changes: (describe below)

If breaking changes, describe migration path:


## Deployment Notes
<!-- Any special deployment instructions or considerations -->


## Reviewer Notes
<!-- Add any additional context for reviewers -->


---

## PR Review Checklist (for Reviewers)

- [ ] Does the code introduce any secrets? (If yes, block)
- [ ] Are logs structured (JSON) and consistent?
- [ ] Are all new endpoints documented (OpenAPI)?
- [ ] Are there unit/integration tests and are they meaningful?
- [ ] Are the Docker compose and infra configs sane?
- [ ] Are there Storybook stories for UI components?
- [ ] Is there a migration plan for Postgres/ES (if applicable)?
- [ ] Are there performance considerations (batching, backpressure)?
- [ ] Code coverage ≥85%?
- [ ] All tests pass in CI?
