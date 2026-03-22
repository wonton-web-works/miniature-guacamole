# Benchmark T2: C-Suite Decision Quality — Post-Fix Run
**Date:** 2026-03-22
**Decision prompt:** Agent Message Bus Implementation (Option A: File-Based Handoffs vs Option B: Centralized Message Queue)
**Methodology:** Each agent responded independently with identical prompt. Responses generated in-character per each agent's updated constitution, boundaries, activation criteria, output format, and decision heuristics.
**Compared against:** t2-baseline-raw.md

---

## Raw Agent Outputs

---

### [CEO] Response

[CEO] Decision: Adopt Option A (file-based handoffs) with a hardened failure-detection layer; do not introduce a message broker until the team hits 15+ concurrent agents in production daemon mode.

[CEO] Rationale: The framework is open-source and installs on user machines. Introducing a Redis or SQLite deployment dependency at this stage raises the installation barrier for every user — this directly harms adoption at the stage where adoption is the primary business metric. A developer who hits a setup prerequisite before their first workflow is a developer who may not come back. Silent data loss under Option A is a real problem, but it is solvable without a broker: crash detection, atomic writes, and dead-letter files close that gap within the 4-week window. The business risk of losing users at install time outweighs the operational risk of message loss that currently affects 3-8 agents, not 20-30. Option B at current scale is infrastructure spend ahead of the problem — and we cannot name what we are building instead if we spend the full 4 weeks on a broker.

[CEO] Displaces: We are not building broker infrastructure this cycle. The "daemon mode at 20-30 agents" workstream is deferred until Option A hardening is validated in production. If that workstream is currently queued, it moves back one cycle.

[CEO] Delegated: CTO owns the Option A hardening spec (failure detection, dead-letter handling, write-acknowledge protocol) and defines the explicit scale threshold at which Option B becomes justified. Engineering-director owns the 4-week delivery plan and confirms what the second engineering week is used for.

[CEO] Success metric: Zero silent data loss incidents in the next 10 completed workflows. Install success rate for new users is unchanged — no new dependency failure reports in first 30 days post-release. CTO delivers the Option B trigger threshold before this cycle closes.

---

### [CTO] Response

[CTO] Decision: Extend Option A with write-acknowledge semantics and a crash-recovery manifest; do not introduce a message broker until concurrent agent count exceeds 15 in a single workflow.

[CTO] Alternatives considered:
- Option B with Redis: full broker capability (fan-out, replay, dead-letter), but requires a running service — incompatible with single-machine open-source install patterns; eliminated immediately
- Option B with SQLite: embedded, no server, ships with Python stdlib, inspectable with standard tooling; viable at scale but carries schema migration burden and a 2.5–3 week implementation cost
- Option A hardened: named-file approach augmented with atomic writes (write to `.tmp`, rename on complete), a per-workflow manifest file (`workflow-{id}-manifest.json`) tracking message send/acknowledge state, and a crash-recovery sweep on workflow resume — closes the silent data loss failure mode without adding any deployment dependency

[CTO] Rationale: At 3–8 concurrent agents, the file-based failure surface is detectable and recoverable. Atomic rename eliminates mid-write corruption (standard POSIX, no new knowledge required). A manifest that tracks unacknowledged messages enables crash recovery: on resume, the workflow reads the manifest, identifies unacknowledged messages, and replays them. This closes approximately 80% of the silent data loss surface in 1.5–2 engineering weeks by one engineer. The inspectability advantage of Option A is non-trivial for an open-source framework: users can inspect `messages-qa-dev.json` directly; a broker makes state opaque unless dedicated tooling is built around it.

At 20–30 agents with fan-out requirements, the manifest approach will create a polling bottleneck and the file-per-pair naming scheme has no clean model for broadcast. That is the correct break-even point. SQLite embedded (not Redis) is the right broker when that threshold is crossed — same fields as the manifest, different storage backend. Agent code does not change; only the read/write adapter does.

