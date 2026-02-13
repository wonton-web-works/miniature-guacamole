# ADR-0004: Config Over Composition

**Status**: Accepted
**Date**: 2025-12-15
**Deciders**: CTO

## Context

We needed a consistent pattern for component design across the framework. The two main approaches:

1. **Inheritance/composition** — extend base classes, compose behaviors via mixins
2. **Configuration objects** — pass config objects that control behavior at runtime

Composition-heavy designs tend to create deep hierarchies, tight coupling, and make testing harder. Configuration-driven designs are flatter, more explicit, and easier to reconfigure at runtime.

## Decision

Prefer configuration objects over inheritance and composition patterns.

- Components accept config objects that control their behavior
- Runtime flexibility over compile-time type hierarchies
- Clearer dependency management — config objects are explicit about what they need
- Easier testing — swap config, not class hierarchies

**Exception:** Type-safe polymorphism is acceptable for security-critical code paths where the type system provides safety guarantees that config objects can't.

## Consequences

**Positive:**
- Flatter, more readable component designs
- Runtime reconfiguration without code changes
- Simpler testing — inject different configs
- Reduced coupling between components

**Negative:**
- Config objects can become large and untyped without discipline
- Loses some compile-time safety that type hierarchies provide
- Developers familiar with OOP patterns may need adjustment

## References

- ARCH-003 (`.claude/memory/architecture-decisions.json`)
