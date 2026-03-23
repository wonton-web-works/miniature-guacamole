# TheEngOrg Pitch Deck — Production Slide Specifications
**WS-PITCH-06 | Design Deliverable**
*As of: 2026-03-22 | 14 Slides + Demo Interlude*
*Status: Production-ready spec for Figma/Keynote build*

---

## Spec Conventions

All measurements assume a **1920 x 1080px canvas** with **80px safe margins** on all sides.
Active content area: **1760 x 920px**.
Column grid: 12 columns, 24px gutters.
Vertical rhythm: 40px baseline.

**Font shorthand used below:**
- `[TITLE]` = Inter 700, 48-56px, #E8E8E8
- `[MONO-LG]` = JetBrains Mono 700, 36-64px
- `[MONO-SM]` = JetBrains Mono 400, 18-22px
- `[BODY]` = Inter 400, 20-24px, #E8E8E8
- `[CAPTION]` = Inter 400, 14-16px, #8A9BB0

**Color tokens used below:**
- `[BG]` = #171E28 (Navy-charcoal, slide background)
- `[SURFACE]` = #1E2A38 (Dark blue-grey, cards)
- `[TEXT]` = #E8E8E8 (Primary text)
- `[SUB]` = #8A9BB0 (Subtext, labels)
- `[GREEN]` = #4A7C59 (Guac Green)
- `[TEAL]` = #2E8B8B (Cilantro Teal)
- `[RED]` = #C94D3A (Chili Red)
- `[AMBER]` = #F9A825 (Lime Yellow)
- `[GOLD]` = #D4A84B (Sage saffron)
- `[ZEST]` = #D4FF00 (Lime Zest — CTA only)

---

## SLIDE 01 — Cover

