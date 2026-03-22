# Benchmark T6: Leadership Team Planning — Pipeline B (Sage-Led), Stimulus S2
**Date:** 2026-03-22
**Pipeline:** B (Sage orchestrates selective C-Suite spawning)
**Stimulus:** S2 — Enterprise Team Dashboard feature request
**Methodology:** The Sage performs intake assessment, maps the problem space, selects C-Suite agents based on work type analysis, and documents the rationale — including what Pipeline A missed and why.

---

## Task Prompt

> We need to add a "Team Dashboard" feature for enterprise clients. Requirements:
> - Real-time view of all active workstreams across the org
> - Token spend tracking per team member (last 7 days, 30 days)
> - Export to CSV for finance reporting
> - Must match TheEngOrg brand visual standards
> - Enterprise SSO required for access
> - Target: 3-week delivery

---

## Sage Intake Flow

### Step 1: Assess Scope — Domain Mapping

Before spawning anyone, I map the domains this initiative touches:

| Domain | Requirement(s) | Why It Matters |
|--------|----------------|----------------|
| **Engineering / Architecture** | Real-time workstream aggregation, WebSocket API, token metering, SQLite storage, SSO integration, CSV export | This is the core build. Multiple architectural decisions (build vs. buy, data layer, auth strategy) require technical leadership. |
| **Product / Business Strategy** | Enterprise feature positioning, displacement of daemon/marketplace work, conversion pipeline impact | This initiative displaces other planned work. Someone needs to own the business tradeoff: is this the highest-leverage thing we can do with 1 month of runway? |
| **Brand / UX / Visual Design** | "Must match TheEngOrg brand visual standards" | This is an explicit requirement, not a nice-to-have. Brand compliance needs validation by someone with design authority. Without it, engineers guess at brand tokens and visual standards, leading to rework. |
| **Finance / Cost Modeling** | Token spend tracking, cost attribution, CSV export for finance reporting, cost-per-token rates | The feature itself is a financial reporting tool. The CSV export must match what enterprise finance teams expect — cost categories, aggregation periods, rate calculations. This is domain expertise, not engineering. |
| **Operations / Go-to-Market** | Enterprise SSO as a procurement gate, competitive positioning of enterprise features in an open-source framework, community perception | Shipping enterprise-gated features in an open-core model has community implications. How do we position this? |

**Problem Map Result:** This initiative spans engineering, business strategy, brand/UX, finance, and operations. It is a **full initiative**.

---

### Step 2: C-Suite Spawning Decision

Per the Sage spawning table:

| Work type | Spawn |
|-----------|-------|
| Full initiative | CEO, CTO, CMO/COO, CFO |

**Decision: Spawn all four C-Suite agents — CEO, CTO, CMO/COO, CFO.**

This is a full initiative. Here is the per-agent rationale:

---

#### CEO — SPAWN

**Why needed:**
- Business strategy ownership: This initiative displaces the daemon self-improvement loop and marketplace integrations. With 1 month of runway and 2 startup clients, the tradeoff between enterprise conversion and open-source growth features needs a strategic decision-maker.
- Priority arbitration: If the 3-week timeline compresses, the CEO decides what gets descoped — not the engineers.
- Success metrics and reversal conditions: The CEO defines when this initiative is working and when to pull the plug.

**What happens without CEO:** Engineering builds what was asked for, but nobody validates whether this is the right thing to build right now. The business case goes unexamined.

---

#### CTO — SPAWN

**Why needed:**
- Architecture decisions on four distinct technical domains: real-time aggregation, token metering/storage, CSV export, enterprise SSO.
- Build-vs-buy analysis for each component with explicit thresholds, migration paths, and break-even points.
- Technology selection with team capability assessment — does the team have WebSocket, SQLite, passport-saml experience?
- Scalability guardrails — at what user/team count does this architecture need to change?

**What happens without CTO:** No structured technical decision-making. Engineers pick technologies ad-hoc without evaluating alternatives, migration paths, or scalability boundaries.

---

#### CMO/COO — SPAWN

**Why needed:**
- **Brand standards validation is an explicit requirement.** "Must match TheEngOrg brand visual standards" is not a vague aspiration — it is a stated acceptance criterion. Without a CMO or design authority, brand compliance is an unvalidated assumption.
- **Design spec production:** Per our process (feedback_design_process.md), design agents produce visual specs (PNG/SVG/Figma), and engineers develop against those specs. Without CMO spawning the studio director and design agents, there are no visual specs — engineers are building UI blind.
- **Community positioning:** Shipping enterprise-gated features in an open-source framework has community implications. The CMO evaluates how to position this: Is the dashboard enterprise-only? Is a limited version available to open-source users? What is the messaging?
- **Competitive analysis:** How do competitor frameworks (Cursor teams, Windsurf enterprise, Devin teams) handle team dashboards? What is table stakes vs. differentiating?

