# Process Flows

Detailed step-by-step breakdowns of every major process in the framework. Each section describes inputs, outputs, decision points, and which components are involved.

## Skill Invocation Flow

When a user types a slash command like `/mg-build`, Claude Code follows this sequence:

```
User types /mg-build [args]
         │
         ▼
Claude Code loads skills/mg-build/SKILL.md
         │   (loaded as current agent persona + instructions)
         │
         ▼
SKILL.md references are read
         │   (references/output-format.md, references/model-escalation.md)
         │
         ▼
Skill reads shared memory
         │   .claude/memory/workstream-{id}-state.json
         │   .claude/memory/agent-leadership-decisions.json
         │
         ▼
Skill spawns agents via Task tool
         │   Task(subagent_type="qa", prompt="...")
         │   Task(subagent_type="dev", prompt="...")
         │
         ▼
Agents execute and write results to memory
         │   .claude/memory/agent-{name}-decisions.json
         │   .claude/memory/workstream-{id}-state.json
         │
         ▼
Skill aggregates results and reports to user
```

**Inputs:** User command string and optional arguments
**Outputs:** Progress report plus updated memory files
**Components:** Claude Code slash command loader, SKILL.md, Task tool, shared memory

### Key Decision Points

| Point | Decision | Outcome |
|-------|----------|---------|
| Skill loaded | Which tool set is allowed? | Determined by `allowed-tools` in front matter |
| Memory check | Does prior workstream state exist? | Read or initialize workstream state file |
| Spawn decision | Which agents does this skill need? | Defined in SKILL.md workflow steps |
| Depth check | Is delegation depth < 3? | Proceed or return partial result |

---

## Agent Lifecycle

Every agent follows the same lifecycle regardless of role.

```
Orchestrator calls Task(subagent_type="qa", prompt="...")
         │
         ▼
Claude Code loads agents/qa/agent.md
         │   (front matter sets model, tools, maxTurns)
         │
         ▼
Agent reads base protocol (agents/_base/agent-base.md)
         │
         ▼
Agent checks message bus
         │   read: .claude/memory/messages-*-qa.json
         │
         ▼
Agent reads task context from memory
         │   .claude/memory/tasks-qa.json
         │   .claude/memory/workstream-{id}-state.json
         │
         ▼
Agent executes role-specific work
         │   (write tests, implement code, review, etc.)
         │
         ▼
Agent may delegate or consult
         │   delegation: Task(subagent_type="...", ...)  — increments depth
         │   consultation: Task(subagent_type="...", ...)  — does NOT increment depth
         │
         ▼
Agent writes decisions to memory
         │   .claude/memory/agent-qa-decisions.json
         │
         ▼
Agent writes handoff message (if passing to next agent)
         │   .claude/memory/messages-qa-dev.json
         │
         ▼
Agent returns result to orchestrator
```

**Inputs:** Task prompt, workstream context from memory, message bus messages
**Outputs:** Decisions written to memory, handoff messages, return value to orchestrator
**Components:** agent.md, agent-base.md, memory files, Task tool (for sub-delegation)

### Agent Constitution Check

Before any significant action, all agents verify:

1. **Depth limit** — Is `chain.depth < 3`? If not, complete locally or return partial.
2. **Loop check** — Is the target agent already in `chain.path`? If so, reject the delegation.
3. **Memory-first** — Always read relevant memory files before making decisions.
4. **Write-tool rule** — Use Write tool for file creation, never bash heredocs.

---

## Memory Protocol Flow

The memory protocol defines how agents coordinate state without direct communication.

### Write Path

```
Agent is about to write to a memory file
         │
         ▼
Check file size
         │   size < 50 KB? → write directly
         │   size >= 50 KB? → rotation needed
         │
         ▼ (rotation branch)
Read all entries from the file
         │
         ▼
Separate active vs non-active entries
         │   active = entries tied to in-progress workstreams (always kept)
         │   non-active = completed or old entries
         │
         ▼
Keep: all active + up to 20 recent non-active
(10 for feature-spec files)
         │
         ▼
Archive older non-active entries
         │   → .claude/memory/.archive/{filename}.{YYYY-MM-DD}.json
         │   (merge with today's archive if it exists)
         │
         ▼
Write retained entries back to original file
         │
         ▼
Write new entry to (now-rotated) file
```

