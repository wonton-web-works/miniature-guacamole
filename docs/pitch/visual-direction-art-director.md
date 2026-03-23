# Art Director: Pitch Deck Visual Direction
**Deliverable:** docs/pitch/visual-direction-art-director.md
**Prepared by:** Art Director
**Status:** Approved — implement against this spec

---

## Critical Note Before Implementation

The existing `generate-pitch-deck.py` references a non-existent `site/public/assets/pitch/` directory for most images. All real assets live at `site/public/assets/capy/`. Every image path in the script must be corrected. The asset inventory below uses verified paths.

All assets have hot-pink/magenta backgrounds. They were designed for web with CSS blending modes. In PPTX, you cannot do CSS — so where the background shows, it will appear as solid hot pink. For this reason:
- Use only assets that have transparent backgrounds or dark backgrounds
- Use `sage-pixel-guiding-no-bg.png` and `sage-pixel-meditating-no-bg.png` for corner watermarks (transparent bg)
- Use `terminal-capy.png` and `terminal-capy-spirits.png` for full placements (dark bg, will composite naturally on dark slides)
- Avoid the anime-style and drift illustrations as direct PPTX inserts — their hot-pink bg will clash catastrophically against the dark slide
- The pixel art teal bird `sage-pixel-bird-teal-for-web.png` has a white/transparent bg and will work for small placements

---

## Verified Asset Inventory

All paths relative to repo root:

| Asset | File | Background | Use Case |
|---|---|---|---|
| Sage pixel (guiding, no-bg) | `site/public/assets/capy/sage-character/sage-pixel-guiding-no-bg.png` | Transparent | Corner watermarks, slides 5-11 |
| Sage pixel (meditating, no-bg) | `site/public/assets/capy/sage-character/sage-pixel-meditating-no-bg.png` | Transparent | Cover watermark |
| Teal bird (pixel, for-web) | `site/public/assets/capy/sage-character/sage-pixel-bird-teal-for-web.png` | White/transparent | Small bird placements |
| Terminal capy | `site/public/assets/capy/terminal-capy.png` | Dark navy (matches deck) | Full placements on dark bg |
| Terminal capy spirits | `site/public/assets/capy/terminal-capy-spirits.png` | Dark navy (matches deck) | Full placements on dark bg |

**Do not use in PPTX (hot pink bg):**
- All drift/ illustrations
- sage-anime-*.png
- sage-pixel-hero-gathering*.png
- Any asset without explicit transparent or dark bg noted above

---

## Brand Color Reference (exact RGB for python-pptx)

```python
BG      = RGBColor(0x17, 0x1E, 0x28)  # Slide background
SURFACE = RGBColor(0x1E, 0x2A, 0x38)  # Cards, panels
TEXT    = RGBColor(0xE8, 0xE8, 0xE8)  # Primary text
SUB     = RGBColor(0x8A, 0x9B, 0xB0)  # Subtitles, captions
AMBER   = RGBColor(0xF9, 0xA8, 0x25)  # Key numbers, Sage
GOLD    = RGBColor(0xD4, 0xA8, 0x4B)  # Sage robe accent
TEAL    = RGBColor(0x2E, 0x8B, 0x8B)  # Bird, secondary data
RED     = RGBColor(0xC9, 0x4D, 0x3A)  # Problem data
GREEN   = RGBColor(0x4A, 0x7C, 0x59)  # Revenue/growth
ZEST    = RGBColor(0xD4, 0xFF, 0x00)  # CTA only — slide 14
```

---

## Slide-by-Slide Visual Direction

---

### SLIDE 01 — Cover

**Narrative intent:** Authority and restraint. The capybara is present but not announced.

**Layout:** Full centered stack, vertically centered at 40% from top.

**Background:** Solid `#171E28`. No gradients. No particle effects — that is a web concern.

**Brand watermark (bottom-right corner):**
- Image: `sage-pixel-meditating-no-bg.png`
- Size: 100x100px equivalent (Inches(0.7) square)
- Position: Right edge minus 0.5", bottom edge minus 0.5"
- Opacity: python-pptx does not support native opacity on images. Work around this by using a dark rectangle overlay shape on top of the image with transparency fill — OR accept the image at full opacity at this small size. The pixel art reads as intentional at this scale. Do not fake-fade it with a workaround that degrades quality.
- The meditation pose (sage holds orb, bird on head) reads correctly as a watchful guardian.

