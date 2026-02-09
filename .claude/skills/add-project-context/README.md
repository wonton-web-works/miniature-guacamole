# Add Project Context Skill

## Overview

The `/add-project-context` skill enables miniature-guacamole agents to reference code, architecture, and patterns from other projects without sharing memory. This maintains the NDA-safe architecture while allowing cross-project learning and consistency.

## Purpose

Enable agents to:
- Learn from existing implementations in other projects
- Maintain consistency across multiple projects
- Reference architecture decisions without duplication
- Analyze similar features for estimation and planning

**Critical**: All cross-project access is READ-ONLY. Memory remains project-local and isolated.

## Files

- `skill.md` - Main skill definition and documentation
- `README.md` - This file (implementation notes)

## Storage

Project contexts are stored in:
```
.claude/memory/project-contexts.json
```

Schema:
```
.claude/schemas/project-contexts.schema.json
```

Example:
```
.claude/memory/.examples/project-contexts.json
```

## Usage Examples

### Add a Local Project

```bash
/add-project-context ~/work/backend-api
/add-project-context --add ~/work/frontend --alias ui
```

### List Registered Contexts

```bash
/add-project-context --list
```

### Inspect a Context

```bash
/add-project-context --inspect api
```

### Remove a Context

```bash
/add-project-context --remove api
```

## Implementation Notes

### V1 Scope (Current)

The skill definition is complete. Implementation should include:

1. **Add Mode**
   - Parse path or URL from arguments
   - Validate path exists and is accessible
   - Read context files (CLAUDE.md, package.json, README.md)
   - Extract project type, tech stack, and summary
   - Generate context entry
   - Update .claude/memory/project-contexts.json atomically
   - Display confirmation with usage examples

2. **List Mode**
   - Read .claude/memory/project-contexts.json
   - Display table of all contexts
   - Show summary information

3. **Inspect Mode**
   - Read .claude/memory/project-contexts.json
   - Find context by alias
   - Display detailed information
   - Show file access examples with actual paths

4. **Remove Mode**
   - Read .claude/memory/project-contexts.json
   - Remove specified context
   - Update registry atomically
   - Display confirmation

### Context Extraction Logic

When adding a project, extract:

1. **From CLAUDE.md or README.md**:
   - Project description
   - Architecture overview
   - Technology stack
   - Key patterns

2. **From package.json / pyproject.toml / go.mod**:
   - Project type detection
   - Key dependencies
   - Tech stack

3. **From directory structure**:
   - Source directories
   - Test directories
   - Documentation locations

4. **From .claude/memory/decisions.json** (if readable):
   - Architecture decisions
   - Design patterns
   - Technical choices

### Path Validation

Before adding a context:
1. Resolve to absolute path
2. Verify path exists
3. Verify path is a directory
4. Check read permissions
5. Warn if path is inside current project (avoid circular refs)
6. Detect if path is a git repository

### Auto-Alias Generation

If no `--alias` provided:
1. Use basename of directory
2. Convert to lowercase
3. Replace spaces/special chars with hyphens
4. Ensure uniqueness (append -2, -3, etc. if needed)

### Memory Operations

Use atomic write operations:
1. Read existing project-contexts.json
2. Add/update/remove context
3. Validate against schema
4. Write back atomically (write temp, rename)
5. Keep backup of previous version

### Error Handling

Handle gracefully:
- Path does not exist
- No read permissions
- Context already registered (offer to update)
- Alias already in use (suggest alternatives)
- Invalid JSON in registry (attempt recovery from backup)
- Missing context files (warn but continue with limited info)

## Security Boundaries

### Enforced by Skill

1. **Read-Only**: Never write to external projects
2. **No Memory Sharing**: Never read/write external .claude/memory/ (except decisions.json for reference)
3. **No Execution**: Never spawn agents in external project directories
4. **Path Validation**: Ensure paths are valid and accessible

### Agent Responsibilities

Agents using contexts must:
1. Only use Read, Grep, Glob tools on context paths
2. Never use Write, Edit on context paths
3. Never change working directory to context paths
4. Never spawn subagents with context path as working directory

## Future Enhancements (V2+)

Not in current scope, but documented for future:

1. **GitHub Integration**
   - Automatic clone to .claude/contexts/{alias}/
   - Pull to update cached repos
   - Branch/tag specification

2. **Context Updates**
   - Refresh context information
   - Detect stale contexts
   - Auto-update summaries

3. **Cross-Context Search**
   - Search pattern across all contexts
   - Compare implementations
   - Find similar code

4. **Pattern Analysis**
   - Detect common patterns across projects
   - Suggest architecture from context
   - Learning from context usage

5. **Context Suggestions**
   - Suggest relevant contexts based on current task
   - Auto-detect related projects
   - Context usage analytics

## Testing Strategy

When implementing, test:

1. **Add Mode**
   - Add local directory
   - Add with custom alias
   - Add same path twice (should update, not duplicate)
   - Add invalid path (should error gracefully)
   - Add path without read permissions (should error)

2. **List Mode**
   - Empty registry
   - Single context
   - Multiple contexts
   - Display formatting

3. **Inspect Mode**
   - Existing context
   - Non-existent alias (should error gracefully)
   - Context with minimal info
   - Context with full info

4. **Remove Mode**
   - Remove existing context
   - Remove non-existent alias (should error gracefully)
   - Verify context is actually removed

5. **Path Validation**
   - Relative paths (should convert to absolute)
   - Home directory expansion (~/)
   - Symlinks (should resolve)
   - Non-existent paths
   - Files instead of directories

6. **Context Extraction**
   - Project with CLAUDE.md
   - Project without CLAUDE.md
   - Node.js project (package.json)
   - Python project (pyproject.toml)
   - Go project (go.mod)
   - Unknown project type

7. **Atomic Operations**
   - Concurrent access
   - Interrupted writes
   - Backup creation
   - Recovery from corruption

## Integration with Other Skills

Other skills can reference contexts:

### From /engineering-team

```markdown
"Reference authentication implementation from api context"

Agent: Read(file_path="/path/from/context/src/auth/jwt.ts")
```

### From /feature-assessment

```markdown
"Estimate effort based on similar feature in frontend context"

Agent: Read(file_path="/path/from/context/.claude/memory/workstream-oauth-state.json")
Agent: Extract effort and timeline data
```

### From /code-review

```markdown
"Compare error handling patterns with backend context"

Agent: Grep(pattern="ErrorHandler", path="/path/from/context")
Agent: Analyze patterns and suggest consistency improvements
```

## Documentation

- Main skill definition: `skill.md`
- JSON schema: `.claude/schemas/project-contexts.schema.json`
- Example data: `.claude/memory/.examples/project-contexts.json`
- This README: Implementation notes and testing strategy

## Version History

**v1.0** (2026-02-09)
- Initial skill definition
- Add, list, inspect, remove modes
- Read-only context access
- Local directory support
- Schema and examples
- Security boundaries documented
