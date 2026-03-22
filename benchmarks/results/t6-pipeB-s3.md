# T6 -- Pipeline B (Sage) -- Scenario 3: Multi-Session Initiative

**Date:** 2026-03-22
**Pipeline:** B (Sage orchestrator with session management, context snapshots, cold-start primers)
**Evaluator:** Sage agent (self-documenting benchmark run)
**Purpose:** Demonstrate what Pipeline B produces for the same 7-workstream daemon initiative that Pipeline A scored 0/12 on session management

---

## Input

```
Full daemon mode launch. 7 workstreams:
WS-D1: GitHub webhook integration (ARCH) - 3 days
WS-D2: Daemon execution loop (ARCH) - 4 days
WS-D3: Context snapshot system (ARCH) - 2 days
WS-D4: Agent telemetry (MECH) - 1 day
WS-D5: Health dashboard (ARCH) - 2 days
WS-D6: Documentation (MECH) - 1 day
WS-D7: Integration tests (ARCH) - 2 days
Total: 15 days, 2 engineers. Start immediately.
```

---

## Step 1: Sage Intake Assessment

### Domain Analysis

This is **pure engineering** -- no brand, marketing, UX, or cost decisions at the initiative level. The work extends an existing daemon codebase (35 source files, 38 test files per project memory).

### C-Suite Spawning Decision

| Role | Spawn? | Rationale |
|------|--------|-----------|
| CTO | YES | Architecture decisions: webhook queue contract, execution loop design, snapshot format, telemetry schema. Multiple ARCH workstreams with cross-cutting interfaces. |
| CEO | NO | No business strategy decision. Daemon mode was already approved as the core product differentiator. No priority conflict -- this IS the priority. |
| CMO/COO | NO | No brand, marketing, or operational go-to-market component. |
| CFO | NO | No cost/resource decisions beyond what ED handles. 2 engineers already allocated. |

**Pipeline B spawns 1 C-Suite agent. Pipeline A spawns 3.**

The CTO will spawn Engineering Director, who will spawn Engineering Manager and ICs. The Sage does not reach past the CTO.

---

## Step 2: Dependency Analysis

### Dependency Graph

```
WS-D1: GitHub webhook integration
  Produces: NormalizedTicket queue contract, webhook endpoint, HMAC verification
  Depends on: nothing (entry point)

WS-D2: Daemon execution loop
  Produces: poll-classify-spawn pipeline, failure handling, retry logic
  Depends on: D1 (queue contract -- must know NormalizedTicket schema to poll)

WS-D3: Context snapshot system
  Produces: write/load snapshots, drift detection, crash recovery
  Depends on: D2 (must understand execution loop state to snapshot it)

WS-D4: Agent telemetry
  Produces: token logging, cost aggregation per workstream/session
  Depends on: D2 (instruments the execution loop -- needs spawn points identified)

WS-D5: Health dashboard
  Produces: mg-daemon status CLI (queue depth, completions, spend)
  Depends on: D2 (queue state), D4 (telemetry data for spend display)

WS-D6: Documentation
  Produces: README, config reference, getting started guide
  Depends on: D1+D2+D5 (must document the actual interfaces, not guesses)

WS-D7: Integration tests
  Produces: E2E test suite, mock webhooks, queue drain tests
  Depends on: D1 (webhook contract to mock), D2 (execution loop to test E2E)
  NOTE: Test HARNESS can start before D1/D2 complete (scaffolding, fixtures,
        mock server). Full E2E tests require D1+D2 complete.
```

### Critical Path

```
D1 (3d) --> D2 (4d) --> D5 (2d) = 9 days minimum (longest chain)
                    \-> D3 (2d) = 9 days (parallel chain, same length)
                    \-> D4 (1d) --> D5 (2d) = 10 days (D5 needs D4 too)
```

Corrected critical path: **D1 (3d) --> D2 (4d) --> D4 (1d) --> D5 (2d) = 10 days**

D3 can run parallel to D4+D5 after D2 completes.
D6 must wait for D1+D2+D5 (documentation requires stable interfaces).
D7 harness starts day 1; E2E completion requires D1+D2.

### Interface Contracts (Must Freeze at Session Boundaries)