**Horizontal rule:** Draw a 1px line in `#2E8B8B` (teal), full content width (MARGIN to SLIDE_W - MARGIN), at Y = Inches(4.7). This separates the title block from the raise line and grounds the composition.

**Typography corrections from current script:**
- "TheEngOrg" — keep at 72pt but use bold Inter (script uses Calibri — flag for engineer: Calibri is a fallback, Inter is the brand font; if Inter is not installed on the build machine, Calibri is acceptable but note the deviation)
- Raise line should sit below the teal rule, not at the same level as the subhead

**Spacing:**
```
Inches(2.5)  — "TheEngOrg" headline top
Inches(3.8)  — "The AI Engineering Organization." subhead
Inches(4.7)  — teal horizontal rule (1px line)
Inches(4.95) — "$3M Seed | March 2026" raise line
```

**No additional elements.** The current script is correct in its restraint — just add the rule and fix the watermark path.

---

### SLIDE 02 — The Problem: Coordination Crisis

**Narrative intent:** The bird is alone in the chaos. The capybara has not appeared yet.

**Layout:** 55% left (text) / 45% right (visual diagram).

**Left side — three cards:**

Replace the current single-border cards with a more structured treatment:
- Card background: `#1E2A38` (SURFACE) rounded rect
- Left accent bar: 3px wide rectangle in `#C94D3A` (RED), same height as card, flush left
- Card padding: 0.15" inside left edge of text from accent bar
- Three cards stacked with 0.12" gap between them

Card content (from final copy, not the fabricated quote in the script):
1. The real Michael Parker quote (Stack Overflow, Jan 2026) — use `#8A9BB0` italic-style treatment
2. The four data bullets (41% more bugs, 44% code churn, 10x vulnerabilities, 19% slower) — use `#E8E8E8`
3. "Why this happens" — the four mechanism bullets — use `#E8E8E8`

**Right side — chaos diagram:**
python-pptx can draw this. Use shapes:

- 6 rounded rectangles as agent nodes, `#1E2A38` fill, `#C94D3A` border (1px), scattered layout
- Draw connector lines between them that cross and tangle — use `add_connector()` or multiple line shapes
- Lines in `#C94D3A` at 1pt weight, deliberately non-orthogonal (diagonal lines signal disorder)
- At the center of the tangle: insert `sage-pixel-bird-teal-for-web.png` at Inches(0.5) square
- The bird reads as trapped/overwhelmed in the chaos

**Bird placement:** Center-right quadrant of the slide, within the tangle. Size: Inches(0.45) square. No caption needed — the visual tells the story.

**No capybara on this slide.**

---

### SLIDE 03 — The Cost of Uncoordinated Intelligence

**Narrative intent:** Pure data. The numbers do the work. Chili red signals damage.

**Layout:** Metric wall. Three equal columns spanning full content width.

**Current script:** Renders as plain text. Replace with:

**Three data cards (equal width, side by side):**
- Card: `#1E2A38` rounded rect, full column height (~Inches(3.5))
- No border by default
- Top of card: thin horizontal bar in `#C94D3A` — 4px height, full card width (signals danger without overwhelming)
- Number: JetBrains Mono 700, 72pt, `#C94D3A`, centered, at card top third
- Unit label (e.g., "of AI agent projects"): Inter 400, 16pt, `#8A9BB0`, centered
- Description line: Inter 400, 18pt, `#E8E8E8`, centered

Layout math at 13.333" wide with 0.556" margins:
```
Card width = (13.333 - 0.556*2 - 0.2*2) / 3 = Inches(3.84)
Card spacing = 0.1" gap
Cards top at Inches(1.8), height Inches(4.0)
```

**Bottom line:** "The problem is not the AI. The problem is the org chart."
- Inter 400, 22pt, `#E8E8E8`, centered, Inches(6.1) from top
- No card background — just the text anchored to the baseline

**Footnote:** Sources line at Inches(7.1), Inter 12pt, `#4A5568` (darker muted), left-aligned.

**No brand assets on this slide.** The restraint is correct. Numbers speak.

---

### SLIDE 04 — The Insight: AI Needs an Org Chart

