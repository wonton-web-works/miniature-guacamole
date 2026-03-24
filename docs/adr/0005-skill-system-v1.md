# ADR-0005: Skill System v1.0

**Status**: Accepted
**Date**: 2026-02-10
**Deciders**: CEO, CTO, Engineering Director, Staff Engineer

## Context

The original skill system had inconsistent naming (some prefixed, some not), two overlapping skills (`engineering-team` and `implement`), no spawn limits, and no clear path for composition. We needed a clean v1.0 that established conventions before the public release.

## Decision

Seven sub-decisions (ADR-SKILL-01 through 07):

**ADR-SKILL-01: Prompt-Only Implementation**
Skills are SKILL.md files only — no runtime code changes. The skill system is purely prompt-driven.

**ADR-SKILL-02: mg- Prefix**
All 16 skills use the `mg-` prefix. Provides namespace clarity and prevents collisions with user-defined skills.

**ADR-SKILL-03: Hard Cutover**
No backwards-compatibility aliases. Old skill names removed entirely. Clean break.

**ADR-SKILL-04: Prompt-Based Chaining**
No composition primitive at v1.0. Skills chain via prompt instructions, not a runtime mechanism. Deferred: `mg-run-skill` CLI, implicit escalation, composition syntax.

**ADR-SKILL-05: Spawn Cap of 6**
Maximum 6 agents per skill invocation, enforced in frontmatter. Prevents runaway agent spawning.

**ADR-SKILL-06: Merge into mg-build**
`engineering-team` + `implement` merged into single `mg-build` skill. Both old directories deleted.

**ADR-SKILL-07: New Skills and Deferrals**
Added: `mg-debug` (6 principles, Constitution format), `mg-refactor` (6 principles, Constitution format).
Deferred: `mg-deploy` (needs composition primitive), `mg-qa` (redundant with mg-build Step 1).

**Final skill list (16):**
mg-build, mg-spec, mg-design, mg-document, mg-write, mg-code-review, mg-design-review, mg-security-review, mg-accessibility-review, mg-assess, mg-assess-tech, mg-init, mg-add-context, mg-debug, mg-refactor, mg

## Consequences

**Positive:**
- Consistent naming across all skills
- Clean namespace prevents collisions
- Spawn cap prevents resource exhaustion
- Two new skills (debug, refactor) fill real workflow gaps
- Zero regressions from rename (2684/2859 tests passing, 93.9% — all failures pre-existing)

**Negative:**
- Hard cutover means any existing automation referencing old names breaks immediately
- No composition primitive limits multi-skill workflows to manual chaining
- Deferred skills (mg-deploy, mg-qa) leave gaps in the workflow

## References

- ADR-SKILL-01 through 07 (`.claude/memory/agent-leadership-decisions.json`)
- WS-SKILLS workstreams (`.claude/memory/workstream-WS-SKILLS-state.json`)
- Deferred items (`.claude/memory/deferred-v1-follow-ups.json`)
- Leadership approvals: Staff Engineer (Gate 4B), CEO, CTO, Eng Director — all PASS
- Commit: `a70029c`
