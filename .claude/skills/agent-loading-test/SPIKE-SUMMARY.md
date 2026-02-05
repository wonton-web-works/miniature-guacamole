# WS-AGENT-SPIKE: Agent Loading Behavior - Summary

**Status**: Setup Complete - Ready for Execution
**Started**: 2026-02-04
**Timeboxed**: 2-3 days

## Executive Summary

This spike investigates whether Claude Code's Task tool loads our custom agent definitions from `.claude/agents/*/agent.md` or uses built-in defaults. If custom agents are not being loaded, our entire agent system differentiation (18 specialized agents with memory-first architecture, visual standards, TDD cycles, etc.) is nullified.

**Hypothesis**: Task tool ignores custom agents and uses built-in behavior.

**Proposed Solution**: Inject agent constitutions directly into Task prompts from skills.

**Key Question**: Is the token/cost overhead acceptable for the value gained?

## Current State

### What We've Built
- 18 custom agents with specialized constitutions (`.claude/agents/*/agent.md`)
- 12 skills that spawn agents via Task tool
- Memory-first architecture with specific protocols
- Visual standards and ASCII progress patterns
- TDD cycles, peer consultation, escalation protocols

### The Problem
Agents spawned via Task tool may be using generic Claude Code behavior instead of our custom constitutions, rendering our specialization ineffective.

### Evidence
- Assessment document exists: `.claude/memory/assessment-custom-agent-loading.json`
- CTO decision: "Task tool is built-in Claude Code - cannot modify agent loading"
- Proposed alternative: Skill-level agent injection

## Spike Objectives

### Phase 1: Document Built-in Behavior (1 day)
**Goal**: Confirm Task tool ignores custom agents

**Tests**:
1. Spawn QA agent, ask about constitution
2. Spawn dev agent, ask about constitution
3. Spawn staff-engineer, ask about constitution

**Success**: Clear YES/NO answer to "Does Task load custom agents?"

### Phase 2: Prototype Injection (1 day)
**Goal**: Prove injection works and measure overhead

**Tests**:
1. Inject QA constitution in Task prompt, verify agent follows it
2. Inject dev constitution, verify
3. Inject staff-engineer constitution, verify

**Measurements**:
- Baseline prompt: ~100 tokens
- QA injection: +330 tokens
- Dev injection: +304 tokens
- Staff engineer injection: +300 tokens
- **Average overhead: ~310 tokens per spawn**

**Success**: Agents confirm they follow injected constitution

### Phase 3: Measure Impact (0.5 day)
**Goal**: Business case for injection approach

**Analysis**:
- Typical workstream: 2 QA + 1 dev + 1 staff spawns = 1,264 tokens overhead
- Cost: $0.004 per workstream at $3/1M input tokens
- For 100 workstreams: ~$0.40 additional cost
- **Value**: All 18 custom agents become active with specialized behavior

**Success**: GO/NO-GO recommendation with rationale

## Deliverables

Spike is complete when `.claude/memory/spike-agent-loading-results.json` contains:

- [ ] `confirmation_task_ignores_custom`: YES or NO
- [ ] `prototype_injection_works`: YES or NO
- [ ] `average_token_overhead`: number (tokens)
- [ ] `cost_analysis_complete`: true
- [ ] `recommendation`: GO or NO-GO
- [ ] `implementation_plan`: If GO, steps for WS-AGENT-INJECT

## Test Infrastructure Created

### Files
```
.claude/skills/agent-loading-test/
├── skill.md                        # Test skill definition
├── README.md                       # Spike overview
├── SPIKE-SUMMARY.md                # This file
├── test-executor.md                # Detailed test scenarios
├── injection-pattern-example.md   # Implementation examples
├── run-phase1.md                   # Phase 1 templates
└── run-phase2.md                   # Phase 2 templates
```

### Memory
```
.claude/memory/spike-agent-loading-results.json  # Results tracker
```

## Execution Instructions

### Who Executes
A coordination skill with Task tool access:
- `engineering-team` (recommended - has full agent spawn capability)
- `implement` (alternative - TDD workflow context)

**NOT** the dev agent - it cannot spawn subagents.

### How to Execute

#### Phase 1: Document Behavior
```bash
# Coordination skill should:
1. Read .claude/skills/agent-loading-test/test-executor.md Phase 1
2. Execute Test 1: Spawn QA, ask about constitution
3. Execute Test 2: Spawn dev, ask about constitution
4. Execute Test 3: Spawn staff-engineer, ask about constitution
5. Analyze responses for custom vs built-in behavior markers
6. Update spike-agent-loading-results.json with findings
```

#### Phase 2: Test Injection
```bash
# Coordination skill should:
1. Read .claude/agents/qa/agent.md content
2. Embed in Task prompt, spawn QA, verify constitution active
3. Repeat for dev and staff-engineer agents
4. Measure token overhead (compare baseline vs injected prompts)
5. Update results with injection confirmation and measurements
```

