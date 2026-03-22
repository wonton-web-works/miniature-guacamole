# WCAG 2.1 AA Accessibility Review — enterprise.astro
**Reviewed:** 2026-03-22
**Reviewer:** QA Agent
**File:** `site/src/pages/enterprise.astro`
**Standard:** WCAG 2.1 AA

---

## Summary

| Category | Pass | Fail | Total |
|----------|------|------|-------|
| 1. Perceivable | 9 | 11 | 20 |
| 2. Operable | 8 | 4 | 12 |
| 3. Understandable | 4 | 1 | 5 |
| 4. Robust | 5 | 2 | 7 |
| **Totals** | **26** | **18** | **44** |

**Overall AA Compliance: 59%** (26/44 criteria pass)

> Critical blockers: 11 color contrast failures, 2 ARIA misuse issues, 1 keyboard navigation gap, 1 missing focus indicator.

---

## Format

Each finding follows:
`WCAG [criterion] | [PASS/FAIL] | [FINDING] | [LOCATION] | [FIX]`

---

## 1. Perceivable

### 1.1 Text Alternatives (SC 1.1.1)

**SC 1.1.1 | PASS** | Hero Sage image has a rich, descriptive alt text | `<img src="sage-pixel-hero-gathering-for-web.png" alt="The Sage — a meditating capybara in green robes surrounded by small birds, sitting serenely">` | No change needed.

**SC 1.1.1 | PASS** | Hierarchy visualization has a companion sr-only table | `<table class="sr-only" aria-label="Team hierarchy by tier">` at line 1971 | No change needed.

**SC 1.1.1 | PASS** | Drift detection panels have a sr-only text description at line 2272 | The visual pipeline diagrams are backed by: "Pipeline without the Sage: a shallow review passes undetected..." | No change needed.

**SC 1.1.1 | PASS** | All purely decorative images correctly use `alt=""` with `aria-hidden="true"` | Hierarchy Sage circle (line 1987), bird-ic (line 2053), spawning panel teacher images (lines 2161-2162), drift panel bird/sage images (lines 2222-2265), session bridge/avatar images (throughout section 5), footer capy (line 2626) | No change needed.

**SC 1.1.1 | FAIL** | The spawn-sage-node Sage image in the interactive spawning demo (section 3) has `alt="The Sage"` but the image is decorative within the widget — the widget's state is already communicated through the `aria-live` blockquote and the `aria-label` on each spawn-node | Line 2131: `<img ... alt="The Sage" width="56" height="56">` | Change to `alt=""` and add `aria-hidden="true"` since the widget caption and live region carry all meaning. **Alternatively**, if kept meaningful, the container should have a role and accessible name. Low priority.

**SC 1.1.1 | FAIL** | The SVG `<title>` in the spawning demo SVG (line 2136) is a static element (`id="spawn-svg-title"`) but JavaScript also writes to it via `svgTitle.textContent`. The `<title>` in SVG is only exposed to AT if the SVG has `role="img"` or `aria-labelledby`. The SVG uses `aria-hidden="true"` (line 2135), which hides the title from AT entirely — making the title unreachable and the dynamic update invisible to screen readers | Lines 2135–2137 | The `aria-live` region on `#task-desc` already conveys the task change. The SVG title is redundant but hidden. If the SVG title is intended as the accessible summary for the diagram, remove `aria-hidden="true"` from the SVG and add `role="img"` + `aria-labelledby="spawn-svg-title"`. If it is purely decorative, remove the `<title>` to eliminate dead markup.

### 1.3 Adaptable (SC 1.3.1)

**SC 1.3.1 | PASS** | Data table (`spawning-table`) uses `<thead>`, `<th>` elements with appropriate scope implied by position | Lines 2065–2094 | No change needed.

