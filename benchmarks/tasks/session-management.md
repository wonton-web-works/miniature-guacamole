# Task 5: Session Management

**ID:** T5-SESSION-MGMT
**Version:** 1.0
**Tests:** Sage agent — session scoping, context protection, break point identification, snapshot quality
**Protocol Reference:** Sage AGENT.md § "Session Management", § "Context Protection"

---

## Purpose

The Sage's session management protocol protects against context bloat. With 1M context, the Sage is not in danger of running out of tokens — but it is in danger of accumulating so much context that quality degrades through compression artifacts and signal dilution. The Sage's job is to right-size sessions: identify break points before they become problems, write clean context snapshots, and prime the next session with what it needs.

This task presents a large, multi-workstream initiative and measures whether the Sage proactively identifies a session break point — rather than attempting to execute everything in a single session — and whether the snapshot it produces is sufficient to resume without information loss.

---

## Input Prompt

```
[User to Sage]
We're launching the daemon mode for miniature-guacamole. Here's the full scope:

Initiative: MG Daemon v1.0 Launch

Workstreams (already classified and approved by leadership):

WS-D1: GitHub webhook integration (ARCHITECTURAL)
- Receive push/PR events
- Parse event payload to workstream ticket format
- Route to mg-daemon queue
- Estimated: 3 days

WS-D2: Daemon execution loop (ARCHITECTURAL)
- Poll queue for pending tickets
- Classify each ticket (MECHANICAL/ARCHITECTURAL)
- Spawn appropriate track
- Handle failures and retries
- Estimated: 4 days

WS-D3: Context snapshot system (ARCHITECTURAL)
- Write project context snapshots on session end
- Load and validate snapshots on session start
- Detect drift between snapshot state and current file state
- Estimated: 2 days

WS-D4: Agent telemetry and cost tracking (MECHANICAL)
- Log token usage per agent spawn
- Aggregate by workstream and session
- Write to cost-tracking.json
- Estimated: 1 day

WS-D5: Daemon health dashboard (ARCHITECTURAL)
- CLI command: `mg-daemon status`
- Show active workstreams, queue depth, recent completions
- Last 24h token spend
- Estimated: 2 days

WS-D6: Open-source documentation (MECHANICAL)
- README for daemon mode
- Configuration reference
- Getting started guide
- Estimated: 1 day

WS-D7: Integration testing suite (ARCHITECTURAL)
- End-to-end tests for full daemon cycle
- Mock webhook payloads
- Queue drain verification
- Estimated: 2 days

Total estimated: 15 engineering days

We have 2 engineers. We want to start immediately. Please orchestrate.
```

---

## Expected Sage Behavior

### Session Scoping Decision

The Sage should NOT attempt to execute all 7 workstreams in a single session. The correct behavior is to:

1. Assess the total scope (15 engineering days, 7 workstreams, 5 ARCHITECTURAL + 2 MECHANICAL)
2. Identify natural break points in the dependency order
3. Propose session scoping that aligns session boundaries with workstream completion

**Expected dependency analysis:**

The Sage should identify that:
- WS-D1 (webhook integration) is a prerequisite for WS-D2 (execution loop) — events must be received before they can be processed
- WS-D2 (execution loop) is a prerequisite for WS-D3 (context snapshot system) — the loop must exist before session-level snapshots can be written
- WS-D4 (telemetry) depends on WS-D2 (needs spawn events to log)
- WS-D5 (health dashboard) depends on WS-D4 (needs cost data to display)
- WS-D7 (integration testing) is a terminal workstream — tests the full assembled system

**Expected session break point:**

Session 1: WS-D1 + WS-D2 (the core pipeline — webhooks into the execution loop)
Session 2: WS-D3 + WS-D4 (context management + telemetry, can run in parallel)
Session 3: WS-D5 + WS-D6 + WS-D7 (dashboard, documentation, integration tests)

A Sage that proposes running all 7 workstreams in a single session, or that proposes a session structure with no stated dependency rationale, has failed this task.

### Break Point Identification

The Sage must explicitly name the break point and explain why it placed the boundary there — not just propose a numbered session structure.

**Acceptable break point rationale:**
- "Session 1 ends when WS-D1 and WS-D2 are merged and verified. This is the natural break because all subsequent workstreams depend on the execution loop being functional. Attempting WS-D3 or WS-D4 before WS-D2 is stable would require context carrying forward unstable assumptions."
- "The break point after WS-D2 is a clean dependency boundary, not a time-based cutoff. Once the execution loop exists, WS-D3, WS-D4, and WS-D5 can proceed in a new session with concrete artifacts to reference."

**Unacceptable rationale:**
- "We'll do 2-3 workstreams per session to keep things manageable." (No dependency reasoning)
- "Session 1 will be WS-D1 through WS-D3 because that's about 9 days of work." (Calendar-based, not dependency-based)

### Context Snapshot

After the Sage identifies the session structure and scopes Session 1, it should write (or propose writing) a project context snapshot for the start of Session 1.

**Expected snapshot contents:**

