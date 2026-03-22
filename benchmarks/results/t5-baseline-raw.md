# MG Daemon v1.0 Launch — Session Plan

**Initiative:** MG Daemon v1.0 Launch
**Date:** 2026-03-22
**Orchestrator:** The Sage
**Team:** CTO (architecture), CFO (cost tracking scope)
**Engineers:** 2, 15 engineering days total

---

## 1. Dependency Analysis

### Workstream Inventory

| ID | Name | Type | Est. | Description |
|----|------|------|------|-------------|
| WS-D1 | GitHub webhook integration | ARCHITECTURAL | 3d | Receive push/PR events, parse to ticket format, route to queue |
| WS-D2 | Daemon execution loop | ARCHITECTURAL | 4d | Poll queue, classify tickets, spawn tracks, handle failures |
| WS-D3 | Context snapshot system | ARCHITECTURAL | 2d | Write/load snapshots, detect drift |
| WS-D4 | Agent telemetry and cost tracking | MECHANICAL | 1d | Log token usage, aggregate by workstream/session |
| WS-D5 | Daemon health dashboard | ARCHITECTURAL | 2d | CLI mg-daemon status, queue depth, recent completions, 24h spend |
| WS-D6 | Open-source documentation | MECHANICAL | 1d | README, config reference, getting started |
| WS-D7 | Integration testing suite | ARCHITECTURAL | 2d | E2E tests, mock webhooks, queue drain verification |

### Existing State

The daemon already has substantial implementation from prior workstreams (WS-DAEMON-10 through WS-DAEMON-14):
- Provider abstraction layer (Jira, Linear, GitHub Issues) — `daemon/src/providers/`
- Orchestrator, planner, executor pipeline — `daemon/src/orchestrator.ts`, `planner.ts`, `executor.ts`
- Git worktree support, PR creation — `daemon/src/git.ts`, `daemon/src/github.ts`
- CLI with dashboard, launchd integration — `daemon/src/cli.ts`, `daemon/src/dashboard.ts`, `daemon/src/launchd.ts`
- Config system — `daemon/src/config.ts`, `daemon/src/config/`
- Triage gate (WS-DAEMON-15) — `daemon/src/triage.ts`
- 35 source files, 38 test files, zero npm deps

This means WS-D1 through WS-D5 are **extensions/hardening of existing code**, not greenfield. WS-D6 and WS-D7 are net-new deliverables.

### Explicit Dependency Graph

```
WS-D1 (webhook integration)
  └── no internal deps; extends existing providers/github.ts
  └── PRODUCES: webhook endpoint, event parser, queue writer

WS-D2 (execution loop)
  └── DEPENDS ON: WS-D1 (needs queue format from webhook parser)
  └── DEPENDS ON: existing orchestrator.ts (extends, not replaces)
  └── PRODUCES: poll loop, ticket classifier, track spawner, failure handler

WS-D3 (context snapshots)
  └── DEPENDS ON: WS-D2 (needs execution loop to know what state to snapshot)
  └── PRODUCES: snapshot writer, snapshot loader, drift detector

WS-D4 (telemetry/cost)
  └── DEPENDS ON: WS-D2 (needs execution loop to instrument)
  └── PARTIALLY PARALLEL: can define interfaces before D2 completes
  └── PRODUCES: token logger, cost aggregator per workstream/session

WS-D5 (health dashboard)
  └── DEPENDS ON: WS-D2 (queue depth requires execution loop)
  └── DEPENDS ON: WS-D4 (24h spend requires cost tracking)
  └── PARTIALLY DEPENDS ON: WS-D1 (recent completions from webhook-sourced work)
  └── PRODUCES: mg-daemon status CLI output

WS-D6 (documentation)
  └── DEPENDS ON: WS-D1, WS-D2, WS-D3, WS-D4, WS-D5 (documents all features)
  └── CAN START EARLY: skeleton docs, config reference from existing code
  └── MUST FINISH LAST: final pass after all features land

WS-D7 (integration tests)
  └── DEPENDS ON: WS-D1 (mock webhook tests)
  └── DEPENDS ON: WS-D2 (queue drain verification)
  └── DEPENDS ON: WS-D3 (snapshot round-trip tests)
  └── CAN START EARLY: test harness, mock infrastructure
  └── MUST FINISH LAST: final E2E pass after all features land
```

