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
| WS-D1 | GitHub webhook integration | ARCHITECTURAL | 3d | Receive push/PR events, verify signatures, parse to NormalizedTicket, route to queue |
| WS-D2 | Daemon execution loop | ARCHITECTURAL | 4d | Poll queue, classify tickets via triage gate, spawn execution tracks in worktrees, handle failures |
| WS-D3 | Context snapshot system | ARCHITECTURAL | 2d | Serialize execution state to disk, reload on restart, detect drift between snapshot and reality |
| WS-D4 | Agent telemetry and cost tracking | MECHANICAL | 1d | Instrument execution loop with token counters, aggregate cost per workstream and session |
| WS-D5 | Daemon health dashboard | ARCHITECTURAL | 2d | `mg-daemon status` CLI — queue depth, active tracks, recent completions, 24h spend |
| WS-D6 | Open-source documentation | MECHANICAL | 1d | README, config reference, getting started guide, architecture overview |
| WS-D7 | Integration testing suite | ARCHITECTURAL | 2d | E2E tests with mock webhooks, queue drain verification, snapshot round-trip, full pipeline |

### Existing Codebase

The daemon already has substantial implementation from prior workstreams (WS-DAEMON-10 through WS-DAEMON-15):

- Provider abstraction layer (Jira, Linear, GitHub Issues) — `daemon/src/providers/`
- Orchestrator, planner, executor pipeline — `daemon/src/orchestrator.ts`, `planner.ts`, `executor.ts`
- Git worktree support, PR creation — `daemon/src/git.ts`, `daemon/src/github.ts`
- CLI with dashboard, launchd integration — `daemon/src/cli.ts`, `daemon/src/dashboard.ts`, `daemon/src/launchd.ts`
- Config system — `daemon/src/config.ts`, `daemon/src/config/`
- Triage gate — `daemon/src/triage.ts`
- 35 source files, 38 test files, zero npm deps

WS-D1 through WS-D5 are **extensions and hardening of existing code**, not greenfield builds. WS-D6 and WS-D7 are net-new deliverables that wrap around the existing + new code.

### Explicit Dependency Graph

```
                    ┌──────────────────────────────────────────┐
                    │           DEPENDENCY GRAPH                │
                    └──────────────────────────────────────────┘

  WS-D1 (webhooks, 3d)
    ├── depends on: NOTHING (extends existing providers/github.ts)
    ├── produces:   webhook HTTP endpoint, HMAC verifier, event parser, queue writer
    └── blocks:     WS-D2 (queue format), WS-D5 (completion data), WS-D7 (mock targets)

  WS-D2 (execution loop, 4d)
    ├── depends on: WS-D1 — needs the queue format and writer contract
    ├── depends on: existing orchestrator.ts, triage.ts (extends, does not replace)
    ├── produces:   poll loop, ticket classifier, track spawner, failure handler, state model
    └── blocks:     WS-D3 (state model), WS-D4 (instrumentation points), WS-D5 (queue depth)

  WS-D3 (context snapshots, 2d)
    ├── depends on: WS-D2 — needs execution loop's state model to know what to persist
    ├── produces:   snapshot writer, snapshot loader, drift detector
    └── blocks:     WS-D7 (snapshot round-trip tests)
    NOTE: Schema + writer interface can be defined against a contract BEFORE D2
          completes, but integration and drift detection require D2's actual state.

  WS-D4 (telemetry, 1d)
    ├── depends on: WS-D2 — needs execution loop to instrument
    ├── produces:   token logger, cost aggregator (per-workstream, per-session)
    └── blocks:     WS-D5 (24h spend metric)
    NOTE: Telemetry interfaces can be defined early. Wiring requires D2 internals.

  WS-D5 (health dashboard, 2d)
    ├── depends on: WS-D2 — queue depth, active track count
    ├── depends on: WS-D4 — 24h spend figure
    ├── depends on: WS-D1 — recent completions sourced from webhook-originated work
    ├── produces:   `mg-daemon status` CLI output
    └── blocks:     WS-D6 (must document dashboard output)

  WS-D6 (documentation, 1d)
    ├── depends on: WS-D1, WS-D2, WS-D3, WS-D4, WS-D5 — documents all features
    ├── produces:   README, config reference, getting started, architecture diagram
    └── blocks:     NOTHING (terminal node)
    NOTE: Skeleton docs and config reference can start early from existing code.
          Final pass MUST happen after all features land.

  WS-D7 (integration tests, 2d spread)
    ├── depends on: WS-D1 (mock webhook tests), WS-D2 (queue drain), WS-D3 (snapshot round-trip)
    ├── produces:   E2E test suite, CI pipeline integration
    └── blocks:     NOTHING (terminal node, but gates release)
    NOTE: Test harness and mock infra have ZERO dependencies — can start day 1.
          Actual E2E assertions accumulate as features land.
```

