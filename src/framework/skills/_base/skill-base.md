# Skill Base Protocol

All skills inherit these shared behaviors. Skill-specific definitions override or extend these defaults.

## Shared Constitution

- **Memory-first** - Read workstream context before acting, write decisions for team visibility
- **Visual standards** - Follow standard output format in `references/output-format.md`

## Memory Protocol

All skills follow this memory access pattern:

```yaml
# Read context
read:
  - .claude/memory/workstream-{id}-state.json  # Current workstream phase

# Write decisions
write: .claude/memory/agent-{skill}-decisions.json
  workstream_id: <id>
  phase: <skill-specific phase>
```

Skill-specific memory files and fields are defined in each skill's definition.

## Boundaries Format

All skills define:
- **CAN:** Skill-specific capabilities
- **CANNOT:** Skill-specific restrictions
- **ESCALATES TO:** Escalation target
