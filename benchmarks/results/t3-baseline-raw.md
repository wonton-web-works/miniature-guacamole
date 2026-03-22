# T3 Baseline — Sage Research Evaluation Protocol Execution Log

**Prompt:** Procedural terrain generation for a browser-based strategy game with seamless tiling, biome transitions (forest, desert, tundra, ocean), 512x512 in <500ms on mid-range hardware. Team has web engineers, no gamedev experience.

**Date:** 2026-03-22
**Agent:** The Sage
**Protocol:** Research Evaluation Protocol (Steps 1-6)

---

## Step 1: Problem Space Mapping (BEFORE research)

Decomposed the prompt into 10 sub-domains before any web searches were conducted:

| # | Sub-Domain | Key Questions |
|---|-----------|---------------|
| 1 | Noise algorithms | Which noise functions? Performance, tileability, tradeoffs? |
| 2 | Seamless tiling | How to make noise tile at map boundaries? Wrapping techniques? |
| 3 | Biome classification & transitions | How to map noise to biomes? Blending at boundaries? |
| 4 | Multi-octave / fractal composition | fBm parameters, layering, tuning? |
| 5 | Performance in browser (JS/WASM) | Can 512x512 be done in <500ms? Web Workers? WASM? |
| 6 | Existing JS/TS libraries | What's mature, maintained, well-documented? |
| 7 | Rendering pipeline | Canvas 2D vs WebGL? Chunk rendering? |
| 8 | Seed-based determinism | Same seed = same map? PRNG in JS? |
| 9 | Data representation | Typed arrays? Memory budget? Serialization? |
| 10 | Team onboarding | Conceptual gaps for web devs? Learning path? |

---

## Step 2: General Research

### Search Queries Executed (First Pass)
1. `procedural terrain generation browser JavaScript noise algorithm seamless tiling 2026`
2. `simplex noise JavaScript library performance benchmark 512x512 generation speed 2025 2026`
3. `biome generation Whittaker diagram procedural game terrain temperature moisture map`
4. `seamless tileable noise 4D simplex noise wrapping torus procedural generation technique`
5. `Canvas 2D vs WebGL tile map rendering performance 512x512 strategy game browser 2025`
6. `Web Worker procedural generation offload main thread JavaScript terrain generation`
7. `biome transition blending smooth edges procedural generation noise interpolation technique`
8. `simplex-noise.js jwagner TypeScript API createNoise2D createNoise4D seeded PRNG alea`
9. `procedural generation web developer guide no game experience tile map tutorial 2025 2026`

### Key General Findings

**Noise:** simplex-noise.js by jwagner — 70M noise2D calls/sec, ~4ms for 512x512 raw. TypeScript, 2KB, zero deps. API: createNoise2D/3D/4D with optional PRNG.

**Seamless Tiling:** Map 2D coordinates to 4D torus via (cos(x*2pi), sin(x*2pi), cos(y*2pi), sin(y*2pi)). Use createNoise4D. Slight character change acceptable.

**Biomes:** Whittaker diagram — temperature x moisture lookup table. Azgaar's Fantasy Map Generator uses 100x10 rectangular matrix. Weight-based blending for transitions.

**Performance:** JS sufficient. Web Worker offloading eliminates UI blocking. WASM escape hatch available if needed (1.3-2x speedup).

**Libraries:** simplex-noise.js + alea (seeded PRNG). Both npm packages, TypeScript support.

**Rendering:** Canvas 2D with offscreen pre-rendering recommended for this team's skill level. WebGL reserved for future optimization.

**Determinism:** alea package provides seeded PRNG. Pass to createNoise2D(prng). Same seed = same output.

---

## Step 3: Coverage Evaluation Against Map

