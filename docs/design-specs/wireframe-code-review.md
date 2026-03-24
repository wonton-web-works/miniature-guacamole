# Wireframe Code Review — Premium Page
**Reviewer:** Staff Engineer
**Date:** 2026-03-22
**File reviewed:** `site/src/pages/wireframe.astro`
**Spec reviewed:** `docs/design-specs/premium-page-visual-spec.md`

---

## Summary

The wireframe is a solid first pass. Structure is clear, accessibility is above average for a wireframe, and the IntersectionObserver pattern is mostly correct. However there are several issues that will cause real visual bugs in production if carried forward unchanged, and a cluster of maintainability concerns that will create the exact "CSS back-and-forth" the review is trying to prevent.

**Counts:** 3 P0 · 8 P1 · 6 P2

---

## P0 — Will Cause Visual Bugs

---

### P0-1: Duplicate reset block conflicts with tokens.css

**Location:** Lines 27–37 (wireframe `<style>`) vs `/site/src/styles/tokens.css` lines 31–49

**Issue:** `tokens.css` already defines `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }` and sets `html` background, color, font-family, and font-smoothing. The wireframe redeclares all of these identically inside a `<style>` block in `<head>`. This creates two competing `<style>` declarations in the same document after Astro processes the import. In practice the wireframe's `<style>` wins due to document order, but this will produce hard-to-debug overrides when the `tokens.css` reset is updated — the two blocks will silently diverge.

**Fix:** Remove lines 27–37 from the wireframe's `<style>` block entirely. The token import at line 2 already covers these declarations.

---

### P0-2: `.reveal` initial state hides content if JavaScript fails or is slow

**Location:** Lines 95–102

**Issue:** `.reveal { opacity: 0; }` with no fallback means any element with class `reveal` is invisible until the IntersectionObserver fires. If JS is blocked, delayed, or the observer misconfigures (e.g., `threshold: 0.15` on an element that starts fully in viewport on desktop), content is permanently hidden. The hero's `section-inner` content in Section 2 starts with `reveal reveal-up` — on a tall viewport this section may already be partially in view on load, and the observer may or may not fire depending on scroll position at parse time.

More critically: the `.reveal` class is applied to `hierarchy-wrap` (line 1271) and `spawning-panel` (line 1360) which are large containers. If the observer fires on the container but the individual children with `--delay` inline styles are processed via `querySelectorAll('[style*="--delay"]')` (line 1700), children that received `--delay` via JS (the particles) won't be found because they're in a different container. This is inconsistent: some `.reveal` children get staggered, others do not, depending on DOM structure.

**Fix:**
1. Add `@media (scripting: none) { .reveal { opacity: 1 !important; transform: none !important; } }` to protect no-JS users.
2. Refactor the observer callback to not rely on `querySelectorAll('[style*="--delay"]')` for staggering — this is a fragile selector. Use a `data-delay` attribute or CSS `--reveal-delay` custom property set in markup, and drive `transition-delay` from CSS, not `setTimeout`. The current pattern mixing `setTimeout` with CSS transitions is the root of future timing bugs.

---

### P0-3: `box-shadow` animated on `.spawn-node.dormant` overrides via `!important` will break active state restoration

**Location:** Lines 622–629

```css
.spawn-node.dormant {
  border-color: rgba(138,155,176,0.2) !important;
  border-style: dashed !important;
  box-shadow: none !important;
}
```

**Issue:** The `!important` declarations on `.dormant` mean that when JS removes the `dormant` class and adds `active`, the `active` state's `box-shadow` (lines 617–620) and `border-color` (lines 612–615) will correctly re-apply — but only because class removal triggers a cascade recalculation. This is fragile: any future CSS specificity increase on the active state selector (e.g., adding `.spawning-right .spawn-node.active`) will be blocked by the `!important` floor from dormant. The next developer to debug "why isn't my active style applying" will spend an hour finding this.

The `!important` is also unnecessary — `.spawn-node.dormant` has equal specificity to `.spawn-node.active`. The order of declarations in the stylesheet would resolve it without `!important`.

**Fix:** Remove all three `!important` declarations from `.spawn-node.dormant`. Move the dormant block to appear after the active state blocks in the stylesheet (lines 617–620), so cascade order resolves the conflict naturally. Test that removing `!important` doesn't change visual behavior — it should not.

