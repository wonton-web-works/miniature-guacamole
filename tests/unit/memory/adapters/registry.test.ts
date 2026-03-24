/**
 * Adapter Registry Unit Tests — WS-SPLIT-4
 *
 * Tests for registerAdapter(), getAdapter(), listAdapters(), clearAdapters().
 * Defines the plugin boundary that lets mg-premium (and any third-party
 * package) register adapters into the OSS factory without touching OSS source.
 *
 * Acceptance Criteria Covered:
 *   AC-S4-1: registerAdapter(name, AdapterClass) exported from OSS
 *   AC-S4-2: Registered adapters returned by getAdapter() when env var matches
 *   AC-S4-3: registerAdapter with built-in name ('file') throws descriptive error
 *   AC-S4-4: registerAdapter with invalid AdapterClass (missing methods) throws
 *   AC-S4-5: getAdapter() error for unknown adapter lists registered names + 'file'
 *   AC-S4-6: listAdapters() returns all registered names including 'file'
 *   AC-S4-7: Registry is module-level singleton — registrations persist across calls
 *   AC-S4-8: clearAdapters() exported for test isolation
 *
 * Test order: MISUSE → BOUNDARY → GOLDEN PATH (CAD Protocol)
 *
 * TDD: These tests are written BEFORE implementation. They WILL FAIL until
 * src/memory/adapters/registry.ts is created.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type {
  StorageAdapter,
  AdapterReadResult,
  AdapterWriteResult,
  AdapterDeleteResult,
  AdapterQueryResult,
  QueryFilter,
  MemoryEvent,
} from '../../../../src/memory/adapters/types';

// This import will throw a module-not-found error until registry.ts is created.
// That is the expected red-phase failure.
// @ts-expect-error -- not yet implemented; TDD red phase
import { registerAdapter, listAdapters, clearAdapters } from '../../../../src/memory/adapters/registry';

// @ts-expect-error -- factory will gain registry awareness after implementation
import { getAdapter } from '../../../../src/memory/adapters/factory';

// ---------------------------------------------------------------------------
// Minimal mock adapter — satisfies the full StorageAdapter interface
// ---------------------------------------------------------------------------

class MockAdapter implements StorageAdapter {
  async read(_key: string): Promise<AdapterReadResult> {
    return { success: false, data: null, error: 'mock: not implemented' };
  }
  async write(_key: string, _data: any): Promise<AdapterWriteResult> {
    return { success: false, error: 'mock: not implemented' };
  }
  async query(_filter: QueryFilter): Promise<AdapterQueryResult> {
    return [];
  }
  async delete(_key: string): Promise<AdapterDeleteResult> {
    return { success: false, error: 'mock: not implemented' };
  }
  subscribe(_channel: string, _callback: (event: MemoryEvent) => void): () => void {
    return () => {};
  }
  publish(_channel: string, _event: MemoryEvent): void {}
  async close(): Promise<void> {}
}

// A second distinct mock class — needed for singleton and multi-adapter tests
class AnotherMockAdapter implements StorageAdapter {
  async read(_key: string): Promise<AdapterReadResult> {
    return { success: false, data: null, error: 'another: not implemented' };
  }
  async write(_key: string, _data: any): Promise<AdapterWriteResult> {
    return { success: false, error: 'another: not implemented' };
  }
  async query(_filter: QueryFilter): Promise<AdapterQueryResult> {
    return [];
  }
  async delete(_key: string): Promise<AdapterDeleteResult> {
    return { success: false, error: 'another: not implemented' };
  }
  subscribe(_channel: string, _callback: (event: MemoryEvent) => void): () => void {
    return () => {};
  }
  publish(_channel: string, _event: MemoryEvent): void {}
  async close(): Promise<void> {}
}

// ---------------------------------------------------------------------------
// Shared env helpers
// ---------------------------------------------------------------------------

let savedEnv: NodeJS.ProcessEnv;

function saveEnv() {
  savedEnv = { ...process.env };
}

function restoreEnv() {
  // Replace process.env keys without replacing the object reference,
  // because some runtimes bind to the original reference.
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  Object.assign(process.env, savedEnv);
}

// ===========================================================================
// MISUSE CASES
// ===========================================================================

describe('registerAdapter() — MISUSE CASES', () => {
  beforeEach(() => {
    saveEnv();
    clearAdapters();
  });

  afterEach(() => {
    restoreEnv();
    clearAdapters();
  });

  // -------------------------------------------------------------------------
  // AC-S4-3: Conflict with built-in names
  // -------------------------------------------------------------------------

  describe('Conflicting with built-in adapter names (AC-S4-3)', () => {
    it('Given name="file", When registerAdapter called, Then throws with built-in conflict message', () => {
      expect(() => registerAdapter('file', MockAdapter)).toThrow(/built.?in|reserved|conflict/i);
    });

    it('Given name="FILE" (uppercase), When registerAdapter called, Then throws — case-insensitive conflict check', () => {
      expect(() => registerAdapter('FILE', MockAdapter)).toThrow(/built.?in|reserved|conflict/i);
    });

    it('Given name="File" (mixed case), When registerAdapter called, Then throws — conflict is case-insensitive', () => {
      expect(() => registerAdapter('File', MockAdapter)).toThrow(/built.?in|reserved|conflict/i);
    });
  });

  // -------------------------------------------------------------------------
  // AC-S4-4: Invalid AdapterClass — missing required methods
  // -------------------------------------------------------------------------

  describe('Invalid AdapterClass — missing required interface methods (AC-S4-4)', () => {
    it('Given AdapterClass=null, When registerAdapter called, Then throws validation error', () => {
      expect(() => registerAdapter('nulladapter', null as any)).toThrow(/invalid|adapter.*class|not.*constructor/i);
    });

    it('Given AdapterClass=undefined, When registerAdapter called, Then throws validation error', () => {
      expect(() => registerAdapter('undefadapter', undefined as any)).toThrow(/invalid|adapter.*class|not.*constructor/i);
    });

    it('Given AdapterClass is plain object (not a class), When registerAdapter called, Then throws validation error', () => {
      const plainObject = { read: () => {}, write: () => {} } as any;
      expect(() => registerAdapter('objadapter', plainObject)).toThrow(/invalid|adapter.*class|not.*constructor/i);
    });

    it('Given AdapterClass missing read(), When registerAdapter called, Then throws listing missing method', () => {
      class NoRead implements Partial<StorageAdapter> {
        async write(_k: string, _d: any): Promise<AdapterWriteResult> { return { success: false, error: '' }; }
        async query(_f: QueryFilter): Promise<AdapterQueryResult> { return []; }
        async delete(_k: string): Promise<AdapterDeleteResult> { return { success: false, error: '' }; }
        subscribe(_c: string, _cb: any): () => void { return () => {}; }
        publish(_c: string, _e: MemoryEvent): void {}
        async close(): Promise<void> {}
      }
      expect(() => registerAdapter('noread', NoRead as any)).toThrow(/read|missing|method/i);
    });

    it('Given AdapterClass missing write(), When registerAdapter called, Then throws listing missing method', () => {
      class NoWrite implements Partial<StorageAdapter> {
        async read(_k: string): Promise<AdapterReadResult> { return { success: false, data: null, error: '' }; }
        async query(_f: QueryFilter): Promise<AdapterQueryResult> { return []; }
        async delete(_k: string): Promise<AdapterDeleteResult> { return { success: false, error: '' }; }
        subscribe(_c: string, _cb: any): () => void { return () => {}; }
        publish(_c: string, _e: MemoryEvent): void {}
        async close(): Promise<void> {}
      }
      expect(() => registerAdapter('nowrite', NoWrite as any)).toThrow(/write|missing|method/i);
    });

    it('Given AdapterClass missing query(), When registerAdapter called, Then throws listing missing method', () => {
      class NoQuery implements Partial<StorageAdapter> {
        async read(_k: string): Promise<AdapterReadResult> { return { success: false, data: null, error: '' }; }
        async write(_k: string, _d: any): Promise<AdapterWriteResult> { return { success: false, error: '' }; }
        async delete(_k: string): Promise<AdapterDeleteResult> { return { success: false, error: '' }; }
        subscribe(_c: string, _cb: any): () => void { return () => {}; }
        publish(_c: string, _e: MemoryEvent): void {}
        async close(): Promise<void> {}
      }
      expect(() => registerAdapter('noquery', NoQuery as any)).toThrow(/query|missing|method/i);
    });

    it('Given AdapterClass missing delete(), When registerAdapter called, Then throws listing missing method', () => {
      class NoDelete implements Partial<StorageAdapter> {
        async read(_k: string): Promise<AdapterReadResult> { return { success: false, data: null, error: '' }; }
        async write(_k: string, _d: any): Promise<AdapterWriteResult> { return { success: false, error: '' }; }
        async query(_f: QueryFilter): Promise<AdapterQueryResult> { return []; }
        subscribe(_c: string, _cb: any): () => void { return () => {}; }
        publish(_c: string, _e: MemoryEvent): void {}
        async close(): Promise<void> {}
      }
      expect(() => registerAdapter('nodelete', NoDelete as any)).toThrow(/delete|missing|method/i);
    });

    it('Given AdapterClass missing subscribe(), When registerAdapter called, Then throws listing missing method', () => {
      class NoSubscribe implements Partial<StorageAdapter> {
        async read(_k: string): Promise<AdapterReadResult> { return { success: false, data: null, error: '' }; }
        async write(_k: string, _d: any): Promise<AdapterWriteResult> { return { success: false, error: '' }; }
        async query(_f: QueryFilter): Promise<AdapterQueryResult> { return []; }
        async delete(_k: string): Promise<AdapterDeleteResult> { return { success: false, error: '' }; }
        publish(_c: string, _e: MemoryEvent): void {}
        async close(): Promise<void> {}
      }
      expect(() => registerAdapter('nosubscribe', NoSubscribe as any)).toThrow(/subscribe|missing|method/i);
    });

    it('Given AdapterClass missing publish(), When registerAdapter called, Then throws listing missing method', () => {
      class NoPublish implements Partial<StorageAdapter> {
        async read(_k: string): Promise<AdapterReadResult> { return { success: false, data: null, error: '' }; }
        async write(_k: string, _d: any): Promise<AdapterWriteResult> { return { success: false, error: '' }; }
        async query(_f: QueryFilter): Promise<AdapterQueryResult> { return []; }
        async delete(_k: string): Promise<AdapterDeleteResult> { return { success: false, error: '' }; }
        subscribe(_c: string, _cb: any): () => void { return () => {}; }
        async close(): Promise<void> {}
      }
      expect(() => registerAdapter('nopublish', NoPublish as any)).toThrow(/publish|missing|method/i);
    });

    it('Given AdapterClass missing close(), When registerAdapter called, Then throws listing missing method', () => {
      class NoClose implements Partial<StorageAdapter> {
        async read(_k: string): Promise<AdapterReadResult> { return { success: false, data: null, error: '' }; }
        async write(_k: string, _d: any): Promise<AdapterWriteResult> { return { success: false, error: '' }; }
        async query(_f: QueryFilter): Promise<AdapterQueryResult> { return []; }
        async delete(_k: string): Promise<AdapterDeleteResult> { return { success: false, error: '' }; }
        subscribe(_c: string, _cb: any): () => void { return () => {}; }
        publish(_c: string, _e: MemoryEvent): void {}
      }
      expect(() => registerAdapter('noclose', NoClose as any)).toThrow(/close|missing|method/i);
    });
  });

  // -------------------------------------------------------------------------
  // AC-S4-1: registerAdapter with invalid name argument
  // -------------------------------------------------------------------------

  describe('Invalid name argument', () => {
    it('Given name="" (empty string), When registerAdapter called, Then throws', () => {
      expect(() => registerAdapter('', MockAdapter)).toThrow(/name|empty|invalid/i);
    });

    it('Given name=null, When registerAdapter called, Then throws', () => {
      expect(() => registerAdapter(null as any, MockAdapter)).toThrow(/name|invalid/i);
    });

    it('Given name=undefined, When registerAdapter called, Then throws', () => {
      expect(() => registerAdapter(undefined as any, MockAdapter)).toThrow(/name|invalid/i);
    });

    it('Given name=42 (non-string), When registerAdapter called, Then throws', () => {
      expect(() => registerAdapter(42 as any, MockAdapter)).toThrow(/name|invalid/i);
    });
  });

  // -------------------------------------------------------------------------
  // getAdapter() misuse after registry interaction
  // -------------------------------------------------------------------------

  describe('getAdapter() with unregistered adapter name (AC-S4-5)', () => {
    it('Given MG_STORAGE_ADAPTER=notregistered, When getAdapter() called, Then error lists known adapters', async () => {
      registerAdapter('mock-a', MockAdapter);
      process.env.MG_STORAGE_ADAPTER = 'notregistered';

      await expect(getAdapter()).rejects.toThrow(/mock-a/);
    });

    it('Given MG_STORAGE_ADAPTER=ghost, When getAdapter() called, Then error always mentions "file"', async () => {
      process.env.MG_STORAGE_ADAPTER = 'ghost';
      await expect(getAdapter()).rejects.toThrow(/file/i);
    });

    it('Given no adapters registered + unknown env var, When getAdapter() called, Then error message is descriptive', async () => {
      process.env.MG_STORAGE_ADAPTER = 'unknownadapter';
      await expect(getAdapter()).rejects.toThrow(/unknownadapter/i);
    });
  });
});

// ===========================================================================
// BOUNDARY TESTS
// ===========================================================================

describe('registerAdapter() — BOUNDARY TESTS', () => {
  beforeEach(() => {
    saveEnv();
    clearAdapters();
  });

  afterEach(() => {
    restoreEnv();
    clearAdapters();
  });

  // -------------------------------------------------------------------------
  // Name edge cases
  // -------------------------------------------------------------------------

  describe('Name edge cases', () => {
    it('Given name with uppercase letters, When registerAdapter called, Then stored and retrievable', async () => {
      registerAdapter('MyAdapter', MockAdapter);
      process.env.MG_STORAGE_ADAPTER = 'MyAdapter';
      const adapter = await getAdapter();
      expect(adapter).toBeInstanceOf(MockAdapter);
      await adapter.close();
    });

    it('Given name with hyphens and underscores, When registerAdapter called, Then accepted', async () => {
      registerAdapter('my-custom_adapter', MockAdapter);
      const names = listAdapters();
      expect(names).toContain('my-custom_adapter');
    });

    it('Given name with only numbers, When registerAdapter called, Then accepted', () => {
      expect(() => registerAdapter('123', MockAdapter)).not.toThrow();
    });

    it('Given name that is a very long string (255 chars), When registerAdapter called, Then accepted or rejects with clear error', () => {
      const longName = 'a'.repeat(255);
      // Either succeeds or throws a clear error — both are valid; the key is no crash
      try {
        registerAdapter(longName, MockAdapter);
        const names = listAdapters();
        expect(names).toContain(longName);
      } catch (err: any) {
        expect(err.message).toMatch(/name|long|invalid/i);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Duplicate registration
  // -------------------------------------------------------------------------

  describe('Duplicate registration', () => {
    it('Given same name registered twice with same class, When second call made, Then throws or silently succeeds (no silent swap)', () => {
      registerAdapter('duptest', MockAdapter);
      // Second registration with same class — must be explicit (no silent overwrite of a different class)
      // A registry that allows re-registering the same class is acceptable;
      // silently swapping to a different class is not.
      expect(() => registerAdapter('duptest', MockAdapter)).not.toThrow();
    });

    it('Given same name registered twice with different class, When second call made, Then throws duplicate error', () => {
      registerAdapter('dupname', MockAdapter);
      expect(() => registerAdapter('dupname', AnotherMockAdapter)).toThrow(/already.*registered|duplicate|conflict/i);
    });
  });

  // -------------------------------------------------------------------------
  // Registry state after clearAdapters()
  // -------------------------------------------------------------------------

  describe('clearAdapters() resets to clean state (AC-S4-8)', () => {
    it('Given adapter registered, When clearAdapters() called, Then listAdapters() no longer includes it', () => {
      registerAdapter('to-be-cleared', MockAdapter);
      expect(listAdapters()).toContain('to-be-cleared');

      clearAdapters();
      expect(listAdapters()).not.toContain('to-be-cleared');
    });

    it('Given clearAdapters() called, When listAdapters() called, Then still includes "file"', () => {
      registerAdapter('temp', MockAdapter);
      clearAdapters();
      expect(listAdapters()).toContain('file');
    });

    it('Given clearAdapters() called, When registerAdapter called again with same name, Then succeeds (no residual state)', () => {
      registerAdapter('reuse-name', MockAdapter);
      clearAdapters();
      expect(() => registerAdapter('reuse-name', MockAdapter)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // listAdapters() boundary
  // -------------------------------------------------------------------------

  describe('listAdapters() with zero or many registrations (AC-S4-6)', () => {
    it('Given no third-party adapters registered, When listAdapters() called, Then returns array containing exactly "file"', () => {
      const names = listAdapters();
      expect(names).toContain('file');
      // No other entries besides 'file' when registry is clear
      expect(names.filter((n: string) => n !== 'file')).toHaveLength(0);
    });

    it('Given multiple adapters registered, When listAdapters() called, Then all names present', () => {
      registerAdapter('alpha', MockAdapter);
      registerAdapter('beta', AnotherMockAdapter);
      const names = listAdapters();
      expect(names).toContain('file');
      expect(names).toContain('alpha');
      expect(names).toContain('beta');
    });

    it('Given listAdapters() called, Then returns a new array (mutation does not affect registry)', () => {
      registerAdapter('immut-test', MockAdapter);
      const names1 = listAdapters();
      names1.push('injected');
      const names2 = listAdapters();
      expect(names2).not.toContain('injected');
    });
  });

  // -------------------------------------------------------------------------
  // getAdapter() case sensitivity for registered names (AC-S4-2)
  // -------------------------------------------------------------------------

  describe('getAdapter() env var case matching for registered adapters', () => {
    it('Given adapter registered as "Postgres", When MG_STORAGE_ADAPTER=Postgres, Then instantiated', async () => {
      registerAdapter('Postgres', MockAdapter);
      process.env.MG_STORAGE_ADAPTER = 'Postgres';
      const adapter = await getAdapter();
      expect(adapter).toBeInstanceOf(MockAdapter);
      await adapter.close();
    });

    it('Given adapter registered as "postgres" (lower), When MG_STORAGE_ADAPTER=POSTGRES (upper), Then throws because registry is case-sensitive', async () => {
      registerAdapter('postgres', MockAdapter);
      process.env.MG_STORAGE_ADAPTER = 'POSTGRES';
      // Registry lookup is case-sensitive: 'POSTGRES' does not match 'postgres'.
      await expect(getAdapter()).rejects.toThrow(/Unknown adapter type/);
    });
  });
});

// ===========================================================================
// GOLDEN PATH
// ===========================================================================

describe('registerAdapter() — GOLDEN PATH', () => {
  beforeEach(() => {
    saveEnv();
    clearAdapters();
  });

  afterEach(() => {
    restoreEnv();
    clearAdapters();
  });

  // -------------------------------------------------------------------------
  // AC-S4-1: registerAdapter exists and is exported
  // -------------------------------------------------------------------------

  describe('registerAdapter is exported and callable (AC-S4-1)', () => {
    it('Given a valid name and class, When registerAdapter called, Then does not throw', () => {
      expect(() => registerAdapter('mock', MockAdapter)).not.toThrow();
    });

    it('Given registerAdapter called, When listAdapters() called, Then name appears in list', () => {
      registerAdapter('mybackend', MockAdapter);
      expect(listAdapters()).toContain('mybackend');
    });
  });

  // -------------------------------------------------------------------------
  // AC-S4-2: getAdapter() returns registered adapter when env var matches
  // -------------------------------------------------------------------------

  describe('getAdapter() returns registered adapter on env var match (AC-S4-2)', () => {
    it('Given postgres registered, When MG_STORAGE_ADAPTER=postgres, Then getAdapter returns PostgresAdapter instance', async () => {
      registerAdapter('postgres', MockAdapter);
      process.env.MG_STORAGE_ADAPTER = 'postgres';

      const adapter = await getAdapter();
      expect(adapter).toBeInstanceOf(MockAdapter);
      await adapter.close();
    });

    it('Given custom adapter registered, When env var set to that name, Then instance returned implements StorageAdapter', async () => {
      registerAdapter('custom', MockAdapter);
      process.env.MG_STORAGE_ADAPTER = 'custom';

      const adapter = await getAdapter();
      expect(typeof adapter.read).toBe('function');
      expect(typeof adapter.write).toBe('function');
      expect(typeof adapter.query).toBe('function');
      expect(typeof adapter.delete).toBe('function');
      expect(typeof adapter.subscribe).toBe('function');
      expect(typeof adapter.publish).toBe('function');
      expect(typeof adapter.close).toBe('function');
      await adapter.close();
    });

    it('Given adapter registered, When getAdapter() called multiple times with same env, Then each call returns a new instance', async () => {
      registerAdapter('multi-instance', MockAdapter);
      process.env.MG_STORAGE_ADAPTER = 'multi-instance';

      const a1 = await getAdapter();
      const a2 = await getAdapter();
      expect(a1).not.toBe(a2);
      await a1.close();
      await a2.close();
    });
  });

  // -------------------------------------------------------------------------
  // AC-S4-5: Error message for unknown adapter lists registered names
  // -------------------------------------------------------------------------

  describe('getAdapter() error lists known adapters (AC-S4-5)', () => {
    it('Given adapters "alpha" and "beta" registered, When unknown env var set, Then error lists both', async () => {
      registerAdapter('alpha', MockAdapter);
      registerAdapter('beta', AnotherMockAdapter);
      process.env.MG_STORAGE_ADAPTER = 'unknown';

      try {
        await getAdapter();
        // Should not reach here
        expect.fail('Expected getAdapter() to throw');
      } catch (err: any) {
        expect(err.message).toMatch(/alpha/);
        expect(err.message).toMatch(/beta/);
      }
    });

    it('Given no third-party adapters registered, When unknown env var set, Then error still mentions "file"', async () => {
      process.env.MG_STORAGE_ADAPTER = 'ghost';
      await expect(getAdapter()).rejects.toThrow(/file/i);
    });
  });

  // -------------------------------------------------------------------------
  // AC-S4-6: listAdapters() always includes 'file'
  // -------------------------------------------------------------------------

  describe('listAdapters() always includes built-in "file" (AC-S4-6)', () => {
    it('Given fresh registry, When listAdapters() called, Then "file" is in the list', () => {
      expect(listAdapters()).toContain('file');
    });

    it('Given several adapters registered, When listAdapters() called, Then "file" is still present', () => {
      registerAdapter('a', MockAdapter);
      registerAdapter('b', AnotherMockAdapter);
      expect(listAdapters()).toContain('file');
    });

    it('Given listAdapters() called, Then returned value is an array of strings', () => {
      registerAdapter('strcheck', MockAdapter);
      const names = listAdapters();
      expect(Array.isArray(names)).toBe(true);
      expect(names.every((n: any) => typeof n === 'string')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // AC-S4-7: Singleton — registrations persist across getAdapter() calls
  // -------------------------------------------------------------------------

  describe('Registry is a module-level singleton (AC-S4-7)', () => {
    it('Given adapter registered, When getAdapter() called three times, Then registration persists for all calls', async () => {
      registerAdapter('singleton-test', MockAdapter);
      process.env.MG_STORAGE_ADAPTER = 'singleton-test';

      for (let i = 0; i < 3; i++) {
        const adapter = await getAdapter();
        expect(adapter).toBeInstanceOf(MockAdapter);
        await adapter.close();
      }
    });

    it('Given adapter registered in one logical call site, When env var changed back to file, Then file still works', async () => {
      registerAdapter('sideeffect', MockAdapter);

      process.env.MG_STORAGE_ADAPTER = 'sideeffect';
      const a1 = await getAdapter();
      expect(a1).toBeInstanceOf(MockAdapter);
      await a1.close();

      // Switch back to file
      process.env.MG_STORAGE_ADAPTER = 'file';
      const { FileAdapter } = await import('../../../../src/memory/adapters/file-adapter');
      const a2 = await getAdapter();
      expect(a2).toBeInstanceOf(FileAdapter);
      await a2.close();
    });

    it('Given two different adapters registered, When env var alternated, Then correct class returned each time', async () => {
      registerAdapter('aa', MockAdapter);
      registerAdapter('bb', AnotherMockAdapter);

      process.env.MG_STORAGE_ADAPTER = 'aa';
      const aa = await getAdapter();
      expect(aa).toBeInstanceOf(MockAdapter);
      await aa.close();

      process.env.MG_STORAGE_ADAPTER = 'bb';
      const bb = await getAdapter();
      expect(bb).toBeInstanceOf(AnotherMockAdapter);
      await bb.close();
    });
  });

  // -------------------------------------------------------------------------
  // AC-S4-8: clearAdapters() exported for test use
  // -------------------------------------------------------------------------

  describe('clearAdapters() is exported and functional for test isolation (AC-S4-8)', () => {
    it('Given clearAdapters exported, When called, Then does not throw', () => {
      expect(() => clearAdapters()).not.toThrow();
    });

    it('Given adapter registered, When clearAdapters then re-registered, Then getAdapter works for re-registered', async () => {
      registerAdapter('cycle', MockAdapter);
      clearAdapters();
      registerAdapter('cycle', MockAdapter);

      process.env.MG_STORAGE_ADAPTER = 'cycle';
      const adapter = await getAdapter();
      expect(adapter).toBeInstanceOf(MockAdapter);
      await adapter.close();
    });
  });

  // -------------------------------------------------------------------------
  // Enterprise integration pattern (documents the intended usage)
  // -------------------------------------------------------------------------

  describe('Enterprise integration pattern — full plugin boundary (AC-S4-1 through AC-S4-8)', () => {
    it('Given premium package registers PostgresAdapter, When MG_STORAGE_ADAPTER=postgres, Then factory returns postgres instance', async () => {
      // Simulates what mg-premium's entry point does at import time:
      //   import { registerAdapter } from 'miniature-guacamole/memory/adapters/registry';
      //   import { PostgresAdapter } from '@rivermark/mg-premium';
      //   registerAdapter('postgres', PostgresAdapter);

      registerAdapter('postgres', MockAdapter); // MockAdapter stands in for PostgresAdapter

      process.env.MG_STORAGE_ADAPTER = 'postgres';
      const adapter = await getAdapter();

      expect(adapter).toBeInstanceOf(MockAdapter);
      expect(typeof adapter.read).toBe('function');
      expect(typeof adapter.write).toBe('function');
      expect(typeof adapter.close).toBe('function');

      await adapter.close();
    });

    it('Given premium registers adapter, When listAdapters() called, Then "postgres" visible alongside "file"', () => {
      registerAdapter('postgres', MockAdapter);
      const names = listAdapters();
      expect(names).toContain('file');
      expect(names).toContain('postgres');
    });

    it('Given OSS source is not modified, When premium adapter registered, Then file adapter still works', async () => {
      registerAdapter('postgres', MockAdapter);

      delete process.env.MG_STORAGE_ADAPTER;
      const { FileAdapter } = await import('../../../../src/memory/adapters/file-adapter');
      const adapter = await getAdapter();
      expect(adapter).toBeInstanceOf(FileAdapter);
      await adapter.close();
    });
  });
});
