# CLI Reference

Complete reference for all miniature-guacamole command-line interfaces: shell scripts, Claude Code skills, and daemon commands.

## Shell Scripts

These bash scripts are installed to `.claude/scripts/` and provide the CLI-primary integration layer. All scripts support `-h` / `--help`.

### Memory Management

#### mg-memory-read

Read and pretty-print a JSON memory file.

```
mg-memory-read [--json] <file.json>
```

| Flag | Description |
|------|-------------|
| `--json` | Output compact single-line JSON instead of pretty-printed |

```bash
# Pretty-print a workstream state file
mg-memory-read .claude/memory/workstream-WS-42-state.json

# Compact JSON for piping
mg-memory-read --json .claude/memory/decisions.json | jq '.[-1]'
```

#### mg-memory-write

Atomically update a JSON memory file with a jq expression. Creates a `.bak` backup automatically. Optionally dual-writes to Postgres if configured.

```
mg-memory-write <file.json> '<jq expression>'
```

```bash
# Set workstream status
mg-memory-write .claude/memory/workstream-WS-42-state.json '.status = "in_progress"'

# Append to an array
mg-memory-write .claude/memory/decisions.json '. += [{"decision": "use Vitest", "date": "2026-03-19"}]'
```

### Workstream Management

#### mg-workstream-create

Create a new workstream state file from template.

```
mg-workstream-create <ws-id> <title>
```

```bash
mg-workstream-create WS-42 "Add user authentication"
# Creates .claude/memory/workstream-WS-42-state.json
```

#### mg-workstream-status

Display formatted workstream state including phase, gate status, and blockers.

```
mg-workstream-status [--json] <ws-id>
```

| Flag | Description |
|------|-------------|
| `--json` | Output structured JSON instead of human-readable text |

```bash
mg-workstream-status WS-42
mg-workstream-status --json WS-42 | jq '.phase'
```

#### mg-workstream-transition

Validate and apply a state machine transition.

```
mg-workstream-transition <ws-id> <new-status>
```

Valid transitions: `pending` → `in_progress` → `qa_review` → `code_review` → `approved` → `merged`

```bash
mg-workstream-transition WS-42 in_progress
mg-workstream-transition WS-42 qa_review
```

### Gate & Verification

#### mg-gate-check

Run mechanical Gate 4A checks with structured output. Validates tests (Vitest), TypeScript compilation, ESLint, and file scope.

```
mg-gate-check [--json]
```

| Flag | Description |
|------|-------------|
| `--json` | Output compact JSON instead of pretty-printed |

Failure types: `test_failure`, `coverage_gap`, `type_error`, `lint_violation`, `file_scope_violation`.

```bash
mg-gate-check
mg-gate-check --json | jq '.gates[] | select(.pass == false)'
```

### Git & Diff

#### mg-git-summary

Produce a formatted commit log for status reports.

```
mg-git-summary [--since <ref-or-date>]
```

| Flag | Description |
|------|-------------|
| `--since <ref>` | Show commits since a date or git ref |

```bash
mg-git-summary --since "3 days ago"
mg-git-summary --since abc1234
```

#### mg-diff-summary

Show files changed, lines added/removed, and scope summary compared to a base branch.

```
mg-diff-summary [base-branch]
```

| Argument | Description |
|----------|-------------|
| `base-branch` | Branch to compare against (default: `main`) |

```bash
mg-diff-summary
mg-diff-summary develop
```

### Utilities

#### mg-help

Display help for all mg-\* commands or a specific command.

```
mg-help [command-name]
```

```bash
mg-help                  # List all commands
mg-help mg-memory-read   # Help for a specific command
```

#### mg-util

Unified utility for project initialization and auditing.

```
mg-util init [project-dir]
mg-util audit [--project | --global]
```

| Flag | Description |
|------|-------------|
| `--project` | Audit current project only |
| `--global` | Audit global settings |

```bash
mg-util init              # Initialize current directory
mg-util init ~/my-project # Initialize a specific project
mg-util audit --project   # Audit project settings
```

#### mg-config

Manage global miniature-guacamole configuration. Config stored at `$MG_CONFIG_DIR` (default: `~/.config/miniature-guacamole`).

```
mg-config <subcommand> [args]
```

| Subcommand | Description |
|------------|-------------|
| `init` | Create config file with defaults (idempotent) |
| `get <key>` | Print value for key; exits non-zero if not found |
| `set <key> <val>` | Set key to value (atomic write) |
| `list` | Print all key=value pairs |

Default keys: `postgres_url`, `storage_mode`, `auto_provision`, `mg_version`.

```bash
mg-config init
mg-config set storage_mode postgres
mg-config get postgres_url
mg-config list
```

#### mg-settings-check

Detect and clean permission bloat in settings files.

```
mg-settings-check [--project | --global] [--fix]
```

