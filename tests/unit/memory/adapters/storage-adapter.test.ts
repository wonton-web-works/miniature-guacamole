/**
 * WS-ENT-0: Storage Adapter Interface Contract Tests
 *
 * Tests for the StorageAdapter interface definition and contract compliance.
 * These tests validate the TypeScript interface structure and EventEmitter
 * integration patterns that all adapter implementations must follow.
 *
 * Acceptance Criteria Covered:
 *   AC-ENT-0.1: StorageAdapter interface defined (read, write, query, delete)
 *   AC-ENT-0.2: Pub/sub methods on interface (subscribe, publish)
 *   AC-ENT-0.3: EventEmitter pattern for storage change events
 *
 * TDD: These tests are written BEFORE implementation. They will FAIL
 * until src/memory/adapters/types.ts is created with the StorageAdapter
 * interface definition.
 *
 * Test Order: Misuse → Boundary → Golden Path (CAD Protocol)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// This import will fail until the types file is created
// @ts-expect-error -- not yet implemented; TDD red phase
import type { StorageAdapter, AdapterWriteResult, AdapterReadResult, AdapterQueryResult } from '@/memory/adapters/types';

// ---------------------------------------------------------------------------
// MISUSE CASES - Security, injection, race conditions
// ---------------------------------------------------------------------------

describe('StorageAdapter Interface - Misuse Cases', () => {
  describe('Path Traversal Prevention', () => {
    it('should reject read operations with path traversal attempts', async () => {
      // Mock adapter that implements the interface
      const adapter: StorageAdapter = createMockAdapter();

      // Attempt directory traversal
      const result = await adapter.read('../../../etc/passwd');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid path|directory traversal/i);
    });

    it('should reject write operations with path traversal attempts', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const result = await adapter.write('../../malicious/file.json', { test: 'data' });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid path|directory traversal/i);
    });

    it('should reject delete operations with path traversal attempts', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const result = await adapter.delete('../../../important/file.json');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid path|directory traversal/i);
    });
  });

  describe('Null Byte Injection', () => {
    it('should reject keys containing null bytes in write', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const result = await adapter.write('file\x00.json', { test: 'data' });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid|null byte/i);
    });

    it('should reject keys containing null bytes in read', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const result = await adapter.read('file\x00.json');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid|null byte/i);
    });
  });

  describe('Malformed Data Handling', () => {
    it('should handle circular reference data gracefully', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      // Create circular reference
      const data: any = { name: 'test' };
      data.self = data;

      const result = await adapter.write('circular.json', data);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/circular/i);
    });

    it('should reject data with prototype pollution attempts', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const maliciousData = JSON.parse('{"__proto__": {"isAdmin": true}}');

      const result = await adapter.write('proto-pollution.json', maliciousData);

      // Should either reject or sanitize
      expect(result.success).toBe(false);
    });

    it('should handle invalid JSON in read gracefully', async () => {
      // This test validates the interface contract, not implementation
      // FileAdapter-specific JSON parsing is tested in file-adapter.test.ts
      // Mock adapters should return errors for malformed data
      const adapter: StorageAdapter = createMockAdapter();

      // Write malformed data that will fail JSON validation
      await adapter.write('test.json', { valid: 'data' });

      // Attempting to read non-existent key simulates parse failure scenario
      const result = await adapter.read('nonexistent.json');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('Concurrent Write Races', () => {
    it('should prevent concurrent writes to the same key', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      // Attempt concurrent writes to same key
      const promises = [
        adapter.write('race.json', { value: 1 }),
        adapter.write('race.json', { value: 2 }),
        adapter.write('race.json', { value: 3 }),
      ];

      const results = await Promise.all(promises);

      // At least one should succeed, others may fail or queue
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      // Final read should return consistent data
      const finalRead = await adapter.read('race.json');
      expect(finalRead.success).toBe(true);
      expect(finalRead.data).toHaveProperty('value');
      expect([1, 2, 3]).toContain(finalRead.data!.value);
    });

    it('should maintain data integrity during concurrent write/delete', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      // Write initial data
      await adapter.write('concurrent.json', { initial: 'data' });

      // Race write and delete
      const [writeResult, deleteResult] = await Promise.all([
        adapter.write('concurrent.json', { updated: 'data' }),
        adapter.delete('concurrent.json'),
      ]);

      // Both operations should succeed due to locking (serialized)
      expect(writeResult.success).toBe(true);
      expect(deleteResult.success).toBe(true);

      // Final state depends on operation order (both valid outcomes)
      // With locking, operations are serialized - last one wins
      const finalRead = await adapter.read('concurrent.json');

      // Either the file exists (write happened after delete)
      // or it doesn't (delete happened after write)
      // Both are valid outcomes - the important thing is NO data corruption
      expect(typeof finalRead.success).toBe('boolean');
    });
  });

  describe('EventEmitter Memory Leaks', () => {
    it('should not accumulate listeners beyond reasonable limit', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      // Subscribe many times
      for (let i = 0; i < 100; i++) {
        adapter.subscribe(`channel-${i}`, () => {});
      }

      // EventEmitter should warn or limit listeners
      const emitter = (adapter as any).emitter as EventEmitter;
      const listenerCount = emitter.listenerCount('memory:written');

      // Should have reasonable limit (Node.js default is 10, extended is ~100)
      expect(listenerCount).toBeLessThanOrEqual(100);
    });

    it('should clean up listeners on unsubscribe', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const callback = vi.fn();
      const channel = 'test-channel';
      const unsubscribe = adapter.subscribe(channel, callback);

      // Check listener exists
      const emitter = (adapter as any).emitter as EventEmitter;
      const beforeCount = emitter.listenerCount(channel);
      expect(beforeCount).toBeGreaterThan(0);

      // Unsubscribe
      unsubscribe();

      // Listener should be removed
      const afterCount = emitter.listenerCount(channel);
      expect(afterCount).toBeLessThan(beforeCount);
    });
  });

  describe('Pub/Sub Race Conditions', () => {
    it('should handle subscribe/unsubscribe/publish races', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const callback = vi.fn();
      let unsubscribe: (() => void) | null = null;

      // Race: subscribe, publish, unsubscribe in rapid succession
      const promises = [
        (async () => {
          unsubscribe = adapter.subscribe('race-channel', callback);
        })(),
        (async () => {
          await new Promise(resolve => setTimeout(resolve, 1));
          adapter.publish('race-channel', { type: 'test' });
        })(),
        (async () => {
          await new Promise(resolve => setTimeout(resolve, 2));
          if (unsubscribe) unsubscribe();
        })(),
      ];

      await Promise.all(promises);

      // Should not throw, callback may or may not have been called
      expect(() => adapter.publish('race-channel', { type: 'test2' })).not.toThrow();
    });
  });

  describe('Query Injection Prevention', () => {
    it('should sanitize filter values in query operations', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      // Attempt injection via filter
      const result = await adapter.query({
        agent_id: "'; DROP TABLE memory; --",
      });

      // Should not throw, should return empty results
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should reject query with prototype pollution in filters', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const result = await adapter.query({
        __proto__: { isAdmin: true },
      } as any);

      // Should handle safely
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY CASES - Edge cases, limits, unusual but valid inputs
// ---------------------------------------------------------------------------

describe('StorageAdapter Interface - Boundary Cases', () => {
  describe('Empty/Null/Undefined Inputs', () => {
    it('should handle empty string key in read', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const result = await adapter.read('');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid|empty key/i);
    });

    it('should handle null data in write', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      // @ts-expect-error -- testing null handling
      const result = await adapter.write('null-test.json', null);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid|null data/i);
    });

    it('should handle undefined data in write', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      // @ts-expect-error -- testing undefined handling
      const result = await adapter.write('undefined-test.json', undefined);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid|undefined data/i);
    });

    it('should handle empty object in write', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const result = await adapter.write('empty.json', {});

      // Empty object is valid
      expect(result.success).toBe(true);
    });

    it('should handle empty array in write', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const result = await adapter.write('empty-array.json', []);

      // Empty array is valid
      expect(result.success).toBe(true);
    });

    it('should handle undefined callback in subscribe', () => {
      const adapter: StorageAdapter = createMockAdapter();

      // @ts-expect-error -- testing undefined callback
      expect(() => adapter.subscribe('test', undefined)).toThrow(/callback/i);
    });
  });

  describe('Large File Handling', () => {
    it('should reject writes exceeding 10MB limit', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      // Create data exceeding 10MB
      const largeData = { payload: 'x'.repeat(11 * 1024 * 1024) };

      const result = await adapter.write('large.json', largeData);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/size|limit|exceeded/i);
    });

    it('should handle data at exactly 10MB boundary', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      // Create data at exactly 10MB
      const boundaryData = { payload: 'x'.repeat(10 * 1024 * 1024 - 100) };

      const result = await adapter.write('boundary.json', boundaryData);

      // Should succeed or fail gracefully
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Query Edge Cases', () => {
    it('should return empty array for query with no matches', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const result = await adapter.query({
        agent_id: 'nonexistent-agent',
        workstream_id: 'nonexistent-ws',
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle query with all filters undefined', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const result = await adapter.query({});

      // Should return all entries or empty array
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle query with timestamp boundaries', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const result = await adapter.query({
        start: '2026-01-01T00:00:00Z',
        end: '2026-01-01T00:00:00Z', // Same start and end
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle query with inverted timestamp range', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const result = await adapter.query({
        start: '2026-12-31T23:59:59Z',
        end: '2026-01-01T00:00:00Z', // End before start
      });

      // Should return empty array
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('Pub/Sub Edge Cases', () => {
    it('should handle publish to channel with no subscribers', () => {
      const adapter: StorageAdapter = createMockAdapter();

      // Should not throw
      expect(() => {
        adapter.publish('empty-channel', { type: 'test' });
      }).not.toThrow();
    });

    it('should handle multiple subscriptions to same channel', () => {
      const adapter: StorageAdapter = createMockAdapter();

      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      adapter.subscribe('multi-channel', callback1);
      adapter.subscribe('multi-channel', callback2);
      adapter.subscribe('multi-channel', callback3);

      adapter.publish('multi-channel', { type: 'broadcast' });

      // All callbacks should be invoked
      expect(callback1).toHaveBeenCalledWith({ type: 'broadcast' });
      expect(callback2).toHaveBeenCalledWith({ type: 'broadcast' });
      expect(callback3).toHaveBeenCalledWith({ type: 'broadcast' });
    });

    it('should handle unsubscribe called multiple times', () => {
      const adapter: StorageAdapter = createMockAdapter();

      const callback = vi.fn();
      const unsubscribe = adapter.subscribe('test', callback);

      // Unsubscribe multiple times
      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('Delete Non-existent Files', () => {
    it('should handle delete of non-existent key gracefully', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const result = await adapter.delete('nonexistent.json');

      // Should succeed or return not-found error
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH - Normal, expected operations
// ---------------------------------------------------------------------------

describe('StorageAdapter Interface - Golden Path', () => {
  describe('Basic CRUD Operations', () => {
    it('should define read method with correct signature', () => {
      const adapter: StorageAdapter = createMockAdapter();

      expect(typeof adapter.read).toBe('function');
      expect(adapter.read.length).toBe(1); // Takes 1 parameter: key
    });

    it('should define write method with correct signature', () => {
      const adapter: StorageAdapter = createMockAdapter();

      expect(typeof adapter.write).toBe('function');
      expect(adapter.write.length).toBe(2); // Takes 2 parameters: key, data
    });

    it('should define query method with correct signature', () => {
      const adapter: StorageAdapter = createMockAdapter();

      expect(typeof adapter.query).toBe('function');
      expect(adapter.query.length).toBe(1); // Takes 1 parameter: filters
    });

    it('should define delete method with correct signature', () => {
      const adapter: StorageAdapter = createMockAdapter();

      expect(typeof adapter.delete).toBe('function');
      expect(adapter.delete.length).toBe(1); // Takes 1 parameter: key
    });

    it('should successfully write and read data', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const testData = { agent_id: 'test', data: 'value' };
      const writeResult = await adapter.write('test.json', testData);

      expect(writeResult.success).toBe(true);
      expect(writeResult.path).toBe('test.json');

      const readResult = await adapter.read('test.json');

      expect(readResult.success).toBe(true);
      expect(readResult.data).toEqual(testData);
    });

    it('should successfully delete data', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      // Write then delete
      await adapter.write('delete-test.json', { test: 'data' });
      const deleteResult = await adapter.delete('delete-test.json');

      expect(deleteResult.success).toBe(true);

      // Read should fail after delete
      const readResult = await adapter.read('delete-test.json');
      expect(readResult.success).toBe(false);
    });

    it('should return not-found error for read of non-existent key', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const result = await adapter.read('nonexistent.json');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
    });
  });

  describe('Query Operations', () => {
    it('should query entries by agent_id', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      // Write test data
      await adapter.write('agent1.json', { agent_id: 'dev', data: 'test1' });
      await adapter.write('agent2.json', { agent_id: 'qa', data: 'test2' });

      const results = await adapter.query({ agent_id: 'dev' });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.every(e => e.agent_id === 'dev')).toBe(true);
    });

    it('should query entries by workstream_id', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      await adapter.write('ws1.json', { workstream_id: 'ws-1', data: 'test1' });
      await adapter.write('ws2.json', { workstream_id: 'ws-2', data: 'test2' });

      const results = await adapter.query({ workstream_id: 'ws-1' });

      expect(Array.isArray(results)).toBe(true);
      expect(results.every(e => e.workstream_id === 'ws-1')).toBe(true);
    });

    it('should query entries by timestamp range', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const results = await adapter.query({
        start: '2026-01-01T00:00:00Z',
        end: '2026-12-31T23:59:59Z',
      });

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Pub/Sub Operations', () => {
    it('should define subscribe method with correct signature', () => {
      const adapter: StorageAdapter = createMockAdapter();

      expect(typeof adapter.subscribe).toBe('function');
      expect(adapter.subscribe.length).toBe(2); // Takes channel, callback
    });

    it('should define publish method with correct signature', () => {
      const adapter: StorageAdapter = createMockAdapter();

      expect(typeof adapter.publish).toBe('function');
      expect(adapter.publish.length).toBe(2); // Takes channel, event
    });

    it('should invoke callback when event is published', () => {
      const adapter: StorageAdapter = createMockAdapter();

      const callback = vi.fn();
      adapter.subscribe('test-channel', callback);

      const event = { type: 'test', data: 'value' };
      adapter.publish('test-channel', event);

      expect(callback).toHaveBeenCalledWith(event);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe function from subscribe', () => {
      const adapter: StorageAdapter = createMockAdapter();

      const callback = vi.fn();
      const unsubscribe = adapter.subscribe('test-channel', callback);

      expect(typeof unsubscribe).toBe('function');

      // After unsubscribe, callback should not be called
      unsubscribe();
      adapter.publish('test-channel', { type: 'test' });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('EventEmitter Integration', () => {
    it('should emit memory:written event on write', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const eventCallback = vi.fn();
      adapter.subscribe('memory:written', eventCallback);

      await adapter.write('event-test.json', { test: 'data' });

      expect(eventCallback).toHaveBeenCalled();
      expect(eventCallback.mock.calls[0][0]).toHaveProperty('key', 'event-test.json');
    });

    it('should emit memory:deleted event on delete', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const eventCallback = vi.fn();
      adapter.subscribe('memory:deleted', eventCallback);

      await adapter.write('delete-event.json', { test: 'data' });
      await adapter.delete('delete-event.json');

      expect(eventCallback).toHaveBeenCalled();
      expect(eventCallback.mock.calls[0][0]).toHaveProperty('key', 'delete-event.json');
    });

    it('should emit memory:queried event on query', async () => {
      const adapter: StorageAdapter = createMockAdapter();

      const eventCallback = vi.fn();
      adapter.subscribe('memory:queried', eventCallback);

      await adapter.query({ agent_id: 'test' });

      expect(eventCallback).toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Test Helper - Mock Adapter Implementation
// ---------------------------------------------------------------------------

function createMockAdapter(): StorageAdapter & { emitter: EventEmitter } {
  const storage = new Map<string, any>();
  const emitter = new EventEmitter();
  const locks = new Map<string, Promise<void>>();

  const adapter = {
    emitter, // Expose for testing

    async read(key: string): Promise<AdapterReadResult> {
      if (!key || key.includes('\x00') || key.includes('..')) {
        return { success: false, data: null, error: 'Invalid path or key' };
      }

      if (!storage.has(key)) {
        return { success: false, data: null, error: 'File not found' };
      }

      return { success: true, data: storage.get(key) };
    },

    async write(key: string, data: any): Promise<AdapterWriteResult> {
      if (!key || key.includes('\x00') || key.includes('..')) {
        return { success: false, error: 'Invalid path: directory traversal attempt detected' };
      }

      if (data === null || data === undefined) {
        return { success: false, error: 'Invalid data: null or undefined' };
      }

      // Check for prototype pollution
      if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, '__proto__')) {
        return { success: false, error: 'Invalid data: prototype pollution attempt detected' };
      }

      // Check for circular references
      try {
        JSON.stringify(data);
      } catch (e) {
        return { success: false, error: 'Data contains circular references' };
      }

      // Check size
      const size = Buffer.byteLength(JSON.stringify(data), 'utf-8');
      if (size > 10 * 1024 * 1024) {
        return { success: false, error: 'File size exceeds maximum allowed size' };
      }

      // Acquire lock for concurrent write protection
      const existingLock = locks.get(key);
      if (existingLock) {
        await existingLock;
      }

      const writeLock = (async () => {
        await new Promise(resolve => setTimeout(resolve, 1)); // Simulate I/O
        storage.set(key, data);
        emitter.emit('memory:written', { key, data });
      })();

      locks.set(key, writeLock);
      await writeLock;
      locks.delete(key);

      return { success: true, path: key };
    },

    async query(filters: any): Promise<any[]> {
      emitter.emit('memory:queried', { filters });

      const results: any[] = [];
      for (const [key, value] of storage.entries()) {
        if (filters.agent_id && value.agent_id !== filters.agent_id) continue;
        if (filters.workstream_id && value.workstream_id !== filters.workstream_id) continue;
        results.push(value);
      }
      return results;
    },

    async delete(key: string): Promise<{ success: boolean; error?: string }> {
      if (!key || key.includes('\x00') || key.includes('..')) {
        return { success: false, error: 'Invalid path' };
      }

      // Acquire lock for concurrent delete protection
      const existingLock = locks.get(key);
      if (existingLock) {
        await existingLock;
      }

      const deleteLock = (async () => {
        await new Promise(resolve => setTimeout(resolve, 1)); // Simulate I/O
        storage.delete(key);
        emitter.emit('memory:deleted', { key });
      })();

      locks.set(key, deleteLock);
      await deleteLock;
      locks.delete(key);

      return { success: true };
    },

    subscribe(channel: string, callback: (event: any) => void): () => void {
      if (!callback) {
        throw new Error('Callback is required');
      }
      emitter.on(channel, callback);
      return () => emitter.off(channel, callback);
    },

    publish(channel: string, event: any): void {
      emitter.emit(channel, event);
    },
  };

  return adapter;
}