**Narrative intent:** The capybara enters as the Sage node. It IS the diagram, not decoration beside it.

**Layout:** Title at top, then two horizontal panels — left: spectrum table, right: org hierarchy.

**Left panel — spectrum comparison:**

Use a proper styled table (python-pptx Table object, not text):
- 3 rows × 3 columns
- Column headers: [Category] [Command] [Capability]
- Row 1: Copilot / "Write this function" / Autocomplete
- Row 2: AI Agent / "Do this task" / Task execution
- Row 3: AI Eng Org / "Ship this feature — correctly" / Organizational intelligence

Table styling:
- All cell backgrounds: `#1E2A38`
- Header row (row 0 if used) or left column: `#8A9BB0` text, Inter 400, 13pt
- Data cells: `#E8E8E8` text, Inter 400, 14pt
- Third row (TheEngOrg row): left-accent treatment — draw a 3px `#D4A84B` (GOLD) rectangle along the left edge of the leftmost cell, and set all three cells' text to `#F9A825` (AMBER) to make the TheEngOrg row visually distinct
- No table border — or very subtle `#2A3A4A` 0.5pt borders only

**Right panel — org hierarchy:**

Draw with shapes. This is the most important diagram in the deck.

SAGE node (top center of right panel):
- Shape: `add_shape(MSO_SHAPE.ROUNDED_RECTANGLE)`
- Size: Inches(1.8) wide × Inches(0.6) tall
- Fill: `#1E2A38`
- Border: `#D4A84B` (GOLD), 2pt
- Label: "SAGE" in JetBrains Mono 700, 14pt, `#D4A84B`
- Below label: "watches. does not build." in Inter 400, 10pt, `#8A9BB0`
- Add a second rectangle shape directly behind it: Inches(2.0) wide × Inches(0.7) tall, `#D4A84B` fill at low opacity. python-pptx does not support shape opacity easily — instead, use a very slightly larger rounded rect in `#2A2000` (very dark amber-tinted) as a "glow" halo. It reads as a glow at this scale.

Connector from SAGE down: vertical line in `#D4A84B`, 1pt, to a horizontal bar that splits to three C-suite nodes.

C-Suite tier (CEO / CTO / CFO):
- Three rounded rects: Inches(1.2) wide × Inches(0.5) tall
- Fills: `#1E2A38`
- Borders: `#8A9BB0` (CEO), `#2E6E8E` (CTO), `#D4A84B` (CFO) — 1pt each
- JetBrains Mono 400, 12pt, colored to match their border

Engineering tier below CTO (EM / QA / Security / DevOps):
- Four smaller rounded rects: Inches(1.0) wide × Inches(0.45) tall
- Fill: `#1E2A38`, borders in `#4A7C59` (EM), `#7A5C8B` (QA), `#C94D3A` (Security), `#3D5A6B` (DevOps)
- JetBrains Mono 400, 11pt

Dev tier below EM (Dev × 3):
- Three smallest nodes: Inches(0.8) × Inches(0.4)
- Fill `#1E2A38`, border `#3D5A6B`, 0.5pt

Connectors: 1pt lines in `#3A4A5A`. Right-angle routing only. Use two separate line shapes per connector (vertical + horizontal) to fake right-angle routing since python-pptx connectors default to straight lines.

**No image of the capybara needed here** — the diagram IS the Sage. The amber glow on the node carries the visual weight. Reserve the actual illustration for the closing slide.

---

### SLIDE 05 — The Product: See It Work

**Narrative intent:** Terminal native. The product speaks for itself.

**Layout:** Headline top-left, terminal screenshot dominant center, callout bar at bottom.

**Terminal screenshot:**

The script currently references `ASSETS/terminal-screenshot.png` which does not exist. The real demo screenshots are at:
- `docs/pitch/tapes/demo-enterprise-screenshot.png`
- `docs/pitch/tapes/demo-full-act1.png`
- `docs/pitch/tapes/demo-full-act2.png`

Use `demo-enterprise-screenshot.png` as the primary terminal visual. Read it first to verify it shows agent output (not just a blank terminal). If it shows real agent orchestration, place it:
- Left: Inches(0.556), Top: Inches(1.6)
- Width: Inches(8.5), Height: proportional
- Add a 1px `#2E8B8B` (teal) border around the image using a border-only rectangle shape on top

