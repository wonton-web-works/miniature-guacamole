# miniature-guacamole Quick Start

## Install (one time)

```bash
curl -fsSL https://raw.githubusercontent.com/wonton-web-works/miniature-guacamole/main/src/installer/web-install.sh | bash
```

This installs the framework bundle to `~/.miniature-guacamole/` and symlinks all `mg-*` scripts to `~/.local/bin/`.

## Initialize a Project

```bash
cd /path/to/your/project
mg-init
```

Reads from the global bundle — no network required. Run this in every project you want to use miniature-guacamole with.

## Launch Claude Code

```bash
claude
```

All skills and agents are available. Type `/help` to see them.

## Common Tasks

### Check Version
```bash
mg version
# or
cat .claude/MG_INSTALL.json
```

### Upgrade
```bash
# Re-run the global installer
curl -fsSL https://raw.githubusercontent.com/wonton-web-works/miniature-guacamole/main/src/installer/web-install.sh | bash -s -- --force

# Then re-init each project
mg-init --force
```

### Uninstall from a Project
```bash
# Keep memory
dist/miniature-guacamole/uninstall.sh

# Remove everything
dist/miniature-guacamole/uninstall.sh --purge
```

### File-Only Mode (Skip Database)

```bash
mg-init --no-db
```

Skips Postgres setup. Runs entirely on local JSON files.

## What's Installed

### Global (`~/.miniature-guacamole/`)
```
~/.miniature-guacamole/
├── .claude/           # Framework bundle (agents, skills, scripts, etc.)
├── install.sh         # Per-project installer
├── mg-init            # Per-project init script
├── templates/         # Project scaffolding templates
└── VERSION.json       # Version metadata
```

### Per-Project (`.claude/`)
```
.claude/
├── agents/           # 24 specialized roles
├── skills/           # Team collaboration
├── shared/           # Protocols & standards
├── scripts/          # mg-* utilities
├── hooks/            # Project init check
├── memory/           # Agent memory (gitignored)
├── settings.json     # Project permissions
├── CLAUDE.md         # Framework docs
└── MG_INSTALL.json   # Metadata
```

## Using the Framework

### Skills (Use in Chat)
```
/mg plan new-auth-system
/mg review WS-42
/mg-build implement feature X
/mg-code-review check PR-123
```

### Scripts (Use in Terminal)
```bash
mg workstream status WS-42
mg memory read .claude/memory/tasks-dev.json
mg gate check
mg help
```

### Agents (Spawn from Code)
```python
Task(subagent_type="qa", prompt="Create tests for login")
Task(subagent_type="dev", prompt="Implement auth")
```

## Key Files

- **settings.json** - Permissions (customize as needed)
- **CLAUDE.md** - Framework documentation
- **MG_INSTALL.json** - Version and metadata

## Need Help?

1. Run `mg help` for script documentation
2. Check `.claude/shared/` for protocols
3. See `.claude/agents/*/agent.md` for agent details

## Data Isolation

- All project files are **project-local** (in `.claude/`)
- Memory is **never committed** (`.gitignore`)
- No data crosses between projects
- Global bundle is read-only source material

## Quick Reference

| Command | Purpose |
|---------|---------|
| `web-install.sh` | Global install (one time) |
| `mg-init` | Initialize a project from global bundle |
| `mg-init --force` | Re-initialize (upgrade) |
| `mg-init --no-db` | Initialize without database |
| `install.sh <dir>` | Direct install (offline/CI) |
| `uninstall.sh` | Remove framework (keep data) |
| `uninstall.sh --purge` | Remove everything |
| `mg help` | Show script help |
| `mg version` | Show version |
