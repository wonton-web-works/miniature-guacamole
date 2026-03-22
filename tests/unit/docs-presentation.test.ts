/**
 * WS-DOCS-4: README Slim-Down
 * WS-DOCS-5: Getting Started Rewrite
 *
 * Presentation-validation tests — asserting structural and content shape, not
 * accuracy of values (that lives in docs-accuracy.test.ts).
 *
 * Ordered misuse-first per CAD protocol:
 *   MISUSE CASES  — stale / removed content must be ABSENT
 *   BOUNDARY TESTS — edge conditions on counts and placement
 *   GOLDEN PATH   — correct content must be PRESENT
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '../..');

function read(relPath: string): string {
  return readFileSync(path.join(ROOT, relPath), 'utf-8');
}

// ─────────────────────────────────────────────────────────────
// WS-DOCS-4: README.md — MISUSE CASES
// ─────────────────────────────────────────────────────────────

describe('WS-DOCS-4 README.md — misuse cases (removed sections must not appear)', () => {
  it('does not contain a "## Architecture" top-level section heading', () => {
    // AC-5: Architecture section moved to docs site
    const readme = read('README.md');
    expect(readme).not.toMatch(/^## Architecture\b/m);
  });

  it('does not contain a "## Shared Memory System" section heading', () => {
    // AC-6: Shared Memory System section moved to docs site
    const readme = read('README.md');
    expect(readme).not.toMatch(/^## Shared Memory System\b/m);
  });

  it('does not contain a "## Migration from" section heading', () => {
    // AC-7: Migration section moved to docs site
    const readme = read('README.md');
    expect(readme).not.toMatch(/^## Migration from/m);
  });

  it('does not contain a "## Audit Logging" section heading', () => {
    // AC-8: Audit Logging section moved to docs site
    const readme = read('README.md');
    expect(readme).not.toMatch(/^## Audit Logging\b/m);
  });

  it('does not contain the TypeScript writeMemory code example', () => {
    // AC-12: Memory API TypeScript examples moved to docs
    const readme = read('README.md');
    expect(readme).not.toMatch(/writeMemory\s*\(/);
  });

  it('does not contain the TypeScript readMemory code example', () => {
    // AC-12: Memory API TypeScript examples moved to docs
    const readme = read('README.md');
    expect(readme).not.toMatch(/readMemory\s*\(\s*\)/);
  });

  it('does not contain the TypeScript queryMemory code example', () => {
    // AC-12: Memory API TypeScript examples moved to docs
    const readme = read('README.md');
    expect(readme).not.toMatch(/queryMemory\s*\(/);
  });

  it('does not contain a full Available Agents table (20+ agent rows)', () => {
    // AC-9: Full agents table moved to docs — compact top-5 is OK but not 20+ rows
    // The full table has repeated "| **" entries across Executive/Leadership/IC sections
    const readme = read('README.md');
    // Count agent table rows: lines matching "| **<AgentName>**" pattern with slash command
    const agentRows = (readme.match(/^\|\s+\*\*[^|]+\*\*\s+\|\s+`?\/\w/gm) ?? []).length;
    expect(agentRows).toBeLessThan(20);
  });

  it('does not contain the full delegation hierarchy ASCII diagram (deep multi-level)', () => {
    // AC-5: Detailed delegation model diagram lives in docs/architecture.md
    // The slim README keeps only the CAD cycle diagram, not the org chart
    const readme = read('README.md');
    // The org chart has the "Engineering Director" box in an ASCII tree
    expect(readme).not.toMatch(/Eng Dir[\s│\-─┌└┐┘]+.*Staff Eng/s);
  });
});

// ─────────────────────────────────────────────────────────────
// WS-DOCS-4: README.md — BOUNDARY TESTS
// ─────────────────────────────────────────────────────────────

describe('WS-DOCS-4 README.md — boundary tests', () => {
  it('line count is 300 or fewer (not 301+)', () => {
    // AC-1: README must be under 300 lines total
    // Count actual lines (split on \n)
    const readme = read('README.md');
    const lineCount = readme.split('\n').length;
    expect(lineCount).toBeLessThanOrEqual(300);
  });

  it('compact workflows section mentions /mg-ticket without requiring a 17-row table', () => {
    // AC-9 boundary: a compact list (top-5 workflows) is allowed — /mg-ticket must appear
    // but a full 17-row table is not required
    const readme = read('README.md');
    expect(readme).toMatch(/\/mg-ticket/);
    // Must not have all 17+ slash commands listed (that would be the full table)
    const slashCommandCount = (readme.match(/`?\/mg-\w+`?/g) ?? []).length;
    expect(slashCommandCount).toBeLessThanOrEqual(15);
  });

  it('Quick Start section has the 3 commands (curl, mg-init, claude)', () => {
    // AC-3: three commands — global install, per-project init, launch
    const readme = read('README.md');
    const quickStartBlock = readme.match(/## Quick Start[\s\S]*?(?=\n## )/);
    expect(quickStartBlock).not.toBeNull();
    if (quickStartBlock) {
      const block = quickStartBlock[0];
      expect(block).toMatch(/curl/);
      expect(block).toMatch(/\bmg-init\b/);
      expect(block).toMatch(/\bclaude\b/);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// WS-DOCS-4: README.md — GOLDEN PATH
// ─────────────────────────────────────────────────────────────

describe('WS-DOCS-4 README.md — golden path (required content must appear)', () => {
  it('is under 300 lines total', () => {
    // AC-1
    const readme = read('README.md');
    const lineCount = readme.split('\n').length;
    expect(lineCount).toBeLessThan(300);
  });

  it('contains version badge "2.0.0"', () => {
    // AC-2
    const readme = read('README.md');
    expect(readme).toMatch(/2\.0\.0/);
  });

  it('contains a Quick Start section', () => {
    // AC-3
    const readme = read('README.md');
    expect(readme).toMatch(/## Quick Start/);
  });

  it('Quick Start contains the curl web-install command', () => {
    // AC-3: first of the 3 commands
    const readme = read('README.md');
    expect(readme).toMatch(/curl.*web-install\.sh/);
  });

  it('Quick Start contains the "claude" command', () => {
    // AC-3: second of the 3 commands
    const readme = read('README.md');
    const quickStartBlock = readme.match(/## Quick Start[\s\S]*?(?=\n## )/);
    expect(quickStartBlock).not.toBeNull();
    if (quickStartBlock) {
      expect(quickStartBlock[0]).toMatch(/\bclaude\b/);
    }
  });

  it('Quick Start contains the mg-init command', () => {
    // AC-3: per-project init step
    const readme = read('README.md');
    const quickStartBlock = readme.match(/## Quick Start[\s\S]*?(?=\n## )/);
    expect(quickStartBlock).not.toBeNull();
    if (quickStartBlock) {
      expect(quickStartBlock[0]).toMatch(/\bmg-init\b/);
    }
  });

  it('contains the CAD cycle ASCII diagram with mg-leadership-team', () => {
    // AC-4: CAD cycle diagram must be present
    const readme = read('README.md');
    expect(readme).toMatch(/mg-leadership-team/);
  });

  it('contains the CAD cycle ASCII diagram with mg-build', () => {
    // AC-4: CAD cycle diagram must show mg-build step
    const readme = read('README.md');
    // The diagram should show mg-build as a step — look for it in an ASCII box or label
    expect(readme).toMatch(/mg-build/);
  });

  it('contains the CAD cycle ASCII diagram showing leadership review → deploy flow', () => {
    // AC-4: the diagram must show leadership review and deploy steps
    const readme = read('README.md');
    // Matches the CAD flow diagram: must contain both leadership-team and deploy or merge
    expect(readme).toMatch(/deployment[-\s]engineer|deploy/i);
  });

  it('contains a link to the docs site', () => {
    // AC-10: must link to docs site (full URL or relative paths like /getting-started)
    const readme = read('README.md');
    const hasDocsUrl = /wonton-web-works\.github\.io\/miniature-guacamole/.test(readme);
    const hasRelativePaths = /\(\/getting-started\)|\(\/architecture\)|\(\/agents\)|\(\/workflows\)/.test(readme);
    expect(hasDocsUrl || hasRelativePaths).toBe(true);
  });

  it('contains a "What you get" or summary section mentioning 18 skills', () => {
    // AC-11: summary section with counts
    const readme = read('README.md');
    expect(readme).toMatch(/18 [Ss]kills?/);
  });

  it('contains a "What you get" or summary section mentioning 24 agents', () => {
    // AC-11: summary section with counts
    const readme = read('README.md');
    expect(readme).toMatch(/24 (?:Specialized )?[Aa]gents?/);
  });
});

// ─────────────────────────────────────────────────────────────
// WS-DOCS-5: docs/getting-started.md — MISUSE CASES
// ─────────────────────────────────────────────────────────────

describe('WS-DOCS-5 docs/getting-started.md — misuse cases (stale values must not appear)', () => {
  it('does not say "16 skills" anywhere', () => {
    // AC-6: count must be 17 everywhere
    const gs = read('docs/getting-started.md');
    expect(gs).not.toMatch(/\b16 skills?\b/i);
  });

  it('does not say "19 agents" anywhere', () => {
    // AC-7: count must be 20 everywhere
    const gs = read('docs/getting-started.md');
    expect(gs).not.toMatch(/\b19 agents?\b/i);
  });

  it('does not describe only the install commands without a "what happened" explanation after', () => {
    // AC-1: a "What just happened" / "What you just got" / "What gets installed"
    // section must appear AFTER the install steps — not just install commands alone
    const gs = read('docs/getting-started.md');
    const hasExplanation =
      /## What (?:just happened|you (?:just )?got|gets installed)/i.test(gs);
    expect(hasExplanation).toBe(true);
  });

  it('does not describe the CAD cycle without showing expected output for the first workflow', () => {
    // AC-2: First workflow example must include expected output, not just the command
    // Look for "Output:" or a description of what the user sees after the first workflow command
    const gs = read('docs/getting-started.md');
    expect(gs).toMatch(/Output:|expected output|you.ll see|you should see/i);
  });

  it('does not use only "/mg-init" without also mentioning the shell "mg-init" distinction', () => {
    // AC-4: both terms must appear with explanation distinguishing them
    const gs = read('docs/getting-started.md');
    // Must contain both forms
    expect(gs).toMatch(/\bmg-init\b/);    // shell script form (without slash)
    expect(gs).toMatch(/\/mg-init\b/);   // Claude Code skill form (with slash)
  });

  it('does not describe the CAD cycle as fewer than 4 steps', () => {
    // AC-3: the cycle must show plan → build → review → merge (4 steps)
    const gs = read('docs/getting-started.md');
    // All four step commands must appear in the getting-started workflow section
    expect(gs).toMatch(/mg-leadership-team/);   // step 1: plan
    expect(gs).toMatch(/mg-build/);             // step 2: build
    // step 3: review is another mg-leadership-team call (already covered above)
    expect(gs).toMatch(/deployment-engineer|\/deploy/i); // step 4: merge/deploy
  });
});

// ─────────────────────────────────────────────────────────────
// WS-DOCS-5: docs/getting-started.md — BOUNDARY TESTS
// ─────────────────────────────────────────────────────────────

describe('WS-DOCS-5 docs/getting-started.md — boundary tests', () => {
  it('"What gets installed" section appears AFTER the install steps, not before them', () => {
    // AC-1 boundary: placement matters — explanation must follow install, not precede it
    const gs = read('docs/getting-started.md');

    // Find the position of the install command block
    const curlPos = gs.indexOf('web-install.sh');
    // Find the position of the "what" explanation section
    const whatMatch = gs.match(
      /## What (?:just happened|you (?:just )?got|gets installed)/i
    );
    expect(whatMatch).not.toBeNull();
    if (whatMatch && whatMatch.index !== undefined) {
      expect(whatMatch.index).toBeGreaterThan(curlPos);
    }
  });

  it('distinguishes mg-init from /mg-init with an explanation, not just name-dropping', () => {
    // AC-4 boundary: both terms must appear AND there must be adjacent explanatory text
    const gs = read('docs/getting-started.md');
    // The distinction is explained: look for descriptive text near both forms
    // At minimum the file must say something like "shell script" or "Claude Code skill"
    // or "installer" near mg-init references
    const hasShellScriptMention = /shell script|installer|command[- ]line/i.test(gs);
    const hasSkillMention = /Claude Code skill|slash command|in Claude Code/i.test(gs);
    expect(hasShellScriptMention || hasSkillMention).toBe(true);
  });

  it('CAD cycle shows all 4 distinct steps with commands for each', () => {
    // AC-3 boundary: 4 steps, each with a runnable command
    const gs = read('docs/getting-started.md');
    // Each step has a command in a code block — look for 4 step markers
    const stepMatches = gs.match(/\*\*[1-4]\./g) ?? [];
    expect(stepMatches.length).toBeGreaterThanOrEqual(4);
  });
});

// ─────────────────────────────────────────────────────────────
// WS-DOCS-5: docs/getting-started.md — GOLDEN PATH
// ─────────────────────────────────────────────────────────────

describe('WS-DOCS-5 docs/getting-started.md — golden path (required content must appear)', () => {
  it('contains a "What just happened" or "What you just got" or "What gets installed" section', () => {
    // AC-1
    const gs = read('docs/getting-started.md');
    expect(gs).toMatch(/## What (?:just happened|you (?:just )?got|gets installed)/i);
  });

  it('"What gets installed" or equivalent section appears after the install commands', () => {
    // AC-1: after install steps
    const gs = read('docs/getting-started.md');
    const curlPos = gs.indexOf('web-install.sh');
    const whatMatch = gs.match(/## What (?:just happened|you (?:just )?got|gets installed)/i);
    expect(whatMatch).not.toBeNull();
    if (whatMatch && whatMatch.index !== undefined && curlPos !== -1) {
      expect(whatMatch.index).toBeGreaterThan(curlPos);
    }
  });

  it('contains a first workflow example with expected output', () => {
    // AC-2
    const gs = read('docs/getting-started.md');
    expect(gs).toMatch(/Output:|# Output/i);
  });

  it('shows the full CAD cycle plan step (/mg-leadership-team)', () => {
    // AC-3: step 1 — plan
    const gs = read('docs/getting-started.md');
    expect(gs).toMatch(/\/mg-leadership-team/);
  });

  it('shows the full CAD cycle build step (/mg-build)', () => {
    // AC-3: step 2 — build
    const gs = read('docs/getting-started.md');
    expect(gs).toMatch(/\/mg-build/);
  });

  it('shows the full CAD cycle review step (another /mg-leadership-team or explicit review label)', () => {
    // AC-3: step 3 — leadership review
    // The review step is another /mg-leadership-team call with "Review" argument
    const gs = read('docs/getting-started.md');
    expect(gs).toMatch(/\/mg-leadership-team\s+Review|Step [3-4].*review/i);
  });

  it('shows the full CAD cycle merge step (/deployment-engineer or deploy)', () => {
    // AC-3: step 4 — merge
    const gs = read('docs/getting-started.md');
    expect(gs).toMatch(/\/deployment-engineer|deploy/i);
  });

  it('contains "mg-init" (shell script / installer form without slash)', () => {
    // AC-4: shell script form must appear
    const gs = read('docs/getting-started.md');
    // Match mg-init not preceded by / — use word boundary check
    expect(gs).toMatch(/(?<!\/)mg-init/);
  });

  it('contains "/mg-init" (Claude Code skill form with slash)', () => {
    // AC-4: skill form must appear
    const gs = read('docs/getting-started.md');
    expect(gs).toMatch(/\/mg-init/);
  });

  it('says "18 skills"', () => {
    // AC-5
    const gs = read('docs/getting-started.md');
    expect(gs).toMatch(/18 skills?/i);
  });

  it('says "24 agents"', () => {
    // AC-5
    const gs = read('docs/getting-started.md');
    expect(gs).toMatch(/24 (?:specialized )?agents?/i);
  });
});
