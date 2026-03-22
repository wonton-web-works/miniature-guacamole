# Benchmark Run Configuration

**Version:** 1.0
**Date:** 2026-03-22

---

## Purpose

This document defines the four model matrix configurations used in benchmark runs. Each configuration assigns specific model tiers to each agent layer in the framework. The goal is to find the minimum model quality that achieves acceptable benchmark scores at each layer — balancing quality against token cost.

---

## Agent Layer Definitions

Before the matrix, here is how agents are classified into layers:

| Layer | Agents | Role |
|-------|--------|------|
| **Sage** | sage | Top-level orchestrator. Intake, research eval, session management, drift detection. |
| **C-Suite** | ceo, cto, cmo, cfo | Strategic and architectural decisions. |
| **Directors** | engineering-director, product-manager, art-director | Operational leadership and workstream planning. |
| **ICs** | dev, qa, staff-engineer, data-engineer, api-designer, devops-engineer, technical-writer, copywriter, ai-artist, design, security-engineer, deployment-engineer | Execution layer. |
| **Supervisor** | supervisor | Monitoring and alerting. Observe-only. |

---

## Model Tier Reference

| Tier | Model | Characteristics |
|------|-------|----------------|
| **opus** | claude-opus-4 (or current opus) | Highest reasoning quality. Strongest for ambiguous judgment calls. Highest token cost. |
| **sonnet** | claude-sonnet-4 (or current sonnet) | Strong reasoning, lower cost. Best balance for structured tasks with clear criteria. |
| **haiku** | claude-haiku-3.5 (or current haiku) | Fast, low cost. Best for deterministic, rule-following tasks with explicit criteria. |

Model version resolution: use the current production version at time of run. Record exact model ID in run metadata.

---

## Model Matrix

### Config A — All Opus (Baseline)

The quality ceiling. Every agent runs at maximum capability. Use this to establish the benchmark score that the framework achieves with no cost constraints.

| Layer | Model | Agents |
|-------|-------|--------|
| Sage | opus | sage |
| C-Suite | opus | ceo, cto, cmo, cfo |
| Directors | opus | engineering-director, product-manager, art-director |
| ICs | opus | dev, qa, staff-engineer, data-engineer, api-designer, devops-engineer, technical-writer, copywriter, ai-artist, design, security-engineer, deployment-engineer |
| Supervisor | opus | supervisor |

**Expected behavior:** Highest benchmark scores. Highest token cost. This config is not intended for production use — it is the quality ceiling to compare against.

**When to use:** Establishing the baseline before any prompt optimization work.

---

### Config B — Tiered (Recommended Production Starting Point)

Keeps Sage and C-Suite at opus. Reduces Directors and ICs to sonnet. Supervisor runs haiku (monitor-only, no judgment required).

| Layer | Model | Agents |
|-------|-------|--------|
| Sage | opus | sage |
| C-Suite | opus | ceo, cto, cmo, cfo |
| Directors | sonnet | engineering-director, product-manager, art-director |
| ICs | sonnet | dev, qa, staff-engineer, data-engineer, api-designer, devops-engineer, technical-writer, copywriter, ai-artist, design, security-engineer, deployment-engineer |
| Supervisor | haiku | supervisor |

**Hypothesis:** The most quality-sensitive behaviors (intake routing, C-Suite differentiation, research depth evaluation, drift detection) live in the Sage and C-Suite. Directors and ICs operate against explicit criteria — sonnet can follow well-written instructions reliably. Supervisor has no judgment calls — haiku is appropriate.

**Expected behavior:** T1, T2, T3, T4 scores near Config A. Marginal degradation in T5 (session management) if complex dependency reasoning is required. Meaningful token cost reduction (~40% vs Config A on typical workflows).

**When to use:** Default production configuration.

---

### Config C — Aggressive Tiering

Drops C-Suite to sonnet. Drops ICs to haiku. Tests whether the framework's structured protocols can compensate for lower model capability at the execution layer.

| Layer | Model | Agents |
|-------|-------|--------|
| Sage | opus | sage |
| C-Suite | sonnet | ceo, cto, cmo, cfo |
| Directors | sonnet | engineering-director, product-manager, art-director |
| ICs | haiku | dev, qa, staff-engineer, data-engineer, api-designer, devops-engineer, technical-writer, copywriter, ai-artist, design, security-engineer, deployment-engineer |
| Supervisor | haiku | supervisor |

**Hypothesis:** C-Suite agents in the current framework are behaviorally weak (per prompt audit — thin constitutions, generic assessments). If they're producing generic output regardless of model, downgrading to sonnet may not cost much. ICs are given highly structured task prompts with explicit acceptance criteria — haiku may be sufficient for MECHANICAL track work.

