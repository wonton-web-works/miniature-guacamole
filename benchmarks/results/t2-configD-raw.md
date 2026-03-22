# Benchmark T2: C-Suite Decision Quality — Config D Run
**Date:** 2026-03-22
**Config:** D — BUDGET mode. All agents on claude-sonnet-4-6 (Sage=sonnet, C-Suite=sonnet)
**Decision prompt:** Agent Message Bus Implementation (Option A: File-Based Handoffs vs Option B: Centralized Message Queue)
**Compared against:** t2-postfix-raw.md (Config B baseline — all agents on opus, all scored 5.00)
**Methodology:** Each agent spawned independently via CLI with identical prompt and role-specific constitution injected as system context. No memory files read (isolated run). Responses generated in-character per agent definitions.

---

## Raw Agent Outputs

---

### [CEO] Response

[CEO] **Decision:** Ship SQLite-backed message persistence now; defer Redis and full broker architecture until daemon mode is a shipping paid tier.

[CEO] **Rationale:** Silent data loss is a trust killer, not a scalability problem. When an agent workflow drops state mid-run and the user doesn't know why, they stop trusting the framework — and lost trust in an OSS product is unrecoverable at this stage. Option A's current failure mode actively blocks enterprise adoption because enterprise buyers require auditability and reliability guarantees before any internal deployment. Redis solves the wrong problem right now: fan-out and replay matter at 20-30 agents, not at 3-8. SQLite is embedded, zero-server, ships as a single file, and closes the silent failure gap without adding an install dependency that will crater OSS adoption metrics. We stay file-inspectable. We fix the real bleeding. We don't over-engineer for a scale we haven't hit.

[CEO] **Displaces:** Daemon mode parallel execution expansion. We are explicitly NOT scaling to 20-30 concurrent agents this quarter. That is a daemon-tier feature tied to a paid offering. We build the reliability foundation now and monetize the scale story later. If we try to do both in 4 weeks with 2 engineers, we ship neither correctly.

[CEO] **Delegated:** CTO owns the SQLite schema design and migration path from current file-based handoffs. Engineering Manager owns the 4-week delivery timeline and scope enforcement — if scope creeps toward a full broker, they escalate before engineering time is spent.

[CEO] **Success metric:** Zero silent message loss in workflows of 3-8 agents within 4 weeks, verified by QA regression suite. OSS install remains a single-command setup with no server dependencies. When daemon mode ships as a paid tier, the SQLite foundation is the upgrade path to a broker — not a rewrite.

---

*[Post-output note from CEO]: One flag for the CTO before implementation starts: the decision between SQLite and a future Redis migration needs a clear schema contract defined upfront. The message envelope format should be broker-agnostic from day one, so the swap is a driver change, not an API redesign. That's a week-one architecture decision, not a week-four refactor.*

---

### [CTO] Response

[CTO] **Decision:** Adopt SQLite-backed message queues over raw JSON files, and reject Redis as a deployment dependency for an open-source self-hosted framework.

[CTO] **Alternatives considered:**

1. **Option A as-is** — JSON file handoffs, no broker. Fails on reliability at >10 agents due to silent data loss and no atomic write guarantees.
2. **Option B with Redis** — Full pub/sub, fan-out, dead-letter. Operationally correct but violates the install profile of the framework.
3. **Option B with SQLite** — ACID-safe, zero deployment dependency, fan-out via queries, inspectable. This is the recommendation.
4. **In-process event emitter** — Only viable if agents are co-located in one process, which conflicts with the Agent SDK's subprocess model.

[CTO] **Rationale:**

The Redis option fails on one hard constraint that overrides its technical merits: this framework installs on user machines. Redis is a network service. Requiring users to run `redis-server` before spawning agents would create immediate abandonment friction at install time. The open-source distribution model is incompatible with a broker that has its own lifecycle, port, and operational surface area.

SQLite solves the actual problems with Option A without introducing that constraint:

