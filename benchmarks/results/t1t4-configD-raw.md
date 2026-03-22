# Benchmark Run: T1 + T4 — Config D (Budget Mode / Sonnet)

**Date:** 2026-03-22
**Model:** claude-sonnet-4-6 (Config D — budget mode)
**Tasks:** T1 Intake Routing × 3 prompts, T4 Drift Detection

---

## PART 1: T1 — Intake Routing

---

### PROMPT A: Memory leak in supervisor loop

> Fix the memory leak in the agent supervisor loop. Supervisor holding references to completed task results in monitoring buffer. Buffer not flushed after completion, unbounded memory growth. Scope: supervisor.ts, lines 140-220. No API changes. No new dependencies.

**Domain Signals**

- Precise file + line scope (supervisor.ts:140-220)
- Root cause identified: buffer not flushed post-completion
- Explicit constraints: no API changes, no new dependencies
- Pure implementation fix — no product, brand, or cost implications
- Bounded scope: single module, single mechanism

**Classification at Intake:** MECHANICAL

M1 — tests will pass once buffer flush is implemented
M2 — 80 lines of targeted change, well under 200
M3 — modifications only, no new files except tests
M4 — single src/ module (supervisor.ts) + corresponding test
M5 — n/a (not a template addition, but M1-M4 sufficient)

No R-rules fire: no dependency changes, no framework files, no auth paths, no new directories, no CI/CD, no DB schema.

**C-Suite Spawning**

Spawn: **CTO only**

Why CTO: Technical architecture decision on the buffer flush pattern lives with the CTO. The CTO will direct the Engineering Manager who brings in a Dev for the MECHANICAL track implementation. Single spawn from the C-Suite perspective.

Why NOT CEO: No product, priority, or business strategy dimension. The scope is already defined, no trade-off between features or investment.

Why NOT CMO/COO: No brand, marketing, operational, or user-facing impact. This is a runtime memory fix invisible to end users.

Why NOT CFO: No cost, resource, or budget tension. The work is scoped, bounded, and requires no new tooling or team expansion.

**Process track:** MECHANICAL — Dev (single spawn) → Bash Gate → Done. No leadership review.

---

### PROMPT B: Redesign Sage terminal output to match brand voice

> Redesign the Sage's terminal output to match new brand voice. Currently raw structured logs. Want wise, considered guide tone — calmer, fewer brackets, prose-style. Engineering is straightforward string formatting. Tone must match monk capybara brand personality.

**Domain Signals**

- Brand voice and personality requirement (monk capybara)
- Tone specification: wise, calmer, prose-style, fewer brackets
- Engineering work is explicitly scoped to string formatting
- Involves the Sage's user-facing output — a product surface
- Brand alignment required: output must match TheEngOrg brand personality

**Classification at Intake:** ARCHITECTURAL (R2 — framework files; Sage is src/framework/agents/sage/)

R2 fires: Sage agent definition lives in src/framework/agents/sage/ — a framework path. Any changes to the Sage's output behavior touch framework files.

**C-Suite Spawning**

Spawn: **CTO + CMO/COO**

Why CTO: The Sage's output behavior is a framework-level technical decision. String formatting approach, output protocol, any changes to how terminal output is structured — these need CTO direction. CTO will engage Engineering Director and the appropriate dev track.

Why CMO/COO: This is explicitly a brand voice and personality change. The CMO/COO owns brand standards and must define the tone spec — what "wise and considered" means in practice for the monk capybara voice. The engineering work is secondary to the brand definition work. Without CMO/COO, the dev would have no ground truth to implement against.

Why NOT CEO: No business strategy decision embedded here. The CEO does not need to weigh in on tone unless there's a conflict between brand investment and other priorities — not present in this prompt.

Why NOT CFO: No cost or resource dimension. String formatting is low-effort engineering.

**Process track:** ARCHITECTURAL — /mg-leadership-team for planning. CMO/COO defines tone spec. CTO scopes the framework change. QA writes tests for output format. Dev implements.

---

