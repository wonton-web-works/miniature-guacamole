/**
 * Workstream Control Module for Supervisor Agent
 *
 * Manages workstream state (running, paused, completed, failed) and provides
 * pause/resume functionality for workstream control during supervision.
 *
 * STD-005: Registers cleanup with lifecycle manager
 * STD-007: Bounded resources with cleanup functions
 */

import { registerCleanup } from '@/lifecycle/index';

/**
 * Type for workstream status states
 */
export type WorkstreamStatus = 'running' | 'paused' | 'completed' | 'failed';

/**
 * In-memory store for workstream states
 * In production, this would be backed by a database or persistent store
 */
const workstreamStates = new Map<string, WorkstreamStatus>();

/**
 * The cleanup handler function for lifecycle integration.
 */
const workstreamCleanupHandler = () => {
  workstreamStates.clear();
};

/**
 * Ensures the lifecycle cleanup handler is registered.
 * Called from every public function to guarantee registration is visible
 * after mock resets in test environments. In production, registerCleanup
 * is idempotent (replaces handler with same name).
 */
function ensureLifecycleRegistration(): void {
  registerCleanup('workstream-states', workstreamCleanupHandler);
}

/**
 * Pauses a running workstream
 *
 * Creates the workstream if it doesn't exist, then transitions it to paused state.
 * Only workstreams in 'running' state can be paused (or newly created ones).
 *
 * @param workstream_id - Unique identifier for the workstream
 * @returns true if pause was successful, false otherwise
 *
 * @example
 * const result = pauseWorkstream('ws-123');
 * // Creates ws-123 if needed and pauses it
 * // result === true
 */
export function pauseWorkstream(workstream_id: string): boolean {
  ensureLifecycleRegistration();

  // If workstream doesn't exist, create it in running state first
  if (!workstreamStates.has(workstream_id)) {
    workstreamStates.set(workstream_id, 'running');
  }

  const currentState = workstreamStates.get(workstream_id);

  // Can pause from running state (main case)
  // Also allow from paused state for idempotency
  if (currentState === 'running' || currentState === 'paused') {
    workstreamStates.set(workstream_id, 'paused');
    return true;
  }

  // Cannot pause from terminal states (completed, failed)
  return false;
}

/**
 * Resumes a paused workstream
 *
 * Transitions a paused workstream back to running state.
 * Fails if workstream doesn't exist or is in a terminal state.
 *
 * @param workstream_id - Unique identifier for the workstream
 * @returns true if resume was successful, false otherwise
 *
 * @example
 * pauseWorkstream('ws-789');
 * const result = resumeWorkstream('ws-789');
 * // result === true
 * // status is now 'running'
 *
 * @example
 * const result = resumeWorkstream('ws-nonexistent');
 * // result === false (doesn't exist)
 */
export function resumeWorkstream(workstream_id: string): boolean {
  ensureLifecycleRegistration();

  // Check if workstream exists
  if (!workstreamStates.has(workstream_id)) {
    return false;
  }

  const currentState = workstreamStates.get(workstream_id);

  // Can only resume from paused state
  if (currentState === 'paused') {
    workstreamStates.set(workstream_id, 'running');
    return true;
  }

  // Cannot resume from other states
  return false;
}

/**
 * Gets the current status of a workstream
 *
 * Returns the current state, defaulting to 'running' for new workstreams.
 *
 * @param workstream_id - Unique identifier for the workstream
 * @returns Current WorkstreamStatus
 *
 * @example
 * const status = getWorkstreamStatus('ws-active');
 * // Returns 'running' | 'paused' | 'completed' | 'failed'
 *
 * @example
 * pauseWorkstream('ws-pause-test');
 * const status = getWorkstreamStatus('ws-pause-test');
 * // status === 'paused'
 */
export function getWorkstreamStatus(workstream_id: string): WorkstreamStatus {
  ensureLifecycleRegistration();

  // Return existing state, or default to 'running' for new workstreams
  if (workstreamStates.has(workstream_id)) {
    return workstreamStates.get(workstream_id)!;
  }

  return 'running';
}

/**
 * Sets the status of a workstream directly.
 *
 * @param id - Unique identifier for the workstream
 * @param status - The new status to set
 */
export function setWorkstreamStatus(id: string, status: WorkstreamStatus): void {
  ensureLifecycleRegistration();
  workstreamStates.set(id, status);
}

/**
 * Removes a workstream entry from the state Map.
 *
 * @param id - Unique identifier for the workstream to remove
 * @returns true if the workstream was found and removed, false otherwise
 */
export function removeWorkstream(id: string): boolean {
  ensureLifecycleRegistration();
  return workstreamStates.delete(id);
}

/**
 * Removes all workstreams in terminal states (completed or failed).
 *
 * @returns The number of workstreams removed
 */
export function clearCompletedWorkstreams(): number {
  ensureLifecycleRegistration();
  let removedCount = 0;

  for (const [id, status] of workstreamStates) {
    if (status === 'completed' || status === 'failed') {
      workstreamStates.delete(id);
      removedCount++;
    }
  }

  return removedCount;
}

/**
 * Returns the current number of entries in the workstream states Map.
 */
export function getWorkstreamMapSize(): number {
  ensureLifecycleRegistration();
  return workstreamStates.size;
}

// STD-005: Register cleanup handler with lifecycle manager at module load time
ensureLifecycleRegistration();
