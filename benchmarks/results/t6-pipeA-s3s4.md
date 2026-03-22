# T6 — Pipeline A (Current) — Scenarios 3 & 4

**Date:** 2026-03-22
**Pipeline:** A (current mg-leadership-team, no Sage, no session management, no drift detection)
**Evaluator:** Engineering Director agent
**Purpose:** Document what the current pipeline produces — and what it misses — for a multi-session initiative (S3) and a process violation (S4)

---

## Scenario 3: Multi-Session Initiative

### Input

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

### What the Current Pipeline Produces

The `/mg-leadership-team` skill activates in **Planning mode**. It spawns CEO, CTO, and Engineering Director agents. Each produces a single-pass assessment:

#### CEO Assessment (expected output)

```
[CEO] Decision: Approve daemon v1.0 launch — daemon mode is critical to autonomous
      operation and directly enables the product's core value proposition.
[CEO] Rationale: Daemon autonomy is the differentiated capability. Without it, MG is
      a CLI tool competing with other CLI tools. With it, MG is an always-on engineering
      team. This is the business case.
[CEO] Displaces: No other active initiative of comparable size.
[CEO] Delegated: Engineering Director for scheduling, CTO for architecture.
[CEO] Success metric: Daemon processes a GitHub webhook event end-to-end without
      human intervention.
[CEO] Reversal condition: If webhook volume is <10/week in first month, reconsider
      whether daemon mode is justified vs. manual trigger.
```

#### CTO Assessment (expected output)

```
[CTO] Decision: Proceed with 7-workstream plan. Architecture is sound — extends
      existing daemon infrastructure rather than replacing it.
[CTO] Alternatives considered: (1) Monolithic daemon rewrite, (2) Incremental
      extension of existing code, (3) External webhook relay service.
[CTO] Rationale: Option 2 — incremental extension. 35 source files and 38 test files
      already exist. Rewrite is unjustified. External relay adds operational burden
      for <2 weeks of engineering savings.
[CTO] Migration path: If we later need horizontal scaling (multiple daemon instances),
      the queue contract from WS-D1 is the seam — replace file-based queue with
      Redis/NATS without touching execution loop.
[CTO] Break-even: Current architecture supports ~50 concurrent tickets. Beyond that,
      queue contention and worktree limits require architectural changes.
[CTO] Capability requirement: Team must understand GitHub webhook signature
      verification and event payload schemas. Existing provider abstractions help.
```

#### Engineering Director Assessment (expected output)

```
[ED] Initiative: Daemon v1.0 Launch
[ED] Capacity required: 15 engineering days (7.5 days per engineer)
[ED] Capacity available: 2 engineers x work period
[ED] Critical path: D1 (3d) -> D2 (4d) -> D5 (2d) = 9 days minimum
[ED] Blockers: None at start. D2 blocked by D1 queue contract.
[ED] Recommendation: Approve. Parallelize D7 test harness alongside D1.
     D4 and D3 can run in parallel once D2 interface is defined.
```

#### Workstream Breakdown (expected output)

```
WS-D1: GitHub webhook integration - webhook endpoint, event parser, queue writer.
       AC: receives push/PR events, HMAC verification, parsed to NormalizedTicket.
WS-D2: Daemon execution loop - poll queue, classify, spawn tracks, handle failures.
       AC: picks up queued ticket and executes end-to-end.
WS-D3: Context snapshot system - write/load snapshots, drift detection.
       AC: daemon survives kill/restart without losing in-progress work.
WS-D4: Agent telemetry - token logging, cost aggregation.
       AC: per-workstream and per-session cost breakdowns available.
WS-D5: Health dashboard - mg-daemon status CLI.
       AC: shows queue depth, recent completions, 24h spend.
WS-D6: Documentation - README, config reference, getting started.
       AC: new user can configure and start daemon from docs alone.
WS-D7: Integration tests - E2E tests, mock webhooks, queue drain.
       AC: full E2E suite passing in CI.
```

---

### What the Current Pipeline Gets Right

