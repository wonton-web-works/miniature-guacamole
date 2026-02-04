# Product Development Team - Agent System Plan

## Objective
Create a set of agents representing a product development organization that can be loaded into Claude CLI and orchestrated via slash commands.

## Proposed Architecture

### Directory Structure
```
.claude/
├── skills/                    # Slash commands for each role
│   ├── ceo/SKILL.md
│   ├── cto/SKILL.md
│   ├── engineering-director/SKILL.md
│   ├── product-owner/SKILL.md
│   ├── product-manager/SKILL.md
│   ├── engineering-manager/SKILL.md
│   ├── staff-engineer/SKILL.md
│   ├── art-director/SKILL.md
│   ├── dev/SKILL.md
│   ├── qa/SKILL.md
│   └── design/SKILL.md
│
├── agents/                    # Subagents for chaining (ICs only)
│   ├── dev/agent.md
│   ├── qa/agent.md
│   └── design/agent.md
│
├── team-config.json           # Org structure and delegation rules
└── PLAN.md                    # This file
```

### Role Definitions

#### Executive Leadership
| Role | Responsibility | Can Delegate To |
|------|----------------|-----------------|
| CEO | Business vision, strategic decisions | CTO, Engineering Director, PO, Art Director |
| CTO | Technical vision, architecture | Engineering Director, Staff Engineer, Dev |
| Engineering Director | Engineering operations, delivery | EM, Staff Engineer |

#### Leadership
| Role | Responsibility | Can Delegate To |
|------|----------------|-----------------|
| Product Owner | Product vision, backlog prioritization | PM |
| Product Manager | Feature specs, requirements | Dev, QA, Design |
| Engineering Manager | Team execution, process | Dev, QA |
| Staff Engineer | Technical standards, mentorship | Dev |
| Art Director | Design vision, brand | Design |

#### Individual Contributors (Dummy agents for testing)
| Role | Responsibility | Can Consult |
|------|----------------|-------------|
| Dev | Implementation | QA, Design |
| QA | Testing, quality | Dev |
| Design | UI/UX design | Dev, QA |

### Collaboration Model (Hybrid)
1. **Leadership dispatches**: Leadership agents use Task tool to invoke IC subagents
2. **IC consultation**: ICs can consult peer subagents for input
3. **User orchestration**: User can invoke any agent directly via slash command

### IC Dummy Agent Behavior
For initial testing, IC agents will simply output:
- Their role name
- That they were invoked
- The task they received
- A mock acknowledgment

This allows testing the chain of command without full implementation.

## Implementation Phases

### Phase 1: Foundation
- Create directory structure
- Create team-config.json
- Create IC dummy agents (dev, qa, design) as both skills and subagents

### Phase 2: Leadership Agents
- Create leadership skills (PO, PM, EM, Staff, Art Director)
- Wire up delegation to IC subagents

### Phase 3: Executive Agents
- Create executive skills (CEO, CTO, Engineering Director)
- Wire up delegation to leadership and ICs

### Phase 4: Testing
- Test direct invocation of each agent
- Test delegation chains
- Test IC peer consultation

## Open Questions for Team Review
1. Should all agents have access to read files, or only certain roles?
2. What model should each tier use (opus/sonnet/haiku)?
3. Should ICs be able to escalate back to leadership?
4. How verbose should agent outputs be?

---

**Status**: Draft - Awaiting team review
