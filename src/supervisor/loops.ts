/**
 * Loop Detection Module for Supervisor Agent
 *
 * Detects when agents repeatedly execute the same task, which could indicate
 * an infinite loop or a failing agent that keeps retrying the same action.
 */

/**
 * Result of loop detection analysis
 */
export interface LoopDetector {
  /** Full history of tasks checked */
  taskHistory: string[];
  /** Whether a loop was detected */
  loopDetected: boolean;
  /** The repeated task (if loop detected) */
  repeatedTask?: string;
}

/**
 * Detects if a task appears 3+ times in history (indicating a loop)
 *
 * @param history - Array of task descriptions in chronological order
 * @returns LoopDetector result
 *
 * @example
 * const result = detectLoop(['Fix auth', 'Test', 'Fix auth', 'Deploy', 'Fix auth']);
 * // result.loopDetected === true
 * // result.repeatedTask === 'Fix auth'
 *
 * @example
 * const result = detectLoop(['Task A', 'Task B', 'Task C']);
 * // result.loopDetected === false
 * // result.repeatedTask === undefined
 */
export function detectLoop(history: string[]): LoopDetector {
  const taskCounts = new Map<string, number>();

  for (const task of history) {
    const count = (taskCounts.get(task) || 0) + 1;
    taskCounts.set(task, count);

    // Loop detected when any task reaches 3 occurrences
    if (count >= 3) {
      return {
        taskHistory: history,
        loopDetected: true,
        repeatedTask: task
      };
    }
  }

  return {
    taskHistory: history,
    loopDetected: false
  };
}