**What happens without CMO:** This is exactly what Pipeline A demonstrated — all three agents (CEO, CTO, ED) independently flagged the brand standards gap but none could resolve it. The gap was surfaced but not addressed. Engineers would either guess at brand standards (rework risk) or block waiting for someone to define them (schedule risk). Additionally, competitive positioning and community impact went completely unraised.

---

#### CFO — SPAWN

**Why needed:**
- **The feature IS a financial reporting tool.** Token spend tracking with CSV export for finance reporting is not an engineering problem — it is a finance domain problem. The CFO validates: What cost categories do enterprise finance teams expect? What aggregation periods? What rate calculations (cost-per-token by model)? What budget threshold alerting?
- **Cost-to-serve analysis:** Running a real-time WebSocket aggregation server, SQLite database, and SSO infrastructure has operational costs. What does it cost us to serve each enterprise client? What is the break-even client count?
- **ROI modeling:** 2 engineers x 3 weeks is ~6 engineer-weeks. What is the expected return from enterprise conversions? Is the 3-week investment justified by the revenue pipeline?
- **Export format validation:** The CSV export must match what enterprise finance teams actually import into their systems. Column names, date formats, cost precision, currency handling — this is domain knowledge that engineers do not have.

**What happens without CFO:** This is the second gap Pipeline A demonstrated. The CTO designed sound metering infrastructure, but whether the cost categories, aggregation periods, and export format match enterprise finance expectations was flagged as a risk by both CTO and ED — with no agent able to resolve it. The CEO provided a directional business case ("this enables enterprise conversion") but did not quantify cost-to-serve or ROI, violating the CEO constitution's own rule requiring "CFO cost input first" for pricing/packaging decisions.

---

### Step 3: Comparison with Pipeline A

Pipeline A spawned: **CEO + CTO + ED** (no Sage, no CMO, no CFO).

| Dimension | Pipeline A (CEO+CTO+ED) | Pipeline B (Sage-led, Full C-Suite) |
|-----------|------------------------|-------------------------------------|
| **Business strategy** | CEO provided strong directional case. No quantified ROI. | CEO provides strategy; CFO provides quantified cost-to-serve and ROI model. Decision is data-backed, not intuitive. |
| **Technical architecture** | CTO output was excellent — structured build-vs-buy, migration paths, break-even analysis. | Same CTO output quality. No change needed here. |
| **Brand compliance** | ALL THREE agents flagged the gap. None could resolve it. ED marked WS-TD6 as BLOCKED with no owner. | CMO spawns studio director and design agents. Visual specs are produced before engineering starts WS-TD3 (Dashboard UI). Brand compliance is validated, not assumed. |
| **Financial model** | CTO and ED flagged the gap. CEO did not quantify. No cost categories, no export format validation. | CFO validates cost categories, aggregation periods, export format, and budget alerting requirements. CSV export is built to spec, not guessed. |
| **Competitive positioning** | Not addressed by any agent. Pipeline A observation: "completely uncovered." | CMO analyzes competitor enterprise dashboards and positions our offering. |
| **Community impact** | Not addressed. Enterprise-gating features in open-core has community implications. | CMO evaluates open-source vs. enterprise feature boundaries and messaging. |
| **Delivery planning** | ED provided strong capacity analysis with 80% rule enforcement. | ED reports to CTO (who spawns them). Same quality of delivery planning, but now ED's two blockers (brand spec, financial format) have owners — CMO and CFO respectively. |
| **Schedule risk** | ED identified WS-TD6 as blocked on brand standards (no owner). Proposed descoping it to hit 3 weeks. | Brand spec work starts in parallel with Week 1 engineering (CMO/studio director produce specs while engineers build WS-TD1 and WS-TD2). No descoping needed. |
| **Process integrity** | No process enforcement. CEO couldn't enforce its own CFO-cost-input rule because no CFO existed. | Sage enforces process gates. CEO's constitution requires CFO cost input — Sage ensures CFO is present to provide it. |

---

### Step 4: Planning Assessment

**Initiative classification:** Full initiative — engineering, product, brand, finance, and operations all involved.

**Team composition:**
- CEO: Business strategy, priority arbitration, success metrics
- CTO: Architecture decisions, technology selection, engineering leadership (spawns ED, engineers)
- CMO/COO: Brand standards, visual specs, competitive positioning, community messaging (spawns studio director, design agents)
- CFO: Cost modeling, export format validation, ROI analysis, budget alerting requirements

**Session plan (proposed):**