### Read Path

```
Agent needs context before acting
         │
         ▼
Read task queue
         │   .claude/memory/tasks-{role}.json
         │
         ▼
Read workstream state
         │   .claude/memory/workstream-{id}-state.json
         │
         ▼
Read relevant decisions
         │   .claude/memory/agent-{relevant-role}-decisions.json
         │
         ▼
Check message bus
         │   .claude/memory/messages-*-{my-role}.json
         │
         ▼
Proceed with informed context
```

### Message Bus Flow

```
Sending agent (e.g., QA wants to notify Dev):
         │
         ▼
Write to .claude/memory/messages-qa-dev.json
  {
    "from": "qa",
    "to": "dev",
    "type": "handoff",
    "subject": "Test specs committed",
    "body": "Tests at tests/auth.test.ts. All failing.",
    "requires_response": false
  }
         │
         ▼
Receiving agent (Dev) checks message bus before starting:
         │
         ▼
Read .claude/memory/messages-*-dev.json
         │
         ▼
Process pending messages
         │   handoff → proceed with work
         │   question → respond via messages-dev-qa.json
         │   blocker → escalate via escalations.json
```

**Message types:**

| Type | Purpose | Response Required |
|------|---------|-------------------|
| `info` | Status update, FYI | No |
| `question` | Needs clarification | Yes |
| `blocker` | Stuck, needs help | Yes |
| `handoff` | Work complete, passing on | No |

---

## CAD Development Workflow

The Constraint-Driven Agentic Development (CAD) workflow is the primary development process. It starts with classification at intake and routes work to the appropriate track.

### Step 0: Classification at Intake

Classification happens **before any agent spawns**. The orchestrator reads the ticket or request description and applies two rule sets.

```
Read ticket / request description
         │
         ▼
Apply R1-R8 rules (ARCHITECTURAL triggers)
         │   R1: package.json or dependency changes
         │   R2: framework files (.claude/, src/framework/, src/installer/)
         │   R3: security-sensitive paths (auth/, permissions/, credentials/)
         │   R4: >5 files modified AND >300 lines (except same-module)
         │   R5: new subdirectories created
         │   R6: new projects or workspaces added
         │   R7: CI/CD configuration changes (.github/, .gitlab-ci.yml)
         │   R8: database schema or migration changes
         │
         ├── Any R-rule matches? → ARCHITECTURAL
         │
         ▼ (no R-rules matched)
Apply M1-M5 rules (MECHANICAL criteria)
         │   M1: all tests pass + coverage >= 99%
         │   M2: < 200 lines total (< 500 if single module)
         │   M3: modifications only (no new files except tests)
         │   M4: changes in single src/ directory + tests/
         │   M5: single skill/agent template addition (no framework changes)
         │
         ├── All M-rules match? → MECHANICAL
         │
         └── Uncertain? → ARCHITECTURAL (conservative bias)
         │
         ▼
User override flags (on /mg-build):
  --force-mechanical    → MECHANICAL regardless of rules
  --force-architectural → ARCHITECTURAL regardless of rules
         │
         ▼
Write classification to workstream state
  .claude/memory/workstream-{id}-state.json
  { track: "mechanical" | "architectural" }
```

**Decision output:** `MECHANICAL` or `ARCHITECTURAL`
**Spawns:** 0 (classification requires no agent spawn)

---

### MECHANICAL Track

For routine, lower-risk work. Approximately 60% of workstreams follow this path.

```
Total spawns: 1
         │
         ▼
Spawn: Dev
  Prompt includes artifact bundle (~12K tokens):
    INPUTS:   acceptance criteria, relevant context
    GATE:     99% coverage, all tests green, line limits
    CONSTRAINTS: DRY, config-over-composition, security patterns

Dev executes full TDD cycle:
  1. Write failing tests
     Order: misuse cases → boundary cases → golden path
  2. Run tests — confirm they fail (RED)
  3. Write minimum code to pass
  4. Run tests — confirm they pass (GREEN)
  5. Refactor while keeping tests green
  6. Verify coverage >= 99%
  7. Write handoff message to messages-dev-gate.json
         │
         ▼
Bash Gate (automated — no spawn)
  [ ] All tests pass
  [ ] Coverage >= 99%
  [ ] Total changes < 200 lines (< 500 single-module)
  [ ] Modifications only (no new files except tests)
  [ ] Single src/ directory + tests/
  [ ] No package.json, framework, or CI/CD changes
         │
         ├── Gate fails? → Route back to Dev with failure details
         │
         ▼
DONE — no leadership review
```

