# Getting Started

## Prerequisites

- [Claude Code CLI](https://claude.ai/code) installed and authenticated
- Bash 4.0+
- Git
- Docker (optional — for auto-provisioned Postgres)
- Node.js 20+ and npm (optional — for TypeScript memory layer development)

## Quick Start (3 commands)

```bash
# 1. Install globally (one time)
curl -fsSL https://raw.githubusercontent.com/wonton-web-works/miniature-guacamole/main/src/installer/web-install.sh | bash

# 2. Initialize your project
cd your-project
mg-init

# 3. Start Claude Code and run a workflow
claude
/mg-assess Build a user authentication system
```

That's it. Claude Code now has all 18 skills and 20 agents available. Type `/mg` to see them all.

> **`mg-init` vs `/mg-init`** — `mg-init` is a shell script you run in your terminal. It reads from `~/.miniature-guacamole/` and installs the framework into your project's `.claude/` directory. `/mg-init` is a Claude Code skill you run inside a session. It creates `.claude/memory/`, detects your tech stack, and generates project-specific context. Run the shell script first to install, then the skill to initialize.

## What You Just Got

You now have 18 skills, 20 agents, and a shared memory system installed in `.claude/`. Here's what that means:

- **Skills** are slash commands (`/mg-build`, `/mg-assess`, etc.) that coordinate multi-agent workflows
- **Agents** are specialized roles (CEO, QA, Dev, etc.) that skills delegate work to
- **Memory** is a project-local state system in `.claude/memory/` where agents track tasks, decisions, and handoffs

## Installation Methods

### Method 1: Web Install (Recommended)

Two-step process — install once globally, then init per project:

```bash
# Install globally (puts mg + mg-init on PATH)
curl -fsSL https://raw.githubusercontent.com/wonton-web-works/miniature-guacamole/main/src/installer/web-install.sh | bash

# Init any project (reads from ~/.miniature-guacamole/, no network needed)
cd your-project
mg-init
```

Or pin to a specific version:

```bash
curl -fsSL https://raw.githubusercontent.com/wonton-web-works/miniature-guacamole/main/src/installer/web-install.sh -o mg-web-install.sh
chmod +x mg-web-install.sh
./mg-web-install.sh --version v2.1.0
```

The global installer:
- Downloads the release tarball from GitHub
- Installs the framework bundle to `~/.miniature-guacamole/`
- Symlinks all `mg-*` scripts to `~/.local/bin/`
- Adds `~/.local/bin` to PATH if needed

Then `mg-init` in any project directory reads from the global bundle — no network required.

### Method 2: Tarball (Offline / CI)

Use this when you can't hit the network at install time, or in CI pipelines:

```bash
# Download the latest release
curl -fsSL https://github.com/wonton-web-works/miniature-guacamole/releases/latest/download/miniature-guacamole.tar.gz -o mg.tar.gz
tar -xzf mg.tar.gz
cd miniature-guacamole

# Install directly to a project (skips global install)
./install.sh /path/to/your-project
```

### Method 3: From Source

```bash
# Clone the repository
git clone https://github.com/wonton-web-works/miniature-guacamole.git
cd miniature-guacamole

# Build the distribution
./build.sh

# Install to a project
dist/miniature-guacamole/install.sh /path/to/your-project
```

## Project Initialization

### mg-init

After the global install, run `mg-init` in any project directory:

```bash
cd your-project
mg-init
```

What it does:
- Runs `install.sh` from `~/.miniature-guacamole/` against your project
- Creates `.claude/` with all agents, skills, scripts, and protocols
- Creates `.claude/memory/` — the project-local agent state directory
- Auto-provisions Postgres if Docker is available (`mg-postgres start`)
- Runs `mg-migrate` to sync any existing memory files to the database

Then run `/mg-init` inside Claude Code to generate project-specific context.

### File-Only Mode (--no-db)

Skip database setup entirely — useful for offline environments, CI, or projects that don't need cross-agent persistent state:

```bash
mg-init --no-db
```

With `--no-db`, all agent memory stays in local JSON files under `.claude/memory/`. Everything still works — you just don't get the Postgres-backed query layer.

## Docker Compose

The easiest way to get Postgres and the dashboard running locally is Docker Compose:

```bash
docker compose up
```

This starts two services:

- **Postgres** — the memory backend, accessible on port 5432
- **Next.js dashboard** — available at `http://localhost:4242`

The dashboard uses a multi-stage Dockerfile with standalone Next.js output, so the production image only includes what's needed to run. No separate `npm run build` step required — Compose handles it.

If you want the memory layer to use Postgres, set `MG_POSTGRES_URL` before starting:

```bash
MG_POSTGRES_URL=postgresql://mg:mg@localhost:5432/mg_memory docker compose up
```

Without it, agents fall back to filesystem memory (`.claude/memory/`) automatically.

## What Gets Installed

### Global (`~/.miniature-guacamole/`)

The full framework bundle — used as the source for per-project init:

```
~/.miniature-guacamole/
├── .claude/              # Framework files (agents, skills, scripts, etc.)
├── install.sh            # Project-level installer
├── mg-init               # Per-project init script
├── templates/            # Project scaffolding templates
└── VERSION.json          # Installed version metadata
```

### Per-Project (`.claude/`)

```
your-project/
└── .claude/
    ├── agents/           # 20 specialized agent roles
    ├── skills/           # 18 team collaboration workflows
    ├── shared/           # 6 protocol documents
    ├── scripts/          # 17 mg-* utility commands
    ├── hooks/            # Project initialization and safety checks
    ├── memory/           # Agent state (gitignored)
    ├── settings.json     # Project-level permissions
    ├── CLAUDE.md         # Framework documentation
    ├── team-config.yaml  # Framework configuration
    └── MG_INSTALL.json   # Installation metadata
```

## Verify Installation

```bash
# Check global install
which mg
mg version

# Check project install
ls .claude/
ls .claude/agents/
ls .claude/scripts/

# Test a script
mg help
```

In Claude Code:

```
/help
# Should show all available skills

/mg-assess What should we build next?
# Should invoke the feature assessment workflow
```

## First Workflow

The standard CAD development cycle looks like this:

**1. Plan the work**
```
/mg-leadership-team Build a user authentication system
```
Output: Executive review + workstream plan (WS-1, WS-2, WS-3, ...)

**2. Execute a workstream**
```
/mg-build Execute WS-1: Add login endpoint
```
QA writes failing tests → Dev implements → QA verifies 99% coverage → Staff Engineer or mechanical gate review

**3. Leadership approves**
```
/mg-leadership-team Review WS-1 on branch feature/ws-1-login
```

**4. Merge**
```
/deployment-engineer Merge feature/ws-1-login
```

## Troubleshooting

### mg-init: command not found

Make sure `~/.local/bin` is on your PATH:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Add this to your `~/.zshrc` or `~/.bashrc` to make it permanent. The global installer normally does this automatically.

### mg-init: "miniature-guacamole is not installed globally"

Run the global installer first:

```bash
curl -fsSL https://raw.githubusercontent.com/wonton-web-works/miniature-guacamole/main/src/installer/web-install.sh | bash
```

### Agent not found

1. Verify `.claude/` exists in your project root
2. Check that `skills/` and `agents/` directories are present
3. Restart Claude Code

### Postgres not starting

If Docker isn't available, mg-init will fall back to file-only mode automatically. To explicitly skip it:

```bash
mg-init --no-db
```

If you have Docker but it's not running, start it and re-run `mg-init`.

### Scripts not executable

```bash
chmod +x .claude/scripts/mg-*
```

### Missing Node.js dependencies

If the TypeScript memory layer fails:

```bash
npm install
npm test  # Verify it works
```

## Next Steps

- [Workflow Guide](/workflows) - Learn the full CAD development cycle
- [Architecture Overview](/architecture) - Agent hierarchy, delegation model, memory layer
- [Agent Reference](/agents) - All 20 agents and their roles

## Support

- [Report Issues](https://github.com/wonton-web-works/miniature-guacamole/issues)
- [View Documentation](https://wonton-web-works.github.io/miniature-guacamole/)
- [Contributing Guide](/contributing)
