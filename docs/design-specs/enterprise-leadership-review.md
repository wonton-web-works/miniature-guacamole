# Enterprise Page Leadership Review

**Date:** 2026-03-22
**File:** `site/src/pages/enterprise.astro`
**Reviewers:** CTO (technical accuracy), CMO (messaging and brand)
**Orchestrated by:** The Sage

---

## Decision

### REQUEST CHANGES

Three issues must be fixed before this page ships to production. Two are factual errors that would undermine credibility with technical buyers. One is a gating violation that contradicts an explicit business decision.

---

## CTO Review — Technical Accuracy

### PASS: Benchmark numbers are traceable and accurate

| Page claim | Benchmark source | Verdict |
|---|---|---|
| 1.000 framework score | `comparison-all-configs.md` Config B/C | Accurate |
| 0 -> 11/11 session management | `t6-comparison-final.md` S3 | Accurate |
| 0 -> 7/7 process compliance | `t6-comparison-final.md` S4 | Accurate |
| 3/3 drifts caught | `t7-pipeB-drift-cost.md` | Accurate |
| 0 security incidents (Sage) vs 1 (no Sage) | `t7-pipeA-drift-cost.md` | Accurate |
| ~1.5K tokens to catch drift | `t7-pipeB-drift-cost.md` D1 | Accurate |
| 83-120K tokens if missed | `t7-pipeB-drift-cost.md` TOTAL row | Accurate |
| ~50K tokens saved per 3-WS feature | `t7-pipeB-drift-cost.md` delta | Reasonable estimate |

### PASS: Architecture description is honest

- The Sage's five capabilities (intake, research, drift detection, session management, always-on behaviors) match the agent definition in `src/framework/agents/sage/AGENT.md`.
- The spawning table matches the Sage's actual selective spawning logic.
- The session snapshot YAML example matches the Sage's documented output format.
- The cascade story (webhook drift) is taken directly from the T7 benchmark scenario. This is real test data, not a hypothetical.

### PASS: Community vs Enterprise framing is technically fair

The comparison strip ("Alerts after drift begins" vs "Drift never reaches the cascade") accurately represents the Supervisor's capabilities (alerting) vs the Sage's capabilities (proactive interception). No community capabilities are misrepresented or understated.

### FAIL: "10x routing efficiency" claim is not supported by benchmarks

**Location:** Line 2509-2510

```
10x routing efficiency
Pure engineering task: old pipeline spawned 3 agents. Sage spawned zero -- routed directly to /mg-build.
```

**Problem:** The benchmark (T6, S1) shows routing efficiency scored 1/5 vs 5/5, which is a 5x improvement. The agent count went from 3 to 0, which is not "10x" -- it is a complete elimination. "10x" has no source in any benchmark result. This is the kind of claim that a technical buyer will cross-reference, and it will not hold up.

**Fix:** Either use "5x" (the actual routing efficiency ratio) or reframe as "3 agents to zero" without attaching a multiplier. The raw numbers are more impressive than a made-up coefficient.

### FAIL: "+17 more" IC count is arithmetically wrong

**Location:** Line 2048 (IC pill) and line 1978 (SR table)

```html
<span class="ic-pill" style="border-style:dashed;opacity:0.6;">+17 more</span>
```

**Problem:** The page lists 6 ICs explicitly (Dev, Designer, Security, DevOps, API Design, Data). With "+17 more," that implies 23 ICs. But the total agent count is 24, minus 1 Sage, minus 4 C-Suite, minus ~4-7 directors = ~12-15 ICs. Even generously, 15 - 6 = 9 remaining, not 17.

The 24 agents break down as:
- Apex: Sage (1)
- C-Suite: CEO, CTO, CMO, CFO (4)
- Director-level: engineering-manager, engineering-director, product-manager, product-owner, staff-engineer, studio-director, supervisor (~7)
- IC-level: dev, qa, design, art-director, copywriter, ai-artist, security-engineer, devops-engineer, deployment-engineer, data-engineer, api-designer, technical-writer (~12)

12 ICs - 6 shown = 6 remaining. The pill should say "+6 more" (or adjust the tier assignments and recount).

The SR table at line 1978 also says "+17 more" and must be corrected to match.

**Fix:** Change "+17 more" to the correct count based on finalized tier assignments. If director tier is 7 agents, IC tier is 12 agents, the pill should read "+6 more."

