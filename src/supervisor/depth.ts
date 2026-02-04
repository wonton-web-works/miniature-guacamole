/**
 * Depth Tracking Module for Supervisor Agent
 *
 * Tracks delegation depth (how many levels deep in agent chain) and enforces
 * the maximum depth limit of 3 levels.
 */

/**
 * Represents the current state of delegation chain depth
 */
export interface DepthTracker {
  /** Current depth in delegation chain */
  current: number;
  /** Maximum allowed depth */
  max: number;
  /** Chain of agent names in delegation */
  chain: string[];
}

/**
 * Creates a depth tracker for a delegation chain
 *
 * @param chain - Array of agent names in delegation chain
 * @param maxDepth - Maximum allowed depth (default 3)
 * @returns DepthTracker object
 *
 * @example
 * const tracker = trackDepth(['agent-a', 'agent-b', 'agent-c']);
 * // tracker.current === 3
 * // tracker.chain === ['agent-a', 'agent-b', 'agent-c']
 */
export function trackDepth(chain: string[], maxDepth: number = 3): DepthTracker {
  return {
    current: chain.length,
    max: maxDepth,
    chain: [...chain]
  };
}

/**
 * Checks if delegation depth has exceeded the maximum
 *
 * @param tracker - DepthTracker to check
 * @returns true if current depth exceeds max, false otherwise
 *
 * @example
 * const tracker = trackDepth(['a', 'b', 'c', 'd']);
 * isDepthExceeded(tracker); // true (4 > 3)
 *
 * @example
 * const tracker = trackDepth(['a', 'b', 'c']);
 * isDepthExceeded(tracker); // false (3 === 3)
 */
export function isDepthExceeded(tracker: DepthTracker): boolean {
  return tracker.current > tracker.max;
}
