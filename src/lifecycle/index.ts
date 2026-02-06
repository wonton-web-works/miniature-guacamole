/**
 * WS-MEM-1: Process Lifecycle and Resource Cleanup - Public API
 *
 * Composes config, registry, and signals into a unified lifecycle manager.
 * STD-005: Resources MUST register cleanup with lifecycle manager
 * STD-008: Expose resource health metrics
 */

import * as fs from 'fs';
import { getLifecycleConfig, validateLifecycleConfig, type LifecycleConfig } from './config';
import {
  registerCleanup,
  executeCleanup,
  getRegisteredHandlers,
  type CleanupResult,
} from './registry';
import {
  installSignalHandlers,
  uninstallSignalHandlers,
  isSignalHandlerInstalled,
} from './signals';

export { registerCleanup } from './registry';

export interface LifecycleStatus {
  initialized: boolean;
  signalHandlersInstalled: boolean;
  registeredHandlers: number;
  registeredTempFiles: number;
  timestamp: number;
}

let lifecycleInitialized = false;
const tempFiles = new Set<string>();

/**
 * Initializes the lifecycle manager. Validates config and installs signal handlers.
 * Idempotent: safe to call multiple times.
 */
export function initLifecycle(configOverrides?: Partial<LifecycleConfig>): LifecycleStatus {
  if (!lifecycleInitialized) {
    const config = getLifecycleConfig(configOverrides);
    validateLifecycleConfig(config);
    installSignalHandlers();
    lifecycleInitialized = true;
  }

  return getLifecycleStatus();
}

/**
 * Shuts down the lifecycle manager. Cleans temp files, executes cleanup handlers,
 * and uninstalls signal handlers.
 */
export async function shutdownLifecycle(): Promise<CleanupResult> {
  // Clean up registered temp files
  for (const filePath of tempFiles) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn(`Failed to delete temp file ${filePath}: ${error}`);
    }
  }
  tempFiles.clear();

  // Execute all registered cleanup handlers
  const results = await executeCleanup();

  // Uninstall signal handlers
  uninstallSignalHandlers();
  lifecycleInitialized = false;

  return results;
}

/**
 * Returns the current lifecycle status including health metrics (STD-008).
 */
export function getLifecycleStatus(): LifecycleStatus {
  return {
    initialized: lifecycleInitialized,
    signalHandlersInstalled: isSignalHandlerInstalled(),
    registeredHandlers: getRegisteredHandlers().length,
    registeredTempFiles: tempFiles.size,
    timestamp: Date.now(),
  };
}

/**
 * Registers a temp file path for cleanup on shutdown (AC-4).
 * Uses a Set so duplicates are ignored.
 */
export function registerTempFile(filePath: string): void {
  tempFiles.add(filePath);
}

/**
 * Deregisters a temp file path (e.g., after normal cleanup in finally block).
 */
export function deregisterTempFile(filePath: string): void {
  tempFiles.delete(filePath);
}
