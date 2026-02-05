# Agent Loading Test Executor

This document contains executable test scenarios for WS-AGENT-SPIKE.

**IMPORTANT**: These tests must be run by a coordination skill (like `engineering-team` or `implement`) that has access to the Task tool. The dev agent cannot spawn subagents directly.

## Phase 1: Document Built-in Behavior

### Test 1: QA Agent Constitution Check

**Purpose**: Determine if Task tool loads custom `.claude/agents/qa/agent.md` or uses built-in definition.

**Execution**: Coordination skill should invoke:

```
Task tool with:
  subagent_type: qa
  prompt: |
    You are participating in WS-AGENT-SPIKE to test agent loading behavior.

    Please respond with exactly this information:

    1. YOUR CONSTITUTION - List your top 5 principles/rules from your constitution
    2. MEMORY PROTOCOL - List what memory files you are instructed to read
    3. VISUAL STANDARDS - Do you see any mention of "Visual standards" or "ASCII progress patterns" in your constitution? (YES/NO)
    4. BOUNDARIES - What is your escalation path when blocked?

    Be specific and quote from your actual constitution where possible.
```

**Analysis Criteria**:
- If using custom agent.md: Will mention "Visual standards", "tasks-qa.json", "99% coverage", "BDD scenarios Given/When/Then"
- If using built-in: Generic QA behavior, no memory protocol, no visual standards

### Test 2: Dev Agent Constitution Check

**Execution**:

```
Task tool with:
  subagent_type: dev
  prompt: |
    You are participating in WS-AGENT-SPIKE to test agent loading behavior.

    Please respond with:

    1. YOUR CONSTITUTION - List your top 5 principles from your constitution
    2. TDD CYCLE - Describe the specific TDD cycle steps you follow
    3. MEMORY PROTOCOL - What memory files do you read before coding?
    4. PEER CONSULTATION - What agents can you consult (fire-and-forget)?
    5. CONFIG PREFERENCE - Do you have any principle about "config over composition"?

    Quote from your constitution where possible.
```

**Analysis Criteria**:
- If using custom: Will mention "Red/Green/Refactor", "tasks-dev.json", "Config over composition", "can consult qa/design"
- If using built-in: Generic dev behavior, standard TDD without specific cycle definition

### Test 3: Staff Engineer Constitution Check

**Execution**:

```
Task tool with:
  subagent_type: staff-engineer
  prompt: |
    You are participating in WS-AGENT-SPIKE to test agent loading behavior.

    Please respond with:

    1. YOUR CONSTITUTION - List your top 4 principles from your constitution
    2. REVIEW CHECKLIST - What items are on your code review checklist?
    3. ESCALATION - Who do you escalate to when blocked?
    4. STANDARDS - Do you see "Standards guardian" in your constitution?
    5. TEACHING - Is there any principle about teaching developers?

    Quote specific text from your constitution.
```

**Analysis Criteria**:
- If using custom: Will mention "Standards guardian", specific review checklist, "escalates to CTO", "Teach, don't just review"
- If using built-in: Generic staff engineer behavior, standard reviews

## Phase 2: Test Agent Injection

### Test 4: Inject QA Constitution

**Purpose**: Test if embedding full agent.md content in Task prompt overrides default behavior.

**Preparation**: Read `.claude/agents/qa/agent.md` file content

**Execution**:

```
Task tool with:
  subagent_type: qa
  prompt: |
    ===== INJECTED AGENT CONSTITUTION =====

    [FULL CONTENT OF .claude/agents/qa/agent.md INCLUDING FRONTMATTER]

    ===== END CONSTITUTION =====

    You are participating in WS-AGENT-SPIKE Phase 2.

    Confirm you received the injected constitution by:
    1. Listing your first 3 constitutional principles
    2. Confirming you see "Visual standards" (YES/NO)
    3. Confirming you have a Memory Protocol section (YES/NO)
    4. What files should you read before testing?
```

**Token Measurement**:
- Baseline prompt (without injection): ~100 tokens
- QA agent.md content: ~248 words ≈ 330 tokens
- Injected prompt total: ~430 tokens
- **Overhead: ~330 tokens per spawn**

### Test 5: Inject Dev Constitution

**Execution**: Same pattern as Test 4, with dev agent.md content

**Token Measurement**:
- Dev agent.md content: ~228 words ≈ 304 tokens
- **Overhead: ~304 tokens per spawn**

### Test 6: Inject Staff Engineer Constitution

**Execution**: Same pattern, with staff-engineer agent.md content

**Token Measurement**:
- Staff engineer agent.md content: ~225 words ≈ 300 tokens
- **Overhead: ~300 tokens per spawn**

## Phase 3: Calculate Impact

### Token Overhead Summary

Average overhead per agent spawn: ~310 tokens

### Typical Workstream Breakdown

**Standard workstream uses**:
- QA spawns: 2 (initial test writing, verification)
- Dev spawns: 1 (implementation)
- Staff engineer spawns: 1 (code review)

**Total overhead per workstream**:
- (2 × 330) + (1 × 304) + (1 × 300) = 1,264 tokens

### Cost Analysis

**Claude Code pricing** (as of 2026-02):
- Input tokens: $3.00 per 1M tokens (Sonnet)
- Output tokens: $15.00 per 1M tokens

**Cost per workstream** (input overhead only):
- 1,264 tokens × $3.00 / 1M = $0.003792 ≈ **$0.004 per workstream**

**For 100 workstreams**: ~$0.40 additional cost

### Value vs Cost Trade-off

**COST**:
- ~1,300 tokens per workstream
- $0.004 per workstream
- Negligible financial impact

**VALUE**:
- 18 custom agents with specialized constitutions become active
- Memory-first architecture actually enforced
- Visual standards consistency
- Proper escalation protocols
- Team-specific behavior (TDD cycles, review checklists, etc.)

**VERDICT**: Cost is trivial compared to value delivered.

## Results Template

After executing all tests, record results in:
`.claude/memory/spike-agent-loading-results.json`

Update with:
- Phase 1 test results (what agents actually said)
- Phase 1 conclusion (YES/NO: Task ignores custom agents)
- Phase 2 test results (injection confirmation)
- Phase 2 conclusion (YES/NO: Injection works)
- Phase 3 measurements (actual token counts)
- Final recommendation (GO/NO-GO on injection approach)
