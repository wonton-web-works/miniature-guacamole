# TheEngOrg Pitch Deck — Diagram & Visualization Specs
**WS-PITCH-06 | Design Deliverable**
*As of: 2026-03-22*
*Status: Production-ready spec for Figma vector build*

---

## Spec Conventions

All diagrams are designed as standalone vector components that can be placed into slide layouts.
Each diagram spec includes: type, exact dimensions, data/content, visual style, colors, and capybara/bird placement guidance.

Color tokens follow `deck-slides.md` conventions.

---

## DIAGRAM 01 — Agent Hierarchy Org Chart

**Used in:** Slide 04 (The Insight)
**Standalone use:** Appendix, one-pager, data room

### Dimensions
Full diagram canvas: **976px x 720px**
Minimum readable render: 600px wide

### Type
Vertical hierarchy tree. Top-down flow. Clean orthogonal connectors only — no diagonals, no curved lines.

### Node Specifications

**Standard node:**
- Shape: Rounded rectangle, border-radius 6px
- Dimensions: 160px wide x 44px tall
- Fill: #1E2A38
- Border: 1px solid [agent color]
- Left accent bar: 4px wide, full height, [agent color]
- Label: JetBrains Mono 400, 14px, [agent color], vertically centered
- Agent role abbreviation: appears above the label in JetBrains Mono 400, 10px, [SUB] #8A9BB0

**SAGE node (special):**
- Shape: Rounded rectangle, border-radius 8px
- Dimensions: 200px wide x 56px tall
- Fill: #1E2A38
- Border: 1.5px solid #D4A84B
- Left accent bar: 6px wide, #D4A84B
- Box shadow: 0 0 16px rgba(212, 168, 75, 0.40) — amber glow
- Primary label: "SAGE" — JetBrains Mono 700, 18px, #D4A84B
- Sub-label: "orchestrator — never builds" — JetBrains Mono 400, 11px, #8A9BB0
- Small capybara pixel-art icon: 18px, positioned 8px to the right of the label text, #D4A84B

### Hierarchy Layout

```
Tier 0 — Orchestrator (Y: 0px)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    [SAGE]
                      |
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tier 1 — C-Suite (Y: 120px)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    [CEO]           [CTO]           [CFO]
      |               |
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tier 2 — Directors (Y: 260px)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [Eng Mgr]  [QA Lead]  [Staff Eng]  [PO]
      |
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tier 3 — Specialists (Y: 400px)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 [Dev] [Dev] [QA] [Security] [DevOps] [API]
```

### Node Color Map

| Role | Color Hex | Left-accent hex |
|------|-----------|-----------------|
| SAGE | #D4A84B | #D4A84B |
| CEO | #8A9BB0 | #8A9BB0 |
| CTO | #2E6E8E | #2E6E8E |
| CFO | #D4A84B | #D4A84B |
| CMO/COO | #8B4A2E | #8B4A2E |
| Eng Mgr | #4A7C59 | #4A7C59 |
| QA Lead | #7A5C8B | #7A5C8B |
| Staff Eng | #3D5A6B | #3D5A6B |
| PO | #8B4A2E | #8B4A2E |
| Dev | #4A7C59 | #4A7C59 |
| QA | #7A5C8B | #7A5C8B |
| Security | #3D5A6B | #3D5A6B |
| DevOps | #3D5A6B | #3D5A6B |
| API | #3D5A6B | #3D5A6B |

### Connector Specifications
- Width: 1px
- Color: #3A4A3A (dark border, barely visible on dark background)
- Style: Straight vertical lines, then horizontal to connect siblings
- No arrowheads on hierarchy connectors — these are org chart relationships, not data flow

### Tier Separators
- Style: Horizontal dotted line spanning full diagram width
- 1px, #8A9BB0 at 20% opacity
- Dashed pattern: 4px on / 8px off

### Tier Labels
- Position: Left margin, 16px from left edge of diagram, centered vertically at each separator
- Style: JetBrains Mono 400, 11px, #8A9BB0
- Labels: "Orchestrator", "C-Suite", "Directors", "Specialists"

### Capybara / Bird Integration
The SAGE node itself carries the capybara identity — no separate mascot element needed. The small pixel-art icon inside the node is sufficient.

