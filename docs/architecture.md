# Architecture

## Overview

miniature-guacamole simulates a complete product development organization within Claude Code. It provides 24 specialized agents organized in a realistic corporate hierarchy, enabling structured delegation and disciplined development workflows.

## Agent Hierarchy

```
    ┌──────────────┬──────────────┬──────────┬───────────┐
    │              │              │          │           │
┌───▼──┐     ┌────▼───┐     ┌───▼──┐  ┌────▼───┐
│  CEO │     │  CTO   │     │ CMO  │  │  CFO   │
└───┬──┘     └────┬───┘     └───┬──┘  └────────┘
    │              │              │
┌───▼───┐    ┌────▼──┐    ┌──────▼───┐
│Eng Dir│    │Stf Eng│    │Art Dir/PO│
└───┬───┘    └────┬──┘    └──────────┘
    │              │
┌───▼───┐    ┌────▼─┐
│Eng Mgr│    │ Dev  │
└───┬───┘    └──────┘
    │
┌───┴────┐
│Dev  │QA│
└─────┴──┘
```

### Organizational Levels

The hierarchy is organized into five levels:

1. **Executive Level** - Strategic vision and high-level decisions (opus/sonnet models)
2. **Leadership Level** - Tactical planning and team coordination (sonnet model)
3. **Individual Contributor Level** - Hands-on implementation (sonnet/haiku models)
4. **Operations Level** - Deployment and infrastructure (sonnet model)

## Delegation Model

### Delegation Authority Matrix

| Agent | Can Delegate To (Leadership) | Can Delegate To (IC via Task) |
|-------|------------------------------|-------------------------------|
| CEO | CTO, Engineering Director, Product Owner, Art Director | - |
| CTO | Engineering Director, Staff Engineer | dev |
| CMO | Art Director, Product Owner, Copywriter, Design | - |
| CFO | (analysis only — no implementation delegation) | - |
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

The supervisor system monitors depth limits and prevents infinite delegation chains.

### Loop Prevention

The system prevents circular delegation:
- Agents cannot delegate back to any agent already in the chain
- Agents cannot delegate to themselves
- Consultation bypasses loop checks (fire-and-forget model)

## Component Architecture

### Directory Structure

```
miniature-guacamole/
├── src/
│   ├── framework/                  # Framework source
│   │   ├── agents/                 # 24 specialized agent roles
│   │   ├── skills/                 # 18 team collaboration skills
│   │   ├── shared/                 # 6 protocol documents
│   │   ├── scripts/                # 17 mg-* utility commands
│   │   ├── hooks/                  # Safety and initialization hooks
│   │   ├── settings.json           # Default project permissions
│   │   ├── CLAUDE.md               # Framework documentation template
│   │   ├── team-config.yaml        # Team configuration
│   │   └── team-config.json        # Team configuration (JSON)
│   │
│   ├── installer/                  # Installation and migration scripts
│   │   ├── install.sh              # Project-local installer
│   │   ├── uninstall.sh            # Clean uninstaller
│   │   ├── web-install.sh          # Global CLI installer (curl | bash)
│   │   ├── mg-init                 # Per-project init (reads ~/.miniature-guacamole/)
│   │   └── mg-migrate              # Version migration tool
│   │
│   ├── memory/                     # Shared memory TypeScript layer
│   │   ├── config.ts
│   │   ├── types.ts
│   │   ├── write.ts
│   │   ├── read.ts
│   │   ├── query.ts
│   │   ├── validate.ts
│   │   ├── locking.ts
│   │   ├── backup.ts
│   │   └── errors.ts
│   │
│   ├── audit/                      # Audit logging TypeScript layer
│   ├── returns/                    # Structured return envelopes
│   └── supervisor/                 # Depth/loop monitoring
│
├── .claude/                        # Dev environment (symlinks to src/framework/)
│   ├── agents → ../src/framework/agents
│   ├── skills → ../src/framework/skills
│   ├── shared → ../src/framework/shared
│   ├── scripts → ../src/framework/scripts
│   ├── hooks → ../src/framework/hooks
│   ├── settings.json → ../src/framework/settings.json
│   ├── CLAUDE.md → ../src/framework/CLAUDE.md
│   ├── memory/                     # Local agent state (gitignored)
│   └── settings.local.json         # Local overrides (gitignored)
│
├── build.sh                        # Unified build: src/ → dist/
├── install.sh                      # Root convenience wrapper
├── tests/                          # Test suites
├── dashboard/                      # Analytics dashboard (Next.js)
├── daemon/                         # Background processes
├── docs/                           # VitePress documentation site
└── .github/workflows/
    ├── ci.yml                      # PR checks + build verification
    └── release.yml                 # v*.*.* tag → GitHub release
```

