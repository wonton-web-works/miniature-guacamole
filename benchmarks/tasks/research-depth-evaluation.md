# Task 3: Research Depth Evaluation

**ID:** T3-RESEARCH-DEPTH
**Version:** 1.0
**Tests:** Sage agent — research evaluation protocol, gap detection, specialist spawning
**Protocol Reference:** Sage AGENT.md § "Research Evaluation Protocol" (Steps 1-6)

---

## Purpose

The Sage's research evaluation protocol is one of its most architecturally novel features. It does not use confidence scores — it uses structured gap detection. The protocol requires the Sage to:

1. Map the problem space before researching
2. Commission general research
3. Evaluate coverage against the map using surface-level vs. depth signals
4. Detect gaps and spawn specialists for sub-domains with insufficient coverage
5. Know when to stop — recognize when AI research has hit its ceiling

This task measures whether the Sage executes this protocol faithfully or collapses it into "do research, report results."

---

## Input Prompt

```
We need to implement procedural terrain generation for a browser-based strategy game.
The terrain must tile seamlessly, support biome transitions (forest, desert, tundra,
ocean), and perform well enough to generate a 512x512 tile map in under 500ms on
mid-range hardware. The team has web engineers but no game development experience.
```

---

## Expected Sage Behavior

### Step 1: Problem Space Mapping

Before doing any research, the Sage should produce a problem map. The map should identify sub-domains, not just the top-level topic.

**Expected sub-domains (minimum coverage):**

| Sub-domain | Why it requires separate research |
|-----------|----------------------------------|
| Noise function selection | Perlin vs. Simplex vs. domain-warped noise have different trade-offs for terrain quality and performance |
| Biome assignment algorithms | Voronoi, temperature/moisture maps, Whittaker biomes — different approaches with different visual results |
| Seamless tiling mathematics | Non-trivial for procedural noise; tiling without visible seams requires specific techniques |
| Browser performance constraints | WebGL vs. Canvas 2D, WASM options, Web Worker offloading — platform-specific |
| Biome transition blending | How to avoid hard edges at biome boundaries — not the same problem as biome assignment |

A Sage that produces only "procedural terrain generation" as its map — without breaking it into sub-domains — has failed Step 1.

### Step 2: General Research

The Sage commissions Explore or WebSearch for the problem space. This is the first pass.

**Watch for:** Does the Sage give the research agent the problem map as context (directing research to cover sub-domains), or does it fire a generic research query?

### Step 3: Coverage Evaluation

After receiving general research, the Sage evaluates each sub-domain against depth signals.

**Expected surface-level signals detected for this domain:**

- Noise function selection: General research will typically say "use Simplex noise, it's better than Perlin" — this names the answer without explaining when you'd choose differently or what the actual implementation tradeoffs are. This is a surface-level signal.
- Seamless tiling: General resources typically say "tile your noise function" without explaining the specific mathematical transform required. Surface-level.
- Browser performance: General research will mention "use Web Workers" and "consider WebAssembly" without benchmarked thresholds or specific implementation patterns for this scale (512x512 in 500ms). Surface-level.

**Expected depth signals accepted (sub-domains likely adequately covered):**

- Biome assignment algorithms: Whittaker biome classification is a well-documented domain with primary sources. General research likely returns adequate depth here.

### Step 4: Specialist Spawning

The Sage should spawn specialists for the sub-domains with detected gaps, not for the entire domain.

**Expected specialist spawns:**
- Noise function specialist (scoped to: implementation tradeoffs, seamless tiling technique)
- Browser WebGL/Canvas performance specialist (scoped to: 512x512 generation benchmarks, Web Worker patterns)

**Anti-pattern to detect:** Spawning a single "procedural terrain generation specialist" that re-covers everything. This is specialist spawning as a ritual, not as a targeted gap-filling mechanism.

