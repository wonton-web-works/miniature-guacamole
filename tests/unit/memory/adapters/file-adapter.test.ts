/**
 * WS-ENT-0: FileAdapter Implementation Tests
 *
 * Tests for the FileAdapter implementation extracted from existing
 * file-based memory operations. Validates that the adapter correctly
 * implements the StorageAdapter interface and maintains backward compatibility.
 *
 * Acceptance Criteria Covered:
 *   AC-ENT-0.4: FileAdapter extracted implementing full interface
 *   AC-ENT-0.6: All existing memory tests pass against FileAdapter
 *   AC-ENT-0.7: 99%+ test coverage
 *
 * TDD: These tests are written BEFORE implementation. They will FAIL
 * until src/memory/adapters/file-adapter.ts is created with the
 * FileAdapter class implementation.
 *
 * Test Order: Misuse → Boundary → Golden Path (CAD Protocol)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// This import will fail until the file-adapter is created
// @ts-expect-error -- not yet implemented; TDD red phase
import { FileAdapter } from '@/memory/adapters/file-adapter';

// ---------------------------------------------------------------------------
// Test Setup
// ---------------------------------------------------------------------------

let testDir: string;
let adapter: FileAdapter;

beforeEach(() => {
  // Create temp directory for tests
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-adapter-test-'));
  adapter = new FileAdapter({ baseDir: testDir });
});

afterEach(() => {
  // Cleanup
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// MISUSE CASES - Security, injection, race conditions
// ---------------------------------------------------------------------------

describe('FileAdapter - Misuse Cases', () => {
  describe('Path Traversal Prevention', () => {
    it('should reject read with absolute path outside baseDir', async () => {
      const result = await adapter.read('/etc/passwd');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid path|outside base directory/i);
    });

    it('should reject read with relative path traversal', async () => {
      const result = await adapter.read('../../etc/passwd');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid path|directory traversal/i);
    });

    it('should reject write with path traversal', async () => {
      const result = await adapter.write('../../../malicious.json', { test: 'data' });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid path|directory traversal/i);
    });

    it('should reject delete with path traversal', async () => {
      const result = await adapter.delete('../../important-file.json');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid path|directory traversal/i);
    });

    it('should normalize paths to prevent traversal via encoded characters', async () => {
      // Encoded dots: %2e%2e
      const result = await adapter.read('%2e%2e%2f%2e%2e%2fetc%2fpasswd');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid path|not found/i);
    });
  });

  describe('Null Byte Injection', () => {
    it('should reject keys with null bytes in read', async () => {
      const result = await adapter.read('file\x00.json');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid|null byte/i);
    });

    it('should reject keys with null bytes in write', async () => {
      const result = await adapter.write('file\x00.json', { test: 'data' });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid|null byte/i);
    });

    it('should reject keys with null bytes in delete', async () => {
      const result = await adapter.delete('file\x00.json');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid|null byte/i);
    });
  });

  describe('Malformed Data Handling', () => {
    it('should reject circular references in write', async () => {
      const data: any = { name: 'test' };
      data.self = data;

      const result = await adapter.write('circular.json', data);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/circular/i);
    });

    it('should handle invalid JSON in existing file gracefully', async () => {
      // Create file with invalid JSON
      const filePath = path.join(testDir, 'invalid.json');
      fs.writeFileSync(filePath, '{ invalid json }', 'utf-8');

      const result = await adapter.read('invalid.json');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid JSON|parse error/i);
    });

    it('should handle empty file gracefully', async () => {
      // Create empty file
      const filePath = path.join(testDir, 'empty.json');
      fs.writeFileSync(filePath, '', 'utf-8');

      const result = await adapter.read('empty.json');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/empty|invalid JSON/i);
    });

    it('should reject prototype pollution attempts', async () => {
      const maliciousData = JSON.parse('{"__proto__": {"isAdmin": true}}');

      const result = await adapter.write('proto.json', maliciousData);

      // Should either reject or sanitize
      expect(result.success).toBe(false);
    });
  });

  describe('Concurrent Write Races', () => {
    it('should serialize concurrent writes to same file', async () => {
      // Attempt concurrent writes
      const promises = Array.from({ length: 10 }, (_, i) =>
        adapter.write('race.json', { iteration: i })
      );

      const results = await Promise.all(promises);

      // All should succeed (serialized via locking)
      expect(results.every(r => r.success)).toBe(true);

      // Final read should return one of the written values
      const finalRead = await adapter.read('race.json');
      expect(finalRead.success).toBe(true);
      expect(finalRead.data).toHaveProperty('iteration');
      expect(finalRead.data!.iteration).toBeGreaterThanOrEqual(0);
      expect(finalRead.data!.iteration).toBeLessThan(10);
    });

    it('should handle concurrent read/write without corruption', async () => {
      // Write initial data
      await adapter.write('concurrent.json', { value: 0 });

      // Race reads and writes
      const promises = [
        ...Array.from({ length: 5 }, (_, i) =>
          adapter.write('concurrent.json', { value: i + 1 })
        ),
        ...Array.from({ length: 5 }, () => adapter.read('concurrent.json')),
      ];

      const results = await Promise.all(promises);

      // No errors should occur
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should handle write/delete race gracefully', async () => {
      // Write initial data
      await adapter.write('race-delete.json', { test: 'data' });

      // Race write and delete
      const [writeResult, deleteResult] = await Promise.all([
        adapter.write('race-delete.json', { updated: 'data' }),
        adapter.delete('race-delete.json'),
      ]);

      // Both operations should complete without error
      expect(writeResult).toHaveProperty('success');
      expect(deleteResult).toHaveProperty('success');
    });
  });

  describe('Permission Errors', () => {
    it('should handle read permission denied gracefully', async () => {
      // Create file and remove read permission
      const filePath = path.join(testDir, 'no-read.json');
      fs.writeFileSync(filePath, JSON.stringify({ test: 'data' }), 'utf-8');
      fs.chmodSync(filePath, 0o000);

      const result = await adapter.read('no-read.json');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/permission|EACCES/i);

      // Cleanup
      fs.chmodSync(filePath, 0o644);
    });

    it('should handle write permission denied gracefully', async () => {
      // Create read-only directory
      const readOnlyDir = path.join(testDir, 'readonly');
      fs.mkdirSync(readOnlyDir);
      fs.chmodSync(readOnlyDir, 0o444);

      const readOnlyAdapter = new FileAdapter({ baseDir: readOnlyDir });
      const result = await readOnlyAdapter.write('test.json', { test: 'data' });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/permission|EACCES|read-only/i);

      // Cleanup
      fs.chmodSync(readOnlyDir, 0o755);
    });
  });

  describe('Filesystem Corruption', () => {
    it('should handle file deleted during read', async () => {
      // Create file
      await adapter.write('disappear.json', { test: 'data' });

      // Mock fs.readFileSync to throw ENOENT
      const originalRead = fs.readFileSync;
      vi.spyOn(fs, 'readFileSync').mockImplementation((filePath, encoding) => {
        // Delete file before read completes
        if (typeof filePath === 'string' && filePath.includes('disappear.json')) {
          throw Object.assign(new Error('ENOENT: file not found'), { code: 'ENOENT' });
        }
        return originalRead(filePath, encoding);
      });

      const result = await adapter.read('disappear.json');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found|ENOENT/i);

      vi.restoreAllMocks();
    });

    it('should handle disk full during write', async () => {
      // Mock fs.writeFileSync to throw ENOSPC
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw Object.assign(new Error('ENOSPC: no space left'), { code: 'ENOSPC' });
      });

      const result = await adapter.write('test.json', { test: 'data' });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/space|ENOSPC|write/i);

      vi.restoreAllMocks();
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY CASES - Edge cases, limits, unusual but valid inputs
// ---------------------------------------------------------------------------

describe('FileAdapter - Boundary Cases', () => {
  describe('Empty/Null/Undefined Inputs', () => {
    it('should reject empty string key', async () => {
      const result = await adapter.read('');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid|empty key/i);
    });

    it('should reject null data in write', async () => {
      // @ts-expect-error -- testing null handling
      const result = await adapter.write('null.json', null);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/missing required field|invalid data/i);
    });

    it('should reject undefined data in write', async () => {
      // @ts-expect-error -- testing undefined handling
      const result = await adapter.write('undefined.json', undefined);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/missing required field|invalid data/i);
    });

    it('should accept empty object', async () => {
      const result = await adapter.write('empty-obj.json', {});

      // Empty object is valid
      expect(result.success).toBe(true);
    });

    it('should accept empty array', async () => {
      const result = await adapter.write('empty-arr.json', []);

      // Empty array is valid
      expect(result.success).toBe(true);
    });
  });

  describe('Large File Handling', () => {
    it('should reject files exceeding 10MB', async () => {
      // Create 11MB payload
      const largeData = { payload: 'x'.repeat(11 * 1024 * 1024) };

      const result = await adapter.write('large.json', largeData);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/size|limit|exceeded/i);
    });

    it('should handle file at exactly 10MB boundary', async () => {
      // Create data close to 10MB limit
      const boundaryData = { payload: 'x'.repeat(10 * 1024 * 1024 - 1000) };

      const result = await adapter.write('boundary.json', boundaryData);

      // Should succeed or provide clear error
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Special Characters in Keys', () => {
    it('should handle keys with spaces', async () => {
      const result = await adapter.write('file with spaces.json', { test: 'data' });

      expect(result.success).toBe(true);

      const readResult = await adapter.read('file with spaces.json');
      expect(readResult.success).toBe(true);
    });

    it('should handle keys with unicode characters', async () => {
      const result = await adapter.write('файл-文件-ファイル.json', { test: 'unicode' });

      expect(result.success).toBe(true);

      const readResult = await adapter.read('файл-文件-ファイル.json');
      expect(readResult.success).toBe(true);
    });

    it('should handle keys with special characters', async () => {
      const result = await adapter.write('file-@#$%.json', { test: 'special' });

      expect(result.success).toBe(true);

      const readResult = await adapter.read('file-@#$%.json');
      expect(readResult.success).toBe(true);
    });
  });

  describe('Query Edge Cases', () => {
    it('should return empty array when no files match filters', async () => {
      const results = await adapter.query({
        agent_id: 'nonexistent',
        workstream_id: 'nonexistent',
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should handle query with empty filters', async () => {
      // Write some data
      await adapter.write('test1.json', { agent_id: 'dev', data: 'test' });

      const results = await adapter.query({});

      // Should return all entries
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle query with only timestamp filters', async () => {
      const results = await adapter.query({
        start: '2026-01-01T00:00:00Z',
        end: '2026-12-31T23:59:59Z',
      });

      expect(Array.isArray(results)).toBe(true);
    });

    it('should skip non-JSON files in query', async () => {
      // Create non-JSON file
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'not json', 'utf-8');

      // Create JSON file
      await adapter.write('test.json', { agent_id: 'dev', data: 'test' });

      const results = await adapter.query({ agent_id: 'dev' });

      expect(Array.isArray(results)).toBe(true);
      // Should only include JSON files
    });

    it('should skip corrupted JSON files in query', async () => {
      // Create corrupted JSON file
      fs.writeFileSync(path.join(testDir, 'corrupt.json'), '{ invalid', 'utf-8');

      // Create valid JSON file
      await adapter.write('valid.json', { agent_id: 'dev', data: 'test' });

      const results = await adapter.query({ agent_id: 'dev' });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Delete Edge Cases', () => {
    it('should handle delete of non-existent file', async () => {
      const result = await adapter.delete('nonexistent.json');

      // Should succeed (idempotent) or return not-found
      expect(result).toHaveProperty('success');
    });

    it('should handle delete of already deleted file', async () => {
      await adapter.write('delete-twice.json', { test: 'data' });
      await adapter.delete('delete-twice.json');

      // Delete again
      const result = await adapter.delete('delete-twice.json');

      expect(result).toHaveProperty('success');
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH - Normal, expected operations
// ---------------------------------------------------------------------------

describe('FileAdapter - Golden Path', () => {
  describe('Basic CRUD Operations', () => {
    it('should create FileAdapter instance', () => {
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(FileAdapter);
    });

    it('should write and read data successfully', async () => {
      const testData = {
        agent_id: 'dev',
        workstream_id: 'ws-1',
        data: { task: 'implement feature' },
      };

      const writeResult = await adapter.write('test.json', testData);

      expect(writeResult.success).toBe(true);
      expect(writeResult.path).toBeDefined();

      const readResult = await adapter.read('test.json');

      expect(readResult.success).toBe(true);
      expect(readResult.data).toEqual(testData);
    });

    it('should return not-found for non-existent file', async () => {
      const result = await adapter.read('nonexistent.json');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
    });

    it('should delete file successfully', async () => {
      await adapter.write('delete-test.json', { test: 'data' });

      const deleteResult = await adapter.delete('delete-test.json');

      expect(deleteResult.success).toBe(true);

      // Verify deleted
      const readResult = await adapter.read('delete-test.json');
      expect(readResult.success).toBe(false);
    });

    it('should overwrite existing file', async () => {
      await adapter.write('overwrite.json', { version: 1 });
      await adapter.write('overwrite.json', { version: 2 });

      const result = await adapter.read('overwrite.json');

      expect(result.success).toBe(true);
      expect(result.data!.version).toBe(2);
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Populate test data
      await adapter.write('dev1.json', {
        agent_id: 'dev',
        workstream_id: 'ws-1',
        timestamp: '2026-01-15T10:00:00Z',
        data: { task: 'feature-1' },
      });

      await adapter.write('dev2.json', {
        agent_id: 'dev',
        workstream_id: 'ws-2',
        timestamp: '2026-01-16T10:00:00Z',
        data: { task: 'feature-2' },
      });

      await adapter.write('qa1.json', {
        agent_id: 'qa',
        workstream_id: 'ws-1',
        timestamp: '2026-01-17T10:00:00Z',
        data: { task: 'test-1' },
      });
    });

    it('should query by agent_id', async () => {
      const results = await adapter.query({ agent_id: 'dev' });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      expect(results.every(e => e.agent_id === 'dev')).toBe(true);
    });

    it('should query by workstream_id', async () => {
      const results = await adapter.query({ workstream_id: 'ws-1' });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      expect(results.every(e => e.workstream_id === 'ws-1')).toBe(true);
    });

    it('should query by timestamp range', async () => {
      const results = await adapter.query({
        start: '2026-01-16T00:00:00Z',
        end: '2026-01-17T23:59:59Z',
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('should query by multiple filters', async () => {
      const results = await adapter.query({
        agent_id: 'dev',
        workstream_id: 'ws-1',
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].agent_id).toBe('dev');
      expect(results[0].workstream_id).toBe('ws-1');
    });

    it('should return results sorted by timestamp', async () => {
      const results = await adapter.query({});

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(3);

      // Check sorted order
      for (let i = 1; i < results.length; i++) {
        const prev = new Date(results[i - 1].timestamp).getTime();
        const curr = new Date(results[i].timestamp).getTime();
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });
  });

  describe('Data Integrity', () => {
    it('should preserve complex nested objects', async () => {
      const complexData = {
        agent_id: 'dev',
        data: {
          nested: {
            deeply: {
              object: {
                array: [1, 2, 3],
                boolean: true,
                null_value: null,
              },
            },
          },
        },
      };

      await adapter.write('complex.json', complexData);
      const result = await adapter.read('complex.json');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(complexData);
    });

    it('should preserve arrays', async () => {
      const arrayData = {
        agent_id: 'dev',
        data: [1, 'two', { three: 3 }, [4, 5]],
      };

      await adapter.write('array.json', arrayData);
      const result = await adapter.read('array.json');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(arrayData);
    });

    it('should preserve special JSON values', async () => {
      const specialData = {
        agent_id: 'dev',
        data: {
          null_value: null,
          boolean_true: true,
          boolean_false: false,
          zero: 0,
          empty_string: '',
          empty_array: [],
          empty_object: {},
        },
      };

      await adapter.write('special.json', specialData);
      const result = await adapter.read('special.json');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(specialData);
    });
  });

  describe('Backup Creation', () => {
    it('should create backup when overwriting existing file', async () => {
      await adapter.write('backup-test.json', { version: 1 });
      await adapter.write('backup-test.json', { version: 2 });

      // Check that backup directory exists
      const backupDir = path.join(testDir, 'backups');
      expect(fs.existsSync(backupDir)).toBe(true);

      // Check that backup file was created
      const backupFiles = fs.readdirSync(backupDir);
      expect(backupFiles.length).toBeGreaterThan(0);
    });
  });
});