### Critical Path Analysis

```
CRITICAL PATH (longest chain of blocking dependencies):

  WS-D1 (3d) ──► WS-D2 (4d) ──► WS-D4 (1d) ──► WS-D5 (2d) = 10 days
                       │
                       └──► WS-D3 (2d) ──► [feeds into D7 E2E]

  Theoretical minimum: 10 days on critical path.
  With 2 engineers and parallelization: ~11 working days + 2 days buffer = 13 days.
  Budget: 15 engineering days. Headroom: 2 days (13% buffer). Tight but feasible.

RISK: WS-D2 is the bottleneck. At 4 days it is the longest single workstream AND
      gates D3, D4, D5. Any D2 slip cascades to everything downstream.

MITIGATION:
  - Freeze the D1→D2 queue contract EARLY in D1 (day 2 at latest) so D2 design
    can start in parallel with D1 completion.
  - Engineer B works on D7 test harness during D1 phase, then starts D3 interface
    work as soon as D2's state model contract is available (before D2 is fully done).
```

### Parallelization Schedule (2 Engineers)

| Phase | Days | Engineer A | Engineer B | Gate at Phase End |
|-------|------|-----------|-----------|-------------------|
| **Phase 1** | 1-3 | WS-D1: webhook integration | WS-D7: test harness + mock infra (no deps) | D1 complete. Queue contract frozen. |
| **Phase 2** | 4-7 | WS-D2: execution loop | WS-D3: snapshot schema + writer (interface-first); D7: E2E for D1 | D2 complete. D3 integrated with D2. |
| **Phase 3** | 8-9 | WS-D4: telemetry (1d) then WS-D5: dashboard start | WS-D7: E2E for D2+D3 pipeline | D4 complete. D5 in progress. |
| **Phase 4** | 10-11 | WS-D5: dashboard completion | WS-D6: documentation | D5 complete. D6 complete. |
| **Buffer** | 12-13 | Integration fixes, final E2E, doc polish | Integration fixes, final E2E, doc polish | Release-ready. |

**Phase 2 coordination note:** Engineer B starts WS-D3 by defining the snapshot schema and writer interface against a _contract_ with Engineer A. The actual state model interface between D2 and D3 must be agreed on day 4 (Phase 2 kickoff). Engineer B can write the serializer/deserializer and unit tests against that contract while Engineer A builds D2's internals. Integration happens when D2 is functionally complete (day 6-7).

---

## 2. Session Break Points (Dependency-Gated)

Sessions break at **dependency gates** — points where downstream work is structurally blocked by upstream completion. These are not time-based; they are driven by the dependency graph.

### Session 1: Foundation — Webhook + Test Harness

**Dependency gate:** WS-D2 consumes the queue format that WS-D1 produces. D2 cannot start without a frozen queue contract from D1.

**Why this is a natural break:**
- Before this gate: D1 and D7 harness are independent work with no cross-dependencies.
- After this gate: D2, D3, D4, D5 all flow from D1's output. Starting them against an unfrozen interface wastes effort.
- The queue contract (Decision D-001) is a one-way door — once D2 starts building against it, changing it is expensive.

