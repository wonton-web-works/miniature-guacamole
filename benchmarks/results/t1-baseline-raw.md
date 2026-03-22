# T1 Baseline — Intake Routing Analysis

**Date:** 2026-03-22
**Evaluator:** The Sage
**Benchmark:** Intake routing — C-Suite spawning decisions

---

## Prompt A: Memory Leak in Agent Supervisor Loop

### Domain Signals Detected

- **Pure engineering bug fix** — memory leak in a specific file (`supervisor.ts`), specific line range (140-220)
- **Narrow scope** — no API changes, no new dependencies, no product or design implications
- **Well-defined problem** — the buffer holding completed task results is not being flushed; root cause is already identified
- **Internal infrastructure** — the supervisor loop is framework internals, not user-facing product surface

### Spawn: CTO only

### Why CTO is needed

The CTO owns all technical architecture and engineering decisions. This is a bug fix in core framework infrastructure. The CTO will delegate downward to the Engineering Manager, who will route to an IC engineer for the fix and QA for verification. The scope is tight enough that the CTO chain handles it end-to-end.

### Why others are NOT needed

- **CEO** — No product strategy, priority conflict, or cross-domain coordination required. The scope is fully defined and contained.
- **CMO/COO** — No brand, marketing, UX, or operational implications. This is invisible to end users.
- **CFO** — No cost decisions, resource allocation tradeoffs, or infrastructure spend involved. Single-file fix with known scope.

### Routing justification

This maps directly to the "Pure engineering" row in the C-Suite spawning table. One domain, one agent.

---

## Prompt B: Redesign Sage Terminal Output for Brand Voice

### Domain Signals Detected

- **Brand / tone** — "monk capybara brand personality," "wise, considered guide," "calmer tone, prose-style" are all brand voice and creative direction signals
- **Engineering execution** — the prompt explicitly states "the engineering work is straightforward (string formatting changes)," confirming there is a build component
- **Design / UX** — terminal output is a user-facing experience surface; the change is about how the product *feels*, not just what it does
- **No product strategy** — scope is well-defined, no pricing/packaging/roadmap implications
- **No cost implications** — no infrastructure changes, no new dependencies

### Spawn: CTO and CMO/COO

### Why CTO is needed

There is engineering work to execute: string formatting changes in the Sage's output code. The CTO will own the technical implementation, delegating to the Engineering Manager and IC engineers for the build. The CTO also needs to ensure the formatting changes don't break structured log parsing if anything downstream depends on it.

### Why CMO/COO is needed

The CMO/COO owns brand voice, tone guidelines, and user experience. This prompt is fundamentally about brand personality — translating the monk capybara identity into terminal output prose. The CMO/COO will establish the tone guidelines and voice spec that the engineering work must conform to. Without the CMO/COO, engineering would be implementing string changes with no authoritative brand direction, which risks drift from the established personality. The design agent under the CMO/COO chain produces the spec; the engineering chain under the CTO builds against it.

### Why others are NOT needed

- **CEO** — No strategic decisions, no priority conflicts, no cross-initiative coordination. The scope is clear and self-contained.
- **CFO** — No cost, resource, or budget implications. This is a style change with known engineering effort.

### Routing justification

This maps to the "Brand / marketing / UX" row in the C-Suite spawning table: CTO + CMO/COO. The work requires both creative direction (brand voice spec) and engineering execution (code changes), and these two chains need to coordinate — the CMO/COO chain produces the voice guidelines, the CTO chain implements them.

---

## Prompt C: Launch miniature-guacamole as a Paid Product

### Domain Signals Detected

- **Business strategy** — pricing tiers, packaging, go-to-market sequence are CEO-level strategic decisions
- **Engineering** — billing integration (Stripe), onboarding flow implementation require significant technical work
- **Brand / marketing** — marketing landing page, go-to-market sequence, customer support workflow are CMO/COO domain
- **Cost / resource** — "limited engineering bandwidth," "need to sequence carefully," 6-8 week timeline are explicit resource constraint signals requiring CFO analysis
- **Multi-domain initiative** — six distinct workstreams spanning every organizational function
- **Long time horizon** — 6-8 weeks, requiring session management, phasing, and workstream coordination

### Spawn: CEO, CTO, CMO/COO, and CFO

### Why CEO is needed

This is a business-defining initiative. Pricing tiers and packaging are strategic decisions that shape the product's market position. The CEO owns the overall initiative priority, sequencing across workstreams, and resolving conflicts between competing demands on limited bandwidth. The CEO will also own the go-to-market *strategy* (the CMO/COO owns go-to-market *execution*).

### Why CTO is needed

Two major engineering workstreams: Stripe billing integration and onboarding flow. Both require architecture decisions (payment model, subscription lifecycle, webhook handling, onboarding state machine). The CTO will scope the technical work, identify dependencies between engineering workstreams, and sequence the build plan.

### Why CMO/COO is needed

Marketing landing page creation, customer support workflow definition, and go-to-market execution are all CMO/COO domain. The landing page needs brand-aligned design and copy. The support workflow is an operational concern. The go-to-market sequence requires coordinated marketing execution.

### Why CFO is needed

The prompt explicitly flags "limited engineering bandwidth" and the need to "sequence the work carefully." This is a resource allocation problem. The CFO will analyze the cost of the initiative (Stripe fees, infrastructure for billing, support tooling), model the revenue from pricing tiers, and advise on sequencing to maximize ROI given the bandwidth constraint. With 1 month of runway (per project memory), the CFO's input on cash flow timing relative to launch timeline is critical.

### Routing justification

This maps to the "Full initiative" row in the C-Suite spawning table. Every domain is represented. The Sage's primary job here is session management — this is a multi-week initiative that will require multiple sessions with clean handoffs, workstream state tracking, and drift prevention across all four C-Suite chains.

---

## Summary Table

| Prompt | Scope | Spawn | Rationale |
|--------|-------|-------|-----------|
| A — Memory leak fix | Pure engineering, narrow | CTO | Single-domain bug fix, known scope, no cross-cutting concerns |
| B — Brand voice redesign | Brand + engineering | CTO, CMO/COO | Creative direction (brand voice spec) feeds engineering execution |
| C — Paid product launch | Full initiative | CEO, CTO, CMO/COO, CFO | All domains active, resource-constrained, multi-week, strategic |
