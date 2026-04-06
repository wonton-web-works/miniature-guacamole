# Architecture

## Overview

miniature-guacamole simulates a complete product development organization within Claude Code. It provides 22 specialized agents organized in a realistic corporate hierarchy, enabling structured delegation, disciplined development workflows, and project-isolated memory.

The framework is installed from a single tarball. Every component lives under `.claude/` in your project — or globally under `~/.claude/` when using the global installer. No data crosses project boundaries.

## High-Level Component Map

```
miniature-guacamole/
├── src/
│   ├── framework/               # Everything Claude Code uses at runtime
│   │   ├── agents/              # Agent role definitions (AGENT.md per role)
│   │   ├── skills/              # 19 team collaboration skills (SKILL.md per skill)
│   │   ├── shared/              # Protocol documents (6 .md files)
│   │   ├── scripts/             # mg-* CLI utilities
│   │   ├── hooks/               # Claude Code lifecycle hooks
│   │   ├── settings.json        # Tool permissions
│   │   ├── team-config.yaml     # Agent definitions and model tiers
│   │   └── CLAUDE.md            # Framework context injected each session
│   │
│   └── installer/               # Distribution and setup scripts
│       ├── install.sh           # Per-project installer
│       ├── web-install.sh       # Global curl-pipe installer
│       ├── mg-init              # Per-project init (reads global bundle)
│       └── mg-migrate           # Version migration tool
│
├── build.sh                     # Assembles src/ → dist/
├── dist/                        # Output of build.sh (tarball + extracted)
├── docs/                        # This VitePress site
└── .claude/                     # Dev environment (symlinks into src/framework/)
    ├── agents -> ../src/framework/agents
    ├── skills -> ../src/framework/skills
    ├── shared -> ../src/framework/shared
    ├── scripts -> ../src/framework/scripts
    ├── hooks -> ../src/framework/hooks
    ├── memory/                  # Local agent state (gitignored)
    └── settings.json
```

## Agents

### Hierarchy

Agents are organized in five tiers. Higher tiers can spawn agents in lower tiers; lower tiers escalate blockers upward.

```
            ┌─────────────────┼──────────────────┐
           CEO               CTO                CMO / CFO
            │                 │                    │
     Engineering Dir    Staff Engineer       Art Director
            │                                      │
     Engineering Mgr                           Design
            │
       ┌────┴────┐
      Dev        QA
```

| Tier | Agents | Model | Rationale |
|------|--------|-------|-----------|
| Executive | CEO, CTO, CMO, CFO | opus | Strategic decisions require highest capability |
| Leadership | Engineering Director, Engineering Manager, Product Owner, Product Manager, Staff Engineer, Art Director | sonnet | Coordination and planning |
| IC | Dev, QA, Design | sonnet | Implementation and verification |
| Operations | Deployment Engineer | haiku | Automated, validation-focused |
| Meta | Supervisor | haiku | Monitors depth limits and loops |

### Model Tiers

Three model tiers map to agent complexity:

| Tier | Alias | Model | Use Case |
|------|-------|-------|----------|
| reasoning | opus | claude-opus-4-6 | Deep thinking, strategic decisions |
| implementation | sonnet | claude-sonnet-4-20250514 | Coding, coordination, planning |
| fast | haiku | claude-haiku-3-5-20241022 | Validation, monitoring, simple checks |

Configured in `team-config.yaml` under `providers.anthropic.tiers`.

### Agent Definition Format

Each agent lives at `src/framework/agents/{name}/agent.md`. Front matter controls Claude Code behavior:

```yaml
---
name: dev
description: "Brief description used by orchestrators to decide when to spawn this agent"
model: sonnet
tools: [Read, Glob, Grep, Edit, Write, Bash]
memory: project
maxTurns: 50
---
```