**Deliverables:**
- WS-D1 COMPLETE: webhook receiver, HMAC verifier, event parser, queue writer, unit tests green
- WS-D7 PARTIAL: test harness scaffolded, mock webhook server, fixture data for push/PR events
- Decision D-001 RESOLVED: queue contract between D1 and D2 frozen and documented
- Decision D-002 RESOLVED: webhook deployment model decided (standalone vs integrated)

**Exit criteria (all must be true):**
1. `daemon/tests/` — all D1 unit tests pass
2. Queue contract written to a types file or interface doc, reviewed by CTO
3. Mock webhook server can inject events and observe resulting queue entries
4. Project context snapshot updated with D-001 and D-002 decisions

### Session 2: Core — Execution Loop + Snapshots

**Dependency gate:** WS-D4 and WS-D5 both instrument the execution loop. They cannot proceed until D2's internal state model and execution lifecycle are stable.

**Why this is a natural break:**
- Before this gate: D2 and D3 are the core engine — they define the runtime behavior.
- After this gate: D4 and D5 are observability layers that wrap around stable internals.
- Instrumenting an unstable execution loop produces throwaway telemetry code.

**Deliverables:**
- WS-D2 COMPLETE: poll loop, ticket classifier (via triage.ts), track spawner (worktrees), failure handler (retry + dead-letter), unit tests green
- WS-D3 COMPLETE: snapshot writer, snapshot loader, drift detector, integrated with D2's execution state, unit tests green
- WS-D7 PARTIAL: E2E test covering webhook -> queue -> execution -> track spawn; snapshot write -> kill -> restart -> resume
- Interface contract for D2's instrumentation points documented (where D4 hooks in)

**Exit criteria (all must be true):**
1. Daemon can receive a mock webhook event and execute it end-to-end (queue -> classify -> spawn track -> complete)
2. Daemon can be killed mid-execution and restarted without losing in-progress work
3. E2E tests for both flows pass in CI
4. Project context snapshot updated for Session 3

### Session 3: Observability — Telemetry + Dashboard

**Dependency gate:** WS-D6 documents all features including telemetry and dashboard. It cannot produce accurate docs until D4 and D5 are done.

**Why this is a natural break:**
- Before this gate: D4 and D5 add the monitoring layer.
- After this gate: D6 and D7 are the "wrap up and ship" phase — documentation and final validation.
- Writing docs against unfinished features produces inaccurate documentation that needs rework.

**Deliverables:**
- WS-D4 COMPLETE: token logger wired into execution loop, cost aggregation per workstream and per session, unit tests green
- WS-D5 COMPLETE: `mg-daemon status` CLI showing queue depth, active tracks, recent completions, 24h spend
- WS-D7 PARTIAL: telemetry assertions (token counts increment correctly) and dashboard output assertions added to E2E suite

**Exit criteria (all must be true):**
1. `mg-daemon status` produces correct output with live daemon running
2. Cost data aggregates correctly across multiple workstreams
3. E2E suite covers telemetry and dashboard
4. Project context snapshot updated for Session 4

### Session 4: Ship — Documentation + Final E2E + Release

**Dependency gate:** None — this is the terminal session.

**Deliverables:**
- WS-D6 COMPLETE: README, config reference, getting started guide, architecture overview
- WS-D7 COMPLETE: full E2E suite green, all features covered, CI integration verified
- Release: tag `v1.0.0-daemon`, changelog entry, announcement prep

**Exit criteria (all must be true):**
1. All 7 workstreams COMPLETE
2. Full E2E suite passes
3. Documentation reviewed for accuracy
4. Release tag created

---

## 3. Session 1 Project Context Snapshot

