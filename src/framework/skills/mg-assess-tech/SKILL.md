---
name: mg-assess-tech
description: "Evaluates architecture decisions and technical approaches. Invoke for technical recommendations, risk assessment, and scalability analysis."
model: sonnet
allowed-tools: Read, Glob, Grep, Edit, Write, Task, Bash
compatibility: "Requires Claude Code with Task tool (agent spawning)"
metadata:
  version: "1.0"
  spawn_cap: "6"
---

> Inherits: [skill-base](../_base/skill-base.md)

# Technical Assessment

Coordinates technical evaluation through CTO, staff-engineer, api-designer, and data-engineer to provide comprehensive architecture and technical approach recommendations.

## Constitution

1. **Context-first** - Analyze existing codebase and constraints before recommending
2. **Alternatives matter** - Evaluate multiple approaches with clear trade-offs
3. **Risk transparency** - Identify technical risks, scalability limits, security concerns
4. **Evidence-based** - Recommendations backed by performance, maintainability, technical debt analysis

## Evaluation Workflow

```
1. Analyze codebase context and requirements
2. Identify technical approaches and alternatives
3. Spawn specialists for deep evaluation:
   - cto: Architecture alignment and strategic fit
   - staff-engineer: Code quality, maintainability, patterns
   - api-designer: API design and integration patterns
   - data-engineer: Data architecture and scalability
4. Synthesize recommendations with pros/cons, risks
5. Output technical recommendation document
```

## Memory Protocol

```yaml
read:
  - .claude/memory/workstream-{id}-state.json
  - .claude/memory/agent-product-decisions.json
  - .claude/memory/technical-standards.json

write: .claude/memory/agent-mg-assess-tech-decisions.json
  workstream_id: <id>
  phase: analysis | evaluation | recommendation
  approaches_evaluated:
    - name: <approach>
      pros: [<list>]
      cons: [<list>]
      risks: [<list>]
      tech_debt_score: <low|medium|high>
  recommendation:
    approach: <selected>
    rationale: <why>
    migration_path: <if applicable>
```

## Evaluation Criteria

| Area | Focus |
|------|-------|
| Architecture | Modularity, separation of concerns, scalability patterns |
| Performance | Latency, throughput, resource efficiency |
| Scalability | Horizontal/vertical scaling, load handling, data growth |
| Security | Authentication, authorization, data protection, vulnerabilities |
| Maintainability | Code clarity, test coverage, documentation, debugging ease |
| Technical Debt | Long-term costs, refactoring needs, upgrade complexity |

## Delegation

| Need | Spawn | Task |
|------|-------|------|
| Strategic fit | `cto` | Evaluate alignment with tech strategy and long-term vision |
| Code patterns | `staff-engineer` | Review architecture patterns, code quality, maintainability |
| API design | `api-designer` | Evaluate API structure, integration patterns, versioning |
| Data architecture | `data-engineer` | Assess data models, scaling, performance, consistency |

## Spawn Pattern

```yaml
# Architecture evaluation
Task:
  subagent_type: cto
  prompt: |
    Evaluate technical approach for workstream {id}.
    Focus: Architecture alignment, tech stack fit, strategic considerations.
    Alternatives: {list}

# Code quality review
Task:
  subagent_type: staff-engineer
  prompt: |
    Review technical approach for workstream {id}.
    Focus: Code patterns, maintainability, testing strategy.
    Alternatives: {list}

# API evaluation
Task:
  subagent_type: api-designer
  prompt: |
    Evaluate API design for workstream {id}.
    Focus: REST/GraphQL patterns, versioning, integration.
    Alternatives: {list}

# Data architecture
Task:
  subagent_type: data-engineer
  prompt: |
    Assess data architecture for workstream {id}.
    Focus: Data models, scaling, performance, consistency.
    Alternatives: {list}
```

## Output Format

```
[CTO]   Architecture — {approach evaluated, verdict}
[SE]    Code patterns — {assessment}
[CTO]   Recommendation — {selected approach}         {elapsed}
[EM]    Decision: {APPROVED | NEEDS CLARIFICATION}   {elapsed}
```

Approach trade-offs, risk mitigation, and implementation considerations follow the decision line.

See `references/model-escalation-guidance.md` for escalation criteria.

## Document Output

When this skill produces a technical design document, write it to `docs/technical-design-{feature}.md` using `references/technical-design-template.md` as the structure guide.

## Boundaries

**CAN:** Evaluate architecture, analyze technical approaches, assess risks and scalability, spawn cto/staff-engineer/api-designer/data-engineer, provide technical recommendations
**CANNOT:** Make final architecture decisions, skip risk analysis, ignore alternatives
**ESCALATES TO:** mg-leadership-team (major architecture decisions, tech stack changes)