If the screenshot is too small or unclear at deck size, the fallback is a shaped text block with terminal styling:
- `#1E2A38` rounded-rect background with `#2E8B8B` top bar (simulating terminal title bar)
- JetBrains Mono 400, 13pt, `#4A7C59` (green, terminal-output color) for the text content
- Paste the actual mg-build output lines from the demo tapes

**Callout bar (bottom):**
- Full-width rectangle `#1E2A38`, height Inches(0.65), at Y = SLIDE_H - MARGIN - Inches(0.65)
- Four metrics as a horizontal flow inside it: "$5K/mo API cost → 24-agent team → Zero servers → ~95% gross margin"
- JetBrains Mono 700, 14pt, `#F9A825` (AMBER) for numbers, `#8A9BB0` for arrows and labels

**Sage watermark:**
- `sage-pixel-guiding-no-bg.png`, Inches(0.6) square
- Position: right side, mid-height (Inches(2.5) from top)
- At this small size with transparent bg, it reads as an intentional corner detail

---

### SLIDE 06 — DEMO

**This slide is a title card shown while the terminal is projected live.**

**Layout:** Centered, single message.

**Visual treatment:** Make this visually different from all other slides — it is a transition moment.

- Background: `#171E28` (same BG)
- Draw a large teal circle outline: `add_shape(MSO_SHAPE.OVAL)`, fill none (use `shape.fill.background()`), border `#2E8B8B` 2pt, size Inches(5) square, centered at slide center
- Inside the circle, the headline text: "Live" in JetBrains Mono 700, 72pt, `#E8E8E8`, centered
- Below "Live": "Sage catching scope drift." in Inter 400, 20pt, `#8A9BB0`
- Below that: "Watch how it routes, not just what it builds." in Inter 400, 16pt, `#4A5568`

This circle motif echoes the Sage's amber orb from the illustrations — a conscious visual callback without using the actual image.

---

### SLIDE 07 — The Moat: Why You Can't Copy This

**Narrative intent:** The defensibility argument. Technical confidence.

**Layout:** Title top, then two panels side by side.

**Left panel — Benchmark comparison:**

Use a table (2 rows × 3 columns):
- Column headers: [Config] [Description] [Score]
- Row 1: "Config A" / "Weak constitutions + Opus (best model)" / "0.957"
- Row 2: "Config C" / "Strong constitutions + Sonnet (cheaper)" / "1.000"

Styling:
- Row 1 (Config A): text `#8A9BB0`, score in `#8A9BB0` — muted (the loser)
- Row 2 (Config C): text `#E8E8E8`, score in `#F9A825` 700-bold — highlighted (the winner)
- Draw a 2px `#D4A84B` bottom border under row 2 to underline the winning result
- Callout below table: "Constitution quality > Model quality." in JetBrains Mono 700, 18pt, `#F9A825`

**Right panel — Three layers:**

Three stacked cards, each representing a moat layer:

Card 1 — Community (open source):
- `#1E2A38` rect, teal left accent bar (3px `#2E8B8B`)
- "Layer 1: Community (open source)" in JetBrains Mono 400, 12pt, `#2E8B8B`
- "23 agents, MIT licensed. Developers find us, adopt us, depend on us." Inter 400, 14pt, `#E8E8E8`
- "→ Distribution engine." Inter 400, 13pt, `#8A9BB0`

Card 2 — Enterprise Sage (closed):
- `#1E2A38` rect, amber left accent bar (3px `#D4A84B`)
- "Layer 2: Enterprise Sage (closed source)" in JetBrains Mono 400, 12pt, `#D4A84B`
- "+ Sage orchestration. Drift detection. Session management." Inter 400, 14pt, `#E8E8E8`
- "→ This is what customers pay $120K/yr for." Inter 400, 13pt, `#8A9BB0`

Card 3 — Flywheel:
- `#1E2A38` rect, green left accent bar (3px `#4A7C59`)
- "Layer 3: Constitution R&D flywheel" in JetBrains Mono 400, 12pt, `#4A7C59`
- "Enterprise usage improves constitutions." Inter 400, 14pt, `#E8E8E8`
- "→ This is what compounds." Inter 700, 13pt, `#4A7C59`

