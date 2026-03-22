---
name: mg-debug
description: "Debug it. Execute structured debugging: reproduce the issue, investigate root cause, verify fix. Invoke with bug description."
model: sonnet
allowed-tools: Read, Glob, Grep, Edit, Write, Task, Bash
compatibility: "Requires Claude Code with Task tool (agent spawning)"
metadata:
  version: "1.0"
  spawn_cap: "6"
---

> Inherits: [skill-base](../_base/skill-base.md)

# mg-debug

Coordinates qa, dev, and optionally security-engineer through structured debugging workflow to investigate, reproduce, and resolve bugs.

## Constitution

1. **Reproduce first** - QA reproduces the bug with minimal test case before investigation
2. **Root cause analysis** - Dev investigates logs, stack traces, and state to find root cause
3. **Test-driven fix** - Write failing test for bug, implement fix, verify test passes
4. **No regressions** - Verify fix doesn't break existing functionality
5. **Security lens** - Escalate to security-engineer if bug has security implications

## The Debug Cycle

```
Step 1: QA reproduces bug           → reproduction_confirmed gate
Step 2: Dev investigates root cause → root_cause_identified gate
Step 3: Dev writes test + fix       → bug_fixed + tests pass
Step 4: QA verifies resolution      → verification_complete gate
        ↓
Ready for code review
        ↓
/mg-code-review before merge
```

## Memory Protocol

```yaml
read:
  - .claude/memory/bug-{id}-context.json
  - .claude/memory/agent-leadership-decisions.json

write: .claude/memory/bug-{id}-status.json
  agent_id: mg-debug
  phase: reproduction | investigation | fixing | verification
  delegated_to: qa | dev | security-engineer
  root_cause: {description when identified}
  fix_status: pending | applied | verified
  blocker: {description if stuck}
```

## Spawn Pattern

**Spawn cap: 6 agents maximum per invocation**

```yaml
# Step 1: Reproduce the bug
Task:
  subagent_type: qa
  prompt: |
    Reproduce bug: {description}
    Create minimal reproducible test case.
    Document: steps to reproduce, expected vs actual behavior.

# Step 2: Investigate root cause
Task:
  subagent_type: dev
  prompt: |
    Investigate bug: {description}
    Reproduction steps: {steps}
    Analyze: logs, stack traces, state, data flow.
    Identify root cause and propose fix.

# Step 3: Implement fix (if not combined with step 2)
Task:
  subagent_type: dev
  prompt: |
    Fix bug: {description}
    Root cause: {root_cause}
    Write failing test, implement fix, verify test passes.
    Ensure no regressions.

# Step 4: Verify resolution
Task:
  subagent_type: qa
  prompt: |
    Verify bug fix: {description}
    Test: bug reproduction no longer occurs.
    Test: no regressions in related functionality.
    Coverage check: fix is covered by tests.

# Optional: Security review (if needed)
Task:
  subagent_type: security-engineer
  prompt: |
    Review security implications of bug: {description}
    Root cause: {root_cause}
    Fix approach: {fix_description}
    Assess: was this exploitable? Are there related vulnerabilities?
```

## Output Format

```
[DEV]   Reproducing — {confirmed | cannot reproduce}
[DEV]   Root cause — {description}
[DEV]   Fix — failing test written, implementation applied
[DEV]   Verification — {PASS | FAIL}                {elapsed}
[EM]    Done — ready for code review                {elapsed}
```

On blocker: `[EM]  BLOCKED — {reason}`

## Boundaries

**CAN:** Reproduce bugs, investigate root causes, implement fixes, verify resolution, spawn qa/dev/security-engineer, track diagnostic progress
**CANNOT:** Skip reproduction step, merge without verification, skip security review for security-sensitive bugs
**ESCALATES TO:** engineering-manager (persistent blockers), security-engineer (potential vulnerabilities)
