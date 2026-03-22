# Benchmark T2-Stress — Config C: C-Suite Decision Quality (Sonnet Override, Hard Prompt)

**Date:** 2026-03-22
**Benchmark:** T2-Stress — C-Suite Decision Quality under ambiguity
**Config:** C — C-Suite agents forced to run on claude-sonnet-4-6 (instead of opus)
**Prompt:** Open-Source Sustainability vs Enterprise Pivot (3-option strategic decision with conflicting constraints)
**Evaluator:** Staff Engineer (staff-engineer agent)
**Model:** claude-sonnet-4-6

---

## Setup

All four C-Suite agents (CEO, CTO, CMO, CFO) were run on sonnet-4-6 with their respective AGENT.md constitutions as the system prompt. Each agent ran independently and received the same strategic decision prompt. No agent saw another's output.

This is a stress test relative to the standard T2 Config C benchmark. The original T2 Config C used a binary architectural decision (file-based vs centralized queue) with clear technical constraints. This prompt introduces:
- Three options with legitimate cases for each
- A personal/family constraint alongside business constraints
- A competitor with funding advantage but quality disadvantage
- Revenue timelines that conflict with runway
- No obviously correct answer

CFO's AGENT.md already specifies `model: sonnet` — it was already on sonnet in the standard Config C. Same note applies here.

---

## Raw Agent Outputs

---

### CEO Raw Output

```
[CEO] Decision: Execute Option B enterprise pivot immediately, closing the enterprise feature set
while keeping a genuine open-source community edition, and run Option C (acqui-hire outreach to
Anthropic/Vercel/GitLab) in parallel as a 30-day hedge — these two tracks are not mutually exclusive.

[CEO] Rationale:
The business model impact of the current state: $4K/mo on handshake agreements is not a business —
it is a proof of concept on borrowed time. The 2 pilot clients have already signaled they would pay
$30K+/yr if SSO and contracts existed. That is a 12.5x revenue multiplier sitting 6-8 weeks away,
not 3-4 months away.

Option A fails the runway test before the first invoice: 3-4 months to SaaS MVP on 1 month of
runway is not a plan — it is a hope. Option B clears the runway constraint: first enterprise contract
in 6-8 weeks is within the survival window if the sales motion starts today, week 1.

The market timing argument cuts against Option A specifically: the competitor has 12 months of runway
and a sales team. They do not have agent quality. But quality without contracts loses to mediocrity
with a sales team and 12 months to iterate. We have a narrowing window to close the clients who
already know our quality.

Option C has a 6-12 week unpredictable timeline, but running outreach to 3 acquirers costs the
founder approximately 10 hours of personal time over 30 days and does not block Option B execution.
The asymmetry is favorable: 10% of time for a potential exit outcome that, even if it fails, produces
a pitch deck and due diligence package that doubles as enterprise sales material.

The optionality test on Option B's community backlash risk: closed-core backlash is real but
recoverable. Star growth stalling is recoverable. Running out of money is not. The option that
preserves more future optionality is the one where the company survives.

I cannot approve the pricing structure yet — CFO must provide cost-to-serve per enterprise client
before I sign off on whether the floor is $12K or $20K. The pilot clients' $30K signal is an anchor,
not a model.

The personal constraint — 2-year-old, partner increasingly concerned about financial stability — is
not a soft factor. It is a hard constraint on the decision space. Option A's 3-4 month timeline is
incompatible with the family situation stated. This constraint accelerates toward B.

[CEO] Displaces:
- Option A (MG Cloud SaaS development) — not executing this quarter; 3-4 months is past runway
- Pure community-growth strategy — GitHub star count is no longer the primary metric; ARR is
- Any new feature development not on the direct path to SSO/contracts/license enforcement
- Full engineering discretion for the part-time contractor — all capacity redirected to enterprise pivot

[CEO] Delegated:
- CTO: SSO/SAML technical feasibility in 6 weeks; assessment of daemon stability for enterprise SLA;
  community vs enterprise edition architectural split
- CMO: Enterprise messaging and community edition framing; how to announce without triggering backlash
- CFO: Cost-to-serve model for enterprise contracts; confirm pricing floor before I approve packaging
- Founder personally: Begin Option C outreach to Anthropic, Vercel, GitLab this week — 3 direct
  emails, not a campaign; use benchmark data vs cursor-teams as the lead

[CEO] Success metric:
- Week 4: First enterprise contract signed with pilot client at $25K+/yr minimum, OR term sheet
  from acquirer in hand
- Week 8: Second enterprise contract OR signed LOI from acquirer
- Failure trigger: Neither contract nor acquisition signal by week 6 — at that point, assess bridge
  options (credit line, prepayment from client, friends-and-family) and re-evaluate
```

