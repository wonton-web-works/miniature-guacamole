# Product Development Team Agent System

> A product development organization with 19 specialized AI agents, 16 collaborative skills, and a disciplined TDD/BDD development workflow with Git workstreams.

**Version:** 1.0.0
**Last Updated:** 2026-02-10
**Status:** Active

---

## Table of Contents

1. [Installation](#installation)
2. [Overview](#overview)
3. [Quick Start](#quick-start)
4. [Development Workflow](#development-workflow)
5. [Agent Roster](#agent-roster)
6. [Delegation Model](#delegation-model)
7. [Configuration](#configuration)
8. [Testing](#testing)
9. [Architecture](#architecture)

---

## Installation

This `.claude/` directory is installed into your project by the miniature-guacamole installer.

### Installation Methods

**Recommended: Use the installer**
```bash
# Install from GitHub release
curl -o- https://raw.githubusercontent.com/RivermarkResearch/miniature-guacamole/main/install.sh | bash -s -- /path/to/your-project

# Or clone and install locally
git clone https://github.com/RivermarkResearch/miniature-guacamole.git
cd miniature-guacamole
./install.sh /path/to/your-project
```

### What Gets Installed

- **agents/** - 19 specialized agent roles
- **skills/** - 16 team collaboration workflows (all with mg- prefix)
- **shared/** - 6 protocol documents
- **scripts/** - 11 mg-* utility commands
- **hooks/** - Project initialization and safety checks
- **memory/** - Agent memory directory (gitignored)
- **settings.json** - Project-level permissions
- **CLAUDE.md** - Framework documentation

### Verify Installation

After installation, start Claude Code and verify:

```bash
cd /path/to/your-project
claude

# Test a skill
/mg-leadership-team

# Test a script
.claude/scripts/mg-help
```

### Requirements

- [Claude Code CLI](https://claude.ai/code) installed and authenticated
- Git (for workstreams and version control)
- Bash (for utility scripts)

---

## Overview

This agent system simulates a complete product development organization within Claude Code. It provides 19 specialized agents organized in a realistic corporate hierarchy, enabling:

- **Strategic Planning** - Executive agents (CEO, CTO) for high-level decisions
- **Product Management** - Product Owner and Product Manager for requirements and backlog
- **Engineering Leadership** - Engineering Director, Engineering Manager, and Staff Engineer for technical direction
- **Design Direction** - Art Director for visual and brand guidance
- **Implementation** - Developer, QA, Designer, DevOps, Security, Data, and Documentation ICs for hands-on work

The system supports structured delegation between agents with depth tracking and loop prevention, allowing complex workflows to be orchestrated across the team. All workflows are project-local with complete data isolation.

### Key Features

- **TDD/BDD Workflow** - Tests written before code, cyclical development process
- **Git Workstreams** - Each feature in its own branch with structured merge process
- **Executive Reviews** - Leadership team approves all work before merge
- **Hierarchical Delegation** - Work flows naturally from executives to ICs
- **Bounded Depth** - Maximum 3 levels of delegation prevents infinite chains
- **Peer Consultation** - ICs can query each other without affecting delegation depth
- **Structured Handoffs** - Formal protocol ensures context is passed correctly

---

## Quick Start

### Initialize Your Project

After installation, initialize your project memory structure:

```bash
.claude/scripts/mg-init
```

This creates:
- `.claude/memory/` - Agent task queues, decisions, and handoffs
- Updates `.gitignore` - Excludes memory files from version control

### Invoking a Skill

Use slash commands to invoke collaborative workflows:

```
/mg-leadership-team Evaluate whether we should build vs buy for payments
/mg-build Execute workstream WS-1: Add login endpoint
/mg-code-review Review PR-123
/mg-design Create mockups for dashboard redesign
```

### Invoking an Agent Directly

You can also invoke individual agents:

```
/ceo Review the Q4 product strategy
/cto Evaluate our microservices architecture
/dev Implement the user authentication feature
```

### Basic Workflow Example

1. **Plan the work**:
   ```
   /mg-leadership-team Build a user authentication system
   ```
   Output: Executive Review + Workstreams (WS-1, WS-2, etc.)

2. **Execute a workstream**:
   ```
   /mg-build Execute workstream WS-1: Add login endpoint
   ```
   This runs: QA writes tests → Dev implements → QA verifies → Staff Eng reviews

3. **Leadership reviews**:
   ```
   /mg-leadership-team Review workstream WS-1 on branch feature/ws-1-login
   ```
   Output: APPROVED or REQUEST CHANGES

4. **Merge** (after approval):
   ```
   /deployment-engineer Merge feature/ws-1-login
   ```

### Passing Arguments

All skills and agents accept arguments after the slash command:

```
/mg-build Execute workstream WS-1
/mg-code-review Review PR-123
/engineering-manager Assign the authentication epic to the team
```

---

## Development Workflow

The system uses a **TDD/BDD cyclical workflow** with Git workstreams. See `.claude/shared/development-workflow.md` for full details.

### The Cycle

```
┌─────────────────┐
│ /mg-leadership- │  ← Executive Review + Workstream Plan
│     team        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ /mg-build       │  ← TDD Cycle: Tests → Code → Verify → Review
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ /mg-leadership- │  ← Code Review: APPROVE or REQUEST CHANGES
│     team        │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌──────────────┐
│APPROVE│  │REQUEST CHANGES│
└───┬───┘  └──────┬───────┘
    │             │
    ▼             │ (back to mg-build)
┌─────────────────┐
│ /deployment-    │  ← Merge to main
│   engineer      │
└─────────────────┘
```

### Example Workflow

1. **Plan the work:**
   ```
   /mg-leadership-team Build a user authentication system
   ```
   Output: Executive Review + Workstreams (WS-1, WS-2, etc.)

2. **Execute a workstream:**
   ```
   /mg-build Execute workstream WS-1: Add login endpoint
   ```
   This runs: QA writes tests → Dev implements → QA verifies → Staff Eng reviews

3. **Leadership reviews:**
   ```
   /mg-leadership-team Review workstream WS-1 on branch feature/ws-1-login
   ```
   Output: APPROVED or REQUEST CHANGES

4. **Merge (after approval):**
   ```
   /deployment-engineer Merge feature/ws-1-login
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
| **Senior Fullstack Engineer** | `/dev` | sonnet | Implements with TDD, DRY, config-over-composition, 99% coverage | QA, Design |
| **QA Engineer** | `/qa` | sonnet | TDD/BDD tests, Playwright E2E, visual regression screenshots | Dev, Design |
| **UI/UX Designer** | `/design` | sonnet | Creates wireframes, mockups, and interaction designs | Dev, QA |
| **Technical Writer** | `/technical-writer` | sonnet | User guides, tutorials, and end-user documentation | Dev, QA |
| **Docs Writer** | `/docs-writer` | sonnet | Technical documentation and API references | Dev, QA |
| **DevOps Engineer** | `/devops` | sonnet | Infrastructure automation and deployment pipelines | Dev, Security |
| **Security Engineer** | `/security-engineer` | sonnet | Security audits, vulnerability scanning, threat modeling | Dev, DevOps |
| **Data Engineer** | `/data-engineer` | sonnet | Data pipelines, analytics infrastructure, ETL workflows | Dev, QA |

### Operations Level

| Agent | Slash Command | Model | Role |
|-------|---------------|-------|------|
| **Deployment Engineer** | `/deployment-engineer` | sonnet | Handles merges and releases after leadership approval |
| **Supervisor** | `/supervisor` | haiku | Monitors depth limits, detects loops, triggers escalations |

### Available Skills (16 Total)

All skills use the `mg-` prefix for consistency:

| Skill | Slash Command | Purpose |
|-------|---------------|---------|
| **Accessibility Review** | `/mg-accessibility-review` | WCAG compliance and inclusive design workflow |
| **Add Context** | `/mg-add-context` | Cross-project context references |
| **Assess** | `/mg-assess` | Product assessment and discovery |
| **Assess Tech** | `/mg-assess-tech` | Technical feasibility analysis |
| **Build** | `/mg-build` | TDD/BDD development cycle from tests to production |
| **Code Review** | `/mg-code-review` | Implementation quality review workflow |
| **Debug** | `/mg-debug` | Structured debugging workflow |
| **Design** | `/mg-design` | Visual design and frontend implementation |
| **Design Review** | `/mg-design-review` | Visual quality and UX assessment workflow |
| **Document** | `/mg-document` | Documentation generation and review |
| **Init** | `/mg-init` | Project initialization for agent collaboration |
| **Leadership Team** | `/mg-leadership-team` | Executive collaboration and strategic decisions |
| **Refactor** | `/mg-refactor` | TDD-safe refactoring workflow |
| **Security Review** | `/mg-security-review` | Security audits and vulnerability assessments |
| **Spec** | `/mg-spec` | Product definition and requirements |
| **Write** | `/mg-write` | Brand-aligned copywriting workflow |

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
| 1.0.0 | 2026-02-10 | **Project-Local Architecture** - Each project has own `.claude/` directory. 19 agents, 16 mg-prefixed skills. Complete data isolation. TDD/BDD workflow with Git workstreams. 99% coverage requirement. |

---

## Contributing

When modifying this system:

1. **Adding a new agent** - Create SKILL.md in `skills/<agent-name>/`
2. **Adding a new IC subagent** - Also create agent.md in `agents/<agent-name>/`
3. **Modifying hierarchy** - Update `team-config.json` and relevant SKILL.md files
4. **Adding tests** - Update `tests/test-matrix.md`

Always ensure the handoff protocol is followed for any delegation-capable agents.
