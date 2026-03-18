import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs for persistence tests
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  renameSync: vi.fn(),
}));

import { existsSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { ErrorBudget } from '../../src/error-budget';
import type { ErrorBudgetConfig } from '../../src/error-budget';

describe('ErrorBudget', () => {
  const defaultConfig: ErrorBudgetConfig = { threshold: 3 };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Initial state ──────────────────────────────────────────────────────────

  describe('GIVEN a new ErrorBudget WHEN constructed THEN initial state is correct', () => {
    it('GIVEN threshold 3 THEN canProcess is true', () => {
      const budget = new ErrorBudget(defaultConfig);
      expect(budget.canProcess).toBe(true);
    });

    it('GIVEN new instance THEN getState returns 0 consecutive failures', () => {
      const budget = new ErrorBudget(defaultConfig);
      const state = budget.getState();
      expect(state.consecutiveFailures).toBe(0);
      expect(state.paused).toBe(false);
    });
  });

  // ─── recordSuccess ──────────────────────────────────────────────────────────

  describe('recordSuccess()', () => {
    describe('GIVEN previous failures WHEN recordSuccess called THEN resets counter', () => {
      it('GIVEN 2 failures WHEN recordSuccess THEN consecutiveFailures is 0', () => {
        const budget = new ErrorBudget(defaultConfig);
        budget.recordFailure('err1');
        budget.recordFailure('err2');
        budget.recordSuccess();
        expect(budget.getState().consecutiveFailures).toBe(0);
      });

      it('GIVEN no failures WHEN recordSuccess THEN consecutiveFailures stays 0', () => {
        const budget = new ErrorBudget(defaultConfig);
        budget.recordSuccess();
        expect(budget.getState().consecutiveFailures).toBe(0);
      });

      it('GIVEN paused state WHEN recordSuccess THEN still paused (resume is explicit)', () => {
        const budget = new ErrorBudget({ threshold: 1 });
        budget.recordFailure('err');
        // paused now
        budget.recordSuccess();
        // success resets failures but does NOT auto-resume
        expect(budget.getState().consecutiveFailures).toBe(0);
        // canProcess remains false because we need explicit resume
        expect(budget.canProcess).toBe(false);
      });
    });
  });

  // ─── recordFailure ──────────────────────────────────────────────────────────

  describe('recordFailure()', () => {
    describe('GIVEN below threshold WHEN recordFailure called THEN increments counter', () => {
      it('GIVEN 0 failures WHEN recordFailure THEN consecutiveFailures is 1', () => {
        const budget = new ErrorBudget(defaultConfig);
        budget.recordFailure('timeout');
        expect(budget.getState().consecutiveFailures).toBe(1);
      });

      it('GIVEN 2 failures WHEN recordFailure THEN consecutiveFailures is 3', () => {
        const budget = new ErrorBudget(defaultConfig);
        budget.recordFailure('e1');
        budget.recordFailure('e2');
        budget.recordFailure('e3');
        expect(budget.getState().consecutiveFailures).toBe(3);
      });

      it('GIVEN 2 failures (below threshold 3) THEN canProcess is still true', () => {
        const budget = new ErrorBudget(defaultConfig);
        budget.recordFailure('e1');
        budget.recordFailure('e2');
        expect(budget.canProcess).toBe(true);
      });
    });

    describe('GIVEN threshold reached WHEN recordFailure called THEN pauses', () => {
      it('GIVEN threshold 3 and 3 failures THEN canProcess is false', () => {
        const budget = new ErrorBudget(defaultConfig);
        budget.recordFailure('e1');
        budget.recordFailure('e2');
        budget.recordFailure('e3');
        expect(budget.canProcess).toBe(false);
      });

      it('GIVEN threshold 3 and 3 failures THEN paused is true', () => {
        const budget = new ErrorBudget(defaultConfig);
        budget.recordFailure('e1');
        budget.recordFailure('e2');
        budget.recordFailure('e3');
        expect(budget.getState().paused).toBe(true);
      });

      it('GIVEN threshold 1 and 1 failure THEN paused immediately', () => {
        const budget = new ErrorBudget({ threshold: 1 });
        budget.recordFailure('fatal');
        expect(budget.canProcess).toBe(false);
        expect(budget.getState().paused).toBe(true);
      });

      it('GIVEN paused WHEN another failure recorded THEN still paused', () => {
        const budget = new ErrorBudget(defaultConfig);
        budget.recordFailure('e1');
        budget.recordFailure('e2');
        budget.recordFailure('e3'); // pause triggered
        budget.recordFailure('e4'); // should not crash
        expect(budget.canProcess).toBe(false);
      });
    });

    describe('GIVEN failure recorded WHEN getState called THEN lastFailure timestamp is set', () => {
      it('GIVEN failure recorded THEN lastFailure is an ISO timestamp', () => {
        const budget = new ErrorBudget(defaultConfig);
        budget.recordFailure('timeout');
        const state = budget.getState();
        expect(state.lastFailure).toBeDefined();
        expect(() => new Date(state.lastFailure!)).not.toThrow();
      });
    });
  });

  // ─── resume ─────────────────────────────────────────────────────────────────

  describe('resume()', () => {
    describe('GIVEN paused state WHEN resume called THEN can process again', () => {
      it('GIVEN threshold exceeded WHEN resume THEN canProcess is true', () => {
        const budget = new ErrorBudget(defaultConfig);
        budget.recordFailure('e1');
        budget.recordFailure('e2');
        budget.recordFailure('e3');
        budget.resume();
        expect(budget.canProcess).toBe(true);
      });

      it('GIVEN paused WHEN resume THEN paused is false', () => {
        const budget = new ErrorBudget(defaultConfig);
        budget.recordFailure('e1');
        budget.recordFailure('e2');
        budget.recordFailure('e3');
        budget.resume();
        expect(budget.getState().paused).toBe(false);
      });

      it('GIVEN paused WHEN resume THEN consecutiveFailures is reset', () => {
        const budget = new ErrorBudget(defaultConfig);
        budget.recordFailure('e1');
        budget.recordFailure('e2');
        budget.recordFailure('e3');
        budget.resume();
        expect(budget.getState().consecutiveFailures).toBe(0);
      });

      it('GIVEN not paused WHEN resume called THEN does not throw', () => {
        const budget = new ErrorBudget(defaultConfig);
        expect(() => budget.resume()).not.toThrow();
      });
    });
  });

  // ─── canProcess ─────────────────────────────────────────────────────────────

  describe('canProcess property', () => {
    it('GIVEN not paused THEN returns true', () => {
      const budget = new ErrorBudget(defaultConfig);
      expect(budget.canProcess).toBe(true);
    });

    it('GIVEN threshold reached THEN returns false', () => {
      const budget = new ErrorBudget({ threshold: 2 });
      budget.recordFailure('e1');
      budget.recordFailure('e2');
      expect(budget.canProcess).toBe(false);
    });

    it('GIVEN paused THEN resumed THEN returns true', () => {
      const budget = new ErrorBudget({ threshold: 1 });
      budget.recordFailure('e1');
      budget.resume();
      expect(budget.canProcess).toBe(true);
    });
  });

  // ─── save / load (persistence) ──────────────────────────────────────────────

  describe('save()', () => {
    describe('GIVEN current state WHEN save called THEN writes atomically', () => {
      it('GIVEN current state WHEN save called THEN writeFileSync is called for tmp file', () => {
        vi.mocked(writeFileSync).mockImplementation(() => {});
        vi.mocked(renameSync).mockImplementation(() => {});

        const budget = new ErrorBudget(defaultConfig);
        budget.recordFailure('err');
        budget.save('/path/to/error-budget.json');

        expect(writeFileSync).toHaveBeenCalled();
        const tmpCall = vi.mocked(writeFileSync).mock.calls[0];
        expect(String(tmpCall[0])).toContain('.tmp');
      });

      it('GIVEN save called THEN renameSync moves tmp to final path', () => {
        vi.mocked(writeFileSync).mockImplementation(() => {});
        vi.mocked(renameSync).mockImplementation(() => {});

        const budget = new ErrorBudget(defaultConfig);
        budget.save('/path/to/error-budget.json');

        expect(renameSync).toHaveBeenCalled();
        const renameArgs = vi.mocked(renameSync).mock.calls[0];
        expect(String(renameArgs[0])).toContain('.tmp');
        expect(String(renameArgs[1])).toBe('/path/to/error-budget.json');
      });

      it('GIVEN state with failures WHEN save called THEN saved JSON includes consecutiveFailures', () => {
        vi.mocked(writeFileSync).mockImplementation(() => {});
        vi.mocked(renameSync).mockImplementation(() => {});

        const budget = new ErrorBudget(defaultConfig);
        budget.recordFailure('e1');
        budget.recordFailure('e2');
        budget.save('/path/to/error-budget.json');

        const writtenContent = String(vi.mocked(writeFileSync).mock.calls[0][1]);
        const parsed = JSON.parse(writtenContent);
        expect(parsed.consecutiveFailures).toBe(2);
      });
    });
  });

  describe('ErrorBudget.load()', () => {
    describe('GIVEN saved state file WHEN load called THEN restores state', () => {
      it('GIVEN file exists with 2 failures THEN loaded budget has 2 consecutive failures', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
          JSON.stringify({ consecutiveFailures: 2, paused: false })
        );

        const budget = ErrorBudget.load('/path/to/error-budget.json', defaultConfig);
        expect(budget.getState().consecutiveFailures).toBe(2);
      });

      it('GIVEN file exists with paused true THEN loaded budget is paused', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
          JSON.stringify({ consecutiveFailures: 3, paused: true })
        );

        const budget = ErrorBudget.load('/path/to/error-budget.json', defaultConfig);
        expect(budget.canProcess).toBe(false);
        expect(budget.getState().paused).toBe(true);
      });

      it('GIVEN file does not exist THEN returns fresh ErrorBudget', () => {
        vi.mocked(existsSync).mockReturnValue(false);

        const budget = ErrorBudget.load('/path/to/error-budget.json', defaultConfig);
        expect(budget.getState().consecutiveFailures).toBe(0);
        expect(budget.canProcess).toBe(true);
      });

      it('GIVEN corrupted file THEN returns fresh ErrorBudget without throwing', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue('invalid{{{json');

        expect(() => ErrorBudget.load('/path/to/error-budget.json', defaultConfig)).not.toThrow();
        const budget = ErrorBudget.load('/path/to/error-budget.json', defaultConfig);
        expect(budget.getState().consecutiveFailures).toBe(0);
      });
    });
  });

  // ─── getState ───────────────────────────────────────────────────────────────

  describe('getState()', () => {
    it('GIVEN paused state THEN pausedAt is set', () => {
      const budget = new ErrorBudget({ threshold: 1 });
      budget.recordFailure('e1');
      const state = budget.getState();
      expect(state.pausedAt).toBeDefined();
    });

    it('GIVEN not paused THEN pausedAt is undefined', () => {
      const budget = new ErrorBudget(defaultConfig);
      const state = budget.getState();
      expect(state.pausedAt).toBeUndefined();
    });
  });
});
