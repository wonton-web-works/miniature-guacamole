---
name: mg-build
description: "Build it. Execute full CAD cycle: spawn qa for tests, dev for implementation, staff-engineer for review. Invoke with workstream ID."
model: sonnet
allowed-tools: Read, Glob, Grep, Edit, Write, Task, Bash
compatibility: "Requires Claude Code with Task tool (agent spawning)"
metadata:
  version: "1.0"
  spawn_cap: "6"
---

# mg-build

Coordinates qa, dev, and staff-engineer through the complete CAD development cycle. This is the primary "build it" skill.

## Constitution

1. **Tests before code** - QA writes tests before code, never start without failing tests
2. **99% coverage** - Unit + integration combined, no exceptions
3. **Memory-first** - Read workstream context, write phase transitions
4. **Four-step cycle** - Test → Implement → Verify → Review (never skip)
5. **Escalate blockers** - Surface issues early to engineering-manager
6. **Visual standards** - Follow `_shared/output-format.md` for progress reporting

## The CAD Cycle

```
Step 1: QA writes tests (failing)        → tests_written gate
Step 2: Dev implements (passing)         → tests_pass + coverage >= 99%
Step 3: QA verifies                      → qa_approved gate
Step 3.5: Dual-specialist review (if code blocks in deliverable) → specialists_approved gate
Step 4: Classification → MECHANICAL (Gate 4A) or ARCHITECTURAL (Gate 4B)
         ↓
Ready for mg-leadership-team approval
         ↓
/deployment-engineer to merge
```

## Memory Protocol

```yaml
# Read workstream context
read:
  - .claude/memory/workstream-{id}-state.json
  - .claude/memory/agent-leadership-decisions.json  # Requirements & acceptance criteria

# Write phase transitions
write: .claude/memory/workstream-{id}-state.json
  agent_id: mg-build
  phase: step_1_test_spec | step_2_implementation | step_3_verification | step_4_review
  delegated_to: qa | dev | staff-engineer
  gate_status: pending | passed | failed
  blocker: {description if failed}
```

## Spawn Pattern

**Spawn cap: 6 agents maximum per invocation**

```yaml
# Step 1: Test specification (always first)
Task:
  subagent_type: qa
  prompt: |
    Write misuse-first test specs for workstream {id}.
    Acceptance criteria: {criteria}
    Target: 99% coverage paths identified, failing tests.

# Step 2: Implementation
Task:
  subagent_type: dev
  prompt: |
    Implement workstream {id} to pass tests.
    Test files: {test_files}
    Principles: Test-first, DRY, config-over-composition.
    Run Red → Green → Refactor cycle.

# Step 3: Verification
Task:
  subagent_type: qa
  prompt: |
    Verify workstream {id} implementation complete.
    Check: all tests pass, coverage >= 99%, no regressions.

# Step 4: Code review

## Step 3.5: Dual-Specialist Review (conditional)

After dev completes implementation, inspect each deliverable file before proceeding to the classification step.

**Trigger:** If the deliverable contains fenced code blocks (``` or ~~~), run dual-specialist review. If no code blocks are present, skip Step 3.5 entirely.

Spawn two specialist agents in parallel (at most one additional spawn beyond the normal budget):

1. **Domain specialist** — reviews code blocks for platform correctness. The domain specialist is determined at runtime by the platform context of the workstream (e.g., the relevant backend, infra, or data platform). Do not pre-assign a fixed domain specialist.
2. **Language specialist** — reviews code blocks for code quality regardless of language. The language specialist evaluates correctness, clarity, and idiomatic style for whichever language appears in the code blocks.

**Gate:** Both specialists must pass before the code is included in the deliverable. Partial approval — where one specialist approves but the other has not — is not sufficient to proceed.

**Review output format:** Each specialist returns findings severity-ranked as:
- `blocking` — must be fixed before the deliverable is accepted (correctness errors, security issues, broken logic)
- `warning` — advisory; should be addressed but does not block acceptance

## Step 4: Classification → Gate 4A (Mechanical) or Gate 4B (Architectural)

After dual-specialist review passes (or is skipped), classify the workstream and route to the appropriate gate. See `development-workflow.md` for classification rules (R1-R8, M1-M5).

```yaml
Task:
  subagent_type: staff-engineer
  prompt: |
    Review workstream {id} code.
    Check: standards compliance, architecture, security, performance.
```

## Output Format

- **Compact** (default): ≤10 lines per build cycle — progress lines and gate status only
- **Full** (pass "verbose"): CAD pipeline diagram TEST → IMPL → VERIFY → REVIEW, status box, and detailed progress

See `references/output-examples.md` for full template examples.

## Boundaries

**CAN:** Execute full CAD cycle, spawn qa/dev/staff-engineer, track gates, coordinate handoffs, report progress
**CANNOT:** Write code without tests, skip tests, merge to main, approve without leadership, skip code review
**ESCALATES TO:** engineering-manager (blockers), mg-leadership-team (final approval)
