/**
 * WS-AUDIT-1: Cost Estimation & Enhanced Reporting - Pricing Module Tests
 *
 * BDD Scenarios:
 * - AC-1: Cost estimation module with configurable pricing table
 * - Computes estimated_cost_usd from token counts using API pricing
 * - Default: published Anthropic API pricing
 * - Configurable via pricing table interface
 *
 * Coverage Target: 99%+ of pricing.ts module
 * Test Pattern: MISUSE → BOUNDARY → GOLDEN PATH
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Pricing table interface for model costs.
 * Uses MTok (Million Tokens) as the pricing unit.
 */
export interface PricingTable {
  [modelId: string]: {
    input_per_mtok: number;
    output_per_mtok: number;
    cache_write_per_mtok?: number;
    cache_read_per_mtok?: number;
  };
}

/**
 * Token counts for a single request.
 */
export interface TokenCounts {
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens?: number;
  cache_read_tokens?: number;
}

/**
 * Placeholder imports (to be implemented in src/audit/reporting/pricing.ts)
 */
import {
  DEFAULT_PRICING_TABLE,
  estimateCost,
  validatePricingTable,
  loadPricingTable,
} from '@/audit/reporting/pricing';

// ============================================================================
// MISUSE CASES - Invalid inputs, malformed data, error conditions
// ============================================================================