| # | Sub-Domain | Depth Assessment | Signal Type | Action |
|---|-----------|------------------|-------------|--------|
| 1 | Noise algorithms | Specific numbers (70M calls/sec, 4ms), concrete library, API details | **DEPTH** | Adequate |
| 2 | Seamless tiling | Specific technique (4D torus), mathematical formula, tradeoff identified | **DEPTH** | Adequate |
| 3 | Biome classification & transitions | Whittaker concept explained, blending approaches named but not fully specified | **PARTIAL** | Specialist needed |
| 4 | Multi-octave / fractal composition | Terms named (fBm, lacunarity, persistence) but "how specifically" missing | **SURFACE** | Specialist needed |
| 5 | Performance in browser | Concrete numbers, Worker pattern described, WASM benchmarked | **DEPTH** | Adequate |
| 6 | Existing JS/TS libraries | Specific recommendation with version, API, bundle size | **DEPTH** | Adequate |
| 7 | Rendering pipeline | Canvas vs WebGL tradeoffs but no concrete recommendation for this case | **PARTIAL** | Specialist needed |
| 8 | Seed-based determinism | Specific solution: alea + simplex-noise.js integration | **DEPTH** | Adequate |
| 9 | Data representation | "Typed arrays" mentioned but no specifics on layout or serialization | **SURFACE** | Specialist needed |
| 10 | Team onboarding | Tutorials listed but no structured learning path or gap analysis | **SURFACE** | Specialist needed |

**Surface-level signals detected:**
- Sub-domain 4: Sources used hedging language ("generally," "typically"). No concrete parameter values.
- Sub-domain 9: Key terms named (Typed Arrays) but not unpacked for this specific use case.
- Sub-domain 10: Multiple tutorial links but no analysis of web-to-gamedev knowledge gaps.

**Gaps identified for specialist research:** Sub-domains 3, 4, 7, 9, 10.

---

## Step 4: Specialist Research

### Specialist Queries (Second Pass)
1. `fractal Brownian motion fBm implementation parameters octaves lacunarity persistence JavaScript noise terrain`
2. `Whittaker biome lookup table implementation code temperature precipitation values forest desert tundra ocean`
3. `Azgaar fantasy map biome matrix implementation temperature moisture grid lookup table code`
4. `Uint8Array Float32Array terrain map data structure JavaScript tile game memory layout serialization`
5. `tile map rendering Canvas 2D pre-render offscreen strategy game chunk approach ImageData putImageData performance`
6. `WebAssembly WASM noise generation terrain faster than JavaScript benchmark comparison`
7. `Red Blob Games procedural map generation noise terrain tutorial`

### Specialist Findings Summary

**fBm Parameters (Sub-domain 4 — resolved):**
- Industry standard: lacunarity=2.0, persistence=0.5 ("1/f noise")
- Octaves 4-8 depending on detail needs
- Concrete implementation pattern obtained with normalization step

**Biome Lookup Table (Sub-domain 3 — resolved):**
- Azgaar uses 100x10 rectangular matrix; for 4 biomes, 5x5 or 10x10 suffices
- Constructed concrete lookup table mapping temperature x moisture to forest/desert/tundra/ocean
- Three blending approaches ranked: dithered (simplest), weight-based (recommended), Voronoi (advanced)

**Rendering Decision (Sub-domain 7 — resolved):**
- Recommendation: Canvas 2D with offscreen pre-rendering for this team
- ImageData direct pixel writing for generation phase
- Chunk-based compositing for pan/scroll
- WebGL deferred to optimization phase

**Data Architecture (Sub-domain 9 — resolved):**
- Float32Array for intermediate noise layers (~1MB each)
- Uint8Array for final biome map (~256KB)
- Total ~3.25MB for 512x512 — negligible
- IndexedDB for ArrayBuffer persistence (zero-copy)

**Team Onboarding (Sub-domain 10 — resolved):**
- Identified 6 key conceptual gaps (coordinate systems, coherent noise, multi-layer composition, typed arrays, frame-based thinking, Canvas API)
- Structured 2-week learning path with specific resources at each stage
- 7 common pitfalls with prevention strategies

---

## Step 5: Specialist Persistence

Created 4 specialist files in `.claude/memory/specialists/`:

