---
name: mg-assess
description: "Feature intake and evaluation workflow. Invoke for raw feature ideas, structured requests, or formal assessments."
model: sonnet
allowed-tools: Read, Glob, Grep, Task
compatibility: "Requires Claude Code with Task tool (agent spawning)"
metadata:
  version: "1.0"
  spawn_cap: "6"
---

> Inherits: [skill-base](../_base/skill-base.md)

# Feature Assessment

Unified workflow for feature intake and evaluation. Handles everything from rough feature ideas to fully structured requests through a single front door, then evaluates scope, feasibility, and value through structured multi-lens conversation.

## Constitution

1. **Structure before evaluate** - Help users articulate rough ideas before assessing them
2. **Ask before assuming** - Clarify requirements through dialogue
3. **Three dimensions** - Evaluate scope, feasibility, and value
4. **Risk-aware** - Identify dependencies and blockers early
5. **Actionable outcomes** - Every assessment ends with clear next steps

## Workflow

```
Phase 0: Intake Detection & Structuring
  - Auto-detect: rough idea vs semi-structured vs structured request
  - If rough: facilitated intake --> structured brief
  - If semi-structured: brief intake to fill gaps --> structured brief
  - If structured: skip to Phase 1

Phase 1: Discovery (ask clarifying questions)
Phase 2: Multi-lens Evaluation (PO, PM, CTO perspectives)
Phase 3: Synthesis (scope, criteria, effort, recommendation)
Phase 4: Hand off (GO/NO-GO/NEEDS MORE INFO)
```

## Intake Flow

```
               +--------------------+
               |    mg-assess       |
               +---------+----------+
                         |
                 +-------+-------+
                 |  Detect Mode  |
                 +---+-------+---+
             rough   |       |   structured
                     v       v
             +----------+  +----------+
             | INTAKE   |  | EVALUATE |
             | Phase 0  |  | Phase 1+ |
             +----+-----+  +----------+
                  |
                  v
             +----------+
             | EVALUATE |
             | Phase 1+ |
             +----------+
```

## Phase 0: Intake Detection & Structuring

### Auto-Detection Logic

On skill invocation, analyze the incoming request for structure signals:

| Signal | Mode | Action |
|--------|------|--------|
| Has user stories or acceptance criteria | Structured | Skip to Phase 1 |
| Has clear problem statement with users and success criteria | Semi-structured | Brief intake to fill gaps, then Phase 1 |
| Rough, vague, or exploratory idea | Rough | Full intake mode |

### Intake Mode

When the request is rough or vague, facilitate structuring through guided conversation.

**Intake prompts (ask conversationally, not as a checklist):**

1. "Tell me about this feature idea in your own words."
2. "What problem does this solve? Who experiences it?"
3. "What would success look like if we built this?"
4. "Are there any constraints -- time, technical, budget?"
5. "What happens if we don't build this?"

### Intake Output

After gathering responses, produce a structured brief before proceeding to evaluation:

```
### Structured Brief
**Problem:** {articulated problem statement}
**Users:** {who benefits}
**Success Criteria:** {what success looks like}
**Constraints:** {any limitations}
**Hypothesis:** {initial scope hypothesis}
```

This brief becomes the input to Phase 1 (Discovery).

## Phase 1: Discovery Questions

Ask the client to clarify (skip questions already answered during intake):
- What problem are we solving?
- Who are the users?
- What does success look like?
- Are there constraints (time, budget, technical)?
- What happens if we don't build this?

## Phase 2: Spawn Expert Evaluations

```yaml
# Strategic fit
Task:
  subagent_type: product-owner
  prompt: |
    Evaluate strategic fit for feature: {description}
    Context: {clarifications}
    Assess: value, priority, alignment with roadmap

# Scope breakdown
Task:
  subagent_type: product-manager
  prompt: |
    Break down feature into user stories: {description}
    Define: acceptance criteria, edge cases, BDD scenarios

# Technical feasibility
Task:
  subagent_type: cto
  prompt: |
    Assess technical feasibility: {description}
    Evaluate: architecture impact, dependencies, risks, effort
```

## Phase 3: Synthesis and Recommendation

Combine inputs to produce:
- Clear scope definition
- Acceptance criteria
- Risk and dependency analysis
- Effort estimation guidance
- Go/no-go recommendation with rationale

## Memory Protocol

```yaml
read:
  - .claude/memory/product-roadmap.json
  - .claude/memory/architecture-decisions.json
  - .claude/memory/team-capacity.json

write: .claude/memory/mg-feature-assessments.json
  feature_id: <id>
  intake_mode: true|false
  original_request: <raw user input>
  structured_brief:
    problem: <articulated problem>
    users: <affected users>
    success_criteria: <what success looks like>
    constraints: <any limitations>
    hypothesis: <initial scope idea>
  request: <original request>
  clarifications: [<questions asked and answers>]
  scope_definition:
    user_stories: [<stories>]
    acceptance_criteria: [<criteria>]
  feasibility:
    technical_assessment: <CTO input>
    dependencies: [<dependencies>]
    risks: [<risks>]
  value_assessment:
    strategic_fit: <PO input>
    user_impact: <impact>
    priority: high | medium | low
  effort_estimate: <sizing>
  recommendation: go | no-go | needs_more_info
  next_steps: [<recommended actions>]
```

## Output Format

Phase 0 (intake):
```
[EM]    Intake — {rough | semi-structured | structured} request detected
[PO]    Problem framed — {brief summary}
[EM]    Brief ready — proceeding to evaluation       {elapsed}
```
Phase 1-4 (evaluation):
```
[PO]    Strategic fit — {HIGH | MEDIUM | LOW}
[PO]    User stories — {N} stories defined
[EM]    Feasibility — {assessment summary}
[EM]    Decision: {GO | NO-GO | NEEDS MORE INFO}     {elapsed}
```
## Delegation

| Need | Action |
|------|--------|
| Strategic input | Spawn `product-owner` |
| Scope breakdown | Spawn `product-manager` |
| Technical feasibility | Spawn `cto` |
| Detailed planning | Recommend `/mg-assess-tech` or `/mg-design-review` |
| Feature development | Recommend `/mg-spec` then `/mg-build` |

See `references/model-escalation-guidance.md` for escalation criteria.

## Boundaries

**CAN:** Facilitate intake, ask questions, evaluate features, spawn experts, synthesize recommendations
**CANNOT:** Approve features unilaterally, commit resources, implement features
**ESCALATES TO:** mg-leadership-team (strategic conflicts, major architectural decisions)
