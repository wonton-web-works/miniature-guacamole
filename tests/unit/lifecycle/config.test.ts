/**
 * WS-MEM-1: Process Lifecycle and Resource Cleanup - Config Module Tests
 *
 * BDD Scenarios:
 * - AC-5: Browser singleton auto-closes after configurable idle timeout
 * - STD-005: Resources MUST register cleanup with lifecycle manager
 * - STD-007: Module-scoped singletons require TTL or explicit cleanup
 * - Configuration defaults, validation, and override
 *
 * Target: 99% coverage
 *
 * NOTE: These tests are written BEFORE the implementation (TDD).
 * They are expected to FAIL until the lifecycle module is implemented.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// The module under test does not exist yet -- these imports will fail
// until the dev creates src/lifecycle/config.ts
import {
  getLifecycleConfig,
  validateLifecycleConfig,
  LIFECYCLE_DEFAULTS,
  type LifecycleConfig,
} from '@/lifecycle/config';

describe('lifecycle/config - LIFECYCLE_DEFAULTS', () => {
  it('should export default configuration constants', () => {
    expect(LIFECYCLE_DEFAULTS).toBeDefined();
  });

  it('should have a default browser idle timeout in milliseconds', () => {
    // AC-5: configurable idle timeout
    expect(typeof LIFECYCLE_DEFAULTS.BROWSER_IDLE_TIMEOUT_MS).toBe('number');
    expect(LIFECYCLE_DEFAULTS.BROWSER_IDLE_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it('should have a default max cleanup handlers limit', () => {
    expect(typeof LIFECYCLE_DEFAULTS.MAX_CLEANUP_HANDLERS).toBe('number');
    expect(LIFECYCLE_DEFAULTS.MAX_CLEANUP_HANDLERS).toBeGreaterThanOrEqual(10);
  });

  it('should have a default cleanup timeout in milliseconds', () => {
    // Timeout for individual cleanup handler execution
    expect(typeof LIFECYCLE_DEFAULTS.CLEANUP_TIMEOUT_MS).toBe('number');
    expect(LIFECYCLE_DEFAULTS.CLEANUP_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it('should have a default graceful shutdown timeout in milliseconds', () => {
    // Total time allowed for all cleanup before forced exit
    expect(typeof LIFECYCLE_DEFAULTS.GRACEFUL_SHUTDOWN_TIMEOUT_MS).toBe('number');
    expect(LIFECYCLE_DEFAULTS.GRACEFUL_SHUTDOWN_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it('should have graceful shutdown timeout >= cleanup timeout', () => {
    expect(LIFECYCLE_DEFAULTS.GRACEFUL_SHUTDOWN_TIMEOUT_MS).toBeGreaterThanOrEqual(
      LIFECYCLE_DEFAULTS.CLEANUP_TIMEOUT_MS
    );
  });

  it('should have a temp file pattern for matching commit temp files', () => {
    // AC-4: Temp files matching commit-* pattern
    expect(typeof LIFECYCLE_DEFAULTS.TEMP_FILE_PATTERN).toBe('string');
    expect(LIFECYCLE_DEFAULTS.TEMP_FILE_PATTERN).toContain('commit-');
  });
});

describe('lifecycle/config - getLifecycleConfig()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given no custom configuration', () => {
    it('When loading config, Then returns all default values', () => {
      const config = getLifecycleConfig();

      expect(config.browserIdleTimeoutMs).toBe(LIFECYCLE_DEFAULTS.BROWSER_IDLE_TIMEOUT_MS);
      expect(config.maxCleanupHandlers).toBe(LIFECYCLE_DEFAULTS.MAX_CLEANUP_HANDLERS);
      expect(config.cleanupTimeoutMs).toBe(LIFECYCLE_DEFAULTS.CLEANUP_TIMEOUT_MS);
      expect(config.gracefulShutdownTimeoutMs).toBe(LIFECYCLE_DEFAULTS.GRACEFUL_SHUTDOWN_TIMEOUT_MS);
    });

    it('When loading config, Then does not throw', () => {
      expect(() => getLifecycleConfig()).not.toThrow();
    });
  });

  describe('Given custom configuration overrides', () => {
    it('When providing custom browser idle timeout, Then uses provided value', () => {
      const config = getLifecycleConfig({ browserIdleTimeoutMs: 120000 });

      expect(config.browserIdleTimeoutMs).toBe(120000);
    });

    it('When providing custom max handlers, Then uses provided value', () => {
      const config = getLifecycleConfig({ maxCleanupHandlers: 50 });

      expect(config.maxCleanupHandlers).toBe(50);
    });

    it('When providing custom cleanup timeout, Then uses provided value', () => {
      const config = getLifecycleConfig({ cleanupTimeoutMs: 15000 });

      expect(config.cleanupTimeoutMs).toBe(15000);
    });

    it('When providing custom graceful shutdown timeout, Then uses provided value', () => {
      const config = getLifecycleConfig({ gracefulShutdownTimeoutMs: 60000 });

      expect(config.gracefulShutdownTimeoutMs).toBe(60000);
    });

    it('When providing partial overrides, Then merges with defaults', () => {
      const config = getLifecycleConfig({ browserIdleTimeoutMs: 90000 });

      expect(config.browserIdleTimeoutMs).toBe(90000);
      // Other fields remain default
      expect(config.maxCleanupHandlers).toBe(LIFECYCLE_DEFAULTS.MAX_CLEANUP_HANDLERS);
      expect(config.cleanupTimeoutMs).toBe(LIFECYCLE_DEFAULTS.CLEANUP_TIMEOUT_MS);
    });
  });
});

describe('lifecycle/config - validateLifecycleConfig()', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Given valid configuration values', () => {
    it('When validating, Then returns config unchanged', () => {
      const config: LifecycleConfig = {
        browserIdleTimeoutMs: 60000,
        maxCleanupHandlers: 20,
        cleanupTimeoutMs: 10000,
        gracefulShutdownTimeoutMs: 30000,
      };

      const validated = validateLifecycleConfig(config);

      expect(validated).toEqual(config);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Given invalid browser idle timeout', () => {
    it('When timeout is negative, Then uses default and warns', () => {
      const config: Partial<LifecycleConfig> = {
        browserIdleTimeoutMs: -1000,
      };

      const validated = validateLifecycleConfig(config as LifecycleConfig);

      expect(validated.browserIdleTimeoutMs).toBe(LIFECYCLE_DEFAULTS.BROWSER_IDLE_TIMEOUT_MS);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('When timeout is zero, Then uses default and warns', () => {
      const config: Partial<LifecycleConfig> = {
        browserIdleTimeoutMs: 0,
      };

      const validated = validateLifecycleConfig(config as LifecycleConfig);

      expect(validated.browserIdleTimeoutMs).toBe(LIFECYCLE_DEFAULTS.BROWSER_IDLE_TIMEOUT_MS);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('When timeout is not a number, Then uses default and warns', () => {
      const config = {
        browserIdleTimeoutMs: 'invalid' as any,
      };

      const validated = validateLifecycleConfig(config as LifecycleConfig);

      expect(validated.browserIdleTimeoutMs).toBe(LIFECYCLE_DEFAULTS.BROWSER_IDLE_TIMEOUT_MS);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('Given invalid max cleanup handlers', () => {
    it('When max handlers is zero, Then uses default and warns', () => {
      const config: Partial<LifecycleConfig> = {
        maxCleanupHandlers: 0,
      };

      const validated = validateLifecycleConfig(config as LifecycleConfig);

      expect(validated.maxCleanupHandlers).toBe(LIFECYCLE_DEFAULTS.MAX_CLEANUP_HANDLERS);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('When max handlers is negative, Then uses default and warns', () => {
      const config: Partial<LifecycleConfig> = {
        maxCleanupHandlers: -5,
      };

      const validated = validateLifecycleConfig(config as LifecycleConfig);

      expect(validated.maxCleanupHandlers).toBe(LIFECYCLE_DEFAULTS.MAX_CLEANUP_HANDLERS);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('When max handlers exceeds 1000, Then caps at 1000 and warns', () => {
      const config: Partial<LifecycleConfig> = {
        maxCleanupHandlers: 5000,
      };

      const validated = validateLifecycleConfig(config as LifecycleConfig);

      expect(validated.maxCleanupHandlers).toBeLessThanOrEqual(1000);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('Given invalid cleanup timeout', () => {
    it('When cleanup timeout is negative, Then uses default and warns', () => {
      const config: Partial<LifecycleConfig> = {
        cleanupTimeoutMs: -500,
      };

      const validated = validateLifecycleConfig(config as LifecycleConfig);

      expect(validated.cleanupTimeoutMs).toBe(LIFECYCLE_DEFAULTS.CLEANUP_TIMEOUT_MS);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('Given invalid graceful shutdown timeout', () => {
    it('When shutdown timeout is less than cleanup timeout, Then adjusts and warns', () => {
      const config: LifecycleConfig = {
        browserIdleTimeoutMs: 60000,
        maxCleanupHandlers: 20,
        cleanupTimeoutMs: 10000,
        gracefulShutdownTimeoutMs: 5000, // Less than cleanupTimeoutMs
      };

      const validated = validateLifecycleConfig(config);

      // Shutdown timeout should be at least cleanup timeout
      expect(validated.gracefulShutdownTimeoutMs).toBeGreaterThanOrEqual(
        validated.cleanupTimeoutMs
      );
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });
});