**Inputs:** Ticket or workstream description with acceptance criteria
**Outputs:** Passing code with 99% coverage
**Components:** mg-build, dev agent, bash gate
**Memory:** `workstream-{id}-state.json`, `agent-dev-decisions.json`

---

### ARCHITECTURAL Track

For complex, risky, or cross-cutting work. 5–6 spawns through multiple review gates.

```
Total spawns: 5-6
         │
Step 1   ▼
/mg-leadership-team — Executive Review + Workstream Plan
  Spawns CEO, CTO, Engineering Director (in parallel)
  Each provides perspective:
    CEO: business value and strategic alignment
    CTO: technical approach and risks
    Eng Dir: operational readiness and capacity
  Output: APPROVED FOR DEVELOPMENT + workstream breakdown
  Memory: agent-leadership-decisions.json (planning phase)
         │
Step 2   ▼
QA — Test Specification
  Receives artifact bundle (~8K tokens):
    3-5 acceptance criteria scenarios
    2-3 applicable security standards
    1-2 related test patterns
  Writes tests in misuse-first order:
    1. Misuse cases (security exploits, injection, auth bypass)
    2. Boundary cases (empty inputs, nulls, edge conditions)
    3. Golden path (normal expected behavior)
  Commits failing tests to feature branch
  Writes handoff to messages-qa-dev.json
  Gate: tests_written (tests exist and fail)

QA and Dev can run in parallel once QA has committed initial stubs
         │
Step 3   ▼
Dev — Implementation
  Reads QA handoff from messages-qa-dev.json
  Receives artifact bundle (~12K tokens):
    INPUTS:   relevant test specs (5-10 tests)
    GATE:     99% coverage, all tests green
    CONSTRAINTS: DRY, config-over-composition, security patterns
  Runs Red → Green → Refactor cycle:
    1. Run tests — confirm RED
    2. Write minimum code to pass each test
    3. Refactor while green
  Commits implementation to feature branch
  Writes handoff to messages-dev-staff-engineer.json
  Gate: tests_pass_and_coverage_met
         │
Step 3.5 ▼ (conditional)
Dual-Specialist Review
  Trigger: deliverable contains fenced code blocks (``` or ~~~)
  Skip if: no code blocks in deliverable

  Spawn two specialists in parallel:
    Domain specialist — platform correctness
      (e.g., API design, database patterns, framework idioms)
    Language specialist — code quality and idiomatic style

  Each returns findings severity-ranked:
    blocking: must be fixed before acceptance
    warning:  advisory, does not block

  Gate: both must pass — partial approval does not proceed
         │
Step 4   ▼
Staff Engineer — Internal Review
  Reviews against:
    - Code quality and DRY principle
    - Architecture compliance and patterns
    - Security best practices
    - Performance characteristics
    - Documentation adequacy
  Output: APPROVED or REQUEST CHANGES (with specific feedback)
  Gate: code_review_passed
         │
Step 5   ▼
/mg-leadership-team — Code Review + Approval
  Spawns CEO, CTO, Engineering Director (in parallel)
  Each reviews the completed workstream:
    CEO: business requirements met
    CTO: technical quality and standards
    Eng Dir: operational readiness
  Decision: APPROVED or REQUEST CHANGES
  If REQUEST CHANGES: specific feedback written, back to Dev
  Memory: agent-leadership-decisions.json (code_review_complete)
  Gate: leadership_approved
         │
Step 6   ▼
Deployment Engineer — Merge
  Verifies leadership approval in memory
  Updates feature branch with main
  Resolves conflicts (consults Dev if needed)
  Merges to main
  Cleans up feature branch
  Updates workstream state to: merged
```

**Inputs:** Ticket or initiative description
**Outputs:** Merged code in main with full audit trail in memory
**Components:** mg-build, mg-leadership-team, qa, dev, staff-engineer, deployment-engineer
**Memory:** `workstream-{id}-state.json`, `agent-leadership-decisions.json`, `agent-qa-decisions.json`, `agent-dev-decisions.json`, various message bus files

---

## TDD Workflow Cycle

The Red-Green-Refactor cycle is the core of all implementation work. It operates differently depending on the CAD track.

### MECHANICAL: Dev Solo

```
Write failing test (RED)
         │
         ▼
