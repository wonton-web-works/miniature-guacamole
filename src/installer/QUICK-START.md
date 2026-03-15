# miniature-guacamole Quick Start

## Installation — web-install.sh (curl), local install, or mg-init

### Web Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/wonton-web-works/miniature-guacamole/main/src/installer/web-install.sh | bash
```

### Local Install
```bash
cd /path/to/your/project
/path/to/dist/miniature-guacamole/install.sh
```

### Config Cache + mg-init
```bash
# One-time setup
/path/to/dist/miniature-guacamole/install.sh --config-cache
export PATH="$PATH:~/.claude/.mg-configs/scripts"

# Then for any project
cd /path/to/project
mg-init
```

## Launch Claude Code

After install, navigate to your project and start Claude Code:

```bash
claude
```

# Output: Claude Code launches with all skills and agents available — type /help to see them

## Common Tasks

### Check Version
```bash
cat .claude/MG_INSTALL.json
```

### Upgrade
```bash
/path/to/new/dist/miniature-guacamole/install.sh --force
```

### Uninstall (Keep Data)
```bash
/path/to/dist/miniature-guacamole/uninstall.sh
```

### Uninstall (Remove All)
```bash
/path/to/dist/miniature-guacamole/uninstall.sh --purge
```

### File-Only Mode (Skip Database)

If you don't need a database or are working offline, install with `--no-db`:

```bash
./install.sh --no-db
```

This skips database setup and runs entirely on local files.

## What's Installed

```
.claude/
├── agents/           # 20 specialized roles
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
/mg-leadership-team review WS-42
/mg-build implement feature X
/mg-code-review check PR-123
```

### Scripts (Use in Terminal)
```bash
mg-memory-read .claude/memory/tasks-dev.json
mg-workstream-status WS-42
mg-gate-check
mg-help
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

1. Run `mg-help` for script documentation
2. Check `.claude/shared/` for protocols
3. See `.claude/agents/*/agent.md` for agent details

## Data Isolation

- All files are **project-local** (in `.claude/`)
- Memory is **never committed** (`.gitignore`)
- No data crosses between projects
- `~/.claude/` is **never modified** (except optional config cache)

## Quick Reference

| Command | Purpose |
|---------|---------|
| `install.sh` | Install framework |
| `install.sh --force` | Upgrade framework |
| `install.sh --no-db` | Install without database (file-only mode) |
| `install.sh --config-cache` | Install global cache |
| `uninstall.sh` | Remove framework (keep data) |
| `uninstall.sh --purge` | Remove everything |
| `mg-init` | Initialize from cache |
| `mg-help` | Show script help |

## Version Info

Check installed version:
```bash
cat .claude/MG_INSTALL.json | grep version
```

Check available version:
```bash
cat /path/to/dist/miniature-guacamole/VERSION.json
```
