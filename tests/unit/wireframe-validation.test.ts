/**
 * Unit Tests: mg-design Wireframe Generation Validation
 *
 * Issue #5: Validates that mg-design SKILL.md and brand-kit-template.md
 * properly describe the wireframe generation workflow in enough detail for
 * a dev agent to follow without ambiguity.
 *
 * Tests are ordered misuse-first per CAD TDD protocol:
 *   1. MISUSE   — things that must NOT happen (ad-hoc colors, root landing, skipped review)
 *   2. BOUNDARY — edge cases (both output paths valid, format explicitly described)
 *   3. GOLDEN   — complete happy-path assertions (format, tokens, review, benchmark)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC_SKILLS = path.resolve(__dirname, '../../src/framework/skills');

const MG_DESIGN_SKILL    = path.join(SRC_SKILLS, 'mg-design', 'SKILL.md');
const BRAND_KIT_TEMPLATE = path.join(SRC_SKILLS, 'mg-design', 'references', 'brand-kit-template.md');

// ============================================================================
// MISUSE CASES — tested first
// What the skill must explicitly prohibit or prevent through clear guidance
// ============================================================================

describe('Misuse: wireframes must not use ad-hoc color or font choices', () => {
  it('SKILL.md must explicitly prohibit ad-hoc colors in wireframes', () => {
    // Given: a dev agent reads SKILL.md to understand wireframe authoring rules
    // When: they write a wireframe component
    // Then: SKILL.md must make clear that ad-hoc color/font values are not allowed —
    //       all values must come from the brand kit tokens.
    //
    // Without this explicit prohibition, agents default to hardcoding values like
    // `color: #1a1a1a` or `font: Arial` rather than referencing `--color-ink-primary`.
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');
    expect(content).toMatch(/no ad.?hoc color|no ad.?hoc font|must.*brand kit token|token.*no ad.?hoc/i);
  });

  it('SKILL.md must state wireframes reference brand kit tokens — not describe it as optional', () => {
    // Given: a dev agent is deciding how to handle color in wireframes
    // When: they read the wireframe authoring guidance
    // Then: the language must be prescriptive ("must", "required", "no"), not advisory ("should", "may")
    //
    // Weak: "Wireframes may reference brand kit tokens"
    // Strong: "Wireframes must reference brand kit tokens — no ad-hoc values"
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');

    // Extract just the wireframe output section for a targeted assertion
    const wireframeSection = content.split(/##\s+Brand Kit Mode/i)[1] ?? content;
    const hasStrongTokenRule = /must.*token|token.*must|no ad.?hoc|required.*token/i.test(wireframeSection);
    expect(hasStrongTokenRule).toBe(true);
  });
});

describe('Misuse: wireframes must not land at the project root', () => {
  it('SKILL.md must not describe wireframes as output to the project root or a flat path', () => {
    // Given: a dev agent reads where wireframe files should go
    // When: they write a wireframe generation step
    // Then: SKILL.md must only describe a path with a wireframes/ subdirectory —
    //       never a root-level path like ./hero.md or /wireframe.html
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');

    // Verify the pattern `./wireframe` or root-bare-wireframe is not described as the output
    // (matches something like "output to ./wireframe-hero.md" without a subdirectory)
    const hasBareRootWireframe = /output[^.]*\.\s*\/[a-z-]+\.(?:md|html|tsx)(?!\s*inside)/i.test(content);
    expect(hasBareRootWireframe).toBe(false);

    // Must always route through a subdirectory
    expect(content).toMatch(/wireframes\//);
  });
});

describe('Misuse: art-director review of wireframes must not be skippable', () => {
  it('SKILL.md must describe art-director reviewing wireframes, not only the brand kit', () => {
    // Given: mg-design constitution says "Art Director approval — All visual work needs sign-off"
    // When: SKILL.md describes the wireframe workflow
    // Then: it must explicitly state art-director reviews wireframes, not only the brand kit
    //
    // Current gap: SKILL.md says art-director reviews the brand kit before it is "used downstream"
    // but never says art-director reviews the wireframes themselves. This lets an agent skip the
    // review step when producing wireframes outside of a full brand kit flow.
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');

    // Must have a sentence/bullet that explicitly says art-director reviews wireframes.
    // "Art Director: Review and approve" followed by "Designer: Wireframes" in the Workflow
    // section is NOT sufficient — that only tells us the sequence, not that art-director
    // reviews the wireframe artifacts specifically.
    //
    // Acceptable patterns:
    //   "art-director reviews wireframes"
    //   "wireframes reviewed by art-director"
    //   "art-director reviews the wireframe before"
    const hasExplicitWireframeReview = /art.?director\s+reviews?\s+(?:the\s+)?wireframe|wireframe[s]?\s+(?:are\s+)?reviewed?\s+by\s+art.?director/i.test(content);
    expect(hasExplicitWireframeReview).toBe(true);
  });

  it('brand-kit-template.md must not describe wireframe review as optional', () => {
    // Given: a dev agent reads the brand kit template for guidance on what to include
    // When: they see a wireframe reference section
    // Then: any review step described must not say "optional" or "if desired"
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');

    // This is a negative guard — if the template discusses wireframe review it must not mark it optional.
    // If the template doesn't mention wireframe review at all, the golden test below catches that.
    if (/wireframe.*review|review.*wireframe/i.test(content)) {
      expect(content).not.toMatch(/wireframe.*optional|optional.*wireframe/i);
    }
  });
});

// ============================================================================
// BOUNDARY CASES — structural edge cases
// ============================================================================

describe('Boundary: both docs/wireframes/ and app/wireframes/ are valid output paths', () => {
  it('SKILL.md explicitly names both docs/wireframes/ and app/wireframes/ as valid destinations', () => {
    // Given: different projects use docs/ vs app/ for documentation
    // When: a dev agent chooses where to write wireframe files
    // Then: SKILL.md must explicitly call out both paths so the agent doesn't invent a third option
    //
    // Having both present makes it clear this is an intentional duality, not an oversight.
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');
    expect(content).toMatch(/docs\/wireframes\//i);
    expect(content).toMatch(/app\/wireframes\//i);
  });

  it('SKILL.md describes what determines which output path to use', () => {
    // Given: the agent must choose between docs/wireframes/ and app/wireframes/
    // When: it decides which to use
    // Then: SKILL.md must give a selection criterion — not just list both and leave it ambiguous
    //
    // "use whichever matches the project's docs convention" is sufficient.
    // Leaving it silent forces the agent to guess.
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');
    const wireframeSection = content.split(/##\s+Brand Kit Mode/i)[1] ?? content;
    const hasSelectionCriterion = /matches|project.*convention|use whichever|based on|convention/i.test(wireframeSection);
    expect(hasSelectionCriterion).toBe(true);
  });
});

describe('Boundary: wireframe output format must be explicitly stated', () => {
  it('SKILL.md specifies the exact wireframe output format (not left to agent interpretation)', () => {
    // Given: a dev agent must produce wireframe files
    // When: it decides what format to use
    // Then: SKILL.md must name the format explicitly — React component, HTML, Markdown, or ASCII
    //
    // Without an explicit format, agents produce inconsistent output: one might write JSX,
    // another might write a PNG description, a third might write raw HTML.
    // The acceptable formats are: markdown files with ASCII layout, or React component stubs.
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');
    const wireframeSection = content.split(/##\s+Brand Kit Mode/i)[1] ?? content;

    // Must name at least one concrete format
    const hasExplicitFormat = /markdown|ascii|\.md\b|\.tsx\b|react component/i.test(wireframeSection);
    expect(hasExplicitFormat).toBe(true);
  });

  it('SKILL.md format description must be specific enough to distinguish markdown from HTML', () => {
    // Given: agents could produce .html, .md, .tsx, or .svg wireframes
    // When: they read the format guidance
    // Then: the format description must be specific enough that two agents would produce
    //       the same file type from the same instruction
    //
    // "file" alone is not sufficient. "markdown files" or "React component stubs" is sufficient.
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');
    const wireframeSection = content.split(/##\s+Brand Kit Mode/i)[1] ?? content;

    // Reject guidance that only says "file" with no type qualifier
    const hasTypedFormat = /(?:markdown|ascii|\.md|\.tsx|react)\s*(?:file|layout|component|wireframe)/i.test(wireframeSection);
    expect(hasTypedFormat).toBe(true);
  });
});

describe('Boundary: brand kit template token reference example must cover wireframe context', () => {
  it('brand-kit-template.md contains at least one token reference in a wireframe-like context', () => {
    // Given: a dev agent reads the brand kit template to understand how tokens should be used
    // When: they look for guidance on using tokens in wireframes (not just in CSS definitions)
    // Then: the template must contain an example showing how a token name (e.g., --color-primary)
    //       appears in the context of describing a component or screen — not only in the
    //       "define your palette" table at the top.
    //
    // Current gap: the template defines token names in the Color Tokens section, but never
    // shows a wireframe-context example like:
    //   "CTA button: background --color-primary, text --color-surface-base"
    // Without this, agents don't know the token reference style to use in wireframe files.
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');

    // Must show a token being used in a component description (not just defined)
    // A token appears "in context" when it follows a UI element label like "button:", "heading:", etc.
    const hasComponentContextToken = /(?:button|heading|nav|input|card|label|link|background|text)\s*[:=]?\s*--color-|--color-[a-z-]+\s+(?:on|for|in)\s+/i.test(content);
    expect(hasComponentContextToken).toBe(true);
  });
});

// ============================================================================
// GOLDEN PATH — happy-path content assertions
// ============================================================================

describe('Golden: SKILL.md fully describes the wireframe output format', () => {
  it('SKILL.md names the wireframe format as markdown or ASCII layout files', () => {
    // Given: a dev agent reads SKILL.md to understand what wireframe files look like
    // When: they produce a wireframe
    // Then: the output is a markdown file (.md) with ASCII layout — not a React component or HTML file
    //
    // This is the deliberate design choice: mg-design produces spec documents, not implementation files.
    // Implementation (React components) is the responsibility of /mg-build.
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');
    expect(content).toMatch(/markdown.*ascii|ascii.*layout|\.md.*wireframe|wireframe.*\.md/i);
  });

  it('SKILL.md describes how wireframes must reference brand kit tokens', () => {
    // Given: a dev agent produces wireframes after a brand kit has been created
    // When: they write component layout descriptions
    // Then: SKILL.md instructs them to reference brand kit token names (e.g., --color-primary)
    //       rather than inline values (e.g., #3b82f6 or font: Arial)
    //
    // This is the link between brand kit creation and wireframe production that makes the
    // two outputs coherent. Without this link, the brand kit is decorative.
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');
    const wireframeSection = content.split(/##\s+Brand Kit Mode/i)[1] ?? content;
    expect(wireframeSection).toMatch(/brand kit token|--color-|css custom propert|token.*wireframe|wireframe.*token/i);
  });

  it('SKILL.md explicitly requires art-director to review wireframes', () => {
    // Given: all visual work requires Art Director sign-off per the constitution
    // When: wireframes have been produced by the design agent
    // Then: SKILL.md must explicitly route wireframes through art-director review —
    //       not only the brand kit creation step
    //
    // This is the gap: currently the workflow shows art-director → designer → art-director
    // but the "wireframe" noun only appears under design agent responsibilities, not under
    // art-director review. The review step must explicitly name wireframes.
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');
    // Must explicitly name wireframes as a subject of art-director review.
    // Matching the same pattern as the misuse test — requires a direct review clause,
    // not incidental co-occurrence across different sections.
    expect(content).toMatch(/art.?director\s+reviews?\s+(?:the\s+)?wireframe|wireframe[s]?\s+(?:are\s+)?reviewed?\s+by\s+art.?director/i);
  });

  it('SKILL.md names each wireframe file after the screen it represents', () => {
    // Given: a project may have 10+ wireframes
    // When: an agent creates the wireframe directory
    // Then: SKILL.md must instruct that each file is named for its screen (e.g., 01-login.md, dashboard.md)
    //       rather than generically (wireframe1.md, design.md)
    //
    // This is a boundary convention that prevents the output directory from becoming unnavigable.
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');
    const wireframeSection = content.split(/##\s+Brand Kit Mode/i)[1] ?? content;
    const hasNamingGuidance = /screen|name.*file|file.*name|each wireframe.*names|names.*screen/i.test(wireframeSection);
    expect(hasNamingGuidance).toBe(true);
  });
});

describe('Golden: brand-kit-template.md includes wireframe token usage guidance', () => {
  it('template shows at least one example of a token referenced in a wireframe description', () => {
    // Given: a dev or agent consults the brand kit template to understand the expected output
    // When: they look for wireframe authoring examples
    // Then: the template must demonstrate the token reference style so agents produce consistent output
    //
    // A minimal example inside a "Wireframe token usage" or "Component Patterns" section is sufficient:
    //   CTA button:  background `--color-primary`  |  label `--color-surface-base`
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    expect(content).toMatch(/wireframe|component.*--color-|--color-.*component/i);
  });

  it('template token reference example uses CSS custom property syntax (--token-name)', () => {
    // Given: wireframes must reference brand kit tokens by name
    // When: the template shows how to reference tokens
    // Then: it must use the CSS custom property syntax (--color-primary, --text-base, etc.)
    //       so agents know the exact string format to use in wireframe files
    //
    // This prevents agents from using shorthand like "primary" or "brand-color" which are
    // not unambiguously mapped to a specific value.
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    expect(content).toMatch(/--color-[a-z]|--text-[a-z]|--font-[a-z]/i);
  });
});

describe('Golden: SKILL.md names the wonton project as the quality benchmark', () => {
  it('SKILL.md references wonton as the wireframe quality benchmark', () => {
    // Given: a dev agent is about to produce wireframes
    // When: it wants to know what "good" looks like
    // Then: SKILL.md must name the wonton project as the reference for output quality
    //
    // Without a concrete benchmark, "quality" is undefined. Agents that have no exemplar
    // produce minimal, incomplete wireframes. Naming wonton anchors the expected bar.
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');
    expect(content).toMatch(/wonton/i);
  });

  it('SKILL.md quality benchmark reference appears in or near the wireframe section', () => {
    // Given: the wonton reference is meant to guide wireframe quality specifically
    // When: a dev agent reads the wireframe output guidance
    // Then: the wonton benchmark reference must appear in the Brand Kit Mode section,
    //       not buried in an unrelated part of the file (e.g., the Boundaries section)
    const content = fs.readFileSync(MG_DESIGN_SKILL, 'utf-8');
    const brandKitSection = content.split(/##\s+Brand Kit Mode/i)[1]?.split(/^##\s+/m)[0] ?? '';
    expect(brandKitSection).toMatch(/wonton/i);
  });
});
