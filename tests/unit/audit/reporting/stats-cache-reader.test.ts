/**
 * WS-AUDIT-1: Cost Estimation & Enhanced Reporting - Stats Cache Reader Tests
 *
 * BDD Scenarios:
 * - AC-2: Stats-cache reader that parses ~/.claude/stats-cache.json
 * - Extracts model usage data from cached statistics
 * - Handles missing/malformed cache files gracefully
 *
 * Coverage Target: 99%+ of stats-cache-reader.ts module
 * Test Pattern: MISUSE → BOUNDARY → GOLDEN PATH
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Model usage statistics from stats-cache.json
 */
export interface ModelUsageStats {
  model: string;
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_creation_tokens: number;
  total_cache_read_tokens: number;
}

/**
 * Stats cache file structure (version 2 format)
 */
export interface StatsCacheData {
  version: number;
  lastComputedDate: string;
  dailyActivity: Array<{
    date: string;
    messageCount: number;
    sessionCount: number;
    toolCallCount: number;
  }>;
  modelUsage?: ModelUsageStats[];
}

/**
 * Placeholder imports (to be implemented in src/audit/reporting/stats-cache-reader.ts)
 */
import {
  readStatsCache,
  getModelUsageStats,
  validateStatsCacheData,
  getStatsCachePath,
} from '@/audit/reporting/stats-cache-reader';

// ============================================================================
// MISUSE CASES - Invalid inputs, malformed data, error conditions
// ============================================================================