All agents inherit from `agents/_base/agent-base.md`, which defines:
- The memory-first protocol (read context before acting)
- The message bus convention (`messages-{from}-{to}.json`)
- The boundaries format (CAN / CANNOT / ESCALATES TO)
- The Write-tool rule (never use bash heredocs for file creation)

### Delegation Authority

| Agent | Spawns (delegation) | Consults (fire-and-forget) |
|-------|---------------------|---------------------------|
| CEO | CTO, Engineering Director, Product Owner, Art Director | — |
| CTO | Engineering Director, Staff Engineer | — |
| CMO | Art Director, Product Owner, Copywriter, Design | — |
| CFO | (analysis only) | — |
| Engineering Director | Engineering Manager, Staff Engineer, Deployment Engineer | — |
| Product Owner | Product Manager | — |
| Product Manager | Dev, QA, Design | — |
| Engineering Manager | Dev, QA, Staff Engineer | — |
| Staff Engineer | Dev | — |
| Art Director | Design | — |
| Dev | — | QA, Design |
| QA | — | Dev, Design |
| Design | — | Dev, QA |
| Supervisor | (monitors only — no spawns) | — |

Peer consultation (Dev ↔ QA, Dev ↔ Design) does not count toward delegation depth.

### Delegation Depth

The handoff protocol enforces a hard maximum of **3 delegation levels**:

```
Depth 0: Human → skill or agent (not counted)
Depth 1: Skill delegates to first agent
Depth 2: First agent delegates to second agent
Depth 3: Second agent delegates to third agent (TERMINAL — cannot re-delegate)
```

At depth 3, an agent must complete locally or return a `partial` result. The Supervisor monitors all delegation chains and writes alerts to `supervisor-alerts.json` if the limit is exceeded.

### Loop Prevention

Before any delegation, the agent checks whether the target already appears in `chain.path`. If so, the delegation is rejected. Self-delegation is also forbidden. Consultations bypass the loop check — they are fire-and-forget with no ownership transfer.

## Skills

Skills are slash-command workflows. When a user types `/mg-build`, Claude Code loads `skills/mg-build/SKILL.md` and executes the instructions there. Skills can spawn agents, coordinate multi-step workflows, and track progress via shared memory.

### Available Skills

| Skill | Command | Purpose |
|-------|---------|---------|
| mg | `/mg` | Router — delegates to sub-skills |
| mg-leadership-team | `/mg-leadership-team` | Strategic planning and code review approvals |
| mg-build | `/mg-build` | Full CAD cycle: classify, test, implement, review |
| mg-code-review | `/mg-code-review` | Technical quality review |
| mg-assess | `/mg-assess` | Feature evaluation (product + technical) |
| mg-assess-tech | `/mg-assess-tech` | Architecture planning and feasibility |
| mg-spec | `/mg-spec` | Product requirements and user stories |
| mg-design | `/mg-design` | UI/UX design with visual regression |
| mg-design-review | `/mg-design-review` | Design system compliance review |
| mg-accessibility-review | `/mg-accessibility-review` | WCAG 2.1 AA compliance |
| mg-security-review | `/mg-security-review` | OWASP Top 10 and auth review |
| mg-document | `/mg-document` | Documentation generation |
| mg-write | `/mg-write` | Brand-aligned content writing |
| mg-debug | `/mg-debug` | Root cause analysis |
| mg-refactor | `/mg-refactor` | Systematic code refactoring |
| mg-ticket | `/mg-ticket` | Ticket creation and breakdown |
| mg-tidy | `/mg-tidy` | Codebase cleanup |
| mg-add-context | `/mg-add-context` | Add project context to CLAUDE.md |
| mg-init | `/mg-init` | Initialize project memory structure |

All 19 skills listed above are included in the community build.

### Skill Definition Format

```yaml
---
name: mg-build
description: "Build it. Classify at intake, then execute..."
model: sonnet
allowed-tools: Read, Glob, Grep, Edit, Write, Task, Bash
metadata:
  version: "2.0"
  spawn_cap: "6"
---
```