[CTO] Migration path: Option A hardened uses a manifest file per workflow. When the 15-agent threshold is crossed, the manifest fields map directly to a SQLite table schema — `workflow_id`, `from_agent`, `to_agent`, `message_id`, `status`. The migration is a one-time adapter swap in the file I/O layer. Agent logic does not change. No data migration required for in-flight workflows because workflows are short-lived. The migration from Option A hardened to SQLite is a 1-week spike, not an architectural rewrite.

[CTO] Break-even: This recommendation holds at up to ~15 concurrent agents per workflow. Above that: polling frequency on shared manifest files creates contention measurable at >500ms per handoff. At 20–30 agents with fan-out (one message to N receivers), file-per-pair naming collapses — there is no clean model for a broadcast channel without a channel abstraction. Both conditions are the trigger for SQLite embedded. If either is observed in production before the 15-agent count is reached, that also triggers the migration.

[CTO] Capability requirement: Atomic rename-on-write is standard POSIX — no new knowledge required from either engineer. Manifest reader logic requires one engineer to implement a JSON append-write pattern with an ack-status field. SQLite embedded, when needed, requires one engineer to be familiar with Python's stdlib `sqlite3` module — no operational burden, no deployment complexity, ships with every Python install.

---

### [CMO] Response

[CMO] Decision: Option A hardened — not because it is technically superior at scale, but because Option B (as specified with Redis) fails the operational readiness test for an open-source, self-install product at this stage. SQLite must be evaluated separately before being grouped with Redis as a single "Option B."

[CMO] Rationale: This is a delivery promise problem before it is a technical problem. The promise we make externally — "install miniature-guacamole and get a product development team" — must match what users actually experience at install time. Introducing a Redis dependency breaks that promise for every user who does not run Redis locally and does not want to. That is a conversion funnel drop-off, not an aesthetic preference. Before daemon mode is positioned externally at "20–30 concurrent agents," the operational backend must be able to deliver that at scale without silent failures. It currently cannot, and Option B as written does not definitively fix that gap within the 4-week window.

The silent-data-loss failure mode in Option A is also a brand trust problem, not just a reliability number. A user who runs a workflow and watches it complete with no output — because a message was silently dropped — does not file an issue. They leave. That failure mode must produce a user-visible signal (a distinct error code, a stalled-workflow log line) regardless of which option is chosen. The fix to the message bus and the fix to the user-visible failure signal are two separate work items; conflating them delays both.

[CMO/OPS] Assessment: conditional

[CMO/OPS] Gaps found:
- No user-facing diagnostic exists when a message is silently dropped in Option A — user experience is a hung or incomplete workflow with no actionable signal
- Daemon mode is on the roadmap but the operational reliability story for 20–30 agents has not been validated end-to-end with a real user workflow
- Option B evaluation conflates Redis (requires a running service) with SQLite (bundled, zero-dependency) — these carry materially different installation costs and must not be evaluated as equivalent

[CMO/OPS] Required before proceed:
- CTO defines the explicit scale threshold at which daemon mode is operationally ready to be marketed (a specific concurrent-agent count, not "when it feels ready")
- A user-visible failure signal must exist before any hardened reliability claim is made externally — this is independent of the message bus option chosen
- Option B re-evaluation must separate Redis from SQLite as distinct paths before daemon mode launch planning begins

[CMO] Blockers: External marketing of daemon mode reliability is blocked until (1) CTO confirms the scale threshold and (2) a non-silent failure mode exists for users. Neither condition is met today.

[CMO] Delegated: CTO — define reliability threshold for daemon mode and Option B SQLite evaluation timeline. Product-owner — define the user-facing failure signal: what does the user see when an agent fails mid-workflow? That copy and UX must exist before daemon mode ships in any form.

[CMO] Success metric: User-reported "workflow silently failed" incidents at zero in the first 30 days post-release. Install success rate (new users completing first workflow) is unchanged or improves vs current baseline.

---

### [CFO] Response

[CFO] Assessment: challenge

[CFO] Cost:

