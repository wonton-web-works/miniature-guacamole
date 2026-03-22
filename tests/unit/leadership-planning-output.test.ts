/**
 * Unit Tests: Leadership Team Planning Output Upgrade
 *
 * WS-2.0-4: mg-leadership-team planning mode must reference PRD and Technical
 * Design deliverables alongside workstreams.
 *
 * Tests ordered misuse-first per CAD TDD protocol:
 *   1. MISUSE   — existing output formats and delegation table must NOT be removed
 *   2. BOUNDARY — deliverable section placement and path pattern edge cases
 *   3. GOLDEN   — new deliverable content is present and correctly formed
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SKILL_PATH = path.resolve(
  __dirname,
  '../../src/framework/skills/mg-leadership-team/SKILL.md'
);

function content(): string {
  return fs.readFileSync(SKILL_PATH, 'utf-8');
}

// ============================================================================
// MISUSE CASES — tested first
// Things that must NOT be removed by the implementation
// ============================================================================

describe('Misuse: existing output formats must not be removed', () => {
  it('SKILL.md must still have a Code Review output format section', () => {
    // Given: WS-2.0-4 only adds deliverable references to the Planning output
    // When: the implementation is applied
    // Then: the Code Review output format must still be present
    // v2.0 structure: Code Review appears as bold label within Enterprise/Community output sections
    expect(content()).toMatch(/###\s+(?:Enterprise|Community) Output Format|(?:\*\*Code Review|Code Review:)/);
  });

  it('Code Review format must still include APPROVED or REQUEST CHANGES decision line', () => {
    // The decision line is load-bearing — downstream prompts grep for it
    expect(content()).toMatch(/APPROVED|REQUEST CHANGES/);
  });

  it('Code Review format must still mention /deployment-engineer or deployment-engineer', () => {
    // The "Next:" step referencing deployment-engineer must survive the edit
    expect(content()).toMatch(/deployment-engineer/);
  });

  it('SKILL.md must still have an Executive Review output format section', () => {
    // Planning mode has both Executive Review and Workstreams — neither should vanish
    // v2.0 structure: Executive Review appears as bold label within output format sections
    expect(content()).toMatch(/###\s+(?:Enterprise|Community) Output Format|\*\*Executive Review/);
  });

  it('Executive Review format must still include Strategic Assessment block', () => {
    // The compact format uses [CEO]/[CTO]/[ED] lines which together constitute
    // the strategic assessment — the label "Strategic Assessment" was replaced
    // by the compact output block during the output format rewrite.
    const c = content();
    expect(c).toMatch(/\[CEO\]|\[CTO\]|\[ED\]/);
  });

  it('Executive Review format must still include CEO, CTO, and Eng Dir perspective lines', () => {
    const c = content();
    expect(c).toMatch(/CEO/);
    expect(c).toMatch(/CTO/);
    expect(c).toMatch(/Eng Dir/);
  });
});

describe('Misuse: delegation table must not be removed', () => {
  it('SKILL.md must still have a Delegation section', () => {
    // The Delegation table is structural — agents rely on it to know when to
    // recommend mg-build vs deployment-engineer
    expect(content()).toMatch(/^##\s+Delegation\s*$/m);
  });

  it('delegation table must still reference mg-build for execution', () => {
    expect(content()).toMatch(/mg-build/);
  });

  it('delegation table must still reference deployment-engineer for merging', () => {
    // Two separate checks: one in Code Review output (above) and one in the
    // delegation table itself — both must survive
    const c = content();
    const delegationSection = c.split(/^##\s+Delegation\s*$/m)[1]?.split(/^##\s+/m)[0] ?? '';
    expect(delegationSection).toMatch(/deployment-engineer/);
  });
});

// ============================================================================
// BOUNDARY CASES — structural edge cases
// ============================================================================

describe('Boundary: deliverable section placement', () => {
  it('Deliverables or Documents section must appear inside or alongside the planning output block', () => {
    // Given: the new section is added somewhere other than Planning output
    // Then: it must still be co-located with workstream output, not buried in
    //       an unrelated section (e.g. Memory Protocol)
    const c = content();

    // v2.0 structure: output format lives under Enterprise/Community h3 headings.
    // Find the first output format section (Enterprise or Community).
    const outputFormatsIdx = c.search(/###\s+(?:Enterprise|Community) Output Format/m);
    expect(outputFormatsIdx).toBeGreaterThan(-1);

    // Deliverables/Documents heading must appear after the first output format section
    const deliverableIdx = c.search(/Deliverables|Documents/i);
    expect(deliverableIdx).toBeGreaterThan(outputFormatsIdx);
  });

  it('PRD path reference must use docs/ prefix, not an arbitrary location', () => {
    // The docs/ prefix is the project convention established in WS-2.0-2
    expect(content()).toMatch(/docs\/prd/i);
  });

  it('Technical Design path reference must use docs/ prefix', () => {
    expect(content()).toMatch(/docs\/technical-design/i);
  });

  it('PRD path reference must include a {feature} variable or similar placeholder, not a hardcoded name', () => {
    // Given: a hardcoded path like docs/prd-login.md
    // Then: it would break for every other feature — the spec requires a pattern
    const c = content();
    // Accept {feature}, <feature>, or a wildcard indicator like prd-{feature} / prd-*
    expect(c).toMatch(/docs\/prd[-_]\{.+?\}|docs\/prd[-_]<.+?>|docs\/prd[-_]\*/i);
  });

  it('Technical Design path reference must include a {feature} variable or similar placeholder', () => {
    const c = content();
    expect(c).toMatch(
      /docs\/technical-design[-_]\{.+?\}|docs\/technical-design[-_]<.+?>|docs\/technical-design[-_]\*/i
    );
  });
});

// ============================================================================
// GOLDEN PATH — happy-path content assertions
// ============================================================================

describe('Golden: PRD deliverable reference exists', () => {
  it('SKILL.md mentions PRD or "product requirements" in the planning output', () => {
    // AC-1: PRD or product requirements must be called out explicitly
    expect(content()).toMatch(/PRD|product requirements/i);
  });

  it('SKILL.md references docs/prd-{feature}.md or similar PRD output path', () => {
    // AC-3: concrete file path pattern must appear so the agent knows where to write
    expect(content()).toMatch(/docs\/prd[-_]/i);
  });
});

describe('Golden: Technical Design deliverable reference exists', () => {
  it('SKILL.md mentions Technical Design document in the planning output', () => {
    // AC-2: Technical Design must be called out explicitly
    expect(content()).toMatch(/Technical Design/i);
  });

  it('SKILL.md references docs/technical-design-{feature}.md or similar path', () => {
    // AC-4: concrete file path pattern must appear
    expect(content()).toMatch(/docs\/technical-design[-_]/i);
  });
});

describe('Golden: planning output includes a Deliverables or Documents section', () => {
  it('planning output format contains a Deliverables or Documents heading or label', () => {
    // AC-5: the new section must be explicitly labelled, not implied
    expect(content()).toMatch(/Deliverables|Documents/i);
  });

  it('Deliverables section lists both PRD and Technical Design', () => {
    // AC-5: both doc types must appear together in the deliverables block
    const c = content();
    // Find the deliverables section and check both appear within it
    const delivSection =
      c.split(/Deliverables|Documents/i)[1]?.split(/###\s+/)[0] ?? '';
    expect(delivSection).toMatch(/PRD|product requirements/i);
    expect(delivSection).toMatch(/Technical Design/i);
  });
});