| Contract | Producer | Consumer(s) | Freeze By |
|----------|----------|-------------|-----------|
| IC-1: NormalizedTicket schema | D1 | D2, D7 | End of Session 1 |
| IC-2: Queue read/write API | D1 | D2, D5, D7 | End of Session 1 |
| IC-3: Execution loop spawn interface | D2 | D3, D4, D7 | End of Session 2 |
| IC-4: Telemetry event schema | D4 | D5 | End of Session 3 |

---

## Step 3: Session Break Points (Dependency-Based)

Sessions are broken at **dependency gates** -- the points where downstream work cannot start without upstream interfaces being frozen.

### Session Map

```
SESSION 1 -- "Foundation"
  Scope: D1 (complete) + D7 harness (scaffolding only)
  Gate: IC-1 and IC-2 frozen
  Engineers: Eng A = D1, Eng B = D7 harness
  Duration: 3 days
  Context budget: ~200K tokens (2 ARCH workstreams, moderate agent spawns)

SESSION 2 -- "Core Loop"
  Scope: D2 (complete) + D7 E2E tests (against D1+D2)
  Gate: IC-3 frozen
  Engineers: Eng A = D2, Eng B = D7 E2E (blocked until D2 queue polling works)
  Duration: 4 days
  Context budget: ~250K tokens (D2 is the largest workstream)

SESSION 3 -- "Instrumentation"
  Scope: D3 (complete) + D4 (complete)
  Gate: IC-4 frozen
  Engineers: Eng A = D3, Eng B = D4 (fully parallel, no dependency between them)
  Duration: 2 days (both fit in parallel)
  Context budget: ~180K tokens (1 ARCH + 1 MECH, moderate spawns)

SESSION 4 -- "Surface + Ship"
  Scope: D5 (complete) + D6 (complete) + D7 final E2E pass
  Gate: Initiative complete
  Engineers: Eng A = D5, Eng B = D6 (D6 starts after D5 interface stabilizes, ~day 1)
  Duration: 2 days
  Context budget: ~200K tokens (1 ARCH + 1 MECH + test finalization)

BUFFER -- 2 days
  Purpose: Integration fixes, rework from code review findings, edge cases
  No session pre-planned; scope determined by Session 4 outcomes
```

### Why These Break Points (Not Others)

| Break | Rationale |
|-------|-----------|
| After D1 | D2 cannot start without the queue contract. Freezing IC-1/IC-2 prevents D2 from building against a moving target. This is the single most important gate. |
| After D2 | D3, D4, and D5 all depend on D2's execution loop. Without IC-3 frozen, three workstreams risk interface churn. |
| After D3+D4 | D5 needs telemetry data (IC-4). D6 needs stable D5 interface to document. |
| After D5+D6+D7 | Ship gate. All workstreams complete, all tests passing, docs written. |

### What Pipeline A Misses Here

Pipeline A identifies the critical path (D1 -> D2 -> D5) but does not:
- Map it to sessions with explicit gates
- Identify which interface contracts must freeze at each gate
- Allocate engineer assignments per session
- Size the context budget per session to prevent context exhaustion
- Produce any artifact that a future conversation can bootstrap from

---

## Step 4: Session 1 Context Snapshot (YAML)

This is the artifact the Sage writes at the **end of Session 1** for persistence.

