/**
 * Unit Tests: PRD + Technical Design Document Templates
 *
 * WS-2.0-2: Document templates for mg-spec and mg-assess-tech skills.
 *
 * Tests are ordered misuse-first per CAD TDD protocol:
 *   1. MISUSE   — things that must NOT be present (filler, hallucinated data)
 *   2. BOUNDARY — structural edge cases and optional-but-required fields
 *   3. GOLDEN   — happy-path content assertions
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC_SKILLS = path.resolve(__dirname, '../../src/framework/skills');

const PRD_TEMPLATE      = path.join(SRC_SKILLS, 'mg-spec',       'references', 'prd-template.md');
const TECH_DESIGN_TMPL  = path.join(SRC_SKILLS, 'mg-assess-tech', 'references', 'technical-design-template.md');
const MG_SPEC_SKILL     = path.join(SRC_SKILLS, 'mg-spec',       'SKILL.md');
const MG_ASSESS_SKILL   = path.join(SRC_SKILLS, 'mg-assess-tech', 'SKILL.md');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readIfExists(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

// ============================================================================
// MISUSE CASES — tested first
// What must NOT be in the files
// ============================================================================

describe('Misuse: prd-template.md must not contain filler patterns', () => {
  it('file must exist before misuse checks can run', () => {
    // This is the root guard — every test in this block depends on the file existing.
    expect(fs.existsSync(PRD_TEMPLATE)).toBe(true);
  });

  it('must not contain [INSERT…] placeholder tokens', () => {
    // Given: dev or agent follows the template
    // When: they copy it verbatim
    // Then: no "[INSERT…]" tokens should leak into output docs
    const content = fs.readFileSync(PRD_TEMPLATE, 'utf-8');
    expect(content).not.toMatch(/\[INSERT/i);
  });

  it('must not contain Lorem ipsum filler text', () => {
    const content = fs.readFileSync(PRD_TEMPLATE, 'utf-8');
    expect(content).not.toMatch(/lorem\s+ipsum/i);
  });

  it('must not contain [TBD] placeholder tokens', () => {
    // [TBD] is a lazy placeholder that provides no guidance to the author
    const content = fs.readFileSync(PRD_TEMPLATE, 'utf-8');
    expect(content).not.toMatch(/\[TBD\]/i);
  });

  it('must not present financial figures as agent-generated facts', () => {
    // Given: agent is filling out the Business Case section
    // Then: any revenue/cost numbers must be attributed to user input, not
    //       invented by the model — the template must make this explicit
    const content = fs.readFileSync(PRD_TEMPLATE, 'utf-8');

    // The template must NOT contain bare fabricated figures like "$1M revenue"
    // with no qualification. We check that revenue/cost mentions are accompanied
    // by a user-attribution qualifier.
    const hasBareFinancialClaim = /\$\d[\d,]*[KMB]?\s+(?:revenue|savings|cost|ARR)/i.test(content);
    expect(hasBareFinancialClaim).toBe(false);
  });
});

describe('Misuse: technical-design-template.md must not contain filler patterns', () => {
  it('file must exist before misuse checks can run', () => {
    expect(fs.existsSync(TECH_DESIGN_TMPL)).toBe(true);
  });

  it('must not contain [INSERT…] placeholder tokens', () => {
    const content = fs.readFileSync(TECH_DESIGN_TMPL, 'utf-8');
    expect(content).not.toMatch(/\[INSERT/i);
  });

  it('must not contain Lorem ipsum filler text', () => {
    const content = fs.readFileSync(TECH_DESIGN_TMPL, 'utf-8');
    expect(content).not.toMatch(/lorem\s+ipsum/i);
  });

  it('must not contain [TBD] placeholder tokens', () => {
    const content = fs.readFileSync(TECH_DESIGN_TMPL, 'utf-8');
    expect(content).not.toMatch(/\[TBD\]/i);
  });
});

describe('Misuse: mg-spec SKILL.md must not claim to fabricate financial data', () => {
  it('SKILL.md must not say it generates or produces financial projections independently', () => {
    // Given: the skill description is read by a user
    // Then: it must not imply the agent autonomously generates revenue/cost figures
    // (it must gate on user-provided data)
    const content = fs.readFileSync(MG_SPEC_SKILL, 'utf-8');

    // Patterns that would imply autonomous financial fabrication
    const impliesAutonomousFinancials =
      /generates?\s+(financial|revenue|cost|ROI)\s+(projections?|data|estimates?)/i.test(content);
    expect(impliesAutonomousFinancials).toBe(false);
  });
});

// ============================================================================
// BOUNDARY CASES — edge conditions
// ============================================================================

describe('Boundary: prd-template.md structural edge cases', () => {
  it('Business Case section must include a financial disclaimer phrase', () => {
    // Given: a user fills in the Business Case with real numbers
    // Then: the template text itself must remind them (or the agent) that
    //       financials are user-provided, not independently verified
    const content = fs.readFileSync(PRD_TEMPLATE, 'utf-8');
    expect(content).toMatch(
      /user.{0,30}(provid|suppli|input)|not independently verified|data provided by user/i
    );
  });

  it('Business Case section must be a distinct heading, not buried in another section', () => {
    // The section needs to be independently discoverable, not a sub-bullet
    const content = fs.readFileSync(PRD_TEMPLATE, 'utf-8');
    expect(content).toMatch(/^#+\s+Business Case\s*$/m);
  });

  it('User Stories section must use the "As a … I want … so that …" sentence pattern', () => {
    // This enforces the canonical story format, not just a heading
    const content = fs.readFileSync(PRD_TEMPLATE, 'utf-8');
    expect(content).toMatch(/as a .+ i want .+ so that/i);
  });

  it('Acceptance Criteria section must use a checklist-style format (- [ ])', () => {
    // Acceptance criteria must be machine-parseable checkbox items
    const content = fs.readFileSync(PRD_TEMPLATE, 'utf-8');
    expect(content).toMatch(/- \[ \]/);
  });
});

describe('Boundary: technical-design-template.md structural edge cases', () => {
  it('Approaches Evaluated section must describe at least two distinct options', () => {
    // Given: a single-option design doc
    // Then: the template must make clear that multiple approaches must be documented
    const content = fs.readFileSync(TECH_DESIGN_TMPL, 'utf-8');

    // At minimum the template should reference comparing/evaluating options (plural)
    expect(content).toMatch(/option[s]?|approach[es]?|alternative[s]?/i);

    // And show a numbered or bulleted multi-item pattern
    const approachSection = content.split(/^#+\s+Approaches Evaluated\s*$/m)[1]?.split(/^#+\s+/m)[0] ?? '';
    expect(approachSection).toBeTruthy();
    // Should contain at least two list items or numbered entries
    const items = approachSection.match(/^[-*\d][\.\s]/gm) ?? [];
    expect(items.length).toBeGreaterThanOrEqual(2);
  });

  it('each approach must show both pros and cons (or trade-offs)', () => {
    const content = fs.readFileSync(TECH_DESIGN_TMPL, 'utf-8');
    expect(content).toMatch(/pros?|advantage/i);
    expect(content).toMatch(/cons?|disadvantage|trade.?off/i);
  });

  it('Implementation Plan section must be a distinct heading', () => {
    const content = fs.readFileSync(TECH_DESIGN_TMPL, 'utf-8');
    expect(content).toMatch(/^#+\s+Implementation Plan\s*$/m);
  });
});

describe('Boundary: SKILL.md doc-output patterns reference the correct path pattern', () => {
  it('mg-spec SKILL.md output path uses docs/ prefix', () => {
    // The path must be docs/ not some other arbitrary location
    const content = fs.readFileSync(MG_SPEC_SKILL, 'utf-8');
    expect(content).toMatch(/docs\//);
  });

  it('mg-assess-tech SKILL.md output path uses docs/ prefix', () => {
    const content = fs.readFileSync(MG_ASSESS_SKILL, 'utf-8');
    expect(content).toMatch(/docs\//);
  });
});

// ============================================================================
// GOLDEN PATH — happy-path content assertions
// ============================================================================

describe('Golden: prd-template.md — required sections exist', () => {
  it('contains Problem section', () => {
    const content = fs.readFileSync(PRD_TEMPLATE, 'utf-8');
    expect(content).toMatch(/^#+\s+Problem\b/m);
  });

  it('contains Users section', () => {
    const content = fs.readFileSync(PRD_TEMPLATE, 'utf-8');
    expect(content).toMatch(/^#+\s+Users?\b/m);
  });

  it('contains Success Criteria section', () => {
    const content = fs.readFileSync(PRD_TEMPLATE, 'utf-8');
    expect(content).toMatch(/^#+\s+Success Criteria\s*$/m);
  });

  it('contains User Stories section', () => {
    const content = fs.readFileSync(PRD_TEMPLATE, 'utf-8');
    expect(content).toMatch(/^#+\s+User Stories\s*$/m);
  });

  it('contains Acceptance Criteria section', () => {
    const content = fs.readFileSync(PRD_TEMPLATE, 'utf-8');
    expect(content).toMatch(/^#+\s+Acceptance Criteria\s*$/m);
  });

  it('contains Design Requirements section', () => {
    const content = fs.readFileSync(PRD_TEMPLATE, 'utf-8');
    expect(content).toMatch(/^#+\s+Design Requirements\s*$/m);
  });

  it('contains Business Case section', () => {
    const content = fs.readFileSync(PRD_TEMPLATE, 'utf-8');
    expect(content).toMatch(/^#+\s+Business Case\s*$/m);
  });

  it('uses descriptive guidance prose, not bare label placeholders', () => {
    // Good: "Describe the problem users are facing…"
    // Bad: "[Problem description]"
    const content = fs.readFileSync(PRD_TEMPLATE, 'utf-8');
    // Each section should have at least some explanatory text beyond its heading
    expect(content.length).toBeGreaterThan(500);
    expect(content).toMatch(/describe|explain|list|specify|provide/i);
  });
});

describe('Golden: technical-design-template.md — required sections exist', () => {
  it('contains Problem Statement section', () => {
    const content = fs.readFileSync(TECH_DESIGN_TMPL, 'utf-8');
    expect(content).toMatch(/^#+\s+Problem Statement\s*$/m);
  });

  it('contains Approaches Evaluated section', () => {
    const content = fs.readFileSync(TECH_DESIGN_TMPL, 'utf-8');
    expect(content).toMatch(/^#+\s+Approaches Evaluated\s*$/m);
  });

  it('contains Selected Approach section', () => {
    const content = fs.readFileSync(TECH_DESIGN_TMPL, 'utf-8');
    expect(content).toMatch(/^#+\s+Selected Approach\s*$/m);
  });

  it('contains Risk Mitigation section', () => {
    const content = fs.readFileSync(TECH_DESIGN_TMPL, 'utf-8');
    expect(content).toMatch(/^#+\s+Risk Mitigation\s*$/m);
  });

  it('contains Implementation Plan section', () => {
    const content = fs.readFileSync(TECH_DESIGN_TMPL, 'utf-8');
    expect(content).toMatch(/^#+\s+Implementation Plan\s*$/m);
  });

  it('uses descriptive guidance prose, not bare label placeholders', () => {
    const content = fs.readFileSync(TECH_DESIGN_TMPL, 'utf-8');
    expect(content.length).toBeGreaterThan(400);
    expect(content).toMatch(/describe|explain|list|consider|document/i);
  });
});

describe('Golden: mg-spec SKILL.md — doc output references added', () => {
  it('references prd-template.md or references/prd-template', () => {
    // AC-9: skill must reference the template file
    const content = fs.readFileSync(MG_SPEC_SKILL, 'utf-8');
    expect(content).toMatch(/prd-template(\.md)?|references\/prd-template/i);
  });

  it('describes output path as docs/prd-{feature}.md or similar pattern', () => {
    // AC-10: skill must describe where the PRD doc lands
    const content = fs.readFileSync(MG_SPEC_SKILL, 'utf-8');
    expect(content).toMatch(/docs\/prd[-_]/i);
  });

  it('financial data is gated on user-provided input', () => {
    // AC-11: must state that financial figures come from the user, not the agent
    const content = fs.readFileSync(MG_SPEC_SKILL, 'utf-8');
    expect(content).toMatch(
      /financial.{0,60}(user.{0,20}provid|not.{0,20}fabricat|user.{0,20}input)|user.{0,30}financial/i
    );
  });
});

describe('Golden: mg-assess-tech SKILL.md — doc output references added', () => {
  it('references technical-design-template.md or references/technical-design', () => {
    // AC-12: skill must reference the template file
    const content = fs.readFileSync(MG_ASSESS_SKILL, 'utf-8');
    expect(content).toMatch(/technical-design-template(\.md)?|references\/technical-design/i);
  });

  it('describes output path as docs/technical-design-{feature}.md or similar pattern', () => {
    // AC-13: skill must describe where the technical design doc lands
    const content = fs.readFileSync(MG_ASSESS_SKILL, 'utf-8');
    expect(content).toMatch(/docs\/technical-design[-_]/i);
  });
});
