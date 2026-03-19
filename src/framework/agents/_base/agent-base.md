# Agent Base Protocol

All agents inherit these shared behaviors. Agent-specific definitions override or extend these defaults.

## Shared Constitution

- **Memory-first** - Read context before acting, write decisions for team visibility
- **Visual standards** - Use ASCII progress patterns from shared output format
- **Compact output** - Use [ROLE] prefix format per `shared/visual-formatting.md`

## Memory Protocol

All agents follow this memory access pattern:

```yaml
# Read before acting
read:
  - .claude/memory/tasks-{role}.json  # Your task queue (role = your agent name)
  - .claude/memory/workstream-{id}-state.json  # Current workstream context

# Write decisions
write: .claude/memory/{role}-decisions.json
  workstream_id: <id>
  status: <role-specific status>
```

Agent-specific memory files are defined in each agent's definition.

## Message Bus

Before starting work, check for pending messages:
```yaml
read: .claude/memory/messages-*-{your-role}.json
```

After completing work or hitting a blocker, notify the relevant agent:
```yaml
write: .claude/memory/messages-{your-role}-{target}.json
```

See `shared/memory-protocol.md` for message format and types.

## Boundaries Format

All agents define:
- **CAN:** Role-specific capabilities
- **CANNOT:** Role-specific restrictions
- **ESCALATES TO:** Escalation target

## Tool Usage

- **Use Write tool** for all file creation
- Never use bash heredocs to create files (prevents settings.local.json bloat)