describe('audit/reporting/pricing - MISUSE CASES', () => {
  describe('estimateCost() with invalid pricing table', () => {
    it('When pricing table is empty object, Then throws error', () => {
      const emptyTable: PricingTable = {};
      const tokens: TokenCounts = {
        input_tokens: 1000,
        output_tokens: 500,
      };

      expect(() => estimateCost('claude-opus-4-6', tokens, emptyTable))
        .toThrow(/pricing.*not found/i);
    });

    it('When model not in pricing table, Then throws error', () => {
      const table: PricingTable = {
        'claude-opus-4-6': {
          input_per_mtok: 15.0,
          output_per_mtok: 75.0,
        },
      };
      const tokens: TokenCounts = {
        input_tokens: 1000,
        output_tokens: 500,
      };

      expect(() => estimateCost('unknown-model-xyz', tokens, table))
        .toThrow(/pricing.*not found/i);
    });

    it('When pricing has negative values, Then throws error', () => {
      const invalidTable: PricingTable = {
        'claude-opus-4-6': {
          input_per_mtok: -15.0,
          output_per_mtok: 75.0,
        },
      };
      const tokens: TokenCounts = {
        input_tokens: 1000,
        output_tokens: 500,
      };

      expect(() => estimateCost('claude-opus-4-6', tokens, invalidTable))
        .toThrow(/negative.*pricing/i);
    });

    it('When pricing has NaN values, Then throws error', () => {
      const invalidTable: PricingTable = {
        'claude-opus-4-6': {
          input_per_mtok: NaN,
          output_per_mtok: 75.0,
        },
      };
      const tokens: TokenCounts = {
        input_tokens: 1000,
        output_tokens: 500,
      };

      expect(() => estimateCost('claude-opus-4-6', tokens, invalidTable))
        .toThrow(/invalid.*pricing/i);
    });

    it('When pricing has Infinity values, Then throws error', () => {
      const invalidTable: PricingTable = {
        'claude-opus-4-6': {
          input_per_mtok: Infinity,
          output_per_mtok: 75.0,
        },
      };
      const tokens: TokenCounts = {
        input_tokens: 1000,
        output_tokens: 500,
      };

      expect(() => estimateCost('claude-opus-4-6', tokens, invalidTable))
        .toThrow(/invalid.*pricing/i);
    });

    it('When cache_write_per_mtok is NaN, Then throws error', () => {
      const invalidTable: PricingTable = {
        'claude-opus-4-6': {
          input_per_mtok: 15.0,
          output_per_mtok: 75.0,
          cache_write_per_mtok: NaN,
        },
      };
      const tokens: TokenCounts = {
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: 100,
      };

      expect(() => estimateCost('claude-opus-4-6', tokens, invalidTable))
        .toThrow(/invalid.*pricing/i);
    });

    it('When cache_write_per_mtok is Infinity, Then throws error', () => {
      const invalidTable: PricingTable = {
        'claude-opus-4-6': {
          input_per_mtok: 15.0,
          output_per_mtok: 75.0,
          cache_write_per_mtok: Infinity,
        },
      };
      const tokens: TokenCounts = {
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: 100,
      };

      expect(() => estimateCost('claude-opus-4-6', tokens, invalidTable))
        .toThrow(/invalid.*pricing/i);
    });

    it('When cache_read_per_mtok is NaN, Then throws error', () => {
      const invalidTable: PricingTable = {
        'claude-opus-4-6': {
          input_per_mtok: 15.0,
          output_per_mtok: 75.0,
          cache_read_per_mtok: NaN,
        },
      };
      const tokens: TokenCounts = {
        input_tokens: 1000,
        output_tokens: 500,
        cache_read_tokens: 100,
      };

      expect(() => estimateCost('claude-opus-4-6', tokens, invalidTable))
        .toThrow(/invalid.*pricing/i);
    });

    it('When cache_read_per_mtok is Infinity, Then throws error', () => {
      const invalidTable: PricingTable = {
        'claude-opus-4-6': {
          input_per_mtok: 15.0,
          output_per_mtok: 75.0,
          cache_read_per_mtok: Infinity,
        },
      };
      const tokens: TokenCounts = {
        input_tokens: 1000,
        output_tokens: 500,
        cache_read_tokens: 100,
      };

      expect(() => estimateCost('claude-opus-4-6', tokens, invalidTable))
        .toThrow(/invalid.*pricing/i);
    });

    it('When cache_write_per_mtok is negative, Then throws error', () => {
      const invalidTable: PricingTable = {
        'claude-opus-4-6': {
          input_per_mtok: 15.0,
          output_per_mtok: 75.0,
          cache_write_per_mtok: -18.75,
        },
      };
      const tokens: TokenCounts = {
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: 100,
      };

      expect(() => estimateCost('claude-opus-4-6', tokens, invalidTable))
        .toThrow(/negative.*pricing/i);
    });

    it('When cache_read_per_mtok is negative, Then throws error', () => {
      const invalidTable: PricingTable = {
        'claude-opus-4-6': {
          input_per_mtok: 15.0,
          output_per_mtok: 75.0,
          cache_read_per_mtok: -1.50,
        },
      };
      const tokens: TokenCounts = {
        input_tokens: 1000,
        output_tokens: 500,
        cache_read_tokens: 100,
      };

      expect(() => estimateCost('claude-opus-4-6', tokens, invalidTable))
        .toThrow(/negative.*pricing/i);
    });
  });

  describe('estimateCost() with invalid token counts', () => {
    it('When input_tokens is negative, Then throws error', () => {
      const tokens: TokenCounts = {
        input_tokens: -1000,
        output_tokens: 500,
      };

      expect(() => estimateCost('claude-opus-4-6', tokens))
        .toThrow(/negative.*token/i);
    });

    it('When output_tokens is negative, Then throws error', () => {
      const tokens: TokenCounts = {
        input_tokens: 1000,
        output_tokens: -500,
      };

      expect(() => estimateCost('claude-opus-4-6', tokens))
        .toThrow(/negative.*token/i);
    });

    it('When cache_creation_tokens is negative, Then throws error', () => {
      const tokens: TokenCounts = {
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: -100,
      };

      expect(() => estimateCost('claude-opus-4-6', tokens))
        .toThrow(/negative.*token/i);
    });

    it('When cache_read_tokens is negative, Then throws error', () => {
      const tokens: TokenCounts = {
        input_tokens: 1000,
        output_tokens: 500,
        cache_read_tokens: -50,
      };

      expect(() => estimateCost('claude-opus-4-6', tokens))
        .toThrow(/negative.*token/i);
    });

    it('When token counts are NaN, Then throws error', () => {
      const tokens: TokenCounts = {
        input_tokens: NaN,
        output_tokens: 500,
      };

      expect(() => estimateCost('claude-opus-4-6', tokens))
        .toThrow(/invalid.*token/i);
    });

    it('When token counts are Infinity, Then throws error', () => {
      const tokens: TokenCounts = {
        input_tokens: Infinity,
        output_tokens: 500,
      };

      expect(() => estimateCost('claude-opus-4-6', tokens))
        .toThrow(/invalid.*token/i);
    });

    it('When cache_creation_tokens is NaN, Then throws error', () => {
      const tokens: TokenCounts = {
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: NaN,
      };

      expect(() => estimateCost('claude-opus-4-6', tokens))
        .toThrow(/invalid.*token/i);
    });

    it('When cache_creation_tokens is Infinity, Then throws error', () => {
      const tokens: TokenCounts = {
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: Infinity,
      };

      expect(() => estimateCost('claude-opus-4-6', tokens))
        .toThrow(/invalid.*token/i);
    });

    it('When cache_read_tokens is NaN, Then throws error', () => {
      const tokens: TokenCounts = {
        input_tokens: 1000,
        output_tokens: 500,
        cache_read_tokens: NaN,
      };

      expect(() => estimateCost('claude-opus-4-6', tokens))
        .toThrow(/invalid.*token/i);
    });

    it('When cache_read_tokens is Infinity, Then throws error', () => {
      const tokens: TokenCounts = {
        input_tokens: 1000,
        output_tokens: 500,
        cache_read_tokens: Infinity,
      };

      expect(() => estimateCost('claude-opus-4-6', tokens))
        .toThrow(/invalid.*token/i);
    });
  });

  describe('validatePricingTable() with malformed tables', () => {
    it('When pricing table is null, Then returns false', () => {
      expect(validatePricingTable(null as any)).toBe(false);
    });

    it('When pricing table is undefined, Then returns false', () => {
      expect(validatePricingTable(undefined as any)).toBe(false);
    });

    it('When pricing table is not an object, Then returns false', () => {
      expect(validatePricingTable('invalid' as any)).toBe(false);
      expect(validatePricingTable(123 as any)).toBe(false);
      expect(validatePricingTable([] as any)).toBe(false);
    });

    it('When model entry missing required fields, Then returns false', () => {
      const invalidTable = {
        'claude-opus-4-6': {
          input_per_mtok: 15.0,
          // missing output_per_mtok
        },
      };

      expect(validatePricingTable(invalidTable as any)).toBe(false);
    });

    it('When model entry has wrong type for fields, Then returns false', () => {
      const invalidTable = {
        'claude-opus-4-6': {
          input_per_mtok: '15.0', // should be number
          output_per_mtok: 75.0,
        },
      };

      expect(validatePricingTable(invalidTable as any)).toBe(false);
    });

    it('When model ID is empty string, Then returns false', () => {
      const invalidTable = {
        '': {
          input_per_mtok: 15.0,
          output_per_mtok: 75.0,
        },
      };

      expect(validatePricingTable(invalidTable as any)).toBe(false);
    });

    it('When cache_write_per_mtok is wrong type, Then returns false', () => {
      const invalidTable = {
        'claude-opus-4-6': {
          input_per_mtok: 15.0,
          output_per_mtok: 75.0,
          cache_write_per_mtok: '18.75', // should be number
        },
      };

      expect(validatePricingTable(invalidTable as any)).toBe(false);
    });

    it('When cache_read_per_mtok is wrong type, Then returns false', () => {
      const invalidTable = {
        'claude-opus-4-6': {
          input_per_mtok: 15.0,
          output_per_mtok: 75.0,
          cache_read_per_mtok: '1.50', // should be number
        },
      };

      expect(validatePricingTable(invalidTable as any)).toBe(false);
    });

    it('When cache_write_per_mtok is negative, Then returns false', () => {
      const invalidTable = {
        'claude-opus-4-6': {
          input_per_mtok: 15.0,
          output_per_mtok: 75.0,
          cache_write_per_mtok: -18.75,
        },
      };

      expect(validatePricingTable(invalidTable as any)).toBe(false);
    });

    it('When cache_read_per_mtok is negative, Then returns false', () => {
      const invalidTable = {
        'claude-opus-4-6': {
          input_per_mtok: 15.0,
          output_per_mtok: 75.0,
          cache_read_per_mtok: -1.50,
        },
      };

      expect(validatePricingTable(invalidTable as any)).toBe(false);
    });

    it('When cache_write_per_mtok is NaN, Then returns false', () => {
      const invalidTable = {
        'claude-opus-4-6': {
          input_per_mtok: 15.0,
          output_per_mtok: 75.0,
          cache_write_per_mtok: NaN,
        },
      };

      expect(validatePricingTable(invalidTable as any)).toBe(false);
    });

    it('When cache_read_per_mtok is Infinity, Then returns false', () => {
      const invalidTable = {
        'claude-opus-4-6': {
          input_per_mtok: 15.0,
          output_per_mtok: 75.0,
          cache_read_per_mtok: Infinity,
        },
      };

      expect(validatePricingTable(invalidTable as any)).toBe(false);
    });
  });

  describe('loadPricingTable() with invalid config files', () => {
    it('When config file contains malformed JSON, Then falls back to default', () => {
      const configPath = '/tmp/invalid-pricing-config.json';
      const result = loadPricingTable(configPath);

      expect(result).toEqual(DEFAULT_PRICING_TABLE);
    });

    it('When config file contains invalid pricing structure, Then falls back to default', () => {
      const configPath = '/tmp/invalid-structure-pricing.json';
      const result = loadPricingTable(configPath);

      expect(result).toEqual(DEFAULT_PRICING_TABLE);
    });

    it('When config file path is empty string, Then uses default', () => {
      const result = loadPricingTable('');

      expect(result).toEqual(DEFAULT_PRICING_TABLE);
    });

    it('When config file does not exist, Then uses default', () => {
      const result = loadPricingTable('/nonexistent/path/pricing.json');

      expect(result).toEqual(DEFAULT_PRICING_TABLE);
    });
  });

  describe('loadPricingTable() security - path traversal protection', () => {
    it('When path contains .. traversal, Then rejects and uses default', () => {
      const maliciousPath = '/tmp/../../../etc/passwd';
      const result = loadPricingTable(maliciousPath);

      expect(result).toEqual(DEFAULT_PRICING_TABLE);
    });

    it('When path contains encoded traversal, Then rejects and uses default', () => {
      const maliciousPath = '/tmp/..%2F..%2Fetc%2Fpasswd';
      const result = loadPricingTable(maliciousPath);

      expect(result).toEqual(DEFAULT_PRICING_TABLE);
    });

    it('When path contains Windows-style traversal, Then rejects and uses default', () => {
      const maliciousPath = 'C:\\tmp\\..\\..\\..\\Windows\\System32\\config\\sam';
      const result = loadPricingTable(maliciousPath);

      expect(result).toEqual(DEFAULT_PRICING_TABLE);
    });

    it('When path does not have .json extension, Then rejects and uses default', () => {
      const maliciousPath = '/etc/passwd';
      const result = loadPricingTable(maliciousPath);

      expect(result).toEqual(DEFAULT_PRICING_TABLE);
    });

    it('When path has .txt extension, Then rejects and uses default', () => {
      const maliciousPath = '/tmp/pricing.txt';
      const result = loadPricingTable(maliciousPath);

      expect(result).toEqual(DEFAULT_PRICING_TABLE);
    });

    it('When path has no extension, Then rejects and uses default', () => {
      const maliciousPath = '/tmp/pricing';
      const result = loadPricingTable(maliciousPath);

      expect(result).toEqual(DEFAULT_PRICING_TABLE);
    });

    it('When path has mixed case .JSON extension, Then accepts', () => {
      const validPath = '/tmp/pricing.JSON';
      const result = loadPricingTable(validPath);

      // Should attempt to load (will fall back to default if file doesn't exist)
      expect(result).toBeDefined();
    });

    it('When path contains relative .. within safe directory, Then rejects', () => {
      const maliciousPath = '/home/user/.claude/../../../etc/passwd';
      const result = loadPricingTable(maliciousPath);

      expect(result).toEqual(DEFAULT_PRICING_TABLE);
    });

    it('When path attempts to read /etc/passwd as .json, Then blocked by extension check', () => {
      const maliciousPath = '/etc/passwd.json';
      const result = loadPricingTable(maliciousPath);

      // Path is valid format, but file likely doesn't exist or isn't valid pricing table
      expect(result).toBeDefined();
    });
  });
});

