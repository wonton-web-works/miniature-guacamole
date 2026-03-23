# TheEngOrg — Go-to-Market Strategy
**WS-PITCH-04 | CEO Deliverable | Data Room Document**
*As of: 2026-03-22 | Customer Acquisition, Pricing, and First 12 Months*

---

## Executive Summary

TheEngOrg's go-to-market follows the open-core playbook that HashiCorp, Grafana Labs, GitLab, and Snyk validated: open-source distribution creates community adoption, community adoption creates enterprise pipeline, enterprise contracts generate revenue. The specific advantage is cost structure: zero infrastructure means every dollar of enterprise revenue is 91-94% gross margin, and the customer's own API costs (paid to Anthropic) make the product self-reinforcing — more usage equals more value delivered equals stronger retention. The first 12 months focus on one thing: proving that paying customers exist, measuring what they value, and building the case study library that accelerates every sale after the first five.

---

## Motion 1: Product-Led Growth (PLG) Through Open Source

### The Funnel

```
AWARENESS: Developer discovers TheEngOrg on GitHub, blog post, conference talk
     |
     | (organic — no paid acquisition)
     ↓
ADOPTION: Developer installs community edition, runs /mg-init, uses agents
     |
     | (value delivered immediately — 23 agents, 16 skills, zero cost)
     ↓
HABIT: Developer integrates TheEngOrg into daily workflow across multiple projects
     |
     | (switching cost builds — organizational memory, workflow muscle memory)
     ↓
TEAM: Developer brings TheEngOrg to their team ("you should see what this does")
     |
     | (organic expansion — developer is the internal champion)
     ↓
LIMITATION: Team hits community tier limits (no Sage, no session management, no drift detection)
     |
     | (natural conversion trigger — team needs, not individual needs)
     ↓
ENTERPRISE: Team lead or VP Engineering evaluates enterprise tier
     |
     | (sales conversation starts with an informed, enthusiastic buyer)
     ↓
CONVERSION: Enterprise contract signed ($3,500-12,000/mo)
```

### Why PLG Works for This Product

**The developer is the buyer and the user.** Unlike enterprise tools that are purchased by procurement and imposed on developers (who then hate them), TheEngOrg is discovered by developers who choose to use it. By the time an enterprise conversation starts, the buyer already knows the product works.

**The free tier is genuinely valuable.** This is not a trial. The community edition includes 23 agents, all 16 skills, and the full development workflow. A developer using the community edition gets real productivity gains. This matters because: (1) genuine value creates genuine word-of-mouth, and (2) enterprise conversion is an upgrade conversation, not a sales conversation.

**The conversion trigger is natural.** Teams do not need to be convinced the community edition is insufficient. They experience the limitation: multi-session initiatives fail because there is no session management, scope drift is caught too late because there is no Sage, token costs are 40-60% higher because the Supervisor always spawns all C-Suite agents. The enterprise tier solves problems the team has already felt.

### Community Growth Targets

| Metric | Month 3 | Month 6 | Month 12 |
|---|---|---|---|
| GitHub stars | 500 | 2,000 | 8,000 |
| Active community users | 400 | 1,500 | 5,000 |
| Weekly active installs | 50 | 150 | 500 |
| Community contributors (PRs) | 5 | 20 | 50 |
| Blog posts / talks by community | 2 | 10 | 30 |

These targets are based on comparable open-source developer tools at similar stages. Growth is organic + content-driven (see Channel Strategy below).

---

## Motion 2: Enterprise Sales

### The Pipeline

Enterprise sales begins where community PLG ends. The pipeline has three stages:

**Stage 1: Pilot ($0 or $1,500/mo Founding Partner)**

- Duration: 30-60 days
- Goal: Prove measurable value (velocity improvement, defect reduction, cost savings)
- Commitment: Customer deploys TheEngOrg on one real project, not a sandbox
- Exit criteria: Quantified metrics that justify enterprise pricing
- Number of pilots: 2 active at raise close, target 5-8 Founding Partners by Month 6

**Stage 2: Founding Partner ($1,500/mo, 12-month contract)**

