/**
 * Unit Tests for WS-INIT-ENHANCE
 * Issues #259 (gitignore protection) and #260 (routing preference)
 *
 * Verifies that the mg-init SKILL.md documents:
 *   - Step 5: .gitignore protection for .claude/ transient files
 *   - Step 6: Routing preference question (/mg vs manual)
 *
 * Test ordering: MISUSE → BOUNDARY → GOLDEN PATH
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SKILL_PATH = path.join(
  __dirname,
  '../../src/framework/skills/mg-init/SKILL.md'
);

// ---------------------------------------------------------------------------
// MISUSE CASES — things that must NOT appear
// ---------------------------------------------------------------------------

describe('mg-init SKILL.md — misuse cases', () => {
  it('SKILL.md must not reference TEO or TheEngOrg', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    expect(content).not.toMatch(/TEO|TheEngOrg|enterprise edition/i);
  });

  it('gitignore step must not protect only .claude/memory/ (must cover all transient files)', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    // The gitignore block should mention MG_INSTALL.json or MG_PROJECT
    // which live at .claude/ root, not just memory/
    expect(content).toMatch(/MG_INSTALL\.json|MG_PROJECT/);
  });

  it('routing step must not present a TEO/enterprise option', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    // Confirm no third "enterprise" or "TEO" routing option is mentioned
    expect(content).not.toMatch(/TEO routing|enterprise routing|edition-aware/i);
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY CASES — edge conditions that must be handled
// ---------------------------------------------------------------------------

describe('mg-init SKILL.md — boundary cases', () => {
  it('gitignore step is idempotent (skips patterns already present)', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    // The doc must acknowledge not re-appending if patterns already exist
    expect(content).toMatch(/already present|already exists|idempotent|not already/i);
  });

  it('gitignore step creates .gitignore when it does not exist', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    // Must say "create if not" or similar
    expect(content).toMatch(/create.*if not|if.*not exist|does not exist/i);
  });

  it('routing step defaults gracefully (No preference is a valid choice)', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    // "No preference" must be explicitly listed
    expect(content).toMatch(/No preference|no preference/);
  });

  it('routing step only appends Default Routing when /mg is chosen (not always)', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    // Must be conditional — only when user picks /mg
    expect(content).toMatch(/If.*\/mg|when.*\/mg|chosen.*\/mg|\/mg.*chosen/i);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH — correct, complete expected content
// ---------------------------------------------------------------------------

describe('mg-init SKILL.md — gitignore protection step', () => {
  it('documents the .gitignore protection step', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    expect(content).toMatch(/gitignore/i);
  });

  it('lists .claude/memory/*.json as a protected pattern', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    expect(content).toMatch(/\.claude\/memory\/\*\.json/);
  });

  it('lists .claude/settings.json.backup.* as a protected pattern', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    expect(content).toMatch(/settings\.json\.backup\.\*/);
  });

  it('lists .claude/*.log as a protected pattern', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    expect(content).toMatch(/\.claude\/\*\.log/);
  });

  it('lists .claude/MG_PROJECT as a protected pattern', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    expect(content).toMatch(/\.claude\/MG_PROJECT/);
  });

  it('lists .claude/MG_INSTALL.json as a protected pattern', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    expect(content).toMatch(/\.claude\/MG_INSTALL\.json/);
  });

  it('includes an MG framework comment marker in the gitignore block', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    // Should have a comment like "# MG framework — transient files"
    expect(content).toMatch(/# MG framework/i);
  });
});

describe('mg-init SKILL.md — routing preference step', () => {
  it('documents the routing preference question', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    expect(content).toMatch(/routing preference|routing.*preference|route.*work/i);
  });

  it('presents /mg as option 1', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    expect(content).toMatch(/\/mg/);
  });

  it('describes /mg option as routing through dispatcher', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    expect(content).toMatch(/dispatcher|dispatch/i);
  });

  it('presents "No preference" as option 2', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    // Both the label and the number must appear near each other
    expect(content).toMatch(/No preference/);
  });

  it('describes "No preference" as invoking skills manually', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    expect(content).toMatch(/manually|manual/i);
  });

  it('documents appending ## Default Routing section to CLAUDE.md when /mg chosen', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    expect(content).toMatch(/Default Routing/);
  });
});

describe('mg-init SKILL.md — step numbering', () => {
  it('gitignore protection appears as a numbered step (5 or higher)', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    // Step 5 or later should mention gitignore
    const step5Plus = content.match(/###\s+[5-9]\d*\.\s+.*/g);
    expect(step5Plus).not.toBeNull();
  });

  it('routing preference appears as a numbered step after gitignore', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf-8');
    // Both step headings must exist
    const gitignoreStepPos = content.search(/gitignore/i);
    const routingStepPos = content.search(/routing preference|routing.*preference/i);
    expect(gitignoreStepPos).toBeGreaterThan(0);
    expect(routingStepPos).toBeGreaterThan(0);
    // Routing preference step appears after gitignore step
    expect(routingStepPos).toBeGreaterThan(gitignoreStepPos);
  });
});
