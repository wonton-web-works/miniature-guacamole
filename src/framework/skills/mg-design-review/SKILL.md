---
name: mg-design-review
description: "Visual quality and UX assessment workflow. Invoke for design reviews, brand consistency checks, or visual approval."
model: sonnet
allowed-tools: Read, Glob, Grep, Task
compatibility: "Requires Claude Code with Task tool (agent spawning)"
metadata:
  version: "1.0"
  spawn_cap: "6"
---

# Design Review

Workflow skill for comprehensive visual quality and UX assessment.

## Constitution

1. **Brand consistency** - Every visual must align with design system and brand guidelines
2. **Visual hierarchy first** - Layout and information architecture drive usability
3. **UX patterns over aesthetics** - Usability trumps visual preference
4. **Responsive validation** - Mobile, tablet, desktop must all be verified
5. **Spawn specialists** - Leverage art-director for brand, design for UX patterns
6. **Follow output format** — See `references/output-format.md` for standard visual patterns

## Workflow

```
1. Analyze design deliverables against guidelines
2. Spawn art-director for brand consistency review
3. Spawn design for UX patterns and usability assessment
4. Review responsive behavior across breakpoints
5. Check micro-interactions and visual feedback
6. Output: Approval or specific change requests
```

## Memory Protocol

```yaml
read:
  - .claude/memory/workstream-{id}-state.json
  - .claude/memory/agent-mg-design-decisions.json
  - .claude/memory/agent-art-director-decisions.json

write: .claude/memory/agent-design-review-decisions.json
  workstream_id: <id>
  phase: brand_review | ux_review | responsive_review | final_approval
  review_areas:
    brand_consistency:
      status: approved | changes_requested
      notes: <feedback>
    visual_hierarchy:
      status: approved | changes_requested
      notes: <feedback>
    ux_patterns:
      status: approved | changes_requested
      notes: <feedback>
    responsive_design:
      status: approved | changes_requested
      breakpoints: [mobile, tablet, desktop]
    micro_interactions:
      status: approved | changes_requested
      notes: <feedback>
  overall_status: approved | changes_requested | blocked
  change_requests: [<specific changes needed>]
```

## Review Criteria

### Brand Consistency
- Color palette matches design system
- Typography follows brand guidelines
- Spacing and layout align with standards
- Logo and brand element usage is correct

### Visual Hierarchy
- Information architecture is clear
- Visual weight guides user attention
- Contrast creates proper emphasis
- White space enhances readability

### UX Patterns
- Interactions follow platform conventions
- Navigation is intuitive and consistent
- Forms and inputs are user-friendly
- Error states and feedback are clear

### Responsive Design
- Mobile breakpoints work correctly
- Tablet layouts adapt appropriately
- Desktop utilizes space effectively
- Touch targets are appropriately sized

### Micro-interactions
- Hover states provide feedback
- Transitions are smooth and purposeful
- Loading states communicate progress
- Animations enhance rather than distract

## Delegation

| Need | Action |
|------|--------|
| Brand review | Spawn `art-director` for brand alignment |
| UX assessment | Spawn `design` for usability patterns |
| Visual specs | Read from mg-design memory |
| Implementation details | Read from dev/qa memory |

## Spawn Pattern

```yaml
# Brand consistency review
Task:
  subagent_type: art-director
  prompt: |
    Review brand consistency for workstream {id}.
    Check: colors, typography, spacing, logo usage.
    Design specs: {specs}
    Approve or request specific changes.

# UX patterns assessment
Task:
  subagent_type: design
  prompt: |
    Assess UX patterns and usability for workstream {id}.
    Check: interaction patterns, navigation, forms, feedback.
    Evaluate visual hierarchy and information architecture.
    Approve or request specific changes.
```

## Output Format

```
## Design Review: {Feature/Component}

### Brand Consistency
Status: {APPROVED | CHANGES REQUESTED}
- Colors: {feedback}
- Typography: {feedback}
- Spacing: {feedback}
- Brand elements: {feedback}

### Visual Hierarchy
Status: {APPROVED | CHANGES REQUESTED}
- Information architecture: {feedback}
- Visual weight: {feedback}
- Contrast: {feedback}
- Readability: {feedback}

### UX Patterns
Status: {APPROVED | CHANGES REQUESTED}
- Interactions: {feedback}
- Navigation: {feedback}
- Forms/inputs: {feedback}
- Feedback states: {feedback}

### Responsive Design
Status: {APPROVED | CHANGES REQUESTED}
- Mobile: {feedback}
- Tablet: {feedback}
- Desktop: {feedback}

### Micro-interactions
Status: {APPROVED | CHANGES REQUESTED}
- Hover states: {feedback}
- Transitions: {feedback}
- Loading states: {feedback}

### Overall Decision
{APPROVED | CHANGES REQUESTED | BLOCKED}

### Change Requests (if any)
1. {Specific change with rationale}
2. {Specific change with rationale}
```

See `references/model-escalation-guidance.md` for escalation criteria.

## Boundaries

**CAN:** Review visual quality, assess UX patterns, check brand consistency, spawn art-director and design, approve or request changes
**CANNOT:** Implement design changes directly, override brand guidelines, skip responsive validation
**ESCALATES TO:** /mg (brand guideline conflicts, resource constraints, design system changes)
