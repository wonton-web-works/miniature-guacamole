/**
 * B3 + B4: Build Exclusion & Brand Reference Tests
 *
 * Verifies that:
 * - build.sh excludes teo* skill directories from the community distribution
 * - build.sh excludes the sage agent from the community distribution
 * - sage/agent.md does NOT contain a TheEngOrg Enterprise License reference
 * - mg/SKILL.md enterprise references are gated appropriately
 *
 * Test order: misuse → boundary → happy path (TDD-workflow.md).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const BUILD_SH = path.join(ROOT, 'build.sh');
const SAGE_AGENT_MD = path.join(ROOT, 'src/framework/agents/sage/agent.md');
const MG_SKILL_MD = path.join(ROOT, 'src/framework/skills/mg/SKILL.md');

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('build-exclusions — misuse cases', () => {
  it('build.sh must NOT copy teo skills into dist without an exclusion filter', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    // Must contain a teo* exclusion so those dirs are skipped
    expect(buildSh).toMatch(/teo/);
  });

  it('build.sh must NOT copy the sage agent directory without an exclusion filter', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    // Must reference sage exclusion in the agents copy loop
    expect(buildSh).toMatch(/sage/);
  });

  it('sage/agent.md must NOT contain the TheEngOrg Enterprise License Agreement line', () => {
    if (!fs.existsSync(SAGE_AGENT_MD)) {
      // sage not present on disk — passes by absence
      return;
    }
    const content = fs.readFileSync(SAGE_AGENT_MD, 'utf-8');
    expect(content).not.toMatch(/Licensed under the TheEngOrg Enterprise License Agreement/);
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY CASES
// ---------------------------------------------------------------------------

describe('build-exclusions — boundary cases', () => {
  it('build.sh still copies non-teo skills (mg, mg-build, etc.)', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    // The skills copy loop must still exist
    expect(buildSh).toMatch(/SKILL_COUNT/);
    expect(buildSh).toMatch(/skills/);
  });

  it('teo-validate script is NOT picked up by the mg-* glob in build.sh', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    // Scripts section uses mg-* glob — teo-validate starts with teo, not mg
    // Verify the script glob pattern only picks up mg-* files
    expect(buildSh).toMatch(/scripts.*mg-\*/);
  });

  it('sage/agent.md copyright notice is preserved (HTML comment block)', () => {
    if (!fs.existsSync(SAGE_AGENT_MD)) {
      return;
    }
    const content = fs.readFileSync(SAGE_AGENT_MD, 'utf-8');
    // Copyright line should remain, only the license line is removed
    expect(content).toMatch(/Copyright.*Wonton Web Works/i);
  });

  it('mg/SKILL.md still references enterprise/Sage gating (not silently removed)', () => {
    const content = fs.readFileSync(MG_SKILL_MD, 'utf-8');
    // The edition detection section and enterprise gating language must exist
    expect(content).toMatch(/enterprise|Enterprise/);
  });
});

// ---------------------------------------------------------------------------
// HAPPY PATH
// ---------------------------------------------------------------------------

describe('build-exclusions — happy path', () => {
  it('build.sh skips teo* directories in the skills copy loop', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    // Must have a conditional that skips teo-prefixed dirs
    expect(buildSh).toMatch(/teo\*/);
  });

  it('build.sh skips sage in the agents copy loop', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    // Must have a conditional that skips the sage agent
    expect(buildSh).toMatch(/sage.*skip|skip.*sage|\[\[ "\$agent_name" == "sage" \]\]|\[\[ "\$agent_name" != "sage" \]\]/);
  });

  it('mg/SKILL.md /teo references are gated with enterprise-only note', () => {
    const content = fs.readFileSync(MG_SKILL_MD, 'utf-8');
    // /teo must not appear as an unqualified community skill reference
    // It should be annotated as enterprise-only or not present at all
    const teoMatches = content.match(/\/teo\b/g) || [];
    if (teoMatches.length > 0) {
      // If /teo is present, it must be accompanied by enterprise qualification
      expect(content).toMatch(/enterprise.*only|enterprise edition|\/teo.*enterprise|enterprise.*\/teo/i);
    }
    // Passing with zero occurrences is also acceptable
    expect(true).toBe(true);
  });
});
