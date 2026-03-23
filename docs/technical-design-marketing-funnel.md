# Technical Design: Marketing Site Funnel Redesign

**PRD:** docs/prd-marketing-funnel.md
**Date:** 2026-03-22

---

## Architecture

The site is a static Astro 6 site with React components (`client:load`). No backend. Deployed via Caddy on Hetzner.

### WS-FUNNEL-1: Copy Rewrite

**Scope:** Edit `site/src/pages/index.astro` only. No new components.

**Changes:**
1. Add Section 2 ("The Problem") after hero — new HTML section, uses existing CSS patterns (section-inner, section-heading, etc.)
2. Rewrite drift section headings and data labels — s/drift/quality issues/, s/tokens/rework cycles/
3. Rewrite hero lede to be persona-neutral
4. Remove or rewrite any "spawning" jargon in the hierarchy section

**Risk:** Low — CSS-only changes + HTML copy edits.

### WS-FUNNEL-2: Multi-CTA Routing

**Scope:** Edit CTA sections in index.astro. May add a simple email capture component.

**Options for email capture:**
1. **Mailto links with subject tags** (current) — zero infra, works now
2. **Formspree / Formspark** — free tier, hosted form backend, no server needed
3. **Custom form → Caddy endpoint** — needs backend work

**Recommendation:** Start with mailto (option 1) + add Formspree for structured capture when pilot inquiries start. No backend needed.

**CTA layout:**
```html
<div class="cta-grid">
  <div class="cta-card leader">
    <h3>Engineering leaders</h3>
    <p>See PrivateEnterprise on your codebase</p>
    <a href="mailto:...">Talk to us</a>
  </div>
  <div class="cta-card developer">
    <h3>Developers</h3>
    <p>Try the open-source framework</p>
    <a href="github.com/...">Get started</a>
  </div>
  <div class="cta-card investor">
    <h3>Investors</h3>
    <p>See the opportunity</p>
    <a href="/investor">Learn more</a>
  </div>
</div>
```

### WS-FUNNEL-3: Gated VC Deck Site

**Scope:** New Astro page + data layer for fund personalization.

**Architecture:**
```
site/src/pages/investor.astro          — gated deck page
site/src/data/funds/                   — fund profile YAML files
site/src/data/funds/prime-ventures.yaml
site/src/data/funds/general.yaml       — default/generic version
```

**Fund profile schema:**
```yaml
fund_name: Prime Ventures
location: Amsterdam
aum: "€350M"
thesis: "Capital-efficient B2B SaaS"
portfolio_relevant:
  - name: "CompanyX"
    what: "Dev tooling, $2M seed"
  - name: "CompanyY"
    what: "AI infra, $5M Series A"
personalized_section:
  headline: "How TEO fits Prime's portfolio thesis"
  body: "Capital efficiency is your thesis. TEO's zero-infra model..."
  metrics:
    - label: "Gross margin"
      value: "95%+"
    - label: "Payback"
      value: "< 30 days"
```

**Access control:** Same pattern as /pilot — page exists but is never linked. Direct URL shared with specific fund contacts. URL could include fund slug: `/investor?fund=prime-ventures`.

**Dynamic rendering:** Astro can read the YAML at build time. For per-fund URLs, use query params read client-side, or generate static pages per fund with `getStaticPaths()`.

**Recommendation:** Start with query param approach (single page, client-side fund selection). Graduate to static generation when fund count > 5.

### WS-FUNNEL-4: Engagement Tracking

**Options:**
1. **Plausible Analytics** — privacy-friendly, self-hostable, lightweight
2. **Simple custom events** — `navigator.sendBeacon()` to a Caddy log endpoint
3. **Umami** — OSS, self-hostable

**Recommendation:** Plausible cloud ($9/mo) or self-host on Hetzner. Custom events for CTA clicks. No Google Analytics — privacy stance aligns with brand.

**Implementation:**
```html
<!-- In Base.astro layout -->
<script defer data-domain="private-enterprise.wontonwebworks.com"
  src="https://plausible.io/js/script.js"></script>
```

CTA click tracking:
```html
<a href="..." onclick="plausible('CTA Click', {props: {type: 'pilot'}})">
```

---

## Execution Order

```
WS-FUNNEL-1 (copy rewrite)     ← do first, unblocks everything
WS-FUNNEL-2 (multi-CTA)        ← do second, parallel with 1
WS-FUNNEL-4 (tracking)         ← do third, quick
WS-FUNNEL-3 (VC deck site)     ← do last, biggest scope
```

## Files Affected

| Workstream | Files |
|-----------|-------|
| WS-FUNNEL-1 | `site/src/pages/index.astro` |
| WS-FUNNEL-2 | `site/src/pages/index.astro` |
| WS-FUNNEL-3 | `site/src/pages/investor.astro` (new), `site/src/data/funds/*.yaml` (new) |
| WS-FUNNEL-4 | `site/src/layouts/Base.astro`, `site/src/pages/index.astro` |
