# Quality Audit — 2026-03-23

Auditor: QA Engineer
Scope: MG/TEO site performance, SEO, documentation hygiene, test health, CI/CD
Date: 2026-03-23

---

## Summary Scorecard

| Category              | Grade | Status   |
|-----------------------|-------|----------|
| Site Performance      | C     | Issues   |
| SEO                   | B     | Minor gaps|
| Documentation Hygiene | C     | Stale counts, inconsistencies |
| Test Health           | C     | Low coverage, 4 skipped files |
| CI/CD Health          | D     | 2 of 3 workflows failing |

---

## 1. Site Performance — Grade: C

### Image Optimization

**No `<img>` dimensions on most images (CLS risk)**

Most pixel art images in `index.astro` do not carry `width`/`height` attributes. Without explicit dimensions, the browser cannot reserve layout space before images load, which causes Cumulative Layout Shift (CLS). The only images with dimensions are a handful of small ones:

- `sage-pixel-bird-teal-for-web.png` — has `width="32" height="32"` (good)
- `sage-pixel-meditating-no-bg.png` (56x56 in spawning section) — has dimensions (good)
- Decorative hero image at bottom — has `width="40" height="40"` (good)
- All other images in the hierarchy, teacher, and bridge sections — missing `width`/`height`

**Image format**: All images served as `.png`. No WebP or AVIF alternatives. All pixel art assets could be served as WebP with a PNG fallback via `<picture>`, reducing typical image weight 25-40%.

**Lazy loading**: No `loading="lazy"` attribute on any below-the-fold images. The hero `ChromaKeyVideo` component uses `client:load` (eager hydration), which is correct for the hero. However all subsequent `<img>` tags in sections 2-8 should have `loading="lazy"`.

**Hero video**: The `.mp4` chroma-key video loads eagerly via `client:load` — this is intentional and acceptable for LCP. A `staticFallbackSrc` is provided for the no-JS case (good).