### Standalone Version Additions (for one-pager / data room)
When used outside the slide, add a bottom callout:
```
24 agents  ·  One org chart  ·  Zero humans required to coordinate
```
JetBrains Mono 400, 14px, #8A9BB0. Centered below diagram.

---

## DIAGRAM 02 — Market Map (TAM/SAM/SOM)

**Used in:** Slide 08 (The Market)
**Standalone use:** One-pager, investor data room

### Dimensions
Diagram canvas: **860px x 500px**

### Type
Nested rectangle diagram (not circles). Concentric rectangles communicating market hierarchy.
Rationale: Rectangles feel more precise for technical investor audiences. Circles are over-used in pitch decks.

### Rectangle Specifications

**Outer rectangle — TAM:**
- Dimensions: 860px x 500px (full canvas)
- Fill: rgba(46, 139, 139, 0.06) — barely-there teal wash
- Border: 1.5px solid #2E8B8B at 30% opacity
- Border-radius: 12px

**Label — TAM (top-left, 20px padding inside):**
```
TAM — Global Software Engineering Spend
```
JetBrains Mono 400, 13px, #2E8B8B at 60%. Letter-spacing: 1px.

**Number — TAM (top-right, 20px padding inside):**
```
$800B+
```
JetBrains Mono 700, 36px, #2E8B8B at 70%.

**Middle rectangle — SAM:**
- Dimensions: 600px x 300px
- Position: Centered within outer rectangle
- Fill: rgba(46, 139, 139, 0.12)
- Border: 1.5px solid #2E8B8B at 60%
- Border-radius: 8px

**Label — SAM (top-left, 16px padding):**
```
SAM — AI-Augmented Engineering Tools
```
JetBrains Mono 400, 13px, #2E8B8B at 85%.

**Number — SAM:**
```
$50–100B by 2028
```
JetBrains Mono 700, 28px, #2E8B8B.

**Inner rectangle — SOM:**
- Dimensions: 340px x 140px
- Position: Centered within SAM rectangle
- Fill: rgba(249, 168, 37, 0.12)
- Border: 1.5px solid #F9A825
- Border-radius: 6px

**Label — SOM (top-left, 12px padding):**
```
SOM — AI Engineering Coordination
```
JetBrains Mono 400, 12px, #F9A825.

**Number — SOM:**
```
$1–5B near-term
```
JetBrains Mono 700, 22px, #F9A825.

**Entry point callout (inside SOM, below number):**
```
Entry: Claude Code teams, 5-50 devs
```
Inter 400, 11px, #8A9BB0. Centered.

### Annotation Arrows
Two annotation arrows pointing inward from each rectangle's right edge toward the center:

Arrow 1 (TAM → SAM boundary): Small right-to-left arrow, #8A9BB0, 12px. Label: "AI tools subset" — Inter 400, 11px, #8A9BB0.

Arrow 2 (SAM → SOM boundary): Same. Label: "Org intelligence layer".

### Capybara / Bird Integration
No capybara on this diagram. Market data should be authoritative — mascot would undercut credibility here.

---

## DIAGRAM 03 — Competitive Positioning Map

**Used in:** Slide 08 (secondary), Appendix A
**Standalone use:** Data room

### Dimensions
Diagram canvas: **820px x 640px**

### Type
Positioning quadrant (2x2 matrix). X-axis: scope of intelligence (Code completion → Organizational intelligence). Y-axis: switching cost (Low → High).

### Axes

**X-axis:** Horizontal, bottom of diagram. 1px, #8A9BB0 at 40%. Label: "SCOPE OF INTELLIGENCE" — JetBrains Mono 400, 11px, #8A9BB0. Letter-spacing: 2px.
- Left end label: "Code completion" — 12px, #8A9BB0
- Right end label: "Organizational intelligence" — 12px, #8A9BB0

**Y-axis:** Vertical, left of diagram. 1px, #8A9BB0 at 40%. Label: "SWITCHING COST" — JetBrains Mono 400, 11px, #8A9BB0. Rotated 90° counter-clockwise.
- Bottom label: "Low" — 12px, #8A9BB0
- Top label: "High" — 12px, #8A9BB0

**Quadrant dividers:** 1px, #8A9BB0 at 15% opacity. Horizontal and vertical center lines.

### Competitor Nodes

Each competitor is a labeled dot or small rectangle on the chart.

