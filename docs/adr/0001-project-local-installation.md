# ADR-0001: Project-Local Installation

**Status**: Accepted
**Date**: 2026-02-09
**Deciders**: CTO, Engineering Director

## Context

miniature-guacamole needs to support multiple client projects on the same machine without data leakage. We considered two approaches:

1. **Global install** — symlink agents/skills into `~/.claude/` and auto-init on every `cd` (WS-INIT)
2. **Per-project install** — copy agents/skills into each project's `.claude/` directory via `mg-util`

Global auto-init (WS-INIT) was prototyped but introduced complexity: symlink management, shell hook injection, race conditions when switching between projects. It also risked contaminating `~/.claude/` with project-specific state.

## Decision

Per-project installation via `mg-util` commands. The installer copies (not symlinks) agents and skills into each project's `.claude/` directory.

- `mg-util install` — copies framework files into `.claude/`
- `mg-util init` — creates `.claude/memory/` with `.gitignore` and project context
- `mg-util audit` — detects settings bloat and stale configuration
- `~/.miniature-guacamole/` holds global utilities only (`bin/`)
- Never modify `~/.claude/` — that's the user's Claude Code config, not ours
- WS-INIT (global auto-init with symlinks) was **DROPPED** per leadership decision 2026-02-10

## Consequences

**Positive:**
- NDA-safe data isolation — no cross-project leakage by design
- Each project gets its own copy, can be versioned independently
- No shell hooks or symlink management complexity
- `mg-util audit` catches configuration drift

**Negative:**
- Updates require running `mg-util update` in each project
- Disk usage slightly higher (copies vs symlinks)
- Onboarding requires explicit `mg-util install && mg-util init` per project

## References

- WS-INSTALL-0/1/2 workstreams (`.claude/memory/workstream-WS-INSTALL-state.json`)
- DEFER-INFRA-3: WS-INIT DROPPED (`.claude/memory/deferred-v1-follow-ups.json`)
- Leadership decision 2026-02-10: WS-INIT dropped, may revisit if onboarding friction reported
