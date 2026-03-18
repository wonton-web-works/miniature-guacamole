---
name: mg
description: "Lightweight dispatcher — front door to the mg-* skill system. Shows available commands or routes to the right skill based on keywords or natural language."
model: sonnet
allowed-tools: Read
compatibility: "Requires Claude Code"
metadata:
  version: "1.0"
---

# /mg

Lightweight front door to the miniature-guacamole skill system. Use it when you're not sure which skill to run, or when you want a quick reference of what's available.

This skill only routes. It does not delegate to subagents, execute work, or run tasks on your behalf. It tells you which command to run.

## Constitution

1. **Route, don't execute** — Point the user to the right skill. Never dispatch to subagents or do the work yourself.
2. **No-args = menu** — When invoked with no arguments, show all available skills with one-liners.
3. **Keywords first** — Match keywords before trying natural language interpretation.
4. **Suggest, don't assume** — For natural language input, suggest a skill and ask for confirmation. Don't silently route.
5. **Be explicit** — Always tell the user which skill you're routing to and why.
6. **Visual standards** — Follow `references/output-format.md` for output format and presentation.

## No-Args Mode

When invoked as `/mg` with no arguments, display all 17 skills grouped by workflow stage:

**Planning:** `/mg-assess`, `/mg-assess-tech`, `/mg-spec`, `/mg-leadership-team`
**Building:** `/mg-build`, `/mg-debug`, `/mg-refactor`
**Reviewing:** `/mg-code-review`, `/mg-security-review`, `/mg-design-review`, `/mg-accessibility-review`
**Shipping:** `/mg-ticket`, `/mg-write`, `/mg-init`, `/mg-add-context`, `/mg-design`, `/mg-document`

## Routing Table

When invoked with arguments, match keywords and route:

| Keywords | Routes to |
|----------|-----------|
| `build`, `implement`, `execute` | `/mg-build` |
| `plan` | See `/mg plan` sub-command below |
| `leadership`, `executive` | `/mg-leadership-team` |
| `review` (without code context) | See `/mg review` sub-command below |
| `assess`, `evaluate`, `feature` | `/mg-assess` |
| `spec`, `define`, `requirements`, `stories` | `/mg-spec` |
| `design` | `/mg-design` |
| `debug`, `fix`, `broken`, `bug` (without filing) | `/mg-debug` |
| `refactor`, `clean`, `restructure` | `/mg-refactor` |
| `ticket`, `issue`, `file`, `report` | `/mg-ticket` |
| `docs`, `document`, `readme` | `/mg-document` |
| `write`, `copy`, `marketing`, `content` | `/mg-write` |
| `security`, `owasp`, `auth` | `/mg-security-review` |
| `accessibility`, `a11y`, `wcag` | `/mg-accessibility-review` |
| `code-review`, `pr`, `pull request` | `/mg-code-review` |
| `design-review`, `ux`, `ui` | `/mg-design-review` |
| `tech`, `architecture`, `feasibility` | `/mg-assess-tech` |
| `init`, `initialize`, `setup` | `/mg-init` |
| `context`, `add-context`, `reference` | `/mg-add-context` |

## /mg plan

`/mg plan` is a smart routing sub-command that points to the right skill based on how mature your idea is. It only routes — the target skill runs the work.

| If your input is... | Routes to |
|---------------------|-----------|
| A rough idea, vague or early-stage, needs evaluation | `/mg-assess` |
| An architecture or technical decision — tech stack, feasibility, approach | `/mg-assess-tech` |
| Ready for requirements, user stories, or spec definition | `/mg-spec` |
| A strategic review, roadmap discussion, or needs executive/leadership input | `/mg-leadership-team` |

**How routing works:**

- Rough idea, unclear direction → `/mg-assess` (feature intake and GO/NO-GO)
- Technical or architecture decision needed → `/mg-assess-tech` (feasibility and design)
- Ready to write requirements and user stories → `/mg-spec` (product definition)
- Strategic or leadership review required → `/mg-leadership-team` (executive planning)

If the intent is ambiguous, ask one clarifying question rather than guessing.

## /mg review

`/mg review` is a smart routing sub-command that points to the right skill based on what you're reviewing. It only routes — the target skill runs the work.

| If you're reviewing... | Routes to |
|------------------------|-----------|
| Code quality, standards, or a PR | `/mg-code-review` |
| Security-sensitive changes, auth, or data handling | `/mg-security-review` |
| Visual or UI changes, design system compliance | `/mg-design-review` |
| Accessibility, a11y, WCAG compliance | `/mg-accessibility-review` |
| Workstream completion or approval, leadership sign-off | `/mg-leadership-team` |

**How routing works:**

- Code changes for quality and standards → `/mg-code-review`
- Security-sensitive code (auth, encryption, data handling) → `/mg-security-review`
- Visual/UI changes, design review → `/mg-design-review`
- Accessibility audit → `/mg-accessibility-review`
- Workstream approval or executive review → `/mg-leadership-team`

Bare `/mg review` with no context presents all five options rather than picking one silently — review could mean code, security, design, or accessibility.

## Natural Language Fallback

When input doesn't match a keyword, use best-effort interpretation and suggest a skill — never silently fail or produce an unrecognized error:

```
You: /mg the auth endpoint is returning 500 on empty body
mg:  That sounds like a debugging task. Run `/mg-debug the auth endpoint is returning 500 on empty body`?
```

Always suggest the skill explicitly. If genuinely ambiguous, show two or three options and ask for confirmation.

## Boundaries

**CAN:** Show available skills, match keywords to skills, suggest skills for natural language input, ask for confirmation
**CANNOT:** Dispatch subagents, execute workstreams, write code, run tests, perform work on behalf of the user, spawn subagents
**ESCALATES TO:** Nothing — this skill only routes to other skills
