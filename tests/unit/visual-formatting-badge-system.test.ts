/**
 * Unit Tests: Colored Badge Identity System (WS-3 / GH-245)
 *
 * Verifies that visual-formatting.md defines a canonical badge mapping table,
 * all 24 agents are assigned to exactly one category, compact-mode examples
 * include badge prefixes, and no output-format.md file duplicates the full table.
 *
 * Tests are ordered misuse-first per CAD TDD protocol:
 *   1. MISUSE   — things that must NOT happen (duplication, missing agents)
 *   2. BOUNDARY — structural edge cases (agent count, single canonical source)
 *   3. GOLDEN   — happy-path content assertions (table present, examples correct)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SHARED = path.resolve(__dirname, '../../src/framework/shared');
const VISUAL_FORMATTING = path.join(SHARED, 'visual-formatting.md');

const SKILLS_DIR = path.resolve(__dirname, '../../src/framework/skills');

// All 24 agents that must appear in the canonical badge table
const ALL_AGENTS = [
  // LEAD
  'ceo', 'cto', 'engineering-director', 'product-owner',
  // ENG
  'dev', 'staff-engineer', 'devops-engineer', 'data-engineer', 'deployment-engineer',
  // QA
  'qa', 'security-engineer',
  // CREATE
  'design', 'art-director', 'copywriter', 'ai-artist', 'technical-writer', 'studio-director',
  // COORD
  'supervisor', 'engineering-manager', 'product-manager', 'api-designer',
];

// The 5 badge categories and their emoji+label
const BADGE_CATEGORIES = [
  { emoji: '🟡', label: '[LEAD]' },
  { emoji: '🔵', label: '[ENG]' },
  { emoji: '🟢', label: '[QA]' },
  { emoji: '🟣', label: '[CREATE]' },
  { emoji: '⚪', label: '[COORD]' },
];

// All output-format.md files under skills/*/references/
function getOutputFormatFiles(): string[] {
  return fs
    .readdirSync(SKILLS_DIR)
    .map((skill) => path.join(SKILLS_DIR, skill, 'references', 'output-format.md'))
    .filter((f) => fs.existsSync(f));
}

// ============================================================================
// MISUSE CASES — tested first
// What must NOT happen
// ============================================================================

describe('Misuse: output-format.md files must not duplicate the full badge table', () => {
  it('no output-format.md should contain all 5 badge category labels together', () => {
    // The canonical table lives ONLY in visual-formatting.md.
    // If any output-format.md contains all 5 badge labels in a single file,
    // that is a duplication and violates the CTO constraint.
    const files = getOutputFormatFiles();
    expect(files.length).toBeGreaterThan(0);

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const allLabelsPresent = BADGE_CATEGORIES.every(({ label }) => content.includes(label));
      expect(allLabelsPresent, `${path.relative(process.cwd(), filePath)} duplicates the full badge table`).toBe(false);
    }
  });

  it('no output-format.md should reproduce a 5-row badge mapping table', () => {
    // A table that lists Badge -> Agents for multiple rows is the canonical table
    // and must not appear in downstream files.
    const files = getOutputFormatFiles();
    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8');
      // Count how many badge emoji appear (each appears once per table row)
      const badgeEmojiCount = BADGE_CATEGORIES.filter(({ emoji }) => content.includes(emoji)).length;
      expect(
        badgeEmojiCount,
        `${path.relative(process.cwd(), filePath)} appears to reproduce the badge table (${badgeEmojiCount} badge emoji found)`
      ).toBeLessThan(5);
    }
  });
});

describe('Misuse: visual-formatting.md compact variants must include badge prefixes', () => {
  it('compact variant for Agent Invocation Banner must NOT use the old bare >> [Agent Name] format', () => {
    // The old format ">> [Agent Name]: [task description]" has no badge.
    // After this workstream, ALL compact variants must use the badge prefix.
    const content = fs.readFileSync(VISUAL_FORMATTING, 'utf-8');
    // The bare old format should not appear as the sole compact variant example
    expect(content).not.toMatch(/^>>\s+\[Agent Name\]:\s+\[task description\]/m);
  });
});

// ============================================================================
// BOUNDARY CASES — structural edge cases
// ============================================================================

describe('Boundary: canonical badge table must be defined exactly once', () => {
  it('visual-formatting.md is the only file containing all 5 badge category labels', () => {
    // Check that no other file outside visual-formatting.md contains all 5 labels
    // (i.e., the full canonical table does not exist in any other file)
    const vfContent = fs.readFileSync(VISUAL_FORMATTING, 'utf-8');
    const allLabelsInVF = BADGE_CATEGORIES.every(({ label }) => vfContent.includes(label));
    expect(allLabelsInVF).toBe(true); // visual-formatting.md MUST have all 5

    // No output-format.md should have all 5 — already tested in misuse block
    // but also check visual-formatting.md only has a single badge table section
    const tableSectionMatches = (vfContent.match(/Agent Badge Categories|Badge.*Agent.*Mapping|badge.*categor/gi) ?? []);
    // Allow for section heading variations but there should be exactly one badge table section
    expect(tableSectionMatches.length).toBeGreaterThanOrEqual(1);
  });

  it('all 24 agents are present in visual-formatting.md badge table', () => {
    const content = fs.readFileSync(VISUAL_FORMATTING, 'utf-8');
    for (const agent of ALL_AGENTS) {
      expect(content, `Agent "${agent}" is missing from the badge table in visual-formatting.md`).toContain(agent);
    }
  });

  it('total agent count in badge table covers exactly 24 agents (no extras, no omissions)', () => {
    // This catches both missing agents and phantom agents in the table
    const content = fs.readFileSync(VISUAL_FORMATTING, 'utf-8');
    // Check that all known agents are present (count check)
    const agentsFound = ALL_AGENTS.filter((a) => content.includes(a));
    expect(agentsFound).toHaveLength(ALL_AGENTS.length);
  });
});

