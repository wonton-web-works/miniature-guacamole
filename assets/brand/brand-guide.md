# miniature-guacamole Brand Guide

## The Channel in One Sentence

An AI-powered dev team for Claude Code. No hype. No face cam. Just agents doing their jobs on screen.

---

## Tone

Deadpan. Not cute. "Calm, competent, slightly absurd." The humor comes from watching a fully bureaucratic software org — with a QA who says "actually" and a CTO who raises one eyebrow — operate in a terminal window.

**Do:**
- Write like a senior engineer talking to peers
- Be comfortable with dry understatement ("this is fine")
- Let the system's behavior speak for itself — minimal editorializing

**Don't:**
- Add exclamation points to things that don't warrant them
- Use words like "exciting", "amazing", "powerful", "cutting-edge"
- Add emoji to on-screen text overlays or channel copy

---

## Color Palette

### Character Colors

These are the primary palette. Each character owns one color. Use them as accent colors in thumbnails, title cards, and overlays.

| Character | Role | Hex | Description |
|-----------|------|-----|-------------|
| Engineering Manager | EM | `#4A7C59` | Guac green — grounded, reliable |
| CTO | CTO | `#2E6E8E` | Slate blue — assertive, technical |
| Product Owner | PO | `#8B4A2E` | Burnt sienna — warm, product-minded |
| QA Engineer | QA | `#7A5C8B` | Muted plum — precise, skeptical |
| Staff Engineer | SE | `#3D5A6B` | Deep slate — measured, deliberate |
| CEO | CEO | `#2D2D2D` | Charcoal — composed, anchor |

**Note on CTO/SE proximity:** `#2E6E8E` and `#3D5A6B` are close in hue. They're acceptable for launch but will be separated in a future art pass. Don't use them side-by-side as the sole differentiator in a composition.

### Channel Accent Colors

Used for UI chrome, progress bars, dividers, and elements not owned by a specific character.

| Name | Hex | Use |
|------|-----|-----|
| MG Primary | `#4A7C59` | Default channel accent (EM green — the brand lead) |
| MG Dark | `#121820` | Background for thumbnails, title cards, terminal |
| MG Surface | `#1E2A38` | Secondary background, card surfaces |
| MG Text | `#E8E8E8` | Primary text on dark backgrounds |
| MG Subtext | `#8A9BB0` | Secondary text, labels, timestamps |

---

## Typography

### Thumbnails and Title Cards

- **Primary font:** Inter Bold or Geist Bold (Google Fonts, free)
  - Use for episode titles, the big readable line at center or center-left
  - Weight: 700–800
  - Size: 72–96pt at 1280x720, depending on title length
- **Episode number / label:** Inter Mono or JetBrains Mono, weight 500
  - Top-right corner, 36–48pt
  - Color: character accent for that episode

### Screen Recording Overlays

- **Code / terminal font:** JetBrains Mono or Fira Code, 16px minimum
  - This is what viewers see in the terminal during recordings
  - Ligatures: on or off depending on personal preference — be consistent across the season
- **Callout overlays:** Inter Medium, 18–22pt, white text on `#121820` at 85% opacity

### Social Copy

- No custom fonts — these are plain text fields. Write for the platform's default rendering.

---

## Terminal Theme

For screen recordings: use the `coding-capybaras` iTerm2/terminal theme defined in `assets/brand/terminal-theme.json`.

Target spec:
- Background: `#121820` (matches MG Dark)
- Foreground: `#E8E8E8` (matches MG Text)
- High contrast, no transparency
- Accent: `#4A7C59` (MG Primary / EM green) for prompts and highlights

Full spec in `terminal-theme.json`.

---

## Character Roster

Which agent narrates what type of content.

| Character | Narrates | Rationale |
|-----------|----------|-----------|
| Engineering Manager (EM) | Default narration, tutorials, CAD cycle walkthroughs | EM is the "us" voice — grounded, process-aware, explains things clearly |
| CTO | Architecture episodes, agent hierarchy explainers | CTO frames the "why" — system design decisions, technical tradeoffs |
| QA | Review episodes, debugging, "here's what's wrong" moments | QA's skepticism is useful when the channel needs to call something out |
| Staff Engineer | Deep dives, internals, memory/handoff architecture | SE is the one who actually knows where the bodies are buried |
| Product Owner | Community/meta episodes, roadmap, "what's coming" | PO represents the viewer's priorities |
| CEO | Season openers/closers, major announcements | CEO provides the framing — the 30,000-foot view |

For narration that doesn't fit a specific character: default to EM.

---

## Channel Description Copy

**YouTube Studio About field (use verbatim):**

```
The AI-powered dev team for Claude Code.

20 agents. 16 skills. One command to run the whole thing.

miniature-guacamole turns Claude Code into a complete product development team — Engineering Manager, CTO, QA, Staff Engineer, and more. Every agent has a defined role. Memory is project-local. No hallway meetings.

Install: curl -fsSL https://raw.githubusercontent.com/wonton-web-works/miniature-guacamole/main/install.sh | bash

GitHub: https://github.com/wonton-web-works/miniature-guacamole
Discord: [discord invite link]
```

Character count: ~480. Well within YouTube's 1000-char limit.

---

## Social Bio Copy

**GitHub org bio (160 chars max):**
```
AI-powered dev team for Claude Code. 20 agents, 16 skills, project-local memory. miniature-guacamole.
```
(101 chars)

**Twitter/X bio (160 chars max):**
```
AI dev team for Claude Code. 20 agents, 16 skills. Deadpan. NDA-safe. Open source.
```
(83 chars)

**LinkedIn / generic (no char limit):**
```
miniature-guacamole is an open-source framework that turns Claude Code into a complete product development team. 19 specialized agents, 16 collaborative skills, project-local memory. Built for developers who want their AI to behave like a real team, not a chat window.
```