```yaml
# .claude/memory/project-context-daemon-v1-launch.md
initiative: mg-daemon-v1-launch
session: 1
date: "2026-03-22"
scope: >
  Foundation phase. Deliver GitHub webhook integration (WS-D1) and scaffold the
  integration test harness (WS-D7 partial). The critical deliverable is the frozen
  queue contract (Decision D-001) that unblocks all downstream workstreams.

status: not_started

team:
  spawn:
    - cto  # Architecture decisions: queue format, webhook deployment model, event filtering
  do_not_spawn:
    - ceo   # No business strategy decisions this session
    - cmo   # No marketing or UX decisions this session
    - cfo   # Cost tracking is Session 3 scope
  engineers: 2
  assignments:
    engineer_a:
      workstream: WS-D1
      focus: webhook HTTP endpoint, signature verification, event parsing, queue writer
    engineer_b:
      workstream: WS-D7 (partial)
      focus: test harness scaffold, mock webhook server, fixture data

prior_work:
  description: >
    Daemon pipeline v1 (WS-DAEMON-10 through 15) is built, code-reviewed, and
    merged to main. P0 security hardening applied. Triage gate exists.
    35 source files, 38 test files in daemon/ directory. Zero npm dependencies.
  key_files:
    - daemon/src/providers/github.ts    # Existing GitHub provider — D1 extends this
    - daemon/src/providers/types.ts     # NormalizedTicket interface — D1 parses events into this
    - daemon/src/orchestrator.ts        # Existing orchestrator — D2 will extend (Session 2)
    - daemon/src/triage.ts              # Triage gate — D2 uses for classification (Session 2)
    - daemon/src/config.ts              # Config loader — webhook config goes here
    - daemon/src/git.ts                 # Worktree support — D2 uses for track isolation
    - daemon/src/cli.ts                 # CLI entry point — D5 extends (Session 3)
    - daemon/src/dashboard.ts           # Existing dashboard — D5 extends (Session 3)
  branch: main
  test_command: "cd daemon && npm test"

workstreams:
  WS-D1:
    name: GitHub webhook integration
    status: not_started
    type: ARCHITECTURAL
    estimate: 3d
    assigned: engineer_a
    phase: 1
    description: >
      Receive GitHub push and pull_request events via HTTP webhook endpoint.
      Verify request signatures using HMAC-SHA256 with a configured secret.
      Parse events into NormalizedTicket format (providers/types.ts).
      Write parsed tickets to the daemon queue.
    acceptance_criteria:
      - Webhook HTTP endpoint accepts POST requests with GitHub event payloads
      - X-Hub-Signature-256 header verified using HMAC-SHA256 with configured secret
      - push events parsed to NormalizedTicket with source=github, correct id/title/description
      - pull_request events (opened, synchronize, reopened) parsed to NormalizedTicket
      - Parsed tickets written to daemon queue in the format consumed by D2
      - Unsupported event types (issues, releases, etc.) logged at debug level and dropped
      - Unit tests cover: valid push, valid PR, bad signature (401), malformed payload (400), unsupported event (200 + dropped)
    dependencies: none
    blocks: [WS-D2, WS-D5, WS-D7]
    decisions_needed:
      - "D-001: Queue storage format — file-based JSON queue vs in-memory ring buffer with WAL?"
      - "D-002: Webhook server — standalone HTTP listener process vs integrated into mg-daemon CLI?"
      - "Event filtering — which GitHub events beyond push and pull_request for v1?"

  WS-D2:
    name: Daemon execution loop
    status: blocked
    blocked_by: [WS-D1]
    type: ARCHITECTURAL
    estimate: 4d
    assigned: engineer_a
    phase: 2
    description: >
      Poll the queue, classify tickets using triage.ts, spawn execution tracks
      in isolated git worktrees, handle failures with retry and dead-letter.
    key_risk: >
      Longest single workstream (4d) and on the critical path. Gates D3, D4, D5.
      Any slip here cascades across the entire initiative.
    mitigation: >
      Freeze queue contract early in Session 1 so D2 design can begin before
      D1 is fully complete. Define D2 state model contract on day 4 so D3 can
      start interface work in parallel.

  WS-D3:
    name: Context snapshot system
    status: blocked
    blocked_by: [WS-D2]
    type: ARCHITECTURAL
    estimate: 2d
    assigned: engineer_b
    phase: 2
    parallel_start: >
      Schema and writer interface can be defined against a contract before D2
      completes. Integration and drift detection require D2's actual state model.

  WS-D4:
    name: Agent telemetry and cost tracking
    status: blocked
    blocked_by: [WS-D2]
    type: MECHANICAL
    estimate: 1d
    assigned: engineer_a
    phase: 3

  WS-D5:
    name: Daemon health dashboard
    status: blocked
    blocked_by: [WS-D2, WS-D4]
    type: ARCHITECTURAL
    estimate: 2d
    assigned: engineer_a
    phase: 3-4

  WS-D6:
    name: Open-source documentation
    status: blocked
    blocked_by: [WS-D1, WS-D2, WS-D3, WS-D4, WS-D5]
    type: MECHANICAL
    estimate: 1d
    assigned: engineer_b
    phase: 4
    early_start: >
      Skeleton docs and config reference can begin from existing code.
      Final pass MUST happen after all features land.

  WS-D7:
    name: Integration testing suite
    status: not_started
    type: ARCHITECTURAL
    estimate: 2d (spread across all sessions)
    assigned: engineer_b
    session_1_scope: >
      Scaffold test harness. Build mock GitHub webhook server that sends
      configurable payloads with valid/invalid signatures. Create fixture
      data for push events (single commit, multi-commit, force push) and
      PR events (opened, synchronize, reopened, closed). Write harness
      that injects mock events and asserts on resulting queue entries.
    session_2_scope: "E2E: webhook -> queue -> execute -> track spawn; snapshot round-trip"
    session_3_scope: "E2E: telemetry assertions, dashboard output verification"
    session_4_scope: "Final pass: all E2E green, CI pipeline integration, coverage report"
    dependencies: none (harness is independent; E2E assertions accumulate as features land)
    blocks: nothing (tests validate, don't produce — but gate the release)

decisions:
  - id: D-001
    topic: Queue contract between webhook (D1) and execution loop (D2)
    status: pending
    priority: CRITICAL
    must_resolve_by: "End of Session 1"
    note: >
      This is the single most important decision of the initiative. The queue
      format is the interface contract between D1 (producer) and D2 (consumer).
      Every downstream workstream depends on D2, which depends on this contract.
      CTO decides. Options under consideration:
        (a) File-based JSON queue — each ticket is a .json file in a queue directory.
            Simple, inspectable, crash-safe (atomic file writes). Slow at scale.
        (b) In-memory ring buffer with write-ahead log — fast, but adds complexity
            for crash recovery. May be premature for v1.
      Recommendation: file-based for v1, migrate to WAL if needed in v1.1.
  - id: D-002
    topic: Webhook deployment model
    status: pending
    priority: HIGH
    must_resolve_by: "End of Session 1"
    note: >
      Standalone HTTP server process vs integrated into mg-daemon CLI process.
      Standalone: simpler process model, can be deployed independently, but
      requires IPC for queue writes. Integrated: single process, direct queue
      access, but CLI must manage HTTP lifecycle alongside daemon loop.
      Recommendation: integrated — single process avoids IPC complexity for v1.

open_questions:
  - "GitHub Apps vs simple webhooks — do we need App-level auth for v1?"
  - "Queue persistence — should we support crash recovery with duplicate detection in v1?"
  - "Internal model — does D2 poll on an interval, or does D1 push to D2 via callback?"
  - "Event filtering — should v1 support issue events, or strictly push + PR only?"

risks:
  - id: R-001
    description: "WS-D2 is the critical path bottleneck at 4 days. Any slip cascades."
    mitigation: "Freeze queue contract by day 2 of Session 1. Start D2 design work early."
  - id: R-002
    description: "D3 integration with D2 requires D2 state model — late D2 delays D3."
    mitigation: "Define state model contract on Phase 2 day 1. D3 builds against contract."
  - id: R-003
    description: "13% buffer (2 days) is thin for an initiative with 5 ARCHITECTURAL workstreams."
    mitigation: "If Phase 2 slips, compress D6 (docs) by starting skeleton early. D7 E2E is spread across sessions, not a bottleneck."

deferred: []

specialists_updated: []

next_session:
  number: 2
  scope: >
    Core execution loop (WS-D2) and context snapshot system (WS-D3).
    Depends on Session 1 delivering the frozen queue contract (D-001)
    and webhook deployment model (D-002).
  prerequisites:
    - "WS-D1 complete with all unit tests passing"
    - "Decision D-001 resolved and documented (queue format + contract)"
    - "Decision D-002 resolved and documented (deployment model)"
    - "Test harness from WS-D7 ready with mock webhook server"
    - "NormalizedTicket interface unchanged or updated in providers/types.ts"
  engineer_assignments:
    engineer_a: "WS-D2 (execution loop)"
    engineer_b: "WS-D3 (context snapshots, interface-first) + WS-D7 (E2E for D1 pipeline)"
```

