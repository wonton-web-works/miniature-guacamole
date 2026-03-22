# Benchmark Scoring Methodology

**Version:** 1.0
**Date:** 2026-03-22

---

## Overview

The benchmark harness measures agent quality across five task types. Scores are used to:

1. Establish a baseline for current prompt quality
2. Measure improvement after prompt changes
3. Compare model configurations (Config A through D)
4. Identify which task types are most sensitive to model quality

This document defines the scoring rubrics, normalization method, aggregate calculation, model matrix format, and delta calculation for before/after comparisons.

---

## Per-Task Scoring Rubrics

### T1 — Sage Intake Routing

**Scoring type:** Binary per prompt, aggregate out of 3

| Score | Description |
|-------|-------------|
| 1.0 | Correct routing. Exact match to expected C-Suite set. |
| 0.5 | One agent missing OR one extra non-C-Suite agent included, with documented rationale (Prompt C only) |
| 0.0 | Incorrect routing. Wrong agents selected. |

**Normalized score:** Raw score / 3.0 → range [0, 1]

**What distinguishes quality levels:**

A score of 3/3 indicates the Sage has calibrated scope discrimination — it recognizes pure engineering vs. brand-adjacent vs. full-initiative work and routes accordingly.

A score of 1/3 or 2/3 typically indicates one of two failure modes: (a) defaulting to full C-Suite for all prompts (no filtering), or (b) never spawning more than CTO (no escalation recognition).

---

### T2 — C-Suite Decision Quality

**Scoring type:** 3 rubric dimensions × 4 agents, 1-5 scale

**Per-dimension rubric:**

#### Specificity

| Score | Threshold |
|-------|-----------|
| 5 | 3+ specific, verifiable claims. At least one number or named condition. States what would change the recommendation. |
| 4 | 2 specific claims. One named threshold or condition. |
| 3 | 1 specific claim. Remainder is framing. |
| 2 | No specific claims. All high-level assertions. |
| 1 | Pure platitudes. Indistinguishable from boilerplate. |

**Test:** Apply the "swap test" — could this specific claim appear in a totally different decision? If yes, it's not specific enough for a 4 or 5. "This adds operational complexity" is not specific. "A Redis dependency changes the setup story from `npm install` to `npm install && brew install redis`" is specific.

#### Differentiation

| Score | Threshold |
|-------|-----------|
| 5 | Perspective is irreplaceable. Contains observations that only this role would make, drawing on role-specific knowledge (e.g., CFO reasons about maintenance cost burden; CEO reasons about open-source adoption risk). |
| 4 | Mostly role-specific. Overlaps slightly with one other agent but has a distinct core. |
| 3 | Half role-specific, half generic executive language. |
| 2 | Primarily generic with one role-specific line. |
| 1 | Indistinguishable from another C-Suite agent. Swap test: outputs could be exchanged without loss. |

**Differentiation swap test procedure:**
- Read all four agent outputs blind (remove agent labels).
- If you cannot reliably assign each output to its agent, Differentiation scores are 1-2.
- If you can identify each agent's output from perspective alone, Differentiation scores are 4-5.

#### Actionability

| Score | Threshold |
|-------|-----------|
| 5 | Explicit recommendation with trigger criteria or conditions. Reader knows exactly what to do next and under what conditions to reconsider. |
| 4 | Clear recommendation. Conditions for reconsideration implied but not stated explicitly. |
| 3 | Recommendation present but hedged. Two options offered without tiebreaker. |
| 2 | Analysis only. No recommendation. |
| 1 | No recommendation, no analysis. Restatement of input. |

**Per-agent score:**

```
Agent_Score = (Specificity + Differentiation + Actionability) / 3
```

**Task aggregate:**

```
T2_Score = (CEO_Score + CTO_Score + CMO_Score + CFO_Score) / 4
```

**Normalized:** Already on 1-5 scale. Convert to [0, 1] by dividing by 5 for aggregate calculations.

---

### T3 — Research Depth Evaluation

**Scoring type:** 4 binary gates

| Gate | Criterion | Pass = 1, Fail = 0 |
|------|-----------|-------------------|
| G1: Problem space mapping | Map produced before research, ≥4 sub-domains | Binary |
| G2: Surface-level detection | ≥2 sub-domains identified as surface-level with cited criteria | Binary |
| G3: Specialist spawning | ≥1 specialist spawned with targeted scope + structured prompt | Binary |
| G4: Ceiling recognition | Performance target identified as unverifiable via research alone | Binary |

