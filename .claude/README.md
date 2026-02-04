# Product Development Team Agent System

> A simulated product development organization with 11 specialized AI agents representing leadership and individual contributor roles.

**Version:** 1.0.0
**Last Updated:** 2026-02-04
**Status:** Active

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Agent Roster](#agent-roster)
4. [Delegation Model](#delegation-model)
5. [Configuration](#configuration)
6. [Testing](#testing)
7. [Architecture](#architecture)

---

## Overview

This agent system simulates a complete product development organization within Claude Code. It provides 11 specialized agents organized in a realistic corporate hierarchy, enabling:

- **Strategic Planning** - Executive agents (CEO, CTO) for high-level decisions
- **Product Management** - Product Owner and Product Manager for requirements and backlog
- **Engineering Leadership** - Engineering Director, Engineering Manager, and Staff Engineer for technical direction
- **Design Direction** - Art Director for visual and brand guidance
- **Implementation** - Developer, QA, and Designer ICs for hands-on work

The system supports structured delegation between agents with depth tracking and loop prevention, allowing complex workflows to be orchestrated across the team.

### Key Features

- **Hierarchical Delegation** - Work flows naturally from executives to ICs
- **Bounded Depth** - Maximum 3 levels of delegation prevents infinite chains
- **Peer Consultation** - ICs can query each other without affecting delegation depth
- **Structured Handoffs** - Formal protocol ensures context is passed correctly

---

## Quick Start

### Invoking an Agent

Use slash commands to invoke any agent:

```
/ceo Review the Q4 product strategy
/cto Evaluate our microservices architecture
/dev Implement the user authentication feature
```

### Basic Workflow Example

1. **Start with leadership** - Invoke a leadership agent with a high-level task:
   ```
   /product-owner Define requirements for the new checkout flow
   ```

2. **Delegate to ICs** - Leadership agents can delegate implementation work:
   ```
   The Product Owner can delegate to Product Manager, who delegates to dev/qa/design
   ```

3. **Consult peers** - ICs can consult with each other:
   ```
   Developer consults QA for testing guidance
   Designer consults Developer for implementation feasibility
   ```

### Passing Arguments

All agents accept arguments after the slash command:

```
/engineering-manager Assign the authentication epic to the team
/qa Test the login flow for edge cases
/design Create mockups for the dashboard redesign
```

---

## Agent Roster

### Executive Level

| Agent | Slash Command | Model | Role | Direct Reports |
|-------|---------------|-------|------|----------------|
| **CEO** | `/ceo` | opus | Sets business vision and strategic direction | CTO, Engineering Director, Product Owner, Art Director |
| **CTO** | `/cto` | opus | Sets technical vision, evaluates architectures | Engineering Director, Staff Engineer |
| **Engineering Director** | `/engineering-director` | sonnet | Oversees engineering operations and delivery | Engineering Manager, Staff Engineer |

### Leadership Level

| Agent | Slash Command | Model | Role | Direct Reports |
|-------|---------------|-------|------|----------------|
| **Product Owner** | `/product-owner` | sonnet | Owns product vision and backlog prioritization | Product Manager |
| **Product Manager** | `/product-manager` | sonnet | Manages feature specs and cross-functional coordination | - |
| **Engineering Manager** | `/engineering-manager` | sonnet | Manages team execution and delivery | Dev, QA |
| **Staff Engineer** | `/staff-engineer` | sonnet | Technical leader, sets standards | Dev |
| **Art Director** | `/art-director` | sonnet | Sets design vision and brand standards | Design |

### Individual Contributor (IC) Level

| Agent | Slash Command | Model | Role | Can Consult |
|-------|---------------|-------|------|-------------|
| **Developer** | `/dev` | haiku | Implements features and writes code | QA, Design |
| **QA Engineer** | `/qa` | haiku | Tests features and ensures quality | Dev |
| **Designer** | `/design` | haiku | Creates UI/UX designs and visual assets | Dev, QA |

### Tool Access by Agent

| Agent | Read | Glob | Grep | Edit | Write |
|-------|------|------|------|------|-------|
| CEO | - | - | - | - | - |
| CTO | Yes | Yes | Yes | Yes | Yes |
| Engineering Director | - | - | - | - | - |
| Product Owner | - | - | - | - | - |
| Product Manager | Yes | Yes | Yes | - | - |
| Engineering Manager | Yes | Yes | Yes | Yes | Yes |
| Staff Engineer | Yes | Yes | Yes | Yes | Yes |
| Art Director | - | - | - | - | - |
| Dev | Yes | Yes | Yes | Yes | Yes |
| QA | Yes | Yes | Yes | Yes | Yes |
| Design | Yes | Yes | Yes | - | - |

---

## Delegation Model

### Hierarchy Overview

```
                    ┌─────────┐
                    │   CEO   │
                    └────┬────┘
         ┌───────────┬───┴───┬───────────┐
         │           │       │           │
    ┌────▼───┐  ┌────▼───┐ ┌─▼──┐  ┌─────▼─────┐
    │  CTO   │  │Eng Dir │ │ PO │  │Art Director│
    └───┬────┘  └───┬────┘ └─┬──┘  └─────┬─────┘
        │           │        │           │
   ┌────▼────┐ ┌────▼───┐ ┌──▼──┐   ┌────▼────┐
   │Staff Eng│ │Eng Mgr │ │ PM  │   │ Design  │
   └────┬────┘ └───┬────┘ └──┬──┘   └─────────┘
        │      ┌───┴───┐     │
        │      │       │     │
    ┌───▼──┐ ┌─▼──┐ ┌──▼─┐ ┌─▼─┐
    │ Dev  │ │Dev │ │ QA │ │All│
    └──────┘ └────┘ └────┘ └───┘
```

### Delegation Authority Matrix

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

*Peer consultation only (does not count toward delegation depth)

### Delegation vs Consultation

| Aspect | Delegation | Consultation |
|--------|------------|--------------|
| **Purpose** | Transfer task ownership | Request information/opinion |
| **Depth Impact** | Increments depth counter | Does NOT increment depth |
| **Re-delegation** | Delegate may re-delegate | Consultant CANNOT re-delegate |
| **Ownership** | Transfers to delegate | Remains with requester |

### Depth Limits

- **Maximum depth: 3 levels**
- Depth 1: Primary agent delegates to first delegate
- Depth 2: First delegate re-delegates to second delegate
- Depth 3: Second delegate re-delegates to third delegate (TERMINAL - cannot delegate further)

### Loop Prevention

The system prevents circular delegation:
- Agents cannot delegate back to any agent already in the chain
- Agents cannot delegate to themselves
- Consultation bypasses loop checks (fire-and-forget model)

---

## Configuration

### File Locations

| Purpose | Path |
|---------|------|
| Team Configuration | `.claude/team-config.json` |
| Handoff Protocol | `.claude/shared/handoff-protocol.md` |
| Skill Definitions | `.claude/skills/<agent>/SKILL.md` |
| Subagent Definitions | `.claude/agents/<agent>/agent.md` |
| Test Matrix | `.claude/tests/test-matrix.md` |

### team-config.json

The central configuration file defines:

- **Organization metadata** - Team name and description
- **Hierarchy levels** - executive, leadership, ic
- **Role definitions** - Each agent's title, reporting structure, and direct reports

Example structure:
```json
{
  "organization": {
    "name": "Product Development Team",
    "description": "A simulated product development organization..."
  },
  "hierarchy": {
    "executive": ["ceo", "cto", "engineering-director"],
    "leadership": ["product-owner", "product-manager", ...],
    "ic": ["dev", "qa", "design"]
  },
  "roles": {
    "ceo": {
      "title": "Chief Executive Officer",
      "reports_to": null,
      "direct_reports": ["cto", "engineering-director", ...]
    }
    // ... additional roles
  }
}
```

### Skill Definition Format (SKILL.md)

Skills define slash command behavior:

```yaml
---
name: agent-name
description: One-line description
model: opus | sonnet | haiku
tools: Read, Glob, Grep, Edit, Write  # Optional
---

[Agent persona and instructions]

$ARGUMENTS  # Placeholder for user-provided arguments
```

### Subagent Definition Format (agent.md)

Subagents are invoked via the Task tool for delegation:

```yaml
---
name: agent-name
description: One-line description
tools: Read, Glob, Grep, Edit, Write
model: haiku
---

[Agent behavior when invoked as subagent]
```

---

## Testing

### Test Matrix Location

`.claude/tests/test-matrix.md`

### Test Categories

| Category | Code | Description | Tests |
|----------|------|-------------|-------|
| Direct Invocation | DI | Each slash command loads correctly | 11 |
| Argument Passing | AP | $ARGUMENTS substitution works | 14 |
| Delegation Chain | DC | Leadership delegates to ICs via Task tool | 22 |
| Peer Consultation | PC | IC agents consult with peers | 8 |
| Error Handling | EH | Edge cases and invalid inputs | 5 |
| Subagent Config | SC | Tool and model configuration | 6 |

**Total: 66 tests**

### Priority Breakdown

| Priority | Count | Description |
|----------|-------|-------------|
| P0 | 30 | Critical - System non-functional without |
| P1 | 22 | High - Core functionality |
| P2 | 13 | Medium - Important but not blocking |
| P3 | 1 | Low - Nice to have |

### Running Tests

Tests are executed manually by invoking agents and verifying expected behavior:

1. **Direct Invocation Test**
   ```
   /dev
   # Expected: DEV AGENT INVOKED banner
   ```

2. **Argument Passing Test**
   ```
   /qa Test login flow
   # Expected: Task Received shows "Test login flow"
   ```

3. **Delegation Chain Test**
   ```
   /engineering-manager Assign auth tasks
   # Then ask EM to delegate to dev
   # Expected: Dev subagent invoked with task
   ```

### Acceptance Criteria

**Minimum Viable (All P0 tests pass):**
- All 11 slash commands load successfully
- All agents receive and display arguments correctly
- Core delegation chains work

**Full Acceptance (All P0 + P1 tests pass):**
- Extended delegation chains work
- Peer consultations work
- Basic error handling works
- Subagent configurations correct

---

## Architecture

### Directory Structure

```
.claude/
├── README.md                    # This documentation
├── PLAN.md                      # Implementation plan
├── team-config.json             # Central team configuration
│
├── skills/                      # Slash command definitions
│   ├── ceo/
│   │   └── SKILL.md            # CEO agent skill
│   ├── cto/
│   │   └── SKILL.md            # CTO agent skill
│   ├── engineering-director/
│   │   └── SKILL.md
│   ├── product-owner/
│   │   └── SKILL.md
│   ├── product-manager/
│   │   └── SKILL.md
│   ├── engineering-manager/
│   │   └── SKILL.md
│   ├── staff-engineer/
│   │   └── SKILL.md
│   ├── art-director/
│   │   └── SKILL.md
│   ├── dev/
│   │   └── SKILL.md
│   ├── qa/
│   │   └── SKILL.md
│   └── design/
│       └── SKILL.md
│
├── agents/                      # Subagent definitions (for Task tool)
│   ├── dev/
│   │   └── agent.md            # Dev subagent configuration
│   ├── qa/
│   │   └── agent.md            # QA subagent configuration
│   └── design/
│       └── agent.md            # Design subagent configuration
│
├── shared/                      # Shared protocols and documentation
│   └── handoff-protocol.md     # Delegation protocol specification
│
└── tests/                       # Test documentation
    └── test-matrix.md          # Comprehensive test matrix
```

### Component Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                     User Invocation                          │
│                    (slash commands)                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   skills/<agent>/SKILL.md                    │
│                                                              │
│  - Loaded when user types /<agent-name>                     │
│  - Defines persona, tools, and behavior                     │
│  - $ARGUMENTS replaced with user input                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
              (Task tool delegation)
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  agents/<agent>/agent.md                     │
│                                                              │
│  - Loaded when Task tool invokes subagent                   │
│  - IC agents only (dev, qa, design)                         │
│  - Handles delegated work from leadership                   │
└─────────────────────────────────────────────────────────────┘
```

### Model Selection Strategy

| Tier | Model | Agents | Rationale |
|------|-------|--------|-----------|
| Executive | opus | CEO, CTO | Complex strategic decisions require highest capability |
| Leadership | sonnet | ED, PO, PM, EM, SE, AD | Balanced capability for coordination and planning |
| IC | haiku | Dev, QA, Design | Fast/efficient for task execution in delegation chains |

---

## Handoff Protocol Reference

The complete handoff protocol is documented in `.claude/shared/handoff-protocol.md`. Key elements:

### Delegation Request Envelope

```yaml
handoff:
  id: "<uuid>"
  type: "delegation" | "consultation"
  chain:
    depth: <1-3>
    max_depth: 3
    path: [<agents in chain>]
  task:
    objective: "<goal>"
    success_criteria: [<criteria>]
    deliverable: "<expected output>"
  context:
    essential: [<key facts>]
    references: [<file paths, decisions>]
```

### Delegation Response Envelope

```yaml
handoff_response:
  request_id: "<uuid>"
  status: "completed" | "partial" | "failed" | "escalated"
  result:
    summary: "<executive summary>"
    deliverable: <output>
    confidence: "high" | "medium" | "low"
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-04 | Initial documentation |

---

## Contributing

When modifying this system:

1. **Adding a new agent** - Create SKILL.md in `skills/<agent-name>/`
2. **Adding a new IC subagent** - Also create agent.md in `agents/<agent-name>/`
3. **Modifying hierarchy** - Update `team-config.json` and relevant SKILL.md files
4. **Adding tests** - Update `tests/test-matrix.md`

Always ensure the handoff protocol is followed for any delegation-capable agents.