describe('audit/reporting/stats-cache-reader - MISUSE CASES', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stats-cache-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('readStatsCache() with malformed JSON', () => {
    it('When stats-cache contains invalid JSON, Then throws error', () => {
      const cachePath = path.join(tempDir, 'stats-cache.json');
      fs.writeFileSync(cachePath, '{ invalid json }', 'utf8');

      expect(() => readStatsCache(cachePath))
        .toThrow(/invalid.*json/i);
    });

    it('When stats-cache contains incomplete JSON, Then throws error', () => {
      const cachePath = path.join(tempDir, 'stats-cache.json');
      fs.writeFileSync(cachePath, '{"version": 2, "lastComputedDate":', 'utf8');

      expect(() => readStatsCache(cachePath))
        .toThrow(/invalid.*json/i);
    });

    it('When stats-cache contains non-JSON text, Then throws error', () => {
      const cachePath = path.join(tempDir, 'stats-cache.json');
      fs.writeFileSync(cachePath, 'This is not JSON', 'utf8');

      expect(() => readStatsCache(cachePath))
        .toThrow(/invalid.*json/i);
    });

    it('When stats-cache contains empty file, Then throws error', () => {
      const cachePath = path.join(tempDir, 'stats-cache.json');
      fs.writeFileSync(cachePath, '', 'utf8');

      expect(() => readStatsCache(cachePath))
        .toThrow(/empty.*file/i);
    });

    it('When stats-cache contains only whitespace, Then throws error', () => {
      const cachePath = path.join(tempDir, 'stats-cache.json');
      fs.writeFileSync(cachePath, '   \n\n   ', 'utf8');

      expect(() => readStatsCache(cachePath))
        .toThrow(/empty.*file/i);
    });
  });

  describe('readStatsCache() with wrong file types', () => {
    it('When path points to directory, Then throws error', () => {
      const dirPath = path.join(tempDir, 'not-a-file');
      fs.mkdirSync(dirPath);

      // Security validation happens first, so extension check occurs before directory check
      expect(() => readStatsCache(dirPath))
        .toThrow(/only.*json.*allowed/i);
    });

    it('When path points to binary file, Then throws error', () => {
      const binaryPath = path.join(tempDir, 'binary.bin');
      fs.writeFileSync(binaryPath, Buffer.from([0xFF, 0xFE, 0xFD]));

      expect(() => readStatsCache(binaryPath))
        .toThrow(/invalid.*json/i);
    });

    it('When path is empty string, Then throws error', () => {
      expect(() => readStatsCache(''))
        .toThrow(/invalid.*path/i);
    });

    it('When path is null, Then throws error', () => {
      expect(() => readStatsCache(null as any))
        .toThrow(/invalid.*path/i);
    });

    it('When path is undefined, Then throws error', () => {
      expect(() => readStatsCache(undefined as any))
        .toThrow(/invalid.*path/i);
    });
  });

  describe('validateStatsCacheData() with missing required fields', () => {
    it('When version field missing, Then returns false', () => {
      const invalidData = {
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
      };

      expect(validateStatsCacheData(invalidData as any)).toBe(false);
    });

    it('When lastComputedDate field missing, Then returns false', () => {
      const invalidData = {
        version: 2,
        dailyActivity: [],
      };

      expect(validateStatsCacheData(invalidData as any)).toBe(false);
    });

    it('When dailyActivity field missing, Then returns false', () => {
      const invalidData = {
        version: 2,
        lastComputedDate: '2026-02-07',
      };

      expect(validateStatsCacheData(invalidData as any)).toBe(false);
    });

    it('When data is null, Then returns false', () => {
      expect(validateStatsCacheData(null as any)).toBe(false);
    });

    it('When data is undefined, Then returns false', () => {
      expect(validateStatsCacheData(undefined as any)).toBe(false);
    });

    it('When data is not an object, Then returns false', () => {
      expect(validateStatsCacheData('invalid' as any)).toBe(false);
      expect(validateStatsCacheData(123 as any)).toBe(false);
      expect(validateStatsCacheData([] as any)).toBe(false);
    });
  });

  describe('validateStatsCacheData() with wrong field types', () => {
    it('When version is not a number, Then returns false', () => {
      const invalidData = {
        version: '2',
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
      };

      expect(validateStatsCacheData(invalidData as any)).toBe(false);
    });

    it('When lastComputedDate is not a string, Then returns false', () => {
      const invalidData = {
        version: 2,
        lastComputedDate: 20260207,
        dailyActivity: [],
      };

      expect(validateStatsCacheData(invalidData as any)).toBe(false);
    });

    it('When dailyActivity is not an array, Then returns false', () => {
      const invalidData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: {},
      };

      expect(validateStatsCacheData(invalidData as any)).toBe(false);
    });

    it('When modelUsage is not an array, Then returns false', () => {
      const invalidData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
        modelUsage: 'invalid',
      };

      expect(validateStatsCacheData(invalidData as any)).toBe(false);
    });
  });

  describe('getModelUsageStats() with malformed model usage data', () => {
    it('When modelUsage array has entries missing model field, Then filters out invalid entries', () => {
      const cacheData: StatsCacheData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
        modelUsage: [
          {
            // missing model field
            total_requests: 10,
            total_input_tokens: 1000,
            total_output_tokens: 500,
            total_cache_creation_tokens: 0,
            total_cache_read_tokens: 0,
          } as any,
        ],
      };

      const cachePath = path.join(tempDir, 'cache.json');
      fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');

      const result = getModelUsageStats(cachePath);

      expect(result).toEqual([]);
    });

    it('When modelUsage has negative token counts, Then throws error', () => {
      const cacheData: StatsCacheData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
        modelUsage: [
          {
            model: 'claude-opus-4-6',
            total_requests: 10,
            total_input_tokens: -1000,
            total_output_tokens: 500,
            total_cache_creation_tokens: 0,
            total_cache_read_tokens: 0,
          },
        ],
      };

      const cachePath = path.join(tempDir, 'cache.json');
      fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');

      expect(() => getModelUsageStats(cachePath))
        .toThrow(/negative.*token/i);
    });

    it('When modelUsage has NaN values, Then throws error', () => {
      const cacheData: StatsCacheData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
        modelUsage: [
          {
            model: 'claude-opus-4-6',
            total_requests: NaN,
            total_input_tokens: 1000,
            total_output_tokens: 500,
            total_cache_creation_tokens: 0,
            total_cache_read_tokens: 0,
          },
        ],
      };

      const cachePath = path.join(tempDir, 'cache.json');
      fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');

      expect(() => getModelUsageStats(cachePath))
        .toThrow(/invalid.*value/i);
    });
  });

  describe('getStatsCachePath() with invalid home directory', () => {
    it('When HOME env var is unset, Then uses os.homedir() fallback', () => {
      const originalHome = process.env.HOME;
      delete process.env.HOME;

      try {
        const result = getStatsCachePath();
        expect(result).toContain('.claude');
        expect(result).toContain('stats-cache.json');
      } finally {
        if (originalHome) {
          process.env.HOME = originalHome;
        }
      }
    });

    it('When HOME env var is empty string, Then uses os.homedir() fallback', () => {
      const originalHome = process.env.HOME;
      process.env.HOME = '';

      try {
        const result = getStatsCachePath();
        expect(result).toContain('.claude');
      } finally {
        if (originalHome) {
          process.env.HOME = originalHome;
        }
      }
    });
  });

  describe('readStatsCache() security - path traversal protection', () => {
    it('When path contains .. traversal, Then throws error', () => {
      const maliciousPath = '/tmp/../../../etc/passwd.json';

      expect(() => readStatsCache(maliciousPath))
        .toThrow(/path traversal/i);
    });

    it('When path contains encoded traversal, Then throws error', () => {
      const maliciousPath = '/tmp/..%2F..%2Fetc%2Fpasswd.json';

      expect(() => readStatsCache(maliciousPath))
        .toThrow(/path traversal/i);
    });

    it('When path does not have .json extension, Then throws error', () => {
      const maliciousPath = '/etc/passwd';

      expect(() => readStatsCache(maliciousPath))
        .toThrow(/only.*json.*allowed/i);
    });

    it('When path has .txt extension, Then throws error', () => {
      const maliciousPath = '/tmp/stats-cache.txt';

      expect(() => readStatsCache(maliciousPath))
        .toThrow(/only.*json.*allowed/i);
    });

    it('When path has no extension, Then throws error', () => {
      const maliciousPath = '/tmp/stats-cache';

      expect(() => readStatsCache(maliciousPath))
        .toThrow(/only.*json.*allowed/i);
    });

    it('When path contains relative .. within safe directory, Then throws error', () => {
      const maliciousPath = '/home/user/.claude/../../../etc/passwd.json';

      expect(() => readStatsCache(maliciousPath))
        .toThrow(/path traversal/i);
    });
  });

  describe('getStatsCachePath() security - path traversal protection', () => {
    it('When custom path contains .. traversal, Then throws error', () => {
      const maliciousPath = '../../../etc/passwd';

      expect(() => getStatsCachePath(maliciousPath))
        .toThrow(/path traversal/i);
    });

    it('When custom path does not have .json extension, Then throws error', () => {
      const maliciousPath = '/tmp/custom-cache.txt';

      expect(() => getStatsCachePath(maliciousPath))
        .toThrow(/only.*json.*allowed/i);
    });

    it('When custom path has no extension, Then throws error', () => {
      const maliciousPath = '/tmp/custom-cache';

      expect(() => getStatsCachePath(maliciousPath))
        .toThrow(/only.*json.*allowed/i);
    });

    it('When custom path is valid .json, Then accepts', () => {
      const validPath = '/tmp/custom-stats-cache.json';
      const result = getStatsCachePath(validPath);

      expect(result).toBe(validPath);
    });
  });

  describe('getModelUsageStats() security - path traversal protection', () => {
    it('When cache path contains path traversal, Then throws error', () => {
      const maliciousPath = '../../../etc/passwd';

      expect(() => getModelUsageStats(maliciousPath))
        .toThrow(/path traversal/i);
    });

    it('When cache path has wrong extension, Then throws error', () => {
      const maliciousPath = '/etc/passwd';

      expect(() => getModelUsageStats(maliciousPath))
        .toThrow(/only.*json.*allowed/i);
    });
  });
});

