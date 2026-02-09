# Project Context

<!-- BEGIN MINIATURE-GUACAMOLE -->
This project uses the **miniature-guacamole** framework - a product development team simulation system for Claude Code.

## Framework Overview

miniature-guacamole provides:
- **18 Specialized Agents** - Engineering Manager, Product Manager, QA, Design, DevOps, and more
- **13 Team Skills** - /leadership-team, /engineering-team, /code-review, and others
- **Shared Protocols** - TDD workflow, memory protocol, handoff protocol
- **Memory System** - Project-local memory in `.claude/memory/`

## Quick Start

### Use Team Skills

```
/leadership-team review WS-42
/engineering-team implement new-feature
/code-review check PR-123
```

### Spawn Agents

```python
Task(subagent_type="qa", prompt="Create test specs for login feature")
Task(subagent_type="dev", prompt="Implement authentication")
```

### Script Utilities

The framework includes 9 mg-* commands for memory operations:

```bash
mg-memory-read .claude/memory/tasks-dev.json
mg-workstream-status WS-42
mg-gate-check
mg-help <command>
```

## Memory Protocol

Agents use shared memory in `.claude/memory/`:

- **tasks-{role}.json** - Task queues for each agent
- **handoffs-{from}-{to}.json** - Agent-to-agent handoffs
- **workstream-{id}-state.json** - Workstream status tracking
- **decisions.json** - Architecture and design decisions

All memory is **project-local** and never shared between clients or projects.

## Documentation

- **Agents**: See `.claude/agents/{agent-name}/agent.md`
- **Skills**: See `.claude/skills/{skill-name}/skill.md`
- **Protocols**: See `.claude/shared/{protocol-name}.md`
- **Framework**: [miniature-guacamole](https://github.com/yourusername/miniature-guacamole)

## Data Isolation

miniature-guacamole is **NDA-safe**:
- Agents/skills are role definitions (no project data)
- Memory is project-local (`.claude/memory/`)
- No data crosses between clients or projects

<!-- END MINIATURE-GUACAMOLE -->

---

## Project-Specific Context

Add your project-specific context below this line.
The miniature-guacamole framework will not modify content outside the bounded markers above.
