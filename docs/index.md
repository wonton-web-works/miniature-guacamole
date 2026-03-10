---
layout: home

hero:
  name: miniature-guacamole
  text: AI-Powered Product Development
  tagline: A complete product development organization for Claude Code — 19 specialized agents, 16 skills, CAD workflows, and project-local architecture.
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/rivermark-research/miniature-guacamole

features:
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2E8B8B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="4" cy="8" r="3" opacity="0.4"/><path d="M10 21a6 6 0 0 0-12 0" opacity="0.4"/><circle cx="20" cy="8" r="3" opacity="0.4"/><path d="M26 21a6 6 0 0 0-12 0" opacity="0.4"/></svg>'
    title: 19 Specialized Agents
    details: Complete organizational hierarchy from CEO to individual contributors with clear delegation patterns and bounded depth control.
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2E8B8B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
    title: Constraint-Driven Development
    details: Misuse-first test ordering, artifact bundles for task agents, mechanical gates for fast verification, and 99% coverage enforcement.
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2E8B8B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>'
    title: Shared Memory System
    details: TypeScript-powered state management with atomic writes, file locking, and optional Postgres backend. Query by agent, workstream, or time.
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2E8B8B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>'
    title: Git Workstreams
    details: Each feature in its own branch with structured merge process and executive review gates before production.
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2E8B8B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
    title: 16 Team Skills
    details: From feature assessment to implementation, security review to accessibility checks — coordinated multi-agent workflows invoked with simple slash commands.
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2E8B8B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
    title: Loop Prevention
    details: Automatic detection of circular delegation with depth limits and supervisor monitoring to prevent infinite chains.
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2E8B8B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="7.5 4.21 12 6.81 16.5 4.21"/><polyline points="7.5 19.79 7.5 14.6 3 12"/><polyline points="21 12 16.5 14.6 16.5 19.79"/></svg>'
    title: 17 Utility Scripts
    details: mg-* CLI tools for memory, workstreams, Postgres, git summaries, and more — all installed to .claude/scripts/ in your project.
---

## Three Ways to Use miniature-guacamole

### Tier 1: Open Source (Local Install)

Install the framework directly into any project. Full access to 19 agents, 16 skills, 17 utility scripts, and the CAD development workflow. Works today, MIT licensed, no account required.

```bash
curl -fsSL https://raw.githubusercontent.com/rivermark-research/miniature-guacamole/main/src/installer/web-install.sh | bash
```

### Tier 2: MCP Server

The `mg-mcp-server` binary reads your project state and exposes it via MCP and a REST API on port 7842. Connects to Postgres if `MG_POSTGRES_URL` is set, falls back to filesystem (`.claude/memory/`) if not. Works with Claude Desktop, Cursor, and any MCP client.

```bash
npx mg-mcp-server
```

Exposes workstream, memory, and event resources — read-only, local-only, no auth required. See the [MCP Server docs](/mcp-server) for the full resource list and Claude Desktop config.

### Tier 3: Commercial Products (Coming Soon)

Product endpoints built on top of the framework: project plan generator, PRD/TDD generator, website builder, application scaffolding. Managed hosting, no local install required.

---

## What You Can Do

### Assess Features

```
/mg-assess Add two-factor authentication
```

Interactive evaluation with product and technical perspectives, spawns expert agents to provide GO/NO-GO recommendations.

### Execute Workstreams

```
/mg-build Execute WS-1: Add login endpoint
```

Runs full CAD cycle: QA writes misuse-first tests → Dev implements with artifact bundles → QA verifies → mechanical or staff-engineer review.

### Review and Deploy

```
/mg-leadership-team Review WS-1 on branch feature/ws-1-login
/deployment-engineer Merge feature/ws-1-login
```

Executive approval gates ensure quality before production deployment.

## Quick Links

- [Getting Started](/getting-started) - Install and initialize your first project in minutes
- [Architecture Overview](/architecture) - Agent hierarchy, delegation model, memory layer
- [Agent Reference](/agents) - All 19 agents and their roles
- [Workflow Guide](/workflows) - CAD cycle and workstream management
- [Contributing](/contributing) - How to extend the system

## Built For

- Product teams building complex features with AI assistance
- Engineers who want disciplined test-first workflows
- Organizations needing structured delegation patterns
- Projects requiring audit trails and state management
- Teams adopting AI-powered development workflows