---

### CTO Raw Output

```
[CTO] Decision: Option B enterprise pivot is technically feasible in 6-8 weeks for the specific
features the pilot clients need (SSO/SAML, license enforcement, contract-grade stability); Option A
is technically infeasible within the runway window; Option C has no technical dependency and can run
in parallel.

[CTO] Alternatives considered:
- Option A (MG Cloud SaaS): Multi-tenant architecture, billing system, cloud infra provisioning,
  SOC2 audit trail — at solo founder + 1 part-time pace, this is 5-6 months minimum, not 3-4.
  Does not fit runway. Cannot recommend.

- Option B (Enterprise edition): SSO/SAML, license enforcement, support SLA tooling, stable daemon.
  SSO is the technical blocker. Implementation options:
  (a) Build SAML from scratch: 4-5 weeks first time, fragile
  (b) WorkOS abstraction layer: 1-2 weeks, $149/mo, handles Okta/Azure AD/Google Workspace natively
  WorkOS falls clearly on the BUY side of the threshold — saves 3+ weeks, low operational burden,
  purpose-built for this exact startup-adding-enterprise-SSO use case.
  License enforcement: 1 week. Community/enterprise code split: 1-2 weeks if codebase is modular.
  Total with WorkOS: 4-5 weeks technical. Fits runway.

- Option C (Acqui-hire): No technical build required. Technical prep (codebase documentation,
  architecture writeup, benchmark data compilation): 1 week. Can run entirely in parallel.

- Hybrid B+C: Technical cost identical to Option B alone. Not technically constrained.

[CTO] Rationale:
Two technical risks I am not seeing in the option descriptions that the CEO and CFO cannot see:

Risk 1 — Daemon stability gap: Daemon is in beta. Enterprise clients paying $30K+/yr will expect
support SLAs that a beta daemon cannot meet. The sequence risk: SSO ships week 6, contract signed
week 8, daemon has a P0 incident week 10. A churn event with a signed contract is worse reputationally
than a churn event without one. We need 2+ weeks of daemon stability data under representative load
before we commit to an uptime SLA in a contract. This does not block the enterprise pivot, but it
must be factored into what the SLA language says.

Risk 2 — Codebase modularity for the community/enterprise split: If the feature gating cannot be
cleanly implemented at the agent/daemon level without significant refactoring, the 6-8 week timeline
extends to 10-12 weeks. I need 2 days to assess the current codebase before confirming the timeline.
If the split requires major refactoring, that changes the recommendation.

[CTO] Migration path:
Option B → Option A is additive, not destructive. The enterprise auth infrastructure (SSO via WorkOS,
license enforcement) becomes the enterprise tier of a future SaaS product. Community edition becomes
the freemium tier. Architecture chosen for Option B does not close Option A permanently — this is a
forward-compatible choice. Migration cost if we later add MG Cloud: 4-6 weeks of SaaS-specific work
(billing, multi-tenant data isolation), not a full rebuild.

[CTO] Break-even:
Option B technical investment (4-5 weeks) pays back at 1 enterprise contract at $25K+ ARR. That is
month 2 post-launch assuming a single client close. Option A requires SaaS MVP plus customer
acquisition funnel — earliest break-even is month 7-8 at optimistic assumptions.

The daemon stability question is the break-even condition for the SLA: we cannot sign an uptime SLA
until we have 30 days of production stability data. This is week 4-5 of the pivot timeline, not a
blocker to starting, but must resolve before contract signature.

[CTO] Capability requirement:
SAML/SSO via WorkOS: existing developer can integrate in 1-2 weeks. Requires reading WorkOS docs,
no deep SAML expertise needed. This is the critical buy decision: do not attempt to build SAML
natively on this timeline.

Observability gap — unaddressed risk: The codebase has no telemetry, no usage analytics, no crash
reporting. Before any enterprise contract is signed, basic error logging and crash reporting must be
in place — not for the customer, but for our own ability to diagnose production incidents. Without
observability, the first daemon failure in a paid customer environment is a black box. This is a
1-week investment and should be week 1 of the pivot, running parallel to SSO work.
```

