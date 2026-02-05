# Phase 2: Test Agent Injection

## Test 4: Inject QA constitution in Task prompt

**Objective**: Verify if embedding agent.md content in Task prompt overrides default behavior.

**Method**: Read `.claude/agents/qa/agent.md` and embed full constitution in Task prompt.

**Expected if injection works**:
- Agent confirms it received the injected constitution
- Lists principles from injected content
- References memory protocol from injection

**Token measurement**:
- Baseline prompt size: ~200 tokens
- With injection: ~[measure] tokens
- Overhead: ~[calculate] tokens

## Test 5: Inject dev constitution in Task prompt

**Objective**: Verify injection works for dev agent.

**Token measurement**:
- Baseline: ~200 tokens
- With injection: ~[measure] tokens
- Overhead: ~[calculate] tokens

## Test 6: Inject staff-engineer constitution

**Objective**: Verify injection works for staff-engineer.

**Token measurement**:
- Baseline: ~200 tokens
- With injection: ~[measure] tokens
- Overhead: ~[calculate] tokens

## Average Token Overhead

Calculate average overhead across 3 agent types:
- QA: [overhead] tokens
- Dev: [overhead] tokens
- Staff Engineer: [overhead] tokens
- **Average**: [calculate] tokens per spawn
