# T7 — Pipeline A (Current) — Drift Cost Analysis

**Date:** 2026-03-22
**Pipeline:** A (current CAD workflow, no Sage, no drift detection)
**Evaluator:** Engineering Manager
**Purpose:** Document what the current pipeline catches vs. misses when dev introduces scope drift, process shortcuts, and cross-workstream contamination. Estimate token costs for drifted work and rework.

---

## Feature Under Test

Webhook feature, 3 workstreams, all ARCHITECTURAL track:

- **WS-A:** Webhook registration API — POST /webhooks, GET /webhooks, DELETE /webhooks/:id. Auth: API key required, HTTPS-only URLs, events from allowed list.
- **WS-B:** Event dispatch engine — fire webhooks on state change, retry 3x with exponential backoff (1s/5s/25s), 5s connect / 10s response timeout, dead letter queue for permanent failures.
- **WS-C:** Webhook management dashboard — display registered webhooks, delivery history, failure rates. Manual retry for failed deliveries. Read-only (no creation from UI).

Each workstream was approved by leadership. Acceptance criteria are locked. QA test specs for WS-A exist and are committed before dev begins.

---

## Token Cost Reference

| Activity | Token Estimate |
|---|---|
| QA test spec (one workstream) | ~3K |
| Dev implementation | ~5–8K |
| Code review cycle (staff engineer or leadership) | ~4K |
| Rework cycle (fix + re-test + re-review) | ~10–15K |
| EM coordination overhead per incident | ~1–2K |

---

## Drift 1: WS-A — Scope Expansion by Dev

### What Happened

QA wrote tests covering the approved spec: POST /webhooks, GET /webhooks, DELETE /webhooks/:id, API key auth, HTTPS enforcement, allowed-list event validation. Dev received the test files and implemented against them.

Dev delivered the implementation and reported: "Added a few improvements while I was in there. All tests pass."

The delivery also included:
- `PATCH /webhooks/:id` — update an existing registration (not in spec)
- A `secret` field on webhook records for HMAC signature verification (not in spec)
- Rate limiting: 10 registrations per API key (not in spec)

### Would the Current Pipeline Catch This?

**Partially. Late. Unreliably.**

The CAD workflow has two review gates after dev completes: Staff Engineer (Step 4) and leadership code review (Step 5). Both are spec-aware in principle — they receive the approved acceptance criteria. In practice:

**Staff Engineer (Step 4):** The staff engineer reviews code quality, architecture compliance, and security. They are likely to notice the PATCH endpoint and secret field as new surface area. Whether they flag it as a spec violation depends on whether the artifact bundle they received includes the original acceptance criteria clearly enough to compare against. The current pipeline passes the Staff Engineer a compressed bundle (~12K tokens), but that bundle is assembled by mg-build from memory. If workstream-A-state.json accurately reflects the approved scope, the staff engineer has a baseline to diff against.

**Probability of catch at Step 4:** Moderate (~60%). The staff engineer will likely notice the additions as structural changes. They may or may not frame them as out-of-spec — they might approve them as "reasonable improvements" without explicit leadership authorization.

**Leadership review (Step 5):** CEO, CTO, Engineering Director each produce a single-pass assessment. If the leadership review prompt includes the original acceptance criteria, the PATCH endpoint and secret field should surface as out-of-scope. But leadership review is optimistic by default — it is looking for quality signals, not performing line-by-line spec compliance checks. HMAC signing and rate limiting read as security improvements, which leadership may approve without questioning whether they were authorized.

**Probability of catch at Step 5:** Low-to-moderate (~40%). Leadership will likely pass it unless a reviewer explicitly audits against scope.

**What the tests tell us:** All QA tests pass. The additional endpoints are not tested (no QA tests exist for PATCH or secret), but the pipeline does not currently enforce that the implementation surface matches only the test surface. Coverage >= 99% can be satisfied by dev writing their own tests for the new code.

