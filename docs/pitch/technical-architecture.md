# Technical Architecture Overview

**TheEngOrg / miniature-guacamole**
*Technical Due Diligence Package -- Architecture*

---

## What TheEngOrg Is

TheEngOrg (codename: miniature-guacamole) is a prompt-engineering framework that transforms Claude Code into a simulated product development organization. It ships as a set of markdown files -- agent constitutions, skill definitions, and coordination protocols -- that are installed into a project's `.claude/` directory. There is no runtime, no server, no container. The "infrastructure" is structured English that constrains how an LLM delegates, decides, and builds.

The key technical insight: **a well-constrained prompt on a mid-tier model produces output indistinguishable from an unconstrained prompt on a top-tier model.** This is not a hypothesis. It is a benchmarked result (see `benchmarks.md`).

---

## System Architecture

### Agent Hierarchy

The framework organizes 24 specialized agents into a corporate hierarchy with five tiers:

```
                         ┌──────────┐
                         │   Sage   │   Tier 0: Orchestrator (opus)
                         └────┬─────┘   Enterprise only
              ┌──────┬────────┼────────┬──────┐
              │      │        │        │      │
         ┌────┴──┐ ┌─┴──┐ ┌──┴──┐ ┌───┴──┐   │
         │  CEO  │ │CTO │ │ CMO │ │ CFO  │   │   Tier 1: C-Suite (sonnet)
         └───┬───┘ └─┬──┘ └──┬──┘ └──────┘   │
             │       │       │                │
         ┌───┴───┐ ┌─┴────┐ ┌┴────────┐      │
         │Eng Dir│ │Stf Eng│ │Art Dir/PO│     │   Tier 2: Directors (sonnet)
         └───┬───┘ └─┬────┘ └─────────┘      │
             │       │                        │
         ┌───┴───┐ ┌─┴──┐                    │
         │Eng Mgr│ │ Dev│                    │   Tier 3: ICs (sonnet)
         └───┬───┘ └────┘                    │
             │                                │
         ┌───┴────┐                     ┌─────┴──────┐
         │Dev │ QA│                     │ Supervisor │  Tier 4: Ops (haiku)
         └────┴───┘                     └────────────┘
```

Each tier corresponds to a model allocation in Config C (the production configuration):

| Tier | Model | Cost Relative to All-Opus | Why |
|------|-------|---------------------------|-----|
| Sage | opus | Baseline | Judgment, research evaluation, session management require highest capability |
| C-Suite | sonnet | ~60% | Strong constitutions compensate fully -- benchmarked at parity with opus |
| Directors | sonnet | ~60% | Coordination and planning -- sonnet is sufficient |
| ICs | sonnet | ~60% | Code generation, test writing -- sonnet handles this well |
| Supervisor | haiku | ~15% | Read-only monitoring, pattern matching -- lightest model sufficient |

**Config C achieves a 1.000 (perfect) benchmark score at approximately 60% of the all-opus cost.** The constitutions are doing the load-bearing work, not the model tier.

---

## How Agents Work

### Constitutions

Each agent is defined by a markdown file (its "constitution") that specifies:

1. **Role and scope** -- What the agent does, what it does not do, what it escalates
2. **Decision heuristics** -- Numbered rules with concrete thresholds, not vague guidelines
3. **Output format** -- Mandatory tagged fields that force structured reasoning
4. **Memory protocol** -- What files to read before acting, what files to write after
5. **Delegation authority** -- Which other agents it can spawn, and for what

Example from the CTO constitution:

```
4. Build vs buy requires a threshold, not a feeling.
   If a dependency saves fewer than 2 weeks of engineering time and adds
   ongoing operational burden, build it. If it saves more than 1 month
   of engineering time and the team can operate it reliably, buy it.
   State which side of the threshold the decision falls on.

8. Tradeoff analysis must name the break-even point.
   At what scale, usage level, or team size does the recommendation change?
```

These numbered constraints force the model to execute specific computations rather than producing generic advice. The CTO constitution scored 5.00/5.00 across ALL model configurations -- including sonnet -- because the constraints are explicit enough that the model has no room to drift.

### Tools

Agents receive role-appropriate tool access:

| Agent Type | Read | Write | Edit | Bash | Task (spawn) |
|-----------|------|-------|------|------|---------------|
| Sage | Yes | No | No | No | Yes (C-Suite, Supervisor) |
| CEO | Yes | No | No | No | Yes (CTO, ED, PO, AD) |
| CTO | Yes | Yes | Yes | No | Yes (Staff Eng, ED) |
| Dev | Yes | Yes | Yes | Yes | No (peer consult only) |
| QA | Yes | Yes | Yes | Yes | No (peer consult only) |
| Supervisor | Yes | No | No | No | No |

Leadership agents can delegate (spawn sub-agents) but cannot write code. IC agents can write code but cannot spawn other agents. This separation prevents role-bleed -- a C-Suite agent cannot bypass the development process by writing code directly.

### Memory System

All agent state is stored in project-local JSON files under `.claude/memory/`:

```
.claude/memory/
├── workstream-{id}-state.json     # Phase, progress, blockers per workstream
├── agent-{name}-decisions.json    # Decision records per agent
├── tasks-{role}.json              # Task queue per agent role
├── messages-{from}-{to}.json      # Inter-agent message bus
├── supervisor-alerts.json         # System health alerts
├── specialists/{domain}.md        # Accumulated research knowledge
└── project-context-{init}.md      # Session snapshots (Enterprise)
```

