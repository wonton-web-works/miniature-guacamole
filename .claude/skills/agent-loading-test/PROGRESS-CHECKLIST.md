# WS-AGENT-SPIKE Progress Checklist

Track your progress through the spike execution. Check off items as you complete them.

## Setup (COMPLETE)

- [x] Create spike results JSON
- [x] Create test skill directory
- [x] Document test scenarios
- [x] Document injection patterns
- [x] Calculate preliminary token estimates
- [x] Identify 12 skills requiring updates
- [x] Create execution guides

## Phase 1: Document Built-in Behavior

### Test 1: QA Agent
- [ ] Spawn QA agent with constitution-checking prompt
- [ ] Record agent's response
- [ ] Analyze: Does response show custom or built-in behavior?
- [ ] Update `spike-agent-loading-results.json` test1.actual_result
- [ ] Update test1.conclusion (CUSTOM or BUILT-IN)

**Custom indicators to look for**:
- [ ] Mentions "Visual standards" or "ASCII progress patterns"
- [ ] Lists memory files: "tasks-qa.json", "bdd-scenarios.json"
- [ ] Mentions "99% coverage" requirement
- [ ] Mentions "BDD scenarios Given/When/Then"

### Test 2: Dev Agent
- [ ] Spawn dev agent with constitution-checking prompt
- [ ] Record agent's response
- [ ] Analyze: Custom or built-in behavior?
- [ ] Update test2.actual_result
- [ ] Update test2.conclusion

**Custom indicators**:
- [ ] Mentions "Red/Green/Refactor" TDD cycle
- [ ] Lists "tasks-dev.json", "test-specs.json"
- [ ] Mentions "Config over composition"
- [ ] Lists peer consultation (qa, design)

### Test 3: Staff Engineer Agent
- [ ] Spawn staff-engineer with constitution-checking prompt
- [ ] Record agent's response
- [ ] Analyze: Custom or built-in?
- [ ] Update test3.actual_result
- [ ] Update test3.conclusion

**Custom indicators**:
- [ ] Mentions "Standards guardian"
- [ ] Lists specific review checklist
- [ ] Escalates to "CTO"
- [ ] Mentions "Teach, don't just review"

### Phase 1 Analysis
- [ ] All 3 tests complete
- [ ] Update phase1.findings with summary
- [ ] Update phase1.confirmation: YES or NO (Task ignores custom)
- [ ] Set phase1.status = "complete"
- [ ] Decision: Proceed to Phase 2 if Task ignores custom

**Phase 1 Complete**: YES / NO

---

## Phase 2: Test Agent Injection

### Test 4: QA Agent Injection
- [ ] Read `.claude/agents/qa/agent.md` file
- [ ] Count baseline prompt tokens (~100)
- [ ] Create Task prompt with full agent.md injected
- [ ] Count injected prompt tokens
- [ ] Spawn QA agent with injected constitution
- [ ] Record agent's response
- [ ] Verify: Did agent confirm injected constitution?
- [ ] Calculate overhead tokens (injected - baseline)
- [ ] Update test4.actual_result
- [ ] Update test4.injection_works (YES/NO)
- [ ] Update test4.token_measurement

**Expected: Agent lists principles from injected constitution**

### Test 5: Dev Agent Injection
- [ ] Read `.claude/agents/dev/agent.md`
- [ ] Create Task prompt with injection
- [ ] Count tokens (baseline and injected)
- [ ] Spawn dev agent
- [ ] Verify agent confirms constitution
- [ ] Calculate overhead
- [ ] Update test5 results

### Test 6: Staff Engineer Injection
- [ ] Read `.claude/agents/staff-engineer/agent.md`
- [ ] Create Task prompt with injection
- [ ] Count tokens
- [ ] Spawn staff-engineer
- [ ] Verify confirmation
- [ ] Calculate overhead
- [ ] Update test6 results

### Phase 2 Analysis
- [ ] All 3 injection tests complete
- [ ] Calculate average token overhead across 3 agents
- [ ] Update phase2.findings
- [ ] Update phase2.prototype_works (YES/NO)
- [ ] Update phase2.average_token_overhead
- [ ] Set phase2.status = "complete"

