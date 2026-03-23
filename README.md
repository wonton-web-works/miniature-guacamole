# miniature-guacamole

> A complete AI-powered product development organization for Claude Code.

**Version:** 5.0 · **License:** MIT · [Documentation](https://wonton-web-works.github.io/miniature-guacamole/) · [Issues](https://github.com/wonton-web-works/miniature-guacamole/issues)

---

## What's New in v5.0

**Autonomous daemon, security domains, and state reconciliation** (March 2026):
- **Autonomous Daemon Pipeline** (v3.0.0) — turns a Mac Mini into a 24/7 ticket-to-PR machine. Supports Jira, Linear, and GitHub Issues
- **Security Domain Expansion** — security-engineer agent now loads domain-specific checklists (web, systems, cloud, crypto) automatically
- **`/mg-tidy`** — reconciles project state across GitHub issues and memory files. Closed 38 duplicate issues in its first run
- **Ticket Triage Gate** — daemon now runs `/mg-assess` before planning, filtering low-value tickets
- **Base Template Inheritance** — all 24 agents and 19 skills inherit from shared base protocols, eliminating duplication
- 19 skills, 24 agents

---

## What It Does

Type a slash command. Get a team.

- `/mg` is the front door — shows all commands or routes by keyword to the right skill
- `/mg-build` runs a full test-first development cycle — QA writes failing tests, Dev implements, QA verifies 99% coverage, Staff Engineer reviews
- `/mg-leadership-team` coordinates CEO, CTO, and Engineering Director for planning and code approval
- `/mg-assess` evaluates feature ideas with product and technical perspectives before you write a line of code
- `/mg-ticket` files GitHub Issues directly from Claude Code, with workstream context attached
- `/mg-tidy` reconciles project state — deduplicates issues, syncs memory, flags stale work

**19 Skills**. **24 Specialized Agents**. One framework.

---

## Quick Start

### 1. Install globally (one time)

```bash
curl -fsSL https://raw.githubusercontent.com/wonton-web-works/miniature-guacamole/main/src/installer/web-install.sh | bash
```

### 2. Initialize your project

```bash
cd your-project
mg-init
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
| **Skills** | 19 | Slash-command workflows — `/mg` dispatcher, build, ticket, tidy, debug, and more |
| **Agents** | 24 | Specialized roles from CEO to QA, each with clear delegation authority |
| **Scripts** | 17 | `mg-*` CLI utilities for memory, workstreams, Postgres, and git |
| **Protocols** | 6 | Shared standards — CAD workflow, TDD, memory, handoff, engineering principles |

[All 19 skills →](https://wonton-web-works.github.io/miniature-guacamole/workflows)
[All 24 agents →](https://wonton-web-works.github.io/miniature-guacamole/agents)

---

## Installation

Three methods: **web install** (recommended), **tarball** (offline/CI), or **from source**.

### Web Install

```bash
# Install globally (one time)
curl -fsSL https://raw.githubusercontent.com/wonton-web-works/miniature-guacamole/main/src/installer/web-install.sh | bash

# Init any project (no network required)
cd your-project
mg-init
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
- [Agents](https://wonton-web-works.github.io/miniature-guacamole/agents) — All 24 agents and their roles
- [Workflows](https://wonton-web-works.github.io/miniature-guacamole/workflows) — All 19 skills and the CAD cycle
- [Contributing](https://wonton-web-works.github.io/miniature-guacamole/contributing) — How to extend the framework

---

## Changelog

**Version 5.0** (March 2026)
- Sage agent added (enterprise-only — see [private-enterprise.wontonwebworks.com/enterprise](https://private-enterprise.wontonwebworks.com/enterprise))
- CMO/COO and CFO agents added; all existing agents upgraded
- Enterprise auth pipeline, benchmark harness, 52 boundary integration tests
- Agent count: 20 → 24

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
