# Agent System Test Matrix

**Version:** 1.0
**Created:** 2026-02-04
**Status:** Ready for Execution

---

## Overview

This test matrix validates the Product Development Team agent system consisting of:
- **11 Skill Agents** (slash commands): ceo, cto, engineering-director, product-owner, product-manager, engineering-manager, staff-engineer, art-director, dev, qa, design
- **3 IC Subagents** (for Task tool delegation): dev, qa, design

---

## Test Categories

| Category | Code | Description |
|----------|------|-------------|
| Direct Invocation | DI | Each slash command loads and responds correctly |
| Delegation Chain | DC | Leadership agents delegate to IC subagents via Task tool |
| Peer Consultation | PC | IC agents consult with peer IC agents |
| Argument Passing | AP | $ARGUMENTS substitution works correctly |

---

## Priority Levels

| Priority | Description |
|----------|-------------|
| P0 | Critical - System non-functional without this |
| P1 | High - Core functionality |
| P2 | Medium - Important but not blocking |
| P3 | Low - Nice to have |

---

## 1. Direct Invocation Tests (DI)

Tests that each of the 11 slash commands can be invoked directly by the user.

| Test ID | Category | Agent | Description | Steps | Expected Result | Priority |
|---------|----------|-------|-------------|-------|-----------------|----------|
| DI-001 | Direct Invocation | ceo | CEO slash command loads | 1. Run `/ceo` | Agent loads, displays CEO persona, ready to respond | P0 |
| DI-002 | Direct Invocation | cto | CTO slash command loads | 1. Run `/cto` | Agent loads, displays CTO persona, ready to respond | P0 |
| DI-003 | Direct Invocation | engineering-director | Engineering Director slash command loads | 1. Run `/engineering-director` | Agent loads, displays Engineering Director persona, ready to respond | P0 |
| DI-004 | Direct Invocation | product-owner | Product Owner slash command loads | 1. Run `/product-owner` | Agent loads, displays PO persona, ready to respond | P0 |
| DI-005 | Direct Invocation | product-manager | Product Manager slash command loads | 1. Run `/product-manager` | Agent loads, displays PM persona, ready to respond | P0 |
| DI-006 | Direct Invocation | engineering-manager | Engineering Manager slash command loads | 1. Run `/engineering-manager` | Agent loads, displays EM persona, ready to respond | P0 |
| DI-007 | Direct Invocation | staff-engineer | Staff Engineer slash command loads | 1. Run `/staff-engineer` | Agent loads, displays Staff Engineer persona, ready to respond | P0 |
| DI-008 | Direct Invocation | art-director | Art Director slash command loads | 1. Run `/art-director` | Agent loads, displays Art Director persona, ready to respond | P0 |
| DI-009 | Direct Invocation | dev | Developer slash command loads | 1. Run `/dev` | Agent loads, displays dummy DEV AGENT INVOKED banner | P0 |
| DI-010 | Direct Invocation | qa | QA slash command loads | 1. Run `/qa` | Agent loads, displays dummy QA AGENT INVOKED banner | P0 |
| DI-011 | Direct Invocation | design | Design slash command loads | 1. Run `/design` | Agent loads, displays dummy DESIGN AGENT INVOKED banner | P0 |

---

## 2. Argument Passing Tests (AP)

Tests that $ARGUMENTS substitution works correctly for each agent.