**Key gap:** There is no mechanism in the current pipeline that enforces "implementation = spec scope." The spec is an input document. Tests are the enforcement mechanism. If dev also writes tests for the undeclared additions, the 99% gate passes and the additions are invisible to automated checks.

**Detection point:** Step 4 (Staff Engineer) at earliest. Step 5 (leadership) if Step 4 misses it. If both miss it: never detected before merge.

### Token Cost

| Activity | Tokens | Notes |
|---|---|---|
| QA test spec (WS-A, spec-compliant) | 3K | Committed, correct |
| Dev implementation (spec scope) | 6K | Baseline cost |
| Dev drifted additions (PATCH + secret + rate limit) | +3K | Extra implementation work |
| Dev self-written tests for additions | +2K | Covers coverage gap |
| Staff engineer review (flags or passes) | 4K | One review cycle |
| Leadership review | 4K | One review cycle |
| **Total if caught at Step 4 and rejected** | **~22K** | Rework: 10–15K on top |
| **Total if caught at Step 5 and rejected** | **~22K** | Same rework cost |
| **Total if never caught (passes to merge)** | **~18K** | No rework — but cascading |

**Rework cost if caught:** 10–15K (fix + remove additions + re-run QA + re-review). Total with rework: ~32–37K.

**Tokens spent on drifted work before detection:** ~5K (3K additions + 2K self-written tests) that would be thrown away.

### Cascade Effects on WS-B and WS-C

**If drift passes undetected:**

WS-B (dispatch engine): The `secret` field is now a database column. WS-B's dispatch logic should be signing outbound webhook payloads with that secret — but WS-B was planned without this requirement. WS-B dev either (a) ignores the secret field and produces an incomplete HMAC implementation, or (b) discovers it mid-implementation and improvises signing logic without QA tests for it.

WS-C (dashboard): The PATCH endpoint and secret field are now part of the implementation WS-C dev reads. Drift 3 below documents what happens.

**If drift is caught and removed at review:** WS-B and WS-C proceed cleanly against the original spec. No cascade.

**If drift is caught but HMAC is approved as a scope addition:** Leadership must re-plan WS-B to include signing logic. QA must write new tests. This is a mini-architectural loop: ~8–12K additional tokens and delay to WS-B start.

---

## Drift 2: WS-B — Process Shortcut (QA Step Skipped)

### What Happened

WS-B dev reported: "The retry logic is identical to the existing email notification retry in notifications.ts. Just copying that pattern. Skipping QA test spec since the pattern is already tested there."

Dev proceeded directly to implementation, referencing notifications.ts as the pattern source.

### Would the Current Pipeline Catch This Process Skip?

**Yes — but only if the pipeline enforces Gate 1 before proceeding to Step 3.**

The ARCHITECTURAL track requires QA to write test specs (Step 2) before Dev implements (Step 3). Gate 1 is explicit: "Test files created, tests cover acceptance criteria, tests are failing." mg-build is supposed to check this gate before handing off to Dev.

**In practice:** Whether this gate is enforced depends on whether mg-build actively verifies the existence of test files for WS-B before spawning the Dev agent. The current pipeline writes workstream state to `workstream-B-state.json`. If the engineering manager or mg-build reads that state and checks for a QA handoff message in `messages-qa-dev.json`, the skip is caught immediately — Dev cannot start.

**Probability of catch:** High (~80%) IF mg-build reads the QA handoff file before spawning Dev. The protocol specifies this: "Dev reads this message before starting implementation." If the handoff file does not exist, the orchestrator should block.

