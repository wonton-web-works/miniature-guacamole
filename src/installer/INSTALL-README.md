# miniature-guacamole Installation Guide

This directory contains the miniature-guacamole v1.x distribution with project-local installation.

## Overview

miniature-guacamole v1.x uses **project-local installation** - all framework files are installed to your project's `.claude/` directory, not to `~/.claude/`. This provides:

- Complete data isolation between projects
- No global configuration changes
- Easy per-project version management
- NDA-safe architecture (no data sharing)

## Installation Methods

### Method 1: Local Installation (Recommended for Development)

From the distribution directory:

```bash
cd /path/to/dist/miniature-guacamole
./install.sh /path/to/your/project
```

Or install to current directory:

```bash
cd /path/to/your/project
/path/to/dist/miniature-guacamole/install.sh
```

**Options:**
- `--force` - Force re-installation (overwrites existing files)
- `--config-cache` - Also install config cache to `~/.claude/.mg-configs/`
- `--help` - Show help message

**Examples:**
```bash
# Install to current directory
./install.sh

# Install to specific project
./install.sh /path/to/project

# Force re-install
./install.sh --force

# Install with config cache
./install.sh --config-cache
```

### Method 2: Web Installation (For Public Releases)

Download and install from GitHub releases:

```bash
curl -fsSL https://raw.githubusercontent.com/USER/REPO/main/web-install.sh | bash
```

Or with options:

```bash
# Download the script first
curl -fsSL https://raw.githubusercontent.com/USER/REPO/main/web-install.sh -o mg-web-install.sh
chmod +x mg-web-install.sh

# Install with options
./mg-web-install.sh --version v1.0.0 /path/to/project
```

**Options:**
- `--version TAG` - Install specific version (default: latest)
- `--force` - Force re-installation
- `--config-cache` - Also install config cache
- `--help` - Show help message

### Method 3: Using mg-init (From Config Cache)

If you've installed the config cache to `~/.claude/.mg-configs/`:

```bash
# Add to PATH first
export PATH="$PATH:~/.claude/.mg-configs/scripts"

# Initialize project
cd /path/to/your/project
mg-init
```

## What Gets Installed

The installer creates the following structure in `.claude/`:

```
.claude/
├── agents/           # 18 specialized agent roles
├── skills/           # Team collaboration skills
├── shared/           # Development protocols
├── scripts/          # mg-* utility commands
├── hooks/            # Project initialization hook
├── memory/           # Agent memory directory (with .gitignore)
├── schemas/          # JSON schemas (if present)
├── settings.json     # Project-level permissions
├── CLAUDE.md         # Framework documentation
├── team-config.yaml  # Team configuration
├── team-config.json  # Team configuration (JSON)
├── MG_INSTALL.json   # Installation metadata
└── MG_PROJECT        # Marker file
```

## Installation Behavior

### Fresh Installation

- Creates `.claude/` directory structure
- Copies all framework components
- Creates `settings.json` from template
- Creates `CLAUDE.md` from template
- Creates `memory/` with `.gitignore`
- Creates `MG_INSTALL.json` with metadata
- Creates `MG_PROJECT` marker

### Upgrade Installation (with --force)

- Backs up existing `settings.json` (preserves user customizations)
- Merges framework permissions into existing settings
- Updates `CLAUDE.md` (preserves user content between markers)
- Updates framework components
- Preserves `memory/` directory (user data)
- Updates `MG_INSTALL.json` with new timestamp

## Uninstallation

### Basic Uninstall (Preserves User Data)

```bash
cd /path/to/your/project
/path/to/dist/miniature-guacamole/uninstall.sh
```

This removes framework files but preserves:
- `.claude/memory/` (user data)
- User sections of `.claude/CLAUDE.md`
- User customizations in `.claude/settings.json`

**Options:**
- `--force` - Skip confirmation prompt
- `--help` - Show help message

### Complete Removal (DESTRUCTIVE)

```bash
./uninstall.sh --purge
```

This removes EVERYTHING including:
- `.claude/memory/` (ALL USER DATA)
- `.claude/settings.json`
- `.claude/CLAUDE.md`
- All framework files

**Warning:** `--purge` is destructive and cannot be undone!

## Version Management

### Check Installed Version