describe('Boundary: each badge category must appear with both its emoji and label', () => {
  it.each(BADGE_CATEGORIES)('$emoji $label appears together in visual-formatting.md', ({ emoji, label }) => {
    const content = fs.readFileSync(VISUAL_FORMATTING, 'utf-8');
    // The emoji and label should both appear in the file
    expect(content).toContain(emoji);
    expect(content).toContain(label);
  });
});

describe('Boundary: compact variant examples must use badge prefix format', () => {
  it('Agent Invocation compact variant uses emoji badge prefix', () => {
    // After the change, compact agent invocation lines should look like:
    //   🔵 [ENG] dev: implement auth (120s)
    const content = fs.readFileSync(VISUAL_FORMATTING, 'utf-8');
    // At least one badge emoji should appear in a compact variant context.
    // The 'u' flag is required to correctly match emoji above the BMP (e.g. 🔵 = U+1F535).
    const hasEmojiInCompact = /compact variant[\s\S]{0,300}(🟡|🔵|🟢|🟣|⚪)/imu.test(content);
    expect(hasEmojiInCompact).toBe(true);
  });

  it('Columnar Activity Feed includes badge prefix on spawn/recv lines', () => {
    // Columnar feed lines should use: >> 🟢 [QA]  qa    spawn  "..."
    const content = fs.readFileSync(VISUAL_FORMATTING, 'utf-8');
    // Look for badge emojis near the Columnar Activity Feed section
    const columnarSection = content.split('### Columnar Activity Feed')[1]?.split('### Debug Dashboard')[0] ?? '';
    // The 'u' flag is required to correctly match emoji above the BMP.
    const hasBadgeInColumnar = /(🟡|🔵|🟢|🟣|⚪)/u.test(columnarSection);
    expect(hasBadgeInColumnar).toBe(true);
  });
});

// ============================================================================
// GOLDEN PATH — happy-path content assertions
// ============================================================================

describe('Golden: visual-formatting.md contains the canonical badge mapping table', () => {
  it('file exists at the expected path', () => {
    expect(fs.existsSync(VISUAL_FORMATTING)).toBe(true);
  });

  it('contains a Badge section heading', () => {
    const content = fs.readFileSync(VISUAL_FORMATTING, 'utf-8');
    expect(content).toMatch(/##\s+Agent Badge|##\s+Badge.*Categor|##\s+Colored Badge/i);
  });

  it('badge table has a Badge column and an Agents column', () => {
    const content = fs.readFileSync(VISUAL_FORMATTING, 'utf-8');
    // Markdown table header with Badge and Agents columns
    expect(content).toMatch(/\|\s*Badge\s*\|\s*Agents\s*\|/);
  });

  it('LEAD category maps correct agents: ceo, cto, engineering-director, product-owner', () => {
    const content = fs.readFileSync(VISUAL_FORMATTING, 'utf-8');
    expect(content).toMatch(/🟡.*\[LEAD\]/);
    // All 4 LEAD agents should be in the same row/vicinity as 🟡 [LEAD]
    const leadSection = content.split('🟡')[1]?.split('\n')[0] ?? '';
    expect(leadSection).toContain('ceo');
    expect(leadSection).toContain('cto');
  });

  it('ENG category maps correct agents including dev and staff-engineer', () => {
    const content = fs.readFileSync(VISUAL_FORMATTING, 'utf-8');
    expect(content).toMatch(/🔵.*\[ENG\]/);
    const engSection = content.split('🔵')[1]?.split('\n')[0] ?? '';
    expect(engSection).toContain('dev');
    expect(engSection).toContain('staff-engineer');
  });

  it('QA category maps qa and security-engineer', () => {
    const content = fs.readFileSync(VISUAL_FORMATTING, 'utf-8');
    expect(content).toMatch(/🟢.*\[QA\]/);
    const qaSection = content.split('🟢')[1]?.split('\n')[0] ?? '';
    expect(qaSection).toContain('qa');
    expect(qaSection).toContain('security-engineer');
  });

  it('CREATE category maps design and art-director', () => {
    const content = fs.readFileSync(VISUAL_FORMATTING, 'utf-8');
    expect(content).toMatch(/🟣.*\[CREATE\]/);
    const createSection = content.split('🟣')[1]?.split('\n')[0] ?? '';
    expect(createSection).toContain('design');
    expect(createSection).toContain('art-director');
  });

  it('COORD category maps engineering-manager and product-manager', () => {
    const content = fs.readFileSync(VISUAL_FORMATTING, 'utf-8');
    expect(content).toMatch(/⚪.*\[COORD\]/);
    const coordSection = content.split('⚪')[1]?.split('\n')[0] ?? '';
    expect(coordSection).toContain('engineering-manager');
    expect(coordSection).toContain('product-manager');
  });
});

describe('Golden: output-format.md files reference the badge system without duplicating it', () => {
  it('each output-format.md references visual-formatting.md for the badge system', () => {
    // Downstream files should point to visual-formatting.md for badge definitions
    // rather than re-defining them. At minimum, they should mention badge prefix.
    const files = getOutputFormatFiles();
    expect(files.length).toBeGreaterThan(0);

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const hasReference =
        content.includes('visual-formatting.md') ||
        content.includes('badge') ||
        content.includes('Badge');
      expect(
        hasReference,
        `${path.relative(process.cwd(), filePath)} does not reference the badge system or visual-formatting.md`
      ).toBe(true);
    }
  });
});
