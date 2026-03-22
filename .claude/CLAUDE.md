# miniature-guacamole Framework

You have the **miniature-guacamole** framework installed - a product development team simulation system for Claude Code.

## What is miniature-guacamole?

miniature-guacamole transforms Claude Code into a complete product development team with specialized agents and collaborative skills:

- **24 Specialized Agents** - Sage, CEO, CTO, CMO/COO, CFO, Engineering Manager, Product Manager, QA, Design, DevOps, and more
- **16 Skills** - /mg-leadership-team, /mg-build, /mg-code-review, and others
- **Shared Protocols** - CAD development workflow, memory protocol, handoff protocol for coordination
- **NDA-Safe Architecture** - Project memory stays local, agents/skills are shared role definitions

## Framework Components

### Installed Per-Project (.claude/)

- **agents/** - 24 specialized roles (dev, qa, product-manager, etc.)
- **skills/** - 16 collaborative workflows (mg-leadership-team, mg-build, etc.)
- **shared/** - 6 protocol documents (CAD development workflow, memory, handoff, visual formatting, etc.)
- **team-config.yaml** - Framework configuration
- **settings.json** - Permissions and hooks

### Project-Local (.claude/ in each project)

- **memory/** - Agent memory (task queues, decisions, handoffs)
- **CLAUDE.md** - Project-specific context
- **shared/** - Optional project-specific protocols (if needed)

## Getting Started

### Initialize a New Project

When you start working in a new project directory, initialize it with:

```
/mg-init
```

This creates the required `.claude/memory/` structure and project-specific context file.

### Use Team Skills

Invoke collaborative workflows:

```
/mg-leadership-team review WS-42
/mg-build implement new-feature
/mg-code-review check PR-123
```

### Spawn Agents Directly

Use the Task tool to spawn specific agents:

```python
Task(subagent_type="qa", prompt="Create test specs for login feature")
Task(subagent_type="product-manager", prompt="Review roadmap priorities")
```

### Let Claude Delegate

Simply ask Claude to involve the right team members:

```
"Have the engineering-manager review this architecture"
"Get the qa team to validate these test cases"
```

## Memory Protocol

Agents use a shared memory system in `.claude/memory/`:

- **tasks-{role}.json** - Task queues for each agent
- **handoffs-{from}-{to}.json** - Agent-to-agent handoffs
- **workstream-{id}-state.json** - Workstream status tracking
- **decisions.json** - Architecture and design decisions

All memory is **project-local** and never shared between clients or projects.

## Shared Protocols

Framework protocols are in `.claude/shared/`:

- **development-workflow.md** - CAD gate-based development process
- **tdd-workflow.md** - Test-first workflow with misuse-first ordering
- **memory-protocol.md** - How agents read/write memory
- **handoff-protocol.md** - Agent coordination patterns
- **engineering-principles.md** - Code quality standards
- **visual-formatting.md** - ASCII art for progress reports

## Data Isolation

miniature-guacamole is **NDA-safe**:

- Agents and skills are **shared globally** (role definitions only, no project data)
- Memory is **project-local** (.claude/memory/ in each project)
- No code or data crosses between clients or projects
- Each project has its own isolated memory

## Next Steps

1. Run `/mg-init` in your project directories
2. Explore agents: `ls .claude/agents/` and read their AGENT.md files
3. Try skills: `ls .claude/skills/` and read their SKILL.md files
4. Read protocols: `ls .claude/shared/` for coordination guidelines

## Documentation

- **Framework Repository**: [miniature-guacamole](https://github.com/wonton-web-works/miniature-guacamole)
- **Agent Definitions**: `.claude/agents/{agent-name}/AGENT.md`
- **Skill Definitions**: `.claude/skills/{skill-name}/SKILL.md`
- **Protocol Documents**: `.claude/shared/{protocol-name}.md`

---

This file is part of your global Claude Code configuration and is loaded on every session start.

For project-specific context, see `.claude/CLAUDE.md` in each project directory.

---

# Existing Project Context

# miniature-guacamole Framework

You have the **miniature-guacamole** framework installed - a product development team simulation system for Claude Code.

## What is miniature-guacamole?

miniature-guacamole transforms Claude Code into a complete product development team with specialized agents and collaborative skills:

- **24 Specialized Agents** - Sage, CEO, CTO, CMO/COO, CFO, Engineering Manager, Product Manager, QA, Design, DevOps, and more
- **16 Skills** - /mg-leadership-team, /mg-build, /mg-code-review, and others
- **Shared Protocols** - CAD development workflow, memory protocol, handoff protocol for coordination
- **NDA-Safe Architecture** - Project memory stays local, agents/skills are shared role definitions

## Framework Components

### Installed Globally (~/.claude/)

- **agents/** - 24 specialized roles (dev, qa, product-manager, etc.)
- **skills/** - 16 skills (mg-leadership-team, mg-build, etc.)
- **shared/** - 6 protocol documents (CAD development workflow, memory, handoff, visual formatting, etc.)
- **team-config.yaml** - Framework configuration
- **settings.json** - Permissions and hooks

### Project-Local (.claude/ in each project)

- **memory/** - Agent memory (task queues, decisions, handoffs)
- **CLAUDE.md** - Project-specific context
- **shared/** - Optional project-specific protocols (if needed)

## Getting Started

### Initialize a New Project

When you start working in a new project directory, initialize it with:

```
/mg-init
```

This creates the required `.claude/memory/` structure and project-specific context file.

### Use Team Skills

Invoke collaborative workflows:

```
/mg-leadership-team review WS-42
/mg-build implement new-feature
/mg-code-review check PR-123
```

### Spawn Agents Directly

Use the Task tool to spawn specific agents:

```python
Task(subagent_type="qa", prompt="Create test specs for login feature")
Task(subagent_type="product-manager", prompt="Review roadmap priorities")
```

### Let Claude Delegate

Simply ask Claude to involve the right team members:

```
"Have the engineering-manager review this architecture"
"Get the qa team to validate these test cases"
```

## Memory Protocol

Agents use a shared memory system in `.claude/memory/`:

- **tasks-{role}.json** - Task queues for each agent
- **handoffs-{from}-{to}.json** - Agent-to-agent handoffs
- **workstream-{id}-state.json** - Workstream status tracking
- **decisions.json** - Architecture and design decisions

All memory is **project-local** and never shared between clients or projects.

## Shared Protocols

Framework protocols are in `~/.claude/shared/`:

- **development-workflow.md** - Gate-based development process
- **tdd-workflow.md** - Test-driven development cycle
- **memory-protocol.md** - How agents read/write memory
- **handoff-protocol.md** - Agent coordination patterns
- **engineering-principles.md** - Code quality standards
- **visual-formatting.md** - ASCII art for progress reports

## Data Isolation

miniature-guacamole is **NDA-safe**:

- Agents and skills are **shared globally** (role definitions only, no project data)
- Memory is **project-local** (.claude/memory/ in each project)
- No code or data crosses between clients or projects
- Each project has its own isolated memory

## Next Steps

1. Run `/mg-init` in your project directories
2. Explore agents: `ls ~/.claude/agents/` and read their AGENT.md files
3. Try skills: `ls ~/.claude/skills/` and read their SKILL.md files
4. Read protocols: `ls ~/.claude/shared/` for coordination guidelines

## Documentation

- **Framework Repository**: [miniature-guacamole](https://github.com/wonton-web-works/miniature-guacamole)
- **Agent Definitions**: `~/.claude/agents/{agent-name}/AGENT.md`
- **Skill Definitions**: `~/.claude/skills/{skill-name}/SKILL.md`
- **Protocol Documents**: `~/.claude/shared/{protocol-name}.md`

---

This file is part of your global Claude Code configuration and is loaded on every session start.

For project-specific context, see `.claude/CLAUDE.md` in each project directory.
