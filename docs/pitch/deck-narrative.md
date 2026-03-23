# WS-PITCH-02: Deck Narrative Architecture
# TheEngOrg $3M Seed Pitch Deck

**Prepared by:** CEO
**Date:** 2026-03-22
**Status:** Blueprint for Design Production
**Classification:** Internal / Confidential

---

## Narrative Philosophy

This is an investment pitch, not a product pitch. Every slide answers the VC's internal question: **"How does this make me money?"**

The story arc follows the structure of a compelling investment thesis, not a feature walkthrough:

```
EMOTIONAL HOOK (slides 1-3)    → Make the VC feel the problem in their own portfolio
INSIGHT (slide 4)              → Reframe: the problem is not AI quality, it is AI coordination
PROOF (slides 5-7)             → Product, demo, benchmarks — show it works
BUSINESS (slides 8-11)         → Market, model, economics, traction — show it pays
THE DEAL (slides 12-14)        → Ask, team, close — show why THIS check, NOW
```

The capybara/bird narrative runs visually throughout the deck per CMO design direction. It is never explained on a slide. It is explained verbally by the founder. The slides show it; the founder narrates it.

---

## Slide 1: Cover

**Title:** TheEngOrg

**Purpose:** Set the tone. This is not a startup with a PowerPoint. This is a company that builds beautiful, serious products. The cover earns 10 seconds of attention and signals craft.

**Core message:** You are about to see something different.

**Content:**
```
[TheEngOrg logo — top center]

The AI Engineering Organization.

$3M Seed  |  March 2026
```

No tagline. No feature list. No "we help teams do X." The restraint IS the message. Companies that can prioritize have the discipline to build.

**Speaker notes:** "Thank you for your time. I am [name], founder of TheEngOrg. Over the next 12 minutes, I am going to show you the most capital-efficient AI investment opportunity in the market right now. Then I am going to show you a live demo. Then we will talk about how you make money."

**Transition:** Pause. Let the room settle. Then: "Let me start with a problem you already know about."

