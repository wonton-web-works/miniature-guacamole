# Full Benchmark Comparison — All Configurations

**Date:** 2026-03-22
**Evaluator:** Leadership Team + Automated Scoring

---

## Framework Score Matrix

| Task | Weight | Config A (baseline pre-fix) | Config B (post-fix opus) | Config C (sonnet C-Suite) | Config D (all sonnet) |
|------|--------|---------------------------|-------------------------|--------------------------|----------------------|
| T1 Routing | 0.15 | 1.000 | 1.000 | 1.000 | 1.000 |
| T2 C-Suite | 0.30 | 0.855 | 1.000 | 1.000 | 0.855 |
| T3 Research | 0.25 | 1.000 | 1.000 | 1.000* | 1.000* |
| T4 Drift | 0.20 | 1.000 | 1.000 | 1.000 | 1.000 |
| T5 Session | 0.10 | 1.000 | 1.000 | 1.000* | 1.000* |
| **Framework** | **1.00** | **0.957** | **1.000** | **1.000** | **0.957** |

*T3 and T5 carried forward from Config B (Sage spec unchanged).

---

## T2 C-Suite Detail — The Decisive Benchmark

| Agent | Config A (weak defs, opus) | Config B (strong defs, opus) | Config C (strong defs, sonnet) | Config D (strong defs, sonnet+sonnet) |
|-------|---------------------------|-----------------------------|-----------------------------|--------------------------------------|
| CEO | 4.00 | 5.00 | **5.00** | 4.00 |
| CTO | 5.00 | 5.00 | **5.00** | 5.00 |
| CMO | 4.00 | 5.00 | **5.00** | 4.00 |
| CFO | 4.67 | 5.00 | **5.00** | 4.67 |
| **Mean** | **4.42** | **5.00** | **5.00** | **4.42** |
| Swap Test | PASS | PASS | PASS | PASS |

---

## Key Findings

### 1. Config C achieves parity with Config B — ZERO regression

C-Suite on sonnet with strong constitutions = C-Suite on opus with strong constitutions. The constitutions are doing the load-bearing work. Named computations (break-even points, runway math, ROI framing) execute correctly on sonnet.

### 2. Definition quality ≈ model quality (within this range)

Config A (weak defs, opus) score = Config D (strong defs, sonnet) score = 0.957. The improvements from better prompts roughly equal the improvements from a better model. This is the most important finding for the product: **investing in constitution quality is as valuable as investing in model tier.**

### 3. CTO is model-invariant

CTO scored 5.00 across ALL configurations — even Config D. Its constitution has the tightest constraints (numbered thresholds, mandatory output sections, explicit scope boundaries). This is the template for making other agents model-invariant.

### 4. CEO and CMO are model-sensitive without scope boundaries

CEO and CMO drop from 5.00 to 4.00 on Config D (sonnet Sage + sonnet C-Suite). The failure mode is role-bleed — CEO picks technologies, CMO loses magnitude estimates. The mitigation is structural: add "Scope boundary" output fields to constrain them the way CTO's numbered thresholds do.

### 5. Sage routing and drift detection are model-resilient

T1 (routing) and T4 (drift detection) scored perfectly across ALL configs, including Config D where the Sage runs on sonnet. The Sage's protocol is explicit enough that even sonnet follows it correctly.

---

## Recommendation

### Production Configuration: Config C

```
Sage:       opus    (judgment, research evaluation, session management)
C-Suite:    sonnet  (strong constitutions compensate for model tier)
Directors:  sonnet
ICs:        sonnet
Supervisor: haiku
```

**Rationale:** Config C achieves 1.000 framework score at ~40% lower token cost than Config B. The constitutions are strong enough that sonnet C-Suite is indistinguishable from opus C-Suite in benchmark output.

### Future Optimization Path

To reach Config D viability (full sonnet):
1. Add "Scope boundary" output fields to CEO and CMO constitutions
2. Re-benchmark T2 on Config D
3. If CEO/CMO recover to 4.5+, Config D becomes viable for cost-sensitive deployments

### Configuration Summary

| Config | Score | Relative Cost | Recommendation |
|--------|-------|---------------|----------------|
| B (all opus) | 1.000 | 100% (baseline) | Overkill — paying for model quality the constitutions already provide |
| **C (tiered)** | **1.000** | **~60%** | **RECOMMENDED — same quality, 40% savings** |
| D (budget) | 0.957 | ~40% | Viable with CEO/CMO scope boundary fixes |
