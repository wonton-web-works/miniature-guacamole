# TheEngOrg — Sensitivity Analysis
**WS-PITCH-03 | CFO Deliverable | Data Room Document**
*As of: 2026-03-22 | Raise: $3M Seed at $9M pre-money*

---

## Purpose

A financial model is a set of assumptions dressed up in arithmetic. This document stress-tests the assumptions that matter — not the ones that are interesting to vary, but the ones that would actually change the decision to invest or the path to Series A.

Three assumptions drive 80% of the outcome variance:
1. Customer acquisition rate
2. Average contract value (ACV)
3. Monthly churn rate

Everything else is second-order.

---

## Stress Test 1: Customer Acquisition 50% Slower

### Assumption being tested
**[SA-01]** The base model acquires 32 customers in Year 1. This test cuts that to 16 — 50% slower across all channels (OSS conversion, outbound, VC referrals).

### Revised model — 50% slow acquisition

```
Month  Customers  MRR (slow acq)  vs. Base
──────────────────────────────────────────────
   6        7         $21,500       -50%
  12       16         $54,500       -50%
  18       27        $101,000       -50%
  24       40        $157,000       -50%
  36       66        $295,000       -50%
```

**Y1 ARR at slow pace:** $654K (vs $1.31M base)
**Y2 ARR at slow pace:** $1.9M (vs $3.74M base)
**Y3 ARR at slow pace:** $3.5M (vs $7.08M base)

### What breaks?

**[SA-02] Cash balance impact:**

Base: Cash never drops below $2.9M. The company is cash-flow positive by Month 5.

Slow acquisition: Revenue ramp is half of base. Cash flow turns positive at Month 9 instead of Month 5. Monthly net cash flow remains negative by ~$7-15K through Month 8.

```
Month  Burn      Revenue    Net Flow   Cash Balance
─────────────────────────────────────────────────────
  1   ($17,500)   $1,500   ($16,000)   $2,984,000
  2   ($27,500)   $4,000   ($23,500)   $2,960,500
  3   ($28,000)   $6,500   ($21,500)   $2,939,000
  4   ($28,000)  $10,000   ($18,000)   $2,921,000
  5   ($28,500)  $14,500   ($14,000)   $2,907,000
  6   ($36,500)  $21,500   ($15,000)   $2,892,000
  7   ($36,500)  $27,750   ($8,750)    $2,883,250
  8   ($36,500)  $33,250   ($3,250)    $2,880,000
  9   ($37,000)  $38,500    $1,500     $2,881,500
 12   ($49,750)  $54,500    $4,750     $2,863,000 (lowest point)
 24  ($83,500)  $157,000   $73,500     $3,500,000+
 36  ($110,000) $295,000  $185,000     $5,000,000+
```

**[SA-03] What breaks: Nothing critical.**

- Minimum cash balance: ~$2.86M at Month 12 (still 96% of starting capital)
- The company is still profitable and growing by Month 9
- Series A readiness shifts from Month 24 to Month 30 (ARR target of $3M reached at Month 30 instead of Month 24)
- Runway extends: the company never actually needs more capital under this scenario. $3M is enough even at half the growth rate.

**[SA-04] Trigger for concern:**