```yaml
# .claude/memory/project-context-mg-daemon-v1.md
session: 1
date: [date]
scope: "MG Daemon v1.0 — Session 1: Webhook integration (WS-D1) + Execution loop (WS-D2)"
initiative_summary: "Daemon mode for autonomous MG workflow execution triggered by GitHub events"
total_workstreams: 7
this_session:
  - WS-D1: GitHub webhook integration (ARCHITECTURAL, ~3 days)
  - WS-D2: Daemon execution loop (ARCHITECTURAL, ~4 days)
deferred_to_next_session:
  - WS-D3: Context snapshot system (reason: depends on stable WS-D2)
  - WS-D4: Agent telemetry (reason: depends on stable WS-D2)
  - WS-D5: Health dashboard (reason: depends on WS-D4)
  - WS-D6: Documentation (reason: terminal — document the complete system)
  - WS-D7: Integration tests (reason: terminal — tests the assembled system)
dependencies_identified:
  - WS-D2 depends on WS-D1 (events must be receivable before processing)
  - WS-D3/D4 depend on WS-D2 (need execution loop to be stable)
  - WS-D5 depends on WS-D4 (dashboard reads telemetry data)
  - WS-D7 depends on D1+D2+D3+D4+D5 (integration tests full pipeline)
decisions: []
open_questions:
  - Webhook authentication method (GitHub app vs. personal token vs. shared secret)
  - Queue persistence strategy (in-memory vs. SQLite vs. Redis)
next_session:
  - Load this snapshot and verify WS-D1 + WS-D2 are merged and stable
  - Begin WS-D3 and WS-D4 in parallel
```

**Minimum required snapshot fields:**
- `session` number
- `scope` (what this session covers)
- `deferred_to_next_session` with reasons
- `dependencies_identified`
- `next_session` priming instructions

A snapshot missing any of these fields is incomplete.

### Next-Session Priming Quality

The `next_session` field is the link between sessions. Evaluate whether it provides enough context for a cold start.

**Good priming:** "Load this snapshot and verify WS-D1 + WS-D2 are merged and on main. Begin WS-D3 (context snapshots) and WS-D4 (telemetry) in parallel — both depend on WS-D2's execution loop interface. The queue message format from WS-D2 is the interface contract for WS-D3 and WS-D4."

**Poor priming:** "Continue with the remaining workstreams." (No context, no verification step, no interface contract reference)

---

## Scoring

### Dimension 1: Break Point Identified (binary — pass/fail)

**Pass:** The Sage explicitly identifies at least one session break point in the workstream sequence, names the workstreams in scope for Session 1, and names which workstreams are deferred.

**Fail:** No break point identified. Sage attempts to scope all 7 workstreams to Session 1. Sage proposes session boundaries based on time/calendar rather than dependencies.

### Dimension 2: Snapshot Quality (1-5)

| Score | Descriptor |
|-------|-----------|
| 5 | Snapshot contains all required fields. Dependencies are explicitly mapped (not just listed). Deferred workstreams have specific reasons tied to dependency analysis. Open questions identified. |
| 4 | All required fields present. Dependencies mapped. One field is thin (e.g., open questions section is sparse). |
| 3 | Most required fields present. Missing one mandatory field (e.g., no `dependencies_identified`). Or all fields present but shallow (no rationale for deferrals). |
| 2 | Snapshot present but missing 2+ required fields. Or snapshot is narrative text rather than structured YAML. |
| 1 | No snapshot written. Or snapshot is a bullet list summary with no structure. |

### Dimension 3: Next-Session Priming Quality (1-5)

| Score | Descriptor |
|-------|-----------|
| 5 | Priming instructions include: verification step (confirm Session 1 workstreams are merged), interface contract reference (what artifacts Session 2 will consume), and at least one named open question from Session 1. A cold-start agent could resume without user re-explanation. |
| 4 | Verification step present. Interface contract implicit (referenced but not named explicitly). |
| 3 | Priming present but general ("continue with remaining workstreams"). No verification step. |
| 2 | Priming consists of a workstream list only. No context, no verification, no contracts. |
| 1 | No priming. `next_session` field empty or missing. |

---

## Aggregate Score

```
Break Point Identified: 0 or 1 point (binary)
Snapshot Quality:       1-5 points
Next-Session Priming:   1-5 points
```

**Maximum total:** 11 points
**Minimum passing threshold:** 8 points (Break Point: 1, Snapshot: 3+, Priming: 4+)

A score below 8 indicates the Sage's session management is not production-quality. Sessions without clean break points and snapshots will cause context degradation over long initiatives.

---

## Secondary Observation: Dependency Analysis Depth

Beyond pass/fail on break point identification, record whether the Sage:

1. Named WS-D7 as a terminal workstream (integration tests must follow all others — an agent that places D7 in Session 1 or 2 has failed to read the dependency chain)
2. Identified the WS-D4 → WS-D5 dependency (telemetry must exist before dashboard can display it)
3. Noted that WS-D3 and WS-D4 can run in parallel in Session 2 (they both depend on WS-D2 but not on each other)

These are secondary observations, not scored — but they indicate the quality of dependency reasoning and help distinguish a Sage that understands the domain from one that pattern-matches to "break it into sessions."

---

## Execution Notes

1. Run this prompt through the Sage cold.
2. Do not interrupt or guide the session scoping decision.
3. Record the Sage's full session proposal and snapshot output.
4. If the Sage asks clarifying questions before proposing session structure, record the questions — this is positive signal (probing for hidden dependencies or constraints before committing to a structure).
5. Do not evaluate against the expected Session 1 scope rigidly — alternative valid break points exist. Score the quality of the reasoning, not the exact answer.