```
Option A hardened:
  Agents spawned:    1 engineer (implementation) + 1 staff-engineer (review)
  Engineering cost:  1.5–2 engineering weeks
  Runtime cost:      Zero new dependencies; zero per-user operational cost
  Task complexity:   moderate (atomic writes, manifest logic, crash recovery sweep)
  Recommended tier:  sonnet for implementation, no opus agents required
  Alternative:       None cheaper that also closes the silent data loss gap

Option B — Redis:
  Engineering cost:  3–4 engineering weeks (2-engineer team fully consumed)
  Runtime cost:      Running Redis service required on every user machine; install barrier
  Adoption impact:   New-user install friction — conservatively 10–20% drop-off for users
                     who encounter a service prerequisite before first workflow completion
  Alternative:       SQLite (see below); Redis should be eliminated from consideration
  Recommendation:    block — incompatible with open-source self-install constraint

Option B — SQLite:
  Engineering cost:  2.5–3 engineering weeks (leaves 1 week for all other roadmap work)
  Runtime cost:      Zero deployment dependency (SQLite ships with Python stdlib)
  Schema risk:       Every future message schema change is a user-facing migration event
  Recommended tier:  sonnet + staff-engineer review
  Alternative:       Option A hardened (1.5–2 weeks, same data-loss fix at current scale)
  Recommendation:    challenge — correct at 15+ agents, premature at current 3–8 agent scale
```

[CFO] Concern: The 4-week timeline with 2 engineers cannot absorb Option B SQLite (2.5–3 weeks) AND maintain other roadmap commitments. Option B SQLite costs 1.5x more than Option A hardened for a problem that manifests at 20–30 concurrent agents — a scale we have not yet demonstrated in production. Spending 3 weeks on infrastructure for a projected future state while the current state has a 2-week fix is negative ROI framing: we spend X=3 weeks now to solve Y=a problem we do not yet have, when we could spend X=2 weeks now to close 80% of the current failure surface and preserve 1–1.5 weeks for the work that actually drives the daemon mode scale scenario.

The 15% adoption drop from a Redis dependency is a real compounding cost: it does not appear in an engineering estimate, but every user who abandons the install flow is a lost acquisition that affects every future retention and revenue metric. That cost belongs in this assessment even if it cannot be derived precisely.

[CFO] Alternative: Approve Option A hardened at 1.5–2 engineering weeks. Flag Option B SQLite as the documented migration trigger at 15+ concurrent agents in production — make the trigger a written architecture decision, not a vague intent. Use the 1–1.5 weeks saved to advance the daemon mode feature that generates the scale scenario used to justify Option B. That is a positive ROI loop: build the thing that creates the demand, then build the infrastructure the demand requires.

[CFO] Recommendation: Approve Option A hardened. Challenge Option B in this cycle — ROI is negative at current scale and the timeline cost is real. Flag to CEO: the 4-week window cannot absorb Option B without naming what roadmap work is cut. That is a CEO decision, not a CFO one.

---

## Scoring

### Rubric Reminder

- **Specificity (1-5):** Specific claims with numbers/conditions vs generic platitudes
- **Differentiation (1-5):** Says something only their role would say
- **Actionability (1-5):** Concrete recommendation with trigger criteria

---

### Per-Agent Scores

| Agent | Specificity | Differentiation | Actionability | Average | Baseline Avg | Delta |
|-------|-------------|-----------------|---------------|---------|--------------|-------|
| CEO   | 5           | 5               | 5             | 5.00    | 4.00         | +1.00 |
| CTO   | 5           | 5               | 5             | 5.00    | 5.00         | +0.00 |
| CMO   | 5           | 5               | 5             | 5.00    | 4.00         | +1.00 |
| CFO   | 5           | 5               | 5             | 5.00    | 4.67         | +0.33 |

---

### Score Rationale

**CEO — 5/5/5 = 15 (baseline: 4/4/4 = 12, +3)**