Key properties:
- **Project-local** -- Memory never leaves the project directory. No data crosses between clients.
- **NDA-safe** -- Agent definitions (shared) contain no project data. Memory (local) contains no agent IP.
- **Atomic writes** with automatic backups and file locking for concurrent safety
- **Size-managed** -- Global files rotate at 50KB with 30-day archive retention
- **Queryable** -- TypeScript API for read, write, and query by agent/workstream/timestamp
- **Optional Postgres sync** -- Completed workstreams can sync to Postgres for richer querying

### Delegation Chains

When a skill like `/mg-leadership-team` is invoked:

1. The skill checks for the Sage agent file (`agents/sage/AGENT.md`)
2. If present (Enterprise): routes through Sage for scope assessment and selective C-Suite spawning
3. If absent (Community): spawns CEO + CTO + Engineering Director in parallel
4. Each C-Suite agent runs independently, produces structured output tagged with its role
5. Assessments are collected, decision is issued
6. State sync propagates the decision to the tracker, memory, and workstream specs

Delegation depth is hard-capped at 3 levels. The Supervisor agent monitors depth and detects loops (same task appearing 3+ times). Circular delegation is prevented at the protocol level -- agents cannot delegate back to any agent already in the chain.

---

## How Skills Orchestrate Multi-Agent Workflows

Skills are markdown files that define multi-step workflows. The two primary skills:

### /mg-leadership-team (Planning and Review)

```
Enterprise: Sage → selective C-Suite (0-4 agents) → ED → Decision → State Sync
Community:  CEO + CTO + ED (always all 3) → Decision → State Sync
```

The Sage's selective spawning is a key efficiency gain. For a pure engineering task, it spawns only the CTO. For a full initiative, it spawns all four C-Suite roles. The community tier always spawns three agents regardless of task scope -- this is the most visible capability gap between tiers.

### /mg-build (Execution)

Every workstream is classified at intake using explicit rules (R1-R8 for ARCHITECTURAL, M1-M5 for MECHANICAL) before any agent is spawned:

```
MECHANICAL (60%+ of work):  Dev solo TDD → Bash Gate → Done (1 spawn)
ARCHITECTURAL (complex):     Leadership → QA → Dev → Staff Eng → Leadership Review → Merge (5-6 spawns)
```

MECHANICAL classification requires: <200 lines changed, modifications only, single directory, no framework changes, 99% coverage. If any condition fails, it defaults to ARCHITECTURAL (conservative bias).

---

## Edition Detection: Community vs Enterprise

The edition split is implemented through file-existence gating -- no feature flags, no license keys, no runtime checks:

```
IF agents/sage/AGENT.md exists → ENTERPRISE MODE
ELSE                           → COMMUNITY MODE
```

This check happens at skill invocation time. The Sage agent file is excluded from the community distribution entirely -- it is never downloaded, never present on disk. The gating mechanism is the filesystem itself.

**What Enterprise gets that Community does not:**
- The Sage agent (orchestration, research evaluation, session management, drift detection)
- Selective C-Suite spawning (0-4 agents based on scope vs always-3)
- Session management with dependency-based breaks and cold-start primers
- Real-time execution monitoring and process violation detection
- Specialist persistence (research compounds across sessions)
- 20x drift prevention ROI (benchmarked)

**What Community gets:**
- 23 agents (all except Sage)
- All 16 skills (with community-mode fallback behavior)
- All 6 shared protocols
- Full development workflow (MECHANICAL and ARCHITECTURAL tracks)
- Upgraded Supervisor agent (community-tier monitoring)

---

## Zero-Infrastructure Distribution Model

TheEngOrg ships as files. The complete framework is a set of markdown documents and shell scripts distributed via GitHub releases as a tarball:

```
Installation:
  Phase 1: curl | bash → downloads tarball → extracts to ~/.miniature-guacamole/
  Phase 2: mg-init → copies framework to project .claude/ directory

Runtime:
  No servers. No containers. No APIs.
  Customers pay Anthropic directly for Claude Code tokens.
  TheEngOrg's code is the prompt engineering that makes those tokens productive.
```

This means:
- **Zero COGS** on compute -- customers bring their own model access
- **Zero ops burden** -- no infrastructure to maintain, no SLAs to service for uptime
- **Instant deployment** -- `mg-init` takes seconds, not minutes
- **Air-gap compatible** -- works offline after initial install (no network calls at runtime)

---

## Testing and Quality

The framework maintains 5,200+ tests across three suites:

| Suite | Files | Tests | Coverage |
|-------|-------|-------|----------|
| Unit | 105 | 3,700+ | 99%+ |
| Integration | 17 | 450+ | Cross-agent communication validated |
| Script (BATS) | 30 | 1,078 | All 17 CLI scripts |

The memory system has atomic writes, backup-before-write, file locking for concurrent access, circular reference detection, and graceful error handling (never throws exceptions).

---

## Key Architectural Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Prompt files, not code | Markdown constitutions | Portable across Claude versions; no runtime dependencies; version-controllable |
| File-existence gating | Sage present/absent | Simplest possible edition detection; no license server; unforgeable at distribution level |
| Project-local memory | JSON in .claude/memory/ | NDA-safe; no cross-client data leakage; works offline |
| Tiered model allocation | opus/sonnet/haiku | Benchmarked: constitution quality compensates for model tier at 40% cost savings |
| Conservative classification bias | Default to ARCHITECTURAL | Prevents under-reviewed code from reaching main; false positive (extra review) is cheaper than false negative (skipped review) |
| 3-level delegation cap | Hard limit enforced by Supervisor | Prevents infinite agent chains; keeps token cost bounded |