Each skill directory also contains a `references/` folder with:
- `output-format.md` — required visual output patterns
- `model-escalation.md` — when to escalate to a higher-tier model
- `output-examples.md` — concrete examples (where applicable)

## Shared Protocols

Six protocol documents live in `src/framework/shared/` and are copied to `.claude/shared/` on install. All agents and skills reference them.

| File | Purpose |
|------|---------|
| `development-workflow.md` | CAD gate-based development process, classification rules (R1-R8, M1-M5), MECHANICAL vs ARCHITECTURAL tracks |
| `tdd-workflow.md` | Test-first cycle, misuse-first test ordering, artifact bundle specs |
| `memory-protocol.md` | File patterns, message bus format, rotation, hybrid storage lifecycle |
| `handoff-protocol.md` | Delegation envelope format, depth tracking, loop prevention, escalation vs consultation |
| `engineering-principles.md` | TDD, DRY, config-over-composition, 99% coverage, TypeScript strict mode |

## Shared Memory System

Agents communicate through JSON files in `.claude/memory/`. This is the only communication channel — agents do not share a runtime process or call each other directly.

### File Patterns

| Pattern | Purpose | Written By |
|---------|---------|------------|
| `workstream-{id}-state.json` | Phase, progress, blockers per workstream | mg-build |
| `agent-{name}-decisions.json` | Agent outputs and decisions | Each agent |
| `tasks-{agent_id}.json` | Task queue for an agent | Orchestrators |
| `escalations.json` | Issues needing attention | Any agent |
| `supervisor-alerts.json` | Depth and loop violations | Supervisor |
| `messages-{from}-{to}.json` | Agent message bus | Any agent |

### Message Bus

Agents can send typed messages to each other:

```json
{
  "messages": [{
    "id": "msg-001",
    "from": "qa",
    "to": "dev",
    "workstream_id": "WS-42",
    "type": "handoff",
    "subject": "Test specs committed",
    "body": "Tests are at tests/auth.test.ts. All failing. Ready for implementation.",
    "requires_response": false
  }]
}
```

Message types: `info`, `question`, `blocker`, `handoff`.

### Memory Rotation

Global decision files grow unbounded without rotation. When a file reaches **50 KB**, the writing agent:

1. Reads all entries from the file
2. Separates entries tied to in-progress workstreams (preserved unconditionally)
3. Keeps up to 20 recent non-active entries (10 for feature-spec files)
4. Archives older entries to `.claude/memory/.archive/{filename}.{YYYY-MM-DD}.json`
5. Writes the retained entries back, then appends the new entry

Archives are kept for 30 days.

### Hybrid Storage Lifecycle

Two storage tiers operate together:

1. **During execution** — agents write to `.claude/memory/` JSON files (fast, no dependencies)
2. **At completion** — `mg-db-sync <ws-id>` syncs the workstream to Postgres and archives the JSON files to `.archive/{ws-id}/`

Postgres is optional. Run `mg-postgres start` and `mg-migrate` to enable it, or pass `--no-db` to `mg-init` to stay file-only.

### TypeScript Memory API

```typescript
import { writeMemory, readMemory, queryMemory } from './src/memory';

// Write agent state
await writeMemory({
  agent_id: 'dev',
  workstream_id: 'ws-1',
  data: {
    phase: 'implementation_complete',
    files_modified: ['src/auth.ts'],
    tests_passing: true,
    coverage: 99.2
  }
}, 'memory/agent-dev-decisions.json');

// Read state
const state = await readMemory('memory/workstream-ws-1-state.json');

// Query by filter
const entries = await queryMemory({ agent_id: 'dev', workstream_id: 'ws-1' });
```

Memory module features: atomic writes, automatic backups, file locking for concurrent safety, query by agent/workstream/time, graceful error handling (no thrown exceptions).

## Hooks

Hooks are bash scripts wired into Claude Code lifecycle events via `settings.json`. They run automatically — no user action required.