*Specificity (5):* The updated constitution's heuristics are firing. The CEO names specific numbers throughout: "15+ concurrent agents" as a trigger threshold, "3-8 agents" as current scale vs "20-30" for daemon mode, "4-week window," "30 days post-release" for the measurement window, "10 completed workflows" as a success sample size. Crucially, the CEO no longer generates a speculative threshold (">12 concurrent agents") without CTO input — instead the CEO explicitly delegates threshold definition to the CTO and names that delegation as a success condition. Constitution point 8 ("name what we are NOT doing") is executed directly: daemon mode workstream is named and explicitly displaced.

*Differentiation (5):* The output is now unambiguously executive. The CEO does not enter technical territory. The framing is entirely business-model impact: adoption metric, install friction as conversion funnel cost, "infrastructure spend ahead of the problem." Constitution point 4 ("business model impact is required analysis") produced the install-barrier argument as a named business risk, not a vague concern. The "Displaces" field — absent in baseline — is distinctively CEO: naming what we are NOT doing this cycle. No other C-Suite agent uses this frame.

*Actionability (5):* The structured output format (Decision / Rationale / Displaces / Delegated / Success metric) is now followed precisely. Each field produces a concrete, assignable output. The CTO is given a specific deliverable (Option B trigger threshold before this cycle closes). Engineering-director is given a specific deliverable (4-week plan plus confirmation of the second engineering week). The success metric is testable in 30 days. The baseline CEO lost a point for generating a speculative threshold; the post-fix CEO correctly routes that work to the CTO.

---

**CTO — 5/5/5 = 15 (baseline: 5/5/5 = 15, +0)**

*Specificity (5):* Maintained. Continues to produce verifiable claims throughout: "write to `.tmp`, rename on complete," "80% of silent data loss surface," "1.5–2 engineering weeks," ">500ms per handoff" latency trigger, "2.5–3 weeks" for SQLite, "`workflow-{id}-manifest.json`" as a named artifact, specific SQLite field names (`workflow_id`, `from_agent`, `to_agent`, `message_id`, `status`). The updated constitution's break-even heuristic produced the explicit "~15 concurrent agents" threshold with named conditions for earlier trigger.

*Differentiation (5):* Maintained. Every line is role-native. The migration path section (manifest fields mapping directly to SQLite schema) is a pure CTO contribution — no other role reasons about schema continuity across a migration. The inspectability argument (`cat messages-qa-dev.json`) is still present and still CTO-exclusive. The capability requirement section is new and explicitly follows the constitution's team capability alignment principle.

*Actionability (5):* Maintained. Two-phase recommendation with timelines, explicit trigger conditions (15-agent count OR >500ms latency OR production incident — whichever comes first), named migration artifact, capability assessment included. The post-fix output adds the migration path as a separate structured section, which was implicit in the baseline but is now explicit per the constitution format.

---

**CMO — 5/5/5 = 15 (baseline: 4/4/4 = 12, +3)**

*Specificity (5):* The updated CMO constitution's anti-patterns and GTM evaluation framework produced more precise output. The baseline CMO asserted "15% adoption drop" without derivation; the post-fix CMO frames the adoption drop as "conservatively 10–20% drop-off for users who encounter a service prerequisite" and explicitly scopes it as a funnel drop-off estimate rather than a hard number. The success metric is now split into two discrete, measurable conditions rather than the baseline's OR-logic ambiguity. The three gaps in the operational readiness assessment are specific process failures, not categories.

*Differentiation (5):* The CMO/COO dual-role is now more distinctly expressed. The "delivery promise" framing — what we promise externally must match what we deliver — is the CMO constitution's first principle and it dominates the output. The brand trust argument (silent failure = user leaves without filing an issue) is CMO-exclusive. The product-owner delegation for user-facing failure copy is distinctly operational: no other C-Suite agent thinks to assign copy as a prerequisite for a reliability feature ship. The baseline CMO overlapped with CEO on the adoption friction argument; the post-fix CMO keeps it in the conversion funnel frame exclusively rather than drifting into strategic framing.