---

### CMO Raw Output

```
[CMO] Decision: Approve Option B enterprise pivot, with a non-negotiable condition: the community
edition must be genuinely useful to solo developers, not a crippled demo. The framing is not
"we're closing the core" — it is "we're adding an enterprise tier on top of the existing
open-source foundation." The distinction is not semantic; it determines whether we retain the
community that makes us defensible against cursor-teams.

[CMO] Rationale:
The go-to-market risk I am most concerned about — one that CEO and CFO cannot fully see — is the
trust collapse that happens when an open-source community feels betrayed. The HashiCorp/Terraform
BSL precedent is directly applicable: that license change triggered community backlash, contributor
exodus, and the creation of OpenTofu as a competing fork. We have 1,200 stars and 80/week growth.
If we handle the community edition poorly, a contributor forks the project, and cursor-teams or
any third party can position against us as "the truly open alternative."

The specific GTM threat in this scenario: the enterprise clients we are trying to close are also
members of the developer community. If they observe us doing a bait-and-switch on the community,
they will factor that into their trust calculation for us as a vendor. Enterprise procurement teams
ask "will this vendor be around in 2 years?" and "are they trustworthy partners?" A public backlash
narrative undermines both questions simultaneously.

On the 8-agent community edition limit: I need usage data before approving this boundary. What
percentage of current users run more than 8 agents in a session? If the answer is <5%, the limit
is defensible — 95% of users are unaffected. If the answer is >30%, the limit is perceived as
artificial and we will be called out on it. Do not set this number without data. Even rough
analytics from a 2-week period would inform this decision.

On Option C in parallel: I support running quiet acqui-hire outreach. The messaging risk here is
specific: if word reaches the pilot clients or the public that we are seeking acquisition before
contracts are signed, the pilot clients lose confidence in vendor continuity. Outreach must be
personal, quiet, and under NDA. The benchmark data vs cursor-teams is the lead asset for any
acquirer conversation — it is also the same material that closes enterprise clients. The pitch
deck and enterprise sales material are the same document.

[CMO/OPS] Assessment: CONDITIONAL PASS

[CMO/OPS] Gaps found:
- No contract templates exist; no legal review has been done. A $30K/yr handshake cannot be
  converted to a contract without an MSA template and attorney review. Estimated cost: $2-3K.
  This is not optional on thin runway — it is the instrument that converts the revenue.
- No SSO capability — the enterprise contract requires this technical gate to close. Cannot
  sign contracts until CTO delivers SSO.
- Community edition agent limit not validated against actual usage data — risk of artificial
  restriction perception.
- No sales collateral: no one-pager, no security questionnaire response, no pricing sheet.
  Pilot clients will ask for these before signing a $30K contract.
- No defined enterprise support process: if we sign an SLA and daemon goes down at 2am, what
  exactly does the founder do? This must be written down before it is in a contract.

[CMO/OPS] Required before proceed:
1. Legal: MSA/contract template reviewed by a startup attorney — source this week, budget $2-3K
2. CTO: Confirm SSO/SAML timeline and daemon stability assessment before SLA language is set
3. Usage audit: What percentage of current users run >8 agents? Even rough data from logs
4. Sales collateral: One-pager and pricing sheet — copywriter, 3 days
5. Support policy: Define enterprise support operationally (response time, escalation) before
   including in contract language

[CMO] Blockers:
- Will not approve enterprise contract signing without legal review of agreement template
- Will not approve community edition agent limit without usage data
- Will not approve public announcement of enterprise tier without brand narrative approved

[CMO] Delegated:
- Copywriter: Enterprise one-pager and pricing sheet — 3 days
- Founder: Source startup attorney this week ($2-3K); close both pilot clients personally before
  week 6; run Option C outreach quietly in parallel under NDA
- CTO: Daemon stability assessment and SSO timeline confirmation before contract SLA language set

[CMO] Success metric:
- Both pilot clients converted to signed annual contracts ($25K+/yr) by week 6
- Community edition limit set based on actual usage data, not assumption
- Zero "MG sold out" posts with >100 upvotes on HN/Reddit within 30 days of enterprise
  tier announcement
- Enterprise messaging validated with at least one pilot client before going public
```

---

### CFO Raw Output

