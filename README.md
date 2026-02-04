# Product Development Team Agent System

> A complete AI-powered product development organization for Claude Code with workflow automation, specialized agents, and shared memory state management.

**Version:** 1.3.0
**Status:** Production Ready
**License:** MIT

---

## Table of Contents

- [What is This?](#what-is-this)
- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Available Workflows](#available-workflows)
- [Available Teams](#available-teams)
- [Available Agents](#available-agents)
- [Architecture](#architecture)
- [Shared Memory System](#shared-memory-system)
- [Development Workflow](#development-workflow)
- [Example Workflows](#example-workflows)
- [Testing](#testing)
- [Contributing](#contributing)

---

## What is This?

This is a **Claude Code skill system** that provides a complete product development organization within your IDE. It includes:

- **7 Workflow Skills** - From feature assessment to implementation
- **5 Team Skills** - Coordinated multi-agent collaboration
- **20 Individual Agents** - Specialized roles from CEO to QA
- **Shared Memory Layer** - Cross-agent state management with 99% test coverage
- **Supervisor System** - Monitors depth limits and prevents infinite loops
- **Structured Return Envelopes** - Type-safe agent communication

Use it to orchestrate complex product development workflows with AI agents that follow TDD/BDD practices, write tests before code, and maintain architectural standards.

---

## Features

### Workflow Automation
- **Feature Assessment** - Interactive evaluation with product and technical perspectives
- **Technical Assessment** - Architecture planning and technical feasibility
- **Security Review** - OWASP Top 10, authentication, data protection analysis
- **Accessibility Review** - WCAG 2.1 AA compliance verification
- **Design Review** - UI/UX evaluation and design system compliance
- **Code Review** - Technical quality, security, and standards verification
- **Implementation** - Full TDD cycle from tests to production-ready code

### Team Collaboration
- **Leadership Team** - CEO, CTO, Engineering Director for strategic decisions
- **Product Team** - Product Owner, Product Manager, Designer for requirements
- **Engineering Team** - Engineering Manager, Staff Engineer, Dev, QA for implementation
- **Design Team** - Art Director and Designer for UI/UX
- **Docs Team** - Technical Writer and API Designer for documentation

### Agent Specialization
- **20 specialized agents** with clear responsibilities and delegation patterns
- **Hierarchical organization** from executives to individual contributors
- **Peer consultation** - ICs can query each other without affecting delegation depth
- **Bounded delegation** - Maximum 3 levels prevents infinite chains
- **Loop prevention** - Automatic detection of circular delegation

### Shared State Management
- **TypeScript implementation** with 99% test coverage (49/49 tests passing)
- **Atomic writes** with automatic backups
- **Concurrent-safe** file locking mechanism
- **Query capabilities** by agent_id, workstream_id, or timestamp range
- **Graceful error handling** - Never throws, always returns structured results

---

## Quick Start

### 1. Install
```bash
git clone https://github.com/YOUR_USERNAME/miniature-guacamole.git
cd miniature-guacamole
npm install
```

### 2. Start Claude Code
```bash
claude
```

### 3. Use a Workflow
```
/feature-assessment Build a user authentication system
```

The workflow will guide you through feature evaluation, spawn expert agents (Product Owner, Product Manager, CTO), and provide a structured recommendation with next steps.

### 4. Execute with a Team
```
/engineering-team Execute WS-1: Add login endpoint
```

The team runs the full TDD cycle: QA writes tests → Dev implements → QA verifies → Staff Engineer reviews.

---

## Installation

### Option 1: Clone into Project (Recommended)
```bash
git clone https://github.com/YOUR_USERNAME/miniature-guacamole.git
cd miniature-guacamole
claude  # Start Claude Code - agents will be available
```

### Option 2: Add to Existing Project
```bash
cp -r /path/to/miniature-guacamole/.claude /path/to/your-project/
cd /path/to/your-project
claude
```

### Option 3: Install Globally
```bash
# Copy skills to user-level location
cp -r /path/to/miniature-guacamole/.claude/skills/* ~/.claude/skills/

# Copy agents to user-level location
cp -r /path/to/miniature-guacamole/.claude/agents/* ~/.claude/agents/

# Copy shared protocols
mkdir -p ~/.claude/shared
cp -r /path/to/miniature-guacamole/.claude/shared/* ~/.claude/shared/
```

### Verify Installation
```
/help
# Should show all available skills

/ceo
# Should invoke the CEO agent
```

### Requirements
- [Claude Code CLI](https://claude.ai/code) installed and authenticated
- Git (for cloning)
- Node.js 20+ and npm (for shared memory layer)

---

## Available Workflows

| Workflow | Slash Command | Purpose |
|----------|---------------|---------|
| **Feature Assessment** | `/feature-assessment` | Interactive feature evaluation with product/technical perspectives |
| **Technical Assessment** | `/technical-assessment` | Architecture planning and feasibility analysis |
| **Security Review** | `/security-review` | OWASP Top 10, authentication, data protection checks |
| **Accessibility Review** | `/accessibility-review` | WCAG 2.1 AA compliance verification |
| **Design Review** | `/design-review` | UI/UX evaluation and design system compliance |
| **Code Review** | `/code-review` | Technical quality, security, standards verification |
| **Implementation** | `/implement` | Execute TDD cycle: tests → code → verify → review |

### Workflow Example
```
/feature-assessment Add two-factor authentication

# Agent asks clarifying questions, then spawns:
# - product-owner for strategic fit
# - product-manager for scope breakdown
# - cto for technical feasibility

# Output: GO/NO-GO recommendation with next steps
```

---

## Available Teams

| Team | Slash Command | Members | Purpose |
|------|---------------|---------|---------|
| **Leadership Team** | `/leadership-team` | CEO, CTO, Engineering Director | Strategic decisions, executive reviews, code approvals |
| **Product Team** | `/product-team` | Product Owner, Product Manager, Designer | Product definition, requirements, UX specifications |
| **Engineering Team** | `/engineering-team` | Engineering Manager, Staff Engineer, Dev, QA | TDD/BDD development with 99% coverage |
| **Design Team** | `/design-team` | Art Director, Designer | UI/UX design and visual standards |
| **Docs Team** | `/docs-team` | Technical Writer, API Designer | Documentation and API specs |

### Team Example
```
/leadership-team Review WS-1 on branch feature/ws-1-login

# CEO: Business alignment check
# CTO: Technical quality review
# Engineering Director: Operational readiness

# Output: APPROVED or REQUEST CHANGES
```

---

## Available Agents

### Executive Level (Model: opus)
| Agent | Slash Command | Role |
|-------|---------------|------|
| **CEO** | `/ceo` | Sets business vision and strategic direction |
| **CTO** | `/cto` | Sets technical vision, evaluates architectures |
| **Engineering Director** | `/engineering-director` | Oversees engineering operations and delivery |

### Leadership Level (Model: sonnet)
| Agent | Slash Command | Role |
|-------|---------------|------|
| **Product Owner** | `/product-owner` | Owns product vision and backlog prioritization |
| **Product Manager** | `/product-manager` | Manages feature specs and coordination |
| **Engineering Manager** | `/engineering-manager` | Manages team execution and delivery |
| **Staff Engineer** | `/staff-engineer` | Technical leader, sets standards |
| **Art Director** | `/art-director` | Sets design vision and brand standards |

### Individual Contributors (Model: sonnet/haiku)
| Agent | Slash Command | Role |
|-------|---------------|------|
| **Senior Fullstack Engineer** | `/dev` | Implements with TDD, DRY, 99% coverage |
| **QA Engineer** | `/qa` | TDD/BDD tests, Playwright E2E, visual regression |
| **UI/UX Designer** | `/design` | Creates wireframes, mockups, interactions |
| **Security Engineer** | `/security-engineer` | Security reviews and threat modeling |
| **DevOps Engineer** | `/devops-engineer` | Infrastructure and deployment automation |
| **Data Engineer** | `/data-engineer` | Data pipelines and analytics |
| **API Designer** | `/api-designer` | API specifications and documentation |
| **Technical Writer** | `/technical-writer` | Documentation and guides |
| **Deployment Engineer** | `/deployment-engineer` | Handles merges and releases |

### System Agents
| Agent | Slash Command | Role |
|-------|---------------|------|
| **Supervisor** | `/supervisor` | Monitors depth limits, detects loops |

---

## Architecture

### Directory Structure
```
.claude/
├── skills/                      # Workflow and team slash commands
│   ├── feature-assessment/
│   ├── technical-assessment/
│   ├── security-review/
│   ├── accessibility-review/
│   ├── design-review/
│   ├── code-review/
│   ├── implement/
│   ├── leadership-team/
│   ├── product-team/
│   ├── engineering-team/
│   ├── design-team/
│   └── docs-team/
│
├── agents/                      # Subagent definitions (for Task tool)
│   ├── ceo/
│   ├── cto/
│   ├── dev/
│   ├── qa/
│   ├── design/
│   ├── security-engineer/
│   ├── technical-writer/
│   └── supervisor/
│
├── shared/                      # Shared protocols
│   ├── handoff-protocol.md     # Delegation specification
│   ├── development-workflow.md # TDD/BDD workflow
│   └── engineering-principles.md
│
└── memory/                      # Shared state (created at runtime)
    ├── shared.json
    ├── ws-1.json
    └── backups/

src/
├── memory/                      # Shared memory TypeScript layer
│   ├── config.ts               # Configuration
│   ├── types.ts                # TypeScript interfaces
│   ├── write.ts                # Write operations
│   ├── read.ts                 # Read operations
│   ├── query.ts                # Query operations
│   ├── validate.ts             # Format validation
│   ├── locking.ts              # File locking
│   ├── backup.ts               # Backup/recovery
│   └── errors.ts               # Error handling
│
├── returns/                     # Structured return envelopes
│   ├── types.ts
│   └── validate.ts
│
└── supervisor/                  # Depth/loop monitoring
    ├── depth.ts
    ├── loops.ts
    ├── escalation.ts
    └── control.ts
```

### Component Flow
```
┌─────────────────────────────────────────────────────────────┐
│                     User Invocation                          │
│                    (slash commands)                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   skills/<skill>/SKILL.md                    │
│                                                              │
│  - Loaded when user types /<skill-name>                     │
│  - Defines persona, tools, and behavior                     │
│  - Can spawn agents via Task tool                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
              (Task tool delegation)
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  agents/<agent>/agent.md                     │
│                                                              │
│  - Loaded when Task tool invokes subagent                   │
│  - Handles delegated work                                   │
│  - Can re-delegate (if depth < 3)                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Shared Memory Layer                        │
│                                                              │
│  - TypeScript modules in src/memory/                        │
│  - Atomic writes with backups                               │
│  - Query by agent_id, workstream_id, timestamp              │
└─────────────────────────────────────────────────────────────┘
```

### Delegation Model

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
    ┌───▼──┐ ┌─▼──┐ ┌──▼─┐
    │ Dev  │ │QA  │ │All │
    └──────┘ └────┘ └────┘
```

**Key Rules:**
- **Maximum depth: 3 levels** - Enforced by supervisor
- **No circular delegation** - Agents cannot delegate back up the chain
- **Peer consultation** - ICs can query each other without affecting depth
- **Structured handoffs** - All delegation uses the handoff protocol

---

## Shared Memory System

### Overview
The shared memory layer provides unified state management for all agents with:
- **99% test coverage** (49/49 tests passing)
- **Atomic writes** with automatic backups
- **File locking** for concurrent safety
- **Query capabilities** by agent, workstream, or time
- **Graceful error handling** - Never throws exceptions

### API Reference

```typescript
import { writeMemory, readMemory, queryMemory } from './src/memory';

// Write state
const result = await writeMemory({
  agent_id: 'dev',
  workstream_id: 'ws-1-auth',
  data: {
    feature: 'user-login',
    status: 'in-progress',
    coverage: 85
  }
});

// Read state
const memory = await readMemory();
console.log(memory.data);

// Query state
const entries = await queryMemory({
  agent_id: 'dev',
  workstream_id: 'ws-1-auth'
});
```

### File Structure
```
.claude/memory/
├── shared.json              # Primary shared state
├── ws-1.json               # Workstream-specific state
├── ws-2.json
└── backups/                # Automatic backups
    ├── shared.json.2026-02-04T10:00:00Z.bak
    └── shared.json.2026-02-04T11:00:00Z.bak
```

### Features
- Automatic timestamp generation
- Circular reference detection
- File locking for concurrent safety
- Automatic backup before writes
- Backup retention policy (7 days)
- Path sanitization
- UTF-8 encoding support
- Large file handling (up to 10MB)

See [src/memory/README.md](src/memory/README.md) for full documentation.

---

## Development Workflow

### The TDD/BDD Cycle
```
┌─────────────────┐
│ /leadership-    │  ← Executive Review + Workstream Plan
│     team        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ /engineering-   │  ← TDD Cycle: Tests → Code → Verify → Review
│     team        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ /leadership-    │  ← Code Review: APPROVE or REQUEST CHANGES
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
    ▼             │ (back to engineering-team)
┌─────────────────┐
│ /deployment-    │  ← Merge to main
│   engineer      │
└─────────────────┘
```

### Workflow Steps

**1. Plan the work**
```
/leadership-team Build a user authentication system
```
Output: Executive Review + Workstreams (WS-1, WS-2, etc.)

**2. Execute a workstream**
```
/engineering-team Execute workstream WS-1: Add login endpoint
```
This runs: QA writes tests → Dev implements → QA verifies → Staff Eng reviews

**3. Leadership reviews**
```
/leadership-team Review workstream WS-1 on branch feature/ws-1-login
```
Output: APPROVED or REQUEST CHANGES

**4. Merge (after approval)**
```
/deployment-engineer Merge feature/ws-1-login
```

---

## Example Workflows

### Example 1: Feature Assessment
```
User: /feature-assessment Add two-factor authentication

Agent: [Asks clarifying questions]
- What problem does this solve?
- Who are the users?
- What defines success?

User: [Provides context]

Agent: [Spawns expert evaluations]
- product-owner: Strategic fit assessment
- product-manager: Scope breakdown and user stories
- cto: Technical feasibility analysis

Agent: [Synthesizes recommendation]

Output:
## Feature Assessment: Two-Factor Authentication

### Recommendation: GO

### Next Steps
- [ ] /technical-assessment for architecture planning
- [ ] /design-review for UX planning
- [ ] Assign to /product-team for detailed spec
```

### Example 2: Full Implementation Cycle
```
User: /leadership-team Build user authentication

Leadership: [Creates workstreams]
- WS-1: Login endpoint
- WS-2: Password hashing
- WS-3: Session management

User: /implement WS-1

Implement Skill:
1. Spawns qa → writes failing tests
2. Spawns dev → implements code to pass tests
3. Spawns qa → verifies all tests pass + 99% coverage
4. Spawns staff-engineer → code review

Output: Ready for leadership review

User: /leadership-team Review WS-1 on branch feature/ws-1-login

Leadership: APPROVED

User: /deployment-engineer Merge feature/ws-1-login

Deployment: Merged to main
```

### Example 3: Peer Consultation
```
User: /dev Implement OAuth2 integration

Dev: [Consults security-engineer for best practices]
Dev: [Consults qa for test strategy]
Dev: [Implements with feedback]

Output: OAuth2 implementation with security review and test plan
```

---

## Testing

### Run Tests
```bash
# Install dependencies
npm install

# Run all tests (49 unit + integration tests)
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Results
```
Test Files  2 passed (2)
     Tests  49 passed (49)
  Coverage  99%+
```

### Test Suites
- **Unit Tests** (18 tests) - Memory layer functions
- **Integration Tests** (31 tests) - Cross-agent communication
- **E2E Tests** (Playwright) - Workflow automation

See [tests/README.md](tests/README.md) for detailed testing documentation.

---

## Contributing

### Adding a New Agent
1. Create `SKILL.md` in `.claude/skills/<agent-name>/`
2. If IC agent, also create `agent.md` in `.claude/agents/<agent-name>/`
3. Update hierarchy in relevant documentation
4. Add tests for delegation patterns

### Adding a New Workflow
1. Create `.claude/skills/<workflow-name>/SKILL.md`
2. Define workflow steps and agent spawning logic
3. Document memory protocol (read/write paths)
4. Add examples to documentation

### Modifying Hierarchy
1. Update `.claude/shared/handoff-protocol.md`
2. Update relevant SKILL.md files
3. Test delegation chains work correctly
4. Update architecture diagrams

### Code Standards
- **TDD/BDD** - Tests before code
- **99% coverage** - No exceptions
- **DRY** - Extract duplication immediately
- **Config over composition** - Prefer configuration objects
- **Type-safe** - Full TypeScript with strict mode

---

## License

MIT

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.3.0 | 2026-02-04 | Added design-team, docs-team, 7 workflow skills, shared memory layer (99% coverage), supervisor system |
| 1.2.0 | 2026-02-04 | Added TDD/BDD workflow, Git workstreams, deployment-engineer |
| 1.1.0 | 2026-02-04 | Added composite team skills (leadership-team, product-team, engineering-team) |
| 1.0.0 | 2026-02-04 | Initial release with 11 agents and delegation system |

---

## Documentation Index

- **Quick Start**: This file (README.md)
- **Agent System**: [.claude/README.md](.claude/README.md)
- **Handoff Protocol**: [.claude/shared/handoff-protocol.md](.claude/shared/handoff-protocol.md)
- **Development Workflow**: [.claude/shared/development-workflow.md](.claude/shared/development-workflow.md)
- **Shared Memory API**: [src/memory/README.md](src/memory/README.md)
- **Test Guide**: [tests/README.md](tests/README.md)
- **Implementation Plan**: [.claude/PLAN.md](.claude/PLAN.md)

---

**Built with Claude Code** | [Report Issues](https://github.com/YOUR_USERNAME/miniature-guacamole/issues) | [Documentation](.claude/README.md)