| Flag | Description |
|------|-------------|
| `--project` | Check project-level settings only |
| `--global` | Check global settings |
| `--fix` | Remove oversized patterns with confirmation |

Detects patterns over 200 characters (oversized) and files over 5000 characters (warning). Fix mode creates a timestamped backup before changes.

```bash
mg-settings-check --project
mg-settings-check --global --fix
```

### Database Management

These scripts manage the optional Postgres backend for memory storage. Common environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `MG_POSTGRES_URL` | Postgres connection string | `postgresql://mg:mg@localhost:5432/mg_memory` |
| `MG_CONFIG_DIR` | Config directory | `~/.config/miniature-guacamole` |

#### mg-postgres

Provision and manage the miniature-guacamole Postgres container (Docker).

```
mg-postgres <start|stop|status>
```

| Subcommand | Description |
|------------|-------------|
| `start` | Start container, verify connectivity, run migrations |
| `stop` | Stop and remove container (idempotent) |
| `status` | Report container state and connection health |

```bash
mg-postgres start
mg-postgres status
mg-postgres stop
```

#### mg-db-setup

Create the core miniature-guacamole tables in Postgres. Runs `migrations/001-core-tables.sql` (idempotent). Creates tables: `schema_migrations`, `memory_entries`, `agent_events`.

```
mg-db-setup
```

```bash
mg-db-setup
MG_POSTGRES_URL=postgresql://user:pass@host:5432/db mg-db-setup
```

#### mg-db-seed

Seed Postgres from `.claude/memory/*.json` files. Upserts entries into the `memory_entries` table.

```
mg-db-seed [--source-dir <dir>] [--dry-run]
```

| Flag | Description |
|------|-------------|
| `--source-dir <dir>` | Directory to read from (default: `.claude/memory/`) |
| `--dry-run` | Print what would be written without executing |

```bash
mg-db-seed
mg-db-seed --dry-run
mg-db-seed --source-dir /path/to/memory/
```

#### mg-db-sync

Sync completed workstream artifacts to Postgres and archive operational files.

```
mg-db-sync <ws-id> [--dry-run] [--no-cleanup] [--force]
mg-db-sync --all-complete [--dry-run] [--no-cleanup] [--force]
```

| Flag | Description |
|------|-------------|
| `--source-dir <dir>` | Directory to read from (default: `.claude/memory/`) |
| `--dry-run` | Print what would be synced without writing |
| `--no-cleanup` | Sync to Postgres but skip archival |
| `--force` | Re-sync even if already synced |
| `--all-complete` | Sync all workstreams with phase complete/merged/closed |

```bash
mg-db-sync WS-42
mg-db-sync WS-42 --dry-run
mg-db-sync --all-complete --no-cleanup
```

#### mg-migrate

Bulk-migrate `.claude/memory/*.json` files to Postgres.

```
mg-migrate <PROJECT_DIR> [--force] [--dry-run]
```

| Flag | Description |
|------|-------------|
| `--force` | Migrate files even if already synced |
| `--dry-run` | Print what would be migrated without writing |

```bash
mg-migrate ~/my-project
mg-migrate ~/my-project --dry-run
mg-migrate ~/my-project --force
```

---

## Claude Code Skills

Skills are invoked as slash commands in Claude Code sessions. They coordinate multi-agent workflows using the miniature-guacamole framework.

### Planning & Assessment

#### /mg-assess

Feature intake and evaluation workflow. Use for raw feature ideas, structured requests, or formal assessments.

```
/mg-assess evaluate login-redesign
```

#### /mg-assess-tech

Evaluates architecture decisions and technical approaches. Produces risk assessment and scalability analysis.

```
/mg-assess-tech review microservice-split
```

#### /mg-spec

Product definition, user stories, and design specs. Define requirements before engineering work begins.

```
/mg-spec define user-onboarding
```

#### /mg (leadership mode)

Strategic decisions, executive reviews, and code review approvals. Use for planning new initiatives or reviewing completed work.

```
/mg review WS-42
/mg plan new-auth-system
```

### Building & Implementation

#### /mg-build

Classify workstreams at intake and execute the appropriate development track: MECHANICAL (1 spawn) or ARCHITECTURAL (5-6 spawns).

```
/mg-build implement WS-42
/mg-build implement WS-42 --force-mechanical
/mg-build implement WS-42 --force-architectural
```

| Flag | Description |
|------|-------------|
| `--force-mechanical` | Override classification, use MECHANICAL track |
| `--force-architectural` | Override classification, use ARCHITECTURAL track |

#### /mg-debug

Structured debugging: reproduce the issue, investigate root cause, verify fix.

```
/mg-debug fix login-timeout
```

#### /mg-refactor

Safe refactoring: write characterization tests, restructure code, verify no regressions.

```
/mg-refactor extract auth-middleware
```