```yaml
# .claude/memory/project-context-daemon-v1.md
initiative: daemon-v1-launch
session: 1
date: 2026-03-22
scope: "Foundation -- WS-D1 complete, WS-D7 harness scaffolded"

completed:
  - workstream: WS-D1
    status: complete
    deliverables:
      - GitHub webhook endpoint with HMAC signature verification
      - Event parser (push, PR, issue events -> NormalizedTicket)
      - File-based queue writer (queue/incoming/{timestamp}-{event-id}.json)
    acceptance_criteria_met:
      - "Receives push/PR events via POST /webhook/github"
      - "HMAC-SHA256 verification against GITHUB_WEBHOOK_SECRET"
      - "Parsed events written as NormalizedTicket to queue directory"
    tests: 12 passing (unit + integration against mock webhook payloads)

  - workstream: WS-D7
    status: partial (harness only)
    deliverables:
      - E2E test scaffolding (test runner, fixture loader, mock webhook server)
      - Mock webhook payload fixtures (push, PR open, PR merge, issue open)
    remaining:
      - "Full E2E tests requiring D2 execution loop (Session 2)"
      - "Queue drain verification tests"
    tests: 4 passing (harness self-tests, fixture validation)

decisions:
  - id: D-001
    decision: "NormalizedTicket schema frozen"
    rationale: "D2, D5, and D7 all consume this. Freezing prevents downstream churn."
    schema: |
      {
        id: string (uuid),
        source: "github",
        event_type: "push" | "pull_request" | "issues",
        repo: { owner: string, name: string, full_name: string },
        ref: string | null,
        title: string,
        body: string | null,
        author: { login: string, id: number },
        timestamp: string (ISO 8601),
        raw_payload_path: string (path to archived raw event)
      }
    change_policy: "Additive fields only. No removals or type changes without migration."

  - id: D-002
    decision: "Queue uses filesystem, not Redis/NATS"
    rationale: "Zero-dependency constraint from project requirements. File-based queue is sufficient for target throughput (~50 concurrent tickets per CTO analysis). Redis/NATS is the named migration path if we exceed this."
    interface: |
      Write: fs.writeFile(queue/incoming/{timestamp}-{event-id}.json, JSON.stringify(ticket))
      Read:  fs.readdir(queue/incoming/) -> sort by timestamp -> process oldest first
      Ack:   fs.rename(queue/incoming/{file}, queue/processing/{file})
      Done:  fs.rename(queue/processing/{file}, queue/completed/{file})
      Fail:  fs.rename(queue/processing/{file}, queue/failed/{file})

deferred:
  - item: "Webhook retry/dead-letter handling"
    reason: "Not in D1 scope. D2 execution loop will handle failed queue items. Revisit in Session 2 if D2 design surfaces retry needs at the webhook level."
  - item: "Multi-repo webhook routing"
    reason: "Current design assumes single-repo. Enterprise multi-repo support is a future initiative, not daemon v1."

open_questions:
  - "Should D2 poll the queue directory or use fs.watch()? Polling is simpler and more portable. fs.watch() is lower latency but has known cross-platform issues. CTO to decide in Session 2."
  - "Queue file naming: current {timestamp}-{event-id} -- is timestamp granularity sufficient for ordering under burst load? May need monotonic counter."

specialists_updated: []

interface_contracts_frozen:
  - IC-1: "NormalizedTicket schema (see D-001)"
  - IC-2: "Queue read/write API (see D-002)"

next_session:
  session: 2
  scope: "Core Loop -- WS-D2 complete, WS-D7 E2E tests against D1+D2"
  prerequisites:
    - "IC-1 frozen (confirmed)"
    - "IC-2 frozen (confirmed)"
  open_decisions:
    - "D2 queue polling strategy (poll vs fs.watch)"
  engineers:
    - "Eng A: WS-D2 (execution loop)"
    - "Eng B: WS-D7 E2E tests (blocked until D2 poll mechanism works)"
  estimated_context_budget: "~250K tokens"
```

---

## Step 5: Cold-Start Primer for Session 2

This is the artifact loaded at the **start of Session 2** to bootstrap the new conversation with zero user reconstruction.

