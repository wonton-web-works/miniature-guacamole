# Agent Loading Test Skill - WS-AGENT-SPIKE

## Purpose

This skill exists to execute WS-AGENT-SPIKE: documenting Task tool behavior and prototyping agent constitution injection.

## Problem Statement

We have 18 custom agents defined in `.claude/agents/*/agent.md` with specialized constitutions, but preliminary evidence suggests the Task tool may be ignoring these custom definitions and using built-in Claude Code agent defaults instead.

**Impact**: Our entire agent system differentiation (memory-first architecture, visual standards, TDD cycles, escalation protocols) is nullified if Task doesn't load custom agents.

## Spike Objectives

1. **Confirm**: Does Task tool load `.claude/agents/*/agent.md` or use built-ins?
2. **Prototype**: Can we inject agent constitutions in Task prompts?
3. **Measure**: What's the token/cost overhead of injection?
4. **Decide**: GO/NO-GO on injection approach

## Files in This Skill

- `skill.md` - Skill definition with basic test patterns
- `test-executor.md` - Detailed test scenarios for all 3 phases
- `injection-pattern-example.md` - Before/after implementation examples
- `README.md` - This file
- `run-phase1.md` - Phase 1 test templates
- `run-phase2.md` - Phase 2 test templates

## Execution Instructions

### Prerequisites

These tests require a coordination skill with Task tool access (like `engineering-team` or `implement`). The dev agent cannot spawn subagents directly.

### Phase 1: Document Behavior (1 day)

**Executor**: Coordination skill

1. Follow test scenarios in `test-executor.md` Phase 1
2. Spawn qa, dev, staff-engineer agents with constitution-checking prompts
3. Record their actual responses
4. Analyze if they reference custom agent.md content or generic behavior
5. Update `.claude/memory/spike-agent-loading-results.json` with findings

**Expected outcome**: Clear YES/NO answer to "Does Task load custom agents?"

### Phase 2: Prototype Injection (1 day)

**Executor**: Coordination skill

1. Read `.claude/agents/qa/agent.md`, `dev/agent.md`, `staff-engineer/agent.md`
2. Follow test scenarios in `test-executor.md` Phase 2
3. Spawn agents with full constitution embedded in prompts
4. Verify agents confirm they received and follow injected constitution
5. Measure token overhead (baseline vs injected prompt sizes)
6. Update spike results with injection confirmation and token counts

**Expected outcome**: Proof that injection works + token overhead measurement

### Phase 3: Measure Impact (0.5 day)

**Executor**: Coordination skill or dev

1. Calculate average token overhead across 3 agent types
2. Estimate cost for typical workstream (2 qa + 1 dev + 1 staff spawns)
3. Analyze value (custom behavior) vs cost (token overhead)
4. Document pros/cons
5. Provide final GO/NO-GO recommendation

**Expected outcome**: Business case for/against injection approach

## Success Criteria

Spike is complete when `.claude/memory/spike-agent-loading-results.json` contains:

- `confirmation_task_ignores_custom`: YES or NO
- `prototype_injection_works`: YES or NO
- `average_token_overhead`: number (tokens)
- `cost_analysis_complete`: true
- `recommendation`: GO or NO-GO with rationale
- `implementation_plan`: If GO, steps to update 12 skills

## Next Steps After Spike

**If NO-GO**:
- Document findings
- Escalate to CTO for alternative approaches
- Consider: Task tool configuration, Claude Code feature request, etc.

**If GO**:
- Create workstream WS-AGENT-INJECT
- Estimate: 3-5 days to update 12 skills
- Implement dynamic injection helper
- Roll out skill-by-skill with validation
- Update all coordination skills

## Related Docs

- `.claude/memory/assessment-custom-agent-loading.json` - Original assessment
- `.claude/agents/*/agent.md` - Custom agent definitions (18 agents)
- `.claude/skills/*/SKILL.md` - Skills that spawn agents (12 skills)

## Notes

- This is a time-boxed spike (2-3 days max)
- Focus on practical validation over perfect analysis
- Goal is actionable decision, not comprehensive research
- Token overhead is expected to be negligible (<$0.01 per workstream)