**Phase 2 Complete**: YES / NO

---

## Phase 3: Measure Impact

### Token Overhead Calculation
- [ ] QA overhead measured: _____ tokens
- [ ] Dev overhead measured: _____ tokens
- [ ] Staff engineer overhead measured: _____ tokens
- [ ] Average calculated: _____ tokens per spawn
- [ ] Per workstream: (2×QA + 1×dev + 1×staff) = _____ tokens
- [ ] Update phase3.measurements with actual values

### Cost Analysis
- [ ] Calculate cost per workstream at $3/1M tokens
- [ ] Calculate cost for 100 workstreams
- [ ] Update phase3.measurements.estimated_cost_increase_per_workstream
- [ ] Document findings in cost_analysis.cost_vs_value

### Value Analysis
- [ ] List pros of injection approach
- [ ] List cons of injection approach
- [ ] Compare cost (trivial?) vs value (specialized agents)
- [ ] Update phase3.pros and phase3.cons

### Final Decision
- [ ] All data collected and analyzed
- [ ] Draft recommendation: GO or NO-GO
- [ ] Draft rationale for recommendation
- [ ] If GO: Draft implementation plan (approach, effort, workstream)
- [ ] If NO-GO: Draft alternative approaches or escalation path
- [ ] Set phase3.status = "complete"

**Phase 3 Complete**: YES / NO

---

## Deliverables Checklist

Update `.claude/memory/spike-agent-loading-results.json`:

- [ ] `deliverables.confirmation_task_ignores_custom`: YES or NO
- [ ] `deliverables.prototype_injection_works`: YES or NO
- [ ] `deliverables.average_token_overhead`: [number]
- [ ] `deliverables.cost_analysis_complete`: true
- [ ] `deliverables.recommendation`: GO or NO-GO
- [ ] `deliverables.implementation_plan`: [object with details]

Final status updates:
- [ ] `status`: "complete"
- [ ] `completed_at`: [date]

---

## Validation

Before marking spike complete, verify:

- [ ] All 6 tests executed (3 baseline, 3 injection)
- [ ] All test results recorded with actual agent responses
- [ ] Token overhead measured (not estimated)
- [ ] Cost calculated with actual measurements
- [ ] Value vs cost analysis complete
- [ ] GO/NO-GO recommendation provided
- [ ] Implementation plan drafted (if GO)
- [ ] All JSON fields populated (no nulls in deliverables)

**Spike Ready for Review**: YES / NO

---

## Next Actions

### If GO Recommendation
- [ ] Present spike results to leadership-team
- [ ] Get approval for WS-AGENT-INJECT
- [ ] Create workstream with acceptance criteria
- [ ] Assign to engineering-team for execution

### If NO-GO Recommendation
- [ ] Document reasons for NO-GO
- [ ] Escalate to CTO for technical alternatives
- [ ] Consider: Claude Code configuration options
- [ ] Consider: Selective injection (only critical agents)
- [ ] Consider: Feature request to Anthropic

---

## Timeline Tracker

**Target**: 2-3 days timeboxed

| Phase | Estimated | Actual | Status |
|-------|-----------|--------|--------|
| Phase 1 | 1 day | ___ | [ ] |
| Phase 2 | 1 day | ___ | [ ] |
| Phase 3 | 0.5 day | ___ | [ ] |
| Documentation | 0.5 day | ___ | [ ] |
| **Total** | **2-3 days** | **___** | [ ] |

**Started**: 2026-02-04
**Completed**: ___________
**Within timebox**: YES / NO

---

## Notes & Observations

Use this space to record interesting findings, surprises, or issues:

```
[Record observations here as you execute the spike]




```

---

## Sign-off

**Spike Executor**: ___________________
**Reviewed By**: ___________________
**Date**: ___________________
**Recommendation**: GO / NO-GO
**Next Workstream**: WS-AGENT-INJECT / [alternative]

---

**Status**: Setup complete, ready for Phase 1 execution