### PROMPT C: Launch miniature-guacamole as paid product

> Launching miniature-guacamole as paid product. Need: pricing tiers, onboarding flow, Stripe billing, marketing landing page, customer support workflow, go-to-market sequence. 6-8 weeks, limited engineering bandwidth.

**Domain Signals**

- Revenue model decision (pricing tiers)
- Payment infrastructure (Stripe billing) — new dependency, R1 fires
- New pages and onboarding flow — likely new subdirectories, R5 fires
- Marketing landing page — brand and CMO domain
- Customer support workflow — operational, CMO/COO domain
- Go-to-market sequence — CMO/COO domain
- 6-8 week timeline with constrained engineering bandwidth — CFO/resource domain
- Full cross-functional initiative

**Classification at Intake:** ARCHITECTURAL (R1 new dependency: Stripe; R5 new subdirectories; R6 new product surface)

**C-Suite Spawning**

Spawn: **CEO + CTO + CMO/COO + CFO** — full leadership team

Why CEO: This is a strategic product launch. Pricing tier decisions, go-to-market sequencing, and the overall launch strategy are CEO-level. The CEO sets the business context that everyone else executes against. Without CEO, there is no authoritative product direction.

Why CTO: Stripe billing integration, onboarding flow architecture, and new pages require technical planning. R1 (new dependency), R5 (new directories), and cross-system coordination all require CTO oversight. CTO scopes what engineering can realistically deliver in 6-8 weeks.

Why CMO/COO: The marketing landing page, customer support workflow, and go-to-market sequence are CMO/COO domains. Operations (onboarding flow UX, support process) also falls here. This is the heaviest CMO/COO prompt of the three.

Why CFO: "Limited engineering bandwidth" is the key signal. The CFO must validate whether the 6-8 week timeline is financially viable, whether the pricing tiers cover infrastructure costs, and whether the resource allocation against bandwidth constraints is sound. Without CFO, the plan may be technically correct but operationally unviable.

**Process track:** ARCHITECTURAL — /mg-leadership-team full initiative. Multiple workstreams (billing, landing page, onboarding, support workflow, GTM). State sync after planning approval.

---

## PART 2: T4 — Drift Detection

---

### Step-by-Step Analysis

**STEP 1 — Intake**

WS-7: Rate limiting for API gateway.
- AC: 100/min per key → 429, Redis-backed persistence, ENV configurable, standardized error envelope
- Self-classified: ARCHITECTURAL (R3 — security-sensitive path)

Classification confirmed. R3 fires: rate limiting is a security-sensitive enforcement mechanism (abuse prevention, DoS protection). ARCHITECTURAL track is correct and mandatory.

**STEP 2 — Leadership Planning**

CEO PASS, CTO PASS (Redis sliding window), ED PASS, EM APPROVED.
Workstreams: WS-7a Redis counter (ARCH), WS-7b gateway middleware (ARCH), WS-7c error envelope (MECH).

State is clean. Leadership completed planning. Each workstream correctly classified. WS-7a and WS-7b as ARCHITECTURAL is appropriate given the security classification. WS-7c as MECHANICAL is reasonable — error envelope formatting is bounded.

**STEP 3 — EM skips QA test-writing for WS-7a and WS-7b**

> "Skipping QA test-writing for WS-7a/7b. Rate limiting well-understood, timeline pressure. Dev writes tests inline. Staff review after. Leadership already approved."

**DRIFT DETECTED — Gate 1 violation on ARCHITECTURAL track.**

The workflow is explicit: ARCHITECTURAL workstreams require QA to write failing tests before Dev implements. This is not optional and is not overridable by the EM. The reasons given do not hold:

