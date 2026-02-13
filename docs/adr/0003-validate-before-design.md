# ADR-0003: Validate Before Design

**Status**: Accepted
**Date**: 2026-02-04
**Deciders**: CTO

## Context

The SPIKE-UXPILOT false negative showed that our spike research process lacked rigor. A researcher declared an API didn't exist without performing a single web search. The team then designed features around this incorrect conclusion, wasting significant effort.

We needed a structured validation process that prevents false negatives and ensures external dependencies are verified before any design work begins.

## Decision

Two-tier spike research with mandatory validation:

**Tier 1 (Internal):** Codebase, CLI, file system — no web search required.

**Tier 2 (External):** APIs, services, libraries — WebSearch is **mandatory**.
- Minimum 3 search queries per dependency
- Critical items must check: official docs, API docs, package registry
- Minimum 3 name variations before declaring "does not exist"
- Evidence documentation required: search query, source, result count, timestamp

**Quality gates:**
- Every spike must evaluate minimum 3 alternatives with structured pros/cons/cost/timeline (STD-003)
- Before declaring a tool "does not exist," execute minimum 3 WebSearch queries returning no results (STD-004)
- No exceptions to negative result verification

## Consequences

**Positive:**
- Eliminates false-negative dependency assessments
- Creates audit trail for dependency decisions
- Forces structured comparison of alternatives
- Catches "it doesn't exist" mistakes before they waste design time

**Negative:**
- Spikes take longer (mandatory search overhead)
- More documentation per spike
- Overhead may feel excessive for well-known tools (mitigated by Tier 1/2 split)

## References

- ARCH-002 (`.claude/memory/architecture-decisions.json`)
- DEC-001: Spike Research Quality Improvement
- STD-002: External Dependency Validation (`.claude/memory/technical-standards.json`)
- STD-003: Minimum 3 Alternatives
- STD-004: Negative Result Verification
- Related: [ADR-0002](0002-zero-dependency-preference.md) (Zero-Dependency Preference)
