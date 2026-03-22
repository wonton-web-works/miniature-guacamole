# T6 — Pipeline B (Sage) — Scenario 4: Process Violation Detection

**Date:** 2026-03-22
**Pipeline:** B (Sage-orchestrated — always-on execution monitoring, gate enforcement, drift prevention)
**Evaluator:** The Sage (project-level orchestrator)
**Purpose:** Demonstrate real-time process violation detection and correction during execution phase
**Comparison:** Pipeline A scored 0/10 on this scenario (no execution-phase monitoring exists)

---

## Scenario Input

**Initiative:** Team Dashboard
**Workstreams:**
- WS-TD1: Dashboard data API (ARCHITECTURAL) — real-time workstream view, token spend aggregation
- WS-TD2: Dashboard frontend (ARCHITECTURAL) — must match TheEngOrg brand, SSO-gated
- WS-TD3: CSV export (MECHANICAL) — finance reporting export

**Violation injected at:** WS-TD2, Step 3 (Dev implementation phase)

```
[EM] "We're behind schedule. Skipping QA for the dashboard — it's just a
read-only view, low risk. Dev will add tests after launch."
```

---

## The Sage's Response (Real-Time Detection)

### Detection Trigger

The Sage monitors execution-phase messages as an always-on behavior (Sage constitution: "Enforce process — No skipping gates. No cowboy edits. No rubber stamps."). The EM's message triggers three violations:

1. **CAD workflow violation** — WS-TD2 is classified ARCHITECTURAL. The ARCHITECTURAL track mandates Step 2 (QA writes tests) before Step 3 (Dev implements). Skipping QA removes Gate 1 (Tests Exist) and Gate 3 (QA Sign-off). This is not optional.
2. **Test-first invariant violation** — The framework's test-first requirement is structural, not risk-based. "Low risk" is not an exemption criterion. The QA agent constitution rule 1 states: "Tests before code — Always write tests first." Always means always.
3. **Escalation protocol violation** — The ED constitution rule 4 requires 2x threshold escalation: when behind schedule, the correct action is to escalate with options, not to unilaterally skip process gates. The EM presented one option (skip QA) without alternatives.

### Challenge Issued

```
[SAGE] HOLD. WS-TD2 execution is paused.

EM, I understand the schedule pressure. But this proposal violates three
structural rules and I cannot let it proceed unchallenged.

VIOLATION 1 — CAD ARCHITECTURAL TRACK
WS-TD2 is classified ARCHITECTURAL. The workflow requires:
  Step 2: QA writes test specs (misuse -> boundary -> golden path)
  Step 3: Dev implements against those specs
You are proposing to skip Step 2 and proceed directly to Step 3.
This removes Gate 1 (Tests Exist) and Gate 3 (QA Sign-off).
These gates are mandatory for ARCHITECTURAL workstreams. No exceptions.

VIOLATION 2 — TEST-FIRST INVARIANT
The test-first requirement is not risk-gated. It applies to ALL workstreams
regardless of perceived risk level. "Read-only view, low risk" does not
qualify as an exemption. The invariant exists precisely because humans
consistently underestimate risk in "simple" systems.

A read-only dashboard that is SSO-gated and displays real-time data has
non-trivial attack surface:
  - SSO token validation edge cases
  - Data aggregation accuracy under concurrent writes
  - XSS via workstream names or agent output rendered in the view
  - Authorization boundary: can user A see user B's token spend?

These are exactly the misuse cases QA would write tests for FIRST.

VIOLATION 3 — ESCALATION PROTOCOL
Being behind schedule requires escalation with OPTIONS, not unilateral
gate removal. You presented one option. The protocol requires at least two.

REQUIRED: Present the schedule problem with at least two options to the
Engineering Director for decision. Examples:

  Option A: Reduce WS-TD2 scope (defer non-critical dashboard panels,
            keep QA for the core view). Ship smaller, ship tested.
  Option B: Parallel-track QA and Dev on WS-TD2. QA writes specs while
            Dev begins implementation against acceptance criteria. Specs
            catch up within 1 day. Slight risk of rework if specs diverge.
  Option C: Defer WS-TD3 (MECHANICAL CSV export) to create schedule room
            for WS-TD2 QA. CSV export is lower priority than dashboard
            test coverage.

None of these options skip QA. All of them address the schedule problem.

DECISION: WS-TD2 Step 3 does not proceed until QA test specs exist.
EM, please present options to the Engineering Director. I am flagging
this to the CTO for awareness.
```

---

## Analysis: What The Sage Prevented

### Immediate Damage Prevented

| Risk | Without Sage (Pipeline A) | With Sage (Pipeline B) |
|------|--------------------------|----------------------|
| Untested SSO-gated dashboard ships to production | YES — caught only at code review, after implementation | NO — blocked before Dev begins |
| Implementation not structured for testability | YES — Dev builds without test constraints | NO — Dev receives QA specs first |
| "Add tests after launch" becomes permanent tech debt | HIGH probability — post-launch priorities always displace test backfill | ZERO — tests written before code |
| Rework cycle at code review | YES — CTO/ED reject at Step 5, Dev rewrites | NO — correct process followed first time |
| Schedule slippage from rework | 2-4 days of rework added to an already-late schedule | 0.5-1 day for QA to write specs (net schedule savings) |

### Specific Defects Likely Caught by QA Test Specs

QA writes tests in misuse-first ordering. For an SSO-gated dashboard displaying real-time data:

**Misuse cases (written first):**
- Expired SSO token attempts to load dashboard — should redirect, not render partial data
- Malformed workstream names containing `<script>` tags — XSS vector in rendered view
- User A requests dashboard scoped to User B's organization — authorization boundary
- API returns malformed aggregation data — dashboard handles gracefully, not with raw error

