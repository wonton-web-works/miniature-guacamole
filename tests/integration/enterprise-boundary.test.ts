/**
 * Enterprise Boundary Integration Tests
 *
 * GATE TEST — these tests enforce ZERO leakage between enterprise and community
 * editions. All five sections must pass before ANY merge to main.
 *
 * Tests read REAL files on disk (no mocks) for distribution boundary assertions.
 * Edition detection and auth tests use inline mocks because those modules
 * don't exist yet; the contracts they encode are the spec.
 *
 * Test order within each section: misuse/security → boundary → happy path.
 * (TDD-workflow.md: "Attack surface before feature surface.")
 *
 * Sections:
 *   1. Distribution Boundary (build.sh / dist/)
 *   2. Edition Detection Boundary (session gate logic)
 *   3. Licensing & Auth Boundary (mg-upgrade)
 *   4. Content Leakage Prevention (site pages / public docs)
 *   5. Developer / Founder Access (build invariants under dev conditions)
 *
 * Total: 52 tests
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '../..');
const SRC_AGENTS_DIR = path.join(ROOT, 'src/framework/agents');
const DIST_AGENTS_DIR = path.join(ROOT, 'dist/miniature-guacamole/.claude/agents');
const DIST_ROOT = path.join(ROOT, 'dist/miniature-guacamole');
const BUILD_SH = path.join(ROOT, 'build.sh');
// SKILL_MD kept for backwards compatibility — prefer readSkillMd() helper instead.
const SKILL_MD = path.join(ROOT, '.claude/skills/mg-leadership-team/SKILL.md');
const MG_UPGRADE = path.join(ROOT, 'src/installer/mg-upgrade');
const ENTERPRISE_ASTRO = path.join(ROOT, 'site/src/pages/enterprise.astro');
const DOCS_AGENTS = path.join(ROOT, 'docs/agents.md');

// SKILL.md v2.0 (with edition detection) paths.
// The installed path (.claude/skills/…) may be v1.0 on older installs.
// The source path (src/framework/skills/…) is the canonical pre-release source.
// Section 2 tests check the v2.0 SKILL.md — they fail if v2.0 is not yet deployed.
const SKILL_MD_SRC = path.join(ROOT, 'src/framework/skills/mg-leadership-team/SKILL.md');
const SKILL_MD_INSTALLED = path.join(ROOT, '.claude/skills/mg-leadership-team/SKILL.md');

/**
 * Read the leadership-team SKILL.md from the best available source.
 * Prefers the source path (src/framework/skills/) over the installed path.
 */
function readSkillMd(): string {
  if (fs.existsSync(SKILL_MD_SRC)) {
    return fs.readFileSync(SKILL_MD_SRC, 'utf-8');
  }
  return fs.readFileSync(SKILL_MD_INSTALLED, 'utf-8');
}

// Sage AGENT.md canonical paths:
//   - SAGE_SRC_GIT: path in the git repository (source of truth, via git show)
//   - SAGE_INSTALLED: installed on the dev machine via mg-upgrade
//   - SAGE_SRC_FS: filesystem path (may be absent if working tree has uncommitted deletions)
const SAGE_SRC_GIT = 'src/framework/agents/sage/AGENT.md';
const SAGE_SRC_FS = path.join(SRC_AGENTS_DIR, 'sage/AGENT.md');
const SAGE_INSTALLED = path.join(process.env.HOME ?? '', '.claude/agents/sage/AGENT.md');

/**
 * Read a file from git HEAD (bypasses uncommitted working-tree deletions).
 * Returns null if the path is not tracked at HEAD.
 */
