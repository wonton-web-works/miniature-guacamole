# miniature-guacamole Config Cache

This directory contains shared configuration and templates for miniature-guacamole.

## Purpose

The `.mg-configs/` directory is the ONLY global directory used by miniature-guacamole.
All agents, skills, and protocols are stored project-locally in `.claude/` directories.

## Structure

```
~/.claude/.mg-configs/
├── scripts/          # mg-* utility scripts (symlinked or copied)
├── templates/        # Template files for project initialization
│   ├── agents/       # Agent AGENT.md templates
│   ├── skills/       # Skill SKILL.md templates
│   ├── shared/       # Protocol templates
│   ├── hooks/        # Hook script templates
│   ├── settings.json # Template settings.json with MG permissions
│   └── CLAUDE.md     # Template project context file
├── VERSION.json      # Framework version metadata
└── README.md         # This file
```

## Usage

To initialize a new project with miniature-guacamole:

```bash
mg-init /path/to/project
```

This copies templates from `~/.claude/.mg-configs/templates/` to the project's `.claude/` directory.

## Version Management

The `VERSION.json` file tracks the installed framework version:

- **name**: Framework name (always "miniature-guacamole")
- **version**: Semantic version (e.g., "2.0.0")
- **channel**: Release channel ("stable", "beta", "dev")
- **installed_at**: ISO 8601 timestamp of initial installation
- **last_updated**: ISO 8601 timestamp of last update
- **source**: Installation source ("local-build", "npm", "git")

## Data Isolation

miniature-guacamole is **NDA-safe**:

- **Config cache** (`~/.claude/.mg-configs/`): Shared templates and scripts only
- **Project memory** (`.claude/memory/`): Project-specific data, never shared
- No code or data crosses between clients or projects

## Migration from Global Installation

Prior to v2.0.0, miniature-guacamole installed globally to `~/.claude/`. The new
project-local architecture moves all project-specific content to `.claude/` within
each project directory.

### What Changed

**Before (v1.x - Global)**:
```
~/.claude/
├── agents/           # Shared globally
├── skills/           # Shared globally
├── shared/           # Shared globally
├── scripts/          # Shared globally
└── settings.json     # Global configuration
```

**After (v2.x - Project-Local)**:
```
~/.claude/.mg-configs/   # Minimal global cache
└── templates/           # Templates only

<project>/.claude/       # Per-project installation
├── agents/              # Copied from templates
├── skills/              # Copied from templates
├── shared/              # Copied from templates
├── scripts/             # Copied from templates
├── memory/              # Project-specific data
├── settings.json        # Project-specific config
└── MG_PROJECT           # Marker file
```

## Script Utilities

The framework includes 9 mg-* utility scripts:

- **mg-init** - Initialize a project with miniature-guacamole
- **mg-memory-read** - Read and pretty-print JSON memory files
- **mg-memory-write** - Atomically update JSON with automatic backups
- **mg-workstream-status** - Display workstream state and progress
- **mg-workstream-create** - Create new workstream tracking files
- **mg-workstream-transition** - Move workstream between phases
- **mg-gate-check** - Run mechanical quality gate checks
- **mg-git-summary** - Get repository status summary
- **mg-diff-summary** - Get diff summary for commits
- **mg-help** - Show help for any mg-* command

Run `mg-help <command>` for detailed usage of any script.

## Installation

To set up the config cache:

1. Build the distribution: `npm run build`
2. Run the installer: `scripts/install.sh`
3. Initialize projects: `mg-init /path/to/project`

## Maintenance

### Updating Templates

Templates are stored in `~/.claude/.mg-configs/templates/`. To update:

1. Edit templates in the miniature-guacamole repository
2. Rebuild distribution: `npm run build`
3. Reinstall: `scripts/install.sh`

Existing projects are not automatically updated. To update a project:

```bash
mg-init --force /path/to/project
```

### Version Tracking

Check installed version:

```bash
cat ~/.claude/.mg-configs/VERSION.json
```

Update framework:

```bash
cd /path/to/miniature-guacamole
git pull
npm run build
scripts/install.sh
```

## License

Part of the miniature-guacamole framework.
See LICENSE file in the repository root.