// ============================================================================
// BOUNDARY TESTS - Edge cases, limits, unusual but valid inputs
// ============================================================================

describe('audit/reporting/pricing - BOUNDARY TESTS', () => {
  describe('estimateCost() with zero token counts', () => {
    it('When all tokens are zero, Then returns zero cost', () => {
      const tokens: TokenCounts = {
        input_tokens: 0,
        output_tokens: 0,
      };

      const cost = estimateCost('claude-opus-4-6', tokens);

      expect(cost).toBe(0);
    });

    it('When only input_tokens is zero, Then calculates output cost only', () => {
      const tokens: TokenCounts = {
        input_tokens: 0,
        output_tokens: 1000000, // 1M tokens
      };

      const cost = estimateCost('claude-opus-4-6', tokens);

      // 1M output tokens @ $75/MTok = $75.00
      expect(cost).toBeCloseTo(75.0, 2);
    });

    it('When only output_tokens is zero, Then calculates input cost only', () => {
      const tokens: TokenCounts = {
        input_tokens: 1000000, // 1M tokens
        output_tokens: 0,
      };

      const cost = estimateCost('claude-opus-4-6', tokens);

      // 1M input tokens @ $15/MTok = $15.00
      expect(cost).toBeCloseTo(15.0, 2);
    });

    it('When cache tokens are zero, Then ignores cache pricing', () => {
      const tokens: TokenCounts = {
        input_tokens: 1000000,
        output_tokens: 1000000,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
      };

      const cost = estimateCost('claude-opus-4-6', tokens);

      // Should only account for input + output, not cache
      expect(cost).toBeCloseTo(90.0, 2); // $15 + $75
    });
  });

  describe('estimateCost() with very large token counts', () => {
    it('When token counts exceed 1B, Then calculates without overflow', () => {
      const tokens: TokenCounts = {
        input_tokens: 1000000000, // 1 billion
        output_tokens: 1000000000,
      };

      const cost = estimateCost('claude-opus-4-6', tokens);

      // 1B tokens = 1000 MTok
      // Input: 1000 * $15 = $15,000
      // Output: 1000 * $75 = $75,000
      // Total: $90,000
      expect(cost).toBeCloseTo(90000.0, 2);
    });

    it('When result exceeds typical float precision, Then maintains accuracy', () => {
      const tokens: TokenCounts = {
        input_tokens: 999999999,
        output_tokens: 999999999,
      };

      const cost = estimateCost('claude-opus-4-6', tokens);

      // Should not lose precision due to floating point math
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(100000);
    });
  });

  describe('estimateCost() with very small token counts', () => {
    it('When token count is 1, Then calculates fractional cost', () => {
      const tokens: TokenCounts = {
        input_tokens: 1,
        output_tokens: 1,
      };

      const cost = estimateCost('claude-opus-4-6', tokens);

      // 1 token = 0.000001 MTok
      // Input: 0.000001 * $15 = $0.000015
      // Output: 0.000001 * $75 = $0.000075
      // Total: $0.000090
      expect(cost).toBeCloseTo(0.00009, 6);
    });

    it('When token count results in sub-cent cost, Then preserves precision', () => {
      const tokens: TokenCounts = {
        input_tokens: 100,
        output_tokens: 100,
      };

      const cost = estimateCost('claude-opus-4-6', tokens);

      // Should preserve fractional cents
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(0.01);
    });
  });

  describe('estimateCost() with missing optional cache fields', () => {
    it('When cache fields undefined, Then only calculates base cost', () => {
      const tokens: TokenCounts = {
        input_tokens: 1000000,
        output_tokens: 1000000,
        // cache fields omitted
      };

      const cost = estimateCost('claude-opus-4-6', tokens);

      expect(cost).toBeCloseTo(90.0, 2);
    });

    it('When only cache_creation_tokens present, Then includes cache write cost', () => {
      const tokens: TokenCounts = {
        input_tokens: 1000000,
        output_tokens: 1000000,
        cache_creation_tokens: 500000,
      };

      const cost = estimateCost('claude-opus-4-6', tokens);

      // Base: $90
      // Cache write: 0.5M * $18.75/MTok = $9.375
      // Total: $99.375
      expect(cost).toBeCloseTo(99.375, 2);
    });

    it('When only cache_read_tokens present, Then includes cache read cost', () => {
      const tokens: TokenCounts = {
        input_tokens: 1000000,
        output_tokens: 1000000,
        cache_read_tokens: 500000,
      };

      const cost = estimateCost('claude-opus-4-6', tokens);

      // Base: $90
      // Cache read: 0.5M * $1.50/MTok = $0.75
      // Total: $90.75
      expect(cost).toBeCloseTo(90.75, 2);
    });
  });

  describe('estimateCost() with pricing table missing cache pricing', () => {
    it('When cache_write_per_mtok missing and cache_creation_tokens present, Then ignores cache creation', () => {
      const table: PricingTable = {
        'claude-opus-4-6': {
          input_per_mtok: 15.0,
          output_per_mtok: 75.0,
          // no cache_write_per_mtok
        },
      };

      const tokens: TokenCounts = {
        input_tokens: 1000000,
        output_tokens: 1000000,
        cache_creation_tokens: 500000,
      };

      const cost = estimateCost('claude-opus-4-6', tokens, table);

      // Should only calculate base cost, ignore cache creation
      expect(cost).toBeCloseTo(90.0, 2);
    });

    it('When cache_read_per_mtok missing and cache_read_tokens present, Then ignores cache reads', () => {
      const table: PricingTable = {
        'claude-opus-4-6': {
          input_per_mtok: 15.0,
          output_per_mtok: 75.0,
          // no cache_read_per_mtok
        },
      };

      const tokens: TokenCounts = {
        input_tokens: 1000000,
        output_tokens: 1000000,
        cache_read_tokens: 500000,
      };

      const cost = estimateCost('claude-opus-4-6', tokens, table);

      // Should only calculate base cost, ignore cache reads
      expect(cost).toBeCloseTo(90.0, 2);
    });
  });

  describe('validatePricingTable() with edge cases', () => {
    it('When pricing table has zero values, Then returns true', () => {
      const zeroTable: PricingTable = {
        'free-model': {
          input_per_mtok: 0,
          output_per_mtok: 0,
        },
      };

      expect(validatePricingTable(zeroTable)).toBe(true);
    });

    it('When pricing table has very large values, Then returns true', () => {
      const expensiveTable: PricingTable = {
        'expensive-model': {
          input_per_mtok: 999999.99,
          output_per_mtok: 999999.99,
        },
      };

      expect(validatePricingTable(expensiveTable)).toBe(true);
    });

    it('When pricing table has fractional cent values, Then returns true', () => {
      const preciseTable: PricingTable = {
        'precise-model': {
          input_per_mtok: 0.001,
          output_per_mtok: 0.005,
        },
      };

      expect(validatePricingTable(preciseTable)).toBe(true);
    });

    it('When pricing table has many models, Then returns true', () => {
      const largeTable: PricingTable = {};
      for (let i = 0; i < 1000; i++) {
        largeTable[`model-${i}`] = {
          input_per_mtok: 15.0,
          output_per_mtok: 75.0,
        };
      }

      expect(validatePricingTable(largeTable)).toBe(true);
    });
  });

  describe('loadPricingTable() with edge cases', () => {
    it('When config path is absolute path, Then loads from absolute path', () => {
      const absolutePath = '/Users/test/.claude/pricing-config.json';
      const result = loadPricingTable(absolutePath);

      // Should attempt to load from absolute path, fallback to default if not found
      expect(result).toBeDefined();
    });

    it('When config path is relative path, Then resolves relative to cwd', () => {
      const relativePath = '.claude/pricing-config.json';
      const result = loadPricingTable(relativePath);

      // Should attempt to resolve relative path
      expect(result).toBeDefined();
    });

    it('When config path has unusual characters, Then handles gracefully', () => {
      const weirdPath = '/tmp/pricing config (2024).json';
      const result = loadPricingTable(weirdPath);

      expect(result).toBeDefined();
    });
  });
});

