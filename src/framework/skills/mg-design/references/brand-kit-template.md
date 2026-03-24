# Brand Kit

Use this document to define the visual and verbal identity of your product. Fill in each section with decisions specific to your brand. Every value here should be deliberate — colors chosen for contrast rationale, typography chosen for readability and personality, voice defined by what your users expect to hear.

---

## Color Tokens

Define each color with a hex value and a semantic name. Semantic names describe *how* the color is used (e.g., `ink-primary`, `surface-raised`), not what it looks like (`dark-blue`). This lets you retheme without renaming.

**Palette structure to fill in:**

```
--color-primary:         #______   /* Main brand color. Use for CTAs, links, active states. */
--color-primary-hover:   #______   /* Slightly darker or lighter. Indicates interactivity. */
--color-accent:          #______   /* Secondary brand color. Sparingly — highlights, badges. */

--color-surface-base:    #______   /* Page/app background. Usually near-white or near-black. */
--color-surface-raised:  #______   /* Cards, modals, dropdowns. 1 step above surface-base. */
--color-surface-sunken:  #______   /* Input fields, code blocks. 1 step below surface-base. */

--color-ink-primary:     #______   /* Body text. Must meet WCAG AA on surface-base. */
--color-ink-secondary:   #______   /* Captions, metadata, placeholders. */
--color-ink-disabled:    #______   /* Disabled controls. May fall below AA — never interactive. */

--color-border:          #______   /* Default border/divider color. */
--color-border-focus:    #______   /* Focus rings. Must be distinct from surface-base. */

--color-feedback-success: #______  /* e.g., #22c55e — confirmed actions, form success states. */
--color-feedback-warning: #______  /* e.g., #f59e0b — degraded state, non-blocking issues. */
--color-feedback-error:   #______  /* e.g., #ef4444 — destructive actions, validation failures. */
--color-feedback-info:    #______  /* e.g., #3b82f6 — neutral informational banners. */
```

**WCAG contrast requirements (non-negotiable):**

