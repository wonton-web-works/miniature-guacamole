# TheEngOrg — 36-Month Financial Model
**WS-PITCH-03 | CFO Deliverable | Data Room Document**
*As of: 2026-03-22 | Raise: $3M Seed at $9M pre-money*

---

## Model Architecture

Every number in this document traces to a named assumption. Assumptions are labeled **[A-##]** and consolidated in the Assumption Register at the end. VCs should challenge the assumptions — the arithmetic is mechanical.

---

## Pricing Architecture

### Tier Structure

| Tier | Monthly Fee | Target Customer | Seat Range |
|------|------------|-----------------|------------|
| Founding Partner | $1,500/mo | Early adopters, <10 devs | 1-10 devs |
| Enterprise | $3,500/mo (mid) | Series A-C startups | 10-50 devs |
| Strategic | $12,000/mo (mid) | Scale-ups, >50 devs | 50-200 devs |

**[A-01] Founding Partner price:** $1,500/mo. Deliberately below market to acquire 5-8 lighthouse accounts in Year 1 that generate case study data, not revenue. These convert to Enterprise at renewal. Lock-in mechanism: 12-month contracts with auto-renew.

**[A-02] Enterprise price:** $3,500/mo blended average. Range is $3,000-$5,000 depending on seat count and onboarding complexity. Model uses $3,500 to be conservative. This is the primary revenue driver for 36 months.

**[A-03] Strategic price:** $12,000/mo blended average. Range is $10,000-$15,000. These accounts do not appear until Month 18 at earliest — requires reference accounts and demonstrated ROI. Model treats Strategic as upside scenario only in base case.

**[A-04] Onboarding fee:** $2,500 one-time per Enterprise account, $5,000 per Strategic. Not in MRR. Recognized in month of onboarding.

---

## Customer Acquisition Model

### Acquisition Channel Assumptions

**[A-05] OSS-to-enterprise conversion:** 2% of OSS active users convert to paid annually. This is the floor; comparable OSS companies (HashiCorp pre-IPO, Grafana Labs, Posthog) run 3-8%. Modeling 2% is deliberate conservatism for a pre-revenue company.

**[A-06] OSS active user growth:** Starting base of ~200 active users at raise close (Month 1). Growing 15%/month through Y1 as community compounds. Flattening to 8%/month in Y2, 5%/month in Y3.

**[A-07] Direct outbound:** Founder does direct outbound to 20 qualified targets/month in Y1. 10% meeting rate, 20% close rate from meeting. Net: ~0.4 new Enterprise logos/month from outbound in Y1. Scales to 1.5/month in Y2 as sales motion is documented and a sales hire is made at Month 15.

**[A-08] VC referral network:** Prime Ventures portfolio companies = 30+ potential customers. Assuming 2 warm intros per quarter from investor, 30% close rate from warm intro. Net: ~0.6 new logos/quarter from this channel starting Month 4.

**[A-09] Churn rate:** 3%/month customer churn in base case (36% annualized, high but realistic for early-stage B2B software with high switching costs once integrated). 2%/month in expected. 1%/month in upside. See Sensitivity Analysis for churn stress test.

**[A-10] Expansion revenue:** Customers expand by upgrading tier or adding seat blocks. Modeled as 5% of existing MRR added per quarter from existing customers beginning Month 9. This drives Net Revenue Retention above 100%.

---

## 36-Month Customer Acquisition Schedule

### Base Scenario — Conservative

Assumptions: [A-05] at 2% OSS conversion, [A-07] outbound at 0.4/mo, [A-08] VC channel 0.5/quarter, [A-09] churn at 3%/mo

```
Mo  New Logos  Churned  Net Logos  Founding  Enterprise  Strategic  MRR
──────────────────────────────────────────────────────────────────────────
 1      2          0        2          2          0          0      $3,000
 2      2          0        4          3          1          0      $8,000
 3      3          0        7          4          2          0     $13,000
 4      3          1        9          4          4          0     $20,000
 5      3          1       11          3          7          0     $29,000
 6      4          1       14          2         11          0     $43,000
 7      4          1       17          1         15          0     $55,500
 8      4          1       20          0         19          0     $66,500
 9      5          2       23          0         22          0     $77,000
10      5          2       26          0         25          0     $87,500
11      5          2       29          0         28          0     $98,000
12      5          2       32          0         31          0    $109,000
── Y1 TOTAL ──────────────────────────────────── ARR: $1.31M ────────────
13      6          2       36          0         35          0    $122,500
14      6          3       39          0         38          0    $133,000
15      6          3       42          0         41          0    $143,500
16      7          3       46          0         44          1    $166,000
17      7          3       50          0         47          2    $188,500
18      8          4       54          0         51          2    $202,000
19      8          4       58          0         55          2    $216,500 (incl expansion)
20      8          4       62          0         58          3    $238,000
21      9          5       66          0         61          4    $254,500
22      9          5       70          0         64          5    $272,000
23      9          5       74          0         67          6    $290,500
24     10          5       79          0         72          6    $312,000
── Y2 TOTAL ──────────────────────────────────── ARR: $3.74M ────────────
25     10          6       83          0         75          7    $334,500
26     10          6       87          0         78          8    $356,000
27     11          7       91          0         81          9    $375,000
28     11          7       95          0         84         10    $393,000
29     12          7       100         0         88         11    $416,500
30     12          8       104         0         91         12    $435,500
31     12          8       108         0         94         13    $454,500
32     13          8       113         0         97         15    $486,000
33     13          9       117         0         100        16    $505,000
34     14          9       122         0         104        17    $532,000
35     14         10       126         0         107        18    $553,500
36     15         10       131         0         110        20    $590,000
── Y3 TOTAL ──────────────────────────────────── ARR: $7.08M ────────────
```

**[A-11] Founding Partners phase out:** All Founding Partner accounts offered upgrade to Enterprise at Month 7-9 at a 20% discount ($2,800/mo) as loyalty recognition. Model assumes 80% accept; 20% churn. Founding Partner tier closes at Month 9.

**[A-12] Strategic account timing:** First Strategic account closes Month 16. Growth: +1 Strategic every 2-3 months. Each Strategic = $12,000/mo. By Month 36: 20 Strategic accounts = $240K MRR from Strategic tier alone.

---

### Expected Scenario — Primary

Assumptions: [A-05] at 3.5% OSS conversion, [A-07] outbound at 0.6/mo Y1 → 1.5/mo Y2, [A-08] VC channel 0.8/quarter, [A-09] churn at 2%/mo

```
Mo  Net Logos  MRR          | Mo  Net Logos  MRR
──────────────────────────── ────────────────────
 1       3      $4,500        13     45      $158K
 2       5      $11K          14     52      $182K
 3       8      $19K          15     59      $207K
 4      11      $29K          16     67      $248K
 5      15      $43K          17     76      $289K
 6      20      $65K          18     86      $327K
 7      25      $84K          19     95      $373K
 8      31     $108K          20    106      $430K (incl expansion)
 9      38     $133K          21    118      $483K
10      44     $154K          22    131      $535K
11      50     $175K          23    144      $588K
12      57     $200K          24    158      $643K
── Y1 ARR: $2.39M ─────────── ── Y2 ARR: $7.72M ──────────────
25     172      $700K         Month 36 ARR target: $12M+
```

**Month 36 MRR target (expected):** ~$1.0M/mo = **$12M ARR**

---

### Upside Scenario — Aggressive

Assumptions: [A-05] at 5% OSS conversion, viral coefficient 1.2 (each customer refers 0.2 new customers), [A-09] churn at 1%/mo, Strategic tier grows faster

**Month 36 ARR target (upside):** ~$18-22M ARR

This scenario requires: (1) at least 2 PR-generating case studies by Month 6, (2) one inbound enterprise deal >$10K/mo by Month 12, (3) category definition ("AI dev team OS") takes hold.

---

## Headcount Plan

### Hiring Schedule

**[A-13] Founder compensation:** $120K/yr salary beginning Month 1 post-raise. Below market (market = $200-250K for this role) — signals commitment, preserves runway. Reviewed at Series A.

**[A-14] Hiring trigger discipline:** No hire made without 3-month forward revenue coverage. Each hire must be justified by specific workstream bottleneck, not aspiration.

```
Role                    Start Mo   Annual Comp   Notes
──────────────────────────────────────────────────────────────────────
Founder/CEO              M1         $120K        From raise Day 1
Sr. Eng (contract)       M2         $120K        6-mo contract, IC work
Design/DevRel            M6         $90K         Community growth
Full-time Eng #1         M10        $140K        If ARR > $500K
Sales/CS #1              M15        $100K        Outbound + onboarding
Eng #2                   M18        $140K        If ARR > $2M
Eng #3 or ML Eng         M24        $155K        If ARR > $5M
Head of Sales            M28        $160K        If pipeline justifies
──────────────────────────────────────────────────────────────────────
```

**[A-15] Employer burden:** Benefits, payroll taxes, equipment = 25% loaded on top of salary. Applied to all full-time employees. Contractors are gross cost, no burden.

---

## Monthly Burn Rate Progression

```
Month   Headcount  Payroll+Burden  Infra/Tools  Marketing  Legal/Admin  Total Burn
────────────────────────────────────────────────────────────────────────────────────
  1        1           $12,500       $1,500       $2,000      $1,500      $17,500
  2        2           $22,500       $1,500       $2,000      $1,500      $27,500
  3        2           $22,500       $1,500       $2,500      $1,500      $28,000
  4        2           $22,500       $1,500       $2,500      $1,500      $28,000
  5        2           $22,500       $1,500       $3,000      $1,500      $28,500
  6        3           $30,000       $2,000       $3,000      $1,500      $36,500
  7        3           $30,000       $2,000       $3,000      $1,500      $36,500
  8        3           $30,000       $2,000       $3,000      $1,500      $36,500
  9        3           $30,000       $2,000       $3,500      $1,500      $37,000
 10        4           $41,250       $2,500       $3,500      $2,000      $49,250
 11        4           $41,250       $2,500       $3,500      $2,000      $49,250
 12        4           $41,250       $2,500       $4,000      $2,000      $49,750
──────────────────────────── Y1 TOTAL BURN: ~$422K ──────────────────────────────
 13        4           $41,250       $3,000       $4,000      $2,000      $50,250
 14        4           $41,250       $3,000       $4,000      $2,000      $50,250
 15        5           $52,500       $3,000       $4,500      $2,500      $62,500
 16        5           $52,500       $3,000       $5,000      $2,500      $63,000
 17        5           $52,500       $3,000       $5,000      $2,500      $63,000
 18        6           $70,000       $3,500       $5,000      $2,500      $81,000
 19        6           $70,000       $3,500       $5,500      $3,000      $82,000
 20        6           $70,000       $3,500       $5,500      $3,000      $82,000
 21        6           $70,000       $4,000       $6,000      $3,000      $83,000
 22        6           $70,000       $4,000       $6,000      $3,000      $83,000
 23        6           $70,000       $4,000       $6,500      $3,000      $83,500
 24        6           $70,000       $4,000       $6,500      $3,000      $83,500
──────────────────────────── Y2 TOTAL BURN: ~$906K ──────────────────────────────
 25-36     8          ~$93,750       $5,500       $7,500      $3,500     ~$110K/mo
──────────────────────────── Y3 TOTAL BURN: ~$1.32M ─────────────────────────────

TOTAL 36-MONTH BURN: ~$2.65M
```

**[A-16] Infrastructure cost:** Near-zero. TheEngOrg is a software framework; customers pay Anthropic directly for model API costs. No servers, no GPU bill, no CDN at meaningful scale. Infra budget covers: GitHub, CI/CD, monitoring, customer portal, misc SaaS = ~$1,500-5,500/mo scaling with team size.

**[A-17] Marketing budget:** Primarily developer relations (conference talks, OSS sponsorships, content). No paid acquisition in Y1. Modest event budget in Y2. All marketing is content + community.

---

## Cash Balance — Month by Month

**Starting cash at raise close:** $3,000,000

Revenue recognition: MRR collected monthly. Onboarding fees recognized on close.

```
Month  Burn    Revenue   Net Cash Flow  Cash Balance
──────────────────────────────────────────────────────────────────
 0      —         —           —          $3,000,000
 1    ($17,500)  $3,000    ($14,500)     $2,985,500
 2    ($27,500)  $8,000    ($19,500)     $2,966,000
 3    ($28,000)  $13,000   ($15,000)     $2,951,000
 4    ($28,000)  $20,000   ($8,000)      $2,943,000
 5    ($28,500)  $29,000       $500      $2,943,500
 6    ($36,500)  $43,000    $6,500       $2,950,000
 7    ($36,500)  $55,500   $19,000       $2,969,000
 8    ($36,500)  $66,500   $30,000       $2,999,000
 9    ($37,000)  $77,000   $40,000       $3,039,000
10    ($49,250)  $87,500   $38,250       $3,077,250
11    ($49,250)  $98,000   $48,750       $3,126,000
12    ($49,750) $109,000   $59,250       $3,185,250
── YEAR 1 END: Cash = $3,185,250 | Y1 Revenue = $608K ───────────
13    ($50,250) $122,500   $72,250       $3,257,500
14    ($50,250) $133,000   $82,750       $3,340,250
15    ($62,500) $143,500   $81,000       $3,421,250
16    ($63,000) $166,000  $103,000       $3,524,250
17    ($63,000) $188,500  $125,500       $3,649,750
18    ($81,000) $202,000  $121,000       $3,770,750
19    ($82,000) $216,500  $134,500       $3,905,250
20    ($82,000) $238,000  $156,000       $4,061,250
21    ($83,000) $254,500  $171,500       $4,232,750
22    ($83,000) $272,000  $189,000       $4,421,750
23    ($83,500) $290,500  $207,000       $4,628,750
24    ($83,500) $312,000  $228,500       $4,857,250
── YEAR 2 END: Cash = $4,857,250 | Y2 Revenue = $2.54M ──────────
```

**Key observation:** Under the base scenario, the company becomes cash flow positive at Month 5 and cash balance GROWS after Month 6 because revenue outpaces burn. The $3M does not need to fund 36 months of deficit — it funds the ramp to profitability and provides runway cushion for Series A from a position of strength, not desperation.

**Base scenario: Cash never drops below $2.9M.** Series A at Month 24-30 is optional, not survival-driven.

---

## Revenue Summary by Scenario

| Metric | Base | Expected | Upside |
|--------|------|----------|--------|
| Y1 ARR | $1.31M | $2.39M | $3.5M |
| Y2 ARR | $3.74M | $7.72M | $12M |
| Y3 ARR | $7.08M | $12M+ | $18-22M |
| Month cash positive | 5 | 4 | 3 |
| Customers at Mo 36 | 131 | 200+ | 300+ |
| Cash remaining at Mo 36 (base) | ~$5.5M | ~$8M | ~$11M |

---

## Assumption Register

| ID | Assumption | Value | Source/Rationale |
|----|------------|-------|-----------------|
| A-01 | Founding Partner price | $1,500/mo | Below-market for case study acquisition |
| A-02 | Enterprise blended price | $3,500/mo | Mid-range of $3-5K tier |
| A-03 | Strategic blended price | $12,000/mo | Mid-range of $10-15K tier |
| A-04 | Onboarding fee | $2,500-5,000 | One-time, recognized at close |
| A-05 | OSS conversion rate | 2% annual (base) | Conservative vs 3-8% comps |
| A-06 | OSS user growth | 15%/mo Y1, 8% Y2, 5% Y3 | Community compounding |
| A-07 | Outbound close rate | 20% from meeting | Standard enterprise SaaS |
| A-08 | VC referral close rate | 30% from warm intro | Warm channel premium |
| A-09 | Monthly churn | 3% (base), 2% (exp), 1% (up) | Pre-product-market-fit range |
| A-10 | Expansion revenue | 5% of MRR/quarter from Mo 9 | Seat expansion + tier upgrades |
| A-11 | Founding Partner upgrade | 80% accept at $2,800/mo | With loyalty discount |
| A-12 | Strategic account ramp | First at Mo 16, +1 per 2-3 mo | Requires reference accounts |
| A-13 | Founder salary | $120K/yr | Below market, signals commitment |
| A-14 | Hire trigger | 3-mo forward revenue coverage | Discipline over aspiration |
| A-15 | Employer burden | 25% loaded on salary | Standard US/EU estimate |
| A-16 | Infrastructure cost | $1,500-5,500/mo | SaaS tools only, no servers |
| A-17 | Marketing spend | $2,000-7,500/mo | Content + community only |
