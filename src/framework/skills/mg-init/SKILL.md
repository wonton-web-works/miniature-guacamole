---
name: mg-init
description: "Initialize a project for miniature-guacamole agent collaboration. Creates .claude/memory/, installs shared protocols, detects tech stack."
model: sonnet
allowed-tools: Read, Glob, Bash, Write
compatibility: "Requires Claude Code"
metadata:
  version: "1.0"
---

# /mg-init

Initialize a project for miniature-guacamole agent collaboration.

## Purpose

Sets up the `.claude/` directory structure in the current project, enabling:
- Agent memory protocol (project-local state tracking)
- Shared protocols (CAD development workflow, memory, handoff, etc.)
- Tech stack detection and context generation
- Modular project rules

## Architecture Decisions

- **DEC-INIT-002**: This skill prompts the user and explains what it will do. It does NOT auto-scaffold without confirmation.
- **DEC-INIT-003**: Uses modular `.claude/rules/*.md` structure for project context (not monolithic files)
- **DEC-INIT-005**: Lightweight tech stack detection - identifies what exists, doesn't prescribe tools
- **DEC-INIT-006**: NEVER overwrites existing `.claude/` content - safe to run multiple times (idempotent)

## What This Skill Does

### 1. Create .claude/memory/ Directory

Creates the memory directory where agents store project-local state:
- Task queues (`tasks-{role}.json`)
- Handoffs between agents (`handoffs-{from}-{to}.json`)
- Workstream state (`workstream-{id}-state.json`)
- Architecture decisions (`decisions.json`)

**Important**: Creates `.claude/memory/.gitignore` to prevent committing memory files to shared repositories:

```gitignore
# Ignore all memory files (agent task queues, state, etc.)
*.json

# Keep .gitignore itself
!.gitignore
```

### 2. Create Brand File Templates in .claude/memory/

Creates empty template files for brand and design system data:

- **`.claude/memory/brand-guidelines.json`** — verbal identity and high-level visual brand decisions. Read by art-director before every visual review.
- **`.claude/memory/design-system.json`** — machine-readable design tokens (colors, typography, spacing, components). Read by design agent and art-director.

Both files are created with the minimal valid schema structure (all required top-level fields present, values left empty for the team to fill in via `/mg-design`).

**Idempotency**: If either file already exists in `.claude/memory/`, it is NOT overwritten. Existing brand decisions are always preserved.

### 3. Install Shared Protocols to .claude/shared/

Installs the 6 shared protocols to `.claude/shared/`:

1. `development-workflow.md` - Gate-based development process
2. `engineering-principles.md` - Code quality standards
3. `handoff-protocol.md` - Agent coordination patterns
4. `memory-protocol.md` - How agents read/write memory
5. `tdd-workflow.md` - Test-driven development cycle
6. `visual-formatting.md` - ASCII art for progress reports

**Why install to each project?** Projects can customize protocols without affecting other projects. This maintains project isolation.

**Preservation**: If a protocol file already exists in `.claude/shared/`, it is NOT overwritten. User customizations are preserved.

### 4. Detect Tech Stack

Performs lightweight detection by checking for common project markers:

| Language/Framework | Detection Files |
|--------------------|-----------------|
| Node.js/TypeScript | `package.json`, `tsconfig.json` |
| Rust | `Cargo.toml` |
| Python | `pyproject.toml`, `requirements.txt`, `setup.py` |
| Go | `go.mod` |
| Java | `pom.xml`, `build.gradle` |

Detection is **lightweight** (per DEC-INIT-005): Only checks for file existence, doesn't parse contents or prescribe tools.

### 5. Generate .claude/rules/*.md with Project Context

Creates modular rules files (per DEC-INIT-003):

**`.claude/rules/README.md`**
Explains the rules structure and how agents use it.

**`.claude/rules/project-context.md`**
Overview of the project:
- Project name (from package.json, Cargo.toml, etc.)
- Detected tech stack
- Repository information (if .git exists)
- General purpose/domain

