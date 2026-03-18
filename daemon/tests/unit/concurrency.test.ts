import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConcurrencyLimiter } from '../../src/concurrency';
import type { ConcurrencyConfig } from '../../src/concurrency';

describe('ConcurrencyLimiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Constructor / config ───────────────────────────────────────────────────

  describe('GIVEN a new ConcurrencyLimiter WHEN constructed THEN initial state is correct', () => {
    it('GIVEN maxConcurrent 1 THEN active is 0', () => {
      const limiter = new ConcurrencyLimiter({ maxConcurrent: 1, delayBetweenTicketsMs: 0 });
      expect(limiter.active).toBe(0);
    });

    it('GIVEN maxConcurrent 3 THEN full is false initially', () => {
      const limiter = new ConcurrencyLimiter({ maxConcurrent: 3, delayBetweenTicketsMs: 0 });
      expect(limiter.full).toBe(false);
    });
  });

  // ─── acquire / release ──────────────────────────────────────────────────────

  describe('acquire()', () => {
    describe('GIVEN slot available WHEN acquire called THEN resolves immediately', () => {
      it('GIVEN maxConcurrent 1 and 0 active THEN acquire resolves', async () => {
        const limiter = new ConcurrencyLimiter({ maxConcurrent: 1, delayBetweenTicketsMs: 0 });
        await expect(limiter.acquire()).resolves.toBeUndefined();
      });

      it('GIVEN acquire resolves THEN active increments', async () => {
        const limiter = new ConcurrencyLimiter({ maxConcurrent: 2, delayBetweenTicketsMs: 0 });
        await limiter.acquire();
        expect(limiter.active).toBe(1);
      });

      it('GIVEN two acquires THEN active is 2', async () => {
        const limiter = new ConcurrencyLimiter({ maxConcurrent: 2, delayBetweenTicketsMs: 0 });
        await limiter.acquire();
        await limiter.acquire();
        expect(limiter.active).toBe(2);
      });
    });

    describe('GIVEN all slots full WHEN acquire called THEN waits for release', () => {
      it('GIVEN maxConcurrent 1 and 1 active THEN full is true', async () => {
        const limiter = new ConcurrencyLimiter({ maxConcurrent: 1, delayBetweenTicketsMs: 0 });
        await limiter.acquire();
        expect(limiter.full).toBe(true);
      });

      it('GIVEN full limiter WHEN second acquire waits AND release called THEN second acquire resolves', async () => {
        const limiter = new ConcurrencyLimiter({ maxConcurrent: 1, delayBetweenTicketsMs: 0 });
        await limiter.acquire(); // occupy the single slot

        let secondResolved = false;
        const secondAcquire = limiter.acquire().then(() => { secondResolved = true; });

        // Second acquire should be waiting
        await Promise.resolve(); // yield to microtask queue
        expect(secondResolved).toBe(false);

        limiter.release(); // free the slot

        await secondAcquire;
        expect(secondResolved).toBe(true);
      });
    });
  });

  // ─── release ────────────────────────────────────────────────────────────────

  describe('release()', () => {
    describe('GIVEN 1 active slot WHEN release called THEN active decrements', () => {
      it('GIVEN active 1 WHEN release THEN active is 0', async () => {
        const limiter = new ConcurrencyLimiter({ maxConcurrent: 1, delayBetweenTicketsMs: 0 });
        await limiter.acquire();
        limiter.release();
        expect(limiter.active).toBe(0);
      });

      it('GIVEN active 2 WHEN release THEN active is 1', async () => {
        const limiter = new ConcurrencyLimiter({ maxConcurrent: 3, delayBetweenTicketsMs: 0 });
        await limiter.acquire();
        await limiter.acquire();
        limiter.release();
        expect(limiter.active).toBe(1);
      });
    });

    describe('GIVEN active 1 WHEN release called THEN full is false', () => {
      it('GIVEN maxConcurrent 1 and active 1 WHEN release THEN full is false', async () => {
        const limiter = new ConcurrencyLimiter({ maxConcurrent: 1, delayBetweenTicketsMs: 0 });
        await limiter.acquire();
        limiter.release();
        expect(limiter.full).toBe(false);
      });
    });

    describe('GIVEN release called with no active slots THEN does not throw', () => {
      it('GIVEN active 0 WHEN release called THEN does not throw', () => {
        const limiter = new ConcurrencyLimiter({ maxConcurrent: 1, delayBetweenTicketsMs: 0 });
        expect(() => limiter.release()).not.toThrow();
      });
    });
  });

  // ─── full property ──────────────────────────────────────────────────────────

  describe('full property', () => {
    it('GIVEN maxConcurrent 3 and 2 active THEN full is false', async () => {
      const limiter = new ConcurrencyLimiter({ maxConcurrent: 3, delayBetweenTicketsMs: 0 });
      await limiter.acquire();
      await limiter.acquire();
      expect(limiter.full).toBe(false);
    });

    it('GIVEN maxConcurrent 3 and 3 active THEN full is true', async () => {
      const limiter = new ConcurrencyLimiter({ maxConcurrent: 3, delayBetweenTicketsMs: 0 });
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();
      expect(limiter.full).toBe(true);
    });
  });

  // ─── delay ──────────────────────────────────────────────────────────────────

  describe('delay()', () => {
    describe('GIVEN delayBetweenTicketsMs 0 WHEN delay called THEN resolves immediately', () => {
      it('GIVEN 0ms delay THEN delay() resolves', async () => {
        const limiter = new ConcurrencyLimiter({ maxConcurrent: 1, delayBetweenTicketsMs: 0 });
        await expect(limiter.delay()).resolves.toBeUndefined();
      });
    });

    describe('GIVEN delayBetweenTicketsMs > 0 WHEN delay called THEN resolves after delay', () => {
      it('GIVEN 50ms delay THEN delay() resolves after at least that duration', async () => {
        vi.useFakeTimers();
        const limiter = new ConcurrencyLimiter({ maxConcurrent: 1, delayBetweenTicketsMs: 50 });

        let resolved = false;
        const delayPromise = limiter.delay().then(() => { resolved = true; });

        expect(resolved).toBe(false);
        vi.advanceTimersByTime(50);
        await delayPromise;
        expect(resolved).toBe(true);

        vi.useRealTimers();
      });
    });
  });

  // ─── Concurrent acquire ordering ────────────────────────────────────────────

  describe('GIVEN multiple waiters WHEN slots freed THEN waiters resolve in FIFO order', () => {
    it('GIVEN 3 waiters on maxConcurrent 1 THEN they resolve in order', async () => {
      const limiter = new ConcurrencyLimiter({ maxConcurrent: 1, delayBetweenTicketsMs: 0 });
      await limiter.acquire(); // occupy

      const order: number[] = [];
      const p1 = limiter.acquire().then(() => order.push(1));
      const p2 = limiter.acquire().then(() => order.push(2));
      const p3 = limiter.acquire().then(() => order.push(3));

      limiter.release(); await p1;
      limiter.release(); await p2;
      limiter.release(); await p3;

      expect(order).toEqual([1, 2, 3]);
    });
  });
});