**Sage watermark:** `sage-pixel-guiding-no-bg.png`, Inches(0.55) square, bottom-right corner.

---

### SLIDE 08 — The Market: A New Category Forming Now

**Narrative intent:** Market sizing. Visual credibility for the TAM claim.

**Layout:** Title top, then concentric rings left, competitive table right.

**Concentric rings (left, 55% of width):**

python-pptx can approximate concentric rings with nested ovals:

- Outermost oval: Inches(5.5) wide × Inches(4.0) tall, fill `#1A2530` (slightly lighter than BG), no border
- Middle oval: Inches(4.2) × Inches(3.0), fill `#1E2F40`, no border
- Inner oval: Inches(2.8) × Inches(2.0), fill `#213547`, no border
- Innermost: Inches(1.4) × Inches(0.9), fill `#2E8B8B` at low tint — use `#1C4A4A` (dark teal), no border

Labels overlaid on each ring using textboxes:
- TAM: "TAM: $800B+" — JetBrains Mono 400, 11pt, `#8A9BB0`, placed at top of outermost ring
- SAM: "SAM: $50-100B by 2028" — `#2E8B8B`, placed at mid ring
- SOM: "SOM: $1-5B addressable" — `#D4A84B`, placed at inner ring
- Beachhead: "Mid-market AI teams" — `#F9A825`, placed center

**Competitive table (right, 45% of width):**

Table: 4 rows × 3 columns (Competitor / Scope / Capability)
- Copilot/Cursor: `#8A9BB0` text
- Devin: `#8A9BB0` text
- Factory AI: `#8A9BB0` text
- TheEngOrg: ALL three cells highlighted — `#F9A825` text, `#1E2A38` cell bg with `#D4A84B` left border on first cell

Row for TheEngOrg should have a subtle `#1A2800` (very dark amber) background to distinguish it from competitors.

**Bottom callout (full width):**
- `#1E2A38` rounded rect, `#D4A84B` border 1pt
- "TheEngOrg does not compete with Copilot. We organize the AI workforce Copilot creates."
- JetBrains Mono 400, 14pt, `#D4A84B`, centered

---

### SLIDE 09 — The Business Model: Open-Core Economics

**Narrative intent:** The business is simple and the unit economics are exceptional.

**Layout:** Title top. Left panel (pricing tiers). Right panel (unit economics table).

**Left panel — pricing tier flow:**

Three stacked tier blocks, connected by a downward arrow:

Block 1 — Community:
- `#1E2A38` rect, `#2E8B8B` (teal) top border bar (4px height)
- "Community (free)" JetBrains Mono 700, 14pt, `#2E8B8B`
- "23 agents, 16 skills, full workflow" Inter 400, 13pt, `#8A9BB0`
- "Developers find it. Teams depend on it." Inter 400, 13pt, `#E8E8E8`

Conversion arrow between blocks:
- Small `#8A9BB0` downward arrow shape
- "2-5% convert annually" in JetBrains Mono 400, 11pt, `#8A9BB0` beside arrow

Block 2 — Enterprise:
- `#1E2A38` rect, `#D4A84B` (GOLD) top bar
- "$10,000/mo avg" JetBrains Mono 700, 16pt, `#D4A84B`
- "+ Sage orchestrator, Drift detection, Session management" Inter 400, 13pt, `#E8E8E8`

Block 3 — Strategic:
- `#1E2A38` rect, `#F9A825` (AMBER) top bar
- "$18,000/mo avg" JetBrains Mono 700, 16pt, `#F9A825`
- "+ Custom constitutions, SLA guarantees" Inter 400, 13pt, `#E8E8E8`

**Right panel — unit economics:**

Use a proper table: 6 rows × 2 columns (Metric / Value)

| Metric | Value |
|---|---|
| CAC | $1,200 |
| LTV | $240,000 |
| LTV:CAC | 16x |
| Gross margin | ~95% |
| Payback | <1 month |
| Customer ROI | 16x annual |

Styling:
- Metric column: Inter 400, 13pt, `#8A9BB0`
- Value column: JetBrains Mono 700, 16pt, `#F9A825`
- "16x" (LTV:CAC) and "~95%" (Gross margin) — make these larger, 20pt — they are the headline numbers
- Row backgrounds alternate between `#1E2A38` and `#192330` to aid readability
- No external border on table

