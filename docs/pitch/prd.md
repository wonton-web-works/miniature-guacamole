# TheEngOrg — Product Requirements Document
**WS-PITCH-04 | CEO Deliverable | Data Room Document**
*As of: 2026-03-22 | Business Product Definition for Investors*

---

## What TheEngOrg Is

TheEngOrg is an AI engineering organization framework that transforms Claude Code from a single-agent coding assistant into a coordinated product development team. It provides 24 specialized AI agents — each with a defined role, decision scope, and quality standard — organized into a hierarchy that mirrors how real engineering organizations operate: a Sage orchestrator at the top, C-Suite agents for strategic decisions, directors for workstream management, and specialists for execution. The customer does not get a smarter copilot. They get an entire engineering organization that plans, architects, builds, tests, reviews, and ships — governed by the same quality gates and coordination protocols used by high-performing human teams.

---

## The Problem

### Engineering teams cannot scale, and AI agents are making coordination worse

Software engineering is the largest cost center in every technology company. A team of 10 engineers costs $1.5-2.5M/year in fully-loaded compensation. Most of that cost is not writing code — it is coordination: planning, code review, QA cycles, specification alignment, context-switching between workstreams, and the overhead of making sure 10 people are building the same thing.

AI coding tools (Copilot, Cursor, Devin) have made individual developers faster at writing code. But they have not addressed — and in many cases have worsened — the coordination problem. When every developer has an AI assistant generating code at 5x speed, the bottleneck shifts:

- **Code review queues explode.** More code produced per developer means more code to review.
- **Quality variance increases.** AI-generated code is faster but inconsistent — different agents produce different patterns, different error-handling approaches, different architectural assumptions.
- **Scope drift accelerates.** AI agents that execute without organizational context do not know when they are building the wrong thing. They build it faster, which makes the mistake more expensive.
- **The founder becomes the coordination bottleneck.** In a 5-person startup, the founder was already the project manager, architect, and QA lead. Now they are also the AI-wrangler — reviewing output from 5 developers each running AI assistants, trying to maintain coherence across the codebase.

The fundamental problem: **AI has accelerated code production without accelerating code coordination.** The industry has built faster engines without building a car.

### Who feels this pain most

| Customer Segment | Pain Intensity | Why |
|---|---|---|
| Solo founders building with AI | Critical | They ARE the coordination layer — every context-switch is founder time |
| Startups (5-15 engineers) | Severe | Fast enough to generate chaos, too small for process overhead |
| Scale-ups (15-50 engineers) | High | Existing process does not account for AI-augmented velocity |
| Enterprise (50+ engineers) | Moderate but growing | AI adoption is mandated from above; governance is not keeping pace |

**Primary target at seed stage:** Solo founders and startups with 5-15 engineers. These are the customers who cannot afford to hire a VP of Engineering to solve the coordination problem, and who will adopt an AI solution immediately because they are already living inside Claude Code.

---

## The Solution: Organizational Intelligence

### What organizational intelligence means

TheEngOrg does not generate code. It organizes the intelligence that generates code.

The product is a hierarchical multi-agent framework where each agent has:

1. **A constitution** — a structured role definition that specifies what the agent does, what it cannot do, what output it must produce, and what anti-patterns it must avoid. These are not prompts. They are behavioral specifications with numbered constraints, mandatory output fields, and explicit scope boundaries.

2. **A position in the hierarchy** — the Sage orchestrator spawns C-Suite agents (CEO, CTO, CMO/COO, CFO) selectively based on work type. C-Suite agents spawn directors. Directors spawn specialists. No agent reaches past its level. The CEO does not assign tickets to engineers.

3. **Quality gates** — every piece of work passes through a structured pipeline: classify the work, write tests first, build against tests, review against specification, ship only when gates pass. The Sage monitors this pipeline and intervenes when quality drifts.

4. **Memory and coordination protocols** — agents hand off work through structured envelopes. Decisions are recorded. Workstream state is tracked. The system maintains organizational memory across sessions.

### How it works in practice

A customer types a request into Claude Code — "Build a user authentication system with OAuth2 support."

Without TheEngOrg: Claude generates code. Maybe good code. Maybe code that contradicts the existing architecture. Maybe code without tests. The developer reviews it, maybe catches the problems, maybe does not.

With TheEngOrg: The Sage reads the request and classifies it as an architectural initiative requiring CTO and CEO input. The CTO selects the technical approach, evaluates build-vs-buy, names the migration path. The CEO frames the business impact. The Engineering Director breaks it into workstreams. The Dev agent writes tests first (misuse cases before happy paths). QA validates. Security reviews. The customer gets a complete, reviewed, tested implementation — not a code suggestion.

The customer's 5-person team ships with the coordination quality of a 30-person organization.

---

## Community vs. Enterprise Editions

### What is free (Community Edition — MIT License)