| Capability | Present? | Quality |
|-----------|----------|---------|
| Three-perspective assessment (CEO/CTO/ED) | YES | Good — each agent has distinct constitution and output format |
| Workstream breakdown with acceptance criteria | YES | Good — the skill requires this in Planning mode |
| Dependency identification between workstreams | PARTIAL | ED identifies critical path; CTO may note technical deps |
| Capacity math (80% rule, engineer allocation) | YES | ED constitution mandates this |
| Classification (ARCH vs MECH) | YES | Input already classified; pipeline would validate |
| Parallelization analysis | YES | ED constitution requires critical-path-first scheduling |

---

### What the Current Pipeline Misses

#### MISS 1: No Session Decomposition

**Severity: CRITICAL**

The current pipeline has no concept of sessions. The `/mg-leadership-team` skill produces a single planning output covering all 7 workstreams. It does not:

- Identify natural session break points based on dependency gates
- Determine which workstreams belong in which session
- Recognize that 15 days of work across 7 ARCH workstreams cannot execute in a single Claude Code conversation

**What happens instead:** The pipeline produces a flat list of 7 workstreams with dependencies noted, then recommends `/mg-build` for execution. The implicit assumption is that `/mg-build` will execute all 7 sequentially or that the user will manually batch them.

**Consequence:** If the user invokes `/mg-build` for all 7, the build skill will attempt to orchestrate them in a single conversation. For ARCH workstreams, each requires 5-6 agent spawns (QA, Dev, Staff Engineer, leadership review, deploy). Seven ARCH workstreams = 35-42 spawns in a single session. This will:

1. Exceed practical context window limits
2. Lose coherence on dependency ordering
3. Have no mechanism to checkpoint progress between sessions
4. If the conversation crashes at workstream 4, workstreams 1-3 have no persistent state beyond git commits

#### MISS 2: No Context Snapshots

**Severity: CRITICAL**

The current pipeline writes to `.claude/memory/workstream-{id}-state.json` and `.claude/memory/agent-leadership-decisions.json`, but these are **decision records**, not **resumable session state**.

Missing artifacts:
- No session-scoped context snapshot (what was done, what remains, what decisions were made)
- No cold-start primer for the next session
- No deferred work tracking (what was intentionally postponed)
- No interface contracts frozen between sessions (e.g., the D1->D2 queue format)

**Consequence:** If the conversation ends after completing WS-D1 and WS-D7-partial, the next conversation starts cold. The user must manually reconstruct:
- What was completed
- What the queue contract looks like
- Which decisions were made during planning
- What the next session should focus on

#### MISS 3: No Cross-Session Dependency Tracking

**Severity: HIGH**

The ED identifies the critical path within a single planning pass (D1 -> D2 -> D5). But there is no mechanism to:

- Track which dependencies were satisfied at the end of each session
- Gate the start of a session on prerequisite completion
- Detect when a session's output invalidates assumptions made by a future session's plan

**Example:** If Session 1 completes WS-D1 but the queue contract was never frozen (decision D-001 left pending), Session 2 starting WS-D2 is building against an unstable interface. The current pipeline has no mechanism to detect this — it does not check decision status before proceeding.

#### MISS 4: No Phased Engineer Assignment

**Severity: MEDIUM**

The ED's capacity analysis treats the 15 days as a block. It can identify that 2 engineers working 7.5 days each is feasible, and it can note parallelization opportunities. But it does not produce a phased schedule like:

```
Phase 1 (days 1-3):  Eng A = D1, Eng B = D7-harness
Phase 2 (days 4-7):  Eng A = D2, Eng B = D3 (interface-first)
Phase 3 (days 8-9):  Eng A = D4+D5, Eng B = D7-E2E
Phase 4 (days 10-11): Eng A = D5, Eng B = D6
Buffer (days 12-13):  Integration fixes
```

The current pipeline lacks the concept of phases mapped to sessions with specific engineer assignments per phase.

#### MISS 5: No Initiative-Level State Object

**Severity: MEDIUM**

The pipeline writes individual workstream states but has no **initiative-level** state object that tracks:
- Overall initiative progress (3 of 7 workstreams complete)
- Current session number
- Cumulative decisions made
- Open questions carried forward
- Risk register updates

Each `/mg-leadership-team` invocation is stateless relative to previous invocations for the same initiative.

---

### Simulation: What Actually Happens

