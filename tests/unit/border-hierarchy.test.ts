/**
 * WS-2: Border Hierarchy Reduction (GH-245)
 *
 * Verifies that visual-formatting.md uses only two border weights:
 *   - Double borders (╔═╗╚╝╠╣║) for team/critical display
 *   - Thin borders (┌─┐└┘├┤│) for agent/routine display
 *
 * Medium-weight box-drawing border characters (┏┛┗┣┫) must NOT appear
 * in any box border context. Note: ━ may still appear in section
 * dividers (━━━ horizontal rules), which are decorative and not box borders.
 *
 * Ordered misuse-first: assert retired characters do NOT appear,
 * then assert correct border characters DO appear.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '../..');

function readVisualFormatting(): string {
  return readFileSync(
    path.join(ROOT, 'src/framework/shared/visual-formatting.md'),
    'utf-8'
  );
}

// ─────────────────────────────────────────────────────────────
// MISUSE CASES — medium-weight border characters must be gone
// ─────────────────────────────────────────────────────────────

describe('visual-formatting.md — medium-weight borders must be retired', () => {
  it('does not contain ┏ (medium top-left corner)', () => {
    const content = readVisualFormatting();
    expect(content).not.toContain('┏');
  });

  it('does not contain ┛ (medium bottom-right corner)', () => {
    const content = readVisualFormatting();
    expect(content).not.toContain('┛');
  });

  it('does not contain ┗ (medium bottom-left corner)', () => {
    const content = readVisualFormatting();
    expect(content).not.toContain('┗');
  });

  it('does not contain ┣ (medium left T-junction)', () => {
    const content = readVisualFormatting();
    expect(content).not.toContain('┣');
  });

  it('does not contain ┫ (medium right T-junction)', () => {
    const content = readVisualFormatting();
    expect(content).not.toContain('┫');
  });
});

// ─────────────────────────────────────────────────────────────
// GOLDEN PATH — correct borders must be present
// ─────────────────────────────────────────────────────────────

describe('visual-formatting.md — double borders used for team/critical display', () => {
  it('uses ╔ for Team Invocation Banner', () => {
    const content = readVisualFormatting();
    expect(content).toContain('╔');
  });

  it('uses ╚ for closing Team Invocation Banner', () => {
    const content = readVisualFormatting();
    expect(content).toContain('╚');
  });

  it('uses ╠ for separator rows in double-border boxes', () => {
    const content = readVisualFormatting();
    expect(content).toContain('╠');
  });

  it('Error Display box uses double borders (╔ and ╚)', () => {
    const content = readVisualFormatting();
    const errorSection = content.slice(content.indexOf('## Error Display'));
    // Find the first code block in the Error Display section
    const codeBlockStart = errorSection.indexOf('```\n') + 4;
    const codeBlockEnd = errorSection.indexOf('\n```', codeBlockStart);
    const errorBox = errorSection.slice(codeBlockStart, codeBlockEnd);
    expect(errorBox).toContain('╔');
    expect(errorBox).toContain('╚');
  });
});

describe('visual-formatting.md — thin borders used for agent/routine display', () => {
  it('uses ┌ for Agent Invocation Banner', () => {
    const content = readVisualFormatting();
    const agentSection = content.slice(content.indexOf('## Agent Invocation Banner'));
    const nextSection = agentSection.indexOf('\n## ', 1);
    const section = agentSection.slice(0, nextSection > 0 ? nextSection : undefined);
    expect(section).toContain('┌');
  });

  it('uses └ to close Agent Invocation Banner', () => {
    const content = readVisualFormatting();
    const agentSection = content.slice(content.indexOf('## Agent Invocation Banner'));
    const nextSection = agentSection.indexOf('\n## ', 1);
    const section = agentSection.slice(0, nextSection > 0 ? nextSection : undefined);
    expect(section).toContain('└');
  });

  it('Gate Check Display uses thin borders (┌ and └)', () => {
    const content = readVisualFormatting();
    const gateSection = content.slice(content.indexOf('## Gate Check Display'));
    const nextSection = gateSection.indexOf('\n## ', 1);
    const section = gateSection.slice(0, nextSection > 0 ? nextSection : undefined);
    const codeBlockStart = section.indexOf('```\n') + 4;
    const codeBlockEnd = section.indexOf('\n```', codeBlockStart);
    const gateBox = section.slice(codeBlockStart, codeBlockEnd);
    expect(gateBox).toContain('┌');
    expect(gateBox).toContain('└');
  });

  it('Columnar Activity Feed uses no box borders (replaced Style 1)', () => {
    const content = readVisualFormatting();
    const columnarIdx = content.indexOf('### Columnar Activity Feed');
    expect(columnarIdx).toBeGreaterThan(-1);
    const section = content.slice(columnarIdx);
    const nextSection = section.indexOf('\n### ', 1);
    const feed = section.slice(0, nextSection > 0 ? nextSection : undefined);
    // Columnar feed should use >> << .. !! prefixes, not box borders
    expect(feed).toContain('>>');
    expect(feed).toContain('<<');
    expect(feed).not.toContain('┌');
    expect(feed).not.toContain('└');
  });
});