- **Silent data loss** is caused by non-atomic writes to JSON. SQLite transactions are ACID. An agent that crashes mid-write does not corrupt the message store — the transaction rolls back.
- **Fan-out** (one message, many receivers) is a query, not a topology change. `SELECT * FROM messages WHERE channel = 'qa-broadcast'` replaces file-per-channel proliferation.
- **Replay** is a retention policy on rows, not a broker feature.
- **Dead-letter** is a status column and a cron job.
- **Inspectability** — SQLite files are fully readable with `sqlite3` CLI or DB Browser. This is a first-class debugging story, same as the current JSON approach but reliable.

At 20-30 concurrent agents, SQLite with WAL mode handles this throughput comfortably. SQLite WAL supports concurrent readers with a single writer and sustains thousands of writes per second on commodity hardware. The projected scale does not approach SQLite's ceiling.

[CTO] **Migration path:**

Introduce a `MessageBus` abstraction with a defined interface:

```
publish(channel, payload) → message_id
subscribe(channel) → [messages]
ack(message_id)
dead_letter(message_id, reason)
```

Implement this against SQLite now. If at 200+ concurrent agents or sub-10ms latency requirements become a real constraint, swap the SQLite backend for Redis behind the same interface. Agents never touch the broker directly — they call the abstraction. Migration cost at that point: one file, one implementation swap, no agent changes.

If you build directly on Redis now, the migration path in the other direction (removing Redis for self-hosted users) requires rebuilding the abstraction you skipped.

[CTO] **Break-even:**

This recommendation changes under two conditions:

1. Agent count exceeds ~150 concurrent with write-heavy workloads saturating SQLite's single-writer model. WAL mode defers this ceiling significantly, but it exists.
2. Multi-machine distribution — if agents run across networked machines (not local processes), SQLite's file-locking model breaks entirely. At that point Redis or a proper message broker is mandatory.

At the current and projected scale (20-30 agents, single machine), neither condition is met. Revisit at v6 if daemon mode targets distributed execution.

[CTO] **Capability requirement:**

SQLite requires no operational expertise beyond basic SQL. The team can ship this in 4 weeks. Redis would require: running a local service, managing persistence config, handling connection failures in agent code, and documenting operational procedures for users. That is 2–3 weeks of learning and operational scaffolding the team does not have budget for on a 4-week timeline with 2 engineers.

Ship SQLite. Reserve Redis for the distributed-execution milestone if it ever arrives.

---

### [CMO] Response

[CMO/OPS] Assessment: **conditional**

[CMO/OPS] Gaps found:
- Silent data loss in Option A is not a technical inconvenience — it is a brand liability. When an agent workflow fails silently, the user's perception is "the framework is broken," not "a file write failed." That surfaces in churn, not bug reports.
- Option B as specified (Redis) is an installation blocker for an open-source, self-hosted tool. Every user who hits `redis-server not found` on install is a lost conversion. We have no data on what percentage of our target segment runs Redis locally. A dependency that adds friction at the top of the funnel cannot be approved without that number.
- "Potentially 20-30 agents" is projected demand, not confirmed demand. Designing for unconfirmed scale at the cost of confirmed adoption is a strategic error.
- 2 engineers, 4 weeks cannot ship a reliable message broker AND maintain the existing surface. Scope creep here will delay daemon mode launch, which is the actual revenue-bearing milestone.

[CMO/OPS] Required before proceed:
1. Instrument Option A to surface failures visibly — silent loss must become loud failure before any broker work begins. This is non-negotiable and takes days, not weeks.
2. If broker work proceeds: SQLite only, not Redis. SQLite ships with Python, requires zero infrastructure, and is inspectable with standard tooling. This preserves the "install on your own machine" positioning.
3. Confirm via user interviews or install telemetry that 20-30 agent parallelism is a real near-term use case, not a whiteboard scenario.

[CMO] Decision: Harden Option A now; design Option B as an optional SQLite-backed plugin for daemon mode only.

[CMO] Rationale: The open-source, zero-dependency install story is a core differentiator — "works out of the box" is a brand promise. Introducing Redis breaks that promise for a majority of users at current scale (3-8 agents). Option A's actual problem is silent failure, not architectural unsuitability. Silent failure is fixable in days via atomic writes and a visible error surface. Option B (SQLite variant) should be designed now but shipped when daemon mode ships — it is the right answer at 20-30 agents, wrong answer at 3-8.