### PASS: Terminal animation content is representative

The scrolling terminal output (`[EM] Classifying... MECHANICAL`, `[GATE] Coverage 99.4%`, etc.) matches the actual agent prefix format and pipeline flow. No fake metrics, no unrealistic timings.

### NOTE: "20x" drift stat (line 2179) is presented as headline, not benchmark citation

The large "20x" callout at section top is framed as a general principle ("the cost of catching drift late vs. at source"), then the specific benchmark data follows below. The benchmarks actually show 33-48x total ROI. Using 20x is conservative. Technically defensible as a floor estimate. No action required, but the team should be aware that the actual data is stronger than what the page claims.

---

## CMO Review — Messaging, Brand, and Narrative

### PASS: Hero sells the org, not just the Sage

The headline "Your project deserves a full engineering org." correctly positions PrivateEnterprise as the product, with the Sage as the differentiating capability. The three value props ("A real org," "Led by The Sage," "For the birdies") follow the correct hierarchy: org first, Sage second, user benefit third.

The callout box ("Not just agents. An organization.") is the strongest copy on the page. It draws the competitive line without naming competitors, and the punchline about QA writing misuse cases first is a real capability, not marketing fluff.

### PASS: Brand voice is consistent

- The monk capybara (Sage) guiding the little bird (the client's project) metaphor is used consistently throughout: hero image, hierarchy viz, drift panels, session bridges.
- The Sage quote in the cascade story ("Untested code passing is not a quality signal. It is the absence of a quality signal.") matches the character voice -- measured, precise, protective.
- Color language is consistent: amber for the Sage, cilantro for enterprise features, chili for problems.

### PASS: Community-to-enterprise upgrade path feels natural

The drift section handles the community/enterprise comparison well:
- Community is described respectfully ("Good for catching problems. Not for stopping them before they start.")
- Enterprise is positioned as an upgrade for teams that need more, not a replacement for a broken product.
- The Supervisor is never called inadequate -- it is accurately scoped.

This matters because open-source community members will read this page. None of the language suggests their free tier is a compromised product.

### FAIL: /pilot link violates the gating decision

**Location:** Line 2609

```html
<a href="/pilot" class="cta-btn-secondary">Founding Partner Program</a>
```

**Problem:** The `/pilot` page is explicitly gated as invite-only. The project memory records the decision: "never link from marketing site or public navigation." Linking to it from the enterprise CTA section makes it publicly discoverable, which contradicts the gating decision.

**Fix:** Remove the "/pilot" link from the CTA section. Replace with either:
- A second email CTA variant ("Ask about founding partner pricing")
- A link to the community GitHub repo as the secondary action
- Nothing -- a single "Talk to us" CTA is clean and appropriate for enterprise

### PASS: CTA section is appropriately gated

The primary CTA ("Talk to us" via email) is the right call for invite-only enterprise. No self-serve signup, no pricing page link, no false urgency. The "invite-only right now" language is honest without being exclusionary.

### NOTE: "24 agents" repeated 3 times

The number "24 agents" appears in: the hero lede, the hierarchy section label, and the meta description. This is fine for SEO and scannability, but if the agent count ever changes, three locations need updating. Consider whether the hierarchy section should use "The full team" instead of repeating the number.

---

## Summary of Required Changes

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | **Must fix** | Line 2509-2510 | "10x routing efficiency" has no benchmark basis | Use "5x" or reframe as "3 agents to zero" |
| 2 | **Must fix** | Line 2048, 1978 | "+17 more" IC count is arithmetically wrong | Correct to actual remaining IC count (+6 more) |
| 3 | **Must fix** | Line 2609 | /pilot link violates invite-only gating decision | Remove link or replace with non-pilot CTA |

## Items That Passed

- Hero narrative and positioning
- All benchmark numbers (1.000, 11/11, 7/7, 3/3, ~1.5K, 83-120K, ~50K)
- Community vs enterprise comparison tone
- Brand voice and mascot consistency
- Technical architecture descriptions
- Accessibility (SR table, aria labels, reduced-motion support)
- Terminal animation accuracy
- Session management visualization
- CTA approach (email, invite-only framing)

---

**Signed:** The Sage
**Next action:** Fix the three issues above, then this page is approved for production.