| Component | Included | Details |
|---|---|---|
| Agents | 23 of 24 | All agents except Sage |
| Supervisor | Yes | Community-tier orchestrator (always spawns 3 C-Suite) |
| Skills | All 16 | Full workflow library |
| Protocols | All 6 | Development workflow, TDD, memory, handoff, engineering principles, visual formatting |
| Quality gates | Yes | Gate-based pipeline fully functional |
| Agent constitutions | Full text, MIT licensed | Open source, forkable, modifiable |

The community edition is not crippled. It is a fully functional AI engineering organization. Developers can install it, use it, contribute to it, and build on top of it. The open-source distribution is the primary customer acquisition channel.

### What is paid (Enterprise Edition)

| Capability | Why It Matters | Community Alternative |
|---|---|---|
| **Sage agent** | Selective spawning (0-4 C-Suite vs. always 3), drift detection, session management, research evaluation | Supervisor (functional but less efficient — wastes ~40% more tokens, misses drift) |
| **Session management** | Dependency-based session breaks, YAML snapshots, cold-start primers for multi-session initiatives | None — community loses context across sessions |
| **Drift detection** | Sage catches scope drift at line one, not three workstreams later | Not detected until gate failure |
| **Selective routing** | Pure engineering tasks spawn CTO only; full initiatives spawn full C-Suite | Always spawns CEO + CTO + Engineering Director regardless of work type |
| **Research depth** | Structured evaluation: problem mapping, gap detection, specialist spawning, ceiling recognition | No structured research evaluation |
| **Process enforcement** | Active enforcement — named violations, recovery plans | Passive — rules exist but enforcement is after-the-fact |

### Why this split works commercially

The community edition acquires users. The enterprise edition converts the users who hit scale limitations. The conversion trigger is natural: a developer using the community edition on a solo project does not need the Sage. A team of 10 running parallel workstreams needs selective spawning, drift detection, and session management — or they waste tokens and miss quality problems.

This is the same open-core motion as HashiCorp (Terraform free, Terraform Cloud paid), Grafana Labs (Grafana free, Grafana Enterprise paid), and GitLab (Community Edition free, Enterprise paid). The pattern is proven: open-source creates distribution, enterprise features monetize coordination complexity.

**Benchmark evidence for the split:**
- Community (Supervisor) S3 multi-session score: 0/11
- Enterprise (Sage) S3 multi-session score: 11/11
- Community spawned 4 unnecessary agents in T6 pipeline
- Enterprise spawned exactly the right agents every time

The gap is not marginal. It is categorical.

---

## Product Roadmap — Next 12 Months

### What exists today (Month 0)

- 24 agent constitutions, benchmarked and refined through iterative testing
- Sage agent scoring 1.000 on quality benchmarks (perfect across all evaluation criteria)
- 16 skill workflows covering the full development lifecycle
- 6 shared protocols for coordination, memory, handoff, and quality
- Open-source community edition live on GitHub
- 2 pilot customers in onboarding
- Config C optimization: opus for judgment (Sage, C-Suite), sonnet for execution (specialists) — 60% cost of all-opus, same quality output

### Q2 2026 (Months 1-3): Foundation

| Deliverable | Purpose |
|---|---|
| Enterprise licensing infrastructure | Sage key management, usage tracking, billing integration |
| Pilot customer onboarding (2 accounts) | Generate case study data: velocity metrics, defect reduction, cost savings |
| Benchmark suite v2 | Expanded test scenarios for enterprise-grade validation |
| Community growth program | GitHub presence, documentation, first conference talk |

### Q3 2026 (Months 4-6): Traction

| Deliverable | Purpose |
|---|---|
| Founding Partner tier launch | 5-8 lighthouse accounts at $1,500/mo for case study generation |
| Organizational memory persistence | Cross-session learning: the Sage remembers past decisions and patterns |
| Multi-workstream dashboard | Visibility into parallel agent workstreams for team leads |
| First case study published | Quantified ROI from pilot customer data |

### Q4 2026 (Months 7-9): Scale Preparation

| Deliverable | Purpose |
|---|---|
| Enterprise tier launch ($3,000-5,000/mo) | Full commercial offering with onboarding and support |
| Compliance and audit agent module | Enterprise security: activity logs, decision trails, audit export |
| Team collaboration features | Multiple humans coordinating with shared agent organization |
| API and integration layer | Programmatic access for CI/CD integration |

### Q1 2027 (Months 10-12): Growth

| Deliverable | Purpose |
|---|---|
| Strategic tier launch ($10,000-15,000/mo) | Large team support, dedicated onboarding, SLA |
| Platform expansion research | Evaluate second platform beyond Claude Code (if market signals warrant) |
| Advanced analytics | Team productivity metrics, agent utilization, ROI reporting |
| Series A preparation | Financial package, updated metrics, growth trajectory |

