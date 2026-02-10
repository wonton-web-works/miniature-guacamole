# miniature-guacamole Quick Start

## Installation (Choose One)

### Local Install
```bash
cd /path/to/your/project
/path/to/dist/miniature-guacamole/install.sh
```

### Web Install
```bash
curl -fsSL https://example.com/web-install.sh | bash
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

## What's Installed

```
.claude/
├── agents/           # 18 specialized roles
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

- **INSTALL-README.md** - Full installation guide
- **settings.json** - Permissions (customize as needed)
- **CLAUDE.md** - Framework documentation
- **MG_INSTALL.json** - Version and metadata

## Need Help?

1. Read `INSTALL-README.md` for detailed guide
2. Run `mg-help` for script documentation
3. Check `.claude/shared/` for protocols
4. See `.claude/agents/*/agent.md` for agent details

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
