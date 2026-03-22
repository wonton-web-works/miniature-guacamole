# Benchmark T6: Leadership Team Planning — Pipeline A (No Sage), Stimulus S2
**Date:** 2026-03-22
**Pipeline:** A (CEO + CTO + ED only — no Sage, no CMO, no CFO)
**Stimulus:** S2 — Enterprise Team Dashboard feature request
**Methodology:** All three agents respond independently per their AGENT.md constitutions and output formats. Gap analysis performed for missing agent coverage.

---

## Task Prompt

> We need to add a "Team Dashboard" feature for enterprise clients. Requirements:
> - Real-time view of all active workstreams across the org
> - Token spend tracking per team member (last 7 days, 30 days)
> - Export to CSV for finance reporting
> - Must match PrivateEnterprise brand visual standards
> - Enterprise SSO required for access
> - Target: 3-week delivery

---

## Raw Agent Outputs

---

### [CEO] Response

**Initiative Assessment: Enterprise Team Dashboard**

This initiative touches a procurement gate. Enterprise clients at the $10K+ tier require activity visibility and cost attribution before they sign. A team dashboard with token spend tracking and CSV export is not a nice-to-have — it is the difference between "interesting open-source tool" and "approved by finance for org-wide deployment." This directly enables our enterprise monetization path.

**Business model impact:** Token spend tracking per team member is the feature that converts pilot users into paid enterprise contracts. Without it, engineering managers cannot justify the tool to their CFO. The CSV export for finance reporting is specifically a procurement checkbox — every enterprise prospect we have spoken to asks for cost auditability within the first two calls.

**What this displaces:** The 3-week delivery window means we are not shipping the self-improvement daemon loop or the marketplace integrations during this period. Given that we have 1 month of runway and 2 startup clients, the enterprise conversion path is higher-leverage than either of those. The daemon loop can wait; a signed enterprise contract cannot.

**SSO is non-negotiable but scope-risky:** Enterprise SSO (SAML/OIDC) is a hard requirement — no enterprise procurement team will approve a tool without it. However, SSO implementations routinely consume 1-2 weeks on their own. If SSO is in the 3-week scope, it compresses the dashboard work dangerously. I need ED's capacity assessment on whether SSO and dashboard can both land in 3 weeks, or whether SSO should be a parallel workstream that started yesterday.

**Brand standards concern — COVERAGE GAP:** The requirement specifies "must match PrivateEnterprise brand visual standards." This pipeline has no CMO or art-director agent to validate brand compliance. The CEO can set the business direction, but brand standards validation requires a design-oriented perspective that is not present in this leadership configuration. This is a gap. Without a CMO or art-director review, brand compliance becomes an unvalidated assumption that could result in rework.

```
[CEO] Decision: Approve the Enterprise Team Dashboard for immediate development — this is the highest-leverage initiative for enterprise conversion.
[CEO] Rationale: Token spend visibility and CSV export directly unblock enterprise procurement; every $10K+ prospect requires cost auditability.
[CEO] Displaces: Daemon self-improvement loop and marketplace integrations are deferred by 3 weeks.
[CEO] Delegated: CTO owns architecture; ED owns delivery plan and capacity allocation.
[CEO] Success metric: First enterprise client can view team token spend and export CSV within 3 weeks; leads to signed contract within 6 weeks.
[CEO] Reversal condition: If enterprise pipeline dries up (zero active prospects at $10K+ tier), deprioritize in favor of open-source adoption features.
```

---

### [CTO] Response

**Architecture Decision: Enterprise Team Dashboard**

This feature has four distinct technical domains: (1) real-time workstream aggregation, (2) token usage metering and storage, (3) CSV export, and (4) enterprise SSO. Each has different architectural implications. I will assess them individually and then address the integration surface.

**1. Real-time workstream view**

The framework already uses `.claude/memory/workstream-*-state.json` files for workstream tracking. A dashboard that reads these files is straightforward for a single project. The "across the org" requirement changes this — it implies aggregating workstream state across multiple project directories or multiple machines.

**Alternatives considered:**
- **Option A: File polling on shared filesystem** — Read workstream JSON files from a mounted shared directory. Simple, works on a LAN, breaks across geographies.
- **Option B: Lightweight API server** — A small HTTP service that agents push state updates to. Adds a deployment dependency but enables cross-machine visibility.
- **Option C: Git-based sync** — Push workstream state to a shared repo. Eventual consistency (seconds to minutes), no real-time guarantee.