**Task score:** Gates passed / 4 → range [0, 1]

**Gate quality ladder** (for same-score disambiguation):

When two runs both pass 3/4 gates, use this ordering to determine which is higher quality:

1. G1 pass is the foundation — failing G1 while passing others indicates luck, not protocol compliance
2. G3 pass is the most diagnostic — specialist spawning is the most distinctive behavior the Sage has
3. G2 and G4 are roughly equal in diagnostic value

A run that passes G1+G2+G3 but fails G4 is higher quality than a run that passes G2+G3+G4 but fails G1.

---

### T4 — Drift Detection

**Scoring type:** 2 binary gates + 1 rubric dimension

| Component | Type | Range |
|-----------|------|-------|
| Detection | Binary | 0 or 1 |
| Challenge Quality | Rubric 1-5 | 1-5 |
| Recovery | Binary | 0 or 1 |

**Challenge Quality rubric:**

| Score | Descriptor |
|-------|-----------|
| 5 | Names the specific protocol violated. Rejects the authority claim. Offers correct alternative path. No hedging. |
| 4 | Names the specific protocol violated. Rejects timeline pressure as override justification. No alternative path offered. |
| 3 | Challenges the process skip but frames it as a recommendation ("best practice") rather than enforcement. Partial authority. |
| 2 | Expresses concern without naming the specific violation. Suggests escalating to leadership without making the call itself. |
| 1 | Accepts the proposal with a note of concern. Not a challenge. |

**Task score:**

```
T4_Raw = Detection + Challenge_Quality + Recovery
T4_Max = 1 + 5 + 1 = 7
T4_Normalized = T4_Raw / 7 → range [0, 1]
```

**Minimum passing threshold on normalized score:** 0.71 (5/7)

If Detection = 0 (the Sage did not challenge the process skip), Challenge Quality defaults to 1 (the failure to detect is itself a poor challenge), regardless of what the Sage said after the fact.

---

### T5 — Session Management

**Scoring type:** 1 binary gate + 2 rubric dimensions

| Component | Type | Range |
|-----------|------|-------|
| Break Point Identified | Binary | 0 or 1 |
| Snapshot Quality | Rubric 1-5 | 1-5 |
| Next-Session Priming | Rubric 1-5 | 1-5 |

**Snapshot Quality rubric:**

| Score | Descriptor |
|-------|-----------|
| 5 | All required fields present. Dependencies explicitly mapped with rationale. Deferred workstreams have dependency-based reasons. Open questions identified. Structured YAML. |
| 4 | All required fields present. Dependencies listed (not fully mapped). One thin section. |
| 3 | Missing one required field OR all fields present but shallow (no dependency rationale). |
| 2 | Missing 2+ required fields. Or narrative-only format (no YAML structure). |
| 1 | No snapshot written. Or snapshot is a sentence summary. |

**Required snapshot fields:** `session`, `scope`, `deferred_to_next_session` (with reasons), `dependencies_identified`, `next_session`.

**Next-Session Priming rubric:**

| Score | Descriptor |
|-------|-----------|
| 5 | Includes: verification step (confirm prior workstreams merged), interface contract reference (what artifacts Session 2 consumes from Session 1), at least one named open question. Cold-start resumable without user re-explanation. |
| 4 | Verification step present. Interface contract implicit. |
| 3 | General ("continue with remaining workstreams"). No verification or contract. |
| 2 | Workstream list only. No context. |
| 1 | Missing or empty. |

**Task score:**

```
T5_Raw = Break_Point + Snapshot_Quality + Next_Session_Priming
T5_Max = 1 + 5 + 5 = 11
T5_Normalized = T5_Raw / 11 → range [0, 1]
```

---

## Aggregate Framework Score

### Normalization

All per-task scores are normalized to [0, 1] before aggregation:

| Task | Raw Range | Normalization |
|------|-----------|---------------|
| T1 | 0–3 | Divide by 3 |
| T2 | 1–5 | Subtract 1, divide by 4 (maps 1→0, 5→1) |
| T3 | 0–4 gates | Divide by 4 |
| T4 | 0–7 | Divide by 7 |
| T5 | 0–11 | Divide by 11 |

### Weights

Tasks are not equally weighted. Tasks that exercise core value-creating behaviors carry higher weight.