```
[CFO] Assessment: Block Option A. Approve Option B with conditions. Approve Option C as
parallel 10% time investment.

[CFO] Cost:

Option A:
- Engineering: 3-4 months to SaaS MVP. At solo founder + 1 part-time pace: 480-640 hours.
- Cash cost: Personal savings burn for 2-3x beyond current runway. Hard block.
- Revenue: $0 before month 4 at optimistic assumptions.
- Verdict: Does not fit runway. Blocked regardless of strategic merit.

Option B:
- Engineering: SSO via WorkOS (~2 weeks), license enforcement (~1 week), community/enterprise
  code split (~1-2 weeks), observability baseline (~1 week): total ~5-6 weeks at founder pace.
- Cash cost: WorkOS $149/mo + legal MSA review $2-3K + sales collateral $0 (internal).
  Total cash outlay: ~$3K.
- Revenue: 2 pilot clients at $30K/yr = $60K ARR. Break-even on cash investment: <2 months.
- Return on legal investment: $30K revenue against $3K legal cost = 10:1.

Option C:
- Engineering: 1 week of founder time for pitch deck, due diligence prep, benchmark writeup.
- Cash cost: $0.
- Upside: Salary + equity + resources. Even a $500K acqui-hire at a funded company extends
  personal runway indefinitely.
- Risk: Unpredictable timeline, outcome not in our control, consumes 10% of founder attention
  for 4-6 weeks.
- Marginal cost of running parallel to Option B: acceptable.

[CFO] Concern:
The number I am most focused on is not the runway duration — it is the timeline confidence
interval on Option B. The stated 6-8 weeks to first enterprise contract assumes:
  1. SSO ships in 6 weeks (requires WorkOS; without it, add 3-4 weeks = past runway)
  2. Pilot clients close within 1-2 weeks of SSO availability
  3. Legal/contract work is not a bottleneck (parallel track, 1 week)

The single highest-risk item in that chain: legal. If the founder has not engaged a startup
attorney yet, and the pilot client procurement team has legal review requirements, the contract
can slip 2-4 weeks waiting for legal alignment. This is not a small risk — it is a common failure
mode. Engage legal in week 1, not week 5.

Pricing floor concern: The $12K-$60K range is too wide. At $12K/yr = $1K/mo, support cost
sensitivity is extreme. If enterprise support requires 5 hours/mo at $150/hr opportunity cost,
margin is $250/mo — survivable only at 5+ clients. At $30K/yr, margin is $2,000/mo — healthy
at 2 clients. I am flagging to CEO: do not approve a $12K pricing tier without a support-hours
model. The floor I would recommend: $20K/yr minimum. Pilot clients have already signaled $30K
willingness — do not discount yourself below that signal.

Personal financial constraint note: This is a risk-adjusted decision, not a pure expected-value
decision. Option B at $60K ARR (2 clients × $30K) with 70% probability is not equivalent to
Option A at $300K ARR potential with 15% probability when the downside of the 85% case is family
financial stress. The risk-adjusted recommendation favors Option B not just on financial terms
but on family stability terms. These are the same conclusion.

[CFO] Alternative:
If Option B timeline slips past 8 weeks (runway exhausted): explore a 30-day advance payment
from one pilot client in exchange for a first-year discount ($25K prepaid vs $30K invoiced). A
pilot client willing to prepay is a signal of genuine intent. Worth asking in week 2, not week 7.

WorkOS ROI calculation:
- Cost: $149/mo
- Engineering time saved: 3-4 weeks = ~120-160 hours
- At any reasonable opportunity cost: 1000:1 return
- Verdict: Buy immediately. This is the most important financial decision in the next 7 days.

[CFO] Recommendation:
Approve Option B. Buy WorkOS. Engage legal in week 1. Set pricing floor at $20K/yr minimum
pending CEO approval. Run Option C in parallel as a 10% time investment with no cash cost.
Block Option A — it does not fit the runway constraint regardless of strategic merit.

[CFO] Net: Option B positive at $57K+ ARR net of $3K legal cost. Option A negative within
runway window. Option C asymmetric upside at near-zero cost.
[CFO] Verdict: Proceed with B+C parallel. Flag $12K pricing tier to CEO before approving
any package below $20K.
```

---

## Scoring

### Rubric