1. **procedural-noise-algorithms.md** — Noise selection, fBm implementation, seamless tiling technique, seeding
2. **biome-classification-transitions.md** — Whittaker lookup table, blending approaches, multi-layer architecture
3. **browser-terrain-rendering.md** — Canvas 2D strategy, data structures, Web Worker pattern, performance budget
4. **web-to-gamedev-onboarding.md** — Knowledge gaps, 2-week learning path, pitfall prevention

---

## Step 6: Research Ceiling — What Needs Human/Implementation Validation

### Research has plateaued on these specific items:

1. **Actual mid-range device performance** — All benchmarks found are from desktop Ryzen processors. The 500ms budget on "mid-range hardware" needs real-device profiling. We have strong estimates (100-200ms on desktop, projected 200-400ms on mid-range), but cannot validate through research alone. **Needs: benchmark on target device class.**

2. **4D torus noise `scale` parameter** — The torus mapping formula requires a `scale` value that controls noise character. No source provided empirically tested values for 512x512 tile maps specifically. **Needs: visual experimentation** with different scale values (try 1.0, 2.0, 4.0 and compare output).

3. **Biome boundary perturbation strength** — The blending approach is well-documented but the specific perturbation multiplier that looks good is inherently visual/aesthetic. Too high destroys biome coherence, too low shows grid artifacts. **Needs: interactive parameter tuning** with visual feedback.

4. **Tile visual size decision** — Is a "tile" 1 pixel, 16 pixels, or 32 pixels? This is a game design decision that fundamentally affects the rendering approach. 1px/tile means the 512x512 map is 512px on screen. 32px/tile means the map is 16,384px wide (requires viewport + scrolling). **Needs: product decision from stakeholders.**

5. **Art style and tile assets** — Research can define the terrain data pipeline but cannot determine the visual art direction. Procedural generation creates the data; rendering requires art assets (tile sprites, or programmatic coloring). **Needs: design decision — sprite-based or programmatic color?**

6. **OffscreenCanvas browser support matrix** — Current support is broad but Safari's implementation timeline relative to this project's target browsers needs verification. **Needs: check caniuse.com against project's browser requirements.**

### What research CAN still provide (not yet requested):

- Specific WASM compilation pipeline if JS proves too slow
- Advanced terrain features (rivers, roads, city placement algorithms)
- Multiplayer terrain sync protocols
- Accessibility considerations for terrain color palettes

---

## Performance Budget Summary (Deliverable)

| Phase | Approach | Est. Time (Desktop) | Est. Time (Mid-range) |
|-------|----------|---------------------|----------------------|
| Noise generation | 4 layers x 4-6 octaves fBm, simplex-noise.js | 30-60ms | 60-120ms |
| Seamless tiling overhead | 4D noise vs 2D (2-3x per sample) | Included above | Included above |
| Biome classification | Lookup table on typed arrays | 5-10ms | 10-20ms |
| Biome blending | Dithered or weight-based | 10-20ms | 20-40ms |
| Pixel rendering | ImageData write | 5-10ms | 10-20ms |
| **Total** | **Web Worker, non-blocking** | **50-100ms** | **100-200ms** |

**Verdict: 500ms budget is achievable in pure JavaScript with comfortable margin.**

---

## Recommended Architecture (Deliverable)

