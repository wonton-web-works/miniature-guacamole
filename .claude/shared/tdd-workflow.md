# TDD/BDD Workflow Reference

Detailed reference for the Test-Driven Development workflow. This is the authoritative process for all engineering work.

## The Cycle

```
┌─────────────────────────────────────────────────────────────────┐
│                        TDD/BDD CYCLE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│    ┌─────────┐     ┌─────────┐     ┌─────────┐                  │
│    │   RED   │────▶│  GREEN  │────▶│REFACTOR │                  │
│    │ (fail) │     │ (pass)  │     │(clean)  │                  │
│    └─────────┘     └─────────┘     └─────────┘                  │
│         │                               │                        │
│         │                               │                        │
│         ▼                               ▼                        │
│    QA writes                       Dev refactors                │
│    failing tests                   while green                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Workflow Steps

### Step 1: Test Specification (QA + PM)

**Owner:** QA Engineer with Product Manager input

**Inputs:**
- Acceptance criteria from Product Team
- BDD scenarios (Given/When/Then)

**Outputs:**
- Failing unit tests (Vitest/Jest)
- Failing integration tests (Testing Library)
- E2E test skeletons (Playwright)
- Visual regression baselines (if UI)

**Gate:** `tests_written` - Tests exist and fail

### Step 2: Implementation (Dev)

**Owner:** Senior Fullstack Engineer

**Inputs:**
- Failing tests from Step 1
- Technical standards from Staff Engineer

**Process:**
1. Run tests, confirm they fail
2. Write minimum code to pass ONE test
3. Run tests again
4. Repeat until all tests pass
5. Check coverage >= 99%

**Outputs:**
- Passing code
- 99% coverage

**Gate:** `tests_pass_and_coverage_met`

### Step 3: Verification (QA)

**Owner:** QA Engineer

**Checks:**
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] E2E tests pass
- [ ] Coverage >= 99%
- [ ] No regressions
- [ ] Visual regression check (if UI)

**Gate:** `qa_approved`

### Step 4: Code Review (Staff Engineer)

**Owner:** Staff Engineer

**Review Checklist:**
- [ ] Follows DRY principle
- [ ] Uses config-over-composition
- [ ] No security vulnerabilities
- [ ] Performance acceptable
- [ ] Matches architectural patterns
- [ ] Documentation adequate

**Gate:** `code_review_passed`

## Coverage Requirements

| Type | Target | Tool |
|------|--------|------|
| Unit | 99% | Vitest/Jest |
| Integration | 99% | Testing Library |
| Combined | 99% | Both |
| E2E | Critical paths | Playwright |

## BDD Scenario Format

```gherkin
Feature: User Authentication

Scenario: Successful login
  Given a registered user with email "user@example.com"
  When they submit valid credentials
  Then they should be redirected to dashboard
  And their session should be active

Scenario: Failed login
  Given a registered user with email "user@example.com"
  When they submit invalid password
  Then they should see error message "Invalid credentials"
  And they should remain on login page
```

## Git Workflow

```bash
# Start workstream
git checkout main && git pull
git checkout -b feature/ws-1-auth-system

# After tests written (Step 1)
git add tests/
git commit -m "test: Add auth test specifications"

# After implementation (Step 2)
git add src/
git commit -m "feat: Implement auth system"

# After verification (Step 3)
git commit -m "test: Verify auth implementation"

# Ready for review
git push -u origin feature/ws-1-auth-system
```

## Handoff Commands

```
# After Step 4 passes:
/leadership-team review workstream WS-1

# After leadership approves:
/deployment-engineer merge feature/ws-1-auth-system
```