---

## P1 — Maintainability / Will Cause CSS Back-and-Forth

---

### P1-1: Hardcoded hex values instead of tokens for brand colors

**Location:** Multiple lines throughout `<style>` block

**Issue:** The following hardcoded hex values appear inline in the stylesheet when token equivalents exist in `tokens.css`:

| Hardcoded value | Should be | Locations |
|---|---|---|
| `#D4FF00` | `var(--mg-lime-zest)` | Line 189 (`.cta-primary` background) |
| `#171e28` | `var(--mg-dark)` | Line 190 (`.cta-primary` color) |
| `#C94D3A` | `var(--mg-chili)` | Lines 49, 90, 718, 782 |
| `#4A7C59` | `var(--mg-guac)` | Lines 91, 719, 953 |
| `#2E8B8B` | `var(--mg-cilantro)` | Lines 520, 534, 1174 |
| `#4A7C59` | `var(--mg-guac)` | Line 1167 (`.footer-mg-name`) |
| `#2E8B8B` | `var(--mg-cilantro)` | Line 1174 (`.footer-gh-link`) |

The `--orchestrator-amber` family is correctly defined as page-scoped tokens at lines 21–23 and used via `var()`. The brand tokens should follow the same pattern. When a brand color changes, a codebase-wide hex replace is error-prone; token references update automatically.

**Fix:** Replace all hardcoded brand hex values with their token equivalents. The `.accent-chili`, `.accent-guac`, `.accent-cilantro` helper classes (lines 90–92) are already half-right — they reference the hex directly instead of `var(--mg-chili)` etc. Fix those too.

---

### P1-2: Inline style blocks in HTML for typography that should be CSS classes

**Location:** Lines 1254, 1356–1358, 1526–1528

**Issue:** Three `<p>` elements use inline `style=""` attributes for typography:

```html
<!-- Line 1254 -->
<p style="font-family:var(--font-mono);font-size:0.9rem;color:var(--mg-subtext);margin-bottom:48px;max-width:520px;margin-left:auto;margin-right:auto;">

<!-- Line 1357 -->
<p style="font-family:var(--font-mono);font-size:0.85rem;color:var(--mg-subtext);margin-bottom:40px;">

<!-- Line 1526 -->
<p style="font-family:var(--font-display);font-size:1rem;color:var(--mg-subtext);max-width:560px;line-height:1.6;margin-top:8px;">
```

These are section subheadings/subtitles — a repeating pattern. The wireframe already defines `.section-heading` as a shared class. There should be a `.section-subhead` class alongside it.

Beyond DRY, inline styles cannot be overridden by media queries. The mobile breakpoint at line 1187 overrides `.section-heading` font-size — but these inline `style=""` paragraphs will NOT respond to that media query. At 320px viewport, `font-size: 0.9rem` won't be adjusted because inline styles have specificity `1-0-0-0`.

**Fix:** Add a `.section-subhead` class to the shared section styles (around line 62):

```css
.section-subhead {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--mg-subtext);
  line-height: 1.6;
  max-width: 520px;
  margin: 0 auto 40px;
}
```

Replace all three inline-style paragraphs with `class="section-subhead"`.

---

### P1-3: `transition: all 0.3s` on `.footer-attr-block`

**Location:** Line 1130

**Issue:** `transition: all 0.3s` animates every CSS property, including layout-triggering ones. If a hover state ever changes `padding`, `width`, `border`, or `margin` on this element, it will trigger a full layout reflow on every frame of the transition. The spec only needs `filter` (on `.footer-capy`) and `text-shadow` (on `.footer-mg-name`) to transition — and both of those are correctly scoped to their child selectors (lines 1133–1139). The `transition: all` on the parent is redundant and hazardous.

**Fix:** Change line 1130 from `transition: all 0.3s;` to `transition: none;` — the child-level transitions handle all the hover effects the spec requires.

---

### P1-4: Resize listener on `drawHierarchyLines` has no debounce

**Location:** Line 1875

```javascript
window.addEventListener('resize', drawHierarchyLines);
```

