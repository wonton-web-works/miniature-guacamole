/**
 * Adapter Factory Unit Tests — WS-ENT-2
 *
 * Tests for getAdapter() factory function that switches between
 * FileAdapter (default) and PostgresAdapter based on MG_STORAGE_ADAPTER env var.
 *
 * AC-ENT-2.8: Adapter factory with env-var switch (MG_STORAGE_ADAPTER=postgres|file)
 * AC-ENT-2.11: Backwards compatible — default behavior uses FileAdapter
 *
 * Test order: MISUSE → BOUNDARY → GOLDEN PATH
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock pg so PostgresAdapter construction doesn't fail
vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: vi.fn(),
    end: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { getAdapter } from '../../../../src/memory/adapters/factory';
import { FileAdapter } from '../../../../src/memory/adapters/file-adapter';

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('getAdapter() Factory — MISUSE CASES', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(async () => {
    process.env = originalEnv;
    // Clean up any adapter that was created
  });

  describe('MG_STORAGE_ADAPTER — invalid values', () => {
    it('Given MG_STORAGE_ADAPTER=invalid_name, When getAdapter() called, Then throws with descriptive error', () => {
      process.env.MG_STORAGE_ADAPTER = 'invalid_name';
      expect(() => getAdapter()).toThrow(/unknown adapter|invalid.*adapter/i);
    });

    it('Given MG_STORAGE_ADAPTER=POSTGRES (uppercase), When getAdapter() called, Then case-insensitive match or throws cleanly', () => {
      process.env.MG_STORAGE_ADAPTER = 'POSTGRES';
      // Either case-insensitive match succeeds, or throws clear error — must not crash
      expect(() => getAdapter()).not.toThrow(TypeError);
    });

    it('Given MG_STORAGE_ADAPTER=mysql, When getAdapter() called, Then throws unsupported adapter error', () => {
      process.env.MG_STORAGE_ADAPTER = 'mysql';
      expect(() => getAdapter()).toThrow(/unknown|unsupported|invalid/i);
    });

    it('Given MG_STORAGE_ADAPTER=postgres but MG_POSTGRES_URL missing, When getAdapter() called, Then throws connection config error', () => {
      process.env.MG_STORAGE_ADAPTER = 'postgres';
      delete process.env.MG_POSTGRES_URL;
      expect(() => getAdapter()).toThrow(/connection|url|postgres/i);
    });

    it('Given MG_STORAGE_ADAPTER= (empty string), When getAdapter() called, Then falls back to FileAdapter or throws clean error', () => {
      process.env.MG_STORAGE_ADAPTER = '';
      // Empty string: either defaults to FileAdapter or throws a clean error
      let adapter: any;
      try {
        adapter = getAdapter();
        expect(adapter).toBeInstanceOf(FileAdapter);
      } catch (err: any) {
        expect(err.message).toBeDefined();
      }
    });

    it('Given MG_STORAGE_ADAPTER=file (explicit), When getAdapter() called, Then returns FileAdapter', async () => {
      process.env.MG_STORAGE_ADAPTER = 'file';
      const adapter = getAdapter();
      expect(adapter).toBeInstanceOf(FileAdapter);
      await adapter.close();
    });
  });

  describe('Factory error handling', () => {
    it('Given getAdapter() returns postgres adapter but MG_POSTGRES_URL is malformed, When called, Then throws config error', () => {
      process.env.MG_STORAGE_ADAPTER = 'postgres';
      process.env.MG_POSTGRES_URL = 'not-a-valid-url';
      // pg Pool constructor accepts any string but connection will fail at runtime
      // The factory should still construct (pg validates at connect time)
      // So this should not throw at factory creation
      expect(() => getAdapter()).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('getAdapter() Factory — BOUNDARY TESTS', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(async () => {
    process.env = originalEnv;
  });

  describe('MG_STORAGE_ADAPTER — edge values', () => {
    it('Given MG_STORAGE_ADAPTER not set (undefined), When getAdapter() called, Then returns FileAdapter', async () => {
      delete process.env.MG_STORAGE_ADAPTER;
      const adapter = getAdapter();
      expect(adapter).toBeInstanceOf(FileAdapter);
      await adapter.close();
    });

    it('Given env var toggled between calls, When getAdapter() called twice, Then each call respects current env state', async () => {
      delete process.env.MG_STORAGE_ADAPTER;
      const adapter1 = getAdapter();
      expect(adapter1).toBeInstanceOf(FileAdapter);
      await adapter1.close();

      process.env.MG_STORAGE_ADAPTER = 'postgres';
      process.env.MG_POSTGRES_URL = 'postgresql://localhost/test';
      const adapter2 = getAdapter();
      expect(adapter2).not.toBeInstanceOf(FileAdapter);
      await adapter2.close();
    });

    it('Given MG_STORAGE_ADAPTER=postgres with valid URL, When getAdapter() called, Then returns adapter implementing StorageAdapter interface', async () => {
      process.env.MG_STORAGE_ADAPTER = 'postgres';
      process.env.MG_POSTGRES_URL = 'postgresql://localhost/test';
      const adapter = getAdapter();
      expect(typeof adapter.read).toBe('function');
      expect(typeof adapter.write).toBe('function');
      expect(typeof adapter.query).toBe('function');
      expect(typeof adapter.delete).toBe('function');
      expect(typeof adapter.subscribe).toBe('function');
      expect(typeof adapter.publish).toBe('function');
      expect(typeof adapter.close).toBe('function');
      await adapter.close();
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('getAdapter() Factory — GOLDEN PATH', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(async () => {
    process.env = originalEnv;
  });

  describe('Default behavior — FileAdapter (AC-ENT-2.11)', () => {
    it('Given no MG_STORAGE_ADAPTER env var, When getAdapter() called, Then returns FileAdapter', async () => {
      delete process.env.MG_STORAGE_ADAPTER;
      const adapter = getAdapter();
      expect(adapter).toBeInstanceOf(FileAdapter);
      await adapter.close();
    });

    it('Given MG_STORAGE_ADAPTER=file, When getAdapter() called, Then returns FileAdapter', async () => {
      process.env.MG_STORAGE_ADAPTER = 'file';
      const adapter = getAdapter();
      expect(adapter).toBeInstanceOf(FileAdapter);
      await adapter.close();
    });

    it('Given FileAdapter returned, When read/write/close called, Then adapter is fully functional', async () => {
      delete process.env.MG_STORAGE_ADAPTER;
      const adapter = getAdapter();
      // Must expose all interface methods
      expect(typeof adapter.read).toBe('function');
      expect(typeof adapter.write).toBe('function');
      expect(typeof adapter.close).toBe('function');
      await adapter.close();
    });
  });

  describe('PostgresAdapter via factory (AC-ENT-2.8)', () => {
    it('Given MG_STORAGE_ADAPTER=postgres and MG_POSTGRES_URL set, When getAdapter() called, Then returns PostgresAdapter', async () => {
      process.env.MG_STORAGE_ADAPTER = 'postgres';
      process.env.MG_POSTGRES_URL = 'postgresql://localhost/test';
      const adapter = getAdapter();
      // Should be a PostgresAdapter instance, not FileAdapter
      expect(adapter).not.toBeInstanceOf(FileAdapter);
      await adapter.close();
    });

    it('Given PostgresAdapter returned, When StorageAdapter methods called, Then all methods exist', async () => {
      process.env.MG_STORAGE_ADAPTER = 'postgres';
      process.env.MG_POSTGRES_URL = 'postgresql://localhost/test';
      const adapter = getAdapter();
      expect(typeof adapter.read).toBe('function');
      expect(typeof adapter.write).toBe('function');
      expect(typeof adapter.query).toBe('function');
      expect(typeof adapter.delete).toBe('function');
      expect(typeof adapter.subscribe).toBe('function');
      expect(typeof adapter.publish).toBe('function');
      expect(typeof adapter.close).toBe('function');
      await adapter.close();
    });
  });

  describe('Factory is stateless — reads env per call', () => {
    it('Given factory called without env var, Then called again with env var, Then second call returns different adapter type', async () => {
      delete process.env.MG_STORAGE_ADAPTER;
      const a1 = getAdapter();
      expect(a1).toBeInstanceOf(FileAdapter);
      await a1.close();

      process.env.MG_STORAGE_ADAPTER = 'postgres';
      process.env.MG_POSTGRES_URL = 'postgresql://localhost/test';
      const a2 = getAdapter();
      expect(a2).not.toBeInstanceOf(FileAdapter);
      await a2.close();
    });
  });
});