---

## 4. Next-Session Priming Instructions

Each primer below is written for **cold-start resume** — paste it into a fresh session with zero prior context. The Sage reads the snapshot file for state, then uses the primer to orient.

---

### SESSION 2 COLD-START PRIMER

```
You are The Sage resuming Session 2 of the MG Daemon v1.0 Launch initiative.

FIRST — read these files before doing anything else:
1. /Users/byaizaki/miniature-guacamole/.claude/agents/sage/AGENT.md
2. .claude/memory/project-context-daemon-v1-launch.md

## Initiative

MG Daemon v1.0: autonomous daemon that receives GitHub webhook events, queues
them as normalized tickets, executes MG team workflows, snapshots state for
crash recovery, and provides cost/health observability. 7 workstreams, 15
engineering days, 2 engineers, 4 sessions.

## What Session 1 Delivered (VERIFY against snapshot)

- WS-D1 (GitHub webhook integration) — EXPECTED: COMPLETE
  - Webhook HTTP endpoint receiving push and pull_request events
  - HMAC-SHA256 signature verification
  - Events parsed to NormalizedTicket via providers/types.ts
  - Tickets written to daemon queue
  - Unit tests passing
  - VERIFY: check daemon/src/providers/ for new webhook files

- WS-D7 (integration test harness) — EXPECTED: PARTIAL
  - Mock GitHub webhook server scaffolded
  - Fixture data for push/PR events
  - Harness injects events and observes queue state
  - VERIFY: check daemon/tests/integration/ for harness files

- Decision D-001 (queue contract) — EXPECTED: RESOLVED
  *** CRITICAL CHECK: If D-001 is still "pending" in the snapshot, Session 1
  did NOT deliver its critical gate. STOP and escalate to user. Do NOT
  proceed with D2 against an unfrozen contract. ***

- Decision D-002 (webhook deployment model) — EXPECTED: RESOLVED
  Check snapshot for actual decision.

## What Session 2 Must Deliver

### WS-D2: Daemon Execution Loop (Engineer A, 4 days)

Build the core runtime loop that consumes the queue produced by D1.

Specifics:
- Poll the queue (using the format defined by D-001) on a configurable interval
- Classify incoming tickets using daemon/src/triage.ts
- Spawn execution tracks — one per ticket, isolated in git worktrees via daemon/src/git.ts
- Extend daemon/src/orchestrator.ts — do NOT rewrite from scratch
- Failure handling:
  - Configurable retry count (default 3) with exponential backoff
  - Dead-letter queue for tickets that exceed retry limit
  - Structured error logging for each failure
- Expose state model interface for D3 (snapshot) and D4 (telemetry) to hook into
- Unit tests for: poll loop, classifier routing, track spawner, failure handler,
  retry logic, dead-letter behavior

ACCEPTANCE: Daemon picks up a queued ticket (from D1's webhook) and executes
it end-to-end — classify, spawn track, run workflow, complete/fail.

### WS-D3: Context Snapshot System (Engineer B, 2 days)

Build crash recovery via state serialization.

Specifics:
- Define snapshot schema: what execution state gets persisted (active tracks,
  queue position, in-flight tickets, retry counts)
- Implement snapshot writer: serialize to disk at configurable checkpoints
- Implement snapshot loader: deserialize and reconstruct execution state
- Implement drift detector: compare loaded snapshot vs actual filesystem state
  (worktrees that exist vs snapshot's active tracks)
- Integrate with D2: execution loop calls snapshot.write() at checkpoints

COORDINATION: Engineer B defines the snapshot schema and writer on day 4
using the state model interface from Engineer A. Integration happens days 6-7
after D2 internals are stable. The state model contract MUST be agreed on
day 4 before parallel work begins.

ACCEPTANCE: Daemon survives kill-and-restart without losing in-progress work.
Drift detector identifies orphaned worktrees and stale queue entries.

### WS-D7: Integration Tests (Engineer B, ongoing)

- E2E test: mock webhook -> queue -> execution loop picks up -> track spawns -> completes
- E2E test: snapshot write -> kill process -> restart -> resume from snapshot -> verify state
- All E2E tests run in CI

## Key Files to Read First

1. .claude/memory/project-context-daemon-v1-launch.md — LATEST STATE (read first!)
2. daemon/src/orchestrator.ts — existing orchestrator that D2 extends
3. daemon/src/providers/types.ts — NormalizedTicket interface
4. daemon/src/triage.ts — ticket classifier used by D2
5. daemon/src/git.ts — worktree support for track isolation
6. daemon/src/config.ts — config system (add queue poll interval, retry config here)
7. [Whatever D1 produced] — check providers/ for new webhook files
8. [Whatever D7 produced] — check tests/integration/ for harness

## Decisions to Make This Session

- Snapshot format: JSON (human-readable, easy to debug) vs binary (compact)?
  Recommendation: JSON for v1 — debuggability over performance.
- Failure policy: retry count, backoff strategy, dead-letter location?
- Snapshot checkpoint frequency: every ticket completion? Every N seconds? Both?
- State model interface: what does D2 expose for D3 and D4 to consume?

## What NOT To Do

- Do NOT touch WS-D4 (telemetry) or WS-D5 (dashboard) — those are Session 3
- Do NOT write documentation (WS-D6) — that is Session 4
- Do NOT refactor D1 code unless it has a bug that blocks D2
- Do NOT make business decisions — escalate to CEO if needed

## Session 2 Exit Criteria (ALL must be true)

1. WS-D2 unit tests pass. Daemon executes a ticket end-to-end.
2. WS-D3 unit tests pass. Daemon survives kill/restart with state intact.
3. E2E test: webhook -> queue -> execute -> complete (green)
4. E2E test: snapshot -> kill -> restart -> resume (green)
5. State model interface documented for D4/D5 consumption
6. Project context snapshot updated for Session 3

## Spawn

- CTO: architecture decisions — execution loop state model, snapshot format,
  failure policy, state model interface for D3/D4
- Do NOT spawn CEO, CMO, CFO — this session is pure engineering
```

