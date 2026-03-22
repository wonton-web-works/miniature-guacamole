# Security Review — PrivateEnterprise Enterprise Marketing Page

**Reviewer:** Security Engineer (miniature-guacamole)
**Date:** 2026-03-22
**Scope:** `site/src/pages/enterprise.astro`, `site/src/pages/pilot.astro`, `site/src/layouts/Base.astro`, `site/astro.config.mjs`
**Domains assessed:** Web (OWASP Top 10), Crypto (TLS/headers)
**Status:** needs_review

---

## Summary

This is a static Astro marketing page with no server-side request handling, no authenticated API routes, and no database. The attack surface is intentionally narrow. No critical or high-severity issues were found. The most significant concerns are:

1. The pilot "gate" is purely client-side and trivially bypassed.
2. No HTTP security headers are deployed (no CSP, no HSTS, no X-Frame-Options).
3. Google Fonts is loaded without Subresource Integrity.
4. The enterprise page embeds its own `<head>` instead of inheriting from Base, causing maintenance drift.

---

## Findings

---

### CRITICAL — Pilot gate is client-side only; allowed email list ships in page source

**Location:** `site/src/pages/pilot.astro:119-122`

```js
const ALLOWED: string[] = [
  // Add pilot invitee emails here
  "test@private-enterprise.com",
];
```

**Finding:** The entire access-control mechanism for the invite-only Founding Partner Program is a JavaScript array in the browser bundle. Any visitor can:
- Open DevTools → Sources → read the `ALLOWED` list in plain text.
- Open DevTools → Console → type `document.getElementById('gate').style.display = 'none'` to skip the gate entirely.
- Open DevTools → Console → directly call `program.removeAttribute('aria-hidden')` to reveal the content.

The program content (pricing, timeline, onboarding email) is present in the DOM at page load. The gate is CSS/JS cosmetic only.

**Risk:** Founding Partner pricing terms, the direct onboarding contact email, and program details are publicly visible to anyone who looks. At current stage this may be acceptable risk, but as the list grows with actual invitee emails (PII), those addresses will be exposed in the page source to every visitor.

**Recommendation:**
- Move gate enforcement server-side. Use a short-lived signed token (HMAC or JWT) emailed to invitees. The page body only renders on valid token presentation at the server/edge layer.
- Minimum viable improvement: move the pilot page to a path that is not guessable (e.g., `/invite/[uuid]`) and strip it from the sitemap. This does not fix the PII exposure but limits casual discovery. A memory entry already notes the pilot page should never be linked publicly — enforce this at the routing layer, not just by convention.
- Do not add real invitee emails to the `ALLOWED` array in source code. If you must keep the current approach temporarily, load the list from an environment variable via Astro SSR so it is never in the client bundle.

---

### HIGH — No HTTP security headers on any page

**Location:** `site/astro.config.mjs` (no headers config), `site/public/_headers` (does not exist)

**Finding:** No security headers are set anywhere in the deployment configuration. Verified: no `netlify.toml`, no `vercel.json`, no `public/_headers` file exists. This means every page — including the enterprise and pilot pages — is served without:

| Header | Risk of absence |
|---|---|
| `Content-Security-Policy` | XSS payloads can execute if any injection vector is found or introduced |
| `X-Frame-Options` / `frame-ancestors` CSP | Clickjacking — page can be embedded in a malicious iframe |
| `X-Content-Type-Options: nosniff` | MIME-type confusion attacks |
| `Referrer-Policy` | The mailto link subject line and URL path leak to third parties |
| `Strict-Transport-Security` | HTTPS downgrade / MITM if hosting does not enforce this at the CDN layer |
| `Permissions-Policy` | Browser features (camera, geolocation) not explicitly locked down |

