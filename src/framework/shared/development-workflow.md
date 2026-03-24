# Development Workflow Protocol

## Overview

This document defines the Constraint-Driven Agentic Development (CAD) workflow used by the Product Development Team. CAD builds on test-first principles (TDD/BDD) with artifact bundling, curated context, and classification-driven gating to optimize agent coordination and context efficiency.

Classification happens **at intake** (Step 0), before any agent spawns. This determines the track: MECHANICAL (1 spawn) or ARCHITECTURAL (5-6 spawns).

## The Development Cycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPMENT WORKFLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌───────────────┐
    │  USER REQUEST │
    │  or TICKET    │
    └───────┬───────┘
            │
            ▼
┌───────────────────────┐
│   STEP 0: CLASSIFY    │  ◄── At intake, before any spawns
│   Read ticket/request │
│   Apply R1-R8, M1-M5  │
└───────────┬───────────┘
            │
            ├─────────────────────────────────────────┐
            │                                         │
            ▼                                         ▼
┌───────────────────────┐               ┌─────────────────────────┐
│    MECHANICAL TRACK   │               │   ARCHITECTURAL TRACK   │
│    (60%+ of work)     │               │   (complex/risky work)  │
└───────────┬───────────┘               └────────────┬────────────┘
            │                                        │
            ▼                                        ▼
┌───────────────────────┐               ┌─────────────────────────┐
│   Dev (single spawn)  │               │  /mg    │
│   Writes tests +      │               │  Executive Review +     │
│   implements (TDD)    │               │  Workstream Plan        │
└───────────┬───────────┘               └────────────┬────────────┘
            │                                        │
            ▼                                        ▼
┌───────────────────────┐               ┌─────────────────────────┐
│   BASH GATE           │               │  QA writes tests        │
│   Auto-verifies:      │               │  (can run parallel      │
│   tests, coverage,    │               │   with Dev)             │
│   line limits         │               └────────────┬────────────┘
└───────────┬───────────┘                            │
            │                                        ▼
            ▼                           ┌─────────────────────────┐
         DONE                          │  Dev implements          │
         (no leadership review)        │  against QA tests        │
                                       └────────────┬────────────┘
                                                    │
                                                    ▼
                                       ┌─────────────────────────┐
                                       │  Staff Engineer review  │
                                       └────────────┬────────────┘
                                                    │
                                                    ▼
                                       ┌─────────────────────────┐
                                       │  /mg    │
                                       │  Code Review + Approve  │
                                       └────────────┬────────────┘
                                                    │
                                              ┌─────┴─────┐
                                              │           │
                                              ▼           ▼
                                         APPROVED     REJECTED
                                              │           │
                                              │           │ (back to Dev)
                                              ▼           │
                                       ┌───────────────┐  │
                                       │/deployment-   │◄─┘
                                       │  engineer     │
                                       │    merge      │
                                       └───────┬───────┘
                                               │
                                               ▼
                                          ┌─────────┐
                                          │  DONE   │
                                          │  main   │
                                          └─────────┘