**Build vs buy — real-time layer:**
```
[CTO] Option: build
[CTO] Engineering cost: ~1 week for a minimal WebSocket-backed aggregation server
[CTO] Operational burden: One additional process to run (lightweight Node/Python server)
[CTO] Threshold: This saves <2 weeks vs. buying a dashboard platform, and we need tight integration with our memory format. Falls on the build side.
[CTO] Recommendation: Build a thin aggregation API that reads workstream state files and serves them over WebSocket. No external dashboard dependency.
```

**2. Token spend tracking**

This does not exist in the current framework. We need to add metering at the agent invocation layer — capture input/output token counts per agent call, attribute to team member, and store with timestamps.

```
[CTO] Decision: Add a token metering middleware that wraps agent spawning, records usage to a local SQLite database with team_member, agent_type, tokens_in, tokens_out, timestamp columns.
[CTO] Alternatives considered: (a) Flat JSON files per day — simple but querying 30-day aggregates is painful. (b) SQLite — zero-dependency embedded database, handles time-range queries natively. (c) External analytics service — overkill for this scale.
[CTO] Rationale: SQLite is zero-dependency on every platform we support, handles time-windowed aggregation queries efficiently, and the team already knows SQL.
[CTO] Migration path: If we outgrow SQLite (>100 concurrent writers, >10M rows), migration to PostgreSQL is a connection-string change plus a schema migration script. The SQL queries remain identical.
[CTO] Break-even: SQLite handles this comfortably up to ~50 team members with 30-day retention. At 200+ team members with 90-day retention, evaluate PostgreSQL.
[CTO] Capability requirement: Team needs basic SQLite operational knowledge — WAL mode configuration, backup strategy. Estimated learning investment: 2-4 hours.
```

**3. CSV export**

Trivial engineering — a query against the SQLite metering table formatted as CSV. No architectural decision required. Estimate: 2-4 hours of implementation work.

**4. Enterprise SSO (SAML/OIDC)**

**Build vs buy — SSO:**
```
[CTO] Option: buy
[CTO] Engineering cost: Building SAML/OIDC from scratch is 3-4 weeks minimum. Integrating an auth library (e.g., passport.js with SAML strategy, or Auth0/WorkOS SDK) is 3-5 days.
[CTO] Operational burden: Auth0 or WorkOS adds a vendor dependency and per-seat cost. A self-hosted library (passport-saml) adds no vendor dependency but requires us to manage SAML certificate rotation.
[CTO] Threshold: SSO saves >1 month of engineering time by buying. Falls clearly on the buy side.
[CTO] Recommendation: Integrate WorkOS or passport-saml. WorkOS if we want zero operational burden on SAML/OIDC; passport-saml if we want no vendor lock-in. I recommend passport-saml given our open-source positioning — no vendor dependency for enterprise users to worry about.
```

**Cost tracking gap — COVERAGE GAP:** The token spend tracking requirement has a financial dimension — cost-per-token rates, budget thresholds, alerting on spend anomalies. This pipeline has no CFO agent to validate the financial model or cost attribution logic. The CTO can build the metering infrastructure, but whether the cost categories, aggregation periods, and export format match what enterprise finance teams actually need is a business question without an owner in this pipeline.

```
[CTO] Decision: Build the dashboard on a thin aggregation API (WebSocket) + SQLite metering store + passport-saml for SSO.
[CTO] Alternatives considered: External dashboard platform (Retool/Grafana) — rejected because tight integration with our memory format is required and adding a heavy dependency conflicts with our zero-dependency install story.
[CTO] Rationale: All components are buildable within the 3-week window, use zero-dependency or minimal-dependency technologies, and align with team capabilities.
[CTO] Migration path: If real-time requirements grow beyond single-server WebSocket (>500 concurrent dashboard viewers), add a Redis pub/sub layer in front. Migration is additive, not destructive — the WebSocket server becomes a subscriber instead of a poller.
[CTO] Break-even: This architecture handles up to ~50 teams, ~500 concurrent dashboard sessions. Beyond that, evaluate managed real-time infrastructure (e.g., Ably, Pusher).
[CTO] Capability requirement: Team needs WebSocket server development experience (estimated: already present) and passport-saml integration knowledge (estimated: 1-day spike).
```

---

### [ED] Response

**Capacity and Delivery Assessment: Enterprise Team Dashboard**

I am sizing this against a 3-week delivery window. Let me map the work, identify the critical path, and assess feasibility.

**Work breakdown and estimates:**

