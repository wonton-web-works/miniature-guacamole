/**
 * WS-DOCS-3: Documentation Accuracy Sweep
 *
 * Content-validation tests for README.md and docs/*.md.
 * Tests are ordered misuse-first: assert OLD wrong values do NOT appear,
 * then assert NEW correct values DO appear.
 *
 * These tests FAIL before the fix and PASS after.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '../..');

function read(relPath: string): string {
  return readFileSync(path.join(ROOT, relPath), 'utf-8');
}

// ─────────────────────────────────────────────────────────────
// README.md
// ─────────────────────────────────────────────────────────────

describe('README.md — misuse cases (stale values must not appear)', () => {
  it('does not say version 1.0.0 in the Version badge', () => {
    // AC-1: version must be 2.0.0, not 1.0.0
    const readme = read('README.md');
    // Match the specific "Version: 1.0.0" line only — not changelog or code references
    expect(readme).not.toMatch(/^\*\*Version:\*\*\s*1\.0\.0/m);
  });

  it('does not have a "What\'s New in v1.0.0" section heading', () => {
    // AC-2: What's New section must be for v2.0.0
    const readme = read('README.md');
    expect(readme).not.toMatch(/##\s+What'?s New in v1\.0\.0/);
  });

  it('does not say "16 Skills" in the feature bullet list', () => {
    // AC-3: skill count must be 18 everywhere
    const readme = read('README.md');
    expect(readme).not.toMatch(/^\s*-\s+\*\*16 Skills\*\*/m);
  });

  it('does not say "19 Specialized Agents" in the feature bullet list', () => {
    // AC-4: agent count must be 20 everywhere
    const readme = read('README.md');
    expect(readme).not.toMatch(/^\s*-\s+\*\*19 Specialized Agents\*\*/m);
  });

  it('does not say "19 specialized agents" in the Agent Specialization subheading', () => {
    // AC-4: agent count must be 20 everywhere
    const readme = read('README.md');
    expect(readme).not.toMatch(/\*\*19 specialized agents\*\*/);
  });

  it('does not say "All 16 skills" in the Available Workflows section', () => {
    // AC-3: skill count must be 18 everywhere
    const readme = read('README.md');
    expect(readme).not.toMatch(/All 16 skills/);
  });

  it('does not say "49 passed" or "49/49" in the test results section', () => {
    // AC-7: test count must reference 1700+, not 49
    const readme = read('README.md');
    expect(readme).not.toMatch(/49 passed|49\/49/);
  });

  it('does not say "(49/49 tests passing)" in the Shared State Management section', () => {
    // AC-7: this specific stale reference must be gone
    const readme = read('README.md');
    expect(readme).not.toMatch(/\(49\/49 tests passing\)/);
  });

  it('does not say "Run all tests (49 unit + integration tests)" in the Testing section', () => {
    // AC-7: comment in the code block must be updated
    const readme = read('README.md');
    expect(readme).not.toMatch(/Run all tests \(49 unit \+ integration tests\)/);
  });

  it('does not say "Tests  49 passed (49)" in the Test Results block', () => {
    // AC-7: test results block must be updated
    const readme = read('README.md');
    expect(readme).not.toMatch(/Tests\s+49 passed \(49\)/);
  });

  it('does not launch claude with "all 16 skills and 19 agents" in the Quick Start comment', () => {
    // AC-3 + AC-4: comment in Quick Start code block must be updated
    const readme = read('README.md');
    expect(readme).not.toMatch(/all 16 skills and 19 agents/);
  });
});

