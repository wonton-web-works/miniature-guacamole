# Enterprise Page — Final Visual Review
**Reviewed by:** Art Director
**Date:** 2026-03-22
**Source files reviewed:**
- `/Users/byaizaki/miniature-guacamole/site/src/pages/enterprise.astro`
- `/Users/byaizaki/miniature-guacamole/site/src/scripts/enterprise.ts`
- `/Users/byaizaki/miniature-guacamole/site/src/styles/tokens.css`
- `/Users/byaizaki/miniature-guacamole/docs/design-specs/enterprise-page-visual-spec.md`

---

## Methodology

This review cross-references the implemented CSS against the visual spec at three breakpoints. Media query thresholds found in the implementation:

| Breakpoint | Rule |
|---|---|
| Mobile (sessions) | `max-width: 900px` |
| Mobile (most sections) | `max-width: 767px` |
| Mobile (capabilities, CTA) | `max-width: 640px` |
| Desktop assumed baseline | No min-width guard — styles apply from 0 up and are overridden downward |

No explicit tablet range (768px–1199px) is defined. This is the primary structural gap across all sections.

---

## DESKTOP (1200px+)

### HERO

**Layout:** PASS. Two-column grid at `55% / 45%` is correctly implemented. `hero-inner` max-width 1200px with `gap: 40px` and `align-items: center`. The illustration is `justify-content: center` within `hero-right`.

**Typography — ISSUE (minor):**
The hero headline uses `clamp(3rem, 6vw, 5rem)`. At exactly 1200px, `6vw = 72px = 4.5rem` — within the clamp range, correct. However, the spec called for `clamp(2.4rem, 5vw, 3.8rem)`. The implemented range goes significantly larger (max 5rem vs spec 3.8rem). At 1400px+ the headline is `5rem / 80px` — this is large but defensible for an enterprise hero. Not a blocker but deviates from spec sizing.

**FIX (low priority):** Align with spec: `clamp(2.4rem, 5vw, 3.8rem)` if the product team wants tighter headline sizing. As-implemented the larger value is visually appropriate for the content.

