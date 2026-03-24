---
name: mg-add-context
description: "Registers external projects as read-only context references for MG agents. Invoke to reference code, architecture, and patterns from other projects."
model: sonnet
allowed-tools: Read, Glob, Grep, Edit, Write, Bash
compatibility: "Requires Claude Code"
metadata:
  version: "1.0"
  spawn_cap: "6"
---

# Add Project Context

Registers external projects as read-only context references for miniature-guacamole agents.

## Constitution

1. **Read-only access** - Never modify external projects
2. **No shared memory** - Each project's .claude/memory/ is private and isolated
3. **Context, not coupling** - References are informational, not dependencies
4. **Explicit boundaries** - Clear separation between read and write operations
5. **Follow output format** — See `references/output-format.md` for standard visual patterns

## Purpose

Allow MG agents to reference code, architecture, and patterns from other projects without sharing memory. This enables:

- Learning from existing implementations in other projects
- Maintaining consistency across multiple projects
- Referencing architecture decisions without duplication
- Analyzing similar features for estimation and planning

**Critical Boundary**: Context is READ-ONLY. Agents can read files from registered projects but NEVER write to another project's .claude/memory/ or modify external code.

## Usage

### Add a Local Project

```bash
/mg-add-context ~/work/other-project
/mg-add-context --add ~/work/backend-api --alias api
```

Registers a local directory as a context reference. The skill will:
1. Validate the path exists and is a directory
2. Read key context files (CLAUDE.md, package.json, README.md)
3. Extract summary information
4. Store reference in .claude/memory/project-contexts.json
5. Make the path available for Read tool access by agents

### Add a GitHub Repository

```bash
/mg-add-context https://github.com/user/repo
/mg-add-context --add https://github.com/user/repo --alias external-lib
```

Registers a GitHub repository as a context reference. The skill will:
1. Clone the repository to .claude/contexts/{alias}/
2. Extract context same as local directory
3. Store reference with repo URL
4. Make the cloned files available for Read tool access

**Note**: For v1, GitHub support may be limited to manual clone instructions. Full automation can be added in future iterations.

### List Project Contexts

```bash
/mg-add-context --list
```

Shows all registered project contexts with:
- Alias name
- Type (local/github)
- Path or URL
- Context summary
- Date added

### Inspect a Context

```bash
/mg-add-context --inspect api
```

Shows detailed information about a specific context:
- Full path
- Key files available
- Context summary
- Architecture notes (if available)
- Last updated

### Remove a Context

```bash
/mg-add-context --remove api
```

Unregisters a project context. For GitHub clones, optionally removes cached files.

## Memory Protocol

```yaml
read:
  - .claude/memory/project-contexts.json

write: .claude/memory/project-contexts.json
  contexts:
    - alias: <name>
      type: local | github
      path: <absolute_path>
      repo_url: <url if github>
      added_at: <ISO8601 timestamp>
      updated_at: <ISO8601 timestamp>
      context_summary: <brief description>
      key_files:
        - CLAUDE.md
        - package.json
        - README.md
      architecture_notes: <extracted from CLAUDE.md if available>
      project_type: <detected: node, python, go, etc>
```

## Workflow

```
1. Parse invocation arguments (add/list/remove/inspect)
2. Execute appropriate mode:

   ADD MODE:
   - Validate path/URL
   - Read context files (CLAUDE.md, package.json, README.md, etc.)
   - Extract project type and summary
   - Generate context entry
   - Update .claude/memory/project-contexts.json
   - Confirm registration

   LIST MODE:
   - Read .claude/memory/project-contexts.json
   - Display table of registered contexts
   - Show summary information

   INSPECT MODE:
   - Read .claude/memory/project-contexts.json
   - Find specified context by alias
   - Display detailed information
   - Show available key files

   REMOVE MODE:
   - Read .claude/memory/project-contexts.json
   - Remove specified context
   - For GitHub clones, prompt to delete cached files
   - Update registry
   - Confirm removal
```

## Context Extraction Strategy

When adding a project, extract information from:

### 1. CLAUDE.md or README.md
- Project description
- Architecture overview
- Technology stack
- Key patterns or conventions

### 2. package.json / pyproject.toml / go.mod
- Project type (Node, Python, Go, etc.)
- Key dependencies
- Scripts and build commands

### 3. Directory Structure
- Source directories
- Test directories
- Configuration files
- Documentation

### 4. Architecture Files (if present)
- .claude/memory/decisions.json
- docs/architecture/*.md
- ARCHITECTURE.md

## Agent Usage of Contexts

Once a project context is registered, agents can:

1. **Read files directly**:
   ```python
   Read(file_path="{context_path}/src/feature.ts")
   ```

2. **Search for patterns**:
   ```python
   Grep(pattern="authentication", path="{context_path}")
   ```

3. **Browse structure**:
   ```python
   Glob(pattern="**/*.ts", path="{context_path}")
   ```

4. **Reference architecture decisions**:
   ```python
   Read(file_path="{context_path}/.claude/memory/decisions.json")
   ```

**Agents MUST NOT**:
- Write to context project paths
- Modify context project memory files
- Spawn agents in context project directories
- Create shared memory between projects

## Output Format

Four modes with structured output:
- **Add**: Registration confirmation with key files and agent usage instructions
- **List**: Table of all registered contexts (alias, type, path, summary, date)
- **Inspect**: Detailed info with file access examples (Read/Grep/Glob)
- **Remove**: Confirmation with optional cache cleanup for GitHub clones

See `references/output-examples.md` for full template examples.

## Security Considerations

- Paths must be absolute, outside current project, and have read permissions
- Never read or write external `.claude/memory/` files (except decisions.json read-only)
- Never spawn agents with external project as working directory

## Implementation Notes

V1: local directories only. V2 (future): automatic GitHub clone, context refresh, cross-context search.

See `references/model-escalation-guidance.md` for escalation criteria.

## Boundaries

**CAN:**
- Read files from registered project directories
- Extract and store context summaries
- List and inspect registered contexts
- Remove context registrations
- Clone GitHub repositories to local cache (future)

**CANNOT:**
- Write to external project files
- Modify external project .claude/memory/ files
- Share memory between projects
- Create dependencies between projects
- Execute code in external projects
- Spawn agents in external project directories

**ESCALATES TO:**
- engineering-manager (if context access patterns need review)
- security-engineer (if cross-project access raises concerns)