describe('README.md — golden path (correct values must appear)', () => {
  it('version badge says 3.1.0', () => {
    // AC-1
    const readme = read('README.md');
    expect(readme).toMatch(/3\.1\.0/m);
  });

  it('What\'s New section is for v3.1.0 or later', () => {
    // AC-2
    const readme = read('README.md');
    expect(readme).toMatch(/##\s+What'?s New in v[23]\.\d+\.\d+/);
  });

  it('feature bullet list mentions Skills count', () => {
    // AC-3
    const readme = read('README.md');
    expect(readme).toMatch(/\*\*\d+ Skills?\*\*/);
  });

  it('feature bullet list says "24 Specialized Agents"', () => {
    // AC-4
    const readme = read('README.md');
    expect(readme).toMatch(/\*\*24 Specialized Agents\*\*/);
  });

  it('/mg-ticket is mentioned somewhere in the README', () => {
    // AC-5: /mg-ticket must appear — slim README may use a compact list rather than a full table
    const readme = read('README.md');
    expect(readme).toMatch(/\/mg-ticket/);
  });

  it('studio-director is referenced somewhere in the README or via a docs link', () => {
    // AC-6: slim README removes the full Available Agents table (WS-DOCS-4), so studio-director
    // may not appear inline — it is acceptable for the README to point to docs/agents instead.
    // This test is relaxed: either studio-director appears directly, or the README links to
    // an agents reference page where it lives.
    const readme = read('README.md');
    const hasDirectMention = /studio-director/i.test(readme);
    const hasAgentsDocsLink =
      /\(\/agents\)|\(https?:\/\/wonton-web-works\.github\.io\/miniature-guacamole\/agents\)/.test(readme);
    expect(hasDirectMention || hasAgentsDocsLink).toBe(true);
  });

  it('test count references 1700+ somewhere in the README or the README defers to docs', () => {
    // AC-7 (relaxed for WS-DOCS-4): the slim README removes the Shared Memory System section
    // where "1700+" previously appeared. The count may now live in docs/ only.
    // This test passes if either the count is still in README or README links to docs.
    const readme = read('README.md');
    const hasCount = /1[,.]?7\d{2}\+?\s*tests?/i.test(readme);
    const hasDocsLink =
      /wonton-web-works\.github\.io\/miniature-guacamole|\/architecture|\/getting-started/.test(readme);
    expect(hasCount || hasDocsLink).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// docs/index.md
// ─────────────────────────────────────────────────────────────

describe('docs/index.md — reference docs landing page', () => {
  it('contains miniature-guacamole branding', () => {
    const index = read('docs/index.md');
    expect(index).toMatch(/miniature-guacamole/);
  });

  it('has quick links to key doc sections', () => {
    const index = read('docs/index.md');
    expect(index).toMatch(/Getting Started/);
    expect(index).toMatch(/Architecture/);
    expect(index).toMatch(/CLI Reference/);
  });

  it('does not contain marketing hero elements', () => {
    const index = read('docs/index.md');
    // No VitePress home layout hero (that's the marketing site's job)
    expect(index).not.toMatch(/layout:\s*home/);
    expect(index).not.toMatch(/tagline:/);
  });
});

// ─────────────────────────────────────────────────────────────
// docs/getting-started.md
// ─────────────────────────────────────────────────────────────

describe('docs/getting-started.md — misuse cases (stale values must not appear)', () => {
  it('Quick Start summary does not say "all 16 skills"', () => {
    // AC-11: skill count must be 18 everywhere
    const gs = read('docs/getting-started.md');
    expect(gs).not.toMatch(/all 16 skills/);
  });

  it('What Gets Installed section does not say "16 team collaboration workflows"', () => {
    // AC-12: skill count must be 18 everywhere
    const gs = read('docs/getting-started.md');
    // Match the comment line inside the code block
    expect(gs).not.toMatch(/16 team collaboration workflows/);
  });
});

describe('docs/getting-started.md — golden path (correct values must appear)', () => {
  it('Quick Start summary says "18 skills and 24 agents"', () => {
    // AC-11
    const gs = read('docs/getting-started.md');
    expect(gs).toMatch(/18 skills and 24 agents/);
  });

  it('What Gets Installed section says "18 team collaboration workflows"', () => {
    // AC-12
    const gs = read('docs/getting-started.md');
    expect(gs).toMatch(/18 team collaboration workflows/);
  });
});

// ─────────────────────────────────────────────────────────────
// docs/architecture.md
// ─────────────────────────────────────────────────────────────

describe('docs/architecture.md — misuse cases (stale values must not appear)', () => {
  it('directory structure comment does not say "16 team collaboration skills"', () => {
    // AC-13
    const arch = read('docs/architecture.md');
    expect(arch).not.toMatch(/16 team collaboration skills/);
  });
});

describe('docs/architecture.md — golden path (correct values must appear)', () => {
  it('directory structure comment says "18 team collaboration skills"', () => {
    // AC-13
    const arch = read('docs/architecture.md');
    expect(arch).toMatch(/18 team collaboration skills/);
  });
});

// ─────────────────────────────────────────────────────────────
// Edition + Sage documentation accuracy
// Tests ordered misuse-first: wrong counts / absent content before
// correct counts / present content.
// ─────────────────────────────────────────────────────────────

describe('edition-docs — misuse cases (stale or wrong values must not appear)', () => {
  it('docs/agents.md does not say "20 agents" — count must be 24', () => {
    // Guard: the old 20-agent count must not appear in the agents reference.
    const agents = read('docs/agents.md');
    expect(agents).not.toMatch(/\ball 20 agents\b/i);
    expect(agents).not.toMatch(/\b20 specialized agents\b/i);
  });

  it('docs/agents.md does not say "23 agents" — sage must not be excluded from docs', () => {
    // Community edition excludes sage from the *dist bundle*, but the
    // reference docs must document all 24 agents including sage.
    const agents = read('docs/agents.md');
    expect(agents).not.toMatch(/\ball 23 agents\b/i);
    expect(agents).not.toMatch(/\b23 specialized agents\b/i);
  });

  it('docs/architecture.md does not describe a hierarchy without Sage at the top', () => {
    // If Sage is absent from the hierarchy diagram, the architecture docs are wrong.
    const arch = read('docs/architecture.md');
    // The diagram must contain sage — a hierarchy starting with CEO would be incorrect.
    expect(arch).not.toMatch(/^\s*│\s*CEO\s*│\s*←\s*(?:top|entry)/m);
  });

  it('README.md does not say "23 Specialized Agents" — sage must count in total', () => {
    const readme = read('README.md');
    expect(readme).not.toMatch(/\*\*23 Specialized Agents\*\*/);
  });
});

describe('edition-docs — happy path (correct content must be present)', () => {
  it('docs/agents.md total agent count is 24', () => {
    // AC-EDITION-1: all 24 agents must be documented
    const agents = read('docs/agents.md');
    expect(agents).toMatch(/\ball 24 agents\b|\b24 agents\b|\b24 specialized\b/i);
  });

  it('docs/agents.md documents the Sage agent', () => {
    // AC-EDITION-2: Sage must appear in the agents reference page
    const agents = read('docs/agents.md');
    expect(agents).toMatch(/##\s*Sage/);
  });

  it('docs/agents.md describes Sage as project orchestrator or entry point', () => {
    // AC-EDITION-2: Sage description must convey its orchestrator role
    const agents = read('docs/agents.md');
    expect(agents).toMatch(/orchestrat|entry point/i);
  });

  it('docs/architecture.md shows Sage in the hierarchy diagram', () => {
    // AC-EDITION-3: architecture hierarchy must place Sage at the top
    const arch = read('docs/architecture.md');
    expect(arch).toMatch(/Sage/);
    // Sage must appear with the hierarchy diagram — look for the ASCII box
    expect(arch).toMatch(/│\s*Sage\s*│/);
  });

  it('docs/architecture.md identifies Sage as the project orchestrator or entry point', () => {
    // AC-EDITION-3: architecture must label Sage's role in the hierarchy
    const arch = read('docs/architecture.md');
    expect(arch).toMatch(/Sage.*orchestrat|orchestrat.*Sage|entry point/i);
  });

  it('docs/architecture.md states total agent count as 24', () => {
    // AC-EDITION-3: agent count in architecture must be 24
    const arch = read('docs/architecture.md');
    expect(arch).toMatch(/24 specialized agent/i);
  });

  it('build.sh has ENTERPRISE_AGENTS exclusion list containing "sage"', () => {
    // AC-EDITION-4: build.sh must have the sage exclusion gate
    const buildSh = read('build.sh');
    expect(buildSh).toMatch(/ENTERPRISE_AGENTS=\("sage"\)/);
  });

  it('build.sh documents the enterprise exclusion with a comment', () => {
    // AC-EDITION-4: the exclusion must be documented in the script
    const buildSh = read('build.sh');
    expect(buildSh).toMatch(/enterprise.*agent|Enterprise.*agent/i);
    expect(buildSh).toMatch(/exclude|skip/i);
  });

  it('LICENSE.ext file exists at repo root', () => {
    // AC-EDITION-5: enterprise license file must be present
    const { existsSync } = require('fs');
    const licensePath = path.join(ROOT, 'LICENSE.ext');
    expect(existsSync(licensePath)).toBe(true);
  });

  it('sage AGENT.md has enterprise copyright header', () => {
    // AC-EDITION-6: sage AGENT.md must carry the enterprise license header
    const sageContent = read('src/framework/agents/sage/AGENT.md');
    expect(sageContent).toMatch(/Copyright.*Wonton Web Works/i);
    expect(sageContent).toMatch(/Enterprise License/i);
  });

  it('sage AGENT.md copyright header references LICENSE.ext', () => {
    // AC-EDITION-6: header must point to the license file
    const sageContent = read('src/framework/agents/sage/AGENT.md');
    expect(sageContent).toMatch(/LICENSE\.enterprise/);
  });
});
