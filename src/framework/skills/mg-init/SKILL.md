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

### 2. Install Shared Protocols to .claude/shared/

Installs the 6 shared protocols to `.claude/shared/`:

1. `development-workflow.md` - Gate-based development process
2. `engineering-principles.md` - Code quality standards
3. `handoff-protocol.md` - Agent coordination patterns
4. `memory-protocol.md` - How agents read/write memory
5. `tdd-workflow.md` - Test-driven development cycle
6. `visual-formatting.md` - ASCII art for progress reports

**Why install to each project?** Projects can customize protocols without affecting other projects. This maintains project isolation.

**Preservation**: If a protocol file already exists in `.claude/shared/`, it is NOT overwritten. User customizations are preserved.

### 3. Detect Tech Stack

Performs lightweight detection by checking for common project markers:

| Language/Framework | Detection Files |
|--------------------|-----------------|
| Node.js/TypeScript | `package.json`, `tsconfig.json` |
| Rust | `Cargo.toml` |
| Python | `pyproject.toml`, `requirements.txt`, `setup.py` |
| Go | `go.mod` |
| Java | `pom.xml`, `build.gradle` |

Detection is **lightweight** (per DEC-INIT-005): Only checks for file existence, doesn't parse contents or prescribe tools.

### 4. Generate .claude/rules/*.md with Project Context

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

### Directory Creation (Idempotent)

Use conditional directory creation:

```bash
mkdir -p .claude/memory
mkdir -p .claude/shared
mkdir -p .claude/rules
```

This is safe to run multiple times - won't fail if directories already exist.

### File Creation (No Overwrite)

Before creating any file, check if it exists:

```bash
if [ ! -f .claude/memory/.gitignore ]; then
    cat > .claude/memory/.gitignore <<'EOF'
# Ignore all memory files (agent task queues, state, etc.)
*.json

# Keep .gitignore itself
!.gitignore
EOF
fi
```

### Protocol Installation (Preserve Existing)

```bash
# Protocols are installed as part of the framework installation
# The installer copies them to .claude/shared/
# This section shows the preservation logic only

for protocol in development-workflow.md engineering-principles.md handoff-protocol.md memory-protocol.md tdd-workflow.md visual-formatting.md; do
    if [ ! -f .claude/shared/$protocol ]; then
        echo "  ✓ Installing $protocol to .claude/shared/"
        # Actual copy happens in installer
    else
        echo "  ⊘ Skipped $protocol (already exists, preserving customizations)"
    fi
done
```

### Tech Stack Detection

Simple file existence checks:

```bash
detected_tech=()

[ -f package.json ] && detected_tech+=("Node.js")
[ -f tsconfig.json ] && detected_tech+=("TypeScript")
[ -f Cargo.toml ] && detected_tech+=("Rust")
[ -f go.mod ] && detected_tech+=("Go")
[ -f pyproject.toml ] && detected_tech+=("Python")
[ -f requirements.txt ] && detected_tech+=("Python")
```

No parsing, no version detection, no prescriptive configuration - just identify what's present.

## Verification

To verify this skill is properly installed:

```bash
# Check skill exists in project
ls -la .claude/skills/mg-init/SKILL.md

# Check it's available in project
ls .claude/skills/ | grep mg-init
```

To test the skill in a sample project:

```bash
cd /tmp/test-project
npm init -y  # Create package.json
/mg-init  # Run the skill
```

Expected result:
- `.claude/memory/` created with `.gitignore`
- `.claude/shared/` created with 6 protocol files
- `.claude/rules/` created with README, project-context, tech-stack
- Tech stack detection identifies Node.js

## Related Documentation

- Architecture Decision: DEC-INIT-003 (Modular rules structure)
- Architecture Decision: DEC-INIT-006 (No overwrite policy)
- Verification: `tests/verify-ws-init-2.sh`

## Maintenance

When adding new shared protocols to the framework:
1. Add to `src/framework/shared/`
2. Update installer to include the new protocol
3. Update protocol list in this documentation