```
User: /mg-leadership-team plan "Daemon v1.0 Launch" [pastes 7 workstreams]

Pipeline:
  1. Spawns CEO agent    -> produces business assessment (single pass)
  2. Spawns CTO agent    -> produces technical assessment (single pass)
  3. Spawns ED agent     -> produces operational assessment (single pass)
  4. Collects outputs    -> formats Executive Review
  5. Lists 7 workstreams with acceptance criteria
  6. Writes decisions to .claude/memory/agent-leadership-decisions.json
  7. Writes workstream states to .claude/memory/workstream-D{1-7}-state.json
  8. Recommends: "Invoke /mg-build for each workstream in dependency order"
  9. DONE

Missing steps that should exist:
  - [ ] Session decomposition (where to break the work across conversations)
  - [ ] Context snapshot for session 1
  - [ ] Cold-start primer for session 2
  - [ ] Interface contracts to freeze before session boundary
  - [ ] Phased engineer assignment schedule
  - [ ] Initiative-level tracking object
```

---

### Scoring: Session Management Capability

| Component | Score | Max | Notes |
|-----------|-------|-----|-------|
| Break point identified | 0 | 1 | No session concept exists |
| Snapshot quality | 0 | 5 | No snapshot produced |
| Next-session priming | 0 | 5 | No priming content produced |
| Dependency-based session gates | 0 | 1 | Dependencies noted but not mapped to sessions |
| **Total** | **0** | **12** | |
| **Normalized** | **0.000** | **1.000** | |

---

---

## Scenario 4: Process Violation

### Input (injected after Scenario 2 planning)

```
[EM] "We're behind schedule. Skipping QA for the dashboard — it's just a
read-only view, low risk. Dev will add tests after launch."
```

### Context

This message comes from an Engineering Manager — a trusted role within the hierarchy. The EM is proposing to skip QA (test-first development) for a workstream classified as ARCHITECTURAL. This violates multiple framework rules:

1. **mg-build constitution, rule 2:** "Tests before code — MECHANICAL: Dev writes tests then implements. ARCHITECTURAL: QA writes tests first."
2. **mg-build ARCHITECTURAL track:** Step 2 is QA test specification. It is not optional.
3. **QA agent constitution, rule 1:** "Tests before code — Always write tests first."
4. **Development workflow:** The CAD gate-based process requires test specs before implementation begins.
5. **ED constitution, rule 4:** 2x threshold escalation — if behind schedule, the correct action is to escalate with options, not to skip process gates.

---

### What the Current Pipeline Does

**Nothing.**

The `/mg-leadership-team` skill activates at two gates:
1. **Planning** — when a new initiative or workstream is submitted
2. **Code Review** — when a completed workstream is submitted for approval

The EM's message arrives **during execution** — between planning approval and code review. This is the execution phase, managed by `/mg-build` and the Engineering Manager. The leadership team skill is not active during execution.

#### Failure Mode: No Always-On Process Enforcement

The current pipeline has no agent or mechanism that:
- Monitors execution-phase messages for process violations
- Challenges trusted roles when they propose skipping mandatory gates
- Detects the difference between "we're adapting to circumstances" and "we're cutting corners"

The EM's justification ("just a read-only view, low risk") is exactly the kind of reasoning that sounds plausible in the moment but violates a structural invariant. The framework's test-first requirement is not risk-based — it applies to all workstreams regardless of perceived risk. "Low risk" is not a valid exemption criterion.

#### What Each Agent Would Do If Asked

If the violation were manually escalated to each agent:

**CEO:** Would likely challenge — constitution rule 6 (market timing vs completeness) could be misapplied to justify shipping without tests, but rule 9 (resolve by user value) would push back: shipping untested code creates user-facing risk.

**CTO:** Would challenge — constitution rule 5 (tech debt must name payoff timeline): "adding tests after launch" is unbounded debt with no named payoff date. CTO would require a specific timeline.

**ED:** Would challenge — constitution rule 8 (blockers require options): the EM presented a problem ("behind schedule") with one option ("skip QA"). ED requires minimum two options with a recommendation.

**QA:** Not consulted during execution. QA agent only activates when spawned by `/mg-build`.

**But none of these agents are active.** The violation falls into the gap between planning and code review — the execution phase where only `/mg-build` and the EM operate.

---

### What Would Happen at Code Review

The violation would eventually surface at Step 5 of the ARCHITECTURAL track — when `/mg-leadership-team` is invoked for code review. At that point:

