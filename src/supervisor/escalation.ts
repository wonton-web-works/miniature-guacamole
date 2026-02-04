/**
 * Escalation Module for Supervisor Agent
 *
 * Determines when to trigger escalations based on supervision context,
 * such as depth violations, loops, failures, or timeouts.
 */

/**
 * Context for escalation decision making
 */
export interface SupervisorContext {
  /** Whether delegation depth was exceeded */
  depth_exceeded?: boolean;
  /** Whether a task loop was detected */
  loop_detected?: boolean;
  /** Whether an agent failed */
  agent_failed?: boolean;
  /** Whether a timeout was triggered */
  timeout_triggered?: boolean;
  /** Agent that triggered the escalation */
  from_agent?: string;
  /** Agent/team to escalate to */
  to_agent?: string;
}

/**
 * Escalation trigger result
 */
export interface EscalationTrigger {
  /** Whether escalation should occur */
  triggered: boolean;
  /** Reason for escalation */
  reason: string;
  /** Agent reporting the issue */
  from_agent: string;
  /** Agent/team to escalate to */
  to_agent: string;
}

/**
 * Checks if escalation should be triggered based on supervision context
 *
 * Returns null if no escalation needed, otherwise returns EscalationTrigger
 *
 * @param context - SupervisorContext with escalation conditions
 * @returns EscalationTrigger if escalation needed, null otherwise
 *
 * @example
 * const context = {
 *   depth_exceeded: true,
 *   loop_detected: false,
 *   agent_failed: false,
 *   timeout_triggered: false,
 *   from_agent: 'dev',
 *   to_agent: 'leadership-team'
 * };
 * const escalation = checkEscalation(context);
 * // escalation.triggered === true
 * // escalation.reason includes 'depth'
 *
 * @example
 * const context = {
 *   depth_exceeded: false,
 *   loop_detected: false,
 *   agent_failed: false,
 *   timeout_triggered: false,
 *   from_agent: 'dev',
 *   to_agent: 'dev'
 * };
 * const escalation = checkEscalation(context);
 * // escalation === null
 */
export function checkEscalation(context: SupervisorContext): EscalationTrigger | null {
  // Check if any escalation condition is triggered
  const conditions = [
    context.depth_exceeded,
    context.loop_detected,
    context.agent_failed,
    context.timeout_triggered
  ];

  // If no conditions are true, no escalation needed
  if (!conditions.some(condition => condition === true)) {
    return null;
  }

  // Build escalation reason from triggered conditions
  const reasons: string[] = [];

  if (context.depth_exceeded) {
    reasons.push('depth exceeded');
  }
  if (context.loop_detected) {
    reasons.push('loop detected');
  }
  if (context.agent_failed) {
    reasons.push('agent failure');
  }
  if (context.timeout_triggered) {
    reasons.push('timeout triggered');
  }

  const reason = `Escalation triggered: ${reasons.join(', ')}`;

  return {
    triggered: true,
    reason,
    from_agent: context.from_agent || '',
    to_agent: context.to_agent || ''
  };
}