#### Phase 3: Analyze Impact
```bash
# Dev or coordination skill:
1. Calculate average token overhead across 3 agents
2. Estimate cost for typical workstream
3. Compare cost vs value (generic vs specialized behavior)
4. Document pros/cons of injection approach
5. Provide GO/NO-GO recommendation
```

## Preliminary Analysis

### Token Overhead (Estimated)
| Agent | Constitution Size | Typical Spawns | Overhead |
|-------|------------------|----------------|----------|
| QA | 248 words (~330 tokens) | 2x per workstream | 660 tokens |
| Dev | 228 words (~304 tokens) | 1x per workstream | 304 tokens |
| Staff Engineer | 225 words (~300 tokens) | 1x per workstream | 300 tokens |
| **Total** | | **4x per workstream** | **1,264 tokens** |

### Cost Impact
- Input tokens: $3.00 per 1M tokens (Sonnet)
- Per workstream: 1,264 tokens × $3.00/1M = **$0.004**
- Per 100 workstreams: **$0.40**
- **Assessment: Negligible cost**

### Value Delivered
- 18 custom agents with specialized behavior activated
- Memory-first architecture enforced
- Visual standards consistency
- TDD cycles with specific Red/Green/Refactor patterns
- Peer consultation protocols
- Escalation paths (CTO, engineering-manager, etc.)
- BDD scenarios, review checklists, delegation tables

**Assessment: High value**

## Implementation Preview

If spike confirms injection works, WS-AGENT-INJECT would:

### Approach: Dynamic Injection (Recommended)
Skills read agent.md at runtime and inject into Task prompts.

**Pros**:
- Single source of truth (agent.md files)
- Constitution changes don't require skill updates
- Maintainable

**Implementation Pattern**:
```markdown
Before spawning agent:
1. Read `.claude/agents/{agent-name}/agent.md`
2. Assemble prompt:
   ```
   ===== AGENT CONSTITUTION =====
   {agent_md_content}
   ===== END CONSTITUTION =====

   ===== YOUR TASK =====
   {actual_task_prompt}
   ```
3. Invoke Task with assembled prompt
```

### Skills Requiring Updates (12)
1. implement
2. engineering-team
3. code-review
4. security-review
5. accessibility-review
6. design-review
7. product-team
8. leadership-team
9. technical-assessment
10. feature-assessment
11. design-team
12. docs-team

**Effort**: ~1 hour per skill = 12 hours = **1.5-2 days**

## Success Criteria

Spike succeeds if we can answer:
1. **Does Task load custom agents?** YES/NO with evidence
2. **Does injection work?** YES/NO with proof
3. **What's the cost?** Specific token/dollar amounts
4. **Should we proceed?** GO/NO-GO with clear rationale

## Risks

### Low Risk
- Token overhead proves too expensive (unlikely - preliminary calc shows $0.004/workstream)
- Injection doesn't work (low risk - prompt injection is standard LLM behavior)

### Medium Risk
- Maintenance complexity (mitigated by dynamic injection approach)
- Testing all 12 skills takes longer than estimated

### Contingencies
- If injection doesn't work: Escalate to CTO for Claude Code configuration options
- If cost too high: Selective injection (only critical agents like qa/dev/staff)
- If maintenance too complex: Inline injection for simplicity

## Next Actions

**Immediate**:
1. Coordination skill (engineering-team or implement) executes Phase 1 tests
2. Record actual agent responses in spike results
3. Confirm if Task loads custom agents or not

**If Task Ignores Custom** (expected):
1. Execute Phase 2 injection tests
2. Measure token overhead
3. Provide recommendation

**If GO**:
1. Create WS-AGENT-INJECT workstream
2. Implement dynamic injection helper
3. Update 12 skills systematically
4. Validate agent behavior with each update

**If NO-GO**:
1. Document findings
2. Escalate to CTO/leadership for decision
3. Consider alternative approaches

## Questions for Validation

After spike execution, we should be able to answer:

1. **Behavior**: Do spawned agents follow custom constitutions or generic behavior?
2. **Injection**: Can we override default behavior by embedding constitution in prompt?
3. **Overhead**: How many tokens does injection add per spawn?
4. **Cost**: What's the dollar cost per workstream and per 100 workstreams?
5. **Value**: Does specialized behavior justify the token overhead?
6. **Maintenance**: Is dynamic injection maintainable or should we use inline?
7. **Rollout**: Can we update 12 skills in 2-3 days?
8. **Decision**: GO or NO-GO on WS-AGENT-INJECT?

## References

- Original assessment: `.claude/memory/assessment-custom-agent-loading.json`
- Test scenarios: `.claude/skills/agent-loading-test/test-executor.md`
- Implementation examples: `.claude/skills/agent-loading-test/injection-pattern-example.md`
- Results tracker: `.claude/memory/spike-agent-loading-results.json`

---

**Spike Owner**: dev agent (setup), coordination skill (execution)
**Stakeholders**: CTO (technical decision), engineering-director (capacity), CEO (business value)
**Timeline**: 2-3 days timeboxed
**Status**: Ready for Phase 1 execution
