# Test-First Workflow Reference (CAD-Enhanced)

Detailed reference for the Test-First Development workflow enhanced with Constraint-Driven Agentic Development (CAD) methodology. This is the authoritative process for all engineering work.

**CAD Enhancements:**
- Misuse-first test ordering (security before happy paths)
- Artifact bundles with curated context for task agents
- Mechanical gates for routine verification
- Conditional architectural review for complex changes

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

**Misuse-First Ordering (CAD Requirement):**
Tests MUST be written in this order:
1. **Misuse cases** - Security exploits, injection attacks, auth bypasses
2. **Boundary cases** - Empty inputs, null values, edge conditions
3. **Golden path** - Normal happy-path scenarios

**Rationale:** Security-first approach catches abuse patterns before validating normal behavior. Misuse tests prevent regression on security fixes.

**Artifact Bundle (CAD):**
QA receives curated context (~8K tokens):
- Relevant acceptance criteria (3-5 scenarios)
- Applicable security standards (2-3 rules)
- Related test patterns (1-2 examples)

**Gate:** `tests_written` - Tests exist and fail

### Step 2: Implementation (Dev)

**Owner:** Senior Fullstack Engineer

**Inputs:**
- Failing tests from Step 1
- Technical standards from Staff Engineer

**Artifact Bundle (CAD):**
Dev receives pre-computed context (~12K tokens):
- **INPUTS:** Relevant test specs (5-10 tests)
- **GATE:** Pass criteria (99% coverage, all tests green)
- **CONSTRAINTS:** Applicable standards (3-5 rules: DRY, config-over-composition, security patterns)

This curated bundle reduces context from ~75K to ~12K tokens (84% reduction), improving signal-to-noise ratio 16x.

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

**Artifact Bundle (CAD):**
QA receives curated context (~8K tokens):
- Test specs written in Step 1
- Implementation changes from Step 2
- Verification checklist

**Checks:**
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] E2E tests pass
- [ ] Coverage >= 99%
- [ ] No regressions
- [ ] Visual regression check (if UI)

**Verification Script Pattern:**
For complex verification checks, verification scripts MUST be written via Write tool to `/tmp/mg-verify-*.sh`, then executed with Bash tool. This prevents settings.local.json permission pattern bloat from inline bash heredocs.

**Gate:** `qa_approved`

### Step 4: Code Review (Conditional)

**Classification First (CAD):**
Before Step 4, workstream is classified as MECHANICAL or ARCHITECTURAL using rules below. Classification determines review path.

#### Step 4A: Mechanical Gate (Automated)

**Trigger:** Workstream classified as MECHANICAL (rules M1-M5)

**Owner:** Automated bash verification

**Verification:**
- [ ] All tests pass
- [ ] Coverage >= 99%
- [ ] Total changes < 200 lines (< 500 if single-module)
- [ ] Modifications only (no new files except tests)
- [ ] Single src/ directory + tests/
- [ ] No package.json, framework, or CI/CD changes

**Gate:** `mechanical_gate_passed`

**Impact:** Eliminates 1 staff-engineer spawn for 60%+ of workstreams. Mechanical verification accuracy: 85%+.

#### Step 4B: Staff Engineer Review (Architectural)

**Trigger:** Workstream classified as ARCHITECTURAL (rules R1-R8)

**Owner:** Staff Engineer

**Review Checklist:**
- [ ] Follows DRY principle
- [ ] Uses config-over-composition
- [ ] No security vulnerabilities
- [ ] Performance acceptable
- [ ] Matches architectural patterns
- [ ] Documentation adequate

**Gate:** `code_review_passed`

## Classification Rules (CAD)

**ARCHITECTURAL workstreams (rules R1-R8)** - Require Staff Engineer review (Step 4B):

- **R1:** package.json changes (dependencies, scripts)
- **R2:** Framework files (.claude/, core infrastructure)
- **R3:** Security-sensitive paths (auth/, permissions/, crypto/)
- **R4:** Large multi-file changes (>5 files AND >300 lines, except same-module)
- **R5:** New subdirectories or modules
- **R6:** New projects or packages
- **R7:** CI/CD files (.github/workflows/, .gitlab-ci.yml)
- **R8:** Database migrations or schema changes

**MECHANICAL workstreams (rules M1-M5)** - Use automated gate (Step 4A):

- **M1:** All tests pass + coverage >= 99%
- **M2:** Total changes < 200 lines (< 500 if single-module, same directory)
- **M3:** Modifications only (no new files except tests)
- **M4:** Single src/ directory + tests/ directory
- **M5:** Single skill/agent template additions (SKILL.md or AGENT.md in existing directory)

**Conservative Bias:**
- If classification is UNCERTAIN → default to ARCHITECTURAL
- If any R-rule matches → ARCHITECTURAL (R-rules take precedence)
- All M-rules must match → MECHANICAL

**Validation:**
Classification rules validated at 100% accuracy on 38 historical workstreams. Parallel run mode recommended for new projects until confidence established.

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
/mg-leadership-team review workstream WS-1

# After leadership approves:
/deployment-engineer merge feature/ws-1-auth-system
```