// ============================================================================
// BOUNDARY TESTS - Edge cases, limits, unusual but valid inputs
// ============================================================================

describe('audit/reporting/stats-cache-reader - BOUNDARY TESTS', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stats-cache-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('readStatsCache() with edge case versions', () => {
    it('When version is 1 (legacy format), Then reads successfully', () => {
      const cacheData = {
        version: 1,
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
      };

      const cachePath = path.join(tempDir, 'cache.json');
      fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');

      const result = readStatsCache(cachePath);

      expect(result.version).toBe(1);
    });

    it('When version is very large number, Then reads successfully', () => {
      const cacheData = {
        version: 999,
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
      };

      const cachePath = path.join(tempDir, 'cache.json');
      fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');

      const result = readStatsCache(cachePath);

      expect(result.version).toBe(999);
    });

    it('When version is zero, Then reads successfully', () => {
      const cacheData = {
        version: 0,
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
      };

      const cachePath = path.join(tempDir, 'cache.json');
      fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');

      const result = readStatsCache(cachePath);

      expect(result.version).toBe(0);
    });
  });

  describe('readStatsCache() with empty arrays', () => {
    it('When dailyActivity is empty array, Then reads successfully', () => {
      const cacheData: StatsCacheData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
      };

      const cachePath = path.join(tempDir, 'cache.json');
      fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');

      const result = readStatsCache(cachePath);

      expect(result.dailyActivity).toEqual([]);
    });

    it('When modelUsage is empty array, Then reads successfully', () => {
      const cacheData: StatsCacheData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
        modelUsage: [],
      };

      const cachePath = path.join(tempDir, 'cache.json');
      fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');

      const result = readStatsCache(cachePath);

      expect(result.modelUsage).toEqual([]);
    });
  });

  describe('readStatsCache() with very large files', () => {
    it('When dailyActivity has many entries, Then reads successfully', () => {
      const dailyActivity = [];
      for (let i = 0; i < 1000; i++) {
        dailyActivity.push({
          date: `2026-02-${String(i % 28 + 1).padStart(2, '0')}`,
          messageCount: i,
          sessionCount: i % 10,
          toolCallCount: i * 2,
        });
      }

      const cacheData: StatsCacheData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity,
      };

      const cachePath = path.join(tempDir, 'cache.json');
      fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');

      const result = readStatsCache(cachePath);

      expect(result.dailyActivity).toHaveLength(1000);
    });

    it('When modelUsage has many models, Then reads successfully', () => {
      const modelUsage: ModelUsageStats[] = [];
      for (let i = 0; i < 100; i++) {
        modelUsage.push({
          model: `model-${i}`,
          total_requests: i * 10,
          total_input_tokens: i * 1000,
          total_output_tokens: i * 500,
          total_cache_creation_tokens: i * 100,
          total_cache_read_tokens: i * 200,
        });
      }

      const cacheData: StatsCacheData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
        modelUsage,
      };

      const cachePath = path.join(tempDir, 'cache.json');
      fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');

      const result = readStatsCache(cachePath);

      expect(result.modelUsage).toHaveLength(100);
    });
  });

  describe('getModelUsageStats() with zero values', () => {
    it('When all token counts are zero, Then returns stats with zeros', () => {
      const cacheData: StatsCacheData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
        modelUsage: [
          {
            model: 'claude-opus-4-6',
            total_requests: 0,
            total_input_tokens: 0,
            total_output_tokens: 0,
            total_cache_creation_tokens: 0,
            total_cache_read_tokens: 0,
          },
        ],
      };

      const cachePath = path.join(tempDir, 'cache.json');
      fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');

      const result = getModelUsageStats(cachePath);

      expect(result).toHaveLength(1);
      expect(result[0].total_input_tokens).toBe(0);
    });

    it('When some models have zero usage, Then includes them in results', () => {
      const cacheData: StatsCacheData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
        modelUsage: [
          {
            model: 'claude-opus-4-6',
            total_requests: 10,
            total_input_tokens: 1000,
            total_output_tokens: 500,
            total_cache_creation_tokens: 0,
            total_cache_read_tokens: 0,
          },
          {
            model: 'claude-sonnet-4-5',
            total_requests: 0,
            total_input_tokens: 0,
            total_output_tokens: 0,
            total_cache_creation_tokens: 0,
            total_cache_read_tokens: 0,
          },
        ],
      };

      const cachePath = path.join(tempDir, 'cache.json');
      fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');

      const result = getModelUsageStats(cachePath);

      expect(result).toHaveLength(2);
      expect(result.find(m => m.model === 'claude-sonnet-4-5')).toBeDefined();
    });
  });

  describe('getModelUsageStats() with missing modelUsage field', () => {
    it('When modelUsage field not present, Then returns empty array', () => {
      const cacheData: StatsCacheData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
        // modelUsage omitted
      };

      const cachePath = path.join(tempDir, 'cache.json');
      fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');

      const result = getModelUsageStats(cachePath);

      expect(result).toEqual([]);
    });
  });

  describe('getStatsCachePath() with custom path', () => {
    it('When custom path provided, Then returns custom path', () => {
      const customPath = '/custom/path/stats-cache.json';
      const result = getStatsCachePath(customPath);

      expect(result).toBe(customPath);
    });

    it('When custom path is relative, Then resolves to absolute', () => {
      const relativePath = '.claude/stats-cache.json';
      const result = getStatsCachePath(relativePath);

      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toContain('.claude');
    });
  });

  describe('validateStatsCacheData() with optional fields', () => {
    it('When modelUsage field omitted, Then returns true', () => {
      const minimalData: StatsCacheData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
      };

      expect(validateStatsCacheData(minimalData)).toBe(true);
    });

    it('When extra unknown fields present, Then returns true', () => {
      const dataWithExtra = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
        unknownField: 'extra data',
      };

      expect(validateStatsCacheData(dataWithExtra as any)).toBe(true);
    });
  });
});