```bash
cat .claude/MG_INSTALL.json
```

Example output:
```json
{
  "framework": "miniature-guacamole",
  "version": "1.0.0",
  "installed_at": "2026-02-09T12:00:00Z",
  "updated_at": "2026-02-09T12:00:00Z",
  "source": "local-build",
  "source_path": "/path/to/dist/miniature-guacamole",
  "install_method": "install.sh",
  "components": {
    "agents": 18,
    "skills": 14,
    "scripts": 10,
    "shared": 6,
    "hooks": 1
  }
}
```

### Upgrade to New Version

```bash
# Download new version
cd /path/to/new/dist/miniature-guacamole

# Upgrade (overwrites framework, preserves user data)
./install.sh --force /path/to/your/project
```

## Config Cache (Optional)

The config cache allows you to initialize multiple projects without keeping the full distribution around.

### Install Config Cache

```bash
./install.sh --config-cache
```

This installs to `~/.claude/.mg-configs/`:
```
~/.claude/.mg-configs/
├── templates/        # Installation templates
├── scripts/          # mg-* utilities including mg-init
└── VERSION.json      # Version metadata
```

### Use Config Cache

```bash
# Add to PATH
export PATH="$PATH:~/.claude/.mg-configs/scripts"

# Initialize any project
cd /path/to/project
mg-init
```

## Troubleshooting

### "Project already has miniature-guacamole installed"

Use `--force` to re-install:
```bash
./install.sh --force
```

### "Source .claude directory not found"

Make sure you're running the installer from the correct directory:
```bash
cd /path/to/dist/miniature-guacamole
./install.sh
```

### Permission Denied

Make sure the scripts are executable:
```bash
chmod +x install.sh uninstall.sh web-install.sh
```

### Python Not Found

The installer requires Python 3 for settings merge. Install Python 3:
```bash
# macOS
brew install python3

# Ubuntu/Debian
apt-get install python3

# Other systems - see python.org
```

## Data Isolation & Security

### What's Project-Local

Everything in `.claude/` is project-local:
- Framework files (agents, skills, shared)
- Project settings (settings.json)
- Project context (CLAUDE.md)
- Agent memory (memory/)

### What's Global (Optional)

Only the config cache is global (if installed):
- `~/.claude/.mg-configs/` - Installation templates
- No project data, code, or memory

### NDA-Safe Architecture

- All project data stays in project directory
- No data crosses between projects
- No data shared with other users
- Memory is never committed (`.gitignore` in `memory/`)

## Migration from v1.x

If you have v1.x installed globally at `~/.claude/`:

1. Backup your global settings:
   ```bash
   cp ~/.claude/settings.json ~/.claude/settings.json.v1.backup
   ```

2. Uninstall v1.x:
   ```bash
   # Remove symlinks from v1.x
   rm ~/.claude/agents ~/.claude/skills ~/.claude/shared
   ```

3. Install v1.x project-locally:
   ```bash
   cd /path/to/your/project
   /path/to/dist/miniature-guacamole/install.sh
   ```

4. Restore any custom settings if needed:
   ```bash
   # Manually merge your v1 settings into project .claude/settings.json
   ```

## Next Steps

After installation:

1. **Review Settings:**
   ```bash
   cat .claude/settings.json
   ```

2. **Review Context:**
   ```bash
   cat .claude/CLAUDE.md
   ```

3. **Add Scripts to PATH:**
   ```bash
   export PATH="$PATH:$PWD/.claude/scripts"
   ```

4. **Explore Framework:**
   ```bash
   mg-help
   ls .claude/agents/
   ls .claude/skills/
   ```

5. **Start Using:**
   - Use skills: `/mg-leadership-team`, `/mg-build`, etc.
   - Spawn agents: `Task(subagent_type="qa", prompt="...")`
   - Run scripts: `mg-memory-read`, `mg-workstream-status`, etc.

## Support

- **Documentation:** See `.claude/shared/` for protocol documents
- **Agent Definitions:** See `.claude/agents/{agent-name}/agent.md`
- **Skill Definitions:** See `.claude/skills/{skill-name}/skill.md`
- **GitHub:** https://github.com/USER/REPO (update with actual URL)

## License

See LICENSE file in the repository.
