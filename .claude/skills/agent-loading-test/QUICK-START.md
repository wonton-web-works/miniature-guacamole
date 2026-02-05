# Quick Start: Execute WS-AGENT-SPIKE Tests

**You are here because**: You're a coordination skill (engineering-team or implement) with Task tool access, executing the agent loading behavior spike.

**Time required**: 2-3 days (1 day Phase 1, 1 day Phase 2, 0.5 day Phase 3)

## Phase 1: Document Behavior (START HERE)

### Test 1: QA Agent Constitution

**Execute this Task spawn**:
```
Task tool:
  subagent_type: qa
  prompt: |
    You are participating in WS-AGENT-SPIKE to test agent loading behavior.

    Please respond with exactly this information:

    1. YOUR CONSTITUTION - List your top 5 principles/rules
    2. MEMORY PROTOCOL - List memory files you should read
    3. VISUAL STANDARDS - Do you see "Visual standards" in your constitution? (YES/NO)
    4. BOUNDARIES - What is your escalation path?

    Quote from your actual constitution where possible.
```

**Record response in**: `.claude/memory/spike-agent-loading-results.json`
- Path: `phases.phase1.tests[0].actual_result`
- Analyze if response shows custom or built-in behavior

**Custom behavior indicators**:
- Mentions "Visual standards" or "ASCII progress patterns"
- Lists memory files: "tasks-qa.json", "bdd-scenarios.json"
- Mentions "99% coverage" requirement
- Mentions "BDD scenarios Given/When/Then"

**Built-in behavior indicators**:
- Generic QA principles
- No memory protocol
- No visual standards
- Standard testing approach

### Test 2: Dev Agent Constitution

**Execute**:
```
Task tool:
  subagent_type: dev
  prompt: |
    You are participating in WS-AGENT-SPIKE to test agent loading behavior.

    Please respond with:

    1. YOUR CONSTITUTION - List your top 5 principles
    2. TDD CYCLE - Describe your specific TDD cycle steps
    3. MEMORY PROTOCOL - What memory files do you read?
    4. PEER CONSULTATION - What agents can you consult?
    5. CONFIG PREFERENCE - Do you see "config over composition"?

    Quote from your constitution.
```

**Record**: `phases.phase1.tests[1].actual_result`

**Custom indicators**:
- "Red/Green/Refactor" TDD cycle
- "tasks-dev.json", "test-specs.json" memory files
- "Config over composition" principle
- Can consult "qa" and "design"

### Test 3: Staff Engineer Constitution

**Execute**:
```
Task tool:
  subagent_type: staff-engineer
  prompt: |
    You are participating in WS-AGENT-SPIKE to test agent loading behavior.

    Please respond with:

    1. YOUR CONSTITUTION - List your top 4 principles
    2. REVIEW CHECKLIST - What's on your code review checklist?
    3. ESCALATION - Who do you escalate to?
    4. STANDARDS - Do you see "Standards guardian"?
    5. TEACHING - Any principle about teaching developers?

    Quote specific text.
```

**Record**: `phases.phase1.tests[2].actual_result`

**Custom indicators**:
- "Standards guardian" principle
- Specific review checklist (tests, coverage, DRY, security, etc.)
- Escalates to "CTO"
- "Teach, don't just review" principle

### Analyze Phase 1 Results

After all 3 tests, update:
```json
"phases.phase1.findings": "All three agents showed [CUSTOM/BUILT-IN] behavior markers",
"phases.phase1.confirmation": "[YES/NO] - Task tool ignores custom agents"
```

**If all agents show built-in behavior**: Proceed to Phase 2
**If any agents show custom behavior**: Document the surprise, then test Phase 2 anyway

---

## Phase 2: Test Injection (IF PHASE 1 CONFIRMS BUILT-IN)

### Test 4: Inject QA Constitution

**Step 1: Read agent definition**
```bash
Read: .claude/agents/qa/agent.md
```

**Step 2: Execute with injection**
```
Task tool:
  subagent_type: qa
  prompt: |
    ===== INJECTED AGENT CONSTITUTION =====

    [PASTE FULL CONTENT OF .claude/agents/qa/agent.md HERE]

    ===== END CONSTITUTION =====

    ===== YOUR TASK =====
    You are participating in WS-AGENT-SPIKE Phase 2.

    Confirm you received the injected constitution by:
    1. Listing your first 3 constitutional principles
    2. Confirming you see "Visual standards" (YES/NO)
    3. Confirming you have a Memory Protocol (YES/NO)
    4. What memory files should you read before testing?

    Quote from the constitution above.
```

**Step 3: Measure tokens**
- Baseline prompt: ~100 tokens
- Full prompt with injection: ~430 tokens
- Overhead: ~330 tokens

