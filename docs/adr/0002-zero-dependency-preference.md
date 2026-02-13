# ADR-0002: Zero-Dependency Preference

**Status**: Accepted
**Date**: 2026-02-04
**Deciders**: CTO

## Context

During SPIKE-UXPILOT, a spike researcher reported that "UX Pilot does not exist" without actually performing a web search to verify. The team spent 4 hours of engineering time and 2 hours of leadership time designing around a non-existent API before discovering the false negative. This exposed two problems: our validation process was weak, and we were reaching for external dependencies too eagerly.

## Decision

Prefer code-based solutions over external dependencies. External APIs require explicit CTO approval before integration.

**Exceptions** (pre-approved categories):
- Payment processing (Stripe, PayPal)
- Identity verification
- Maps/geolocation
- AI/ML models

Everything else — build it. External APIs introduce availability risk, cost uncertainty, rate limits, vendor lock-in, and data privacy concerns that code-based solutions avoid entirely.

## Consequences

**Positive:**
- Eliminates vendor lock-in for non-critical integrations
- Reduces attack surface and data privacy exposure
- No surprise costs from API rate limits or pricing changes
- Full control over behavior and reliability

**Negative:**
- Higher upfront engineering effort for capabilities that APIs could provide
- Need to maintain solutions that vendors would otherwise maintain
- CTO approval gate could slow down teams (mitigated by pre-approved categories)

## References

- ARCH-001 (`.claude/memory/architecture-decisions.json`)
- DEC-001: Spike Research Quality Improvement (`.claude/memory/architecture-decisions.json`)
- SPIKE-UXPILOT incident: false negative, 6+ hours wasted
- Related: [ADR-0003](0003-validate-before-design.md) (Validate Before Design)