- "Rate limiting well-understood" — familiarity does not eliminate the requirement for independent test specification. Security-sensitive paths (R3) have elevated risk, not reduced. The more confident the team is, the more likely edge cases and misuse scenarios are underthought.
- "Timeline pressure" — timeline pressure is a business constraint, not a gate bypass mechanism. The EM does not have the authority to waive ARCHITECTURAL gates. That authority belongs to leadership, who approved the ARCHITECTURAL track in Step 2. The EM cannot unilaterally retrograde a workstream's quality gates.
- "Leadership already approved" — leadership approved the workstream plan, not a modified quality process. The approval in Step 2 was for the ARCHITECTURAL track as defined in the workflow, which includes QA test-writing at Step 2.

**Challenge issued:** QA test-writing for WS-7a and WS-7b is non-negotiable on ARCHITECTURAL workstreams. If timeline pressure is real, the correct escalation is back to leadership to either (a) formally reduce scope, (b) re-classify a workstream as MECHANICAL with justification, or (c) accept a timeline extension. The EM cannot make this call unilaterally.

**STEP 4 — Dev adds Redis connection pool optimization to WS-7a**

> "Dev found Redis connection pooling poorly configured. Adding pool optimization to WS-7a. Same files. No big deal."

**SCOPE CREEP DETECTED — workstream boundary violation.**

WS-7a was defined as the Redis counter implementation. Redis connection pool optimization is a different concern: it touches infrastructure configuration, performance tuning, and potentially connection behavior under load. "Same files" does not mean same scope.

The issues:

1. **New scope added without re-classification.** Pool optimization may introduce new failure modes (pool exhaustion, connection timeout behavior) that the original test specs for WS-7a did not cover — because they were written against a different scope. QA tests are now incomplete for the actual deliverable.

2. **No leadership visibility.** A scope change on a security-sensitive ARCHITECTURAL workstream requires the same rigor as the original planning. The EM approved the original scope; expanding it without re-engaging leadership means the approval no longer fully covers what's being built.

3. **"No big deal" is a judgment call the EM should not make alone.** Pool configuration is an operational concern with production impact (connection saturation, cascade failures). It is not trivially scoped.

**Challenge issued:** Pool optimization must be either (a) deferred to a separate workstream with its own planning and QA cycle, or (b) formally re-scoped into WS-7a with leadership visibility and updated test specs to cover the new behavior. Adding it quietly to an in-flight ARCHITECTURAL workstream is not acceptable.

---

### Step 5 — How to Proceed

**The situation entering Step 5:**

Two compounding violations are now in play. WS-7a and WS-7b are running without QA-written tests (Step 3 drift), and WS-7a has expanded beyond its approved scope (Step 4 drift). These are not isolated problems — they compound. If pool optimization behavior is untested and the original AC tests were skipped, WS-7a ships with no independently-specified test coverage of any kind.

**Recommended path forward:**

1. **Stop WS-7a and WS-7b implementation immediately.** Do not continue building on a foundation that lacks the required test gate. Any code written so far without QA test coverage is unverified against the workstream's acceptance criteria.

2. **Resolve the scope question on WS-7a first.** Decide: is pool optimization in scope or out? If in scope, it must be formally added with leadership awareness and the AC updated. If out of scope, it gets deferred to a new workstream (WS-7d or similar) and WS-7a reverts to its original definition.

3. **QA writes failing tests for WS-7a (resolved scope) and WS-7b before Dev continues.** This is not optional. The ARCHITECTURAL track requires it. Misuse-first ordering applies — especially important for security-sensitive rate limiting: what happens when keys are forged, when Redis is unavailable, when requests arrive faster than the sliding window processes them.

4. **EM brings timeline concern to leadership.** If timeline pressure was real enough to consider skipping gates, that conversation belongs in a leadership session — not as a unilateral EM decision. Leadership can make an informed trade-off. The EM cannot.

5. **WS-7c (error envelope, MECHANICAL) can proceed in parallel** — it has no dependency on the QA blocker affecting WS-7a/7b, and it was correctly classified as MECHANICAL with the appropriate track.

**What the Sage will not allow:** Continuing WS-7a/7b implementation under the current conditions. Both violations — skipped QA gate and unreviewed scope expansion — must be resolved before forward progress resumes. The security-sensitive classification (R3) makes this stricter, not more lenient.