| Test ID | Category | Agent | Description | Steps | Expected Result | Priority |
|---------|----------|-------|-------------|-------|-----------------|----------|
| AP-001 | Argument Passing | ceo | CEO receives arguments | 1. Run `/ceo Review Q4 strategy` | Agent receives and displays "Review Q4 strategy" in context | P0 |
| AP-002 | Argument Passing | cto | CTO receives arguments | 1. Run `/cto Evaluate microservices architecture` | Agent receives and displays "Evaluate microservices architecture" in context | P0 |
| AP-003 | Argument Passing | engineering-director | Engineering Director receives arguments | 1. Run `/engineering-director Plan sprint capacity` | Agent receives and displays "Plan sprint capacity" in context | P0 |
| AP-004 | Argument Passing | product-owner | Product Owner receives arguments | 1. Run `/product-owner Prioritize backlog for Q1` | Agent receives and displays "Prioritize backlog for Q1" in context | P0 |
| AP-005 | Argument Passing | product-manager | Product Manager receives arguments | 1. Run `/product-manager Write spec for login feature` | Agent receives and displays "Write spec for login feature" in context | P0 |
| AP-006 | Argument Passing | engineering-manager | Engineering Manager receives arguments | 1. Run `/engineering-manager Assign authentication tasks` | Agent receives and displays "Assign authentication tasks" in context | P0 |
| AP-007 | Argument Passing | staff-engineer | Staff Engineer receives arguments | 1. Run `/staff-engineer Review API design patterns` | Agent receives and displays "Review API design patterns" in context | P0 |
| AP-008 | Argument Passing | art-director | Art Director receives arguments | 1. Run `/art-director Define brand guidelines` | Agent receives and displays "Define brand guidelines" in context | P0 |
| AP-009 | Argument Passing | dev | Developer receives arguments | 1. Run `/dev Implement user authentication` | Dummy output shows "Implement user authentication" in Task Received section | P0 |
| AP-010 | Argument Passing | qa | QA receives arguments | 1. Run `/qa Test login flow` | Dummy output shows "Test login flow" in Task Received section | P0 |
| AP-011 | Argument Passing | design | Design receives arguments | 1. Run `/design Create login screen mockup` | Dummy output shows "Create login screen mockup" in Task Received section | P0 |
| AP-012 | Argument Passing | dev | Developer handles empty arguments | 1. Run `/dev` (no arguments) | Agent loads correctly, Task Received shows empty or placeholder | P1 |
| AP-013 | Argument Passing | qa | QA handles special characters | 1. Run `/qa Test "edge cases" & <boundary> conditions` | Agent correctly receives and displays special characters | P2 |
| AP-014 | Argument Passing | design | Design handles multi-line arguments | 1. Run `/design` with multi-line input | Agent correctly receives all lines of input | P2 |

---

## 3. Delegation Chain Tests (DC)

Tests that leadership agents can delegate to IC subagents via the Task tool.

### Executive to IC Delegation

| Test ID | Category | From | To | Description | Steps | Expected Result | Priority |
|---------|----------|------|-----|-------------|-------|-----------------|----------|
| DC-001 | Delegation | CTO | dev | CTO delegates implementation to dev | 1. Run `/cto`<br>2. Ask CTO to delegate a coding task to dev | CTO uses Task tool with subagent_type="dev", dev subagent invoked, shows DEV SUBAGENT INVOKED banner | P0 |
| DC-002 | Delegation | Engineering Director | dev | ED delegates implementation to dev | 1. Run `/engineering-director`<br>2. Ask ED to delegate coding task to dev | ED uses Task tool, dev subagent invoked | P0 |
| DC-003 | Delegation | Engineering Director | qa | ED delegates testing to qa | 1. Run `/engineering-director`<br>2. Ask ED to delegate testing task to qa | ED uses Task tool with subagent_type="qa", qa subagent invoked | P0 |

### Leadership to IC Delegation