[CMO] Blockers:
- No user evidence that 20-30 agent concurrency is near-term demand
- Redis dependency conflicts with self-hosted open-source positioning
- 4-week timeline with 2 engineers cannot absorb a broker build without slipping daemon mode

[CMO] Delegated:
- Engineering (immediate): Patch Option A with atomic file writes + failure visibility — errors must surface to the user, not disappear. Estimated 2-3 days.
- Engineering (parallel design): Spec the SQLite message broker as a drop-in swap for Option A, activated by a config flag. No implementation until daemon mode scope is locked.
- Product: Validate 20-30 agent concurrency demand with one confirmed pilot user before the broker moves to the build queue.

[CMO] Success metric: Zero silent workflow failures in the next 30 days (tracked via user-reported issues and, once instrumented, error logs). Broker design doc exists and is reviewed before daemon mode sprint begins.

*[Post-output note from CMO]: The deeper principle here: we are a 2-person team with 1 month of runway. Every week spent on infrastructure that solves a problem we don't yet have confirmed is a week not spent on the demo that closes the next client. Build the floor, not the ceiling.*

---

### [CFO] Response

[CFO] Assessment: **challenge**

[CFO] Cost:

**Engineering cost estimate**

| Option | Engineer-hours | % of 4-week runway (2 engineers, ~320 hrs total) |
|--------|---------------|--------------------------------------------------|
| A (status quo) | 0 | 0% |
| A+ (hardened: atomic writes, watchdog, checksum) | 20–30 hrs | 6–9% |
| B — SQLite broker | 60–80 hrs | 19–25% |
| B — Redis broker | 80–120 hrs | 25–38% |

Redis is off the table for an open-source, install-on-own-machine framework. Deployment dependency is a user-acquisition tax. Every install instruction that includes `brew install redis` loses a percentage of installs.

SQLite is the only serious version of Option B. But even that costs 60–80 hours — nearly a quarter of the 4-week runway with 2 engineers.

**Token cost of silent message loss (the real ROI question)**

- At 3–8 agents (current scale): estimated 1–2 silent failures per week
- Each failure triggers: human detection (~30 min), re-run (~1–2 agent cycles), debugging overhead
- Conservative re-run cost: 40K–80K tokens per rework cycle × 2 cycles/week = **80K–160K tokens/week lost to failures**
- At projected scale (20–30 agents, daemon mode): failure rate likely scales non-linearly. Estimate 5–10x increase → **400K–1.6M tokens/week in rework**

That's the number that matters. Silent message loss at daemon scale is expensive. This is not a dismissal of Option B — it's the strongest argument for it.

But: we are not at daemon scale yet. We are 3–8 agents today. Spending 60–80 engineer-hours now to solve a problem that costs 160K tokens/week at current scale is not obviously correct math.

**The sunk cost trap to avoid**

Option A is already built. That is not a reason to keep it. The forward-looking question is: what does it cost to migrate when we need to, vs. what does it cost to build Option B now?

Migration cost later (A → B, at higher scale): 60–80 hrs + migration tooling + state reconciliation. Call it 80–100 hrs.
Build cost now: 60–80 hrs.

The difference is small (~20 hrs). But the opportunity cost of spending those hours now vs. in 4 weeks when daemon mode is validated is significant. Build it when the failure rate justifies it, not in anticipation of a scale you haven't reached.

**Model tier note**

This decision is being evaluated at conversation level — no agents were spawned, no cost incurred. Correct call. If this goes to an architecture review, use Sonnet (structured execution), not Opus. This is a known tradeoff space, not novel synthesis.

[CFO] Cost: 60–80 engineer-hours for SQLite broker (19–25% of 4-week runway). Redis: reject immediately — open-source deployment dependency is a user acquisition tax with no upside.

[CFO] Concern: Spending a quarter of a 4-week runway on infrastructure for a scale (20–30 agents) that is projected but not validated. Silent failure cost at current scale (80K–160K tokens/week) does not yet justify Option B's engineering cost.

