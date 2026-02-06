/**
 * WS-MEM-1: Process Lifecycle and Resource Cleanup - Config Module
 *
 * Configuration defaults, validation, and override for lifecycle management.
 * STD-005: Resources MUST register cleanup with lifecycle manager
 * STD-007: Module-scoped singletons require TTL or explicit cleanup
 */

export interface LifecycleConfig {
  browserIdleTimeoutMs: number;
  maxCleanupHandlers: number;
  cleanupTimeoutMs: number;
  gracefulShutdownTimeoutMs: number;
}

export const LIFECYCLE_DEFAULTS = {
  BROWSER_IDLE_TIMEOUT_MS: 300000,       // 5 minutes
  MAX_CLEANUP_HANDLERS: 100,
  CLEANUP_TIMEOUT_MS: 10000,             // 10 seconds per handler
  GRACEFUL_SHUTDOWN_TIMEOUT_MS: 30000,   // 30 seconds total
  TEMP_FILE_PATTERN: 'commit-',
} as const;

/**
 * Returns a merged lifecycle config with defaults and optional overrides.
 */
export function getLifecycleConfig(overrides?: Partial<LifecycleConfig>): LifecycleConfig {
  return {
    browserIdleTimeoutMs: overrides?.browserIdleTimeoutMs ?? LIFECYCLE_DEFAULTS.BROWSER_IDLE_TIMEOUT_MS,
    maxCleanupHandlers: overrides?.maxCleanupHandlers ?? LIFECYCLE_DEFAULTS.MAX_CLEANUP_HANDLERS,
    cleanupTimeoutMs: overrides?.cleanupTimeoutMs ?? LIFECYCLE_DEFAULTS.CLEANUP_TIMEOUT_MS,
    gracefulShutdownTimeoutMs: overrides?.gracefulShutdownTimeoutMs ?? LIFECYCLE_DEFAULTS.GRACEFUL_SHUTDOWN_TIMEOUT_MS,
  };
}

/**
 * Validates a lifecycle configuration, replacing invalid values with defaults
 * and logging warnings.
 */
export function validateLifecycleConfig(config: LifecycleConfig): LifecycleConfig {
  const validated = { ...config };

  // Validate browserIdleTimeoutMs
  if (typeof validated.browserIdleTimeoutMs !== 'number' || validated.browserIdleTimeoutMs <= 0) {
    console.warn(`Invalid browserIdleTimeoutMs (${validated.browserIdleTimeoutMs}), using default (${LIFECYCLE_DEFAULTS.BROWSER_IDLE_TIMEOUT_MS}ms)`);
    validated.browserIdleTimeoutMs = LIFECYCLE_DEFAULTS.BROWSER_IDLE_TIMEOUT_MS;
  }

  // Validate maxCleanupHandlers
  if (typeof validated.maxCleanupHandlers !== 'number' || validated.maxCleanupHandlers <= 0) {
    console.warn(`Invalid maxCleanupHandlers (${validated.maxCleanupHandlers}), using default (${LIFECYCLE_DEFAULTS.MAX_CLEANUP_HANDLERS})`);
    validated.maxCleanupHandlers = LIFECYCLE_DEFAULTS.MAX_CLEANUP_HANDLERS;
  } else if (validated.maxCleanupHandlers > 1000) {
    console.warn(`maxCleanupHandlers (${validated.maxCleanupHandlers}) exceeds 1000, capping at 1000`);
    validated.maxCleanupHandlers = 1000;
  }

  // Validate cleanupTimeoutMs
  if (typeof validated.cleanupTimeoutMs !== 'number' || validated.cleanupTimeoutMs <= 0) {
    console.warn(`Invalid cleanupTimeoutMs (${validated.cleanupTimeoutMs}), using default (${LIFECYCLE_DEFAULTS.CLEANUP_TIMEOUT_MS}ms)`);
    validated.cleanupTimeoutMs = LIFECYCLE_DEFAULTS.CLEANUP_TIMEOUT_MS;
  }

  // Validate gracefulShutdownTimeoutMs
  if (typeof validated.gracefulShutdownTimeoutMs !== 'number' || validated.gracefulShutdownTimeoutMs <= 0) {
    console.warn(`Invalid gracefulShutdownTimeoutMs (${validated.gracefulShutdownTimeoutMs}), using default (${LIFECYCLE_DEFAULTS.GRACEFUL_SHUTDOWN_TIMEOUT_MS}ms)`);
    validated.gracefulShutdownTimeoutMs = LIFECYCLE_DEFAULTS.GRACEFUL_SHUTDOWN_TIMEOUT_MS;
  } else if (validated.gracefulShutdownTimeoutMs < validated.cleanupTimeoutMs) {
    console.warn(`gracefulShutdownTimeoutMs (${validated.gracefulShutdownTimeoutMs}) is less than cleanupTimeoutMs (${validated.cleanupTimeoutMs}), adjusting`);
    validated.gracefulShutdownTimeoutMs = validated.cleanupTimeoutMs;
  }

  return validated;
}