**Specialist prompt quality check:** The Sage should give each specialist:
1. What general research already found (context for what's known)
2. The specific gap to fill (what's missing)
3. Specific questions derived from the gap — not open-ended prompts

### Step 5: Specialist Persistence

After the specialist returns results, the Sage should write a specialist file to `.claude/memory/specialists/procedural-terrain-[subdomain].md`.

Check that the file contains:
- Known findings (not just a summary — specific implementation details)
- Sources
- Open questions that remain unresolved

### Step 6: Know When to Stop

This domain has a natural ceiling: the 500ms performance target cannot be validated through research alone. It requires hands-on benchmarking.

**Expected Sage behavior:** Recognize this ceiling and output:

> "Research on browser performance constraints has plateaued. We know [specific findings from specialist]. However, the 500ms target for 512x512 on mid-range hardware cannot be confirmed through web research — this requires implementation and profiling. Recommend flagging this as an open question for the engineering team to validate during prototyping."

A Sage that claims to have answered the performance question through research alone has failed Step 6.

---

## Scoring

Four binary gates. Each gate is pass/fail.

### Gate 1: Problem Space Mapping (pass/fail)

**Pass:** The Sage produces a problem map with at least 4 distinct sub-domains before starting research. Sub-domains are specific enough to direct targeted research (not just "terrain" and "performance").

**Fail:** No map produced. Map produced only after research (reversing the protocol order). Map has fewer than 3 sub-domains. Map contains only top-level topic names without identifying the sub-domain structure.

### Gate 2: Surface-Level Detection (pass/fail)

**Pass:** The Sage explicitly identifies at least 2 sub-domains as surface-level after receiving general research, citing at least one depth-signal criterion from its protocol (hedging language, tutorial sources, "what" without "how specifically", etc.).

**Fail:** The Sage accepts all general research as adequate. No gap detection performed. Gaps detected but not articulated against protocol criteria.

### Gate 3: Specialist Spawning (pass/fail)

**Pass:** The Sage spawns at least one specialist scoped to a specific sub-domain gap (not the entire domain). The specialist's prompt includes: context of what's already known + the specific gap to fill + specific questions.

**Fail:** No specialist spawned. Specialist spawned for full domain re-coverage. Specialist spawned but prompt is generic ("research procedural terrain generation deeply"). Specialist spawned correctly but prompt omits the known-context section.

### Gate 4: Ceiling Recognition (pass/fail)

**Pass:** The Sage identifies the 500ms performance target as unverifiable through research alone and recommends human/implementation validation. Escalation message names what is known and what specifically remains unresolved.

**Fail:** Sage claims the performance question is answered. Sage does not address the performance question. Sage escalates but without naming the specific gap (generic "we need to test this" doesn't count).

---

## Aggregate Score

```
Gates passed / 4
```

A score of 4/4 means the Sage executed the full research evaluation protocol correctly.
A score of 2/4 or below indicates the Sage is collapsing the protocol — treating research as a single step rather than a structured evaluation cycle.

---

## Secondary Observations

Record these as qualitative notes alongside the gate scores:

**Protocol order compliance:** Did the Sage map first, then research, then evaluate — or did it research first and map retroactively? Retroactive mapping is a failure pattern where the map is constructed to match what was found, not to direct what should be sought.

**Specialist prompt quality:** Beyond pass/fail on Gate 3, note how specific the specialist questions are. "What are the tradeoffs of Simplex vs. domain-warped noise for seamless tileable terrain?" is a quality question. "Tell me more about noise functions" is not.

**Specialist file quality:** If a specialist file is written, evaluate whether it contains implementation-level detail or just repackages general research. A specialist file that says "Simplex noise is generally preferred for terrain generation" has not captured specialist-level knowledge.

---

## Execution Notes

1. Run this prompt through the Sage cold — no preceding context.
2. Do not interrupt the Sage during the research cycle. Let it run to completion.
3. Record the timestamp of each step (mapping, research query, specialist spawn) to verify protocol order.
4. Evaluate Gate 3 only after the Sage has run — do not prompt it toward specialist spawning.
5. If the Sage asks for user input mid-cycle (which is valid Sage behavior), respond with: "Proceed with your best judgment."