### Layout
**Type:** Centered / minimal
**Background:** Full-bleed [BG] (#171E28). No texture, no gradients.

### Placement Grid
```
[  80px margin  ]
[               ]
[    LOGO       ]   ← Top-center, y=120px from top edge
[               ]
[               ]
[    HEADLINE   ]   ← Vertically centered in canvas (y=460-540px)
[               ]
[    SUBLINE    ]   ← 40px below headline baseline
[               ]
[               ]
[               ]
[  CAPY SILH.  ]   ← Bottom-right corner: x=1720px, y=920px (anchored bottom-right)
[  80px margin  ]
```

### Headline Text
```
TheEngOrg
```
`[TITLE]` Inter 700, 72px, #E8E8E8. Center-aligned. Single line.

### Subline Text
```
The AI Engineering Organization.
```
`[MONO-SM]` JetBrains Mono 400, 22px, #8A9BB0. Center-aligned. 40px below headline.

### Below Subline (40px gap)
```
$3M Seed  |  March 2026
```
`[MONO-SM]` JetBrains Mono 400, 16px, #8A9BB0. Center-aligned. Pipe character in [SUB] #8A9BB0.

### Visual Elements

**TheEngOrg Logo:** Centered, y=120px from top. Use existing brand mark. Max height: 60px. If logo is horizontal, constrain to 320px max width.

**Capybara silhouette:** Pixel-art style, seated meditation pose (cross-legged, upright). Positioned bottom-right, anchored to corner: bottom edge at y=1000px, right edge at x=1840px. Size: 96x96px. Opacity: 15%. Color: #E8E8E8 tinted (the pixel art inherits from foreground). No border, no label.

### Color Usage
- Background: [BG] #171E28
- All text: [TEXT] #E8E8E8 and [SUB] #8A9BB0
- No accent colors on this slide. Restraint is the message.

### Speaker Notes
"Thank you for your time. I am [name], founder of TheEngOrg. Over the next 12 minutes, I am going to show you the most capital-efficient AI investment opportunity in the market right now. Then I am going to show you a live demo. Then we will talk about how you make money."

[Pause. Let the room settle.]

"Let me start with a problem you already know about."

---

## SLIDE 02 — The Problem: Coordination Crisis

### Layout
**Type:** Title + Body (left 58%) / Visual diagram (right 42%)
**Background:** [BG] #171E28

### Left Panel (columns 1-7, 80px–1030px)

**Title text:**
```
Every AI initiative in your portfolio
is about to hit the same wall.
```
`[TITLE]` Inter 700, 44px, #E8E8E8. Left-aligned. Max 620px wide. Line height 1.2. Y: 120px from top.

**Separator line:** 1px, [RED] #C94D3A, width 48px. 24px below title baseline.

**Pain point cards:** Three cards, stacked vertically. 24px gap between cards. Start y: 220px.

Card style: [SURFACE] #1E2A38 background. 4px left-edge border in [RED] #C94D3A. Border-radius: 6px. Padding: 20px 24px. Width: 580px.

Card 1 (quote):
```
"We need better planning... a better way of doing
 maintenance work, refactoring, updates."
 — Michael Parker, VP Eng, TurinTech
 (Stack Overflow, Jan 2026) [FPO]
```
`[BODY]` Inter 400, 18px. Quote in #E8E8E8. Attribution in [SUB] #8A9BB0, 14px. Italic for quote marks only.

Card 2 (bullets):
```
● Agents contradict each other across workstreams
● Quality gates get skipped under deadline pressure
● Scope drift cascades — one bad decision poisons
  three downstream features
```
`[BODY]` Inter 400, 18px. Bullet character in [RED] #C94D3A. Text in #E8E8E8. Line height 1.6.

Card 3 (the consequence):
```
The founder becomes the single point of
coordination failure.
```
`[BODY]` Inter 400, 18px, #E8E8E8. No bullet. Understated — this is the emotional gut-punch.

### Right Panel (columns 8-12, 1056px–1840px)

**Diagram: Tangle Network**
Canvas area: 784px wide x 640px tall. Centered vertically in panel.

Nodes: 6 circles, ~56px diameter each. Fill: [SURFACE] #1E2A38. Border: 1px solid [SUB] #8A9BB0.
Labels inside nodes: [MONO-SM] JetBrains Mono 400, 11px, [SUB] #8A9BB0. Labels: "Dev", "QA", "Arch", "PM", "API", "Deploy".

Connection lines: 8-10 crossing lines between nodes. Color: [RED] #C94D3A, 1.5px stroke, 60% opacity. Lines cross each other deliberately — the chaos IS the design. Some lines break mid-path (dash gap: 4px on, 4px off).

Two or three lines highlighted at full opacity [RED] to indicate the "broken" connections.

**The bird:** Pixel-art teal bird (small, ~32px). Positioned inside the tangle, between overlapping nodes. Use teal #2E8B8B for the bird silhouette. Opacity: 100%. The bird looks overwhelmed — this is achieved through positioning (trapped, surrounded), not expression (pixel art is minimal).

### Color Usage
- Left panel: [RED] cards, [TEXT] body
- Right panel: [RED] tangle lines, [TEAL] bird
- No green, no amber on this slide — this is a problem slide

### Speaker Notes
"Your portfolio companies are adopting AI coding tools. Every single one. And here is what is happening: individual developers get faster, but the team gets slower. Why? Because AI copilots help you write code. Nobody is helping you coordinate the team. The AI is producing code at 10x speed with zero coordination — so you ship 10x the bugs, 10x the conflicts, 10x the rework. This is the problem everyone is about to hit."

[Transition] "And the cost of this chaos is not abstract."

---

## SLIDE 03 — The Cost: What Uncoordinated AI Costs

### Layout
**Type:** Metric wall — 3 large numbers, one statement line
**Background:** [BG] #171E28

### Title (top)
```
The cost of uncoordinated intelligence.
```
`[TITLE]` Inter 700, 44px, #E8E8E8. Centered. Y: 120px.

### Metric Wall

Three columns, equal width (~520px each). Horizontal center of canvas. Y position: 280px for number baseline.

**Column 1:**
```
$5M/yr
```
`[MONO-LG]` JetBrains Mono 700, 80px, [RED] #C94D3A.

```
average engineering team
headcount cost (10 engineers)
```
`[CAPTION]` Inter 400, 16px, [SUB] #8A9BB0. Center-aligned under number. 16px gap from number baseline.

**Column 2:**
```
73%
```
`[MONO-LG]` JetBrains Mono 700, 80px, [RED] #C94D3A.

```
of AI agent projects
fail to ship
```
`[CAPTION]` Inter 400, 16px, [SUB] #8A9BB0. Center-aligned.

**Column 3:**
```
4.2x
```
`[MONO-LG]` JetBrains Mono 700, 80px, [RED] #C94D3A.

```
longer to fix than to build
(uncoordinated AI teams)
```
`[CAPTION]` Inter 400, 16px, [SUB] #8A9BB0. Center-aligned.

**Vertical dividers between columns:** 1px, [SUB] #8A9BB0, 30% opacity. Height: 160px. Vertically centered with the metric block.

### Statement Line

Y: 660px (240px below metric block).
Full-width. Center-aligned.

```
The problem is not the AI. The problem is the org chart.
```
`[BODY]` Inter 400, 26px, [TEXT] #E8E8E8. Center-aligned. This line should feel like a reveal — give it breathing room above and below.

Optional subtle separator: 40px horizontal rule above this line, 1px, [SUB] #8A9BB0, 40% opacity, centered, 120px wide.

### Bird Element
Small pixel-art teal bird, bottom-left margin. x: 100px, y: 920px (bottom-left). Size: 28px. Opacity: 70%. Same bird as slide 02, still alone.

### Color Usage
- Numbers: [RED] #C94D3A
- Labels: [SUB] #8A9BB0
- Statement line: [TEXT] #E8E8E8
- No capybara on this slide

### Speaker Notes
"A 10-person engineering team costs five million dollars a year. The promise of AI dev tools is to replace some of that headcount. But 73% of AI agent projects fail to ship — not because the models are bad, but because nobody is coordinating the output. The debugging takes four times longer than the building because agents contradict each other and nobody catches the drift until three workstreams are polluted. The problem is not the AI. The problem is that nobody gave the AI an org chart."

[Pause.] "We did."

---

## SLIDE 04 — The Insight: AI Needs an Org Chart

### Layout
**Type:** Left panel (spectrum / reframe) / Right panel (org chart diagram)
**Split:** 45% left / 55% right
**Background:** [BG] #171E28

### Title (spans full width, top)
```
AI copilots help developers write code.
We replaced the org chart.
```
`[TITLE]` Inter 700, 44px, #E8E8E8. Left-aligned. Max width: 900px. Y: 80px.

### Left Panel (columns 1-5, 80px–840px)

**Spectrum table:** Y: 200px. Three rows.

Row style: [SURFACE] #1E2A38 background. 8px border-radius. Padding: 16px 20px. Width: 680px. 8px gap between rows.

Row 1:
```
Copilot        →   "Write this function"
```
Left cell: [MONO-SM] JetBrains Mono 400, 18px, [SUB] #8A9BB0.
Right cell: [BODY] Inter 400, 18px, #E8E8E8.
Bottom label: `Autocomplete` — [CAPTION] 14px, [SUB] #8A9BB0.

Row 2:
```
AI Agent       →   "Do this task"
```
Same styling.
Bottom label: `Task execution`

Row 3 — highlighted:
```
AI Eng Org     →   "Ship this feature — correctly"
```
Border: 1px solid [GREEN] #4A7C59. Background: slight tint (#1E2A38 + green overlay at 8%).
Left cell: [MONO-SM] 18px, [GREEN] #4A7C59 (this is TheEngOrg's row).
Right cell: [BODY] 18px, #E8E8E8.
Bottom label: `Organizational intelligence` — [CAPTION] 14px, [GREEN] #4A7C59.

**Separator line:** 1px, [SUB] #8A9BB0, 30% opacity. Full row width. Between rows 2 and 3 for emphasis.

**Callout below table (y: 560px):**
```
"24 agents. One org chart.
 Zero humans required to coordinate."
```
`[MONO-SM]` JetBrains Mono 400, 16px, [SUB] #8A9BB0. Left-aligned. 20px left padding. Left-border: 2px solid [TEAL] #2E8B8B.

### Right Panel — Org Chart Diagram (columns 6-12, 864px–1840px)

**Canvas area:** 976px x 720px, centered vertically in panel.

**Node specifications:**
- Standard node: Rounded rect, 160px x 44px. Fill: [SURFACE] #1E2A38. Border: 1px solid agent color. 4px left-accent bar in agent color. Border-radius: 6px.
- Label: [MONO-SM] JetBrains Mono 400, 14px, in agent color.

**SAGE NODE (apex):**
Size: 200px x 56px. Fill: [SURFACE] #1E2A38.
Border: 1.5px solid [GOLD] #D4A84B.
Left-accent: 6px, [GOLD] #D4A84B.
Box shadow: 0 0 12px #D4A84B at 35% opacity (the amber glow).
Label: "SAGE" — [MONO-SM] JetBrains Mono 700, 18px, [GOLD] #D4A84B.
Sublabel: "orchestrator" — [CAPTION] Inter 400, 12px, [SUB] #8A9BB0.

**Below SAGE — small capybara pixel-art icon:** 20px, [GOLD] #D4A84B, positioned to the right of the SAGE label inside the node. This is the capybara's first meaningful appearance in the diagram — the Sage node IS the capybara.

**C-SUITE TIER (3 nodes, horizontal row):**
Y: 220px below Sage node. Gap: 24px between nodes.

| Node | Label | Color |
|------|-------|-------|
| CEO | "CEO" | #8A9BB0 |
| CTO | "CTO" | #2E6E8E |
| CFO | "CFO" | #D4A84B |

**DIRECTORS TIER (4 nodes, horizontal row):**
Y: 150px below C-Suite. Nodes under CEO+CTO respectively.

| Node | Label | Color |
|------|-------|-------|
| EM | "Eng Mgr" | #4A7C59 |
| QA Lead | "QA" | #7A5C8B |
| Sec Eng | "Security" | #3D5A6B |
| DevOps | "DevOps" | #3D5A6B |

**SPECIALISTS TIER (3 nodes, horizontal, below EM):**
Y: 140px below Directors.

| Node | Label | Color |
|------|-------|-------|
| Dev | "Dev" | #4A7C59 |
| Dev | "Dev" | #4A7C59 |
| API | "API" | #3D5A6B |

**Connectors:** 1px, #3A4A3A. Vertical lines only. No diagonals. Clean 90-degree routing.

**Tier labels (left of each tier, in [MONO-SM] [SUB] #8A9BB0, 11px):**
- "Orchestrator" — left of Sage tier, 10px gap
- "C-Suite" — left of C-Suite row
- "Directors" — left of Directors row
- "Specialists" — left of Specialists row

Horizontal dotted separator lines between tiers: 1px, [SUB] #8A9BB0, 30% opacity, dashed (4px on / 4px off). Span full diagram width.

### Color Usage
- Org chart nodes: agent-specific colors per system
- Sage: [GOLD] with glow
- Background: [BG]
- No [RED] on this slide — the problem framing is over

### Speaker Notes
"Here is the insight. Everyone in this market is building smarter AI — better models, better prompts, better autocomplete. We are not doing that. We built the ORG CHART. TheEngOrg is a complete AI engineering organization — 24 specialized agents with a CEO that sets vision, a CTO that architects, engineers that build, QA that validates, and security that reviews. At the top sits the Sage — it never writes code. It watches, it coordinates, and it makes sure nothing ships that should not. Think of it this way: Anthropic builds the engine. We built the car."

[Transition] "Let me show you what this looks like in practice."

---

## SLIDE 05 — The Product: Terminal-Native, Zero Infrastructure

### Layout
**Type:** Full-bleed terminal screenshot with bottom callout bar
**Background:** #0D1117 (GitHub-dark terminal background — slightly different from slide BG to signal real product)

### Title Bar (above terminal)
Thin bar at top. Height: 56px. Background: [BG] #171E28.
```
Terminal-native. Zero infrastructure.
```
`[TITLE]` Inter 700, 36px, #E8E8E8. Left-aligned, 80px left margin. Vertically centered in bar.

**Subtle capybara watermark:** Bottom-right corner of the terminal area. x: 1820px, y: 1000px. Pixel-art silhouette, 72px, [TEXT] #E8E8E8, 10% opacity. Seated pose.

### Terminal Area
**Dimensions:** Full width (0-1920px), height: 820px (from y=56px to y=876px).
**Background:** #0D1117
**Font:** JetBrains Mono 400, 14px, standard terminal rendering.

**Terminal content to display (real screenshot from pilot run, not mockup):**

This is the spec for the real screenshot. Request from engineering-director: a full `/mg-build` run with Sage active, showing:

```
[sage] Analyzing workstream: feature/auth-token-refresh
[sage] Scope classification: ARCHITECTURAL
[sage] Spawning C-Suite for architectural review...

[ceo] Reviewing business alignment...
[ceo] Feature aligns with Q1 roadmap. Priority: HIGH.
[ceo] Delegating to CTO for architecture review.

[cto] Architecture review: auth-token-refresh
[cto] Scope impact: touches auth layer + session management.
[cto] DRIFT DETECTED: proposed implementation conflicts with
       session-management spec (approved 2026-03-15).
[cto] Recovery plan: align with existing session interface.
       Estimated: 2 hours additional design work.

[sage] Drift flagged. Pausing implementation pending CTO sign-off.
[sage] Spawning: dev, qa, security for parallel spec review.

[dev] Reading approved architecture...
[qa] Generating misuse-first test cases...
[security] Auth surface review: token rotation edge cases...

[sage] All gates passed. Resuming implementation.
[dev] Implementing: token refresh with session alignment.
[dev] Tests: 14 passing, 0 failing.

[sage] PR created: feature/auth-token-refresh
       Tests: ✓  Security: ✓  Spec compliance: ✓
       Assigned: engineering-director for final review.
```

Color scheme for terminal output:
- Agent prefix `[sage]`: [GOLD] #D4A84B
- Agent prefix `[cto]`, `[ceo]`, `[dev]`, `[qa]`, `[security]`: [TEAL] #2E8B8B
- "DRIFT DETECTED": [RED] #C94D3A, bold
- "Recovery plan": [AMBER] #F9A825
- Checkmarks and pass states: [GREEN] #4A7C59
- Standard output text: #C9D1D9 (GitHub dark terminal default)
- Comments/labels: [SUB] #8A9BB0

### Bottom Callout Bar
**Dimensions:** Full width, height: 104px (y=876px to y=980px).
**Background:** [SURFACE] #1E2A38 with 1px top border in [TEAL] #2E8B8B at 40% opacity.
**Layout:** 4 items, equal width (~440px each), vertically centered, separated by 1px [SUB] lines.

Item 1:
```
$5K/mo
API cost
```
Number: [MONO-LG] JetBrains Mono 700, 32px, [AMBER] #F9A825.
Label: [CAPTION] Inter 400, 14px, [SUB] #8A9BB0.

Item 2:
```
24-agent
team
```
Number: [MONO-LG] 32px, [AMBER] #F9A825.
Label: [CAPTION] 14px, [SUB] #8A9BB0.

Item 3:
```
Zero
servers
```
Number: [MONO-LG] 32px, [AMBER] #F9A825.
Label: [CAPTION] 14px, [SUB] #8A9BB0.

Item 4:
```
95%+
gross margin
```
Number: [MONO-LG] 32px, [AMBER] #F9A825.
Label: [CAPTION] 14px, [SUB] #8A9BB0.

**Arrow connectors between items:** [TEAL] #2E8B8B, single-pixel arrow →. Centered between each pair of items.

### Speaker Notes
"This is what it looks like. A terminal. The customer types one command. The Sage reads the ticket, decides which agents to spawn, and the team executes. The customer's developers see PRs appear with tests, documentation, and security reviews attached. The customer pays Anthropic directly for the API tokens — we have zero infrastructure cost. Our gross margin is 95% on the license fee. No GPU bill. No servers. No CDN. Let me show you this live."

[Transition] Founder switches to live terminal. "I am going to create a feature request and let the Sage handle it. Watch how it selects agents."

---

## SLIDE 06 — DEMO INTERLUDE

### Layout
**Type:** Transition / context frame — displayed for ~10 seconds, then terminal takes over
**Background:** [BG] #171E28

### Content

Center of canvas:
```
LIVE DEMO
```
`[MONO-LG]` JetBrains Mono 700, 72px, [AMBER] #F9A825. Center-aligned.

Below (24px gap):
```
Sage catching scope drift — live.
```
`[MONO-SM]` JetBrains Mono 400, 22px, [SUB] #8A9BB0. Center-aligned.

Below (40px gap):
```
Watch the agent selection.
Watch the drift flag.
Watch the recovery plan.
```
`[BODY]` Inter 400, 20px, #E8E8E8. Center-aligned. Line height 2.0. These are "watch for" callouts to prime the VC.

### Capybara Element
Center-bottom of slide. x: 960px (center), y: 820px. Pixel-art capybara, 80px. Opacity: 40%. Color: [GOLD] #D4A84B. This is a hint — the Sage is about to work.

### Speaker Notes
[No scripted notes — the founder is transitioning to the terminal.]

If demo is pre-recorded due to connectivity concerns: replace "LIVE DEMO" with "DEMO" and play the recording in full screen. Do not use this transition slide as a crutch; it is designed for a live session.

---

## SLIDE 07 — The Moat: Constitution-Driven AI

### Layout
**Type:** Comparison split (left) / Layered defense (right)
**Split:** 50% / 50%
**Background:** [BG] #171E28

### Title (full width, top)
```
Constitution-driven AI: the moat that compounds.
```
`[TITLE]` Inter 700, 44px, #E8E8E8. Left-aligned. Y: 80px.

### Left Panel — The Benchmark (columns 1-6, 80px–952px)

**Section label:** Y: 160px.
```
BENCHMARK EVIDENCE
```
`[MONO-SM]` JetBrains Mono 400, 13px, [SUB] #8A9BB0. Letter-spacing: 2px (all-caps spaced). Left-aligned.

**Benchmark comparison — two rows:**
Y: 200px. Rows stacked, 16px gap.

Row A (problem row):
Card: [SURFACE] #1E2A38 background. 4px left-border [RED] #C94D3A. Padding: 20px 24px. Border-radius: 6px. Width: 800px.

```
Config A
Weak constitutions + Opus (best model)
```
Left: [MONO-SM] 14px, [RED] #C94D3A. "Config A" label.
Right: Score badge.

Score badge: Small pill. Background: rgba(201, 77, 58, 0.15). Border: 1px solid [RED]. Text: "0.957" — [MONO-SM] JetBrains Mono 700, 18px, [RED] #C94D3A. Float right.

Description text below: `[CAPTION]` Inter 400, 14px, [SUB]. "Weak constitutions, best model."

Row C (solution row):
Card: [SURFACE] #1E2A38 background. 4px left-border [GREEN] #4A7C59. Padding: 20px 24px. Border-radius: 6px. Width: 800px.

```
Config C
Strong constitutions + Sonnet (60% less cost)
```
Score badge: Background: rgba(74, 124, 89, 0.15). Border: 1px solid [GREEN]. Text: "1.000" — [MONO-SM] JetBrains Mono 700, 18px, [GREEN] #4A7C59.

**Callout below the two rows (y: 440px):**
```
Constitution quality > Model quality.
```
`[BODY]` Inter 400, 22px, #E8E8E8. Left-aligned. 2px left-border [TEAL] #2E8B8B. Padding-left: 16px.

Below (8px gap):
```
Our constitutions outperform the best model
on a cheaper model.
```
`[CAPTION]` Inter 400, 16px, [SUB] #8A9BB0.

**CTO callout badge (y: 560px):**
Pill badge. Background: [SURFACE]. Border: 1px solid [GOLD] #D4A84B.
```
CTO agent: 5.00/5.00 across all 4 model configs.
The only model-invariant agent.
```
`[MONO-SM]` JetBrains Mono 400, 14px, [GOLD] #D4A84B.

### Right Panel — The Defense Layers (columns 7-12, 976px–1840px)

**Section label:** Y: 160px.
```
THE MOAT STRUCTURE
```
`[MONO-SM]` JetBrains Mono 400, 13px, [SUB] #8A9BB0. Letter-spacing: 2px.

**Three layers, stacked vertically.** Y: 200px. 16px gap between layers.

Layer 1 card: Width: 800px. Padding: 20px 24px. Border-radius: 6px. Background: [SURFACE]. Left-border: 4px, [TEAL] #2E8B8B.

```
Layer 1 — Open-Source Community (23 agents)
```
`[MONO-SM]` JetBrains Mono 400, 14px, [TEAL] #2E8B8B.

```
→ Distribution engine. Developers find us.
→ Zero marketing cost. 100% organic pipeline.
```
`[CAPTION]` Inter 400, 14px, [SUB] #8A9BB0. Line height 1.8.

Layer 2 card: Left-border: 4px, [GOLD] #D4A84B.

```
Layer 2 — Enterprise Sage (closed source)
```
`[MONO-SM]` JetBrains Mono 400, 14px, [GOLD] #D4A84B.

```
→ Orchestration, drift detection, session mgmt.
→ 11/11 on enterprise benchmarks.
→ $42K/yr per customer.
```
`[CAPTION]` Inter 400, 14px, [SUB] #8A9BB0.

Layer 3 card: Left-border: 4px, [GREEN] #4A7C59.

```
Layer 3 — Constitution R&D Flywheel
```
`[MONO-SM]` JetBrains Mono 400, 14px, [GREEN] #4A7C59.

```
→ Enterprise usage improves constitutions.
→ Better constitutions improve community.
→ Community growth feeds enterprise pipeline.
```
`[CAPTION]` Inter 400, 14px, [SUB] #8A9BB0.

**Small flywheel arrow:** Between Layer 3 and Layer 1, a circular arrow (↺) indicating the self-reinforcing loop. [TEAL] #2E8B8B. 24px. Y: 590px, X: 1400px (right panel center).

### Subtle Capybara
Watermark. Bottom-right. x: 1820px, y: 980px. 72px. 10% opacity. [TEXT] #E8E8E8.

### Speaker Notes
"Every VC I talk to asks the same question: what stops someone from copying your prompts? Three things. First — our constitutions are not prompts. They are engineering artifacts. We ran systematic benchmarks across four model configurations. Strong constitutions on a cheaper model beat weak constitutions on the best model available. That gap — 0.957 to 1.000 — is the difference between a copilot and an engineering organization. Second — the 24 agents are not independent. They form an organization with delegation chains, handoff protocols, and scope boundaries. Copying one prompt is trivial. Replicating 24 agents that coordinate coherently is six months of systematic engineering. Third — the Sage is not open source. It is the enterprise moat. Everything else is free. The orchestration layer is what makes the team 10x more effective, and that is what customers pay for."

[Transition] "So the product works and the moat is real. Now: is the market big enough for you to care?"

---

## SLIDE 08 — The Market: Where the Money Is

### Layout
**Type:** Title + concentric TAM/SAM/SOM diagram (left) / competitive positioning list (right)
**Split:** 55% left / 45% right
**Background:** [BG] #171E28

### Title (full width, top)
```
The AI dev tools market is forming now.
The org layer does not exist yet.
```
`[TITLE]` Inter 700, 44px, #E8E8E8. Left-aligned. Max width: 1200px. Y: 80px.

### Left Panel — TAM/SAM/SOM Diagram (columns 1-7, 80px–1050px)

**Nested rectangle diagram** (not circles — rectangles feel more precise/technical).

Outer rectangle (TAM):
Width: 860px. Height: 500px. Y: 180px. X: 80px.
Border: 1.5px, [TEAL] #2E8B8B at 30% opacity. Background: rgba(46, 139, 139, 0.05). Border-radius: 12px.

Label (top-left inside, with 16px padding):
```
TAM — Global Software Engineering Spend
```
`[MONO-SM]` JetBrains Mono 400, 13px, [TEAL] #2E8B8B.

Number (top-right inside):
```
$800B+
```
`[MONO-LG]` JetBrains Mono 700, 36px, [TEAL] #2E8B8B. Right-aligned.

Middle rectangle (SAM):
Width: 620px. Height: 300px. Centered within TAM rect.
Border: 1.5px, [TEAL] #2E8B8B at 60% opacity. Background: rgba(46, 139, 139, 0.10). Border-radius: 8px.

Label:
```
SAM — AI-Augmented Engineering Tools
```
`[MONO-SM]` 13px, [TEAL] #2E8B8B at 80%.

Number:
```
$50–100B by 2028
```
`[MONO-LG]` 28px, [TEAL] #2E8B8B.

Inner rectangle (SOM):
Width: 340px. Height: 140px. Centered within SAM rect.
Border: 1.5px, [AMBER] #F9A825. Background: rgba(249, 168, 37, 0.10). Border-radius: 6px.

Label:
```
SOM — AI Engineering Coordination
```
`[MONO-SM]` 13px, [AMBER] #F9A825.

Number:
```
$1–5B near-term
```
`[MONO-LG]` 22px, [AMBER] #F9A825.

**Entry callout (below SOM rect, inside SAM area):**
```
Entry: Mid-market teams (5-50 devs) on Claude Code
```
`[CAPTION]` Inter 400, 12px, [SUB] #8A9BB0. Center-aligned.

### Right Panel — Competitive Positioning (columns 8-12, 1074px–1840px)

**Section label:**
```
WHERE WE SIT IN THE STACK
```
`[MONO-SM]` JetBrains Mono 400, 13px, [SUB] #8A9BB0. Letter-spacing: 2px. Y: 160px.

**Four rows, stacked vertically:** Y: 200px. 12px gap between rows. Width: 700px.

Row 1:
Card: [SURFACE] #1E2A38. Left-border: 4px, [SUB] #8A9BB0. Padding: 14px 20px. Border-radius: 6px.
```
Copilots (Cursor, Copilot)
```
`[MONO-SM]` 14px, [SUB] #8A9BB0.
```
→ Individual developer
```
`[CAPTION]` 13px, [SUB] #8A9BB0.

Row 2:
Same styling. Left-border: [TEAL] at 40%.
```
AI Agents (Devin)
```
```
→ Single task executor
```

Row 3:
Left-border: [TEAL] at 70%.
```
AI Dev Teams (Factory)
```
```
→ Execution pipeline
```

Row 4 — TheEngOrg row:
Card: Left-border: 4px [AMBER] #F9A825. Background: rgba(249, 168, 37, 0.08).
```
AI Engineering Org (TheEngOrg)
```
`[MONO-SM]` 14px, [AMBER] #F9A825.
```
→ Full organizational intelligence
```
`[BODY]` 14px, #E8E8E8.

Small badge top-right of this card:
```
NEW CATEGORY
```
`[CAPTION]` JetBrains Mono 400, 10px, [AMBER] #F9A825. Background: rgba(249, 168, 37, 0.15). Border: 1px solid [AMBER] #F9A825. Border-radius: 4px. Padding: 2px 8px.

### Color Usage
- TAM/SAM: Progressively brighter [TEAL]
- SOM: [AMBER] to highlight the beachhead
- TheEngOrg row: [AMBER] emphasis
- Other competitors: [SUB] dimmed to avoid over-emphasizing them

### Speaker Notes
"The global software development market is $800 billion and growing. AI dev tools are projected to be a $50-100 billion segment by 2028. But here is the important distinction: that entire market is focused on individual developer productivity — copilots, code completion, single-agent task execution. Nobody is building the organizational layer. Cursor helps one developer write code faster. Devin completes one task autonomously. We run the entire engineering organization — the CEO sets direction, the CTO architects, engineers build, QA validates, and the Sage makes sure it all holds together. This is a new category. We are not competing with Cursor. We are building the layer that sits above every tool in this stack."

[Transition] "And here is how we turn that into revenue."

---

## SLIDE 09 — The Business Model: Open-Core Economics

### Layout
**Type:** Two-panel — Open-core funnel (left) / Unit economics metric wall (right)
**Split:** 52% left / 48% right
**Background:** [BG] #171E28

### Title (full width, top)
```
Open-source distribution. Enterprise monetization.
Zero infrastructure cost.
```
`[TITLE]` Inter 700, 40px, #E8E8E8. Left-aligned. Max width: 1100px. Y: 80px.

### Left Panel — Open-Core Funnel (columns 1-6, 80px–952px)

**Three tier blocks, stacked with conversion arrows between them.**

Tier 1 block:
Y: 180px. Width: 800px. Padding: 24px 28px. Border-radius: 8px.
Background: rgba(74, 124, 89, 0.12). Border: 1px solid [GREEN] #4A7C59.

```
Community (free)
```
`[MONO-SM]` JetBrains Mono 700, 18px, [GREEN] #4A7C59.

```
23 agents  ·  16 skills  ·  full workflow
Developers find it, adopt it, depend on it.
```
`[BODY]` Inter 400, 16px, [SUB] #8A9BB0. Line height 1.6.

Conversion arrow (between Tier 1 and Tier 2):
```
↓  2-5% annual conversion
```
`[MONO-SM]` JetBrains Mono 400, 14px, [SUB] #8A9BB0. Center-aligned. Y: 80px gap. Left-padding: 80px.

Tier 2 block:
Background: rgba(212, 168, 75, 0.12). Border: 1px solid [GOLD] #D4A84B.

```
Enterprise  ·  $3,500/mo avg
```
`[MONO-SM]` JetBrains Mono 700, 18px, [GOLD] #D4A84B.

```
+ Sage orchestrator  ·  + Drift detection
+ Session management  ·  + Priority support
```
`[BODY]` 16px, [SUB] #8A9BB0.

Conversion arrow:
```
↓  tier expansion
```
`[MONO-SM]` 14px, [SUB] #8A9BB0. Center-aligned.

Tier 3 block:
Background: rgba(249, 168, 37, 0.08). Border: 1px solid [AMBER] #F9A825.

```
Strategic  ·  $12,000/mo avg
```
`[MONO-SM]` JetBrains Mono 700, 18px, [AMBER] #F9A825.

```
+ Custom constitutions  ·  + Dedicated onboarding
+ SLA guarantees
```
`[BODY]` 16px, [SUB] #8A9BB0.

### Right Panel — Unit Economics (columns 7-12, 976px–1840px)

**Section label:**
```
UNIT ECONOMICS
```
`[MONO-SM]` 13px, [SUB] #8A9BB0. Letter-spacing: 2px. Y: 160px.

**Six metric rows, stacked vertically.** Y: 200px. 4px gap between rows.

Row style: No card background — just two columns: left (metric label) / right (metric value). Width: 800px.

| Label | Value | Color |
|-------|-------|-------|
| CAC | $1,200 | [AMBER] |
| LTV (Enterprise) | $79,800 | [AMBER] |
| LTV:CAC | 66x | [AMBER] — largest, 48px |
| Gross Margin | 95%+ | [GREEN] |
| Payback Period | <1 month | [GREEN] |
| Customer ROI | 16x annual | [GREEN] |

Label style: `[MONO-SM]` JetBrains Mono 400, 16px, [SUB] #8A9BB0. Right-aligned in left column.
Value style: `[MONO-LG]` JetBrains Mono 700. Right column.

**LTV:CAC row is the hero number:**
Value: JetBrains Mono 700, 56px, [AMBER] #F9A825.
1px separator above and below this row in [SUB] at 20% opacity.

**Divider between metric groups (after Payback):** 1px, [SUB] at 20% opacity.

**Bottom callout (y: 680px):**
```
HashiCorp  ·  Grafana  ·  Posthog
ran this model to $1B+
```
`[CAPTION]` Inter 400, 14px, [SUB] #8A9BB0. Center-aligned. These are the comparable exit comps.

### Color Usage
- Community tier: [GREEN]
- Enterprise tier: [GOLD]
- Strategic tier: [AMBER]
- Key metrics: [AMBER] and [GREEN]

### Speaker Notes
"The business model is open-core — the same model that built HashiCorp, Grafana, and Posthog into billion-dollar companies. The community edition is genuinely good — 23 agents, full workflow, completely free. Developers find it through GitHub, use it in their projects, and then advocate for enterprise adoption at their companies. The unit economics: our customer acquisition cost is twelve hundred dollars because the product acquires itself. The lifetime value is eighty thousand dollars per Enterprise customer. That is a 66x LTV:CAC ratio. Gross margin is 95% or higher because we have no infrastructure cost — the customer pays Anthropic directly for their API tokens. We sell the organizational intelligence. They bring the compute."

[Transition] "And here is what that turns into over 36 months."

---

## SLIDE 10 — The Numbers: Financial Model

### Layout
**Type:** Two-panel — Revenue curve (left) / Cash position (right)
**Split:** 50% / 50%
**Background:** [BG] #171E28

### Title (full width, top)
```
Cash-flow positive at Month 5.
$3M buys 36 months because there is no server bill.
```
`[TITLE]` Inter 700, 40px, #E8E8E8. Left-aligned. Y: 80px.

### Left Panel — Revenue Trajectory (columns 1-6, 80px–952px)

**Section label:** Y: 175px.
```
ARR TRAJECTORY — 36 MONTHS
```
`[MONO-SM]` 13px, [SUB] #8A9BB0. Letter-spacing: 2px.

**Line chart spec:**
Canvas: 820px x 420px. Y: 210px. Axes: no visible grid lines. Minimal — axis labels only.

Y-axis: $0 to $15M. Labels at $0, $5M, $10M, $15M. `[CAPTION]` 12px, [SUB] #8A9BB0. Right-aligned to axis.
X-axis: Month 0 to Month 36. Labels at M0, M12, M24, M36. `[CAPTION]` 12px, [SUB] #8A9BB0.

**Three lines:**

Base case line: 2px stroke, [GREEN] #4A7C59. Solid.
Data points: M12=$1.31M, M24=$3.74M, M36=$7.08M.

Expected case line: 2px stroke, [AMBER] #F9A825. Solid.
Data points: M12=$2.39M, M24=$7.72M, M36=$12M.

Label directly on each line at M36 terminus (not legend):
```
Expected  $12M+
Base      $7.1M
```
`[CAPTION]` 12px in respective line color. Right-aligned, 8px gap from terminus.

**Inflection point markers:**
Small filled circle (6px diameter) on both lines at M12 and M24. Same color as line.

**Key callout label on x-axis at M5:**
Small vertical dotted line from axis up to base case line. Label below x-axis:
```
Cash-flow +
```
`[CAPTION]` 11px, [GREEN] #4A7C59.

**ARR callout boxes** (3 cards, horizontal, below chart):

Three equal cards. Width: 240px each. Background: [SURFACE] #1E2A38. Border-radius: 6px. Padding: 12px 16px.

Card 1: "Y1 ARR" / "$1.3M base · $2.4M expected" / [GREEN] + [AMBER]
Card 2: "Y2 ARR" / "$3.7M base · $7.7M expected"
Card 3: "Y3 ARR" / "$7.1M base · $12M+ expected"

`[MONO-SM]` 13px for labels. `[BODY]` 16px for values.

### Right Panel — Cash Position (columns 7-12, 976px–1840px)

**Section label:** Y: 175px.
```
CASH BALANCE — BASE SCENARIO
```
`[MONO-SM]` 13px, [SUB] #8A9BB0. Letter-spacing: 2px.

**Line chart spec:**
Canvas: 820px x 420px. Y: 210px.

Y-axis: $2.8M to $5.5M. Labels at $3M, $3.5M, $4M, $4.5M, $5M. `[CAPTION]` 12px, [SUB] #8A9BB0.
X-axis: M0, M6, M12, M18, M24.

**Single line:** 2px stroke, [AMBER] #F9A825. Solid.

Data points (from financial model):
- M0: $3.00M
- M5: $2.94M (dips slightly — this is the low point)
- M6: $2.95M
- M12: $3.19M
- M18: $3.77M
- M24: $4.86M

**Reference line at $3.0M (the raise amount):** 1px, [SUB] #8A9BB0, 40% opacity, dashed. Horizontal across full chart. Label: "Raise amount" in [CAPTION] 11px, [SUB] #8A9BB0.

**Key labeled points on the cash line:**
- M0: "$3.0M" label above point
- M5 (low point): small downward triangle marker. Label: "M5: $2.94M" below point in [CAPTION] [SUB].
- M12: "$3.2M — above raise" in [GREEN] #4A7C59 label above point.
- M24: "$4.9M" in [AMBER] above point.

**Bottom callout (below chart, full-width of right panel):**
Box: [SURFACE] #1E2A38. Border: 1px, [GREEN] #4A7C59. Border-radius: 8px. Padding: 16px 24px.

```
"The Series A is optional, not survival-driven."
```
`[BODY]` Inter 400, 18px, #E8E8E8. Center-aligned inside box.

### Color Usage
- Revenue lines: [GREEN] base, [AMBER] expected
- Cash line: [AMBER]
- Reference line: [SUB] dashed
- Callout box: [GREEN] border

### Speaker Notes
"Here are the financials. Base case: $1.3 million ARR in year one, $3.7 million in year two, $7 million by year three. Expected case is roughly double that. But here is the number I want you to look at. The cash position. We raise three million dollars. By month five, the company is cash-flow positive. By month twelve, the cash balance is ABOVE where we started. By month twenty-four, we are sitting on $4.9 million in cash. The three million does not fund 36 months of deficit — it funds the ramp to profitability and then sits there as a war chest. The Series A at Month 24 is from a position of strength — not because we need the money, but because we want to accelerate."

[Transition] "Now let me show you who has already validated this."

---

## SLIDE 11 — Traction: Proof It Works

### Layout
**Type:** Three-column metric grouping + timeline bar
**Background:** [BG] #171E28

### Title (full width, top)
```
Two pilots live. Sage scores 1.000. The signal is real.
```
`[TITLE]` Inter 700, 44px, #E8E8E8. Left-aligned. Y: 80px.

### Three-Column Metrics Section

Y: 180px. Three equal columns, 560px each. Separated by 1px vertical lines in [SUB] #8A9BB0 at 20% opacity.

**Column 1 — PRODUCT:**

Column header:
```
PRODUCT
```
`[MONO-SM]` JetBrains Mono 400, 13px, [TEAL] #2E8B8B. Letter-spacing: 2px. Padding-bottom: 20px. Bottom border: 1px [TEAL] at 30%.

Metric items (stacked, 16px gap each):
```
v4.2 shipped
24 agents live
16 skills operational
OSS community active
```
`[BODY]` Inter 400, 18px, #E8E8E8. Left-aligned. Each item preceded by a small [GREEN] dot (6px).

**Column 2 — BENCHMARKS:**

Column header:
```
BENCHMARKS
```
`[MONO-SM]` 13px, [AMBER] #F9A825.

```
Sage: 1.000/1.000
CTO: 5.00/5.00 (all configs)
Config C: 60% cost, same quality
Community vs. Enterprise: 0/11 vs 11/11
```
`[BODY]` 18px, #E8E8E8.

**Hero number in this column:**
```
1.000
```
`[MONO-LG]` JetBrains Mono 700, 64px, [AMBER] #F9A825. Center-aligned at top of column, 8px below the header. Below this: "Sage benchmark score" in [CAPTION] [SUB].

**Column 3 — PILOTS:**

Column header:
```
PILOTS
```
`[MONO-SM]` 13px, [GREEN] #4A7C59.

```
2 startup clients
Enterprise integration active
Revenue: first $ in the door
```
`[BODY]` 18px, #E8E8E8.

Small sub-callout below pilots list:
```
Pilot profile: Series A-B startups,
10-30 developers, active Claude Code users.
```
`[CAPTION]` 14px, [SUB] #8A9BB0.

### Timeline Bar

Y: 640px. Full width (80px–1840px). Height: 80px.

**Line:** 2px, [TEAL] #2E8B8B. Horizontal at vertical center (y: 680px).

**Milestones (dots + labels):**

5 milestones. Equal horizontal distribution.

| Label | Sub-label | Color |
|-------|-----------|-------|
| v3.0 | Mar 17 | [SUB] |
| v4.0 | Mar 19 | [SUB] |
| v4.2 | Mar 20 | [TEAL] |
| Pilots | Mar 22 | [AMBER] |
| Raise ★ | NOW | [GREEN] |

Dot size: 12px. Filled circles on the timeline line.
"Raise ★": dot is a 5-pointed star, [GREEN] #4A7C59, 16px.
Label: `[MONO-SM]` 13px. Sub-label: `[CAPTION]` 11px, [SUB] #8A9BB0. Both centered above and below dot respectively.

**Vertical connector from "Pilots" dot downward:**
Small bracket or arrow pointing down from the "Pilots" milestone. Label: "Live now." [GREEN] #4A7C59, [CAPTION] 12px.

### Capybara Watermark
Bottom-left. x: 100px, y: 970px. 72px pixel-art. 10% opacity. [TEXT] #E8E8E8.

### Speaker Notes
"This is not a pitch for something we plan to build. Version 4.2 is shipped. All 24 agents are live. The Sage scores 1.000 on our benchmark suite — and that is on the cheaper model, not Opus. The CTO agent is the only one that scored a perfect 5 out of 5 across all four test configurations — including the cheapest model. It is model-invariant. We have two startup pilots live right now, integrating into their engineering workflows. We are at the stage where the product works — we are raising to scale distribution and start enterprise sales."

[Transition] "So: the product works, the economics work, and we have early traction. Let me tell you about the team and what we need."

---

## SLIDE 12 — Investor Returns: Why This Check Makes You Money

### Layout
**Type:** Returns table (full width) with hero number and valuation callout
**Background:** [BG] #171E28

### Title (full width, top)
```
$3M at $9M pre. Here is how you make 15x or more.
```
`[TITLE]` Inter 700, 44px, #E8E8E8. Left-aligned. Y: 80px.

### Returns Table

Y: 160px. Width: 1760px (full active area).

**Table header row:**
Background: [SURFACE] #1E2A38. Height: 48px. Padding: 0 20px.

Columns (6): SCENARIO | ARR AT A | SERIES A VAL | EXIT PATH | EXIT VALUE | YOUR RETURN

`[MONO-SM]` JetBrains Mono 400, 13px, [SUB] #8A9BB0. Letter-spacing: 1px. Left-aligned in each cell.

**Table rows (3 scenario rows + EV row):**

Row A — Base:
```
Base    |  $3M ARR  |  $30M pre  |  $300M acquisition  |  $45M  |  15x
```
Background: [SURFACE]. Standard row.

Row B — Expected:
```
Expected  |  $5M ARR  |  $50M pre  |  $320M acquisition  |  $48M  |  16x
```
Same styling.

Row C — Upside:
```
Upside  |  $10M ARR  |  $100M pre  |  $1B+ IPO  |  $200M  |  66x
```
Background: rgba(249, 168, 37, 0.08). Border: 1px solid [AMBER] #F9A825. The upside row is highlighted.
"66x" in the final column: `[MONO-LG]` JetBrains Mono 700, 28px, [AMBER] #F9A825.

**Separator (1px [SUB] #8A9BB0) between last scenario row and EV row.**

EV row:
```
Probability-weighted EV                                              21.5x MOIC
```
Background: rgba(74, 124, 89, 0.12). Border: 1px solid [GREEN] #4A7C59.
"21.5x" text: `[MONO-LG]` JetBrains Mono 700, 40px, [GREEN] #4A7C59. Right-aligned in final column.
Label: `[MONO-SM]` 15px, [GREEN] #4A7C59. Left-aligned.

Sub-row below (no background):
```
Even if you double the fail weight: 17x MOIC
```
`[CAPTION]` 13px, [SUB] #8A9BB0. Right-aligned in final column.

### Valuation Callout Box

Y: 620px. Full width. Background: [SURFACE] #1E2A38. Border: 1px, [TEAL] #2E8B8B at 40%. Border-radius: 8px. Padding: 20px 32px.

```
Devin raised at $2B.  Cursor at $400M.
You are buying this at $9M — with better unit economics than both.
```
`[BODY]` Inter 400, 20px, #E8E8E8. Center-aligned.

"$2B", "$400M", "$9M": `[MONO-SM]` JetBrains Mono 700, same size, emphasized in [AMBER] #F9A825.

### Color Usage
- Base/Expected rows: standard [TEXT]
- Upside row: [AMBER] highlight
- EV row: [GREEN] highlight
- Competitor callout: [TEAL] border

### Speaker Notes
"Let me talk about your returns. You put in three million at nine million pre-money. You own 25%. Base case: we hit three million ARR, raise a Series A at $30M pre, and eventually exit at $300M — that is 15x on your check. $45 million back on $3 million invested. Upside case: ten million ARR, Series A at $100M, and if we become the category leader, we are looking at $1 billion-plus and a 48 to 66x return. The probability-weighted expected value is 21x MOIC. Even if you think we are twice as likely to fail as I do, it is still 17x. For context: Devin raised at a $2 billion valuation on a single-agent demo. We have a 24-agent organization with enterprise benchmarks, zero infrastructure cost, and 95% gross margins. At $9 million pre-money, you are getting this at one-fortieth of Devin's valuation with a fundamentally better business model."

[Transition] "And here is who is building it."

---

## SLIDE 13 — The Team: Founder-Market Fit

### Layout
**Type:** Photo left (40%) / Bio and hire plan right (60%)
**Background:** [BG] #171E28

### Left Panel — Founder Photo (columns 1-5, 80px–800px)

**Photo placeholder:**
Width: 400px. Height: 480px. Y: 120px. X: 160px (centered in panel).
Border-radius: 8px. Border: 1px solid [SURFACE] #1E2A38.
Image: Professional headshot. Not casual. Dark or neutral background preferred.

Below photo (24px gap):
```
[Founder Name]
```
`[TITLE]` Inter 700, 32px, #E8E8E8. Center-aligned.

```
Founder & CEO, TheEngOrg
```
`[MONO-SM]` JetBrains Mono 400, 16px, [TEAL] #2E8B8B. Center-aligned.

### Right Panel — Bio and Hire Plan (columns 6-12, 824px–1840px)

**Bio section (Y: 120px):**

```
[2-3 sentences of founder bio — tailor to actual background]
```

Bio text style: `[BODY]` Inter 400, 20px, #E8E8E8. Max width: 920px.

Bio placeholder example:
```
Built the product solo. Shipped 24 agents, 16 skills,
and the Sage — with zero outside capital. Two clients live.
The product works. The team is the bottleneck.
```

Below bio (32px gap):

Callout badge: [SURFACE] background. Border: 1px [TEAL] at 30%. Border-radius: 6px. Padding: 12px 20px. Inline (not full-width).
```
$35K/mo burn. Built everything. Raising to hire.
```
`[MONO-SM]` JetBrains Mono 400, 15px, [TEAL] #2E8B8B.

**Hire plan section (Y: 380px):**

Section label:
```
FIRST HIRE PLAN
```
`[MONO-SM]` 13px, [SUB] #8A9BB0. Letter-spacing: 2px. Bottom border: 1px [SUB] at 20%, width 300px.

Four hire rows (Y: 430px, stacked, 16px gap):

Row style: No card background. Two columns: left (timeline) / right (role + note). Width: 920px.

| Timeline | Role | Note |
|----------|------|------|
| Month 1 | Sr. Engineer (contract → FT) | IC implementation bandwidth |
| Month 6 | Developer Relations / Community | OSS flywheel acceleration |
| Month 10 | Full-time Engineer #2 | If ARR > $500K |
| Month 15 | Sales / Customer Success | Outbound + onboarding |

Timeline: `[MONO-SM]` JetBrains Mono 400, 14px, [TEAL] #2E8B8B.
Role: `[BODY]` Inter 400, 16px, #E8E8E8.
Note: `[CAPTION]` Inter 400, 13px, [SUB] #8A9BB0.

**Bottom statement (Y: 720px):**
```
"I am raising to hire. The product is built.
 The team is the bottleneck — and that is what $3M solves."
```
`[BODY]` Inter 400, 18px, #E8E8E8. Left-aligned. 2px left-border [GREEN] #4A7C59. Padding-left: 16px.

### Color Usage
- Clean, minimal on this slide
- [TEAL] for role and timeline accents
- [GREEN] for the closing statement
- No capybara — this is the human slide

### Speaker Notes
"[Founder bio — 60 seconds max, focus on founder-market fit: why you understand this problem, what you have built before, why you are undervalued at $9M pre.] I built this entire product — 24 agents, 16 skills, the Sage, the benchmark suite, the brand, the marketing site — solo, at $35K a month in burn. I am raising because the product is built and the bottleneck is now team. Month one post-close: a senior engineer joins. Month six: developer relations to scale the community. Month ten and fifteen: another engineer and a sales hire. I am not raising to figure out the product. I am raising to scale what already works."

[Transition] "Which brings me to the ask."

---

## SLIDE 14 — The Ask: $3M Seed

### Layout
**Type:** Left (ask breakdown) / Right (full Sage illustration)
**Split:** 55% left / 45% right
**Background:** [BG] #171E28

### Left Panel — The Ask (columns 1-7, 80px–1064px)

**Hero headline (Y: 80px):**
```
$3M Seed  |  $9M Pre-Money
```
`[MONO-LG]` JetBrains Mono 700, 56px, #E8E8E8. Left-aligned. Pipe character in [SUB] #8A9BB0.

**Investor stake callout badge (Y: 160px):**
Background: rgba(212, 168, 75, 0.15). Border: 1px [GOLD] #D4A84B. Border-radius: 6px. Padding: 8px 20px. Inline.
```
You own 25%
```
`[MONO-SM]` JetBrains Mono 700, 18px, [GOLD] #D4A84B.

**Three-column breakdown (Y: 220px):**
Three equal columns (~280px each). No vertical dividers — use spacing only.

Column 1 — Year 1:
Header:
```
Year 1
```
`[MONO-SM]` JetBrains Mono 700, 15px, [TEAL] #2E8B8B. Bottom border: 1px [TEAL] at 40%, 120px.

Items (stacked, 12px gap):
```
Founder + engineer
Pilot → 10 clients
$420K burn
```
`[BODY]` Inter 400, 16px, #E8E8E8.

Column 2 — Year 2:
```
Year 2
```
`[MONO-SM]` 15px, [AMBER] #F9A825.

```
5-person team
Scale to 50+ clients
$906K burn
```
`[BODY]` 16px, #E8E8E8.

Column 3 — Path to A:
```
Path to Series A
```
`[MONO-SM]` 15px, [GREEN] #4A7C59.

```
$3–10M ARR
$30–100M valuation
18 months from close
```
`[BODY]` 16px, #E8E8E8.

**Key financial facts (Y: 480px):** Three items, horizontal row.

Fact cards: [SURFACE] #1E2A38 background. Border-radius: 6px. Padding: 12px 20px. Width: 300px. No border.

Card 1:
```
Cash-flow positive
Month 5
```
Value: `[MONO-SM]` JetBrains Mono 700, 20px, [GREEN] #4A7C59.
Label: `[CAPTION]` 13px, [SUB] #8A9BB0.

Card 2:
```
Cash at Month 12
$3.2M (above raise)
```

Card 3:
```
Series A
Optional — from strength
```

**CTA line (Y: 640px):**
This is the ONE use of Lime Zest in the entire deck.

```
The most capital-efficient AI seed deal in the market.
```
`[MONO-SM]` JetBrains Mono 700, 20px, [ZEST] #D4FF00. Left-aligned. No background, no border — the color alone makes it land.

### Right Panel — Full Sage Illustration (columns 8-12, 1088px–1840px)

**The capybara in full active state — the payoff illustration.**

**Placement:** Centered horizontally in right panel. Vertically centered in slide (slightly favoring bottom half). Center point: x=1464px, y=600px.

**Illustration dimensions:** 480px x 640px. Aspect ratio flexible to accommodate illustration style.

**Illustration description (for art-director):**

The monk capybara in full forward-facing pose. Details:

1. Body: Large, rounded capybara form. Earth-toned brown (#8B6914 range). Solid, calm, unhurried posture — seated or cross-legged.

2. Robes: Saffron/amber (#D4A84B) monk robes draped over the body. Circuit-board patterns etched into the robe fabric — fine lines, visible but not overwhelming. The circuits glow faintly (subtle teal #2E8B8B inner glow on circuit paths, 40% opacity).

3. Third eye: Centered on forehead. Glowing amber (#F9A825) with soft radial glow, 20px radius, 60% opacity. The glow should be visible but not cartoon-like.

4. Eyes: Calm, half-lidded. Dark, deep. The capybara is aware — it sees everything — but it is not reactive.

5. The teal bird: Small bird (pixel-art or illustrated to match capybara style) perched on the capybara's right shoulder. Size: ~80px relative to the capybara's 480px width. Teal (#2E8B8B) colored. The bird faces forward — confident, not anxious. Head slightly raised. This is the bird after transformation: it has grown, it leads, it is no longer alone.

6. Background of illustration: None — transparent or very subtle dark gradient that blends into slide background.

7. Style: Anime-adjacent but with gravitas. Not chibi. Not cartoonish. The capybara has the visual weight of a wise elder. Think Studio Ghibli weight and texture, not Saturday morning cartoon.

**Art-director sign-off required before production.**

### Color Usage
- Left panel text: [TEXT], [TEAL], [AMBER], [GREEN]
- CTA line: [ZEST] #D4FF00 — only appearance of this color
- Illustration: [GOLD], [TEAL] circuits, [AMBER] third eye
- Bird: [TEAL] #2E8B8B

### Speaker Notes
"Three million dollars. Nine million pre-money. You get 25% of the company that is building the organizational intelligence layer for AI engineering. The money buys 36 months — but we do not need 36 months. We are cash-flow positive at month five. By month twelve, the cash balance is above the raise. The Series A is from a position of strength, not survival."

[Pause. Make eye contact.]

"Every startup building with AI agents today is a small bird trying to build a nest alone. We built the monk capybara. It does not build — it watches, it guides, and it makes sure nothing ships that should not. That is what TheEngOrg does. That is what the Sage is. And that is why our customers ship like a 30-person team with five people."

[Pause.]

"I would love to have [Investor Name] as our partner on this journey."

[Transition] "I am happy to take questions."

---

## Quality Checklist — Per Slide

Before any slide leaves design review:

- [ ] Background is [BG] #171E28 unless specified (terminal slide is #0D1117)
- [ ] All data labels use JetBrains Mono, body text uses Inter
- [ ] One idea per slide — no overcrowding
- [ ] Capybara appears in: Slide 01 (watermark 15%), Slide 04 (Sage node), Slide 05 (watermark 10%), Slide 07 (watermark 10%), Slide 11 (watermark 10%), Slide 14 (full illustration)
- [ ] Bird appears in: Slide 02 (tangle), Slide 03 (bottom-left), Slide 14 (on Sage shoulder)
- [ ] Lime Zest (#D4FF00) appears ONLY on Slide 14 CTA line
- [ ] Chili Red (#C94D3A) appears ONLY on problem slides (02, 03) and moat benchmark (07)
- [ ] All numbers are sourced to financial-model.md, unit-economics.md, or investor-returns.md
- [ ] Dark background renders at correct contrast on both projector (low contrast) and screen (high contrast)
- [ ] No slide requires scrolling — all content fits at 1920x1080 with 80px margins
