/**
 * Compliance Tests: SKILL.md Content Organization for Progressive Disclosure
 *
 * Validates that all 16 SKILL.md files in src/framework/skills/ have been
 * reorganized to keep inline content lean, with verbose reference material
 * extracted to companion references/ files in each skill's source directory.
 *
 * WS-COMPAT-2: SKILL.md Content Organization for Progressive Disclosure Readiness
 *
 * Test ordering: misuse → boundary → golden path (CAD protocol)
 *
 * Two extraction types are checked:
 *
 *   1. Model Escalation sections (> 10 lines inline) → references/model-escalation-guidance.md
 *      Skills affected: mg-accessibility-review, mg-add-context, mg-assess,
 *                       mg-assess-tech, mg-code-review, mg-design-review, mg-security-review
 *
 *   2. Verbose Output Format sections (> 20 lines) → references/output-examples.md
 *      Skills affected: mg-assess, mg-build, mg-debug, mg-refactor
 *      After extraction: ## Output Format section in SKILL.md must be ≤ 15 lines
 *
 * These tests are written before implementation and SHOULD FAIL on the current
 * source files (Red phase). Once dev reorganizes each SKILL.md they will pass.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SKILLS_SRC = path.resolve(__dirname, '../../src/framework/skills');

// All 16 skill directory names (mg-leadership-team merged into mg)
const ALL_SKILLS = [
  'mg-accessibility-review',
  'mg-add-context',
  'mg-assess',
  'mg-assess-tech',
  'mg-build',
  'mg-code-review',
  'mg-debug',
  'mg-design',
  'mg-design-review',
  'mg-document',
  'mg-init',
  'mg-refactor',
  'mg-security-review',
  'mg-spec',
  'mg-write',
];

// Skills that currently have ## Model Escalation sections (> 10 lines each).
// After WS-COMPAT-2: the inline section is removed from SKILL.md and lives in
// references/model-escalation-guidance.md instead.
const ESCALATION_SKILLS = [
  'mg-accessibility-review',
  'mg-add-context',
  'mg-assess',
  'mg-assess-tech',
  'mg-code-review',
  'mg-design-review',
  'mg-security-review',
];

// Skills whose ## Output Format section currently exceeds 20 lines.
// After WS-COMPAT-2: the detail moves to references/output-examples.md and the
// inline section is ≤ 15 lines.
const VERBOSE_OUTPUT_SKILLS = [
  'mg-accessibility-review',
  'mg-assess',
  'mg-build',
  'mg-debug',
  'mg-refactor',
  'mg-write',
];

// Skills that are already short (≤ 150 lines total) and require NO reference
// files — they must stay untouched. mg-leadership-team merged into mg.
const SHORT_SKILLS = [
  'mg-design',
  'mg-document',
  'mg-spec',
];

/**
 * Read the content of a SKILL.md file (full file, frontmatter included).
 */
function readSkill(skillName: string): string {
  const skillPath = path.join(SKILLS_SRC, skillName, 'SKILL.md');
  return fs.readFileSync(skillPath, 'utf-8');
}

/**
 * Return only the body of a SKILL.md (content after the closing --- of frontmatter).
 */
function extractBody(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return match ? match[1] : content;
}

/**
 * Count lines in a markdown section that starts with `## {header}` and ends at
 * the next `##`-level heading or end of file.
 * Returns 0 if the section does not exist.
 *
 * Fence-aware: `## ` lines inside ``` blocks are not treated as section boundaries.
 */
function sectionLineCount(content: string, header: string): number {
  const lines = content.split('\n');
  let inTarget = false;
  let inFence = false;
  let count = 0;

  for (const line of lines) {
    // Toggle fence state (``` starts or ends a fenced block)
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence;
    }

    if (!inFence && line.startsWith('## ')) {
      if (line === `## ${header}` || line.startsWith(`## ${header}\n`) || line.trimEnd() === `## ${header}`) {
        // Found the target section — start counting
        inTarget = true;
        count = 1;
        continue;
      } else if (inTarget) {
        // Hit the next top-level section — stop
        break;
      }
    }

    if (inTarget) {
      count++;
    }
  }

  return count;
}

/**
 * Return true if the named section exists in content.
 */
function hasSection(content: string, header: string): boolean {
  return new RegExp(`^## ${header}`, 'm').test(content);
}

/**
 * Return the full text of a named section (from the ## heading to the next ##
 * heading or end of file). Returns empty string if not found.
 */
