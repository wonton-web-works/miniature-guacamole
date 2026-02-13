# ADR-0007: Global State Boundaries

**Status**: Accepted
**Date**: 2026-02-12
**Deciders**: CTO

## Context

During a fresh install investigation, we found contamination issues:

- `~/work/.claude/` contained stale settings with broken hook references, affecting all subprojects
- `~/.miniature-guacamole/` existed correctly with `bin/` utilities
- Some installs had agents/skills at `~/.claude/` despite per-project being the design
- Stale memory directories (`agent-memory/`, `agent-memory-local/`) existed in the MG project from earlier iterations

This confusion stems from unclear boundaries between what lives globally and what lives per-project.

## Decision

Explicit boundary rules:

### Global (`~/.miniature-guacamole/`)
- `bin/` — CLI utilities (`mg-util` and friends)
- Nothing else. No agents, no skills, no memory, no settings.

### Per-Project (`.claude/` in each project root)
- `agents/` — agent definitions (copied by `mg-util install`)
- `skills/` — skill definitions (copied by `mg-util install`)
- `memory/` — project-specific memory (created by `mg-util init`, `.gitignore`d)
- `CLAUDE.md` — project context
- `shared/` — optional project-specific protocols

### Hands Off (`~/.claude/`)
- This is the user's Claude Code configuration directory
- miniature-guacamole must never write to it
- If stale MG content exists here, it's contamination from earlier installs

### Contamination Issues Found

| Location | Issue | Status |
|----------|-------|--------|
| `~/work/.claude/` | Stale settings.json with broken hook paths | Needs manual cleanup |
| `~/.claude/agents/`, `~/.claude/skills/` | Framework files from pre-per-project era | Needs manual cleanup |
| `.claude/agent-memory/` | Stale directory from earlier memory layout | Can be safely removed |
| `.claude/agent-memory-local/` | Stale directory from earlier memory layout | Can be safely removed |

### Cleanup Guidance

```bash
# Remove stale global framework files (if present)
rm -rf ~/work/.claude/settings.json  # only if it has broken MG hooks
rm -rf ~/.claude/agents/ ~/.claude/skills/  # only if from MG install

# Remove stale memory directories in MG project
rm -rf .claude/agent-memory/ .claude/agent-memory-local/

# Verify correct state
ls ~/.miniature-guacamole/bin/  # should have mg-util
ls .claude/memory/              # should have project memory files
```

**Note:** These cleanup commands are documented here for reference. No automated cleanup is performed — manual verification before deletion is required.

## Consequences

**Positive:**
- Clear rules for what goes where
- Contamination issues documented with cleanup steps
- Future installs won't repeat these mistakes
- `mg-util audit` can detect contamination

**Negative:**
- Existing installs may need manual cleanup
- Users who installed during the global-install era have extra work

## References

- [ADR-0001](0001-project-local-installation.md) (Project-Local Installation)
- WS-INIT DROPPED decision (DEFER-INFRA-3)
- Install architecture analysis, 2026-02-12
