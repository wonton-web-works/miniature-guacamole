# Shared Output Format

Standard output patterns for all product development team skills to ensure consistent, predictable visual output.

## Overview

This document defines the visual structure and presentation patterns used across all skills in the product development team. Following these standards ensures:

- Consistent user experience across different skill interactions
- Predictable output structure for downstream tooling
- Clear communication of status, decisions, and next actions
- Maintainable templates that can evolve as team needs change

## Output Mode Flag

All skills support an `output_mode` parameter controlling terminal verbosity:

| Mode | Behavior | When to use |
|------|----------|-------------|
| `compact` | Single-line per event, no ASCII art (default) | Normal runs, bypass mode, long jobs |
| `verbose` | Full banners, ASCII art, status boxes | Verbose/debug sessions, explicit request |

To request verbose mode, include "verbose" or `output_mode: verbose` in your invocation. Unknown values default to compact. Verbose mode definitions are in `../shared/visual-formatting.md`.

## Standard Sections

All skill outputs should include these core sections where applicable:

### Header
- Clear skill name and context (workstream ID, feature name, etc.)
- Status indicator (APPROVED, REQUEST CHANGES, IN PROGRESS, etc.)

### Assessment/Analysis
- Structured evaluation criteria
- Pass/fail gates or checkboxes
- Evidence-based findings

### Findings/Results
- Organized by severity or category
- Specific, actionable items
- File paths and line numbers where relevant

### Decision
- Clear outcome statement
- Rationale for the decision
- Any conditions or caveats

### Next Action
- Explicit next step
- Recommended skill to invoke or action to take
- Any blockers that need resolution

## Visual Structure Patterns

### Use Markdown Formatting Consistently

```markdown
## Main Heading (H2)
### Subsection (H3)
#### Details (H4)

- Bullet points for lists
- [x] Checkboxes for gates/criteria
- **Bold** for emphasis on key terms
- `code` for file paths, commands, technical terms
```

### Status Indicators

Use clear, scannable status markers:
- `APPROVED` / `REQUEST CHANGES` / `NEEDS CLARIFICATION`
- `[x]` / `[ ]` for gates and checklists
- `pass` / `fail` for individual criteria
- `✓` / `×` sparingly for visual clarity (avoid emoji overuse)

### Structure Templates

Use code blocks to show structure, tables for comparisons:

```markdown
### Quality Gates
- [x] Code standards: pass
- [x] Test coverage >= 99%: pass
- [ ] Performance review: pending

### Delegation Table
| Need | Action |
|------|--------|
| Security review | Spawn `mg-security-review` |
| Implementation | Invoke `/mg-build` |
```

## Skill Type Specific Guidance

### Team Skills (mg-leadership-team, mg-build, mg-spec, mg-design, mg-document, mg-write)

**Pattern**: Strategic assessment → Decision → Delegation

```markdown
## {Skill} Review: {Context}

### Assessment
- **{Role 1}**: {perspective and decision}
- **{Role 2}**: {perspective and decision}

### Decision
{APPROVED | NEEDS CLARIFICATION | REQUEST CHANGES}

### Next Action
{Recommended skill or action}
```

### Review Skills (mg-security-review, mg-accessibility-review, mg-design-review, mg-code-review)

**Pattern**: Quality gates → Findings by severity → Recommendations

```markdown
## {Review Type}: {Feature/Module}

### Review Status: [APPROVED | REQUEST CHANGES]

### Quality Gates
- [x] {Criterion 1}: {pass/fail}
- [x] {Criterion 2}: {pass/fail}

### Findings

#### Critical
{Issues requiring immediate fix}

#### Major
{Issues that should be addressed}

#### Minor
{Suggestions for improvement}

### Recommendations
{Specific actions}

### Next Action
{Next step or skill to invoke}
```

### Assessment Skills (mg-assess, mg-assess-tech)