**Recommendation:** Add a `public/_headers` file (works for Netlify and Cloudflare Pages) or equivalent:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'
```

Note: `unsafe-inline` is required for both `style-src` and `script-src` because the enterprise page has large `<style>` blocks and multiple inline `<script>` blocks. See the CSP-specific finding below for how to harden this further.

---

### HIGH — Google Fonts loaded without Subresource Integrity (SRI)

**Location:** `site/src/layouts/Base.astro:47-50`, `site/src/pages/enterprise.astro:14-17`

**Finding:** Google Fonts is loaded via:

```html
<link href="https://fonts.googleapis.com/css2?..." rel="stylesheet" />
```

There is no `integrity` attribute. If Google's CDN is compromised or the URL is somehow intercepted (MitM against an HTTP connection before HSTS kicks in), a malicious stylesheet could be injected. Stylesheet injection can be leveraged for UI redressing, exfiltration of form data via CSS attribute selectors, and — in the absence of a strict CSP — may facilitate script injection in some attack chains.

Additionally, the enterprise page defines its own `<head>` entirely (it does not use the `Base.astro` layout), so fonts are loaded in two separate places with slightly different weight sets. This is a maintenance risk: future security changes to `Base.astro` will not apply to the enterprise page.

**Recommendation:**
1. Add `crossorigin="anonymous"` and an `integrity` hash to the stylesheet link. Because Google Fonts URLs change with weight parameters, the practical recommendation is to self-host the font files (`fontsource` npm packages) and serve from `'self'`, which also eliminates the third-party dependency entirely.
2. Refactor the enterprise page to extend `Base.astro` rather than redefining its own `<head>`. This ensures all future security header or meta changes apply consistently.

---

### MEDIUM — Inline `<script>` and `<style>` blocks will prevent a strict CSP

**Location:** `site/src/pages/enterprise.astro:18` (large `<style>` block), `site/src/pages/enterprise.astro:2651` (`<script>` block), `site/src/pages/pilot.astro:118` (`<script>` block)

**Finding:** The enterprise page has one large inline `<style>` block (~2600 lines) and one inline `<script>` block at the bottom of the document. The pilot page has one inline `<script>` block. Inline scripts and styles require `unsafe-inline` in the CSP, which significantly weakens it — in particular, `unsafe-inline` for `script-src` negates most XSS protection that a CSP would otherwise provide.

While the current code has no XSS injection vectors (content is fully static), this architecture makes it impossible to deploy a meaningful script CSP without a refactor.

**Recommendation:**
- Extract the inline `<script>` blocks to external `.js` files in `src/`. Astro will bundle and fingerprint them, making `script-src 'self'` viable.
- For the inline `<style>` block on enterprise.astro: migrate to Astro's scoped `<style>` syntax or a separate CSS file. If left inline, use `style-src 'nonce-{random}'` per request (requires SSR mode) or `style-src 'sha256-{hash}'` (requires computing the hash at build time).
- Alternatively, use `script-src 'nonce-{random}'` via Astro SSR middleware if full extraction is not feasible immediately.

---

### MEDIUM — Enterprise page `<head>` is self-contained, diverging from Base layout

**Location:** `site/src/pages/enterprise.astro:1-17`

**Finding:** The enterprise page defines its own complete `<!doctype html>`, `<html>`, `<head>`, and `<body>` tags inline. It does not use `<Base>` or any shared layout. This means:
- Security headers added to `Base.astro` will not apply here.
- The OpenGraph / Twitter card meta tags present in `Base.astro` are absent from the enterprise page, which also has mild information disclosure implications (the page title and description are slightly different from what the layout would set, and the hardcoded description includes internal framing: "24 agents — CEO, CTO, QA, Dev, Security, Design — led by The Sage").
- Any future `<meta http-equiv>` security tags would need to be added to two places.

**Recommendation:** Refactor enterprise.astro to use `Base.astro` as its layout, passing title and description as props. This is a maintenance and consistency fix with direct security relevance.

---

### LOW — External link to GitHub missing `rel` on enterprise page hero CTA

**Location:** `site/src/pages/enterprise.astro:2609`

```html
<a href="/pilot" class="cta-btn-secondary">
```

**Finding:** The `/pilot` link is an internal relative link — this specific instance is fine. However, a broader scan of all link targets confirms only one external link (`github.com`) has `rel="noopener noreferrer"` (line 2639). The `mailto:` links do not require `rel` attributes. No other `target="_blank"` external links were found, so this area is clean.

**Status:** No action required on link security. Recording for completeness.

---

### LOW — `svg.innerHTML = ''` used to clear SVG elements

**Location:** `site/src/pages/enterprise.astro:2782`, `enterprise.astro:2923`

```js
svg.innerHTML = '';
```

**Finding:** `innerHTML` is used to clear SVG containers before redrawing paths. This is not an injection risk in the current code because no attacker-controlled string is assigned to `innerHTML` — the assignment is always an empty string, and all subsequent SVG elements are created via `document.createElementNS` with `setAttribute`. This pattern is safe as written.

**Note:** If future developers follow this pattern and pass user-controlled or external data through `innerHTML`, it becomes an XSS vector immediately. The `svg.innerHTML = ''` idiom should be replaced with DOM removal loops to avoid normalizing the use of `innerHTML` on SVG elements:

```js
while (svg.firstChild) svg.removeChild(svg.firstChild);
```

---

### LOW — `textContent` used safely; no injection risk

**Location:** `site/src/pages/enterprise.astro:2864`, `enterprise.astro:2867`

```js
if (taskDesc) taskDesc.textContent = scenario.task;
if (svgTitle) svgTitle.textContent = scenario.svgTitle;
```

**Finding:** `textContent` is used (not `innerHTML`) to write scenario strings into the DOM. The scenario data is a static hardcoded object in the script, not user input. This is the correct pattern and poses no injection risk. Recorded as confirmation of safe practice.

---

### LOW — No robots.txt or sitemap exclusion for `/pilot`

**Location:** `site/public/` (no robots.txt present)

**Finding:** No `robots.txt` exists in `site/public/`. The `/pilot` path is not excluded from crawlers. While the project memory records that `/pilot` should never be linked from public navigation, a crawler following the enterprise page CTA link at line 2609 (`<a href="/pilot">`) will index the pilot page and expose it in search results. This partially undermines the "invite-only" intent.

**Recommendation:**
- Add `site/public/robots.txt` disallowing `/pilot`:
  ```
  User-agent: *
  Disallow: /pilot
  ```
- Remove the visible `/pilot` link from the enterprise page CTA, or replace it with a direct mailto/form that triggers an invite to be sent. The current CTA exposes the path publicly.

---

### INFO — No analytics, tracking pixels, or cookie usage detected

**Location:** All reviewed files

**Finding:** No Google Analytics, Segment, Mixpanel, Hotjar, or other analytics scripts were found. No `document.cookie` reads or writes. No `localStorage` or `sessionStorage` usage. No tracking pixels. The pilot page uses no session persistence — the gate state resets on page reload.

**Status:** Clean. No action required.

---

### INFO — No forms with server-side submission; CSRF not applicable

**Location:** `site/src/pages/pilot.astro:15-25`

**Finding:** The gate form on the pilot page has `onsubmit="return false;"` — it never submits to a server. There is no `action` attribute. CTA links are `mailto:` links. No server-side form processing occurs.

**Status:** CSRF is not applicable. No action required.

---

### INFO — Images served from self-hosted paths; no mixed content

**Location:** All `<img>` tags in `enterprise.astro`

**Finding:** All images use relative paths (`/assets/capy/...`). No images are loaded from external domains. No mixed HTTP/HTTPS content. The `og-image.png` reference in `Base.astro` is also a relative path.

**Status:** Clean. No action required.

---

### INFO — No API endpoints, secrets, or internal architecture details disclosed

**Location:** Full file scan

**Finding:** No API keys, tokens, or credentials appear in either page. The `mailto:` address `byazaki@wontonwebworks.com` is an intentionally public contact. No internal service URLs, database connection strings, or file system paths beyond public asset paths were found.

The description tag on the enterprise page ("24 agents — CEO, CTO, QA, Dev, Security, Design — led by The Sage") describes the product publicly, which is intentional marketing copy — not information disclosure in the security sense.

One note: the Sage benchmark result reference (`0.957→1.000`) appears in project memory but not in the page source. Clean.

**Status:** No action required.

---

## Prioritized Remediation Backlog

| Priority | Finding | Effort |
|---|---|---|
| 1 | Move pilot gate server-side; never put invitee emails in client bundle | High |
| 2 | Add HTTP security headers (`_headers` or `netlify.toml`) | Low |
| 3 | Add `robots.txt` to exclude `/pilot`; consider removing the public CTA link | Low |
| 4 | Extract inline `<script>` blocks to external files (enables meaningful CSP) | Medium |
| 5 | Refactor enterprise page to use `Base.astro` layout | Medium |
| 6 | Self-host Google Fonts or add SRI hash | Low |
| 7 | Replace `svg.innerHTML = ''` with DOM removal loop | Low |

---

## Verdict

The enterprise marketing page itself is **secure** for a static site — no user-controllable content, no XSS vectors, no credential exposure, external links handled correctly. The **pilot page has a structural security issue**: the gate is decorative, not functional, and will become a PII exposure problem as real invitee emails are added. The absence of HTTP security headers is the most broadly impactful gap and has a low remediation cost.

**Domains reviewed:** web, crypto
**OWASP categories touched:** A01 (Broken Access Control — pilot gate), A05 (Security Misconfiguration — missing headers/SRI), A03 (Injection — `innerHTML` note)