**Key risk:** T2 (C-Suite Decision Quality) is the canary. If C-Suite differentiation collapses further at sonnet, this config is not viable. T4 (Drift Detection) is also at risk if the Sage's challenge quality depends on opus-level reasoning.

**When to use:** Cost optimization testing. Not recommended for production until T2 and T4 scores are validated.

---

### Config D — Budget

All agents at sonnet or haiku. Sage drops to sonnet. Tests framework viability under strict cost constraints.

| Layer | Model | Agents |
|-------|-------|--------|
| Sage | sonnet | sage |
| C-Suite | sonnet | ceo, cto, cmo, cfo |
| Directors | haiku | engineering-director, product-manager, art-director |
| ICs | haiku | dev, qa, staff-engineer, data-engineer, api-designer, devops-engineer, technical-writer, copywriter, ai-artist, design, security-engineer, deployment-engineer |
| Supervisor | haiku | supervisor |

**Hypothesis:** Many framework behaviors are rule-following, not judgment. If the protocols are tight enough, sonnet Sage + structured lower-tier agents may be sufficient for well-defined workstreams.

**Key risk:** T3 (Research Depth Evaluation) and T5 (Session Management) are the most likely failure points. Both require the Sage to reason about gaps, dependencies, and uncertainty — judgment calls that may not survive a sonnet downgrade. T4 (Drift Detection) is also at risk.

**When to use:** Academic/testing purposes. Establish floor quality to understand the protocol's independence from model quality.

---

## Configuration Comparison at a Glance

```
                   Sage     C-Suite   Directors   ICs      Supervisor
Config A (all-opus)  opus     opus      opus        opus     opus
Config B (tiered)    opus     opus      sonnet      sonnet   haiku
Config C (aggressive) opus    sonnet    sonnet      haiku    haiku
Config D (budget)    sonnet   sonnet    haiku       haiku    haiku
```

---

## Run Protocol

For each configuration:

1. **Record model versions** — Note the exact model IDs used (e.g., `claude-opus-4-20251101`), not just tier names. Models update; results must be reproducible.

2. **Run tasks in order** — T1 through T5. Do not batch tasks from different configs. Complete one full config run before starting the next.

3. **Cold context for each task** — No task should have access to context from prior tasks in the same run. Start each task in a fresh session.

4. **Token counting** — Record input + output tokens for each task. Sum to a per-config total. Track per-task averages separately.

5. **Timing** — Record wall-clock time per task. This is informative but not scored.

6. **Anomaly flagging** — If a task produces an output that seems inconsistent with the configuration (e.g., Config D haiku produces opus-level output, or Config A opus produces haiku-level output), flag it as an anomaly and re-run once. Record both results.

---

## Cost Estimation Reference

Approximate token costs per task per config at current (2026-Q1) rates. These are estimates based on typical task execution and will vary.

| Task | Config A | Config B | Config C | Config D |
|------|----------|----------|----------|----------|
| T1 Routing | ~8K tokens | ~8K tokens | ~6K tokens | ~5K tokens |
| T2 C-Suite Quality | ~15K tokens | ~15K tokens | ~12K tokens | ~10K tokens |
| T3 Research Depth | ~25K tokens | ~20K tokens | ~18K tokens | ~15K tokens |
| T4 Drift Detection | ~10K tokens | ~10K tokens | ~8K tokens | ~7K tokens |
| T5 Session Mgmt | ~12K tokens | ~10K tokens | ~8K tokens | ~7K tokens |
| **Total per run** | ~70K tokens | ~63K tokens | ~52K tokens | ~44K tokens |

Actual costs depend on agent prompt sizes (see prompt-audit-report.md for token estimates per agent).

---

## Interpreting Config Deltas

After running all four configs, compute the quality-cost tradeoff:

**Quality retained (vs Config A):**
```
Quality_Retained(Config X) = Framework_Score(X) / Framework_Score(A) × 100%
```

**Cost reduction (vs Config A):**
```
Cost_Reduction(Config X) = (1 - Token_Cost(X) / Token_Cost(A)) × 100%
```

**Efficiency ratio:**
```
Efficiency(Config X) = Quality_Retained(X) / (100% - Cost_Reduction(X))
```

A config that retains 95% quality at 60% cost has a higher efficiency ratio than a config that retains 90% quality at 80% cost.

The target for Config B is: retain ≥95% quality at ≤70% cost of Config A.
The target for Config C is: retain ≥85% quality at ≤60% cost of Config A.
