import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';

import {
  checkPrereqs,
  formatPrereqReport,
} from '../../src/prereqs';
import type { PrereqResult } from '../../src/prereqs';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('prereqs module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkPrereqs()', () => {
    it('GIVEN all tools present WHEN checkPrereqs() called THEN returns array with 4 results', () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from('/usr/local/bin/node'));

      const results = checkPrereqs();

      expect(results).toHaveLength(4);
    });

    it('GIVEN all tools present WHEN checkPrereqs() called THEN checks node', () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from('/usr/local/bin/node'));

      const results = checkPrereqs();

      const nodeResult = results.find((r) => r.name === 'node');
      expect(nodeResult).toBeDefined();
    });

    it('GIVEN all tools present WHEN checkPrereqs() called THEN checks gh', () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from('/usr/local/bin/gh'));

      const results = checkPrereqs();

      const ghResult = results.find((r) => r.name === 'gh');
      expect(ghResult).toBeDefined();
    });

    it('GIVEN all tools present WHEN checkPrereqs() called THEN checks claude', () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from('/usr/local/bin/claude'));

      const results = checkPrereqs();

      const claudeResult = results.find((r) => r.name === 'claude');
      expect(claudeResult).toBeDefined();
    });

    it('GIVEN all tools present WHEN checkPrereqs() called THEN checks git', () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from('/usr/local/bin/git'));

      const results = checkPrereqs();

      const gitResult = results.find((r) => r.name === 'git');
      expect(gitResult).toBeDefined();
    });

    it('GIVEN all tools present WHEN checkPrereqs() called THEN all found: true', () => {
      vi.mocked(execSync)
        .mockReturnValueOnce(Buffer.from('/usr/local/bin/node'))  // which node
        .mockReturnValueOnce(Buffer.from('v20.0.0'))              // node --version
        .mockReturnValueOnce(Buffer.from('/usr/local/bin/gh'))    // which gh
        .mockReturnValueOnce(Buffer.from('gh version 2.0.0'))     // gh --version
        .mockReturnValueOnce(Buffer.from('/usr/local/bin/claude'))// which claude
        .mockReturnValueOnce(Buffer.from('claude 1.0.0'))         // claude --version
        .mockReturnValueOnce(Buffer.from('/usr/local/bin/git'))   // which git
        .mockReturnValueOnce(Buffer.from('git version 2.39.0'));  // git --version

      const results = checkPrereqs();

      results.forEach((result) => {
        expect(result.found).toBe(true);
      });
    });

    it('GIVEN all tools present WHEN checkPrereqs() called THEN includes path for each tool', () => {
      vi.mocked(execSync)
        .mockReturnValueOnce(Buffer.from('/usr/local/bin/node'))
        .mockReturnValueOnce(Buffer.from('v20.0.0'))
        .mockReturnValueOnce(Buffer.from('/usr/local/bin/gh'))
        .mockReturnValueOnce(Buffer.from('gh version 2.0.0'))
        .mockReturnValueOnce(Buffer.from('/usr/local/bin/claude'))
        .mockReturnValueOnce(Buffer.from('claude 1.0.0'))
        .mockReturnValueOnce(Buffer.from('/usr/local/bin/git'))
        .mockReturnValueOnce(Buffer.from('git version 2.39.0'));

      const results = checkPrereqs();

      results.forEach((result) => {
        expect(result.path).toBeDefined();
        expect(typeof result.path).toBe('string');
      });
    });

    it('GIVEN all tools present WHEN checkPrereqs() called THEN includes version for each tool', () => {
      vi.mocked(execSync)
        .mockReturnValueOnce(Buffer.from('/usr/local/bin/node'))
        .mockReturnValueOnce(Buffer.from('v20.0.0'))
        .mockReturnValueOnce(Buffer.from('/usr/local/bin/gh'))
        .mockReturnValueOnce(Buffer.from('gh version 2.0.0'))
        .mockReturnValueOnce(Buffer.from('/usr/local/bin/claude'))
        .mockReturnValueOnce(Buffer.from('claude 1.0.0'))
        .mockReturnValueOnce(Buffer.from('/usr/local/bin/git'))
        .mockReturnValueOnce(Buffer.from('git version 2.39.0'));

      const results = checkPrereqs();

      results.forEach((result) => {
        expect(result.version).toBeDefined();
      });
    });

    it('GIVEN node is missing WHEN checkPrereqs() called THEN node result has found: false', () => {
      vi.mocked(execSync).mockImplementation((cmd) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('which node') || cmdStr.includes('node --version')) {
          throw new Error('command not found: node');
        }
        return Buffer.from('/usr/local/bin/tool');
      });

      const results = checkPrereqs();

      const nodeResult = results.find((r) => r.name === 'node');
      expect(nodeResult).toBeDefined();
      expect(nodeResult!.found).toBe(false);
    });

    it('GIVEN gh is missing WHEN checkPrereqs() called THEN gh result has found: false', () => {
      vi.mocked(execSync).mockImplementation((cmd) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('which gh') || (cmdStr.includes('gh') && cmdStr.includes('version'))) {
          throw new Error('command not found: gh');
        }
        return Buffer.from('/usr/local/bin/tool');
      });

      const results = checkPrereqs();

      const ghResult = results.find((r) => r.name === 'gh');
      expect(ghResult).toBeDefined();
      expect(ghResult!.found).toBe(false);
    });

    it('GIVEN claude is missing WHEN checkPrereqs() called THEN claude result has found: false', () => {
      vi.mocked(execSync).mockImplementation((cmd) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('which claude') || (cmdStr.includes('claude') && cmdStr.includes('version'))) {
          throw new Error('command not found: claude');
        }
        return Buffer.from('/usr/local/bin/tool');
      });

      const results = checkPrereqs();

      const claudeResult = results.find((r) => r.name === 'claude');
      expect(claudeResult).toBeDefined();
      expect(claudeResult!.found).toBe(false);
    });

    it('GIVEN missing tool WHEN checkPrereqs() called THEN result includes error message', () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('command not found');
      });

      const results = checkPrereqs();

      results.forEach((result) => {
        expect(result.found).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('GIVEN some tools missing WHEN checkPrereqs() called THEN other tools still checked', () => {
      // Only gh throws, others succeed
      vi.mocked(execSync).mockImplementation((cmd) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('gh')) {
          throw new Error('command not found: gh');
        }
        return Buffer.from('/usr/local/bin/tool\nv1.0.0');
      });

      const results = checkPrereqs();

      const ghResult = results.find((r) => r.name === 'gh');
      const nodeResult = results.find((r) => r.name === 'node');
      expect(ghResult!.found).toBe(false);
      expect(nodeResult!.found).toBe(true);
    });
  });

  describe('formatPrereqReport()', () => {
    it('GIVEN all tools found WHEN formatPrereqReport() called THEN returns non-empty string', () => {
      const results: PrereqResult[] = [
        { name: 'node', found: true, version: 'v20.0.0', path: '/usr/local/bin/node' },
        { name: 'gh', found: true, version: 'gh version 2.0.0', path: '/usr/local/bin/gh' },
        { name: 'claude', found: true, version: 'claude 1.0.0', path: '/usr/local/bin/claude' },
        { name: 'git', found: true, version: 'git version 2.39.0', path: '/usr/local/bin/git' },
      ];

      const report = formatPrereqReport(results);

      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
    });

    it('GIVEN results WHEN formatPrereqReport() called THEN includes each tool name', () => {
      const results: PrereqResult[] = [
        { name: 'node', found: true, version: 'v20.0.0', path: '/usr/local/bin/node' },
        { name: 'gh', found: false, error: 'not found' },
        { name: 'claude', found: true, version: 'claude 1.0.0', path: '/usr/local/bin/claude' },
        { name: 'git', found: true, version: 'git version 2.39.0', path: '/usr/local/bin/git' },
      ];

      const report = formatPrereqReport(results);

      expect(report).toContain('node');
      expect(report).toContain('gh');
      expect(report).toContain('claude');
      expect(report).toContain('git');
    });

    it('GIVEN tool found WHEN formatPrereqReport() called THEN marks tool as found/ok', () => {
      const results: PrereqResult[] = [
        { name: 'node', found: true, version: 'v20.0.0', path: '/usr/local/bin/node' },
      ];

      const report = formatPrereqReport(results);

      // Should indicate success somehow (check mark, OK, found, etc.)
      expect(report).toMatch(/ok|found|pass|✓|YES/i);
    });

    it('GIVEN tool missing WHEN formatPrereqReport() called THEN marks tool as missing/failed', () => {
      const results: PrereqResult[] = [
        { name: 'gh', found: false, error: 'command not found' },
      ];

      const report = formatPrereqReport(results);

      // Should indicate failure somehow
      expect(report).toMatch(/not found|missing|fail|✗|NO|MISSING/i);
    });

    it('GIVEN tool found with version WHEN formatPrereqReport() called THEN includes version in output', () => {
      const results: PrereqResult[] = [
        { name: 'node', found: true, version: 'v20.0.0', path: '/usr/local/bin/node' },
      ];

      const report = formatPrereqReport(results);

      expect(report).toContain('v20.0.0');
    });

    it('GIVEN empty results WHEN formatPrereqReport() called THEN returns a string', () => {
      const report = formatPrereqReport([]);

      expect(typeof report).toBe('string');
    });

    it('GIVEN results WHEN formatPrereqReport() called THEN output fits in 80 columns', () => {
      const results: PrereqResult[] = [
        { name: 'node', found: true, version: 'v20.0.0', path: '/usr/local/bin/node' },
        { name: 'gh', found: false, error: 'command not found' },
        { name: 'claude', found: true, version: 'claude 1.0.0', path: '/usr/local/bin/claude' },
        { name: 'git', found: true, version: 'git version 2.39.0', path: '/usr/local/bin/git' },
      ];

      const report = formatPrereqReport(results);
      const lines = report.split('\n');

      lines.forEach((line) => {
        expect(line.length).toBeLessThanOrEqual(80);
      });
    });
  });
});
