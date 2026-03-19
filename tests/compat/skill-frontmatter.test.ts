/**
 * Compliance Tests: Agent Skills Spec Frontmatter
 *
 * Validates that all 16 SKILL.md files in src/framework/skills/ comply with
 * the Agent Skills open standard frontmatter format.
 *
 * WS-COMPAT-1: Agent Skills Spec Frontmatter Compliance
 *
 * Test ordering: misuse → boundary → golden path (CAD protocol)
 *
 * These tests are written before implementation and SHOULD FAIL on the
 * current source files (Red phase). Once dev updates each SKILL.md they
 * will turn green.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SKILLS_SRC = path.resolve(__dirname, '../../src/framework/skills');

// All 16 skill directory names
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
  'mg-leadership-team',
  'mg-refactor',
  'mg-security-review',
  'mg-spec',
  'mg-write',
];

// Skills whose model should be opus (not sonnet)
const OPUS_SKILLS = new Set(['mg-leadership-team', 'mg-spec']);

// mg-init has no Task tool — compatibility text must not require Task tool agent spawning
const NO_TASK_SKILLS = new Set(['mg-add-context', 'mg-init']);

// Only mg-init is exempt from metadata.spawn_cap
const NO_SPAWN_CAP_SKILLS = new Set(['mg-init']);

/**
 * Extract the YAML frontmatter block (between the first pair of --- delimiters).
 * Returns null if no valid frontmatter is found.
 */
function extractFrontmatter(content: string): string | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : null;
}

/**
 * Read the content of a SKILL.md file.
 */
function readSkill(skillName: string): string {
  const skillPath = path.join(SKILLS_SRC, skillName, 'SKILL.md');
  return fs.readFileSync(skillPath, 'utf-8');
}

// ============================================================================
// MISUSE TESTS
// Verify that the compliance checker correctly detects non-compliant patterns
// when applied to synthetic bad-input frontmatter strings.
// ============================================================================

