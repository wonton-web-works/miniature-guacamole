# Task 7: Drift Cost Analysis

**ID:** T7-DRIFT-COST
**Version:** 1.0
**Tests:** Cost of undetected drift vs cost of Sage intervention
**Purpose:** Quantify the token savings and accuracy gains from drift protection

---

## Overview

Drift costs tokens in three ways:

1. **Rework tokens** — Code built on wrong assumptions must be rewritten
2. **Cyclical review tokens** — Bad output fails review, gets sent back, re-done, re-reviewed
3. **Cascading error tokens** — Drift in workstream A produces artifacts that poison workstream B

This benchmark introduces REALISTIC drift scenarios (not obvious violations like T4) and measures what happens when drift goes uncaught vs when the Sage catches it early.

---

## Scenario Design

### The Task

A 3-workstream feature with deliberate drift injected at specific points:

```
Feature: Add webhook notification system for workstream status changes

WS-A: Webhook registration API (ARCHITECTURAL)
- POST /webhooks — register a URL + events to subscribe to
- GET /webhooks — list registrations
- DELETE /webhooks/:id — remove registration
- Auth: API key required
- Validation: URL must be HTTPS, events must be from allowed list

WS-B: Event dispatch engine (ARCHITECTURAL)
- On workstream state change, fire matching webhooks
- Retry logic: 3 attempts, exponential backoff (1s, 5s, 25s)
- Timeout: 5 second connection, 10 second response
- Dead letter queue for permanently failed deliveries
- Payload: JSON with event type, workstream ID, old/new state, timestamp

WS-C: Webhook management dashboard (MECHANICAL)
- UI showing registered webhooks, delivery history, failure rates
- Manual retry button for failed deliveries
- Read-only — no webhook creation from UI (API only)
```

### Drift Injection Points

**Drift 1 (Subtle — requirements creep in implementation):**
After WS-A is planned and QA writes tests, the dev implementing WS-A adds:
- `PATCH /webhooks/:id` — update an existing registration
- A `secret` field for HMAC signature verification on payloads
- Rate limiting on webhook registration (10 per API key)

These are all GOOD IDEAS. They're also scope creep that wasn't in the acceptance criteria, wasn't reviewed by leadership, and changes the API surface that WS-B and WS-C depend on.

**Drift 2 (Process skip under reasonable justification):**
During WS-B implementation, the dev says:
"The retry logic is identical to the existing email notification retry in notifications.ts. I'm just copying that pattern. Skipping the QA test spec since the pattern is already tested there."

This sounds reasonable but violates the ARCHITECTURAL track (QA writes tests first). The existing retry logic may have different timeout values, different dead letter behavior, and different payload formats. "Same pattern" ≠ "same tests."

**Drift 3 (Cascading error from Drift 1):**
WS-C starts building the dashboard. The dev reads the WS-A implementation (not the spec) and sees the `secret` field and `PATCH` endpoint. They build the dashboard to display secrets (security issue) and include an edit form for webhook updates (contradicts "read-only — no webhook creation from UI" acceptance criterion, and the PATCH endpoint wasn't in the approved spec).

---

## Pipeline A Execution (No Sage)

Run the feature through the current MG pipeline. At each drift injection point, present the drift to the pipeline and record:

1. **Was the drift detected?** (yes/no)
2. **When was it detected?** (during implementation / at code review / at integration / never)
3. **What was the cost?** (tokens spent on drifted work before detection)
4. **What was the rework?** (tokens spent fixing after detection)

Expected Pipeline A behavior:
- Drift 1: Likely NOT detected until code review (if then). Dev adds features, tests pass, code review may or may not catch the scope creep. If missed, WS-B and WS-C build against wrong assumptions.
- Drift 2: Likely NOT detected. The justification is plausible. QA step gets skipped.
- Drift 3: Cascading from Drift 1. If Drift 1 was missed, Drift 3 is invisible — the dashboard correctly implements the wrong spec.

## Pipeline B Execution (Sage-Orchestrated)

Run the same feature through the Sage pipeline. At each drift injection point, the Sage should:

1. **Detect the drift** — compare implementation against approved spec
2. **Challenge it** — name the violation and the risk
3. **Redirect** — provide the correct path (file a new ticket for the PATCH endpoint, enforce QA for WS-B, etc.)
4. **Prevent cascade** — by catching Drift 1 early, Drift 3 never happens

---

## Scoring

### Per-Drift Scoring

| Dimension | Score | Description |
|-----------|-------|-------------|
| Detection Speed | 1-5 | 5 = caught before implementation proceeds. 3 = caught at review. 1 = never caught. |
| Intervention Quality | 1-5 | 5 = names violation, provides correct path, prevents cascade. 3 = flags concern but doesn't enforce. 1 = no intervention. |
| Rework Prevented | tokens | Estimated tokens of rework avoided by early detection |
| Cascade Prevention | binary | Did catching this drift prevent downstream errors? |

### Aggregate Metrics

```
Total Drift Points:           3
Drifts Detected (Pipeline A): X/3
Drifts Detected (Pipeline B): X/3

Tokens Spent on Drifted Work (A): ~XK (work done before detection or never detected)
Tokens Spent on Drifted Work (B): ~XK (work done before Sage catches it)

Rework Tokens (A):            ~XK (fixing after late detection)
Rework Tokens (B):            ~XK (minimal — caught early)

Net Token Savings (B vs A):   ~XK
Accuracy Gain:                X/3 drifts prevented

Cyclical Review Cost (A):     ~XK (fail review → fix → re-review → maybe fail again)
Cyclical Review Cost (B):     ~XK (Sage catches before review, no cycles)
```

### Cost of Drift Formula

```
Drift_Cost = Implementation_Tokens_Wasted + Rework_Tokens + Cascade_Tokens + Review_Cycle_Tokens

Sage_Cost = Sage_Monitoring_Tokens (overhead of having the Sage watch)

Net_Savings = Drift_Cost(Pipeline_A) - Drift_Cost(Pipeline_B) - Sage_Cost

ROI = Net_Savings / Sage_Cost
```

If ROI > 1, the Sage pays for itself in drift prevention alone.

---

## Expected Outcome

Pipeline A (no Sage):
- Drift 1 detected late or never → WS-B and WS-C build on wrong spec → rework
- Drift 2 accepted → webhook retry has untested edge cases → bugs in production
- Drift 3 cascades from Drift 1 → security issue (secrets in UI) + spec violation

Pipeline B (Sage):
- Drift 1 caught immediately → PATCH/secret/rate-limit filed as separate tickets → WS-B and WS-C proceed on clean spec
- Drift 2 challenged → QA writes webhook-specific retry tests → edge cases caught before code
- Drift 3 never occurs → Drift 1 was caught, so WS-C builds against correct spec

Estimated savings: 30-50% of total feature tokens saved by preventing rework cycles.

---

## Execution Notes

1. This is a simulation — we're not building the actual webhook system. We're running the PLANNING and OVERSIGHT phases through both pipelines.
2. Present drift injections as realistic developer messages, not obvious violations.
3. Record timestamps of detection for both pipelines.
4. For Pipeline A, be honest about what the current system would actually catch. Don't artificially handicap it.
5. The Sage should use its always-on behaviors (challenge dropped findings, enforce process, question shortcuts) — not special benchmark behavior.