| Test ID | Category | From | To | Description | Steps | Expected Result | Priority |
|---------|----------|------|-----|-------------|-------|-----------------|----------|
| DC-004 | Delegation | Product Manager | dev | PM delegates to dev | 1. Run `/product-manager`<br>2. Ask PM to assign implementation work to dev | PM uses Task tool, dev subagent invoked with task details | P0 |
| DC-005 | Delegation | Product Manager | qa | PM delegates to qa | 1. Run `/product-manager`<br>2. Ask PM to assign testing work to qa | PM uses Task tool, qa subagent invoked with task details | P0 |
| DC-006 | Delegation | Product Manager | design | PM delegates to design | 1. Run `/product-manager`<br>2. Ask PM to assign design work to design | PM uses Task tool, design subagent invoked with task details | P0 |
| DC-007 | Delegation | Engineering Manager | dev | EM delegates to dev | 1. Run `/engineering-manager`<br>2. Ask EM to assign coding task to dev | EM uses Task tool, dev subagent invoked | P0 |
| DC-008 | Delegation | Engineering Manager | qa | EM delegates to qa | 1. Run `/engineering-manager`<br>2. Ask EM to assign testing task to qa | EM uses Task tool, qa subagent invoked | P0 |
| DC-009 | Delegation | Staff Engineer | dev | Staff Engineer delegates to dev | 1. Run `/staff-engineer`<br>2. Ask Staff Engineer to assign implementation to dev | Staff Engineer uses Task tool, dev subagent invoked | P1 |
| DC-010 | Delegation | Art Director | design | Art Director delegates to design | 1. Run `/art-director`<br>2. Ask Art Director to assign design work | Art Director uses Task tool, design subagent invoked | P1 |

### Leadership to Leadership Delegation

| Test ID | Category | From | To | Description | Steps | Expected Result | Priority |
|---------|----------|------|-----|-------------|-------|-----------------|----------|
| DC-011 | Delegation | CEO | CTO | CEO delegates to CTO | 1. Run `/ceo`<br>2. Ask CEO to delegate technical decision to CTO | CEO acknowledges CTO as delegate for technical matters | P1 |
| DC-012 | Delegation | CEO | Engineering Director | CEO delegates to ED | 1. Run `/ceo`<br>2. Ask CEO to delegate operations to ED | CEO acknowledges ED as delegate for engineering operations | P1 |
| DC-013 | Delegation | CEO | Product Owner | CEO delegates to PO | 1. Run `/ceo`<br>2. Ask CEO to delegate product decisions to PO | CEO acknowledges PO as delegate for product vision | P1 |
| DC-014 | Delegation | CEO | Art Director | CEO delegates to Art Director | 1. Run `/ceo`<br>2. Ask CEO to delegate design vision | CEO acknowledges Art Director as delegate for design | P1 |
| DC-015 | Delegation | CTO | Engineering Director | CTO delegates to ED | 1. Run `/cto`<br>2. Ask CTO to delegate operations to ED | CTO acknowledges ED for engineering operations | P1 |
| DC-016 | Delegation | CTO | Staff Engineer | CTO delegates to Staff Engineer | 1. Run `/cto`<br>2. Ask CTO to delegate technical standards | CTO acknowledges Staff Engineer for technical leadership | P1 |
| DC-017 | Delegation | Product Owner | Product Manager | PO delegates to PM | 1. Run `/product-owner`<br>2. Ask PO to delegate spec writing to PM | PO acknowledges PM for detailed specs | P1 |
| DC-018 | Delegation | Engineering Director | Engineering Manager | ED delegates to EM | 1. Run `/engineering-director`<br>2. Ask ED to delegate team execution to EM | ED acknowledges EM for team management | P1 |
| DC-019 | Delegation | Engineering Director | Staff Engineer | ED delegates to Staff Engineer | 1. Run `/engineering-director`<br>2. Ask ED to delegate technical leadership | ED acknowledges Staff Engineer for complex problems | P1 |

### Multi-hop Delegation Chains

| Test ID | Category | Chain | Description | Steps | Expected Result | Priority |
|---------|----------|-------|-------------|-------|-----------------|----------|
| DC-020 | Delegation | CEO -> CTO -> dev | Full chain from CEO to IC | 1. Run `/ceo`<br>2. Ask CEO to initiate a technical project<br>3. CEO mentions CTO should handle<br>4. Invoke CTO, delegate to dev | Chain completes, dev subagent receives task | P1 |
| DC-021 | Delegation | PO -> PM -> dev/qa/design | Product chain to all ICs | 1. Run `/product-owner`<br>2. Ask PO to define feature<br>3. PO mentions PM for specs<br>4. Invoke PM, have PM delegate to all 3 ICs | All three IC subagents receive appropriate tasks | P2 |
| DC-022 | Delegation | ED -> EM -> dev + qa | Engineering chain to multiple ICs | 1. Run `/engineering-director`<br>2. Ask ED to plan sprint<br>3. ED delegates to EM<br>4. EM delegates to dev and qa | Both dev and qa subagents invoked | P2 |

