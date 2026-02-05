# Phase 1: Document Built-in Behavior

## Test 1: Spawn QA agent with minimal prompt

**Objective**: Verify if QA agent uses custom `.claude/agents/qa/agent.md` or built-in definition.

**Method**: Spawn QA agent and ask it to describe its constitution.

**Expected if using custom agent.md**:
- Mentions "Visual standards" rule
- References memory files: `tasks-qa.json`, `bdd-scenarios.json`, etc.
- Lists 99% coverage requirement

**Expected if using built-in**:
- Generic QA principles
- No memory protocol
- No visual standards reference

## Test 2: Spawn dev agent with minimal prompt

**Objective**: Verify if dev agent uses custom `.claude/agents/dev/agent.md`.

**Expected if using custom agent.md**:
- Mentions TDD cycle with Red/Green/Refactor
- References memory files: `tasks-dev.json`, `test-specs.json`
- Mentions "Config over composition" principle

**Expected if using built-in**:
- Generic development principles
- No memory protocol
- No specific constitution rules

## Test 3: Spawn staff-engineer agent

**Objective**: Verify if staff-engineer uses custom definition.

**Expected if using custom agent.md**:
- Mentions "Standards guardian" principle
- References code review checklist
- Lists CTO as escalation path

**Expected if using built-in**:
- Generic senior engineer behavior
- No specific review checklist
- No escalation protocol
