# TheEngOrg — Investor One-Pager
**WS-PITCH-06 | Design Deliverable**
*As of: 2026-03-22 | $3M Seed at $9M Pre-Money*
*Status: Production-ready spec — leave-behind for VC partner meetings*

---

## PRODUCTION SPEC

This one-pager is a **leave-behind document** — it is forwarded by the VC to their partners after the meeting. It must work without the founder present. Every claim must be self-explanatory in under 90 seconds of reading.

**Format:** Single page, A4 / US Letter. Vertical (portrait).
**Design target:** Same visual identity as the deck — dark background, monospace data, capybara anchor.
**File output:** PDF (vector, not rasterized). Color-accurate on both screen and print.
**Typographic constraint:** Same fonts as deck — Inter and JetBrains Mono. Embed fonts in PDF.

---

## LAYOUT SPEC

**Canvas:** 816px x 1056px (US Letter at 96dpi) or 794px x 1123px (A4 at 96dpi). Use US Letter.
**Margins:** 48px all sides (tighter than slides — this is print-optimized).
**Active content area:** 720px x 960px.
**Background:** #171E28 (full bleed, including print margins).

**Column grid:** 12-column, 16px gutters, within active area.
**Vertical rhythm:** 24px baseline.

---

## SECTION 01 — Header (top of page)

**Left side (columns 1-7):**

Company name:
```
TheEngOrg
```
Inter 700, 36px, #E8E8E8. Left-aligned. Y: 48px from top of active area.

One-line description (24px below company name):
```
The AI Engineering Organization — 24 specialized agents,
one org chart, zero humans required to coordinate.
```
Inter 400, 14px, #8A9BB0. Left-aligned. Max width: 480px. Line height: 1.5.

**Right side (columns 8-12):**

Raise badge: Top-right corner.
Background: rgba(212, 168, 75, 0.15). Border: 1px solid #D4A84B. Border-radius: 8px. Padding: 12px 20px.
```
$3M Seed
$9M Pre-Money
March 2026
```
Line 1: JetBrains Mono 700, 22px, #D4A84B.
Line 2-3: JetBrains Mono 400, 13px, #8A9BB0.

**Separator line (below header section):**
Full width, 1px, #8A9BB0 at 20%. Y: 140px from top of active area.

---

## SECTION 02 — Problem (left column, ~2 sentences)

Y: 160px. Width: 340px (columns 1-6).

Section label:
```
THE PROBLEM
```
JetBrains Mono 400, 10px, #C94D3A. Letter-spacing: 2px.

Body (24px below label):
```
Every enterprise adopting AI coding tools hits the same wall:
individual developers get faster, but the team gets slower.
AI agents write code at 10x speed with zero coordination —
producing 10x the bugs, conflicts, and rework.
```
Inter 400, 13px, #E8E8E8. Line height: 1.6. Max width: 320px.

---

## SECTION 03 — Solution (right column, ~2 sentences)

Y: 160px. Width: 340px (columns 7-12).

Section label:
```
THE SOLUTION
```
JetBrains Mono 400, 10px, #4A7C59. Letter-spacing: 2px.

Body (24px below label):
```
TheEngOrg replaces the org chart. 24 specialized AI agents —
CEO, CTO, engineers, QA, security — governed by the Sage
orchestrator, which never writes code but ensures nothing
ships that should not.
```
Inter 400, 13px, #E8E8E8. Line height: 1.6. Max width: 320px.

**Separator line:**
Full width, 1px, #8A9BB0 at 20%. Y: 340px.

---

## SECTION 04 — Key Metrics (4 numbers)

Y: 360px. Full width.

Section label:
```
KEY METRICS
```
JetBrains Mono 400, 10px, #8A9BB0. Letter-spacing: 2px.

**Four metric blocks, horizontal row (Y: 390px).**

Each block: 168px wide. No borders between blocks — use spacing only. Vertical divider lines: 1px, #8A9BB0 at 15%, full height of metric block.

**Metric 1:**
```
95%+
```
JetBrains Mono 700, 40px, #F9A825.

```
Gross margin
(no inference cost —
customer pays Anthropic)
```
Inter 400, 11px, #8A9BB0. Line height: 1.5.

**Metric 2:**
```
66x
```
JetBrains Mono 700, 40px, #F9A825.