---

## 4. Peer Consultation Tests (PC)

Tests that IC agents can consult with peer IC agents.

| Test ID | Category | From | To | Description | Steps | Expected Result | Priority |
|---------|----------|------|-----|-------------|-------|-----------------|----------|
| PC-001 | Peer Consultation | dev | qa | Dev consults QA for testing guidance | 1. Run `/dev Implement feature X`<br>2. Ask dev to consult qa about test coverage | Dev uses Task tool with qa, qa subagent provides testing guidance | P1 |
| PC-002 | Peer Consultation | dev | design | Dev consults Design for UI clarification | 1. Run `/dev Implement UI component`<br>2. Ask dev to consult design about specs | Dev uses Task tool with design, design subagent responds | P1 |
| PC-003 | Peer Consultation | qa | dev | QA consults Dev for implementation details | 1. Run `/qa Test authentication`<br>2. Ask qa to consult dev about implementation | QA uses Task tool with dev, dev subagent provides details | P1 |
| PC-004 | Peer Consultation | design | dev | Design consults Dev for feasibility | 1. Run `/design Create animation`<br>2. Ask design to consult dev about feasibility | Design uses Task tool with dev, dev subagent responds | P1 |
| PC-005 | Peer Consultation | design | qa | Design consults QA for usability | 1. Run `/design Create form layout`<br>2. Ask design to consult qa about usability | Design uses Task tool with qa, qa subagent responds | P1 |
| PC-006 | Peer Consultation | qa | design | QA consults Design (not explicitly allowed) | 1. Run `/qa Test UI`<br>2. Ask qa to consult design | QA skill does not list design as consultable peer - verify behavior | P2 |

### Bidirectional Consultation

| Test ID | Category | Agents | Description | Steps | Expected Result | Priority |
|---------|----------|--------|-------------|-------|-----------------|----------|
| PC-007 | Peer Consultation | dev <-> qa | Bidirectional dev-qa consultation | 1. Run `/dev`<br>2. Dev consults qa<br>3. In qa response, have qa consult dev | Both directions work, no infinite loops | P2 |
| PC-008 | Peer Consultation | dev <-> design | Bidirectional dev-design consultation | 1. Run `/dev`<br>2. Dev consults design<br>3. Design consults dev | Both directions work correctly | P2 |

---

## 5. Error Handling and Edge Cases (EH)

| Test ID | Category | Description | Steps | Expected Result | Priority |
|---------|----------|-------------|-------|-----------------|----------|
| EH-001 | Error Handling | Invalid slash command | 1. Run `/invalid-agent` | Graceful error message, system remains stable | P1 |
| EH-002 | Error Handling | Delegation to non-existent subagent | 1. Run `/cto`<br>2. Try to delegate to non-existent "ux" agent | Clear error message or CTO explains cannot delegate to that role | P1 |
| EH-003 | Error Handling | Unauthorized delegation attempt | 1. Run `/qa`<br>2. Try to have QA delegate to design (not in allowed list) | QA indicates it cannot delegate to design or handles gracefully | P2 |
| EH-004 | Error Handling | Empty task delegation | 1. Run `/engineering-manager`<br>2. Ask EM to delegate to dev with no specific task | EM either asks for task details or handles empty delegation | P2 |
| EH-005 | Error Handling | Very long arguments | 1. Run `/dev [very long task description 1000+ chars]` | Agent handles long input without truncation or error | P3 |

---

## 6. Subagent Configuration Tests (SC)