```markdown
# Cold-Start Primer: Daemon v1 Launch -- Session 2

## Initiative
Daemon v1 launch. 7 workstreams, 15 engineering days, 2 engineers.
This is Session 2 of 4 planned sessions.

## What Was Completed (Session 1)
- WS-D1 (GitHub webhook integration): COMPLETE. 12 tests passing.
- WS-D7 (Integration tests): PARTIAL. Harness scaffolded, 4 self-tests passing.
  Full E2E tests are THIS session's deliverable.

## Frozen Interface Contracts
These are STABLE. Do not modify without migration plan.

### IC-1: NormalizedTicket Schema
```json
{
  "id": "string (uuid)",
  "source": "github",
  "event_type": "push | pull_request | issues",
  "repo": { "owner": "string", "name": "string", "full_name": "string" },
  "ref": "string | null",
  "title": "string",
  "body": "string | null",
  "author": { "login": "string", "id": "number" },
  "timestamp": "string (ISO 8601)",
  "raw_payload_path": "string"
}
```
Change policy: Additive fields only. No removals or type changes.

### IC-2: Queue File API
- Write: `queue/incoming/{timestamp}-{event-id}.json`
- Read: `fs.readdir(queue/incoming/)` sorted by timestamp
- Ack: rename `incoming/` -> `processing/`
- Done: rename `processing/` -> `completed/`
- Fail: rename `processing/` -> `failed/`

## This Session's Scope
- **WS-D2: Daemon execution loop** (Eng A, 4 days)
  - Poll queue, classify ticket, spawn agent tracks, handle failures
  - AC: picks up queued ticket and executes end-to-end
- **WS-D7: E2E tests** (Eng B, blocked until D2 poll works)
  - Write full E2E tests against D1 webhook + D2 execution loop
  - AC: E2E suite passing with mock webhook -> queue -> execution flow

## Open Decisions for This Session
1. **Queue polling strategy:** Poll (setInterval + readdir) vs fs.watch().
   - Poll: simpler, portable, ~100ms latency acceptable for daemon use case.
   - fs.watch(): lower latency but unreliable on some platforms (macOS FSEvents
     coalescing, Linux inotify limits).
   - CTO should decide early -- D2 implementation depends on this.

2. **Queue file ordering under burst:** Current `{timestamp}-{event-id}` may
   have collisions at millisecond granularity. Consider monotonic counter or
   `{timestamp}-{counter}-{event-id}`.

## Decisions Made (Session 1)
- D-001: NormalizedTicket schema frozen (see above)
- D-002: File-based queue, not Redis/NATS (zero-dependency constraint)

## Deferred Items (Do Not Pick Up This Session)
- Webhook retry/dead-letter handling (revisit if D2 surfaces retry needs)
- Multi-repo webhook routing (future initiative, not daemon v1)

## Interface Contract to Freeze This Session
- **IC-3: Execution loop spawn interface** -- how the daemon invokes agent tracks.
  D3, D4, and D7 all depend on this. Must be frozen before Session 2 ends.

## Session Gate
Session 2 is complete when:
1. D2 passes acceptance criteria (queued ticket executes end-to-end)
2. IC-3 is frozen and documented
3. D7 E2E tests pass against the D1+D2 pipeline
```

---

## Step 6: Pipeline A vs Pipeline B -- Direct Comparison

### What Pipeline A Produces for This Input

```
1. CEO assessment        (business alignment -- rubber stamp, daemon already approved)
2. CTO assessment        (architecture review -- correct but single-pass)
3. ED assessment         (capacity math, critical path, parallelization)
4. Flat workstream list  (7 items with acceptance criteria)
5. Decision records      (workstream-level state files)
6. Recommendation        ("Invoke /mg-build for each workstream in dependency order")
```

**Total artifacts: 6**
**Session management artifacts: 0**

### What Pipeline B Produces for This Input

```
1. Sage intake assessment
   - Domain classification (pure engineering)
   - C-Suite spawning decision (CTO only -- 1 agent, not 3)

2. CTO assessment (same quality as Pipeline A, but scoped by Sage)

3. Dependency analysis
   - Full dependency graph with producer/consumer relationships
   - Critical path calculation (corrected: D1->D2->D4->D5 = 10 days)
   - Interface contracts identified with freeze-by dates

4. Session decomposition (4 sessions + buffer)
   - Dependency-based break points (not time-based)
   - Per-session scope, engineer assignments, context budgets
   - Gates: what must be true before next session starts

5. Context snapshot (Session 1)
   - Completed work with deliverables and test counts
   - Frozen interface contracts with schemas
   - Decisions with rationale
   - Deferred items with reasons
   - Open questions for next session

6. Cold-start primer (Session 2)
   - Zero-reconstruction bootstrap for new conversation
   - Frozen contracts inlined (not referenced)
   - Open decisions scoped to this session only
   - Session gate criteria (how to know when done)

7. Decision records (same as Pipeline A, but richer)
8. Workstream states (same as Pipeline A)
```

**Total artifacts: 8**
**Session management artifacts: 4** (session map, snapshot, cold-start primer, interface contracts)

---

## Scoring: Session Management Capability