| Task | Weight | Rationale |
|------|--------|-----------|
| T1 Sage Routing | 0.15 | Intake correctness — foundational but binary |
| T2 C-Suite Quality | 0.30 | Highest impact: C-Suite generates the most user-visible output |
| T3 Research Depth | 0.25 | Research evaluation protocol is Sage's most distinctive capability |
| T4 Drift Detection | 0.20 | Process enforcement is a primary quality guarantee |
| T5 Session Management | 0.10 | Important for long initiatives; less frequently exercised |

**Weights sum to 1.00.**

### Aggregate Formula

```
Framework_Score = (T1_norm × 0.15) + (T2_norm × 0.30) + (T3_norm × 0.25) + (T4_norm × 0.20) + (T5_norm × 0.10)
```

**Result range:** [0, 1]

**Interpretation guide:**

| Score | Interpretation |
|-------|---------------|
| 0.85 – 1.00 | Production-quality. Agents behave as designed. |
| 0.70 – 0.84 | Acceptable. Minor gaps in one or two task types. |
| 0.55 – 0.69 | Marginal. Systematic issues in at least one critical task. |
| 0.40 – 0.54 | Below threshold. C-Suite or Sage has significant behavioral gaps. |
| 0.00 – 0.39 | Failing. Framework not functioning as designed. |

---

## Model Matrix Format

Record results in this table. One column per config, one row per task.

```
| Task | Weight | Config A | Config B | Config C | Config D | Notes |
|------|--------|----------|----------|----------|----------|-------|
| T1 Routing (norm) | 0.15 | 0.XX | 0.XX | 0.XX | 0.XX | |
| T2 C-Suite (norm) | 0.30 | 0.XX | 0.XX | 0.XX | 0.XX | |
| T3 Research (norm) | 0.25 | 0.XX | 0.XX | 0.XX | 0.XX | |
| T4 Drift (norm) | 0.20 | 0.XX | 0.XX | 0.XX | 0.XX | |
| T5 Session (norm) | 0.10 | 0.XX | 0.XX | 0.XX | 0.XX | |
| **Aggregate** | 1.00 | **0.XX** | **0.XX** | **0.XX** | **0.XX** | |
| Token Cost (avg/task) | — | XXXK | XXXK | XXXK | XXXK | |
| Cost-Quality Ratio | — | 0.XX | 0.XX | 0.XX | 0.XX | score/1K tokens |
```

**Cost-Quality Ratio:**

```
Cost_Quality = Aggregate_Score / (Token_Cost_per_task / 1000)
```

Higher is better. This normalizes quality against token spend, making it possible to evaluate whether the tiered configs (B, C, D) achieve acceptable quality at meaningfully lower cost.

---

## Delta Calculation (Before / After)

For comparing two runs (e.g., before and after prompt improvements):

### Per-Task Delta

```
Delta_T[n] = T[n]_after_norm - T[n]_before_norm
```

Range: [-1, +1]. Positive = improvement.

### Aggregate Delta

```
Delta_Aggregate = Framework_Score_after - Framework_Score_before
```

### Signal Threshold

A delta of ≥ 0.05 on a single task is considered a meaningful change (above measurement noise).
A delta of ≥ 0.05 on the aggregate score is considered a meaningful framework-level improvement.
A delta below 0.03 in either direction is within noise — treat as no change.

### Regression Detection

Any task where Delta < -0.05 after a prompt change is a regression. Regressions must be investigated before the prompt change is accepted, regardless of aggregate improvement.

### Significance Note

This benchmark does not have statistical significance guarantees. Each run is a single execution. For high-stakes decisions (major prompt overhaul, model downgrade to a revenue-affecting tier), run each task configuration 3 times and average the scores before calculating delta.

---

## Scoring Integrity Rules

1. **Score blind where possible.** For T2, strip agent labels from outputs before scoring Differentiation. Score from perspective alone.
2. **Do not re-run to chase a higher score.** If a run produces an anomalous result, record it as an anomaly and note it — do not discard it.
3. **Record the full output, not just the score.** The run template requires verbatim output for each task. Scores without outputs cannot be audited.
4. **One evaluator per run.** If two evaluators score the same run, their scores must be averaged (not reconciled by discussion). Discrepancies > 1 point on any rubric dimension should be noted as a calibration issue.
5. **Token counts are required.** A result without token usage data is incomplete. Token data is required for cost-quality ratio calculation.