**Footnote:** "HashiCorp, Grafana Labs, and Posthog built billion-dollar companies on this exact model." Inter 400, 13pt, `#4A5568`, full width at slide bottom.

---

### SLIDE 10 — The Numbers: 36-Month Financial Model

**Narrative intent:** The cash never goes below the raise amount. This is the most important financial fact.

**Layout:** Title top. Left panel (ARR trajectory). Right panel (cash position). Full-width callout at bottom.

**Left panel — ARR trajectory:**

Use python-pptx Chart (BarChart or LineChart from pptx.chart.data):

Chart data:
- Series "Base": Y1=$1.3M, Y2=$3.7M, Y3=$7.1M
- Series "Expected": Y1=$2.4M, Y2=$7.7M, Y3=$12M

Chart styling:
- Background: `#1E2A38` (set chart plot area background)
- "Base" series: `#4A7C59` (GREEN) bars/line
- "Expected" series: `#D4A84B` (GOLD) bars/line
- No gridlines
- Axis labels in JetBrains Mono 400, 11pt, `#8A9BB0`
- Direct labels on bars: Y3 values labeled in their respective colors
- Chart border: none (or very subtle 1pt `#2A3A4A`)

Label the chart "ARR Trajectory" in JetBrains Mono 400, 12pt, `#8A9BB0` above it.

**Right panel — cash position:**

Use python-pptx LineChart:

Data points: M0=$3.0M, M5=$2.9M, M12=$3.2M, M24=$4.9M, M36=$5.5M

Styling:
- Line: 2pt stroke, `#F9A825` (AMBER)
- Add a horizontal dashed reference line at $2.9M labeled "Floor: $2.9M" in `#8A9BB0`
- Mark M5 with a circle marker and label "Cash-flow positive" in `#4A7C59`
- Mark M12 with a marker and label "Above raise amount" in `#4A7C59`
- No gridlines. Minimal axis.

**Bottom callout — the most important element on this slide:**

Full-width rounded rect:
- `#0D1A0D` fill (very dark green — just a hint of green)
- `#4A7C59` border, 1pt
- Text: "The cash never drops below $2.9M." JetBrains Mono 700, 24pt, `#E8E8E8`, centered
- Sub: "No GPU bill. No server scaling. Customer pays Anthropic." Inter 400, 14pt, `#8A9BB0`, centered below

Position: MARGIN to SLIDE_W-MARGIN, Y = Inches(6.3), height Inches(0.85).

---

### SLIDE 11 — Traction: Proof It Works

**Narrative intent:** This is not vaporware. The proof is in the numbers and the timeline.

**Layout:** Title top. Three-column metric wall top half. Timeline bottom half.

**Three metric columns (top half):**

Use three vertical card panels, same card treatment as Slide 03 but with AMBER numbers:

Column 1 — PRODUCT:
- Card header bar: `#4A7C59` (green, "shipped" = positive)
- Metrics: "v4.2 shipped / 24 agents live / 16 skills operational" — one per line, JetBrains Mono 400, 13pt, `#E8E8E8`

