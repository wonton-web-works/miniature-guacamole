# Agent Injection Pattern - Implementation Example

This document shows the before/after comparison of how skills would change to implement agent constitution injection.

## Current Pattern (implement skill)

**File**: `.claude/skills/implement/SKILL.md`

```yaml
# Step 1: QA writes tests
Task:
  subagent_type: qa
  prompt: |
    Write failing tests for workstream {id}.
    Acceptance criteria: {criteria}
    Target: 99% coverage paths identified.
```

**Problem**: QA agent receives this prompt but uses built-in QA behavior, not our custom constitution from `.claude/agents/qa/agent.md`.

## Injection Pattern (modified)

```yaml
# Step 1: QA writes tests
Task:
  subagent_type: qa
  prompt: |
    ===== QA ENGINEER CONSTITUTION =====
    # QA Engineer

    You write tests before code and verify implementations.

    ## Constitution

    1. **Tests before code** - Always write tests first
    2. **99% coverage** - Unit + integration combined
    3. **BDD scenarios** - Given/When/Then from PM specs
    4. **Visual regression** - Playwright screenshots for UI
    5. **Memory-first** - Read specs, write test results
    6. **Visual standards** - Use ASCII progress patterns from shared output format

    ## Memory Protocol

    ```yaml
    # Read before testing
    read:
      - .claude/memory/tasks-qa.json  # Your task queue
      - .claude/memory/bdd-scenarios.json
      - .claude/memory/acceptance-criteria.json
      - .claude/memory/feature-specs.json

    # Write test specs (before implementation)
    write: .claude/memory/test-specs.json
      workstream_id: <id>
      test_files:
        - path: <file>
          type: unit | integration | e2e | visual
          test_count: <n>
      status: tests_written  # Gate for dev to start
    ```

    ## Test Types

    | Type | Tool | Purpose |
    |------|------|---------|
    | Unit | Vitest/Jest | Function-level, 99% coverage |
    | Integration | Testing Library | Component interaction |
    | E2E | Playwright | Critical user journeys |
    | Visual | Playwright | Screenshot comparison |

    ## Boundaries

    **CAN:** Write tests, verify code, check coverage, report regressions
    **CANNOT:** Write implementation code, approve changes
    **ESCALATES TO:** engineering-manager

    ===== END CONSTITUTION =====

    ===== YOUR TASK =====
    Write failing tests for workstream {id}.
    Acceptance criteria: {criteria}
    Target: 99% coverage paths identified.

    Follow your constitution above, especially:
    - Read memory files listed in Memory Protocol
    - Write results to test-specs.json
    - Achieve 99% coverage requirement
```

## Implementation Strategy

### Option A: Inline Injection (shown above)

**Pros**:
- Simple to implement
- Clear what constitution is active
- No additional file reads

**Cons**:
- Large SKILL.md files
- Constitution changes require skill updates
- Repetition across multiple spawn points

### Option B: Dynamic Injection (read at runtime)

```yaml
# Step 1: QA writes tests
# Note: Skill must read agent file first and substitute {qa_constitution}

Task:
  subagent_type: qa
  prompt: |
    ===== QA ENGINEER CONSTITUTION =====
    {qa_constitution}
    ===== END CONSTITUTION =====

    ===== YOUR TASK =====
    Write failing tests for workstream {id}.
    ...
```

**Implementation**:
```markdown
## Before spawning QA:

1. Read `/absolute/path/.claude/agents/qa/agent.md`
2. Extract content (skip frontmatter or include it)
3. Substitute into Task prompt template
4. Invoke Task with assembled prompt
```

**Pros**:
- Single source of truth (agent.md files)
- Constitution changes don't require skill updates
- More maintainable

**Cons**:
- Skill logic must read files before spawning
- More complex skill implementation
- Need helper function for injection

### Option C: Hybrid Approach

**For frequently-spawned agents** (qa, dev, staff-engineer):
- Use inline injection (accept duplication for clarity)

**For rarely-spawned agents** (cto, ceo, specialist roles):
- Use dynamic injection (reduce duplication)

## Affected Skills

If we adopt injection, these 12 skills need updates:

1. **implement** - Spawns: qa (2x), dev, staff-engineer
2. **engineering-team** - Spawns: qa, dev, staff-engineer
3. **code-review** - Spawns: staff-engineer, dev
4. **security-review** - Spawns: security-engineer
5. **accessibility-review** - Spawns: qa (for test validation)
6. **design-review** - Spawns: art-director, design
7. **product-team** - Spawns: product-owner, product-manager
8. **leadership-team** - Spawns: ceo, cto, engineering-director
9. **technical-assessment** - Spawns: cto, staff-engineer, data-engineer, devops-engineer
10. **feature-assessment** - Spawns: product-owner, product-manager, cto
11. **design-team** - Spawns: design, art-director
12. **docs-team** - Spawns: technical-writer

## Update Effort Estimate

**Per skill**:
- Identify all Task spawns: 15 min
- Read corresponding agent.md: 5 min
- Inline or implement dynamic injection: 30 min
- Test spawn works with constitution: 15 min
- **Total: ~1 hour per skill**

**12 skills × 1 hour = 12 hours = 1.5 days**

Add buffer for edge cases and testing: **2-3 days total**

## Recommended Approach

**Phase 1 (this spike)**: Confirm injection works with manual tests

**Phase 2 (if GO)**:
1. Create helper function for dynamic injection (implement skill first)
2. Update implement skill with injection pattern
3. Test full TDD cycle with injected constitutions
4. Validate agents follow custom behavior
5. Roll out to remaining 11 skills
6. Document pattern in shared standards

**Timeline**: 3-5 days for full rollout after spike confirmation
