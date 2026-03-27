# Website Creation Process

## Overview

This document defines the 6-phase pipeline for AI-assisted website creation using MG agents. Phases are sequential gates except where noted. Content integration is part of the Design iteration loop — it is not a separate phase.

## Pipeline Phases

```
Brand Kit → Art → Design (iterative) → Build → QA → Ship
                        ▲
                  Content fills in here
                  (after layout is stable)
```

| Phase | Owner | Output | Gate |
|-------|-------|--------|------|
| Brand Kit | Art Director + Content Lead | Color tokens, typography, voice | Art Director sign-off |
| Art | Art Director (image gen MCP) | Backgrounds, textures, icons, character art, hero banners | Art Director sign-off |
| Design (iterative) | UX Designer | Figma frames with lorem ipsum and FPO assets | All three leads sign-off |
| Build | Staff Engineer | Astro/Svelte implementation from Figma source | Tests pass |
| QA | QA Engineer | Test results, accessibility audit | QA sign-off |
| Ship | Deployment Engineer | Live deployment | Deploy verified |

## AI Image Generation Rules

### What to Generate

Generate **atomic assets only**:
- Backgrounds and textures
- Icons and UI elements
- Character art
- Composed hero banners (character integrated into scene — not separate bg + character layers)

**NEVER** generate full-page website screenshots. AI models hallucinate baked-in text and layout artifacts that cannot be removed in post.

### Asset Requirements

- All generated assets must be **text-free** — text is composited in Figma or code, never embedded in the image
- Generate composed hero banners as a single asset (character + scene in one generation), not separate layers to be composited manually

### Dispatch Rules

- Dispatch image generation calls in parallel, 2 at a time, from the main context
- Never route generation through a single subagent sequentially — this serializes what should be parallel work
- MCP tools (Gemini image gen) only work from the main context. Subagents cannot call them.

### Reference Chaining

Build complex scenes iteratively using reference chaining:

```
Characters → Scenes → Compositions
```

Each generation output becomes the reference input for the next step. This preserves visual consistency across assets.

**Character fidelity prompt pattern:**
```
Using the exact characters from the reference images, [scene description]
```

## Iterative UX-First Design

### Process

1. UX Designer creates initial Figma frames using **lorem ipsum text and FPO art assets** — not real content
2. Content Writer and Staff Engineer review and give feedback on layout
3. Iterate until all reviewers are satisfied — **minimum 2 iterations required**
4. Content fills in after layout is stable and approved

### Sign-off Gate

All three must approve before Build begins:

- [ ] Art Director — visual design and brand compliance
- [ ] Engineering Lead — technical feasibility and component structure
- [ ] Content Lead — layout supports content hierarchy

### Why UX-First

A/B testing confirmed UX-first produces stronger layouts than content-first waterfall. When content drives layout decisions, visual hierarchy is constrained by what content exists rather than what serves the user.

## Tool Boundaries

| Tool | Used For | NOT Used For |
|------|----------|--------------|
| Gemini / image gen MCP | Art assets, images, textures, icons, hero banners | Page layouts, UX design, text rendering |
| Figma | Page layouts, flows, styleguides, component specs | Asset generation |
| ImageMagick / potrace | Film grain effects, SVG tracing from raster | Design decisions |
| Code (Astro / Svelte) | Build from Figma source of truth | Design exploration |

## Common Pitfalls and Fixes

| # | Pitfall | Fix |
|---|---------|-----|
| 1 | Generating full-page website screenshots with AI | Generate atomic assets only — never full-page layouts |
| 2 | Text baked into generated images | All assets must be text-free; composite text in Figma or code |
| 3 | Routing image generation through a subagent | Dispatch from main context only — MCP tools are not available to subagents |
| 4 | Generating character and background as separate layers then compositing | Generate composed hero banners as a single asset (character integrated into scene) |
| 5 | Starting Design phase with real content | Use lorem ipsum and FPO assets until layout is approved — content fills in after |
| 6 | Skipping the reference chain for multi-asset sets | Always chain: characters first, then scenes, then compositions — each output is the next reference |
| 7 | Building from Figma before all three leads sign off | Enforce the Design sign-off gate — Art Director, Engineering Lead, and Content Lead must all approve |

## Figma MCP Limitations

The Figma plugin API runs in a sandboxed environment. Three constraints apply:

**No filesystem access**
The plugin sandbox has no access to the local filesystem. Upload images to the Figma Assets page first, then reference them by asset ID from the plugin.

**Page navigation**
Use `figma.setCurrentPageAsync()` to switch pages. The synchronous assignment `figma.currentPage = ...` does not work in the plugin API.

**Font loading**
Fonts must be explicitly loaded before use:
```js
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
```
Text nodes will throw if the font is not loaded first.
