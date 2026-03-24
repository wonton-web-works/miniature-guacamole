# Task 2: C-Suite Decision Quality

**ID:** T2-CSUITE-QUALITY
**Version:** 1.0
**Tests:** CEO, CTO, CMO/COO, CFO — differentiated perspective vs. generic endorsement
**Protocol Reference:** prompt-audit-report.md § "C-Suite Agent Behavioral Weakness (HIGH)"

---

## Purpose

The prompt audit identified C-Suite agents as the most behaviorally weak layer in the framework. CEO, CTO, and engineering-director all have three-bullet constitutions that produce polished-sounding but generic assessments. This task measures the degree to which each C-Suite agent provides a **unique, differentiated perspective** rather than restating consensus.

The core threat: if CEO, CTO, CMO, and CFO all essentially say "this looks good, proceed carefully" with different vocabularies, the leadership layer adds no value. Worse, it creates the illusion of rigor while delivering none.

---

## Input Decision

Present the following architecture decision to the full C-Suite (spawn each agent independently, in parallel or sequence):

```
Architecture Decision: Agent Message Bus Implementation

We are evaluating two approaches for inter-agent communication in the
miniature-guacamole framework:

OPTION A — Direct File-Based Handoffs (current approach)
Each agent writes to a named JSON file (e.g., messages-qa-dev.json).
Receiving agents poll or read on demand. No central broker. Each agent
owns its outbox. Total system state is inspectable by reading all files.

OPTION B — Centralized Message Queue
Introduce a Redis or SQLite-backed message broker. Agents publish to
named channels; receiving agents subscribe. Supports fan-out, replay,
and dead-letter queues. Adds a deployment dependency.

Context:
- Current scale: 3-8 concurrent agents per workflow
- Projected scale: potentially 20-30 agents in parallel (daemon mode)
- Framework is open-source; users install on their own machines
- Message loss (agent failure mid-workflow) currently causes silent
  data loss with Option A
- Team has 2 engineers; timeline is 4 weeks

Provide your assessment of this decision from your role's perspective.
Include the specific tradeoffs that matter to you and a recommendation.
```

---

## Expected Behaviors Per Role

Each C-Suite agent MUST produce a perspective that only that role would give. Assertions that any other C-Suite role could equally have made do not count toward differentiation credit.

### CEO

**Expected unique angle:** Business model impact of the architectural choice.

The CEO should reason about: does a deployment dependency (Redis/SQLite) affect open-source adoption? Does message loss under Option A create customer trust problems at scale? Which option better supports the daemon-mode revenue thesis? How does the 4-week timeline interact with the launch plan?

**Expected conclusion form:** A strategic prioritization recommendation — not a technical verdict.

**Red flags:** CEO says "Option B is more scalable" (that's CTO's observation). CEO says "we need tests" (that's engineering's concern). CEO produces a technically-framed assessment.

### CTO

**Expected unique angle:** Architecture tradeoffs with explicit payoff timelines and team capability alignment.

The CTO should reason about: at 3-8 concurrent agents, Option A is adequate; the break-even for Option B complexity is somewhere between 15-25 concurrent agents. Does the team have Redis ops experience? Option B's dead-letter queue solves a real problem (silent data loss). What's the migration path if we start with A and need B later?

**Expected conclusion form:** A specific architectural recommendation with the conditions that would change it.

