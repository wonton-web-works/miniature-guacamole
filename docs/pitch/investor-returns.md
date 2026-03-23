# TheEngOrg — Investor Returns Analysis
**WS-PITCH-03 | CFO Deliverable | Data Room Document**
*As of: 2026-03-22 | Raise: $3M Seed at $9M pre-money*

---

## Framing

This document is written from the fund's perspective. You are not buying software. You are buying equity in a company — a claim on future cash flows and exit proceeds. The question is: given your $3M check, what are the plausible paths to return, and what does the distribution of outcomes look like for your portfolio math?

---

## The Deal

**[IR-01] Seed round terms:**
- Raise amount: $3,000,000
- Pre-money valuation: $9,000,000
- Post-money valuation: $12,000,000
- Investor ownership at close: **25.0%**

**[IR-02] Option pool:**
- Pre-raise option pool: 0% (not yet created)
- Post-raise option pool: 10% carved from pre-money (standard SAFE/priced round convention)
- After option pool creation: investor ownership = 25.0% x (1 - 0%) = 25.0% (pool carved pre-money, so investor's percentage of post-money is unaffected)
- Founder ownership post-raise: 75% less option pool = **65%** if option pool is 10% of post-money

**[IR-03] Dilution path to Series A:**
- Series A assumed at Month 24-30
- Assumed Series A raise: $8M-12M
- Assumed Series A pre-money: $30M (base), $50M (expected), $100M (upside)
- Series A dilution: 20-25% (new shares issued)
- Investor stake post-Series A: 25% x (1 - 22.5%) = **~19.4%** (base case Series A dilution of 22.5%)

---

## Return Scenarios

### Scenario A — Base: Series A at $30M Pre-Money

**[IR-04] Assumptions:**
- ARR at Series A: $3M (Month 24, base financial model)
- Revenue multiple at $3M ARR, dev tools, seed→A: 10x ARR = $30M pre-money
- Series A raise: $8M
- Series A dilution: 21% new shares
- Investor stake post-Series A: 25% x (1 - 21%) = 19.75%

**[IR-05] Investor stake value at Series A close (paper):**
- Post-Series A company value: $38M
- Investor stake value: $38M x 19.75% = **$7.5M**
- Return on $3M invested: **2.5x on paper** at Series A close

**[IR-06] Path to fund return:**

If the company continues to $20M ARR and exits at 8x revenue:
- Exit value: $160M
- Investor stake (assuming one more 20% dilution round): 19.75% x 80% = 15.8%
- Investor return: $160M x 15.8% = **$25.3M = 8.4x MOIC**

If the company IPOs or is acquired at $300M (modest outcome for category):
- Investor stake (two more dilution rounds, 15% stake remaining): 15%
- Investor return: $300M x 15% = **$45M = 15x MOIC**

---

### Scenario B — Expected: Series A at $50M Pre-Money

**[IR-07] Assumptions:**
- ARR at Series A: $5M (Month 24, expected financial model)
- Revenue multiple at $5M ARR, AI dev tools, high growth: 10x ARR = $50M pre-money
- Series A raise: $10M
- Series A dilution: 20% new shares
- Investor stake post-Series A: 25% x (1 - 20%) = 20%

**[IR-08] Investor stake value at Series A close (paper):**
- Post-Series A company value: $60M
- Investor stake value: $60M x 20% = **$12M**
- Return on $3M invested: **4x on paper** at Series A close

**[IR-09] Path to fund return:**

If the company continues to $40M ARR and is acquired at 8x:
- Exit value: $320M
- Investor stake (one more dilution round, ~15% remaining): 15%
- Investor return: $320M x 15% = **$48M = 16x MOIC**

If the company reaches $100M ARR and IPOs at 12x:
- Exit value: $1.2B (unicorn threshold)
- Investor stake (~12% after further dilution): 12%
- Investor return: $1.2B x 12% = **$144M = 48x MOIC**

---

### Scenario C — Upside: Series A at $100M Pre-Money

**[IR-10] Assumptions:**
- ARR at Series A: $10M (Month 24-30, upside financial model)
- Revenue multiple: 10x ARR = $100M pre-money (reasonable for high-growth AI infra)
- Series A raise: $15M
- Series A dilution: 15% new shares
- Investor stake post-Series A: 25% x (1 - 15%) = 21.25%

**[IR-11] Investor stake value at Series A close (paper):**
- Post-Series A company value: $115M
- Investor stake value: $115M x 21.25% = **$24.4M**
- Return on $3M invested: **8.1x on paper** at Series A close

**[IR-12] Path to fund return:**

If the company becomes a category leader at $200M ARR:
- Exit value: $2B (conservative for category leader in AI dev infra)
- Investor stake (~10% after further dilution): 10%
- Investor return: $2B x 10% = **$200M = 66x MOIC**

---

## Summary Returns Table

| Scenario | ARR at A | Series A Val | Paper at A | Exit Path | Exit Val | Final MOIC |
|----------|----------|-------------|-----------|-----------|----------|-----------|
| A — Base | $3M | $30M pre | 2.5x | $300M acq. | $45M | 15x |
| B — Expected | $5M | $50M pre | 4x | $320M acq. | $48M | 16x |
| C — Upside | $10M | $100M pre | 8x | $2B IPO | $200M | 66x |
| D — Fail | <$1M | N/A | 0x | Write-off | $0 | 0x |

**[IR-13] Expected value framing:**

If you assign probabilities: Scenario A = 40%, Scenario B = 35%, Scenario C = 15%, Fail = 10%:

EV = (0.40 x 15x) + (0.35 x 16x) + (0.15 x 66x) + (0.10 x 0x)
EV = 6.0 + 5.6 + 9.9 + 0
**EV = 21.5x MOIC**

This expected value is a bet worth taking for a seed portfolio. Even if the VC disagrees with the probabilities and doubles the fail weight (20%), the EV is still ~17x.

---

## Dilution Waterfall

**[IR-14] Full dilution table:**

```
Event                    Investor %   Founder %   Options %
──────────────────────────────────────────────────────────────
At close (no option pool)   25.0%       75.0%        0%
+ 10% option pool carved     25.0%       65.0%       10.0%
+ Series A (20% dilution)    20.0%       52.0%        8.0%
+ Series B (20% dilution)    16.0%       41.6%        6.4%
+ Late stage (15% dilution)  13.6%       35.4%        5.4%
──────────────────────────────────────────────────────────────
```

Note: These dilutions assume pro-rata rights are waived at each round. If investor exercises pro-rata at Series A, ownership is maintained at 25% with additional capital deployed.

**[IR-15] Pro-rata value:**

The seed round should include pro-rata rights for the lead investor. At Series A (projected $50M pre, $10M raise), a 25% pro-rata right = $2.5M additional deployment to maintain position. If the company reaches $100M ARR, that $2.5M Series A investment returns 10-20x on its own, layering on top of the seed return.

---

## Portfolio Construction Fit

**[IR-16] For a fund of 20-30 seed bets:**

This deal fits the portfolio if the fund thesis includes:
- AI-native developer infrastructure
- OSS-led distribution with enterprise monetization
- Capital-efficient businesses (gross margin 90%+)
- Solo technical founder with demonstrated product

**[IR-17] Position sizing:**

$3M is 10-15% of a $20-30M seed fund. Standard sizing for a lead seed check. If the fund is $100M+, this is a follow position — consider whether $5-7M makes sense given the pro-rata opportunity and capital efficiency.

**[IR-18] Loss scenario:**

In the failure scenario, the company has 36 months of runway before cash-out, and the business is profitable by Month 5. A wind-down before cash-out either (a) returns unused capital to investors or (b) sells IP/customer contracts at a discount. The downside is a write-off of some fraction of the $3M, not a total loss — the company's runway means there is time to either pivot or return partial capital. This is a better loss scenario than a company that burns $3M in 18 months with nothing to show.

---

## Why $9M Pre-Money is the Right Entry Point

The valuation justification is in `docs/pitch/valuation-justification.md`. The returns analysis above is the other side of that argument: the investor needs the entry price to be low enough that the base case (Scenario A) still produces a fund-returnable outcome.

At $9M pre / $12M post:
- 3x at Series A = $36M value, investor gets $36M x 19.4% = $7M — meaningful for a seed fund
- 10x at exit = $120M, investor gets ~$18M on $3M check = 6x — reasonable
- 30x at exit = $360M, investor gets ~$54M = 18x — excellent

If the entry was $18M pre ($21M post), the same scenarios produce returns of 1.5x, 5x, and 9x respectively — materially worse, and the base case barely clears cost of capital.

**The $9M pre-money creates the return math. Paying up destroys it.**

---

## Key Risks to Model

**[IR-19] The risks that actually matter for return scenarios:**

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Customer acquisition slower than model | Extends path to Series A, doesn't kill company (long runway) | Two pilots converting in Month 1-2 de-risk this |
| Anthropic changes API pricing materially | Reduces customer ROI, may increase churn | Zero pass-through risk to TheEngOrg; affects customer willingness to pay |
| Competitor from GitHub/Atlassian | Compression of Series A multiple | Category leadership and OSS community moat |
| Solo founder single point of failure | Company risk, not just valuation risk | First hire is a technical co-founder equivalent; mitigated with raise |
| AI capabilities accelerate (GPT-5+) | Framework becomes more valuable, not less | Platform bet, not a model bet |
