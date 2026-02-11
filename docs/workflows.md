# Workflows

This guide covers the CAD (Constraint-Driven Agentic Development) cycle, workstream management, and workflow skills available in the system.

## The CAD Development Cycle

The system follows a Constraint-Driven Agentic Development (CAD) workflow that enhances test-first principles with artifact bundles, curated context, and classification-driven gating:

```
┌─────────────────┐
│ /mg-leadership- │  ← Executive Review + Workstream Plan
│     team        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ /mg-build       │  ← CAD Cycle: Tests → Code → Verify → Classify → Review
│                 │    (Step 3.5: MECHANICAL or ARCHITECTURAL classification)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ /mg-leadership- │  ← Code Review: APPROVE or REQUEST CHANGES
│     team        │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌──────────────┐
│APPROVE│  │REQUEST CHANGES│
└───┬───┘  └──────┬───────┘
    │             │
    ▼             │ (back to mg-build)
┌─────────────────┐
│ /deployment-    │  ← Merge to main
│   engineer      │
└─────────────────┘
```

## The CAD Development Cycle

### Step 1: Tests (PM + QA)

**Who:** Product Manager and QA Engineer
**Branch:** `feature/ws-{n}-{name}`

**Activities:**
1. PM defines acceptance criteria (Given/When/Then)
2. QA writes failing test files following misuse-first ordering: misuse cases → boundary cases → golden path
3. Commit tests to feature branch

**Output:** Test files that define "done"

**CAD Enhancement:** QA receives an artifact bundle (~8K tokens) with curated context: relevant acceptance criteria, applicable security standards, and related test patterns.

**Example:**
```
/product-manager Define acceptance criteria for login endpoint
/qa Write test specs for login endpoint

# Tests are written and committed
# Tests fail (no implementation yet)
```

### Step 2: Code (Dev)

**Who:** Senior Fullstack Engineer

**Activities:**
1. Run tests (confirm they fail - RED)
2. Implement minimum code to pass tests (GREEN)
3. Refactor while maintaining green tests (REFACTOR)
4. Commit implementation

**Output:** Code that passes all tests

**CAD Enhancement:** Dev receives a pre-computed artifact bundle (~12K tokens) with INPUTS (relevant test specs), GATE (pass criteria: 99% coverage, all tests green), and CONSTRAINTS (applicable standards). This reduces context from ~75K to ~12K tokens (84% reduction).

**Example:**
```
/dev Implement login endpoint

# Dev process:
# - Runs tests (RED - failing)
# - Writes minimal implementation (GREEN - passing)
# - Refactors for quality (still GREEN)
# - Commits code
```

### Step 3: Verify (QA)

**Who:** QA Engineer

**Activities:**
1. Run full test suite
2. Check code coverage (must be 99%+)
3. Validate edge cases
4. Sign off OR report issues

**Output:** QA sign-off or issue list

**Example:**
```
/qa Verify test coverage for login endpoint

# QA checks:
# - All tests passing ✅
# - Coverage at 99.2% ✅
# - Edge cases handled ✅
# - SIGN OFF
```

### Step 3.5: Classification

**Who:** Automated (mg-build orchestrator)

**Activities:**
1. Classify workstream as MECHANICAL or ARCHITECTURAL
2. Apply classification rules (R1-R8 for ARCHITECTURAL, M1-M5 for MECHANICAL)
3. Conservative bias: if uncertain, default to ARCHITECTURAL

**ARCHITECTURAL triggers (R1-R8):** package.json changes, framework files, security-sensitive paths, >5 files + >300 lines, new subdirectories, new projects, CI/CD files, database migrations

**MECHANICAL criteria (M1-M5):** All tests pass + 99% coverage, <200 lines (<500 single-module), modifications only, single src/ + tests/ directory, single skill/agent template additions

**Output:** Route to Step 4A (Mechanical Gate) or Step 4B (Staff Engineer Review)

### Step 4A: Mechanical Gate (Automated)

**Who:** Automated bash verification
**Trigger:** Workstream classified as MECHANICAL

**Verification:**
- [ ] All tests pass
- [ ] Coverage >= 99%
- [ ] Total changes < 200 lines (< 500 single-module)
- [ ] Modifications only (no new files except tests)
- [ ] No package.json, framework, or CI/CD changes

**Output:** Automated gate pass — eliminates need for staff-engineer spawn

### Step 4B: Staff Engineer Review (Architectural)

**Who:** Staff Engineer
**Trigger:** Workstream classified as ARCHITECTURAL

**Activities:**
1. Review code quality
2. Check architecture compliance
3. Review security practices
4. Approve OR request changes

**Output:** Internal review approval