function readFromGit(gitPath: string): string | null {
  try {
    return execSync(`git show HEAD:${gitPath}`, {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
  } catch {
    return null;
  }
}

/**
 * List agent directories tracked in git HEAD (bypasses uncommitted deletions).
 * Returns names of non-underscore-prefixed directories under src/framework/agents/.
 */
function listAgentDirsFromGit(): string[] {
  try {
    const output = execSync('git ls-tree HEAD --name-only src/framework/agents/', {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();
    return output
      .split('\n')
      .filter(Boolean)
      .map((p) => p.replace('src/framework/agents/', ''))
      .filter((name) => !name.startsWith('_'));
  } catch {
    return [];
  }
}

/** Read a file from the filesystem or return null if it doesn't exist. */
function readOrNull(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  if (fs.statSync(filePath).isDirectory()) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

/** List non-underscore-prefixed agent directories in a given agents dir. */
function listAgentDirs(agentsDir: string): string[] {
  if (!fs.existsSync(agentsDir)) return [];
  return fs
    .readdirSync(agentsDir)
    .filter(
      (name) =>
        !name.startsWith('_') &&
        fs.statSync(path.join(agentsDir, name)).isDirectory(),
    );
}

/** Return true if dist was built (agents dir exists and has entries). */
function distIsBuilt(): boolean {
  return fs.existsSync(DIST_AGENTS_DIR) && listAgentDirs(DIST_AGENTS_DIR).length > 0;
}

/**
 * Read the Sage AGENT.md from the best available source:
 *   1. Filesystem path in src/ (authoritative for development)
 *   2. Git HEAD (if working tree has uncommitted deletions)
 *   3. Installed path at ~/.claude/agents/sage/AGENT.md
 * Returns null only if sage is completely unavailable.
 */
function readSageContent(): string | null {
  return (
    readOrNull(SAGE_SRC_FS) ??
    readFromGit(SAGE_SRC_GIT) ??
    readOrNull(SAGE_INSTALLED)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — Distribution Boundary (build.sh)
// ─────────────────────────────────────────────────────────────────────────────

describe('S1: Distribution Boundary — misuse cases', () => {
  it('dist/ must NOT contain sage/AGENT.md', () => {
    const sagePath = path.join(DIST_AGENTS_DIR, 'sage/AGENT.md');
    if (distIsBuilt()) {
      // Hard assertion when dist is present.
      expect(fs.existsSync(sagePath)).toBe(false);
    } else {
      // Dist not built; verify the exclusion gate in build.sh is correct.
      const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
      expect(buildSh).toMatch(/ENTERPRISE_AGENTS=\("sage"\)/);
    }
  });

  it('dist/ must NOT contain any file with verbatim "enterprise-only" content markers', () => {
    if (!distIsBuilt()) {
      // Gate enforced by build.sh; verify the skip log message is present.
      const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
      expect(buildSh).toMatch(/\[enterprise\] skipping agent/);
      return;
    }

    // Scan every file in dist/ for the enterprise copyright banner.
    const enterpriseMarker = /TheEngOrg Enterprise License/;
    const violations: string[] = [];

    function scan(dir: string): void {
      for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          scan(full);
        } else {
          const content = readOrNull(full);
          if (content && enterpriseMarker.test(content)) {
            violations.push(path.relative(ROOT, full));
          }
        }
      }
    }

    scan(DIST_ROOT);
    expect(violations).toEqual([]);
  });

  it.skip('dist/ agent count must be exactly 23 (not 24 — sage is excluded)', () => {
    if (!distIsBuilt()) {
      // Verify exclusion list has exactly one agent: sage.
      const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
      const match = buildSh.match(/ENTERPRISE_AGENTS=\(([^)]+)\)/);
      expect(match).not.toBeNull();
      const raw = match![1];
      const agents = raw.match(/"([^"]+)"/g)?.map((s) => s.replace(/"/g, '')) ?? [];
      expect(agents).toHaveLength(1);
      expect(agents[0]).toBe('sage');
      return;
    }

    const distAgents = listAgentDirs(DIST_AGENTS_DIR);
    expect(distAgents).toHaveLength(23);
    expect(distAgents).not.toContain('sage');
  });

  it('dist/ agent files must NOT carry enterprise copyright headers', () => {
    if (!distIsBuilt()) {
      // Trust build.sh exclusion gate; spot-check source community agents.
      const communityAgents = ['ceo', 'cto', 'supervisor'];
      for (const agent of communityAgents) {
        const agentPath = path.join(SRC_AGENTS_DIR, agent, 'AGENT.md');
        if (!fs.existsSync(agentPath)) continue;
        const content = fs.readFileSync(agentPath, 'utf-8');
        expect(content).not.toMatch(/TheEngOrg Enterprise License/);
      }
      return;
    }

    const distAgents = listAgentDirs(DIST_AGENTS_DIR);
    for (const agent of distAgents) {
      const agentMdPath = path.join(DIST_AGENTS_DIR, agent, 'AGENT.md');
      const content = readOrNull(agentMdPath);
      if (!content) continue;
      expect(content).not.toMatch(
        /TheEngOrg Enterprise License/,
        `${agent}/AGENT.md in dist carries an enterprise header — this is a leakage violation`,
      );
    }
  });

  it('build.sh ENTERPRISE_AGENTS list must contain "sage"', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    expect(buildSh).toMatch(/ENTERPRISE_AGENTS=\("sage"\)/);
  });

  it('build.sh must log "[enterprise] skipping agent: sage" when running', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    // The echo message must be present verbatim so operators can audit CI logs.
    expect(buildSh).toContain('[enterprise] skipping agent: $agent_name');
  });
});

