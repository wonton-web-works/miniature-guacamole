# Task 1: Sage Intake Routing

**ID:** T1-SAGE-ROUTING
**Version:** 1.0
**Tests:** Sage agent — C-Suite selection logic from intake prompts
**Protocol Reference:** Sage AGENT.md § "C-Suite Spawning — Selective"

---

## Purpose

The Sage is the entry point for all MG work. Its most consequential intake decision is which C-Suite agents to spawn. Spawning the wrong agents wastes tokens and introduces irrelevant perspectives. Missing the right agents leaves blind spots in the assessment.

This task measures whether the Sage correctly maps prompt characteristics to the minimal sufficient C-Suite set — no more, no less.

---

## Input Prompts

Run each prompt through the Sage independently. Do not batch them. Record routing decision per prompt.

---

### Prompt A — Pure Engineering

```
Fix the memory leak in the agent supervisor loop. The supervisor is holding references
to completed task results in its internal monitoring buffer. This buffer isn't being
flushed after task completion, causing unbounded memory growth in long-running sessions.
Scope: supervisor.ts, lines 140-220. No API changes. No new dependencies.
```

**Domain signals present:** Bug fix, single file, no API surface change, no new dependencies, no product decision required, no brand/UX dimension, no cost dimension.

**Expected C-Suite routing:**
```
CTO only
```

**Rationale:** This is a pure engineering scope issue. No business strategy (CEO), no operations/GTM (CMO/COO), no cost/resource decision (CFO). CTO owns technical architecture and engineering decisions. Spawning CEO, CMO, or CFO here would be routing noise — they have no purchase on the problem.

---

### Prompt B — Brand + Engineering

```
We need to redesign the Sage's terminal output to match the new brand voice. Currently
the Sage outputs raw structured logs. We want it to feel like a wise, considered guide —
calmer tone, fewer brackets, prose-style status messages. The engineering work is
straightforward (string formatting changes), but the tone guidelines need to match
the monk capybara brand personality we've established.
```

**Domain signals present:** Tone/voice change, brand personality alignment, UX of terminal output, engineering work is low-complexity string formatting.

**Expected C-Suite routing:**
```
CTO + CMO/COO
```

**Rationale:** Engineering changes exist (CTO) but the primary driver is brand voice and communication design (CMO/COO). CEO is not needed — this is not a strategic or priority conflict. CFO is not needed — no material cost or resource decision. The brand/marketing/UX pattern in the Sage's routing table maps directly to CTO + CMO/COO.

---

### Prompt C — Full Initiative

```
We're launching miniature-guacamole as a paid product. We need to:
- Define pricing tiers and packaging (starter, team, enterprise)
- Design the onboarding flow for new paying customers
- Build the billing integration (Stripe)
- Create the marketing landing page
- Set up the customer support workflow
- Define our go-to-market sequence for the launch

This is a 6-8 week initiative. We have limited engineering bandwidth and need to
sequence the work carefully.
```

**Domain signals present:** Monetization, pricing, onboarding, billing engineering, marketing site, customer support ops, GTM sequence, resource sequencing under constraint.

**Expected C-Suite routing:**
```
CEO + CTO + CMO/COO + CFO
```

**Rationale:** Full initiative. CEO owns the business strategy, pricing decisions, and launch priority. CTO owns the billing integration architecture and engineering sequencing. CMO/COO owns onboarding design, marketing page, GTM sequence, and customer support workflow. CFO owns cost modeling, pricing economics, and resource allocation under constraint. All four are load-bearing.

---

## Scoring

Each prompt is scored **binary** — correct or incorrect routing.

| Prompt | Correct Routing | Score |
|--------|----------------|-------|
| A | CTO only | 0 or 1 |
| B | CTO + CMO/COO | 0 or 1 |
| C | CEO + CTO + CMO/COO + CFO | 0 or 1 |

**Total possible:** 3 points

### Partial Credit Rules

Prompt A and B are strict binary — no partial credit. The Sage either routes correctly or it doesn't.

Prompt C allows one partial credit rule:
- **0.5 points** if 3 of 4 C-Suite agents are correctly identified AND the missing agent has a documented rationale in the Sage's output (e.g., "CFO optional given engineering-first scope").
- **0 points** if any non-C-Suite agent (e.g., engineering-manager, dev) is included in the routing.

### Common Failure Modes

| Failure | Indicates |
|---------|-----------|
| Spawns CEO for Prompt A | No filtering — treating all work as full-initiative |
| Omits CMO/COO for Prompt B | Treating brand voice as a pure engineering concern |
| Omits CFO for Prompt C | Not recognizing cost/resource dimension in launch planning |
| Spawns supervisor or engineering-manager | Confusing C-Suite routing with team execution delegation |
| Routes all three prompts identically | No scope discrimination — pattern-matching to default |

---

## Execution Notes

1. Give the Sage each prompt cold — no preceding context.
2. Ask the Sage to explain its routing decision (this surfaces the reasoning, not just the output).
3. Record the full routing decision: which agents the Sage says it would spawn and why.
4. Do NOT run the spawns — this is an intake assessment, not a full execution test.
5. Record the Sage's verbatim routing statement for later audit.

---

## Signal to Watch

The routing explanation quality is secondary data. Even if the routing is correct, note whether the Sage articulates the routing rule it applied (e.g., "this is an engineering + brand problem, so CTO and CMO/COO per the selective spawning table") versus arriving at the correct answer without visible reasoning. Models that route correctly but can't explain why are brittle — they'll fail on novel prompts.
