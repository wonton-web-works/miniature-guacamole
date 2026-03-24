/**
 * TDD Tests for WS-1: Mode Simplification (GH-245)
 *
 * Feature: Kill silent mode, rename full → verbose
 * As a: Framework maintainer
 * I want: Exactly 2 output modes — compact (default) and verbose (opt-in)
 * So that: The framework has no dangerous diagnostic-suppressing silent mode
 *
 * Acceptance Criteria:
 * - visual-formatting.md references only compact and verbose (not silent, not full as a mode name)
 * - No file under src/framework/skills/ references silent as an output mode
 * - No file under src/framework/skills/ references output_mode: full (should be output_mode: verbose)
 * - No file under src/framework/shared/ references silent as an output mode
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const FRAMEWORK_DIR = path.resolve(__dirname, '../../src/framework');
const VISUAL_FORMATTING = path.join(FRAMEWORK_DIR, 'shared', 'visual-formatting.md');
const SKILLS_DIR = path.join(FRAMEWORK_DIR, 'skills');
const SHARED_DIR = path.join(FRAMEWORK_DIR, 'shared');

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

function getAllMdFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllMdFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

// Pattern: `silent` used as an output mode value — matches things like:
//   output_mode: full | compact | silent
//   `silent` — errors only
//   silent mode
//   Silent mode
//   full/compact/silent
//   (full/compact/silent)
// Excludes legitimate uses like "silently fail", "silently route", "fall back ... silently"
const SILENT_MODE_PATTERN = /(?:output_mode[^)]*silent|\bsilent\b\s*(?:—|mode)|(?:full|compact)\s*\/\s*silent|silent\s*\/\s*(?:full|compact)|\|\s*`?silent`?\s*$|\|\s*silent\s+\|)/gim;

// Pattern: output_mode: full (should be output_mode: verbose after the change)
const OUTPUT_MODE_FULL_PATTERN = /output_mode:\s*full\b/g;

// Pattern: `full` as a mode name in the modes table or description
// Matches: | `full` | ... or "full mode" in mode context
const FULL_AS_MODE_PATTERN = /`full`\s*\||\|\s*`full`\s*\||output_mode.*\bfull\b.*compact|compact.*\bfull\b/g;

describe('WS-1: Mode Simplification (GH-245)', () => {
  describe('Misuse tests — these verify what must NOT exist after the change', () => {
    it('visual-formatting.md must not reference silent as an output mode', () => {
      const content = readFile(VISUAL_FORMATTING);
      const silentModeMatches = content.match(SILENT_MODE_PATTERN) ?? [];
      expect(
        silentModeMatches,
        `visual-formatting.md still contains silent mode references: ${JSON.stringify(silentModeMatches)}`
      ).toHaveLength(0);
    });

    it('visual-formatting.md must not use output_mode: full', () => {
      const content = readFile(VISUAL_FORMATTING);
      const matches = content.match(OUTPUT_MODE_FULL_PATTERN) ?? [];
      expect(
        matches,
        `visual-formatting.md still contains output_mode: full — should be output_mode: verbose`
      ).toHaveLength(0);
    });

    it('no skill output-format.md should reference silent as an output mode', () => {
      const skillFiles = getAllMdFiles(SKILLS_DIR);
      const violations: string[] = [];

      for (const filePath of skillFiles) {
        const content = readFile(filePath);
        const matches = content.match(SILENT_MODE_PATTERN) ?? [];
        if (matches.length > 0) {
          const relPath = path.relative(FRAMEWORK_DIR, filePath);
          violations.push(`${relPath}: ${JSON.stringify(matches)}`);
        }
      }

      expect(
        violations,
        `Skills still reference silent as an output mode:\n${violations.join('\n')}`
      ).toHaveLength(0);
    });

    it('no skill file should reference output_mode: full', () => {
      const skillFiles = getAllMdFiles(SKILLS_DIR);
      const violations: string[] = [];

      for (const filePath of skillFiles) {
        const content = readFile(filePath);
        const matches = content.match(OUTPUT_MODE_FULL_PATTERN) ?? [];
        if (matches.length > 0) {
          const relPath = path.relative(FRAMEWORK_DIR, filePath);
          violations.push(`${relPath}: ${JSON.stringify(matches)}`);
        }
      }

      expect(
        violations,
        `Skills still reference output_mode: full — should be output_mode: verbose:\n${violations.join('\n')}`
      ).toHaveLength(0);
    });

    it('no shared/ file should reference silent as an output mode', () => {
      const sharedFiles = getAllMdFiles(SHARED_DIR);
      const violations: string[] = [];

      for (const filePath of sharedFiles) {
        const content = readFile(filePath);
        const matches = content.match(SILENT_MODE_PATTERN) ?? [];
        if (matches.length > 0) {
          const relPath = path.relative(FRAMEWORK_DIR, filePath);
          violations.push(`${relPath}: ${JSON.stringify(matches)}`);
        }
      }

      expect(
        violations,
        `shared/ files still reference silent as an output mode:\n${violations.join('\n')}`
      ).toHaveLength(0);
    });
  });

  describe('Golden path tests — verify the correct state after the change', () => {
    it('visual-formatting.md defines exactly compact and verbose as modes', () => {
      const content = readFile(VISUAL_FORMATTING);
      // The modes line should list compact and verbose
      expect(content).toMatch(/output_mode:\s*compact\s*\|\s*verbose/);
    });

    it('visual-formatting.md uses output_mode: verbose for the verbose mode', () => {
      const content = readFile(VISUAL_FORMATTING);
      expect(content).toMatch(/output_mode:\s*verbose/);
    });

    it('visual-formatting.md preserves compact as the default', () => {
      const content = readFile(VISUAL_FORMATTING);
      expect(content).toMatch(/compact.*[Dd]efault|[Dd]efault.*compact/);
    });

    it('visual-formatting.md preserves the unknown-values-default-to-compact rule', () => {
      const content = readFile(VISUAL_FORMATTING);
      expect(content).toMatch(/[Uu]nknown.*default.*compact|default.*compact.*[Uu]nknown/);
    });

    it('visual-formatting.md preserves errors-always-shown rule (without silent mode reference)', () => {
      const content = readFile(VISUAL_FORMATTING);
      // Should say errors always shown without specifically mentioning silent mode
      expect(content).toMatch(/[Ee]rrors are always shown/);
    });

    it('skill output-format.md files reference verbose mode (not full mode)', () => {
      const skillFiles = getAllMdFiles(SKILLS_DIR).filter(f => f.endsWith('output-format.md'));
      const violations: string[] = [];

      for (const filePath of skillFiles) {
        const content = readFile(filePath);
        if (!content.includes('verbose')) {
          const relPath = path.relative(FRAMEWORK_DIR, filePath);
          violations.push(relPath);
        }
      }

      expect(
        violations,
        `These output-format.md files do not mention verbose mode:\n${violations.join('\n')}`
      ).toHaveLength(0);
    });
  });

  describe('Boundary tests — verify edge cases are handled', () => {
    it('legitimate uses of the word "silent" (not as a mode) are preserved in skill SKILL.md files', () => {
      // Words like "silently fail", "silently route" are legitimate and should remain
      // This test verifies the word "silent" still appears somewhere in SKILL.md files
      // (as "silently") showing we didn't over-aggressively strip it
      const skillMdFiles = getAllMdFiles(SKILLS_DIR).filter(f => f.endsWith('SKILL.md'));
      const filesWithSilently = skillMdFiles.filter(f => {
        const content = readFile(f);
        return /silently/i.test(content);
      });
      // At least some SKILL.md files should still have "silently" (as in "silently fail")
      // This is a boundary check that we didn't accidentally strip all uses
      expect(filesWithSilently.length).toBeGreaterThan(0);
    });

    it('unknown output_mode values still default to compact (rule preserved)', () => {
      const content = readFile(VISUAL_FORMATTING);
      expect(content).toMatch(/[Uu]nknown.*(?:values?|input).*default.*compact|default.*compact.*[Uu]nknown/i);
    });
  });
});