```

## Step 0: Classification at Intake

Classification happens BEFORE any agent spawns, based on the ticket or request description.

**Apply R1-R8 and M1-M5 rules** (see Classification Rules below).

- If any R-rule matches → **ARCHITECTURAL**
- If all M-rules match → **MECHANICAL**
- If UNCERTAIN → default **ARCHITECTURAL**

**User overrides** (on any `/mg-build` invocation):
- `--force-mechanical` — treat as MECHANICAL regardless of rules
- `--force-architectural` — treat as ARCHITECTURAL regardless of rules

## MECHANICAL Track

**When:** No R-rules match, all M-rules match (or `--force-mechanical`)

**Total spawns: 1**

```
Step 1: Dev — writes failing tests AND implements (full TDD cycle in one spawn)
Step 2: Bash Gate — automated verification (no agent spawn)
Done — no leadership review required
```

### Dev (single spawn)

Dev handles the complete TDD cycle:
1. Write failing tests (misuse → boundary → golden path)
2. Implement minimum code to pass
3. Refactor while green
4. Verify coverage >= 99%

Dev receives artifact bundle (~12K tokens):
- **INPUTS:** Acceptance criteria, relevant context
- **GATE:** Pass criteria (99% coverage, all tests green, line limits)
- **CONSTRAINTS:** Applicable standards (DRY, config-over-composition, security patterns)

### Bash Gate (automated)

- [ ] All tests pass
- [ ] Coverage >= 99%
- [ ] Total changes < 200 lines (< 500 if single-module)
- [ ] Modifications only (no new files except tests)
- [ ] Single src/ directory + tests/
- [ ] No package.json, framework, or CI/CD changes

Pass → Done. No leadership review. No merge gate beyond bash.

## ARCHITECTURAL Track

**When:** Any R-rule matches (or `--force-architectural`)

**Total spawns: 5-6**

```
Step 1: /mg — Executive Review + Workstream Plan
Step 2: QA writes tests (can run parallel with Dev once plan exists)
Step 3: Dev implements against QA tests
Step 3.5: Dual-specialist review (if deliverable contains code blocks)
Step 4: Staff Engineer internal review
Step 5: /mg Code Review + Approval
Step 6: /deployment-engineer merge
```

### /mg (Step 1)

**Does:**
1. Creates Executive Review (CEO, CTO, Eng Dir perspectives)
2. Breaks initiative into Git Workstreams
3. Conducts final code review before merge
4. APPROVES or REQUESTS CHANGES

**Output:** Executive Review + Workstream Plan OR Code Review Decision

### QA (Step 2) — can overlap with Dev

**Does:**
1. PM defines acceptance criteria (BDD: Given/When/Then)
2. QA writes test files with misuse-first ordering: misuse → boundary → golden path
3. Commits tests to feature branch

**Output:** Failing test files that define "done"

QA receives artifact bundle (~8K tokens):
- Relevant acceptance criteria (3-5 scenarios)
- Applicable security standards (2-3 rules)
- Related test patterns (1-2 examples)

### Dev (Step 3)

**Does:**
1. Receives compressed artifact bundle (~12K tokens)
2. Runs tests (confirms they fail)
3. Implements minimum code to pass
4. Refactors while green
5. Commits implementation

**Output:** Code that passes all tests

### Dual-Specialist Review (Step 3.5 — conditional)

**Trigger:** Deliverable contains fenced code blocks (``` or ~~~). Skip if no code blocks.

Spawn two specialists in parallel:
1. **Domain specialist** — platform correctness (determined by workstream context at runtime)
2. **Language specialist** — code quality and idiomatic style

**Gate:** Both must pass. Partial approval does not proceed.

**Severity:** `blocking` (must fix) or `warning` (advisory).

### Staff Engineer (Step 4)

**Does:**
1. Reviews code quality and architecture compliance
2. Checks security
3. Approves OR requests changes

**Output:** Internal review approval

### /mg (Step 5)

**Does:**
1. Final code review
2. APPROVES or REQUESTS CHANGES (back to Dev)

### /deployment-engineer (Step 6)

**Does:**
1. Verifies approval
2. Updates branch with main
3. Resolves conflicts (with dev help)
4. Merges to main
5. Cleans up branch

## Role Responsibilities Summary

| Role | MECHANICAL | ARCHITECTURAL |
|------|-----------|---------------|
| Dev | Full TDD cycle (tests + impl) | Implementation only |
| QA | None | Test specs (Step 2) |
| Staff Engineer | None | Internal review (Step 4) |
| /mg | None | Planning + final approval |
| /deployment-engineer | None | Merge |
| Bash Gate | Auto-verifies (Step 2) | Not used |