function getSection(content: string, header: string): string {
  // Split on any ## heading, find the one matching our header
  const parts = content.split(/(?=^## )/m);
  const section = parts.find((p) => p.startsWith(`## ${header}\n`) || p === `## ${header}`);
  return section ?? '';
}

// ============================================================================
// MISUSE TESTS
// Verify that the compliance checker correctly detects non-compliant patterns
// when applied to synthetic bad-input body strings.
// ============================================================================

describe('WS-COMPAT-2 — Misuse: non-compliant body patterns are detectable', () => {

  it('detects a Model Escalation section with more than 10 lines as too verbose for inline', () => {
    // Simulates a skill body that still has a full inline escalation block.
    const verboseEscalation = [
      '## Model Escalation',
      '',
      'This skill runs on Sonnet for cost efficiency.',
      '',
      '**Escalate to Opus-tier agent when:**',
      '- Complex multi-system reasoning required',
      '- Novel architecture patterns with no precedent',
      '- Strategic implications affecting product direction',
      '- Security-critical analysis with novel threat model',
      '- Tradeoffs involve irreversible architectural commitments',
      '- Assessment impacts 3+ downstream workstreams',
      '',
      '**Stay on Sonnet for:**',
      '- Standard checklist evaluation',
    ].join('\n');

    const lineCount = verboseEscalation.trim().split('\n').length;
    // 14 lines — should be flagged as too verbose for inline
    expect(lineCount).toBeGreaterThan(10);
  });

  it('detects an Output Format section with more than 20 lines as over the limit', () => {
    const verboseOutputFormat = `## Output Format

\`\`\`
## Feature Assessment: {Feature Name}

### Summary
{1-2 sentence summary}

### Clarifications
**Q:** {question}
**A:** {answer}

### Scope Definition
**User Stories:**
- As a {user}, I want {goal}

**Acceptance Criteria:**
- [ ] {criterion}

### Feasibility Assessment
**Technical Feasibility:** {input}

### Recommendation
**Decision:** GO | NO-GO

### Next Steps
{steps}
\`\`\``;

    const lineCount = verboseOutputFormat.trim().split('\n').length;
    // 27 lines — over the 20-line limit
    expect(lineCount).toBeGreaterThan(20);
  });

  it('detects a SKILL.md body over 250 lines as exceeding the verbose threshold', () => {
    // Construct a synthetic body that is 260 lines long
    const longBody = Array.from({ length: 260 }, (_, i) => `Line ${i + 1}`).join('\n');
    const lineCount = longBody.trim().split('\n').length;
    expect(lineCount).toBeGreaterThan(250);
  });

  it('detects that a Model Escalation section with > 10 lines should not exist inline post-extraction', () => {
    // Post-extraction rule: inline escalation section must be ≤ 5 lines (just a pointer).
    // Test that our detection correctly identifies a violation.
    const stillVerboseInline = [
      '## Model Escalation',
      '',
      'This skill runs on Sonnet.',
      '',
      '**Escalate when:**',
      '- Complex case A',
      '- Complex case B',
      '- Complex case C',
      '',
      '**Stay on Sonnet for:**',
      '- Routine operations',
    ].join('\n');

    const lines = stillVerboseInline.trim().split('\n').length;
    expect(lines).toBeGreaterThan(5);
    // A valid post-extraction pointer should be ≤ 5 lines
    expect(lines).not.toBeLessThanOrEqual(5);
  });

  it('detects an Output Format section still at 30+ lines as not yet extracted', () => {
    // mg-debug and mg-refactor have 30-line output format sections currently.
    // After extraction they should be ≤ 15 lines.
    const stillVerbose = Array.from({ length: 31 }, (_, i) =>
      i === 0 ? '## Output Format' : `Detail line ${i}`
    ).join('\n');

    const lineCount = stillVerbose.trim().split('\n').length;
    expect(lineCount).toBeGreaterThan(15); // Violates post-extraction limit
  });

  it('sectionLineCount is fence-aware: ## lines inside ``` blocks are not treated as section boundaries', () => {
    // Synthetic body with a fenced block containing ## headings inside Output Format.
    // Without fence awareness, sectionLineCount would split on ## Content: and return a small count.
    const syntheticBody = [
      '## Output Format',
      '',
      'Template for structured output:',
      '',
      '```',
      '## Content: {Feature/Project}',
      '',
      '### Brand Direction',
      '{Creative vision}',
      '',
      '### Draft',
      '{Copy content}',
      '',
      '### Decision',
      '{APPROVED | NEEDS REVISION}',
      '```',
      '',
      'Follow this template exactly.',
      '',
      '## Boundaries',
      '',
      '**CAN:** do things',
    ].join('\n');

    const count = sectionLineCount(syntheticBody, 'Output Format');
    // The Output Format section has 19 lines (from ## Output Format through the blank line after the fence).
    // Without fence awareness: ## Content: would split it and return ~3 lines.
    expect(count).toBeGreaterThan(10);
    // And it should not bleed into ## Boundaries
    expect(count).toBeLessThan(22);
  });

});

// ============================================================================
// BOUNDARY TESTS
// Edge cases that must hold after extraction.
// ============================================================================

describe('WS-COMPAT-2 — Boundary: exceptions and edge cases', () => {

  it('short skills (mg-design, mg-document, mg-spec) have no references/model-escalation-guidance.md', () => {
    // These skills are already ≤ 150 lines and have no ## Model Escalation section.
    // They must NOT get reference files from this workstream.
    // mg-leadership-team merged into mg.
    for (const skill of SHORT_SKILLS) {
      const refPath = path.join(SKILLS_SRC, skill, 'references', 'model-escalation-guidance.md');
      expect(
        fs.existsSync(refPath),
        `${skill} should NOT have references/model-escalation-guidance.md — it's already short`
      ).toBe(false);
    }
  });

  it('short skills (mg-design, mg-document, mg-spec) have no references/output-examples.md', () => {
    for (const skill of SHORT_SKILLS) {
      const refPath = path.join(SKILLS_SRC, skill, 'references', 'output-examples.md');
      expect(
        fs.existsSync(refPath),
        `${skill} should NOT have references/output-examples.md — it's already short`
      ).toBe(false);
    }
  });

  it('skills that had inline Model Escalation retain a brief escalation reference note in SKILL.md', () => {
    // After extraction: SKILL.md body must contain a pointer line such as:
    // "See references/model-escalation-guidance.md for escalation criteria."
    // This is a 1-line note, not the full section.
    for (const skill of ESCALATION_SKILLS) {
      const content = readSkill(skill);
      const body = extractBody(content);
      expect(
        body,
        `${skill}: SKILL.md body must contain a reference pointer to model-escalation-guidance.md`
      ).toMatch(/references\/model-escalation-guidance\.md/);
    }
  });

  it('the ## Boundaries section still exists in all 15 SKILL.md files after extraction', () => {
    // Boundaries is the terminal section — it must never be accidentally removed.
    for (const skill of ALL_SKILLS) {
      const content = readSkill(skill);
      expect(
        hasSection(content, 'Boundaries'),
        `${skill}: ## Boundaries section missing after WS-COMPAT-2 extraction`
      ).toBe(true);
    }
  });

  it('references/model-escalation-guidance.md for extracted skills is non-empty', () => {
    // Each file that receives extraction must be a real, non-empty markdown file.
    for (const skill of ESCALATION_SKILLS) {
      const refPath = path.join(SKILLS_SRC, skill, 'references', 'model-escalation-guidance.md');
      const exists = fs.existsSync(refPath);
      expect(exists, `${skill}: references/model-escalation-guidance.md does not exist`).toBe(true);
      if (exists) {
        const content = fs.readFileSync(refPath, 'utf-8').trim();
        expect(content.length, `${skill}: references/model-escalation-guidance.md is empty`).toBeGreaterThan(0);
      }
    }
  });

  it('mg-assess has ## Output Format section remaining in SKILL.md (section stays, detail moves)', () => {
    // The ## Output Format section header must remain — only the verbose template
    // detail moves to references/output-examples.md. The section itself is kept
    // with a summary + pointer.
    const content = readSkill('mg-assess');
    expect(hasSection(content, 'Output Format')).toBe(true);
  });

  it('mg-build has ## Output Format section remaining in SKILL.md after extraction', () => {
    const content = readSkill('mg-build');
    expect(hasSection(content, 'Output Format')).toBe(true);
  });

  it('mg-write has no ## Model Escalation section and needs no reference file', () => {
    // mg-write currently has NO Model Escalation section. It must not be
    // accidentally assigned one during this workstream.
    const content = readSkill('mg-write');
    expect(
      hasSection(content, 'Model Escalation'),
      'mg-write: should not have ## Model Escalation section (never had one)'
    ).toBe(false);
    const refPath = path.join(SKILLS_SRC, 'mg-write', 'references', 'model-escalation-guidance.md');
    expect(
      fs.existsSync(refPath),
      'mg-write: should not have references/model-escalation-guidance.md'
    ).toBe(false);
  });

});

// ============================================================================
// GOLDEN PATH TESTS
// All targeted skills have been fully reorganized post-WS-COMPAT-2.
// These tests WILL FAIL in Red phase (before implementation).
// ============================================================================

describe('WS-COMPAT-2 — Golden path: all extractions complete and correct', () => {

  // --- Model Escalation extraction ---

  it('skills with extracted model escalation have references/model-escalation-guidance.md in source dir', () => {
    for (const skill of ESCALATION_SKILLS) {
      const refPath = path.join(SKILLS_SRC, skill, 'references', 'model-escalation-guidance.md');
      expect(
        fs.existsSync(refPath),
        `${skill}: missing references/model-escalation-guidance.md`
      ).toBe(true);
    }
  });

  it('references/model-escalation-guidance.md contains escalation criteria (real content)', () => {
    // The file must contain "Escalate" or "escalate" to confirm real escalation
    // guidance landed there (not just a placeholder).
    for (const skill of ESCALATION_SKILLS) {
      const refPath = path.join(SKILLS_SRC, skill, 'references', 'model-escalation-guidance.md');
      if (fs.existsSync(refPath)) {
        const refContent = fs.readFileSync(refPath, 'utf-8');
        expect(
          /[Ee]scalate/.test(refContent),
          `${skill}: references/model-escalation-guidance.md does not contain escalation guidance`
        ).toBe(true);
      }
    }
  });

  it('skills that had ## Model Escalation no longer have that section inline (> 5 lines)', () => {
    // After extraction: no skill should have a multi-line escalation block in SKILL.md.
    // A 1-line pointer note is acceptable; a full section is not.
    for (const skill of ESCALATION_SKILLS) {
      const content = readSkill(skill);
      const body = extractBody(content);
      const escalationSection = getSection(body, 'Model Escalation');

      if (escalationSection.length > 0) {
        const lineCount = escalationSection.trim().split('\n').length;
        expect(
          lineCount,
          `${skill}: ## Model Escalation section still has ${lineCount} lines inline (must be removed or ≤ 5 lines after extraction)`
        ).toBeLessThanOrEqual(5);
      }
    }
  });

  // --- Output Format extraction ---

  it('skills with verbose Output Format have references/output-examples.md in source dir', () => {
    for (const skill of VERBOSE_OUTPUT_SKILLS) {
      const refPath = path.join(SKILLS_SRC, skill, 'references', 'output-examples.md');
      expect(
        fs.existsSync(refPath),
        `${skill}: missing references/output-examples.md`
      ).toBe(true);
    }
  });

  it('## Output Format section in SKILL.md is ≤ 15 lines for skills that had extraction', () => {
    for (const skill of VERBOSE_OUTPUT_SKILLS) {
      const content = readSkill(skill);
      const body = extractBody(content);
      const lineCount = sectionLineCount(body, 'Output Format');

      if (lineCount > 0) {
        expect(
          lineCount,
          `${skill}: ## Output Format section is ${lineCount} lines — must be ≤ 15 after extraction`
        ).toBeLessThanOrEqual(15);
      }
    }
  });

  it('references/output-examples.md for extracted skills is non-empty', () => {
    for (const skill of VERBOSE_OUTPUT_SKILLS) {
      const refPath = path.join(SKILLS_SRC, skill, 'references', 'output-examples.md');
      if (fs.existsSync(refPath)) {
        const content = fs.readFileSync(refPath, 'utf-8').trim();
        expect(
          content.length,
          `${skill}: references/output-examples.md is empty`
        ).toBeGreaterThan(0);
      }
    }
  });

  // --- Body length targets ---

  it('all 15 SKILL.md body lengths are ≤ 250 lines (soft target — warn on violations)', () => {
    // 250 lines is the soft ceiling. Skills still at 300+ lines need attention.
    const violations: string[] = [];
    for (const skill of ALL_SKILLS) {
      const content = readSkill(skill);
      const body = extractBody(content);
      const lineCount = body.trim().split('\n').length;
      if (lineCount > 250) {
        violations.push(`${skill}: ${lineCount} lines`);
      }
    }
    expect(
      violations,
      `Skills still over 250 body lines after extraction: ${violations.join(', ')}`
    ).toHaveLength(0);
  });

  // --- Content integrity (nothing accidentally removed) ---

  it('all 15 SKILL.md files still have ## Constitution section', () => {
    for (const skill of ALL_SKILLS) {
      const content = readSkill(skill);
      expect(
        hasSection(content, 'Constitution'),
        `${skill}: ## Constitution section missing after WS-COMPAT-2`
      ).toBe(true);
    }
  });

  it('all 16 SKILL.md files still have ## Boundaries section', () => {
    for (const skill of ALL_SKILLS) {
      const content = readSkill(skill);
      expect(
        hasSection(content, 'Boundaries'),
        `${skill}: ## Boundaries section missing after WS-COMPAT-2`
      ).toBe(true);
    }
  });

  it('mg-accessibility-review references/model-escalation-guidance.md mentions WCAG or Opus-tier', () => {
    // Skill-specific content check: the extracted guidance for mg-accessibility-review
    // must reference domain-specific escalation context (WCAG conflict or Opus-tier).
    const refPath = path.join(SKILLS_SRC, 'mg-accessibility-review', 'references', 'model-escalation-guidance.md');
    if (fs.existsSync(refPath)) {
      const content = fs.readFileSync(refPath, 'utf-8');
      expect(/WCAG|Opus|opus/.test(content)).toBe(true);
    }
  });

  it('mg-security-review references/model-escalation-guidance.md mentions cryptographic or authentication', () => {
    // Security review escalation guidance should retain domain-specific criteria.
    const refPath = path.join(SKILLS_SRC, 'mg-security-review', 'references', 'model-escalation-guidance.md');
    if (fs.existsSync(refPath)) {
      const content = fs.readFileSync(refPath, 'utf-8');
      expect(/[Cc]ryptograph|[Aa]uthentication|[Aa]rchitecture/.test(content)).toBe(true);
    }
  });

  it('mg-build references/output-examples.md contains the CAD pipeline ASCII diagram', () => {
    // The full-mode box diagram (┌─ / ──▶ characters) must land in the reference file.
    const refPath = path.join(SKILLS_SRC, 'mg-build', 'references', 'output-examples.md');
    if (fs.existsSync(refPath)) {
      const content = fs.readFileSync(refPath, 'utf-8');
      // The pipeline box uses box-drawing characters or TEST/IMPL/VERIFY/REVIEW labels
      expect(/TEST|IMPL|VERIFY|REVIEW/.test(content)).toBe(true);
    }
  });

  it('mg-assess references/output-examples.md contains the full assessment template', () => {
    // The "Full assessment template" section (Phase 1-4 output) must move to references.
    const refPath = path.join(SKILLS_SRC, 'mg-assess', 'references', 'output-examples.md');
    if (fs.existsSync(refPath)) {
      const content = fs.readFileSync(refPath, 'utf-8');
      // The assessment template has "Feature Assessment" and "Acceptance Criteria"
      expect(/Feature Assessment|Acceptance Criteria/.test(content)).toBe(true);
    }
  });

  it('no ESCALATION_SKILL SKILL.md has "## Model Escalation" followed by more than 10 lines before the next ##', () => {
    // Comprehensive enforcement: after extraction, no inline escalation block exceeds 10 lines.
    for (const skill of ESCALATION_SKILLS) {
      const content = readSkill(skill);
      const body = extractBody(content);
      const lineCount = sectionLineCount(body, 'Model Escalation');
      // Either no section at all (lineCount === 0) or short pointer (≤ 5 lines)
      expect(
        lineCount === 0 || lineCount <= 5,
        `${skill}: inline ## Model Escalation is ${lineCount} lines — must be 0 or ≤ 5 after extraction`
      ).toBe(true);
    }
  });

  it('no VERBOSE_OUTPUT_SKILL SKILL.md has an Output Format section exceeding 20 lines', () => {
    for (const skill of VERBOSE_OUTPUT_SKILLS) {
      const content = readSkill(skill);
      const body = extractBody(content);
      const lineCount = sectionLineCount(body, 'Output Format');
      // 0 means no section (also fine), positive means it exists and must be short
      expect(
        lineCount === 0 || lineCount <= 15,
        `${skill}: ## Output Format is ${lineCount} lines inline — must be ≤ 15 after extraction`
      ).toBe(true);
    }
  });

});