**SC 1.3.1 | PASS** | Heading hierarchy is correct: one `<h1>` in the hero, `<h2>` for all section headings, `<h3>` for sub-sections (drift panel labels at lines 2190/2237, story heading at line 2337, capability headings at lines 2382–2484) | Throughout | No change needed.

**SC 1.3.1 | FAIL** | The `<blockquote>` element at line 2352 (`<blockquote class="sage-quote">`) is used for Sage terminal output, not a quotation from another source. `<blockquote>` has semantic meaning of a quoted passage from an external work. Using it for stylistic reasons misrepresents the content to screen readers | Line 2352 | Replace with `<div class="sage-quote">` or `<figure>`/`<figcaption>` if treating it as an illustrative example. If it is semantically a quote, add a `<cite>` element.

**SC 1.3.1 | FAIL** | `.hero-quality-word` and `.hero-quality-desc` are rendered as `<span>` elements inside a `<div>`. The heading-word and its description have no programmatic relationship — a screen reader traversing linearly will read "A real org. CEO, CTO, CMO..." without grouping context | Lines 1932–1943 | Wrap each pair in a `<dl>/<dt>/<dd>` structure or convert to `<h3>`/`<p>` pairs. The current `<span>` approach provides no semantic structure for AT.

**SC 1.3.3 | PASS** | The drift detection panels are labeled "Without the Sage" / "With the Sage" in text (`<h3>`), not by color or icon alone. The sr-only description backs them up | Lines 2190, 2237, 2272 | No change needed.

### 1.4 Distinguishable — Color Contrast

The following contrast ratios were computed against the exact CSS variable values in `tokens.css` and the page-scoped `:root` overrides.