**Issue:** `drawHierarchyLines` calls `getBoundingClientRect()` on every node in the hierarchy and does DOM writes (SVG path creation + `innerHTML = ''`). Without debounce, this fires on every pixel of a resize drag — dozens of times per second. On a lower-powered device or a tall hierarchy, this will visibly stutter. It also creates layout thrash: `getBoundingClientRect()` forces layout, then the function writes to the SVG, which invalidates layout again for the next call.

**Fix:** Wrap in a debounce or use `ResizeObserver` on the `hierarchy-wrap` element instead of `window`. Minimum debounce: 150ms.

```javascript
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(drawHierarchyLines, 150);
});
```

---

### P1-5: `bridgePulse` animates `box-shadow` — violates the spec's own performance rule

**Location:** Lines 1000–1003

```css
@keyframes bridgePulse {
  0%, 100% { opacity: 0.6; box-shadow: 0 0 0 0 rgba(212,168,75,0.3); }
  50%       { opacity: 1;   box-shadow: 0 0 0 4px rgba(212,168,75,0.1); }
}
```

**Issue:** The design spec (Global Notes, "CSS Animation Performance") explicitly states: "Do not animate `box-shadow` directly — use a pseudo-element with `opacity` transition instead for glows. The exception is the Orchestrator node pulse in Section 3." The bridge dot is not the Orchestrator node pulse — it's a continuously looping animation on a non-interactive element. `box-shadow` is not GPU-composited and will paint on every frame for the entire page lifetime.

**Fix:** Replace with a `::after` pseudo-element approach for the glow, and animate only `opacity` on the pseudo-element. The bridge dot already has `position: relative` and `z-index: 1`.

```css
.bridge-dot { position: relative; }
.bridge-dot::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: rgba(212,168,75,0.15);
  opacity: 0;
  animation: bridgeGlowPulse 3s ease-in-out infinite;
}
@keyframes bridgeGlowPulse {
  50% { opacity: 1; }
}
@keyframes bridgePulse {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1; }
}
```

---

### P1-6: `role="banner"` on the wireframe debug bar is semantically incorrect

**Location:** Line 1197

```html
<div class="wf-banner" role="banner">
```

**Issue:** `role="banner"` maps to the `<header>` landmark. Screen readers will announce this `<div>` as the page's primary header landmark, ahead of all section content. The wireframe banner is a debug artifact — it should either be `role="status"` (for informational banners) or have no landmark role at all. Using `role="banner"` here will also conflict if a `<header>` element is ever added to this page.

**Fix:** Change to `role="note"` or simply remove the `role` attribute. Add `aria-label="Wireframe preview notice"` if any landmark role is needed.

---

### P1-7: Section 5 session timeline breaks at narrow widths without horizontal scroll protection

**Location:** Lines 872–878

```css
.session-timeline {
  display: flex;
  align-items: stretch;
  gap: 0;
  max-width: 960px;
  margin: 40px auto 0;
}
```

**Issue:** The desktop layout uses fixed `width: 200px` session blocks (line 882) and fixed `width: 120px` bridges (line 962). Three sessions + two bridges = `(3 × 200) + (2 × 120)` = 840px minimum. The media query at line 1060 collapses to vertical at `max-width: 900px`. At viewport widths 841–899px, the timeline will overflow horizontally (840px content in an 860px container with 24px section padding = potential overflow). The section has no `overflow-x: hidden` or `overflow-x: auto` set.

**Fix:** Either lower the breakpoint to `max-width: 860px` (841px content + ~20px breathing room), or add `overflow-x: auto` to `.session-timeline` for the intermediate range. The preferred fix per the spec's "preferred if horizontal scroll is undesirable on desktop" note is to lower the breakpoint.

---

### P1-8: CTO color in csuite-node uses a non-token value that diverges from the spec's note

**Location:** Line 370

```css
.csuite-node[data-role="CTO"] { border-color: #4A9ABF; }
```

**Issue:** The spec explicitly calls out (Section 2, Accessibility note): "The CTO color #2E6E8E on #1E2A38 is approximately 3.2:1 — FAILS AA for small text. Use `#4A9ABF` (lightened variant) for the CTO border color." The wireframe correctly implements `#4A9ABF`. However, `--mg-cto` in `tokens.css` is still `#2E6E8E`. This creates a permanent divergence: the token says one thing, the page does another, and any future developer referencing `--mg-cto` will use the failing contrast value.