**Step 4: Record**
```json
"phases.phase2.tests[0].actual_result": "[agent's response]",
"phases.phase2.tests[0].injection_works": "[YES/NO]",
"phases.phase2.tests[0].token_measurement.overhead_tokens": 330
```

### Test 5: Inject Dev Constitution

**Same pattern**:
1. Read `.claude/agents/dev/agent.md`
2. Inject in Task prompt
3. Verify agent confirms injected constitution
4. Measure overhead (~304 tokens)
5. Record in `phases.phase2.tests[1]`

### Test 6: Inject Staff Engineer Constitution

**Same pattern**:
1. Read `.claude/agents/staff-engineer/agent.md`
2. Inject in Task prompt
3. Verify agent confirms
4. Measure overhead (~300 tokens)
5. Record in `phases.phase2.tests[2]`

### Analyze Phase 2 Results

Update:
```json
"phases.phase2.findings": "Injection [WORKED/FAILED] - agents [DID/DID NOT] follow injected constitution",
"phases.phase2.prototype_works": "[YES/NO]",
"phases.phase2.average_token_overhead": [calculate average of 3 tests]
```

---

## Phase 3: Measure Impact

### Calculate Overhead

**Per workstream** (typical):
- QA spawns: 2 × 330 tokens = 660 tokens
- Dev spawns: 1 × 304 tokens = 304 tokens
- Staff spawns: 1 × 300 tokens = 300 tokens
- **Total: 1,264 tokens per workstream**

### Calculate Cost

**At $3.00 per 1M input tokens (Sonnet)**:
- Per workstream: 1,264 × $3.00 / 1,000,000 = $0.003792 ≈ **$0.004**
- Per 100 workstreams: **$0.40**

### Analyze Value

**COST**: ~$0.004 per workstream (negligible)

**VALUE**:
- 18 custom agents activated (vs generic behavior)
- Memory-first architecture enforced
- Visual standards consistency
- Specific TDD cycles (Red/Green/Refactor)
- Peer consultation protocols
- Escalation paths (CTO, engineering-manager)
- BDD scenarios, review checklists

**VERDICT**: High value, trivial cost

### Document Pros/Cons

**PROS**:
- Activates all custom agent behavior
- Trivial cost increase ($0.004/workstream)
- Works with current Claude Code
- Maintainable (read agent.md at runtime)
- Single source of truth

**CONS**:
- Larger Task prompts (but small absolute size)
- 12 skills need updates (~2 days work)
- Maintenance: keep agent.md and skills in sync
- Extra file reads at spawn time

### Recommendation

Update:
```json
"deliverables.recommendation": "[GO/NO-GO]",
"deliverables.implementation_plan": {
  "approach": "Dynamic injection - read agent.md at runtime",
  "effort": "2-3 days to update 12 skills",
  "priority": "HIGH - activates core system differentiation",
  "workstream": "WS-AGENT-INJECT"
}
```

**Recommended: GO** (assuming injection works and cost is negligible)

---

## Final Deliverable

Ensure `.claude/memory/spike-agent-loading-results.json` has:

- ✅ `confirmation_task_ignores_custom`: YES or NO
- ✅ `prototype_injection_works`: YES or NO
- ✅ `average_token_overhead`: 310 (or actual measured)
- ✅ `cost_analysis_complete`: true
- ✅ `recommendation`: GO or NO-GO
- ✅ `implementation_plan`: Object with approach, effort, priority

---

## Troubleshooting

### "I can't spawn agents"
- Check you're using a coordination skill with Task tool (engineering-team, implement)
- Dev agents don't have Task tool access

### "Agents aren't responding as expected"
- Record actual responses anyway - that's the data we need
- The point is to document behavior, not force a specific outcome

### "Token measurements differ from estimates"
- Use actual measurements, not estimates
- Count tokens in full prompts (baseline vs injected)

### "Phase 2 injection isn't working"
- Verify you included full agent.md content in prompt
- Check agent's response - does it acknowledge the constitution?
- Document negative result - that's valuable data

---

## Time Check

- **Phase 1**: ~2-3 hours (spawn 3 agents, analyze responses)
- **Phase 2**: ~3-4 hours (read 3 agent.md files, spawn with injection, measure)
- **Phase 3**: ~1-2 hours (calculate, analyze, recommend)
- **Documentation**: ~1 hour (update results JSON)

**Total**: 7-10 hours = 1-1.5 days actual work time

Timeboxed at 2-3 days to allow for exploration and validation.

---

## Next Steps After Spike

**If GO recommendation**:
1. Present results to leadership-team
2. Create WS-AGENT-INJECT workstream
3. Implement dynamic injection helper
4. Update 12 skills systematically
5. Validate each skill spawns agents with custom behavior

**If NO-GO**:
1. Document why injection failed or why cost too high
2. Escalate to CTO for alternative approaches
3. Consider: Claude Code config, feature request, selective injection

---

**Ready? Start with Phase 1, Test 1. Good luck!**