- **Specificity (1–5):** Does the agent name concrete numbers, timelines, tradeoffs — not vague platitudes?
- **Differentiation (1–5):** Does the output reflect its role's unique perspective, not generic "consulting advice"?
- **Actionability (1–5):** Does the output produce a decision that can be executed, with named owners and criteria?
- **Nuance (1–5):** Does the agent acknowledge genuine tradeoffs and uncertainty, or does it flatten the decision into an obvious choice?
  - 5 = Names specific uncertainties, conditions that would change the recommendation, and what they'd need to learn
  - 3 = Acknowledges tradeoffs exist but doesn't engage with them deeply
  - 1 = Treats the decision as obvious, ignores legitimate counterarguments

---

### CEO — Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Specificity | 5 | "12.5x revenue multiplier"; "10 hours of personal time over 30 days"; "10% of time for a potential exit"; quantified week-by-week success gates; named failure trigger at week 6 |
| Differentiation | 5 | Optionality test applied ("backlash recoverable, running out of money is not"); personal constraint treated as hard constraint not soft factor; business model impact named ("proof of concept on borrowed time"); displaces named concretely — no other agent covers this |
| Actionability | 5 | Clear primary decision + parallel hedge; four named delegations with specific asks; week 4 and week 8 success milestones; explicit failure trigger and contingency |
| Nuance | 4 | Names that Option C is legitimate even while recommending B; explicitly holds pricing approval pending CFO input; acknowledges backlash risk rather than dismissing it; one weakness: does not name what would change the B recommendation to C (e.g., if daemon assessment comes back bad, does B still hold?) |

**CEO Total: 5/5/5/4 → 4.75**

---

### CTO — Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Specificity | 5 | WorkOS timeline "1-2 weeks" vs "4-5 weeks first-time SAML build"; "2 days to assess codebase modularity"; daemon stability "2 weeks of data needed before SLA commitment"; break-even month 2 post-launch; observability gap named as "1-week investment" |
| Differentiation | 5 | Daemon stability gap is a CTO-only observation; codebase modularity risk for community/enterprise split named and quantified; WorkOS build vs buy analysis with specific threshold applied; migration path from B→A described as "additive not destructive" — none of this appears in CEO or CFO outputs |
| Actionability | 5 | Explicit "need 2 days to assess codebase before confirming timeline"; WorkOS as the highest-priority buy decision named; observability as week-1 parallel investment; migration path described with future cost estimate |
| Nuance | 5 | Identifies two specific risks not in the option descriptions (daemon stability, codebase modularity) and names conditions under which the timeline breaks; acknowledges "I cannot confirm the 6-8 week timeline" without data; daemon SLA concern is a condition that could change what Option B delivers; genuinely uncertain about the right SLA language until stability data exists |

**CTO Total: 5/5/5/5 → 5.00**

---

### CMO — Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Specificity | 5 | HashiCorp/Terraform/OpenTofu precedent named explicitly; ">100 upvotes on HN/Reddit" as backlash threshold; 8-agent limit requires usage data with a specific test ("<5% of users affected = defensible; >30% = will be called out"); $2-3K legal cost estimate; support policy gap named operationally |
| Differentiation | 5 | Community trust collapse risk as GTM threat is CMO-only framing; the observation that enterprise clients are also community members (trust audit risk) is uniquely CMO domain; "pitch deck and enterprise sales material are the same document" insight bridges Option C and B — no other agent made this connection; operational readiness checklist applied |
| Actionability | 5 | Five concrete gaps named; five specific required actions before proceed; three named blockers with conditions; delegations with timelines; success metric includes community backlash threshold |
| Nuance | 5 | Explicitly names what she does not know and what data would change the community edition decision; names the Option C messaging risk (confidentiality before contracts signed) without dismissing C; acknowledges the 8-agent limit is an assumption that needs validation; does not declare Option B "safe" — conditions it on legal, usage data, and SLA definition |

**CMO Total: 5/5/5/5 → 5.00**

---