**Visual notes (per CMO direction):** Dark background (#171E28). Small capybara pixel-art silhouette, bottom-right, 15% opacity, seated meditation pose. The capybara is present but does not demand attention. No bird yet.

---

## Slide 2: The Problem — Your Portfolio Has This Problem

**Title:** Every AI initiative in your portfolio is about to hit the same wall.

**Purpose:** Make the problem personal. The VC has portfolio companies using AI coding tools. This slide names the failure they have seen or are about to see. It is not an abstract market problem — it is THEIR problem.

**Core message:** AI agents are powerful individually. Without coordination, they produce chaos that is worse than no AI at all.

**Content:**
```
Left side (3 pain points, dark surface cards with chili red left borders):

  "I feel like I'm in the backseat of a Ferrari with broken
   steering, and it's just smashing down the motor."
   — Michael Parker, VP Eng, TurinTech (Stack Overflow, Jan 2026)
   [FPO — replace with pilot client quote when available]

  ● Agents contradict each other across workstreams
  ● Quality gates get skipped under deadline pressure
  ● Scope drift cascades — one bad decision poisons three features
  ● The founder is the single point of coordination failure

Right side (visual):
  5-6 agent nodes with tangled, crossed connection lines.
  Chili red highlights on broken connections.
  Small teal bird sits among the tangle, looking overwhelmed.
```

**Speaker notes:** "Your portfolio companies are adopting AI coding tools. Every single one. And here is what is happening: individual developers get faster, but the team gets slower. Why? Because AI copilots help you write code. Nobody is helping you coordinate the team. The AI is producing code at 10x speed with zero coordination — so you ship 10x the bugs, 10x the conflicts, 10x the rework. This is the problem everyone is about to hit."

**Transition:** "And the cost of this chaos is not abstract."

**Visual notes:** Bird appears for the first time — small, teal, alone among tangled agent nodes. No capybara on this slide.

---

## Slide 3: The Cost — What Uncoordinated AI Costs

**Title:** The cost of uncoordinated intelligence

**Purpose:** Quantify the pain. Move from "this is a problem" to "this is a LARGE problem." Make the market opportunity implicit — if this is expensive, fixing it is valuable.

**Core message:** Uncoordinated AI agents are a cost center, not a productivity gain.

**Content (metric wall):**
```
$5M/yr            73%              4.2x
avg. eng team     of AI agent      longer to fix
headcount cost    projects fail    than to build
(10 engineers)    to ship          (uncoordinated)
```

Below the numbers, one line:
```
The problem is not the AI. The problem is the org chart.
```

**Speaker notes:** "A 10-person engineering team costs five million dollars a year. The promise of AI dev tools is to replace some of that headcount. But 73% of AI agent projects fail to ship — not because the models are bad, but because nobody is coordinating the output. The debugging takes four times longer than the building because agents contradict each other and nobody catches the drift until three workstreams are polluted. The problem is not the AI. The problem is that nobody gave the AI an org chart."

**Transition:** "We did."

**Visual notes:** Numbers in chili red (#C94D3A). Labels in muted grey (#8A9BB0). The bird from slide 2 appears again in the bottom-left margin, still alone, still small. No capybara.

---

## Slide 4: The Insight — AI Needs an Org Chart

**Title:** AI copilots help developers write code. We replaced the org chart.

**Purpose:** This is the reframe. The slide that changes how the VC thinks about the category. Copilots are autocomplete. Agents are task executors. TheEngOrg is organizational intelligence. This is the moment where the VC's mental model shifts from "another AI dev tool" to "this is a new category."

**Core message:** The breakthrough is not better AI — it is better organization OF AI. Constitutions (agent role definitions) are as important as the model.

**Content:**
```
Left side (the spectrum):

  Copilot          →  "Write this function"
  AI Agent         →  "Do this task"
  AI Eng Org       →  "Ship this feature — correctly"
  ─────────────────────────────────────────────────
  Autocomplete        Task execution        Organizational intelligence


Right side (the org chart, simplified):

  [SAGE] ← orchestrator — never builds, always watches
     |
  [CEO]  [CTO]  [CFO]
     |      |
  [EM]   [QA]   [Security]   [DevOps]
     |
  [Dev]  [Dev]  [Dev]

  "24 agents. One org chart. Zero humans required to coordinate."
```

**Speaker notes:** "Here is the insight. Everyone in this market is building smarter AI — better models, better prompts, better autocomplete. We are not doing that. We built the ORG CHART. TheEngOrg is a complete AI engineering organization — 24 specialized agents with a CEO that sets vision, a CTO that architects, engineers that build, QA that validates, and security that reviews. At the top sits the Sage — it never writes code. It watches, it coordinates, and it makes sure nothing ships that should not. Think of it this way: Anthropic builds the engine. We built the car."

**Transition:** "Let me show you what this looks like in practice."

**Visual notes:** The capybara enters the narrative here. The Sage node at the top of the org chart IS the capybara — not a mascot next to a diagram, but a functional element. Amber border (#D4A84B) with subtle glow. The bird is not on this slide — it will return later, grown.

---

## Slide 5: The Product — See It Work (Pre-Demo Setup)

**Title:** Terminal-native. Zero infrastructure.

**Purpose:** Set up the live demo. Show the VC what they are about to see so they know what to watch for. This slide is a bridge — it establishes the visual language of the product so the demo does not need explanation.

**Core message:** This runs in the terminal. The customer brings their own Anthropic API key. There is no server, no dashboard, no infrastructure to operate.

**Content (full-bleed terminal screenshot):**
```
Actual terminal output showing a /mg-build run:
  - Sage spawns selectively (not all agents — only the ones needed)
  - Engineers implement against a spec
  - QA catches a misuse case
  - PR is created with passing tests

Below the terminal, a callout bar:

  $5K/mo API cost  →  24-agent team  →  Zero servers  →  100% gross margin
```

**Speaker notes:** "This is what it looks like. A terminal. The customer types one command. The Sage reads the ticket, decides which agents to spawn, and the team executes. The customer's developers see PRs appear with tests, documentation, and security reviews attached. The customer pays Anthropic directly for the API tokens — we have zero infrastructure cost. Our gross margin is 100% on the license fee. No GPU bill. No servers. No CDN. Let me show you this live."

**Transition:** Founder switches from slides to a live terminal. "I am going to create a feature request and let the Sage handle it. Watch how it selects agents."

**Visual notes:** Real terminal screenshot, not a mockup. Dark background. Callout numbers in lime yellow (#F9A825). Subtle capybara watermark, 10% opacity, bottom-right.

---

## Slide 6: DEMO

**Title:** [No slide — the terminal IS the slide]

**Purpose:** The demo is the most important 3 minutes of the pitch. It proves the product works. It creates the "I have never seen that before" moment that VCs remember at the partner meeting. This is not a scripted walkthrough — it is Sage catching a real drift scenario live.

**Core message:** This is not vaporware. It works. Right now. In front of you.

**Content:**
```
LIVE TERMINAL DEMO — Sage catching drift

Setup (30 seconds):
  - Show a codebase with a deliberate scope drift injected
  - Run /mg-build or /mg-leadership-team

Demo flow (2-3 minutes):
  1. Sage activates — show selective spawning (not all 24 agents, only 4-6)
  2. CTO identifies the architectural concern
  3. QA catches the misuse case the drift introduced
  4. Sage flags the drift explicitly: "This deviates from the approved spec"
  5. The system produces a recovery plan — not just detection, remediation

The "wow" moment:
  Sage catches something a human reviewer would miss.
  The VC sees it happen in real time.
```

**Speaker notes:** [Founder narrates the terminal as it runs.] "Watch the Sage — it is reading the ticket now. It decided this is an ARCHITECTURAL scope, so it spawned the CTO. If this were a mechanical change, it would have skipped the CTO entirely. That is selective routing — and that is the enterprise value... Now watch — the CTO caught that this feature touches the auth layer, which was not in the original spec. That is drift. In a human team, this would not be caught until code review, maybe not until QA. The Sage caught it at line one... And look — it did not just flag it. It produced a recovery plan. This is what the enterprise tier does that the community edition cannot."

**Transition:** Return to slides. "So it works. Now let me show you why this is a business, not just a technology."

**Visual notes:** No slides. The terminal is projected. If the demo must be pre-recorded (connectivity concerns), use a high-quality terminal recording with real output, not a mockup. The founder must be able to answer "can you change X and run it again?" — so live is strongly preferred.

---

## Slide 7: The Moat — Why You Cannot Copy This

**Title:** Constitution-driven AI: the moat that compounds

**Purpose:** Preempt the #1 objection before the VC asks it. "What stops someone from copying your prompts?" This slide answers it with benchmark data, not hand-waving.

**Core message:** The defensible IP is not the model — it is 24 battle-tested constitutions that beat the best model on a worse model. Constitution quality > model quality.

**Content:**
```
Left side (the benchmark):

  Config A: Weak constitutions + Opus (best model)     → 0.957
  Config C: Strong constitutions + Sonnet (cheaper)     → 1.000

  "Our constitutions beat the best model
   on a cheaper model."

  Constitution quality > Model quality.

Right side (the layers):

  Layer 1: Open-source community (23 agents)
           → Distribution engine. Developers find us.

  Layer 2: Enterprise Sage (closed source)
           → Orchestration, drift detection, session mgmt.
           → This is what customers pay $42K/yr for.

  Layer 3: Constitution R&D flywheel
           → Enterprise usage improves constitutions
           → Better constitutions improve community edition
           → Community growth feeds enterprise pipeline
```

**Speaker notes:** "Every VC I talk to asks the same question: what stops someone from copying your prompts? Three things. First — our constitutions are not prompts. They are engineering artifacts. We ran systematic benchmarks across four model configurations. Strong constitutions on a cheaper model beat weak constitutions on the best model available. That gap — 0.957 to 1.000 — is the difference between a copilot and an engineering organization. Second — the 24 agents are not independent. They form an organization with delegation chains, handoff protocols, and scope boundaries. Copying one prompt is trivial. Replicating 24 agents that coordinate coherently is six months of systematic engineering. Third — the Sage is not open source. It is the enterprise moat. Everything else is free. The orchestration layer is what makes the team 10x more effective, and that is what customers pay for."

**Transition:** "So the product works and the moat is real. Now: is the market big enough for you to care?"

**Visual notes:** Benchmark numbers in lime yellow. Comparison layout: left side chili red (weak = problem), right side guac green (strong = solution). Subtle capybara watermark.

---

## Slide 8: The Market — Where the Money Is

**Title:** The AI dev tools market is forming now. The org layer does not exist yet.

**Purpose:** Establish TAM/SAM/SOM. Make the VC confident that this market is large enough for a fund-returning outcome. The key frame: the "AI org layer" is a NEW category, not a crowded one.

**Core message:** $800B in global dev spend is being restructured by AI. The coordination layer — the org chart for AI teams — does not exist. We are building it.

**Content:**
```
Concentric regions (nested rectangles or circles):

  TAM: Global software development spend
       $800B+

    SAM: AI-assisted development tools
         $15-25B by 2028 (Gartner/IDC)

      SOM: Enterprise AI engineering platforms
           $2-5B addressable at current penetration

        Entry point: Mid-market engineering teams (5-50 devs)
        using Claude Code or similar LLM-based tooling

Competitive positioning (bottom):

  Copilots (Cursor, Copilot)     → Individual developer
  AI Agents (Devin)              → Single task executor
  AI Dev Teams (Factory)         → Execution pipeline
  AI Engineering Org (TheEngOrg) → Full organizational intelligence  ← NEW CATEGORY
```

**Speaker notes:** "The global software development market is $800 billion and growing. AI dev tools are projected to be a $15-25 billion segment by 2028. But here is the important distinction: that entire market is focused on individual developer productivity — copilots, code completion, single-agent task execution. Nobody is building the organizational layer. Cursor helps one developer write code faster. Devin completes one task autonomously. We run the entire engineering organization — the CEO sets direction, the CTO architects, engineers build, QA validates, and the Sage makes sure it all holds together. This is a new category. We are not competing with Cursor. We are building the layer that sits above every tool in this stack."

**Transition:** "And here is how we turn that into revenue."

**Visual notes:** Concentric regions in progressively brighter teal shades. Numbers in amber. Competitive positioning chart shows TheEngOrg in the most differentiated, highest-switching-cost quadrant (per WS-01 research positioning).

---

## Slide 9: The Business Model — Open-Core Economics

**Title:** Open-source distribution. Enterprise monetization. Zero infrastructure cost.

**Purpose:** Show the VC a business model they recognize (open-core) with economics they have never seen (100% gross margin on license, zero COGS). This is the slide where the CFO numbers land.

**Core message:** Customers find us for free. They pay us because the Sage makes the free product 10x more effective. We have no cost of goods sold on the license.

**Content:**
```
Left side — The model:

  Community (free)
  ─────────────────────────
  23 agents, 16 skills, full workflow
  Developers find it, adopt it, depend on it

         ↓ conversion (2-5% annually)

  Enterprise ($3,500/mo avg)
  ─────────────────────────
  + Sage orchestrator
  + Session management
  + Drift detection
  + Priority support

         ↓ expansion

  Strategic ($12,000/mo avg)
  ─────────────────────────
  + Custom constitutions
  + Dedicated onboarding
  + SLA guarantees

Right side — Unit economics:

  CAC:           $1,200 (OSS-led, founder-sold)
  LTV:           $79,800 (Enterprise, 24-mo base)
  LTV:CAC:       66x
  Gross margin:  95%+
  Payback:       <1 month
  Customer ROI:  16x annual ($57K cost → $906K value)
```

**Speaker notes:** "The business model is open-core — the same model that built HashiCorp, Grafana, and Posthog into billion-dollar companies. The community edition is genuinely good — 23 agents, full workflow, completely free. Developers find it through GitHub, use it in their projects, and then advocate for enterprise adoption at their companies. The enterprise tier adds the Sage — the orchestration layer that turns a team of agents into a coordinated organization. That is where the money is. The unit economics: our customer acquisition cost is twelve hundred dollars because the product acquires itself. The lifetime value is eighty thousand dollars per Enterprise customer. That is a 66x LTV:CAC ratio. Gross margin is 95% or higher because we have no infrastructure cost — the customer pays Anthropic directly for their API tokens. We sell the organizational intelligence. They bring the compute."

**Transition:** "And here is what that turns into over 36 months."

**Visual notes:** Two-panel layout. Left uses the open-core flywheel from CTO defensibility doc. Right is metric wall — numbers in lime yellow, labels in monospace.

---

## Slide 10: The Numbers — Financial Model

**Title:** Cash-flow positive at Month 5. $3M buys 36 months because there is no server bill.

**Purpose:** Show the revenue trajectory and cash position. This is where European VC capital-efficiency love kicks in. The key insight: this company does not spend the $3M — it grows through it while the cash balance INCREASES.

**Core message:** This is the most capital-efficient AI seed deal in the market. The cash never drops below $2.9M because revenue outpaces burn from Month 5.

**Content:**
```
Left side — Revenue trajectory:

  Simple line chart, 36 months:

  Y1 ARR:    $1.3M (base)  /  $2.4M (expected)
  Y2 ARR:    $3.7M (base)  /  $7.7M (expected)
  Y3 ARR:    $7.1M (base)  /  $12M+ (expected)

  Key inflection points labeled on the chart.

Right side — Cash position:

  Cash balance chart showing the $3M GROWING, not depleting:

  Month 0:   $3.0M
  Month 5:   $2.9M  ← cash-flow positive here
  Month 12:  $3.2M
  Month 24:  $4.9M
  Month 36:  $5.5M+ (base)

Bottom callout (single line, high contrast):

  "The Series A is optional, not survival-driven."
```

**Speaker notes:** "Here are the financials. Base case: $1.3 million ARR in year one, $3.7 million in year two, $7 million by year three. Expected case is roughly double that. But here is the number I want you to look at. The cash position. We raise three million dollars. By month five, the company is cash-flow positive. By month twelve, the cash balance is ABOVE where we started. By month twenty-four, we are sitting on $4.9 million in cash. The three million does not fund 36 months of deficit — it funds the ramp to profitability and then sits there as a war chest. The Series A at Month 24 is from a position of strength — not because we need the money, but because we want to accelerate. For a European VC, this should look like the most capital-efficient seed deal you have seen this year. There is no GPU bill. There is no server infrastructure scaling with customers. The customer pays Anthropic. We collect the license fee at 95% gross margin."

**Transition:** "Now let me show you who has already validated this."

**Visual notes:** Revenue curve in guac green (#4A7C59). Cash position in amber (#F9A825). Background dark. Numbers in JetBrains Mono 700. No capybara — numbers speak.

---

## Slide 11: Traction — Proof It Works

**Title:** Two pilots live. Sage scores 1.000. The signal is real.

**Purpose:** Prove this is not a whiteboard idea. Real customers, real benchmarks, real product. This slide converts "interesting thesis" into "investable company."

**Core message:** The product is built, benchmarked, and in pilot deployment. This is not pre-product — it is pre-scale.

**Content:**
```
Three columns:

  PRODUCT                  BENCHMARKS               PILOTS
  ─────────                ──────────               ──────
  v4.2 shipped             Sage: 1.000/1.000        2 startup clients
  24 agents live           CTO: 5.00/5.00           Enterprise integration
  16 skills operational    (all 4 configs)           active
  OSS community active     Config C: 60% cost,      Revenue: first $
                           same quality              in the door

Timeline (bottom):

  v3.0 ─── v4.0 ─── v4.2 ─── Pilots ─── ★ Raise
  Mar 17    Mar 19    Mar 20   Mar 22       NOW
```

**Speaker notes:** "This is not a pitch for something we plan to build. Version 4.2 is shipped. All 24 agents are live. The Sage scores 1.000 on our benchmark suite — and that is on the cheaper model, not opus. The CTO agent is the only one that scored a perfect 5 out of 5 across all four test configurations — including the cheapest model. It is model-invariant. We have two startup pilots live right now, integrating into their engineering workflows. Early signal: developers are using it. The community edition is driving organic adoption. We are at the stage where the product works — we are raising to scale distribution and start enterprise sales."

**Transition:** "So: the product works, the economics work, and we have early traction. Let me tell you about the team and what we need."

**Visual notes:** Metrics in lime yellow. Timeline in teal. Milestones labeled in monospace. Subtle capybara watermark, 10% opacity, bottom-left.

---

## Slide 12: Investor Returns — Why This Check Makes You Money

**Title:** $3M at $9M pre. Here is how you make 15x or more.

**Purpose:** Talk to the VC in fund-math terms. This is the slide where the CEO speaks the investor's language — not product language, not feature language, but portfolio construction language. Show the return paths and the probability-weighted EV.

**Core message:** At $9M pre-money, the base case returns 15x. The expected value across scenarios is 21x. This is a fund-level return from a single seed check.

**Content:**
```
Return scenarios table:

  SCENARIO         ARR AT A     SERIES A      EXIT PATH       YOUR RETURN
  ──────────────────────────────────────────────────────────────────────────
  Base             $3M          $30M pre      $300M acq.      15x ($45M)
  Expected         $5M          $50M pre      $320M acq.      16x ($48M)
  Upside           $10M         $100M pre     $1B+ IPO        48-66x
  ──────────────────────────────────────────────────────────────────────────

  Probability-weighted EV:  21.5x MOIC
  Even if you double the fail weight: 17x MOIC

Bottom callout:

  "Devin raised at $2B. Cursor at $400M.
   You are buying this at $9M with better unit economics than both."
```

**Speaker notes:** "Let me talk about your returns. You put in three million at nine million pre-money. You own 25%. Base case: we hit three million ARR, raise a Series A at $30M pre, and eventually exit at $300M — that is 15x on your check. $45 million back on $3 million invested. Expected case: five million ARR, Series A at $50M, exit at $320M — 16x. Upside case: ten million ARR, Series A at $100M, and if we become the category leader, we are looking at $1 billion-plus and a 48 to 66x return. The probability-weighted expected value is 21x MOIC. Even if you think we are twice as likely to fail as I do, it is still 17x. For context: Devin raised at a $2 billion valuation on a single-agent demo. Cursor raised at $400 million as a code editor with AI features. We have a 24-agent organization with enterprise benchmarks, zero infrastructure cost, and 95% gross margins. At $9 million pre-money, you are getting this at one-fortieth of Devin's valuation with a fundamentally better business model."

**Transition:** "And here is who is building it."

**Visual notes:** Clean table. Numbers in amber. The "21.5x" EV figure should be the largest number on the slide — JetBrains Mono 700, 56px. Competitive valuation comparison in smaller text below.

---

## Slide 13: The Team — Founder-Market Fit

**Title:** [Founder Name]

**Purpose:** Establish founder credibility. At seed, the team IS the investment. The VC is not buying a product — they are buying a person's ability to find PMF and scale. This slide must answer: "Why is THIS person the one to build this?"

**Core message:** This founder built the product, built the brand, acquired the first customers, and runs at $35K/month burn. They are the type of founder who ships, not the type who decks.

**Content:**
```
Left side:
  [Founder photo — professional, not casual]
  [Name]
  Founder & CEO, TheEngOrg

  [2-3 lines of relevant background — tailor to actual founder bio]
  - Technical background, experience shipping products
  - Why this problem, why now, why them
  - "Built the product solo. Raised no money. Acquired first pilots
     through the product itself."

Right side:
  First hire plan:

  Month 1:   Sr. Engineer (contract → full-time)
  Month 6:   Developer Relations / Community
  Month 10:  Full-time Engineer #2
  Month 15:  Sales / Customer Success

  "I am raising to hire. The product is built.
   The team is the bottleneck, and that is what $3M solves."
```

**Speaker notes:** "A quick word about me, and then I want to talk about hiring. [Founder bio — 60 seconds max, focus on founder-market fit: why you understand this problem, what you have built before, why you are undervalued at $9M pre.] I built this entire product — 24 agents, 16 skills, the Sage, the benchmark suite, the brand, the marketing site — solo, at $35K a month in burn. I am raising because the product is built and the bottleneck is now team. Month one post-close: a senior engineer joins. Month six: developer relations to scale the community. Month ten and fifteen: another engineer and a sales hire. I am not raising to figure out the product. I am raising to scale what already works."

**Transition:** "Which brings me to the ask."

**Visual notes:** No capybara on this slide. Clean, minimal. Photo with subtle border. This is about the human, not the product.

---

## Slide 14: The Ask — $3M Seed

**Title:** $3M to own the AI org layer.

**Purpose:** Close. This slide contains the ask, the use of funds, and the closing emotional beat. It is the payoff of the entire narrative arc. The capybara appears in full — the Sage in active state.

**Core message:** $3M buys 36 months of runway, cash-flow positive at Month 5, 15x+ return path, in the most capital-efficient AI deal on the market.

**Content:**
```
Left side — The Ask:

  $3M Seed  |  $9M Pre-Money

  Year 1                Year 2               Path to A
  ───────               ───────              ─────────
  Founder + engineer    5-person team        $3-10M ARR
  Pilot → 10 clients   Scale to 50+         $30-100M val
  $420K burn            $906K burn           18 months

  Cash flow positive: Month 5
  Cash at Month 12: $3.2M (higher than raise)
  Series A: optional, from strength

  One line at the bottom in Lime Zest (#D4FF00):

  "The most capital-efficient AI seed deal in the market."

Right side — Full Sage illustration:

  The capybara in full active state:
  Third eye glowing amber, circuit-pattern robes illuminated.
  The teal bird perched confidently on its shoulder,
  looking forward — no longer small, no longer alone.

  This is the visual payoff.
  The bird grew. The capybara guided it.
  The investor sees the narrative resolve.
```

**Speaker notes:** "Three million dollars. Nine million pre-money. You get 25% of the company that is building the organizational intelligence layer for AI engineering. The money buys 36 months — but we do not need 36 months. We are cash-flow positive at month five. By month twelve, the cash balance is above the raise. The Series A is from a position of strength, not survival. [Pause. Make eye contact.] Every startup building with AI agents today is a small bird trying to build a nest alone. We built the monk capybara. It does not build — it watches, it guides, and it makes sure nothing ships that should not. That is what TheEngOrg does. That is what the Sage is. And that is why our customers ship like a 30-person team with five people. [Pause.] I would love to have Prime Ventures as our partner on this journey."

**Transition:** "I am happy to take questions."

**Visual notes:** Full illustrated Sage — the payoff. 400-500px, right-center. Lime Zest (#D4FF00) CTA line — the ONE use of this color in the entire deck. Bird is confident, larger, perched on the capybara's shoulder. The visual arc completes.

---

## Appendix Slides (Not Presented — Available for Q&A)

### Appendix A: Competitive Landscape Detail

**Content:** Expanded competitive matrix from WS-01 research. Cursor, Devin, Factory, Copilot on one axis. Individual/Team/Org scope on the other. TheEngOrg in the differentiated quadrant. Includes valuation comparisons.

**When to show:** When a VC asks "How are you different from Devin/Cursor/Factory?"

---

### Appendix B: Platform Risk — Anthropic Dependency

**Content:** The four-part preemption from WS-01:
1. Anthropic builds models, we build organizational intelligence. They are the engine; we are the car.
2. We are model-agnostic by design. Config C proves constitutions hold on sonnet, not just opus.
3. Our moat is 24 constitutions + Sage enforcement, not an API call.
4. Anthropic benefits from our existence — we drive API consumption. We are a distribution channel for Claude.

**When to show:** When a VC asks "What if Anthropic ships this?"

---

### Appendix C: Detailed Financial Model

**Content:** Full 36-month customer acquisition schedule, cash balance progression, and assumption register from CFO financial model. Every number traces to a named assumption [A-01] through [A-17].

**When to show:** When a VC wants to drill into the numbers.

---

### Appendix D: Dilution Waterfall and Pro-Rata

**Content:** Full dilution table from investor returns analysis. Seed → Series A → Series B → Late stage. Pro-rata value at each round.

**When to show:** When a VC asks about follow-on dynamics.

---

### Appendix E: Sage Benchmark Detail

**Content:** Full benchmark results across Configs A-D. CTO model-invariance data. S3/S4 scenario comparisons showing community vs enterprise scoring gaps.

**When to show:** When a VC or their technical advisor wants to validate the benchmark claims.

---

### Appendix F: Customer ROI Model

**Content:** Full headcount equivalence ROI from unit economics doc. $57K cost → $906K value = 16x ROI. Hours-saved breakdown per developer per month.

**When to show:** When a VC asks "Why would a customer pay $42K/year for this?"

---

## Narrative Arc Summary

```
Slide   Emotional State of the VC       Internal Question Being Answered
─────────────────────────────────────────────────────────────────────────────
 1      Neutral, assessing              "Is this worth my next 12 minutes?"
 2      Recognition — they know this    "This is my portfolio's problem"
 3      Concern — the cost is real      "How big is this problem?"
 4      Intrigue — this is different     "I have not seen this framing before"
 5      Setup — ready to see proof      "Does it actually work?"
 6      Conviction — the demo lands     "I have never seen that before"
 7      Objection preempted             "What about moat / copying?"
 8      Market validation               "Is this big enough for fund math?"
 9      Business model clarity          "How does this make money?"
10      Financial conviction            "Is this capital-efficient?"
11      Risk reduction                  "Is this real or vaporware?"
12      Greed — the returns             "How much money do I make?"
13      Trust — the founder             "Can this person build it?"
14      Decision time                   "Should I write this check?"
─────────────────────────────────────────────────────────────────────────────
```

---

## Production Handoff

This document is the blueprint. The following teams produce against it:

| Deliverable | Owner | Input From |
|---|---|---|
| Slide visual design (Figma/Keynote) | art-director | This document + CMO deck-design-direction.md |
| Slide copy (final text) | copywriter | This document + CMO brand-narrative-strategy.md |
| Terminal screenshot (real pilot) | engineering-director | Real /mg-build output from pilot |
| Demo script and rehearsal | founder | This document, slide 6 |
| Financial model numbers (final) | CFO | financial-model.md (finalize assumptions) |
| Market sizing (TAM/SAM/SOM) | CEO + CFO | Source Gartner/IDC or first-principles |
| Closing Sage illustration | art-director | CMO design direction, character specs |
| Appendix slides | CEO + CFO | All data room documents |

---

## CEO Decision

```
[CEO] Decision: Approve WS-PITCH-02 deck narrative — 14-slide main deck
      plus 6 appendix slides. This is the blueprint for production.

[CEO] Rationale: The narrative leads with investor economics, not product
      features. Every slide answers "how does this make me money" before
      it answers "what does the product do." The demo at slide 6 is the
      conviction moment — placed after the reframe (slide 4) and before
      the business case (slides 8-12) so the VC processes the demo with
      the right mental model and lands on the numbers while the demo is
      still fresh.

[CEO] Displaces: All other pitch material work until design team confirms
      receipt and begins production. No one-pagers, no competitive briefs,
      no ancillary materials until the deck is in first review.

[CEO] Delegated:
      - art-director: Slide production (Figma/Keynote) against this spec
      - copywriter: Final slide text against this spec + brand narrative
      - engineering-director: Terminal screenshot from real pilot run
      - CFO: Finalize financial model numbers for slides 9-10
      - CTO: Demo script preparation, Sage drift-catch scenario

[CEO] Success metric: Complete draft deck in design review within 5 days.
      Founder rehearsal with full narration within 7 days.

[CEO] Reversal condition: If the demo cannot reliably show Sage catching
      drift in under 3 minutes, restructure slide 6 as a pre-recorded
      terminal video and add a "live Q&A" moment instead. The deck
      narrative holds either way — the demo format changes, not the arc.
```
