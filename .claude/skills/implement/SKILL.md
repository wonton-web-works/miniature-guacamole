---
# Skill: Implement
# Executes the TDD cycle from tests to production-ready code

name: implement
description: "Build it. Execute TDD cycle: spawn qa for tests, dev for code, staff-engineer for review. Invoke with workstream ID."
model: sonnet
tools: [Read, Glob, Grep, Edit, Write, Task, Bash]
---

# Implement

Execute the TDD cycle to build features. This is the "build it" skill.

## Constitution

1. **Tests before code** - Always spawn qa first, never start without failing tests
2. **99% coverage requirement** - No exceptions, measure and verify
3. **Clear progress reporting** - Update memory at each gate transition
4. **Escalate blockers fast** - Don't hide problems, surface early
5. **Hand off when done** - Complete cycle ends at staff-engineer review

## The TDD Cycle

```
Step 1: QA writes tests        → tests_written (failing)
        ↓
Step 2: Dev implements          → tests_pass + coverage >= 99%
        ↓
Step 3: QA verifies            → all_tests_pass
        ↓
Step 4: Staff Engineer reviews → code_approved
        ↓
Ready for deployment
```

## Memory Protocol

```yaml
# Read workstream context
read:
  - .claude/memory/workstream-{id}-state.json
  - .claude/memory/agent-leadership-decisions.json  # Acceptance criteria

# Write phase transitions
write: .claude/memory/workstream-{id}-state.json
  agent_id: implement
  phase: write_tests | implement_code | verify_tests | code_review
  delegated_to: qa | dev | staff-engineer
  gate_status: pending | passed | failed
  blocker: {description if failed}
```

## Spawn Pattern

```yaml
# Step 1: Write tests (always first)
Task:
  subagent_type: qa
  prompt: |
    Write failing tests for workstream {id}.
    Acceptance criteria: {criteria}
    Target: 99% coverage paths identified.

# Step 2: Implement code
Task:
  subagent_type: dev
  prompt: |
    Implement workstream {id} to pass tests.
    Test files: {test_files}
    Run Red → Green → Refactor cycle.

# Step 3: Verify implementation
Task:
  subagent_type: qa
  prompt: |
    Verify workstream {id} complete.
    Check: all tests pass, coverage >= 99%, no regressions.

# Step 4: Code review
Task:
  subagent_type: staff-engineer
  prompt: |
    Review workstream {id} implementation.
    Check: standards, security, architecture, performance.
```

## Output Format

```
## Workstream {id}: {name}

### TDD Cycle Progress
- [x] Step 1: Tests written (qa)
- [x] Step 2: Code implemented (dev)
- [ ] Step 3: Verification (qa)
- [ ] Step 4: Code review (staff-engineer)

### Current Status
Phase: {phase}
Gate: {gate_status}
Tests: {passing}/{total}
Coverage: {percent}%

### Blocker
{Description if gate failed, or "None"}

### Next Action
{Spawn next agent or escalate}
```

## Boundaries

**CAN:** Execute TDD cycle, spawn qa/dev/staff-engineer, track gates, report progress
**CANNOT:** Skip tests, write code without tests, approve without review, merge to main
**ESCALATES TO:** engineering-manager (blockers), engineering-director (architecture conflicts)
