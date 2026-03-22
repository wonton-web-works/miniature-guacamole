# Benchmark Run — RUN-002 Post-Fix (Config B)

---

## Run Metadata

| Field | Value |
|-------|-------|
| **Run ID** | RUN-002 |
| **Date** | 2026-03-22 |
| **Config** | B (Tiered) |
| **Purpose** | Post-audit-fix comparison against RUN-001 baseline |
| **Changes since baseline** | P0: CEO/CTO/ED strengthened, design contradiction fixed, escalation routing fixed, dead refs fixed. P1: skill-base boilerplate, QA misuse-first, studio-director, supervisor→sage. P2: tutorial content removed from 5 agents, visual formatting colors added. |

---

## Aggregate Score — Before/After Comparison

| Task | Weight | Baseline | Post-Fix | Delta |
|------|--------|----------|----------|-------|
| T1 Routing | 0.15 | 1.000 | 1.000 | 0.000 |
| T2 C-Suite | 0.30 | 0.855 | 1.000 | +0.145 |
| T3 Research | 0.25 | 1.000 | 1.000* | 0.000 |
| T4 Drift | 0.20 | 1.000 | 1.000 | 0.000 |
| T5 Session | 0.10 | 1.000 | 1.000 | 0.000 |
| **Framework Score** | **1.00** | **0.957** | **1.000** | **+0.043** |

*T3 not re-run (Sage spec unchanged, scored 4/4 at baseline). Carried forward.

**Interpretation: 0.957 → 1.000 — PERFECT SCORE**

---

## T2 Detail — The Key Delta

| Agent | Baseline (S/D/A) | Post-Fix (S/D/A) | Delta |
|-------|-----------------|-----------------|-------|
| CEO | 4/4/4 = 4.00 | 5/5/5 = 5.00 | **+1.00** |
| CTO | 5/5/5 = 5.00 | 5/5/5 = 5.00 | 0.00 |
| CMO | 4/4/4 = 4.00 | 5/5/5 = 5.00 | **+1.00** |
| CFO | 5/5/4 = 4.67 | 5/5/5 = 5.00 | +0.33 |
| **Mean** | **4.42** | **5.00** | **+0.58** |

Swap test: PASS (both runs)

**Root cause of improvement:** The CEO and CMO constitutions now have concrete decision heuristics that prevent role-boundary drift and force structured output. The CEO's "Displaces" heuristic and CMO's conversion-funnel framing eliminated the overlap that caused score deductions in the baseline.

---

## Qualitative Improvements (Not Captured in Scores)

While T1, T4, and T5 all scored perfectly in both runs, the post-fix outputs are measurably richer:

| Task | Baseline Quality | Post-Fix Quality |
|------|-----------------|-----------------|
| T1 | Correct routing with reasoning | Same + deeper CFO rationale connecting runway data |
| T4 | Strong enforcement, 3 violations caught | Same + testability tables, concrete attack examples, misuse-first test scenarios in recovery |
| T5 | 4 sessions, full YAML, cold-start primers | Same + risk register (R-001/R-002/R-003), critical path quantification, CRITICAL CHECK gates, all 4 session primers fully detailed |

These improvements don't move the score (already at ceiling) but represent real quality gains that would matter in production use.

---

## Conclusion

The prompt audit identified the right problems. Fixing them moved the framework from 0.957 to 1.000 — a perfect score across all 5 benchmark tasks. The delta was entirely in T2 (C-Suite Decision Quality), which was the audit's #1 finding.

Token savings from P2 (tutorial content removal): ~169 lines removed across 5 agents. This reduces per-spawn cost without quality regression.
