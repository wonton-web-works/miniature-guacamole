/**
 * Unit Tests: Brand Kit Template + mg-design Wireframe Capability
 *
 * WS-2.0-3: Brand kit template and wireframe output capability for mg-design.
 *
 * Tests are ordered misuse-first per CAD TDD protocol:
 *   1. MISUSE   — things that must NOT be present (filler tokens, lazy placeholders)
 *   2. BOUNDARY — structural edge cases (section independence, path specificity)
 *   3. GOLDEN   — happy-path content assertions (required sections and references)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC_SKILLS = path.resolve(__dirname, '../../src/framework/skills');

const BRAND_KIT_TEMPLATE = path.join(SRC_SKILLS, 'mg-design', 'references', 'brand-kit-template.md');
const MG_DESIGN_SKILL    = path.join(SRC_SKILLS, 'mg-design', 'SKILL.md');

// ============================================================================
// MISUSE CASES — tested first
// What must NOT be in the files
// ============================================================================

describe('Misuse: brand-kit-template.md must not contain filler tokens', () => {
  it('file must exist before misuse checks can run', () => {
    // Root guard — every subsequent test in this block depends on the file existing.
    // This test will fail (correctly) until the file is created.
    expect(fs.existsSync(BRAND_KIT_TEMPLATE)).toBe(true);
  });

  it('must not contain [INSERT…] placeholder tokens', () => {
    // Given: an agent or dev copies the template into a project
    // When: they use it as-is
    // Then: "[INSERT…]" tokens must not appear — they provide no guidance and pollute output docs
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    expect(content).not.toMatch(/\[INSERT/i);
  });

  it('must not contain [TBD] placeholder tokens', () => {
    // [TBD] is a lazy placeholder that signals deferred work with no actionable guidance
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    expect(content).not.toMatch(/\[TBD\]/i);
  });

  it('must not contain Lorem ipsum filler text', () => {
    // Lorem ipsum must never appear in a production template — it signals copy-paste from a
    // generic boilerplate and provides no brand-specific guidance whatsoever
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    expect(content).not.toMatch(/lorem\s+ipsum/i);
  });
});

describe('Misuse: mg-design SKILL.md must not describe brand-kit output landing outside docs/', () => {
  it('brand kit output path must use docs/ prefix, not a generic or root path', () => {
    // Given: a dev reads the skill to understand where output files land
    // When: they follow the SKILL.md instructions
    // Then: the brand kit file must land in docs/, not at the project root or in .claude/
    //
    // This catches the misuse of writing brand-kit.md to the project root or to memory/
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');

    // Must reference docs/ for the brand kit output
    expect(content).toMatch(/docs\//);

    // Must NOT describe brand-kit output as going to a non-docs root path like ./brand-kit.md
    const hasBareRootPath = /output[^.]*\.\s*\/brand-kit\.md(?!\s*or\s*docs)/i.test(content);
    expect(hasBareRootPath).toBe(false);
  });

  it('wireframe output path must use docs/wireframes/ or app/wireframes/, not root', () => {
    // Wireframes landing at the project root is a misuse — they belong in a designated output dir
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');

    // Must reference a wireframes/ subdirectory
    expect(content).toMatch(/wireframes\//);

    // Must NOT describe wireframes output as going to project root
    const hasBareRootWireframe = /output[^.]*\.\s*\/wireframes?\b(?!\/)/i.test(content);
    expect(hasBareRootWireframe).toBe(false);
  });
});

// ============================================================================
// BOUNDARY CASES — structural edge cases
// ============================================================================

describe('Boundary: brand-kit-template.md — each major section must be a distinct heading', () => {
  it('Color Tokens must be a standalone heading, not a sub-bullet inside another section', () => {
    // If Color Tokens is buried as a bullet point, agents may not parse it as a section boundary.
    // It needs to be a first- or second-level markdown heading.
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    expect(content).toMatch(/^#{1,3}\s+Color Tokens?\s*$/m);
  });

  it('Typography must be a standalone heading, not a sub-bullet inside another section', () => {
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    expect(content).toMatch(/^#{1,3}\s+Typography\s*$/m);
  });

  it('Voice and Tone must be a standalone heading', () => {
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    expect(content).toMatch(/^#{1,3}\s+Voice\s+(and|&)\s+Tone\s*$/m);
  });

  it('Component Patterns must be a standalone heading', () => {
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    expect(content).toMatch(/^#{1,3}\s+Component Patterns?\s*$/m);
  });

  it('Color Tokens section must include guidance for both hex values and semantic names', () => {
    // A color token with only a hex value (no semantic name) gives agents nothing to work with.
    // A semantic name with no hex is incomplete for implementation.
    // The section must guide authors to supply both.
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    const colorSection = content.split(/^#{1,3}\s+Color Tokens?\s*$/m)[1]?.split(/^#{1,3}\s+/m)[0] ?? '';
    expect(colorSection).toMatch(/#[0-9a-fA-F]{3,6}|hex/i);        // hex guidance
    expect(colorSection).toMatch(/primary|surface|ink|semantic/i);  // semantic name guidance
  });

  it('Typography section must address both font stack and size/weight guidance', () => {
    // A Typography section that only lists font names gives no sizing or weight direction.
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    const typoSection = content.split(/^#{1,3}\s+Typography\s*$/m)[1]?.split(/^#{1,3}\s+/m)[0] ?? '';
    expect(typoSection).toMatch(/font.?stack|font.?famil|typeface/i);  // stack
    expect(typoSection).toMatch(/size|weight|rem|px/i);                 // sizing or weight
  });
});

describe('Boundary: brand-kit-template.md — accessibility guidance must be findable without reading every section', () => {
  it('WCAG or contrast guidance must appear somewhere in the template (not just implicit)', () => {
    // WCAG accessibility is a constitutional requirement of mg-design ("WCAG AA minimum, no exceptions").
    // The brand kit template must make this explicit — an agent or dev cannot be expected to
    // infer the requirement from the SKILL.md alone.
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    expect(content).toMatch(/wcag|contrast ratio|accessibility/i);
  });
});

describe('Boundary: mg-design SKILL.md — brand mode trigger must be unambiguous', () => {
  it('brand mode trigger must mention both --brand flag and the word "brand" as a trigger', () => {
    // If only --brand is documented, natural-language prompts like "create a brand kit" would
    // not reliably activate brand mode. Both triggers must be present.
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');
    expect(content).toMatch(/--brand/);
    expect(content).toMatch(/\bbrand\b/i);
  });
});

// ============================================================================
// GOLDEN PATH — happy-path content assertions
// ============================================================================

describe('Golden: brand-kit-template.md — file exists with all required sections', () => {
  it('file exists at the expected path', () => {
    expect(fs.existsSync(BRAND_KIT_TEMPLATE)).toBe(true);
  });

  it('contains a Color Tokens section', () => {
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    expect(content).toMatch(/color tokens?/i);
  });

  it('contains a Typography section', () => {
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    expect(content).toMatch(/typography/i);
  });

  it('contains a Voice and Tone section', () => {
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    expect(content).toMatch(/voice\s+(and|&)\s+tone/i);
  });

  it('contains a Component Patterns section', () => {
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    expect(content).toMatch(/component patterns?/i);
  });

  it('contains WCAG or contrast accessibility guidance', () => {
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    expect(content).toMatch(/wcag|contrast ratio|accessibility/i);
  });

  it('uses descriptive guidance prose (not bare label stubs)', () => {
    // Good: "Define your primary color with a hex value and semantic usage note."
    // Bad: "[Color]"
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    expect(content.length).toBeGreaterThan(600);
    expect(content).toMatch(/define|describe|specify|use|example|guidance/i);
  });
});

describe('Golden: mg-design SKILL.md — brand kit mode references added', () => {
  it('references brand-kit-template.md or references/brand-kit', () => {
    // AC-9: skill must reference the template so agents know where the definition lives
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');
    expect(content).toMatch(/brand-kit-template(\.md)?|references\/brand-kit/i);
  });

  it('describes a brand kit mode triggered by --brand or "brand" in prompt', () => {
    // AC-10: mode must be explicitly described so the agent knows when to activate it
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');
    expect(content).toMatch(/brand kit mode|--brand|\bbrand\b.{0,40}mode/i);
  });

  it('describes brand kit output path in docs/', () => {
    // AC-11: output must land in docs/ (e.g. docs/brand-kit.md)
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');
    expect(content).toMatch(/docs\/brand-kit/i);
  });

  it('describes wireframe output capability to docs/wireframes/ or app/wireframes/', () => {
    // AC-12: wireframe output location must be documented
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');
    expect(content).toMatch(/(?:docs|app)\/wireframes\//i);
  });

  it('mentions art-director reviews the brand kit', () => {
    // AC-13: art-director sign-off is a constitutional requirement
    // The brand kit flow must make this explicit, not leave it implicit
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');
    expect(content).toMatch(/art-director/i);
  });

  it('mentions design agent produces wireframes', () => {
    // AC-14: wire framing is delegated to the design agent, not done by the orchestrator
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');
    // Must mention both "design" (agent) and "wireframe" in the same document
    expect(content).toMatch(/\bdesign\b/i);
    expect(content).toMatch(/wireframe/i);
  });
});