## Classification Rules

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
- M1: All tests pass + coverage >= 99%
- M2: <200 lines total (<500 if single module)
- M3: Modifications only (no new files except tests)
- M4: Changes in single src/ directory + corresponding tests/
- M5: Single skill/agent template addition (no framework changes)

**Conservative Bias:** UNCERTAIN → default to ARCHITECTURAL

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
test: Add test specs for [feature]        # QA step (ARCHITECTURAL)
feat: Implement [feature]                  # Dev implementation
test: Verify [feature] implementation      # ARCHITECTURAL only
chore: Merge WS-X: [description]           # Merge
```

## Invoking the Workflow

### Execute a workstream (auto-classifies at intake)
```
/mg-build execute workstream WS-1: [description from leadership plan]
```

### Force a track
```
/mg-build execute WS-1 --force-mechanical
/mg-build execute WS-1 --force-architectural
```

### Start a new initiative (ARCHITECTURAL only)
```
/mg [describe the initiative]
```

### Request code review (ARCHITECTURAL)
```
/mg review workstream WS-1 on branch feature/ws-1-[name]
```

### Merge after approval (ARCHITECTURAL)
```
/deployment-engineer merge feature/ws-1-[name]
```

## Handoff Checkpoints

| From | To | Track | Trigger | Handoff |
|------|-----|-------|---------|---------|
| User | mg-build | Both | New workstream | `/mg-build execute WS-X` |
| mg-build | dev | MECHANICAL | Classified at intake | Combined test+impl prompt |
| mg-build | /mg | ARCHITECTURAL | After classification | Describe initiative |
| /mg | mg-build | ARCHITECTURAL | Workstream defined | `/mg-build execute WS-X` |
| mg-build | /mg | ARCHITECTURAL | Workstream complete | `/mg review WS-X` |
| /mg | deployment-engineer | ARCHITECTURAL | Approved | `/deployment-engineer merge` |
| /mg | mg-build | ARCHITECTURAL | Rejected | Specific feedback |

## Quality Gates

### MECHANICAL Track

**Gate 0: Classification**
- [ ] Workstream classified at intake (Step 0)
- [ ] No R-rules matched
- [ ] All M-rules matched (or `--force-mechanical` used)

**Gate 1: Bash Gate (auto)**
- [ ] All tests pass
- [ ] Coverage >= 99%
- [ ] <200 lines total (<500 single-module)
- [ ] Modifications only (no new files except tests)
- [ ] Single src/ directory + tests/
- [ ] No package.json, framework, or CI/CD changes

### ARCHITECTURAL Track

**Gate 0: Classification**
- [ ] Workstream classified at intake (Step 0)
- [ ] At least one R-rule matched (or `--force-architectural` used)

**Gate 1: Tests Exist**
- [ ] Test files created
- [ ] Tests cover acceptance criteria (misuse → boundary → golden path)
- [ ] Tests are failing (no implementation yet)

**Gate 2: Tests Pass**
- [ ] All tests passing
- [ ] No regressions

**Gate 3: QA Sign-off**
- [ ] Coverage >= 99%
- [ ] Edge cases handled
- [ ] QA approves

**Gate 4: Staff Review**
- [ ] Code quality approved
- [ ] Standards met
- [ ] Security reviewed
- [ ] Architecture compliance

**Gate 5: Leadership Approval**
- [ ] Business requirements met
- [ ] Technical quality approved
- [ ] Operationally ready

**Gate 6: Merge Ready**
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

### Expected Impact

- **Context Reduction:** 75K → 16K tokens per task agent spawn (79% reduction)
- **Signal-to-Noise:** 0.56 → 9.0 (16x improvement)
- **Retrieval Accuracy:** +5-10% from same models
- **MECHANICAL Automation:** 60%+ of workstreams, 1 spawn vs. 11
- **ARCHITECTURAL Spawns:** 5-6 (unchanged quality)
- **Coverage Requirement:** Stays at 99% (not reduced)