### Hook Inventory

| Hook | Trigger | File | Purpose |
|------|---------|------|---------|
| `TaskCompleted` | Agent marks a task complete | `hooks/task-completed.sh` | Runs vitest on changed files; blocks completion if tests fail or untracked source files exist |
| `TeammateIdle` | An agent goes idle | `hooks/teammate-idle.sh` | Checks TypeScript compilation; blocks idle if tsc errors or untracked test files exist |
| `SessionStart` | Claude Code opens a project | `hooks/session-start.sh` | Outputs version banner and initialization status to Claude's context |
| Project init check | SessionStart (via hook) | `hooks/project-init-check.sh` | Detects missing `.claude/memory/` and prompts user to run `/mg-init` |
| Safety check | Before Bash execution | `hooks/safety-check.sh` | Blocks dangerous commands (recursive deletes, disk operations, credential destruction) |

### Hook Configuration

Hooks are registered in `settings.json`:

```json
{
  "hooks": {
    "TeammateIdle": [{"hooks": [{"type": "command", "command": ".claude/hooks/teammate-idle.sh"}]}],
    "TaskCompleted": [{"hooks": [{"type": "command", "command": ".claude/hooks/task-completed.sh"}]}]
  }
}
```

Exit codes: `0` = allow, `1` = block, `2` = block with feedback via stderr.

## Security and Isolation Model

### Data Isolation (NDA-Safe)

miniature-guacamole is designed so that client project data never leaves the project directory:

- **Agent and skill definitions** — generic role templates containing no project data; safe to share globally
- **Memory files** — stored in `.claude/memory/` (project-local); gitignored by default
- **No cross-project access** — each project's memory is completely separate
- **`~/.claude/` is not modified** by the per-project installer; the global installer writes to `~/.miniature-guacamole/`

### Tool Permissions

`settings.json` controls which tools agents can use. Sensitive operations are denied at the permission layer:

```json
{
  "permissions": {
    "allow": ["Read", "Glob", "Grep", "Edit", "Write", "Task", "Bash(npm:*)", "Bash(git:*)", "..."],
    "deny": ["Bash(rm:*)", "Bash(bash:*)", "Bash(sh:*)", "Bash(find:*-delete)*", "..."]
  }
}
```

### Agent Tool Restrictions

Tool access varies by role. ICs have filesystem write access; executives do not:

| Role | Read/Glob/Grep | Edit/Write | Task (spawn) | Bash |
|------|:--------------:|:----------:|:------------:|:----:|
| CEO, CTO | Yes | No | Yes | No |
| CFO | Yes | No | No | No |
| Engineering Manager | Yes | Yes | Yes | Yes |
| Staff Engineer | Yes | Yes | Yes | Yes |
| Dev, QA | Yes | Yes | No | Yes |
| Design | Yes | Yes | No | No |
| Deployment Engineer | Yes | No | No | Yes |
| Supervisor | Yes | No | No | No |

### Safety Hook

`hooks/safety-check.sh` blocks commands matching dangerous patterns before execution:

- Recursive deletes targeting system or home directories (`rm -rf /`, `rm -rf ~`, `rm -rf ~/.ssh`, etc.)
- Disk operations (`dd if=`, `mkfs`, `> /dev/`)
- Permission bombs (`chmod -R 777 /`)
- Fork bombs
- Git config destruction (`git clean -fdx /`)

Allowed project-scoped removes (`rm -rf ./dist`, `rm -rf node_modules`) pass through.

## Installation Architecture

### Two-Phase Installation

**Phase 1 — Global Install** (one time per machine)

`web-install.sh` downloads the release tarball and installs a bundle to `~/.miniature-guacamole/`:

1. Downloads `miniature-guacamole.tar.gz` from GitHub releases
2. Extracts to `~/.miniature-guacamole/` (contains `.claude/`, `install.sh`, templates, `VERSION.json`)
3. Symlinks all `mg-*` scripts to `~/.local/bin/`
4. Adds `~/.local/bin` to PATH if not present

