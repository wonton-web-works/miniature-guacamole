# Benchmark Run — [Run ID]

> Copy this template for each run. Replace all `[...]` placeholders.
> File naming convention: `run-YYYYMMDD-[config]-[label].md`
> Example: `run-20260322-config-b-baseline.md`

---

## Run Metadata

| Field | Value |
|-------|-------|
| **Run ID** | [e.g., RUN-001] |
| **Date** | [YYYY-MM-DD] |
| **Evaluator** | [Name or role] |
| **Config** | [A / B / C / D] |
| **Git SHA** | [7-char short SHA of miniature-guacamole at time of run] |
| **Prompt version** | [e.g., v1.0 — from package.json or git tag] |
| **Purpose** | [e.g., "baseline before prompt improvements", "post-P0-fixes", "Config B validation"] |
| **Models used** | |
| — Orchestrator | [exact model ID, e.g., claude-opus-4-20251101] |
| — C-Suite | [exact model ID] |
| — Directors | [exact model ID] |
| — ICs | [exact model ID] |
| — Supervisor | [exact model ID] |
| **Notes** | [Any relevant context: anomalies, deviations from standard protocol, environmental factors] |

---

## Per-Task Results

### T2 — C-Suite Decision Quality

**Per-agent, per-dimension scores (1-5):**

| Agent | Specificity | Differentiation | Actionability | Agent Score |
|-------|-------------|----------------|---------------|-------------|
| CEO | [1-5] | [1-5] | [1-5] | [(S+D+A)/3] |
| CTO | [1-5] | [1-5] | [1-5] | [(S+D+A)/3] |
| CMO/COO | [1-5] | [1-5] | [1-5] | [(S+D+A)/3] |
| CFO | [1-5] | [1-5] | [1-5] | [(S+D+A)/3] |

**T2 Raw (aggregate):** [sum of agent scores / 4] — range [1, 5]
**T2 Normalized:** [(raw - 1) / 4] — range [0, 1]

**Full agent outputs:**

CEO:
```
[Paste full output]
```

CTO:
```
[Paste full output]
```

CMO/COO:
```
[Paste full output]
```

CFO:
```
[Paste full output]
```

**Differentiation swap test result:** [Pass: outputs were distinguishable by perspective / Fail: outputs were interchangeable]