Run test — confirm it fails
         │   failing? → proceed
         │   passing? → the test is wrong; fix it
         │
         ▼
Write minimum code to pass the test
         │
         ▼
Run test — confirm it passes (GREEN)
         │   passing? → proceed
         │   failing? → fix implementation
         │
         ▼
Refactor while keeping tests green
         │   extract duplication
         │   improve naming
         │   apply DRY and config-over-composition
         │
         ▼
Run full test suite
         │   all pass? → proceed
         │   any fail? → fix before continuing
         │
         ▼
Check coverage
         │   >= 99%? → proceed
         │   < 99%? → add tests for uncovered paths
         │
         ▼
Repeat for next failing test
         │
         ▼
All tests written and passing → commit
```

### ARCHITECTURAL: QA then Dev

```
QA: Write failing tests (Step 2 of ARCHITECTURAL track)
         │
         ▼
QA: Write in misuse-first order:
  1. Misuse cases first (security exploits, injection attacks, auth bypasses)
     Rationale: catch abuse patterns before validating normal behavior
  2. Boundary cases (empty inputs, null values, off-by-one, max/min)
  3. Golden path (normal expected user behavior)
         │
         ▼
QA: Run tests — confirm all fail (RED)
         │
         ▼
QA: Commit failing tests, write handoff to messages-qa-dev.json
         │
Dev can start as soon as QA handoff message appears
         │
         ▼
Dev: Read QA handoff and test files
         │
         ▼
Dev: Run tests — confirm they fail (confirm RED)
         │
         ▼
Dev: Implement minimum code to pass each test (GREEN)
         │
         ▼
Dev: Refactor while green (REFACTOR)
         │
         ▼
Dev: Verify coverage >= 99%
         │
         ▼
Dev: Commit implementation, write handoff to messages-dev-staff-engineer.json
```

### Test Ordering: Why Misuse First

Security exploits and injection attacks must be tested **before** happy paths:

1. Misuse cases are harder to add retroactively once happy-path code exists
2. Security regressions are most costly — catching them early prevents them from ever being accepted
3. Tests written after implementation tend to be shaped by the implementation, missing edge cases
4. Misuse-first forces the developer to think about the attack surface before writing any code

---

## Code Review Pipeline

`/mg-code-review` orchestrates a comprehensive technical quality review.

```
/mg-code-review [scope]
         │
         ▼
Read workstream context from memory
  .claude/memory/workstream-{id}-state.json
  .claude/memory/agent-dev-decisions.json
  .claude/memory/agent-qa-decisions.json
  .claude/memory/technical-standards.json
         │
         ▼
Spawn staff-engineer for architecture review (parallel)
  Checks: patterns, DRY, config-over-composition, standards
         │
Spawn security-engineer for security review (parallel)
  Checks: OWASP Top 10, input validation, auth/authz, secrets
         │
         ▼
Collect specialist results
         │
         ▼
Review test quality (not just coverage numbers)
  Do tests verify behavior, not implementation?
  Are edge cases covered?
  Are mocks appropriate and tests isolated?
         │
         ▼
Review performance implications
  N+1 query patterns?
  Appropriate data structures?
  Memory leak risks?
         │
         ▼
Review error handling
  All error cases handled?
  Proper error propagation?
  No silent failures?
         │
         ▼
Write results to memory
  .claude/memory/mg-code-review-results.json
  {
    status: "approved" | "request_changes",
    findings: [{ category, severity, file, line, issue, recommendation }],
    approval_gates: { coding_standards, test_coverage, performance, error_handling, security }
  }
         │
         ├── approved? → ready for leadership review
         │
         └── request_changes? → specific feedback sent; return to Dev via mg-build
```

**Approval gate statuses:** `pass` or `fail`
**Finding severity levels:** `critical` (block immediately), `major` (address before merge), `minor` (suggestion)

---

## Leadership Review Process

`/mg-leadership-team` operates in two modes: **Planning** and **Code Review**.

### Planning Mode

Invoked when starting a new initiative.

```
/mg-leadership-team [describe initiative]
         │
         ▼