### Critical Path

```
WS-D1 (3d) ──► WS-D2 (4d) ──► WS-D3 (2d) ──► WS-D5 (2d)
                    │
                    └──► WS-D4 (1d) ──► WS-D5 (2d)

Critical path: D1 → D2 → D5 = 9 days (with D4 slotting into D2→D5 gap)
```

### Parallelization Opportunities

With 2 engineers:

| Phase | Engineer A | Engineer B |
|-------|-----------|-----------|
| Phase 1 (days 1-3) | WS-D1: webhook integration | WS-D7: test harness + mock infra (early start) |
| Phase 2 (days 4-7) | WS-D2: execution loop | WS-D3: context snapshots (interface-first, integration after D2) |
| Phase 3 (days 8-9) | WS-D4: telemetry (1d) + WS-D5: dashboard (2d overlap) | WS-D7: E2E tests against D1+D2+D3 |
| Phase 4 (days 10-11) | WS-D5: dashboard completion | WS-D6: documentation |
| Buffer (days 12-13) | Integration fixes, final E2E, doc polish | Integration fixes, final E2E, doc polish |

**Note on WS-D3 parallel start:** Engineer B can define the snapshot schema and writer interface during Phase 2 while D2 is in progress, but the drift detector and loader need D2's execution state model. The interface contract between D2 and D3 must be agreed before Phase 2 starts.

---

## 2. Natural Session Break Points (Dependency-Based)

Sessions are broken at **dependency gates** — points where downstream work cannot proceed without upstream completion.

### Session 1: Foundation — Webhook + Test Harness
**Gate:** WS-D1 produces a queue format that WS-D2 consumes. WS-D7 has mock infrastructure ready.
**Why break here:** D2 cannot start without D1's queue contract. Starting D2 against an unstable D1 interface wastes work.
**Deliverables:**
- WS-D1 complete: webhook receiver, event parser, queue writer, unit tests passing
- WS-D7 partial: test harness scaffolded, mock webhook server, fixture data
- Interface contract for D1→D2 queue format documented and frozen

### Session 2: Core Loop — Execution + Snapshots
**Gate:** WS-D2 produces a running execution loop. WS-D3 integrates with it.
**Why break here:** D4 and D5 both instrument the execution loop. They cannot proceed until D2's internal state model is stable.
**Deliverables:**
- WS-D2 complete: poll loop, classifier, track spawner, failure handling, unit tests
- WS-D3 complete: snapshot write/load, drift detection, integrated with D2
- WS-D7 partial: E2E tests for webhook→queue→execution flow

### Session 3: Observability — Telemetry + Dashboard
**Gate:** WS-D4 and WS-D5 produce the monitoring layer. D6 cannot document what doesn't exist yet.
**Why break here:** Documentation and final E2E require all features to be implemented.
**Deliverables:**
- WS-D4 complete: token logger, cost aggregation, workstream/session breakdowns
- WS-D5 complete: mg-daemon status CLI with queue depth, completions, 24h spend
- WS-D7 partial: telemetry and dashboard assertions added to E2E suite

### Session 4: Ship — Docs + Final E2E + Release
**Gate:** All features implemented. Final validation and documentation.
**Why break here:** This is the finish line.
**Deliverables:**
- WS-D6 complete: README, config reference, getting started guide
- WS-D7 complete: full E2E suite passing, mock webhooks, queue drain verified
- Release tag, changelog entry

---

## 3. Session 1 Project Context Snapshot