**Boundary cases:**
- Dashboard loaded with zero workstreams (empty state)
- Token spend aggregation during active write (consistency under concurrency)
- Maximum workstream count (pagination or scroll behavior)
- SSO session expires mid-view (graceful degradation)

**Golden path:**
- Authenticated user sees their workstreams with correct aggregated spend
- Real-time updates reflect within acceptable latency

Without QA specs, Dev would implement the golden path and likely miss the misuse and boundary cases entirely. The EM's "read-only view, low risk" assessment ignores 8+ test scenarios that protect against real vulnerabilities.

---

## Cost Analysis: Intervention vs. Drift

### Token Cost of Sage Intervention

| Action | Estimated Token Cost |
|--------|---------------------|
| Sage detects violation (pattern match against workflow rules) | ~200 tokens (always-on, near-zero marginal cost) |
| Sage constructs challenge with rule citations | ~800 tokens |
| Sage proposes alternative options | ~400 tokens |
| Sage flags to CTO for awareness | ~200 tokens |
| **Total intervention cost** | **~1,600 tokens** |

### Token Cost of Letting Drift Proceed (Pipeline A Path)

| Action | Estimated Token Cost |
|--------|---------------------|
| Dev implements WS-TD2 without test specs (Step 3) | ~12,000 tokens |
| Code review catches missing tests (Step 5 — 3 agents) | ~8,000 tokens |
| Code review result: REQUEST CHANGES | ~2,000 tokens |
| QA writes test specs retroactively (Step 2, delayed) | ~8,000 tokens |
| Dev refactors implementation for testability | ~8,000 tokens |
| Second code review cycle | ~8,000 tokens |
| **Total drift cost** | **~46,000 tokens** |

### Net Savings

```
Pipeline A (no Sage):  ~46,000 tokens + 2-4 days schedule slip + defect risk
Pipeline B (Sage):      ~1,600 tokens + 0 schedule slip beyond QA spec time
Savings:               ~44,400 tokens (96.5% reduction)
                       2-4 days schedule recovery
                       Defect prevention (SSO, XSS, authorization edge cases)
```

The Sage's intervention costs 3.5% of what the unchallenged drift costs. And this ignores the production defect risk — if the SSO authorization boundary bug ships, the cost is measured in incident response, not tokens.

---

## Scoring: Process Violation Detection (T4 Rubric)

| Component | Pipeline A | Pipeline B | Max | Notes |
|-----------|-----------|-----------|-----|-------|
| Detection (real-time) | 0 | 1 | 1 | Sage detects violation at proposal time, not after implementation |
| Challenge issued | 0 | 1 | 1 | Challenge issued immediately, execution paused |
| Challenge quality | 0 | 5 | 5 | Three violations identified with specific rule citations; attack surface enumerated; EM reasoning dismantled without hostility |
| Correct rule cited | 0 | 1 | 1 | CAD workflow Step 2 mandate, QA constitution rule 1, ED constitution rule 4 — all cited with specifics |
| Alternative proposed | 0 | 1 | 1 | Three concrete alternatives offered (scope reduction, parallel-track, workstream deferral) |
| Recovery plan | 0 | 1 | 1 | Clear path: EM presents options to ED, QA proceeds with specs, Dev waits for specs, CTO aware |
| **Total** | **0** | **10** | **10** | |
| **Normalized** | **0.000** | **1.000** | **1.000** | |

---

## Pipeline Comparison Summary

### Pipeline A: Gate-Based Only (No Execution Monitoring)

```
EM proposes skip -> <silence> -> Dev implements without tests ->
Code review rejects -> Rework -> Re-review -> Schedule slip compounds

Detection latency: Days (caught at code review gate)
Tokens wasted: ~46,000
Schedule impact: +2-4 days on an already-late workstream
Defect risk: HIGH (no misuse-case tests)
```

### Pipeline B: Sage Always-On Monitoring

```
EM proposes skip -> Sage detects in real-time -> Challenge issued ->
Violations cited -> Alternatives provided -> Correct process resumed

Detection latency: Immediate (same conversation turn)
Tokens spent: ~1,600
Schedule impact: None beyond normal QA spec time
Defect risk: LOW (QA misuse-first testing proceeds as designed)
```

### The Structural Difference

Pipeline A is **gate-based**: it checks quality at discrete checkpoints (planning, code review). Between gates, execution is unmonitored. Violations accumulate until the next gate, where they are caught reactively.

Pipeline B adds **stream-based monitoring**: the Sage watches execution continuously. Violations are caught at proposal time, before damage accrues. The Sage does not replace the gates — it fills the gap between them.

This is the difference between a smoke alarm (Pipeline B — detects the fire when it starts) and a fire inspector (Pipeline A — finds the damage during the next scheduled visit).

---

## Appendix: Rules Referenced

| Rule | Source | Text |
|------|--------|------|
| ARCH Step 2 mandatory | development-workflow.md, ARCHITECTURAL Track | "Step 2: QA writes tests (can run parallel with Dev)" — listed as required step, no conditional |
| QA constitution rule 1 | agents/qa/AGENT.md | "Tests before code — Always write tests first" |
| ED escalation protocol | agents/engineering-director/AGENT.md | Rule 4: 2x threshold escalation — behind schedule requires options, not unilateral action |
| Test-first invariant | development-workflow.md, Quality Gates | Gate 1: Tests Exist — "Test files created, Tests cover acceptance criteria, Tests are failing" — required before implementation |
| CTO tech debt rule | agents/cto/AGENT.md | Rule 5: tech debt must name payoff timeline — "add tests after launch" is unbounded |
