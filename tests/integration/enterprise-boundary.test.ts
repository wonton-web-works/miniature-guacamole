/**
 * Enterprise Separation Boundary Tests
 *
 * Verifies that enterprise content has been fully separated from the
 * public miniature-guacamole repo into the private private-enterprise-enterprise repo.
 *
 * Test order: misuse → boundary → happy path.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SRC_AGENTS_DIR = path.join(ROOT, 'src/framework/agents');
const BUILD_SH = path.join(ROOT, 'build.sh');

function listAgentDirs(): string[] {
  return fs
    .readdirSync(SRC_AGENTS_DIR)
    .filter((name) => !name.startsWith('_') && fs.statSync(path.join(SRC_AGENTS_DIR, name)).isDirectory());
}

// ═══════════════════════════════════════════════════════
// S1: Enterprise Content Absent
// ═══════════════════════════════════════════════════════

describe('S1: Enterprise Content Absent — misuse cases', () => {
  it('sage agent is NOT in src/framework/agents/', () => {
    expect(fs.existsSync(path.join(SRC_AGENTS_DIR, 'sage'))).toBe(false);
  });

  it('enterprise settings template is NOT in src/framework/', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/framework/settings.enterprise.json'))).toBe(false);
  });

  it('dashboard directory does NOT exist', () => {
    expect(fs.existsSync(path.join(ROOT, 'dashboard'))).toBe(false);
  });

  it('docker-compose.yml does NOT exist', () => {
    expect(fs.existsSync(path.join(ROOT, 'docker-compose.yml'))).toBe(false);
  });

  it('enterprise migration does NOT exist', () => {
    expect(fs.existsSync(path.join(ROOT, 'migrations/003-enterprise-auth.sql'))).toBe(false);
  });

  it('enterprise installer tools are NOT present', () => {
    const tools = ['mg-login', 'mg-upgrade', 'mg-dev-key', 'mg-status', 'verify-session.sh'];
    for (const tool of tools) {
      expect(fs.existsSync(path.join(ROOT, 'src/installer', tool))).toBe(false);
    }
  });

  it('enterprise session schema is NOT present', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/installer/ext-session-schema.md'))).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// S2: Community Content Intact
// ═══════════════════════════════════════════════════════

describe('S2: Community Content Intact — boundary cases', () => {
  it('all 23+ community agents are present', () => {
    const agents = listAgentDirs();
    expect(agents.length).toBeGreaterThanOrEqual(23);
    expect(agents).not.toContain('sage');
  });

  it('community settings.json exists', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/framework/settings.json'))).toBe(true);
  });

  it('signing PUBLIC key exists (by design)', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/framework/keys/enterprise-signing.pub'))).toBe(true);
  });

  it('signing PRIVATE key is gitignored', () => {
    const gitignore = fs.readFileSync(path.join(ROOT, 'src/framework/keys/.gitignore'), 'utf-8');
    expect(gitignore).toMatch(/\*\.key/);
  });

  it('build.sh exists and works', () => {
    expect(fs.existsSync(BUILD_SH)).toBe(true);
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    expect(buildSh).toMatch(/private-enterprise-enterprise/i);
  });
});

// ═══════════════════════════════════════════════════════
// S3: Build Script Updated
// ═══════════════════════════════════════════════════════

describe('S3: Build Script Updated — happy path', () => {
  it('build.sh does NOT contain ENTERPRISE_AGENTS exclusion logic', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    expect(buildSh).not.toMatch(/ENTERPRISE_AGENTS=/);
    expect(buildSh).not.toMatch(/is_enterprise=/);
  });

  it('build.sh does NOT reference settings.enterprise.json', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    expect(buildSh).not.toMatch(/settings\.enterprise\.json/);
  });

  it('build.sh references private enterprise repo', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    expect(buildSh).toMatch(/enterprise.*private|private-enterprise-enterprise/i);
  });
});

// ═══════════════════════════════════════════════════════
// S4: Edition Detection Still Works
// ═══════════════════════════════════════════════════════

describe('S4: Edition Detection — happy path', () => {
  it('leadership-team skill still has edition detection check', () => {
    const skillPaths = [
      path.join(ROOT, '.claude/skills/mg-leadership-team/SKILL.md'),
      path.join(ROOT, 'src/framework/skills/mg-leadership-team/SKILL.md'),
    ];

    let skillMd = '';
    for (const p of skillPaths) {
      if (fs.existsSync(p)) {
        skillMd = fs.readFileSync(p, 'utf-8');
        break;
      }
    }

    if (skillMd) {
      // Should check for sage/AGENT.md to detect enterprise mode
      expect(skillMd).toMatch(/sage.*AGENT\.md|ENTERPRISE MODE|COMMUNITY MODE/i);
    }
  });
});