**SC 1.4.3 | PASS** | `--mg-text` (#E8E8E8) on `--mg-dark` (#171e28): **13.68:1** | Body text throughout | Well above 4.5:1.

**SC 1.4.3 | PASS** | `--mg-subtext` (#8A9BB0) on `--mg-dark` (#171e28): **5.90:1** | Hero lede, quality descriptions, stat line, section subheadings, spawning intro, drift narrative body, annotation, CTA body | Passes at all sizes.

**SC 1.4.3 | PASS** | `--sage-amber` (#D4A84B) on `--mg-dark` (#171e28): **7.58:1** | Drift stat number, section labels where applicable | Passes.

**SC 1.4.3 | FAIL** | `--mg-cilantro` (#2E8B8B) on `--mg-dark` (#171e28): **4.14:1** — below 4.5:1 required for normal-weight text | Used for: `hero-eyebrow` (0.7rem/uppercase), `hero-callout-label` (0.8rem), `hero-headline-sub` text, `hero-qualities` border-left (decorative, OK), `spawn-tag` text (0.75rem on `--mg-surface`: **3.59:1**), `bench-metric` (1.375rem bold — qualifies as large text at 14pt bold, borderline), `detail-label` (0.75rem), `cap-num` (0.75rem), `quote-prefix` (0.75rem), `metric-label` (0.875rem/600 weight), `drift-tier-enterprise` label and verdict, footer GitHub link (0.7rem) | **Fix:** Lighten `--mg-cilantro` to approximately #3DAFAF (estimated 5.1:1 on dark) for text uses. Or restrict cilantro to large-text and large-bold-text contexts only, and use a lighter teal for small text instances. The footer GitHub link (0.7rem) must be remediated — it is both too small and below 4.5:1.

**SC 1.4.3 | FAIL** | `--mg-cilantro` (#2E8B8B) on `--mg-surface` (#1E2A38): **3.59:1** — fails 4.5:1 for normal text | Used for: spawn-tag text (0.75rem), bench-metric (1.375rem bold — see note above), hero-callout-label (0.8rem on surface background), cap-num (0.75rem on dark bg at edge of surface containers) | Same fix as above.

**SC 1.4.3 | FAIL** | `--mg-chili` (#C94D3A) on `--mg-dark` (#171e28): **3.68:1** — fails 4.5:1 | Used for: `accent-chili` in section heading "See the drift. Or prevent it." (the word "drift" — this is large text at clamp(1.8rem,3.5vw,2.8rem) so **large text 3:1 PASS**), `drift-panel-label` "Without the Sage" (0.65rem uppercase on surface: **3.19:1 — FAILS large text 3:1 too**), drift-arrows-col decorative SVG arrows (aria-hidden, OK) | **Fix:** The `drift-panel-label` at 0.65rem/uppercase is the critical failure. Increase font size to at least 14px bold (18.67px bold), or lighten chili for text use to achieve 4.5:1.

**SC 1.4.3 | FAIL** | `--mg-chili` (#C94D3A) on `--mg-surface` (#1E2A38): **3.19:1** — fails both 4.5:1 (normal) and barely passes 3:1 for large text | `drift-panel-label` "Without the Sage" at 0.65rem — this does **not** qualify as large text. **Fails.** | Lighten to approximately #E05A45 for text on surface, or increase font size significantly.

**SC 1.4.3 | FAIL** | `--mg-guac` (#4A7C59) on `--mg-dark` (#171e28): **3.45:1** — fails 4.5:1 | Used for: `footer-mg-name` ("miniature-guacamole", 0.9rem/500 weight — normal text), `status-completed` pill text (0.62rem), `accent-guac` class (applied inline where used) | **Fix:** Lighten `--mg-guac` to approximately #5FA070 for text on dark, or use a different token for these text uses. The `status-completed` text at 0.62rem is especially critical — both below 4.5:1 contrast and extremely small.

**SC 1.4.3 | FAIL** | `--mg-guac` (#4A7C59) on `--mg-surface` (#1E2A38): **2.99:1** — fails both 4.5:1 and 3:1 | `drift-panel-label` "With the Sage" at 0.65rem | Critical double failure. Fix: use `--mg-text` or a much lighter green for this label text.

**SC 1.4.3 | FAIL** | White (#FFFFFF) on `--mg-cilantro` (#2E8B8B): **4.05:1** — fails 4.5:1 | `cta-btn-primary` in the CTA section: "Talk to us" button text | **Fix (high priority — primary CTA):** Use `--mg-dark` (#171e28) as the button text color (contrast: ~3.58:1... still fails). Better: darken cilantro button background. Use #1F7070 (approx 5.1:1 with white) or use `--mg-lime-zest` as background with `--mg-dark` text (contrast: 14.45:1 — perfect). The `.cta-primary` elsewhere on the page uses `--mg-lime-zest` background with `--mg-dark` text and **passes**. The `.cta-btn-primary` uses cilantro and **fails**. Unify to lime-zest or fix cilantro darkening.

**SC 1.4.3 | FAIL** | Section labels at 0.7rem (`section-label` class, `hero-eyebrow`, various mono labels) — these are rendered at approximately 11px. While contrast may pass numerically on some tokens, 11px text fails the spirit of SC 1.4.4 (resize) and is borderline for SC 1.4.12 (text spacing). Specifically: cilantro at 0.7rem (11px) falls below the large-text threshold and needs the full 4.5:1 ratio — which cilantro fails | `section-label` across all sections, `hero-eyebrow`, `sage-label`, `bird-label`, `task-sample-label`, `spawning-note`, `bench-label` | Consolidate: use `--mg-subtext` (passes 5.9:1) for small mono labels, or raise font-size to at least 0.875rem for colored labels.

**SC 1.4.11 | PASS** | Non-text UI components — `.cta-primary` focus outline uses `outline: 2px solid var(--mg-lime-zest)` with `outline-offset: 2px`. Lime-zest on dark: 14.45:1. The focus indicator itself passes 3:1 | Line 268 | No change needed for `.cta-primary`.

**SC 1.4.11 | FAIL** | `.cta-btn-primary` and `.cta-btn-secondary` in the enterprise CTA section (lines 1708–1740) have no `:focus-visible` style defined. The browser default focus outline may be suppressed in contexts where `outline: none` is inherited or where the page's global reset interferes | Lines 1708–1740 | Add explicit `:focus-visible` rules to both `.cta-btn-primary` and `.cta-btn-secondary` matching the pattern already established by `.cta-primary:focus-visible { outline: 2px solid var(--mg-lime-zest); }`.

### 1.4 Adaptable — Resize and Reflow

**SC 1.4.4 | PASS** | Text sizing uses `rem`/`clamp()` throughout. No absolute `px` font sizes except in a few decorative label contexts. The viewport meta tag includes `width=device-width, initial-scale=1.0` without `user-scalable=no` | Lines 9, throughout CSS | No change needed.

**SC 1.4.10 (Reflow) | PASS** | Mobile breakpoints exist at 767px and 640px for all major layout components. Grid switches to single column. Session timeline switches to `flex-direction: column`. The horizontal scroll on `.scenario-tabs` on mobile is acceptable (horizontal scroll on a component, not the page) | Lines 358–371, 828–846, 1195–1200, 1635–1675 | No change needed.

---

## 2. Operable

### 2.1 Keyboard Accessible (SC 2.1.1)

**SC 2.1.1 | PASS** | Spawning demo tabs are `<button>` elements inside `role="radiogroup"`. Keyboard event handlers cover `Enter` and `Space` (lines 2874–2880). Buttons are natively focusable | Lines 2116–2121, 2874–2880 | No change needed.

**SC 2.1.1 | FAIL** | The `role="radiogroup"` tab pattern requires arrow-key navigation between radio options per the ARIA Authoring Practices Guide radiogroup pattern. Pressing Tab currently moves focus between each button sequentially (default button behavior), rather than using roving tabindex where Tab exits the group and arrow keys cycle within it. This is technically operable but violates the expected keyboard contract for `role="radiogroup"` | Lines 2116–2121 and JS at 2870–2880 | Implement roving tabindex: set `tabindex="-1"` on all tabs except the selected one, use `ArrowDown`/`ArrowUp` to move focus within the group, and `Tab` to exit. Or change the role to a simpler button group without `role="radio"` semantics if the roving tabindex pattern is not implemented.

**SC 2.1.1 | PASS** | All `<a>` and `<button>` elements are keyboard reachable. No `tabindex="-1"` applied to interactive elements | Throughout | No change needed.

**SC 2.1.1 | FAIL** | No skip navigation link is present. A keyboard user must Tab through all elements in the hero section, value props, and hierarchy to reach main content in each section | Missing from `<body>` | Add a visually hidden skip link as the first focusable element: `<a href="#hierarchy" class="sr-only" style="...">Skip to main content</a>` with focus styles that make it visible on focus.

### 2.4 Navigable

**SC 2.4.1 | FAIL** | (Duplicate of above) No skip link to bypass hero/nav block | Head of `<body>` | Add skip link.

**SC 2.4.3 (Focus Order) | PASS** | Reading order matches visual order. CSS grid and flexbox do not reorder content in a way that creates focus confusion, with one exception: on mobile, `.hero-right { order: -1 }` makes the Sage illustration appear first visually but the text receives focus first in DOM order. Since the illustration is `aria-hidden`, this is acceptable | Line 363 | No change needed.

**SC 2.4.7 (Focus Visible) | PASS** | `.cta-primary` has explicit `:focus-visible` with 2px lime-zest outline | Line 268 | No change needed.

**SC 2.4.7 (Focus Visible) | FAIL** | `.cta-btn-primary` and `.cta-btn-secondary` in the enterprise CTA section lack explicit `:focus-visible` declarations. No global focus style is defined in `tokens.css` to compensate | Lines 1708–1740 | Add `:focus-visible` to both selectors. Minimum: `outline: 2px solid var(--mg-lime-zest); outline-offset: 2px;`

**SC 2.4.2 (Page Titled) | PASS** | `<title>PrivateEnterprise Enterprise — Your AI Engineering Org</title>` — descriptive and unique | Line 10 | No change needed.

**SC 2.4.6 (Headings and Labels) | PASS** | All headings are descriptive. Section labels provide context though they are `<p>` elements, not headings. This is acceptable as long as headings themselves are descriptive, which they are | Throughout | No change needed.

### 2.3 Seizures

**SC 2.3.1 (Three Flashes) | PASS** | No content flashes more than 3 times per second. The `float` animation (6s period), `particlePulse` (3.5s), `bridgePulse` (3s), `terminalScroll` (12s) are all well below the threshold | CSS animations throughout | No change needed.

### 2.5 Input Modalities

**SC 2.5.3 (Label in Name) | PASS** | All CTA buttons have visible text matching or containing their accessible name. The `mailto:` CTA shows "Talk to us" — both visible and in DOM | Lines 2603–2611 | No change needed.

### 1.4.13 / 2.5.1 — Animation (prefers-reduced-motion)

**SC 2.3.3 (Animation from Interactions) | PASS** | `@media (prefers-reduced-motion: reduce)` disables all `.reveal` transitions and sets `animation-duration: 0.01ms` globally | Lines 87–90 | No change needed.

**SC 2.3.3 | FAIL** | The JavaScript-generated particles (constellation dots) are created via JS and styled with CSS `animation` properties set inline. The `prefers-reduced-motion` media query in CSS covers `.reveal` but does NOT suppress particles or `particleFadeIn`/`particlePulse` animations created via JavaScript's `style.cssText` assignments. The `animation-duration: 0.01ms !important` rule applies to CSS-class animations, but inline style `animation` properties set by JS override it | Lines 2653–2708 | In the particle generation script, check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` before setting animation properties on dots and lines. If reduced motion is preferred, skip all particle animation or render them as static dots.

---

## 3. Understandable

### 3.1 Readable

**SC 3.1.1 (Language of Page) | PASS** | `<html lang="en">` is present | Line 6 | No change needed.

### 3.2 Predictable

**SC 3.2.2 (On Input) | PASS** | Spawning demo tabs update content in place without page navigation or unexpected context change. The `aria-live="polite"` region announces changes to screen readers | Line 2123 | No change needed.

### 3.3 Input Assistance

**SC 3.3.1 (Error Identification) | PASS** | No form inputs exist on this page. The `mailto:` link is a link, not a form | Line 2603 | No change needed.

### 3.1.3 / Jargon

**SC 3.1.3 | FAIL** | Role abbreviations (EM, TL, PO, QAL, CTO, CMO, CFO) are used throughout without expansions for screen reader users. The sr-only table (line 1971) provides full names in the hierarchy section, but the spawning demo nodes, spawn-node aria-labels (`"CEO — active for this task type"`), and section text use abbreviations without expansion | Lines 1971–1979 cover hierarchy; lines 2140–2155 spawn nodes use abbreviations in aria-labels | Expand abbreviations in aria-labels: `aria-label="Chief Executive Officer — active for this task type"` instead of `"CEO — active for this task type"`. Also add `<abbr title="Engineering Manager">EM</abbr>` for at-risk abbreviations in running text.

---

## 4. Robust

### 4.1 Compatible

**SC 4.1.1 (Parsing) | PASS** | The HTML structure is well-formed. No duplicate IDs detected (each section ID is unique: hero, value-props, hierarchy, spawning, drift, capabilities, sessions, enterprise-cta, footer-attribution). The `spawn-svg-title` and `spawn-sage` IDs are unique | Throughout | No change needed.

**SC 4.1.2 (Name, Role, Value) | PASS** | The `role="radiogroup"` + `role="radio"` + `aria-checked` pattern is semantically declared. The `aria-live="polite"` on the task description blockquote announces content changes | Lines 2116–2123 | No change needed on declaration — keyboard navigation gap covered under SC 2.1.1.

**SC 4.1.2 | FAIL** | The spawning demo's `aria-live` region is a `<blockquote>` element (line 2123). Placing `aria-live` on a `<blockquote>` is valid but the element has inherent quote semantics that do not match its use as a live region for dynamic task descriptions. More critically: when JavaScript updates the content via `taskDesc.textContent = scenario.task` (line 2864), it updates 600ms after the tab click — after the `aria-checked` state has already changed. A screen reader user hears the radio state change, then silence, then the new task description announced 600ms later. This is acceptable but suboptimal | Lines 2123, 2863–2865 | Change `<blockquote>` to `<p>` and reduce the `aria-live` announcement delay or move the `textContent` update to before the 600ms timeout. Also: the `aria-live` region should update the active agents summary, not just the task text, since that is the primary semantic change.

**SC 4.1.2 | FAIL** | The `.section-label` elements (e.g., "24 agents", "Intelligent routing", "Drift prevention", "Five capabilities", "Session management") are rendered as `<p>` elements visually styled to appear as eyebrow/label text above section headings. They are not programmatically associated with the headings below them. A screen reader user navigating by headings will hear the `<h2>` without the eyebrow context. While not a hard failure, it reduces the information available to AT navigation | Lines 1963, 2106, 2173, 2368, 2523 | Consider either: (a) including the section label text in the heading itself via a visually hidden span, or (b) using `aria-describedby` to link the label to the heading, or (c) accepting the current state as a minor usability gap (not a hard WCAG fail).

**SC 4.1.3 (Status Messages) | PASS** | The `aria-live="polite"` region on the task description provides status updates. The `aria-label` updates on spawn nodes provide state. No status messages are rendered purely visually without AT access | Lines 2123, 2831–2851 | No change needed.

### Landmark Regions

**Landmarks | FAIL** | The page uses `<section>` elements but lacks a `<main>` landmark. `<header>` and `<footer>` landmarks are also absent. Screen reader users navigating by landmarks will find no `<main>` to jump to, and no `<nav>` (correct — there is no nav). The `<section id="footer-attribution">` would be better as a `<footer>` element | Structural | Add `<main>` wrapping sections 1–6, replace `<section id="footer-attribution">` with `<footer>`. Add `<header>` if a nav or branding element is ever added.

**Landmarks | PASS** | Each `<section>` element has either an `id` or an `aria-label` providing an accessible name, which makes them distinguishable as regions | Lines 1844, 1929, 1960, 2104, 2171, 2366, 2521, 2595, 2619 | No change needed, though the `<main>` wrapper is still required.

---

## Priority Fix List

Issues ordered by severity (P1 = blocking, P2 = significant, P3 = minor).

### P1 — Blocking Contrast Failures

| # | Color Pair | Ratio | Use | Target |
|---|-----------|-------|-----|--------|
| 1 | `--mg-cilantro` on `--mg-dark` | 4.14:1 | Footer GitHub link (0.7rem), spawn-tags, labels | 4.5:1 |
| 2 | `--mg-cilantro` on `--mg-surface` | 3.59:1 | Spawn-tag text, bench-metric, hero-callout-label | 4.5:1 |
| 3 | `--mg-chili` on `--mg-surface` | 3.19:1 | "Without the Sage" drift panel label (0.65rem) | 4.5:1 |
| 4 | `--mg-guac` on `--mg-dark` | 3.45:1 | footer-mg-name, status-completed text | 4.5:1 |
| 5 | `--mg-guac` on `--mg-surface` | 2.99:1 | "With the Sage" drift panel label (0.65rem) | 4.5:1 — **fails large text too** |
| 6 | White on `--mg-cilantro` | 4.05:1 | `.cta-btn-primary` "Talk to us" — primary CTA | 4.5:1 |

**Suggested token remediation:**
```css
/* Text-safe variants — use these for text, keep originals for decorative borders/glows */
--mg-cilantro-text: #3DAFAF;   /* ~5.2:1 on dark, ~4.5:1 on surface */
--mg-chili-text:   #E06050;   /* ~4.6:1 on dark, ~4.0:1 on surface (use sparingly at large) */
--mg-guac-text:    #5FA070;   /* ~4.6:1 on dark */
/* Or for cta-btn-primary: use mg-lime-zest bg + mg-dark text (already used on .cta-primary) */
```

### P2 — Structural and Interaction Failures

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 7 | No `<main>` landmark | Entire body | Wrap sections 1–6 in `<main>` |
| 8 | No skip link | Top of `<body>` | Add visually-hidden skip-to-content link |
| 9 | `.cta-btn-primary/secondary` missing `:focus-visible` | Lines 1708–1740 | Add `outline: 2px solid var(--mg-lime-zest); outline-offset: 2px;` |
| 10 | Radiogroup missing roving tabindex | Lines 2116–2121, JS | Implement roving tabindex per ARIA APG radiogroup pattern |
| 11 | JS particles ignore `prefers-reduced-motion` | Lines 2653–2708 | Check `matchMedia` before setting animation in particle script |

### P3 — Minor / Low-Impact

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 12 | Role abbreviations not expanded in aria-labels | Spawn nodes, spawning panel | Use full titles in `aria-label` attributes |
| 13 | `<blockquote>` used for Sage terminal quote (semantic mismatch) | Line 2352 | Change to `<div>` or `<figure>` |
| 14 | `.hero-quality-word/desc` pairs lack semantic structure | Lines 1932–1943 | Convert to `<dl>/<dt>/<dd>` or `<h3>/<p>` |
| 15 | `<section id="footer-attribution">` should be `<footer>` | Line 2619 | Replace with `<footer>` element |
| 16 | SVG `<title>` in spawn-svg is aria-hidden | Lines 2135–2137 | Either remove title (aria-live region covers it) or expose via `role="img"` |
| 17 | `aria-live` on `<blockquote>` is valid but semantically mismatched; 600ms delay before announcement | Lines 2123, 2863 | Change to `<p>`, reduce announcement delay |
| 18 | Section label `<p>` elements not associated with following `<h2>` | All sections | Consider linking via aria-describedby or absorbing into heading |

---

## Color Contrast Quick Reference

All values computed from `tokens.css` + page-scoped `:root`.

| Token | Hex | On --mg-dark | On --mg-surface | AA Normal (4.5) | AA Large (3.0) |
|-------|-----|-------------|----------------|-----------------|----------------|
| --mg-text | #E8E8E8 | 13.68:1 | 11.87:1 | PASS | PASS |
| --mg-subtext | #8A9BB0 | 5.90:1 | 5.12:1 | PASS | PASS |
| --sage-amber | #D4A84B | 7.58:1 | 6.58:1 | PASS | PASS |
| --mg-cilantro | #2E8B8B | **4.14:1** | **3.59:1** | **FAIL** | PASS |
| --mg-chili | #C94D3A | **3.68:1** | **3.19:1** | **FAIL** | PASS/FAIL |
| --mg-guac | #4A7C59 | **3.45:1** | **2.99:1** | **FAIL** | PASS/**FAIL** |
| --mg-lime-zest | #D4FF00 | 14.45:1 | 12.54:1 | PASS | PASS |
| White on cilantro bg | — | 4.05:1 | — | **FAIL** | PASS |

**The core contrast problem:** `--mg-cilantro`, `--mg-chili`, and `--mg-guac` were selected as brand accent colors optimized for visual impact on dark backgrounds, not for WCAG text contrast. They work for decorative elements (borders, glows, backgrounds) but fail as text colors. The fix is to define separate `-text` variants at higher lightness values, keeping the originals for non-text use.
