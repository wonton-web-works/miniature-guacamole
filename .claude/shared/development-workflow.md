# Development Workflow Protocol

## Overview

This document defines the cyclical TDD/BDD development workflow used by the Product Development Team.

## The Development Cycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPMENT WORKFLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌───────────────┐
    │  INITIATIVE   │
    │   (Input)     │
    └───────┬───────┘
            │
            ▼
┌───────────────────────┐
│   /leadership-team    │  ◄── Planning Phase
│   Executive Review    │
│   + Workstream Plan   │
└───────────┬───────────┘
            │
            │ Creates workstreams (WS-1, WS-2, ...)
            │
            ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                        FOR EACH WORKSTREAM                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │   ┌─────────────┐                                                   │  │
│  │   │   STEP 1    │  PM + QA write tests                              │  │
│  │   │   Tests     │  Branch: feature/ws-{n}-{name}                    │  │
│  │   └──────┬──────┘                                                   │  │
│  │          │                                                          │  │
│  │          ▼                                                          │  │
│  │   ┌─────────────┐                                                   │  │
│  │   │   STEP 2    │  Dev implements against tests                     │  │
│  │   │   Code      │  TDD: Red → Green → Refactor                      │  │
│  │   └──────┬──────┘                                                   │  │
│  │          │                                                          │  │
│  │          ▼                                                          │  │
│  │   ┌─────────────┐                                                   │  │
│  │   │   STEP 3    │  QA verifies all tests pass                       │  │
│  │   │   Verify    │  Coverage check, edge cases                       │  │
│  │   └──────┬──────┘                                                   │  │
│  │          │                                                          │  │
│  │          ▼                                                          │  │
│  │   ┌─────────────┐                                                   │  │
│  │   │   STEP 4    │  Staff Engineer code review                       │  │
│  │   │   Review    │  Quality, standards, architecture                 │  │
│  │   └──────┬──────┘                                                   │  │
│  │          │                                                          │  │
│  └──────────┼──────────────────────────────────────────────────────────┘  │
│             │                                                              │
└─────────────┼──────────────────────────────────────────────────────────────┘
              │
              ▼
┌───────────────────────┐
│   /leadership-team    │  ◄── Code Review Phase
│   Code Review         │
└───────────┬───────────┘
            │
      ┌─────┴─────┐
      │           │
      ▼           ▼
┌──────────┐  ┌──────────┐
│ APPROVED │  │ REJECTED │
│    ✅    │  │    🔄    │
└────┬─────┘  └────┬─────┘
     │             │
     │             │ (back to Step 2 with feedback)
     │             │
     ▼             │
┌───────────────┐  │
│ /deployment-  │◄─┘
│   engineer    │
│    merge      │
└───────┬───────┘
        │
        ▼
   ┌─────────┐
   │  DONE   │
   │  main   │
   └─────────┘
```

## Role Responsibilities

### /leadership-team
**When:** Start of initiative, Code review before merge
**Does:**
1. Creates Executive Review (CEO, CTO, Eng Dir perspectives)
2. Breaks initiative into Git Workstreams
3. Conducts final code review before merge
4. APPROVES or REQUESTS CHANGES

**Output:** Executive Review + Workstream Plan OR Code Review Decision

### /engineering-team
**When:** Executing a workstream
**Does:**
1. Coordinates PM, QA, Dev, Staff Eng
2. Runs the TDD cycle
3. Reports when ready for leadership review

**Output:** Completed workstream ready for review

### PM + QA (Step 1)
**When:** First step of each workstream
**Does:**
1. PM defines acceptance criteria (BDD: Given/When/Then)
2. QA writes test files (TDD: failing tests)
3. Commits tests to feature branch

**Output:** Test files that define "done"

### Dev (Step 2)
**When:** After tests exist
**Does:**
1. Runs tests (confirms they fail)
2. Implements minimum code to pass
3. Refactors while green
4. Commits implementation

**Output:** Code that passes all tests

### QA (Step 3)
**When:** After implementation
**Does:**
1. Runs full test suite
2. Checks coverage
3. Validates edge cases
4. Signs off OR reports issues

**Output:** QA Sign-off or Issue List

### Staff Engineer (Step 4)
**When:** After QA sign-off
**Does:**
1. Reviews code quality
2. Checks architecture compliance
3. Reviews security
4. Approves OR requests changes

**Output:** Internal review approval

### /deployment-engineer
**When:** After leadership approval
**Does:**
1. Verifies approval
2. Updates branch with main
3. Resolves conflicts (with dev help)
4. Merges to main
5. Cleans up branch

**Output:** Code merged to main

## Git Branching Strategy

```
main (protected)
├── feature/ws-1-delegation-logging
├── feature/ws-2-shared-memory
└── feature/ws-3-cost-tracking
```

### Branch Naming
- Pattern: `feature/ws-{number}-{short-name}`
- Example: `feature/ws-1-delegation-logging`

### Commit Messages
```
test: Add test specs for [feature]        # Step 1
feat: Implement [feature]                  # Step 2
test: Verify [feature] implementation      # Step 3
chore: Merge WS-X: [description]           # Merge
```

## Invoking the Workflow

### Start a new initiative
```
/leadership-team [describe the initiative]
```

### Execute a workstream
```
/engineering-team execute workstream WS-1: [description from leadership plan]
```

### Request code review
```
/leadership-team review workstream WS-1 on branch feature/ws-1-[name]
```

### Merge after approval
```
/deployment-engineer merge feature/ws-1-[name]
```

## Handoff Checkpoints

| From | To | Trigger | Handoff |
|------|-----|---------|---------|
| User | leadership-team | New initiative | Describe initiative |
| leadership-team | engineering-team | Workstream defined | `/engineering-team execute WS-X` |
| engineering-team | leadership-team | Workstream complete | `/leadership-team review WS-X` |
| leadership-team | deployment-engineer | Approved | `/deployment-engineer merge` |
| leadership-team | engineering-team | Rejected | Specific feedback |

## Quality Gates

### Gate 1: Tests Exist
- [ ] Test files created
- [ ] Tests cover acceptance criteria
- [ ] Tests are failing (no implementation yet)

### Gate 2: Tests Pass
- [ ] All tests passing
- [ ] No regressions

### Gate 3: QA Sign-off
- [ ] Coverage adequate
- [ ] Edge cases handled
- [ ] QA approves

### Gate 4: Internal Review
- [ ] Code quality approved
- [ ] Standards met
- [ ] Security reviewed

### Gate 5: Leadership Approval
- [ ] Business requirements met
- [ ] Technical quality approved
- [ ] Operationally ready

### Gate 6: Merge Ready
- [ ] Leadership approved
- [ ] No merge conflicts
- [ ] Branch up to date
