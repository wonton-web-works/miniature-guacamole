# T6 — Full Pipeline Comparison: Before (no Sage) vs After (Sage-Orchestrated)

**Date:** 2026-03-22
**Purpose:** Validate Sage architecture against current MG pipeline across 4 scenarios

---

## Scenario Results

### S1: Pure Engineering Task (Pagination)

| Metric | Pipeline A (current) | Pipeline B (Sage) |
|--------|---------------------|-------------------|
| Agents spawned | 3 (CEO + CTO + ED) | **0 C-Suite** — routed to /mg-build |
| Useful perspectives | ~1 (CTO marginal) | N/A — correctly skipped |
| Routing efficiency | 1/5 | **5/5** |
| Token cost | ~3x baseline | **~0.3x baseline** |
| Outcome | Same correct conclusion, 2 filler outputs | Same correct conclusion, no waste |

**Sage insight:** The hardest orchestration judgment is not "which agents" but "should I spawn any at all."

---

### S2: Cross-Domain Initiative (Team Dashboard)

| Metric | Pipeline A (current) | Pipeline B (Sage) |
|--------|---------------------|-------------------|
| Agents spawned | 3 (CEO + CTO + ED) | **4 (CEO + CTO + CMO + CFO)** |
| Coverage gaps | Brand (no CMO), Cost (no CFO), Competitive positioning | **None — all domains covered** |
| Routing efficiency | 2/5 (right agents present but missing 2) | **5/5** |
| Assessment quality | Good from present agents, blind spots documented | Full coverage, no gaps |
| CEO constitution enforced | No — "CFO cost input first" couldn't fire | **Yes — CFO spawned, gate enforced** |

**Sage insight:** Value is ensuring the right agents are present so gaps are prevented by design, not discovered after the fact.

---

### S3: Multi-Session Initiative (Daemon Launch)

| Metric | Pipeline A (current) | Pipeline B (Sage) |
|--------|---------------------|-------------------|
| Session management | **None** — flat list, single pass | **4 sessions**, dependency-based breaks |
| Dependency analysis | ED identifies some deps | Full graph + corrected critical path (10d, not 9d) |
| Context snapshots | **None** | Full YAML with interface contracts inlined |
| Cold-start primers | **None** | Standalone doc, zero user reconstruction |
| Interface contracts | Not identified | **4 contracts with freeze-by dates** |
| C-Suite spawned | 3 (CEO + CTO + ED) | **1 (CTO only)** |
| Score | **0/11** | **11/11** |

**Sage insight:** Pipeline A missed the D4→D5 dependency (dashboard needs telemetry data). The Sage caught it because it maps dependencies before planning sessions.

---

### S4: Process Violation Under Pressure (QA Skip)

| Metric | Pipeline A (current) | Pipeline B (Sage) |
|--------|---------------------|-------------------|
| Detection | **Not detected** — no execution monitoring | **Detected immediately** |
| Challenge quality | N/A | 3 violations named, rule citations, alternatives offered |
| Recovery plan | N/A | Pause WS, present options to ED, 3 alternatives provided |
| Cost of intervention | N/A | ~1.6K tokens |
| Cost if uncaught | ~46K rework + schedule slip | **Prevented** |
| Score | **0/7** | **7/7** |

**Sage insight:** The gap between "approved for development" and "submitted for review" is entirely unmonitored in Pipeline A.

---

## Aggregate Comparison

| Metric | Pipeline A | Pipeline B | Delta |
|--------|-----------|-----------|-------|
| S1 Routing Efficiency | 1/5 | **5/5** | +4 |
| S2 Routing Efficiency | 2/5 | **5/5** | +3 |
| S2 Coverage Gaps | 2 missing roles | **0** | -2 gaps |
| S3 Session Management | 0/11 | **11/11** | +11 |
| S4 Process Compliance | 0/7 | **7/7** | +7 |
| Unnecessary Agent Spawns | 9 (3+3+3+0) | **5 (0+4+1+0)** | -4 spawns |
| Capabilities absent in A | Session mgmt, drift detection, selective routing, CMO/CFO | All present | — |

---

## Combined with T7 (Drift Cost Analysis)

| Metric | Pipeline A | Pipeline B |
|--------|-----------|-----------|
| Drifts detected (T7) | 1.5/3 | **3/3** |
| Tokens wasted on drift | ~54K + 25K rework | **~27K clean** |
| Security incidents | 1 (secrets in UI) | **0** |
| Drift prevention ROI | — | **20x** |

---

## Final Summary

| Capability | Pipeline A | Pipeline B |
|-----------|-----------|-----------|
| Selective C-Suite routing | No (always spawns all 3) | **Yes (0-4 agents based on scope)** |
| CMO/CFO coverage | No | **Yes** |
| Session management | No | **Yes (dependency-based breaks, YAML snapshots, cold-start primers)** |
| Execution monitoring | No (gate-based only) | **Yes (always-on, challenges in real-time)** |
| Drift prevention | No | **Yes (20x ROI on token savings)** |
| Cascade prevention | No | **Yes (catches root cause, eliminates downstream contamination)** |
| Constitution enforcement | Partial (rules exist but can't fire without agents) | **Full (Sage ensures required agents are present)** |

**The Sage doesn't just improve the pipeline — it fills capabilities that don't exist in the current architecture.**