## Integration Layers

miniature-guacamole exposes two interfaces for automation and agent use:

**Task tool + filesystem memory** — the primary agentic interface. Agents use Claude Code's Task tool to spawn subagents and read/write JSON files in `.claude/memory/`.

**CLI scripts** — the primary human and scripting interface. 17 scripts in `.claude/scripts/` reachable via the `mg` CLI router. Use these from your shell, CI pipelines, or hooks.

The `mg` router is the recommended entry point:
- `mg workstream status WS-42` — check workstream state
- `mg memory read <file>` — read memory files
- `mg gate check` — run mechanical gate checks
- All commands support `--json` for machine-readable output

Direct script invocation (`mg-workstream-status WS-42`) continues to work.

## Component Flow

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

## Model Selection Strategy

| Tier | Model | Agents | Rationale |
|------|-------|--------|-----------|
| Executive | opus | CEO, CTO, Leadership Team | Complex strategic decisions require highest capability |
| Leadership | sonnet | ED, PO, PM, EM, SE, AD | Balanced capability for coordination and planning |
| IC | sonnet/haiku | Dev, QA, Design, etc. | Fast/efficient for task execution in delegation chains |

### Model Escalation Protocol

The system uses an intelligent model escalation strategy:
1. Start with Sonnet for most tasks
2. If Sonnet cannot complete the task, escalate to Opus
3. Supervisor monitors escalation patterns and optimizes model selection

This approach balances cost efficiency with quality, using Opus only when necessary.

## Shared Memory System

### Overview

The shared memory layer provides unified state management for all agents with:
- **99% test coverage**
- **Atomic writes** with automatic backups
- **File locking** for concurrent safety
- **Query capabilities** by agent, workstream, or time
- **Graceful error handling** - Never throws exceptions
- **Optional Postgres backend** - `mg-postgres start` and `mg-migrate` sync local JSON files to a Docker-managed Postgres instance for richer querying. Use `--no-db` to stay file-only.

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
├── workstream-{id}-state.json     # Workstream status tracking
├── tasks-{role}.json              # Task queues per agent role
├── agent-{name}-decisions.json    # Agent decision records
├── handoffs-{from}-{to}.json      # Agent-to-agent handoffs
└── decisions.json                 # Architecture decisions
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

## Handoff Protocol

The handoff protocol defines how context is passed between agents during delegation. All agents follow a structured envelope format for delegation requests and responses.

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