---

### SESSION 3 COLD-START PRIMER

```
You are The Sage resuming Session 3 of the MG Daemon v1.0 Launch initiative.

FIRST — read these files:
1. /Users/byaizaki/miniature-guacamole/.claude/agents/sage/AGENT.md
2. .claude/memory/project-context-daemon-v1-launch.md

## Initiative

MG Daemon v1.0: autonomous daemon for GitHub webhook -> queue -> execute ->
snapshot -> observe. 7 workstreams, 15 engineering days, 2 engineers.

## What Sessions 1-2 Delivered (VERIFY against snapshot)

- WS-D1 (webhook integration) — EXPECTED: COMPLETE
- WS-D2 (execution loop) — EXPECTED: COMPLETE
- WS-D3 (context snapshots) — EXPECTED: COMPLETE
- WS-D7 (integration tests) — EXPECTED: PARTIAL (harness + D1/D2/D3 E2E passing)

*** CRITICAL CHECK: If WS-D2 is not COMPLETE, Session 3 cannot proceed.
The entire observability layer instruments D2. STOP and escalate. ***

## What Session 3 Must Deliver

### WS-D4: Agent Telemetry and Cost Tracking (Engineer A, 1 day)

- Instrument D2's execution loop with token counters at track spawn and completion
- Aggregate cost per workstream and per session
- Persist telemetry data (file-based, alongside snapshots)
- Unit tests: counter increments, aggregation accuracy, persistence round-trip

### WS-D5: Daemon Health Dashboard (Engineer A, 2 days)

- Extend daemon/src/dashboard.ts and daemon/src/cli.ts
- `mg-daemon status` output:
  - Queue depth (pending tickets)
  - Active tracks (in-progress executions)
  - Recent completions (last 10, with status and duration)
  - 24h spend (from D4 telemetry data)
  - Uptime and last restart time (from D3 snapshot metadata)
- Unit tests for each dashboard metric
- DEPENDS ON D4 for spend data — D4 must complete before D5 spend metric works

### WS-D7: Observability E2E (Engineer B, ongoing)

- Telemetry assertions: run a workflow, verify token counts > 0, cost aggregates correctly
- Dashboard assertions: run `mg-daemon status`, parse output, verify all metrics present
- Regression: existing D1/D2/D3 E2E tests still pass

## Spawn

- CTO: dashboard architecture, metric selection
- CFO: cost tracking format — what granularity do clients need? Per-token? Per-request?

## Session 3 Exit Criteria

1. `mg-daemon status` shows all metrics with accurate data
2. Cost tracking aggregates correctly across workstreams
3. All E2E tests (old and new) pass
4. Snapshot updated for Session 4
```

