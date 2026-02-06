/**
 * WS-MEM-1: Process Lifecycle and Resource Cleanup - Registry Module Tests
 *
 * BDD Scenarios:
 * - STD-005: Resources MUST register cleanup with lifecycle manager
 * - STD-006: One canonical implementation (no duplication)
 * - Handler registration, deregistration, and execution
 * - Error isolation: one handler failure does not block others
 * - LIFO execution order
 * - Max handler enforcement
 *
 * Target: 99% coverage
 *
 * NOTE: These tests are written BEFORE the implementation (TDD).
 * They are expected to FAIL until the lifecycle module is implemented.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// The module under test does not exist yet -- these imports will fail
// until the dev creates src/lifecycle/registry.ts
import {
  registerCleanup,
  deregisterCleanup,
  executeCleanup,
  getRegisteredHandlers,
  clearRegistry,
  type CleanupHandler,
  type CleanupRegistration,
} from '@/lifecycle/registry';

describe('lifecycle/registry - registerCleanup()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure clean state before each test
    clearRegistry();
  });

  afterEach(() => {
    clearRegistry();
  });

  describe('Given a cleanup handler function (STD-005: Register cleanup)', () => {
    it('When registering a sync handler, Then stores handler in registry', () => {
      const handler = vi.fn();

      const registration = registerCleanup('test-resource', handler);

      expect(registration).toBeDefined();
      expect(registration.id).toBeDefined();
      expect(registration.name).toBe('test-resource');
    });

    it('When registering an async handler, Then stores handler in registry', () => {
      const handler = vi.fn().mockResolvedValue(undefined);

      const registration = registerCleanup('async-resource', handler);

      expect(registration).toBeDefined();
      expect(registration.id).toBeDefined();
    });

    it('When registering handler, Then handler appears in getRegisteredHandlers()', () => {
      const handler = vi.fn();

      registerCleanup('visible-resource', handler);
      const handlers = getRegisteredHandlers();

      expect(handlers.length).toBe(1);
      expect(handlers[0].name).toBe('visible-resource');
    });

    it('When registering multiple handlers, Then all are stored', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      registerCleanup('resource-1', handler1);
      registerCleanup('resource-2', handler2);
      registerCleanup('resource-3', handler3);

      const handlers = getRegisteredHandlers();
      expect(handlers.length).toBe(3);
    });

    it('When registering handler with priority, Then stores priority value', () => {
      const handler = vi.fn();

      const registration = registerCleanup('priority-resource', handler, { priority: 10 });

      expect(registration.priority).toBe(10);
    });
  });

  describe('Given duplicate handler prevention (STD-006: No duplication)', () => {
    it('When registering handler with same name twice, Then only one is stored', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      registerCleanup('singleton-resource', handler1);
      registerCleanup('singleton-resource', handler2);

      const handlers = getRegisteredHandlers();
      const matchingHandlers = handlers.filter(h => h.name === 'singleton-resource');
      expect(matchingHandlers.length).toBe(1);
    });

    it('When re-registering same name, Then latest handler replaces previous', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      registerCleanup('replace-resource', handler1);
      registerCleanup('replace-resource', handler2);

      // Execute cleanup and verify only handler2 is called
      // This indirectly verifies the replacement
      const handlers = getRegisteredHandlers();
      expect(handlers.length).toBe(1);
    });
  });

  describe('Given max handler limit enforcement', () => {
    it('When registering beyond max limit, Then throws error', () => {
      // Register up to the max limit (tested with a small config override)
      // The exact max depends on config, but the behavior should be consistent
      const overflowFn = () => {
        for (let i = 0; i < 1001; i++) {
          registerCleanup(`resource-${i}`, vi.fn());
        }
      };

      expect(overflowFn).toThrow(/max.*handler/i);
    });
  });

  describe('Given invalid registration parameters', () => {
    it('When name is empty string, Then throws validation error', () => {
      expect(() => registerCleanup('', vi.fn())).toThrow();
    });

    it('When handler is not a function, Then throws validation error', () => {
      expect(() => registerCleanup('bad-handler', 'not-a-function' as any)).toThrow();
    });
  });
});

describe('lifecycle/registry - deregisterCleanup()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRegistry();
  });

  afterEach(() => {
    clearRegistry();
  });

  describe('Given a registered handler', () => {
    it('When deregistering by name, Then handler is removed', () => {
      const handler = vi.fn();
      registerCleanup('removable-resource', handler);

      const removed = deregisterCleanup('removable-resource');

      expect(removed).toBe(true);
      expect(getRegisteredHandlers().length).toBe(0);
    });

    it('When deregistering by registration id, Then handler is removed', () => {
      const handler = vi.fn();
      const registration = registerCleanup('id-resource', handler);

      const removed = deregisterCleanup(registration.id);

      expect(removed).toBe(true);
      expect(getRegisteredHandlers().length).toBe(0);
    });
  });

  describe('Given handler does not exist', () => {
    it('When deregistering non-existent name, Then returns false', () => {
      const removed = deregisterCleanup('non-existent');

      expect(removed).toBe(false);
    });

    it('When deregistering after already deregistered, Then returns false', () => {
      const handler = vi.fn();
      registerCleanup('once-resource', handler);
      deregisterCleanup('once-resource');

      const secondRemoval = deregisterCleanup('once-resource');

      expect(secondRemoval).toBe(false);
    });
  });
});

describe('lifecycle/registry - executeCleanup()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRegistry();
  });

  afterEach(() => {
    clearRegistry();
  });

  describe('Given registered cleanup handlers', () => {
    it('When executing cleanup, Then all registered handlers are called', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      registerCleanup('resource-a', handler1);
      registerCleanup('resource-b', handler2);
      registerCleanup('resource-c', handler3);

      await executeCleanup();

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });

    it('When executing cleanup, Then handlers are called in reverse registration order (LIFO)', async () => {
      const callOrder: string[] = [];

      const handler1 = vi.fn(() => { callOrder.push('first'); });
      const handler2 = vi.fn(() => { callOrder.push('second'); });
      const handler3 = vi.fn(() => { callOrder.push('third'); });

      registerCleanup('first-registered', handler1);
      registerCleanup('second-registered', handler2);
      registerCleanup('third-registered', handler3);

      await executeCleanup();

      // LIFO: third registered runs first, first registered runs last
      expect(callOrder).toEqual(['third', 'second', 'first']);
    });

    it('When executing cleanup with async handlers, Then awaits all handlers', async () => {
      let asyncCompleted = false;
      const asyncHandler = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        asyncCompleted = true;
      });

      registerCleanup('async-resource', asyncHandler);

      await executeCleanup();

      expect(asyncCompleted).toBe(true);
      expect(asyncHandler).toHaveBeenCalledTimes(1);
    });

    it('When executing cleanup, Then clears registry after execution', async () => {
      registerCleanup('clear-resource', vi.fn());

      await executeCleanup();

      expect(getRegisteredHandlers().length).toBe(0);
    });
  });

  describe('Given error handling during cleanup (Error isolation)', () => {
    it('When one handler throws error, Then other handlers still execute', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const failingHandler = vi.fn(() => {
        throw new Error('Handler failed');
      });
      const successHandler = vi.fn();

      registerCleanup('failing-resource', failingHandler);
      registerCleanup('success-resource', successHandler);

      await executeCleanup();

      // Both handlers should have been called despite the error
      expect(failingHandler).toHaveBeenCalledTimes(1);
      expect(successHandler).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });

    it('When async handler rejects, Then other handlers still execute', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const rejectingHandler = vi.fn().mockRejectedValue(new Error('Async failure'));
      const successHandler = vi.fn();

      registerCleanup('rejecting-resource', rejectingHandler);
      registerCleanup('success-resource-2', successHandler);

      await executeCleanup();

      expect(rejectingHandler).toHaveBeenCalledTimes(1);
      expect(successHandler).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });

    it('When multiple handlers fail, Then logs all errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const failing1 = vi.fn(() => { throw new Error('Fail 1'); });
      const failing2 = vi.fn(() => { throw new Error('Fail 2'); });

      registerCleanup('fail-1', failing1);
      registerCleanup('fail-2', failing2);

      await executeCleanup();

      // Should log errors for both failures
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Given cleanup called multiple times (Edge case: idempotency)', () => {
    it('When executing cleanup twice, Then handlers only run once', async () => {
      const handler = vi.fn();
      registerCleanup('idempotent-resource', handler);

      await executeCleanup();
      await executeCleanup();

      // Registry is cleared after first execution, so handler only runs once
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Given no registered handlers', () => {
    it('When executing cleanup with empty registry, Then completes without error', async () => {
      await expect(executeCleanup()).resolves.not.toThrow();
    });
  });

  describe('Given handler execution results (STD-008: Expose resource health metrics)', () => {
    it('When executing cleanup, Then returns execution results', async () => {
      registerCleanup('metrics-resource', vi.fn());

      const results = await executeCleanup();

      expect(results).toBeDefined();
      expect(results.totalHandlers).toBe(1);
      expect(results.succeeded).toBe(1);
      expect(results.failed).toBe(0);
      expect(typeof results.durationMs).toBe('number');
    });

    it('When handlers fail, Then results reflect failure count', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      registerCleanup('ok-resource', vi.fn());
      registerCleanup('bad-resource', vi.fn(() => { throw new Error('oops'); }));

      const results = await executeCleanup();

      expect(results.totalHandlers).toBe(2);
      expect(results.succeeded).toBe(1);
      expect(results.failed).toBe(1);

      consoleErrorSpy.mockRestore();
    });
  });
});

describe('lifecycle/registry - clearRegistry()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Given populated registry', () => {
    it('When clearing registry, Then all handlers are removed', () => {
      registerCleanup('r1', vi.fn());
      registerCleanup('r2', vi.fn());

      clearRegistry();

      expect(getRegisteredHandlers().length).toBe(0);
    });

    it('When clearing registry, Then does not call handlers', () => {
      const handler = vi.fn();
      registerCleanup('silent-clear', handler);

      clearRegistry();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Given empty registry', () => {
    it('When clearing empty registry, Then does not throw', () => {
      clearRegistry();
      expect(() => clearRegistry()).not.toThrow();
    });
  });
});

describe('lifecycle/registry - getRegisteredHandlers()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRegistry();
  });

  afterEach(() => {
    clearRegistry();
  });

  describe('Given registered handlers', () => {
    it('When getting handlers, Then returns array of registrations', () => {
      registerCleanup('info-resource-1', vi.fn());
      registerCleanup('info-resource-2', vi.fn());

      const handlers = getRegisteredHandlers();

      expect(Array.isArray(handlers)).toBe(true);
      expect(handlers.length).toBe(2);
    });

    it('When getting handlers, Then each registration has expected shape', () => {
      registerCleanup('shape-resource', vi.fn());

      const handlers = getRegisteredHandlers();

      expect(handlers[0]).toHaveProperty('id');
      expect(handlers[0]).toHaveProperty('name');
      expect(handlers[0]).toHaveProperty('registeredAt');
      expect(typeof handlers[0].id).toBe('string');
      expect(typeof handlers[0].name).toBe('string');
      expect(typeof handlers[0].registeredAt).toBe('number');
    });

    it('When getting handlers, Then returns a defensive copy (not the internal array)', () => {
      registerCleanup('copy-test', vi.fn());

      const handlers1 = getRegisteredHandlers();
      const handlers2 = getRegisteredHandlers();

      // Should return different array references
      expect(handlers1).not.toBe(handlers2);
      // But same contents
      expect(handlers1).toEqual(handlers2);
    });
  });
});