**Example:**
```
/staff-engineer Review code quality for WS-1

# Staff Engineer checks:
# - Code follows patterns ✅
# - DRY principle applied ✅
# - Security best practices ✅
# - APPROVED
```

## Workstream Management

### What is a Workstream?

A workstream is a discrete unit of work that can be completed independently:
- Has its own Git feature branch
- Includes tests, implementation, and review
- Results in a merge to main after approval

### Workstream Naming

- Pattern: `WS-{number}-{short-name}`
- Example: `WS-1-login-endpoint`
- Branch: `feature/ws-1-login-endpoint`

### Creating Workstreams

Use the leadership team to break down initiatives into workstreams:

```
/mg-leadership-team Build user authentication system

# Output: Executive Review + Workstream Plan
# - WS-1: Login endpoint
# - WS-2: Password hashing
# - WS-3: Session management
# - WS-4: Logout functionality
```

### Executing Workstreams

Use the build skill to execute a workstream:

```
/mg-build Execute WS-1: Login endpoint

# Runs the full CAD cycle:
# 1. PM + QA write tests
# 2. Dev implements
# 3. QA verifies
# 3.5. Classify (MECHANICAL or ARCHITECTURAL)
# 4. Mechanical Gate (4A) or Staff Eng Review (4B)
```

## Quality Gates

Each workstream must pass through multiple quality gates:

### Gate 1: Tests Exist
- [ ] Test files created
- [ ] Tests cover acceptance criteria
- [ ] Tests are failing (no implementation yet)

### Gate 2: Tests Pass
- [ ] All tests passing
- [ ] No regressions

### Gate 3: QA Sign-off
- [ ] Coverage adequate (99%+)
- [ ] Edge cases handled
- [ ] QA approves

### Gate 3.5: Classification
- [ ] Workstream classified as MECHANICAL or ARCHITECTURAL
- [ ] Classification rules applied (R1-R8, M1-M5)
- [ ] Route determined (4A or 4B)

### Gate 4A: Mechanical Gate (MECHANICAL path)
- [ ] All tests pass
- [ ] Coverage >= 99%
- [ ] <200 lines (<500 single-module)
- [ ] Modifications only
- [ ] Single src/ + tests/ directory

### Gate 4B: Internal Review (ARCHITECTURAL path)
- [ ] Code quality approved
- [ ] Standards met
- [ ] Security reviewed
- [ ] Architecture compliance

### Gate 5: Leadership Approval
- [ ] Business requirements met
- [ ] Technical quality approved
- [ ] Operationally ready

### Gate 6: Merge Ready
- [ ] Leadership approved
- [ ] No merge conflicts
- [ ] Branch up to date

## Workflow Skills

The system provides 16 workflow skills for common development tasks.

### 1. Feature Assessment

**Command:** `/mg-assess`

**Purpose:** Interactive feature evaluation with product and technical perspectives

**Process:**
1. Asks clarifying questions
2. Spawns Product Owner for strategic fit
3. Spawns Product Manager for scope breakdown
4. Spawns CTO for technical feasibility
5. Synthesizes GO/NO-GO recommendation

**Example:**
```
/mg-assess Add two-factor authentication

# Agent asks:
# - What problem does this solve?
# - Who are the users?
# - What defines success?

# Then spawns experts and provides:
# - GO/NO-GO decision
# - Next steps
# - Risk assessment
```

### 2. Technical Assessment

**Command:** `/mg-assess-tech`

**Purpose:** Architecture planning and technical feasibility analysis

**Process:**
1. Analyzes technical requirements
2. Evaluates architecture options
3. Identifies technical risks
4. Recommends approach

**Example:**
```
/mg-assess-tech Real-time chat feature

# Output:
# - Architecture recommendation
# - Technology stack
# - Performance considerations
# - Implementation complexity
```

### 3. Security Review

**Command:** `/mg-security-review`

**Purpose:** OWASP Top 10, authentication, data protection checks

**Process:**
1. Reviews code for OWASP Top 10 vulnerabilities
2. Validates authentication implementation
3. Checks data protection measures
4. Provides security recommendations

**Example:**
```
/mg-security-review src/auth/

# Output:
# - OWASP compliance report
# - Security vulnerabilities found
# - Recommended fixes
# - Risk level
```

### 4. Accessibility Review

**Command:** `/mg-accessibility-review`

**Purpose:** WCAG 2.1 AA compliance verification

**Process:**
1. Reviews UI components for accessibility
2. Checks WCAG 2.1 AA compliance
3. Tests keyboard navigation
4. Validates ARIA attributes

**Example:**
```
/mg-accessibility-review src/components/LoginForm

# Output:
# - WCAG compliance status
# - Accessibility issues found
# - Recommended fixes
# - Testing checklist
```

### 5. Design Review

**Command:** `/mg-design-review`