- Duration: 12 months
- Goal: Generate case study data, refine onboarding, validate pricing
- Commitment: Full team deployment, data sharing for case study (anonymized if required)
- Pricing: Below market deliberately — these accounts buy credibility, not revenue
- Conversion: At Month 7-9, offered Enterprise upgrade at $2,800/mo (20% loyalty discount)
- Target: 5-8 Founding Partner accounts by Month 6

**Stage 3: Enterprise ($3,000-5,000/mo, 12-month contract)**

- Duration: Ongoing
- Goal: Primary revenue driver
- Commitment: Team-level deployment, Sage activation, onboarding support
- Pricing: $3,500/mo blended average (see Financial Model for detailed pricing architecture)
- Onboarding: $2,500 one-time setup fee
- Target: 32+ Enterprise accounts by Month 12 (base scenario)

**Stage 4: Strategic ($10,000-15,000/mo, 12-month contract)**

- Duration: Ongoing
- Goal: Large accounts that drive ARR and case study credibility
- Commitment: Multi-team deployment, dedicated onboarding, SLA
- Pricing: $12,000/mo blended average
- Requirements: Reference accounts required — no Strategic sale before Month 16
- Target: First Strategic account at Month 16, 20 by Month 36

### Sales Cycle Expectations

| Customer Type | Cycle Length | Reason |
|---|---|---|
| Solo founder / startup (<10 devs) | 7-14 days | Founder IS the buyer, no procurement |
| Growth startup (10-30 devs) | 30-60 days | VP Eng or CTO decides, minimal procurement |
| Scale-up (30-100 devs) | 60-90 days | Formal evaluation, possibly legal review |
| Enterprise (100+ devs) | 90-180 days | Procurement, security review, pilot required |

**Year 1 focus:** Solo founders and growth startups (7-60 day cycles). Enterprise accounts are deferred to Year 2 when reference accounts and case studies exist to support a longer sales process.

---

## Channel Strategy

### Channel 1: Developer Communities (Primary, Months 1-12)

| Channel | Activity | Expected Reach |
|---|---|---|
| **GitHub** | Repository optimization, README, contributing guide, issues, discussions | 5,000+ views/month by Month 6 |
| **Hacker News / Reddit** | Launch post, case studies, technical deep-dives | 2-3 front-page posts per year |
| **Twitter/X** | Daily developer content — tips, agent insights, community highlights | 5,000+ followers by Month 12 |
| **Discord/Slack** | Community server — support, feedback, agent customization discussion | 500+ members by Month 6 |
| **Dev.to / blog** | Technical content — how agents work, constitution engineering, benchmarks | 20+ articles in Year 1 |

**Investment:** Primarily founder time (Months 1-5), then Design/DevRel hire (Month 6+). No paid promotion budget.

### Channel 2: AI Engineering Conferences (Secondary, Months 4-12)

| Event | Type | Cost | Expected Impact |
|---|---|---|---|
| AI Engineer Summit | Talk submission | Travel only (~$2,000) | Developer awareness, enterprise leads |
| Local AI/dev meetups | Lightning talks, demos | $0-500 | Community building, early adopters |
| Claude Code community events | Sponsor/participate | $500-2,000 | Direct target audience |
| Enterprise AI conferences | Attendee, networking | $1,000-3,000 | Enterprise pipeline seeding |

**Investment:** $5,000-15,000 total in Year 1. Not a primary acquisition channel — purpose is credibility and direct enterprise contact.

### Channel 3: Content Marketing (Compounding, Months 1-12)

Content is the long-term acquisition engine. Developer tools sell through education, not advertising.

| Content Type | Frequency | Purpose |
|---|---|---|
| Technical blog posts | 2x/month | SEO, developer education, thought leadership |
| Benchmark reports | Quarterly | Credibility, differentiation proof, media coverage |
| Case studies | As available (target 3-5 in Y1) | Enterprise sales enablement |
| "State of AI Engineering" report | Annual (Month 10) | Category definition, press coverage |
| Video demos | Monthly | Product understanding, social sharing |

### Channel 4: Investor Portfolio Network (Leverage, Months 3-12)

Prime Ventures (and any co-investors) provide direct access to 30+ portfolio companies — pre-vetted, funded, building engineering teams.

