# PrivateEnterprise — AI Generation Tool Matrix
### Design Decision Document | Art Director | March 2026

---

## The One-Sentence Policy

We use the best tool for each job, not the most convenient ecosystem. Google AI Ultra pays for itself on video; Midjourney is still the best illustrator we have access to; and Flux is the only image model controllable enough to serve as a code-driven pipeline component.

---

## Use Case Matrix

### 1. Episode Thumbnails (YouTube — Coding Capybaras)

| | Tool |
|---|---|
| **Primary** | Midjourney v7 |
| **Fallback** | Imagen 4 |
| **Mode** | Manual |

**Why:** Thumbnails require character consistency, stylized illustration quality, and deliberate composition — Midjourney v7's style reference and character reference workflows give us iterative control that no other model matches at this quality level. Imagen 4 is the fallback when we need photorealistic prop renders composited into a Midjourney layout.

---

### 2. Terminal Animation Sequences (Marketing Site Hero)

| | Tool |
|---|---|
| **Primary** | Flux (self-hosted via Replicate or local) |
| **Fallback** | Nano Banana 2 (gemini-3.1-flash-image-preview) |
| **Mode** | MCP (automated) |

**Why:** The hero terminal animation is a code-driven asset — it needs frame-level control, deterministic output from seed, and the ability to batch-generate variations programmatically. Flux is the only model that behaves like a controllable renderer rather than a creative oracle.

**Critical constraint:** The terminal animation is the site's single most important visual. No model should generate the copy; copy is authored separately and composited. The models generate the surrounding visual texture (CRT scanlines, terminal chrome, ambient glow).

---

### 3. OG Images / Social Cards (Docs, Blog, Changelog)

| | Tool |
|---|---|
| **Primary** | Imagen 4 |
| **Fallback** | Nano Banana 2 |
| **Mode** | MCP (automated) |

**Why:** OG images are high-volume, low-stakes, and need consistent prompt-following — Imagen 4 hits the photorealism/reliability balance that makes batch automation viable.

**Template constraint:** OG images follow a locked template: dark #121820 background, Avocado Chip logo top-left, Inter 800 headline, JetBrains Mono subtext. Generation only fills the background texture or illustration element in the center third. Typography is composited in code, never generated.

---

### 4. Brand Illustrations (Capybara Mascot, Icons, Diagrams)

| | Tool |
|---|---|
| **Primary** | Midjourney v7 |
| **Fallback** | Nano Banana Pro (gemini-3-pro-image-preview) |
| **Mode** | Manual |

**Why:** Character consistency across 6 capybara agents is a hard requirement, and Midjourney's style reference (`--sref`) and character reference (`--cref`) workflows are the current industry best for maintaining a consistent illustrated character across hundreds of assets.

---

### 5. Video Intros / Outros (Coding Capybaras Episodes)

| | Tool |
|---|---|
| **Primary** | Veo 3.1 Quality |
| **Fallback** | Runway Gen-4 |
| **Mode** | Manual (hero assets); MCP for batch b-roll |

**Why:** Veo 3.1 Quality outputs 4K with native audio — the only model that delivers a complete broadcast-ready asset without a separate audio pass. Veo 3.1 Fast is the MCP-accessible version for b-roll and filler cuts in bulk.

---

### 6. Product Screenshots / Mockups (Marketing Site)

| | Tool |
|---|---|
| **Primary** | Imagen 4 |
| **Fallback** | DALL-E 3 |
| **Mode** | MCP (automated) |

**Why:** Product mockups require photorealistic material rendering where Imagen 4 outperforms every other model at faithful prompt execution.

---

### 7. Documentation Diagrams (Technical Architecture Visuals)

| | Tool |
|---|---|
| **Primary** | Nano Banana (gemini-2.5-flash-image) |
| **Fallback** | Nano Banana 2 |
| **Mode** | MCP (automated) |

**Why:** Documentation diagrams are the lowest-glamour asset class — they need to be clear, consistent with the brand palette, and generated fast at zero marginal cost. Nano Banana's free tier covers this entire category.

**Hard rule:** No diagram ships with generated typography. All labels are composited in code using JetBrains Mono.

---

## MCP vs. Manual Summary

| Mode | Tools | Rationale |
|---|---|---|
| **MCP (agent-automated)** | Nano Banana, Nano Banana 2, Imagen 4, Veo 3.1 Fast, Flux (via Replicate API) | Programmatic, batch-safe, API-first |
| **Manual (human in loop)** | Midjourney v7, Veo 3.1 Quality, Google Flow | Require creative iteration, reference workflows, or web-only UI |

## Excluded Tools

- **Google Flow** — No public API. Useful for Veo pre-production storyboarding only.
- **Sora** — No API surface competitive with Veo 3.1 given our Google AI Ultra credit pool.
- **Kling 2.0** — Strong results but adds a third video vendor with no clear quality advantage.
- **Stable Diffusion 3.5 / SDXL** — Mockup fidelity requires fine-tuned LoRAs we don't have time to maintain.

## Model Reference

| Friendly Name | Model ID | Type | Tier |
|--------------|----------|------|------|
| Nano Banana | gemini-2.5-flash-image | Image (fast) | Free |
| Nano Banana 2 | gemini-3.1-flash-image-preview | Image (balanced) | Free |
| Nano Banana Pro | gemini-3-pro-image-preview | Image (pro) | AI Ultra |
| Imagen 4 | imagen-3.0-generate-002 | Image (photorealistic) | API |
| Veo 3.1 Fast | veo-3.1-fast-generate-001 | Video (fast) | AI Pro/Ultra |
| Veo 3.1 Quality | veo-3.1-generate-001 | Video (4K) | AI Ultra |

## Tool Acquisition Checklist

- [ ] Gemini API key with Imagen 4 and Veo 3.1 access under Google AI Ultra
- [ ] MCP server configured for Nano Banana / Imagen 4 / Veo 3.1 Fast
- [ ] Midjourney v7 subscription active with shared style reference sheet
- [ ] Flux available via Replicate API or local Docker container
- [ ] Google Flow account created for pre-production storyboarding (manual only)

---

*Art Director sign-off: approved. Route to design team for implementation.*