**Purpose:** UI/UX evaluation and design system compliance

**Process:**
1. Reviews UI/UX designs
2. Checks design system consistency
3. Validates interaction patterns
4. Ensures brand compliance

**Example:**
```
/mg-design-review designs/checkout-flow.figma

# Output:
# - Design system compliance
# - UX issues identified
# - Recommended improvements
# - Consistency check
```

### 6. Code Review

**Command:** `/mg-code-review`

**Purpose:** Technical quality, security, and standards verification

**Process:**
1. Reviews code quality
2. Checks architectural compliance
3. Validates security practices
4. Ensures test coverage

**Example:**
```
/mg-code-review src/features/auth/

# Output:
# - Code quality score
# - Issues found
# - Recommended refactoring
# - Standards compliance
```

### 7. Build (Implementation)

**Command:** `/mg-build`

**Purpose:** Execute full CAD cycle from tests to production-ready code

**Process:**
1. Spawns QA to write tests
2. Spawns Dev to implement
3. Spawns QA to verify
4. Classifies workstream (MECHANICAL or ARCHITECTURAL)
5. Routes to automated gate (4A) or Staff Engineer review (4B)

**Example:**
```
/mg-build Add user registration endpoint

# Runs full cycle:
# - Tests written
# - Code implemented
# - Tests verified
# - Code reviewed
# - Ready for leadership approval
```

### 8. Leadership Team

**Command:** `/mg-leadership-team`
**Purpose:** Strategic decisions, executive reviews, code review approvals

### 9. Product Team

**Command:** `/mg-spec`
**Purpose:** Product definition, user stories, design specs

### 10. Design Team

**Command:** `/mg-design`
**Purpose:** UI/UX design with visual regression review

### 11. Docs Team

**Command:** `/mg-document`
**Purpose:** Documentation and API spec generation

### 12. Content Team

**Command:** `/mg-write`
**Purpose:** Brand-aligned copywriting for marketing and user-facing content

### 13. Init Project

**Command:** `/mg-init`
**Purpose:** Initialize project memory structure and context files

### 14. Add Project Context

**Command:** `/mg-add-context`
**Purpose:** Add project-specific context to CLAUDE.md

### 15. Debug

**Command:** `/mg-debug`
**Purpose:** Root cause analysis and systematic debugging

### 16. Refactor

**Command:** `/mg-refactor`
**Purpose:** Systematic code refactoring with quality improvements

## Git Branching Strategy

### Main Branch

The `main` branch is protected and requires leadership approval for merges.

### Feature Branches

Each workstream gets its own feature branch:

```
main (protected)
├── feature/ws-1-login-endpoint
├── feature/ws-2-password-hashing
└── feature/ws-3-session-management
```

### Branch Lifecycle

1. **Create** - Branch from main for new workstream
2. **Develop** - Execute CAD cycle on feature branch
3. **Review** - Leadership reviews completed workstream
4. **Merge** - Deployment engineer merges to main
5. **Cleanup** - Delete feature branch after merge

### Commit Message Convention

```bash
test: Add test specs for [feature]        # Step 1 (QA)
feat: Implement [feature]                  # Step 2 (Dev)
test: Verify [feature] implementation      # Step 3 (QA)
refactor: Improve [aspect]                 # Refactoring
chore: Merge WS-X: [description]           # Merge
```

## Example: Complete Workflow

Let's walk through a complete workflow from feature idea to production.

### 1. Assess the Feature

```
User: /mg-assess Add user authentication

Feature Assessment Agent:
- Asks clarifying questions
- Spawns Product Owner, Product Manager, CTO
- Provides GO decision with next steps
```

### 2. Plan the Work

```
User: /mg-leadership-team Build user authentication

Leadership Team:
Executive Review:
- CEO: Aligns with business strategy ✅
- CTO: Technically feasible with existing stack ✅
- Eng Dir: Team has capacity ✅

Workstream Plan:
- WS-1: Login endpoint
- WS-2: Password hashing with bcrypt
- WS-3: Session management with JWT
- WS-4: Logout functionality
```

### 3. Execute First Workstream

```
User: /mg-build WS-1: Login endpoint

Build Skill:
Step 1: QA writes tests
- POST /api/login endpoint
- Validates email/password
- Returns JWT token
- Tests committed, failing

Step 2: Dev implements
- Creates login route handler
- Implements validation logic
- Returns JWT on success
- Tests passing

Step 3: QA verifies
- All tests pass ✅
- Coverage: 99.4% ✅
- Edge cases tested ✅

Step 4: Staff Eng reviews
- Code quality good ✅
- Follows patterns ✅
- Security practices correct ✅

Ready for leadership review!
```

### 4. Leadership Review