**Image — ISSUE (moderate):**
The hero image uses an actual asset path (`sage-pixel-hero-gathering-for-web.png`) that differs from the spec (`zen-meditating.png`). The spec also called for `mix-blend-mode: screen` on the hero image; the hero image itself does not have this applied (it's `position: relative; z-index: 3` but no blend mode). The `spawn-sage-node img` does use `mix-blend-mode: screen`, and the hierarchy sage image does not. This inconsistency needs confirmation that the custom asset renders correctly without the blend mode.

**FIX:** Verify `sage-pixel-hero-gathering-for-web.png` has a transparent background. If it has a baked-in dark background, apply `mix-blend-mode: screen` to `.hero-img` to let the terminal glow bleed through as specced.

**Constellation particles — PASS:**
JS-generated at 14 positions (spec called for 12–16). Three pulses correctly defined. Lines between `[0,1],[1,3],[3,7],[2,6]` — four connections, which is within the spec's "4–5" guideline. Particle positions are all within the right quadrant of the container (x: 30–95%, y: 8–90%), which is correct per spec.

**Spacing — PASS:** Section padding `72px 24px 56px` — appropriate for desktop hero.

**Value props section (1b):**
Three-column grid at `repeat(3, 1fr)` with `gap: 32px` inside a `max-width: 900px` container. Each column is approximately 276px at max-width — sufficient for the text content.

**Value props — ISSUE (minor):**
The mobile override for `.value-props` targets `#value-props > .section-inner > div:first-child` with `grid-template-columns: 1fr !important` — but the actual markup uses a `<ul>` element, not a `<div>`. This selector will not match. The mobile stacking for value props relies on a broken selector.

**FIX (blocker):** Change the mobile media query selector from `div:first-child` to `ul:first-child`, or apply the grid directly to the `<ul>` with a class and target that class. The mobile stacking for value props will fail without this fix.

---

### TEAM HIERARCHY

**Layout — PASS:** `.hierarchy-wrap` max-width 900px centered. Sage node with 80px circle, tier rows with `flex-wrap: wrap`. Correct.

**SVG connection lines — ISSUE (moderate):**
The SVG `hierarchy-svg-layer` is present and sized `position: absolute; inset: 0` on `.hierarchy-wrap`. However, the hierarchy SVG lines comment reads `<!-- Lines drawn by JS after layout -->` and there is no code in `enterprise.ts` that draws these lines. The `drawSpawnLines()` function exists only for the spawning panel. The hierarchy bezier connections from the spec (Sage to C-Suite, C-Suite to Director tier, Director to IC tier) are absent entirely.

**FIX (blocker):** Implement a `drawHierarchyLines()` function, or move the hierarchy lines to static SVG positioned behind the tier rows using pre-calculated coordinates. The organic bezier look from the spec is essential to the section's visual narrative.

**Node sizing — PASS:** C-suite nodes at `120px × 56px`, director nodes at `90px × 44px`, IC pills at `height: 28px` with `border-radius: 14px`. All match spec.

**CTO border color — PASS:** Implementation correctly uses `#4A9ABF` (lightened from the `--mg-cto` token's `#2E6E8E` which fails contrast). Spec explicitly called this out. Good.

**+N more node — ISSUE (minor):**
The DOM shows `+N more` as literal text. This should resolve to an actual count at render time (the spec says "+N more" as a placeholder, implying the real number should be calculated from the total agent count minus displayed agents). Currently it says "N" literally.

**FIX (low priority):** Replace with the actual number — `+17 more` if 7 are shown out of 24 total, or calculate dynamically.

**Spawning table — PASS:**
The spawning table below the hierarchy is well-formed. `.spawning-table` has appropriate font sizing, `.spawn-tag` elements are correctly styled. The "CMO/COO" tag is used correctly.

---

### SELECTIVE SPAWNING

**Layout — PASS:** Panel at `grid-template-columns: 35% 65%`, `gap: 32px`, `padding: 32px`, `max-width: 900px`. This matches spec.

**Teacher asset — ISSUE (moderate):**
`.teacher-wrap` is `position: absolute; bottom: -60px; right: -20px`. The `.spawning-panel` has `position: relative` and `overflow: hidden` — which will clip the teacher asset that extends `-60px` below the panel. The teacher and bird will be invisible on desktop because the panel clips them.

**FIX (blocker):** Remove `overflow: hidden` from `.spawning-panel`, or change the teacher positioning to be relative to the section rather than the panel. The spec placed the teacher "at the bottom-right of the section (outside the panel, below and to the right)" — this implies the teacher should be relative to the section, not the panel. Move `.teacher-wrap` outside `.spawning-panel` and position relative to `#spawning`.

**Spawn node sizing — MINOR DEVIATION:** Spawn nodes are `100px × 52px` vs spec's C-suite nodes at `120px × 56px`. This is intentionally smaller for the visualization panel — acceptable given the constrained right column.

**Scenario tab keyboard behavior — PASS:** Arrow key roving tabindex is implemented correctly per ARIA APG radiogroup pattern.

**SVG line drawing — PASS:** `drawSpawnLines()` is called after scenario transitions. Bezier bow implementation uses `Q` quadratic curves with bow factor based on horizontal offset direction. Matches the organic feel from spec. Active lines draw via `stroke-dashoffset` animation.

---

### DRIFT DETECTION

**Layout — PASS:** `grid-template-columns: 1fr 1fr` with `gap: 24px`, `max-width: 900px`.

**Pipeline nodes — PASS:** Borders match spec exactly — escalating chili red on the bad panel, amber intercept + guac green on the good panel.

**Drift arrows — ISSUE (minor):**
The drift arrow column uses `padding-top: 46px` to align with the pipeline. The arrows are three SVGs of increasing size (24px, 30px, 36px viewBox). However, the pipeline has 5 nodes at `height: 40px` each with `gap: 6px`, so total pipeline height is `5×40 + 4×6 = 224px`. The drift arrows start aligned at node 3 (index 2), so they should begin at approximately `2×46px = 92px` from top. The `padding-top: 46px` only accounts for one node height — the arrows will start too early, aligning with node 2 (CI TESTS) rather than node 3 (REVIEW).

**FIX (moderate):** Change `.drift-arrows-col padding-top` from `46px` to `92px` (two nodes × 46px effective height including gap) to align the first arrow with the REVIEW node.

**`--mg-chili-rgb` custom property — ISSUE (moderate):**
`.drift-problem-tag` uses `color: rgba(var(--mg-chili-rgb, 201,77,58),0.7)`. The token `--mg-chili-rgb` is not defined anywhere in `tokens.css` or the page-scoped `:root`. The fallback `201,77,58` will be used, which is correct numerically, but the implementation relies on undefined variable with a fallback. This is fragile.

**FIX (low priority):** Replace with `color: rgba(201,77,58,0.7)` directly, or add `--mg-chili-rgb: 201,77,58` to the page-scoped `:root`. The current fallback works but is a maintenance hazard.

**20x stat callout — PASS:** `.drift-stat-number` at `3rem` amber, `.drift-stat-desc` at `0.85rem` subtext. Punchy and prominent as specced.

**Drift narrative (compare strip, metrics, cascade story) — PASS:** All community vs enterprise comparison content is well-structured. The `.drift-compare-strip` two-column grid and `.metrics-grid` two-column grid are correct. Cascade story formatting matches spec — left border blockquote with prefix.

---

### CAPABILITIES (Section 4b)

**Layout — PASS:** `.capability-stack` max-width 760px, numbered list with `grid-template-columns: 3.5rem 1fr` per capability row. Clean vertical list at desktop.

**Benchmark callout — PASS:** `.bench-grid` at `repeat(2, 1fr)`. Four metrics correctly displayed.

---

### SESSIONS

**Layout — PASS:** `.session-timeline` as flexbox row with `overflow-x: auto` on smaller viewports. Three session blocks at `width: 200px` each (`flex-shrink: 0`) with two bridge connectors at `width: 120px`. Total content width: `3×200 + 2×120 = 840px` — fits within `max-width: 960px` container with room to breathe.

**Bridge monk asset — ISSUE (minor):**
Bridge 2 references `/assets/capy/coding-monk.png` at the original path (not the `sage-character/` subdirectory). All other assets use the `sage-character/` path. Verify this asset exists at `/assets/capy/coding-monk.png` or update the path.

**FIX (potential blocker):** Confirm `/assets/capy/coding-monk.png` exists. If not, update path to match the other assets under `sage-character/`.

**Active session styling — PASS:** `border-left: 3px solid var(--sage-amber)` on `.session-block.active`, with `box-shadow: 0 0 16px 4px rgba(212,168,75,0.1)`. Matches spec.

---

### CTA

**Layout — PASS:** `text-align: center`, `cta-actions` with `flex-wrap: wrap` and `justify-content: center`. Two buttons properly styled.

**Focus ring — PASS:** Both CTA buttons have `outline: 2px solid var(--sage-amber)` on `focus-visible`. Note: the hero `cta-primary` focus ring uses `--mg-lime-zest` (spec-correct for that button). The section 6 CTA buttons use `--sage-amber` — this is a minor inconsistency but both are visible. Acceptable.

**Touch target — PASS:** Buttons at `padding: 0.8rem 1.75rem` with `font-size: 0.9375rem` will produce a height well above 44px.

---

### FOOTER ATTRIBUTION

**Layout — PASS:** `justify-content: center`, flex row with silhouette and text stack. `gap: 12px`.

**Silhouette filter — PASS:** `filter: grayscale(1) brightness(0.4)`. On hover: transitions to `grayscale(0.5) brightness(0.7)`. Note the spec says "un-desaturates to grayscale(0.5)" on hover — implementation matches. The brightness value in spec was `brightness(0.7)` which matches.

**GitHub link touch target — PASS:** `.footer-gh-link` has `min-height: 44px` with `display: flex; align-items: center`. Correct.

**`rel="noopener noreferrer"` — PASS:** Present on both GitHub links.

---

## TABLET (768px – 1199px)

There are no explicit media queries for this range. All tablet behavior is inherited from desktop styles.

### HERO — TABLET

**Layout — ISSUE (blocker):**
The hero grid is `grid-template-columns: 55% 45%` with no tablet override. At 768px, this gives left column `~422px` and right column `~346px` with `gap: 40px`. The right column `hero-img` has `width: 340px; max-width: 100%` so it fills most of the column. The headline at `clamp(3rem, 6vw, 5rem)` renders at `6vw = 46px = ~2.9rem` at 768px — this is the minimum of the clamp range effectively. The layout holds but it is tight.

At 900px: left column is `495px`, right is `405px`. Comfortable.
At 768px: the two-column layout is functional but cramped. The left column's `hero-callout` has `max-width: 480px` which can overflow the 422px column.

**FIX (moderate):** Add `max-width: 100%` to `.hero-callout` or drop the fixed max-width at tablet. Current behavior will cause `hero-callout` to overflow its column by ~58px at 768px viewport.

### VALUE PROPS — TABLET

**Issue (moderate):**
Three columns at tablet widths: `repeat(3, 1fr)` in a `max-width: 900px` container. At 768px with `24px` horizontal section padding, the inner container is `720px`. Each column is `~216px` — tight but usable for the text lengths involved. No overflow, but the text is compressed.

**Observation:** The `.hero-quality-desc` has `max-width: 440px` on the description text. In a 216px column, this max-width has no effect and text wraps naturally at column width. That is fine.

### HIERARCHY — TABLET

**Layout — ISSUE (moderate):**
C-suite row is `display: flex; flex-wrap: wrap; gap: 20px`. Four nodes at `120px` each plus gaps = `4×120 + 3×20 = 540px`. This fits within any tablet width.

Director row: five nodes at `90px` each = `5×90 + 4×20 = 530px`. Fits at tablet.

IC row: seven pills plus wrapping. IC pills have variable width based on content but `padding: 0 12px` on a `height: 28px` base. At tablet widths these will wrap to two rows — which is acceptable but was not explicitly designed for. The wrapping behavior is graceful given `flex-wrap: wrap`.

**No blocker here, but note:** IC pills wrapping to two rows at tablet looks slightly awkward against the rigid tier structure above. Consider setting `max-width: 700px` on `.ic-row` at tablet to force deliberate wrapping.

### SPAWNING — TABLET

**Layout — ISSUE (moderate):**
The spawning panel at `35% / 65%` split in a `max-width: 900px` container at 768px:
- Panel will span `~720px` (viewport minus 48px section padding)
- Left column: `~252px`, right column: `~468px`
- Four spawn nodes at `100px` each + `gap: 12px` = `4×100 + 3×12 = 436px` — fits in 468px right column

This is workable, but note: scenario tab text at `font-size: 0.8rem` in a 252px column wraps at "Engineering + product" (longest tab label). Tabs have no `white-space: nowrap` on desktop, so they wrap — this produces tabs of uneven height.

**FIX (minor):** Add `white-space: nowrap` to `.scenario-tab` on desktop, or accept the wrap and ensure consistent padding maintains visual alignment. At tablet the wrapping creates visual inconsistency in the left panel.

### DRIFT — TABLET

**Layout — PASS:** At 768px the two-panel `1fr 1fr` grid remains side-by-side. Each panel is `~340px`. Pipeline nodes at `100%` width within the panel fill correctly. No overflow expected.

### SESSIONS — TABLET

**Layout — ISSUE (moderate):**
The sessions breakpoint triggers at `max-width: 900px`, converting to vertical stack. This means sessions convert to stacked layout at tablet as well as mobile. For a 900px tablet, the horizontal layout with `840px` of content would fit — but is intentionally broken to vertical at 900px.

**Observation:** This is arguably the right call for tablets — the horizontal session blocks at `200px` wide are too narrow for comfortable reading at tablet. The vertical stack at tablet is a reasonable design decision, though the spec only mentioned converting to vertical on mobile. Not a blocker, just a deviation from spec intent.

**At the vertical stack:** session blocks become `width: 100%; max-width: 400px`. Bridge connectors become horizontal bands at `min-height: 80px`. Bridge monk is hidden at `display: none`. This all functions correctly.

### CAPABILITIES — TABLET

**Layout — PASS:** The `.capability` grid `3.5rem 1fr` is not modified at tablet. At 768px the `3.5rem` marker column is `56px` — proportionally correct. The `max-width: 760px` content area will be `~720px` at 768px viewport, which is nearly full-width with padding. Fine.

---

## MOBILE (< 768px)

### HERO — MOBILE

**Layout — PASS:** At `max-width: 767px`, the grid stacks to `grid-template-columns: 1fr` and `.hero-right` gets `order: -1` (illustration first). `hero-img` becomes `width: 100%; max-width: 280px` — centered within the right column. Hero padding reduces to `48px 20px 40px`.

**ISSUE (moderate) — Illustration centering:**
When the grid stacks to single column, `.hero-right` uses `justify-content: center` but the parent grid cell is full-width. The `max-width: 280px` image will be centered correctly only if the `.hero-right` flex container takes full width. Since it's a grid item set to `display: flex; justify-content: center`, and the grid is `1fr`, this should center correctly. Verify on device — the flex context inside a grid item can sometimes produce unexpected behavior.

**Typography — PASS:** At 320px, `clamp(3rem, 6vw, 5rem)` = `3rem` (minimum clamp). 48px headline on mobile is large. The `max-width: 520px` on `.hero-lede` has no effect on mobile (will fill column), which is correct.

**ISSUE (blocker) — Value props mobile selector:**
As noted in the desktop section: `#value-props > .section-inner > div:first-child` targets a `<div>`, but the markup uses `<ul>`. At mobile, value props will NOT stack to single column. Three columns at `repeat(3, 1fr)` in a `~280px` container means each column is `~75px` — far too narrow. This is a real rendering failure on mobile.

**FIX (blocker):** Fix selector to `#value-props > .section-inner > ul:first-child` or add a class to the `<ul>` and target that directly.

**ISSUE (minor) — `.hero-callout` mobile width:**
`.hero-callout` has `max-width: 480px` and `margin-top: 2rem`. On mobile in a single-column layout, this is constrained by the column width. No explicit override exists but `max-width` will yield to the narrower column — this is fine.

**ISSUE (minor) — `hero-qualities` border-left:**
`.hero-qualities` has `border-left: 2px solid var(--mg-cilantro)` with `padding-left: 1.5rem`. The qualities block is inside the hero left column. On mobile, this left border is still visible. At narrow widths the `padding-left: 1.5rem` reduces the available text width to `~224px` on a 320px device — tight but readable for the `.hero-quality-word` (1rem) and `.hero-quality-desc` (0.875rem) fonts.

Note: The hero qualities block is NOT shown in the mobile hero section — looking at the HTML, `.hero-qualities` is not present in the hero markup. The hero markup contains `.hero-headline`, `.hero-lede`, `.hero-stat`, and `.cta-primary`. The qualities are in the separate `#value-props` section. This is correct.

### HIERARCHY — MOBILE

**Layout — PASS:** Mobile override at `max-width: 767px` reduces `.sage-circle` to `60px × 60px` and `.csuite-node` to `90px × 48px` with `gap: 10px`. Four nodes at `90px + 3×10 = 360px` — fits within `~280px` mobile width with wrapping.

**ISSUE (moderate) — C-suite wraps to two rows on mobile:**
With `flex-wrap: wrap`, four 90px nodes in a ~280px container (with 10px gaps): `90+10+90+10+90 = 280px` — three nodes per row maximum, so the fourth wraps. This is a two-row C-suite on small mobile. Not specified in the spec.

**FIX (minor):** At mobile, reduce csuite-node width to `80px` or decrease gap to `6px` to maintain a single row: `4×80 + 3×6 = 338px` still too wide for 280px. A 2-row layout is unavoidable at 320px with four nodes. Consider reducing to `60px × 44px` nodes at mobile with `gap: 8px`: `4×60 + 3×8 = 264px` — fits. Update mobile override.

**ISSUE (moderate) — Director row overflow on mobile:**
Five director nodes at `90px` each: `5×90 + 4×10 = 490px` — will wrap to two rows on mobile even more severely. The spec mentioned the hierarchy should compress to horizontal pill rows on mobile. The director tier with five nodes will wrap to 2–3 rows in a disorganized pattern.

**FIX (moderate):** Reduce director node width to `70px` at mobile. `5×70 + 4×6 = 374px` — still wraps at 280px. A third row is unavoidable for 5 nodes. Alternatively, hide the "+N more" ghost node on mobile to show only 4 director nodes: `4×70 + 3×6 = 298px` — wraps but only once. Add `display: none` on `[data-role="more"]` at mobile.

**SVG hierarchy lines:** Still absent (see desktop blocker). On mobile this is the same issue.

### SPAWNING — MOBILE

**Layout — PASS:** Grid stacks to `1fr`. Panel padding reduces to `20px`. Teacher wrap hidden (`display: none`). Tabs become horizontal scroll (`flex-direction: row; overflow-x: auto; scrollbar-width: none`). Tabs get `min-width: 110px; font-size: 0.75rem; white-space: nowrap`.

**ISSUE (minor) — scroll indicator:**
The horizontal tab strip has no visual indicator that it scrolls horizontally. On mobile, users won't know the "Brand / UX" and "Full initiative" tabs exist if "Engineering + product" is the last visible one. Add a fade-out gradient on the right edge to indicate scrollability.

**FIX (low priority):** Add a `::after` pseudo-element on `.scenario-tabs` with `background: linear-gradient(to right, transparent, var(--mg-surface))` positioned at the right edge, only shown when tabs overflow. This is a standard pattern for scroll hints.

**Spawn nodes on mobile — ISSUE (moderate):**
After stacking, the `.spawning-right` shows the Sage node and four spawn nodes. The spawn nodes are `100px × 52px` in a `flex-wrap: wrap` row. In the single-column panel at mobile width (~280px inner), four nodes: `4×100 + 3×12 = 436px` — overflows the panel. They will wrap to two rows.

**FIX (moderate):** Add a mobile override for `.spawn-csuite-row` to reduce node width: `width: 80px` gives `4×80 + 3×12 = 356px` — still overflows. At mobile the spawn nodes should also reduce: `width: 60px` and `font-size: 0.75rem` gives `4×60 + 3×8 = 264px` — fits at 280px inner. Add to the `@media (max-width: 767px)` block for the spawning section.

### DRIFT — MOBILE

**Layout — PASS:** Panels stack to single column (`grid-template-columns: 1fr`). VS connector badge appears (`display: flex`). Mobile intro paragraph appears. Pipeline node height reduces to `34px` at mobile.

**ISSUE (moderate) — VS connector placement:**
`.drift-vs-connector` appears in the DOM between `.drift-panel.bad` and the right panel `div`. The bad panel has `reveal reveal-up` and a transition-delay. Since this connector is not in the grid (it's a flex child of `.drift-panels` which is a grid), it will be treated as a grid item in the `1fr` single-column grid. The connector badge will get full column width and `display: flex` — this will center the badge correctly. Acceptable, though the connector has `display: none` on desktop and `display: flex` at mobile — correct.

**ISSUE (minor) — `drift-compare-strip` and `metrics-grid` at mobile:**
Both grids become single column at mobile: `grid-template-columns: 1fr`. This is correct for `drift-compare-strip`. `metrics-grid` also becomes `1fr` at mobile — four metric cards stack vertically. Each card at `1.5rem` padding with `2.5rem` metric numbers is comfortable reading. PASS.

**ISSUE (moderate) — Cascade story padding at mobile:**
`.cascade-story` has `padding: 2rem 2.25rem`. At 280px inner width, `2×2.25rem = 72px` of horizontal padding leaves `208px` for content. At `font-size: 0.9375rem` (~15px) and `line-height: 1.75`, this is `~12 characters per line` — the text wraps into many short lines, making it hard to read.

**FIX (moderate):** Reduce `cascade-story` padding to `1.25rem 1rem` at mobile for comfortable reading width.

### CAPABILITIES — MOBILE

**Layout — PASS:** At `max-width: 640px`, `.capability` grid changes from `3.5rem 1fr` to `2.5rem 1fr` with `gap: 1rem`. `.bench-grid` reduces to `1fr`. These are correct.

**ISSUE (minor) — `.snapshot-pre` white-space:**
`.snapshot-pre` has `white-space: pre` and `overflow-x: auto`. The pre-formatted context snapshot content contains long lines (e.g., the `deferred:` and `next_session:` lines). On mobile these will scroll horizontally inside the pre block. The `overflow-x: auto` handles this, but a horizontal scroller within a vertical scroll page is a poor UX on mobile.

**FIX (low priority):** Consider `white-space: pre-wrap` on mobile to allow the pre content to reflow. The monospace formatting is preserved but lines wrap. This requires a media query override on `.snapshot-pre`.

### SESSIONS — MOBILE (via the 900px breakpoint)

**Layout — PASS:** Vertical stack with session blocks at `max-width: 400px`, centered. Bridges become horizontal bands at `min-height: 80px`. Bridge line rotates to horizontal. Monk hidden. Bridge content goes `flex-direction: row` with content centered.

**ISSUE (moderate) — Bridge horizontal content alignment at mobile:**
When the bridge becomes `flex-direction: row`, the bridge content (`bridge-label`, `bridge-dot`, `bridge-bird`, `bridge-bird-label`, `bridge-sublabels`) all become horizontally arranged children. The `bridge-line` positions via `top: 50%; width: 100%; height: 1px` — correct for horizontal orientation. But the `bridge-dot` is `position: relative; z-index: 1` in the flex row alongside text labels. The intended centered amber dot with labels above/below it is not achievable in a horizontal `flex-direction: row` without a nested layout.

**FIX (moderate):** At the `max-width: 900px` breakpoint, wrap bridge content in an inner container that remains `flex-direction: column` (dot, label, bird) while the outer bridge container is `flex-direction: row`. Or simplify the mobile bridge to: centered dot only, with no labels, to avoid the layout collision.

### CTA — MOBILE

**Layout — PASS:** At `max-width: 640px`, `.cta-actions` goes `flex-direction: column; align-items: center`. Buttons become stacked, centered.

**Touch targets — PASS:** Button padding `0.8rem 1.75rem` at 0.9375rem font produces approximately 52px height — above the 44px minimum.

**ISSUE (minor) — CTA buttons at very narrow widths:**
At 320px, centered buttons in a column layout may exceed the viewport width if their text is long. "Talk to us" is short; "View on GitHub" is longer. No `width: 100%` is applied to mobile CTA buttons. They will size to content. At 320px this should be fine, but adding `width: min(100%, 280px)` to `.cta-btn-primary` and `.cta-btn-secondary` in the mobile rule provides a safer bound.

**FIX (low priority):** Add `width: min(100%, 280px)` to CTA buttons in the `max-width: 640px` block.

### FOOTER — MOBILE

**Layout — PASS:** The footer is a centered flex block — functions identically at all widths. GitHub link text (`github.com/wonton-web-works/miniature-guacamole`) is `0.7rem` and may overflow on very narrow screens (320px). The `footer-attr-block` has no `overflow: hidden` and the link has no `word-break`.

**FIX (minor):** Add `word-break: break-all` or `overflow-wrap: break-word` to `.footer-gh-link` to prevent the URL from overflowing on 320px devices.

---

## MISSING BREAKPOINT COVERAGE

### 640px – 767px (between mobile breakpoints)

This gap range inherits from the `767px` block. Most sections are in single-column layout. The capability section switches at `640px`. No issues identified in this gap — the two different breakpoints serve distinct purposes and the gap is covered by the broader `767px` rules.

### 480px and below (very small mobile)

No specific rules. At 320px–375px:
- Hero headline `clamp(3rem, ...)` minimum of `3rem = 48px` — large for a 320px screen. Consider a lower minimum: `clamp(2.2rem, 8vw, 3rem)` for mobile. At 375px: `8vw = 30px = 1.875rem` — too small. `clamp(2rem, 7vw, 3rem)` gives `~26px` at 375px as the floor. This is still large. The `min` of `3rem` is aggressive for very small mobile.

**FIX (low priority):** The general `section-heading` mobile override in the responsive tweaks block does address headings: `.section-heading { font-size: clamp(1.5rem, 6vw, 2rem) }` at `max-width: 767px`. But the hero headline uses a separate class `.hero-headline` and is NOT overridden at mobile. Add a mobile override for `.hero-headline` at `max-width: 767px`: `font-size: clamp(2rem, 7vw, 2.8rem)`.

---

## CLAMP VALUE AUDIT

| Element | Clamp rule | At 320px | At 768px | At 1200px | Assessment |
|---|---|---|---|---|---|
| `.hero-headline` | `clamp(3rem, 6vw, 5rem)` | 3rem (48px) | 3rem (48px) | 4.5rem (72px) | Min too large for mobile — see fix above |
| `.hero-headline-sub` | `clamp(1.4rem, 3vw, 2.2rem)` | 1.4rem (22px) | 1.4rem (22px) | 2.2rem (35px) | Correct |
| `.hero-lede` | `clamp(1rem, 2vw, 1.125rem)` | 1rem (16px) | 1rem (16px) | 1.125rem (18px) | Tight range, correct |
| `.section-heading` | `clamp(1.8rem, 3.5vw, 2.8rem)` | 1.8rem (29px) | 1.8rem (29px) | 2.8rem (45px) | Correct |
| `.section-heading` mobile override | `clamp(1.5rem, 6vw, 2rem)` | 1.5rem (24px) | 2rem (32px) | n/a | Applied correctly |
| `.cta-heading` | `clamp(1.75rem, 4vw, 2.5rem)` | 1.75rem (28px) | 1.75rem (28px) | 2.5rem (40px) | Correct |

---

## INTERACTIVE ELEMENT AUDIT (Touch targets)

| Element | Minimum dimension | Passes 44px? |
|---|---|---|
| `.scenario-tab` | `padding: 10px 16px` + `font-size: 0.8rem` = ~37px height | FAIL — 37px < 44px |
| `.cta-btn-primary` | `padding: 0.8rem 1.75rem` + `font-size: 0.9375rem` = ~52px height | PASS |
| `.cta-btn-secondary` | same as primary | PASS |
| `.footer-gh-link` | `min-height: 44px` explicitly set | PASS |
| `.hero-eyebrow` CTA (`cta-primary`) | `padding: 12px 28px` + `font-size: 0.9rem` = ~44px height | PASS (borderline) |

**FIX (moderate):** `.scenario-tab` at `padding: 10px 16px` is approximately 37px tall. On mobile, scenario tabs are the primary interactive elements. Increase mobile padding to `padding: 12px 16px` to clear 44px. Add to the `@media (max-width: 767px)` block.

---

## BRAND COMPLIANCE AUDIT

| Check | Status | Notes |
|---|---|---|
| Background: `--mg-dark` | PASS | Used throughout |
| Surface: `--mg-surface` | PASS | Cards, panels correctly use surface |
| `--mg-lime-zest` one use per page rule | FAIL (minor) | `--mg-lime-zest` appears on both `.cta-primary` (hero button) AND `.cta-btn-primary` (section 6 CTA). Two uses on the same page. Spec says "one use per page." |
| Amber tokens page-scoped only | PASS | `--sage-amber` defined in page `:root`, not added to `tokens.css` |
| Text-safe color variants | PASS | `--mg-guac-text`, `--mg-chili-text`, `--mg-cilantro-text` correctly applied where text on dark bg |
| CTO border lightened | PASS | `#4A9ABF` used as specced |
| `prefers-reduced-motion` | PASS | Global rule disables all animations; particles skip in JS |
| `rel="noopener noreferrer"` | PASS | All external links have this |
| `aria-hidden` on decorative images | PASS | All bird/sage decorative images use `aria-hidden="true"` |
| Skip link | PASS | Present and visible on focus |

**FIX (moderate) — lime-zest two-use violation:**
The spec states `--mg-lime-zest` is "CTA only — one use per page." There are currently two lime-zest CTAs: the hero `cta-primary` and the section 6 `cta-btn-primary`. One of them should be converted to a secondary/ghost style. The hero CTA ("See how it works") is informational — it could be de-emphasized to a ghost button. The section 6 "Talk to us" is the conversion action and should retain lime-zest.

**FIX:** Change `.cta-primary` in the hero from lime-zest background to a ghost style (transparent background, `border: 1px solid var(--mg-cilantro)`, text in `--mg-text`). Reserve lime-zest exclusively for the bottom CTA.

---

## BLOCKERS SUMMARY

The following issues must be resolved before this page ships to production:

1. **BLOCKER — Value props mobile selector broken:** `div:first-child` does not match `<ul>`. Three-column layout will not stack on mobile. Value props will be ~75px per column on 320px devices — unreadable.

2. **BLOCKER — Hierarchy SVG connection lines absent:** The `hierarchy-svg-layer` SVG is present but no code draws the bezier connection lines. The visual hierarchy reads as floating rows with no structural connectors. Core to the section's narrative.

3. **BLOCKER — Teacher asset clipped by panel overflow:** `.spawning-panel` has `overflow: hidden` which clips the absolutely-positioned `teacher-wrap` that extends `-60px` below the panel. Teacher and bird are invisible on desktop.

4. **BLOCKER — Spawn nodes overflow on mobile:** Four 100px spawn nodes in a stacked panel at mobile width (~280px inner) will overflow. No mobile override for spawn node sizing exists.

5. **BLOCKER — Drift arrow alignment incorrect:** First drift arrow aligns with node 2 (CI TESTS) rather than node 3 (REVIEW). The cascade visualization starts one node too early, misattributing the problem point.

---

## MODERATE ISSUES (request changes before next review)

6. `hero-callout` overflows its grid column at 768px tablet — needs `max-width: 100%` override.
7. Scenario tabs are ~37px tall — fail 44px touch target minimum on mobile.
8. C-suite and director tier nodes wrap poorly at 320px mobile — node sizing not adjusted sufficiently.
9. Horizontal bridge content layout at mobile (< 900px) does not render correctly — labels and dot cannot be above/below each other in a row flex container.
10. `cascade-story` padding too aggressive on mobile — leaves insufficient text width.
11. Lime-zest used twice on the same page — violates the one-use-per-page brand rule.

---

## LOW-PRIORITY (backlog)

12. Hero headline minimum (`3rem`) is large for very small mobile — consider `clamp(2rem, 7vw, 2.8rem)` at mobile.
13. `+N more` in hierarchy shows literal "N" instead of a calculated or hardcoded count.
14. `--mg-chili-rgb` undefined — relies on fallback; replace with direct rgba value.
15. Scenario tab horizontal scroll has no visual scroll indicator on mobile.
16. `snapshot-pre` should use `white-space: pre-wrap` on mobile to avoid horizontal scroll-within-scroll.
17. CTA button width should be bounded at very narrow viewports.
18. Footer GitHub URL should have `overflow-wrap: break-word` for 320px safety.
19. `coding-monk.png` asset path differs from the `sage-character/` directory convention — verify path.
20. `mix-blend-mode: screen` not applied to hero image — verify asset has transparent background or apply blend mode.

---

## VERDICT

**REQUEST CHANGES**

The page is structurally well-constructed and the desktop layout is largely spec-compliant. Brand token usage is careful, accessibility implementation is strong, and the interactive spawning section works correctly. However, the page cannot ship in current state due to five production-blocking issues: the broken mobile value props selector, absent hierarchy SVG lines, clipped teacher asset, overflow spawn nodes at mobile, and misaligned drift arrows. All five are CSS/JS fixes of moderate effort — none require design changes.

**Blockers to resolve before next review:**
1. Value props mobile selector: `div:first-child` → `ul:first-child`
2. Implement hierarchy bezier lines (static SVG or JS `drawHierarchyLines()`)
3. Remove `overflow: hidden` from `.spawning-panel` and reposition teacher relative to `#spawning` section
4. Add mobile override for `.spawn-node`: reduce to `width: 60px` at `max-width: 767px`
5. Change `.drift-arrows-col padding-top` from `46px` to `92px`

Once blockers 1–5 are resolved and the lime-zest two-use violation is addressed, the page is approved for production.
