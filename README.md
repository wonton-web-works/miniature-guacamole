# miniature-guacamole

> A complete AI-powered product development organization for Claude Code.

**Version:** 6.1.1 · **License:** MIT · [Documentation](https://wonton-web-works.github.io/miniature-guacamole/) · [Issues](https://github.com/wonton-web-works/miniature-guacamole/issues)

---

## What's New in v6.1.1

**Security domains, state reconciliation, and base template inheritance** (March 2026):
- **Security Domain Expansion** — security-engineer agent now loads domain-specific checklists (web, systems, cloud, crypto) automatically
- **`/mg-tidy`** — reconciles project state across GitHub issues and memory files. Closed 38 duplicate issues in its first run
- **Base Template Inheritance** — all 22 agents and 19 skills inherit from shared base protocols, eliminating duplication
- 19 skills, 22 agents

---

## What It Does

Type a slash command. Get a team.

- `/mg` is the front door — shows all commands or routes by keyword to the right skill
- `/mg-build` runs a full test-first development cycle — QA writes failing tests, Dev implements, QA verifies 99% coverage, Staff Engineer reviews
- `/mg plan` coordinates CEO, CTO, and Engineering Director for planning and code approval — also available as `/mg-leadership-team`
- `/mg-assess` evaluates feature ideas with product and technical perspectives before you write a line of code
- `/mg-ticket` files GitHub Issues directly from Claude Code, with workstream context attached
- `/mg-tidy` reconciles project state — deduplicates issues, syncs memory, flags stale work

**19 Skills**. **22 Specialized Agents**. One framework.

---

## Quick Start

### 1. Install globally (one time)

```bash
curl -fsSL https://raw.githubusercontent.com/wonton-web-works/miniature-guacamole/main/src/installer/web-install.sh | bash
```

### 2. Initialize your project

```bash
cd your-project
claude
```

Then run the slash command:

```
/mg-init
```

### 3. Start Claude Code

```bash
claude
/mg
```

Shows all 19 skills grouped by purpose, or pass a keyword to route directly — `/mg build auth system`.

---

## The CAD Cycle

Every feature follows Constraint-Driven Agentic Development:

```
┌─────────────────┐
│   /mg plan      │  ← Plan: Executive Review + Workstream Breakdown
│                 │
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
│   /mg review    │  ← Review: APPROVE or REQUEST CHANGES
│                 │
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
| **Skills** | 19 | Slash-command workflows — `/mg` dispatcher, build, ticket, tidy, debug, and more |
| **Agents** | 22 | Specialized roles from CEO to QA, each with clear delegation authority |
| **Scripts** | 17 | `mg-*` CLI utilities for memory, workstreams, Postgres, and git |
| **Protocols** | 6 | Shared standards — CAD workflow, TDD, memory, handoff, engineering principles |

[All 19 skills →](https://wonton-web-works.github.io/miniature-guacamole/workflows)
[All 22 agents →](https://wonton-web-works.github.io/miniature-guacamole/agents)

---

## Installation

Three methods: **web install** (recommended), **tarball** (offline/CI), or **from source**.

### Web Install

```bash
# Install globally (one time)
curl -fsSL https://raw.githubusercontent.com/wonton-web-works/miniature-guacamole/main/src/installer/web-install.sh | bash

# Init any project (no network required)
cd your-project
claude
```

Then run the slash command:

```
/mg-init
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
- [Agents](https://wonton-web-works.github.io/miniature-guacamole/agents) — All 22 agents and their roles
- [Workflows](https://wonton-web-works.github.io/miniature-guacamole/workflows) — All 19 skills and the CAD cycle
- [Contributing](https://wonton-web-works.github.io/miniature-guacamole/contributing) — How to extend the framework

---

## Changelog

**Version 6.1.1** (March 2026)
- CMO/COO and CFO agents added; all existing agents upgraded
- Agent count: 20 → 22

**Version 4.1.0** (March 2026)
- Runtime output matches marketing site terminal animation
- Compact output protocol, ANSI color codes, timing instrumentation

**Version 4.0.0** (March 2026)
- Base template inheritance, 2-track development cycle, inter-agent message bus
- MECHANICAL track: 1 spawn (down from 11), 42% boilerplate reduction

**Version 3.1.0** (March 2026)
- `/mg-tidy` — state reconciliation skill; deduplicates issues, syncs memory, flags stale work
- Base template inheritance — all agents/skills inherit from shared `_base/` protocols
- Security domain expansion — 4 specialized checklists (web, systems, cloud, crypto)
- Ticket triage gate — daemon assesses tickets before planning

**Version 3.0.0** (March 2026)
- Autonomous daemon pipeline — 24/7 ticket-to-PR automation for Mac Mini
- Jira, Linear, and GitHub Issues ticket providers
- Security hardening (3 review passes), OS-level safeguards
- 1082 tests passing, zero new npm dependencies

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT

---

**Built with Claude Code** · [Report Issues](https://github.com/wonton-web-works/miniature-guacamole/issues) · [Documentation](https://wonton-web-works.github.io/miniature-guacamole/)