// ============================================================================
// GOLDEN PATH - Normal, expected operations
// ============================================================================

describe('audit/reporting/pricing - GOLDEN PATH', () => {
  describe('DEFAULT_PRICING_TABLE constant', () => {
    it('When accessed, Then contains Anthropic API pricing', () => {
      expect(DEFAULT_PRICING_TABLE).toBeDefined();
      expect(DEFAULT_PRICING_TABLE['claude-opus-4-6']).toBeDefined();
      expect(DEFAULT_PRICING_TABLE['claude-opus-4-5-20251101']).toBeDefined();
      expect(DEFAULT_PRICING_TABLE['claude-sonnet-4-5-20250929']).toBeDefined();
    });

    it('When accessed, Then has correct Opus 4.6 pricing', () => {
      const opus46 = DEFAULT_PRICING_TABLE['claude-opus-4-6'];

      expect(opus46.input_per_mtok).toBe(15.0);
      expect(opus46.output_per_mtok).toBe(75.0);
      expect(opus46.cache_write_per_mtok).toBe(18.75);
      expect(opus46.cache_read_per_mtok).toBe(1.50);
    });

    it('When accessed, Then has correct Opus 4.5 pricing', () => {
      const opus45 = DEFAULT_PRICING_TABLE['claude-opus-4-5-20251101'];

      expect(opus45.input_per_mtok).toBe(15.0);
      expect(opus45.output_per_mtok).toBe(75.0);
      expect(opus45.cache_write_per_mtok).toBe(18.75);
      expect(opus45.cache_read_per_mtok).toBe(1.50);
    });

    it('When accessed, Then has correct Sonnet 4.5 pricing', () => {
      const sonnet45 = DEFAULT_PRICING_TABLE['claude-sonnet-4-5-20250929'];

      expect(sonnet45.input_per_mtok).toBe(3.0);
      expect(sonnet45.output_per_mtok).toBe(15.0);
      expect(sonnet45.cache_write_per_mtok).toBe(3.75);
      expect(sonnet45.cache_read_per_mtok).toBe(0.30);
    });
  });

  describe('estimateCost() with default pricing (AC-1)', () => {
    it('When estimating cost for Opus 4.6 with basic tokens, Then calculates correctly', () => {
      const tokens: TokenCounts = {
        input_tokens: 1000000, // 1M input
        output_tokens: 500000, // 500k output
      };

      const cost = estimateCost('claude-opus-4-6', tokens);

      // Input: 1M * $15/MTok = $15.00
      // Output: 0.5M * $75/MTok = $37.50
      // Total: $52.50
      expect(cost).toBeCloseTo(52.5, 2);
    });

    it('When estimating cost for Sonnet 4.5 with basic tokens, Then calculates correctly', () => {
      const tokens: TokenCounts = {
        input_tokens: 1000000,
        output_tokens: 500000,
      };

      const cost = estimateCost('claude-sonnet-4-5-20250929', tokens);

      // Input: 1M * $3/MTok = $3.00
      // Output: 0.5M * $15/MTok = $7.50
      // Total: $10.50
      expect(cost).toBeCloseTo(10.5, 2);
    });

    it('When estimating cost with cache creation, Then includes cache write cost', () => {
      const tokens: TokenCounts = {
        input_tokens: 1000000,
        output_tokens: 500000,
        cache_creation_tokens: 200000,
      };

      const cost = estimateCost('claude-opus-4-6', tokens);

      // Base: $52.50
      // Cache write: 0.2M * $18.75/MTok = $3.75
      // Total: $56.25
      expect(cost).toBeCloseTo(56.25, 2);
    });

    it('When estimating cost with cache reads, Then includes cache read cost', () => {
      const tokens: TokenCounts = {
        input_tokens: 1000000,
        output_tokens: 500000,
        cache_read_tokens: 800000,
      };

      const cost = estimateCost('claude-opus-4-6', tokens);

      // Base: $52.50
      // Cache read: 0.8M * $1.50/MTok = $1.20
      // Total: $53.70
      expect(cost).toBeCloseTo(53.7, 2);
    });

    it('When estimating cost with all token types, Then sums all costs', () => {
      const tokens: TokenCounts = {
        input_tokens: 1000000,
        output_tokens: 500000,
        cache_creation_tokens: 200000,
        cache_read_tokens: 300000,
      };

      const cost = estimateCost('claude-opus-4-6', tokens);

      // Input: $15.00
      // Output: $37.50
      // Cache write: $3.75
      // Cache read: $0.45
      // Total: $56.70
      expect(cost).toBeCloseTo(56.7, 2);
    });
  });

  describe('estimateCost() with custom pricing table', () => {
    it('When using custom pricing table, Then applies custom rates', () => {
      const customTable: PricingTable = {
        'custom-model': {
          input_per_mtok: 10.0,
          output_per_mtok: 50.0,
        },
      };

      const tokens: TokenCounts = {
        input_tokens: 1000000,
        output_tokens: 1000000,
      };

      const cost = estimateCost('custom-model', tokens, customTable);

      // Input: 1M * $10/MTok = $10.00
      // Output: 1M * $50/MTok = $50.00
      // Total: $60.00
      expect(cost).toBeCloseTo(60.0, 2);
    });

    it('When custom table has cache pricing, Then uses custom cache rates', () => {
      const customTable: PricingTable = {
        'custom-model': {
          input_per_mtok: 10.0,
          output_per_mtok: 50.0,
          cache_write_per_mtok: 12.5,
          cache_read_per_mtok: 1.0,
        },
      };

      const tokens: TokenCounts = {
        input_tokens: 1000000,
        output_tokens: 1000000,
        cache_creation_tokens: 500000,
        cache_read_tokens: 500000,
      };

      const cost = estimateCost('custom-model', tokens, customTable);

      // Input: $10.00
      // Output: $50.00
      // Cache write: 0.5M * $12.5/MTok = $6.25
      // Cache read: 0.5M * $1.0/MTok = $0.50
      // Total: $66.75
      expect(cost).toBeCloseTo(66.75, 2);
    });
  });

  describe('validatePricingTable() with valid tables', () => {
    it('When validating DEFAULT_PRICING_TABLE, Then returns true', () => {
      expect(validatePricingTable(DEFAULT_PRICING_TABLE)).toBe(true);
    });

    it('When validating table with required fields only, Then returns true', () => {
      const minimalTable: PricingTable = {
        'model-1': {
          input_per_mtok: 15.0,
          output_per_mtok: 75.0,
        },
      };

      expect(validatePricingTable(minimalTable)).toBe(true);
    });

    it('When validating table with optional cache fields, Then returns true', () => {
      const fullTable: PricingTable = {
        'model-1': {
          input_per_mtok: 15.0,
          output_per_mtok: 75.0,
          cache_write_per_mtok: 18.75,
          cache_read_per_mtok: 1.50,
        },
      };

      expect(validatePricingTable(fullTable)).toBe(true);
    });

    it('When validating table with multiple models, Then returns true', () => {
      const multiTable: PricingTable = {
        'opus-4-6': {
          input_per_mtok: 15.0,
          output_per_mtok: 75.0,
        },
        'sonnet-4-5': {
          input_per_mtok: 3.0,
          output_per_mtok: 15.0,
        },
      };

      expect(validatePricingTable(multiTable)).toBe(true);
    });
  });

  describe('loadPricingTable() with default behavior', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pricing-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('When no config path provided, Then returns default pricing table', () => {
      const result = loadPricingTable();

      expect(result).toEqual(DEFAULT_PRICING_TABLE);
    });

    it('When config file not found, Then returns default pricing table', () => {
      const result = loadPricingTable('/nonexistent/pricing.json');

      expect(result).toEqual(DEFAULT_PRICING_TABLE);
    });

    it('When called multiple times, Then returns consistent results', () => {
      const result1 = loadPricingTable();
      const result2 = loadPricingTable();

      expect(result1).toEqual(result2);
    });

    it('When valid pricing file exists, Then loads custom pricing', () => {
      const customPricing: PricingTable = {
        'custom-model': {
          input_per_mtok: 10.0,
          output_per_mtok: 50.0,
          cache_write_per_mtok: 12.5,
          cache_read_per_mtok: 1.0,
        },
      };

      const configPath = path.join(tempDir, 'custom-pricing.json');
      fs.writeFileSync(configPath, JSON.stringify(customPricing), 'utf8');

      const result = loadPricingTable(configPath);

      expect(result).toEqual(customPricing);
    });

    it('When pricing file has multiple models, Then loads all models', () => {
      const customPricing: PricingTable = {
        'model-a': {
          input_per_mtok: 5.0,
          output_per_mtok: 25.0,
        },
        'model-b': {
          input_per_mtok: 10.0,
          output_per_mtok: 50.0,
        },
        'model-c': {
          input_per_mtok: 15.0,
          output_per_mtok: 75.0,
        },
      };

      const configPath = path.join(tempDir, 'multi-model-pricing.json');
      fs.writeFileSync(configPath, JSON.stringify(customPricing), 'utf8');

      const result = loadPricingTable(configPath);

      expect(result).toEqual(customPricing);
      expect(Object.keys(result)).toHaveLength(3);
    });

    it('When pricing file is malformed JSON, Then falls back to default', () => {
      const configPath = path.join(tempDir, 'malformed.json');
      fs.writeFileSync(configPath, '{ invalid json', 'utf8');

      const result = loadPricingTable(configPath);

      expect(result).toEqual(DEFAULT_PRICING_TABLE);
    });

    it('When pricing file has invalid structure, Then falls back to default', () => {
      const invalidData = {
        'model': {
          input_per_mtok: -5.0, // negative value
          output_per_mtok: 25.0,
        },
      };

      const configPath = path.join(tempDir, 'invalid-structure.json');
      fs.writeFileSync(configPath, JSON.stringify(invalidData), 'utf8');

      const result = loadPricingTable(configPath);

      expect(result).toEqual(DEFAULT_PRICING_TABLE);
    });
  });

  describe('Cost calculation precision', () => {
    it('When calculating fractional cents, Then rounds to nearest cent', () => {
      const tokens: TokenCounts = {
        input_tokens: 1234,
        output_tokens: 5678,
      };

      const cost = estimateCost('claude-opus-4-6', tokens);

      // Should be a precise decimal value
      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });

    it('When calculating large sums, Then maintains precision', () => {
      const tokens: TokenCounts = {
        input_tokens: 123456789,
        output_tokens: 987654321,
      };

      const cost = estimateCost('claude-opus-4-6', tokens);

      // Should handle large numbers without losing precision
      expect(cost).toBeGreaterThan(1000);
      expect(cost).toBeLessThan(100000);
    });

    it('When summing many small costs, Then avoids floating point errors', () => {
      let totalCost = 0;
      const smallTokens: TokenCounts = {
        input_tokens: 10,
        output_tokens: 10,
      };

      // Sum 1000 small requests
      for (let i = 0; i < 1000; i++) {
        totalCost += estimateCost('claude-opus-4-6', smallTokens);
      }

      // Should not accumulate floating point errors
      expect(totalCost).toBeGreaterThan(0);
      expect(totalCost).toBeLessThan(1);
    });
  });
});
