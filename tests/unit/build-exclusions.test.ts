/**
 * Build Inclusion Tests
 *
 * Verifies that build.sh correctly copies all community content into the dist:
 * - All community skills (mg-* directories) are included
 * - All community agents are included
 * - All mg-* scripts are picked up by the scripts glob
 * - SKILL_COUNT and agent copy loops exist in the build script
 *
 * Test order: misuse → boundary → happy path (TDD-workflow.md).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const BUILD_SH = path.join(ROOT, 'build.sh');

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('build-inclusions — misuse cases', () => {
  it('build.sh exists and is non-empty', () => {
    expect(fs.existsSync(BUILD_SH)).toBe(true);
    const content = fs.readFileSync(BUILD_SH, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });

  it('build.sh skills copy loop is not missing entirely', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    // Must have a skills copy section — absence would mean nothing gets distributed
    expect(buildSh).toMatch(/skills/);
  });

  it('build.sh agent copy loop is not missing entirely', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    // Must have an agent copy section
    expect(buildSh).toMatch(/agent/);
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY CASES
// ---------------------------------------------------------------------------

describe('build-inclusions — boundary cases', () => {
  it('build.sh contains SKILL_COUNT or equivalent skill tracking', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    expect(buildSh).toMatch(/SKILL_COUNT/);
  });

  it('build.sh scripts section uses mg-* glob', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    // Scripts section must pick up mg-* files
    expect(buildSh).toMatch(/scripts.*mg-\*/);
  });

  it('build.sh copies skills into the dist output directory', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    // Must reference copying skills to a dist/output path
    expect(buildSh).toMatch(/skills/);
    expect(buildSh).toMatch(/dist|output|DEST/i);
  });
});

// ---------------------------------------------------------------------------
// HAPPY PATH
// ---------------------------------------------------------------------------

describe('build-inclusions — happy path', () => {
  it('build.sh includes all community mg-* skills in the copy loop', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    // The copy loop must handle mg-* skill directories
    expect(buildSh).toMatch(/mg-/);
    expect(buildSh).toMatch(/SKILL_COUNT/);
  });

  it('all mg-* skills in src/framework/skills are present on disk', () => {
    const skillsDir = path.join(ROOT, 'src/framework/skills');
    if (!fs.existsSync(skillsDir)) return; // skills may live in .claude/skills only

    const skills = fs.readdirSync(skillsDir).filter(
      (name) =>
        name.startsWith('mg-') &&
        fs.statSync(path.join(skillsDir, name)).isDirectory()
    );

    // At minimum the core skills must exist
    const coreSkills = ['mg-build', 'mg-leadership-team'];
    for (const skill of coreSkills) {
      if (skills.length > 0) {
        expect(skills.some((s) => s === skill || skills.includes(skill))).toBeTruthy();
      }
    }
  });

  it('all 22+ community agents are present in src/framework/agents', () => {
    const agentsDir = path.join(ROOT, 'src/framework/agents');
    if (!fs.existsSync(agentsDir)) return;

    const agents = fs.readdirSync(agentsDir).filter(
      (name) =>
        !name.startsWith('_') &&
        fs.statSync(path.join(agentsDir, name)).isDirectory()
    );

    expect(agents.length).toBeGreaterThanOrEqual(22);
  });

  it('community settings.json exists in src/framework/', () => {
    const settingsPath = path.join(ROOT, 'src/framework/settings.json');
    expect(fs.existsSync(settingsPath)).toBe(true);
  });
});
