/**
 * Adapter Registry — WS-SPLIT-4
 *
 * Module-level singleton that lets premium and third-party packages
 * register StorageAdapter implementations into the OSS factory without
 * touching OSS source code.
 *
 * AC-S4-1: registerAdapter(name, AdapterClass) exported from OSS
 * AC-S4-6: listAdapters() returns all registered names including 'file'
 * AC-S4-7: Registry is module-level singleton
 * AC-S4-8: clearAdapters() exported for test isolation
 */

import type { StorageAdapter } from './types';

// ---------------------------------------------------------------------------
// Built-in adapter names — reserved and cannot be overridden
// ---------------------------------------------------------------------------

const BUILT_IN_ADAPTERS = ['file'];

const REQUIRED_METHODS: Array<keyof StorageAdapter> = [
  'read',
  'write',
  'query',
  'delete',
  'subscribe',
  'publish',
  'close',
];

// ---------------------------------------------------------------------------
// Module-level singleton registry
// ---------------------------------------------------------------------------

// Note: in dev servers with module hot-reload, this Map accumulates across reloads. Re-registration of the same class is idempotent by design.
const registry = new Map<string, new (...args: any[]) => StorageAdapter>();

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function validateName(name: unknown): void {
  if (typeof name !== 'string' || name.length === 0) {
    throw new Error(
      `Invalid adapter name: name must be a non-empty string, got ${JSON.stringify(name)}`
    );
  }

  if (BUILT_IN_ADAPTERS.includes(name.toLowerCase())) {
    throw new Error(
      `Adapter name "${name}" conflicts with a built-in reserved adapter. ` +
      `Reserved names: ${BUILT_IN_ADAPTERS.join(', ')}.`
    );
  }
}

// Note: Proxy objects with a get trap can spoof method presence. Validation assumes trusted adapter packages.
function validateAdapterClass(AdapterClass: unknown): void {
  if (
    AdapterClass === null ||
    AdapterClass === undefined ||
    typeof AdapterClass !== 'function' ||
    !AdapterClass.prototype
  ) {
    throw new Error(
      'Invalid adapter class: AdapterClass must be a constructor (class), ' +
      `got ${AdapterClass === null ? 'null' : typeof AdapterClass}`
    );
  }

  const missingMethods = REQUIRED_METHODS.filter(
    (method) => typeof AdapterClass.prototype[method] !== 'function'
  );

  if (missingMethods.length > 0) {
    throw new Error(
      `Invalid adapter class: missing required StorageAdapter method(s): ${missingMethods.join(', ')}`
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a third-party StorageAdapter implementation.
 *
 * Rules:
 * - name must be a non-empty string
 * - name must not conflict with built-in adapter names (case-insensitive)
 * - AdapterClass must be a constructor with all 7 StorageAdapter methods
 * - Registering the same name + same class again is idempotent (no-op)
 * - Registering the same name with a different class throws
 */
export function registerAdapter(
  name: string,
  AdapterClass: new (...args: any[]) => StorageAdapter
): void {
  validateName(name);
  validateAdapterClass(AdapterClass);

  const existing = registry.get(name);
  if (existing !== undefined) {
    if (existing === AdapterClass) {
      // Idempotent — same class registered again, silently accept
      return;
    }
    throw new Error(
      `Adapter "${name}" is already registered with a different class. ` +
      'Use clearAdapters() in tests to reset the registry.'
    );
  }

  registry.set(name, AdapterClass);
}

/**
 * Retrieve a registered adapter class by name.
 * Returns undefined if not found.
 * Used internally by the factory.
 */
export function getRegistered(
  name: string
): (new (...args: any[]) => StorageAdapter) | undefined {
  return registry.get(name);
}

/**
 * List all known adapter names: built-ins + registered third-party.
 * Returns a new array so callers cannot mutate the registry.
 *
 * AC-S4-6: always includes 'file'
 */
export function listAdapters(): string[] {
  return [...BUILT_IN_ADAPTERS, ...registry.keys()];
}

/**
 * Clear all third-party registrations.
 * Intended for test isolation only — do not call in production code.
 *
 * AC-S4-8: exported for test use
 */
export function clearAdapters(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('clearAdapters() must not be called in production');
  }
  registry.clear();
}
