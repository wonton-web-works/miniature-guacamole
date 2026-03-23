# Pitch Deck Design Direction

> [CMO] Decision: The deck must look like it comes from a company that builds beautiful products. Clean, modern, dark-surface design system with the capybara/bird narrative woven into the visual language — never as decoration, always as meaning.

---

## Design Principles

1. **Dark surface, warm accents.** The deck uses the same dark palette as the product site. This is not a Google Slides template. It is a designed artifact.

2. **Monospace carries authority.** Labels, data points, and structural text use JetBrains Mono. Body text uses Inter. The combination signals: this is a technical product built by people who care about craft.

3. **One idea per slide.** If a slide needs scrolling or squinting, it has too much on it. Density is for the appendix.

4. **The capybara is earned, not imposed.** It appears subtly — in corners, as watermarks, in diagram nodes — and then fully on the closing slide. The visual arc mirrors the narrative arc.

5. **White space is a feature.** Crowded slides signal a company that cannot prioritize. Every element on a slide must justify its presence.

---

## Color System

### Primary Palette (from site tokens.css)

| Role | Color | Hex | Usage in Deck |
|---|---|---|---|
| Dark background | Navy-charcoal | `#171E28` | Slide backgrounds |
| Surface | Dark blue-grey | `#1E2A38` | Cards, callout boxes |
| Primary text | Light grey | `#E8E8E8` | Headlines, body |
| Subtext | Muted blue-grey | `#8A9BB0` | Captions, labels |
| Guac Green | Forest green | `#4A7C59` | Brand accent, section dividers |
| Cilantro Teal | Deep teal | `#2E8B8B` | Secondary accent, links, info |
| Chili Red | Warm red | `#C94D3A` | Alerts, pain points, problem slides |
| Lime Yellow | Amber-gold | `#F9A825` | Highlights, metrics, success states |
| Lime Zest | Electric yellow-green | `#D4FF00` | CTA only — one use per deck (The Ask slide) |

### Character Colors (for org chart diagrams)

| Agent | Hex |
|---|---|
| CEO | `#8A9BB0` |
| CTO | `#2E6E8E` |
| CMO/COO | `#8B4A2E` |
| CFO | `#D4A84B` |
| EM | `#4A7C59` |
| PO | `#8B4A2E` |
| QA | `#7A5C8B` |
| SE | `#3D5A6B` |

### Sage-Specific Colors

| Element | Hex | Usage |
|---|---|---|
| Sage robe | `#D4A84B` | Saffron/amber — used in the Sage node and any capybara illustrations |
| Sage trim | `#2E8B8B` | Teal accent on Sage elements |
| Third-eye glow | `#F9A825` | Amber glow — used when showing Sage in active state |
| Bird | `#2E8B8B` | Teal — the little bird matches cilantro teal |

---

## Typography

| Level | Font | Weight | Size (at 1920x1080) |
|---|---|---|---|
| Slide title | Inter | 700 | 48-56px |
| Subtitle / section label | JetBrains Mono | 400 | 18-22px |
| Body text | Inter | 400 | 20-24px |
| Data callouts | JetBrains Mono | 700 | 36-64px |
| Captions / footnotes | Inter | 400 | 14-16px |
| Code / terminal | JetBrains Mono | 400 | 16-18px |

---

## Layout Grid

- **Slide size:** 16:9 (1920 x 1080px)
- **Safe margins:** 80px all sides
- **Content width:** 1760px max
- **Column grid:** 12-column with 24px gutters
- **Vertical rhythm:** 40px baseline

### Common Layouts

**Title + Body (60/40 split)**
Left 60%: headline + body text. Right 40%: visual, diagram, or metric.

**Full-bleed visual**
Edge-to-edge diagram or screenshot with a semi-transparent dark overlay for text anchoring.

**Metric wall**
3-4 large numbers in JetBrains Mono with one-line labels beneath each. No paragraphs.

**Comparison (split)**
50/50 left-right with a vertical divider. Left = before/problem. Right = after/solution.

---

## Capybara / Bird Visual Integration

### How it appears across the deck

The capybara and bird are NOT clip art. They are part of the visual system.

**Slide 1 (Cover):** Small capybara silhouette in bottom-right corner, watching. Bird is not visible yet. The capybara is a subtle presence — investors notice it but it does not dominate.

**Slides 2-3 (Problem):** The bird appears alone. Small, subtle, in the margin or as part of a diagram element. It represents the customer before TheEngOrg. No capybara on these slides.

**Slide 4 (Solution):** The capybara appears in the org chart diagram. It IS the Sage node at the top of the hierarchy. Not a mascot next to a diagram — a functional element of the diagram itself.

**Slides 5-7 (Product, Market, Traction):** Capybara as a subtle watermark or corner element. Present but not the focus. The data is the focus.

**Slide 8 (Team):** No capybara. This is the human founder. The capybara is the product; the founder is the operator.

