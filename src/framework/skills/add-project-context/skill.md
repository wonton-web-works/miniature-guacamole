---
# Skill: Add Project Context
# Workflow skill for cross-project context references

name: add-project-context
description: "Registers external projects as read-only context references for MG agents. Invoke to reference code, architecture, and patterns from other projects."
model: sonnet
tools: [Read, Glob, Grep, Edit, Write, Bash]
---

# Add Project Context

Registers external projects as read-only context references for miniature-guacamole agents.

## Constitution

1. **Read-only access** - Never modify external projects
2. **No shared memory** - Each project's .claude/memory/ is private and isolated
3. **Context, not coupling** - References are informational, not dependencies
4. **Explicit boundaries** - Clear separation between read and write operations
5. **Memory-first** - Store context summaries for efficient agent access
6. **Visual standards** - Follow standard output format in `../_shared/output-format.md`

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
/add-project-context ~/work/other-project
/add-project-context --add ~/work/backend-api --alias api
```

Registers a local directory as a context reference. The skill will:
1. Validate the path exists and is a directory
2. Read key context files (CLAUDE.md, package.json, README.md)
3. Extract summary information
4. Store reference in .claude/memory/project-contexts.json
5. Make the path available for Read tool access by agents

### Add a GitHub Repository

```bash
/add-project-context https://github.com/user/repo
/add-project-context --add https://github.com/user/repo --alias external-lib
```

Registers a GitHub repository as a context reference. The skill will:
1. Clone the repository to .claude/contexts/{alias}/
2. Extract context same as local directory
3. Store reference with repo URL
4. Make the cloned files available for Read tool access

**Note**: For v1, GitHub support may be limited to manual clone instructions. Full automation can be added in future iterations.

### List Project Contexts

```bash
/add-project-context --list
```

Shows all registered project contexts with:
- Alias name
- Type (local/github)
- Path or URL
- Context summary
- Date added

### Inspect a Context

```bash
/add-project-context --inspect api
```

Shows detailed information about a specific context:
- Full path
- Key files available
- Context summary
- Architecture notes (if available)
- Last updated

### Remove a Context

```bash
/add-project-context --remove api
```

Unregisters a project context. For GitHub clones, optionally removes cached files.

## Memory Protocol

```yaml
# Read existing contexts
read:
  - .claude/memory/project-contexts.json

# Write context registry
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

### Add Mode

```
## Project Context Added: {alias}

### Registration Details
- **Type**: {local | github}
- **Path**: {absolute_path}
- **Project Type**: {detected type}
- **Added**: {timestamp}

### Context Summary
{extracted summary from CLAUDE.md or README.md}

### Key Files Available
- CLAUDE.md - {brief description}
- package.json - {project type and dependencies}
- src/ - {source code structure}
- tests/ - {test organization}

### Usage by Agents
Agents can now read files from this project using:
- Read: {context_path}/path/to/file
- Grep: pattern search within {context_path}
- Glob: file discovery in {context_path}

### Next Action
Context registered successfully. Agents can now reference this project.
```

### List Mode

```
## Registered Project Contexts

| Alias | Type | Path/URL | Summary | Added |
|-------|------|----------|---------|-------|
| api | local | /Users/dev/work/api | Backend REST API (Node/Express) | 2026-02-09 |
| frontend | local | /Users/dev/work/ui | React frontend app | 2026-02-08 |
| lib | github | https://github.com/user/lib | Shared utility library | 2026-02-07 |

**Total**: 3 project contexts registered

### Usage
- Inspect details: `/add-project-context --inspect {alias}`
- Remove context: `/add-project-context --remove {alias}`
- Add new context: `/add-project-context {path_or_url}`
```

### Inspect Mode

