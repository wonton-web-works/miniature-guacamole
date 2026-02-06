/**
 * WS-MEM-1: Process Lifecycle and Resource Cleanup - Registry Module
 *
 * Manages cleanup handler registration, deregistration, and execution.
 * STD-005: Resources MUST register cleanup with lifecycle manager
 * STD-006: One canonical implementation (no duplication)
 * STD-007: Bounded resources (max handlers limit)
 */

import { randomUUID } from 'crypto';

export type CleanupHandler = () => void | Promise<void>;

export interface CleanupRegistration {
  id: string;
  name: string;
  handler: CleanupHandler;
  priority: number;
  registeredAt: number;
}

export interface CleanupResult {
  totalHandlers: number;
  succeeded: number;
  failed: number;
  durationMs: number;
}

const MAX_HANDLERS_HARD_LIMIT = 1000;
const registry = new Map<string, CleanupRegistration>();
// Map name -> id for quick lookups by name
const nameIndex = new Map<string, string>();

/**
 * Registers a cleanup handler. Handlers with the same name replace previous ones.
 * Throws if name is empty, handler is not a function, or max handlers exceeded.
 */
export function registerCleanup(
  name: string,
  handler: CleanupHandler,
  options?: { priority?: number }
): CleanupRegistration {
  if (!name || name.trim() === '') {
    throw new Error('Cleanup handler name cannot be empty');
  }
  if (typeof handler !== 'function') {
    throw new Error('Cleanup handler must be a function');
  }

  // If handler with same name exists, replace it (STD-006: no duplication)
  const existingId = nameIndex.get(name);
  if (existingId) {
    registry.delete(existingId);
    nameIndex.delete(name);
  }

  // Check max handler limit
  if (registry.size >= MAX_HANDLERS_HARD_LIMIT) {
    throw new Error(`Max handler limit reached (${MAX_HANDLERS_HARD_LIMIT}). Cannot register more cleanup handlers.`);
  }

  const id = randomUUID();
  const registration: CleanupRegistration = {
    id,
    name,
    handler,
    priority: options?.priority ?? 0,
    registeredAt: Date.now(),
  };

  registry.set(id, registration);
  nameIndex.set(name, id);

  return registration;
}

/**
 * Deregisters a cleanup handler by name or id.
 * Returns true if a handler was removed, false otherwise.
 */
export function deregisterCleanup(nameOrId: string): boolean {
  // Try by name first
  const idByName = nameIndex.get(nameOrId);
  if (idByName) {
    registry.delete(idByName);
    nameIndex.delete(nameOrId);
    return true;
  }

  // Try by id
  const registration = registry.get(nameOrId);
  if (registration) {
    registry.delete(nameOrId);
    nameIndex.delete(registration.name);
    return true;
  }

  return false;
}

/**
 * Executes all registered cleanup handlers in LIFO order.
 * Error isolation: one handler failing does not block others.
 * Clears registry after execution.
 */
export async function executeCleanup(): Promise<CleanupResult> {
  const startTime = Date.now();
  const handlers = Array.from(registry.values());

  // LIFO order: last registered runs first
  handlers.reverse();

  let succeeded = 0;
  let failed = 0;
  const totalHandlers = handlers.length;

  for (const registration of handlers) {
    try {
      await registration.handler();
      succeeded++;
    } catch (error) {
      failed++;
      console.error(`Cleanup handler '${registration.name}' failed: ${error}`);
    }
  }

  // Clear registry after execution
  registry.clear();
  nameIndex.clear();

  return {
    totalHandlers,
    succeeded,
    failed,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Returns a defensive copy of all registered handlers.
 */
export function getRegisteredHandlers(): CleanupRegistration[] {
  return Array.from(registry.values()).map(reg => ({ ...reg }));
}

/**
 * Clears all registered handlers without executing them.
 */
export function clearRegistry(): void {
  registry.clear();
  nameIndex.clear();
}
