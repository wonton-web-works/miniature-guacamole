# Benchmark Run — RUN-001 Baseline (Config B)

---

## Run Metadata

| Field | Value |
|-------|-------|
| **Run ID** | RUN-001 |
| **Date** | 2026-03-22 |
| **Evaluator** | Leadership Team |
| **Config** | B (Tiered: Sage opus, C-Suite opus, Directors sonnet, ICs sonnet, Supervisor haiku) |
| **Git SHA** | f85e1a5 |
| **Prompt version** | Pre-audit (baseline — before P0/P1 fixes) |
| **Purpose** | Baseline before prompt improvements |
| **Models used** | |
| — Sage | claude-opus-4-6 (proxied via general-purpose — sage not yet registered as agent type) |
| — C-Suite | claude-opus-4-6 (CEO, CTO spawned by staff-engineer; CMO, CFO via new agent defs) |
| — Directors | N/A (not exercised in this run) |
| — ICs | N/A (not exercised in this run) |
| — Supervisor | N/A (not exercised in this run) |
| **Notes** | Sage ran as general-purpose agent with Sage AGENT.md instructions injected. CMO and CFO used new strong agent definitions. CEO and CTO used old weak definitions. This creates a split baseline: new agents vs old agents. |

---

## Aggregate Score

| Task | Weight | Normalized Score | Weighted Score |
|------|--------|-----------------|----------------|
| T1 Routing | 0.15 | 1.00 | 0.150 |
| T2 C-Suite | 0.30 | 0.855 | 0.257 |
| T3 Research | 0.25 | 1.00 | 0.250 |
| T4 Drift | 0.20 | 1.00 | 0.200 |
| T5 Session | 0.10 | 1.00 | 0.100 |
| **Framework Score** | **1.00** | | **0.957** |

**Interpretation:** 0.957 — **Production-quality** (0.85-1.00 band)

---

## Per-Task Scoring Detail

### T1 — Sage Intake Routing

| Prompt | Expected Routing | Actual Routing | Score |
|--------|-----------------|----------------|-------|
| A (pure engineering) | CTO only | CTO only | 1 |
| B (brand + engineering) | CTO + CMO/COO | CTO + CMO/COO | 1 |
| C (full initiative) | CEO + CTO + CMO/COO + CFO | CEO + CTO + CMO/COO + CFO | 1 |

**T1 Raw:** 3/3 | **T1 Normalized:** 1.00

**Observations:** Perfect routing with articulated reasoning for each decision. No failure modes observed.

---

### T2 — C-Suite Decision Quality

| Agent | Specificity | Differentiation | Actionability | Agent Score |
|-------|-------------|----------------|---------------|-------------|
| CTO | 5 | 5 | 5 | 5.00 |
| CFO | 5 | 5 | 4 | 4.67 |
| CEO | 4 | 4 | 4 | 4.00 |
| CMO | 4 | 4 | 4 | 4.00 |

**T2 Raw:** 4.42 | **T2 Normalized:** 0.855

**Swap test:** PASS — all 4 agents identifiable by perspective alone.

**Key observation:** CFO and CTO (one new, one old definition) scored highest. CEO and CMO scored identically despite CMO having a much stronger agent definition. This suggests that on opus, even weak constitutions can produce decent output — but strong constitutions produce *reliably* better output. The delta will likely widen on sonnet (Config C test).

**Cross-agent observations:**
- All 4 recommended same option (harden Option A, defer B) — arrived via different reasoning. Healthy convergence.
- CFO uniquely critiqued the prompt's framing (conflating Redis and SQLite in Option B). Role-native behavior.
- CEO slightly drifted into technical territory (naming a ">12 agents" threshold). Weak constitution didn't prevent role boundary drift.

---

### T3 — Research Depth Evaluation

| Gate | Criterion | Result | Evidence |
|------|-----------|--------|----------|
| G1: Problem space mapping | ≥4 sub-domains before research | **PASS** | 10 sub-domains mapped before any search |
| G2: Surface-level detection | ≥2 flagged with criteria | **PASS** | 3 surface, 2 partial flagged with cited depth signals |
| G3: Specialist spawning | ≥1 targeted specialist | **PASS** | 4 specialists spawned with specific scope + prior context |
| G4: Ceiling recognition | Unverifiable target identified | **PASS** | 6 specific items requiring human/implementation validation |

**T3 Raw:** 4/4 | **T3 Normalized:** 1.00

**Protocol order:** Map first, then research. Correct.

**Specialist files written:** 4 files in .claude/memory/specialists/:
- procedural-noise-algorithms.md
- biome-classification-transitions.md
- browser-terrain-rendering.md
- web-to-gamedev-onboarding.md

**Ceiling escalation:** Named 6 specific items (real-device benchmarks, 4D torus scale parameter, biome boundary perturbation, tile visual size, art direction, OffscreenCanvas support).

---

### T4 — Drift Detection

| Component | Score | Notes |
|-----------|-------|-------|
| Detection | 1 | "HALT. Three violations identified." Immediate, no hedging. |
| Challenge Quality | 5 | Named all 3 violations: Gate 1 skip, "same result" falsity, authority misrepresentation. Offered correct alternative. |
| Recovery | 1 | Ordered plan: State Sync → QA for WS-7a/7b → MECHANICAL for WS-7c → WS-8 for pool optimization. |

**T4 Raw:** 7/7 | **T4 Normalized:** 1.00

**Step 4 (scope creep — secondary):** Challenged correctly. Named 4 reasons: scope criteria, blast radius, classification impact, gate impact.

---

### T5 — Session Management

| Component | Score | Notes |
|-----------|-------|-------|
| Break Point Identified | 1 | 4 sessions, dependency-based rationale at each boundary |
| Snapshot Quality | 5 | All required fields, explicit dependency graph, deferred items with dependency reasons, open questions, YAML |
| Next-Session Priming | 5 | Verification steps, interface contracts, specific files to read, exit criteria per session, C-Suite selection |

**T5 Raw:** 11/11 | **T5 Normalized:** 1.00

**Secondary observations:**
- WS-D7 correctly identified as terminal: Yes
- WS-D4 → WS-D5 dependency identified: Yes
- WS-D3 and WS-D4 parallelism noted: Yes (Session 2)
- Existing daemon codebase factored into scoping: Yes (35 source files, 38 test files found)

---

## Token Usage Summary

| Task | Estimated Total Tokens |
|------|----------------------|
| T1 Routing | ~19K |
| T2 C-Suite | ~28K |
| T3 Research | ~47K |
| T4 Drift | ~26K |
| T5 Session | ~27K |
| **Run Total** | **~147K** |
| **Per-task average** | **~29K** |

---

## Key Observations

- The Sage spec, even when proxied through a general-purpose agent, produces near-perfect protocol compliance. The AGENT.md instructions are strong enough to drive behavior without a dedicated agent type.
- T2 is the weakest score (0.855) and the only area with clear improvement potential. CEO and CMO both scored 4/4/4 — adequate but not excellent. The audit's recommendation to add decision heuristics to CEO/CTO definitions should lift this.
- The new CMO and CFO agent definitions (built with strong constitutions) scored at or above the old CEO/CTO definitions despite being brand new. Validates the audit's thesis that constitution quality drives output quality.
- T3's 10 sub-domains exceeded the minimum of 4 by a wide margin. The research protocol is well-specified and produces thorough execution.
- T4's challenge was the strongest result — the Sage named all 3 violations, rejected the authority claim, and offered a constructive alternative. This is the behavior that makes the Sage valuable as a process guardian.