| Workstream | Estimate | Dependencies | Classification |
|-----------|----------|-------------|----------------|
| WS-TD1: Token metering middleware + SQLite store | 3-4 days | None (can start immediately) | ARCHITECTURAL |
| WS-TD2: Workstream aggregation API (WebSocket) | 4-5 days | None (can start immediately) | ARCHITECTURAL |
| WS-TD3: Dashboard UI (real-time view + spend charts) | 5-6 days | Blocked by WS-TD1 and WS-TD2 | MECHANICAL |
| WS-TD4: CSV export endpoint | 0.5 days | Blocked by WS-TD1 | MECHANICAL |
| WS-TD5: Enterprise SSO integration (passport-saml) | 3-4 days | None (can start immediately) | ARCHITECTURAL |
| WS-TD6: Brand standards compliance + visual polish | 2-3 days | Blocked by WS-TD3 | MECHANICAL |
| QA + integration testing | 3 days | Blocked by all above | MECHANICAL |

**Total engineering effort:** ~21-26 days of work.
**Calendar time with 2 engineers:** Let me map the critical path.

**Critical path analysis:**

```
Week 1:
  Engineer A: WS-TD1 (metering, 4d) -> WS-TD4 (CSV, 0.5d)
  Engineer B: WS-TD2 (aggregation API, 5d)

Week 2:
  Engineer A: WS-TD5 (SSO, 4d)
  Engineer B: WS-TD3 (dashboard UI, starts day 6, runs 6d into week 3)

Week 3:
  Engineer A: WS-TD6 (brand polish, 3d)
  Engineer B: WS-TD3 (completes day 2) -> QA integration (3d)
```

```
[ED] Initiative: Enterprise Team Dashboard
[ED] Capacity required: 2 engineers x 3 weeks = 6 engineer-weeks (100% of 2 engineers, 0% buffer)
[ED] Capacity available: 2 engineers, currently unblocked
[ED] Displaces: Daemon self-improvement loop, marketplace integrations
[ED] Risk: HIGH — this plan allocates 100% of engineering capacity with zero buffer. My constitution requires holding 20% buffer for unplanned work. At 80% allocation, this is a 3.5-week delivery, not 3 weeks.
```

**The 3-week target is at risk.** Here are two options:

**Option 1: Accept 3.5-week timeline (RECOMMENDED)**
Keep all requirements, add 0.5 weeks of buffer. Delivers with 80% capacity allocation, leaving room for unplanned work. SSO integration is the highest-risk workstream — if passport-saml has unexpected IdP compatibility issues, the buffer absorbs it.

**Option 2: Descope brand polish to hit 3 weeks**
Remove WS-TD6 (brand standards visual polish) from the initial delivery. Ship functional dashboard in 3 weeks, follow up with brand compliance in a 1-week sprint. This frees 2-3 days of buffer.

**Brand standards gap — COVERAGE GAP:** WS-TD6 (brand standards compliance) has no agent to review or approve it. Without a CMO or art-director in this pipeline, brand compliance is assigned to an engineer who may not have the context for what "PrivateEnterprise brand visual standards" means in practice. Risk: rework after delivery when someone with brand authority reviews it.

**Cost tracking gap — COVERAGE GAP:** WS-TD1 builds token metering, but the export format, cost categories, and financial reporting requirements have no CFO agent to validate. Risk: we build a CSV export that does not match what enterprise finance teams expect, requiring post-delivery rework.

**Blocker identification:**
```
[ED] Workstream: WS-TD3 (Dashboard UI)
[ED] Status: not-started (blocked by WS-TD1, WS-TD2)
[ED] Capacity used: 0% (planned: 100% of 2 engineers for 3 weeks)
[ED] Critical path: WS-TD1 + WS-TD2 (parallel, week 1) -> WS-TD3 (week 2-3) -> QA (week 3)
[ED] Blockers: Brand standards definition (no agent owns this); financial export format specification (no agent owns this)
[ED] Recommendation: Start WS-TD1 and WS-TD2 in parallel immediately. Escalate brand standards and financial format questions to CEO for owner assignment before WS-TD3 starts.
```

---

## Pipeline Gap Analysis

This section documents dimensions of the task that have no dedicated agent coverage in Pipeline A (CEO + CTO + ED).