This is a pre-merge token decision that engineering should escalate: either update `--mg-cto` in `tokens.css` to `#4A9ABF`, or introduce a new page-scoped token `--cto-accessible: #4A9ABF` alongside the existing amber tokens at lines 21–23.

**Fix (immediate):** Document the divergence with a comment at line 370:
```css
/* NOTE: #4A9ABF is a contrast-accessible lightened variant of --mg-cto (#2E6E8E).
   --mg-cto fails AA on --mg-surface. Track in tokens.css before production. */
.csuite-node[data-role="CTO"] { border-color: #4A9ABF; }
```
**Fix (before production):** Resolve the token — update `tokens.css` or add a scoped token. Do not ship this divergence silently.

---

## P2 — Style Preferences / Minor Issues

---

### P2-1: Particle line connector uses CSS div with `width` in `%` — not a true geometric length

**Location:** Lines 1674–1686

**Issue:** The particle connector lines are calculated as `width: ${len}%` where `len` is derived from `Math.sqrt(dx*dx + dy*dy)` using percentage coordinate differences. This produces a value in "percent-of-percent" space, not actual pixel length. A line from (60%, 8%) to (78%, 22%) has `dx=18`, `dy=14`, `len≈22.8` — so the `<div>` gets `width: 22.8%` of the container, which happens to look roughly correct on a wide container but will be wrong at all other sizes. The lines will visually detach from the dots on mobile or any non-standard container width.

For a wireframe this is acceptable, but if these particles are carried into production, switch to an `<svg>` overlay with absolute pixel coordinates computed from `getBoundingClientRect()`, similar to the approach used for hierarchy lines.

---

### P2-2: Spec calls for `spec.role-title` at `0.75rem` but implementation uses `0.7rem`

**Location:** Line 363–366

```css
.csuite-node .role-title {
  font-family: var(--font-display);
  font-size: 0.7rem;   /* spec says 0.75rem */
  color: var(--mg-subtext);
}
```

**Issue:** The design spec (Section 2, C-Suite Nodes) specifies `role title in --font-display 0.75rem --mg-subtext`. The wireframe uses `0.7rem`. Small discrepancy but worth flagging before engineer hands this off to QA.

**Fix:** Change line 364 to `font-size: 0.75rem;`.

---

### P2-3: `section { position: relative; }` declared but not necessary for all sections

**Location:** Line 62

**Issue:** Every `section` gets `position: relative` via the shared rule. This creates a stacking context on every section. Sections with `overflow: hidden` (like `#hero` at line 112) plus `position: relative` will clip any absolutely-positioned child that intentionally overflows — the `teacher-wrap` in Section 3 uses `bottom: -60px` (line 643) to hang below the panel, which requires the panel NOT to be inside a clipping ancestor. The panel is inside `#spawning`, which inherits `position: relative` from the shared rule but no `overflow: hidden`, so this works today — but it's a trap. Document it.

**Fix:** Add a comment at line 62: `/* Sets stacking context. Do not add overflow:hidden to sections with elements that intentionally overflow their bounds (e.g., #spawning .teacher-wrap). */`

---

### P2-4: Inconsistent responsive strategy between sections

**Location:** Hero breakpoint line 259 uses `max-width: 767px`; session timeline uses `max-width: 900px` (line 1060); spawning panel uses `max-width: 767px` (line 653); hierarchy uses `max-width: 767px` (line 465)

**Issue:** Three breakpoints use `767px` as the mobile threshold, but the session timeline uses `900px`. This means between 768–900px the session timeline is in a partially-broken horizontal state (see P1-7), while all other sections are already in mobile layout. The inconsistency is a future bug surface. If the session breakpoint is intentionally higher, document why.

**Fix:** Audit whether `900px` is intentional for sessions. If it is (because the 840px minimum content width requires it), that's fine — but add a comment: `/* Higher breakpoint than other sections — 840px minimum content width requires earlier column collapse. */`

---

### P2-5: `img` elements missing `height` attribute on several images

**Location:** Lines 1468, 1499, 1504

```html
<img data-capy src="/assets/capy/bird.png" alt="" />  <!-- no width/height -->
<img data-capy src="/assets/capy/bird.png" alt="" />  <!-- no width/height -->
<img data-capy src="/assets/capy/zen-meditating.png" alt="" />  <!-- no width/height -->
```