- Normal text (< 18px / 14px bold): minimum contrast ratio 4.5:1 against its background
- Large text (>= 18px regular or 14px bold): minimum contrast ratio 3:1
- UI components (borders, icons): minimum contrast ratio 3:1
- Use a tool like [https://webaim.org/resources/contrastchecker/](https://webaim.org/resources/contrastchecker/) to verify every `ink` token against every `surface` token it appears on
- Aim for WCAG AA compliance on all text; target AAA for body copy where feasible

**Design rationale to document for each color:**

- Why this hue? (personality, industry conventions, cultural associations)
- What emotional response is intended?
- Which accessibility level does it achieve on which surfaces?

---

## Typography

Define the font stack, size scale, and weight assignments. Typography decisions should hold up at every viewport width and serve both readability and brand personality.

**Font stack:**

```
Font family (primary):    ________  /* Used for headings. Describe personality: e.g., geometric sans-serif, warm humanist. */
Font family (body):       ________  /* Used for body copy, UI labels. Prioritize legibility over flair. */
Font family (mono):       ________  /* Used for code, technical values, data tables. */

Fallback stack (primary): ________,  system-ui, -apple-system, sans-serif
Fallback stack (body):    ________,  system-ui, -apple-system, sans-serif
Fallback stack (mono):    ________,  ui-monospace, 'Courier New', monospace
```

**Size scale (rem-based for accessibility — user font-size settings apply):**

```
--text-xs:   0.75rem   /* 12px — labels, fine print, timestamps */
--text-sm:   0.875rem  /* 14px — secondary body, captions, metadata */
--text-base: 1rem      /* 16px — primary body copy */
--text-lg:   1.125rem  /* 18px — lead paragraphs, emphasized body */
--text-xl:   1.25rem   /* 20px — section subheadings */
--text-2xl:  1.5rem    /* 24px — feature headings */
--text-3xl:  1.875rem  /* 30px — page titles */
--text-4xl:  2.25rem   /* 36px — hero headings */
```

Avoid pixel-only sizing. Use rem so users who increase their base font size get proportional scaling.

**Weight assignments:**

```
--font-weight-regular: 400   /* Body copy */
--font-weight-medium:  500   /* UI labels, navigation, emphasized body */
--font-weight-semibold: 600  /* Subheadings, card titles */
--font-weight-bold:    700   /* Headings, CTAs */
```

**Line height:**

```
--leading-tight:   1.25   /* Headings */
--leading-snug:    1.375  /* Subheadings, short copy */
--leading-normal:  1.5    /* Body copy — minimum for accessibility */
--leading-relaxed: 1.625  /* Long-form reading, articles */
```

Minimum line height of 1.5 for body copy is a WCAG 1.4.8 recommendation.

---

## Voice and Tone

Voice is who your product is. Tone is how it adjusts to context. Define both here.

**Brand voice (fill in for your product):**

Describe your brand in 3–5 adjectives, then explain what each means in practice:

```
Adjective 1: __________
  In practice: __________ (e.g., "We use short sentences and plain language, not jargon")

Adjective 2: __________
  In practice: __________

Adjective 3: __________
  In practice: __________
```

**Audience:**

Describe the primary user. What do they know? What do they care about? What do they get frustrated by? Your voice should be calibrated to their expectations.

**Tone by context:**

| Context | Tone | Example |
|---------|------|---------|
| Onboarding / empty state | Encouraging, patient | "Nothing here yet — add your first item to get started." |
| Error messages | Direct, non-blaming | "We couldn't save that. Check your connection and try again." |
| Success / confirmation | Warm but brief | "Done." or "Saved." — not "Amazing! Great job!" |
| Destructive actions | Clear, serious | "Delete account? This can't be undone." — no softening language |
| Loading / waiting | Honest, calm | "Loading your data…" — not "Hang tight, doing magic!" |
| Tooltips / help text | Informative, concise | Answer the question in one sentence. No preamble. |

**Do / Don't word list:**

| Prefer | Avoid | Reason |
|--------|-------|--------|
| "Save" | "Persist" | Plain language |
| "Can't" | "Unable to" | Conversational |
| "You" | "The user" | Addresses the person directly |
| Specific error causes | "An error occurred" | Actionable |
| Active voice | Passive voice | Clearer agency |

---

## Component Patterns

Define how common UI patterns behave in this product. These are defaults — individual components can diverge with justification.

**Buttons:**

```
Primary button:
  Use for: The single most important action on a page or modal
  Color: --color-primary on --color-surface-base
  Hover: --color-primary-hover
  Focus: 2px outline, --color-border-focus, 2px offset
  Disabled: --color-ink-disabled, cursor: not-allowed, no pointer events

Secondary button:
  Use for: Alternative or lower-priority actions alongside a primary
  Appearance: Outlined or ghost — describe which and why

Destructive button:
  Use for: Actions that delete data or cannot be undone
  Color: --color-feedback-error
  Pattern: Require confirmation (modal or inline) before executing
```

**Form inputs:**

```
Default:   1px border, --color-border, --color-surface-sunken background
Focus:     2px border, --color-border-focus (replaces default border, not added to it)
Error:     1px border, --color-feedback-error; error message below field, linked with aria-describedby
Disabled:  --color-surface-sunken bg, --color-ink-disabled text, no hover state
Label:     Above the field, not placeholder-as-label. Placeholder is example input only.
```

**Navigation:**

```
Active item:    --color-primary text or left border indicator
Hover:          Subtle bg shift — --color-surface-raised on --color-surface-base
Keyboard nav:   All items reachable by Tab/arrow keys; current item has focus ring visible
Mobile:         Describe collapse behavior — hamburger, bottom bar, or drawer
```

**Feedback / alerts:**

```
Success:  --color-feedback-success bg tint; icon + message; dismissible
Warning:  --color-feedback-warning bg tint; icon + message; persists until resolved
Error:    --color-feedback-error bg tint; icon + message; always dismissible
Info:     --color-feedback-info bg tint; icon + message

All alerts: role="alert" or aria-live="polite" depending on urgency
```

**Spacing system:**

```
Base unit: 4px (0.25rem)
Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96px
       1, 2, 3,  4,  6,  8,  12, 16, 24 (multiples of base unit)

Intra-component spacing (between related elements): 4–8px
Inter-component spacing (between distinct sections): 24–48px
Page margins: min 16px on mobile, 24–48px on desktop
```

Define how the spacing scale maps to component internal padding, card padding, and section gutters for this specific product.

---

## JSON Output Files

When brand kit work is complete, generate two machine-readable JSON files alongside the human-readable `docs/brand-kit.md`. These files are stored in `.claude/memory/` and read by the art-director agent on every visual review.

**`brand-guidelines.json`** — verbal identity and high-level visual brand decisions:

```json
{
  "brand_name": "<your brand name>",
  "voice": {
    "tone": "<contextual register, e.g. 'direct and approachable'>",
    "register": "<formal | professional | conversational | casual>",
    "personality_traits": ["<adjective 1>", "<adjective 2>", "<adjective 3>"]
  },
  "terminology": {
    "preferred": ["<word to use>", "..."],
    "avoided": ["<word to avoid>", "..."]
  },
  "visual_identity": {
    "primary_colors": ["<hex>"],
    "typography": "<heading font / body font summary>",
    "logo_usage": "docs/assets/logo-usage.md"
  }
}
```

**`design-system.json`** — machine-readable design tokens, drawn from the color and typography decisions above:

```json
{
  "colors": {
    "primary": "<--color-primary hex>",
    "secondary": "<--color-secondary hex>",
    "accent": "<--color-accent hex>",
    "semantic": {
      "success": "<--color-feedback-success hex>",
      "warning": "<--color-feedback-warning hex>",
      "error": "<--color-feedback-error hex>",
      "info": "<--color-feedback-info hex>"
    }
  },
  "typography": {
    "headings": "<heading font family>",
    "body": "<body font family>",
    "mono": "<mono font family>"
  },
  "spacing": {
    "unit": "4px",
    "scale": [4, 8, 12, 16, 24, 32, 48, 64, 96]
  },
  "components": {}
}
```

Write both files to `.claude/memory/` only if they do not already exist. If they exist, update in place rather than overwriting. These files are git-ignored by `.claude/memory/.gitignore`.

---

## Wireframe Token Usage

When writing wireframe screen descriptions, reference tokens by their CSS custom property name — never use raw hex values or font names. This keeps wireframes consistent with the brand kit and immediately actionable by engineering.

**Token reference style for wireframe files:**

```
CTA Button:      background `--color-primary`  |  label `--color-surface-base`
Secondary Button: border `--color-border`       |  label `--color-ink-primary`
Page background: `--color-surface-base`
Card:            background `--color-surface-raised`  |  border `--color-border`
Body text:       `--color-ink-primary`  |  size `--text-base`
Caption / meta:  `--color-ink-secondary`  |  size `--text-sm`
Input field:     background `--color-surface-sunken`  |  border `--color-border`
Focus ring:      `--color-border-focus`
Error state:     border `--color-feedback-error`
```

Use these token names verbatim in wireframe `.md` files so engineering can map directly to the CSS variables defined above.

---
