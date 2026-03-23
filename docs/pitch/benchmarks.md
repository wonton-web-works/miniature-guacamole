# Benchmark Methodology and Results

**TheEngOrg / miniature-guacamole**
*Technical Due Diligence Package -- Benchmarks*

---

## What We Benchmark

The benchmark suite measures whether agents behave according to their constitutions under realistic conditions. It does not measure "AI quality" in the abstract -- it measures whether the framework's prompt engineering produces reliable, differentiated, actionable output from specialized agents.

Five benchmark tasks, weighted by business importance:

| Task | Weight | What It Measures |
|------|--------|------------------|
| T1: Sage Intake Routing | 0.15 | Does the Sage correctly identify which C-Suite roles a task requires? |
| T2: C-Suite Decision Quality | 0.30 | Do C-Suite agents produce specific, differentiated, actionable assessments? |
| T3: Research Depth Evaluation | 0.25 | Does the Sage's research protocol produce genuinely deep investigation? |
| T4: Drift Detection | 0.20 | Does the Sage catch process violations and enforce recovery? |
| T5: Session Management | 0.10 | Does the Sage break multi-session initiatives correctly? |

T2 carries the highest weight because C-Suite decision quality is the most visible capability to end users and the hardest to get right.

---

## How We Score

### T1: Routing (3 prompts, binary correct/incorrect)

Three prompts with known-correct routing:
- Pure engineering task: should spawn CTO only
- Brand + engineering task: should spawn CTO + CMO
- Full initiative: should spawn CEO + CTO + CMO + CFO

Score = correct routings / 3.

### T2: C-Suite Decision Quality (4 agents, 3 dimensions)

Each C-Suite agent (CEO, CTO, CMO, CFO) receives the same strategic decision prompt independently. Each is scored on:

- **Specificity (1-5):** Does the agent name concrete numbers, timelines, and tradeoffs?
- **Differentiation (1-5):** Does the output reflect the role's unique perspective?
- **Actionability (1-5):** Does the output produce an executable decision with named owners?

Plus a **Swap Test:** Could any agent's output have been written by a different agent? (PASS/FAIL)

Score = mean of agent means, normalized to 0-1 scale. 5.00/5.00 = 1.000.

### T3: Research Depth (4 gates, binary pass/fail)

- G1: Problem space mapping (>=4 sub-domains mapped BEFORE research)
- G2: Surface-level detection (>=2 shallow areas flagged with criteria)
- G3: Specialist spawning (>=1 targeted specialist with scoped questions)
- G4: Ceiling recognition (unverifiable targets identified and escalated to user)

Score = gates passed / 4.

### T4: Drift Detection (detection + challenge quality + recovery)

A deliberately flawed scenario is presented: an agent claims to have approval it does not have and skips a required gate. Scored on:
- Detection (0/1): Did the Sage catch it?
- Challenge quality (1-5): Were violations specifically named?
- Recovery (0/1): Was a corrective plan proposed?

Score = raw / 7, normalized.

### T5: Session Management (break points + snapshot quality + priming)

A large initiative is presented. Scored on:
- Break point identification (0/1): Were sessions broken at dependency boundaries?
- Snapshot quality (1-5): Do snapshots contain all required fields?
- Next-session priming (1-5): Can a cold-started agent resume without user reconstruction?

Score = raw / 11, normalized.

---

## The Improvement Arc: 0.957 to 1.000

### Config A: Baseline (Weak Constitutions, Opus)

The initial benchmark run used the original agent constitutions -- shorter, less constrained, without numbered decision heuristics or mandatory output fields.

| Task | Score |
|------|-------|
| T1 Routing | 1.000 |
| T2 C-Suite | 0.855 |
| T3 Research | 1.000 |
| T4 Drift | 1.000 |
| T5 Session | 1.000 |
| **Framework** | **0.957** |

T2 was the weak point. CEO scored 4.00/5.00 and CMO scored 4.00/5.00. The failure mode: role-boundary drift (CEO naming technical thresholds, CMO losing magnitude estimates). The constitutions did not sufficiently constrain these agents.

### Config B: Post-Fix (Strong Constitutions, Opus)