See [Handoff Protocol Documentation](https://github.com/wonton-web-works/miniature-guacamole/blob/main/src/framework/shared/handoff-protocol.md) for complete specification.

## Git Workstream Strategy

Each feature is implemented in its own branch with a structured naming convention:

```
main (protected)
├── feature/ws-1-delegation-logging
├── feature/ws-2-shared-memory
└── feature/ws-3-cost-tracking
```

### Branch Naming

- Pattern: `feature/ws-{number}-{short-name}`
- Example: `feature/ws-1-delegation-logging`

### Quality Gates

1. **Tests Exist** - Test files created and failing (misuse-first ordering)
2. **Tests Pass** - All tests passing, no regressions
3. **QA Sign-off** - Coverage adequate (99%+), edge cases handled
3.5. **Classification** - Workstream classified as MECHANICAL or ARCHITECTURAL (R1-R8, M1-M5)
4A. **Mechanical Gate** (MECHANICAL) - Automated bash verification: tests pass, 99% coverage, <200 lines
4B. **Staff Engineer Review** (ARCHITECTURAL) - Code quality, standards, security, architecture
5. **Leadership Approval** - Business requirements, technical quality, operational readiness
6. **Merge Ready** - Leadership approved, no conflicts, branch up to date

## Testing Architecture

### Test Coverage

- **Unit Tests** (105 files, 3,700+ tests) - Memory, audit, returns, supervisor, agents, skills
- **Integration Tests** (17 files, 450+ tests) - Cross-agent communication, launch validation, repo sanitization
- **Script Tests** (30 BATS files, 1,078 tests) - All 17 mg-* utility scripts
- **Total Coverage** - 99%+ (5,200+ tests across all suites)

### Test Execution

```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Security Considerations

### Agent Permissions

Not all agents have file system access. Tool access is restricted by role:

| Agent | Read | Glob | Grep | Edit | Write |
|-------|------|------|------|------|-------|
| CEO | - | - | - | - | - |
| CTO | ✅ | ✅ | ✅ | ✅ | ✅ |
| Engineering Director | - | - | - | - | - |
| Product Owner | - | - | - | - | - |
| Product Manager | ✅ | ✅ | ✅ | - | - |
| Engineering Manager | ✅ | ✅ | ✅ | ✅ | ✅ |
| Staff Engineer | ✅ | ✅ | ✅ | ✅ | ✅ |
| Art Director | - | - | - | - | - |
| Dev | ✅ | ✅ | ✅ | ✅ | ✅ |
| QA | ✅ | ✅ | ✅ | ✅ | ✅ |
| Design | ✅ | ✅ | ✅ | - | - |

### Data Protection

- Memory files stored in `.claude/memory/` (add to `.gitignore`)
- Automatic backups prevent data loss
- File locking prevents concurrent write conflicts
- No sensitive data logged (audit logging is metadata-only)

## Extension Points

The system is designed to be extended:

### Adding a New Agent

1. Create `SKILL.md` in `src/framework/skills/<agent-name>/`
2. If IC agent, also create `agent.md` in `src/framework/agents/<agent-name>/`
3. Update hierarchy documentation
4. Add tests for delegation patterns

### Adding a New Workflow

1. Create `src/framework/skills/<workflow-name>/SKILL.md`
2. Define workflow steps and agent spawning logic
3. Document memory protocol (read/write paths)
4. Add examples to documentation

### Modifying Hierarchy

1. Update `src/framework/shared/handoff-protocol.md`
2. Update relevant SKILL.md files
3. Test delegation chains work correctly
4. Update architecture diagrams

See [Contributing Guide](/contributing) for detailed instructions.

## Build and Release

### Build Pipeline

The unified build script consolidates all source:

```bash
./build.sh
# Outputs:
#   dist/miniature-guacamole/          - Extracted distribution
#   dist/miniature-guacamole.tar.gz    - Tarball (for releases)
#   dist/miniature-guacamole.zip       - Zip archive
```

**Build process**:
1. Clean `dist/`
2. Copy `src/framework/` → `dist/miniature-guacamole/.claude/`
3. Copy `src/installer/` → `dist/miniature-guacamole/`
4. Generate `VERSION.json` (version, git sha, build date)
5. Create tar.gz and zip archives

### CI/CD Release Workflow

Automated releases on version tags:

```yaml
# .github/workflows/release.yml
on:
  push:
    tags: ['v*.*.*']

steps:
  - Checkout code
  - Install dependencies (npm ci)
  - Type check (tsc --noEmit)
  - Run tests (npm test)
  - Build distribution (./build.sh)
  - Create GitHub release
  - Attach miniature-guacamole.tar.gz
  - Attach miniature-guacamole.zip
```

**To create a release**:

```bash
git tag v1.0.1
git push origin v1.0.1
# CI automatically builds and publishes to GitHub releases
```

### Installation System

Installation is two-phase: **global install** (one time) and **per-project init**.

**Phase 1: Global Install** (`web-install.sh`)

Downloads the release tarball and installs the framework bundle:

1. Extracts to `~/.miniature-guacamole/` (framework bundle with `.claude/`, `install.sh`, templates)
2. Symlinks all `mg-*` scripts to `~/.local/bin/`
3. Adds `~/.local/bin` to PATH if needed

```bash
curl -fsSL https://raw.githubusercontent.com/.../web-install.sh | bash
```

**Phase 2: Per-Project Init** (`mg-init`)

Reads from the global bundle — no network required:

1. Runs `install.sh` from `~/.miniature-guacamole/` against the target project
2. Creates `.claude/` with all agents, skills, scripts, and protocols
3. Creates `.claude/memory/` — project-local agent state directory
4. Auto-provisions Postgres via Docker (`mg-postgres start`, `mg-migrate`) if Docker is available

```bash
cd your-project
mg-init
```

**Flags**:
- `--no-db` - Skip Postgres setup, run file-only
- `--force` - Force re-initialization

**Direct install** (`install.sh <dir>`) still works for offline/CI use — bypasses the global bundle entirely.

**From source** for contributors:

```bash
git clone ... && ./build.sh
dist/miniature-guacamole/install.sh /path/to/project
```
