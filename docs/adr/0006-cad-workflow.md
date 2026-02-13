# ADR-0006: CAD Workflow

**Status**: Accepted
**Date**: 2026-02-10
**Deciders**: CTO, Staff Engineer

## Context

The original development workflow spawned agents with full context (75K tokens per task agent), resulting in poor signal-to-noise (0.56) and wasted retrieval accuracy. Every agent got everything — decisions, standards, historical context — regardless of whether it was relevant to their specific task.

We also lacked a way to mechanically verify simple workstreams without burning a full staff-engineer review cycle.

## Decision

Four changes, implemented across WS-CAD-0 through WS-CAD-3:

### WS-CAD-0: Misuse-First TDD Ordering

Tests must follow this order: misuse cases first, then boundary cases, then golden path. This catches security and edge-case issues before the happy path is even written.

### WS-CAD-1: Artifact Bundles

Task agents (qa, dev) receive pre-computed artifact bundles instead of raw memory:
- **INPUTS**: Only the files and context relevant to this specific task
- **GATE**: The specific quality gate this agent must pass
- **CONSTRAINTS**: Applicable standards and decisions (3-5 max)

Coordination agents (cto, staff-engineer, engineering-manager) keep full context access. They're stateful role simulators, not task executors — constraining their context would break their ability to reason across the system.

### WS-CAD-2: Curated Context Protocol

The orchestrator reads all memory but passes only a relevant subset to task agents:
- qa agents: ~8K token budget
- dev agents: ~12K token budget
- staff-engineer: full access (no budget)

Context selection: 3-5 relevant decisions, applicable standards only.

### WS-CAD-3: Mechanical Gates

Workstreams are classified as MECHANICAL or ARCHITECTURAL using validated rules:

**ARCHITECTURAL (R1-R8):**
- R1: package.json changes
- R2: Framework file modifications
- R3: Security-sensitive paths
- R4: >5 files AND >300 lines (exception: same-module changes)
- R5: New subdirectories
- R6: New projects
- R7: CI/CD file changes
- R8: (reserved)

**MECHANICAL (M1-M5):**
- M1: Tests pass with 99% coverage
- M2: <200 lines changed (<500 if single-module)
- M3: Modifications only (no new files outside tests)
- M4: Single src/ directory + tests/
- M5: Single skill/agent template additions

**Conservative bias:** UNCERTAIN defaults to ARCHITECTURAL.

MECHANICAL workstreams get bash-based gate verification (no staff-engineer spawn). ARCHITECTURAL workstreams get full staff-engineer review. Classification rules validated at 100% accuracy on 38 historical workstreams.

## Consequences

**Positive:**
- Context reduction: 75K → 16K tokens per task agent (79% reduction)
- Signal-to-noise: 0.56 → 9.0 (16x improvement)
- Retrieval accuracy: +5-10% from same models
- Mechanical verification: 60% → 85%
- Eliminates 1 full agent spawn per MECHANICAL workstream
- Coverage requirement stays at 99%

**Negative:**
- Orchestrator now has more responsibility (context curation)
- Misclassification risk (mitigated by conservative bias toward ARCHITECTURAL)
- Mechanical gates need parallel-run validation on next 3-5 live workstreams

## References

- WS-CAD-0 through WS-CAD-3 (MEMORY.md)
- `~/.claude/shared/tdd-workflow.md` — misuse-first ordering
- `~/.claude/shared/development-workflow.md` — artifact bundles, classification, conditional gates
- `~/.claude/skills/engineering-team/SKILL.md` — artifact bundle prompts