### What is deliberately NOT on the roadmap

- **Multi-model support before Month 12.** Claude Code is the fastest-growing agentic platform. Diluting engineering focus across platforms before achieving product-market fit on one platform is a strategic error. Config C already proves constitutions are model-tier portable (opus to sonnet). Full platform portability is a Year 2 initiative.

- **Self-hosted enterprise deployment before Month 9.** On-premise adds sales cycle complexity and support burden. Cloud-first (customer's own API key) is the right model until enterprise procurement requires otherwise.

- **Custom agent creation tools before Month 12.** Letting customers define their own agents is a powerful feature but introduces quality variance that undermines the brand promise. The Sage's value is that it enforces known-good constitutions. Custom agents bypass that guarantee.

---

## The Sage Differential

### Why enterprise customers pay

The Sage is not a premium feature bolted onto the community edition. It is an architectural layer that changes how the entire system operates.

**Without Sage (Community):**
- The Supervisor always spawns 3 C-Suite agents regardless of task complexity
- A simple bug fix triggers CEO, CTO, and Engineering Director deliberation — wasteful
- Multi-session initiatives lose context — each session starts from scratch
- Drift is detected only when a quality gate fails — after the work is done
- Process rules exist but are not actively enforced

**With Sage (Enterprise):**
- The Sage reads the work request and spawns 0-4 C-Suite agents based on actual need
- A bug fix spawns CTO only. A pricing change spawns CEO + CFO. A full product initiative spawns all four.
- Multi-session initiatives are managed with dependency-based breaks, YAML snapshots, and cold-start primers
- Drift is detected in real-time — the Sage challenges work in progress, not just finished work
- Process compliance is active — the Sage names the violation, identifies the impact, and provides a recovery plan

**The economic argument:**
- Selective spawning saves 40-60% in token costs for routine tasks
- Drift detection prevents cascading rework that costs 10-20x the cost of catching it early
- Session management enables multi-day initiatives that would otherwise fail at community tier

**The quality argument:**
- Sage benchmark: 1.000 (perfect)
- Supervisor benchmark: significantly lower across multi-session and process enforcement scenarios
- The gap is not "slightly better" — it is "works vs. does not work" for enterprise use cases

### Why the Sage cannot be easily replicated

The Sage is the most complex constitution in the system. It must understand what every other agent does in order to route correctly. It must judge when to intervene and when to let agents execute. It must manage state across sessions without the crutch of a persistent database.

Building an orchestrator that matches one agent is straightforward. Building an orchestrator that understands 23 other agents and coordinates them into coherent multi-session initiatives — that is the system engineering problem that took iterative benchmarking to solve. The benchmark results (0.957 for weak constitutions on opus vs. 1.000 for strong constitutions on sonnet) demonstrate that this orchestration quality comes from constitution engineering, not model capability.

---

## Key Metrics for Investor Evaluation

| Metric | Current | Month 6 Target | Month 12 Target |
|---|---|---|---|
| Sage benchmark score | 1.000 | 1.000 (maintained) | 1.000 (expanded test suite) |
| Community GitHub users | ~200 | 1,500+ | 5,000+ |
| Paid customers | 0 (2 pilots in onboarding) | 8-12 | 32+ |
| ARR | $0 | $180K-300K | $1.3-2.4M |
| Net Revenue Retention | N/A | Tracking begins | Target 100%+ |
| Customer token cost savings | Estimated 40-60% | Measured from pilots | Published in case study |
| Agent constitutions | 24 | 24 (refined) | 26-28 (compliance, analytics) |

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Anthropic ships competing multi-agent feature | Medium | High | Constitutions are the value layer above any platform. If Anthropic ships multi-agent infrastructure, TheEngOrg becomes the "agent definitions" layer on top. Config C proves constitutions hold across model tiers. |
| Claude Code adoption stalls | Low | Critical | The framework architecture is structured English — portable to any agentic platform. The constitutions are the asset, not the tooling integration. |
| Competitor replicates open-source agents | Medium | Low | Community agents are intentionally open. The Sage is enterprise-only. Replicating 24 agents is table stakes; replicating the Sage orchestration layer and benchmark-driven quality is the hard part. |
| Pilot customers do not convert | Medium | Medium | Founding Partner pricing ($1,500/mo) is designed to minimize conversion friction. If pilots show <2x productivity improvement, the product needs refinement before scaling — the 36-month runway allows this. |
| Solo founder risk | High | High | First hire is Month 2 (senior engineer contract). Revenue-triggered hiring plan adds capacity as the business proves itself. The framework itself is the founder's force multiplier — TheEngOrg builds TheEngOrg. |

---

*This document defines the product in business terms for investor due diligence. Technical architecture details are in the CTO's defensibility analysis. Financial projections are in the CFO's financial model. Both are available in the data room.*
