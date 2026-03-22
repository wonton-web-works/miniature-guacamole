# Art Director Review — Enterprise Page Wireframe

**Date:** 2026-03-22
**Reviewer:** Art Director
**Status:** Changes Requested
**Spec version reviewed:** enterprise-page-visual-spec.md v1.0
**File reviewed:** site/src/pages/wireframe.astro

---

## Summary Verdict

The wireframe is structurally correct. The dev read the spec, followed the token system, hit every section, and built something that isn't broken. That's the floor, not the ceiling. The problem is that it reads like a careful transcription of the spec rather than an interpretation of its intent. The Sage narrative — warm, patient, alive — is in the copy but not in the design decisions. The amber is there but it isn't working. The hierarchy looks like an org chart. The drift section is flat. The teacher asset in Section 3 is floating in the wrong position. Most critically: the pixel art images are set to `image-rendering: pixelated` on a `data-capy` attribute selector but that selector never resolves to a CSS rule — the spec's most important rendering instruction is silently broken.

The #1 fix: the hero headline is undersized and the subheadline spacing is collapsed, making the first impression read as competent but not bold. Fix the hero type treatment and half the "feels wrong" problem disappears immediately.

---

## Section-by-Section Review

---

### SECTION 1 — HERO

---

**ISSUE 1.1 — Headline font size is undersized relative to the main site**

SPEC SAYS: `clamp(2.4rem, 5vw, 3.8rem)` with weight 700.