The model breaks if acquisition is not just slow, but zero — i.e., product-market-fit is not validated. Define a Month 6 checkpoint: if fewer than 5 paying customers, it is a signal to revisit positioning before burn rate escalates with headcount. Planned hire at Month 10 (Eng #1) is gated on ARR > $500K — this gate automatically delays in the slow scenario, preserving cash.

**[SA-05] Verdict: 50% slower acquisition does not kill the company.** It delays Series A and compresses the upside scenario. The $3M is sufficient even at half the projected growth rate. This is a feature of the near-zero burn model.

---

## Stress Test 2: Average Deal Size $2K/mo Instead of $3.5K/mo

### Assumption being tested
**[SA-06]** The base model uses $3,500/mo blended ACV for Enterprise. This test reprices to $2,000/mo — a scenario where competitive pressure, smaller customers, or pricing resistance prevents the mid-range price point from holding.

At $2,000/mo, gross margin compresses slightly (COGS are largely fixed per customer):
- COGS per customer: ~$324/mo (unchanged)
- Gross margin at $2,000/mo: ($2,000 - $324) / $2,000 = 83.8%

### Revenue impact

Same customer count, different ACV:

| Metric | Base ($3,500/mo) | Low ACV ($2,000/mo) | Delta |
|--------|-----------------|---------------------|-------|
| Y1 ARR | $1.31M | $748K | -43% |
| Y2 ARR | $3.74M | $2.14M | -43% |
| Y3 ARR | $7.08M | $4.04M | -43% |
| Mo 36 MRR | $590K | $337K | -43% |
| Series A timing | Mo 24 | Mo 32 | +8 months |

### Cash balance impact

**[SA-07]** At $2K/mo ACV, the company reaches cash-flow breakeven at Month 7 instead of Month 5. Minimum cash balance drops to ~$2.85M at Month 6.

By Month 24: Cash is approximately $3.6M (still growing, not declining).

By Month 36: Cash is approximately $4.5M.

**[SA-08] The LTV:CAC math still works at $2K/mo:**

LTV at $2K/mo, 24-month retention, 84% margin: $2,000 x 0.84 x 24 = $40,320
CAC: $1,200

LTV:CAC = 33.6x — still excellent.

**[SA-09] What breaks:**

Series A timing shifts by 6-8 months to reach $3M ARR. The headline at pitch time is weaker. However, the business is not impaired — it is merely growing more slowly than projected.

**[SA-10] What this tells us about pricing strategy:**

The model should not accept $2K/mo deals as a pattern. $2K/mo is the signal that either (a) you're selling to customers who aren't the right ICP, or (b) the value proposition is not landing clearly. The Founding Partner tier at $1,500/mo is intentional. Enterprise at $2K/mo is a mistake.

**Action if hitting $2K/mo resistance:** Raise the anchor. Start conversations at $5K/mo and negotiate down to $3.5K. Never lead with a number below $3K except for Founding Partner accounts that are explicitly case-study targets.

**[SA-11] Verdict: Low ACV is survivable but should trigger a positioning review.** If average deal is $2K/mo after 6 months of selling, the problem is the sales motion, not the product. Fix the motion before it compounds.

---

## Stress Test 3: Churn at 10% Monthly

### Assumption being tested
**[SA-12]** Base case uses 3%/mo churn. 10%/mo churn (120% annualized) represents a product-market-fit failure — customers are not finding ongoing value and are leaving faster than they are acquired.

### Why 10%/mo is extreme (and worth modeling anyway)

10%/mo churn implies an average customer lifetime of 10 months. At this rate, the top of the funnel must constantly replace the base. Most B2B software companies with churn this high are either (a) too complex to implement, (b) delivering no measurable ROI, or (c) competing with a free alternative that appeared after launch.

### Revenue impact under 10%/mo churn

```
Month  Logos Acquired  Churned  Net Logos  MRR
──────────────────────────────────────────────────
   1        2              0        2      $7,000
   2        2              0        4      $14,000
   3        3              0        7      $24,500
   4        3              1        9      $27,000
   5        3              1       11      $31,500
   6        4              1       14      $35,000
   9        5              4       15      $40,500 (churn eating acquisitions)
  12        5              4       16      $44,000 (plateau — acquiring = churning)
  18        8              5       19      $55,000 (flat, not growing)
  24       10              6       23      $65,500
  36       15              7       31      $90,000
```

**Y1 ARR at 10% churn: $528K**
**Y2 ARR at 10% churn: $787K**
**Y3 ARR at 10% churn: $1.08M**

**[SA-13] Cash balance at 10% churn:**

The company becomes cash-flow positive around Month 11. Cash balance at Month 36 is approximately $2.1M — a decline from the $3M starting position, but not zero.

```
Month  Burn     Revenue  Net Flow  Cash Balance
─────────────────────────────────────────────────
  12  ($49,750)  $44,000  ($5,750)  $2,781,000
  18  ($81,000)  $55,000 ($26,000)  $2,532,000
  24  ($83,500)  $65,500 ($18,000)  $2,380,000
  36 ($110,000)  $90,000 ($20,000)  $2,100,000 (approaching exhaustion)
```

**[SA-14] What breaks at 10%/mo churn:**

At Month 30, if burn rate has scaled to $110K/mo and revenue is $80K/mo, monthly cash drain is $30K. Cash runway from that point: $2.2M / $30K = 73 months. The company isn't dead — it's in a slow bleed with substantial time to fix or pivot.

However, Series A is not available at $1M ARR (Series A threshold is $3M+). The company must either (a) fix churn before Month 18 or (b) plan for a bridge round or profitable pivot.

**[SA-15] The churn crisis plan:**

If Month 6 churn > 5%/mo: immediate customer success intervention. Every churning customer gets a founder call within 24 hours of cancellation notice. Root cause documented. If a pattern exists (specific use case failing, workflow friction), prioritize fixing it over all other product work.

If Month 12 churn > 5%/mo and not declining: this is a product-market-fit signal. See Pivot Options below.

**[SA-16] Verdict: 10%/mo churn does not cause immediate company failure, but it kills the Series A path.** The $3M provides enough runway to detect, diagnose, and attempt to fix the churn problem before cash runs out. The company has approximately 36 months before cash drops below $1M even in this scenario — meaningful time.

---

## Cash-Out Date Under Pessimistic Combined Scenario

**[SA-17] Combined stress test: 50% slower acquisition + $2K/mo ACV + 5% monthly churn**

This is the "everything goes wrong" scenario — not 10% churn (which is a catastrophe), but a sustained 5%/mo (60% annual) that represents a struggling product finding partial traction.

```
Month  Customers  MRR      Burn     Net Flow  Cash Balance
──────────────────────────────────────────────────────────────
   6       5     $10,000  $36,500  ($26,500)  $2,823,000
  12       9     $18,000  $49,750  ($31,750)  $2,625,000
  18      14     $28,000  $63,000  ($35,000)  $2,415,000
  24      17     $34,000  $83,500  ($49,500)  $2,008,000
  30      20     $40,000  $83,500  ($43,500)  $1,749,000
  36      22     $44,000  $83,500  ($39,500)  $1,545,000
  42      25     $50,000  $83,500  ($33,500)  $1,344,000  ← 1yr past model horizon
```

**Cash exhaustion in pessimistic scenario: Month 56-60** (assuming no headcount scale-down).

If headcount is held flat (no hires after Month 10), burn stabilizes at $63K/mo. Cash runs out at approximately Month 55.

**[SA-18] The takeaway:** Even the pessimistic combined scenario gives the company 4+ years of runway on $3M. This is because the burn rate is so low. The business model is nearly impossible to kill with a single $3M check — you'd have to be actively bad at all three variables simultaneously to run out of money within the raise period.

---

## "What We Do If It's Not Working by Month 12"

**[SA-19] Month 12 checkpoint criteria for "not working":**

The business is in trouble by Month 12 if ALL of the following are true:
- Paying customers < 10 (vs 32 projected in base)
- Monthly churn > 5% with no improvement trend
- No pilot customer willing to provide a public case study
- ARR < $200K with no clear inflection point

If this is the situation at Month 12, the $3M capital has ~$2.6M remaining. The founder has 30+ months to make a decision.

### Pivot Option 1: Narrow the ICP

**[SA-20]** Current ICP is broad (any startup with <50 devs using Claude). Narrow to one vertical: e.g., fintech startups post-Series A using AI for compliance-adjacent development. Deeper specialization commands higher ACV ($5-8K/mo) and reduces churn (industry-specific agents are harder to replicate).

Cost: 3-4 months of product focus. Token investment: 1 sprint cycle of agent specialization.
Expected outcome: 50% reduction in sales cycle, 30% increase in ACV.

### Pivot Option 2: Services-Led Model

**[SA-21]** If platform sales are slow, monetize the team simulation expertise as a service. "Wonton Web Works for AI" — implementation consulting where the team deploys and manages the MG framework for enterprise clients. Revenue is services-based ($25-50K/engagement), not recurring, but provides cash flow and case study creation.

Cost: Founder time shift from product to delivery. Slows platform development.
Expected outcome: $300-500K in services revenue in 12 months; converts 20% to platform licenses.

### Pivot Option 3: API-First / Embedded Framework

**[SA-22]** Instead of selling to end users, sell to developer tools companies (Cursor, Linear, Retool, etc.) who want to embed the agent coordination layer in their own products. B2B2B model with revenue sharing. Higher ACV per deal ($20-50K/yr), fewer deals needed.

Cost: 6 months of API productization. Series A story changes from "AI dev team OS" to "AI orchestration infrastructure."
Expected outcome: 3-5 enterprise API deals at $30-50K/yr = $90-250K ARR from 5 deals.

### Pivot Option 4: Acqui-hire / Strategic Partnership

**[SA-23]** If all three pivots fail to produce traction by Month 24, the honest option is a strategic conversation with companies that want the technology or the team. Anthropic, GitHub, Atlassian, or a major consulting firm. The Sage benchmark results (1.000) and the multi-agent framework represent real engineering value even if the go-to-market has not worked.

This is not failure — it is capital-efficient exploration that preserves investor return (partial, via acquisition) rather than a total write-off.

---

## Sensitivity Summary

| Variable | Base | Stress | Impact | Fatal? |
|----------|------|--------|--------|--------|
| Acquisition pace | 32 customers/Y1 | 16 customers/Y1 (-50%) | Series A delays 6 months | No |
| ACV | $3,500/mo | $2,000/mo (-43%) | Series A delays 8 months | No |
| Churn | 3%/mo | 10%/mo | Growth plateau, Series A blocked | No, but pivots required |
| Combined stress | Base | All three simultaneously | Cash to $1.5M by Mo 36 | No (55+ month runway) |
| Headcount | Per plan | Freeze after Mo 10 | Burn drops to $63K/mo | Extends runway 2+ years |

**Bottom line:** The $3M is over-provisioned for the base case and sufficient for any realistic stress scenario. The company's survival is not at risk from revenue shortfalls. The risk is opportunity cost — moving too slowly to reach Series A territory while the AI dev tools market window is open.