```yaml
# .claude/memory/project-context-daemon-v1-launch.md
initiative: mg-daemon-v1-launch
session: 1
date: "2026-03-22"
scope: >
  Foundation phase — GitHub webhook integration (WS-D1) and integration test
  harness (WS-D7 partial). Produce the queue contract that unblocks Session 2.

status: not_started

team:
  spawn:
    - cto  # Architecture decisions on webhook format, queue contract, event parsing
  engineers: 2
  engineer_a: WS-D1 (webhook integration)
  engineer_b: WS-D7 (test harness, mock infra)

prior_work:
  description: >
    Daemon pipeline v1 (WS-DAEMON-10 through 14) is built and code-reviewed.
    P0 security hardening applied. Triage gate (WS-DAEMON-15) exists.
    35 source files, 38 test files in daemon/ directory.
  key_files:
    - daemon/src/providers/github.ts  # Existing GitHub provider — extend for webhooks
    - daemon/src/providers/types.ts   # NormalizedTicket interface
    - daemon/src/orchestrator.ts      # Existing orchestrator — D2 will extend
    - daemon/src/config.ts            # Config loader
    - daemon/src/triage.ts            # Triage gate
  branch: main  # Prior daemon work merged via feat/daemon-pipeline-v1

workstreams:
  WS-D1:
    name: GitHub webhook integration
    status: not_started
    type: ARCHITECTURAL
    estimate: 3d
    assigned: engineer_a
    description: >
      Receive GitHub push and PR events via webhook endpoint.
      Parse events into NormalizedTicket format.
      Route parsed tickets to the daemon queue.
    acceptance_criteria:
      - Webhook HTTP endpoint accepts GitHub push and pull_request events
      - Signature verification using HMAC-SHA256 with configured secret
      - Events parsed to NormalizedTicket with correct source, id, title, description
      - Parsed tickets written to daemon queue (file-based or in-memory, TBD in session)
      - Unsupported event types logged and dropped gracefully
      - Unit tests cover happy path, bad signature, malformed payload, unsupported event
    dependencies: none
    blocks: [WS-D2, WS-D5, WS-D7]
    decisions_needed:
      - Queue storage format: file-based JSON queue vs in-memory with WAL?
      - Webhook server: standalone HTTP listener or integrate into existing CLI process?
      - Event filtering: which GitHub events beyond push/PR should we support in v1?

  WS-D2:
    name: Daemon execution loop
    status: blocked
    blocked_by: WS-D1
    type: ARCHITECTURAL
    estimate: 4d
    assigned: engineer_a (session 2)

  WS-D3:
    name: Context snapshot system
    status: blocked
    blocked_by: WS-D2
    type: ARCHITECTURAL
    estimate: 2d
    assigned: engineer_b (session 2)

  WS-D4:
    name: Agent telemetry and cost tracking
    status: blocked
    blocked_by: WS-D2
    type: MECHANICAL
    estimate: 1d
    assigned: engineer_a (session 3)

  WS-D5:
    name: Daemon health dashboard
    status: blocked
    blocked_by: [WS-D2, WS-D4]
    type: ARCHITECTURAL
    estimate: 2d
    assigned: engineer_a (session 3)

  WS-D6:
    name: Open-source documentation
    status: blocked
    blocked_by: [WS-D1, WS-D2, WS-D3, WS-D4, WS-D5]
    type: MECHANICAL
    estimate: 1d
    assigned: engineer_b (session 4)

  WS-D7:
    name: Integration testing suite
    status: not_started
    type: ARCHITECTURAL
    estimate: 2d (spread across sessions)
    assigned: engineer_b
    session_1_scope: >
      Scaffold test harness. Build mock GitHub webhook server.
      Create fixture data for push and PR events.
      Write harness that can inject mock events and observe queue state.
    dependencies: none (harness is independent; E2E tests need D1+D2 later)
    blocks: nothing (tests validate, don't produce)

decisions:
  - id: D-001
    topic: Queue contract between webhook (D1) and execution loop (D2)
    status: pending
    note: >
      Must be decided and frozen before Session 1 ends. This is the critical
      interface that unblocks all downstream work. CTO to decide.
  - id: D-002
    topic: Webhook deployment model
    status: pending
    note: >
      Standalone HTTP server process vs integrated into mg-daemon CLI process.
      Affects D1 implementation and D5 dashboard scope.

open_questions:
  - How does the webhook endpoint authenticate with GitHub? (HMAC secret in config)
  - Should we support GitHub Apps in addition to simple webhooks for v1?
  - What is the queue persistence strategy? (crash recovery, duplicate detection)
  - Does the execution loop poll the queue or get notified? (pull vs push internal model)

deferred: []

specialists_updated: []

next_session:
  number: 2
  scope: >
    Core execution loop (WS-D2) and context snapshot system (WS-D3).
    Depends on Session 1 delivering the frozen queue contract from WS-D1.
  prerequisites:
    - WS-D1 complete with passing tests
    - Queue contract (D-001) decided and documented
    - Test harness from WS-D7 ready for E2E smoke tests
```