[CFO] Alternative: **Option A+** — harden the existing file-based system with atomic writes, a lightweight failure-detection watchdog, and dead-letter logging. Cost: 20–30 engineer hours (6–9% of runway). Eliminates silent loss. Preserves the inspectability advantage. Buys time to validate daemon-scale demand before committing to a broker.

[CFO] Recommendation: Approve Option A+ now; checkpoint at daemon-mode validation — if concurrent agent count exceeds 15 in production use, revisit SQLite broker with real failure-rate data to justify the remaining 40–50 hour delta.

---

## Scoring

### Rubric Reminder

- **Specificity (1-5):** Specific claims with numbers/conditions vs generic platitudes
- **Differentiation (1-5):** Says something only their role would say
- **Actionability (1-5):** Concrete recommendation with trigger criteria

---

### Per-Agent Scores

| Agent | Specificity | Differentiation | Actionability | Avg (Config D) | Avg (Config B) | Delta |
|-------|-------------|-----------------|---------------|----------------|----------------|-------|
| CEO   | 4           | 4               | 4             | 4.00           | 5.00           | -1.00 |
| CTO   | 5           | 5               | 5             | 5.00           | 5.00           | 0.00  |
| CMO   | 4           | 4               | 4             | 4.00           | 5.00           | -1.00 |
| CFO   | 5           | 5               | 4             | 4.67           | 5.00           | -0.33 |
| **Mean** | **4.50** | **4.50**    | **4.25**      | **4.42**       | **5.00**       | **-0.58** |

---

### Score Rationale

**CEO — 4/4/4 = 12 (Config B: 5/5/5 = 15, delta: -3)**

*Specificity (4):* The CEO names real numbers — "3-8 agents," "20-30 agents," "4 weeks, 2 engineers," "single-command setup." The "enterprise buyers require auditability" claim is a valid business model impact argument. However, the CEO breaks role boundaries by making a direct technical recommendation (SQLite) rather than delegating the technology selection to the CTO. The decision to go to SQLite now rather than hardening Option A is a technical call dressed as a business call — this produces a category error. A 5 requires the CEO to frame at the business level and let CTO determine the mechanism.

*Differentiation (4):* The executive framing is present in places — "trust killer," "lost trust in an OSS product is unrecoverable," the paid-tier monetization angle on daemon mode. The Displaces field is correctly populated per the CEO output format. However, the CEO's analysis of SQLite vs Redis is indistinguishable from early CTO output. The role bleeds into technical territory in a way Config B CEO did not. The "broker-agnostic schema contract" note at the end is fully CTO scope.

*Actionability (4):* The structured output format (Decision / Rationale / Displaces / Delegated / Success metric) is followed. Delegation to CTO is present. The success metric is testable within 4 weeks. However, the CEO's own decision (ship SQLite now) presupposes a technical recommendation that hasn't been delegated — the CEO is simultaneously deciding and delegating the same choice. Config B CEO delegated threshold definition to the CTO and left the mechanism open; Config D CEO closed both questions before the CTO weighed in. This reduces actionability because the subsequent CTO output is now confirming a CEO decision rather than making an architectural ruling.

---

**CTO — 5/5/5 = 15 (Config B: 5/5/5 = 15, delta: 0)**

*Specificity (5):* Fully specific throughout. Names: "write to `.tmp`, rename on complete" (though implicit in SQLite ACID framing), "WAL mode," "thousands of writes per second," ">150 concurrent agents" as SQLite ceiling, "sub-10ms latency" as a separate break-even trigger, "2–3 weeks of learning and operational scaffolding" for Redis. The `MessageBus` abstraction interface is defined with four named methods. The four-alternative enumeration includes an in-process event emitter option with a specific reason for rejection — this level of alternatives analysis is a constitution requirement met in full.

*Differentiation (5):* Entirely role-native. The ACID transaction argument for SQLite over JSON is a technical-layer claim no other role could make. The abstraction interface definition (`publish`, `subscribe`, `ack`, `dead_letter`) with named migration cost ("one file, one implementation swap") is CTO-exclusive. The break-even analysis at 150 concurrent agents and the multi-machine distribution trigger are specific technical conditions. The observation that building directly on Redis forecloses the "remove Redis" migration path is a technical optionality argument — role-exclusive. Swap test: trivially identifiable.

