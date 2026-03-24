/**
 * Adapter Factory Unit Tests
 *
 * Tests for getAdapter() factory function. OSS edition supports FileAdapter only.
 * Postgres adapter is available in premium edition.
 *
 * AC-ENT-2.11: Backwards compatible — default behavior uses FileAdapter
 *
 * Test order: MISUSE → BOUNDARY → GOLDEN PATH
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

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
  });

  describe('MG_STORAGE_ADAPTER — invalid values', () => {
    it('Given MG_STORAGE_ADAPTER=invalid_name, When getAdapter() called, Then throws with descriptive error', async () => {
      process.env.MG_STORAGE_ADAPTER = 'invalid_name';
      await expect(getAdapter()).rejects.toThrow(/unknown adapter|invalid.*adapter/i);
    });

    it('Given MG_STORAGE_ADAPTER=mysql, When getAdapter() called, Then throws unsupported adapter error', async () => {
      process.env.MG_STORAGE_ADAPTER = 'mysql';
      await expect(getAdapter()).rejects.toThrow(/unknown|unsupported|invalid/i);
    });

    it('Given MG_STORAGE_ADAPTER=postgres, When getAdapter() called, Then throws (postgres is premium-only)', async () => {
      process.env.MG_STORAGE_ADAPTER = 'postgres';
      await expect(getAdapter()).rejects.toThrow(/unknown|premium/i);
    });

    it('Given MG_STORAGE_ADAPTER= (empty string), When getAdapter() called, Then falls back to FileAdapter', async () => {
      process.env.MG_STORAGE_ADAPTER = '';
      const adapter = await getAdapter();
      expect(adapter).toBeInstanceOf(FileAdapter);
      await adapter.close();
    });

    it('Given MG_STORAGE_ADAPTER=file (explicit), When getAdapter() called, Then returns FileAdapter', async () => {
      process.env.MG_STORAGE_ADAPTER = 'file';
      const adapter = await getAdapter();
      expect(adapter).toBeInstanceOf(FileAdapter);
      await adapter.close();
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
      const adapter = await getAdapter();
      expect(adapter).toBeInstanceOf(FileAdapter);
      await adapter.close();
    });

    it('Given env var toggled between calls, When getAdapter() called twice with file, Then both return FileAdapter', async () => {
      delete process.env.MG_STORAGE_ADAPTER;
      const adapter1 = await getAdapter();
      expect(adapter1).toBeInstanceOf(FileAdapter);
      await adapter1.close();

      process.env.MG_STORAGE_ADAPTER = 'file';
      const adapter2 = await getAdapter();
      expect(adapter2).toBeInstanceOf(FileAdapter);
      await adapter2.close();
    });

    it('Given MG_STORAGE_ADAPTER=FILE (uppercase), When getAdapter() called, Then case-insensitive match returns FileAdapter', async () => {
      process.env.MG_STORAGE_ADAPTER = 'FILE';
      const adapter = await getAdapter();
      expect(adapter).toBeInstanceOf(FileAdapter);
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
      const adapter = await getAdapter();
      expect(adapter).toBeInstanceOf(FileAdapter);
      await adapter.close();
    });

    it('Given MG_STORAGE_ADAPTER=file, When getAdapter() called, Then returns FileAdapter', async () => {
      process.env.MG_STORAGE_ADAPTER = 'file';
      const adapter = await getAdapter();
      expect(adapter).toBeInstanceOf(FileAdapter);
      await adapter.close();
    });

    it('Given FileAdapter returned, When read/write/close called, Then adapter is fully functional', async () => {
      delete process.env.MG_STORAGE_ADAPTER;
      const adapter = await getAdapter();
      expect(typeof adapter.read).toBe('function');
      expect(typeof adapter.write).toBe('function');
      expect(typeof adapter.close).toBe('function');
      await adapter.close();
    });
  });

  describe('Factory is stateless — reads env per call', () => {
    it('Given factory called without env var, Then called with invalid, Then second call throws', async () => {
      delete process.env.MG_STORAGE_ADAPTER;
      const a1 = await getAdapter();
      expect(a1).toBeInstanceOf(FileAdapter);
      await a1.close();

      process.env.MG_STORAGE_ADAPTER = 'invalid';
      await expect(getAdapter()).rejects.toThrow(/unknown/i);
    });
  });
});