---

## 4. Next-Session Priming Instructions

The following block is written to be copy-pasted into the Session 2 prompt. It contains everything needed for a cold-start resume with zero prior context.

---

### SESSION 2 COLD-START PRIMER

```
You are The Sage resuming Session 2 of the MG Daemon v1.0 Launch initiative.

Read your agent definition: /Users/byaizaki/miniature-guacamole/.claude/agents/sage/AGENT.md
Read the project context snapshot: .claude/memory/project-context-daemon-v1-launch.md

## Initiative Summary

We are building MG Daemon v1.0 — an autonomous daemon that receives GitHub
webhook events, queues them as normalized tickets, executes MG team workflows
against them, and provides observability. 7 workstreams, 15 engineering days,
2 engineers.

## What Session 1 Delivered

- WS-D1 (GitHub webhook integration) — COMPLETE
  - Webhook HTTP endpoint receiving push and pull_request events
  - HMAC-SHA256 signature verification
  - Events parsed to NormalizedTicket format via providers/types.ts interface
  - Tickets written to daemon queue
  - Unit tests passing
  - Location: daemon/src/providers/github-webhook.ts (or wherever D1 landed)

- WS-D7 (integration test harness) — PARTIAL
  - Mock GitHub webhook server scaffolded
  - Fixture data for push/PR events created
  - Harness can inject mock events and observe queue state
  - Location: daemon/tests/integration/

- DECISION D-001: Queue contract frozen
  [IMPORTANT: Check .claude/memory/project-context-daemon-v1-launch.md for the
  actual decision. If D-001 is still "pending", Session 1 did not complete its
  critical deliverable — escalate to user before proceeding.]

- DECISION D-002: Webhook deployment model decided
  [Check snapshot for actual decision.]

## What Session 2 Must Deliver

- WS-D2 (Daemon execution loop) — Engineer A
  - Poll the queue produced by D1
  - Classify tickets (bug, feature, research, etc.) using triage.ts
  - Spawn execution tracks (one per ticket, using worktree isolation)
  - Handle failures: retry policy, dead-letter queue, error logging
  - Extend existing orchestrator.ts — do NOT rewrite from scratch
  - Unit tests for poll loop, classifier, spawner, failure handler
  - ACCEPTANCE: daemon can pick up a queued ticket and execute it end-to-end

- WS-D3 (Context snapshot system) — Engineer B
  - Define snapshot schema (what state gets persisted between daemon restarts)
  - Implement snapshot writer: serialize execution state to disk
  - Implement snapshot loader: deserialize and resume from snapshot
  - Implement drift detector: compare loaded snapshot vs actual state
  - Integration with D2: execution loop writes snapshots at checkpoints
  - NOTE: Engineer B can start on schema + writer interface immediately.
    Integration with D2 requires D2's state model — coordinate with Engineer A
    on the state interface early in the session.
  - ACCEPTANCE: daemon can be killed and restarted without losing in-progress work

- WS-D7 (integration tests) — continuation
  - Add E2E test: mock webhook → queue → execution loop picks up → track spawns
  - Add E2E test: snapshot write → kill → restart → resume from snapshot
  - ACCEPTANCE: E2E suite runs in CI, all tests green

## Key Files to Read First

1. daemon/src/orchestrator.ts — existing orchestrator, D2 extends this
2. daemon/src/providers/types.ts — NormalizedTicket interface
3. daemon/src/triage.ts — ticket classifier, D2 uses this
4. daemon/src/config.ts — config loader
5. daemon/src/git.ts — worktree support for track isolation
6. [D1 output files — check what Session 1 actually produced]
7. .claude/memory/project-context-daemon-v1-launch.md — latest snapshot

## Decisions Still Open

- Internal queue model: does D2 poll on interval, or does D1 push to D2?
  (May have been resolved by D-001 in Session 1 — check snapshot)
- Snapshot format: JSON? YAML? Binary? (D3 to decide with CTO)
- Failure policy: how many retries before dead-letter? Backoff strategy?

## What NOT To Do

- Do not touch WS-D4 (telemetry) or WS-D5 (dashboard) — those are Session 3
- Do not write documentation (WS-D6) — that is Session 4
- Do not refactor D1 code unless it has a bug blocking D2
- Do not make business decisions — escalate to CEO if needed

## Session 2 Exit Criteria

Session 2 is DONE when:
1. WS-D2 has passing unit tests and can execute a ticket end-to-end
2. WS-D3 has passing tests and daemon survives kill/restart
3. E2E test covers webhook → queue → execute → snapshot → restart → resume
4. Project context snapshot updated for Session 3

## Spawn

- CTO: architecture decisions on execution loop state model, snapshot format,
  failure policy
- Do NOT spawn CEO, CMO, CFO — this session is pure engineering
```