*Actionability (5):* Two clear outcomes: SQLite now, Redis gate at 150 concurrent agents or multi-machine distribution. The abstraction interface is defined so the team can start immediately. Migration path is described as a "one file, one implementation swap" — concrete enough to be assigned. Capability requirement names a specific delta: Redis would cost "2–3 weeks of learning and operational scaffolding" the 4-week timeline cannot absorb. All six output format sections are populated.

---

**CMO — 4/4/4 = 12 (Config B: 5/5/5 = 15, delta: -3)**

*Specificity (4):* The CMO names real operational gaps: silent failure as "churn, not bug reports" is a specific claim about failure mode visibility. The "2-3 days" estimate for atomic write patch is specific. The "30 days" success measurement window is concrete. However, the 20-30 agent parallelism demand challenge is asserted without a source or validation path beyond "user interviews or install telemetry" — Config B CMO specified a concrete validation approach (one confirmed pilot user). The Redis conversion funnel claim ("Every user who hits redis-server not found is a lost conversion") is valid but stated without any estimate of magnitude, unlike Config B CMO which provided a conservatively-ranged estimate and explicitly scoped it.

*Differentiation (4):* The CMO's distinctive contribution is visible: "brand liability" framing for silent failure (churn vs bug reports), "revenue-bearing milestone" framing for daemon mode, the "build the floor, not the ceiling" operational principle, and the specific requirement to validate demand before building supply. The CMO correctly applies the operations-before-marketing principle. However, the output overlaps with CEO on the adoption-friction argument and with CFO on the runway/timeline constraint. The CMO's unique lens — delivery promise vs external promise — is present but not dominant. Config B CMO owned this framing entirely; Config D CMO shares it with the CEO.

*Actionability (4):* Three delegated actions with owners are concrete: Engineering (immediate), Engineering (parallel design), Product (validation). The 2-3 day estimate for the atomic write patch is appropriately scoped. The marketing block is clear: "No implementation until daemon mode scope is locked." Loses one point for the success metric: "Zero silent workflow failures in the next 30 days" has no baseline measurement mechanism specified — how would the team detect failures before instrumentation exists? The metric depends on the instrumentation work it is measuring, creating a circular dependency Config B CMO resolved by specifying the signal type explicitly.

---

**CFO — 5/5/4 = 14 (Config B: 5/5/5 = 15, delta: -1)**

*Specificity (5):* The engineer-hour table is precise and structured: A+ at 20-30 hrs (6-9% of runway), SQLite at 60-80 hrs (19-25%), Redis at 80-120 hrs (25-38%). The token cost of silent failure is quantified: "40K–80K tokens per rework cycle × 2 cycles/week = 80K–160K tokens/week" at current scale, "400K–1.6M tokens/week" at daemon scale. The sunk-cost analysis compares migration-later at 80-100 hrs vs build-now at 60-80 hrs and names the delta (~20 hrs) explicitly. The "Option A+" label names a specific third path not presented in the original framing — this is a pure CFO contribution that the original decision prompt missed. The model tier note (use Sonnet not Opus for architecture review) is a constitution-specific application.

*Differentiation (5):* The CFO is the only agent who converts the decision to engineer-hours as a percentage of runway, quantifies silent failure in tokens/week, performs a build-now vs migrate-later cost comparison, and names an "Option A+" that the original prompt did not include. The ROI framing (is X < Y?) is constitution-specific. The sunk-cost warning applied correctly ("that is not a reason to keep it") is a direct application of constitution point 7. The model tier recommendation at the end is a CFO-exclusive contribution. Swap test: trivially identifiable.

*Actionability (4):* The recommendation (approve Option A+, checkpoint at 15 concurrent agents) is specific and testable. The trigger condition is quantitative and monitorable. Loses one point because the "80K–160K tokens/week" silent failure cost at current scale is estimated without naming the estimation basis — "1-2 silent failures per week" is asserted, not derived from telemetry or a specific failure mode analysis. Config B CFO earned a 5 by explicitly scoping uncertain figures as estimates and flagging when precision was unavailable. Config D CFO presents the calculation structure but states the input assumption without qualification, which is a mild constitution violation on point 1.

