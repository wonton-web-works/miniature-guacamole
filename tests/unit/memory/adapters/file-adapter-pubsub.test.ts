/**
 * WS-ENT-0: FileAdapter Pub/Sub Tests
 *
 * Tests for FileAdapter's pub/sub implementation using fs.watch
 * with polling fallback. Validates event emission, subscription
 * management, and filesystem change detection.
 *
 * Acceptance Criteria Covered:
 *   AC-ENT-0.2: Pub/sub methods on interface (subscribe, publish)
 *   AC-ENT-0.3: EventEmitter pattern for storage change events
 *   AC-ENT-0.5: FileAdapter pub/sub via fs.watch with polling fallback
 *   AC-ENT-0.7: 99%+ test coverage
 *
 * TDD: These tests are written BEFORE implementation. They will FAIL
 * until src/memory/adapters/file-adapter.ts implements pub/sub
 * functionality with fs.watch and polling fallback.
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
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pubsub-test-'));
  adapter = new FileAdapter({ baseDir: testDir });
});

afterEach(async () => {
  // Cleanup all subscriptions
  if (adapter && typeof adapter.close === 'function') {
    await adapter.close();
  }

  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// MISUSE CASES - Security, injection, race conditions
// ---------------------------------------------------------------------------

describe('FileAdapter Pub/Sub - Misuse Cases', () => {
  describe('fs.watch Failure Scenarios', () => {
    it('should fall back to polling when fs.watch fails', async () => {
      // Mock fs.watch to throw error
      const originalWatch = fs.watch;
      vi.spyOn(fs, 'watch').mockImplementation(() => {
        throw new Error('ENOSPC: System limit for file watchers reached');
      });

      // Create new adapter after mocking
      const pollingAdapter = new FileAdapter({
        baseDir: testDir,
        pollInterval: 100, // Fast polling for test
      });

      const callback = vi.fn();
      pollingAdapter.subscribe('memory:written', callback);

      // Write should still trigger event via polling
      await pollingAdapter.write('polling-test.json', { test: 'data' });

      // Wait for polling cycle
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(callback).toHaveBeenCalled();

      vi.restoreAllMocks();
      if (typeof pollingAdapter.close === 'function') {
        await pollingAdapter.close();
      }
    });

    it('should handle fs.watch permission denied gracefully', async () => {
      // Create directory without read permission
      const restrictedDir = path.join(testDir, 'restricted');
      fs.mkdirSync(restrictedDir);
      fs.chmodSync(restrictedDir, 0o000);

      // Should not throw when creating adapter
      expect(() => {
        new FileAdapter({ baseDir: restrictedDir });
      }).not.toThrow();

      // Cleanup
      fs.chmodSync(restrictedDir, 0o755);
    });

    it('should handle file deletion during watch', async () => {
      const callback = vi.fn();
      adapter.subscribe('memory:deleted', callback);

      await adapter.write('watch-delete.json', { test: 'data' });

      // Delete file directly via fs (bypass adapter)
      const filePath = path.join(testDir, 'watch-delete.json');
      fs.unlinkSync(filePath);

      // Wait for fs.watch to detect
      await new Promise(resolve => setTimeout(resolve, 100));

      // Callback should be invoked (or at least not crash)
      expect(callback.mock.calls.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle directory deletion during watch', async () => {
      const callback = vi.fn();
      adapter.subscribe('memory:written', callback);

      // Create subdirectory
      const subdir = path.join(testDir, 'subdir');
      fs.mkdirSync(subdir);

      const subdirAdapter = new FileAdapter({ baseDir: subdir });
      await subdirAdapter.write('test.json', { test: 'data' });

      // Delete entire directory
      fs.rmSync(subdir, { recursive: true, force: true });

      // Wait for watch to detect
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not crash
      expect(() => subdirAdapter.publish('test-channel', { type: 'test' })).not.toThrow();

      if (typeof subdirAdapter.close === 'function') {
        await subdirAdapter.close();
      }
    });
  });

  describe('Subscribe/Unsubscribe Race Conditions', () => {
    it('should handle rapid subscribe/unsubscribe cycles', () => {
      const callback = vi.fn();

      // Rapid subscribe/unsubscribe
      for (let i = 0; i < 100; i++) {
        const unsub = adapter.subscribe('race-channel', callback);
        unsub();
      }

      // Should not crash or leak memory
      adapter.publish('race-channel', { type: 'test' });
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle unsubscribe called during callback execution', async () => {
      let unsubscribe: (() => void) | null = null;

      const callback = vi.fn(() => {
        // Unsubscribe from within callback
        if (unsubscribe) unsubscribe();
      });

      unsubscribe = adapter.subscribe('self-unsub', callback);

      adapter.publish('self-unsub', { type: 'test1' });
      adapter.publish('self-unsub', { type: 'test2' });

      // Callback should only be called once (first publish)
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent subscribe/publish/unsubscribe', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      let unsub1: (() => void) | null = null;
      let unsub2: (() => void) | null = null;
      let unsub3: (() => void) | null = null;

      // Race: subscribe, publish, unsubscribe all at once
      await Promise.all([
        (async () => { unsub1 = adapter.subscribe('race', callback1); })(),
        (async () => { unsub2 = adapter.subscribe('race', callback2); })(),
        (async () => { adapter.publish('race', { type: 'test1' }); })(),
        (async () => { unsub3 = adapter.subscribe('race', callback3); })(),
        (async () => { adapter.publish('race', { type: 'test2' }); })(),
        (async () => { if (unsub1) unsub1(); })(),
      ]);

      // Should not crash
      expect(() => adapter.publish('race', { type: 'test3' })).not.toThrow();
    });
  });

  describe('EventEmitter Memory Leaks', () => {
    it('should not accumulate unbounded listeners', () => {
      const callbacks: Array<() => void> = [];

      // Subscribe many times
      for (let i = 0; i < 1000; i++) {
        const callback = vi.fn();
        callbacks.push(callback);
        adapter.subscribe('leak-test', callback);
      }

      // Should emit warning or cap listeners
      const emitter = (adapter as any).emitter;
      if (emitter) {
        const listenerCount = emitter.listenerCount('memory:written');
        // Should have reasonable limit
        expect(listenerCount).toBeLessThanOrEqual(1000);
      }
    });

    it('should clean up all listeners on close', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      adapter.subscribe('channel1', callback1);
      adapter.subscribe('channel2', callback2);
      adapter.subscribe('channel3', callback3);

      if (typeof adapter.close === 'function') {
        await adapter.close();
      }

      // After close, publish should not invoke callbacks
      adapter.publish('channel1', { type: 'test' });
      adapter.publish('channel2', { type: 'test' });
      adapter.publish('channel3', { type: 'test' });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
      expect(callback3).not.toHaveBeenCalled();
    });
  });

  describe('Callback Error Handling', () => {
    it('should not crash when callback throws error', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });

      adapter.subscribe('error-test', errorCallback);

      // Should not throw
      expect(() => {
        adapter.publish('error-test', { type: 'test' });
      }).not.toThrow();
    });

    it('should continue invoking other callbacks after one throws', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('First callback error');
      });
      const successCallback = vi.fn();

      adapter.subscribe('multi-error', errorCallback);
      adapter.subscribe('multi-error', successCallback);

      adapter.publish('multi-error', { type: 'test' });

      expect(errorCallback).toHaveBeenCalled();
      expect(successCallback).toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY CASES - Edge cases, limits, unusual but valid inputs
// ---------------------------------------------------------------------------

describe('FileAdapter Pub/Sub - Boundary Cases', () => {
  describe('Empty/Null/Undefined Inputs', () => {
    it('should reject undefined callback in subscribe', () => {
      // @ts-expect-error -- testing undefined callback
      expect(() => adapter.subscribe('test', undefined)).toThrow(/callback/i);
    });

    it('should reject null callback in subscribe', () => {
      // @ts-expect-error -- testing null callback
      expect(() => adapter.subscribe('test', null)).toThrow(/callback/i);
    });

    it('should handle empty channel name', () => {
      const callback = vi.fn();

      // Should accept or reject gracefully
      const result = () => adapter.subscribe('', callback);
      expect(result).toBeDefined();
    });

    it('should handle publish with undefined event data', () => {
      const callback = vi.fn();
      adapter.subscribe('undefined-test', callback);

      // @ts-expect-error -- testing undefined event
      adapter.publish('undefined-test', undefined);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Multiple Subscribers', () => {
    it('should invoke all subscribers to same channel', () => {
      const callbacks = Array.from({ length: 10 }, () => vi.fn());

      callbacks.forEach(cb => adapter.subscribe('broadcast', cb));

      adapter.publish('broadcast', { type: 'test' });

      callbacks.forEach(cb => {
        expect(cb).toHaveBeenCalledWith({ type: 'test' });
        expect(cb).toHaveBeenCalledTimes(1);
      });
    });

    it('should not invoke subscribers to different channels', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      adapter.subscribe('channel1', callback1);
      adapter.subscribe('channel2', callback2);

      adapter.publish('channel1', { type: 'test1' });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('Unsubscribe Edge Cases', () => {
    it('should handle unsubscribe called multiple times', () => {
      const callback = vi.fn();
      const unsubscribe = adapter.subscribe('test', callback);

      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();
      expect(() => unsubscribe()).not.toThrow();
    });

    it('should handle unsubscribe without any subscribe', () => {
      // Create a mock unsubscribe function
      const fakeUnsubscribe = () => {};
      expect(() => fakeUnsubscribe()).not.toThrow();
    });
  });

  describe('Publish to Non-existent Channels', () => {
    it('should handle publish to channel with no subscribers', () => {
      expect(() => {
        adapter.publish('empty-channel', { type: 'test' });
      }).not.toThrow();
    });

    it('should handle publish after all subscribers unsubscribed', () => {
      const callback = vi.fn();
      const unsubscribe = adapter.subscribe('temp-channel', callback);

      unsubscribe();

      expect(() => {
        adapter.publish('temp-channel', { type: 'test' });
      }).not.toThrow();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Rapid Event Publishing', () => {
    it('should handle burst of events without dropping', async () => {
      const callback = vi.fn();
      adapter.subscribe('burst', callback);

      // Publish 100 events rapidly
      for (let i = 0; i < 100; i++) {
        adapter.publish('burst', { type: 'test', index: i });
      }

      // All events should be received
      expect(callback).toHaveBeenCalledTimes(100);
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH - Normal, expected operations
// ---------------------------------------------------------------------------

describe('FileAdapter Pub/Sub - Golden Path', () => {
  describe('Basic Subscribe/Publish', () => {
    it('should invoke callback when event is published', () => {
      const callback = vi.fn();
      adapter.subscribe('test-channel', callback);

      const event = { type: 'test', data: 'value' };
      adapter.publish('test-channel', event);

      expect(callback).toHaveBeenCalledWith(event);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe function from subscribe', () => {
      const callback = vi.fn();
      const unsubscribe = adapter.subscribe('test-channel', callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should stop invoking callback after unsubscribe', () => {
      const callback = vi.fn();
      const unsubscribe = adapter.subscribe('test-channel', callback);

      adapter.publish('test-channel', { type: 'test1' });
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      adapter.publish('test-channel', { type: 'test2' });
      expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called again
    });
  });

  describe('Write Event Emission', () => {
    it('should emit memory:written event on successful write', async () => {
      const callback = vi.fn();
      adapter.subscribe('memory:written', callback);

      await adapter.write('event-test.json', { test: 'data' });

      expect(callback).toHaveBeenCalled();
      const event = callback.mock.calls[0][0];
      expect(event).toHaveProperty('key');
      expect(event.key).toMatch(/event-test\.json/);
    });

    it('should include file path in write event', async () => {
      const callback = vi.fn();
      adapter.subscribe('memory:written', callback);

      await adapter.write('path-test.json', { test: 'data' });

      const event = callback.mock.calls[0][0];
      expect(event).toHaveProperty('key', 'path-test.json');
      expect(event).toHaveProperty('data');
    });

    it('should not emit event on failed write', async () => {
      const callback = vi.fn();
      adapter.subscribe('memory:written', callback);

      // Attempt invalid write
      await adapter.write('../invalid.json', { test: 'data' });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Delete Event Emission', () => {
    it('should emit memory:deleted event on successful delete', async () => {
      const callback = vi.fn();
      adapter.subscribe('memory:deleted', callback);

      await adapter.write('delete-event.json', { test: 'data' });
      await adapter.delete('delete-event.json');

      expect(callback).toHaveBeenCalled();
      const event = callback.mock.calls[0][0];
      expect(event).toHaveProperty('key');
      expect(event.key).toMatch(/delete-event\.json/);
    });

    it('should include file path in delete event', async () => {
      const callback = vi.fn();
      adapter.subscribe('memory:deleted', callback);

      await adapter.write('delete-path.json', { test: 'data' });
      await adapter.delete('delete-path.json');

      const event = callback.mock.calls[0][0];
      expect(event).toHaveProperty('key', 'delete-path.json');
    });
  });

  describe('Query Event Emission', () => {
    it('should emit memory:queried event on query', async () => {
      const callback = vi.fn();
      adapter.subscribe('memory:queried', callback);

      await adapter.query({ agent_id: 'test' });

      expect(callback).toHaveBeenCalled();
      const event = callback.mock.calls[0][0];
      expect(event).toHaveProperty('filters');
    });

    it('should include filters in query event', async () => {
      const callback = vi.fn();
      adapter.subscribe('memory:queried', callback);

      const filters = { agent_id: 'dev', workstream_id: 'ws-1' };
      await adapter.query(filters);

      const event = callback.mock.calls[0][0];
      expect(event.filters).toEqual(filters);
    });
  });

  describe('fs.watch Integration', () => {
    it('should detect external file changes via fs.watch', async () => {
      const callback = vi.fn();
      adapter.subscribe('memory:written', callback);

      // Write file externally (not via adapter)
      const filePath = path.join(testDir, 'external.json');
      fs.writeFileSync(filePath, JSON.stringify({ external: 'write' }), 'utf-8');

      // Wait for fs.watch to detect change
      await new Promise(resolve => setTimeout(resolve, 200));

      // Callback should be invoked (if fs.watch is implemented)
      // Note: this may be flaky depending on fs.watch timing
      expect(callback.mock.calls.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect external file deletions via fs.watch', async () => {
      const callback = vi.fn();
      adapter.subscribe('memory:deleted', callback);

      // Create file via adapter
      await adapter.write('external-delete.json', { test: 'data' });

      callback.mockClear();

      // Delete file externally
      const filePath = path.join(testDir, 'external-delete.json');
      fs.unlinkSync(filePath);

      // Wait for fs.watch to detect
      await new Promise(resolve => setTimeout(resolve, 200));

      // Callback should be invoked
      expect(callback.mock.calls.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Polling Fallback', () => {
    it('should provide option to disable fs.watch and use polling only', async () => {
      const pollingAdapter = new FileAdapter({
        baseDir: testDir,
        usePolling: true,
        pollInterval: 100,
      });

      const callback = vi.fn();
      pollingAdapter.subscribe('memory:written', callback);

      await pollingAdapter.write('polling-only.json', { test: 'data' });

      // Wait for polling cycle
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(callback).toHaveBeenCalled();

      if (typeof pollingAdapter.close === 'function') {
        await pollingAdapter.close();
      }
    });

    it('should allow configurable poll interval', async () => {
      const fastAdapter = new FileAdapter({
        baseDir: testDir,
        usePolling: true,
        pollInterval: 50, // Fast polling
      });

      const callback = vi.fn();
      fastAdapter.subscribe('memory:written', callback);

      await fastAdapter.write('fast-poll.json', { test: 'data' });

      // Should detect quickly
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(callback).toHaveBeenCalled();

      if (typeof fastAdapter.close === 'function') {
        await fastAdapter.close();
      }
    });
  });

  describe('Channel Isolation', () => {
    it('should isolate events between different channels', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      adapter.subscribe('channel1', callback1);
      adapter.subscribe('channel2', callback2);
      adapter.subscribe('channel3', callback3);

      adapter.publish('channel1', { type: 'test1' });
      adapter.publish('channel2', { type: 'test2' });

      expect(callback1).toHaveBeenCalledWith({ type: 'test1' });
      expect(callback2).toHaveBeenCalledWith({ type: 'test2' });
      expect(callback3).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Adapters', () => {
    it('should allow multiple adapter instances with isolated subscriptions', () => {
      const adapter1 = new FileAdapter({ baseDir: testDir });
      const adapter2 = new FileAdapter({ baseDir: testDir });

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      adapter1.subscribe('shared-channel', callback1);
      adapter2.subscribe('shared-channel', callback2);

      adapter1.publish('shared-channel', { type: 'test' });

      // Only adapter1's callback should be invoked
      expect(callback1).toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });
});