| Activity | Timeline | Expected Outcome |
|---|---|---|
| Warm intros from lead investor | Monthly starting Month 3 | 2 intros/quarter, 30% close rate |
| Portfolio company presentations | Quarterly | Batch evaluation, social proof within portfolio |
| Co-marketing with portfolio companies | As available | Case studies, cross-promotion |

**Expected from this channel:** ~2-3 new enterprise accounts per year from investor network alone. Low volume but high close rate and zero CAC.

---

## Pricing Strategy

### Principles

**1. Consumption-aligned pricing.** The more a team uses TheEngOrg, the more value they receive. Pricing scales with team size (seat blocks), not with AI usage (token consumption). The customer's API costs scale with Anthropic; our pricing scales with team adoption.

**2. Below procurement thresholds at entry.** The Founding Partner tier ($1,500/mo = $18,000/yr) and low-end Enterprise tier ($3,000/mo = $36,000/yr) are deliberately below the $50-60K threshold that triggers formal procurement at most companies. This enables fast sales cycles.

**3. Expansion built into the model.** Teams start with one project, expand to multiple. Teams start with 5 developers, grow to 20. The pricing tiers (Founding Partner -> Enterprise -> Strategic) map to this natural expansion.

**4. Zero infrastructure markup.** The customer pays Anthropic for API tokens. TheEngOrg charges for organizational intelligence — constitutions, Sage, governance, support. There is no hidden compute cost in our pricing. This transparency builds trust and makes ROI calculations straightforward for the buyer.

### Pricing Architecture

| Tier | Monthly | Annual | Target | Includes |
|---|---|---|---|---|
| **Community** | $0 | $0 | Developers, solo projects | 23 agents, Supervisor, all skills/protocols |
| **Founding Partner** | $1,500 | $18,000 | Early adopters, <10 devs | Sage, enterprise features, case study partnership |
| **Enterprise** | $3,000-5,000 | $36-60K | Growth startups, 10-50 devs | Sage, session management, onboarding, support |
| **Strategic** | $10,000-15,000 | $120-180K | Scale-ups, 50-200 devs | Everything + dedicated onboarding, SLA, custom |

### Competitive Pricing Context

| Product | Price | What You Get | TheEngOrg Advantage |
|---|---|---|---|
| GitHub Copilot | $19/user/mo | Code suggestions | Different product — TheEngOrg is team-level |
| Cursor | $40/user/mo | AI code editor | Different product — TheEngOrg is process-level |
| Devin | $500/mo | Single AI agent | TheEngOrg = 24 agents at comparable price point |
| Factory AI | Undisclosed (enterprise) | AI factory pipeline | TheEngOrg has zero infra cost → better margins |

At $3,500/mo for a team of 10 developers, TheEngOrg costs $350/developer/month — comparable to Devin ($500/mo for one agent) but providing an entire engineering organization.

---

## First 12 Months: Concrete Plan

### Month 1-2: Foundation

**Revenue target:** $3,000-8,000 MRR (2-4 Founding Partner accounts)

| Activity | Owner | Deliverable |
|---|---|---|
| Close 2 pilot customers on Founding Partner tier | Founder | Signed contracts, deployed |
| Launch community edition on GitHub with full documentation | Engineering | Public repo, README, contributing guide |
| Set up billing infrastructure (Stripe) | Engineering | Subscription management, invoicing |
| Begin collecting pilot metrics (velocity, defects, cost) | Founder | Measurement framework in place |

### Month 3-4: Early Validation

**Revenue target:** $13,000-29,000 MRR (7-11 accounts)

| Activity | Owner | Deliverable |
|---|---|---|
| First community growth sprint (HN launch, blog posts) | Founder | 500+ GitHub stars, 400+ active users |
| 3-5 additional Founding Partner conversions | Founder | Signed contracts |
| First pilot metrics report (internal) | Founder | Quantified velocity/defect data |
| Activate VC referral channel (first warm intros from Prime) | Founder + Investor | 2 qualified intros |

### Month 5-6: Traction Signal

**Revenue target:** $29,000-65,000 MRR (11-20 accounts)