**Cross-agent observations:**
- Recommendation alignment: [Did all four agents recommend the same option? Same/different reasoning?]
- Productive tension: [Did any agent push back on another's framing? Yes/No, describe if yes]
- Consensus collapse: [Yes/No — if Yes, flag as benchmark failure]

**Token usage:** [input tokens] in / [output tokens] out / [total] total

---

### T3 — Research Depth Evaluation

**Gate results:**

| Gate | Criterion | Result | Evidence |
|------|-----------|--------|----------|
| G1: Problem space mapping | ≥4 sub-domains mapped before research | [Pass / Fail] | [Brief quote or observation] |
| G2: Surface-level detection | ≥2 sub-domains flagged as surface-level with cited criteria | [Pass / Fail] | [Brief quote or observation] |
| G3: Specialist spawning | ≥1 specialist with targeted scope + structured prompt | [Pass / Fail] | [Brief quote or observation] |
| G4: Ceiling recognition | Performance target identified as unverifiable via research | [Pass / Fail] | [Brief quote or observation] |

**T3 Raw:** [X] / 4 gates passed
**T3 Normalized:** [X] / 4 = [X.XX]

**Protocol order compliance:** [Map first then research / Research first then retroactive map / No map produced]

**Specialist prompt quality (if G3 passed):**
```
[Paste the specialist prompt the orchestrator generated]
```

**Specialist file written:** [Yes / No]
If yes, path: [.claude/memory/specialists/...]

**Ceiling escalation message (if G4 passed):**
```
[Paste the orchestrator's escalation message]
```

**Token usage:** [input tokens] in / [output tokens] out / [total] total

---

### T4 — Drift Detection

**Scores:**

| Component | Score | Notes |
|-----------|-------|-------|
| Detection (binary) | [0 or 1] | [Did the orchestrator challenge the Step 3 process skip?] |
| Challenge Quality (1-5) | [1-5] | [Rubric score] |
| Recovery (binary) | [0 or 1] | [Did the orchestrator provide a correct recovery plan?] |

**T4 Raw:** [Detection + Challenge_Quality + Recovery] / max 7
**T4 Normalized:** [T4_Raw / 7] = [X.XX]

**Step 3 orchestrator response (verbatim):**
```
[Paste full response to the process skip message]
```

**Step 4 scope creep challenge (secondary metric):**
- Result: [Challenged correctly / Challenged softly / Not challenged]
- Response:
```
[Paste response to the scope creep message]
```

**Step 5 recovery plan:**
```
[Paste response to "how should we proceed" message]
```

**Supervisor alert (if supervisor was active):**
- Alert written to supervisor-alerts.json: [Yes / No]
- Alert content: [If yes, paste the alert]

**Token usage:** [input tokens] in / [output tokens] out / [total] total

---

### T5 — Session Management

**Scores:**

| Component | Score | Notes |
|-----------|-------|-------|
| Break Point Identified (binary) | [0 or 1] | [Did the orchestrator identify a session break point?] |
| Snapshot Quality (1-5) | [1-5] | [Rubric score] |
| Next-Session Priming (1-5) | [1-5] | [Rubric score] |

**T5 Raw:** [Break_Point + Snapshot + Priming] / max 11
**T5 Normalized:** [T5_Raw / 11] = [X.XX]

**Proposed session structure:**
```
[Paste the orchestrator's session breakdown — Session 1 scope, Session 2 scope, etc.]
```

**Break point rationale (if break point identified):**
```
[Paste the orchestrator's explanation for where it placed the session boundary]
```

**Context snapshot (if written):**
```yaml
[Paste the full YAML snapshot content]
```

**Missing required fields (if any):** [List any of: session, scope, deferred_to_next_session, dependencies_identified, next_session]

**Next-session priming content:**
```
[Paste the next_session field content]
```

**Secondary observations:**
- WS-D7 correctly identified as terminal: [Yes / No]
- WS-D4 → WS-D5 dependency identified: [Yes / No]
- WS-D3 and WS-D4 parallelism noted: [Yes / No]

**Token usage:** [input tokens] in / [output tokens] out / [total] total

---

## Aggregate Score

| Task | Weight | Normalized Score | Weighted Score |
|------|--------|-----------------|----------------|
| T2 C-Suite | 0.30 | [X.XX] | [0.30 × T2_norm] |
| T3 Research | 0.25 | [X.XX] | [0.25 × T3_norm] |
| T4 Drift | 0.20 | [X.XX] | [0.20 × T4_norm] |
| T5 Session | 0.10 | [X.XX] | [0.10 × T5_norm] |
| **Framework Score** | **1.00** | | **[sum]** |

**Interpretation:**
- 0.85–1.00: Production-quality
- 0.70–0.84: Acceptable
- 0.55–0.69: Marginal
- 0.40–0.54: Below threshold
- 0.00–0.39: Failing

**This run:** [X.XX] — [Interpretation label]

---

## Token Usage Summary

| Task | Input Tokens | Output Tokens | Total Tokens |
|------|-------------|---------------|-------------|
| T2 C-Suite | | | |
| T3 Research | | | |
| T4 Drift | | | |
| T5 Session | | | |
| **Run Total** | | | |
| **Per-task average** | | | |

**Estimated cost:** $[X.XX] at [date] rates
(Calculate using: opus input $X/MTok, output $X/MTok; sonnet input $X/MTok, output $X/MTok; haiku input $X/MTok, output $X/MTok)

**Cost-Quality Ratio:**
```
Framework_Score / (Total_Tokens / 1000) = [X.XX] score per 1K tokens
```

---

## Anomalies

List any results that seemed inconsistent, unexpected, or that required a re-run:

| Task | Anomaly | Action Taken |
|------|---------|-------------|
| [T?] | [Description] | [Noted / Re-run once / Excluded] |

---

## Key Observations

Synthesize the most important findings from this run in 3-5 bullet points. Focus on what was surprising or informative — not just a summary of the scores.

-
-
-
-
-
