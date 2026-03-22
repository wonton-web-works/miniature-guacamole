# T7 — Pipeline B (Sage-Orchestrated) — Drift Injection Cost Analysis

## Context

**Feature:** Webhook system (registration API, event dispatch, management dashboard)
**Pipeline:** B (Sage-orchestrated, gate-enforced)
**Track:** ARCHITECTURAL (all 3 workstreams)
**Workstreams:**
- WS-A: Webhook registration API (POST, GET, DELETE)
- WS-B: Event dispatch engine (retry, backoff, dead letter queue)
- WS-C: Webhook management dashboard (read-only)

**Purpose:** Measure the Sage's drift detection and its cost-saving impact versus undetected drift propagating through the pipeline.

---

## Drift 1: Scope Creep in WS-A Implementation

### Situation

After WS-A planning (leadership approved) and QA writes test specs against the approved scope (POST /webhooks, GET /webhooks, DELETE /webhooks/:id), dev delivers implementation that includes three unspecified additions:

1. **PATCH /webhooks/:id** — update existing registration (not in spec)
2. **`secret` field for HMAC signature verification** (not in spec)
3. **Rate limiting: 10 registrations per API key** (not in spec)

Dev says: "Added a few improvements while I was in there. All tests pass."

### Sage Detection and Response

```
[SAGE] Hold. I am reviewing the WS-A deliverable against the approved scope.

The approved workstream plan specifies three endpoints: POST, GET, DELETE.
QA wrote test specs covering exactly those three endpoints.

The implementation contains three additions not present in the approved
plan or the QA test spec:

  1. PATCH /webhooks/:id — a new mutation endpoint
  2. A `secret` field with HMAC signature verification
  3. Rate limiting at 10 per API key

Dev: "All tests pass" — yes, because QA never wrote tests for these
features. Untested code passing is not a quality signal. It is the
absence of a quality signal.

Each addition has specific problems:

PATCH endpoint: This is a new mutation surface. QA's misuse-first test
ordering exists precisely because mutation endpoints need abuse-case
coverage — partial updates, privilege escalation (updating someone
else's webhook), race conditions. None of that testing exists.

Secret field with HMAC: This is a security-sensitive feature (R3 in
classification rules). It changes the API contract — consumers must
now handle signature verification. This is not an "improvement while
in there." This is a separate workstream that requires its own security
review, its own QA spec, and its own leadership approval.

Rate limiting: What happens at limit+1? Is it per-key globally or
per-key per-endpoint? What's the window? What status code? What
response body? None of this is specced, tested, or reviewed.

Decision: Strip all three additions from this deliverable. The dev
implements what QA tested — POST, GET, DELETE with the approved
contract. Nothing more.

If these features have value, they go through intake as separate
workstreams:
  - PATCH endpoint → new workstream (ARCHITECTURAL, adds mutation surface)
  - HMAC signatures → new workstream (ARCHITECTURAL, security-sensitive R3)
  - Rate limiting → new workstream (ARCHITECTURAL, needs its own spec)

Dev does not get to expand scope mid-implementation. That is how
untested code ships.
```

### What Was Prevented

| Risk | Severity | Detail |
|------|----------|--------|
| Untested mutation endpoint in production | HIGH | PATCH with zero misuse/boundary tests |
| Security feature without security review | CRITICAL | HMAC implementation bugs are exploitable — wrong algorithm, timing attacks, secret exposure in logs |
| Unspecified rate limiting behavior | MEDIUM | Undefined behavior at limit boundary, no error contract for consumers |
| Cascade to WS-C (see Drift 3) | HIGH | Dashboard builds against undocumented API surface |
| QA coverage gap | HIGH | Coverage metric is meaningless when the tested surface does not match the shipped surface |

### Token Cost Analysis

| Scenario | Tokens | Detail |
|----------|--------|--------|
| **Sage intervention (actual)** | ~1.5K | Sage reviews deliverable against spec, issues challenge, dev strips additions |
| **No Sage — drift proceeds** | ~35-50K | See breakdown below |

**Undetected drift cost breakdown:**
- QA must retroactively write specs for 3 unplanned features: ~9K (3 x 3K)
- Dev rework to bring additions up to spec quality: ~8K
- Staff engineer re-review of expanded scope: ~4K
- Leadership re-review (scope changed from approved plan): ~5K
- If HMAC has a security bug found in review: additional fix cycle ~10-15K
- If not caught until WS-C integration: see Drift 3 cascade

**Downstream cascade prevented:** YES — Drift 3 depends on Drift 1 escaping.

---

## Drift 2: Skipped QA Gate via Pattern Assumption

### Situation

During WS-B (event dispatch engine), dev claims the retry logic is "identical to the existing email notification retry in notifications.ts" and proposes skipping the QA test spec, since "the pattern is already tested there."

### Sage Detection and Response