Read existing context from memory
         │
         ▼
Spawn CEO, CTO, Engineering Director in parallel
         │
CEO assesses:
  - Business value and ROI
  - Strategic alignment
  - Market timing

CTO assesses:
  - Technical approach and feasibility
  - Risks and mitigations
  - Standards compliance

Engineering Director assesses:
  - Resource requirements
  - Timeline and dependencies
  - Operational readiness

(Optional) CEO may request Art Director for visual/design-heavy workstreams
         │
         ▼
Synthesize assessments
         │
         ├── Not aligned? → NEEDS CLARIFICATION (with specific questions)
         │
         └── Aligned? → APPROVED FOR DEVELOPMENT
         │
         ▼
Generate workstream breakdown
  WS-1: {name} — {acceptance criteria}
  WS-2: {name} — {acceptance criteria}
  ...
         │
         ▼
Write to memory
  agent-leadership-decisions.json
  { phase: "planning", decision: "approved", workstream_ids: [...] }
         │
         ▼
Invoke /mg-spec for PRD (if needed)
Invoke /mg-assess-tech for Technical Design (if needed)
```

### Code Review Mode

Invoked after a workstream is ready for final approval.

```
/mg-leadership-team review WS-{id} on branch feature/ws-{id}-{name}
         │
         ▼
Read workstream state and all agent decisions from memory
         │
         ▼
Spawn CEO, CTO, Engineering Director in parallel
         │
CEO reviews:
  - Business requirements met?
  - Aligns with product strategy?

CTO reviews:
  - Architecture sound?
  - Security practices correct?
  - Performance acceptable?
  - Technical standards met?

Engineering Director reviews:
  - Tests comprehensive?
  - Coverage adequate (99%+)?
  - Operational readiness?

(Optional) Art Director reviews if workstream has visual changes
         │
         ▼
All three must agree on outcome
         │
         ├── Any FAIL? → REQUEST CHANGES (with specific feedback per reviewer)
         │             → Back to Dev via mg-build
         │
         └── All PASS? → APPROVED
         │
         ▼
Write decision to memory
  agent-leadership-decisions.json
  { phase: "code_review_complete", decision: "approved" | "changes_requested" }
         │
         ▼
Approved → recommend /deployment-engineer merge feature/ws-{id}-{name}
```

---

## Build Workflow

`/mg-build` is the main orchestrator. It classifies at intake and dispatches to the correct track.

```
/mg-build execute WS-{id}: {description}
         │
         ▼
Step 0: Classify
  Read workstream description
  Apply R1-R8 (ARCHITECTURAL) and M1-M5 (MECHANICAL) rules
  Record classification in workstream state
         │
         ├── MECHANICAL → single spawn track (see MECHANICAL section)
         │
         └── ARCHITECTURAL → multi-spawn track
         │
         ▼ (ARCHITECTURAL)
Step 1: /mg-leadership-team planning
         │
         ▼
Step 2: QA test specification (can overlap with Step 3)
         │
         ▼
Step 3: Dev implementation (reads QA handoff to start in parallel)
         │
         ▼
Step 3.5: Dual-specialist review (if code blocks in deliverable)
         │
         ▼
Step 4: Staff engineer review
         │
         ▼
Step 5: /mg-leadership-team code review
         │
         ├── REQUEST CHANGES → back to Dev
         │
         └── APPROVED → Step 6
         │
         ▼
Step 6: /deployment-engineer merge
```

### Spawn Budget

| Track | Max Spawns | Who |
|-------|-----------|-----|
| MECHANICAL | 1 | Dev |
| ARCHITECTURAL | 5-6 | Leadership (×2), QA, Dev, dual specialists (conditional), Staff Engineer, Deployment Engineer |

### Artifact Bundle Construction

The orchestrator pre-computes context bundles for task agents to reduce token overhead:

```
Orchestrator reads full context (~75K tokens):
  - All memory files
  - Full protocol documents
  - Technical standards
         │
         ▼
Extract relevant subset for QA (~8K tokens):
  INPUTS:   3-5 acceptance criteria scenarios
  GATE:     success criteria
  CONSTRAINTS: 2-3 security standards, 1-2 test patterns
         │
         ▼