describe('WS-COMPAT-1 — Misuse: non-compliant frontmatter patterns are detectable', () => {

  it('detects decorative YAML comment lines (# Skill:) inside frontmatter block', () => {
    const badFrontmatter = `# Skill: mg-build\n# Orchestrates stuff\n\nname: mg-build\ndescription: "Test"`;
    expect(/^#\s+\S+/m.test(badFrontmatter)).toBe(true);
  });

  it('detects skills using old tools: key instead of allowed-tools:', () => {
    const badFrontmatter = `name: mg-build\ndescription: "Test"\ntools: [Read, Glob]`;
    expect(/^tools:/m.test(badFrontmatter)).toBe(true);
    expect(/^allowed-tools:/m.test(badFrontmatter)).toBe(false);
  });

  it('detects skills with top-level spawn_cap: (not nested under metadata)', () => {
    const badFrontmatter = `name: mg-build\ndescription: "Test"\nspawn_cap: 6`;
    expect(/^spawn_cap:/m.test(badFrontmatter)).toBe(true);
    expect(/^metadata:/m.test(badFrontmatter)).toBe(false);
  });

  it('detects skills missing the compatibility: field', () => {
    const badFrontmatter = `name: mg-build\ndescription: "Test"\nallowed-tools: Read`;
    expect(/^compatibility:/m.test(badFrontmatter)).toBe(false);
  });

  it('detects skills missing metadata.version field', () => {
    const badFrontmatter = `name: mg-build\ndescription: "Test"\nmetadata:\n  spawn_cap: "6"`;
    expect(/version:\s*["']1\.0["']/m.test(badFrontmatter)).toBe(false);
  });

  it('a skill file with tools: key fails our allowed-tools compliance check', () => {
    const badFrontmatter = `name: mg-build\ndescription: "Test"\ntools: [Read, Glob, Grep]`;
    expect(/^allowed-tools:/m.test(badFrontmatter)).toBe(false);
    expect(/^tools:/m.test(badFrontmatter)).toBe(true);
  });

  it('a skill file with top-level spawn_cap: fails our metadata.spawn_cap compliance check', () => {
    const badFrontmatter = `name: mg-build\ndescription: "Test"\nspawn_cap: 6`;
    expect(/^spawn_cap:/m.test(badFrontmatter)).toBe(true);
    expect(/^metadata:/m.test(badFrontmatter)).toBe(false);
  });

  it('a skill file missing compatibility: fails our compatibility compliance check', () => {
    const badFrontmatter = `name: mg-build\ndescription: "Test"\nallowed-tools: Read`;
    expect(/^compatibility:/m.test(badFrontmatter)).toBe(false);
  });

  it('a skill file missing metadata.version fails our version compliance check', () => {
    const badFrontmatter = `name: mg-build\ndescription: "Test"\nmetadata:\n  spawn_cap: "6"`;
    expect(/version:\s*["']1\.0["']/m.test(badFrontmatter)).toBe(false);
  });

  it('decorative comment line inside frontmatter fails our clean-frontmatter compliance check', () => {
    const badFrontmatter = `# Skill: mg-build\nname: mg-build\ndescription: "Test"`;
    expect(/^#\s+\S+/m.test(badFrontmatter)).toBe(true);
  });

});

// ============================================================================
// BOUNDARY TESTS
// Edge cases that must remain valid after the migration.
// ============================================================================

describe('WS-COMPAT-1 — Boundary: exceptions and edge cases', () => {

  it('mg-init is exempt from metadata.spawn_cap (no Task tool)', () => {
    // After migration: mg-init should have metadata block but no spawn_cap inside it.
    // In Red phase: the file has no metadata block at all, so it trivially has no spawn_cap.
    // We write the test to assert the correct post-migration invariant:
    //   mg-init must NOT have spawn_cap anywhere in its frontmatter.
    const content = readSkill('mg-init');
    const fm = extractFrontmatter(content);
    if (fm) {
      // Neither top-level nor nested spawn_cap is allowed for mg-init
      const hasTopLevel = /^spawn_cap:/m.test(fm);
      const hasNested   = /^\s+spawn_cap:/m.test(fm);
      // Currently top-level exists — assert the absence post-migration
      // This test documents the rule; it may pass in Red phase if mg-init has no spawn_cap
      // (it currently doesn't have one — confirmed in the source)
      expect(hasTopLevel || hasNested).toBe(false);
    }
  });

  it('mg-leadership-team with model: opus is still compliant after migration', () => {
    // model: opus must be preserved — only frontmatter structure changes, not model value
    const content = readSkill('mg-leadership-team');
    const fm = extractFrontmatter(content);
    expect(fm).not.toBeNull();
    expect(/^model:\s+opus/m.test(fm!)).toBe(true);
  });

  it('mg-spec with model: opus is still compliant after migration', () => {
    const content = readSkill('mg-spec');
    const fm = extractFrontmatter(content);
    expect(fm).not.toBeNull();
    expect(/^model:\s+opus/m.test(fm!)).toBe(true);
  });

  it('skills without Task in their tool list get non-agent-spawn compatibility text', () => {
    // mg-add-context and mg-init have no Task tool.
    // Their compatibility field must NOT require "agent spawning".
    // Post-migration assertion: compatibility should say "Requires Claude Code" without "Task tool".
    // In Red phase these files have no compatibility field — test documents the rule.
    for (const skill of NO_TASK_SKILLS) {
      const content = readSkill(skill);
      const fm = extractFrontmatter(content);
      if (fm && /^compatibility:/m.test(fm)) {
        const compatLine = fm.match(/^compatibility:\s*(.+)/m)?.[1] ?? '';
        // Must not mention "Task tool" or "agent spawning" requirement
        expect(compatLine).not.toMatch(/Task tool \(agent spawning\)/);
      }
    }
  });

  it('mg-add-context without Task tool is still compliant (no spawn_cap required)', () => {
    // mg-add-context has no Task tool but may still have metadata.spawn_cap.
    // After migration: no top-level spawn_cap, no "Task tool" in compatibility.
    const content = readSkill('mg-add-context');
    const fm = extractFrontmatter(content);
    expect(fm).not.toBeNull();
    // No top-level spawn_cap (must be under metadata or absent)
    expect(/^spawn_cap:/m.test(fm!)).toBe(false);
    // Has allowed-tools (not the old tools: key)
    expect(/^allowed-tools:/m.test(fm!)).toBe(true);
  });

  it('allowed-tools value is comma-separated (not a YAML array) per the spec', () => {
    // The target format is: allowed-tools: Read, Glob, Grep, Edit, Write, Task, Bash
    // NOT: allowed-tools: [Read, Glob, ...]
    // Post-migration check. In Red phase no skill has allowed-tools so we document the rule.
    const skillsWithAllowedTools = ALL_SKILLS.filter((skill) => {
      const fm = extractFrontmatter(readSkill(skill));
      return fm && /^allowed-tools:/m.test(fm);
    });
    for (const skill of skillsWithAllowedTools) {
      const fm = extractFrontmatter(readSkill(skill))!;
      const line = fm.match(/^allowed-tools:\s*(.+)/m)?.[1] ?? '';
      // Must NOT be a YAML bracket array
      expect(line).not.toMatch(/^\[/);
    }
  });

  it('metadata block is properly indented (two-space YAML nesting)', () => {
    // After migration: metadata block should use two-space indented keys.
    // In Red phase no metadata block exists — test documents required structure.
    const skillsWithMetadata = ALL_SKILLS.filter((skill) => {
      const fm = extractFrontmatter(readSkill(skill));
      return fm && /^metadata:/m.test(fm);
    });
    for (const skill of skillsWithMetadata) {
      const fm = extractFrontmatter(readSkill(skill))!;
      // Version key must be indented under metadata
      expect(/^  version:/m.test(fm)).toBe(true);
    }
  });

});

// ============================================================================
// GOLDEN PATH TESTS
// All 16 skills fully compliant with the Agent Skills open standard.
// These tests WILL FAIL in Red phase (before implementation).
// ============================================================================

describe('WS-COMPAT-1 — Golden path: all 16 skills are fully compliant', () => {

  it('all 16 skill SKILL.md files exist in src/framework/skills/', () => {
    for (const skill of ALL_SKILLS) {
      const skillPath = path.join(SKILLS_SRC, skill, 'SKILL.md');
      expect(fs.existsSync(skillPath), `Missing: ${skill}/SKILL.md`).toBe(true);
    }
  });

  it('all 16 skill files have name: field matching their directory name', () => {
    for (const skill of ALL_SKILLS) {
      const content = readSkill(skill);
      const fm = extractFrontmatter(content);
      expect(fm, `${skill}: no frontmatter found`).not.toBeNull();
      expect(fm, `${skill}: name field missing or wrong`).toMatch(
        new RegExp(`^name:\\s+${skill}$`, 'm')
      );
    }
  });

  it('all 16 skill files have non-empty description: field under 1024 chars', () => {
    for (const skill of ALL_SKILLS) {
      const content = readSkill(skill);
      const fm = extractFrontmatter(content);
      expect(fm, `${skill}: no frontmatter`).not.toBeNull();
      const match = fm!.match(/^description:\s*"([^"]+)"/m);
      expect(match, `${skill}: description field missing or not quoted`).not.toBeNull();
      const desc = match![1];
      expect(desc.length, `${skill}: description is empty`).toBeGreaterThan(0);
      expect(desc.length, `${skill}: description exceeds 1024 chars`).toBeLessThanOrEqual(1024);
    }
  });

  it('all 16 skill files have allowed-tools: field (not tools:)', () => {
    for (const skill of ALL_SKILLS) {
      const content = readSkill(skill);
      const fm = extractFrontmatter(content);
      expect(fm, `${skill}: no frontmatter`).not.toBeNull();
      expect(fm!, `${skill}: missing allowed-tools field`).toMatch(/^allowed-tools:/m);
      expect(fm!, `${skill}: still has old tools: field`).not.toMatch(/^tools:/m);
    }
  });

  it('all 16 skill files have compatibility: field', () => {
    for (const skill of ALL_SKILLS) {
      const content = readSkill(skill);
      const fm = extractFrontmatter(content);
      expect(fm, `${skill}: no frontmatter`).not.toBeNull();
      expect(fm!, `${skill}: missing compatibility field`).toMatch(/^compatibility:/m);
    }
  });

  it('all 16 skill files have a metadata.version field', () => {
    for (const skill of ALL_SKILLS) {
      const content = readSkill(skill);
      const fm = extractFrontmatter(content);
      expect(fm, `${skill}: no frontmatter`).not.toBeNull();
      expect(fm!, `${skill}: missing metadata block`).toMatch(/^metadata:/m);
      expect(fm!, `${skill}: missing version field under metadata`).toMatch(
        /version:\s*["']\d+\.\d+["']/m
      );
    }
  });

  it('15 skills (all except mg-init) have metadata.spawn_cap: "6"', () => {
    const skillsNeedingSpawnCap = ALL_SKILLS.filter((s) => !NO_SPAWN_CAP_SKILLS.has(s));
    for (const skill of skillsNeedingSpawnCap) {
      const content = readSkill(skill);
      const fm = extractFrontmatter(content);
      expect(fm, `${skill}: no frontmatter`).not.toBeNull();
      expect(fm!, `${skill}: missing spawn_cap: "6" under metadata`).toMatch(
        /spawn_cap:\s*["']6["']/m
      );
    }
  });

  it('no skill file has a top-level spawn_cap: field', () => {
    for (const skill of ALL_SKILLS) {
      const content = readSkill(skill);
      const fm = extractFrontmatter(content);
      expect(fm, `${skill}: no frontmatter`).not.toBeNull();
      // Top-level spawn_cap starts at column 0 with no leading whitespace
      expect(fm!, `${skill}: still has top-level spawn_cap`).not.toMatch(/^spawn_cap:/m);
    }
  });

  it('no skill file has decorative comment lines inside the frontmatter block', () => {
    for (const skill of ALL_SKILLS) {
      const content = readSkill(skill);
      const fm = extractFrontmatter(content);
      expect(fm, `${skill}: no frontmatter`).not.toBeNull();
      expect(fm!, `${skill}: contains decorative comment line`).not.toMatch(/^#\s+\S+/m);
    }
  });

  it('mg-build frontmatter parses as structurally valid YAML (key: value pairs only)', () => {
    const content = readSkill('mg-build');
    const fm = extractFrontmatter(content);
    expect(fm).not.toBeNull();
    // Every non-blank, non-comment line must be a key: value or an indented value
    const lines = fm!.split('\n').filter((l) => l.trim() !== '');
    for (const line of lines) {
      // Valid: "key: value", "  key: value", or "  - value" (block sequence)
      const isKeyValue   = /^\s*\w[\w-]*\s*:/.test(line);
      const isSeqItem    = /^\s+-\s+/.test(line);
      const isComment    = /^\s*#/.test(line);
      expect(
        isKeyValue || isSeqItem || isComment,
        `mg-build frontmatter has invalid line: "${line}"`
      ).toBe(true);
    }
  });

  it('skills with Task in allowed-tools have "Task tool (agent spawning)" in compatibility', () => {
    const taskSkills = ALL_SKILLS.filter((s) => !NO_TASK_SKILLS.has(s));
    for (const skill of taskSkills) {
      const content = readSkill(skill);
      const fm = extractFrontmatter(content);
      expect(fm, `${skill}: no frontmatter`).not.toBeNull();
      if (/^compatibility:/m.test(fm!)) {
        const compatLine = fm!.match(/^compatibility:\s*(.+)/m)?.[1] ?? '';
        expect(
          compatLine,
          `${skill}: compatibility should mention Task tool agent spawning`
        ).toMatch(/Task tool/);
      }
    }
  });

  it('mg-add-context compatibility says "Requires Claude Code" without Task tool mention', () => {
    const content = readSkill('mg-add-context');
    const fm = extractFrontmatter(content);
    expect(fm).not.toBeNull();
    const compatLine = fm!.match(/^compatibility:\s*(.+)/m)?.[1] ?? '';
    expect(compatLine).toMatch(/Requires Claude Code/);
    expect(compatLine).not.toMatch(/Task tool \(agent spawning\)/);
  });

  it('mg-init compatibility says "Requires Claude Code" without Task tool mention', () => {
    const content = readSkill('mg-init');
    const fm = extractFrontmatter(content);
    expect(fm).not.toBeNull();
    const compatLine = fm!.match(/^compatibility:\s*(.+)/m)?.[1] ?? '';
    expect(compatLine).toMatch(/Requires Claude Code/);
    expect(compatLine).not.toMatch(/Task tool \(agent spawning\)/);
  });

  it('mg-leadership-team retains model: opus after migration', () => {
    const content = readSkill('mg-leadership-team');
    const fm = extractFrontmatter(content);
    expect(fm).not.toBeNull();
    expect(fm!).toMatch(/^model:\s+opus/m);
  });

  it('mg-spec retains model: opus after migration', () => {
    const content = readSkill('mg-spec');
    const fm = extractFrontmatter(content);
    expect(fm).not.toBeNull();
    expect(fm!).toMatch(/^model:\s+opus/m);
  });

  it('mg-init has no metadata.spawn_cap after migration', () => {
    const content = readSkill('mg-init');
    const fm = extractFrontmatter(content);
    expect(fm).not.toBeNull();
    // spawn_cap must not appear anywhere in mg-init frontmatter
    expect(fm!).not.toMatch(/spawn_cap/);
  });

});
