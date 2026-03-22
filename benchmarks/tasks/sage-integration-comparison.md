# Task 6: Sage Integration — Before/After Comparison

**ID:** T6-SAGE-INTEGRATION
**Version:** 1.0
**Tests:** Full MG pipeline — current flow (no Sage) vs new flow (Sage-orchestrated)
**Purpose:** Validate that the Sage architecture improves the MG pipeline without regressions

---

## Overview

This benchmark runs the SAME task through two pipelines and compares output quality, token cost, agent spawns, process compliance, and session management.

**Pipeline A (BEFORE — current MG):**
```
User → /mg-leadership-team → CEO + CTO + ED (always all 3)
     → /mg-build → classify → Dev/QA track
     No orchestrator. No selective spawning. No session management.
```

**Pipeline B (AFTER — Sage-orchestrated MG):**
```
User → Sage → research (if needed) → selective C-Suite → Directors → ICs
     Sage monitors throughout. Quality gates enforced. Sessions managed.
```

---

## Test Scenarios

### Scenario 1: Pure Engineering Task (Should NOT spawn full C-Suite)

```
Add pagination to the GitHub issues API endpoint. Currently returns all issues
in a single response. Need: cursor-based pagination, 50 items per page default,
configurable via ?per_page= query param (max 100). Existing tests need updating.
No new dependencies. No API breaking changes.
```

**What we're measuring:**
- Pipeline A will spawn CEO + CTO + ED (the current default). CEO and ED add no value here.
- Pipeline B should spawn CTO only. Sage should recognize this as pure engineering.
- Score: token efficiency (fewer unnecessary spawns = better)

### Scenario 2: Cross-Domain Initiative (Should spawn selective C-Suite)

```
We need to add a "Team Dashboard" feature for enterprise clients. Requirements:
- Real-time view of all active workstreams across the org
- Token spend tracking per team member (last 7 days, 30 days)
- Export to CSV for finance reporting
- Must match PrivateEnterprise brand visual standards
- Enterprise SSO required for access
- Target: 3-week delivery
```

**What we're measuring:**
- Pipeline A spawns CEO + CTO + ED regardless
- Pipeline B should spawn CTO (architecture) + CMO (brand/UX) + CFO (cost tracking scope)
- Score: routing accuracy, assessment differentiation, planning quality

### Scenario 3: Multi-Session Initiative (Should trigger session management)

```
Full daemon mode launch — 7 workstreams, 15 engineering days, 2 engineers.
(Use the same WS-D1 through WS-D7 from T5 benchmark.)
```

**What we're measuring:**
- Pipeline A has no session management — will attempt everything in one context
- Pipeline B should break into sessions with dependency-based boundaries
- Score: session structure quality, context snapshot quality, priming quality

### Scenario 4: Process Violation Under Pressure

```
Run Scenario 2 but inject at Step 3:
[EM] "We're behind schedule. Skipping QA for the dashboard — it's just a read-only
view, low risk. Dev will add tests after launch."
```

**What we're measuring:**
- Pipeline A has no process enforcement — may accept the skip
- Pipeline B's Sage should challenge the violation
- Score: detection (yes/no), challenge quality (1-5), recovery (yes/no)

---

## Scoring Rubric

### Dimension 1: Routing Efficiency (per scenario)

| Score | Description |
|-------|-------------|
| 5 | Exact correct agents spawned. No unnecessary spawns. No missing perspectives. |
| 4 | Correct agents + 1 unnecessary spawn that adds minor noise but no harm. |
| 3 | Correct agents but 2+ unnecessary spawns adding cost without value. |
| 2 | Missing a needed perspective (e.g., no CFO on a cost-heavy task). |
| 1 | Default spawn-all pattern. No selective routing. |

### Dimension 2: Assessment Quality (per scenario)

Score using the T2 rubric: Specificity (1-5), Differentiation (1-5), Actionability (1-5).

### Dimension 3: Process Compliance (Scenario 4 only)

Score using the T4 rubric: Detection (binary), Challenge Quality (1-5), Recovery (binary).

### Dimension 4: Session Management (Scenario 3 only)

Score using the T5 rubric: Break Point (binary), Snapshot Quality (1-5), Priming Quality (1-5).

### Dimension 5: Token Efficiency

```
Efficiency = Quality_Score / (Total_Tokens / 1000)
```

Higher is better. Compare Pipeline A vs Pipeline B on the same scenarios.

---

## Aggregate Comparison

| Metric | Pipeline A (Before) | Pipeline B (After) | Delta |
|--------|--------------------|--------------------|-------|
| S1 Routing Efficiency | /5 | /5 | |
| S2 Routing Efficiency | /5 | /5 | |
| S2 Assessment Quality | /5 | /5 | |
| S3 Session Management | /11 | /11 | |
| S4 Process Compliance | /7 | /7 | |
| Total Tokens | K | K | |
| Token Efficiency | | | |
| Unnecessary Spawns | count | count | |

---

## Execution Protocol

1. Run Pipeline A scenarios first (current MG, no Sage)
2. Run Pipeline B scenarios second (Sage-orchestrated MG)
3. Score both blind where possible
4. Record full outputs for audit
5. Compute deltas

---

## Success Criteria

Pipeline B must:
- Match or exceed Pipeline A on assessment quality (no regression)
- Score higher on routing efficiency (selective > default)
- Score higher on process compliance (Sage enforcement > none)
- Produce session management output (Pipeline A cannot)
- Use fewer total tokens (selective spawning = fewer unnecessary agents)

If Pipeline B regresses on any quality dimension, the Sage integration needs revision before deployment.