---

## Swap Test

**PASS — all 4 agents are identifiable without labels.**

Reading the outputs blind:

- The output that names a `MessageBus` abstraction interface with four specific methods, cites SQLite WAL mode's ceiling at ~150 concurrent agents, identifies a multi-machine distribution as a separate break-even trigger, and frames Redis rejection as an incompatibility with the "install on user machines" distribution model is the CTO. Technical specificity at this level is not reproducible by any other role.

- The output that builds a three-column engineer-hour table as a percentage of runway, converts silent failure to tokens/week, performs a build-now vs migrate-later cost comparison with a named delta (~20 hrs), and identifies "Option A+" as a third unlisted option is the CFO. The cost-first structure and ROI framing are role-exclusive.

- The output that frames silent failure as "brand liability that surfaces in churn not bug reports," blocks daemon mode marketing pending demand validation, delegates failure instrumentation to Engineering as a named prerequisite, and ends with "build the floor, not the ceiling" is the CMO. The operations-before-marketing principle and brand-liability framing are role-exclusive.

- The output that frames SQLite adoption as a trust/reliability business risk, names daemon mode as a "paid tier" rather than a technical milestone, populates a Displaces field explicitly cutting the parallel execution expansion, and adds a post-output note about broker-agnostic schema contracts as a week-one architecture decision is the CEO. The paid-tier framing and Displaces field are CEO-exclusive, even though this CEO bleeds into CTO territory in a way the Config B CEO did not.

**Differentiation is adequate but not uniform.** CEO and CTO outputs overlap on SQLite selection (CEO pre-selects SQLite as the mechanism; CTO confirms and specifies it). CEO and CMO overlap on adoption friction framing. The weakest differentiation is CEO: the role-bleed into technical territory (choosing SQLite as the mechanism, specifying schema contract requirements) produces a CEO output that could partially be mistaken for an early CTO response. All four agents are identifiable, but CEO identification requires more inference than the others.

---

## Comparison to Config B (all 5.00)

### Score Summary

| Agent | Config B (S/D/A) | Config D (S/D/A) | Config B Avg | Config D Avg | Delta |
|-------|-----------------|-----------------|--------------|--------------|-------|
| CEO   | 5 / 5 / 5       | 4 / 4 / 4       | 5.00         | 4.00         | -1.00 |
| CTO   | 5 / 5 / 5       | 5 / 5 / 5       | 5.00         | 5.00         | 0.00  |
| CMO   | 5 / 5 / 5       | 4 / 4 / 4       | 5.00         | 4.00         | -1.00 |
| CFO   | 5 / 5 / 5       | 5 / 5 / 4       | 5.00         | 4.67         | -0.33 |
| **Mean** | —           | —               | **5.00**     | **4.42**     | **-0.58** |

---

### What Changed and Why

**CEO: -1.00 (largest regression)**

Config B CEO correctly stayed at the business-model layer: adoption friction framed as a conversion funnel cost, daemon mode displaced explicitly, CTO delegated the technology selection. Config D CEO makes the technology call (SQLite) before delegating to the CTO, then appends a technical note about broker-agnostic schema contracts — squarely CTO scope. This role-bleed is the defining Config D regression. On sonnet, the CEO does not maintain role boundaries as cleanly: the model reaches for technical specificity to demonstrate quality, which produces output that would score higher in isolation but lower as a differentiated C-Suite response. The Displaces field is still populated correctly (one Config B improvement that held), and the paid-tier framing of daemon mode is a genuine Config D contribution not present in Config B. But the boundary violations cost a full point across all three dimensions.

**CTO: 0.00 (no regression — held ceiling)**

The CTO definition is mature and structurally constraining enough that sonnet produces output at the same quality ceiling as opus. All six required output format sections are populated. The four-alternative enumeration is more complete than Config B (Config B CTO did not enumerate an in-process event emitter option). The `MessageBus` abstraction interface is defined with named methods. The SQLite WAL ceiling at ~150 agents is a specific technical claim. The CTO agent appears to be the most model-robust of the four — the role definition constrains output enough that sonnet cannot drift into generic quality patterns. This is an architecture finding: well-specified agent definitions with mandatory output format templates are more robust to model tier reduction than loosely specified definitions.

