# Thumbnail Spec — miniature-guacamole

## Technical Spec

| Property | Value |
|----------|-------|
| Dimensions | 1280 x 720 px |
| Format | JPG |
| Max file size | 2MB |
| Color space | sRGB |
| DPI | 72 (screen) |

---

## Layout

```
+--------------------------------------------------+
|  [EP #]                                          |
|                                                  |
|                                                  |
|       EPISODE TITLE                              |
|       (bold, 72-96pt)                            |
|                                                  |
|                         [CHARACTER]              |
|  [mg logo/wordmark]                              |
+--------------------------------------------------+
```

- **Top-right:** Episode number — `EP 01`, `EP 02`, etc. — Inter Mono 500, 36pt, character accent color
- **Center / center-left:** Episode title — Inter Bold 700, 72–90pt, `#E8E8E8`
- **Bottom-right:** Character illustration (the capybara for that episode type)
- **Bottom-left:** Channel wordmark — `miniature-guacamole` in Inter Mono 500, 24pt, `#8A9BB0`

---

## Colors

| Element | Value |
|---------|-------|
| Background | `#121820` (MG Dark) |
| Title text | `#E8E8E8` |
| Episode number | Character accent (see table below) |
| Accent bar / divider | Character accent |
| Wordmark | `#8A9BB0` (MG Subtext) |

---

## Character-to-Episode-Type Mapping

Which capybara appears on each thumbnail, and which accent color to use.

| Episode Type | Character | Accent Color | Hex |
|-------------|-----------|-------------|-----|
| Hook / Demo | Engineering Manager | Guac Green | `#4A7C59` |
| Tutorial | Engineering Manager | Guac Green | `#4A7C59` |
| Project Walkthrough | Engineering Manager | Guac Green | `#4A7C59` |
| Explainer / How It Works | CTO | Slate Blue | `#2E6E8E` |
| Deep Dive | Staff Engineer | Deep Slate | `#3D5A6B` |
| Community / Meta | Product Owner | Burnt Sienna | `#8B4A2E` |
| QA / Review | QA Engineer | Muted Plum | `#7A5C8B` |

**Default:** When in doubt, use EM (guac green). It's the channel's primary accent.

---

## Season 1 Episode Reference

| Episode | Title | Character | Accent |
|---------|-------|-----------|--------|
| 1 | Your Claude Code Just Became a Team | EM | `#4A7C59` |
| 2 | Install in 60 Seconds | EM | `#4A7C59` |
| 3 | The CAD Cycle | CTO | `#2E6E8E` |
| 4 | Build a Feature From Scratch | EM | `#4A7C59` |
| 5 | 19 Agents, One System | CTO | `#2E6E8E` |
| 6 | Code Review, Security, Accessibility | QA | `#7A5C8B` |
| 7 | Memory, Handoffs, and State | SE | `#3D5A6B` |
| 8 | Multi-Project Setup | SE | `#3D5A6B` |
| 9 | Debugging and Refactoring | QA | `#7A5C8B` |
| 10 | Season 1 Recap | PO | `#8B4A2E` |

---

## Canva Template Setup

### What to Lock (don't touch per episode)
- Background color (`#121820`)
- Layout grid and element positions
- Channel wordmark (bottom-left), size and color
- Safe margins (64px on all sides)
- Font families (Inter Bold, Inter Mono)

### What to Swap Per Episode
- Episode number text (top-right) — update to `EP 0X`
- Episode number color — match character accent for that episode
- Episode title text — update to actual title
- Character illustration — swap PNG to the correct capybara
- Accent bar/divider color — match character accent

### Workflow
1. Open the locked Canva template
2. Update the 5 swap elements above
3. Export as JPG, 1280x720
4. Verify file size <2MB before upload
5. Upload in YouTube Studio before scheduling

### Naming Convention
```
thumbnail-ep01-hook-demo.jpg
thumbnail-ep02-install-tutorial.jpg
thumbnail-ep03-cad-cycle.jpg
```

---

## Example: Episode 1

Title: "Your Claude Code Just Became a Team"
- Background: `#121820`
- Top-right: `EP 01` in `#4A7C59` (EM green)
- Title text: "Your Claude Code Just Became a Team" — may need to line break at "Just" to fit at 80pt
- Character: EM capybara (guac green sweater, grounded stance) — bottom-right
- Accent bar below title: `#4A7C59`
- Wordmark: `miniature-guacamole` bottom-left in `#8A9BB0`
