# Visual Formatting Standards

All agent output follows the compact terminal format. Output is scannable by design — one line per event, no ASCII boxes, no markdown decoration.

## Line Format

```
[ROLE]  Status message                          elapsed
```

Every output line has three parts:

**Prefix** — `[ROLE]` where ROLE is the agent abbreviation. The bracket + content is always 6 chars wide, left-padded with spaces:

```
[EM]    (4 chars + 2 spaces)
[DEV]   (5 chars + 1 space)
[GATE]  (6 chars, no pad needed)
[CEO]   (5 chars + 1 space)
[CTO]   (5 chars + 1 space)
[QA]    (4 chars + 2 spaces)
[SE]    (4 chars + 2 spaces)
[ED]    (4 chars + 2 spaces)
[PO]    (4 chars + 2 spaces)
[TIDY]  (6 chars, no pad needed)
```

**Two spaces** after the closing bracket before the status message.

**Status message** — Verb + detail, single line, no markdown. Use em dash (—) to separate clauses. Max ~60 chars.

**Timing** — Right-aligned to the terminal width. Format: `Xs` for under 60 seconds, `Xm Ys` for 60 seconds or more. Omit for instant operations.

## Structure Rules

- Blank line between major phases. No horizontal rules, no ASCII boxes.
- Completion: `[ROLE]  Done` with total elapsed time.
- Error/blocked: `[ROLE]  BLOCKED — reason` in place of Done.
- Errors always appear regardless of output mode — they are never suppressed.

## ANSI Color Codes

Each prefix renders in a brand color. Reset after each prefix with `\033[0m`.

```
[EM]    #4A7C59  guac green    \033[38;2;74;124;89m
[CTO]   #2E6E8E  slate blue    \033[38;2;46;110;142m
[CEO]   #8A9BB0  silver        \033[38;2;138;155;176m
[PO]    #8B4A2E  burnt sienna  \033[38;2;139;74;46m
[QA]    #7A5C8B  muted plum    \033[38;2;122;92;139m
[SE]    #3D5A6B  deep slate    \033[38;2;61;90;107m
[DEV]   #E8E8E8  text white    \033[38;2;232;232;232m
[GATE]  #4A7C59  guac green    \033[38;2;74;124;89m
[TIDY]  #4A7C59  guac green    \033[38;2;74;124;89m
[ED]    #4A7C59  guac green    \033[38;2;74;124;89m
```

Fallback: when color is not available, prefixes remain readable as plain `[EM]`, `[DEV]`, etc. Respect `NO_COLOR` env and `prefers-reduced-motion` where applicable to the rendering context.

## Examples

**MECHANICAL /mg-build:**
```
[EM]    Classifying... MECHANICAL                  0.2s
[DEV]   Writing tests — 12 specs                   4.1s
[DEV]   Implementing — all tests passing          18.7s
[GATE]  Coverage 99.4% ✓  Lines 142 ✓              0.3s
[EM]    Done                                      23.3s
```

**ARCHITECTURAL /mg-build:**
```
[EM]    Classifying... ARCHITECTURAL               0.3s

[CEO]   Strategic fit — approved
[CTO]   Technical approach — approved
[ED]    Resources allocated — 2 workstreams         8.2s

[QA]    Writing tests — 24 specs                   6.4s
[DEV]   Implementing — all tests passing          34.1s
[QA]    Verification — coverage 99.1%               3.2s

[SE]    Code review — approved                    12.0s

[CEO]   Final review — APPROVED                    5.1s
[EM]    Done                                    1m 09s
```

**LEADERSHIP /mg-leadership-team:**
```
[CEO]   Business alignment — PASS
[CTO]   Technical quality — PASS
[ED]    Operational readiness — PASS                6.4s
[EM]    Decision: APPROVED                          6.4s
```

**TIDY /mg-tidy:**
```
[TIDY]  Preflight — gh authenticated ✓
[TIDY]  Audit — 28 open issues, 0 duplicates
[TIDY]  Memory — 6 state files, 0 orphaned
[TIDY]  Done — state is clean                      2.1s
```

**Error:**
```
[DEV]   BLOCKED — test suite missing entry point
```