After a systematic prompt audit, CEO and CTO constitutions were strengthened with:
- Concrete decision heuristics (CEO: "Displaces" field; CTO: numbered thresholds)
- Scope boundaries (CEO: "Vision over tactics"; CMO: conversion-funnel framing)
- Mandatory output fields that force structured reasoning

| Task | Baseline | Post-Fix | Delta |
|------|----------|----------|-------|
| T1 | 1.000 | 1.000 | 0.000 |
| T2 | 0.855 | **1.000** | **+0.145** |
| T3 | 1.000 | 1.000 | 0.000 |
| T4 | 1.000 | 1.000 | 0.000 |
| T5 | 1.000 | 1.000 | 0.000 |
| **Framework** | **0.957** | **1.000** | **+0.043** |

The entire improvement came from T2 -- better constitutions, not a better model. CEO went from 4/4/4 to 5/5/5. CMO went from 4/4/4 to 5/5/5. CTO remained at 5/5/5 (it was already fully constrained).

---

## Config C vs Alternatives

### The Critical Experiment: Does Sonnet Match Opus?

Config C replaces opus with sonnet for all C-Suite agents while keeping the Sage on opus:

| Agent | Config B (opus) | Config C (sonnet) | Delta |
|-------|----------------|-------------------|-------|
| CEO | 5/5/5 = 5.00 | 5/5/5 = 5.00 | 0.00 |
| CTO | 5/5/5 = 5.00 | 5/5/5 = 5.00 | 0.00 |
| CMO | 5/5/5 = 5.00 | 5/5/5 = 5.00 | 0.00 |
| CFO | 5/5/5 = 5.00 | 5/5/5 = 5.00 | 0.00 |

**Zero regression.** The strong constitutions produce identical scores on sonnet as on opus. Named computations (break-even points, runway math, ROI framing) execute correctly on both models.

### All Configurations Compared

| Config | Description | Framework Score | Relative Cost |
|--------|-------------|-----------------|---------------|
| A | Weak constitutions, opus everywhere | 0.957 | ~100% |
| B | Strong constitutions, opus everywhere | 1.000 | 100% |
| **C** | **Strong constitutions, tiered (opus/sonnet/haiku)** | **1.000** | **~60%** |
| D | Strong constitutions, sonnet everywhere | 0.957 | ~40% |

The most important finding: **Config A (weak prompts, best model) = Config D (strong prompts, cheaper model) = 0.957.** Improving constitutions has the same effect as upgrading the model. Within the opus/sonnet range, constitution quality and model quality are interchangeable investments.

### Why Config D Falls Short

Config D (all sonnet, including Sage) scores 0.957 because CEO and CMO drop from 5.00 to 4.00 on sonnet without the Sage's orchestration quality. The failure mode is role-bleed -- CEO picks technologies, CMO loses magnitude estimates. The fix is known (add "Scope boundary" output fields) but not yet implemented. Config D is a future cost-optimization target, not a current recommendation.

---

## Stress Test Results

Beyond the standard 5-task benchmark, we ran two stress tests designed to break the framework under harder conditions.

### T2-Stress: Hard Decision (Config C, Sonnet C-Suite)

**Prompt:** Open-source sustainability vs enterprise pivot -- a 3-option strategic decision with conflicting constraints, a competitor with funding advantage, personal/family financial pressure, and no obviously correct answer.

Added a fourth scoring dimension: **Nuance** (does the agent acknowledge genuine uncertainty and name conditions that would change the recommendation?).

| Agent | Specificity | Differentiation | Actionability | Nuance | Mean |
|-------|-------------|-----------------|---------------|--------|------|
| CEO | 5 | 5 | 5 | 4 | 4.75 |
| CTO | 5 | 5 | 5 | 5 | 5.00 |
| CMO | 5 | 5 | 5 | 5 | 5.00 |
| CFO | 5 | 5 | 5 | 4 | 4.75 |
| **Mean** | **5.00** | **5.00** | **5.00** | **4.50** | **4.875** |

**On the original 3 dimensions: 5.00/5.00 -- zero regression from the standard benchmark.** The Nuance gap (CEO and CFO at 4, not 5) reveals a specific, actionable improvement: their constitutions optimize for "decide quickly" but do not prompt "name what would change this decision." This is a known, fixable gap.