```bash
curl -fsSL https://raw.githubusercontent.com/wonton-web-works/miniature-guacamole/main/src/installer/web-install.sh | bash
```

**Phase 2 — Per-Project Init** (once per project)

`mg-init` reads the global bundle — no network required:

1. Verifies `~/.miniature-guacamole/install.sh` exists
2. Runs `install.sh` from the global bundle against the target project
3. Creates `.claude/` with agents, skills, scripts, hooks, and protocols
4. Creates `.claude/memory/` with `.gitignore`
5. Auto-provisions Postgres via Docker if available (`mg-postgres start`, `mg-migrate`)

```bash
cd your-project && mg-init
```

### Install Script Logic

`install.sh` detects whether a **global install** exists at `~/.claude/`:

```
Global install detected (agents/ + skills/ + shared/ all present)?
  YES → skip copying framework files to project (they're available globally)
        use --standalone to override
  NO  → copy all agents, skills, shared protocols to .claude/
```

This keeps per-project installs lean when agents and skills are already globally available.

### Build Pipeline

`build.sh` assembles the distribution from source:

```
src/framework/  →  dist/miniature-guacamole/.claude/
  agents/       →    agents/
  skills/       →    skills/
  shared/       →    shared/
  scripts/      →    scripts/
  hooks/        →    hooks/
  settings.json →    settings.json
  CLAUDE.md     →    CLAUDE.md
  team-config.* →    team-config.*

src/installer/  →  dist/miniature-guacamole/
  install.sh    →    install.sh
  web-install.sh →   web-install.sh
  mg-init       →    mg-init
  mg-migrate    →    mg-migrate
  QUICK-START.md →   QUICK-START.md

VERSION.json generated from git tag + commit sha
Archives: dist/miniature-guacamole.tar.gz, dist/miniature-guacamole.zip
```

### CI/CD Release Workflow

On push of a `v*.*.*` tag:

1. Checkout, `npm ci`
2. TypeScript check (`tsc --noEmit`)
3. Run tests (`npm test`)
4. Build distribution (`./build.sh`)
5. Create GitHub release with `miniature-guacamole.tar.gz` and `.zip` attached

```bash
git tag v1.0.1 && git push origin v1.0.1
# CI builds and publishes automatically
```

## Extension Points

### Adding an Agent

1. Create `src/framework/agents/{name}/agent.md` following the existing format
2. Add the agent's definition to `team-config.yaml` under `agents:`
3. Add the role to the appropriate hierarchy level in `team-config.yaml`
4. Update delegation authority in any parent agents that should be able to spawn it
5. Build and install: `./build.sh && dist/miniature-guacamole/install.sh --force .`

### Adding a Skill

1. Create `src/framework/skills/{name}/SKILL.md` with front matter and workflow steps
2. Add `references/output-format.md` and `references/model-escalation.md`
3. No changes to `team-config.yaml` required — skills are discovered by filename

### Modifying Protocols

Protocol files in `src/framework/shared/` are referenced by agents and skills at runtime. Changes take effect immediately in the dev environment (symlinked). For installed projects, re-run `install.sh --force` to push updates.

## Testing Architecture

### Test Coverage

- **Unit tests** — memory module, audit, returns, supervisor (Vitest)
- **Integration tests** — cross-agent communication, launch validation, repo sanitization
- **Script tests** — all `mg-*` CLI scripts (BATS)
- **Target coverage** — 99% (lines, branches, functions, statements)

### Running Tests

```bash
npm test                  # All tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests
npm run test:coverage     # Coverage report
```

## Related Documentation

- [Process Flows](/process-flows) — step-by-step breakdowns of every major workflow
- [Workflows](/workflows) — CAD cycle guide with examples
- [Agent Reference](/agents) — full agent role catalog
- [Glossary](/glossary) — definitions for framework-specific terms