**Node style (non-TheEngOrg):**
- Shape: Rounded rectangle, 140px x 36px
- Fill: #1E2A38
- Border: 1px solid #8A9BB0 at 40%
- Label: JetBrains Mono 400, 13px, #8A9BB0

**TheEngOrg node:**
- Shape: Rounded rectangle, 160px x 44px
- Fill: rgba(212, 168, 75, 0.15)
- Border: 1.5px solid #D4A84B
- Label: JetBrains Mono 700, 14px, #D4A84B
- Small capybara icon: 16px, right of label text, #D4A84B

### Node Positions (x%, y% of canvas where 0,0 is bottom-left)

| Competitor | x% | y% | Notes |
|-----------|----|----|-------|
| Copilot / Cursor | 15% | 18% | Low switching cost, code completion |
| Codeium | 20% | 22% | Similar to Copilot cluster |
| Devin | 48% | 35% | Mid-scope, medium switching cost |
| Sweep AI | 35% | 25% | Task execution, lower switching cost |
| Factory AI | 62% | 55% | Moving toward org intelligence |
| **TheEngOrg** | **82%** | **82%** | Top-right: high switching cost, org intelligence |

### Annotation — TheEngOrg differentiator text
Small text block (no background) positioned at x: 62%, y: 88% of canvas:
```
Highest switching cost.
Most differentiated.
```
JetBrains Mono 400, 12px, #D4A84B.

### Quadrant Background Tinting
- Lower-left quadrant (code completion, low cost): No tint — this is the commodity zone
- Upper-right quadrant (org intelligence, high cost): rgba(212, 168, 75, 0.04) subtle warm tint to draw attention toward TheEngOrg's position

### Capybara / Bird Integration
TheEngOrg node contains the small capybara pixel icon as described above. No separate mascot element.

---

## DIAGRAM 04 — Unit Economics Visual

**Used in:** Slide 09 (Business Model)
**Standalone use:** One-pager

### Dimensions
Diagram canvas: **800px x 480px**

### Type
Horizontal "waterfall" style showing the economic chain from cost to value.

### Layout — Three Panels

**Panel 1 — Cost (left):**
Width: 220px. Background: rgba(201, 77, 58, 0.08). Border: 1px solid #C94D3A. Border-radius: 8px. Padding: 20px.

Header:
```
CUSTOMER COST
```
JetBrains Mono 400, 11px, #C94D3A. Letter-spacing: 2px.

Items:
```
License: $3,500/mo
API (Anthropic): ~$1,000/mo
───────────────────
Total: ~$4,500/mo
$54K/year
```
JetBrains Mono 400, 14px, #8A9BB0.
Total line: JetBrains Mono 700, 18px, #C94D3A.

**Panel 2 — Unit Economics (center):**
Width: 300px. Background: #1E2A38. Border: 1px solid #D4A84B. Border-radius: 8px. Padding: 20px.

Header:
```
UNIT ECONOMICS
```
JetBrains Mono 400, 11px, #D4A84B.

Items stacked vertically with metric / value pairs:

| Metric | Value |
|--------|-------|
| CAC | $1,200 |
| Payback | <1 month |
| LTV | $79,800 |
| LTV:CAC | 66x |
| Gross margin | 95%+ |

Metric: JetBrains Mono 400, 13px, #8A9BB0. Right-aligned in left sub-column.
Value: JetBrains Mono 700, 18px, #F9A825. Left-aligned in right sub-column.

LTV:CAC row is the hero:
Value: JetBrains Mono 700, 36px, #F9A825.
1px separator above and below.

**Panel 3 — Value Delivered (right):**
Width: 220px. Background: rgba(74, 124, 89, 0.08). Border: 1px solid #4A7C59. Border-radius: 8px. Padding: 20px.

Header:
```
VALUE DELIVERED
```
JetBrains Mono 400, 11px, #4A7C59.

Items:
```
Hours saved: $360K/yr
Avoided hires: $450K/yr
Defect reduction: $96K/yr
───────────────────
Total: $906K/year
```
JetBrains Mono 400, 14px, #8A9BB0.
Total line: JetBrains Mono 700, 18px, #4A7C59.

### Connecting Arrows
Two arrows between panels, horizontal:
- Panel 1 → Panel 2: Arrow in #2E8B8B, 1px, standard arrowhead.
- Panel 2 → Panel 3: Same.