```
User: /mg-leadership-team Review WS-1 on branch feature/ws-1-login

Leadership Team:
CEO Review:
- Meets business requirements ✅
- Aligns with product strategy ✅

CTO Review:
- Architecture sound ✅
- Security practices correct ✅
- Performance acceptable ✅

Engineering Director Review:
- Tests comprehensive ✅
- Coverage adequate ✅
- Operational readiness confirmed ✅

Decision: APPROVED ✅
```

### 5. Deploy

```
User: /deployment-engineer Merge feature/ws-1-login

Deployment Engineer:
- Verifies leadership approval ✅
- Updates branch with main ✅
- No merge conflicts ✅
- Merges to main ✅
- Cleans up feature branch ✅

WS-1 deployed to production!
```

### 6. Repeat for Remaining Workstreams

Continue with WS-2, WS-3, and WS-4 using the same process.

## Role Responsibilities in Workflow

### /mg-leadership-team
**When:** Start of initiative, Code review before merge
**Does:**
- Creates Executive Review (CEO, CTO, Eng Dir perspectives)
- Breaks initiative into Git Workstreams
- Conducts final code review before merge
- APPROVES or REQUESTS CHANGES

### /mg-build
**When:** Executing a workstream
**Does:**
- Coordinates PM, QA, Dev, Staff Eng
- Runs the CAD cycle (test-first with artifact bundles and classification-driven gating)
- Reports when ready for leadership review

### PM + QA (Step 1)
**When:** First step of each workstream
**Does:**
- PM defines acceptance criteria (Given/When/Then)
- QA writes test files with misuse-first ordering (misuse → boundary → golden path)
- Receives artifact bundle (~8K tokens) with curated context
- Commits tests to feature branch

### Dev (Step 2)
**When:** After tests exist
**Does:**
- Receives artifact bundle (~12K tokens) with curated context
- Runs tests (confirms they fail)
- Implements minimum code to pass
- Refactors while green
- Commits implementation

### QA (Step 3)
**When:** After implementation
**Does:**
- Runs full test suite
- Checks coverage
- Validates edge cases
- Signs off OR reports issues

### Mechanical Gate (Step 4A — MECHANICAL)
**When:** After QA sign-off AND classified as MECHANICAL
**Does:**
- Automated bash verification
- Checks: tests pass, 99% coverage, <200 lines, modifications only
- Eliminates need for staff-engineer spawn

### Staff Engineer (Step 4B — ARCHITECTURAL)
**When:** After QA sign-off AND classified as ARCHITECTURAL
**Does:**
- Reviews code quality
- Checks architecture compliance
- Reviews security
- Approves OR requests changes

### /deployment-engineer
**When:** After leadership approval
**Does:**
- Verifies approval
- Updates branch with main
- Resolves conflicts (with dev help)
- Merges to main
- Cleans up branch

## Best Practices

### For CAD Development

1. **Write tests first** - Always red before green
2. **Minimal implementation** - Only write code to pass tests
3. **Refactor fearlessly** - Tests protect you
4. **99% coverage** - No exceptions
5. **Misuse-first** - Security tests before happy paths
6. **Artifact bundles** - Curated context reduces noise for task agents

### For Workstreams

1. **Keep them small** - Each workstream should be 1-3 days of work
2. **Make them independent** - Should not block other workstreams
3. **Clear objectives** - Everyone knows what "done" means
4. **Atomic merges** - Each workstream is fully functional

### For Code Review

1. **Review everything** - Even small changes get reviewed
2. **Be specific** - Point to exact lines and provide suggestions
3. **Check security** - Always consider security implications
4. **Verify tests** - Ensure tests actually test the right things

### For Delegation

1. **Use proper depth** - Don't exceed 3 levels
2. **Avoid loops** - Don't delegate back up the chain
3. **Peer consultation** - Use it for quick questions
4. **Clear handoffs** - Use structured handoff envelopes

## Troubleshooting Workflows

### Tests Not Passing

1. Check test specifications match implementation
2. Verify edge cases are handled
3. Consult QA for test clarification
4. Run tests locally to debug

### Coverage Below 99%

1. Identify uncovered code paths
2. Add tests for missing scenarios
3. Check for unreachable code
4. Consider if code can be simplified

### Merge Conflicts

1. Update feature branch with latest main
2. Consult Dev to resolve conflicts
3. Re-run tests after resolution
4. Verify functionality still works

### Leadership Requests Changes

1. Review specific feedback provided
2. Create new commits addressing feedback
3. Do NOT amend previous commits
4. Request re-review when ready

## Next Steps

- Learn about the [Agent Hierarchy](/agents)
- Understand the [Architecture](/architecture)
- Read the [Getting Started Guide](/getting-started)
- Check [Contributing Guidelines](/contributing)