```
## Project Context: {alias}

### Details
- **Type**: {local | github}
- **Path**: {absolute_path}
- **Repository**: {url if github}
- **Project Type**: {node | python | go | etc}
- **Added**: {timestamp}
- **Updated**: {timestamp}

### Context Summary
{detailed summary from context extraction}

### Architecture Notes
{extracted architecture information if available}

### Key Files
- `.claude/CLAUDE.md` - Project overview and framework configuration
- `package.json` - Node.js project with Express, React, TypeScript
- `README.md` - Setup and development instructions
- `.claude/memory/decisions.json` - 15 architecture decisions recorded
- `src/` - Source code (42 TypeScript files)
- `tests/` - Test suite (38 test files, Jest framework)

### File Access Examples
```bash
# Read the project overview
Read(file_path="{context_path}/.claude/CLAUDE.md")

# Search for authentication code
Grep(pattern="authentication", path="{context_path}", output_mode="content")

# List all TypeScript files
Glob(pattern="**/*.ts", path="{context_path}")
```

### Next Action
Use Read, Grep, or Glob tools to explore this project's code and patterns.
```

### Remove Mode

```
## Project Context Removed: {alias}

### Removed Details
- **Type**: {local | github}
- **Path**: {path}
- **Was Added**: {timestamp}

{If GitHub clone:}
### Cleanup
Cached repository files at `.claude/contexts/{alias}/` were removed.

### Next Action
Context unregistered. Agents will no longer have access to this project reference.
```

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

## Security Considerations

### Read-Only Enforcement

Agents MUST respect read-only boundaries. The skill should:
1. Document paths as read-only in the registry
2. Never provide write access to external projects
3. Warn if an agent attempts to write to context paths

### Path Validation

When adding contexts:
1. Validate paths are absolute and exist
2. Ensure paths are outside current project (avoid circular references)
3. Check for .git directories to detect repositories
4. Verify read permissions

### Memory Isolation

Absolutely enforce:
1. NO reading external .claude/memory/ files except for architecture decisions (read-only)
2. NO writing to any external .claude/ files
3. NO spawning agents with external project as working directory
4. Each project maintains independent memory state

## Example Use Cases

### 1. Learning from Similar Features

```
User: "We need to implement user authentication. Can we see how the API project did it?"

Skill: /add-project-context ~/work/backend-api --alias api
Agent: Read(file_path="/Users/dev/work/backend-api/src/auth/jwt-strategy.ts")
```

### 2. Maintaining Consistency

```
User: "Check if our error handling matches the frontend patterns"

Agent: Grep(pattern="ErrorBoundary", path="{frontend_context_path}")
Agent: Compare with current project patterns
```

### 3. Architecture Reference

```
User: "What decisions did the API team make about database migrations?"

Agent: Read(file_path="{api_context_path}/.claude/memory/decisions.json")
Agent: Extract migration-related decisions
```

### 4. Estimation from Similar Work

```
Product Manager: "How long did the API team take to implement OAuth?"

Agent: Read(file_path="{api_context_path}/.claude/memory/workstream-oauth-state.json")
Agent: Extract effort and timeline data
```

## Implementation Notes

### V1 Scope (Minimal Viable)

- Add local directory contexts
- List and inspect contexts
- Remove contexts
- Store context in .claude/memory/project-contexts.json
- Extract basic context from CLAUDE.md and README.md
- Manual GitHub clone instructions

### V2 Enhancements (Future)

- Automatic GitHub clone to .claude/contexts/
- Context update/refresh commands
- Search across all contexts
- Pattern analysis across projects
- Context suggestions based on current task
- Stale context detection and warnings

## Model Escalation

This skill runs on Sonnet for cost efficiency. Follow `../_shared/model-escalation.md` protocol.

**Escalate to Opus-tier agent when:**
- Cross-project architecture analysis requires deep reasoning
- Security implications of context access need expert review
- Complex pattern extraction across multiple projects

**Stay on Sonnet for:**
- Adding/removing/listing contexts
- Reading and summarizing context files
- Validating paths and permissions
- Registry management operations