### ROI Callout (below panels, centered)
Box: #1E2A38 background. Border: 1px #4A7C59. Border-radius: 6px. Padding: 12px 32px.
```
$906K value  ÷  $57K cost  =  16x annual ROI
```
JetBrains Mono 700, 20px. "$906K" in #4A7C59. "$57K" in #C94D3A. "16x annual ROI" in #F9A825.

### Capybara / Bird Integration
None — data clarity takes priority. This is a financial diagram.

---

## DIAGRAM 05 — Revenue Growth Curve

**Used in:** Slide 10 (The Numbers)
**Standalone use:** One-pager, Appendix C

### Dimensions
Chart canvas: **820px x 420px** (plot area only, excluding axis labels)

### Type
Multi-line chart. X-axis: time (months). Y-axis: ARR ($). Minimal styling — no grid lines, no fill under lines.

### Axes

**X-axis:**
- Range: Month 0 to Month 36
- Tick marks at: M0, M6, M12, M18, M24, M30, M36
- Labels: "M0", "M12", "M24", "M36" (label only key milestones, not every tick)
- Style: 1px, #8A9BB0 at 30%. Tick marks: 4px height.
- Labels: JetBrains Mono 400, 11px, #8A9BB0.

**Y-axis:**
- Range: $0 to $15M
- Tick labels: "$0", "$5M", "$10M", "$15M"
- Style: Same as x-axis.

### Data Lines

**Base case:**
- Color: #4A7C59 (Guac Green)
- Stroke: 2px, solid
- Key points: M0=$0, M6=$43K, M12=$1.31M, M18=$2.7M, M24=$3.74M, M30=$5.1M, M36=$7.08M

**Expected case:**
- Color: #F9A825 (Amber)
- Stroke: 2px, solid
- Key points: M0=$0, M6=$65K, M12=$2.39M, M18=$5.1M, M24=$7.72M, M30=$10M, M36=$12M

### Data Point Markers
Filled circle, 6px diameter, same color as line. Placed at: M12, M24, M36 only.

### Direct Labels (no legend)
At M36 terminus of each line, positioned 8px to the right and 4px above the endpoint:
- Base case: "Base $7.1M" — JetBrains Mono 400, 12px, #4A7C59
- Expected: "Expected $12M+" — JetBrains Mono 400, 12px, #F9A825

### Inflection Annotations
Three vertical dotted lines from x-axis to the base case line:

1. M5 line: 1px, #4A7C59, dashed (2px on / 4px off). Label below x-axis: "Cash+" in #4A7C59, 11px.
2. M12 line: 1px, #8A9BB0 at 30%, dashed. No label (M12 is already labeled on axis).
3. M24 line: Same as M12. Label: "Series A window" in #8A9BB0, 11px, below axis.

### Capybara / Bird Integration
None — chart is about data authority.

---

## DIAGRAM 06 — Cash Balance Curve

**Used in:** Slide 10 (The Numbers)
**Standalone use:** Appendix C

### Dimensions
Chart canvas: **820px x 420px**

### Type
Single-line chart showing cash balance from M0 to M24 (base scenario only).

### Axes
- X-axis: M0 to M24. Labels at M0, M6, M12, M18, M24.
- Y-axis: $2.8M to $5.5M (tight range to show the "dip then grow" clearly). Labels: "$3M", "$3.5M", "$4M", "$4.5M", "$5M".

### Reference Line
Horizontal line at $3.0M (the raise amount):
- 1px, #8A9BB0 at 40%, dashed (4px on / 8px off)
- Label at left end: "Raise: $3.0M" — JetBrains Mono 400, 11px, #8A9BB0

### Data Line
- Color: #F9A825 (Amber)
- Stroke: 2.5px, solid

Key data points (from financial model):
| Month | Cash Balance |
|-------|-------------|
| 0 | $3,000,000 |
| 1 | $2,985,500 |
| 5 | $2,943,500 (local minimum) |
| 6 | $2,950,000 |
| 9 | $3,039,000 |
| 12 | $3,185,250 |
| 18 | $3,770,750 |
| 24 | $4,857,250 |

### Key Annotations

**M5 annotation (the cash-flow positive moment):**
- Small downward triangle (▼) marker on line at M5 position: #C94D3A, 8px — this marks the dip
- Label below: "M5: low point $2.94M" — JetBrains Mono 400, 11px, #C94D3A

