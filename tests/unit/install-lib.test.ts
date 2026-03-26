/**
 * GH-266: install-lib.sh extraction from install.sh
 *
 * Validates the static structure and content of src/installer/install-lib.sh
 * before any shell execution. All checks are pure file-content assertions
 * (no subprocesses), so they run fast and safely in any CI environment.
 *
 * Acceptance criteria covered:
 *   AC-1  install-lib.sh exists at src/installer/install-lib.sh
 *   AC-2  install-lib.sh contains no `exit` statements
 *   AC-3  install-lib.sh has no file-scope set -e / set -euo pipefail
 *   AC-4  install.sh still contains the anti-sourcing guard
 *   AC-5  After the file is sourced, mg_install_framework is declared
 *         (verified by checking the function definition is present in the file)
 *   AC-6  mg_install_framework accepts all required flags
 *   AC-10 install.sh still delegates to mg_install_framework (regression)
 *
 * Test order: misuse → boundary → golden path (CAD protocol)
 *
 * These tests FAIL against the current codebase (install-lib.sh does not
 * exist yet) and PASS once GH-266 is implemented.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '../..');
const INSTALL_LIB_PATH = path.join(ROOT, 'src/installer/install-lib.sh');
const INSTALL_SH_PATH  = path.join(ROOT, 'src/installer/install.sh');

function readLib(): string {
  return readFileSync(INSTALL_LIB_PATH, 'utf-8');
}

function readWrapper(): string {
  return readFileSync(INSTALL_SH_PATH, 'utf-8');
}

// ─────────────────────────────────────────────────────────────────────────────
// Misuse cases — prohibited patterns must NOT appear in install-lib.sh
// ─────────────────────────────────────────────────────────────────────────────

describe('install-lib.sh — misuse cases (prohibited patterns must not appear)', () => {

  it('AC-1: install-lib.sh exists', () => {
    // The file is the entire deliverable of GH-266 — if it does not exist,
    // nothing else can pass.
    expect(existsSync(INSTALL_LIB_PATH)).toBe(true);
  });

  it('AC-2: install-lib.sh contains no bare `exit` statements', () => {
    // exit kills the embedding shell process; library code must use `return`.
    // Pattern allows for `exit` inside inline comments but not as a command.
    const content = readLib();
    // Match `exit` used as a command (not inside a comment)
    const lines = content.split('\n');
    const exitLines = lines.filter(line => {
      const stripped = line.replace(/#.*$/, ''); // remove comments
      return /\bexit\b/.test(stripped);
    });
    expect(exitLines).toHaveLength(0);
  });

  it('AC-3: install-lib.sh does not contain file-scope `set -euo pipefail`', () => {
    // set -e at file scope causes the sourcing shell to abort on any error
    // inside the library — breaking the non-destructive embedding contract.
    const content = readLib();
    // Only flag set -e / set -euo pipefail at the top of the file (outside a
    // function body). We check for any top-level set -e* as a proxy.
    // A function-scoped set is acceptable but must be re-cleared on return.
    const lines = content.split('\n');
    let insideFunction = 0;
    const topLevelSetE: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (/\(\s*\)\s*\{/.test(trimmed) || /^function\s+\w+/.test(trimmed)) {
        insideFunction++;
      }
      if (/\}/.test(trimmed) && insideFunction > 0) {
        insideFunction--;
      }
      if (insideFunction === 0 && /^\s*set\s+-[a-z]*e[a-z]*/.test(line)) {
        topLevelSetE.push(line);
      }
    }
    expect(topLevelSetE).toHaveLength(0);
  });

  it('AC-3: install-lib.sh does not start with `set -euo pipefail`', () => {
    // Belt-and-suspenders: the canonical form must not appear anywhere outside
    // a function, regardless of brace-counting edge cases above.
    const content = readLib();
    expect(content).not.toMatch(/^set\s+-euo pipefail/m);
    expect(content).not.toMatch(/^set\s+-e\b/m);
  });

  it('AC-4: install.sh still contains the anti-sourcing guard (must NOT be removed)', () => {
    // The guard must remain in the wrapper so direct-execution behaviour is
    // unchanged and the library file is not accidentally sourced as a script.
    const wrapper = readWrapper();
    // The guard pattern: BASH_SOURCE[0] != $0
    expect(wrapper).toMatch(/BASH_SOURCE\[0\].*!=.*\$0/);
  });

  it('AC-4: install.sh anti-sourcing guard still calls `return 1` on violation', () => {
    // The guard must terminate by returning, not exiting, so it can be detected
    // by callers embedding install.sh in other scripts.
    const wrapper = readWrapper();
    // Guard block must have `return 1`
    expect(wrapper).toMatch(/return\s+1/);
  });

  it('AC-2/AC-3: install-lib.sh does not contain `set -u` at file scope', () => {
    // set -u at file scope would make the sourcing shell exit on any unbound
    // variable that the embedding script hasn't set yet.
    const content = readLib();
    const lines = content.split('\n');
    let insideFunction = 0;
    const topLevelSetU: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (/\(\s*\)\s*\{/.test(trimmed) || /^function\s+\w+/.test(trimmed)) {
        insideFunction++;
      }
      if (/\}/.test(trimmed) && insideFunction > 0) {
        insideFunction--;
      }
      if (insideFunction === 0 && /^\s*set\s+-[a-z]*u[a-z]*/.test(line)) {
        topLevelSetU.push(line);
      }
    }
    expect(topLevelSetU).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Boundary cases — structural requirements that must be satisfied exactly
// ─────────────────────────────────────────────────────────────────────────────

describe('install-lib.sh — boundary cases (structural requirements)', () => {

  it('AC-5: mg_install_framework function is defined in install-lib.sh', () => {
    // The function must be defined — not just referenced — so that sourcing
    // the file makes it immediately callable.
    const content = readLib();
    expect(content).toMatch(/mg_install_framework\s*\(\s*\)\s*\{/);
  });

  it('AC-6: mg_install_framework accepts --target flag', () => {
    const content = readLib();
    expect(content).toMatch(/--target/);
  });

  it('AC-6: mg_install_framework accepts --source flag', () => {
    const content = readLib();
    expect(content).toMatch(/--source/);
  });

  it('AC-6: mg_install_framework accepts --force flag', () => {
    const content = readLib();
    expect(content).toMatch(/--force/);
  });

  it('AC-6: mg_install_framework accepts --standalone flag', () => {
    const content = readLib();
    expect(content).toMatch(/--standalone/);
  });

  it('AC-6: mg_install_framework accepts --quiet flag', () => {
    const content = readLib();
    expect(content).toMatch(/--quiet/);
  });

  it('AC-6: mg_install_framework accepts --skip-settings-merge flag', () => {
    // AC-8: the flag that suppresses settings.json creation must be wired up
    const content = readLib();
    expect(content).toMatch(/--skip-settings-merge/);
  });

  it('AC-6: mg_install_framework accepts --skip-claude-md flag', () => {
    // AC-9: the flag that suppresses CLAUDE.md creation must be wired up
    const content = readLib();
    expect(content).toMatch(/--skip-claude-md/);
  });

  it('AC-10: install.sh sources install-lib.sh', () => {
    // The wrapper must delegate by sourcing the library, not duplicating logic.
    const wrapper = readWrapper();
    expect(wrapper).toMatch(/source\s+.*install-lib\.sh|\..*install-lib\.sh/);
  });

  it('AC-10: install.sh calls mg_install_framework', () => {
    // The wrapper must invoke the library entry point.
    const wrapper = readWrapper();
    expect(wrapper).toMatch(/mg_install_framework/);
  });

  it('install-lib.sh uses `return` (not `exit`) for all error paths', () => {
    // All error paths inside mg_install_framework must use return so that
    // the embedding script can inspect $? and continue or branch.
    const content = readLib();
    // Must have at least one `return` with a non-zero code
    expect(content).toMatch(/return\s+[1-9]/);
  });

  it('install-lib.sh does not produce output when merely sourced (no top-level echo)', () => {
    // Any echo/printf at file scope (outside a function) would produce output
    // on source, violating AC-1 (no side effects on sourcing).
    const content = readLib();
    const lines = content.split('\n');
    let insideFunction = 0;
    const topLevelOutput: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (/\(\s*\)\s*\{/.test(trimmed) || /^function\s+\w+/.test(trimmed)) {
        insideFunction++;
      }
      if (trimmed === '}' && insideFunction > 0) {
        insideFunction--;
      }
      if (insideFunction === 0) {
        const noComment = line.replace(/#.*$/, '');
        if (/^\s*(echo|printf)\b/.test(noComment)) {
          topLevelOutput.push(line);
        }
      }
    }
    expect(topLevelOutput).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Golden path — correct structure and content must be present
// ─────────────────────────────────────────────────────────────────────────────

describe('install-lib.sh — golden path (correct structure and content)', () => {

  it('AC-5: install-lib.sh is a valid bash script (starts with bash shebang)', () => {
    const content = readLib();
    expect(content.startsWith('#!/usr/bin/env bash') ||
           content.startsWith('#!/bin/bash')).toBe(true);
  });

  it('AC-1: install-lib.sh does not call mg_install_framework at top level', () => {
    // The library must not auto-invoke the function; the wrapper does that.
    // This ensures sourcing alone has zero side effects.
    const content = readLib();
    const lines = content.split('\n');
    let insideFunction = 0;
    const topLevelCalls: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (/\(\s*\)\s*\{/.test(trimmed) || /^function\s+\w+/.test(trimmed)) {
        insideFunction++;
      }
      if (trimmed === '}' && insideFunction > 0) {
        insideFunction--;
      }
      if (insideFunction === 0) {
        const noComment = line.replace(/#.*$/, '');
        if (/^\s*mg_install_framework\b/.test(noComment)) {
          topLevelCalls.push(line);
        }
      }
    }
    expect(topLevelCalls).toHaveLength(0);
  });

  it('AC-8: --skip-settings-merge appears in the function body of mg_install_framework', () => {
    // The flag must be handled inside the function, not just mentioned in a comment.
    const content = readLib();
    // Find the function body and confirm the flag appears in it
    const fnMatch = content.match(/mg_install_framework\s*\(\s*\)\s*\{([\s\S]*)/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch![1]).toMatch(/--skip-settings-merge/);
  });

  it('AC-9: --skip-claude-md appears in the function body of mg_install_framework', () => {
    const content = readLib();
    const fnMatch = content.match(/mg_install_framework\s*\(\s*\)\s*\{([\s\S]*)/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch![1]).toMatch(/--skip-claude-md/);
  });

  it('AC-10: install.sh is a thin wrapper (install logic moved to library)', () => {
    // The wrapper should be significantly shorter than the original 678-line
    // monolith. A wrapper over 200 lines likely still contains extracted logic.
    const wrapper = readWrapper();
    const lineCount = wrapper.split('\n').length;
    expect(lineCount).toBeLessThan(200);
  });

  it('install-lib.sh contains the majority of the install logic (>200 lines)', () => {
    // The library must be substantive — not just a stub.
    const content = readLib();
    const lineCount = content.split('\n').length;
    expect(lineCount).toBeGreaterThan(200);
  });

  it('AC-4: install.sh anti-sourcing guard error message is preserved', () => {
    // Regression: guard must still emit the canonical error message
    const wrapper = readWrapper();
    expect(wrapper).toMatch(/must be executed, not sourced/i);
  });
});
