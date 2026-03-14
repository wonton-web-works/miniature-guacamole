# Development Workflow Protocol

## Overview

This document defines the Constraint-Driven Agentic Development (CAD) workflow used by the Product Development Team. CAD builds on test-first principles (TDD/BDD) with artifact bundling, curated context, and classification-driven gating to optimize agent coordination and context efficiency.

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
│   /mg-leadership-team │  ◄── Planning Phase
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
│  │   │  STEP 3.5   │  Classification: MECHANICAL or ARCHITECTURAL      │  │
│  │   │ Classify    │  Rules R1-R8, M1-M5, default ARCHITECTURAL       │  │
│  │   └──────┬──────┘                                                   │  │
│  │          │                                                          │  │
│  │          ├──────────────────┬────────────────────┐                 │  │
│  │          │                  │                    │                 │  │
│  │          ▼                  ▼                    ▼                 │  │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │  │
│  │   │  STEP 4A    │    │  STEP 4B    │    │ UNCERTAIN   │          │  │
│  │   │ Mechanical  │    │Architectural│    │→Step 4B     │          │  │
│  │   │   Gate      │    │   Review    │    └─────────────┘          │  │
│  │   └──────┬──────┘    └──────┬──────┘                             │  │
│  │          │                  │                                     │  │
│  │          └──────────┬───────┘                                     │  │
│  │          │                                                          │  │
│  └──────────┼──────────────────────────────────────────────────────────┘  │
│             │                                                              │
└─────────────┼──────────────────────────────────────────────────────────────┘
              │
              ▼
┌───────────────────────┐
│   /mg-leadership-team │  ◄── Code Review Phase
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

### /mg-leadership-team
**When:** Start of initiative, Code review before merge
**Does:**
1. Creates Executive Review (CEO, CTO, Eng Dir perspectives)
2. Breaks initiative into Git Workstreams
3. Conducts final code review before merge
4. APPROVES or REQUESTS CHANGES

**Output:** Executive Review + Workstream Plan OR Code Review Decision

### /mg-build
**When:** Executing a workstream
**Does:**
1. Coordinates PM, QA, Dev, Staff Eng
2. Runs the CAD cycle (test-first with artifact bundles)
3. Classifies workstream as MECHANICAL or ARCHITECTURAL (Step 3.5)
4. Routes to appropriate gate (4A or 4B)
5. Reports when ready for leadership review

**Output:** Completed workstream ready for review

### PM + QA (Step 1)
**When:** First step of each workstream
**Does:**
1. PM defines acceptance criteria (BDD: Given/When/Then)
2. QA writes test files with misuse-first test ordering: misuse → boundary → golden path
3. Commits tests to feature branch

**Output:** Test files that define "done"

### Dev (Step 2)
**When:** After tests exist
**Does:**
1. Receives compressed artifact bundle: INPUTS (context), GATE (success criteria), CONSTRAINTS (standards) — ~12K token budget
2. Runs tests (confirms they fail)
3. Implements minimum code to pass
4. Refactors while green
5. Commits implementation

**Output:** Code that passes all tests

### QA (Step 3)
**When:** After implementation
**Does:**
1. Runs full test suite
2. Checks coverage
3. Validates edge cases
4. Signs off OR reports issues

**Output:** QA Sign-off or Issue List

### Classification (Step 3.5)
**When:** After QA sign-off
**Does:**
1. Classifies workstream as MECHANICAL or ARCHITECTURAL
2. Applies classification rules:
   - **ARCHITECTURAL (R1-R8):** package.json changes, framework files, security-sensitive paths, >5 files + >300 lines (except same-module), new subdirectories, new projects, CI/CD files
   - **MECHANICAL (M1-M5):** Tests pass + 99% coverage, <200 lines (<500 single-module), modifications only, single src/ directory + tests/, single skill/agent template additions
3. Conservative bias: UNCERTAIN → default ARCHITECTURAL

**Output:** Classification decision (MECHANICAL → Step 4A, ARCHITECTURAL → Step 4B)

### Staff Engineer (Step 4B - ARCHITECTURAL path)
**When:** After classification determines ARCHITECTURAL
**Does:**
1. Reviews code quality
2. Checks architecture compliance
3. Reviews security
4. Approves OR requests changes

**Output:** Internal review approval

### Mechanical Gate (Step 4A - MECHANICAL path)
**When:** After classification determines MECHANICAL
**Does:**
1. Runs automated bash gates: test pass verification, coverage check, file count, line count, modification-only check
2. No agent spawn required
3. Instant pass/fail decision

