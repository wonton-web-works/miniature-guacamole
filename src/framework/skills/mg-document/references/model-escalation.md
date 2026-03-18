# Model Escalation Protocol

Defines when Sonnet-tier skills should escalate complex subtasks to Opus-tier agents for deeper reasoning.

## Principle

Skills run on Sonnet for cost efficiency. When a task requires deep reasoning, the skill spawns an Opus-tier subagent (cto, ceo, engineering-director) via the Task tool rather than attempting complex analysis itself.

## Escalation Triggers

A task is "complex" when it matches ANY of these indicators:

| Indicator | Description | Example |
|-----------|-------------|---------|
| **Architecture decision** | New patterns, tech stack changes, system design | "Should we use WebSockets or SSE?" |
| **Multi-file impact** | Changes affecting 5+ files or 3+ modules | Refactoring shared utility used across codebase |
| **Security-critical** | Auth, crypto, data protection, secrets | JWT implementation, API key rotation |
| **Conflicting tradeoffs** | No clear winner, requires nuanced judgment | Performance vs. maintainability vs. cost |
| **Novel problem** | No existing pattern in codebase to follow | First-time integration with external service |
| **Strategic scope** | Impacts roadmap, resources, or team direction | Feature that blocks 3+ workstreams |

## Escalation Pattern

When a trigger is detected, spawn the appropriate reasoning-tier agent:

```yaml
# For architecture/technical decisions
Task:
  subagent_type: cto
  prompt: |
    [ESCALATED - Complex reasoning required]
    {describe the specific complex aspect}
    Context: {relevant files and constraints}
    Decision needed: {what judgment is required}

# For strategic/business impact
Task:
  subagent_type: ceo
  prompt: |
    [ESCALATED - Strategic decision required]
    {describe the business impact}

# For operational/resource decisions
Task:
  subagent_type: engineering-director
  prompt: |
    [ESCALATED - Operational decision required]
    {describe the resource/timeline question}
```

## What Stays on Sonnet

- Structured checklist evaluation (OWASP, WCAG, coding standards)
- Coordination and delegation to specialists
- Output formatting and synthesis of specialist reports
- File reading, pattern matching, test verification
- Straightforward reviews with clear pass/fail criteria

## What Escalates to Opus

- Novel architectural decisions with no precedent
- Resolving conflicting specialist recommendations
- Security threat modeling for new attack surfaces
- Strategic assessment of business impact
- Ambiguous situations requiring nuanced judgment