**Slide 9 (Financials):** No capybara. Numbers speak.

**Slide 10 (The Ask):** Full capybara illustration — the Sage in active state (third eye glowing, circuit-pattern robes lit up). The bird is perched confidently nearby, larger now. This is the payoff. The narrative arc completes: the bird grew under the capybara's guidance.

### Style Rules

- **Pixel art** for small corner elements and watermarks (matches the product's terminal aesthetic)
- **Anime/illustrated style** for the full closing illustration only
- **Never cartoonish.** The capybara has gravitas. It is a monk, not a mascot.
- **Opacity:** Watermark capybaras at 8-12% opacity on dark backgrounds. Enough to notice on second look, not enough to distract.
- **Scale:** Corner capybaras no larger than 120px. The closing illustration can be 400-600px.

---

## Diagram Style

All architecture diagrams, org charts, and flow diagrams follow the same visual language.

### Org Chart / Hierarchy Diagram

```
Nodes:     Rounded rectangles with 1px border in agent color
           Dark fill (#1E2A38), colored left-edge accent (4px)
           Monospace label, regular-weight role name

Connectors: 1px lines in #3A4A3A (dark border color)
            Vertical for hierarchy, no arrows
            Clean right-angle routing, never diagonal

Sage node:  Larger than others, amber border (#D4A84B)
            Subtle glow effect (2px amber shadow)
            "SAGE" label in amber

Grouping:   Horizontal dotted line separates tiers
            Tier labels in monospace, muted color (#8A9BB0)
```

### Flow / Pipeline Diagrams

```
Steps:     Horizontal flow, left to right
           Rounded rectangles, same style as org nodes
           Numbered in monospace (01, 02, 03...)

Arrows:    Single-pixel, teal (#2E8B8B)
           Small arrowhead, not chunky

Decision:  Diamond shape, chili red border for "fail" paths
           Green border for "pass" paths

Gates:     Vertical bar across the flow line
           Red = blocked, green = passed
           Label above in monospace
```

### Metric / Data Visualizations

```
Charts:    Minimal — no gridlines, no 3D, no gradients
           Line charts: 2px stroke in teal or amber
           Bar charts: Filled rectangles in brand colors
           Always label directly on the data, not in a legend

Callouts:  Large number in JetBrains Mono 700
           Unit or label in Inter 400 beneath
           Example: "6x" / "velocity multiplier"

Before/After: Side-by-side with a vertical divider
              Left in chili red tones (problem)
              Right in guac green tones (solution)
```

---

## Slide-by-Slide Design Specifications

### Slide 1: Cover

**Layout:** Centered title, minimal

```
[TheEngOrg logo — top center]

    Your AI Engineering Org.

    The monk capybara watches. The little bird ships.

[Capybara silhouette — bottom right, pixel art, 15% opacity]
[Subtitle: "$3M Seed — March 2026" in monospace, muted]
```

**Colors:** Dark background. Title in `#E8E8E8`. Subtitle in `#8A9BB0`.
**Capybara:** Small pixel-art silhouette, bottom-right, 15% opacity. Seated meditation pose.

---

### Slide 2: Problem — The Coordination Crisis

**Layout:** Title + Body (left) / Visual (right)

**Title:** "AI agents are powerful. Uncoordinated AI agents are dangerous."

**Body:** 3 bullet pain points:
- Agents contradict each other across workstreams
- Quality gates get skipped under deadline pressure
- Scope drift cascades — one bad decision poisons three downstream features

**Visual (right side):** Abstract diagram showing 5-6 agent nodes with crossed/tangled connection lines. Chili red highlights on the broken connections. The little bird (small, teal, pixel art) sits among the tangle, looking overwhelmed.

**Colors:** Chili red (`#C94D3A`) accent for the pain. Dark surface cards for the bullets.

---

### Slide 3: Problem — The Cost of Chaos

**Layout:** Metric wall

**Three large numbers:**

```
73%        $847K         4.2x
of AI      avg. cost     longer
projects   of a failed   debugging
fail to    AI rollout    than building
ship                     (uncoordinated)
```

**Note:** These are placeholder metrics. Source real numbers from industry reports or pilot data before the pitch. If we do not have defensible numbers, use pilot-specific data only and label it as such.

**Colors:** Numbers in chili red. Labels in muted grey.

---

### Slide 4: Solution — TheEngOrg

**Layout:** Full-width org chart diagram

**Title:** "We built the engineering org your AI agents need."

**Visual:** The full hierarchy diagram from Sage down through C-Suite, Directors, and Specialists. Sage node at the apex with amber glow. This is where the capybara enters the narrative — the Sage node IS the capybara. A small label beneath: "The Sage watches. It does not build."

**Key callout (bottom):** "One command. The right agents. Quality-gated output."

**Colors:** Each tier uses its character colors. Sage in amber/gold. Background dark.

---

### Slide 5: Product — See It Work

**Layout:** Full-bleed terminal screenshot or recording

**Title:** "Terminal-native. Zero infrastructure."

**Visual:** Actual terminal output showing a `/mg-build` run — agents spawning, quality gates firing, PR created. This should be a real screenshot from a pilot run, not a mockup.

**Callout bar (bottom):**
```
$5K/mo API cost  →  25-agent team  →  Zero servers  →  100% gross margin
```

**Colors:** Terminal on dark background. Callout numbers in lime yellow (`#F9A825`).

---

### Slide 6: Market — TAM/SAM/SOM

**Layout:** Title + concentric circles or nested rectangles

**Title:** "The AI development tooling market is forming now."

**Visual:** Three nested regions:
- **TAM:** Global software development tooling ($XX B)
- **SAM:** AI-assisted development tools ($XX B)
- **SOM:** Teams using Claude/LLM agents for development ($XX M)

**Note:** Fill in real numbers from Gartner, Forrester, or first-principles estimation. Label sources. VCs will check.

**Colors:** Concentric regions in progressively brighter shades of teal. Numbers in amber.

---

### Slide 7: Traction — Proof It Works

**Layout:** Metric wall + timeline

**Metrics:**
```
1.000       6x          40%
Sage        velocity    fewer
benchmark   multiplier  defects
score       (pilot)     (pilot)
```

**Timeline (bottom):**
```
v3.0 ──── v4.0 ──── v4.2 ──── Pilots ──── You are here
Mar 17     Mar 19     Mar 20    Mar 22      ↑
```

**Capybara:** Subtle pixel-art watermark, bottom-left, 10% opacity.

**Colors:** Metrics in lime yellow. Timeline in teal. Milestones labeled in monospace.

---

### Slide 8: Team

**Layout:** Photo + bio (centered)

**Content:**
- Founder photo, name, title
- 2-3 lines: relevant experience, why this person builds this product
- Below: "First hire plan" — what roles the raise funds

**No capybara on this slide.** This is about the human.

**Colors:** Clean, minimal. Photo with subtle border. Text in standard palette.

---

### Slide 9: Financials

**Layout:** Two-panel

**Left panel — Unit Economics:**
```
Customer pays:    $0 to us for infrastructure
Customer spends:  ~$5K/mo on API tokens (to Anthropic)
Our revenue:      $X,XXX/mo subscription
Gross margin:     ~100%
```

**Right panel — Growth Curve:**
Simple line chart: projected ARR over 18 months.
Key inflection points labeled.

**Bottom callout:**
```
$3M buys 36 months because there is no server bill.
```

**Colors:** Numbers in amber. Growth curve in guac green. Background dark.

---

### Slide 10: The Ask

**Layout:** Centered, bold, single-focus

**Title:** "$3M Seed"

**Three columns:**
```
Year 1              Year 2              Path to Series A
─────────           ─────────           ─────────────────
Founder + eng       5-person team       $3-10M ARR
Pilot → 10 clients  Scale to 50+       $30-100M valuation
$420K burn          $960K burn          18 months from close
```

**CTA line (bottom, in Lime Zest `#D4FF00` — the ONE use of this color):**
```
The capybara is ready. The bird is waiting.
```

**Capybara:** Full illustrated Sage — active state, third eye glowing, circuit-pattern robes illuminated. The teal bird perched on its shoulder, confident, looking forward. This is the payoff illustration. It is professional, detailed, and earned by the 9 slides of restraint before it.

**Size:** 400-500px, positioned right-center. The ask text occupies the left.

---

## Production Notes

### File Format
- Design in Figma or Keynote (not Google Slides — the typography control is insufficient)
- Export as PDF for distribution
- Maintain a source file for iteration

### Assets Required
1. Capybara pixel-art silhouette (seated meditation, for watermarks) — exists in asset library
2. Little bird pixel art (small, teal, 3 states: alone/worried, guided, confident) — exists in asset library
3. Full Sage illustration in active state (for closing slide) — may need art-director to produce at higher fidelity
4. Terminal screenshot from a real pilot run (not a mockup)
5. Founder headshot (professional, not casual)

### Delegation

| Asset | Owner |
|---|---|
| Closing Sage illustration (high-fidelity) | art-director |
| Terminal screenshot | engineering (real pilot output) |
| Financial model numbers | cfo |
| Market sizing (TAM/SAM/SOM) | ceo + cfo |
| Slide production (Figma/Keynote) | art-director with CMO design direction |
| Copy for slide text | copywriter with CMO tone direction |
| Pilot metrics | data from pilot instrumentation |

### Quality Gate
No slide leaves design review without:
- [ ] Correct color usage (verified against this document)
- [ ] Monospace for data/labels, Inter for body (no exceptions)
- [ ] One idea per slide (no overcrowding)
- [ ] Capybara usage matches the narrative arc defined above
- [ ] All numbers sourced and defensible
- [ ] Dark background renders correctly on both projector and screen
