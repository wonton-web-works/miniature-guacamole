/**
 * WS-MEM-1: Process Lifecycle and Resource Cleanup - Signals Module
 *
 * Manages process signal handlers (SIGTERM, SIGINT, beforeExit).
 * AC-1: Signal handlers exist and call cleanup functions.
 * AC-2: Puppeteer browser is closed on graceful process termination.
 * AC-3: No orphaned Chromium processes after kill <pid>.
 */

import { executeCleanup } from './registry';

let installed = false;

// Store references to handlers so we can remove them later
let sigtermHandler: (() => Promise<void>) | null = null;
let sigintHandler: (() => Promise<void>) | null = null;
let beforeExitHandler: (() => Promise<void>) | null = null;

/**
 * Installs signal handlers for SIGTERM, SIGINT, and beforeExit.
 * Idempotent: multiple calls do not duplicate handlers.
 */
export function installSignalHandlers(): void {
  if (installed) {
    return;
  }

  sigtermHandler = async () => {
    await executeCleanup();
    process.exit(143); // 128 + 15 (SIGTERM)
  };

  sigintHandler = async () => {
    await executeCleanup();
    process.exit(130); // 128 + 2 (SIGINT)
  };

  beforeExitHandler = async () => {
    await executeCleanup();
  };

  process.on('SIGTERM', sigtermHandler);
  process.on('SIGINT', sigintHandler);
  process.on('beforeExit', beforeExitHandler);

  installed = true;
}

/**
 * Uninstalls signal handlers.
 * Safe to call even if handlers are not installed.
 */
export function uninstallSignalHandlers(): void {
  if (!installed) {
    return;
  }

  if (sigtermHandler) {
    process.removeListener('SIGTERM', sigtermHandler);
    sigtermHandler = null;
  }

  if (sigintHandler) {
    process.removeListener('SIGINT', sigintHandler);
    sigintHandler = null;
  }

  if (beforeExitHandler) {
    process.removeListener('beforeExit', beforeExitHandler);
    beforeExitHandler = null;
  }

  installed = false;
}

/**
 * Returns whether signal handlers are currently installed.
 */
export function isSignalHandlerInstalled(): boolean {
  return installed;
}
