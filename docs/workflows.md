# Workflows

This guide covers the TDD/BDD development cycle, workstream management, and workflow skills available in the system.

## The TDD/BDD Development Cycle

The system follows a disciplined test-driven development (TDD) and behavior-driven development (BDD) workflow:

```
┌─────────────────┐
│ /leadership-    │  ← Executive Review + Workstream Plan
│     team        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ /engineering-   │  ← TDD Cycle: Tests → Code → Verify → Review
│     team        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ /leadership-    │  ← Code Review: APPROVE or REQUEST CHANGES
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
    ▼             │ (back to engineering-team)
┌─────────────────┐
│ /deployment-    │  ← Merge to main
│   engineer      │
└─────────────────┘
```

## The 4-Step TDD Cycle

### Step 1: Tests (PM + QA)

**Who:** Product Manager and QA Engineer
**Branch:** `feature/ws-{n}-{name}`

**Activities:**
1. PM defines acceptance criteria (BDD: Given/When/Then)
2. QA writes failing test files (TDD)
3. Commit tests to feature branch

**Output:** Test files that define "done"

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

**Example:**
```
/dev Implement login endpoint with TDD

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

### Step 4: Review (Staff Engineer)

**Who:** Staff Engineer

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
/leadership-team Build user authentication system

# Output: Executive Review + Workstream Plan
# - WS-1: Login endpoint
# - WS-2: Password hashing
# - WS-3: Session management
# - WS-4: Logout functionality
```

### Executing Workstreams

Use the engineering team to execute a workstream:

```
/engineering-team Execute WS-1: Login endpoint

# Runs the full 4-step cycle:
# 1. PM + QA write tests
# 2. Dev implements
# 3. QA verifies
# 4. Staff Eng reviews
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

### Gate 4: Internal Review
- [ ] Code quality approved
- [ ] Standards met
- [ ] Security reviewed

### Gate 5: Leadership Approval
- [ ] Business requirements met
- [ ] Technical quality approved
- [ ] Operationally ready

### Gate 6: Merge Ready
- [ ] Leadership approved
- [ ] No merge conflicts
- [ ] Branch up to date

## Workflow Skills

The system provides 7 workflow skills for common development tasks.

### 1. Feature Assessment

**Command:** `/feature-assessment`

**Purpose:** Interactive feature evaluation with product and technical perspectives

**Process:**
1. Asks clarifying questions
2. Spawns Product Owner for strategic fit
3. Spawns Product Manager for scope breakdown
4. Spawns CTO for technical feasibility
5. Synthesizes GO/NO-GO recommendation

**Example:**
```
/feature-assessment Add two-factor authentication

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

**Command:** `/technical-assessment`

**Purpose:** Architecture planning and technical feasibility analysis

**Process:**
1. Analyzes technical requirements
2. Evaluates architecture options
3. Identifies technical risks
4. Recommends approach

**Example:**
```
/technical-assessment Real-time chat feature

# Output:
# - Architecture recommendation
# - Technology stack
# - Performance considerations
# - Implementation complexity
```

### 3. Security Review

**Command:** `/security-review`

**Purpose:** OWASP Top 10, authentication, data protection checks

**Process:**
1. Reviews code for OWASP Top 10 vulnerabilities
2. Validates authentication implementation
3. Checks data protection measures
4. Provides security recommendations

**Example:**
```
/security-review src/auth/

# Output:
# - OWASP compliance report
# - Security vulnerabilities found
# - Recommended fixes
# - Risk level
```

### 4. Accessibility Review

**Command:** `/accessibility-review`

**Purpose:** WCAG 2.1 AA compliance verification

**Process:**
1. Reviews UI components for accessibility
2. Checks WCAG 2.1 AA compliance
3. Tests keyboard navigation
4. Validates ARIA attributes

**Example:**
```
/accessibility-review src/components/LoginForm

# Output:
# - WCAG compliance status
# - Accessibility issues found
# - Recommended fixes
# - Testing checklist
```

### 5. Design Review

**Command:** `/design-review`

**Purpose:** UI/UX evaluation and design system compliance

**Process:**
1. Reviews UI/UX designs
2. Checks design system consistency
3. Validates interaction patterns
4. Ensures brand compliance

**Example:**
```
/design-review designs/checkout-flow.figma

# Output:
# - Design system compliance
# - UX issues identified
# - Recommended improvements
# - Consistency check
```

### 6. Code Review

**Command:** `/code-review`

**Purpose:** Technical quality, security, and standards verification

**Process:**
1. Reviews code quality
2. Checks architectural compliance
3. Validates security practices
4. Ensures test coverage

**Example:**
```
/code-review src/features/auth/

# Output:
# - Code quality score
# - Issues found
# - Recommended refactoring
# - Standards compliance
```

### 7. Implementation

**Command:** `/implement`

**Purpose:** Execute full TDD cycle from tests to production-ready code

**Process:**
1. Spawns QA to write tests
2. Spawns Dev to implement
3. Spawns QA to verify
4. Spawns Staff Engineer to review

**Example:**
```
/implement Add user registration endpoint

# Runs full cycle:
# - Tests written
# - Code implemented
# - Tests verified
# - Code reviewed
# - Ready for leadership approval
```

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
2. **Develop** - Execute TDD cycle on feature branch
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
User: /feature-assessment Add user authentication

Feature Assessment Agent:
- Asks clarifying questions
- Spawns Product Owner, Product Manager, CTO
- Provides GO decision with next steps
```

### 2. Plan the Work

```
User: /leadership-team Build user authentication

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
User: /implement WS-1: Login endpoint

Implementation Skill:
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
User: /leadership-team Review WS-1 on branch feature/ws-1-login

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

### /leadership-team
**When:** Start of initiative, Code review before merge
**Does:**
- Creates Executive Review (CEO, CTO, Eng Dir perspectives)
- Breaks initiative into Git Workstreams
- Conducts final code review before merge
- APPROVES or REQUESTS CHANGES

### /engineering-team
**When:** Executing a workstream
**Does:**
- Coordinates PM, QA, Dev, Staff Eng
- Runs the TDD cycle
- Reports when ready for leadership review

### PM + QA (Step 1)
**When:** First step of each workstream
**Does:**
- PM defines acceptance criteria (BDD: Given/When/Then)
- QA writes test files (TDD: failing tests)
- Commits tests to feature branch

### Dev (Step 2)
**When:** After tests exist
**Does:**
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

### Staff Engineer (Step 4)
**When:** After QA sign-off
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

### For TDD

1. **Write tests first** - Always red before green
2. **Minimal implementation** - Only write code to pass tests
3. **Refactor fearlessly** - Tests protect you
4. **99% coverage** - No exceptions

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
