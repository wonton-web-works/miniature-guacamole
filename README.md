# miniature-guacamole

> A complete AI-powered product development organization for Claude Code.

**Version:** 1.3.0 · **License:** MIT · [Documentation](https://wonton-web-works.github.io/miniature-guacamole/) · [Issues](https://github.com/wonton-web-works/miniature-guacamole/issues)

---

## What's New in v1.3.0

**GitHub Issue Filing from CLI** (March 2026):
- New `/mg-ticket` skill — file GitHub Issues directly from Claude Code sessions
- Auto-attaches MG version, current workstream, and recent errors as context
- Preview/confirmation step before posting — no memory content goes public without approval

---

## What It Does

Type a slash command. Get a team.

- `/mg-build` runs a full test-first development cycle — QA writes failing tests, Dev implements, QA verifies 99% coverage, Staff Engineer reviews
- `/mg-leadership-team` coordinates CEO, CTO, and Engineering Director for planning and code approval
- `/mg-assess` evaluates feature ideas with product and technical perspectives before you write a line of code

**17 Skills**. **20 Specialized Agents**. One framework.

---

## Quick Start

### 1. Install

```bash
curl -fsSL https://raw.githubusercontent.com/wonton-web-works/miniature-guacamole/main/src/installer/web-install.sh | bash
```

### 2. Start Claude Code

```bash
claude
```

### 3. Initialize your project

```
/mg-init
```

This creates `.claude/memory/`, installs shared protocols, and detects your tech stack.

---

## The CAD Cycle

Every feature follows Constraint-Driven Agentic Development:

```
┌─────────────────┐
│ /mg-leadership- │  ← Plan: Executive Review + Workstream Breakdown
│     team        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ /mg-build       │  ← Build: Tests → Code → Verify → Review
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ /mg-leadership- │  ← Review: APPROVE or REQUEST CHANGES
│     team        │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌──────────────┐
│APPROVE│  │REQUEST CHANGES│
└───┬───┘  └──────┬───────┘
    │             │ (back to mg-build)
    ▼
┌─────────────────┐
│ /deployment-    │  ← Merge to main
│   engineer      │
└─────────────────┘
```

---

## What You Get

| Component | Count | Description |
|-----------|-------|-------------|
| **Skills** | 17 | Slash-command workflows — build, ticket, debug, and more |
| **Agents** | 20 | Specialized roles from CEO to QA, each with clear delegation authority |
| **Scripts** | 17 | `mg-*` CLI utilities for memory, workstreams, Postgres, and git |
| **Protocols** | 6 | Shared standards — CAD workflow, TDD, memory, handoff, engineering principles |

[All 17 skills →](https://wonton-web-works.github.io/miniature-guacamole/workflows)
[All 20 agents →](https://wonton-web-works.github.io/miniature-guacamole/agents)

---

## Installation

Three methods: **web install** (recommended), **tarball** (offline/CI), or **from source**.

### Web Install

```bash
curl -fsSL https://raw.githubusercontent.com/wonton-web-works/miniature-guacamole/main/src/installer/web-install.sh | bash
```

### Tarball

```bash
curl -fsSL https://github.com/wonton-web-works/miniature-guacamole/releases/latest/download/miniature-guacamole.tar.gz -o mg.tar.gz
tar -xzf mg.tar.gz && cd miniature-guacamole
./install.sh /path/to/your-project
```

### From Source

```bash
git clone https://github.com/wonton-web-works/miniature-guacamole.git
cd miniature-guacamole && ./build.sh
dist/miniature-guacamole/install.sh /path/to/your-project
```

---

## Documentation

- [Getting Started](https://wonton-web-works.github.io/miniature-guacamole/getting-started) — Install, initialize, first workflow
- [Architecture](https://wonton-web-works.github.io/miniature-guacamole/architecture) — Agent hierarchy, delegation model, memory layer
- [Agents](https://wonton-web-works.github.io/miniature-guacamole/agents) — All 20 agents and their roles
- [Workflows](https://wonton-web-works.github.io/miniature-guacamole/workflows) — All 17 skills and the CAD cycle
- [Contributing](https://wonton-web-works.github.io/miniature-guacamole/contributing) — How to extend the framework

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT

---

**Built with Claude Code** · [Report Issues](https://github.com/wonton-web-works/miniature-guacamole/issues) · [Documentation](https://wonton-web-works.github.io/miniature-guacamole/)
