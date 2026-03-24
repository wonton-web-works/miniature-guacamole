/**
 * Enterprise Separation Tests
 *
 * Verifies that the Sage agent and all enterprise content have been
 * moved to the private theengorg-enterprise repo and are NOT present
 * in this public community repo.
 *
 * Test order: misuse → boundary → happy path (TDD-workflow.md).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '../..');
const FRAMEWORK_AGENTS_DIR = path.join(ROOT, 'src/framework/agents');
const BUILD_SH = path.join(ROOT, 'build.sh');

function listAgentDirs(): string[] {
  return fs
    .readdirSync(FRAMEWORK_AGENTS_DIR)
    .filter((name) => !name.startsWith('_') && fs.statSync(path.join(FRAMEWORK_AGENTS_DIR, name)).isDirectory());
}

// ---------------------------------------------------------------------------
// MISUSE / ATTACK-SURFACE CASES
// ---------------------------------------------------------------------------

describe('enterprise-separation — misuse cases', () => {
  it('sage agent is NOT git-tracked in src/framework/agents/', () => {
    // sage/ may exist on disk as a TEO install artifact but must not be git-tracked
    const sagePath = path.join(FRAMEWORK_AGENTS_DIR, 'sage');
    if (fs.existsSync(sagePath)) {
      const { execSync } = require('child_process');
      const tracked = execSync(`git ls-files "${sagePath}"`, { cwd: ROOT, encoding: 'utf-8' }).trim();
      expect(tracked).toBe('');
    } else {
      expect(fs.existsSync(sagePath)).toBe(false);
    }
  });

  it('enterprise settings file does NOT exist in src/framework/', () => {
    const entSettings = path.join(ROOT, 'src/framework/settings.enterprise.json');
    expect(fs.existsSync(entSettings)).toBe(false);
  });

  it('enterprise installer tools do NOT exist in src/installer/', () => {
    const tools = ['mg-login', 'mg-upgrade', 'mg-dev-key', 'mg-status', 'verify-session.sh', 'enterprise-session-schema.md'];
    for (const tool of tools) {
      const toolPath = path.join(ROOT, 'src/installer', tool);
      expect(fs.existsSync(toolPath)).toBe(false);
    }
  });

  it('dashboard directory does NOT exist', () => {
    const dashboardPath = path.join(ROOT, 'dashboard');
    expect(fs.existsSync(dashboardPath)).toBe(false);
  });

  it('enterprise migration does NOT exist', () => {
    const migPath = path.join(ROOT, 'migrations/003-enterprise-auth.sql');
    expect(fs.existsSync(migPath)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY CASES
// ---------------------------------------------------------------------------

describe('enterprise-separation — boundary cases', () => {
  it('signing PUBLIC key still exists (by design)', () => {
    const pubKey = path.join(ROOT, 'src/framework/keys/enterprise-signing.pub');
    expect(fs.existsSync(pubKey)).toBe(true);
  });

  it('signing PRIVATE key does NOT exist in repo', () => {
    const privKey = path.join(ROOT, 'src/framework/keys/enterprise-signing.key');
    // May exist locally (gitignored) but should not be tracked
    // We verify the .gitignore blocks it
    const gitignore = fs.readFileSync(path.join(ROOT, 'src/framework/keys/.gitignore'), 'utf-8');
    expect(gitignore).toMatch(/\*\.key/);
  });

  it('community settings.json still exists', () => {
    const settings = path.join(ROOT, 'src/framework/settings.json');
    expect(fs.existsSync(settings)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// HAPPY PATH
// ---------------------------------------------------------------------------

describe('enterprise-separation — happy path', () => {
  it('build.sh references enterprise agents in private repo', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    expect(buildSh).toMatch(/enterprise.*private|theengorg-enterprise/i);
  });

  it('build.sh does NOT contain ENTERPRISE_AGENTS exclusion logic', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    expect(buildSh).not.toMatch(/ENTERPRISE_AGENTS=/);
    expect(buildSh).not.toMatch(/is_enterprise=/);
  });

  it('all community agents are present', () => {
    const agents = listAgentDirs();
    const required = [
      'ceo', 'cto', 'cmo', 'cfo',
      'engineering-manager', 'engineering-director',
      'product-manager', 'product-owner',
      'qa', 'dev', 'staff-engineer',
      'design', 'art-director',
      'devops-engineer', 'deployment-engineer',
      'security-engineer', 'data-engineer',
      'api-designer', 'technical-writer',
      'copywriter', 'studio-director',
      'supervisor',
    ];

    for (const agent of required) {
      expect(agents).toContain(agent);
    }

    // sage must not be git-tracked (may exist on disk as a TEO install artifact)
    const { execSync } = require('child_process');
    const sagePath = path.join(FRAMEWORK_AGENTS_DIR, 'sage');
    if (agents.includes('sage')) {
      const tracked = execSync(`git ls-files "${sagePath}"`, { cwd: ROOT, encoding: 'utf-8' }).trim();
      expect(tracked).toBe('');
    }
  });
});