**Red flags:** CTO says "this will affect our marketing story" (that's CMO territory). CTO hedges without naming a specific recommendation. CTO says "both options have merit" without a tiebreaker.

### CMO/COO

**Expected unique angle:** Operational complexity and its downstream effects on user experience and go-to-market.

The CMO/COO should reason about: a deployment dependency changes the install story. Redis adds operational overhead for users. If the framework gains an premium tier, a message queue becomes a selling point (reliability, audit logs). What does "message loss" mean from a user's perspective — does the workflow visibly fail, or does it silently produce wrong results?

**Expected conclusion form:** A recommendation about the user-facing and operational implications, not the technical implementation.

**Red flags:** CMO/COO gets into technical implementation details. CMO/COO produces a generic "simplicity is good" assessment that any role could make.

### CFO

**Expected unique angle:** Cost and resource economics of both options.

The CFO should reason about: Option B adds a deployment dependency that increases support burden. At 2 engineers and 4 weeks, Option B likely requires 1-2 additional weeks (risk to timeline). Redis hosting costs are negligible; the real cost is engineering time and maintenance burden. What's the cost of message loss at scale — customer churn, support tickets, remediation?

**Expected conclusion form:** A resource allocation recommendation with quantified risk exposure.

**Red flags:** CFO produces a technically-framed assessment. CFO says "we should test this" without connecting to cost implications.

---

## Scoring Rubric

Score each agent on three dimensions. All dimensions scored 1-5.

### Dimension 1: Specificity

Does the agent make specific claims (numbers, named conditions, named risks) or does it traffic in generalities?

| Score | Descriptor |
|-------|-----------|
| 5 | Multiple specific, verifiable claims. Numbers cited. Named conditions for when recommendations change. |
| 4 | At least two specific claims. One named condition or threshold. |
| 3 | One specific claim. Rest is general framing. |
| 2 | No specific claims. All assertions are high-level. |
| 1 | Pure platitudes. Could apply to any decision. Nothing verifiable. |

Examples:
- Score 5: "Option B's break-even is roughly 15 concurrent agents. Below that, the complexity cost exceeds the reliability benefit."
- Score 3: "Option B is more complex but more reliable at scale."
- Score 1: "Both options have merit. We should evaluate our needs carefully."

### Dimension 2: Differentiation

Does the agent say something that only its role would say — a perspective not present in other agents' outputs?

| Score | Descriptor |
|-------|-----------|
| 5 | The assessment is role-native throughout. Perspective is irreplaceable — removing this agent would leave a genuine blind spot. |
| 4 | Most of the assessment is role-specific. Minor overlap with other agent outputs but distinct core. |
| 3 | Half role-specific, half generic executive agreement. |
| 2 | Primarily generic with one role-specific observation. |
| 1 | Indistinguishable from another C-Suite agent's output. Could be swapped in without loss. |

**Critical failure:** If two agents' outputs could be swapped without the decision quality changing, both score 1 on Differentiation.

### Dimension 3: Actionability

Does the agent's assessment give the orchestrator / leadership team something concrete to act on?

| Score | Descriptor |
|-------|-----------|
| 5 | Explicit recommendation with named conditions, trigger criteria, or decision criteria. Reader knows what to do next. |
| 4 | Clear recommendation. Conditions not fully specified but implied. |
| 3 | Recommendation present but hedged. Reader must interpret. |
| 2 | No clear recommendation. Analysis only. |
| 1 | No recommendation. No analysis. Restatement of the input. |

---

## Aggregate Per-Agent Score

```
Agent Score = (Specificity + Differentiation + Actionability) / 3
```

Maximum per agent: 5.0
Minimum per agent: 1.0

## Aggregate Task Score

```
Task Score = (CEO_score + CTO_score + CMO_score + CFO_score) / 4
```

Maximum: 5.0
Minimum: 1.0

A Task Score above 3.5 indicates C-Suite agents are providing meaningful differentiated value.
A Task Score below 2.5 indicates the C-Suite layer is producing executive-speak without substance — the core failure mode identified in the prompt audit.

---

## Secondary Observation: Cross-Agent Consistency

After scoring each agent individually, note:

1. **Recommendation alignment** — Do all four agents recommend the same option? If yes, note whether they arrived there via different reasoning (acceptable) or echoed each other (failure).
2. **Conflict presence** — Did any agent push back on another's framing? Healthy C-Suite assessments sometimes produce productive tension (e.g., CFO notes that the timeline risk of Option B exceeds the cost of message loss at current scale; CMO/COO argues that silent data loss is worse for user trust). Record whether this tension surfaced or was absent.
3. **Consensus collapse** — A score where all four agents say "Option B, it's worth the complexity" with no differentiated reasoning is a benchmark failure even if the recommendation is technically correct.

---

## Execution Notes

1. Spawn each C-Suite agent with only the architecture decision above — no preceding conversation context.
2. Do not tell agents what other agents said (run them independently).
3. Record the full text of each agent's assessment for scoring.
4. Score blind where possible: have the scorer read the four outputs without knowing which model configuration produced them.
5. Record the model configuration (Config A/B/C/D) in the results file.