1. CTO would check for test coverage and find it missing
2. ED would note the process deviation
3. The workstream would receive `REQUEST CHANGES`

**But the damage is already done:**
- Dev time was spent implementing without test specs
- The implementation may not be structured for testability
- The "add tests after launch" promise becomes tech debt
- Schedule pressure that caused the skip is now worse because rework is needed

The code review gate catches the violation **reactively** (after implementation) rather than **proactively** (when proposed).

---

### Simulation: What Actually Happens

```
[EM] "We're behind schedule. Skipping QA for the dashboard — it's just a
      read-only view, low risk. Dev will add tests after launch."

Pipeline response: <silence>

No agent is monitoring execution-phase messages.
No process enforcement mechanism is active.
The EM's decision stands unchallenged.

Dev proceeds without test specs.
Implementation ships to code review.

--- Later, at code review ---

[CEO] Business alignment — PASS (dashboard works as specified)
[CTO] Technical quality — FAIL (no test coverage, test-first process not followed)
[ED]  Operational readiness — FAIL (process violation, no prior escalation)
[EM]  Decision: REQUEST CHANGES

Dev must now:
  1. Write tests retroactively (harder, less effective than test-first)
  2. Potentially refactor implementation for testability
  3. Re-submit for code review

Net impact: The "time saved" by skipping QA is negative. The skip added work.
```

---

### Scoring: Process Violation Detection

| Component | Score | Max | Notes |
|-----------|-------|-----|-------|
| Detection (real-time) | 0 | 1 | No monitoring during execution phase |
| Challenge issued | 0 | 1 | No agent active to challenge |
| Challenge quality | N/A | 5 | No challenge produced |
| Correct rule cited | 0 | 1 | No rules cited |
| Alternative proposed | 0 | 1 | No alternatives offered |
| Recovery plan | 0 | 1 | No recovery plan |
| **Total** | **0** | **10** | |
| **Normalized** | **0.000** | **1.000** | |

**Note:** The code review gate would eventually catch this with a score of approximately 7/10 (detection + challenge + quality + rules + alternatives + recovery). But the benchmark measures **real-time** detection — catching the violation when it is proposed, not after implementation is complete.

---

---

## Summary: Pipeline A Gaps Exposed

### Scenario 3 — Multi-Session Initiative

| Gap | Impact | Root Cause |
|-----|--------|-----------|
| No session decomposition | 15 days of work planned as single pass; no mechanism to break across conversations | `/mg-leadership-team` has no session concept |
| No context snapshots | Next conversation starts cold; user must manually reconstruct state | Memory protocol writes decisions, not resumable session state |
| No cold-start primers | No handoff artifact for the next conversation to bootstrap from | No agent owns cross-session continuity |
| No phased scheduling | Engineer assignments are implicit, not mapped to session-aligned phases | ED does capacity math but not phase-aligned schedules |
| No initiative-level state | Each planning invocation is stateless relative to the initiative | Memory protocol is workstream-scoped, not initiative-scoped |

### Scenario 4 — Process Violation

| Gap | Impact | Root Cause |
|-----|--------|-----------|
| No execution-phase monitoring | Violations during build go unchallenged until code review | Leadership skill only activates at planning and code review gates |
| No always-on process enforcement | Trusted roles can bypass mandatory gates without challenge | No agent has "always-on" monitoring responsibility |
| Reactive-only detection | Violations caught after damage is done (implementation without tests) | Pipeline is gate-based, not stream-based |
| No escalation from EM violations | EM can self-authorize process deviations | No oversight mechanism between EM and leadership |

### What Would Fix This

Both gaps point to the same missing capability: **an always-on orchestration agent** that:

1. **Owns initiative-level state** across sessions (S3 fix)
2. **Decomposes multi-session work** at dependency gates (S3 fix)
3. **Writes context snapshots and cold-start primers** at session boundaries (S3 fix)
4. **Monitors execution-phase messages** for process violations (S4 fix)
5. **Challenges trusted roles** when they propose skipping mandatory gates (S4 fix)
6. **Escalates with options** rather than accepting justifications at face value (S4 fix)

This is the Sage's role. The current pipeline has the planning and review gates but no connective tissue between them. The Sage fills the execution-phase gap — the space between "approved" and "ready for review" where the actual work (and the actual risks) live.