**M5 annotation (positive direction):**
- Small upward arrow (↑) above line immediately after M5: #4A7C59, 8px
- Label: "Cash-flow positive" — 11px, #4A7C59

**M12 annotation:**
- Filled circle, #F9A825, 8px
- Label above: "$3.2M" — JetBrains Mono 700, 14px, #4A7C59 (it is now above the raise — use green)

**M24 annotation:**
- Filled circle, #F9A825, 8px
- Label above: "$4.9M" — JetBrains Mono 700, 18px, #F9A825

**Callout box (below chart, full width):**
Background: #1E2A38. Border: 1px, #4A7C59. Border-radius: 6px. Padding: 12px 24px.
```
Cash never drops below $2.9M.
The Series A is optional, not survival-driven.
```
Inter 400, 16px, #E8E8E8. Center-aligned.

---

## DIAGRAM 07 — Investor Return Scenario Chart

**Used in:** Slide 12 (Investor Returns)
**Standalone use:** Data room (investor-returns.md)

### Dimensions
Diagram canvas: **1760px x 420px** (spans full slide width as a table)

### Type
Data table styled as a visual component (not a plain spreadsheet). Each row is a scenario card.

### Table Structure

**Header row:** Full width. Background: #1E2A38. Height: 48px. Padding: 0 24px.

Columns (6 equal portions):
```
SCENARIO  |  ARR AT A  |  SERIES A VAL  |  EXIT PATH  |  EXIT VALUE  |  YOUR RETURN
```
JetBrains Mono 400, 12px, #8A9BB0. Letter-spacing: 1px. Left-aligned in each cell.

**Row A — Base:**
Height: 80px. Background: #1E2A38. Padding: 0 24px.
```
Base  |  $3M ARR  |  $30M pre-money  |  $300M acquisition  |  $45M  |  15x MOIC
```
All text: JetBrains Mono 400, 16px, #E8E8E8. Final column "15x": JetBrains Mono 700, 20px, #E8E8E8.

**Row B — Expected:**
Height: 80px. Background: rgba(46, 139, 139, 0.06). 1px top border: #2E8B8B at 20%.
```
Expected  |  $5M ARR  |  $50M pre-money  |  $320M acquisition  |  $48M  |  16x MOIC
```
Final column "16x": JetBrains Mono 700, 20px, #2E8B8B.

**Row C — Upside (hero row):**
Height: 100px. Background: rgba(249, 168, 37, 0.10). 1px solid border: #F9A825 on top and bottom.
```
Upside  |  $10M ARR  |  $100M pre-money  |  $1B+ IPO  |  $200M  |  66x MOIC
```
"Upside" label: JetBrains Mono 700, 16px, #F9A825.
Final column "66x": JetBrains Mono 700, 36px, #F9A825.

**EV summary row:**
Height: 72px. Background: rgba(74, 124, 89, 0.12). 1px solid border: #4A7C59 top.
```
Probability-weighted EV (40/35/15/10% split)              21.5x MOIC
```
Label: JetBrains Mono 400, 15px, #4A7C59. Left half of row.
"21.5x": JetBrains Mono 700, 44px, #4A7C59. Right-aligned.

**Sub-row (no background):** Height: 40px.
```
Even if you double the fail weight (20%): still 17x MOIC
```
Inter 400, 14px, #8A9BB0. Right-aligned.

### Vertical Column Dividers
1px, #8A9BB0 at 15% opacity. Full height of table (excluding sub-row). Between each column.

### Capybara / Bird Integration
None — investor math must be clean.

---

## DIAGRAM 08 — The Open-Core Flywheel

**Used in:** Slide 09 (Business Model), Appendix, one-pager
**Standalone use:** Data room, website

### Dimensions
Diagram canvas: **680px x 680px** (square, since it is a circular flywheel)

### Type
Circular flywheel diagram. 5 nodes arranged in a circle with directed arrows between them. The flow is clockwise.

### Circle Layout
Nodes placed on a circle with radius ~240px from center (center: 340px, 340px).

Node positions (clockwise from top):

| Position | Angle | Node Label |
|----------|-------|-----------|
| Top | 270° | OSS Community |
| Top-right | 342° | Discovery |
| Right | 54° | Enterprise Conversion |
| Bottom | 126° | Revenue |
| Left | 198° | Constitution R&D |