Column 2 — BENCHMARKS:
- Card header bar: `#D4A84B` (gold — the Sage's color)
- Big number: "1.000" in JetBrains Mono 700, 56pt, `#F9A825`, centered
- Sub: "Sage score" Inter 400, 13pt, `#8A9BB0`
- Below: "CTO: 5.00/5.00 across all configs" JetBrains Mono 400, 12pt, `#E8E8E8`

Column 3 — PILOTS:
- Card header bar: `#2E8B8B` (teal — client/bird color)
- "2 startup clients" JetBrains Mono 700, 20pt, `#E8E8E8`
- "Enterprise integration active" Inter 400, 13pt, `#E8E8E8`
- "First revenue in the door" Inter 700, 14pt, `#4A7C59`

**Timeline (bottom half):**

Draw as a horizontal flow using shapes:

- Horizontal line: `#2E8B8B`, 1.5pt, full content width, at Y = Inches(5.8)
- Five milestone markers: circle shapes (Inches(0.15) diameter) on the line in `#2E8B8B`
- Below each marker: date in JetBrains Mono 400, 11pt, `#8A9BB0`
- Above each marker: version label in JetBrains Mono 700, 12pt, `#E8E8E8`
- Final marker (Raise): larger circle Inches(0.25), fill `#D4A84B`, label "Raise" in amber

Milestones: v3.0 (Mar 17) → v4.0 (Mar 19) → v4.2 (Mar 20) → Pilots (Mar 22) → NOW

**Sage watermark:** `sage-pixel-meditating-no-bg.png`, Inches(0.55) square, bottom-left corner (below timeline).

---

### SLIDE 12 — Investor Returns: The Fund Math

**Narrative intent:** Make the VC math unavoidable. Every number earns its place.

**Layout:** Title top. Full-width returns table. Big "21.5x" callout right. Competitive context bottom.

**Returns table (main body):**

Use python-pptx Table: 4 rows × 5 columns (+ header row)

| SCENARIO | ARR AT A | SERIES A | EXIT | YOUR RETURN |
|---|---|---|---|---|
| Base | $3M | $30M pre | $300M acq. | 15x ($45M) |
| Expected | $5M | $50M pre | $320M acq. | 16x ($48M) |
| Upside | $10M | $100M pre | $1B+ IPO | 48-66x |

Styling:
- Header row: `#1A2535` bg, `#8A9BB0` text, JetBrains Mono 400, 12pt
- Base row: `#1E2A38` bg, `#E8E8E8` text, "15x" in `#4A7C59` 700-weight
- Expected row: `#1E2A38` bg, `#E8E8E8` text, "16x" in `#4A7C59`
- Upside row: `#1E2A38` bg with subtle `#D4A84B` tint — use `#1A1800` — "48-66x" in `#F9A825` 700-weight
- Row separator lines: `#2A3A4A`, 0.5pt

**Big callout (right side, overlapping or beside table):**

Rounded rect, `#1E2A38`, `#D4A84B` border 2pt:
- "21.5x" JetBrains Mono 700, 64pt, `#D4A84B`, centered
- "Probability-weighted EV" Inter 400, 13pt, `#8A9BB0`, centered
- "Double the fail weight: still 17x" Inter 400, 12pt, `#8A9BB0`, centered

Size: Inches(3.0) wide × Inches(2.5) tall. Position: right panel, vertically centered with the table.

**Bottom context line:**

Full-width `#1E2A38` rect (not rounded, flat), height Inches(0.55):
- "Devin raised at $2B. Cursor at $400M. You're buying this at $9M with better unit economics than both."
- Inter 400, 13pt, `#8A9BB0`, centered — then "better unit economics" in `#F9A825` 700-weight

To achieve mixed formatting in python-pptx, use `add_multiline()` with two paragraph entries, or manipulate paragraph runs directly.

---

### SLIDE 13 — The Team: Founder-Market Fit

**Narrative intent:** The human behind the machine. No capybara here.

**Layout:** Centered, photo left, text right. Clean and professional.

**Photo placement (left):**
- Rounded rect as placeholder: `#1E2A38`, `#2E8B8B` border 1pt, Inches(2.5) × Inches(3.0)
- Add "FOUNDER PHOTO" text inside placeholder in JetBrains Mono 400, 12pt, `#4A5568`
- When actual photo is available: replace with `add_image_safe()` and add a `#2E8B8B` border rect on top (borders cannot be added directly to image shapes in python-pptx)

**Text right side:**
- "Founder Name" — Inter 700, 28pt, `#E8E8E8`
- "Founder & CEO, TheEngOrg" — JetBrains Mono 400, 16pt, `#8A9BB0`
- 0.15" gap
- Bio paragraph — Inter 400, 16pt, `#E8E8E8`, word-wrapped
- "Built this entire system solo: 24 agents, 16 skills, the Sage, the benchmark suite, the brand, the marketing site." — Inter 400, 15pt, `#E8E8E8`
- "Current burn: $35K/month. No outside capital until now." — JetBrains Mono 400, 14pt, `#8A9BB0`

**Hire plan (bottom panel, full width):**

Three-column `#1E2A38` card, teal top bar:
- Month 1: "Dev team + Sales hire"
- Month 2: "Sales active — signing customers"
- Month 3: "Integration + product feedback loop"
- Each column: JetBrains Mono 400, 13pt, `#E8E8E8`

**Bottom anchor line:**
"The product is built. The team is the bottleneck. That's what $3M solves."
Inter 700, 16pt, `#E8E8E8`, centered, above the hire plan.

**No brand assets on this slide.**

---

### SLIDE 14 — The Ask: $3M to Own the AI Org Layer

**Narrative intent:** The narrative arc completes. The bird has grown. The capybara is revealed in full.

**Layout:** Left 55% (the ask + financials). Right 45% (the full Sage illustration).

**Right side — the image:**

This is the most important image decision in the deck. The problem: all anime-style Sage images have hot-pink backgrounds that will clash on the dark slide.

**Recommended asset:** `terminal-capy-spirits.png` — this has a dark navy background that naturally composites against the deck background. The capy holds a lantern (glowing amber, which maps to the Sage's orb), the teal bird rides on its head, and floating spirit lights suggest intelligence/agency. It reads as mystical, watchful, and warm. This is the deck's visual payoff.

Placement:
- Left edge of right panel: Inches(7.5) from slide left
- Top: Inches(0.8)
- Width: Inches(5.3) (fills right panel)
- Height: proportional (~Inches(3.0) based on asset aspect ratio — verify)

The dark background of the asset will blend seamlessly with the slide background.

**Left side — the ask:**

"$3M Seed | $9M Pre-Money" — JetBrains Mono 700, 36pt, `#E8E8E8`, at top of left panel.

Three-column plan block (same card treatment as Slide 13 hire plan):

| Year 1 | Year 2 | Path to A |
|---|---|---|
| Founder + eng | 5-person team | $3-10M ARR |
| Pilot → 10 clients | Scale to 50+ | $30-100M val. |
| $420K burn | $906K burn | 18 months |

Styling: `#1E2A38` card, amber top bar, JetBrains Mono 400, 13pt.

Key facts block below:
- `#1E2A38` rounded rect
- Three lines in JetBrains Mono 400, 14pt, `#8A9BB0`:
  - "Cash-flow positive:  Month 5"
  - "Cash at Month 12:    $3.2M (higher than raise)"
  - "Series A:            Optional. From strength."

**CTA line (most important element on the slide, above the table):**

Full-width rect, `#0C1A00` fill (very dark green-black):
- "The most capital-efficient AI seed deal in the market."
- JetBrains Mono 700, 18pt, `#D4FF00` (ZEST — use it here and ONLY here)
- Centered

This is the one and only use of Lime Zest in the entire deck.

**Bottom anchor:**

At slide bottom, centered, spanning full width:
"Every startup building with AI agents is a small bird trying to build alone."
Inter 400, 14pt, `#8A9BB0`

Then on the next line: "We built the monk capybara." Inter 700, 16pt, `#E8E8E8`.

---

## Implementation Priority Order

For the engineer building this:

1. **Fix all asset paths** — nothing in `site/public/assets/pitch/` exists; map to `site/public/assets/capy/`
2. **Slide 14** — the terminal-capy-spirits image placement; this is the most visible brand moment
3. **Slide 03** — the metric wall with proper data cards; currently plain text
4. **Slide 04** — the org chart hierarchy with shape-based nodes and SAGE callout
5. **Slide 09 and 12** — the unit economics and returns tables; currently text blocks
6. **Slide 01** — the sage-pixel-meditating-no-bg watermark placement
7. All remaining slides — the accent bars, card backgrounds, and watermarks

## What NOT to Do

- Do not use any asset with a hot-pink background directly in PPTX
- Do not use emoji anywhere in slide text
- Do not add gradients to backgrounds — python-pptx gradient fills are unstable across PowerPoint versions
- Do not place the capybara on slides 02, 03, 13 — it earns its appearances; casual use cheapens it
- Do not use Lime Zest (`#D4FF00`) anywhere except the CTA line on Slide 14
- Do not exceed 3 font sizes on any single slide — hierarchy collapses when there are too many levels
- Do not use the full anime illustrations (they are beautiful but the hot-pink background makes them unusable in PPTX without pre-processing to remove the background, which requires image editing outside python-pptx scope)

---

*Art Director sign-off: This direction is implementable with python-pptx as specified. Verify asset backgrounds before placing any new image not listed above.*