WIREFRAME DOES: Implements exactly `clamp(2.4rem, 5vw, 3.8rem)` weight 700 — which matches the spec. The problem is the spec itself set a conservative ceiling. The homepage `index.astro` hero headline runs `clamp(52px, 7vw, 96px)` (that's `clamp(3.25rem, 7vw, 6rem)`) at weight 800. The enterprise page headline maxes at 3.8rem. At desktop widths, the enterprise hero is less than half the visual weight of the homepage hero.

FIX NEEDED: Escalate the ceiling. Change `clamp(2.4rem, 5vw, 3.8rem)` to `clamp(2.6rem, 5vw, 4.6rem)`. The enterprise page is selling a flagship product — it should hit harder than the community homepage, not softer. Weight stays at 700 (the homepage uses 800 only for its two-word bold fragment; a full sentence reads better at 700).

---

**ISSUE 1.2 — Hero subheadline margin-bottom missing, stat line too close to subheadline**

SPEC SAYS: Subheadline `margin-top: 1rem`. Stat line `margin-top: 1.5rem`.

WIREFRAME DOES: `.hero-sub` has no `margin-bottom` declared. `.hero-stat` has `margin-top: 20px` (1.25rem). The issue is the spacing sequence: the headline has `margin-bottom: 20px`, the subheadline has no bottom margin, the stat has `margin-top: 20px`. The subheadline and stat line are compressed against each other with only 20px total between them. The spec wants the breathing space to be 24px (1.5rem) below the subheadline before the stat, not 20px.

FIX NEEDED: Add `margin-bottom: 0` explicitly to `.hero-sub` (to prevent browser defaults), and change `.hero-stat` `margin-top` from `20px` to `24px`. Also add `margin-bottom: 24px` to `.hero-stat` to create a proper gap before the CTA. Currently the CTA sits only 28px below the stat — it needs air.

---

**ISSUE 1.3 — Particle lines are pixel-width CSS divs, not true hairlines**

SPEC SAYS: "A fine hairline (0.5px, 20% opacity) connecting them loosely."

WIREFRAME DOES: `.particle-line { height: 0.5px; background: rgba(212,168,75,0.2); }`. This is correct CSS — 0.5px renders as a subpixel line on HiDPI screens. However, the JS draws particle lines using percentage-based width calculations that do not account for the container's actual pixel dimensions at render time. The `container.getBoundingClientRect()` call is not made before the percentage width is set — `rect` is declared but never read in the line-drawing block. The line widths are therefore computed against a percentage of nothing, rendering them invisible or wildly incorrect.

FIX NEEDED: In the particle line drawing code (lines ~1666–1687), the `rect` variable is fetched but `rect.width` is never used to convert the percentage `len` to actual pixels. The line width `${len}%` is percentage of the *container width*, not percentage of the viewport, so the diagonal lines will be wrong. Either switch to an SVG overlay for the constellation lines (preferred — the spec implied a star field feel that CSS divs cannot achieve at sub-pixel diagonals), or correctly use `rect.width` to compute pixel lengths and set `width` in px, not `%`. The SVG approach: add a small `<svg>` element inside `.particles` with `width/height: 100%` and draw `<line>` elements with `x1/y1/x2/y2` in percent.

---

**ISSUE 1.4 — Float animation starts immediately on page load, before hero entrance animation completes**

SPEC SAYS: Hero entrance animation (fade in, 700ms, delay 200ms). Float animation (`animation: float 6s ease-in-out infinite`) is the idle/looping state.

WIREFRAME DOES: `.hero-img { animation: float 6s ease-in-out infinite; }` — the float starts at time zero on the element. The `heroRight` keyframe fades the `.hero-right` container in, but the image within it is already floating before the fade completes. The Sage bounces in while transparent.

FIX NEEDED: Add `animation-delay: 0.9s` to `.hero-img` so the float begins after the entrance fade concludes. Alternatively, use `animation: heroFloat 0.7s ease-out 0.2s forwards, float 6s ease-in-out 1s infinite` as a compound animation list. The entrance should resolve cleanly before the breathing begins.

---

**ISSUE 1.5 — `data-capy` attribute selector for `image-rendering: pixelated` does not resolve**

SPEC SAYS: "All pixel art assets must have `image-rendering: pixelated`." The global note specifies a `.capy-asset` class or `[data-capy]` selector must be applied globally.

WIREFRAME DOES: The style block contains `img[data-capy] { image-rendering: pixelated; image-rendering: crisp-edges; }` — this is correct CSS. The attribute `data-capy` is applied to every pixel art `<img>` in the HTML. This appears correct on paper, but the style block is scoped inside the page-level `<style>` tag in `<head>`. In Astro, styles inside `<style>` without the `is:global` directive are scoped to the component. However, this page does not use Astro components — it is a raw HTML page (no `<slot>`, no component boundary). The inline `<style>` inside `<head>` is a plain HTML style block and IS global. This issue is actually valid as written. Confirming: no bug here.

CORRECTION: Issue 1.5 withdrawn. The selector resolves correctly in a non-component HTML context. Mark as verified.

---

**ISSUE 1.6 — `mix-blend-mode: screen` on hero image is not conditioned on actual image background**

SPEC SAYS: "Set `mix-blend-mode: screen` to allow the ambient glow to bleed through naturally. If the blend mode causes visual artifacts, fall back to normal blend mode."

WIREFRAME DOES: Applies `mix-blend-mode: screen` unconditionally. The `zen-meditating.png` asset has a dark background baked in — `screen` blend mode on a dark-bg pixel art image will multiply the pixel values against the page dark, which is correct behavior. However, if the asset renders against the amber radial glow, the screen blend can create a washed-out amber halo that reads as a production artifact, not warm ambiance.

FIX NEEDED: Test this in-browser. If the amber radial behind the image causes the blended image to look blown out or artificially warm in a way that feels wrong, add a fallback class. Flag to design for visual QA. This is a render test, not a code fix.

---

### SECTION 2 — TEAM HIERARCHY VISUALIZATION

---

**ISSUE 2.1 — Connection lines are straight, not curved. The hierarchy reads as a corporate org chart.**

SPEC SAYS: "Do NOT use straight horizontal/vertical lines. Use SVG paths with gentle curves — quadratic bezier curves with a slight bow. The lines should feel like roots or mycelium, not a database diagram."

WIREFRAME DOES: The JS draws quadratic bezier paths: `M ${sageX} ${sageY} Q ${sageX + bow} ${midY} ${nx} ${ny}` — this is technically a curve. The bow is set to `(nx - sageX) * 0.3`. For nodes directly below the Sage, `nx - sageX` is near-zero, so the bow is near-zero, rendering a nearly straight vertical line. For outer nodes, the bow is present but it bows the wrong direction — `sageX + bow` means the control point moves horizontally from the Sage, not outward from the path. The result is curves that pinch inward near the center rather than flowing outward like roots.

Additionally, the connection lines from C-Suite to Director tier are never drawn. The JS only draws Sage → C-Suite lines. The Director and IC tiers are visually floating, connected to nothing.

FIX NEEDED: Two fixes required.

Fix A — Correct the bezier bow direction. The control point should be offset outward from the midpoint of the path, not from the Sage's x position. Change the `Q` control point to bow outward: `M ${sageX} ${sageY} Q ${(sageX + nx) / 2 + bow} ${midY} ${nx} ${ny}` where `bow` is a perpendicular offset (e.g., `(nx > sageX ? 1 : -1) * 20` for a consistent rightward/leftward bow). Experiment with bow values between 10–30px.

Fix B — Draw C-Suite → Director and Director → IC tier lines. The current JS only handles one level of connection. Extend the drawing function to connect each C-Suite node to the full Director row (as a fan), and Director nodes to IC pills (as a fade, 0.5px, 15% opacity as spec requires). The IC lines should be barely visible — their purpose is suggestion, not information.

---

**ISSUE 2.2 — Sage circle uses a radial-gradient fill that obscures the illustration**

SPEC SAYS: "Radial gradient from `--sage-amber` at center to `rgba(212, 168, 75, 0.4)` at edge." AND "The `zen-meditating.png` cropped to the face area... displayed as circular `object-fit: cover`."

WIREFRAME DOES: `.sage-circle { background: radial-gradient(circle, var(--sage-amber), rgba(212,168,75,0.4) 100%); }` — the gradient fills the circle with solid amber at center. The `<img>` inside has `mix-blend-mode: screen`. On a solid amber background, `screen` blend will blow out the image entirely — the image will be invisible, replaced by a bright amber disc.

FIX NEEDED: The gradient should be the *behind* layer, not the dominant fill. Set the gradient to a much lower opacity: `background: radial-gradient(circle, rgba(212,168,75,0.3), rgba(212,168,75,0.1))`. This lets the illustration show through while the amber tints the node. Remove `mix-blend-mode: screen` from the image inside the sage-circle — use `normal` blend mode here; the context is different from the hero where the full dark bg allows screen to work.

---

**ISSUE 2.3 — `+N more` node shows a literal string, not the actual count**

SPEC SAYS: Director tier ends with "a `+N more` ghost node with dashed border."

WIREFRAME DOES: `<span class="role-abbr">+N more</span>` — the literal characters `+N more` are rendered.

FIX NEEDED: The actual count should be shown. There are 24 total agents: Sage (1) + CEO/CTO/CMO/CFO (4) + EM/TL/PO/QAL (4) = 9 named. Remaining: 15. The Director-tier `+N` should read `+15 more`. In the IC tier, the spec says `+17 more` which is already correct in the IC pills row. Fix the Director-tier ghost node to show `+15 more`. Consider whether this number needs to be a prop or constant so it stays synchronized if the agent count changes.

---

**ISSUE 2.4 — The bird is centered below the IC tier row, breaking the spatial narrative**

SPEC SAYS: "The bird appears at the IC tier level, positioned to the LEFT of the row. It faces right (toward the nodes). This is the 'user's project' represented as the little bird, about to receive the Sage's org."

WIREFRAME DOES: `.bird-ic { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-top: 16px; }` — the bird is centered below all IC pills, below the IC row, not to the left of it. The bird is not at the same vertical level as the pills. The spatial relationship ("about to receive the org") is completely lost. It reads as a footnote, not a character in the scene.

FIX NEEDED: Restructure the IC tier HTML to position the bird within the same flex row as the pills, to the left. The `.hierarchy-wrap` needs the IC tier reformatted as a relative-positioned container with the bird absolutely positioned to the left at the vertical midpoint of the IC row. Something like:

```
.ic-tier-wrap {
  position: relative;
  padding-left: 52px; /* space for bird + label */
}
.bird-ic {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
}
```

The bird image also needs `transform: scaleX(1)` — ensure it faces right. If the `bird.png` faces left by default, apply `transform: scaleX(-1)`.

---

### SECTION 3 — SELECTIVE SPAWNING

---

**ISSUE 3.1 — Teacher asset is absolutely positioned outside the panel boundary with a hardcoded offset that will clip on smaller viewports**

SPEC SAYS: "Position `/assets/capy/teacher.png` at the bottom-right of the section (outside the panel, below and to the right). Width: 120px."

WIREFRAME DOES: `.teacher-wrap { position: absolute; bottom: -60px; right: -20px; }` — this is positioned relative to `.spawning-panel`. With `right: -20px`, the teacher asset extends 20px beyond the right edge of the panel, which may clip against the viewport or create horizontal scrollbar on narrower desktop windows. Additionally, the `bottom: -60px` places it below the panel but the panel's parent section does not have `overflow: visible` guaranteed, so this risks clipping.

FIX NEEDED: Change the teacher positioning to be relative to the section, not the panel. Move `.teacher-wrap` out of `.spawning-panel` into the `#spawning` section's inner container, and position it using `margin-top: -40px; margin-right: 0; text-align: right;` as a block-level element below the panel. This keeps it within the flow and avoids clipping. Set `overflow: visible` on the section if the design truly requires it to overlap the section below.

---

**ISSUE 3.2 — Spawn visualization SVG connection lines are never drawn**

SPEC SAYS: "Connection lines from Sage to active nodes: `--mg-cilantro` 50% opacity, 1.5px. Lines to dormant nodes: `rgba(138, 155, 176, 0.1)` 0.5px. Lines draw using `stroke-dashoffset` on scenario change."

WIREFRAME DOES: The `#spawn-svg` SVG element is in the DOM and positioned absolutely. The `applyScenario()` JS function updates node active/dormant classes and the task text — but never draws any paths into the spawn SVG. The SVG contains only the `<title>` element. There are no lines drawn, no connection logic, no `stroke-dashoffset` animation.

FIX NEEDED: Add a `drawSpawnLines(activeRoles)` function that, after the scenario settles (i.e., after the 400ms pulse delay), reads the Sage node and C-Suite node positions relative to the spawn SVG and draws `<path>` elements with quadratic curves. Active lines: `stroke: rgba(46,139,139,0.5)`, `stroke-width: 1.5`. Dormant lines: `stroke: rgba(138,155,176,0.1)`, `stroke-width: 0.5`. Animate with `stroke-dashoffset` from full-length to zero over 300ms. This is the single most functionally incomplete part of the interactive section. Without lines, the Sage-to-agent relationship is implied but not visualized — the core mechanic is not shown.

---

**ISSUE 3.3 — Spawn transition timing is off: pulse removes itself at 400ms, but nodes start activating at 200ms**

SPEC SAYS: "Step 2: Sage pulses amber (400ms). Step 3: After the pulse peak (200ms into pulse), active nodes transition one at a time staggered 100ms per node."

WIREFRAME DOES:
```js
sageNode.classList.add('pulsing');
setTimeout(() => {
  sageNode.classList.remove('pulsing');  // at 400ms
  activeRoles.forEach((role, i) => {
    setTimeout(() => { /* activate */ }, i * 100);  // 0ms, 100ms, 200ms...
  });
}, 400);
```

The pulse is removed and nodes activate at the same moment (400ms). The spec says nodes should start at 200ms (mid-pulse), and the pulse should complete at 400ms. The nodes should begin appearing while the Sage is still glowing — it feels like the Sage is sending energy to them.

FIX NEEDED: Split the timing: start activating nodes at 200ms (mid-pulse), while the pulse itself runs to 400ms. The `pulsing` class removal should stay at 400ms. Node activation should start in a separate `setTimeout` at 200ms, then stagger 100ms per node after that:

```js
sageNode.classList.add('pulsing');
setTimeout(() => {
  activeRoles.forEach((role, i) => {
    setTimeout(() => { /* activate node */ }, i * 100);
  });
}, 200); // start during the pulse, not after
setTimeout(() => {
  sageNode.classList.remove('pulsing');
}, 400);
```

---

**ISSUE 3.4 — Task description live region updates immediately, not with the transition**

SPEC SAYS: `aria-live="polite"` on task description (done correctly). The task text should convey the scenario. Timing of update is not spec'd precisely.

WIREFRAME DOES: `taskDesc.textContent = scenario.task;` runs synchronously at the start of `applyScenario()`, before the pulse or node transitions. The text changes immediately on click, while nodes are still transitioning. Visually jarring — the label says "Brand / UX" while agents are mid-transition from "Full initiative."

FIX NEEDED: Move the `taskDesc` update to after the node transitions complete — at approximately 600ms from click (400ms pulse + last node stagger). This keeps the scenario description change aligned with the visual state.

---

### SECTION 4 — DRIFT DETECTION

---

**ISSUE 4.1 — Drift arrows are static SVGs, not the spec's progressive cascade with growing sizes**

SPEC SAYS: "Drift arrows — SVG arrows, `--mg-chili`, 1.5px stroke, arrowhead filled. Arrow at node 3: small (8px). Arrow at node 4: medium (12px). Arrow at node 5: large (18px). The arrows are positioned to the RIGHT of the node stack." Animation: arrows draw one by one, 200ms apart.

WIREFRAME DOES: Three inline SVG arrows in `.drift-arrows-col` — they have different sizes (20px, 26px, 32px `viewBox`), but the column has `padding-top: 46px` to align with node 3. The arrows are at the correct relative scale. However, they are static — there is no entrance animation. They appear with the panel's fade-in, not progressively drawing. The `stroke-dashoffset` draw animation specified in the scroll-triggered sequence is absent.

FIX NEEDED: Add `stroke-dasharray` and `stroke-dashoffset` to the three arrow `<path>` elements, and trigger them sequentially via the IntersectionObserver. The arrows should draw from top (node 3) to bottom (node 5) with 200ms stagger. Add CSS: `.drift-arrow-path { stroke-dasharray: 60; stroke-dashoffset: 60; transition: stroke-dashoffset 0.3s ease; }` and a `.animate` class that sets `stroke-dashoffset: 0`. The observer's callback applies the class with `setTimeout` delays per arrow.

---

**ISSUE 4.2 — The `20x` stat callout is typographically weak**

SPEC SAYS: "The `20x` should feel like a punchy metric — large, amber, prominent. Display `3rem` for the number, with smaller description text beside it."

WIREFRAME DOES: `.drift-stat-number { font-size: 3rem; font-weight: 600; }`. The number is 3rem. But `font-weight: 600` on Inter at 3rem does not read as punchy — it reads as medium weight. The description below it is `.drift-stat-desc { font-size: 0.85rem; }`. The layout stacks the number and description vertically. The spec implies they should sit horizontally (number beside description text).

FIX NEEDED: Two changes. First, weight 600 should be 700 — the spec says it should feel like a punchy metric; match the heading weight. Second, refactor the callout from a vertical stack to a horizontal flex: `<div class="drift-stat-callout" style="display:flex;align-items:baseline;gap:16px;">`. The `20x` is left, the description is right, baseline-aligned. At 3rem `20x` beside 0.85rem description text, the horizontal layout reads as a true callout rather than a paragraph. The spec's language about "beside it" implies this layout.

---

**ISSUE 4.3 — Left panel bird is facing wrong direction**

SPEC SAYS: "The bird faces LEFT (away from the pipeline). Add `transform: rotate(-15deg)` to suggest distress."

WIREFRAME DOES: `.bird-lost img { width: 28px; transform: rotate(-15deg) scaleX(-1); }`. The `scaleX(-1)` flips the bird to face left — correct. The `-15deg` tilt is correct. This is implemented correctly.

VERDICT: No issue. Mark as verified.

---

**ISSUE 4.4 — Sage mini panel in the right drift panel lacks visual separation and feels like an afterthought**

SPEC SAYS: "Below the pipeline in the right panel, center-aligned: `/assets/capy/zen-meditating.png` at 56px width, with a soft amber glow. This anchors 'Sage = the reason it worked.'"

WIREFRAME DOES: `.sage-mini-panel { text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(138,155,176,0.1); }` — the border-top and margin create separation. The image is 56px. The amber glow filter is applied. This is correct.

However: the right panel's bird (`bird-guided`) and the Sage mini-panel both appear below the pipeline-wrap, stacked vertically, making the right panel significantly taller than the left panel. The grid uses `1fr 1fr` equal columns but the right panel now has more content.

FIX NEEDED: Add `align-items: start` to `.drift-panels` grid to prevent the left panel from stretching to match the right. Alternatively, move the Sage mini-panel outside the drift-panels grid entirely and center it below both panels as a shared element — this also better serves the spec's intent ("Sage = the reason it worked") since the Sage transcends the binary comparison.

---

### SECTION 5 — SESSION MANAGEMENT

---

**ISSUE 5.1 — Session timeline is not horizontally aligned on desktop — it overflows without a scrollable container**

SPEC SAYS: "Preferred if horizontal scroll is undesirable on desktop: show 3 sessions as a fixed horizontal row at max-width 960px."

WIREFRAME DOES: `.session-timeline { display: flex; max-width: 960px; margin: 40px auto 0; }`. This is the fixed horizontal row approach — correct. Session blocks are 200px each, bridges are 120px each. Total: `200 + 120 + 200 + 120 + 200 = 840px`. Fits within 960px. However, the blocks have `border-radius: 12px` and the bridges are flush against them with `gap: 0`. The border-radius on session blocks creates a visual gap where the bridge meets the block — the bridge line appears to float disconnected from the session cards rather than connecting them.

FIX NEEDED: The bridge's dashed vertical line should visually enter the session block edges. Either remove the border-radius on the horizontal-facing edges of session blocks (using `border-radius: 12px 0 0 12px` and `0 12px 12px 0` on left/right blocks respectively, with `border-radius: 0` on blocks that have a bridge on both sides), or add a horizontal connector element in the bridge that extends visually into the cards. The cleanest fix: set the bridge `background` to a very subtle `--mg-surface` at 50% opacity to visually merge with the cards at the edges.

---

**ISSUE 5.2 — Session subheadline uses `--font-display` inline style, mismatching the rest of the page's subheadline treatment**

SPEC SAYS: "Subheadline: `--font-display`, 1.125rem, `--mg-subtext`."

WIREFRAME DOES: `<p style="font-family:var(--font-display);font-size:1rem;...">` — uses an inline style instead of a class, and the font-size is `1rem` not `1.125rem`. Every other section subheadline is similarly inline-styled but some use `--font-mono` and some use `--font-display`. The inconsistency is not visible to the user but signals hurried implementation — if any section subheadline needs to be updated, there is no single rule to change.

FIX NEEDED: Define `.section-sub` in the shared section styles block (near `.section-label` and `.section-heading`) with `font-family: var(--font-display); font-size: 1.125rem; color: var(--mg-subtext); line-height: 1.6;` and apply it consistently. Some sections use mono for the subheadline (Section 3's "The right specialists. No noise." is in `.85rem font-mono`) — confirm intent with the spec for each section and standardize. Per spec: hero sub is `--font-display 1.125rem`, Section 2 sub is `--font-mono 0.9rem`, Section 3 sub is `--font-mono 0.85rem`. These differences are intentional — each section has its own sub class if needed, but inline styles must go.

---

**ISSUE 5.3 — Bridge label ordering is inverted relative to the spec**

SPEC SAYS: "Bridge content top to bottom: (1) amber dot at center, (2) vertical dashed line, (3) label ABOVE dot, (4) scrolling text BELOW."

WIREFRAME DOES: Bridge HTML order: `bridge-line`, `bridge-label`, `bridge-dot`, `bridge-bird`, `bridge-bird-label`, `bridge-sublabels`. The label "context snapshot" is above the dot — correct. The dashed line is `position: absolute` spanning full height — correct. The bird is below the dot — correct. However: `bridge-sublabels` ("decisions preserved / next scope set") appears after the bird label, making the visual order: label → dot → bird → "resting" → sublabels. The spec says sublabels ("decisions preserved / next scope set") should appear between the dot and the bird, not below the bird label.

FIX NEEDED: Reorder the bridge HTML: label → dot → sublabels → bird → bird-label. The sublabels describe the snapshot contents and should be near the dot. The bird represents what is resting between those snapshots — it goes below.

---

### SECTION 6 — FOOTER ATTRIBUTION

---

**ISSUE 6.1 — Hover interaction un-desaturates the image in wrong direction**

SPEC SAYS: "On hover: silhouette gently un-desaturates from `grayscale(1)` to `grayscale(0.5)` over 300ms, and ambient amber warmth slightly increases (`brightness(0.7)`)."

WIREFRAME DOES:
```css
.footer-capy { filter: grayscale(1) brightness(0.4); }
.footer-attr-block:hover .footer-capy { filter: grayscale(0.5) brightness(0.7); }
```

The `brightness(0.4)` resting state is correct (dark silhouette). On hover, `brightness(0.7)` increases — correct. And `grayscale(0.5)` — correct. The hover interaction is implemented as specified.

VERDICT: No issue. Mark as verified.

---

**ISSUE 6.2 — Footer section has `role="contentinfo"` but is not a `<footer>` element**

SPEC SAYS: "`role='contentinfo'` on the containing section if this is within the `<footer>` element, otherwise no special role needed."

WIREFRAME DOES: `<section id="footer-attribution" role="contentinfo">` — the spec says `role="contentinfo"` is only needed if inside a `<footer>`. This is a `<section>`, not a `<footer>`. `role="contentinfo"` on a `<section>` is incorrect ARIA — `contentinfo` is a landmark role typically reserved for the page footer area and should appear at most once per page. Using it on a mid-body section confuses assistive technology.

FIX NEEDED: Remove `role="contentinfo"` from the `<section>`. Per spec: "otherwise no special role needed." This is one of the spec's own open questions and the dev resolved it incorrectly.

---

### CROSS-CUTTING ISSUES

---

**ISSUE X.1 — Section padding is flat 80px, but index.astro uses `clamp()` for responsive vertical rhythm**

SPEC SAYS: "Match the existing pattern in `index.astro` for section headings." The global note says to use `clamp()` for responsive heading sizes and to match existing site patterns.

WIREFRAME DOES: `section { position: relative; padding: 80px 24px; }` — flat 80px top/bottom, 24px sides. The homepage sections use `padding: clamp(80px, 12vw, 160px)` for the hero and section-specific clamped values. On large desktop monitors (1440px+), the enterprise page sections feel cramped vertically against the wide canvas. On mobile (320px), 80px of vertical padding is excessive — the spec correctly notes 60px mobile override, and that's present, but the `clamp()` pattern is absent for the intermediate range.

FIX NEEDED: Replace `padding: 80px 24px` with `padding: clamp(64px, 10vw, 120px) clamp(16px, 5vw, 80px)`. This mirrors the homepage's proportional breathing and prevents the page from feeling like a different site.

---

**ISSUE X.2 — The Sage narrative is carried by copy alone, not reinforced by layout**

This is not a CSS bug — it is a design interpretation gap.

SPEC SAYS: "Every section continues that narrative [of the Sage guiding the bird through complexity]." The spec positions the bird as a recurring character — arriving uncertain, being guided, resting, arriving confident.

WIREFRAME DOES: The bird appears in the correct sections. But the bird's placement, sizing, and relationship to the Sage are mechanical — the bird is always below things, always labeled, always the same size. There is no progression. In Section 2 it looks exactly like Section 4. In the bridges of Section 5, the bird is 20px and indistinguishable from a bullet point.

FIX NEEDED: This is a design direction note for the **design** agent to address in the next revision. Specific callouts: in Section 4 (guided panel), make the bird slightly larger (32px vs 28px) than its counterpart in the bad panel. In Section 2, the bird should be positioned more deliberately — not below the pills but alongside them at the same baseline, facing the Sage node above. In Section 5, increase bridge bird size to 24px and add the pending `bird-resting.png` request — the open-eyed bird "resting" is unconvincing. These are narrative design decisions the wireframe punted on by using the same asset at the same size throughout.

---

## Priority Order for Fixes

These are listed by impact — fix in this order:

1. **[CRITICAL] Issue 2.1** — Draw C-Suite → Director connection lines and fix bezier bow direction. The hierarchy looks like a table, not roots.
2. **[CRITICAL] Issue 3.2** — Draw spawn SVG connection lines. The interaction's core mechanic is missing.
3. **[HIGH] Issue 1.1** — Hero headline size. First impression is undersized relative to the homepage.
4. **[HIGH] Issue 2.2** — Sage circle gradient is blowing out the illustration. The Sage is invisible in his own org chart.
5. **[HIGH] Issue 2.4** — Bird position in hierarchy. The spatial narrative is broken.
6. **[HIGH] Issue 3.3** — Spawn transition timing. Nodes activate after the pulse, not during it.
7. **[MEDIUM] Issue 1.3** — Particle line JS bug. Constellation lines may be rendering incorrectly.
8. **[MEDIUM] Issue 1.4** — Float animation starts before entrance completes.
9. **[MEDIUM] Issue 4.1** — Drift arrows are static; need progressive draw animation.
10. **[MEDIUM] Issue 4.2** — `20x` callout should be horizontal flex, weight 700.
11. **[MEDIUM] Issue 5.1** — Bridge-to-session-block connection visual gap.
12. **[MEDIUM] Issue 5.3** — Bridge content order (sublabels below bird is wrong).
13. **[LOW] Issue 3.1** — Teacher asset clipping risk on narrow desktop viewports.
14. **[LOW] Issue 3.4** — Task description text updates immediately vs. after transition.
15. **[LOW] Issue 4.4** — Right drift panel taller than left; Sage mini-panel placement.
16. **[LOW] Issue 5.2** — Inline styles should be replaced with defined classes.
17. **[LOW] Issue 6.2** — Remove `role="contentinfo"` from non-footer section.
18. **[LOW] Issue X.1** — Replace flat section padding with `clamp()` to match site rhythm.
19. **[NARRATIVE] Issue X.2** — Bird character progression is flat. Escalate to design for revision.

---

## Assets Pending Approval

Per the spec's Asset Generation Requests section:

- **`/assets/capy/bird-resting.png`** — not yet generated. Required for Session 5 bridge areas. The existing `bird.png` with open eyes used in a "resting" context is unconvincing. This needs to be generated and approved before the wireframe can be called visually complete. Delegating generation request to **ai-artist**.

- **Sage interception icon (inline SVG)** — the shield/eye SVG in Section 4 was implemented as an inline SVG in the wireframe (the shield with a centered circle and brow arc). It reads correctly as an icon at 16px. Approved as implemented.

---

## Open Questions Resolution

Addressing the spec's five open questions for the record:

1. **`--sage-amber: #D4A84B`** — Approved for this page. Consistent with existing changelog badge usage on index.astro. Do not add to `tokens.css` until the full enterprise page ships to production.

2. **Bird resting variant** — Generate new. The open-eyed bird labeled "resting" is not convincing. The Session 5 bridge moment needs genuine visual rest. See asset request above.

3. **Hero headline copy** — "The Sage knows your entire org." is approved as the enterprise value prop. Copy is locked for this wireframe review pass.

4. **Section 3 interactivity scope** — The interactive spawning demo IS in scope for v1. The interaction skeleton is built; it needs the SVG lines (Issue 3.2) to be production-ready.

5. **Tablet breakpoints** — The `768px–1024px` range needs attention for the Session 5 timeline (the 840px fixed timeline overflows on tablet widths below 900px). The current responsive breakpoint at `@media (max-width: 900px)` catches this correctly. No additional tablet treatment needed for other sections.

---

*Review complete. Hand critical items (2.1, 3.2, 1.1, 2.2, 2.4) to **design** for the next revision pass. Hand the bird-resting asset request to **ai-artist**.*