### Node Style
- Shape: Rounded rectangle, 180px x 56px
- Fill: #1E2A38
- Border: 1px solid [node color]
- Border-radius: 8px
- Label: JetBrains Mono 700, 15px, [node color]

### Node Colors
| Node | Color |
|------|-------|
| OSS Community | #2E8B8B (Teal) |
| Discovery | #8A9BB0 (Sub) |
| Enterprise Conversion | #D4A84B (Gold) |
| Revenue | #F9A825 (Amber) |
| Constitution R&D | #4A7C59 (Green) |

### Arrows (clockwise arcs)
Curved arrows connecting nodes in clockwise sequence.
- Stroke: 1.5px, #2E8B8B at 60%
- Arrowhead: Small filled triangle, 8px, #2E8B8B
- Curve: Arc that hugs the outside of the node circle (not cutting through center)

### Arrow Labels (small text beside each arrow)
JetBrains Mono 400, 11px, #8A9BB0. Positioned along the arc midpoint.

| Arrow | Label |
|-------|-------|
| OSS → Discovery | "2% annual conversion" |
| Discovery → Enterprise Conversion | "OSS-led pipeline" |
| Enterprise Conversion → Revenue | "$3,500/mo avg" |
| Revenue → Constitution R&D | "Funds R&D" |
| Constitution R&D → OSS | "Better product, more adoption" |

### Center of Flywheel
The center circle is the capybara — small pixel-art capybara, 80px, centered at (340px, 340px), #D4A84B at 60% opacity. This is the visual metaphor: the Sage (capybara) sits at the center of everything, the engine that makes the flywheel spin.

Text below capybara (centered):
```
Sage
```
JetBrains Mono 400, 12px, #D4A84B.

### Capybara / Bird Integration
Capybara pixel-art at the flywheel center as specified above.

---

## DIAGRAM 09 — Before / After: Engineering Team Headcount Equivalence

**Used in:** Appendix F, one-pager
**Standalone use:** Data room, sales materials

### Dimensions
Diagram canvas: **1200px x 480px** (wide)

### Type
Side-by-side comparison. Left = "Before" (without TheEngOrg). Right = "After" (with TheEngOrg). Vertical divider at center.

### Left Panel — Before (600px x 480px)

**Header:**
```
Without TheEngOrg
```
JetBrains Mono 700, 16px, #C94D3A. Left-aligned, 24px padding.

**Engineer icons:** 5 human figure icons, arranged in a horizontal row.
- Style: Simple outline silhouettes, 48px each
- Color: #8A9BB0
- Gap: 16px between each
- Y: centered in panel

**Cost callout below icons:**
```
5 developers
$750K–1M/year (loaded)
```
JetBrains Mono 400, 16px, #8A9BB0. Center-aligned.

**Output callout (bottom):**
Box: rgba(201, 77, 58, 0.08). Border: 1px #C94D3A. Border-radius: 6px. Padding: 12px 24px. Width: 480px.
```
Output: 5-person team capacity
Coordination: manual, error-prone
Rework: 4.2x longer to fix than build
```
Inter 400, 14px, #8A9BB0.

### Center Divider
1px, #8A9BB0 at 30%. Full height.

**TheEngOrg logo:** Centered on the divider, y=240px. Size: 48px. Background circle: [SURFACE] #1E2A38, 56px diameter. This marks the transformation point.

### Right Panel — After (600px x 480px)

**Header:**
```
With TheEngOrg
```
JetBrains Mono 700, 16px, #4A7C59.

**Engineer icons:** 5 human figure icons (same as left — same team). PLUS additional "virtual agent" icons in a second row.

Row 1 (real developers): 5 silhouettes, #4A7C59.
Row 2 (AI agents — implied expansion): 10 smaller outlined icons, #2E8B8B at 40%, 32px each. These represent the agent workforce. Labeled "AI agents" in [CAPTION] 11px, #8A9BB0.

**Cost callout:**
```
5 developers + TheEngOrg
$750K–1M + $57K/year (fully loaded)
```
JetBrains Mono 400, 16px, #8A9BB0.

**Effective output:**
Large text:
```
30-person team
output capacity
```
JetBrains Mono 700, 28px, #4A7C59. Center-aligned.