Extract relevant subset for Dev (~12K tokens):
  INPUTS:   relevant test specs (5-10 tests), acceptance criteria
  GATE:     99% coverage, all tests green
  CONSTRAINTS: 3-5 standards (DRY, config-over-composition, security)
```

This reduces context from ~75K to ~12K tokens per task agent (79% reduction) and improves signal-to-noise ratio by approximately 16x.

### Document Compression

Large planning documents are compressed before forwarding to task agents:

| Source Document | Extract For Dev/QA | Do Not Extract |
|----------------|-------------------|----------------|
| PRD | Acceptance criteria (verbatim), constraints, key decisions | Discussion history, stakeholder notes |
| Technical Design | Selected approach, risk mitigations | Alternatives analysis |
| Brand Kit | Color tokens, font stack | Visual guidelines (design agent only) |

Compression uses template-based extraction (not LLM summarization), so acceptance criteria are never paraphrased.

---

## Installation Flow

### Global Installer (`web-install.sh`)

```
curl -fsSL https://.../web-install.sh | bash
         │
         ▼
Detect OS and architecture
         │
         ▼
Download latest release tarball from GitHub
  https://github.com/.../releases/latest/download/miniature-guacamole.tar.gz
         │
         ▼
Extract to ~/.miniature-guacamole/
  .claude/
    agents/       (all community agents)
    skills/       (all community skills)
    shared/       (6 protocol documents)
    scripts/      (mg-* CLI utilities)
    hooks/        (lifecycle hooks)
    settings.json
    CLAUDE.md
    team-config.*
  install.sh
  web-install.sh
  mg-init
  mg-migrate
  VERSION.json
         │
         ▼
Symlink mg-* scripts to ~/.local/bin/
         │
         ▼
Add ~/.local/bin to PATH if not present
         │
         ▼
Print success: "Run mg-init in any project to get started"
```

### Per-Project Init (`mg-init`)

```
mg-init [--force] [--no-db] [project-dir]
         │
         ▼
Verify ~/.miniature-guacamole/install.sh exists
  No? → error: run global installer first
         │
         ▼
Read version from ~/.miniature-guacamole/VERSION.json
         │
         ▼
Run install.sh from global bundle against target project
  (see install.sh flow below)
         │
         ▼
Docker available AND --no-db not set?
  YES →
    mg-postgres start     (provision Postgres container)
    mg-migrate            (sync existing JSON files to Postgres)
  NO →
    Skip — project runs in file-only mode
         │
         ▼
Print summary:
  "miniature-guacamole {version} initialized"
  "Project: {dir}"
  "DB: {status}"
```

### Project Installer (`install.sh`)

```
install.sh [--force] [--standalone] [--config-cache] [project-dir]
         │
         ▼
Detect global install at ~/.claude/
  agents/ + skills/ + shared/ all present? → GLOBAL_INSTALL=true
         │
         ▼
Check if already installed
  MG_INSTALL.json exists AND --force not set?
  YES → exit with "already installed" message
         │
         ▼
Clean existing framework directories (preserve user-created content)
  If GLOBAL_INSTALL=true and --standalone not set:
    Clean only: scripts/ hooks/ schemas/
  Else:
    Clean: agents/ skills/ shared/ scripts/ hooks/ schemas/
         │
         ▼
Create directory structure
  .claude/{agents,skills,shared,hooks,memory,scripts,schemas}/
         │
         ▼
Copy framework components
  GLOBAL_INSTALL=true AND --standalone not set?
    Skip agents, skills, shared (available globally)
    Copy: scripts, hooks, team-config.*, keys/
  Else:
    Copy all: agents, skills, shared, scripts, hooks, team-config.*, keys/
         │
         ▼
Configure settings.json
  File exists? → merge (add source allows; preserve user allows/denies)
  No file? → copy from source template
         │
         ▼
Configure CLAUDE.md
  File with MG markers exists? → replace between markers
  File without markers exists? → prepend framework docs + "Existing Project Context"
  No file? → copy source template
         │
         ▼
Create memory directory
  .claude/memory/
  .claude/memory/.gitignore (ignores all *.json)
         │
         ▼
Write MG_INSTALL.json
  { framework, version, installed_at, components: { agents, skills, scripts, shared, hooks } }
         │
         ▼
Write MG_PROJECT marker
         │
         ▼
