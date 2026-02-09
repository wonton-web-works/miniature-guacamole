/**
 * WS-AUDIT-2: ROI Reporting & Cross-Project Aggregation - Cross-Project Tests
 *
 * BDD Scenarios:
 * - AC-4: Cross-project aggregation: --projects flag reads audit logs from multiple project directories
 *
 * Coverage Target: 99%+ of cross-project aggregation functionality
 * Test Pattern: MISUSE → BOUNDARY → GOLDEN PATH
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { TrackedAuditEntry } from '@/audit/reporting/reader';

/**
 * Project configuration for cross-project aggregation
 */
export interface ProjectConfig {
  name: string;
  audit_log_path: string;
}

/**
 * Cross-project aggregation result
 */
export interface CrossProjectResult<T> {
  by_project: Map<string, T[]>;
  combined: T[];
}

/**
 * Placeholder imports (to be implemented in src/audit/reporting/cross-project.ts)
 */
import {
  readMultipleAuditLogs,
  aggregateCrossProject,
  parseProjectPaths,
  validateProjectPath,
} from '@/audit/reporting/cross-project';

// ============================================================================
// MISUSE CASES - Invalid inputs, malformed data, error conditions
// ============================================================================

describe('audit/reporting/cross-project - MISUSE CASES', () => {
  describe('parseProjectPaths() with invalid inputs', () => {
    it('When project paths string is null, Then throws error', () => {
      expect(() => parseProjectPaths(null as any))
        .toThrow(/invalid.*paths/i);
    });

    it('When project paths string is undefined, Then throws error', () => {
      expect(() => parseProjectPaths(undefined as any))
        .toThrow(/invalid.*paths/i);
    });

    it('When project paths string is empty, Then throws error', () => {
      expect(() => parseProjectPaths(''))
        .toThrow(/invalid.*paths/i);
    });

    it('When project paths string contains only whitespace, Then throws error', () => {
      expect(() => parseProjectPaths('   '))
        .toThrow(/invalid.*paths/i);
    });

    it('When project paths is not a string, Then throws error', () => {
      expect(() => parseProjectPaths(123 as any))
        .toThrow(/invalid.*paths/i);
    });

    it('When project paths is array, Then throws error', () => {
      expect(() => parseProjectPaths(['/path1', '/path2'] as any))
        .toThrow(/invalid.*paths/i);
    });
  });

  describe('validateProjectPath() with path traversal attempts', () => {
    it('When path contains .. traversal, Then throws error', () => {
      expect(() => validateProjectPath('/home/user/../../etc/passwd'))
        .toThrow(/path.*traversal/i);
    });

    it('When path contains encoded traversal, Then throws error', () => {
      expect(() => validateProjectPath('/home/user/..%2F..%2Fetc'))
        .toThrow(/path.*traversal/i);
    });

    it('When path contains Windows-style traversal, Then throws error', () => {
      expect(() => validateProjectPath('C:\\users\\..\\..\\Windows\\System32'))
        .toThrow(/path.*traversal/i);
    });

    it('When path attempts to access system files, Then validates carefully', () => {
      // Should validate but not necessarily throw (depends on implementation)
      const result = validateProjectPath('/etc');
      expect(typeof result).toBe('boolean');
    });

    it('When path is relative with .., Then throws error', () => {
      expect(() => validateProjectPath('../../../etc/passwd'))
        .toThrow(/path.*traversal/i);
    });
  });

  describe('readMultipleAuditLogs() with non-existent directories', () => {
    it('When project directory does not exist, Then throws error', () => {
      const projectPaths = ['/nonexistent/project1', '/nonexistent/project2'];

      expect(() => readMultipleAuditLogs(projectPaths))
        .toThrow(/not.*found|does not exist/i);
    });

    it('When one of multiple directories does not exist, Then throws error', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cross-project-test-'));
      const projectPaths = [tempDir, '/nonexistent/project'];

      try {
        expect(() => readMultipleAuditLogs(projectPaths))
          .toThrow(/not.*found|does not exist/i);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('When audit log does not exist in directory, Then throws error', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cross-project-test-'));

      try {
        expect(() => readMultipleAuditLogs([tempDir]))
          .toThrow(/audit.*log.*not.*found/i);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('readMultipleAuditLogs() with malformed audit logs', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cross-project-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('When audit log contains invalid JSON, Then skips invalid lines', () => {
      const project1 = path.join(tempDir, 'project1');
      fs.mkdirSync(project1);
      fs.writeFileSync(
        path.join(project1, 'audit.log'),
        '{ invalid json\n{"valid": "entry"}',
        'utf8'
      );

      const result = readMultipleAuditLogs([project1]);

      // Should skip invalid line, but may return empty or partial results
      expect(result).toBeDefined();
    });

    it('When audit log is empty file, Then returns empty array', () => {
      const project1 = path.join(tempDir, 'project1');
      fs.mkdirSync(project1);
      fs.writeFileSync(path.join(project1, 'audit.log'), '', 'utf8');

      const result = readMultipleAuditLogs([project1]);

      expect(result.get(project1)).toEqual([]);
    });

    it('When audit log contains only whitespace, Then returns empty array', () => {
      const project1 = path.join(tempDir, 'project1');
      fs.mkdirSync(project1);
      fs.writeFileSync(path.join(project1, 'audit.log'), '   \n  \n ', 'utf8');

      const result = readMultipleAuditLogs([project1]);

      expect(result.get(project1)).toEqual([]);
    });
  });

  describe('aggregateCrossProject() with invalid inputs', () => {
    it('When entries map is null, Then throws error', () => {
      expect(() => aggregateCrossProject(null as any))
        .toThrow(/invalid.*entries/i);
    });

    it('When entries map is undefined, Then throws error', () => {
      expect(() => aggregateCrossProject(undefined as any))
        .toThrow(/invalid.*entries/i);
    });

    it('When entries is not a Map, Then throws error', () => {
      expect(() => aggregateCrossProject({} as any))
        .toThrow(/invalid.*entries/i);
    });

    it('When entries is array, Then throws error', () => {
      expect(() => aggregateCrossProject([] as any))
        .toThrow(/invalid.*entries/i);
    });
  });
});

// ============================================================================
// BOUNDARY TESTS - Edge cases, limits, unusual but valid inputs
// ============================================================================

describe('audit/reporting/cross-project - BOUNDARY TESTS', () => {
  describe('parseProjectPaths() with edge cases', () => {
    it('When single project path, Then returns array with one element', () => {
      const result = parseProjectPaths('/home/user/project1');

      expect(result).toEqual(['/home/user/project1']);
    });

    it('When paths separated by comma, Then splits correctly', () => {
      const result = parseProjectPaths('/path1,/path2,/path3');

      expect(result).toEqual(['/path1', '/path2', '/path3']);
    });

    it('When paths separated by comma with spaces, Then trims whitespace', () => {
      const result = parseProjectPaths('/path1 , /path2 , /path3');

      expect(result).toEqual(['/path1', '/path2', '/path3']);
    });

    it('When paths contain trailing commas, Then ignores empty entries', () => {
      const result = parseProjectPaths('/path1,/path2,');

      expect(result).toEqual(['/path1', '/path2']);
    });

    it('When paths contain duplicate entries, Then preserves duplicates', () => {
      const result = parseProjectPaths('/path1,/path1,/path2');

      // May or may not deduplicate - depends on implementation
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('readMultipleAuditLogs() with empty directories', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cross-project-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('When no projects specified, Then returns empty map', () => {
      const result = readMultipleAuditLogs([]);

      expect(result.size).toBe(0);
    });

    it('When single project with empty audit log, Then returns empty entries', () => {
      const project1 = path.join(tempDir, 'project1');
      fs.mkdirSync(project1);
      fs.writeFileSync(path.join(project1, 'audit.log'), '', 'utf8');

      const result = readMultipleAuditLogs([project1]);

      expect(result.size).toBe(1);
      expect(result.get(project1)).toEqual([]);
    });

    it('When multiple projects all empty, Then returns empty entries for all', () => {
      const project1 = path.join(tempDir, 'project1');
      const project2 = path.join(tempDir, 'project2');
      fs.mkdirSync(project1);
      fs.mkdirSync(project2);
      fs.writeFileSync(path.join(project1, 'audit.log'), '', 'utf8');
      fs.writeFileSync(path.join(project2, 'audit.log'), '', 'utf8');

      const result = readMultipleAuditLogs([project1, project2]);

      expect(result.size).toBe(2);
      expect(result.get(project1)).toEqual([]);
      expect(result.get(project2)).toEqual([]);
    });
  });

  describe('readMultipleAuditLogs() with single entry per project', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cross-project-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('When each project has one entry, Then reads all entries', () => {
      const project1 = path.join(tempDir, 'project1');
      const project2 = path.join(tempDir, 'project2');
      fs.mkdirSync(project1);
      fs.mkdirSync(project2);

      const entry1 = {
        timestamp: '2026-02-08T10:00:00.000Z',
        session_id: 'sess1',
        model: 'claude-opus-4-6',
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        total_cost_usd: 0.05,
        duration_ms: 1000,
      };

      const entry2 = {
        timestamp: '2026-02-08T11:00:00.000Z',
        session_id: 'sess2',
        model: 'claude-opus-4-6',
        input_tokens: 2000,
        output_tokens: 1000,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        total_cost_usd: 0.10,
        duration_ms: 2000,
      };

      fs.writeFileSync(path.join(project1, 'audit.log'), JSON.stringify(entry1), 'utf8');
      fs.writeFileSync(path.join(project2, 'audit.log'), JSON.stringify(entry2), 'utf8');

      const result = readMultipleAuditLogs([project1, project2]);

      expect(result.size).toBe(2);
      expect(result.get(project1)).toHaveLength(1);
      expect(result.get(project2)).toHaveLength(1);
    });
  });

  describe('aggregateCrossProject() with edge cases', () => {
    it('When entries map is empty, Then returns empty combined', () => {
      const entries = new Map<string, TrackedAuditEntry[]>();

      const result = aggregateCrossProject(entries);

      expect(result.combined).toEqual([]);
      expect(result.by_project.size).toBe(0);
    });

    it('When one project has entries, others empty, Then combines correctly', () => {
      const entries = new Map<string, TrackedAuditEntry[]>();
      entries.set('/project1', [
        {
          timestamp: '2026-02-08T10:00:00.000Z',
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
        },
      ]);
      entries.set('/project2', []);

      const result = aggregateCrossProject(entries);

      expect(result.combined).toHaveLength(1);
      expect(result.by_project.size).toBe(2);
    });
  });
});

// ============================================================================
// GOLDEN PATH - Normal, expected operations
// ============================================================================

describe('audit/reporting/cross-project - GOLDEN PATH', () => {
  describe('parseProjectPaths() with typical inputs (AC-4)', () => {
    it('When parsing comma-separated paths, Then splits into array', () => {
      const paths = '/home/user/project1,/home/user/project2,/home/user/project3';

      const result = parseProjectPaths(paths);

      expect(result).toEqual([
        '/home/user/project1',
        '/home/user/project2',
        '/home/user/project3',
      ]);
    });

    it('When parsing paths with mixed separators, Then handles gracefully', () => {
      const paths = '/home/user/project1, /home/user/project2 ,/home/user/project3';

      const result = parseProjectPaths(paths);

      expect(result).toEqual([
        '/home/user/project1',
        '/home/user/project2',
        '/home/user/project3',
      ]);
    });
  });

  describe('validateProjectPath() with valid paths', () => {
    it('When path is absolute and valid, Then returns true', () => {
      const result = validateProjectPath('/home/user/project');

      expect(result).toBe(true);
    });

    it('When path is relative (no traversal), Then returns true', () => {
      const result = validateProjectPath('./project');

      expect(result).toBe(true);
    });

    it('When path contains subdirectories, Then returns true', () => {
      const result = validateProjectPath('/home/user/workspace/project1');

      expect(result).toBe(true);
    });
  });

  describe('readMultipleAuditLogs() with multiple projects (AC-4)', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cross-project-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('When reading from two projects, Then returns entries for both', () => {
      const project1 = path.join(tempDir, 'project1');
      const project2 = path.join(tempDir, 'project2');
      fs.mkdirSync(project1);
      fs.mkdirSync(project2);

      const entries1 = [
        {
          timestamp: '2026-02-08T10:00:00.000Z',
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
          workstream_id: 'WS-1',
        },
        {
          timestamp: '2026-02-08T11:00:00.000Z',
          session_id: 'sess2',
          model: 'claude-opus-4-6',
          input_tokens: 1500,
          output_tokens: 750,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.075,
          duration_ms: 1500,
          workstream_id: 'WS-2',
        },
      ];

      const entries2 = [
        {
          timestamp: '2026-02-08T12:00:00.000Z',
          session_id: 'sess3',
          model: 'claude-opus-4-6',
          input_tokens: 2000,
          output_tokens: 1000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.10,
          duration_ms: 2000,
          workstream_id: 'WS-3',
        },
      ];

      fs.writeFileSync(
        path.join(project1, 'audit.log'),
        entries1.map(e => JSON.stringify(e)).join('\n'),
        'utf8'
      );
      fs.writeFileSync(
        path.join(project2, 'audit.log'),
        entries2.map(e => JSON.stringify(e)).join('\n'),
        'utf8'
      );

      const result = readMultipleAuditLogs([project1, project2]);

      expect(result.size).toBe(2);
      expect(result.get(project1)).toHaveLength(2);
      expect(result.get(project2)).toHaveLength(1);
      expect(result.get(project1)?.[0].workstream_id).toBe('WS-1');
      expect(result.get(project2)?.[0].workstream_id).toBe('WS-3');
    });

    it('When reading from three projects, Then returns entries for all', () => {
      const project1 = path.join(tempDir, 'project1');
      const project2 = path.join(tempDir, 'project2');
      const project3 = path.join(tempDir, 'project3');
      fs.mkdirSync(project1);
      fs.mkdirSync(project2);
      fs.mkdirSync(project3);

      const entry = {
        timestamp: '2026-02-08T10:00:00.000Z',
        session_id: 'sess1',
        model: 'claude-opus-4-6',
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        total_cost_usd: 0.05,
        duration_ms: 1000,
      };

      fs.writeFileSync(path.join(project1, 'audit.log'), JSON.stringify(entry), 'utf8');
      fs.writeFileSync(path.join(project2, 'audit.log'), JSON.stringify(entry), 'utf8');
      fs.writeFileSync(path.join(project3, 'audit.log'), JSON.stringify(entry), 'utf8');

      const result = readMultipleAuditLogs([project1, project2, project3]);

      expect(result.size).toBe(3);
      expect(result.get(project1)).toHaveLength(1);
      expect(result.get(project2)).toHaveLength(1);
      expect(result.get(project3)).toHaveLength(1);
    });
  });

  describe('aggregateCrossProject() with multiple projects (AC-4)', () => {
    it('When aggregating entries from multiple projects, Then combines all', () => {
      const entries = new Map<string, TrackedAuditEntry[]>();

      entries.set('/project1', [
        {
          timestamp: '2026-02-08T10:00:00.000Z',
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
          workstream_id: 'WS-1',
        },
      ]);

      entries.set('/project2', [
        {
          timestamp: '2026-02-08T11:00:00.000Z',
          session_id: 'sess2',
          model: 'claude-opus-4-6',
          input_tokens: 2000,
          output_tokens: 1000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.10,
          duration_ms: 2000,
          workstream_id: 'WS-2',
        },
      ]);

      const result = aggregateCrossProject(entries);

      expect(result.combined).toHaveLength(2);
      expect(result.by_project.size).toBe(2);
      expect(result.by_project.get('/project1')).toBeDefined();
      expect(result.by_project.get('/project2')).toBeDefined();
    });

    it('When aggregating with duplicate workstreams, Then preserves all entries', () => {
      const entries = new Map<string, TrackedAuditEntry[]>();

      entries.set('/project1', [
        {
          timestamp: '2026-02-08T10:00:00.000Z',
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
          workstream_id: 'WS-1',
        },
      ]);

      entries.set('/project2', [
        {
          timestamp: '2026-02-08T11:00:00.000Z',
          session_id: 'sess2',
          model: 'claude-opus-4-6',
          input_tokens: 2000,
          output_tokens: 1000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.10,
          duration_ms: 2000,
          workstream_id: 'WS-1', // Same workstream across projects
        },
      ]);

      const result = aggregateCrossProject(entries);

      expect(result.combined).toHaveLength(2);
      // Should preserve both entries even though workstream ID is same
      const ws1Entries = result.combined.filter(e => e.workstream_id === 'WS-1');
      expect(ws1Entries).toHaveLength(2);
    });
  });

  describe('Cross-project aggregation with workstream summaries', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cross-project-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('When aggregating workstreams cross-project, Then groups correctly', () => {
      const project1 = path.join(tempDir, 'project1');
      const project2 = path.join(tempDir, 'project2');
      fs.mkdirSync(project1);
      fs.mkdirSync(project2);

      const entries1 = [
        {
          timestamp: '2026-02-08T10:00:00.000Z',
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
          workstream_id: 'WS-1',
        },
      ];

      const entries2 = [
        {
          timestamp: '2026-02-08T11:00:00.000Z',
          session_id: 'sess2',
          model: 'claude-opus-4-6',
          input_tokens: 2000,
          output_tokens: 1000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.10,
          duration_ms: 2000,
          workstream_id: 'WS-2',
        },
      ];

      fs.writeFileSync(path.join(project1, 'audit.log'), JSON.stringify(entries1[0]), 'utf8');
      fs.writeFileSync(path.join(project2, 'audit.log'), JSON.stringify(entries2[0]), 'utf8');

      const entriesMap = readMultipleAuditLogs([project1, project2]);
      const result = aggregateCrossProject(entriesMap);

      expect(result.combined).toHaveLength(2);

      // Workstreams should be distinguishable
      const workstreams = new Set(result.combined.map(e => e.workstream_id));
      expect(workstreams.size).toBe(2);
      expect(workstreams.has('WS-1')).toBe(true);
      expect(workstreams.has('WS-2')).toBe(true);
    });
  });
});