**Output callout (bottom):**
Box: rgba(74, 124, 89, 0.08). Border: 1px #4A7C59.
```
Output: 20-30 person team equivalent
Coordination: Sage-managed
ROI: 16x annual ($906K value / $57K cost)
```
Inter 400, 14px, #8A9BB0.

**"16x ROI" badge (prominent, top-right of right panel):**
Pill: Background rgba(249, 168, 37, 0.15). Border: 1px #F9A825. Border-radius: 20px. Padding: 8px 20px.
```
16x annual ROI
```
JetBrains Mono 700, 20px, #F9A825.

### Capybara / Bird Integration
The capybara pixel-art (48px, #D4A84B) appears in the right panel only — positioned above the agent icons in row 2, watching. The bird (24px, #2E8B8B) appears in the left panel only — alone, small, surrounded by the "before" context.

---

## DIAGRAM 10 — Tangle Network (Problem Visualization)

**Used in:** Slide 02 (The Problem)

### Dimensions
Diagram canvas: **784px x 640px**

### Type
Network graph showing chaotic, uncoordinated agent connections.

### Node Layout
6 nodes arranged in a loose cluster (deliberately asymmetric — not a clean layout):

Approximate positions (x, y from top-left of canvas):
- Node 1 "Dev": (120, 100)
- Node 2 "QA": (420, 80)
- Node 3 "Arch": (640, 220)
- Node 4 "PM": (80, 380)
- Node 5 "API": (380, 440)
- Node 6 "Deploy": (600, 500)

### Node Style
- Shape: Circle, 56px diameter
- Fill: #1E2A38
- Border: 1px solid #8A9BB0 at 50%
- Label: JetBrains Mono 400, 12px, #8A9BB0. Centered inside.

### Connection Lines
12 connections (every node connected to 2-3 others, creating visible chaos):

Line style:
- Stroke: 1.5px
- Color: #C94D3A (Chili Red) at 60%
- 4 lines at full 100% opacity to indicate the most "broken" connections

Lines to draw (node pairs):
(1,2), (1,3), (1,5), (2,3), (2,4), (2,6), (3,4), (3,5), (4,5), (4,6), (5,6), (1,6)

The lines cross each other — this is intentional. The crossing creates the visual sense of chaos.

**Three lines with "broken" styling (dashed, to show broken connection):**
Select 3 crossing lines. Change to dashed: 4px on / 4px off. Same red color.

### The Bird
- Position: Between nodes 4 and 5, approximately (230, 380)
- Style: Pixel-art teal bird, 32px x 32px
- Color: #2E8B8B
- Opacity: 100%
- The bird is trapped within the tangle — surrounded by crossing red lines

### Capybara / Bird Integration
Bird only (as specified above). No capybara — the capybara has not appeared in the narrative yet.

---

## Asset Production Checklist

Before any diagram is approved for slide insertion:

- [ ] Exported at 2x resolution minimum (1920x1080 slide = 3840x2160 export for retina)
- [ ] All text is live (not rasterized) — Figma should maintain text layers
- [ ] Colors verified against hex values in this spec (use Figma color styles)
- [ ] Capybara/bird placement matches the slide narrative rules in `deck-slides.md`
- [ ] Dark background renders correctly at low contrast (simulate projector conditions)
- [ ] All data points verified against source documents (financial-model.md, unit-economics.md, investor-returns.md, market-analysis.md)
- [ ] Art-director sign-off on capybara illustration quality (Diagram 07 right-panel / Slide 14 illustration)
- [ ] Terminal screenshot (Slide 05) is from a real pilot run — NOT a mockup

### Art-Director Dependencies

These items require art-director production before slides can be finalized:

1. **Pixel-art capybara silhouette** — seated meditation pose. 96px master at 1x. Used as watermark throughout.
2. **Pixel-art teal bird** — three states: alone/small (Slide 02), small alone (Slide 03), confident perched (Slide 14). 32px master.
3. **Full illustrated Sage** — anime-adjacent, 480px, for Slide 14. This is the hero asset of the entire deck. See Slide 14 spec for detailed character notes.
4. **Small capybara icon** — 20px, for SAGE node in org chart. Must be legible at this size.

### Engineering Dependencies

1. **Terminal screenshot** — from real `/mg-build` or `/mg-leadership-team` run with Sage active on pilot codebase. Must show: agent spawning, scope classification, drift detection, recovery plan, PR creation. Requested from engineering-director.
