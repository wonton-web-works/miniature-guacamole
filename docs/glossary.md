# Glossary

Framework-specific terms used throughout the miniature-guacamole documentation.

## A

### Agent Message Bus

A structured message system for agent-to-agent communication via memory files. Messages are written to `.claude/memory/messages-{from}-{to}.json` with typed message categories: `info`, `question`, `blocker`, and `handoff`.

**Source:** [Memory Protocol](/architecture#memory-protocol) · `.claude/shared/memory-protocol.md`

### ARCHITECTURAL Track

Development classification for complex or risky work requiring 5–6 agent spawns through multiple review gates. Includes executive review, separate QA test specification, implementation, staff engineer review, and leadership code review. Any [R-rule](#r1–r8-architectural-rules) match triggers this track.

**Source:** [Development Workflow](/workflows) · `.claude/shared/development-workflow.md`

### Artifact Bundle

A pre-computed context payload passed to task agents (QA, Dev) instead of full memory access. Contains **INPUTS** (acceptance criteria, scenarios, standards), **GATE** (success criteria), and **CONSTRAINTS** (technical patterns). Reduces context overhead by ~79% compared to raw memory access.

**Source:** [Development Workflow](/workflows) · `.claude/shared/development-workflow.md`

## B

### Bash Gate

An automated, non-agent quality gate used in MECHANICAL tracks. Verifies that all tests pass, coverage ≥ 99%, total changes stay under limits, and no framework or CI/CD files are modified. No human involvement; purely mechanical validation.

**Source:** [Development Workflow](/workflows) · `.claude/shared/development-workflow.md`

### Boundary Cases

The second test category in [misuse-first](#misuse-first) test ordering. Tests edge conditions such as empty inputs, null values, off-by-one errors, and maximum/minimum values.

**Source:** [TDD Workflow](/workflows#tdd) · `.claude/shared/tdd-workflow.md`

## C

### CAD (Constraint-Driven Agentic Development)

The core workflow framework that builds on test-first principles (TDD/BDD) with artifact bundling, curated context, and classification-driven gating to optimize agent coordination and context efficiency.

**Source:** [Development Workflow](/workflows) · `.claude/shared/development-workflow.md`

### Configuration Over Composition

A design principle that prefers configurable components over deeply nested composed ones. Use config objects to define variations rather than prop drilling through nested component trees.

**Source:** [Engineering Principles](/architecture#engineering-principles) · `.claude/shared/engineering-principles.md`

### Coverage Requirement

All code must achieve 99% test coverage measured across unit tests, integration tests, and combined metrics. Coverage is calculated as (Lines + Branches + Functions + Statements) / 4.

**Source:** [TDD Workflow](/workflows#tdd) · `.claude/shared/tdd-workflow.md`

## D

### Delegation Depth

The nesting level of agent delegation, bounded at a maximum of 3 levels. Each agent increments depth by 1 when delegating. At depth 3, an agent must complete the task locally or escalate — it cannot re-delegate.

**Source:** [Handoff Protocol](/architecture#handoff-protocol) · `.claude/shared/handoff-protocol.md`

### DRY (Don't Repeat Yourself)

A principle requiring that every piece of knowledge has a single, unambiguous representation. If code is written twice, it should be extracted into shared utilities or constants.

**Source:** [Engineering Principles](/architecture#engineering-principles) · `.claude/shared/engineering-principles.md`

### Dual-Specialist Review

A parallel review step triggered in ARCHITECTURAL tracks when a deliverable contains fenced code blocks. Two specialists review simultaneously: a domain specialist validates platform correctness, and a language specialist validates code quality. Both must pass for the work to proceed.

**Source:** [Development Workflow](/workflows) · `.claude/shared/development-workflow.md`

## E

### Escalation vs Consultation

Two distinct agent coordination patterns. **Escalation** transfers task ownership to a delegate, increments the depth counter, and allows re-delegation. **Consultation** requests information only, does not increment depth, and the consultant cannot re-delegate.

**Source:** [Handoff Protocol](/architecture#handoff-protocol) · `.claude/shared/handoff-protocol.md`

## G

### Gate

A quality checkpoint that work must pass through before proceeding to the next stage. Gates verify specific criteria — tests passing, coverage thresholds, architectural compliance — and block progression if criteria are not met.

**Source:** [Development Workflow](/workflows) · `.claude/shared/development-workflow.md`

### Golden Path

The happy-path scenario in [misuse-first](#misuse-first) test ordering. The third and final test category written after misuse and boundary cases, representing normal expected user behavior.

**Source:** [TDD Workflow](/workflows#tdd) · `.claude/shared/tdd-workflow.md`

## H

### Handoff

A structured context transfer between agents following the handoff protocol. Uses an envelope format with routing, chain tracking, task specification, context payload, and a return contract. Enforces minimal context transfer and bounded [delegation depth](#delegation-depth).

**Source:** [Handoff Protocol](/architecture#handoff-protocol) · `.claude/shared/handoff-protocol.md`

### Hybrid Storage Lifecycle

A two-tier storage strategy: during execution, agents write to `.claude/memory/` files for speed; at workstream completion, data syncs to Postgres via `mg-db-sync` for queryable history. Enables fast execution with long-term persistence.

**Source:** [Memory Protocol](/architecture#memory-protocol) · `.claude/shared/memory-protocol.md`

## M

### M1–M5 (Mechanical Rules)

Classification rules that must **all** match for [MECHANICAL](#mechanical-track) track assignment: M1 — all tests pass with coverage ≥ 99%; M2 — under 200 lines changed (500 for single module); M3 — modifications only (no new files except tests); M4 — changes in a single `src/` directory plus tests; M5 — single skill/agent template addition with no framework changes.

**Source:** [Development Workflow](/workflows) · `.claude/shared/development-workflow.md`

### MECHANICAL Track

Development classification for routine, lower-risk work requiring only a single agent spawn. The Dev agent handles the complete test-first cycle (write failing tests, implement, refactor) and passes through an automated [bash gate](#bash-gate) with no leadership review. Approximately 60% of work follows this track.

**Source:** [Development Workflow](/workflows) · `.claude/shared/development-workflow.md`

### Memory Rotation

A size-based cleanup protocol for global memory files. When a file reaches 50 KB, older non-active entries are moved to `.claude/memory/.archive/`, while in-progress workstream entries are preserved. Archives are retained for 30 days.

**Source:** [Memory Protocol](/architecture#memory-protocol) · `.claude/shared/memory-protocol.md`

### Misuse-First

The mandatory test-writing order in TDD cycles: (1) misuse cases — security exploits, injection attacks, auth bypasses; (2) [boundary cases](#boundary-cases) — empty inputs, null values, edge conditions; (3) [golden path](#golden-path) — normal happy-path scenarios. Ensures abuse patterns are caught before validating normal behavior.

**Source:** [TDD Workflow](/workflows#tdd) · `.claude/shared/tdd-workflow.md`

## O

### Output Mode

A flag controlling visual feedback verbosity in agent output. `full` shows all banners and ASCII art; `compact` (default) shows single-line events; `silent` shows errors only. Errors are never suppressed regardless of mode.

**Source:** [Visual Formatting](/architecture) · `.claude/shared/visual-formatting.md`

## R

### R1–R8 (Architectural Rules)

Classification rules where **any** match triggers the [ARCHITECTURAL](#architectural-track) track: R1 — dependency changes; R2 — framework files; R3 — security-sensitive paths; R4 — more than 5 files and 300 lines changed; R5 — new subdirectories; R6 — new projects/workspaces; R7 — CI/CD config changes; R8 — database schema or migration changes.

**Source:** [Development Workflow](/workflows) · `.claude/shared/development-workflow.md`

### Red-Green-Refactor

The three-phase TDD cycle: **Red** — write a failing test; **Green** — write the minimum code to pass; **Refactor** — extract duplication and improve while keeping tests green.

**Source:** [TDD Workflow](/workflows#tdd) · `.claude/shared/tdd-workflow.md`

## S

### State Sync

An automatic process triggered after leadership approval at planning and code review stages. Updates the issue tracker, writes workstream state and decisions to `.claude/memory/`, and produces a handoff report.

**Source:** [Development Workflow](/workflows) · `.claude/shared/development-workflow.md`

## T

### Tier

A context classification level for [artifact bundle](#artifact-bundle) information. Essential context is always included, references point to additional information, and excluded categories explicitly note what was not passed. Helps agents understand context boundaries.

**Source:** [Visual Formatting](/architecture) · `.claude/shared/visual-formatting.md`

## W

### Workstream

A discrete unit of work within an initiative. Each workstream has a unique ID (e.g., WS-1), acceptance criteria, classification ([MECHANICAL](#mechanical-track) or [ARCHITECTURAL](#architectural-track)), dependencies, and priority order. Tracked via Git branches (`feature/ws-{number}-{name}`) and memory files.

**Source:** [Development Workflow](/workflows) · `.claude/shared/development-workflow.md`