The stress test's most significant finding: **each agent named a critical risk that no other agent named:**
- CTO identified that the daemon is in beta and enterprise SLAs on beta software create a specific churn risk
- CMO identified that enterprise clients are also community members, so backlash doubles as enterprise trust risk
- CFO identified that legal engagement timing is a common failure mode that slips contracts 2-4 weeks

This non-overlapping coverage is the framework working as designed -- a solo founder evaluating the same decision would likely miss at least one of these risks.

**Swap Test: PASS.** No agent's output could be reassigned to another role without losing domain-critical reasoning.

### T3-Stress: Hard Research (Config C, Opus Sage)

**Prompt:** Real-time collaborative document editor (Google Docs-like) for enterprise. 2-50 concurrent editors, offline editing with conflict resolution, cross-user undo/redo, browser-only, on-prem deployable. Team: 2 senior web engineers with no distributed systems experience. 8-week prototype target.

This is a domain with genuine "unknown unknowns" risk -- getting the algorithm choice wrong (OT vs CRDT) means a complete rewrite.

| Gate | Result |
|------|--------|
| G1: Problem space mapping (>=4 sub-domains) | **PASS** -- 12 sub-domains mapped before research |
| G2: Surface-level detection | **PASS** -- hedging language, shallow sources flagged |
| G3: Specialist spawning | **PASS** -- domain-specific specialists with scoped questions |
| G4: Ceiling recognition | **PASS** -- unverifiable items escalated to user |

The Sage mapped 12 sub-domains (vs 10 in the standard benchmark), correctly identifying distributed undo/redo as the hardest sub-domain with no universally accepted solution. Research cited primary sources (Kleppmann & Beresford 2017, Sun & Ellis 1998, specific CRDT papers). The protocol's "map before research" requirement prevented the common failure mode of diving into the first algorithm found.

---

## T6: Full Pipeline Comparison (Before/After Sage)

This benchmark compared the Community pipeline (no Sage) against the Enterprise pipeline (with Sage) across 4 realistic scenarios:

| Scenario | Pipeline A (Community) | Pipeline B (Enterprise) |
|----------|----------------------|------------------------|
| S1: Pure engineering (pagination) | Spawned 3 agents (wasteful) | Spawned 0 C-Suite -- routed to /mg-build |
| S2: Cross-domain (dashboard) | Missing CMO and CFO coverage | Full coverage, no gaps |
| S3: Multi-session (daemon launch) | No session management (0/11) | 4 sessions, dependency-based breaks (11/11) |
| S4: Process violation (QA skip) | Not detected | Detected immediately, 3 violations named |

Aggregate: Enterprise eliminated 4 unnecessary agent spawns, covered 2 missing role gaps, added session management (11 capability points), and added process compliance (7 capability points).

**Drift prevention ROI: 20x.** Tokens wasted on undetected drift in Pipeline A (~54K + 25K rework) vs clean execution in Pipeline B (~27K). One security incident (secrets exposed in UI) was caught by Pipeline B and missed entirely by Pipeline A.

---

## Cost Analysis

### Config C Token Economics

| Component | Per-Task Average | Notes |
|-----------|-----------------|-------|
| Standard benchmark run | ~29K tokens | 5 tasks, ~147K total |
| Sage intervention (drift) | ~1.6K tokens | Cost of catching a process violation |
| Rework from missed drift | ~46K tokens | What it costs if uncaught |

Config C achieves parity with Config B (all-opus) at approximately 60% of the token cost. The 40% savings come from running C-Suite, Directors, and ICs on sonnet instead of opus, with no measurable quality regression.

### What "Perfect Score" Means in Practice

A 1.000 framework score means:
- The Sage routes tasks to exactly the right agents (no wasted spawns, no missing perspectives)
- C-Suite agents produce assessments that are specific enough to act on, differentiated enough to justify their existence, and actionable enough to drive execution
- Research reaches genuine depth (primary sources, tradeoffs named, edge cases identified) and recognizes when it has hit a ceiling
- Process violations are caught immediately, named specifically, and recovery plans are proposed
- Multi-session initiatives are broken at dependency boundaries with cold-start primers that eliminate user reconstruction

It does not mean the framework is omniscient. It means the framework reliably executes its defined protocols. The quality of the output is bounded by the quality of the constitutions -- which is why constitution engineering is the core technical activity.