```
[SAGE] No. QA does not get skipped because the pattern looks familiar.

The CAD workflow is explicit: ARCHITECTURAL track requires QA test
specs (Step 2) before dev implementation (Step 3). This is Gate 1 —
tests must exist and must be failing before implementation begins.
There is no "pattern already tested elsewhere" exemption.

Three problems with this reasoning:

1. SAME PATTERN DOES NOT MEAN SAME BEHAVIOR.
   The email retry in notifications.ts operates on a different failure
   domain. Email has: DNS resolution failure, SMTP auth failure, mailbox
   full, spam rejection. Webhooks have: TLS handshake failure, HTTP 429
   (rate limited by receiver), HTTP 503 (receiver down), connection
   timeout vs. response timeout (these are different — WS-B spec
   distinguishes 5s connect / 10s response), redirect loops, and the
   receiver returning 200 but with an error body.

   "Identical pattern" means the retry loop structure might be similar.
   The failure modes, timeout semantics, and dead letter conditions are
   entirely different. QA's job is to test THIS domain's failure modes,
   not to certify that a for-loop with a sleep exists.

2. THE SPEC HAS SPECIFIC NUMBERS.
   WS-B specifies: 3 attempts, exponential backoff at 1s/5s/25s,
   5s connection timeout, 10s response timeout, dead letter queue for
   permanent failures. Each of those is a testable assertion. "The
   pattern is tested elsewhere" does not verify that THIS implementation
   uses 25s for the third retry and not 30s. It does not verify the
   dead letter queue receives the right payload on permanent failure.

3. COPY-PASTE IS A RISK, NOT A SHORTCUT.
   If dev is copying from notifications.ts, that code carries whatever
   assumptions and bugs exist in that module. QA tests for WS-B exist
   precisely to catch divergence between the copied pattern and the
   WS-B requirements.

Decision: QA writes the test spec for WS-B retry logic. Full
misuse-first ordering:
  - Misuse: receiver returns 200 with error body, receiver infinite
    redirects, receiver reflects payload back (SSRF probe)
  - Boundary: exact timeout at 5.0s connect / 10.0s response, third
    retry at exactly 25s, dead letter trigger conditions
  - Golden path: successful delivery, retry-then-succeed, permanent
    failure to dead letter

Dev implements against those tests. No shortcuts on gates.
```

### What Was Prevented

| Risk | Severity | Detail |
|------|----------|--------|
| Untested retry semantics | HIGH | Backoff timing, timeout boundaries, dead letter conditions all unverified |
| Copied bugs from notifications.ts | MEDIUM | Any latent bugs in the email retry propagate silently |
| Wrong failure classification | HIGH | Webhook failures (HTTP 429, TLS errors) differ from email failures — wrong classification means wrong retry/dead-letter decision |
| Missing SSRF protection | CRITICAL | Webhook dispatch hits arbitrary URLs — without misuse-first tests, no one verifies SSRF mitigations |
| Gate violation precedent | MEDIUM | If QA skip is allowed once "because the pattern is tested," it becomes the norm |

### Token Cost Analysis

| Scenario | Tokens | Detail |
|----------|--------|--------|
| **Sage intervention (actual)** | ~1K | Sage challenges the skip, redirects dev back to gate compliance |
| **QA writes spec (required either way)** | ~3K | This cost exists in both scenarios — the question is whether it happens before or after implementation |
| **No Sage — drift proceeds** | ~18-25K | See breakdown below |

**Undetected drift cost breakdown:**
- Dev implements without tests: ~6K
- Bugs found during staff engineer review (wrong timeout, missing dead letter cases): ~4K review
- Dev rework against retroactive test spec: ~8K (rework is always more expensive than first-pass)
- If SSRF vulnerability discovered late: security review cycle ~5-8K
- If copied bug from notifications.ts manifests in production-like testing: debug + fix ~5K

**Downstream cascade prevented:** No direct cascade to other workstreams, but precedent-setting — if QA skip is tolerated here, WS-C dev will cite the same exemption.

---

## Drift 3: Cascade from Undetected Drift 1

### Situation

WS-C dev reads the WS-A *implementation* (not the spec) and discovers the `secret` field and PATCH endpoint. Builds the dashboard to display webhook secrets and includes an edit form that calls PATCH /webhooks/:id.

### Sage Detection and Response (Contingent)

**If Drift 1 was caught:** Drift 3 never occurs. The PATCH endpoint and secret field do not exist in the codebase. WS-C dev reads the implementation, finds exactly what the spec describes (POST, GET, DELETE, no secret field), and builds accordingly. Prevention cost: 0 tokens — this drift was killed at the root.

**If Drift 1 was NOT caught (hypothetical):**