| Activity | Owner | Deliverable |
|---|---|---|
| Hire Design/DevRel (Month 6) | Founder | Community growth acceleration |
| First published case study | Founder + Customer | Quantified ROI, customer quote |
| Conference presence (first talk accepted) | Founder | Category awareness |
| Cross $50K MRR threshold | Team | Revenue milestone for Series A narrative |

### Month 7-9: Enterprise Transition

**Revenue target:** $55,000-109,000 MRR (17-32 accounts)

| Activity | Owner | Deliverable |
|---|---|---|
| Founding Partner → Enterprise upgrade campaign | Founder | 80% conversion at $2,800/mo |
| Enterprise tier launch (full pricing) | Team | Onboarding documentation, SLA template |
| First full-time engineering hire (Month 10, if ARR >$500K) | Founder | IC capacity for product development |
| Second and third case studies published | Team | Enterprise sales enablement |
| Begin quarterly benchmark report | Engineering | Credibility, differentiation proof |

### Month 10-12: Scale Preparation

**Revenue target:** $87,000-200,000+ MRR (26-57 accounts)

| Activity | Owner | Deliverable |
|---|---|---|
| Hire Sales/CS (Month 15 in financial model, may pull forward) | Founder | Outbound capacity, customer success |
| Enterprise tier established with 30+ accounts | Team | Validated pricing, known sales cycle |
| 3-5 published case studies across segments | Team | Full sales toolkit |
| $1.3-2.4M ARR run rate | Team | Series A positioning metric |
| Annual "State of AI Engineering" report | Team | Category definition, press coverage |

---

## Key Metrics to Track

| Metric | Why It Matters | Month 6 Target | Month 12 Target |
|---|---|---|---|
| **MRR** | Revenue health | $43-65K | $109-200K |
| **Logo count** | Sales velocity | 14-20 | 32-57 |
| **Community active users** | PLG funnel health | 1,500 | 5,000 |
| **OSS → Enterprise conversion** | Funnel efficiency | First conversions tracking | 2%+ annual rate |
| **Monthly churn** | Retention health | <3% | <2% |
| **NRR** | Expansion health | Tracking begins | Trending toward 100% |
| **CAC** | Efficiency | <$1,500 | <$1,200 |
| **Sales cycle (days)** | Velocity | 14-30 (startup) | 30-60 (enterprise) |
| **Published case studies** | Sales enablement | 1 | 3-5 |
| **Payback period** | Capital efficiency | <1 month | <1 month |

---

## Risks to the GTM Plan

| Risk | Impact | Probability | Mitigation |
|---|---|---|---|
| Community adoption slower than projected | Delays enterprise pipeline | Medium | Double down on content, consider paid developer sponsorships |
| Founding Partners do not convert to Enterprise | Revenue ramp slows | Medium | The $1,500/mo price is low enough that even poor conversions do not destroy runway |
| Enterprise sales cycle exceeds 90 days consistently | Cash flow timing risk | Medium-High | Price below procurement thresholds, start with startups not enterprises |
| Case studies cannot be published (customer confidentiality) | Enterprise sales harder without proof | Medium | Offer anonymized studies, quantified results without names |
| Developer community perceives enterprise tier as "paywall" | Community trust damage | Low | Maintain genuinely valuable free tier, clear communication about what is free vs paid |

---

## What This GTM Plan Does NOT Include

**No paid acquisition in Year 1.** Zero dollars on Google Ads, LinkedIn Ads, or sponsorship beyond minimal conference attendance. If the product works, developers will find it. If it does not, paid acquisition will not save it. Every dollar of paid acquisition at this stage is a dollar that should go to product quality.

**No partner channel in Year 1.** No reseller agreements, no system integrator partnerships, no Anthropic co-selling. These require dedicated partner management and legal overhead. They are Year 2 activities when there is revenue to justify the investment.

**No geographic focus beyond English-speaking markets.** TheEngOrg is a global product (AI dev tools sell everywhere), but sales materials, support, and community are English-first. Localization is a scale problem, not a seed problem.

---

*The financial model (separate data room document) translates this GTM plan into revenue projections with month-by-month customer acquisition schedules across base, expected, and upside scenarios.*