**`.claude/rules/tech-stack.md`**
Detailed tech stack information:
- Languages detected
- Frameworks/tools found
- Build system
- Testing framework (if detectable)

**Additional rules (optional)**:
- `.claude/rules/architecture.md` - Architecture notes (template)
- `.claude/rules/conventions.md` - Project conventions (template)

**Preservation**: Existing rules files are NEVER overwritten. If `.claude/rules/custom-rule.md` exists, it's preserved. Only missing files are created.

## Usage Pattern

### First Time in a New Project

```
User: /mg-init
```

The skill will:
1. Confirm project directory (show current directory)
2. List what will be created/copied
3. Ask for confirmation
4. Create directories and files
5. Report what was created

### Re-running (Idempotency)

```
User: /mg-init
```

If `.claude/` already exists:
- Check what's already present
- Only create missing pieces
- Preserve all existing content
- Report what was skipped vs. created

### Example Execution Flow

```
Initializing project in: /Users/dev/my-project

Detected project markers:
  ✓ package.json (Node.js)
  ✓ tsconfig.json (TypeScript)
  ✓ .git (Git repository)

Will create:
  • .claude/memory/ with .gitignore
  • .claude/shared/ (copy 6 protocols)
  • .claude/rules/ with README, project-context, tech-stack

Existing content will be preserved.

Proceed? (yes/no)
```

After user confirms:

```
Creating project structure...

  ✓ Created .claude/memory/
  ✓ Created .claude/memory/.gitignore
  ✓ Copied development-workflow.md to .claude/shared/
  ✓ Copied engineering-principles.md to .claude/shared/
  ✓ Copied handoff-protocol.md to .claude/shared/
  ✓ Copied memory-protocol.md to .claude/shared/
  ✓ Copied tdd-workflow.md to .claude/shared/
  ✓ Copied visual-formatting.md to .claude/shared/
  ✓ Created .claude/rules/README.md
  ✓ Created .claude/rules/project-context.md
  ✓ Created .claude/rules/tech-stack.md

Project initialized successfully!

Tech stack detected:
  • Node.js (package.json)
  • TypeScript (tsconfig.json)

Next steps:
  1. Review .claude/rules/project-context.md and customize as needed
  2. Add architecture notes to .claude/rules/architecture.md (optional)
  3. Define project conventions in .claude/rules/conventions.md (optional)
  4. Start using agent skills: /mg-leadership-team, /mg-build, etc.
```

## Project-Local Memory Isolation

**Critical**: This skill creates `.claude/` in the **current directory** (project-local).

- Each project has its own `.claude/memory/` directory
- Memory files are ignored by git (`.claude/memory/.gitignore`)
- No data crosses between projects or clients
- NDA-safe architecture

**Absolute paths are NEVER used** in generated files.

## Implementation Notes

- Use `mkdir -p` for idempotent directory creation
- Check file existence before writing (`[ ! -f path ]`) to preserve user customizations
- Tech stack detection is file-existence only: package.json (Node.js), tsconfig.json (TypeScript), Cargo.toml (Rust), go.mod (Go), pyproject.toml/requirements.txt (Python)
- Related decisions: DEC-INIT-003 (modular rules), DEC-INIT-005 (lightweight detection), DEC-INIT-006 (no overwrite)

## Constitution

1. **Idempotent** - Safe to run multiple times; never overwrites existing content
2. **Confirm before creating** - Prompt user and explain what will be created, require confirmation
3. **Preserve user content** - Existing `.claude/` files are never overwritten
4. **Lightweight detection** - Tech stack detection checks file existence only, no parsing
5. **Project isolation** - All created files are project-local; no absolute paths in generated files
6. **Follow output format** — See `references/output-format.md` for standard visual patterns

## Boundaries

**CAN:** Create `.claude/` directory structure, install shared protocols, detect tech stack, generate rules templates, run idempotently
**CANNOT:** Overwrite existing `.claude/` files, commit files to git, modify global `~/.claude/` config, run without user confirmation
**ESCALATES TO:** engineering-manager (if project structure conflicts or install errors occur)