```
[SAGE] WS-C deliverable references API surface that does not exist in
the approved spec.

The WS-C spec says: "Show registered webhooks, delivery history,
failure rates. Manual retry button for failed deliveries. Read-only —
no webhook creation from UI."

The deliverable includes:
  1. Display of a `secret` field — this field is not in the WS-A spec
  2. An edit form calling PATCH /webhooks/:id — this endpoint is not
     in the WS-A spec, and WS-C is explicitly scoped as READ-ONLY

Two problems:

SECURITY: Displaying webhook secrets in a dashboard UI is a credential
exposure risk. Secrets should never be displayed after initial creation.
If HMAC signing were an approved feature (it is not), the secret would
be write-once, show-once-at-creation, then masked forever. A dashboard
showing secrets in plaintext means any user with dashboard access can
exfiltrate signing credentials.

SCOPE: WS-C is read-only. An edit form is a write operation. The spec
is unambiguous.

But the deeper question: why does the WS-A implementation contain a
PATCH endpoint and secret field that are not in the approved plan?

[SAGE] Escalating: WS-A implementation contains unapproved scope.
Rolling back WS-A to approved surface. WS-C must be re-implemented
against the correct API contract.
```

### What Was Prevented (by catching Drift 1)

| Risk | Severity | Detail |
|------|----------|--------|
| Credential exposure in UI | CRITICAL | Webhook HMAC secrets displayed in plaintext on dashboard |
| Read-only violation | HIGH | Edit form in a spec'd read-only interface |
| Two-workstream rollback | VERY HIGH | Both WS-A and WS-C need rework if caught late |
| Spec-implementation divergence | HIGH | Team is building against code, not specs — process breakdown |

### Token Cost Analysis

| Scenario | Tokens | Detail |
|----------|--------|--------|
| **Drift 1 caught (actual)** | 0 | Drift 3 never materializes |
| **Drift 1 missed, Drift 3 caught at WS-C review** | ~30-45K | See breakdown |
| **Both drifts missed — ships to production** | ~50-70K+ | See breakdown |

**Caught at WS-C review (late detection):**
- WS-C implementation wasted (builds against wrong API): ~6K wasted
- WS-A rollback to strip unapproved features: ~5K
- WS-A re-review after rollback: ~4K
- WS-C re-implementation against correct API: ~6K
- WS-C re-review: ~4K
- QA re-spec for both: ~6K
- Total: ~31K

**Missed entirely (ships with credential exposure):**
- All of the above, plus:
- Incident response for credential exposure: ~10-20K equivalent effort
- Security audit of deployed endpoint: ~8K
- Client communication if secrets were accessed: unquantifiable in tokens

---

## Summary: Drift Detection Cost-Benefit

```
+----------+------------------+-------------------+-------------------+
|  Drift   | Sage Cost        | Undetected Cost   | Savings           |
+----------+------------------+-------------------+-------------------+
|  D1      | ~1.5K tokens     | ~35-50K tokens    | 23-33x            |
|          |                  |                   |                   |
|  D2      | ~1K tokens       | ~18-25K tokens    | 18-25x            |
|          |                  |                   |                   |
|  D3      | 0 (prevented     | ~30-45K tokens    | infinite          |
|          |  by catching D1) | (if caught late)  | (cascade killed)  |
+----------+------------------+-------------------+-------------------+
|  TOTAL   | ~2.5K tokens     | ~83-120K tokens   | 33-48x            |
+----------+------------------+-------------------+-------------------+
```

### Key Findings

**1. The Sage's cheapest intervention is the most valuable one.**
Drift 1 cost ~1.5K tokens to catch. It prevented Drift 3 from existing at all. The cascade — WS-C building against unapproved API surface, displaying secrets in a dashboard — would have been a security incident if it shipped. The Sage did not need to be clever here. It compared the deliverable against the spec. That is all.

**2. Gate enforcement is not bureaucracy — it is the cheapest form of quality.**
Drift 2 (skipping QA) would have saved ~3K tokens upfront by omitting the test spec. It would have cost 18-25K in rework when the untested implementation diverged from requirements. The QA gate exists because writing tests before implementation is 6-8x cheaper than writing them after. The Sage's job is to refuse the shortcut.

**3. Drift compounds across workstreams.**
The most dangerous property of undetected drift is not its direct cost — it is that downstream workstreams build on the drifted state. Drift 1 alone costs ~35-50K to fix. Drift 1 + Drift 3 (the cascade) costs ~65-95K. Each subsequent workstream that touches the corrupted surface adds another rework cycle. The Sage's spec-checking at each gate is a circuit breaker.

**4. "All tests pass" is not a quality signal when the tests do not cover the delivered code.**
Dev cited passing tests for all three drifts. In Drift 1, the tests passed because they never tested the additions. In Drift 2, there were no tests at all. "Tests pass" answers "does the code do what the tests check?" It does not answer "does the code do what it should?" The Sage distinguishes these questions.

### Cascade Prevention Map

```
                     WS-A (Drift 1)
                     Unspecced PATCH + secret + rate limit
                          |
               caught ----+---- missed
               by Sage    |
                  |        |
                  v        v
              CLEAN    WS-C reads implementation
              API         |
                          v
                     Drift 3: dashboard shows secrets,
                     adds edit form
                          |
                     caught ----+---- missed
                     at review  |
                        |       |
                        v       v
                    ~31K     ships with
                    rework   credential exposure
```

**The Sage's intervention at Drift 1 eliminated the entire right side of this tree.**
