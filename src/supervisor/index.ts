/**
 * Supervisor Agent System
 *
 * Provides active oversight of agent activities with:
 * - Delegation depth tracking and enforcement
 * - Task loop detection
 * - Automatic escalation triggering
 * - Workstream control and state management
 */

// Depth tracking exports
export { trackDepth, isDepthExceeded } from './depth';
export type { DepthTracker } from './depth';

// Loop detection exports
export { detectLoop } from './loops';
export type { LoopDetector } from './loops';

// Escalation exports
export { checkEscalation } from './escalation';
export type { SupervisorContext, EscalationTrigger } from './escalation';

// Workstream control exports
export {
  pauseWorkstream,
  resumeWorkstream,
  getWorkstreamStatus
} from './control';
export type { WorkstreamStatus } from './control';