Print installation summary
```

---

## Handoff Protocol Flow

The handoff protocol governs how agents pass context to each other during delegation.

### Delegation (Ownership Transfer)

```
Agent A wants to delegate to Agent B
         │
         ▼
Check: is current depth < 3?
  >= 3 → cannot delegate; complete locally or return partial
         │
         ▼
Check: is Agent B already in chain.path?
  YES → loop detected; reject; find alternative or complete locally
         │
         ▼
Build delegation envelope
  id: uuid
  type: "delegation"
  chain:
    depth: current + 1
    max_depth: 3
    path: [...existing path, Agent A]
    origin: original requesting agent
  task:
    objective: single clear goal
    success_criteria: [...]
    constraints: [...]
    deliverable: expected output format
  context:
    essential: [<= 500 tokens of must-have context]
    references: [<= 5 file pointers]
    excluded: [explicitly noted omissions]
  return:
    format: structured | freeform
         │
         ▼
Spawn Agent B via Task tool with envelope
         │
         ▼
Agent B receives, validates envelope, executes
         │
         ▼
Agent B returns response envelope
  request_id: original uuid
  status: completed | partial | failed | escalated
  result:
    summary: one-paragraph executive summary
    deliverable: actual output
    confidence: high | medium | low
    caveats: [...]
```

### Consultation (Information Request, No Ownership Transfer)

```
Agent A wants to consult Agent B (peer query)
         │
         ▼
Build consultation envelope (simplified)
  id: uuid
  type: "consultation"
  from: Agent A
  query:
    question: specific question
    context: [minimal relevant facts]
    response_format: brief | detailed
         │
         ▼
Depth counter is NOT incremented
Chain path is NOT modified
         │
         ▼
Spawn Agent B via Task tool with consultation envelope
         │
         ▼
Agent B returns information only
  Agent B CANNOT re-delegate or consult further (fire-and-forget)
         │
         ▼
Agent A retains task ownership; uses B's information
```

### Error Cases

| Error | Trigger | Agent Action |
|-------|---------|-------------|
| `DEPTH_LIMIT_REACHED` | depth >= 3 | Complete locally or return partial |
| `LOOP_DETECTED` | target in chain.path | Select different delegate or complete locally |
| `INVALID_ENVELOPE` | malformed structure | Reject; report validation errors |
| `DELEGATE_UNAVAILABLE` | target not responding | Retry; then escalate or complete locally |
| `CONTEXT_OVERFLOW` | payload > 1000 tokens | Reduce context; retry |
| `CONSULTATION_VIOLATION` | consultant attempted delegation | Reject; log violation |

---

## Supervisor Monitoring Flow

The Supervisor agent runs on the `haiku` model and monitors the system for operational issues. It has read access to all memory files but cannot spawn agents or make decisions.

```
Supervisor is spawned (by orchestrator or manually)
         │
         ▼