**Pattern**: Analysis → Risk evaluation → Recommendation

```markdown
## {Assessment Type}: {Feature/Initiative}

### Analysis
{Structured evaluation of the request}

### Risks & Considerations
- **{Category}**: {details}

### Recommendation
{GO | NO-GO | NEEDS CLARIFICATION}

### Proposed Workstreams (if GO)
- WS-{id}: {name} - {acceptance criteria}

### Next Action
{Recommended next step}
```

### Implementation Skills (mg-build)

**Pattern**: Progress tracking → Status → Blockers → Next action

See [Output Mode Flag](#output-mode-flag) section above. mg-build defaults to compact.

**Status replacement:** Status and progress output uses replacement, not append. Each status update overwrites the prior one — intermediate states are not retained as permanent output. Final build output is a single summary section, not a timeline of intermediate states. See `../shared/visual-formatting.md` for the full replacement rule. Replacement applies to status/progress/dashboard output only — deliverables, findings, decisions, and next action sections are not replaced.

```markdown
## Workstream {id}: {name}

### CAD Cycle Progress
- [x] Step 1: Tests written
- [x] Step 2: Code implemented
- [ ] Step 3: Verification
- [ ] Step 4: Code review

### Current Status
Phase: {phase}
Gate: {gate_status}
Tests: {passing}/{total}
Coverage: {percent}%

### Blocker
{Description or "None"}

### Next Action
{Spawn next agent or escalate}
```

## Examples

### Example: Team Skill Output (mg-leadership-team)

```markdown
## Executive Review: User Authentication Feature

### Strategic Assessment
- **CEO (Business)**: High value - enables enterprise sales tier. ROI positive.
- **CTO (Technical)**: Standard OAuth2 implementation, low technical risk, aligns with security standards.
- **Eng Dir (Operations)**: Team has capacity. Estimate: 3 workstreams, 2 weeks.

### Decision
APPROVED FOR DEVELOPMENT

### Workstreams
- WS-101: OAuth2 provider integration - All providers configured and tested
- WS-102: Session management - Secure session handling with refresh tokens
- WS-103: Admin user management UI - Full CRUD for user accounts

### Next Action
Recommend `/mg-build` to execute workstreams
```

### Example: Review Skill Output (mg-security-review)

```markdown
## Security Review: Payment Processing Module

### Review Status: REQUEST CHANGES

### Quality Gates
- [x] OWASP compliance: fail
- [x] Input validation: pass
- [x] Authentication/Authorization: pass
- [x] Secrets management: fail

### Findings

#### Critical
1. **Secrets in code** (src/payment/stripe.ts:15)
   - API keys hardcoded in source
   - Recommendation: Move to environment variables, use secrets manager

#### Major
2. **SQL injection risk** (src/payment/queries.ts:42)
   - String concatenation in query construction
   - Recommendation: Use parameterized queries

### Recommendations
1. Immediate: Remove hardcoded secrets, rotate all exposed keys
2. Before merge: Implement parameterized queries
3. Before production: Add security audit logging

### Next Action
Return to dev for fixes, re-review after changes applied
```

### Example: Assessment Skill Output (mg-assess)

```markdown
## Feature Assessment: Real-time Collaboration

### Analysis
**Scope**: Add real-time co-editing to document editor
**User Value**: High - top requested feature (47% of surveys)
**Complexity**: High - requires WebSocket infrastructure, CRDT implementation
**Dependencies**: Infrastructure team for WebSocket service

### Risks & Considerations
- **Technical**: CRDT complexity, conflict resolution edge cases
- **Operational**: New infrastructure to maintain, monitoring requirements
- **Timeline**: 6-8 weeks estimated, blocks other roadmap items

### Recommendation
GO - with phased rollout

### Proposed Workstreams
- WS-201: WebSocket service infrastructure - Service deployed and load-tested
- WS-202: CRDT implementation - Conflict-free editing operational
- WS-203: Client-side sync layer - Real-time updates <100ms latency
- WS-204: Presence indicators - User cursors and selections visible

### Next Action
Present to mg-leadership-team for strategic approval and resource allocation
```

## ASCII Visual Progress Patterns

Agents should use these ASCII patterns to show progress visually inline.

### CAD Cycle Pipeline

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  TEST   │───▶│  IMPL   │───▶│ VERIFY  │───▶│ REVIEW  │
│   ✓     │    │   ●     │    │   ○     │    │   ○     │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
   done          active        pending        pending
```

Legend: `✓` = done, `●` = active, `○` = pending, `×` = failed

### Workstream Status Dashboard

```
╔═══════════════════════════════════════════════════════════╗
║                  WORKSTREAM DASHBOARD                      ║
╠═══════════════════════════════════════════════════════════╣
║  WS-15  │ Centralized Output    │ ████████████ │ MERGED   ║
║  WS-16  │ Token Audit Log       │ ██████████░░ │ REVIEW   ║
║  WS-17  │ Visual Assets         │ ████░░░░░░░░ │ ASSESS   ║
╚═══════════════════════════════════════════════════════════╝
```

Progress bar: `█` = complete, `░` = remaining

### Agent Delegation Flow

```
           ┌──────────────┐
           │ engineering- │
           │    team      │
           └──────┬───────┘
                  │
     ┌────────────┼────────────┐
     ▼            ▼            ▼
┌────────┐  ┌────────┐  ┌────────┐
│   qa   │  │  dev   │  │ staff- │
│   ✓    │  │   ●    │  │  eng   │
└────────┘  └────────┘  └────────┘
```

### Feature Assessment Multi-Lens

```
                    ┌─────────────────┐
                    │ feature-assess  │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │ product-    │    │ product-    │    │    cto      │
   │   owner     │    │  manager    │    │             │
   │  (vision)   │    │  (scope)    │    │ (technical) │
   └─────────────┘    └─────────────┘    └─────────────┘
```

### Simple Progress Indicator

For inline progress, use:
```
Progress: [████████░░░░░░░░] 50% (Step 2/4)
```

### Status Summary Box

```
┌─────────────────────────────────────┐
│ WS-16: Token Usage Audit Log        │
├─────────────────────────────────────┤
│ Phase:    complete                  │
│ Tests:    690/690 ✓                 │
│ Coverage: 83%                       │
│ Gate:     ready_for_leadership      │
│ Blocker:  none                      │
└─────────────────────────────────────┘
```

### When to Use ASCII Visuals (verbose mode)

In verbose mode:
- **Always**: Show CAD cycle progress during `/mg-build` execution
- **Always**: Show dashboard when multiple workstreams active
- **Optional**: Show delegation flow when spawning multiple agents
- **Optional**: Show multi-lens diagram during feature assessments

In compact mode, use the single-line variants defined in the Output Mode Flag section above.

## Version History

**Version 1.3** (2026-03-04)
- Added status replacement protocol to Implementation Skills (mg-build) section
- Status/progress output replaces prior output by default; errors always accumulate
- Cross-reference to `../shared/visual-formatting.md` for full replacement rule

**Version 1.2** (2026-03-04)
- Added `output_mode` flag (compact/verbose) to all skills
- compact is the default mode — reduces per-build output from ~60 lines to ≤10 lines
- errors are always shown regardless of mode
- mg-build Implementation Skills section updated to document output_mode

**Version 1.1** (2026-02-04)
- Added ASCII visual progress patterns
- CAD cycle pipeline, workstream dashboard, delegation flows
- Status summary boxes and progress indicators

**Version 1.0** (2026-02-04)
- Initial standardization across all 12 skills
- Defined patterns for team, review, assessment, and implementation skills
- Established consistent section structure and visual patterns

**Maintenance**: This is a living document. Propose changes via workstream to ensure team alignment.
