# PRD: TheEngOrg Marketing Site — Funnel & Engagement Redesign

**Status:** APPROVED FOR DEVELOPMENT
**Date:** 2026-03-22
**Owner:** CEO + CMO
**Priority:** P0 — on the 60-day VC sprint critical path

---

## Problem

The marketing site is built for one persona (technical founder who is CTO + dev + buyer). It uses jargon ("drift", "tokens", "selective C-Suite spawning") that alienates the actual buyer personas. It has sections but no funnel — no defined path from "visitor arrives" to "conversion action taken."

The site also lacks routing — everyone sees the same page regardless of whether they're a developer, an engineering leader buying for their team, or an investor evaluating the opportunity.

## Brand Pillars (non-negotiable)

1. **We love humans** — empower engineers, never position as replacing them
2. **AI needs process** — raw AI tools don't deliver 10x. Systems do. TEO is the system.

## Target Personas

| Persona | Role | Cares about | Doesn't care about | Conversion |
|---------|------|------------|-------------------|------------|
| **Engineering Leader** | CTO, VP Eng, Head of Eng | Team velocity, quality, confidence, cost | Token counts, agent internals | Pilot invite / "Talk to us" |
| **Developer** | IC engineer, tech lead | Can I try it? Is it good? OSS? | Pricing, org charts | GitHub / OSS install |
| **Investor** | VC partner, fund manager | Market, unit economics, traction | How the Sage works internally | Gated VC deck site |

## Page Structure (proposed)

### Section 1: Hero
- **Who:** Everyone (30-second understanding)
- **Language:** Zero jargon. "Your AI engineering team. Process that actually works."
- **CTA:** "See how it works" (scroll) + "Talk to us" (email)
- **Visual:** Sage animation (already built)

### Section 2: The Problem (education — Pillar 2)
- **Who:** Engineering leaders + developers
- **Message:** "Your team has AI tools. They don't have process."
- **Frame:** Execs say "here's Copilot, go 10x" — but raw tools without structure produce inconsistent results. You need a system.
- **NO jargon.** Plain language about the gap between "AI tool" and "AI results."

### Section 3: How TEO Works (the solution)
- **Who:** Everyone
- **Message:** Show the org structure — Sage → C-Suite → ICs — but explain it in business terms
- **Frame:** "Every task gets the right team. No micromanagement."
- Keep the interactive spawning card — it's great
- Rename: instead of "task types" use "what you need done"

### Section 4: Quality Story (replaces "drift detection")
- **Who:** Engineering leaders (buyers)
- **Message:** "Same team. Same code. One catches problems before they ship."
- **NO:** "drift", "tokens wasted on rework", "drifts caught"
- **YES:** "bugs caught before production", "rework cycles prevented", "security issues stopped early"
- Illustrations: bird-lost vs bird-guided (already built)
- Data: reframe in business terms (hours saved, bugs prevented, sprint velocity)

### Section 5: By the Numbers
- **Who:** Engineering leaders + investors
- Already rewritten with empowerment framing
- Keep as-is

### Section 6: Social Proof (NEW)
- **Who:** Everyone
- Pilot partner testimonials (when available)
- "Powered by miniature-guacamole" OSS credibility
- GitHub stars / community metrics

### Section 7: CTA — Route by Persona
- **Engineering leader:** "See it on your codebase" → pilot invite form
- **Developer:** "Try it free" → GitHub
- **Investor:** "Investment opportunities" → gated VC deck
- Capture email + role to route correctly

### Section 8: Changelog
- Keep at bottom — shows momentum
- Already pulling from GitHub API

### Section 9: Footer
- Keep as-is

## Workstreams

### WS-FUNNEL-1: Copy Rewrite — De-jargon + Persona Alignment
**Classification:** MECHANICAL
**Dependencies:** None
**AC:**
- [ ] Every section heading readable by a non-technical CTO
- [ ] "Drift" replaced with plain language ("quality issues", "problems")
- [ ] "Tokens" never mentioned on the marketing page
- [ ] Section 2 (The Problem) written and placed after hero
- [ ] Quality Story section reframed in business terms

### WS-FUNNEL-2: Multi-CTA Routing
**Classification:** MECHANICAL
**Dependencies:** None
**AC:**
- [ ] CTA section has 3 clear paths (leader, dev, investor)
- [ ] "Talk to us" goes to email with subject tagging
- [ ] "Try it free" goes to GitHub
- [ ] "Investment opportunities" is present but subtle
- [ ] CTAs are repeated in hero and mid-page, not just bottom

### WS-FUNNEL-3: Gated VC Deck Site
**Classification:** ARCHITECTURAL
**Dependencies:** WS-FUNNEL-2
**AC:**
- [ ] New page at /investor (gated like /pilot)
- [ ] Web version of pitch deck
- [ ] Fund-specific personalization: "How TEO works in [Fund Name]'s portfolio"
- [ ] Research pipeline: fund size, age, portfolio companies, thesis
- [ ] Fund manager profiles grouped by target tier
- [ ] Dynamic section rendering based on fund profile
- [ ] Access via direct URL only — never linked publicly

### WS-FUNNEL-4: Engagement Tracking
**Classification:** MECHANICAL
**Dependencies:** WS-FUNNEL-2
**AC:**
- [ ] Know which CTA was clicked (simple analytics or event tracking)
- [ ] Know visitor source (referral, organic, VC link)
- [ ] Email capture with role identification
- [ ] Lightweight — no heavy analytics platform needed initially

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Time to understand value prop | Unknown | < 30 seconds (hero scan) |
| CTA click rate | 0 (no tracking) | > 5% of visitors |
| Pilot inquiries from site | 0 | 2+ per week |
| VC deck views | 0 | Tracked per fund |
| Bounce rate on drift section | Unknown | < section average |

## Out of Scope
- Blog / content marketing
- Pricing page (too early)
- Self-serve signup (pilots are white-glove)
