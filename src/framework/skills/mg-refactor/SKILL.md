---
name: mg-refactor
description: "Refactor it. Execute safe refactoring: characterization tests, restructure code, verify no regressions. Invoke with refactor scope."
model: sonnet
allowed-tools: Read, Glob, Grep, Edit, Write, Task, Bash
compatibility: "Requires Claude Code with Task tool (agent spawning)"
metadata:
  version: "1.0"
  spawn_cap: "6"
---

> Inherits: [skill-base](../_base/skill-base.md)

# mg-refactor

Coordinates qa and dev through structured refactoring workflow with comprehensive test coverage to ensure no functional changes or regressions.

## Constitution

1. **Characterization tests first** - QA writes tests capturing current behavior before any refactor
2. **Green bar before refactor** - All tests must pass before making any structural changes
3. **Small steps** - Refactor in small, verified increments with continuous test validation
4. **No behavior changes** - Refactoring changes structure, never functionality
5. **99% coverage maintained** - Coverage must stay at or above 99% throughout refactor

## The Refactor Cycle

```
Step 1: QA writes characterization tests → tests_green gate (100% pass)
Step 2: Dev refactors incrementally      → refactor_complete + tests still green
Step 3: QA verifies no regressions       → verification_complete gate
Step 4: Code review                      → code_approved gate
        ↓
Ready for merge
        ↓
/mg-code-review before merge
```

## Memory Protocol

```yaml
read:
  - .claude/memory/refactor-{id}-scope.json
  - .claude/memory/agent-leadership-decisions.json

write: .claude/memory/refactor-{id}-status.json
  agent_id: mg-refactor
  phase: characterization | refactoring | verification | review
  delegated_to: qa | dev | staff-engineer
  tests_baseline: {count before refactor}
  tests_current: {count during/after refactor}
  coverage_baseline: {percent before refactor}
  coverage_current: {percent during/after refactor}
  blocker: {description if failed}
```

## Spawn Pattern

**Spawn cap: 6 agents maximum per invocation**

```yaml
# Step 1: Write characterization tests
Task:
  subagent_type: qa
  prompt: |
    Write characterization tests for: {refactor_scope}
    Goal: Capture current behavior comprehensively.
    Target: 99%+ coverage of code being refactored.
    All tests must pass (green bar) before refactor begins.

# Step 2: Execute refactor
Task:
  subagent_type: dev
  prompt: |
    Refactor: {refactor_scope}
    Characterization tests: {test_files}
    Requirements:
      - Work in small increments
      - Run tests after each change
      - Keep tests green continuously
      - No functional changes
      - Improve: structure, naming, extraction, simplification
    Goal: {refactor_goal}

# Step 3: Verify no regressions
Task:
  subagent_type: qa
  prompt: |
    Verify refactor: {refactor_scope}
    Check:
      - All characterization tests still pass
      - Coverage >= 99% maintained
      - No functional changes introduced
      - Performance not degraded
    Compare: before vs after behavior.

# Optional Step 4: Code review
Task:
  subagent_type: staff-engineer
  prompt: |
    Review refactor: {refactor_scope}
    Check:
      - Structure improvements achieved
      - Code standards maintained
      - No hidden behavior changes
      - Technical debt reduced
```

## Output Format

- **Pipeline diagram**: CHARACTERIZE → REFACTOR → VERIFY → REVIEW (always shown at start)
- **Status box**: phase, tests (with baseline), coverage (with baseline), green/red bar, blocker
- **Detailed progress**: scope, refactor goals, baseline metrics, current metrics, next action

See `references/output-examples.md` for full template examples.

## Boundaries

**CAN:** Write characterization tests, execute incremental refactoring, verify no regressions, spawn qa/dev/staff-engineer, track metrics
**CANNOT:** Change functionality, skip characterization tests, proceed if tests fail, reduce coverage below 99%
**ESCALATES TO:** engineering-manager (refactor blockers), staff-engineer (architectural guidance needed)