**Issue:** Missing `width` and `height` attributes cause Cumulative Layout Shift (CLS) as images load and the browser doesn't know their intrinsic dimensions. The hero image (line 1238) correctly has `width="340"`. The bird images in the drift panels and the orchestrator mini-panel do not. CLS is a Core Web Vital and a production concern even for a premium page. For a wireframe it's tolerable, but these should be fixed before the pattern is carried to production.

**Fix:** Add explicit `width` and `height` attributes matching the CSS-specified sizes. For `.bird-lost img` (28px), add `width="28" height="28"`. For `.orchestrator-mini-panel img` (56px), add `width="56" height="56"`.

---

### P2-6: `.wf-banner` `backdrop-filter: blur(8px)` has no `background` fallback color

**Location:** Lines 49–50

```css
background: rgba(201, 77, 58, 0.9);
backdrop-filter: blur(8px);
```

**Issue:** `backdrop-filter` is not supported in all browsers (notably older Firefox without `layout.css.backdrop-filter.enabled` flag, though modern Firefox supports it). If `backdrop-filter` fails, `rgba(201, 77, 58, 0.9)` at 90% opacity will still render correctly — so this is only a visual fidelity concern, not a breakage. The banner will look slightly more opaque in unsupported browsers. Low priority for a `noindex` wireframe page.

**Fix:** No change required for the wireframe. Note for production: if this pattern is reused, test in Firefox with hardware acceleration disabled.

---

## Observer and Memory Safety

The IntersectionObserver at lines 1691–1719 correctly calls `observer.unobserve(el)` after the element enters (line 1714). This is correct — fire once, disconnect. No leak.

The `window.addEventListener('resize', drawHierarchyLines)` at line 1875 has no corresponding `removeEventListener`. For a single-page wireframe document this is acceptable (no SPA navigation, no component unmount). For production components (`.astro` with `<script>`) this must be cleaned up in a `beforeunload` or Astro's `document:astro-before-swap` lifecycle event if the page ever uses View Transitions.

---

## Spec Compliance Summary

| Section | Compliant | Gap |
|---|---|---|
| Section 1 — Hero | Yes | Inline style on `.cta-primary` uses `#D4FF00` instead of `var(--mg-lime-zest)` (P1-1) |
| Section 2 — Hierarchy | Mostly | CTO border color needs comment (P1-8); role-title font-size 0.7rem vs spec 0.75rem (P2-2) |
| Section 3 — Spawning | Yes | Dormant `!important` block is a hazard (P0-3) |
| Section 4 — Drift | Yes | Bird in "without" panel uses `scaleX(-1)` to mirror; spec says "faces left" — verify asset direction |
| Section 5 — Sessions | Mostly | Bridge overflow at 841–899px (P1-7); spec's `bridge-sublabels` not shown on bridge 2 (minor) |
| Section 6 — Footer | Yes | No gaps |
| Global — `prefers-reduced-motion` | Yes | Lines 99–102 correctly handle it |
| Global — `sr-only` | Yes | Correct implementation per spec |
| Global — `aria-hidden` on decorative assets | Yes | Consistent throughout |
| Global — focus rings | Yes | `.cta-primary:focus-visible` at line 205 matches spec |

---

## Priority Action List

Before carrying any of this CSS forward to production components:

1. **P0-1** — Remove duplicate reset block (10 min)
2. **P0-3** — Remove `!important` from `.spawn-node.dormant` (5 min)
3. **P0-2** — Add no-JS fallback for `.reveal`; replace `setTimeout`-based stagger with CSS `transition-delay` (30 min)
4. **P1-1** — Replace hardcoded brand hex values with tokens (20 min)
5. **P1-2** — Extract inline style paragraphs to `.section-subhead` class (15 min)
6. **P1-4** — Debounce resize listener (5 min)
7. **P1-5** — Replace `box-shadow` animation in `bridgePulse` with pseudo-element opacity (15 min)
8. **P1-8** — Document CTO token divergence or resolve it in `tokens.css` (decision needed)
9. **P2-2** — Fix `role-title` font-size from `0.7rem` to `0.75rem` (2 min)
10. **P2-5** — Add `width`/`height` to bird and orchestrator mini-panel images (5 min)