// ============================================================================
// GOLDEN PATH - Normal, expected operations
// ============================================================================

describe('audit/reporting/stats-cache-reader - GOLDEN PATH', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stats-cache-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getStatsCachePath() default behavior (AC-2)', () => {
    it('When no custom path provided, Then returns ~/.claude/stats-cache.json', () => {
      const result = getStatsCachePath();

      expect(result).toContain('.claude');
      expect(result).toContain('stats-cache.json');
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('When called multiple times, Then returns consistent path', () => {
      const result1 = getStatsCachePath();
      const result2 = getStatsCachePath();

      expect(result1).toBe(result2);
    });
  });

  describe('readStatsCache() with valid version 2 file (AC-2)', () => {
    it('When reading valid stats-cache.json, Then parses all fields', () => {
      const cacheData: StatsCacheData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [
          {
            date: '2026-02-07',
            messageCount: 100,
            sessionCount: 5,
            toolCallCount: 50,
          },
        ],
        modelUsage: [
          {
            model: 'claude-opus-4-6',
            total_requests: 10,
            total_input_tokens: 10000,
            total_output_tokens: 5000,
            total_cache_creation_tokens: 1000,
            total_cache_read_tokens: 2000,
          },
        ],
      };

      const cachePath = path.join(tempDir, 'stats-cache.json');
      fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');

      const result = readStatsCache(cachePath);

      expect(result.version).toBe(2);
      expect(result.lastComputedDate).toBe('2026-02-07');
      expect(result.dailyActivity).toHaveLength(1);
      expect(result.modelUsage).toHaveLength(1);
    });

    it('When reading stats-cache with multiple models, Then parses all models', () => {
      const cacheData: StatsCacheData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
        modelUsage: [
          {
            model: 'claude-opus-4-6',
            total_requests: 10,
            total_input_tokens: 10000,
            total_output_tokens: 5000,
            total_cache_creation_tokens: 1000,
            total_cache_read_tokens: 2000,
          },
          {
            model: 'claude-sonnet-4-5-20250929',
            total_requests: 20,
            total_input_tokens: 20000,
            total_output_tokens: 10000,
            total_cache_creation_tokens: 2000,
            total_cache_read_tokens: 3000,
          },
        ],
      };

      const cachePath = path.join(tempDir, 'stats-cache.json');
      fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');

      const result = readStatsCache(cachePath);

      expect(result.modelUsage).toHaveLength(2);
      expect(result.modelUsage![0].model).toBe('claude-opus-4-6');
      expect(result.modelUsage![1].model).toBe('claude-sonnet-4-5-20250929');
    });

    it('When reading stats-cache with daily activity, Then parses activity data', () => {
      const cacheData: StatsCacheData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [
          {
            date: '2026-02-05',
            messageCount: 50,
            sessionCount: 2,
            toolCallCount: 20,
          },
          {
            date: '2026-02-06',
            messageCount: 75,
            sessionCount: 3,
            toolCallCount: 30,
          },
        ],
      };

      const cachePath = path.join(tempDir, 'stats-cache.json');
      fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');

      const result = readStatsCache(cachePath);

      expect(result.dailyActivity).toHaveLength(2);
      expect(result.dailyActivity[0].messageCount).toBe(50);
      expect(result.dailyActivity[1].messageCount).toBe(75);
    });
  });

  describe('getModelUsageStats() extracts model data (AC-2)', () => {
    it('When extracting model usage, Then returns array of model stats', () => {
      const cacheData: StatsCacheData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
        modelUsage: [
          {
            model: 'claude-opus-4-6',
            total_requests: 15,
            total_input_tokens: 15000,
            total_output_tokens: 7500,
            total_cache_creation_tokens: 1500,
            total_cache_read_tokens: 3000,
          },
        ],
      };

      const cachePath = path.join(tempDir, 'cache.json');
      fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');

      const result = getModelUsageStats(cachePath);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        model: 'claude-opus-4-6',
        total_requests: 15,
        total_input_tokens: 15000,
        total_output_tokens: 7500,
        total_cache_creation_tokens: 1500,
        total_cache_read_tokens: 3000,
      });
    });

    it('When extracting multiple models, Then preserves all model data', () => {
      const cacheData: StatsCacheData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
        modelUsage: [
          {
            model: 'claude-opus-4-6',
            total_requests: 10,
            total_input_tokens: 10000,
            total_output_tokens: 5000,
            total_cache_creation_tokens: 1000,
            total_cache_read_tokens: 2000,
          },
          {
            model: 'claude-sonnet-4-5-20250929',
            total_requests: 25,
            total_input_tokens: 25000,
            total_output_tokens: 12500,
            total_cache_creation_tokens: 2500,
            total_cache_read_tokens: 5000,
          },
          {
            model: 'claude-opus-4-5-20251101',
            total_requests: 5,
            total_input_tokens: 5000,
            total_output_tokens: 2500,
            total_cache_creation_tokens: 500,
            total_cache_read_tokens: 1000,
          },
        ],
      };

      const cachePath = path.join(tempDir, 'cache.json');
      fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');

      const result = getModelUsageStats(cachePath);

      expect(result).toHaveLength(3);
      expect(result[0].model).toBe('claude-opus-4-6');
      expect(result[1].model).toBe('claude-sonnet-4-5-20250929');
      expect(result[2].model).toBe('claude-opus-4-5-20251101');
    });

    it('When cache has no modelUsage, Then returns empty array', () => {
      const cacheData: StatsCacheData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
      };

      const cachePath = path.join(tempDir, 'cache.json');
      fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');

      const result = getModelUsageStats(cachePath);

      expect(result).toEqual([]);
    });
  });

  describe('validateStatsCacheData() validates structure (AC-2)', () => {
    it('When validating valid version 2 data, Then returns true', () => {
      const validData: StatsCacheData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [
          {
            date: '2026-02-07',
            messageCount: 100,
            sessionCount: 5,
            toolCallCount: 50,
          },
        ],
      };

      expect(validateStatsCacheData(validData)).toBe(true);
    });

    it('When validating data with modelUsage, Then returns true', () => {
      const validData: StatsCacheData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
        modelUsage: [
          {
            model: 'claude-opus-4-6',
            total_requests: 10,
            total_input_tokens: 10000,
            total_output_tokens: 5000,
            total_cache_creation_tokens: 1000,
            total_cache_read_tokens: 2000,
          },
        ],
      };

      expect(validateStatsCacheData(validData)).toBe(true);
    });

    it('When validating minimal valid data, Then returns true', () => {
      const minimalData: StatsCacheData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [],
      };

      expect(validateStatsCacheData(minimalData)).toBe(true);
    });
  });

  describe('Integration: read and extract from real stats-cache format', () => {
    it('When processing real stats-cache.json format, Then extracts all data correctly', () => {
      const realCacheData: StatsCacheData = {
        version: 2,
        lastComputedDate: '2026-02-07',
        dailyActivity: [
          {
            date: '2025-12-31',
            messageCount: 796,
            sessionCount: 1,
            toolCallCount: 282,
          },
          {
            date: '2026-01-04',
            messageCount: 130,
            sessionCount: 1,
            toolCallCount: 51,
          },
        ],
        modelUsage: [
          {
            model: 'claude-opus-4-6',
            total_requests: 45,
            total_input_tokens: 450000,
            total_output_tokens: 225000,
            total_cache_creation_tokens: 45000,
            total_cache_read_tokens: 90000,
          },
          {
            model: 'claude-sonnet-4-5-20250929',
            total_requests: 120,
            total_input_tokens: 1200000,
            total_output_tokens: 600000,
            total_cache_creation_tokens: 120000,
            total_cache_read_tokens: 240000,
          },
        ],
      };

      const cachePath = path.join(tempDir, 'stats-cache.json');
      fs.writeFileSync(cachePath, JSON.stringify(realCacheData, null, 2), 'utf8');

      const cacheData = readStatsCache(cachePath);
      const modelStats = getModelUsageStats(cachePath);

      expect(cacheData.version).toBe(2);
      expect(cacheData.dailyActivity).toHaveLength(2);
      expect(modelStats).toHaveLength(2);

      const opusStats = modelStats.find(m => m.model === 'claude-opus-4-6');
      expect(opusStats).toBeDefined();
      expect(opusStats!.total_input_tokens).toBe(450000);

      const sonnetStats = modelStats.find(m => m.model === 'claude-sonnet-4-5-20250929');
      expect(sonnetStats).toBeDefined();
      expect(sonnetStats!.total_requests).toBe(120);
    });
  });
});
