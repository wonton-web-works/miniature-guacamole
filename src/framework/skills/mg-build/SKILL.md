---
# Skill: mg-build
# Orchestrates the CAD development cycle from tests to production-ready code

name: mg-build
description: "Build it. Execute full CAD cycle: spawn qa for tests, dev for implementation, staff-engineer for review. Invoke with workstream ID."
model: sonnet
tools: [Read, Glob, Grep, Edit, Write, Task, Bash]
spawn_cap: 6
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
Step 1: QA writes tests (failing)     → tests_written gate
Step 2: Dev implements (passing)      → tests_pass + coverage >= 99%
Step 3: QA verifies                   → qa_approved gate
Step 4: Staff Engineer reviews        → code_approved gate
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
Task:
  subagent_type: staff-engineer
  prompt: |
    Review workstream {id} code.
    Check: standards compliance, architecture, security, performance.
```

## Output Format

**Output mode: compact (default)**
Use compact mode for normal runs — ≤10 lines per build cycle.
To request full output: include "verbose" in your invocation.

**Compact mode output** (default, ≤10 lines per build cycle):

```
progress: Step 1/4 active
>> qa: Write test specs for WS-{id}
✓ qa: tests written (31s)
progress: Step 2/4 active
>> dev: Implement WS-{id}
✓ dev: implementation complete (120s)
progress: Step 3/4 active
>> qa: Verify WS-{id}
✓ qa: all tests pass (45s)
gate:tests_pass PASS tests:[47/47] coverage:[99%]
```

**Full mode** (pass `output_mode: full` or "verbose"): shows CAD pipeline diagram and status box:

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  TEST   │───▶│  IMPL   │───▶│ VERIFY  │───▶│ REVIEW  │
│   {s1}  │    │   {s2}  │    │   {s3}  │    │   {s4}  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘

Legend: ✓ = done, ● = active, ○ = pending, × = failed
```

Full mode status box:

```
┌─────────────────────────────────────────┐
│ WS-{id}: {name}                         │
├─────────────────────────────────────────┤
│ Phase:    {phase}                       │
│ Tests:    {passing}/{total}             │
│ Coverage: {percent}%                    │
│ Gate:     {gate_status}                 │
│ Blocker:  {blocker or "none"}           │
└─────────────────────────────────────────┘
```

**Followed by detailed progress** (both modes):

```
## Workstream {id}: {name}

### Progress
- [x] Step 1: Tests written (qa)
- [x] Step 2: Implementation (dev)
- [ ] Step 3: Verification (qa)
- [ ] Step 4: Code review (staff-engineer)

### Next Action
{What happens next or who to invoke}
```

## Boundaries

**CAN:** Execute full CAD cycle, spawn qa/dev/staff-engineer, track gates, coordinate handoffs, report progress
**CANNOT:** Write code without tests, skip tests, merge to main, approve without leadership, skip code review
**ESCALATES TO:** engineering-manager (blockers), mg-leadership-team (final approval)
