# Enterprise Page Visual Spec — TheEngOrg / The Sage

**Version:** 1.0
**Date:** 2026-03-22
**Author:** Design Agent
**Status:** Ready for engineering
**Requires art-director approval before implementation**

---

## Overview

This spec covers six visual sections for the TheEngOrg enterprise marketing page. The page tells a single through-line story: the Sage (meditating capybara in green robes) guides the little bird (the client) through the complexity of a real software org. Every section continues that narrative.

**Art direction in brief:** Pixel art aesthetic consistent with existing `/assets/capy/` assets. Dark backgrounds from the `--mg-dark`/`--mg-surface` token range. Warm amber gold introduced for the Sage's glow — this is the new accent for this page only, sitting alongside the existing palette. The bird is small and expressive. The Sage is always calm.

**Existing assets to reference:**
- `/assets/capy/zen-meditating.png` — Sage seated, bird on head, eyes closed. Primary hero candidate.
- `/assets/capy/lantern-guide.png` — Sage walking, lantern, bird on head, spirit orbs. Strong narrative asset.
- `/assets/capy/teacher.png` — Sage raising one finger, bird on head. Use for instruction moments.
- `/assets/capy/coding-monk.png` — Sage at laptop, small bird on head. Use for technical sections.
- `/assets/capy/bird.png` — Standalone bird, looking slightly concerned/eager.
- `/assets/capy/terminal-capy.png` — Pixel capy at CRT terminal. Use for developer-audience sections.
- `/assets/capy/terminal-capy-spirits.png` — Already in use on index hero terminal.
- `/assets/capy/peeking.png` — Already in use on index hero.

---

## Design Token Reference

All values below reference `/site/src/styles/tokens.css`.

| Token | Value | Use on this page |
|---|---|---|
| `--mg-dark` | `#171e28` | Page background |
| `--mg-surface` | `#1E2A38` | Card/panel backgrounds |
| `--mg-text` | `#E8E8E8` | Body text |
| `--mg-subtext` | `#8A9BB0` | Labels, secondary text |
| `--mg-guac` | `#4A7C59` | Sage robe color echo, EM role |
| `--mg-cilantro` | `#2E8B8B` | Connection lines, teal accents |
| `--mg-chili` | `#C94D3A` | Warning/drift indicators |
| `--mg-lime` | `#F9A825` | Warm highlight |
| `--mg-lime-zest` | `#D4FF00` | CTA only, one per page |
| `--mg-cto` | `#2E6E8E` | CTO agent color |
| `--mg-ceo` | `#2D2D2D` (use `#8A9BB0` on dark bg) | CEO agent color |
| `--mg-po` | `#8B4A2E` | CMO/COO agent color |
| `--mg-qa` | `#7A5C8B` | CFO agent color (repurpose) |
| `--font-display` | Inter / system-ui | All headings and body |
| `--font-mono` | JetBrains Mono / Fira Code | Labels, code, stats |

**New token for this page only (do not add to tokens.css until art-director approves):**

| Token | Value | Use |
|---|---|---|
| `--sage-amber` | `#D4A84B` | Sage glow, ambient light, highlight |
| `--sage-amber-dim` | `#6B4E1A` | Dimmed/dormant state for agent nodes |
| `--sage-amber-glow` | `rgba(212, 168, 75, 0.15)` | Radial glow behind Sage |

---

## Section 1 — Hero: "Meet The Sage"

### Purpose
First impression. Establish the Sage as the wise, calm guide. The bird establishes the user's proxy. Set the tone: warm, digital, approachable.

### Layout — Desktop (1200px+)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   [HEADLINE BLOCK]              [SAGE ILLUSTRATION]            │
│                                                                 │
│   "The Sage knows                 ┌──────────────────┐         │
│    your entire org."              │                  │         │
│                                   │  zen-meditating  │         │
│   [subheadline]                   │     .png         │         │
│                                   │                  │         │
│   [CTA button]                    │  amber glow halo │         │
│                                   └──────────────────┘         │
│   "Orchestration. Research.       [floating bird below]        │
│    Drift prevention."                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Two-column grid. Left column: 55% width, right column: 45%. Vertically centered. Right column image is centered horizontally within its column.

### Layout — Mobile (< 768px)

Stack vertically. Illustration comes FIRST (top), text block below. Illustration at 100% column width. Bird floats at bottom-right of illustration.

### Visual Elements