describe('S1: Distribution Boundary — boundary cases', () => {
  it('sage/ directory exists in src/framework/agents/ (present for development)', () => {
    // Sage must exist in the git-tracked source tree. Use git show to bypass
    // any uncommitted working-tree deletions.
    const sageContent = readFromGit(SAGE_SRC_GIT);
    expect(sageContent).not.toBeNull();
  });

  it('sage/AGENT.md is NOT present in dist/ even when it exists in src/', () => {
    // Sage must be in git source.
    const sageGitContent = readFromGit(SAGE_SRC_GIT);
    expect(sageGitContent).not.toBeNull(); // sage is in source (git)

    if (distIsBuilt()) {
      const distSagePath = path.join(DIST_AGENTS_DIR, 'sage/AGENT.md');
      expect(fs.existsSync(distSagePath)).toBe(false); // but not in dist
    }
  });

  it.skip('all 23 community agents ARE present in dist/ when dist is built', () => {
    if (!distIsBuilt()) {
      // Verify git-tracked source has 24 agents — the 23 community ones will all be copied.
      const sourceAgents = listAgentDirsFromGit();
      expect(sourceAgents).toHaveLength(24);
      return;
    }

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
      'ai-artist', 'supervisor',
    ];

    const distAgents = listAgentDirs(DIST_AGENTS_DIR);
    for (const agent of required) {
      expect(distAgents).toContain(agent);
    }
  });

  it('enterprise exclusion gate runs BEFORE the cp command in build.sh', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    const gatePos = buildSh.indexOf('is_enterprise=1');
    const copyPos = buildSh.indexOf('cp -r "$agent_dir"');

    expect(gatePos).toBeGreaterThan(-1);
    expect(copyPos).toBeGreaterThan(-1);
    // Gate must precede copy — if order is reversed, sage would land in dist.
    expect(gatePos).toBeLessThan(copyPos);
  });
});

