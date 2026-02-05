---
# Skill: Feature Assessment
# Interactive workflow for evaluating feature requests with the client

name: feature-assessment
description: "Interactive feature evaluation workflow. Invoke to assess scope, feasibility, and value of feature requests."
model: sonnet
tools: [Read, Glob, Grep, Task]
---

# Feature Assessment

Interactive workflow for evaluating feature requests with the client through structured conversation.

## Constitution

1. **Ask before assuming** - Clarify requirements through dialogue
2. **Three dimensions** - Evaluate scope, feasibility, and value
3. **Risk-aware** - Identify dependencies and blockers early
4. **Memory-first** - Document decisions for downstream teams
5. **Actionable outcomes** - Every assessment ends with clear next steps
6. **Visual standards** - Follow standard output format in `../_shared/output-format.md`

## Workflow

```
1. Discovery Phase: Ask clarifying questions
   - What problem does this solve?
   - Who benefits?
   - What defines success?

2. Multi-lens Evaluation:
   Product Owner → Strategic fit and value
   Product Manager → Scope breakdown and stories
   CTO → Technical feasibility assessment

3. Synthesis:
   - Scope definition
   - Acceptance criteria
   - Effort estimation
   - Risk assessment
   - Go/no-go recommendation

4. Hand off:
   - GO → /technical-assessment or /design-review
   - NO-GO → Document rationale for future reference
```

## Memory Protocol

```yaml
# Read strategic context
read:
  - .claude/memory/product-roadmap.json
  - .claude/memory/architecture-decisions.json
  - .claude/memory/team-capacity.json

# Write assessment results
write: .claude/memory/feature-assessments.json
  feature_id: <id>
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

## Interactive Assessment Process

### Phase 1: Discovery Questions

Ask the client to clarify:
- What problem are we solving?
- Who are the users?
- What does success look like?
- Are there constraints (time, budget, technical)?
- What happens if we don't build this?

### Phase 2: Spawn Expert Evaluations

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

### Phase 3: Synthesis and Recommendation

Combine inputs to produce:
- Clear scope definition
- Acceptance criteria
- Risk and dependency analysis
- Effort estimation guidance
- Go/no-go recommendation with rationale

## Output Format

```
## Feature Assessment: {Feature Name}

### Summary
{1-2 sentence summary of the request}

### Clarifications
**Q:** {question}
**A:** {answer}
...

### Scope Definition
**User Stories:**
- As a {user}, I want {goal} so that {benefit}

**Acceptance Criteria:**
- [ ] {criterion}

**Out of Scope:**
- {explicitly excluded items}

### Feasibility Assessment
**Technical Feasibility:** {CTO input}
**Dependencies:** {list}
**Risks:** {list}

### Value Assessment
**Strategic Fit:** {PO input}
**User Impact:** {expected impact}
**Priority:** {high|medium|low}

### Effort Estimate
{rough sizing: small/medium/large or T-shirt sizing}

### Recommendation
**Decision:** GO | NO-GO | NEEDS MORE INFO

**Rationale:**
{why this decision}

### Next Steps
{If GO:}
- [ ] /technical-assessment for architecture planning
- [ ] /design-review for UX planning
- [ ] Assign to /product-team for detailed spec

{If NO-GO:}
- [ ] Document decision for future reference
- [ ] Communicate rationale to stakeholders

{If NEEDS MORE INFO:}
- [ ] {specific questions to answer}
```

## Delegation

| Need | Action |
|------|--------|
| Strategic input | Spawn `product-owner` |
| Scope breakdown | Spawn `product-manager` |
| Technical feasibility | Spawn `cto` |
| Detailed planning | Recommend `/technical-assessment` or `/design-review` |
| Feature development | Recommend `/product-team` → `/engineering-team` |

## Boundaries

**CAN:** Ask questions, evaluate features, spawn experts, synthesize recommendations
**CANNOT:** Approve features unilaterally, commit resources, implement features
**ESCALATES TO:** leadership-team (strategic conflicts, major architectural decisions)