### Design & Visual

#### /mg-design

UI/UX design with visual regression review. Use for design direction, visual specs, or approving visual changes.

```
/mg-design create settings-page
```

#### /mg-design-review

Visual quality and UX assessment. Use for design reviews, brand consistency checks, or visual approval.

```
/mg-design-review check landing-page
```

### Code Quality & Security

#### /mg-code-review

Reviews code quality, standards compliance, test coverage, performance, and error handling.

```
/mg-code-review check PR-123
```

#### /mg-security-review

Comprehensive security audit: OWASP Top 10, authentication/authorization, input validation, XSS, and SQL injection.

```
/mg-security-review audit auth-module
```

#### /mg-accessibility-review

WCAG 2.1 AA/AAA compliance review. Covers keyboard navigation, screen reader testing, and inclusive design validation.

```
/mg-accessibility-review check dashboard
```

### Documentation & Content

#### /mg-document

Generate and maintain documentation: README, API docs, user guides, and documentation reviews.

```
/mg-document generate api-reference
```

#### /mg-write

Brand-aligned copywriting for marketing, narration, web content, and scripts.

```
/mg-write draft release-announcement
```

### Utilities & Housekeeping

#### /mg-init

Initialize a project for miniature-guacamole collaboration. Creates `.claude/memory/` structure, installs shared protocols, and detects tech stack.

```
/mg-init
```

#### /mg-add-context

Register external projects as read-only context references for MG agents.

```
/mg-add-context add ~/other-project
```

#### /mg-ticket

File a GitHub Issue from a CLI or co-work session. Automatically attaches MG version, current workstream, and recent errors.

```
/mg-ticket file "Login button unresponsive on mobile"
```

#### /mg-tidy

Reconcile project state: deduplicate GitHub issues, sync workstream memory, and generate a state report.

```
/mg-tidy
```

#### /mg

Lightweight dispatcher and front door to the mg-\* skill system. Routes to the right skill based on keywords or shows all available commands.

```
/mg
/mg build WS-42
```

---

## Daemon Commands

The `mg-daemon` CLI manages the autonomous pipeline that processes GitHub issues through the CAD development workflow.

```
mg-daemon <command> [options]
```

### init

Create a daemon configuration template. No-op if config already exists.

```bash
mg-daemon init
```

### start

Start the daemon process.

```bash
mg-daemon start                    # Background mode (default)
mg-daemon start --foreground       # Foreground with stdout logging
mg-daemon start -f                 # Short form
mg-daemon start --dry-run          # Plan tickets without executing builds
```

| Flag | Description |
|------|-------------|
| `--foreground`, `-f` | Run in foreground with stdout logs |
| `--dry-run` | Poll tickets and plan, but do not execute builds |

### stop

Stop the running daemon process.

```bash
mg-daemon stop
```

### status

Show daemon status, uptime, and heartbeat staleness.

```bash
mg-daemon status
```

### logs

Display daemon log output.

```bash
mg-daemon logs               # Last 50 lines (default)
mg-daemon logs --tail 100    # Last 100 lines
mg-daemon logs -n 200        # Short form
```

| Flag | Description |
|------|-------------|
| `--tail <n>`, `-n <n>` | Number of lines to show (default: 50) |

### install

Install the daemon as a macOS launchd service.

```bash
mg-daemon install
mg-daemon install --user mg-daemon   # Run as dedicated system user
```

| Flag | Description |
|------|-------------|
| `--user <username>` | Run daemon as a dedicated system user |

### uninstall

Remove the launchd service.

```bash
mg-daemon uninstall
```

### setup-mac

Validate macOS prerequisites and guide setup.

```bash
mg-daemon setup-mac
```

### setup-user

Create a dedicated system user for running the daemon securely.

```bash
mg-daemon setup-user              # Default username: mg-daemon
mg-daemon setup-user myuser       # Custom username
```

### dashboard

Show pipeline status in an 80-column ASCII dashboard.

```bash
mg-daemon dashboard
```

### resume

Clear error budget pause and resume ticket processing.

```bash
mg-daemon resume
```

---

## Environment Variables

| Variable | Used by | Description | Default |
|----------|---------|-------------|---------|
| `MG_POSTGRES_URL` | db-\*, migrate, memory-write | Postgres connection string | `postgresql://mg:mg@localhost:5432/mg_memory` |
| `MG_CONFIG_DIR` | config, migrate | Config directory | `~/.config/miniature-guacamole` |
| `MG_INSTALL_ROOT` | util | Installation root | `~/.miniature-guacamole` |

## Dependencies

| Tool | Required by | Purpose |
|------|-------------|---------|
| `jq` | Most scripts | JSON processing |
| `psql` | db-\*, migrate | Postgres client |
| `docker` | mg-postgres | Container management |
| `git` | git-summary, diff-summary, gate-check | Version control |