**Output:** Automated gate pass (proceed to leadership review)

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
/mg-leadership-team [describe the initiative]
```

### Execute a workstream
```
/mg-build execute workstream WS-1: [description from leadership plan]
```

### Request code review
```
/mg-leadership-team review workstream WS-1 on branch feature/ws-1-[name]
```

### Merge after approval
```
/deployment-engineer merge feature/ws-1-[name]
```

## Handoff Checkpoints

| From | To | Trigger | Handoff |
|------|-----|---------|---------|
| User | mg-leadership-team | New initiative | Describe initiative |
| mg-leadership-team | mg-build | Workstream defined | `/mg-build execute WS-X` |
| mg-build | mg-leadership-team | Workstream complete | `/mg-leadership-team review WS-X` |
| mg-leadership-team | deployment-engineer | Approved | `/deployment-engineer merge` |
| mg-leadership-team | mg-build | Rejected | Specific feedback |

## Quality Gates

### Gate 1: Tests Exist
- [ ] Test files created
- [ ] Tests cover acceptance criteria (misuse → boundary → golden path)
- [ ] Tests are failing (no implementation yet)

### Gate 2: Tests Pass
- [ ] All tests passing
- [ ] No regressions

### Gate 3: QA Sign-off
- [ ] Coverage adequate (99% for MECHANICAL, varies for ARCHITECTURAL)
- [ ] Edge cases handled
- [ ] QA approves

### Gate 3.5: Classification
- [ ] Workstream classified as MECHANICAL or ARCHITECTURAL
- [ ] Classification rules applied (R1-R8, M1-M5)
- [ ] Route determined (4A or 4B)

### Gate 4A: Mechanical Gate (MECHANICAL path)
- [ ] All tests pass
- [ ] Coverage ≥ 99%
- [ ] <200 lines total (<500 single-module)
- [ ] Modifications only (no new files)
- [ ] Single src/ directory + tests/

### Gate 4B: Internal Review (ARCHITECTURAL path)
- [ ] Code quality approved
- [ ] Standards met
- [ ] Security reviewed
- [ ] Architecture compliance

### Gate 5: Leadership Approval
- [ ] Business requirements met
- [ ] Technical quality approved
- [ ] Operationally ready

### Gate 6: Merge Ready
- [ ] Leadership approved
- [ ] No merge conflicts
- [ ] Branch up to date

## CAD Enhancements

### Artifact Bundles

Task agents (qa, dev) receive pre-computed artifact bundles instead of full memory access:

- **INPUTS:** Relevant context only (3-5 decisions, applicable standards)
- **GATE:** Success criteria for this workstream
- **CONSTRAINTS:** Technical standards and patterns to follow

Coordination agents (engineering-manager, cto, staff-engineer) retain full memory access as stateful role simulators.

### Curated Context

The orchestrator (mg-build) reads all memory files and full source documents, then passes only relevant subsets to task agents:

- **qa:** ~8K token budget
- **dev:** ~12K token budget
- **staff-engineer:** Full access (coordination role)

### Document Compression

Large deliverable documents (PRD, Technical Design, Brand Kit) are compressed via template-based extraction before being forwarded to task agents. The orchestrator (mg-build) reads the full document; task agents (dev, qa, design) receive only the compressed version — never the raw full document.

Context budgets apply to compressed bundles: qa ~8K tokens, dev ~12K tokens. Compressed content populates the INPUTS or CONSTRAINTS fields of the artifact bundle. No new top-level bundle fields are introduced.

**PRD → dev and qa bundles**

Extract verbatim using template-based extraction (not LLM summarization):
- Acceptance criteria — extracted in full, never paraphrased or shortened
- Constraints (technical, timeline, budget)
- Key decisions recorded in the PRD

**Technical Design → dev and staff-engineer bundles**

Extract:
- Selected approach
- Risk mitigations

Do not extract the alternatives analysis — task agents do not need it.

**Brand Kit → design agent bundle**

Extract as token injection:
- Color token values (hex codes or semantic color names)
- Font stack (typeface and fallbacks)

The design agent receives the Brand Kit compression; dev and qa do not.

### Classification Rules

**ARCHITECTURAL (R1-R8):**
- R1: package.json or dependency changes
- R2: Framework files (.claude/, src/framework/, src/installer/)
- R3: Security-sensitive paths (auth/, permissions/, credentials/)
- R4: >5 files modified AND >300 total lines changed (except same-module)
- R5: New subdirectories created
- R6: New projects or workspaces added
- R7: CI/CD configuration changes (.github/, .gitlab-ci.yml)
- R8: Database schema or migration changes

**MECHANICAL (M1-M5):**
- M1: All tests pass + coverage ≥ 99%
- M2: <200 lines total (<500 if single module)
- M3: Modifications only (no new files)
- M4: Changes in single src/ directory + corresponding tests/
- M5: Single skill/agent template addition (no framework changes)

**Conservative Bias:** UNCERTAIN → default to ARCHITECTURAL

### Expected Impact

- **Context Reduction:** 75K → 16K tokens per task agent spawn (79% reduction)
- **Signal-to-Noise:** 0.56 → 9.0 (16x improvement)
- **Retrieval Accuracy:** +5-10% from same models
- **Mechanical Verification:** 60% → 85% automation
- **Agent Spawn Reduction:** 1 fewer spawn per MECHANICAL workstream
- **Coverage Requirement:** Stays at 99% (not reduced)
