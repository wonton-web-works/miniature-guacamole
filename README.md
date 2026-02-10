# miniature-guacamole: Product Development Team Agent System

> A complete AI-powered product development organization for Claude Code with workflow automation, specialized agents, and project-local architecture.

**Version:** 1.0.0
**Status:** Production Ready
**License:** MIT

---

## What's New in v1.0.0

**Action-Based Skill System** (February 2026):
- All 16 skills renamed with `mg-` prefix for brand coherence
- `/engineering-team` + `/implement` merged into single `/mg-build` skill
- 2 new skills: `/mg-debug` (structured debugging) and `/mg-refactor` (TDD-safe refactoring)
- Hard cutover — old skill names no longer work
- Spawn cap of 6 agents enforced on all skills

**Breaking Changes from pre-release**:
- All skill names changed (e.g. `/leadership-team` → `/mg-leadership-team`, `/code-review` → `/mg-code-review`)
- `/engineering-team` and `/implement` removed, replaced by `/mg-build`
- No backwards compatibility aliases — update all references

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
- [Migration from v1.x](#migration-from-v1x)
- [Contributing](#contributing)

---

## What is This?

This is a **Claude Code skill system** that provides a complete product development organization within your IDE. It includes:

- **16 Skills** - From feature assessment to implementation
- **19 Specialized Agents** - Specialized roles from CEO to QA
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
- **19 specialized agents** with clear responsibilities and delegation patterns
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

### 1. Build Distribution
```bash
git clone https://github.com/RivermarkResearch/miniature-guacamole.git
cd miniature-guacamole
npm install
./scripts/build-dist.sh
```

### 2. Install to Your Project
```bash
cd /path/to/your-project
/path/to/miniature-guacamole/dist/miniature-guacamole/install.sh
```

This creates `.claude/` in your project with all agents, skills, protocols, and scripts.

### 3. Start Claude Code
```bash
claude
```

### 4. Use a Workflow
```
/mg-assess Build a user authentication system
```

The workflow will guide you through feature evaluation, spawn expert agents (Product Owner, Product Manager, CTO), and provide a structured recommendation with next steps.

### 5. Execute with a Team
```
/mg-build Execute WS-1: Add login endpoint
```

The team runs the full TDD cycle: QA writes tests → Dev implements → QA verifies → Staff Engineer reviews.

---

## Installation

### Quick Start

```bash
# Clone the repository
git clone https://github.com/RivermarkResearch/miniature-guacamole.git
cd miniature-guacamole

# Build the distribution
./build.sh

# Install to a project
dist/miniature-guacamole/install.sh /path/to/your-project
# Or install to current directory
cd /path/to/your-project
/path/to/miniature-guacamole/dist/miniature-guacamole/install.sh
```

### Installation from GitHub Releases

```bash
# Download latest release
curl -fsSL https://github.com/RivermarkResearch/miniature-guacamole/releases/latest/download/miniature-guacamole.tar.gz -o mg.tar.gz
tar -xzf mg.tar.gz
cd miniature-guacamole

# Install to your project
./install.sh /path/to/your-project
```

### What Gets Installed

The installer creates a `.claude/` directory in your project with:
- **agents/** - 19 specialized agent roles
- **skills/** - 16 team collaboration workflows
- **shared/** - 6 protocol documents
- **scripts/** - 10 mg-* utility commands
- **hooks/** - Project initialization and safety checks
- **memory/** - Agent memory directory (gitignored)
- **settings.json** - Project-level permissions
- **CLAUDE.md** - Framework documentation

### Verify Installation

```bash
# Check directory structure
ls .claude/

# List available agents
ls .claude/agents/

# Test a script
.claude/scripts/mg-help

# Start Claude Code
claude
```

In Claude Code:

```
/help
# Should show all available skills

/ceo
# Should invoke the CEO agent
```

### Requirements
- [Claude Code CLI](https://claude.ai/code) installed and authenticated
- Git (for cloning the repository)
- Bash 4.0+ (for installation scripts)
- Python 3.6+ (for JSON processing in scripts)
- Node.js 20+ and npm (optional, for TypeScript memory layer development)

---

## Available Workflows

| Workflow | Slash Command | Purpose |
|----------|---------------|---------|
| **Feature Assessment** | `/mg-assess` | Interactive feature evaluation with product/technical perspectives |
| **Technical Assessment** | `/mg-assess-tech` | Architecture planning and feasibility analysis |
| **Security Review** | `/mg-security-review` | OWASP Top 10, authentication, data protection checks |
| **Accessibility Review** | `/mg-accessibility-review` | WCAG 2.1 AA compliance verification |
| **Design Review** | `/mg-design-review` | UI/UX evaluation and design system compliance |
| **Code Review** | `/mg-code-review` | Technical quality, security, standards verification |
| **Implementation** | `/mg-build` | Execute TDD cycle: tests → code → verify → review |

### Workflow Example
```
/mg-assess Add two-factor authentication

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
| **Leadership Team** | `/mg-leadership-team` | CEO, CTO, Engineering Director | Strategic decisions, executive reviews, code approvals |
| **Product Team** | `/mg-spec` | Product Owner, Product Manager, Designer | Product definition, requirements, UX specifications |
| **Engineering Team** | `/mg-build` | Engineering Manager, Staff Engineer, Dev, QA | TDD/BDD development with 99% coverage |
| **Design Team** | `/mg-design` | Art Director, Designer | UI/UX design and visual standards |
| **Docs Team** | `/mg-document` | Technical Writer, API Designer | Documentation and API specs |

### Team Example
```
/mg-leadership-team Review WS-1 on branch feature/ws-1-login

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

## Audit Logging

Track token usage and API costs for every Claude Code request with opt-in audit logging. Capture metadata (token counts, model names, timestamps) without logging any message content or user data.

**Quick Start:**

Add to `~/.claude/config.json`:
```json
{
  "audit_logging": {
    "enabled": true
  }
}
```

Then make a Claude request and check the log:
```bash
# View your audit log
cat ~/.claude/audit.log

# Analyze total tokens used today
grep $(date +%Y-%m-%d) ~/.claude/audit.log | \
  jq -s 'map(.input_tokens + .output_tokens) | add'
```

**Features:**
- Metadata-only logging (no prompts, responses, or user data)
- Automatic log rotation (default: 10MB, customizable)
- JSONL format for easy analysis with `jq` and Unix tools
- Opt-in by default for privacy
- Tracks token counts, models, costs, and request duration

**Example log entry:**
```json
{"timestamp":"2026-02-04T10:00:00.000Z","session_id":"sess-1","model":"claude-sonnet-4-5-20250929","input_tokens":1234,"output_tokens":567,"cache_creation_tokens":0,"cache_read_tokens":0,"total_cost_usd":0.00789,"duration_ms":3200}
```

See [docs/audit-logging.md](docs/audit-logging.md) for full documentation, configuration options, and analysis examples.

---

## Architecture

### v3.x: Project-Local Architecture

Each project has its own `.claude/` directory:

```
your-project/
└── .claude/
    ├── agents/                      # 19 specialized roles
    │   ├── ceo/
    │   ├── cto/
    │   ├── dev/
    │   ├── qa/
    │   ├── design/
    │   └── ...
    │
    ├── skills/                      # 16 collaborative workflows
    │   ├── mg-assess/
    │   ├── mg-assess-tech/
    │   ├── mg-leadership-team/
    │   ├── mg-build/
    │   └── ...
    │
    ├── shared/                      # 6 protocol documents
    │   ├── development-workflow.md
    │   ├── engineering-principles.md
    │   ├── handoff-protocol.md
    │   ├── memory-protocol.md
    │   ├── tdd-workflow.md
    │   └── visual-formatting.md
    │
    ├── scripts/                     # 9 mg-* utilities
    │   ├── mg-memory-read
    │   ├── mg-memory-write
    │   ├── mg-workstream-status
    │   ├── mg-workstream-create
    │   ├── mg-workstream-transition
    │   ├── mg-gate-check
    │   ├── mg-git-summary
    │   ├── mg-diff-summary
    │   └── mg-help
    │
    ├── hooks/                       # Project initialization hooks
    │   └── project-init-check.sh
    │
    ├── memory/                      # Agent memory (project-local)
    │   ├── .gitignore
    │   ├── tasks-dev.json
    │   ├── tasks-qa.json
    │   ├── handoffs-qa-dev.json
    │   ├── workstream-ws-1-state.json
    │   └── decisions.json
    │
    ├── settings.json                # Project-level permissions
    ├── CLAUDE.md                    # Framework + project context
    ├── team-config.yaml             # Framework configuration
    ├── MG_INSTALL.json              # Installation metadata
    └── MG_PROJECT                   # Project marker
```

### Config Cache (Optional)

For quick project initialization:

```
~/.claude/.mg-configs/
├── templates/                   # Agent, skill, protocol templates
│   ├── agents/
│   ├── skills/
│   ├── shared/
│   ├── hooks/
│   ├── settings.json
│   └── CLAUDE.md
│
├── scripts/                     # mg-* utilities + mg-init
│   ├── mg-init
│   ├── mg-memory-read
│   └── ...
│
├── VERSION.json                 # Framework version
└── README.md                    # Usage guide
```

### Repository Structure

```
miniature-guacamole/
├── src/
│   ├── framework/          # Framework source (moved from .claude/)
│   │   ├── agents/         # 19 agent definitions
│   │   ├── skills/         # 16 skill definitions
│   │   ├── shared/         # 6 protocol docs
│   │   ├── hooks/          # Hook scripts
│   │   ├── scripts/        # 10 mg-* utilities
│   │   ├── settings.json
│   │   ├── CLAUDE.md
│   │   └── team-config.*
│   ├── installer/          # Installation scripts
│   │   ├── install.sh
│   │   ├── uninstall.sh
│   │   ├── mg-init
│   │   └── mg-migrate
│   ├── audit/              # TypeScript library
│   ├── memory/
│   ├── lifecycle/
│   └── ...
├── .claude/                # Dev config (symlinks to src/framework/ in this repo; installed projects get copies)
├── build.sh                # Build: src/ → dist/
├── install.sh              # Wrapper: build + install
└── dist/                   # Build output (gitignored)
    ├── miniature-guacamole/
    ├── miniature-guacamole.tar.gz
    └── miniature-guacamole.zip
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
    ▼             │ (back to engineering-team)
┌─────────────────┐
│ /deployment-    │  ← Merge to main
│   engineer      │
└─────────────────┘
```

### Workflow Steps

**1. Plan the work**
```
/mg-leadership-team Build a user authentication system
```
Output: Executive Review + Workstreams (WS-1, WS-2, etc.)

**2. Execute a workstream**
```
/mg-build Execute workstream WS-1: Add login endpoint
```
This runs: QA writes tests → Dev implements → QA verifies → Staff Eng reviews

**3. Leadership reviews**
```
/mg-leadership-team Review workstream WS-1 on branch feature/ws-1-login
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
User: /mg-assess Add two-factor authentication

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
- [ ] /mg-assess-tech for architecture planning
- [ ] /mg-design-review for UX planning
- [ ] Assign to /mg-spec for detailed spec
```

### Example 2: Full Implementation Cycle
```
User: /mg-leadership-team Build user authentication

Leadership: [Creates workstreams]
- WS-1: Login endpoint
- WS-2: Password hashing
- WS-3: Session management

User: /mg-build WS-1

Build Skill:
1. Spawns qa → writes failing tests
2. Spawns dev → implements code to pass tests
3. Spawns qa → verifies all tests pass + 99% coverage
4. Spawns staff-engineer → code review

Output: Ready for leadership review

User: /mg-leadership-team Review WS-1 on branch feature/ws-1-login

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

# Run project-local integration tests
./tests/integration/test-project-local.sh
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
- **Project-Local Tests** (60+ tests) - v3.x installation and migration

See [tests/README.md](tests/README.md) for detailed testing documentation.

---

## Migration from v1.x

### What Changed in v3.x

**v1.x (Global Installation)**
- Agents, skills, protocols installed to `~/.claude/`
- Shared between all projects
- Global settings.json affected all projects
- Single framework version system-wide

**v3.x (Project-Local Installation)**
- Each project has its own `.claude/` directory
- Complete data isolation
- Per-project settings.json
- Different framework versions per project possible

### Migration Steps

1. **Backup your v1.x installation**
   ```bash
   cp -r ~/.claude ~/.claude-v1-backup
   ```

2. **Run the migration tool**
   ```bash
   cd /path/to/your-project
   /path/to/miniature-guacamole/dist/miniature-guacamole/mg-migrate
   ```

3. **Review the migration**
   The tool will:
   - Detect MG components in `~/.claude/`
   - Copy them to project's `.claude/`
   - Migrate settings.json (MG-specific entries only)
   - Migrate CLAUDE.md (with bounded markers)
   - Ask before cleaning up global installation
   - Create backup of everything removed

4. **Test the migrated project**
   ```bash
   claude
   /help  # Should show all skills
   ```

5. **Migrate additional projects**
   Repeat step 2-4 for each project that needs MG.

6. **Clean up backup** (optional)
   ```bash
   rm -rf ~/.claude-v1-backup
   ```

### Coexistence Mode

You can run both v1.x and v3.x installations simultaneously:

- **v1.x projects**: Continue using global `~/.claude/`
- **v3.x projects**: Use project-local `.claude/`

The migration tool's `--no-cleanup` flag preserves the global installation:

```bash
mg-migrate --no-cleanup
```

This installs project-local but leaves global files intact.

### Troubleshooting Migration

**Issue: Settings.json permissions lost**

Solution: Re-run installer with `--force`:
```bash
./dist/miniature-guacamole/install.sh --force
```

**Issue: Scripts not executable**

Solution: Fix permissions:
```bash
chmod +x .claude/scripts/mg-*
```

**Issue: CLAUDE.md content duplicated**

Solution: Edit CLAUDE.md and remove duplicate sections between markers.

See [dist/miniature-guacamole/mg-migrate](dist/miniature-guacamole/mg-migrate) for full migration documentation.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

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
| 3.0.0 | 2026-02-09 | **Project-Local Architecture** - Each project has own `.claude/` directory. Config cache at `~/.claude/.mg-configs/`. Migration tool `mg-migrate` for v1.x users. New install methods: local, web, config cache. Script utilities in `.claude/scripts/`. Complete data isolation. |
| 1.3.0 | 2026-02-04 | Added design-team, docs-team, 7 workflow skills, shared memory layer (99% coverage), supervisor system |
| 1.2.0 | 2026-02-04 | Added TDD/BDD workflow, Git workstreams, deployment-engineer |
| 1.1.0 | 2026-02-04 | Added composite team skills (leadership-team, product-team, engineering-team) |
| 1.0.0 | 2026-02-04 | Initial release with 11 agents and delegation system |

### v3.0.0 Breaking Changes

- **Global installation no longer supported** - Use `mg-migrate` to convert existing v1.x installations
- **~/.claude/ is now config cache only** - Projects use `.claude/` in their own directory
- **/init-project skill removed** - Replaced by `install.sh` and `mg-init` utilities
- **Script invocation changed** - Scripts now in `.claude/scripts/` instead of `~/.claude/scripts/`

See [Migration from v1.x](#migration-from-v1x) for upgrade guide.

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

**Built with Claude Code** | [Report Issues](https://github.com/RivermarkResearch/miniature-guacamole/issues) | [Documentation](.claude/README.md)