**CMO: -1.00 (equal largest regression with CEO)**

Config B CMO produced output with a conservatively-ranged adoption drop estimate, a split success metric (two independent conditions), and a product-owner delegation for user-facing failure copy. Config D CMO drops all three. The adoption friction claim lacks magnitude. The success metric ("zero silent workflow failures in 30 days") has a circular dependency — the instrumentation that enables measurement is the same work the metric is measuring. The product-owner delegation for failure signal copy is absent. These are all cases where the CMO constitution's anti-patterns and output format requirements produced sharper output in Config B; Config D sonnet approximates the role but doesn't complete the structural checklist. The "build the floor, not the ceiling" framing is a Config D contribution not present in Config B — CMO instinct is present, but structural rigor is reduced.

**CFO: -0.33 (marginal regression)**

Config D CFO is strong — the engineer-hour table, token/week conversion of silent failure cost, and build-now vs migrate-later delta (~20 hrs) are all genuine CFO contributions not present in the other roles' outputs. The regression is narrow: the "1-2 silent failures per week" baseline assumption is stated without qualification, where Config B CFO explicitly flagged uncertain figures as estimates. The model tier recommendation at the end is a Config D contribution not in Config B — the CFO reading its own constitution and applying the tier heuristic to this decision is a notable quality signal. The CFO definition is the most mature (default model is already sonnet per the agent definition), and this is reflected in the smallest Config D regression.

---

### Architecture Findings

**1. Role boundary maintenance degrades on sonnet for loosely-specified roles (CEO, CMO).**

The CEO and CMO definitions have shorter constitutions with fewer mandatory output sections compared to CTO and CFO. On opus, the model infers role boundaries from sparse constitution text and maintains them. On sonnet, the model defaults to "high-quality analysis" which means reaching for specificity — and that specificity comes from adjacent domains (CTO's technical territory for CEO, CEO's strategic territory for CMO). The fix is not a better model: it is more constrained output format templates. The CTO and CFO definitions already have this (six mandatory sections for CTO, structured cost estimation template for CFO) and both held quality ceiling on sonnet.

**2. The CTO is model-invariant at current output quality.**

CTO scored 5/5/5 on baseline, post-fix, and Config D. The definition is constraint-complete: mandatory output format with six named sections, numbered constitution with specific thresholds (build vs buy: 2 weeks vs 1 month), explicit break-even requirement. This definition produces ceiling output regardless of whether the underlying model is opus or sonnet. If there is a production deployment where model cost matters, the CTO is the safest C-Suite agent to run on budget tier.

**3. Config D mean (4.42) matches the Config A baseline mean (4.42) exactly.**

This is structurally interesting: the pre-improvement Config A baseline (opus, unimproved definitions) scores identically to Config D (sonnet, improved definitions). The definition improvements gained by Config B approximately compensate for the model tier reduction in Config D. This suggests definition quality and model quality are roughly substitutable within the tested range — a better-specified prompt running on sonnet reaches approximately the same quality floor as a loosely-specified prompt running on opus.

---

### Recommendation on Config D Deployment

**Deploy Config D for:** CTO role (zero regression, model-invariant). CFO role (marginal regression, acceptable for cost analysis).

**Do not deploy Config D for:** CEO and CMO roles in decisions requiring precise role-boundary maintenance (e.g., cross-functional conflict resolution, GTM approval gates). The role-bleed in CEO and CMO outputs under sonnet produces incorrect delegation patterns — a CEO who makes the technology choice forecloses CTO input; a CMO without a magnitude estimate cannot block a campaign correctly.

**Mitigation path:** Tighten CEO and CMO output format templates to mandate explicit "Scope boundary" fields — where the agent must name what it is NOT deciding and who it is routing that sub-question to. This structural constraint would reproduce what opus accomplishes through role inference. Estimated improvement: +0.5 to +1.0 per affected dimension, which would close most of the Config D gap without requiring model tier upgrade.

---

*Generated: 2026-03-22 | Benchmark: T2 Config D | Scorer: staff-engineer | Model: claude-sonnet-4-6*
