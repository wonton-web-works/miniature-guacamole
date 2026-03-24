# miniature-guacamole Benchmark Harness

**Version:** 1.0
**Created:** 2026-03-22
**Purpose:** Measure agent quality before/after prompt changes, and across model configurations

---

## What This Is

A reusable benchmark system for evaluating the miniature-guacamole agent framework. Use it to:

- **Establish baselines** before making prompt changes
- **Measure improvement** after applying prompt fixes (especially P0/P1 items from the prompt audit)
- **Validate model downgrades** — confirm Config B/C/D maintain acceptable quality before reducing costs
- **Catch regressions** — verify that a change to one agent doesn't silently degrade behavior in another

---

## Structure

```
benchmarks/
├── INDEX.md                          ← You are here
├── scoring.md                        ← Scoring methodology, rubrics, aggregate formula
├── config.md                         ← Model matrix definitions (Configs A-D)
├── tasks/
│   ├── csuite-decision-quality.md    ← T2: C-Suite differentiation vs. platitudes
│   ├── drift-detection.md            ← T4: Process enforcement and scope creep detection
│   └── drift-cost-analysis.md        ← T7: Drift cost analysis
└── results/
    ├── run-template.md               ← Template for a single run
    └── comparison-template.md        ← Template for before/after or config comparison
```

---

## Quick Start

### Run a benchmark

1. Read `config.md` to select your configuration (start with Config A for baseline)
2. Read `scoring.md` to understand scoring before you run — know what you're measuring
3. Copy `results/run-template.md` → `results/run-YYYYMMDD-[config]-[label].md`
4. Execute T2 through T5 in order, recording outputs as you go
5. Calculate scores per the formulas in `scoring.md`
6. Fill in the aggregate score table

### Compare two runs

1. Complete two run files (baseline + target)
2. Copy `results/comparison-template.md` → `results/comparison-YYYYMMDD-[label].md`
3. Fill in the score tables and delta calculations
4. Complete the Leadership Review section (optional but recommended for major changes)

---

## Tasks at a Glance

| ID | Task | Tests | Scoring |
|----|------|-------|---------|
| T2 | C-Suite Decision Quality | Differentiation, specificity, actionability | 1-5 rubric, 4 agents |
| T3 | Research Depth Evaluation | Research protocol — map, detect, spawn, stop | 4 binary gates |
| T4 | Drift Detection | Process enforcement, scope creep challenge | Binary detection + 1-5 quality + binary recovery |
| T5 | Session Management | Break point, snapshot quality, priming | Binary + 2× 1-5 rubric |

---

## Model Configurations

| Config | C-Suite | Directors | ICs | Supervisor | Use Case |
|--------|---------|-----------|-----|------------|---------|
| **A** | opus | opus | opus | opus | Quality ceiling / baseline |
| **B** | opus | sonnet | sonnet | haiku | Recommended production |
| **C** | sonnet | sonnet | haiku | haiku | Aggressive cost optimization |
| **D** | sonnet | haiku | haiku | haiku | Budget / protocol floor test |

---

## Aggregate Scoring

```
Framework_Score = (T2 × 0.35) + (T3 × 0.30) + (T4 × 0.25) + (T5 × 0.10)
```

All task scores normalized to [0, 1] before weighting.

| Score | Interpretation |
|-------|---------------|
| 0.85–1.00 | Production-quality |
| 0.70–0.84 | Acceptable |
| 0.55–0.69 | Marginal |
| 0.40–0.54 | Below threshold |
| 0.00–0.39 | Failing |

---

## Key Decisions Embedded in Task Design

**T2 uses the differentiation swap test** — agent labels are removed from C-Suite outputs before scoring Differentiation. If you can't tell CEO from CFO from perspective alone, both score low. This directly tests the weakness identified in the prompt audit.

**T3 requires protocol order compliance** — the engineering-manager must map before researching. An agent that researches first and maps retroactively scores G1 as a fail, even if the resulting map is correct. Order matters because the protocol's value is in directing research, not describing what was found.

**T4 uses a scripted conversation** — drift is introduced at a specific moment (Step 3) in a clean workflow. The challenge is that the violating message comes from an engineering-manager (a trusted role), not an unknown actor. The agent must challenge authority from within the hierarchy, not just reject obvious bad actors.

**T5 penalizes time-based session breaks** — session boundaries must be dependency-derived. An agent that says "we'll do 3 workstreams per session" fails the break point gate even if the number happens to land at the correct boundary.

---

## Relationship to Prompt Audit

This harness is designed to measure the specific failure modes identified in `docs/prompt-audit-report.md`:

| Audit Finding | Measured By |
|--------------|-------------|
| C-Suite behavioral weakness (HIGH) | T2 — C-Suite Decision Quality |
| Supervisor role boundary ambiguity (MEDIUM) | T4 — Drift Detection (Supervisor secondary metric) |
| Research depth evaluation | T3 — Research Depth Evaluation |
| Session management quality | T5 — Session Management |

Run the baseline before applying any P0/P1 fixes. Run again after. The comparison will quantify the prompt improvement impact.