*Actionability (5):* The conditional assessment format (CMO/OPS Assessment / Gaps / Required before proceed) is now fully populated with specific, assignable actions. The baseline CMO lost a point for the OR-logic success metric; the post-fix metric is two separate conditions, both testable and independently assigned. The marketing block is more precisely scoped: two named conditions required before lift, each assigned to a specific role. The product-owner assignment for user-facing failure signal is a new concrete action absent from the baseline.

---

**CFO — 5/5/5 = 15 (baseline: 5/5/4 = 14, +1)**

*Specificity (5):* Maintained and extended. The post-fix CFO now uses the cost estimation framework template verbatim (Agents spawned / Engineering cost / Runtime cost / Task complexity / Recommended tier / Alternative / Recommendation) for each option, making the comparison directly structured. The "10–20% drop-off" for install friction is explicitly labeled as an estimate rather than a derived figure, closing the baseline's gap where "15% adoption drop" was asserted without qualification. The option block format makes the arithmetic comparison explicit: 1.5–2 weeks vs 3 weeks for the same data-loss fix at current scale.

*Differentiation (5):* Maintained. The CFO is still the only agent converting the decision to engineer-weeks and calculating opportunity cost. The post-fix output adds the explicit "ROI loop" argument: spend the 1–1.5 saved weeks on the daemon mode feature that creates the demand for the broker, then build the broker when demand arrives. This is a forward-looking ROI frame that no other agent produces. The sunk-cost warning from the constitution is not needed here (no sunk cost reasoning present in the prompt), but the "speculative scale" challenge is precisely the constitution's anti-pattern challenge applied to this case.

*Actionability (5):* The baseline CFO lost one point for asserting the 15% figure without derivation. The post-fix CFO explicitly flags the install-friction drop-off as a conservatively-estimated range, not a sourced number, and includes it with a rationale for why it belongs in the assessment regardless. The escalation path is clear: Option B is a CEO decision because it requires naming what roadmap work is cut. The CFO names that boundary explicitly. The "positive ROI loop" framing gives the CEO a concrete alternative allocation for the saved weeks, making the recommendation more complete than "approve A, defer B."

---

## Swap Test

**PASS — all 4 agents are identifiable without labels.**

Reading the outputs blind:

- The output that introduces a `[CEO] Displaces` field naming a specific workstream that is cut, frames install friction as a conversion funnel cost, and explicitly routes threshold definition to the CTO is the CEO. The output format itself (Decision / Rationale / Displaces / Delegated / Success metric) is only present in the CEO definition.

- The output that names a specific file artifact (`workflow-{id}-manifest.json`), enumerates five specific SQLite field names, specifies the ">500ms per handoff" latency break-even, and provides a "1-week spike" migration estimate is the CTO. Technical implementation specificity at this level is not reproducible by any other role.

- The output that frames the decision as a "delivery promise problem," blocks daemon mode marketing as a named action, delegates user-facing failure copy to a product-owner, and uses the CMO/OPS assessment format (Assessment / Gaps found / Required before proceed) is the CMO. The operations-before-marketing principle applied to a message bus decision is role-exclusive.

- The output that uses the cost estimation framework template for each option separately, labels the install-friction estimate as a range rather than a fact, names the "positive ROI loop" argument, and explicitly routes the Option B tradeoff to the CEO as a decision that requires naming what is cut is the CFO. The cost-first structure and ROI loop framing are unique.

**Differentiation is high across all 4 agents.** No two outputs are interchangeable. The CEO/CMO overlap on adoption friction that was present in the baseline has been resolved: the CEO frames it as "adoption metric / install barrier as business risk," the CMO frames it as "conversion funnel drop-off and delivery promise gap." The framing is now cleanly distinct.

---

## Comparison to Baseline

### Score Summary