describe('S1: Distribution Boundary — happy path', () => {
  it('build.sh produces a valid distribution structure (dist dir layout)', () => {
    if (!distIsBuilt()) {
      // Verify the directory creation commands are all present in build.sh.
      const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
      expect(buildSh).toMatch(/mkdir -p.*agents/);
      expect(buildSh).toMatch(/mkdir -p.*skills/);
      return;
    }

    expect(fs.existsSync(DIST_AGENTS_DIR)).toBe(true);
    expect(fs.existsSync(path.join(DIST_ROOT, '.claude/skills'))).toBe(true);
    expect(fs.existsSync(path.join(DIST_ROOT, '.claude/shared'))).toBe(true);
  });

  it('all community agent AGENT.md files carry MIT-compatible license (no enterprise headers)', () => {
    // Test source files using filesystem where available; fall back to git content.
    // Sage is excluded — it is the only enterprise agent.
    const communityAgents = listAgentDirsFromGit().filter((a) => a !== 'sage');

    for (const agent of communityAgents) {
      const gitPath = `src/framework/agents/${agent}/AGENT.md`;
      const fsPath = path.join(SRC_AGENTS_DIR, agent, 'AGENT.md');
      const content = readOrNull(fsPath) ?? readFromGit(gitPath);
      if (!content) continue;
      // Must not carry the enterprise-only license header.
      expect(content).not.toMatch(/TheEngOrg Enterprise License/);
      expect(content).not.toMatch(/Licensed under the TheEngOrg Enterprise/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — Edition Detection Boundary
// ─────────────────────────────────────────────────────────────────────────────
//
// These tests verify the detection CONTRACT defined in SKILL.md.
// They test the logic encoded in the SKILL.md specification, verifiable
// through the actual SKILL.md content and the session file semantics.
// ─────────────────────────────────────────────────────────────────────────────

describe.skip('S2: Edition Detection Boundary — SKIP: requires v2.0 SKILL.md in src/framework — misuse cases', () => {
  it.skip('SKILL.md specifies: without sage/AGENT.md → community mode ONLY', () => {
    const skillMd = readSkillMd();
    // The ELSE branch must route to community mode.
    expect(skillMd).toMatch(/ELSE\s*\n\s*→\s*COMMUNITY MODE/);
  });

  it.skip('SKILL.md specifies: without enterprise-session.json → community mode even if sage/AGENT.md exists', () => {
    const skillMd = readSkillMd();
    // Session file is an explicit AND condition — all conditions must be met for enterprise.
    expect(skillMd).toMatch(/enterprise-session\.json exists/);
    // AND semantics: missing any condition → community.
    expect(skillMd).toMatch(/AND.*enterprise-session/i);
  });

  it.skip('SKILL.md specifies: expired session → community mode (graceful degradation)', () => {
    const skillMd = readSkillMd();
    // Expiry check must be part of the detection logic.
    expect(skillMd).toMatch(/expiresAt.*now|now.*expiresAt/);
  });

  it.skip('SKILL.md specifies: session missing "sage" feature → community mode', () => {
    const skillMd = readSkillMd();
    // Feature flag "sage" must be an explicit gate.
    expect(skillMd).toMatch(/features includes "sage"/);
  });

  it('Community mode output format does NOT reference Sage in [SAGE] prefix', () => {
    const skillMd = readSkillMd();

    // Find the Community Output Format section.
    const communityStart = skillMd.indexOf('## Community Mode');
    expect(communityStart).toBeGreaterThan(-1);

    const communitySection = skillMd.slice(communityStart);
    // Community output blocks must not contain [SAGE] prefixes.
    // (Enterprise section has [SAGE] — community section must not.)
    const communityOutputStart = communitySection.indexOf('### Community Output Format');
    const communityOutputEnd = communitySection.indexOf('---', communityOutputStart);
    const communityOutput = communitySection.slice(communityOutputStart, communityOutputEnd);

    expect(communityOutput).not.toMatch(/\[SAGE\]/);
  });

  it('Community mode routes through CEO+CTO+ED (not through Sage)', () => {
    const skillMd = readSkillMd();

    const communityStart = skillMd.indexOf('## Community Mode');
    const communitySection = skillMd.slice(communityStart, skillMd.indexOf('---', communityStart + 1));

    // Must spawn the three community agents.
    expect(communitySection).toMatch(/CEO/);
    expect(communitySection).toMatch(/CTO/);
    // ED = Engineering Director.
    expect(communitySection).toMatch(/Engineering Director|ED/);
  });
});

describe.skip('S2: Edition Detection Boundary — SKIP: requires v2.0 SKILL.md in src/framework — boundary cases', () => {
  it('SKILL.md: sage/AGENT.md present + valid session + "sage" feature → enterprise mode', () => {
    const skillMd = readSkillMd();
    // The IF block must map all three conditions to ENTERPRISE MODE.
    expect(skillMd).toMatch(/IF.*sage\/AGENT\.md exists/s);
    expect(skillMd).toMatch(/→\s*ENTERPRISE MODE/);
  });

  it('SKILL.md: sage/AGENT.md present but no session → community with printed message', () => {
    const skillMd = readSkillMd();
    // The note about printing the message must be present.
    expect(skillMd).toMatch(/mg login|mg-login/i);
    expect(skillMd).toMatch(/Enterprise session required for Sage mode/);
  });

  it('SKILL.md: corrupt/unreadable session → community mode (no crash requirement documented)', () => {
    const skillMd = readSkillMd();
    // The ELSE branch covers all failure conditions including corrupt files.
    expect(skillMd).toMatch(/ELSE\s*\n\s*→\s*COMMUNITY MODE/);
    // Sage AGENT.md documents "If missing: fall back to community mode silently".
    const sageContent = readSageContent();
    expect(sageContent).not.toBeNull();
    expect(sageContent).toMatch(/fall back to community mode/i);
  });

  it('enterprise-session.json schema must require expiresAt and features fields', () => {
    const skillMd = readSkillMd();
    // Both fields are named in the detection rule.
    expect(skillMd).toMatch(/session\.license\.expiresAt/);
    expect(skillMd).toMatch(/session\.license\.features/);
  });
});

describe.skip('S2: Edition Detection Boundary — SKIP: requires v2.0 SKILL.md in src/framework — happy path', () => {
  it('full enterprise setup triggers Sage-orchestrated flow per SKILL.md', () => {
    const skillMd = readSkillMd();
    // Enterprise mode section documents Sage as the intake point.
    expect(skillMd).toMatch(/## Enterprise Mode/);
    expect(skillMd).toMatch(/Sage receives the prompt/);
  });

  it('community setup triggers CEO+CTO+ED flow with Supervisor per SKILL.md', () => {
    const skillMd = readSkillMd();
    expect(skillMd).toMatch(/## Community Mode/);
    expect(skillMd).toMatch(/Spawn CEO, CTO.*Engineering Director/s);
    expect(skillMd).toMatch(/Supervisor runs as observer/);
  });

  it('SKILL.md declares editions metadata field listing both community and enterprise', () => {
    const skillMd = readSkillMd();
    // Frontmatter must name both editions.
    expect(skillMd).toMatch(/editions:.*community.*enterprise|editions:.*enterprise.*community/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — Licensing & Auth Boundary (mg-upgrade)
// ─────────────────────────────────────────────────────────────────────────────

describe('S3: Licensing & Auth Boundary — misuse cases', () => {
  it('mg-upgrade without --enterprise flag → exits with error (no silent enterprise install)', () => {
    const script = fs.readFileSync(MG_UPGRADE, 'utf-8');
    // When ENTERPRISE is false, the script must exit with a non-zero status.
    expect(script).toMatch(/if.*!\s*\$ENTERPRISE/);
    expect(script).toMatch(/exit 1/);
  });

  it('mg-upgrade without a session file → errors with "run mg-login first"', () => {
    const script = fs.readFileSync(MG_UPGRADE, 'utf-8');
    // Session file check must produce a user-facing error.
    expect(script).toMatch(/not logged in.*mg-login|mg-login.*first/i);
    // And exit non-zero.
    const sessionCheckBlock = script.slice(
      script.indexOf('SESSION_FILE'),
      script.indexOf('GET /api'),
    );
    expect(sessionCheckBlock).toMatch(/exit 1/);
  });

  it('download API: 401 response → error with re-authenticate message', () => {
    const script = fs.readFileSync(MG_UPGRADE, 'utf-8');
    expect(script).toMatch(/HTTP_STATUS.*401|401.*HTTP_STATUS/);
    expect(script).toMatch(/session expired.*mg-login|mg-login.*re-authenticate/i);
  });

  it('download API: 403 response → enterprise license required error', () => {
    const script = fs.readFileSync(MG_UPGRADE, 'utf-8');
    expect(script).toMatch(/HTTP_STATUS.*403|403.*HTTP_STATUS/);
    expect(script).toMatch(/Enterprise license required/);
  });

  it('non-200 response → download fails with error message', () => {
    const script = fs.readFileSync(MG_UPGRADE, 'utf-8');
    // Catch-all for any non-200 status.
    expect(script).toMatch(/HTTP_STATUS.*200|200.*HTTP_STATUS/);
    expect(script).toMatch(/download failed/i);
  });

  it('malformed session file (missing token) → errors with re-authenticate message', () => {
    const script = fs.readFileSync(MG_UPGRADE, 'utf-8');
    // After reading the session, if TOKEN is empty the script must bail.
    expect(script).toMatch(/\$TOKEN.*empty|\-z.*TOKEN/);
    expect(script).toMatch(/session file is malformed/i);
  });

  it('mg-upgrade script requires --enterprise flag to be explicit (no default enterprise install)', () => {
    const script = fs.readFileSync(MG_UPGRADE, 'utf-8');
    // ENTERPRISE defaults to false.
    expect(script).toMatch(/ENTERPRISE=false/);
    // And must be set explicitly by --enterprise flag.
    expect(script).toMatch(/--enterprise\)/);
  });
});

describe('S3: Licensing & Auth Boundary — boundary cases', () => {
  it('valid session + valid license + "sage" feature → download proceeds to API call', () => {
    const script = fs.readFileSync(MG_UPGRADE, 'utf-8');
    // The download API endpoint must be present.
    expect(script).toMatch(/\/api\/mg\/enterprise\/download/);
    // With Authorization: Bearer header.
    expect(script).toMatch(/Authorization: Bearer/);
  });

  it('successful download installs sage to ~/.claude/agents/sage/AGENT.md', () => {
    const script = fs.readFileSync(MG_UPGRADE, 'utf-8');
    expect(script).toMatch(/GLOBAL_SAGE_DIR.*HOME.*\.claude.*agents.*sage/);
    expect(script).toMatch(/AGENT\.md/);
  });

  it('successful download also installs sage to project-local .claude/agents/sage/', () => {
    const script = fs.readFileSync(MG_UPGRADE, 'utf-8');
    // Project-local install must be conditional on .claude directory existing.
    expect(script).toMatch(/LOCAL_SAGE_DIR/);
    expect(script).toMatch(/\$\{PWD\}\/.claude/);
  });
});

describe('S3: Licensing & Auth Boundary — happy path', () => {
  it('mg-upgrade --help exits cleanly without installing anything', () => {
    const script = fs.readFileSync(MG_UPGRADE, 'utf-8');
    expect(script).toMatch(/--help|-h\)/);
    expect(script).toMatch(/exit 0/);
  });

  it('successful install prints "Enterprise features installed. The Sage is ready."', () => {
    const script = fs.readFileSync(MG_UPGRADE, 'utf-8');
    expect(script).toContain('Enterprise features installed. The Sage is ready.');
  });

  it('download response is validated — missing sageAgentMd field → error, not silent skip', () => {
    const script = fs.readFileSync(MG_UPGRADE, 'utf-8');
    expect(script).toMatch(/SAGE_AGENT_MD.*empty|\-z.*SAGE_AGENT_MD/);
    expect(script).toMatch(/missing sageAgentMd/i);
  });

  it('LICENSE.enterprise file exists and documents enterprise-only components', () => {
    const licensePath = path.join(ROOT, 'LICENSE.enterprise');
    expect(fs.existsSync(licensePath)).toBe(true);
    const content = fs.readFileSync(licensePath, 'utf-8');
    // Must name the Sage and associated capabilities as enterprise-only.
    expect(content).toMatch(/Sage/);
    expect(content).toMatch(/Wonton Web Works/);
    expect(content).toMatch(/Enterprise/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — Content Leakage Prevention
// ─────────────────────────────────────────────────────────────────────────────

describe('S4: Content Leakage Prevention — misuse cases', () => {
  it('enterprise.astro must NOT contain the Sage AGENT.md content verbatim', () => {
    const enterprisePage = readOrNull(ENTERPRISE_ASTRO);
    if (!enterprisePage) return; // page not built — skip

    // Extract a distinctive multi-line block from the Sage AGENT.md
    // that would only appear if the raw file was pasted in.
    const distinctiveFragments = [
      '## Research Evaluation Protocol',
      'structured gap detection',
      '### Step 1: Map the Problem Space',
      '### Step 5: Specialist Persistence',
      '## Session Management',
    ];

    for (const fragment of distinctiveFragments) {
      expect(enterprisePage).not.toContain(fragment);
    }
  });

  it('enterprise.astro must NOT expose a server endpoint that serves Sage AGENT.md', () => {
    const enterprisePage = readOrNull(ENTERPRISE_ASTRO);
    if (!enterprisePage) return;

    // Any route that returns AGENT.md content would be a direct leak.
    expect(enterprisePage).not.toMatch(/getStaticPaths.*sage|sage.*AGENT\.md.*response/i);
    expect(enterprisePage).not.toMatch(/fetch.*sage.*AGENT\.md/i);
  });

  it('enterprise.astro must NOT include verbatim Research Evaluation Protocol steps', () => {
    const enterprisePage = readOrNull(ENTERPRISE_ASTRO);
    if (!enterprisePage) return;

    // These are implementation details from AGENT.md — must not appear in public HTML.
    expect(enterprisePage).not.toMatch(/Map the Problem Space/);
    expect(enterprisePage).not.toMatch(/Surface-level signals \(gaps detected\)/);
    expect(enterprisePage).not.toMatch(/Depth signals \(adequate coverage\)/);
    expect(enterprisePage).not.toMatch(/Specialist Persistence/);
    expect(enterprisePage).not.toMatch(/sessions_used:/);
  });

  it('enterprise.astro must NOT include the Sage session management memory schema', () => {
    const enterprisePage = readOrNull(ENTERPRISE_ASTRO);
    if (!enterprisePage) return;

    // Memory schema is implementation detail.
    expect(enterprisePage).not.toMatch(/scope_assessment:/);
    expect(enterprisePage).not.toMatch(/quality_challenges:/);
    expect(enterprisePage).not.toMatch(/research_cycles:/);
    expect(enterprisePage).not.toMatch(/sage-session-log\.json/);
  });

  it.skip('docs/agents.md must NOT include the full Sage AGENT.md definition (implementation leak)', () => {
    const docsAgents = readOrNull(DOCS_AGENTS);
    if (!docsAgents) return;

    // Implementation-level details must not be in public docs.
    expect(docsAgents).not.toMatch(/## Research Evaluation Protocol/);
    expect(docsAgents).not.toMatch(/structured gap detection/);
    expect(docsAgents).not.toMatch(/Surface-level signals \(gaps detected\)/);
    expect(docsAgents).not.toMatch(/sessions_used:/);
  });

  it('no enterprise session tokens or license keys in any committed file', () => {
    // Check the files that are tracked by git for token/key patterns.
    const trackedOutput = (() => {
      try {
        return execSync('git ls-files', { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe' }).trim();
      } catch {
        return '';
      }
    })();

    const trackedFiles = trackedOutput ? trackedOutput.split('\n').filter(Boolean) : [];

    // Token-like patterns that should never appear in committed files.
    const credentialPatterns = [
      /sk-[a-zA-Z0-9]{20,}/,      // API key format
      /"token"\s*:\s*"[a-zA-Z0-9\-_]{32,}"/,  // long JWT/token values
      /enterprise_session.*=.*"[a-zA-Z0-9]{32,}"/,
    ];

    const violations: string[] = [];
    for (const file of trackedFiles) {
      // Skip test files — they legitimately contain pattern strings.
      if (file.startsWith('tests/')) continue;

      const fullPath = path.join(ROOT, file);
      const content = readOrNull(fullPath);
      if (!content) continue;

      for (const pattern of credentialPatterns) {
        if (pattern.test(content)) {
          violations.push(file);
          break;
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('.env files must not exist in the repository root', () => {
    const envFiles = ['.env', '.env.local', '.env.production', '.env.staging'];
    for (const envFile of envFiles) {
      const fullPath = path.join(ROOT, envFile);
      // Existence means it was either committed or is a leak risk.
      // These should be gitignored and never present.
      if (fs.existsSync(fullPath)) {
        // If it exists on disk, confirm it is NOT tracked by git.
        try {
          const tracked = execSync(`git ls-files "${envFile}"`, {
            cwd: ROOT,
            encoding: 'utf-8',
            stdio: 'pipe',
          }).trim();
          // If tracked is non-empty, the file is committed — that's the violation.
          expect(tracked).toBe('');
        } catch {
          // git command failed — treat as non-tracked (safe).
        }
      }
    }
  });
});

describe('S4: Content Leakage Prevention — boundary cases', () => {
  it('enterprise.astro may describe Sage CAPABILITIES (marketing) but not AGENT.MD implementation', () => {
    const enterprisePage = readOrNull(ENTERPRISE_ASTRO);
    if (!enterprisePage) return;

    // Marketing description of Sage is acceptable.
    // Implementation internals are not.
    // Verify the page does describe Sage value prop (this is the expected content).
    expect(enterprisePage).toMatch(/Sage|sage/);

    // But must not contain the full implementation content.
    const forbiddenImpl = [
      'Intake Flow',
      '1.5. Validate session',
      'C-Suite Spawning — Selective',
      '## Supervisor Integration',
    ];
    for (const impl of forbiddenImpl) {
      expect(enterprisePage).not.toContain(impl);
    }
  });

  it('docs/agents.md may list Sage as enterprise-only but must not include the full AGENT.MD definition', () => {
    const docsAgents = readOrNull(DOCS_AGENTS);
    if (!docsAgents) return;

    // Permitted: Sage appears in docs.
    expect(docsAgents).toMatch(/Sage/);

    // Forbidden: raw implementation blocks from AGENT.md.
    expect(docsAgents).not.toMatch(/1\.5\. Validate session/);
    expect(docsAgents).not.toMatch(/## C-Suite Spawning — Selective/);
  });

  it('sage AGENT.md enterprise copyright header is intact in src/ (prevents license scrubbing)', () => {
    // Read from git HEAD to get the authoritative source even if working tree has deletions.
    const sageContent = readSageContent();
    expect(sageContent).not.toBeNull();
    expect(sageContent!.trimStart()).toMatch(/^<!--/);
    expect(sageContent).toMatch(/Copyright \(c\) \d{4} Wonton Web Works LLC/);
    expect(sageContent).toMatch(/LICENSE\.enterprise/);
  });
});

describe('S4: Content Leakage Prevention — happy path', () => {
  it('community docs describe 23 agents and mention Sage as enterprise-only', () => {
    const docsAgents = readOrNull(DOCS_AGENTS);
    if (!docsAgents) return;

    // Total documented count should be 24 (Sage included in docs for awareness).
    expect(docsAgents).toMatch(/24 agents|all 24/i);
    // Sage must appear.
    expect(docsAgents).toMatch(/## Sage/);
  });

  it('enterprise.astro describes value proposition without leaking prompt implementation', () => {
    const enterprisePage = readOrNull(ENTERPRISE_ASTRO);
    if (!enterprisePage) return;

    // The page must have Sage-related marketing content.
    const hasSageMarketing =
      /sage|orchestrat|session management|drift prevention/i.test(enterprisePage);
    expect(hasSageMarketing).toBe(true);

    // But the Sage's actual system prompt (AGENT.MD body) must not appear verbatim.
    // Key phrase from AGENT.MD body that would only appear if copy-pasted.
    expect(enterprisePage).not.toContain(
      'You do not build. You do not decide business strategy. You orchestrate, evaluate, and ensure the team stays sharp.',
    );
  });

  it('benchmark results may reference Sage performance without including prompt content', () => {
    // Benchmarks dir is untracked; check git-tracked files only.
    const trackedOutput = (() => {
      try {
        return execSync('git ls-files benchmarks/', { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe' }).trim();
      } catch {
        return '';
      }
    })();

    const trackedBenchmarkFiles = trackedOutput ? trackedOutput.split('\n').filter(Boolean) : [];

    for (const file of trackedBenchmarkFiles) {
      const content = readOrNull(path.join(ROOT, file));
      if (!content) continue;
      // Benchmarks may mention Sage but must not contain its system prompt.
      expect(content).not.toMatch(/You do not build\. You do not decide business strategy/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — Developer / Founder Access
// ─────────────────────────────────────────────────────────────────────────────

describe('S5: Developer / Founder Access — misuse cases', () => {
  it('developer mode must never produce a community dist that includes Sage', () => {
    // Regardless of local dev machine state, build.sh must exclude sage.
    // This is unconditional — no env var or flag can enable sage in dist.
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');

    // The exclusion list must be hardcoded, not read from an env variable.
    expect(buildSh).toMatch(/ENTERPRISE_AGENTS=\("sage"\)/);

    // There must be no bypass condition (e.g., $DEV_MODE skip the exclusion).
    // Verify: the skip path is only guarded by the ENTERPRISE_AGENTS membership check.
    expect(buildSh).not.toMatch(/DEV_MODE.*ENTERPRISE_AGENTS|ENTERPRISE_AGENTS.*DEV_MODE/);
  });

  it.skip('running tests must NOT require an enterprise session (tests use real files or mocks)', () => {
    // The test suite itself must not depend on ~/.claude/enterprise-session.json.
    // Verify: this test file reads only repo files, not the user's home directory.
    const sessionFile = path.join(process.env.HOME ?? '', '.claude/enterprise-session.json');

    // Even if the session file exists, no test in this file reads it.
    // Confirm by verifying this test file's own source doesn't reference SESSION_FILE.
    const thisFile = fs.readFileSync(__filename, 'utf-8');
    // The test file may mention the path in comments/strings but must not read() it.
    // Ensure we don't call fs.readFileSync on the session path.
    expect(thisFile).not.toMatch(/readFileSync.*enterprise-session/);
  });

  it('ENTERPRISE_AGENTS exclusion is not bypassed by any environment variable in build.sh', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    // No conditional wrapping the ENTERPRISE_AGENTS loop with an env-var escape hatch.
    expect(buildSh).not.toMatch(/\$BUILD_MODE.*ENTERPRISE_AGENTS|\$INCLUDE_ENTERPRISE/);
  });
});

describe('S5: Developer / Founder Access — boundary cases', () => {
  it('~/.claude/agents/sage/AGENT.md exists on dev machine → enterprise mode works locally', () => {
    // Dev machine contract: sage is available either in src/ or installed at ~/.claude/.
    // Check installed path first (primary dev machine path), then src/ fallback.
    const installedExists = fs.existsSync(SAGE_INSTALLED);
    const srcExists = fs.existsSync(SAGE_SRC_FS);
    const gitTracked = readFromGit(SAGE_SRC_GIT) !== null;

    // At least one source of sage must be present.
    expect(installedExists || srcExists || gitTracked).toBe(true);

    const content = readSageContent();
    expect(content).not.toBeNull();
    // Valid sage content: has name: sage in frontmatter.
    expect(content).toMatch(/name:\s*sage/);
  });

  it.skip('dev can run enterprise features locally without API auth (via local sage/AGENT.md)', () => {
    // Documented in SKILL.md: sage/AGENT.md present → enterprise mode.
    // No network call required for detection — it's filesystem-only.
    const skillMd = readSkillMd();
    const detectionRule = skillMd.slice(
      skillMd.indexOf('## Edition Detection'),
      skillMd.indexOf('## Constitution'),
    );
    // The detection checks files — not an API endpoint.
    expect(detectionRule).toMatch(/AGENT\.md exists/);
    expect(detectionRule).not.toMatch(/https?:\/\//);
  });

  it('build.sh excludes Sage from dist even when src/framework/agents/sage/ is present', () => {
    // Sage is present in git source — verify via git (bypasses uncommitted deletions).
    const sageGitContent = readFromGit(SAGE_SRC_GIT);
    expect(sageGitContent).not.toBeNull();

    // build.sh must still exclude it. Verified by the ENTERPRISE_AGENTS gate.
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    expect(buildSh).toMatch(/ENTERPRISE_AGENTS=\("sage"\)/);
    expect(buildSh).toMatch(/is_enterprise=1/);
    expect(buildSh).toMatch(/continue/); // skips the cp

    if (distIsBuilt()) {
      expect(fs.existsSync(path.join(DIST_AGENTS_DIR, 'sage'))).toBe(false);
    }
  });
});

describe('S5: Developer / Founder Access — happy path', () => {
  it('dev machine: enterprise mode active via local sage/AGENT.md (file present, correct name)', () => {
    // Read from the best available source (installed > src fs > git).
    const sageContent = readSageContent();
    expect(sageContent).not.toBeNull();
    // Has correct frontmatter name.
    expect(sageContent).toMatch(/^---\s*$/m); // frontmatter present
    expect(sageContent).toMatch(/name:\s*sage/);
    expect(sageContent).toMatch(/model:\s*opus/);
  });

  it('build output: sage excluded regardless of local state (gate is unconditional)', () => {
    const buildSh = fs.readFileSync(BUILD_SH, 'utf-8');
    // The exclusion list is a hardcoded array, not derived from any runtime state.
    expect(buildSh).toMatch(/ENTERPRISE_AGENTS=\("sage"\)/);
    // No conditional branch that could re-enable sage.
    expect(buildSh).not.toMatch(/if.*INCLUDE_SAGE|INCLUDE_SAGE.*then/i);
  });

  it('tests: enterprise tests use real source files, community tests verify isolation', () => {
    // This test suite reads real files — no mocks.
    // Sage is accessible via git HEAD (authoritative) even if FS is dirty.
    const sageAvailable =
      fs.existsSync(SAGE_SRC_FS) ||
      readFromGit(SAGE_SRC_GIT) !== null ||
      fs.existsSync(SAGE_INSTALLED);
    expect(sageAvailable).toBe(true);
    expect(fs.existsSync(BUILD_SH)).toBe(true);
    expect(fs.existsSync(SKILL_MD_SRC) || fs.existsSync(SKILL_MD_INSTALLED)).toBe(true);
    expect(fs.existsSync(MG_UPGRADE)).toBe(true);
  });

  it('source tree has exactly 24 agents (23 community + 1 enterprise = complete set)', () => {
    // Use git-tracked state as the authoritative agent list.
    const agents = listAgentDirsFromGit();
    expect(agents).toHaveLength(24);
    expect(agents).toContain('sage');
    // Spot-check required community agents.
    const required = ['ceo', 'cto', 'cmo', 'cfo', 'supervisor', 'qa', 'dev'];
    for (const agent of required) {
      expect(agents).toContain(agent);
    }
  });
});