| Requirement | Missing Agent | Impact | Who Absorbed It (Partially) | Quality of Coverage |
|------------|--------------|--------|---------------------------|-------------------|
| PrivateEnterprise brand visual standards | CMO / Art Director | Brand compliance is unvalidated — no agent has authority or expertise to approve visual standards | CEO noted the gap; ED flagged rework risk | LOW — acknowledged but not addressed |
| Token spend cost attribution for finance | CFO | Financial model, cost categories, budget thresholds, and export format have no financial expertise review | CTO designed metering infrastructure; ED noted export format risk | MEDIUM — infrastructure is sound, but financial domain validation is missing |
| Cost-benefit analysis of the initiative | CFO | No formal cost-to-serve analysis or ROI modeling | CEO provided directional business case but no quantified cost analysis | LOW — business case is intuitive, not modeled |
| Market positioning of enterprise features | CMO | No analysis of how this feature positions against competitors or affects open-source community perception | Not addressed by any agent | NONE — completely uncovered |

---

## Executive Review (Consolidated)

```
[CEO]   Business alignment — PASS: Enterprise Team Dashboard directly unblocks
        $10K+ procurement by providing cost auditability and activity visibility.
        Displaces daemon loop and marketplace work. Justified by enterprise
        conversion priority given 1-month runway.

[CTO]   Technical approach — PASS: SQLite metering + WebSocket aggregation API +
        passport-saml SSO. All zero-or-minimal-dependency. Architecture scales to
        ~50 teams / ~500 concurrent viewers before requiring infrastructure changes.
        Build-side for dashboard (tight integration needed), buy-side for SSO
        (>1 month saved).

[ED]    Operational readiness — CONDITIONAL PASS: 2 engineers x 3 weeks at 100%
        allocation violates 80% capacity rule. Recommend either 3.5-week timeline
        or descoping brand polish. Critical path is mapped; WS-TD1 and WS-TD2
        can parallelize in week 1. Two unresolved blockers: brand standards
        definition and financial export format specification need owners assigned.

[GAPS]  Pipeline coverage — TWO UNOWNED DIMENSIONS:
        (1) Brand standards (needs CMO/art-director) — risk of post-delivery rework
        (2) Financial model/export format (needs CFO) — risk of misaligned output
        Neither gap blocks development start, but both block confident delivery.
```

---

## Proposed Workstreams

| ID | Name | Acceptance Criteria | Classification | Estimate | Dependencies |
|----|------|-------------------|----------------|----------|-------------|
| WS-TD1 | Token metering middleware | Agent spawning records tokens_in, tokens_out, team_member, agent_type, timestamp to SQLite; queryable by 7d/30d window | ARCHITECTURAL | 3-4 days | None |
| WS-TD2 | Workstream aggregation API | WebSocket server reads workstream-*-state.json files, pushes real-time updates to connected clients; handles 50 concurrent connections | ARCHITECTURAL | 4-5 days | None |
| WS-TD3 | Dashboard UI | Browser-based dashboard displays live workstream status and token spend charts; updates without page refresh | MECHANICAL | 5-6 days | WS-TD1, WS-TD2 |
| WS-TD4 | CSV export | GET endpoint returns token spend data as CSV with columns: team_member, period, tokens_in, tokens_out, estimated_cost; supports 7d and 30d ranges | MECHANICAL | 0.5 days | WS-TD1 |
| WS-TD5 | Enterprise SSO | passport-saml integration; supports SAML 2.0 and OIDC; tested against Okta and Azure AD | ARCHITECTURAL | 3-4 days | None |
| WS-TD6 | Brand compliance | Dashboard UI matches PrivateEnterprise brand tokens (colors, typography, spacing); requires design review sign-off | MECHANICAL | 2-3 days | WS-TD3, brand standards spec (BLOCKED — no owner) |

---

## Observations

- **All three agents identified the CMO/brand gap independently.** CEO flagged it as an unvalidated assumption, CTO did not address it (correctly — outside technical scope), and ED flagged it as a blocker with rework risk. The gap was surfaced but not resolved — no agent has the authority to assign a brand standards owner.
- **The CFO gap was identified by CTO and ED but not CEO.** CEO provided a directional business case ("this enables enterprise conversion") but did not quantify cost-to-serve or ROI. The CEO constitution requires "CFO cost input first" for pricing/packaging decisions — this was not enforced because no CFO exists in the pipeline.
- **ED's capacity constraint was the most actionable output.** The 80% allocation rule surfaced a concrete delivery risk (3 weeks vs. 3.5 weeks) and provided two options with tradeoffs. This is the kind of operational friction that prevents schedule overruns.
- **CTO provided the most structured technical output** with explicit build-vs-buy thresholds, migration paths, and break-even points for each component — consistent with the CTO constitution's requirements.
- **No agent addressed competitive positioning or community impact** of shipping enterprise-only features in an open-source framework. This is a CMO concern that went completely unraised.