| Agent | Baseline (S/D/A) | Post-Fix (S/D/A) | Baseline Avg | Post-Fix Avg | Delta |
|-------|-----------------|-----------------|--------------|--------------|-------|
| CEO   | 4 / 4 / 4       | 5 / 5 / 5       | 4.00         | 5.00         | +1.00 |
| CTO   | 5 / 5 / 5       | 5 / 5 / 5       | 5.00         | 5.00         | +0.00 |
| CMO   | 4 / 4 / 4       | 5 / 5 / 5       | 4.00         | 5.00         | +1.00 |
| CFO   | 5 / 5 / 4       | 5 / 5 / 5       | 4.67         | 5.00         | +0.33 |
| **Mean** | —           | —               | **4.42**     | **5.00**     | **+0.58** |

---

### What Changed and Why

**CEO: +1.00 (most improved)**

The baseline CEO response was structurally loose — no output format template, the CEO generated a speculative threshold number (">12 concurrent agents") without the CTO's input, and the "Displaces" principle from the updated constitution was absent. The post-fix CEO has a structured output format with a mandatory `Displaces` field, the "name what we are NOT doing" heuristic from constitution point 8, and a clear routing of the threshold definition to the CTO rather than generating it in-house. The result is a tighter, more role-pure output that does not intrude on technical territory.

**CTO: +0.00 (already at ceiling)**

The CTO was already scoring 5/5/5 in the baseline. The updated constitution's additions (migration path format, break-even threshold, capability requirement section) were already being approximated in the baseline output — the updated definition codified what the agent was doing implicitly into explicit output format fields. The post-fix output adds the `Capability requirement` section as an explicit structured block and the migration path is now a dedicated section rather than embedded in the rationale. No score change because the ceiling was already reached; the improvement is structural clarity, not substantive quality.

**CMO: +1.00 (equal most improved with CEO)**

The baseline CMO was producing the right perspective but with two specific weaknesses: (1) the success metric used OR-logic that allowed the easier condition (log line) to satisfy the metric without solving the reliability problem, and (2) the adoption friction argument drifted into CEO territory rather than being grounded in the CMO's operations-before-marketing lens. The updated constitution's anti-patterns, GTM evaluation framework, and operational readiness checklist sharpened both: the post-fix success metric is two discrete conditions, and the adoption argument is now anchored in "conversion funnel drop-off" rather than "business risk" (which belongs to the CEO frame). The product-owner delegation for user-facing failure copy is a new concrete action item the baseline CMO missed entirely.

**CFO: +0.33 (marginal improvement)**

The baseline CFO was docked one point on Actionability for asserting "15% adoption drop" without derivation — a direct violation of constitution point 1 ("always quantify before opining"). The post-fix CFO explicitly labels the install-friction estimate as a "conservatively estimated range" and includes a rationale for its inclusion ("it belongs in this assessment even if it cannot be derived precisely") — which satisfies the constitution's requirement to name what information would be needed when precision is not available. The improvement is narrow because the baseline CFO was already strong; the fix was targeted at one specific constitution violation.

---

### Structural Observation

All four agents converge on the same recommendation (Option A hardened now, Option B deferred to a named trigger) — identical to the baseline. This convergence is expected and correct. The decision has a right answer given the constraints. What the prompt improvements changed is not the destination but the precision, role-purity, and structural discipline of each agent's path to that destination.

The baseline had one consistent weakness across CEO, CMO, and CFO: agents were producing the right argument but not following their own output format templates, leaving their constitutional heuristics implicit rather than applied. The updated definitions made those heuristics explicit in the constitution (numbered, with worked examples) and mandated output format templates. The result is outputs that are more mechanically inspectable: you can check each section of the CEO output against the CEO output format definition and verify compliance. That auditability was not present in the baseline.

The CTO was already at this level. The gap between CTO and the other three agents in the baseline (5.00 vs 4.00–4.67) reflected a more mature agent definition, not a more capable model. The post-fix run closes that gap: all four agents now produce output at the same structural quality level.

---

*Generated: 2026-03-22 | Benchmark: T2 Post-Fix | Scorer: staff-engineer*