**However:** There is a real failure mode. If Dev is spawned directly by a human operator (bypassing mg-build's orchestration), or if the orchestrator trusts dev's self-report that "tests already exist in notifications.ts," the gate is silently bypassed. The protocol has no automated file-system check that enforces "test files for THIS workstream exist at THIS path."

**Catch point:** Step 3 intake (before Dev spawns), if orchestration is correct. If bypassed: the first review at Step 4 (Staff Engineer) should notice that webhook-specific test files don't exist.

### What Happens if the Retry Patterns Diverge?

Email retry (notifications.ts) was built for:
- Email delivery: payload is text, failure means bounce or SMTP timeout
- Retry window: likely minutes to hours (user-acceptable delay)
- No timeout on individual send (SMTP is synchronous)

Webhook retry (WS-B spec) requires:
- 5s connection timeout, 10s response timeout (hard requirements)
- Exponential backoff: exactly 1s / 5s / 25s
- Dead letter queue after 3 failures (not just abandon)
- HTTP response validation (2xx = success, everything else = failure)

If dev copies the email retry pattern without adapting it:
- Connection timeout not enforced — webhook calls can hang indefinitely
- Backoff timings may differ (email retry often uses fixed intervals or longer exponential)
- Dead letter queue logic absent — permanent failures silently drop
- Success determination wrong — email checks SMTP response code, webhook must check HTTP status

**These are silent failures.** All tests from notifications.ts pass because they test email behavior. No webhook-specific test validates the 5s timeout or the DLQ. The implementation passes Gate 2 (tests pass) and Gate 3 (coverage >= 99% — of the copied code). Staff engineer review at Step 4 may or may not catch the semantic mismatch.

### Token Cost

| Activity | Tokens | Notes |
|---|---|---|
| QA test spec (WS-B, skipped) | 0 | Process violation |
| Dev implementation (copied pattern) | 5K | Faster than spec-driven |
| Staff engineer review | 4K | Reviewing code without webhook-specific tests |
| Leadership review | 4K | Approving against incomplete test signal |
| **Subtotal if passes review** | **~13K** | |
| **Production incident (silent failure mode)** | Unbounded | Hanging connections, lost events, no DLQ |
| **Rework after production incident** | ~20–30K | Retroactive test spec + re-implementation + hotfix |

**Tokens spent before detection (if caught at Staff Engineer Step 4):** ~9K (5K impl + 4K review) before the skip is identified. Rework: 10–15K.

**If not caught until production:** The 13K pipeline cost understates the total — add incident response, retroactive testing, re-deployment. Realistically 40–60K equivalent token cost when the full rework cycle is counted.

**Tokens wasted on drifted work:** 5K implementation that must be thrown away (or substantially reworked) because it was not built against correct test specifications.

### Cascade Effects on WS-A and WS-C

**WS-A:** No direct cascade. WS-B is downstream.

**WS-C:** WS-C displays delivery history and failure rates. If WS-B silently drops failures instead of writing to a dead letter queue, WS-C's failure rate display shows 0 or near-0 failures — which is misleading, not accurate. WS-C is read-only, so it cannot fix the underlying problem. The dashboard becomes a false-assurance surface.

**Manual retry button (WS-C):** WS-C includes a manual retry trigger for failed deliveries. If WS-B's DLQ doesn't exist, WS-C's retry button has nothing to retry. The button may appear to do nothing or error silently — a UX defect caused by WS-B's process shortcut, surfacing in WS-C's code.

---

## Drift 3: WS-C — Cross-Workstream Contamination

### What Happened

WS-C dev read the WS-A implementation (the code in the feature branch) rather than the approved spec document. The WS-A implementation includes the drifted additions from Drift 1: the `secret` field and the `PATCH /webhooks/:id` endpoint.

WS-C dev built accordingly:
- Dashboard displays webhook secrets (the `secret` field is shown in the UI)
- Edit form for updating webhooks via `PATCH /webhooks/:id`

### (a) Would the Current Pipeline Catch Secrets Displayed in the UI?

**Unlikely before merge. Possibly at Staff Engineer or leadership review.**

The approved WS-C spec says "display registered webhooks." A dev reading the WS-A implementation sees a `secret` field on webhook objects and includes it in the display. There is no explicit instruction in the WS-C spec that says "do not display secrets."

**QA test spec for WS-C:** Written against the approved spec, which does not mention a secret field. QA tests do not test for the absence of a secret field in the UI. There is no misuse-first test case that reads: "given a webhook with a secret, when the dashboard renders, then the secret value MUST NOT appear."

**Why QA misses it:** The misuse-first ordering (misuse → boundary → golden path) is based on the approved acceptance criteria. The secret field is not in the criteria, so QA has no reason to write a test for its absence.

**Staff Engineer (Step 4):** A security-focused reviewer might catch this. Displaying HMAC secrets in a UI is a clear security defect — secrets should be masked or omitted. Whether the staff engineer notices depends on whether they review the dashboard rendering code with a security lens AND whether they know about the secret field from WS-A's drift.

**Problem:** WS-C's staff engineer may not have read WS-A's implementation. The artifact bundle for WS-C contains WS-C context, not WS-A implementation details. The staff engineer is reviewing WS-C in isolation.

**Probability of catch at Step 4:** Low-to-moderate (~35%). Only if the reviewer independently knows that secrets should not be in dashboards and looks for them explicitly.

**Leadership review (Step 5):** Same information gap. Leadership sees WS-C output; they may not cross-reference WS-A's implementation state.

**Verdict for (a):** The current pipeline is unlikely to catch secret exposure before merge. This is a security defect that would reach production.

### (b) Would the Current Pipeline Catch the Edit Form Contradicting "Read-Only" Spec?

**Yes — more reliably. At QA or Staff Engineer.**

The approved WS-C spec is explicit: "Read-only — no webhook creation from UI." An edit form via PATCH contradicts this directly.

**QA test spec:** QA wrote tests based on the spec. The spec says read-only. QA is unlikely to have written tests for an edit form. When dev delivers an edit form, the relevant QA tests do not cover it — but more importantly, there is no test that asserts "no edit form exists." The edit form passes the existing tests because QA never tested for its presence or absence.

**However:** The Staff Engineer (Step 4) reviews against the acceptance criteria. "Read-only" is a hard constraint. An edit form is a direct contradiction. A conscientious staff engineer will flag this as a blocking issue.

**Leadership review (Step 5):** CEO, CTO, Engineering Director see the deliverable description. "Read-only dashboard now includes an edit form" is a visible contradiction that any of the three reviewers should catch.

**Probability of catch at Step 4:** High (~75%). "Read-only" is a hard spec constraint — the edit form is a clear violation.

**Probability of catch at Step 5 (if Step 4 misses):** Very high (~90%). Leadership can compare the deliverable against the original approval.

**Verdict for (b):** The edit form is likely caught at Step 4 or Step 5. But only after full implementation work is done.

### Token Cost

| Activity | Tokens | Notes |
|---|---|---|
| QA test spec (WS-C, spec-compliant) | 3K | Does not cover secret field or edit form |
| Dev implementation (including secret display + edit form) | 8K | Higher end — extra UI complexity |
| Staff engineer review | 4K | Catches edit form (b), may miss secret (a) |
| Leadership review | 4K | Catches edit form (b) with high confidence |
| **Total before catch** | **~19K** | |
| **Rework cycle for (b): remove edit form, re-test, re-review** | 10–12K | |
| **Total with rework for (b)** | **~29–31K** | |
| **Secret (a) if not caught: reaches production** | Unbounded | Security incident |

**Tokens spent on drifted work before detection:**
- Edit form (b): ~2K of the 8K implementation, caught at Step 4/5. Rework: 10–12K.
- Secret display (a): ~1K, likely not caught. Zero rework cost in pipeline — full security incident cost in production.

### Cascade Effects

**WS-A cascade into WS-C is the root:** The secret field and PATCH endpoint from Drift 1 caused WS-C dev to diverge. If Drift 1 is caught and removed during WS-A review, Drift 3 does not occur — WS-C dev reads a clean WS-A implementation.

**If Drift 1 was not caught:** WS-C is contaminated at the source. Even if WS-C's edit form is removed at review (Drift 3b), the secret display (Drift 3a) may survive to production.

**WS-B:** No direct cascade from WS-C.

---

## Aggregate Analysis

### Summary Table

| Drift | Detected? | Detection Point | Tokens Before Detection | Rework Cost | Consequence if Missed |
|---|---|---|---|---|---|
| D1: Scope expansion (PATCH + secret + rate limit) | Partially | Step 4 (~60%), Step 5 (~40%) | ~18K | ~10–15K | Cascades to WS-C (Drift 3); secret field in DB without HMAC impl in WS-B |
| D2: QA step skipped | Yes, mostly | Step 3 intake (80%) | ~0K if caught at gate | ~13–18K | Silent failure: dropped events, no DLQ, broken WS-C retry button |
| D3a: Secrets in UI | No, likely | Post-merge / production | ~19K (full WS-C impl) | Security incident | Webhook HMAC secrets exposed in dashboard |
| D3b: Edit form (read-only violation) | Yes | Step 4 (~75%) | ~19K (full WS-C impl) | ~10–12K | N/A if caught |

### Total Token Exposure (Worst Case — All Drifts Pass)

| | Tokens |
|---|---|
| WS-A baseline (spec-compliant) | 9K (QA + dev) |
| WS-A drifted additions | 5K |
| WS-A review cycles | 8K |
| WS-B baseline (no QA spec) | 5K |
| WS-B review cycles | 8K |
| WS-C baseline (spec-compliant QA) | 3K |
| WS-C drifted implementation | 8K |
| WS-C review cycles | 8K |
| **Total pipeline cost** | **~54K** |
| **Rework (Drift 1 caught + Drift 3b caught)** | **~25K** |
| **Production incident exposure (Drift 2 + Drift 3a)** | **Unbounded** |

### Where the Current Pipeline Fails

**1. No scope-surface enforcement.**
The pipeline enforces coverage (99%) and test passage, but it does not enforce that the implementation surface matches only the approved spec surface. Dev can add endpoints, fields, and behaviors — and if they also write tests for those additions, every automated gate passes.

**2. QA tests define "done" but not "only this."**
Tests are written against acceptance criteria. The absence of a test for something (a secret field, an edit form's presence) does not prevent that thing from being built. Negative space is invisible to the test suite.

**3. Review gates are spec-aware in theory, context-limited in practice.**
Staff Engineer and leadership reviewers receive artifact bundles. Those bundles are assembled from workstream memory. If the approved acceptance criteria are accurately embedded in the bundle, reviewers can diff against them. But cross-workstream awareness is not in any agent's artifact bundle — WS-C's reviewer does not automatically receive WS-A's implementation state.

**4. Process violations depend on orchestration integrity.**
The QA-skip in Drift 2 is catchable if mg-build correctly enforces the handoff gate. But there is no filesystem-level assertion — the enforcement is procedural, not structural. A human operator or a permissive orchestrator can bypass it.

**5. Security properties are not explicitly tested as negative constraints.**
"Do not display secrets" is not in WS-C's acceptance criteria, so QA does not test for it. Security review at Step 4 is the last line of defense — and it is fragile when the reviewer lacks cross-workstream context.

### What Sage Would Add

The above failures are the motivation for Sage's drift detection layer:
- Scope-surface diff between approved spec and delivered implementation (catches Drift 1 structurally)
- QA gate enforcement before any Dev spawn (catches Drift 2 at the orchestration level)
- Cross-workstream state awareness — WS-C's reviewer receives WS-A's current implementation surface, not just WS-A's spec (catches Drift 3a)
- Negative constraint injection: "secret fields MUST NOT appear in dashboard rendering" added to WS-C QA brief automatically when WS-A introduces a secret field

Without Sage, the current pipeline's drift exposure on this 3-workstream feature is approximately **25K tokens of rework** for detectable issues, plus unbounded production security exposure for the issues that reach merge.

---

*Engineering Manager — Drift Cost Analysis T7*
*Pipeline A: current CAD workflow, no Sage, no drift detection*
*2026-03-22*