**Recommendations:**
- Add `width`/`height` to all `<img>` tags that are missing them (priority: hierarchy section, teacher section, bridge section)
- Add `loading="lazy"` to all images below the fold
- Convert PNG assets to WebP (use Astro's `<Image />` component with `format="webp"`)

### Font Loading

**Google Fonts loaded from external CDN — known open TODO**

`Base.astro` loads Inter and JetBrains Mono from `fonts.googleapis.com`. A `<!-- TODO -->` comment already documents the fix: self-host via `@fontsource/inter` and `@fontsource/jetbrains-mono`. The current approach:

- Adds 2 external DNS lookups (preconnect is present, which is good)
- Blocks CSP from using `font-src 'self'` (current CSP must allow `fonts.gstatic.com`)
- `display=swap` is included in the Google Fonts URL parameter (good — no FOIT)
- No `<link rel="preload" as="font">` for the critical Inter weight (400/700)

**Recommendations:**
- Self-host fonts — the TODO comment correctly identifies `@fontsource/inter` and `@fontsource/jetbrains-mono` as the fix
- Add `<link rel="preload" as="font">` for the critical Inter 400/700 weights once self-hosted

### JavaScript Bundle

`enterprise.ts` is 400 lines. It bundles four IIFEs:
1. Constellation particle injection
2. IntersectionObserver reveal
3. Scenario tab interactivity (spawning diagram)
4. Hierarchy SVG line drawing

This is a reasonable single-file structure for an enterprise page. The file is not excessively large. No splitting is needed. The `reduced-motion` guard at the top of the particle IIFE is correctly implemented.

**One concern**: The script uses `innerHTML` alternatives (safe — `document.createElementNS`, `svg.removeChild`), but still uses `setTimeout` for animation coordination. This is acceptable for the use case.

### CSS

`index.astro` contains all styles inline in a `<style slot="head">` block. The file is 3,400+ lines of CSS. Astro scopes inline styles to the component, so there is no global bleed, but:

- The entire CSS block is render-blocking on page load (by design in Astro's SSR/static output)
- There is no critical CSS / deferred CSS split
- No obvious unused CSS blocks were found (CSS is closely tied to specific sections)

**Recommendations:**
- Consider extracting section-specific CSS into scoped component files to enable future code-splitting
- The approach is not causing errors, but the monolithic CSS will become harder to maintain

### Third-Party Resources

| Resource | Purpose | Privacy Impact |
|----------|---------|----------------|
| `fonts.googleapis.com` | Font loading | User IP sent to Google |
| `fonts.gstatic.com` | Font files | User IP sent to Google |
| `plausible.io/js/script.js` | Analytics | Privacy-friendly, no cookies (good) |
| GitHub API (`api.github.com`) | Changelog fetch at build time | Build-time only, no user exposure |

The GitHub API call for changelog entries happens at SSG build time (not at user runtime), so it does not impact user-facing performance or privacy.

### Caching Headers

`site/public/_headers` file is present and sets appropriate security headers. However, no `Cache-Control` directives are present for static assets. Cloudflare Pages sets `Cache-Control: public, max-age=0, must-revalidate` by default on HTML and `Cache-Control: public, max-age=31536000, immutable` on hashed assets. Verify Cloudflare is handling asset caching, or add explicit rules to `_headers` for `/assets/*`.

**_headers security posture** (positive findings):
- HSTS with `max-age=63072000; includeSubDomains; preload` — good
- CSP present — but includes `'unsafe-inline'` for both `style-src` and `script-src`
- `X-Frame-Options: DENY` and `frame-ancestors 'none'` are redundant but harmless (belt-and-suspenders)

---

## 2. SEO — Grade: B

### Title Tags

| Page | Title | Length | Pass |
|------|-------|--------|------|
| index.astro | "TheEngOrg Enterprise — Your AI Engineering Org" | 48 chars | Pass |
| Base.astro default | "TheEngOrg — AI-powered dev team for Claude Code" | 49 chars | Pass |

Both titles are under 60 characters and descriptive.

### Meta Descriptions

| Page | Description | Length | Pass |
|------|-------------|--------|------|
| index.astro | "A complete AI engineering org for every project. 24 agents — CEO, CTO, QA, Dev, Security, Design — led by The Sage. Enterprise-grade quality enforcement, session management, and continuous oversight." | 199 chars | **FAIL — over 160 chars** |
| Base.astro default | "TheEngOrg gives Claude Code a complete product development org. 24 agents, 19 skills, project-local memory." | 107 chars | Pass |

The `index.astro` meta description is 199 characters — 39 chars over the 160-char Google display limit. The description will be truncated in search results. Shorten to under 160 chars.

**Suggested replacement (157 chars):**
"TheEngOrg gives every project a complete AI engineering org — 24 agents from CEO to QA, led by The Sage. Enterprise quality enforcement from intake to merge."

### OpenGraph Tags

| Tag | Present | Value | Pass |
|-----|---------|-------|------|
| `og:type` | Yes | "website" | Pass |
| `og:url` | Yes | `Astro.url` (dynamic) | Pass |
| `og:title` | Yes | from page props | Pass |
| `og:description` | Yes | from page props | Pass |
| `og:image` | Yes | "/og-image.png" | **FAIL — file does not exist** |
| `twitter:card` | Yes | "summary_large_image" | Pass |
| `twitter:image` | Yes | "/og-image.png" | **FAIL — file does not exist** |

**Critical: `/og-image.png` is missing from `site/public/`**. When the site is shared on social media (Twitter, Slack, LinkedIn), no image will appear — the card will render without a preview image. This degrades all social sharing.

**Action required**: Create and commit an OG image (1200x630px recommended) to `site/public/og-image.png`.

### Canonical URL

`Base.astro` uses `Astro.url` for the canonical href. This is correct for Astro — it generates the full URL including protocol and host. Pass.

### Heading Hierarchy (index.astro)

- `<h1>`: "Your project deserves a full engineering org." — single H1, above the fold. Pass.
- `<h2>` tags: Multiple section headings present ("Your team has AI tools. They don't have process.", "A full team. Assembled for the task.", etc.). Pass.
- No `<h3>` tags were found in the audit scope (content uses styled `<span>` and `<p>` elements for sub-items). This is acceptable.
- No heading level skips detected. Pass.

### Image Alt Text

Decorative images correctly use `alt=""` with `aria-hidden="true"`. Meaningful images have descriptive alt text:
- "The Sage — a meditating capybara surrounded by gathering birds" — good
- "A bird walking on a path that gradually becomes dark..." — good
- "The Sage capybara guides the bird along a lit path with agent checkpoints" — good

Pass.

### robots.txt

`site/public/robots.txt` — correct format, allows all agents, references sitemap at the canonical domain URL. Pass.

### Sitemap

**FAIL — `sitemap.xml` does not exist in `site/public/`**. `robots.txt` references `https://theengorg.wontonwebworks.com/sitemap.xml` but the file is not present. Either Astro's sitemap integration generates it at build time (verify in `astro.config.*`) or the file needs to be created.

**Action required**: Verify sitemap generation is configured in `astro.config.mjs` / `astro.config.ts`, or add a static sitemap file.

---

## 3. Documentation Hygiene — Grade: C

### Agent Count Inconsistencies

The actual framework has 24 agents. Document accuracy by file:

| File | Agent Count Stated | Accuracy |
|------|--------------------|----------|
| `docs/index.md` | "24 agents" | Correct |
| `docs/agents.md` | "24 agents" | Correct |
| `docs/architecture.md` | "24 agents" | Correct |
| `docs/getting-started.md` | "18 skills and 24 agents" (line 26, 32) | Skills count wrong (should be 19) |
| `README.md` | Mixed — "19 skills, 20 agents" (line 17, 58) in v3.1 block, "19 Skills. 24 Agents" (line 32), table says "20" agents (line 106) | **Multiple inconsistencies** |
| `CHANGELOG.md` | "19 skills" in v4.1.0 | Correct for that release |

**README.md is the most stale document.** Specific problems:

1. **Version header**: "Version: 3.1.0" — site and framework are at v5.0 (Sage architecture). The README leads with v3.1.0 which is 6 releases behind.
2. **Agent count in What's New block**: "19 skills, 20 agents" — stale from v3.1 era. Actual counts: 19+ skills, 24 agents.
3. **What You Get table** (line 106): Lists "Agents | 20" — should be 24.
4. **Line 104**: "Skills | 19 | Slash-command workflows" then links "[All 19 skills →]" — skill count needs verification against actual framework.
5. **Line 110**: Correctly links "All 24 agents →" — inconsistent with the table two lines above.

**docs/getting-started.md** problems:

1. Lines 26, 32: "18 skills and 24 agents" — skills count is 18, but CHANGELOG and README say 19. Needs reconciliation.

### Sage Documentation

`docs/agents.md` correctly describes Sage as the project orchestrator at the top of the hierarchy. It does not explicitly flag Sage as enterprise-only. Given memory indicating Sage is enterprise-only while community gets an upgraded Supervisor, the agent docs may need an "Enterprise only" callout on the Sage section for community-facing documentation.

`docs/getting-started.md` and `docs/index.md` do not distinguish enterprise vs community edition anywhere. The index.md notes "The daemon pipeline is available as a commercial product" but Sage's exclusivity is not surfaced.

**Action required**: Add an "Enterprise" badge or note to the Sage entry in `docs/agents.md` and a brief edition comparison to `docs/index.md`.

### docs/architecture.md

Agent count is correct (24). Skill count says "18 skills" in directory structure comments (line 99). The architecture diagram is accurate. No broken internal links detected. This is the cleanest of the docs files.

### Broken / Dead References

- `docs/index.md` links to `[Getting Started](/getting-started)` etc. — these are VitePress relative paths; correctness depends on VitePress config.
- `docs/architecture.md` line 400: "Create `SKILL.md` in `src/framework/skills/<agent-name>/`" — the extension type (`SKILL.md` vs `agent.md`) is inconsistent with the stated convention for agent files. Minor confusion risk.
- `README.md` links to `wonton-web-works.github.io/miniature-guacamole/` — verify this domain is live; the rebrand to `theengorg.wontonwebworks.com` may mean these links 404.

### CHANGELOG.md

CHANGELOG is current through v4.1.0. v5.0 (Sage architecture, per memory) is not documented in `CHANGELOG.md`. The file appears to stop at v4.1.0 despite the framework version being higher.

**Action required**: Document v4.2.0, v5.0 (Sage architecture) in CHANGELOG.

---

## 4. Test Health — Grade: C

### Current Status

```
Test Files  74 passed | 4 skipped (78)
Tests       2451 passed | 90 skipped (2541)
Duration    8.05s
```

Tests pass locally. No test failures. This is the positive finding.

### Coverage — Critical Gap

```
All files  |  40.86 (Stmts)  |  85.9 (Branch)  |  72.77 (Funcs)  |  40.86 (Lines)
```

**Statement and line coverage is 40.86% — far below the stated 99% target.**

The architecture doc claims "99%+ (5,200+ tests across all suites)" and the dev agent constitution requires 99% coverage. The current coverage report shows the framework is not meeting its own standard.

Root cause: The coverage run captures modules in `src/visuals/`, `src/audit/`, `src/returns/`, and other TypeScript layers that have 0% coverage (0 statements covered). These files appear to be uncovered because:

1. Tests may exist in directories not included in the Vitest coverage config
2. Or these modules were added after the test suite was last updated

**The 2451 tests that pass do not map to 99% coverage of all source files.**

### Skipped Tests

4 test files are skipped. The skipped reason is not visible from the output. Skipped tests should be:
1. Documented with a reason (e.g., `test.skip('reason: depends on Postgres')`)
2. Tracked as known gaps, not forgotten

### Recommendation

Run `npx vitest run --coverage --reporter=verbose 2>&1 | grep "0 |" | head -20` to enumerate which source files have 0% coverage and determine if they have test files that are not being picked up by Vitest config.

---

## 5. CI/CD Health — Grade: D

### Recent Run Summary (last 5 runs)

| Workflow | Status | Trigger |
|----------|--------|---------|
| Auto-update daemon branches | **FAILURE** | push to main |
| Deploy TheEngOrg | success | push to main |
| CI | **FAILURE** | push to main |
| CI | **FAILURE** | PR: fix/mobile-responsive-v2 |
| Deploy TheEngOrg | success | previous push |

Two out of three workflows are failing on main. CI is the critical one.

### CI Failure Details

**Failure 1: TypeScript type check (dashboard)**

```
prisma/seed.ts(22,30): error TS2307: Cannot find module '@prisma/client'
  or its corresponding type declarations.
```

The dashboard Prisma client is not installed in CI. This is a dependency that needs `npx prisma generate` to run before type-checking, or the CI workflow needs to add a `prisma generate` step before `tsc --noEmit`.

**Failure 2: Auto-update daemon branches**

```
remote: error: GH013: Repository rule violations found for refs/heads/feature/GH-117-triage-core.
error: failed to push some refs
```

A branch protection rule is blocking the daemon's auto-update push to a feature branch. The daemon is trying to push to `feature/GH-117-triage-core` but the branch is protected. This is a configuration mismatch between the daemon's push permissions and GitHub branch protection rules.

### Impact Assessment

- The **Deploy TheEngOrg** workflow succeeds, so the site is deploying correctly
- The **CI** failure means PRs cannot get a green check — any PR merges are happening without CI validation
- The **auto-update daemon** failure means daemon-authored PR branches are going stale (not rebased onto main)

### Recommendations

1. Fix Prisma dependency: Add `npx prisma generate` step to the CI workflow before TypeScript type checking
2. Investigate branch protection: Determine whether `feature/GH-117-triage-core` should be exempt from the violated rule, or whether the daemon's token lacks permission
3. Monitor whether the CI failure is causing PRs to merge without green status checks

---

## Prioritized Action Items

### P0 — Fix Immediately

1. **OG image missing**: Create `site/public/og-image.png` (1200x630px) — all social sharing is broken without it
2. **CI failure — Prisma type error**: Add `npx prisma generate` to CI before type check step
3. **Sitemap missing**: Verify sitemap generation is wired in Astro config or add static file

### P1 — High Priority

4. **Meta description over limit**: Shorten `index.astro` description from 199 to under 160 chars
5. **README version header**: Update from "Version: 3.1.0" to current version; fix agent count table (20 → 24)
6. **README/getting-started skill count**: Reconcile "18 skills" vs "19 skills" discrepancy across docs
7. **Coverage gap**: Investigate why statement coverage is 40.86% instead of claimed 99% — identify which modules are excluded from tests

### P2 — Normal Priority

8. **Font self-hosting**: Implement the documented TODO — migrate from Google Fonts to `@fontsource/inter` and `@fontsource/jetbrains-mono`
9. **Image lazy loading**: Add `loading="lazy"` to all `<img>` tags below the fold
10. **Image dimensions**: Add `width`/`height` to images missing them (hierarchy, teacher, bridge sections)
11. **Sage enterprise-only callout**: Add edition note to `docs/agents.md` Sage section
12. **CHANGELOG gap**: Document v4.2.0 and v5.0 in CHANGELOG.md

### P3 — Low Priority

13. **Image format**: Convert PNG pixel art to WebP with `<picture>` fallback via Astro `<Image />`
14. **Daemon branch protection**: Resolve daemon auto-push permission conflict
15. **Skipped tests**: Document and track the 4 skipped test files with explicit reasons

---

*Audit performed via static analysis — no browser or Lighthouse execution. Findings based on source file review, CI log analysis, and test runner output.*