Read all memory files
  .claude/memory/*.json
         │
         ▼
Check delegation depth
  Any chain.depth > 3?
  YES → write alert: { alert_type: "depth_exceeded", details: {...} }
         │
         ▼
Check for loops
  Same task appearing 3+ times in memory?
  YES → write alert: { alert_type: "loop_detected" }
         │
         ▼
Check for agent failures
  Any agent returning status: "failure"?
  YES → write alert: { alert_type: "agent_failed", recommended_action: "..." }
         │
         ▼
Check for timeouts
  Any task exceeding its time limit?
  YES → write alert: { alert_type: "timeout", escalate_to: "engineering-manager" }
         │
         ▼
Write all alerts to supervisor-alerts.json
         │
         ▼
Report summary to orchestrator
```

The Supervisor observes and alerts — it does not intervene, fix, or make decisions. Human operators or the engineering-director agent act on alerts.

---

## CI/CD and Build Flow

### Build Pipeline (`build.sh`)

```
./build.sh
         │
         ▼
Pre-flight: verify src/framework/ and src/installer/ exist
         │
         ▼
Clean dist/ directory
  rm -rf dist/miniature-guacamole/
  mkdir -p dist/miniature-guacamole/.claude/{agents,skills,shared,hooks,scripts,memory}
         │
         ▼
Copy agents
         │
         ▼
Copy skills (skip _shared/ — internal)
         │
         ▼
Copy shared protocols (all 6 .md files)
         │
         ▼
Copy scripts (mg-* plus mg router)
         │
         ▼
Copy hooks (mark all .sh executable)
         │
         ▼
Copy config files (settings.json, CLAUDE.md, team-config.*)
         │
         ▼
Copy signing public key (if keys/ directory exists)
         │
         ▼
Write memory/.gitignore (ignore *.json, keep .gitignore)
         │
         ▼
Copy installer scripts (install.sh, uninstall.sh, web-install.sh, mg-migrate, mg-init)
         │
         ▼
Copy templates/ (used by mg-init for project scaffolding)
         │
         ▼
Generate VERSION.json
  version: from git tag (if on a tag) else from package.json
  git_sha: short sha
  build_date: UTC timestamp
         │
         ▼
Create archives
  dist/miniature-guacamole.tar.gz
  dist/miniature-guacamole.zip
         │
         ▼
Print build summary
```

### Release Pipeline (GitHub Actions)

```
Developer pushes a version tag: git push origin v1.0.1
         │
         ▼
.github/workflows/release.yml triggers on tag v*.*.*
         │
         ▼
Checkout code at tag
npm ci
tsc --noEmit                # TypeScript check
npm test                    # Full test suite
./build.sh                  # Build distribution
         │
         ▼
Create GitHub release for tag v1.0.1
Attach dist/miniature-guacamole.tar.gz
Attach dist/miniature-guacamole.zip
         │
         ▼
Release is live at:
  https://github.com/wonton-web-works/miniature-guacamole/releases/tag/v1.0.1
```

---

## Hook Execution Flows

### TaskCompleted Hook

Triggered when an agent marks a task complete. Exit code `2` blocks completion.

```
Agent signals task completion
         │
         ▼
Claude Code runs .claude/hooks/task-completed.sh
  INPUT (stdin): { task_subject: "..." }
         │
         ▼
Gate 1: Are there changed TypeScript/JavaScript files staged?
  YES AND vitest.config.ts exists →
    Run: npx vitest run --reporter=verbose --changed
    Tests fail? → block completion (exit 2)
    Tests pass? → proceed
  NO → skip
         │
         ▼
Gate 2: Are there untracked source files (*.ts, *.tsx, *.js, *.jsx)?
  YES → block completion (exit 2), list untracked files
  NO → proceed
         │
         ▼
All gates passed → allow completion (exit 0)
```

### TeammateIdle Hook

Triggered when an agent goes idle. Exit code `2` blocks idle.

```
Agent signals going idle
         │
         ▼
Claude Code runs .claude/hooks/teammate-idle.sh
  INPUT (stdin): { teammate_name: "..." }
         │
         ▼
Gate 1: Does tsconfig.json exist?
  YES →
    Run: npx tsc --noEmit
    Errors? → block idle (exit 2), show first 20 lines of errors
    Clean? → proceed
  NO → skip
         │
         ▼
Gate 2: Are there untracked test files (*.test.ts, *.spec.ts, etc.)?
  YES → block idle (exit 2), list untracked test files
  NO → proceed
         │
         ▼
All gates passed → allow idle (exit 0)
```

### Safety Check Hook

Blocks dangerous commands before bash execution.

```
Claude Code is about to execute a bash command
         │
         ▼
.claude/hooks/safety-check.sh COMMAND
         │
         ▼
Check command against dangerous pattern list:
  rm -rf /, rm -rf ~, rm -rf $HOME, rm -rf ~/.ssh, rm -rf ~/.aws, rm -rf ~/.claude
  chmod -R 777 /, dd if=, mkfs, > /dev/
  fork bombs :(){ :|:& };:
  git clean -fdx /
         │
         ├── Matches? → block (exit 1) with error message
         │
         ▼
Check rm -rf with absolute/home paths not on project allowlist
  rm -rf ./dist, rm -rf node_modules, rm -rf build, etc. → allowed
  rm -rf /anything-else, rm -rf ~anything → blocked
         │
         ├── Blocked? → exit 1
         │
         └── All checks passed → allow (exit 0)
```

---

## Related Documentation

- [Architecture](/architecture) — component structure and system design
- [Workflows](/workflows) — user-facing workflow guide with examples
- [Agent Reference](/agents) — full agent role catalog
- [Glossary](/glossary) — definitions for framework-specific terms