**Background:** Full `--mg-dark` (#171e28). Subtle radial gradient originating behind the Sage's position — from `rgba(212, 168, 75, 0.08)` at center to transparent at ~600px radius. This is barely perceptible, like warmth rather than light. No harsh gradients.

**Constellation particles:** 12–16 small dots (2px each, `rgba(212, 168, 75, 0.3)`) scattered in the top-right quadrant, behind the illustration. Space them irregularly — not a grid. Think star field, not pattern. 4–5 of these dots have a fine hairline (0.5px, 20% opacity) connecting them loosely — not a network diagram, just a suggestion of connection.

**The Sage illustration:** Use `/assets/capy/zen-meditating.png`. Display at approximately 340px wide on desktop (340 × auto, preserving aspect ratio). The image has its own dark background baked in — that's fine. Set `mix-blend-mode: screen` to allow the ambient glow to bleed through naturally. If the blend mode causes visual artifacts, fall back to normal blend mode and rely on the radial gradient behind it.

**The bird:** The `zen-meditating.png` already has the bird perched on the Sage's head. The hero illustration is complete as-is. Do not composite a separate bird asset on top.

**Headline:** Font: `--font-display`. Weight 700. Size: `clamp(2.4rem, 5vw, 3.8rem)`. Color: `--mg-text`. Line 1: "The Sage knows". Line 2: "your entire org." The word "Sage" receives a color accent: `--sage-amber` (#D4A84B). Tracking: -0.02em on the large line.

**Subheadline:** Font: `--font-display`. Weight 400. Size: `1.125rem`. Color: `--mg-subtext`. Two lines: "Every workstream. Every decision. Every session." followed by "He orchestrates your team so you don't have to." Max-width 480px. Margin-top 1rem.

**Supporting stat line:** `--font-mono`, 0.8rem, `--mg-subtext`. Content: `24 agents · intake to merge · zero micromanagement`. Displayed below the subheadline, margin-top 1.5rem. Small `•` bullet in `--sage-amber` as separator instead of `·` if technically possible (use Unicode U+2022 at 70% opacity amber).

**CTA button:** Same style as existing `.cta-primary` from index.astro. Text: "See how it works". Links to Section 2 anchor (`#how-sage-works`). Use `--mg-lime-zest` background — this is the single CTA on the page.

### Color Palette for This Section
- Background: `--mg-dark`
- Radial glow: `--sage-amber-glow` (rgba 212,168,75 at 8%)
- Headline accent: `--sage-amber`
- Text: `--mg-text`, `--mg-subtext`
- Particles: `--sage-amber` at 30% opacity
- CTA: `--mg-lime-zest` with `--mg-dark` text

### Animation

**Entrance (page load):**
- Headline fades in and slides up 12px, duration 600ms, ease-out, delay 100ms
- Subheadline fades in, duration 500ms, delay 350ms
- Illustration fades in, duration 700ms, delay 200ms
- Constellation particles fade in one at a time, staggered 40ms apart, starting at delay 800ms

**Idle (looping):**
- Sage illustration: very slow, subtle `transform: translateY()` breathing — 6px up, 6px down over 6 seconds. `animation: float 6s ease-in-out infinite`. This must feel like a sleeping breath, not a bounce.
- 2–3 of the constellation particles pulse opacity from 30% to 60% and back over 3–4 seconds, each on a different timer so they feel organic.

**No parallax on scroll for the hero.** The section is above the fold — keep it simple.

### Accessibility

- Illustration alt text: `"The Sage — a meditating capybara in green robes with a small bird perched on its head, sitting serenely in a dark space"`
- CTA must have visible focus ring (2px solid `--mg-lime-zest`, 2px offset)
- All text must meet WCAG AA 4.5:1 contrast ratio. `--mg-subtext` (#8A9BB0) on `--mg-dark` (#171e28) is ~5.1:1 — passes.
- `prefers-reduced-motion`: disable float animation and particle pulse. Items should remain visible at their resting state.
- Constellation particles are decorative — `aria-hidden="true"` on the container.

---

## Section 2 — Team Hierarchy Visualization

### Purpose
Show the Sage at the apex of the entire org. The bird travels through levels — guided, never lost. This is the "24 agents" concept made spatial and visual.

### Layout — Desktop

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                 SECTION HEADING                                 │
│           "An org that orchestrates itself."                   │
│                                                                 │
│                    [  THE SAGE  ]                              │
│                    [ amber node ]                              │
│                         │                                      │
│              ┌──────────┼──────────┐                           │
│           [CEO]      [CTO]      [CMO]      [CFO]               │
│              └──────────┴──────────┘                           │
│                         │                                      │
│        [EM]    [Tech Lead]   [PO]    [QA Lead]                 │
│                         │                                      │
│   [Dev] [Designer] [Security] [DevOps] [API] [Data] [+17]     │
│                                                                 │
│         [  BIRD appears at IC level, looking up  ]             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Full-width section, centered content, max-width 900px. The hierarchy is vertical with the Sage at the top. The visual weight pulls downward — this should feel like roots growing from the Sage, not a corporate pyramid.

### Layout — Mobile

Compress to a vertical list. Each tier becomes a horizontal pill row. Connection lines remain but become simple 2px vertical lines. The Sage node sits at the very top, centered.

### The Sage Node

**Shape:** Circle, 80px diameter (desktop) / 60px (mobile).
**Fill:** Radial gradient from `--sage-amber` (#D4A84B) at center to `rgba(212, 168, 75, 0.4)` at edge.
**Border:** 2px solid `--sage-amber`.
**Glow:** `box-shadow: 0 0 24px 8px rgba(212, 168, 75, 0.35)`.
**Content:** The `zen-meditating.png` cropped to the face area (head and top of body), displayed as a circular `object-fit: cover` inside the node. If cropping produces poor results, use the full image scaled down with the circle as a mask.
**Label:** "THE SAGE" in `--font-mono`, 0.65rem, `--mg-subtext`, displayed below the node. Spacing: 8px.

### Connection Lines (Organic Style)

Do NOT use straight horizontal/vertical lines. Use SVG paths with gentle curves — `quadratic bezier curves` with a slight bow. The lines should feel like roots or mycelium, not a database diagram.

**Style:**
- Stroke: `--mg-cilantro` (#2E8B8B) at 40% opacity
- Stroke-width: 1.5px
- The path from Sage node to C-Suite level bows outward slightly before reaching each C-Suite node
- Below C-Suite, lines thin to 1px and opacity drops to 25%
- At the IC/Specialist tier, lines are almost invisible — just a suggestion: 0.5px, 15% opacity

**SVG implementation note:** The entire hierarchy visualization should be one SVG element with `<foreignObject>` nodes for the agent cards, or alternately an absolutely-positioned CSS layout with an SVG layer behind it for the connection lines. The SVG layer should be `pointer-events: none`.

### C-Suite Nodes

Four nodes arranged in a horizontal row, evenly spaced within the 900px container (approximately 180px center-to-center on desktop).

**Node style (active/default state):**
- Rounded rectangle, 120px × 56px
- Background: `--mg-surface` (#1E2A38)
- Border: 1.5px solid [character color per token]
- Corner radius: 8px
- Content: Role abbreviation in `--font-mono` 1rem weight 600, role title in `--font-display` 0.75rem `--mg-subtext`

**Character color mapping:**
- CEO: `#8A9BB0` (use `--mg-subtext` on dark, the `--mg-ceo` token #2D2D2D is invisible)
- CTO: `--mg-cto` (#2E6E8E)
- CMO/COO: `--mg-po` (#8B4A2E)
- CFO: `--mg-qa` (#7A5C8B)

**Dormant state** (used in Section 3 — Selective Spawning): background stays `--mg-surface`, border color drops to `rgba(138, 155, 176, 0.2)`, text opacity 40%.

### Director Tier Nodes

Smaller, same rounded rectangle. 90px × 44px. 0.85rem monospace abbreviation. Same character colors, lighter border (50% opacity).

Roles shown: EM, Tech Lead, PO, QA Lead. These four are sufficient — they represent the second layer of the C-Suite's immediate reports. A `+N more` ghost node with dashed border at the end of the row indicates additional directors exist.

### IC / Specialist Tier

Small pill tags, not full cards. Height 28px, padding 4px 12px. Border-radius 14px (fully rounded). Background: transparent, border 1px solid `rgba(138, 155, 176, 0.3)`. Text: `--font-mono` 0.7rem, `--mg-subtext`.

Roles: Dev, Designer, Security, DevOps, API Design, Data, `+17 more`. Arrange in two rows of four, centered.

### The Bird Placement

The bird (`/assets/capy/bird.png`) appears at the IC tier level, positioned to the left of the row. Size: 32px × 32px. It faces right (toward the nodes). Expression: looking up and slightly right — curious, not worried. This is the "user's project" represented as the little bird, about to receive the Sage's org.

Below the bird, a `--font-mono` 0.65rem label in `--mg-subtext`: "your project". Centered under the bird.

### Animation (Scroll-triggered, IntersectionObserver)

When the section enters the viewport at 80% threshold:
1. The Sage node scales from 0.7 to 1.0, opacity 0 to 1, duration 500ms, ease-out
2. Connection lines to C-Suite draw from top to bottom using SVG `stroke-dashoffset` animation, duration 600ms, delay 300ms
3. C-Suite nodes fade and slide up 8px, staggered 80ms each, starting at delay 700ms
4. Connection lines to Director tier draw, delay 1100ms
5. Director nodes fade in, staggered 60ms, delay 1300ms
6. IC pill tags fade in as a group, delay 1600ms
7. Bird fades in last, delay 1900ms, with a small +4px upward hop (translateY 4px → 0) over 300ms

**On mobile:** simplify to fade-only (no translateY) to reduce motion complexity. Reduce stagger delays by 30%.

### Accessibility

- The entire hierarchy is a visual supplement. Provide a hidden `<table>` with `sr-only` CSS that lists all agents by tier for screen readers.
- ARIA label on the section: `aria-label="TheEngOrg team hierarchy — 24 agents across 4 tiers, led by The Sage"`
- Bird image: `aria-hidden="true"` (decorative in this context)
- All node text must meet 4.5:1 contrast. The CTO color #2E6E8E on #1E2A38 is approximately 3.2:1 — FAILS AA for small text. Use `#4A9ABF` (lightened variant) for the CTO border color in nodes, but keep the abbreviation text at `--mg-text` (#E8E8E8) with the colored value only on the border/accent. Engineering note: check all six character colors at implementation time.
- `prefers-reduced-motion`: disable stroke draw animation. All elements appear at full opacity immediately.

---

## Section 3 — Selective Spawning Animation

### Purpose
Show that the Sage makes intelligent routing decisions. Not all agents fire for every task. This is a core differentiator — demonstrate it visually.

### Layout — Desktop

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    SECTION HEADING                                              │
│    "The Sage only wakes who you need."                         │
│    Subhead: "The right specialists. No noise."                 │
│                                                                 │
│    ┌────────────────────────────────────────────────────┐      │
│    │  TASK INPUT PANEL    │    SPAWN VISUALIZATION      │      │
│    │                      │                             │      │
│    │  [Scenario tabs]     │  [Sage node]               │      │
│    │  ○ Pure engineering  │       │                     │      │
│    │  ○ Engineering+prod  │  [CEO][CTO][CMO][CFO]       │      │
│    │  ○ Brand/UX          │                             │      │
│    │  ○ Full initiative   │                             │      │
│    │                      │                             │      │
│    │  [Task description]  │                             │      │
│    └────────────────────────────────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Two-column layout inside a contained panel. Panel background: `--mg-surface`. Border: 1px solid `rgba(138, 155, 176, 0.15)`. Border-radius: 12px. Padding: 32px. Max-width: 900px, centered.

Left column: 35% width. Right column: 65% width.

### Layout — Mobile

Stack vertically. Tabs become a horizontally scrollable pill selector at the top. Visualization panel below.

### Left Column — Scenario Selector

**Heading:** "Task type" in `--font-mono` 0.7rem uppercase `--mg-subtext`. Margin-bottom 12px.

**Scenario tabs:** Four labeled radio-style buttons. Style: pill shape, 100% width, padding 10px 16px, border-radius 8px. Default state: background transparent, border 1px solid `rgba(138, 155, 176, 0.2)`, text `--mg-subtext`, `--font-mono` 0.8rem. Active state: background `rgba(46, 139, 139, 0.15)`, border 1px solid `--mg-cilantro`, text `--mg-text`.

Scenarios (mapping exactly to Sage AGENT.md):
1. "Pure engineering" → activates CTO only
2. "Engineering + product" → activates CTO, CEO
3. "Brand / UX" → activates CTO, CMO
4. "Full initiative" → activates CEO, CTO, CMO, CFO

Below the tabs, a task description block. This is static flavor text that changes per scenario:

| Scenario | Task description displayed |
|---|---|
| Pure engineering | "Refactor the auth service. Replace JWT with short-lived tokens." |
| Engineering + product | "Build the new onboarding flow with feature flags." |
| Brand / UX | "Redesign the landing page. Update brand voice and component library." |
| Full initiative | "Launch v2.0. New pricing, new infra, new market positioning." |

Display in a `<blockquote>`-style block: left border 2px solid `--mg-cilantro`, padding-left 12px, `--font-mono` 0.8rem, `--mg-subtext`. Above it: a small label "Sample task" in `--font-mono` 0.65rem `--mg-subtext` uppercase.

### Right Column — Spawn Visualization

**The Sage node:** Same style as Section 2, but smaller — 56px diameter. Centered horizontally at the top of the column, ~40px from the top edge.

**The four C-Suite nodes:** Arranged in a horizontal row below the Sage, approximately 60px below the Sage node's bottom edge. Same node style as Section 2.

**Active state:** Border, text, and a soft glow are at full opacity. `box-shadow: 0 0 12px 3px [character-color at 30%]`.

**Dormant state:** Background `--mg-surface` unchanged. Border: 1px dashed `rgba(138, 155, 176, 0.2)`. Node abbreviation text: `rgba(232, 232, 232, 0.25)`. Role title text: invisible (opacity 0). No glow. The node looks like a faint ghost — present but sleeping.

**Connection lines:** Same SVG path approach as Section 2. Lines to active nodes: `--mg-cilantro` 50% opacity, 1.5px. Lines to dormant nodes: `rgba(138, 155, 176, 0.1)` 0.5px.

**The Sage node "thinking" indicator:** When the user changes the selected scenario, the Sage node briefly pulses. `box-shadow` expands from normal to `0 0 32px 12px rgba(212, 168, 75, 0.5)` and back over 400ms. Then the spawn visualization updates.

### Spawn Transition Animation

When the user selects a new scenario (click/tap):

1. All four C-Suite nodes simultaneously transition to dormant state, duration 200ms
2. Sage node pulses amber (400ms)
3. After the pulse peak (200ms into pulse), active nodes transition to active state one at a time, staggered 100ms per node, from left to right
4. Connection lines to newly-active nodes draw in with `stroke-dashoffset`, 300ms
5. Connection lines to dormant nodes fade out to dormant opacity, 200ms

Total transition from click to settled: ~800ms.

**Default selected scenario on load:** "Full initiative" — shows all four agents active. This is the most visually complete state and conveys the full capability on first impression.

### Teacher Asset Integration

Position `/assets/capy/teacher.png` at the bottom-right of the section (outside the panel, below and to the right). Width: 120px. It shows the Sage with one finger raised — a teaching pose. This provides visual narrative: the Sage is demonstrating something.

`aria-hidden="true"` — decorative.

The bird (`/assets/capy/bird.png`) appears at 24px width, immediately to the left of the teacher asset, facing it. The bird is watching the lesson.

### Mobile Considerations

On mobile, the teacher and bird assets are hidden (`display: none`) to avoid layout crowding. The panel layout stacks vertically with the scenario selector above and the visualization below.

### Accessibility

- Scenario tabs: proper `role="radiogroup"` and `role="radio"` with `aria-checked` state
- Active/dormant state conveyed by both visual AND text: active agents have `aria-label="CTO — active for this task type"`, dormant ones `aria-label="CEO — not needed for this task type"`
- The task description block updates via live region: `aria-live="polite"` on the task text container
- The spawn visualization SVG should have a text summary injected as a `<title>` that updates with each scenario: "For [scenario name], The Sage activates: [list of active agents]"

---

## Section 4 — Drift Detection Visualization

### Purpose
Make the "20x ROI" claim visceral. Show what happens without the Sage (chaos cascades) vs with the Sage (problems caught at root). The bird as emotional proxy — lost vs guided.

### Layout — Desktop

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    SECTION HEADING: "Drift kills pipelines. The Sage doesn't   │
│    let it."                                                     │
│    Stat: "20x cost of fixing drift late vs. at the root."     │
│                                                                 │
│  ┌──────────────────────┐     ┌──────────────────────┐        │
│  │  WITHOUT THE SAGE    │     │  WITH THE SAGE        │        │
│  │  ──────────────────  │     │  ──────────────────── │        │
│  │  [Chaotic pipeline]  │     │  [Clean pipeline]     │        │
│  │  [Bird: lost]        │     │  [Bird: guided]       │        │
│  └──────────────────────┘     └──────────────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Two equal panels side-by-side. Each panel: `--mg-surface` background, 1px border, 12px border-radius, padding 28px. Between panels: 24px gap. Above panels: section heading and stat line centered.

**Section heading:** `--font-display`, weight 700, `clamp(1.8rem, 3vw, 2.6rem)`. The word "Drift" in `--mg-chili` (#C94D3A). The word "Sage" in `--sage-amber`.

**Stat line:** Displayed as a standalone callout between heading and panels. Format: centered, `--font-mono` 1.4rem, `--sage-amber`. Content: `"20x"` in very large type (3rem), then smaller text beside it: "the cost of catching drift late vs. at source". The `20x` should feel like a punchy metric — large, amber, prominent.

### Left Panel — Without the Sage

**Panel label:** "WITHOUT THE SAGE" in `--font-mono` 0.65rem uppercase, `--mg-chili` (#C94D3A). Letter-spacing 0.12em.

**Background tint:** The panel receives a very subtle red tint on top of `--mg-surface`: `background: linear-gradient(180deg, rgba(201, 77, 58, 0.04) 0%, transparent 60%)`.

**Pipeline diagram:** A vertical sequence of 5 nodes, stacked top to bottom with arrows between them. Each node is a rounded rectangle, 100% panel width, 40px height.

Node sequence (from top):
1. `COMMIT` — border `rgba(138, 155, 176, 0.3)`
2. `CI TESTS` — border `rgba(138, 155, 176, 0.3)`
3. `REVIEW` — border `rgba(201, 77, 58, 0.6)` — first problem: review is shallow
4. `STAGING` — border `rgba(201, 77, 58, 0.8)` — problem propagated
5. `PRODUCTION` — border `rgba(201, 77, 58, 1.0)` — full failure

**Drift arrows:** Starting at node 3 (REVIEW), show diagonal arrows pointing downward-right, growing in size at each stage. These represent problems cascading. Style: SVG arrows, `--mg-chili` (#C94D3A), 1.5px stroke, arrowhead filled. Arrow at node 3: small (8px). Arrow at node 4: medium (12px). Arrow at node 5: large (18px). The arrows are positioned to the right of the node stack, offset so they don't overlap the text.

**Problem label on node 3:** Small tag below node 3, content: "shallow review slipped through". `--font-mono` 0.65rem, `--mg-chili` 70% opacity.

**The bird (lost):** Position `/assets/capy/bird.png` to the left of the pipeline, at node 5 (PRODUCTION) level. Size: 28px. The bird faces LEFT (away from the pipeline). Add a `transform: rotate(-15deg)` to suggest distress — slightly tilted. This is the bird lost at production, confused. Below the bird: `--font-mono` 0.65rem `--mg-subtext`: "lost in production".

### Right Panel — With the Sage

**Panel label:** "WITH THE SAGE" in `--font-mono` 0.65rem uppercase, `--mg-guac` (#4A7C59). Letter-spacing 0.12em.

**Background tint:** Subtle green tint: `background: linear-gradient(180deg, rgba(74, 124, 89, 0.06) 0%, transparent 60%)`.

**Pipeline diagram:** Same 5-node vertical sequence. But now:

Node sequence:
1. `COMMIT` — border `rgba(138, 155, 176, 0.3)`
2. `CI TESTS` — border `rgba(138, 155, 176, 0.3)`
3. `REVIEW` — border `rgba(212, 168, 75, 0.8)` — Sage intercepts here
4. `STAGING` — border `rgba(74, 124, 89, 0.5)` — passes clean
5. `PRODUCTION` — border `rgba(74, 124, 89, 0.7)` — ships clean

**Sage interception indicator:** At node 3 (REVIEW), an intercepting element appears to the right of the node. This is a small amber icon — use the Sage's amber color with a simple pixel-art shield or eye shape (SVG drawn, not an image). Width: 16px. To its right: `--font-mono` 0.65rem `--sage-amber`: "drift caught at root".

**No drift arrows.** The cascade arrows from the left panel are absent. Their absence IS the message.

**The bird (guided):** Position `/assets/capy/bird.png` to the right of the pipeline, at node 3 (REVIEW) level. Size: 28px. The bird faces RIGHT (forward, toward production). No rotation — upright, confident. Below the bird: `--font-mono` 0.65rem `--mg-subtext`: "guided through".

**Small Sage icon:** Below the pipeline in the right panel, center-aligned: `/assets/capy/zen-meditating.png` at 56px width, with a soft amber glow (`box-shadow` on the image). This anchors "Sage = the reason it worked."

### Animation (Scroll-triggered)

When the section enters the viewport:

Left panel (staggered build, designed to feel like watching something go wrong):
1. Nodes 1–2 build in clean (fade up), 300ms stagger
2. Node 3 builds in — immediately, a shake animation (2px left-right, 3 cycles, 200ms) signals the problem
3. Drift arrows draw one by one, 200ms apart
4. Node 4 fades in slightly redder
5. Node 5 fades in at full chili red
6. Bird fades in last, with the `rotate(-15deg)` applied over 400ms

Right panel (250ms delay after left panel starts, designed to feel like watching something go right):
1. All nodes fade in together cleanly, 400ms
2. Sage interception indicator pulses amber once (scale 1 → 1.15 → 1, 400ms)
3. "drift caught at root" text fades in
4. Bird fades in last, upright

**`prefers-reduced-motion`:** Remove all motion. Both panels and their elements appear simultaneously at full opacity with no animation.

### Mobile Considerations

Stack panels vertically. Left panel first (the bad path), right panel second (the good path). Each panel is full-width. Reduce diagram node height to 34px. Bird assets scale to 22px. The drift arrows are shown but scaled proportionally.

### Accessibility

- Panel labels ("WITHOUT THE SAGE", "WITH THE SAGE") serve as visual headings — use `<h3>` elements
- The pipeline diagrams are visual representations — provide a `sr-only` description: "Pipeline without the Sage: a shallow review passes undetected through CI, staging, and reaches production as a failure. Pipeline with the Sage: drift is caught at the review stage and does not cascade."
- The bird images: `aria-hidden="true"` (decorative)
- `--mg-chili` (#C94D3A) on `--mg-surface` (#1E2A38): approximately 4.6:1 — passes AA for normal text. Verify at implementation time.
- The `20x` stat: visually large but ensure it has accessible text. The number and description should be in a single `<p>` or combined `<span>` that reads naturally to screen readers.

---

## Section 5 — Session Management Flow

### Purpose
Explain that the Sage breaks work into right-sized sessions with context snapshots between them. The journey metaphor: chapters in a book, not a sprint to exhaustion. The bird rests; the Sage prepares.

### Layout — Desktop

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    SECTION HEADING: "Sessions, not sprints."                   │
│    Subhead: "The Sage scopes each session, writes context      │
│    bridges, and picks up exactly where you left off."          │
│                                                                 │
│    ┌──────┐   ═══════╗   ┌──────┐   ═══════╗   ┌──────┐      │
│    │  S1  │   BRIDGE  ║   │  S2  │   BRIDGE  ║   │  S3  │     │
│    │      │  ─────── ║   │      │  ─────── ║   │      │      │
│    │ [Sage]  [snap-  ║   │ [Sage]  [snap-  ║   │ [Sage]      │
│    │ works] shot]    ║   │ works] shot]    ║   │ works]      │
│    └──────┘          ║   └──────┘          ║   └──────┘      │
│                                                                 │
│    [Bird resting between sessions, below bridges]             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Horizontal scrolling timeline** on desktop. The track is centered vertically with sessions and bridges laid out horizontally. The section's container is full-width with horizontal overflow hidden; the internal track is scrollable on smaller viewport widths.

Alternatively (and preferred if horizontal scroll is undesirable on desktop): show 3 sessions as a fixed horizontal row at max-width 960px. Bridges are the connectors between sessions.

### Session Nodes

**Session block:** Rounded rectangle, 200px wide × 220px tall. Background: `--mg-surface`. Border: 1px solid `rgba(138, 155, 176, 0.2)`. Border-radius: 12px.

**Session node content (top to bottom within block):**
1. Session number label: `--font-mono` 0.65rem `--mg-subtext` uppercase, e.g. "SESSION 01"
2. Divider line: 1px `rgba(138, 155, 176, 0.15)`, full width
3. Work summary text: `--font-mono` 0.75rem `--mg-text`. 2–3 lines. Example for session 1: "Auth refactor · Rate limiting · Unit tests passing"
4. Small Sage avatar (24px, from `zen-meditating.png` as circular thumbnail): positioned bottom-right of block
5. Status tag at bottom: "completed" in small pill style — `rgba(74, 124, 89, 0.15)` background, `--mg-guac` text, `--font-mono` 0.65rem

**Active session** (the third/rightmost visible session on initial render): receives a left border accent — 3px solid `--sage-amber`. Box-shadow: `0 0 16px 4px rgba(212, 168, 75, 0.1)`. Status tag: "in progress" with `--sage-amber` color.

### Bridge Connectors

The connector between two session blocks represents the Sage writing a context snapshot for the next session.

**Shape:** A horizontal band, same height as session blocks (220px), 120px wide. The left and right edges taper into the session blocks (CSS `clip-path` or SVG). Background: transparent. No border.

**Bridge content (centered within the band):**
1. Small amber dot at the vertical center (8px circle, `--sage-amber`)
2. Vertical dashed line through the dot, `--mg-cilantro` 30% opacity, 1px dashed
3. Label above the dot: `--font-mono` 0.65rem `--mg-subtext`: "context snapshot"
4. Small scrolling text below: `--font-mono` 0.6rem `--mg-subtext` 50% opacity. Two lines: "decisions preserved" / "next scope set"

**The bird in bridges:** Position `/assets/capy/bird.png` at 20px, sitting below the amber dot in the bridge area. The bird's eyes are closed (conveying rest). Note: the existing bird asset has open eyes — if a separate "resting bird" asset is needed, flag to art-director for a new variant. In the interim, use the existing bird and rely on the "resting" label for context.

Below the bird in the bridge area: `--font-mono` 0.6rem `--mg-subtext`: "resting". Centered under the bird.

### The Sage's Role in Bridges

In the third bridge area (to the right of session 2), show `/assets/capy/coding-monk.png` at 72px. This is the Sage at their laptop, writing the context snapshot. Position: centered in the bridge area, with the bridge content above/below it.

This asset should have a subtle amber glow (`filter: drop-shadow(0 0 8px rgba(212, 168, 75, 0.4))`).

### Session Content Examples

Use concrete, believable work — not placeholder text.

| Session | Work summary | Status |
|---|---|---|
| SESSION 01 | Auth refactor · Rate limiting · Tests passing | completed |
| SESSION 02 | Onboarding flow · Feature flags · QA review | completed |
| SESSION 03 | v2 launch prep · Pricing update · Deploy | in progress |

### Bottom Annotation

Below the entire timeline, centered, a short explanatory line in `--font-mono` 0.8rem `--mg-subtext`:

> "Each session has a defined scope. The Sage writes what was decided, what was deferred, and what comes next — so the next session starts sharp."

This text should be set in a block with `max-width: 680px`, centered, with top padding of 32px from the timeline.

### Animation (Scroll-triggered)

When the section enters viewport:
1. Session 1 block slides in from left (24px), fades in, duration 500ms
2. First bridge fades in, duration 300ms, delay 400ms
3. Session 2 block slides in from left (16px), fades in, duration 500ms, delay 600ms
4. Second bridge fades in, duration 300ms, delay 900ms
5. Session 3 block slides in (8px), fades in, duration 500ms, delay 1100ms
6. Birds in bridges fade in last, delay 1400ms

**Idle animation on bridges:** The amber dot in each bridge pulses very gently — opacity 60% to 100% and back, 3s cycle. This suggests the "live" nature of the context handoff.

### Mobile Considerations

On mobile, convert the horizontal layout to vertical. Each session block becomes full-width. The bridge becomes a horizontal divider band between sessions (60px tall). The Sage asset in the bridge is hidden (too much vertical space). The bird remains, at 20px, centered in the bridge band.

### Accessibility

- Session blocks: use `<article>` elements with `aria-label="Session [N]: [work summary]"`
- Bridge areas: `aria-hidden="true"` — they are visual connectors, not interactive content
- The annotation text below the timeline: `role="note"` and visible to screen readers
- Ensure no content is communicated exclusively through the bridge visual — the annotation text covers the key concept
- `prefers-reduced-motion`: remove slide-in animations, keep fade-in only

---

## Section 6 — "Powered by miniature-guacamole" Footer Attribution

### Purpose
Acknowledge the OSS foundation. Respectful, not a footnote afterthought. The miniature-guacamole framework is what makes The Sage possible — treat this like a craftsperson's maker's mark.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                  ─────────────────────────                     │
│                                                                 │
│        [small capy silhouette]    "Powered by"                │
│                                   miniature-guacamole          │
│                                   [github link]                │
│                                                                 │
│                  ─────────────────────────                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Horizontal rule above and below. Full-width section with `--mg-dark` background. Inner content centered, max-width 480px.

### Visual Elements

**Divider lines:** 1px solid `rgba(138, 155, 176, 0.1)`. Full viewport width. Top and bottom.

**Capybara silhouette:** Use `/assets/capy/zen-meditating.png` desaturated (`filter: grayscale(1) brightness(0.4)`), 40px wide. This produces a dark, subtle silhouette effect. Positioned to the left of the text block. Vertically centered with the text.

**Text layout:** Two-column micro layout (flex, align-items center, gap 12px):
- Left: desaturated capy silhouette (40px)
- Right: text stack:
  - "Powered by" — `--font-mono` 0.7rem `--mg-subtext` uppercase, letter-spacing 0.1em
  - "miniature-guacamole" — `--font-mono` 0.9rem `--mg-guac` (#4A7C59), weight 500
  - GitHub link — `--font-mono` 0.7rem `--mg-cilantro`, underline on hover. Text: "github.com/wonton-web-works/miniature-guacamole". Opens in new tab.

### Interaction

On hover of the entire attribution block: the silhouette gently un-desaturates from `grayscale(1)` to `grayscale(0.5)` over 300ms, and the ambient amber warmth slightly increases (`brightness(0.7)`). The miniature-guacamole text gets a subtle `text-shadow: 0 0 8px rgba(74, 124, 89, 0.4)`.

This interaction should feel like the Sage acknowledging you for noticing.

### Spacing

Top padding: 40px from section above. Bottom padding: 40px. The divider lines are at the top and bottom edges of the `40px + content + 40px` block.

### Mobile Considerations

Same layout — no changes needed. The content is small enough to work at any viewport width. The GitHub link should be tappable with a minimum target size of 44px × 44px (wrap in a `<a>` with padding if needed).

### Accessibility

- GitHub link: `aria-label="miniature-guacamole on GitHub (opens in new tab)"`
- `target="_blank"` must include `rel="noopener noreferrer"`
- Silhouette: `aria-hidden="true"` (decorative)
- `role="contentinfo"` on the containing section if this is within the `<footer>` element, otherwise no special role needed

---

## Asset Generation Requests

The following assets need to be generated or do not yet exist. All require art-director approval before use.

### New Assets Needed

| Asset | Description | Suggested source | File path |
|---|---|---|---|
| Bird (resting / eyes closed) | A variant of the bird with closed eyes for session bridge "resting" state | Generate new — pixel art, same palette as `/assets/capy/bird.png` | `/assets/capy/bird-resting.png` |
| Sage interception icon | Small amber eye or shield icon (16×16px) for drift section's "caught at root" indicator | SVG drawn directly in component — no image needed | (inline SVG) |

### Existing Asset Assignments by Section

| Section | Asset file | Role |
|---|---|---|
| Hero | `/assets/capy/zen-meditating.png` | Primary hero illustration |
| Team Hierarchy | `/assets/capy/zen-meditating.png` (cropped) | Sage node avatar |
| Selective Spawning | `/assets/capy/teacher.png` | Teaching pose beside panel |
| Selective Spawning | `/assets/capy/bird.png` | Watching the lesson |
| Drift Detection — right panel | `/assets/capy/zen-meditating.png` | Anchoring the "with Sage" panel |
| Drift Detection — both panels | `/assets/capy/bird.png` | Emotional proxy (lost / guided) |
| Session Management | `/assets/capy/coding-monk.png` | Sage writing context snapshot |
| Session Management | `/assets/capy/bird.png` (or `bird-resting.png`) | Resting between sessions |
| Footer | `/assets/capy/zen-meditating.png` (desaturated) | Silhouette in attribution |

---

## Global Notes for Engineering

### Component Architecture

Each of the six sections maps to a self-contained component:

```
EnterpriseHero.astro
TeamHierarchy.astro (includes TeamHierarchySVG.tsx for connection lines)
SelectiveSpawning.tsx (interactive — requires client-side JS)
DriftDetection.astro (animation only — can be pure CSS/Astro)
SessionFlow.astro
FooterAttribution.astro
```

The `SelectiveSpawning` component is the only one requiring `client:load` hydration (it manages interaction state). All others can be static Astro with CSS animations triggered by IntersectionObserver via a lightweight inline `<script>`.

### IntersectionObserver Pattern

Use a shared utility function `observeSection(element, onEnter)` for all scroll-triggered animations. Threshold: `0.15` (15% of section visible triggers entrance). Do not re-trigger on scroll back up — once entered, stay in the animated state.

### CSS Animation Performance

All animations must use only `transform` and `opacity` (both GPU-composited). Do not animate `box-shadow` directly — use a pseudo-element with `opacity` transition instead for glows. The exception is the Sage node pulse in Section 3 — `box-shadow` animation is acceptable there given the short duration and isolated element.

### Typography Scale Consistency

Use `clamp()` for all responsive heading sizes. Match the existing pattern in `index.astro` for section headings. Do not introduce new type sizes outside the existing type scale unless specified in this doc.

### Image Rendering

All pixel art assets must have `image-rendering: pixelated` to prevent browser interpolation blurring them. Apply this globally to all images within `.capy-asset` class (or similar shared class). This is critical — pixel art looks broken without it.

```css
.capy-asset {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
}
```

### Dark Mode

The site is dark-mode-only. Do not implement light mode. No `prefers-color-scheme` toggles needed.

### Page Integration

This enterprise page is separate from `index.astro`. It should live at `/enterprise` (route: `site/src/pages/enterprise.astro`). It shares the `Base.astro` layout, all tokens, and all components that overlap with the main site.

---

## Open Questions for Art-Director Review

1. **Sage amber token (`--sage-amber: #D4A84B`):** This is new to the palette. Confirm it fits within brand guidelines before adding to `tokens.css`. Note: the `changelog` badges on `index.astro` already use `#D4A84B` for automation badges — this is consistent.

2. **Bird resting variant:** Do we generate a new pixel art asset for the "eyes closed" bird, or do we accept the existing open-eyed bird for the session bridge and use the "resting" label to carry the meaning?

3. **Hero headline copy:** "The Sage knows your entire org." — confirm this is the enterprise value prop or adjust. Engineering should not lock in copy until copy is approved.

4. **Section 3 interactivity scope:** The selective spawning demo is the most complex interactive element. Confirm whether this is in scope for v1 of the enterprise page, or whether a static screenshot-style illustration is acceptable for launch.

5. **Mobile breakpoints:** This spec uses `< 768px` as the mobile breakpoint, consistent with the implied breakpoints in `index.astro`. Confirm if `768px–1024px` (tablet) needs separate treatment for any section.
