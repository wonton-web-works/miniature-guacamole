# Benchmark Comparison — [Baseline] vs [Target]

> Copy this template for before/after comparisons or config comparisons.
> File naming convention: `comparison-YYYYMMDD-[label].md`
> Examples:
>   Before/after: `comparison-20260322-pre-p0-fixes-vs-post-p0-fixes.md`
>   Config comparison: `comparison-20260322-config-a-vs-config-b.md`

---

## Comparison Metadata

| Field | Baseline | Target |
|-------|----------|--------|
| **Run ID** | [RUN-XXX] | [RUN-XXX] |
| **Date** | [YYYY-MM-DD] | [YYYY-MM-DD] |
| **Git SHA** | [7-char SHA] | [7-char SHA] |
| **Config** | [A/B/C/D] | [A/B/C/D] |
| **Prompt version** | [v?.?] | [v?.?] |
| **Description** | [e.g., "before P0 prompt fixes"] | [e.g., "after P0 prompt fixes"] |
| **Changes between runs** | | [Summarize what changed: which agents/skills were modified, what was changed] |

---

## Score Summary

| Task | Weight | Baseline | Target | Delta | Signal |
|------|--------|----------|--------|-------|--------|
| T2 C-Suite | 0.30 | [X.XX] | [X.XX] | [±X.XX] | [+/=/−] |
| T3 Research | 0.25 | [X.XX] | [X.XX] | [±X.XX] | [+/=/−] |
| T4 Drift | 0.20 | [X.XX] | [X.XX] | [±X.XX] | [+/=/−] |
| T5 Session | 0.10 | [X.XX] | [X.XX] | [±X.XX] | [+/=/−] |
| **Aggregate** | **1.00** | **[X.XX]** | **[X.XX]** | **[±X.XX]** | **[+/=/−]** |

**Signal key:**
- `+` : Delta ≥ 0.05 (meaningful improvement)
- `=` : Delta between -0.04 and +0.04 (within noise, no meaningful change)
- `−` : Delta ≤ -0.05 (regression — requires investigation before accepting changes)

**Aggregate delta:** [±X.XX]
**Interpretation:** [Improvement / No meaningful change / Regression]

---

## Regression Alert

> Complete this section if ANY task shows Delta ≤ -0.05.

| Task | Baseline Score | Target Score | Delta | Root Cause Hypothesis |
|------|---------------|-------------|-------|----------------------|
| [T?] | [X.XX] | [X.XX] | [−X.XX] | [What changed that might have caused this?] |

**Decision:** [Accept with known regression / Investigate before accepting / Reject changes]

**Rationale:** [Why the decision above]

---

## Per-Task Delta Analysis

### T2 — C-Suite Decision Quality

**Per-agent comparison:**

| Agent | Baseline Score | Target Score | Delta | Key Change |
|-------|---------------|-------------|-------|------------|
| CEO | [X.XX] | [X.XX] | [±X.XX] | [What improved or degraded?] |
| CTO | [X.XX] | [X.XX] | [±X.XX] | |
| CMO/COO | [X.XX] | [X.XX] | [±X.XX] | |
| CFO | [X.XX] | [X.XX] | [±X.XX] | |

**Differentiation comparison:**
- Baseline swap test: [Pass / Fail]
- Target swap test: [Pass / Fail]
- Change: [Improved / No change / Degraded]

**Specificity comparison:**
[Did agents start citing specific numbers, named conditions, or thresholds? Or did they become more generic?]

**Actionability comparison:**
[Did recommendation clarity improve or degrade? Any new cases of pure analysis without a recommendation?]

---

### T3 — Research Depth Evaluation

**Gate comparison:**

| Gate | Baseline | Target | Change |
|------|----------|--------|--------|
| G1: Problem space mapping | [Pass/Fail] | [Pass/Fail] | [+/=/−] |
| G2: Surface-level detection | [Pass/Fail] | [Pass/Fail] | [+/=/−] |
| G3: Specialist spawning | [Pass/Fail] | [Pass/Fail] | [+/=/−] |
| G4: Ceiling recognition | [Pass/Fail] | [Pass/Fail] | [+/=/−] |

**Notable changes:**
[Did the orchestrator's problem map get more or less complete? Did specialist prompt quality change? Did the orchestrator stop short of ceiling recognition or start recognizing it?]

---

### T4 — Drift Detection

| Component | Baseline | Target | Change |
|-----------|----------|--------|--------|
| Detection | [0/1] | [0/1] | [+/=/−] |
| Challenge Quality | [1-5] | [1-5] | [+/=/−] |
| Recovery | [0/1] | [0/1] | [+/=/−] |

**Challenge quality change:**
[If challenge quality improved, what did the orchestrator now name that it didn't before? If it degraded, did it become softer or less specific?]

**Scope creep detection (secondary):**
- Baseline: [Challenged / Soft / Not challenged]
- Target: [Challenged / Soft / Not challenged]

---

### T5 — Session Management

| Component | Baseline | Target | Change |
|-----------|----------|--------|--------|
| Break Point Identified | [0/1] | [0/1] | [+/=/−] |
| Snapshot Quality | [1-5] | [1-5] | [+/=/−] |
| Next-Session Priming | [1-5] | [1-5] | [+/=/−] |

**Snapshot quality change:**
[Did required fields appear or disappear? Did dependency mapping improve?]

**Priming quality change:**
[Did next-session instructions become more or less actionable?]

---

## Token Cost Comparison

| Task | Baseline Tokens | Target Tokens | Delta | % Change |
|------|----------------|--------------|-------|---------|
| T2 C-Suite | | | | |
| T3 Research | | | | |
| T4 Drift | | | | |
| T5 Session | | | | |
| **Total** | | | | |

**Cost-Quality Ratio:**
| Config | Framework Score | Total Tokens | Score/1K Tokens |
|--------|----------------|-------------|----------------|
| Baseline | [X.XX] | [XXK] | [X.XX] |
| Target | [X.XX] | [XXK] | [X.XX] |
| **Delta** | [±X.XX] | [±XXK] | [±X.XX] |

**Interpretation:** [Did quality improve at lower cost? Higher cost? Same cost?]

---

## Leadership Review Section

> This section is for /mg-leadership-team to complete after reviewing the comparison.
> Invoke: `/mg-leadership-team review benchmark-comparison-[label]`

**Review date:** [YYYY-MM-DD]

### CEO Assessment

[Business impact of the observed quality delta. Does the improvement (or regression) affect the product's value proposition? Any customer-facing implications?]

**Decision:** [Accept changes / Investigate regression / Request revert]

### CTO Assessment

[Technical quality of the observed changes. Are the prompt improvements architecturally sound? Any risks in the changes made? Are the improvements sustainable or brittle?]

**Technical concerns:** [List any]

### Engineering Director Assessment

[Operational implications. Are the changes ready for production? Any process changes needed to maintain the quality gains? Impact on the development workflow?]

**Readiness:** [Ready for production / Needs validation / Not ready]

### Leadership Decision

**Overall:** [ACCEPT / REJECT / ACCEPT WITH CONDITIONS]

**Conditions (if any):**
[List conditions that must be met before final acceptance]

**Next steps:**
[ ] [Action item 1]
[ ] [Action item 2]
[ ] [Action item 3]

---

## Notes and Open Questions

[Use this section for anything that doesn't fit the structured sections above. Common uses:
- Ambiguous scoring decisions (where the rubric didn't clearly apply)
- Unexpected behaviors that should inform future benchmark design
- Questions about methodology that should be resolved before the next run
- Observations that suggest new benchmark tasks are needed]