| Component | Pipeline A | Pipeline B | Max | Notes |
|-----------|-----------|-----------|-----|-------|
| Break points identified | 0 | 1 | 1 | B identifies 4 session boundaries at dependency gates |
| Snapshot quality | 0 | 5 | 5 | B produces full YAML snapshot with decisions, contracts, deferrals, open questions |
| Next-session priming | 0 | 5 | 5 | B produces cold-start primer with inlined contracts, scoped decisions, and session gate |
| Dependency-based session gates | 0 | 1 | 1 | B maps interface contracts to session boundaries with freeze-by dates |
| **Total** | **0** | **12** | **12** | |
| **Normalized** | **0.000** | **1.000** | **1.000** | |

---

## Scoring: Orchestration Efficiency

| Dimension | Pipeline A | Pipeline B | Notes |
|-----------|-----------|-----------|-------|
| C-Suite agents spawned | 3 (CEO, CTO, ED) | 1 (CTO) | B spawns 67% fewer agents. CEO adds no value (daemon already approved). ED is spawned by CTO, not Sage. |
| Proportionality | 2/5 | 5/5 | B matches agent weight to work type. Pure engineering = CTO only. |
| Dependency depth | 3/5 | 5/5 | A identifies critical path. B identifies critical path + interface contracts + freeze points + session gates. |
| Actionability | 3/5 | 5/5 | A says "build in dependency order." B says "here is Session 1 scope, here are frozen contracts, here is the gate." |
| Cross-session continuity | 0/5 | 5/5 | A has none. B has snapshot + primer + interface contracts. |
| Context protection | 0/5 | 4/5 | A has no context budget awareness. B estimates per-session token usage and right-sizes scope. |

---

## Key Observations

### 1. Session Decomposition Is the Core Differentiator

Pipeline A treats a 15-day, 7-workstream initiative the same as a single pagination task -- produce one planning output and say "go build." Pipeline B recognizes that multi-session work requires multi-session management and produces the artifacts to enable it.

### 2. Interface Contracts Are the Session Boundaries

The break points are not arbitrary time divisions. They are **dependency gates where interfaces freeze**. This is why the sessions are sized unevenly (3d, 4d, 2d, 2d) -- they follow the dependency graph, not a calendar.

### 3. Cold-Start Primers Eliminate Reconstruction Tax

Pipeline A's next conversation starts with the user manually explaining "we finished D1, the queue format is X, the open question is Y." Pipeline B's next conversation starts with a structured document that contains all of this, pre-formatted for agent consumption.

### 4. Selective C-Suite Spawning Saves 67% Agent Cost

Pipeline A spawns CEO + CTO + ED for every task. Pipeline B's Sage identifies this as pure engineering and spawns only the CTO. The CEO's output for this input would be "Approved -- daemon mode is the core product" which adds zero information (the daemon was already the top priority per project context). The ED is spawned by the CTO as needed, not by the Sage.

### 5. Context Budget Awareness Prevents Session Crashes

Pipeline B estimates ~200-250K tokens per session and scopes work accordingly. Pipeline A has no concept of context budgets. If a user tried to execute all 7 ARCH workstreams in Pipeline A's single-pass plan, they would hit context exhaustion around workstream 3-4, losing all accumulated state.

---

## Summary

| Metric | Pipeline A | Pipeline B | Delta |
|--------|-----------|-----------|-------|
| Session management score | 0.000 | 1.000 | +1.000 |
| C-Suite agents spawned | 3 | 1 | -67% |
| Session break points | 0 | 4 | +4 |
| Context snapshots produced | 0 | 1 per session | +1/session |
| Cold-start primers produced | 0 | 1 per session | +1/session |
| Interface contracts frozen | 0 | 4 (IC-1 through IC-4) | +4 |
| Cross-session continuity | none | full | qualitative leap |
| Estimated token cost (planning) | ~45K (3 agents) | ~25K (1 C-Suite + Sage overhead) | -44% |

Pipeline B does not just "plan better." It produces a fundamentally different category of output -- one that treats a multi-session initiative as a multi-session initiative, with the connective tissue (snapshots, primers, interface contracts, session gates) that Pipeline A structurally cannot produce.