| Test ID | Category | Agent | Description | Steps | Expected Result | Priority |
|---------|----------|-------|-------------|-------|-----------------|----------|
| SC-001 | Subagent Config | dev | Dev subagent has correct tools | 1. Verify agent.md<br>2. Invoke dev subagent | Subagent has Read, Glob, Grep tools as specified | P1 |
| SC-002 | Subagent Config | qa | QA subagent has correct tools | 1. Verify agent.md<br>2. Invoke qa subagent | Subagent has Read, Glob, Grep tools as specified | P1 |
| SC-003 | Subagent Config | design | Design subagent has correct tools | 1. Verify agent.md<br>2. Invoke design subagent | Subagent has Read, Glob, Grep tools as specified | P1 |
| SC-004 | Subagent Config | dev | Dev subagent uses haiku model | 1. Check agent.md<br>2. Observe subagent behavior | Model field is "haiku" | P2 |
| SC-005 | Subagent Config | qa | QA subagent uses haiku model | 1. Check agent.md | Model field is "haiku" | P2 |
| SC-006 | Subagent Config | design | Design subagent uses haiku model | 1. Check agent.md | Model field is "haiku" | P2 |

---

## Test Execution Summary

| Category | Total Tests | P0 | P1 | P2 | P3 |
|----------|-------------|-----|-----|-----|-----|
| Direct Invocation (DI) | 11 | 11 | 0 | 0 | 0 |
| Argument Passing (AP) | 14 | 11 | 1 | 2 | 0 |
| Delegation Chain (DC) | 22 | 8 | 11 | 3 | 0 |
| Peer Consultation (PC) | 8 | 0 | 5 | 3 | 0 |
| Error Handling (EH) | 5 | 0 | 2 | 2 | 1 |
| Subagent Config (SC) | 6 | 0 | 3 | 3 | 0 |
| **TOTAL** | **66** | **30** | **22** | **13** | **1** |

---

## Acceptance Criteria

### Minimum Viable Acceptance (All P0 tests must pass)

1. **All 11 slash commands load successfully** (DI-001 through DI-011)
2. **All 11 agents receive and display arguments correctly** (AP-001 through AP-011)
3. **Core delegation chains work** (DC-001 through DC-008)

### Full Acceptance (All P0 + P1 tests must pass)

1. All P0 criteria met
2. **Extended delegation chains work** (DC-009 through DC-019)
3. **Peer consultations work** (PC-001 through PC-005)
4. **Basic error handling works** (EH-001, EH-002)
5. **Subagent configurations correct** (SC-001 through SC-003)

### Complete Acceptance (All tests pass)

1. All P0 + P1 criteria met
2. Multi-hop delegation chains work
3. Bidirectional peer consultations work
4. All edge cases handled gracefully
5. All subagent configurations verified

---

## Delegation Authority Matrix

Quick reference for valid delegation paths:

| Agent | Can Delegate To (Leadership) | Can Delegate To (IC via Task) |
|-------|------------------------------|-------------------------------|
| CEO | CTO, Engineering Director, Product Owner, Art Director | - |
| CTO | Engineering Director, Staff Engineer | dev |
| Engineering Director | Engineering Manager, Staff Engineer | dev, qa |
| Product Owner | Product Manager | - |
| Product Manager | - | dev, qa, design |
| Engineering Manager | - | dev, qa |
| Staff Engineer | - | dev |
| Art Director | - | design |
| Dev (IC) | - | qa*, design* |
| QA (IC) | - | dev* |
| Design (IC) | - | dev*, qa* |

*Peer consultation, not delegation

---

## Notes

1. **Dummy Agents**: Dev, QA, and Design ICs are currently dummy agents that output acknowledgment banners. Tests verify the invocation mechanism, not actual implementation work.

2. **Task Tool**: Leadership agents delegate to IC subagents using the Task tool with `subagent_type` parameter.

3. **Skill vs Subagent**: Each IC has both a skill (SKILL.md for `/dev` command) and a subagent (agent.md for Task tool delegation). The skill shows "AGENT INVOKED" while the subagent shows "SUBAGENT INVOKED".

4. **Model Configuration**: IC subagents are configured to use the "haiku" model for faster/cheaper execution in the delegation chain.
