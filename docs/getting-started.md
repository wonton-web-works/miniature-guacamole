# Getting Started

## Prerequisites

- [Claude Code CLI](https://claude.ai/code) installed and authenticated
- Bash 4.0+
- Git
- Docker (optional — for auto-provisioned Postgres)
- Node.js 20+ and npm (optional — for TypeScript memory layer development)

## Quick Start (3 commands)

```bash
# 1. Install
curl -fsSL https://raw.githubusercontent.com/rivermark-research/miniature-guacamole/main/src/installer/web-install.sh | bash

# 2. Start Claude Code
claude

# 3. Run a workflow
/mg-assess Build a user authentication system
```

That's it. Claude Code now has all 16 skills and 19 agents available.

## Installation Methods

### Method 1: Web Install (Recommended)

One-liner using `web-install.sh` — downloads and installs the latest release:

```bash
curl -fsSL https://raw.githubusercontent.com/rivermark-research/miniature-guacamole/main/src/installer/web-install.sh | bash
```

Or pin to a specific version:

```bash
curl -fsSL https://raw.githubusercontent.com/rivermark-research/miniature-guacamole/main/src/installer/web-install.sh -o mg-web-install.sh
chmod +x mg-web-install.sh
./mg-web-install.sh --version v1.0.0 /path/to/project
```

### Method 2: Tarball (Offline / CI)

Use this when you can't hit the network at install time, or in CI pipelines:

```bash
# Download the latest release
curl -fsSL https://github.com/rivermark-research/miniature-guacamole/releases/latest/download/miniature-guacamole.tar.gz -o mg.tar.gz
tar -xzf mg.tar.gz
cd miniature-guacamole

# Install to your project
./install.sh /path/to/your-project
```

### Method 3: From Source

```bash
# Clone the repository
git clone https://github.com/rivermark-research/miniature-guacamole.git
cd miniature-guacamole

# Build the distribution
./build.sh

# Install to a project
dist/miniature-guacamole/install.sh /path/to/your-project
```

## Project Initialization

### mg-init

After installing, run `/mg-init` in Claude Code to initialize your project:

```
/mg-init
```

What it does:
- Creates `.claude/memory/` — the project-local agent state directory
- Creates `.claude/CLAUDE.md` — project-specific context for agents
- Auto-provisions Postgres if Docker is available (`mg-postgres start`)
- Runs `mg-migrate` to sync any existing memory files to the database

You can also run it from the command line:

```bash
mg-init /path/to/project
```

Or pin to a specific version:

```bash
mg-init --version v1.0.0 /path/to/project
```

### File-Only Mode (--no-db)

Skip database setup entirely — useful for offline environments, CI, or projects that don't need cross-agent persistent state:

```bash
# During install
./install.sh --no-db /path/to/your-project

# Or during project init
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
- **Next.js dashboard** — available at http://localhost:3000

The dashboard uses a multi-stage Dockerfile with standalone Next.js output, so the production image only includes what's needed to run. No separate `npm run build` step required — Compose handles it.

If you want the memory layer to use Postgres, set `MG_POSTGRES_URL` before starting:

```bash
MG_POSTGRES_URL=postgresql://mg:mg@localhost:5432/mg_memory docker compose up
```

Without it, agents fall back to filesystem memory (`.claude/memory/`) automatically.

## What Gets Installed

The installer creates a `.claude/` directory in your project:

```
your-project/
└── .claude/
    ├── agents/           # 19 specialized agent roles
    ├── skills/           # 16 team collaboration workflows
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
# Check directory structure
ls .claude/

# List available agents
ls .claude/agents/

# List available scripts
ls .claude/scripts/

# Test a script
.claude/scripts/mg-help
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
- [Agent Reference](/agents) - All 19 agents and their roles

## Support

- [Report Issues](https://github.com/rivermark-research/miniature-guacamole/issues)
- [View Documentation](https://rivermarkresearch.github.io/miniature-guacamole/)
- [Contributing Guide](/contributing)