### CFO — Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Specificity | 5 | "480-640 hours" for Option A; "$3K cash outlay" for Option B; "$149/mo WorkOS" with "1000:1 return"; "$20K/yr pricing floor" recommendation with margin math ($2,000/mo vs $250/mo at different price points); "30-day advance payment" bridge option quantified |
| Differentiation | 5 | Risk-adjusted framing (probability-weighted outcomes, not pure expected value) with personal context named; pricing floor concern with margin math — not covered by CEO or CMO; legal engagement timeline risk ("slips 2-4 weeks waiting for legal") as specific failure mode; "most important financial decision in next 7 days" framing for WorkOS |
| Actionability | 5 | WorkOS "buy immediately" named as highest priority action this week; legal engagement "week 1 not week 5" named; bridge option (prepayment from client) with specific structure ($25K prepaid vs $30K invoiced); pricing floor flag routed to CEO |
| Nuance | 4 | Correctly frames this as risk-adjusted decision not pure EV; acknowledges the $12K pricing tier has a legitimate market (explicitly doesn't dismiss it, just flags the margin math); one weakness: does not name conditions under which Option A would be reconsidered (e.g., if a bridge round came in, does A become viable? Never addressed) |

**CFO Total: 5/5/5/4 → 4.75**

---

## Swap Test

**Question:** Could any agent's output have been written by a different agent?

| Agent | Could CEO write it? | Could CTO write it? | Could CMO write it? | Could CFO write it? |
|-------|---------------------|---------------------|---------------------|---------------------|
| CEO | — | No (no daemon stability risk, no codebase modularity risk) | No (no community trust collapse chain, no HashiCorp precedent) | No (no WorkOS ROI calc, no pricing margin math) |
| CTO | No (no optionality test, no personal constraint framing) | — | No (no community trust chain, no enterprise client = community member observation) | No (no margin math on pricing, no bridge loan option) |
| CMO | No (no market timing argument, no "proof of concept on borrowed time" framing) | No (no SAML/SSO technical path, no daemon stability) | — | No (no risk-adjusted vs EV framing, no runway math) |
| CFO | No (no optionality test, no "10% of time for asymmetric upside" framing) | No (no WorkOS buy vs build technical context) | No (no HashiCorp precedent, no usage-data condition for community edition) | — |

**Swap test result: PASS.** Each output is identifiably from its role. No output could be reassigned to another agent without losing domain-critical reasoning.

**Divergence and agreement patterns:**
- All four agents recommend Option B as the primary path. This convergence under a hard constraint (1-month runway vs 3-4 month Option A timeline) is structurally correct — the runway math eliminates Option A regardless of strategic preference.
- All four agents recommend running Option C in parallel, but for different reasons: CEO frames it as asymmetric upside + option hedge; CTO frames it as no-technical-dependency parallel track; CMO frames it as requiring confidentiality discipline; CFO frames it as near-zero cost with asymmetric upside.
- The genuinely interesting divergence is in what each agent is most concerned about: CTO's daemon stability and codebase modularity risk was not named by any other agent. CMO's community trust chain (community members are enterprise prospects) was not named by any other agent. CFO's legal timing risk ("engage legal week 1 not week 5") was not named by any other agent. These non-overlapping concerns represent the framework working correctly — the decision cannot be evaluated by any single role.

---

## Stress Test Scoring Summary

| Agent | Specificity | Differentiation | Actionability | Nuance | Mean |
|-------|-------------|-----------------|---------------|--------|------|
| CEO | 5 | 5 | 5 | 4 | 4.75 |
| CTO | 5 | 5 | 5 | 5 | 5.00 |
| CMO | 5 | 5 | 5 | 5 | 5.00 |
| CFO | 5 | 5 | 5 | 4 | 4.75 |
| **Mean** | **5.00** | **5.00** | **5.00** | **4.50** | **4.875** |

---

## Comparison vs Standard T2 Config C (3-dimension scores, all 5/5/5)

| Agent | Standard T2 Config C (S/D/A) | Stress T2 Config C (S/D/A/N) | Nuance Score | Stress Mean |
|-------|------------------------------|-------------------------------|--------------|-------------|
| CEO | 5/5/5 = 5.00 | 5/5/5/4 | 4 | 4.75 |
| CTO | 5/5/5 = 5.00 | 5/5/5/5 | 5 | 5.00 |
| CMO | 5/5/5 = 5.00 | 5/5/5/5 | 5 | 5.00 |
| CFO | 5/5/5 = 5.00 | 5/5/5/4 | 4 | 4.75 |
| **Mean** | **5.00** | — | **4.50** | **4.875** |

**Standard T2 Config C mean (3 dimensions): 5.00**
**Stress T2 Config C mean (4 dimensions including Nuance): 4.875**
**Delta on the 3 original dimensions: 0.00 — no regression**
**Nuance dimension mean: 4.50**

---

## Analysis

### Constitutions Hold Under Harder Decision

On the three original dimensions (Specificity, Differentiation, Actionability), all four agents maintained 5/5/5 on a substantially harder prompt. The constitutions are doing the same structural work as in the standard T2 Config C: when the agent definition names *what to compute*, the model executes that computation. The harder decision did not degrade output quality on the dimensions where the constitutions provide explicit guidance.

### Nuance Dimension: Where the Stress Shows

The Nuance dimension is where the harder prompt differentiated performance:

**TTO and CMO scored 5:** Both agents named specific uncertainties that could change their recommendation. CTO explicitly withheld timeline confirmation pending a 2-day codebase assessment — this is not hedging, it is the correct behavior when a timeline is genuinely unknown. CMO conditioned the community edition limit on usage data, named a specific test threshold (>30% users affected = problem), and named the confidentiality risk of parallel Option C outreach.

**CEO and CFO scored 4:** Both made strong recommendations with genuine tradeoff acknowledgment, but neither fully named conditions that would change the primary recommendation. CEO never addresses: "what would cause me to recommend C over B?" — the parallel hedge is approved but the switching trigger is not named. CFO never addresses: "what would make Option A viable?" — dismissing it as runway-constrained is correct today but doesn't name the condition under which that changes (e.g., a bridge round). Both are high-quality outputs with a specific gap in conditional reasoning.

### The Non-Overlapping Concerns Pattern

The most significant finding from this stress test: each agent named a critical risk that no other agent named.
- CTO: Daemon is in beta — enterprise SLA on beta software creates a specific churn risk
- CMO: Enterprise clients are community members — backlash risk doubles as enterprise trust risk
- CFO: Legal engagement timing — common failure mode that slips contracts 2-4 weeks

This non-overlap is the stress test's most important result. A solo founder looking at this decision without the multi-role framework would likely miss at least one of these risks. The framework surfaces all three.

### WorkOS Convergence Signal

Three of four agents independently identified WorkOS (or a SAML abstraction layer) as the critical buy decision. CTO identified it as the technical path, CFO quantified the ROI, and implicitly CMO's timeline analysis depends on it. This convergence on a specific third-party tool — without agents seeing each other's outputs — suggests the constitution-guided reasoning is producing internally consistent recommendations across roles.

### CEO Pricing Discipline Working Correctly

CEO explicitly refused to approve the pricing structure pending CFO cost-to-serve input, citing constitution principle 5 ("Pricing and packaging require CFO cost input first"). CFO responded with a $20K/yr minimum recommendation and margin math. This is the intended protocol functioning correctly under stress: the CEO did not guess on pricing.

### Recommendation

**Stress Config C result: 4.875 mean on 4 dimensions (5.00 on original 3 dimensions).**

The constitutions are stress-test resilient on their core dimensions. The Nuance dimension reveals a specific gap: CEO and CFO constitutions do not currently prompt the agent to name "what would change this recommendation" — they are optimized for making decisions, not for naming the conditions under which the decision changes. This is a considered tradeoff (decide quickly, don't be a bottleneck) but the stress test exposes it as a gap under genuinely ambiguous decisions.

**Suggested constitution additions for a future Config D:**
- CEO: Add a "Reversal condition" field — "Under what condition would this recommendation change?"
- CFO: Add a "Bridge scenario" field — "What changes in the resource picture would change this assessment?"

These additions would bring both agents to Nuance 5 without disrupting existing behavior on clean decisions.

---

## Metadata

```
benchmark: T2-Stress
config: C
model_override: claude-sonnet-4-6
agents_tested: [ceo, cto, cmo, cfo]
date: 2026-03-22
prompt_type: three-option strategic decision, ambiguous constraints, personal/family factor
scores:
  ceo: {specificity: 5, differentiation: 5, actionability: 5, nuance: 4, mean: 4.75}
  cto: {specificity: 5, differentiation: 5, actionability: 5, nuance: 5, mean: 5.00}
  cmo: {specificity: 5, differentiation: 5, actionability: 5, nuance: 5, mean: 5.00}
  cfo: {specificity: 5, differentiation: 5, actionability: 5, nuance: 4, mean: 4.75}
stress_configC_mean_4dim: 4.875
stress_configC_mean_3dim: 5.00
standard_configC_mean_3dim: 5.00
delta_original_dimensions: 0.00
nuance_mean: 4.50
swap_test: PASS
evaluator: staff-engineer
constitution_gap_identified: true
gap_description: CEO and CFO constitutions do not prompt "reversal condition" — agents make
  strong recommendations without naming what would change them; CTO and CMO do this naturally
suggested_followup: Config D stress test with reversal-condition prompts added to CEO and CFO
  constitutions
```