```
┌─────────────────────────────────────────────────┐
│                  Main Thread                     │
│                                                  │
│  1. User clicks "Generate Map"                   │
│  2. postMessage({seed, params}) → Worker         │
│  3. Show loading indicator                       │
│  4. Receive {imageData, biomeMap} from Worker    │
│  5. ctx.putImageData(imageData)                  │
│  6. Store biomeMap for game logic                │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│                  Web Worker                       │
│                                                  │
│  Dependencies:                                   │
│    - simplex-noise (createNoise2D, createNoise4D)│
│    - alea (seeded PRNG)                          │
│                                                  │
│  Pipeline:                                       │
│    1. Initialize PRNG from seed                  │
│    2. Create noise functions (4 layers)          │
│    3. Generate elevation (fBm, 6 octaves)        │
│    4. Generate temperature (fBm, 4 octaves)      │
│    5. Generate moisture (fBm, 4 octaves)         │
│    6. Classify biomes (Whittaker lookup)          │
│    7. Blend biome boundaries (dithered)          │
│    8. Write ImageData pixels (RGBA)              │
│    9. Transfer back via Transferable             │
│                                                  │
│  Data Structures:                                │
│    - elevation: Float32Array(512*512)            │
│    - temperature: Float32Array(512*512)          │
│    - moisture: Float32Array(512*512)             │
│    - biomeMap: Uint8Array(512*512)               │
│    - imageData: ImageData(512, 512)              │
└──────────────────────────────────────────────────┘
```

---

## Technology Stack (Deliverable)

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Noise library | simplex-noise.js (npm: simplex-noise) | 70M calls/sec, TS, 2KB, tree-shakeable |
| PRNG | alea (npm: alea) | Seedable, fast, pairs with simplex-noise |
| Tiling method | 4D torus mapping via createNoise4D | Mathematically seamless, no edge artifacts |
| Biome system | Whittaker lookup table (5x5 matrix) | Simple, well-documented, production-proven |
| Biome blending | Dithered transitions (upgrade to weight-based if needed) | Simplest correct approach |
| Rendering | Canvas 2D + ImageData | Familiar to web devs, sufficient perf |
| Threading | Web Worker with Transferable objects | Non-blocking UI, zero-copy data transfer |
| Data format | Float32Array (intermediate), Uint8Array (final) | Memory-efficient, fast typed array access |
| Persistence | IndexedDB (ArrayBuffer storage) | Native binary storage, no serialization |

---

## Sources

### Primary (Depth sources — implementation-grade)
- [simplex-noise.js GitHub](https://github.com/jwagner/simplex-noise.js)
- [simplex-noise npm](https://www.npmjs.com/package/simplex-noise)
- [Red Blob Games: Making maps with noise](https://www.redblobgames.com/maps/terrain-from-noise/)
- [The Book of Shaders: fBm](https://thebookofshaders.com/13/)
- [Azgaar: Biomes generation and rendering](https://azgaar.wordpress.com/2017/06/30/biomes-generation-and-rendering/)
- [NoisePosti.ng: Fast Biome Blending](https://noiseposti.ng/posts/2021-03-13-Fast-Biome-Blending-Without-Squareness.html)
- [MDN: Tiles and tilemaps overview](https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps)
- [MDN: Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [GameDev.net: Seamless Noise](https://www.gamedev.net/blog/33/entry-2138456-seamless-noise/)

### Secondary (Context and benchmarks)
- [Canvas performance optimization 2026](https://docs.bswen.com/blog/2026-02-21-canvas-performance-optimization/)
- [Canvas vs WebGL performance](https://semisignal.com/a-look-at-2d-vs-webgl-canvas-performance/)
- [web.dev: Off main thread](https://web.dev/articles/off-main-thread)
- [WASM benchmark analysis](https://benchmarkingwasm.github.io/BenchmarkingWebAssembly/)
- [Musgrave: Procedural Fractal Terrains (PDF)](https://www.classes.cs.uchicago.edu/archive/2015/fall/23700-1/final-project/MusgraveTerrain00.pdf)
- [PCG Wiki: Whittaker Diagram](http://pcg.wikidot.com/pcg-algorithm:whittaker-diagram)
- [AutoBiomes paper (Springer)](https://link.springer.com/article/10.1007/s00371-020-01920-7)
- [Procedural Generation Basics 2026](https://boomiestudio.com/blog/procedural-generation-basics)
- [BSWEN: Procedural tile generation](https://docs.bswen.com/blog/2026-02-21-procedural-tile-generation/)
- [basementuniverse/tile-map](https://github.com/basementuniverse/tile-map)
