## Output Examples

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
- Inspect details: `/mg-add-context --inspect {alias}`
- Remove context: `/mg-add-context --remove {alias}`
- Add new context: `/mg-add-context {path_or_url}`
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
Read(file_path="{context_path}/.claude/CLAUDE.md")
Grep(pattern="authentication", path="{context_path}", output_mode="content")
Glob(pattern="**/*.ts", path="{context_path}")

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