| Session | Scope | Agents Active | Output |
|---------|-------|---------------|--------|
| S1: Strategic alignment | CEO + CFO validate business case with quantified ROI. CFO models cost-to-serve. CEO confirms priority over daemon/marketplace. | CEO, CFO | Go/no-go decision with numbers, not intuition |
| S2: Architecture + design kickoff | CTO defines technical architecture. CMO/studio director begin brand spec and competitive analysis. CFO defines export format requirements. | CTO, CMO, CFO | Architecture decisions, visual spec WIP, CSV format spec |
| S3: Engineering sprint 1 | CTO/ED execute WS-TD1 (metering) and WS-TD2 (aggregation) in parallel. CMO delivers final visual specs. | CTO (via ED + engineers), CMO | Metering middleware, aggregation API, visual specs complete |
| S4: Engineering sprint 2 | WS-TD3 (dashboard UI built against visual specs), WS-TD5 (SSO). CFO reviews export prototype. | CTO (via ED + engineers), CFO | Dashboard UI, SSO integration, CSV export validated |
| S5: Polish + QA | WS-TD4 (CSV export), WS-TD6 (brand compliance review by CMO), integration testing. | CTO (via QA), CMO | Delivery-ready product |

**Key difference from Pipeline A's delivery plan:** Pipeline A's ED had to propose descoping brand polish (WS-TD6) to hit 3 weeks because brand specs did not exist and had no owner. In Pipeline B, brand spec production runs in parallel with Week 1 engineering, so WS-TD6 has its input ready when engineering reaches it. The 3-week timeline is achievable without descoping.

**Risks I am watching:**
1. **SSO integration complexity** — passport-saml IdP compatibility is the highest-risk technical workstream. If it runs long, it compresses QA.
2. **Brand spec delay** — If CMO/studio director specs are not ready by end of Week 1, WS-TD3 blocks.
3. **Export format scope creep** — CFO may surface finance requirements (multi-currency, tax attribution) that expand scope. Sage will enforce session boundaries.

**Escalation to user (pre-emptive):**
- Enterprise SSO: Do we have a specific IdP target (Okta, Azure AD, Google Workspace)? Testing against all three adds ~2 days. Narrowing to 1-2 reduces risk.
- Token cost rates: Are rates fixed per model, or do they vary by enterprise contract? This affects the metering schema design.

---

## Sage Assessment Summary

```
SAGE INTAKE ASSESSMENT
======================
Initiative:     Enterprise Team Dashboard
Classification: Full Initiative (engineering + product + brand + finance + ops)
C-Suite spawn:  CEO, CTO, CMO/COO, CFO (all four)
Timeline:       3 weeks — achievable with parallel brand spec production
Risk level:     MEDIUM (SSO complexity, brand spec timing)

PIPELINE A GAP ANALYSIS
========================
Pipeline A (CEO+CTO+ED) identified 4 gaps. Here is how Pipeline B resolves them:

  GAP 1: Brand standards (no CMO)
  Pipeline A: All 3 agents flagged it. None resolved it. WS-TD6 blocked.
  Pipeline B: CMO spawns studio director. Visual specs produced Week 1.
  Resolution: CLOSED

  GAP 2: Financial model / export format (no CFO)
  Pipeline A: CTO + ED flagged risk. CEO violated own constitution (no CFO cost input).
  Pipeline B: CFO validates cost categories, export format, ROI model.
  Resolution: CLOSED

  GAP 3: Competitive positioning (no CMO)
  Pipeline A: "Completely uncovered" per gap analysis.
  Pipeline B: CMO analyzes competitor enterprise dashboards.
  Resolution: CLOSED

  GAP 4: Community impact of enterprise-gating (no CMO)
  Pipeline A: Not addressed.
  Pipeline B: CMO evaluates open-source vs. enterprise feature boundaries.
  Resolution: CLOSED

PROCESS INTEGRITY
=================
Pipeline A could not enforce its own rules:
  - CEO constitution requires "CFO cost input first" for pricing decisions
  - No CFO existed to provide it
  - No Sage existed to catch the violation

Pipeline B: Sage enforces gates. CFO is present. Constitution is honored.

WHAT THE SAGE ADDS (BEYOND AGENT SELECTION)
============================================
1. Domain mapping BEFORE spawning — prevents spawning too few or too many
2. Gap detection by design — not discovered after the fact
3. Session scoping — 5 sessions, each with clear scope and output
4. Process enforcement — constitutions are honored, not just written
5. Pre-emptive escalation — SSO target and token rate questions raised
   before they become blockers, not after
6. Parallel workstream planning — brand specs and engineering run
   concurrently, eliminating the schedule compression Pipeline A faced
```

---

## Methodology Note

This benchmark compares Pipeline A (no orchestrator, fixed agent set) against Pipeline B (Sage-orchestrated, selective spawning). The Sage does not produce better individual agent outputs — the CTO's architecture decisions, the CEO's business case, and the ED's capacity analysis are the same quality in both pipelines. What the Sage adds is:

1. **Completeness** — the right agents are present for the work type, so gaps are prevented rather than discovered.
2. **Process integrity** — constitutional rules are enforced, not just documented.
3. **Coordination** — parallel workstreams are planned so dependencies are satisfied on time.
4. **Pre-emptive risk management** — unknowns are surfaced as questions to the user before they become blockers.

The value of orchestration is not in doing the work better — it is in ensuring the right work gets done by the right agents at the right time.