---

### SESSION 4 COLD-START PRIMER

```
You are The Sage resuming Session 4 (FINAL) of the MG Daemon v1.0 Launch.

FIRST — read these files:
1. /Users/byaizaki/miniature-guacamole/.claude/agents/sage/AGENT.md
2. .claude/memory/project-context-daemon-v1-launch.md

## Initiative

MG Daemon v1.0. This is the final session. All features should be implemented.

## What Sessions 1-3 Delivered (VERIFY against snapshot)

- WS-D1 (webhook integration) — EXPECTED: COMPLETE
- WS-D2 (execution loop) — EXPECTED: COMPLETE
- WS-D3 (context snapshots) — EXPECTED: COMPLETE
- WS-D4 (telemetry) — EXPECTED: COMPLETE
- WS-D5 (health dashboard) — EXPECTED: COMPLETE
- WS-D7 (integration tests) — EXPECTED: PARTIAL (all feature E2E passing, needs final pass)

*** CRITICAL CHECK: If any of D1-D5 are not COMPLETE, this session cannot ship.
Assess what is incomplete, estimate effort, and determine if it fits in this
session or if a Session 4b is needed. Escalate to user with recommendation. ***

## What Session 4 Must Deliver

### WS-D6: Open-Source Documentation (Engineer B, 1 day)

- README.md: project overview, features, quick start
- docs/configuration.md: all config options with types, defaults, examples
- docs/getting-started.md: step-by-step setup from zero to first webhook processed
- docs/architecture.md: high-level architecture diagram (ASCII), component descriptions
- Review all docs against actual behavior — run through getting-started yourself

### WS-D7: Final E2E Pass (Engineer B, 0.5 day)

- Complete E2E suite: every feature has at least one E2E test
- CI integration verified: tests run on push, results reported
- Coverage report generated (informational, not gating)
- All tests green

### Release (Both Engineers, 0.5 day)

- Tag v1.0.0-daemon
- Changelog entry summarizing all 7 workstreams
- Verify daemon starts clean from a fresh clone + config
- Final smoke test: webhook -> queue -> execute -> snapshot -> status -> all green

## Spawn

- CTO: final architecture review, release sign-off
- CMO: documentation quality review, OSS positioning
- Do NOT spawn CFO — cost tracking is implemented, no decisions remain

## Session 4 Exit Criteria (RELEASE GATE)

1. All 7 workstreams COMPLETE
2. Full E2E suite passes in CI
3. Documentation reviewed for accuracy against actual behavior
4. Release tag v1.0.0-daemon created
5. Fresh-clone smoke test passes
6. Project context snapshot marked COMPLETE
```