```
LTV:CAC ratio
(best-in-class SaaS
is 3x–8x)
```
Inter 400, 11px, #8A9BB0.

**Metric 3:**
```
1.000
```
JetBrains Mono 700, 40px, #F9A825.

```
Sage benchmark score
(strong constitutions beat
best model on cheaper model)
```
Inter 400, 11px, #8A9BB0.

**Metric 4:**
```
16x
```
JetBrains Mono 700, 40px, #F9A825.

```
Annual customer ROI
(5-dev team ships like
a 30-person team)
```
Inter 400, 11px, #8A9BB0.

**Separator line:** Full width, 1px, #8A9BB0 at 20%. Y: 520px.

---

## SECTION 05 — Capybara Visual (anchor image)

Y: 536px. Right-aligned in page. Width: 200px. Height: 260px.

**The Sage illustration — condensed version.**
This is a smaller-format version of the Slide 14 illustration. Same character: monk capybara in forward-facing pose, saffron robes with circuit patterns, third eye glowing amber, teal bird on right shoulder.

For one-pager print-optimization:
- Simplify the illustration slightly (fewer detail lines) to hold at smaller scale
- Ensure the third eye glow and bird are legible at 200px width
- Illustration bleeds 16px into the right margin (edge-of-page tension)

**Illustration spec (same as Slide 14, abbreviated):**
- Body: Earth-toned brown capybara
- Robes: #D4A84B saffron with teal (#2E8B8B) circuit patterns, 30% opacity
- Third eye: #F9A825 amber glow, 14px radius
- Bird: #2E8B8B teal, perched on right shoulder, facing forward, 36px relative size
- Background: Transparent (inherits page #171E28)

**Art-director note:** This illustration can be scaled from the Slide 14 master asset. Export at 2x (400px wide) and scale down in layout.

---

## SECTION 06 — Business Model (left of illustration)

Y: 536px. Left side. Width: 480px (columns 1-9).

Section label:
```
OPEN-CORE BUSINESS MODEL
```
JetBrains Mono 400, 10px, #8A9BB0. Letter-spacing: 2px.

Three tier rows, stacked (Y: 560px):

**Row 1 — Community:**
Left label: "Free" — JetBrains Mono 700, 12px, #4A7C59.
Right content: "23 agents, 16 skills — developers find us on GitHub"
Inter 400, 12px, #8A9BB0. Line height: 1.4.

**Row 2 — Enterprise:**
Left label: "$3,500/mo" — JetBrains Mono 700, 12px, #D4A84B.
Right content: "+ Sage orchestrator, drift detection, session management"
Inter 400, 12px, #8A9BB0.

**Row 3 — Strategic:**
Left label: "$12,000/mo" — JetBrains Mono 700, 12px, #F9A825.
Right content: "+ Custom constitutions, dedicated onboarding, SLA"
Inter 400, 12px, #8A9BB0.

**Downward conversion arrow between rows:**
Small "↓" character between each row, with "2-5% annual conversion" text in [CAPTION] #8A9BB0 12px, beside the arrow. Center-aligned on left column.

**Section unit economics summary (below tier rows, Y: 690px):**

Three inline stats, separated by " · " in #8A9BB0:
```
CAC $1,200  ·  Payback <1 month  ·  Cash-flow positive M5
```
JetBrains Mono 400, 12px, #8A9BB0.

---

## SECTION 07 — Traction + Competitive Context

Y: 740px. Full width.

**Separator line:** 1px, #8A9BB0 at 20%.

Y: 760px. Two columns.

**Left column (columns 1-6) — Traction:**

Section label:
```
TRACTION
```
JetBrains Mono 400, 10px, #2E8B8B. Letter-spacing: 2px.

Content:
```
v4.2 shipped  ·  24 agents live  ·  2 pilots active
Sage benchmark: 1.000/1.000
CTO agent: 5.00/5.00 across all model configurations
```
JetBrains Mono 400, 12px, #E8E8E8. Line height: 1.6.

**Right column (columns 7-12) — Why Now:**

Section label:
```
MARKET TIMING
```
JetBrains Mono 400, 10px, #F9A825. Letter-spacing: 2px.

Content:
```
2026: enterprise AI budgets activate.
No dominant coordination-layer product exists.
Window is 2026-2027. We ship now.
```
Inter 400, 12px, #E8E8E8. Line height: 1.6.

---

## SECTION 08 — The Ask

Y: 860px. Full width.

**Separator line:** 1px, #8A9BB0 at 20%.

Y: 876px. Full width.

**Left side (columns 1-8):**

Ask details:
```
$3M Seed  ·  $9M Pre-Money  ·  25% investor ownership
```
JetBrains Mono 700, 16px, #E8E8E8.

Use of funds (24px below):
```
Year 1: founder + engineer · pilot → 10 clients · $420K burn
Year 2: 5-person team · scale to 50+ clients · $906K burn
Path to A: $3-10M ARR · $30-100M Series A valuation
```
JetBrains Mono 400, 11px, #8A9BB0. Line height: 1.6.

**Right side (columns 9-12) — contact block:**

```
[Founder Name]
Founder & CEO
[email]
theengorg.wontonwebworks.com
```
Inter 400, 12px, #8A9BB0. Right-aligned.

---

## SECTION 09 — Footer CTA

Y: 960px (bottom of active area). Full width.

**Separator line:** 1px, #8A9BB0 at 20%.

Y: 976px. Centered.

```
The most capital-efficient AI seed deal in the market.
```
JetBrains Mono 700, 14px, #D4FF00 (Lime Zest). Center-aligned.

This is the ONLY use of Lime Zest on the one-pager — same discipline as the deck.

---

## CONTENT BLOCK (Copy-Ready)

Below is the finalized copy for all text sections, ready to drop into Figma or layout software without edits:

---

**Company:**
TheEngOrg

**One-liner:**
The AI Engineering Organization — 24 specialized agents, one org chart, zero humans required to coordinate.

**The Problem (2 sentences):**
Every enterprise adopting AI coding tools hits the same wall: individual developers get faster, but the team gets slower. AI agents write code at 10x speed with zero coordination — producing 10x the bugs, conflicts, and rework.

**The Solution (2 sentences):**
TheEngOrg replaces the org chart. 24 specialized AI agents — CEO, CTO, engineers, QA, security — governed by the Sage orchestrator, which never writes code but ensures nothing ships that should not.

**Key Metrics:**

| Metric | Value | Context |
|--------|-------|---------|
| Gross margin | 95%+ | No inference cost — customer pays Anthropic directly |
| LTV:CAC | 66x | Best-in-class SaaS is 3x–8x; OSS-led comps run 20x–50x |
| Sage benchmark | 1.000/1.000 | Strong constitutions beat the best model on a cheaper model |
| Annual customer ROI | 16x | 5-dev team ships like a 30-person team; $906K value at $57K cost |

**The Ask:**
$3M Seed at $9M pre-money. 25% investor ownership.

**What it buys:**

Year 1: Founder + engineer, pilot → 10 clients, $420K burn.
Year 2: 5-person team, scale to 50+ clients, $906K burn.
Path to Series A: $3–10M ARR, $30–100M valuation, 18 months from close.
Cash-flow positive: Month 5.
Cash at Month 12: $3.2M (above the raise amount).
Series A: optional, from a position of strength.

**Investor return path:**

Base: $300M acquisition → 15x MOIC.
Expected: $320M acquisition → 16x MOIC.
Upside: $1B+ IPO → 66x MOIC.
Probability-weighted EV: 21.5x MOIC.

**Footer CTA:**
The most capital-efficient AI seed deal in the market.

---

## Quality Checklist — One-Pager

Before sending to print/PDF:

- [ ] All content fits on one page at specified font sizes — no overflow
- [ ] PDF is vector (fonts embedded, no rasterization)
- [ ] Background #171E28 prints dark (test on laser printer — dark backgrounds need higher contrast on text)
- [ ] Capybara illustration is legible at 200px render size
- [ ] Bird is visible on capybara's shoulder at reduced scale
- [ ] Lime Zest (#D4FF00) footer CTA is the ONLY use of that color
- [ ] All numbers verified against source documents (financial-model.md, unit-economics.md, investor-returns.md)
- [ ] Contact details are correct and live
- [ ] No placeholder text remains in the final PDF
- [ ] Art-director sign-off on capybara illustration scale
- [ ] One-pager works without the founder present — every claim is self-explanatory