---

### SESSION 3 COLD-START PRIMER (Draft — Update After Session 2)

```
You are The Sage resuming Session 3 of the MG Daemon v1.0 Launch initiative.

Read: /Users/byaizaki/miniature-guacamole/.claude/agents/sage/AGENT.md
Read: .claude/memory/project-context-daemon-v1-launch.md

## What Sessions 1-2 Delivered
- WS-D1: Webhook integration (COMPLETE)
- WS-D2: Execution loop (COMPLETE)
- WS-D3: Context snapshots (COMPLETE)
- WS-D7: E2E tests for D1+D2+D3 (PARTIAL — harness + core E2E passing)

## What Session 3 Must Deliver
- WS-D4: Agent telemetry — instrument the execution loop (from D2) with token
  counting, cost aggregation per workstream and session. 1 day.
- WS-D5: Health dashboard — mg-daemon status CLI showing queue depth, recent
  completions, 24h spend (needs D4 for spend data). 2 days.
- WS-D7: Add telemetry and dashboard assertions to E2E suite.

## Spawn: CTO (dashboard architecture), CFO (cost tracking scope/format)
```

### SESSION 4 COLD-START PRIMER (Draft — Update After Session 3)

```
You are The Sage resuming Session 4 of the MG Daemon v1.0 Launch initiative.

Read: /Users/byaizaki/miniature-guacamole/.claude/agents/sage/AGENT.md
Read: .claude/memory/project-context-daemon-v1-launch.md

## What Sessions 1-3 Delivered
- WS-D1 through WS-D5: ALL COMPLETE
- WS-D7: E2E suite covers all features (PARTIAL — needs final pass)

## What Session 4 Must Deliver
- WS-D6: Open-source documentation — README, config reference, getting started
- WS-D7: Final E2E pass, all tests green, CI integration verified
- Release: tag v1.0.0-daemon, changelog entry, announce

## Spawn: CTO (final review), CMO (documentation quality, OSS positioning)
```
