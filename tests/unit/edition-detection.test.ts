/**
 * Edition Detection Tests
 *
 * Tests the edition detection logic defined in:
 *   .claude/skills/mg/SKILL.md
 *
 * Detection rule:
 *   IF .claude/agents/sage/AGENT.md exists → ENTERPRISE MODE
 *   ELSE                                    → COMMUNITY MODE
 *
 * Test order follows misuse-first (TDD-workflow.md):
 *   1. Misuse / attack-surface cases
 *   2. Boundary cases
 *   3. Happy path
 *
 * TDD red phase — implementation pending
 * Module @/framework/edition does not exist yet. Tests are skipped until
 * the implementation is written.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import * as fs from 'fs';

const SAGE_AGENT_PATH = '.claude/agents/sage/AGENT.md';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFileSystem(
  files: Record<string, string | null>
): void {
  vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
    const str = String(p);
    for (const [key, val] of Object.entries(files)) {
      if (str.endsWith(key)) return val !== null;
    }
    return false;
  });

  vi.spyOn(fs, 'readFileSync').mockImplementation((p, ...args) => {
    const str = String(p);
    for (const [key, val] of Object.entries(files)) {
      if (str.endsWith(key)) {
        if (val === null) throw new Error(`ENOENT: no such file: ${p}`);
        return val as string;
      }
    }
    throw new Error(`ENOENT: no such file: ${p}`);
  });
}

// ---------------------------------------------------------------------------
// TDD red phase — all tests skipped until @/framework/edition is implemented
// ---------------------------------------------------------------------------

describe.skip('edition-detection — misuse cases [TDD red phase — implementation pending]', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sage AGENT.md exists but is empty → community mode (not enterprise)', () => {
    mockFileSystem({ [SAGE_AGENT_PATH]: '' });
    const { detectEdition } = require('@/framework/edition');
    const result = detectEdition('/fake/project');
    expect(result).toBe('community');
  });

  it('sage AGENT.md exists but contains corrupted YAML → falls back to community', () => {
    mockFileSystem({ [SAGE_AGENT_PATH]: '---\n: :: bad yaml ::: \n---\nbroken' });
    const { detectEdition } = require('@/framework/edition');
    const result = detectEdition('/fake/project');
    expect(result).toBe('community');
  });

  it('sage directory exists but AGENT.md is missing → community mode', () => {
    mockFileSystem({ [SAGE_AGENT_PATH]: null });
    const { detectEdition } = require('@/framework/edition');
    const result = detectEdition('/fake/project');
    expect(result).toBe('community');
  });

  it('both sage/ and supervisor/ missing → community mode (degraded but functional)', () => {
    mockFileSystem({});
    const { detectEdition } = require('@/framework/edition');
    let result: string;
    expect(() => {
      result = detectEdition('/fake/project');
    }).not.toThrow();
    expect(result!).toBe('community');
  });

  it('sage AGENT.md has whitespace-only content → community mode', () => {
    mockFileSystem({ [SAGE_AGENT_PATH]: '   \n\t\n   ' });
    const { detectEdition } = require('@/framework/edition');
    const result = detectEdition('/fake/project');
    expect(result).toBe('community');
  });

  it('sage AGENT.md has frontmatter but wrong agent name → community mode', () => {
    const wrongContent = `---
name: supervisor
description: "Not the sage"
model: haiku
---
This is not sage.`;
    mockFileSystem({ [SAGE_AGENT_PATH]: wrongContent });
    const { detectEdition } = require('@/framework/edition');
    const result = detectEdition('/fake/project');
    expect(result).toBe('community');
  });
});

describe.skip('edition-detection — boundary cases [TDD red phase — implementation pending]', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sage AGENT.md at project level (.claude/agents/sage/) → enterprise mode', () => {
    const validSageContent = `---
name: sage
description: "The Sage"
model: opus
---
Sage content here.`;
    mockFileSystem({ [SAGE_AGENT_PATH]: validSageContent });
    const { detectEdition } = require('@/framework/edition');
    const result = detectEdition('/fake/project');
    expect(result).toBe('enterprise');
  });

  it('detectEdition called twice on same path returns same result', () => {
    mockFileSystem({ [SAGE_AGENT_PATH]: null });
    const { detectEdition } = require('@/framework/edition');
    expect(detectEdition('/fake/project')).toBe('community');
    expect(detectEdition('/fake/project')).toBe('community');
  });

  it('sage AGENT.md added after initial community detection → next call detects enterprise', () => {
    vi.spyOn(fs, 'existsSync')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      '---\nname: sage\nmodel: opus\n---\nSage.' as unknown as ReturnType<typeof fs.readFileSync>
    );

    const { detectEdition } = require('@/framework/edition');
    expect(detectEdition('/fake/project')).toBe('community');
    expect(detectEdition('/fake/project')).toBe('enterprise');
  });
});

describe.skip('edition-detection — happy path [TDD red phase — implementation pending]', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('no sage/AGENT.md → community mode with CEO + CTO + ED', () => {
    mockFileSystem({});
    const { detectEdition } = require('@/framework/edition');
    const result = detectEdition('/fake/project');
    expect(result).toBe('community');
  });

  it('valid sage/AGENT.md present → enterprise mode (Sage-orchestrated)', () => {
    const sageContent = `<!--
  Copyright (c) 2026 Wonton Web Works LLC. All rights reserved.
  Licensed under the PrivateEnterprise Enterprise License Agreement.
-->
---
name: sage
description: "The Sage — project-level orchestrator."
model: opus
tools: [Task, Read, Glob, Grep]
---
The Sage.`;
    mockFileSystem({ [SAGE_AGENT_PATH]: sageContent });
    const { detectEdition } = require('@/framework/edition');
    const result = detectEdition('/fake/project');
    expect(result).toBe('enterprise');
  });

  it('returns a string literal — not undefined, not null, not boolean', () => {
    mockFileSystem({});
    const { detectEdition } = require('@/framework/edition');
    const result = detectEdition('/fake/project');
    expect(typeof result).toBe('string');
    expect(result === 'community' || result === 'enterprise').toBe(true);
  });
});
