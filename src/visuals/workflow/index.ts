/**
 * WS-20: Art Director Approval Workflow - Module Exports
 *
 * Centralized exports for approval workflow functionality.
 */

// Commands
export {
  reviewVisuals,
  approveVisual,
  rejectVisual,
  batchApproveAll,
} from './commands';

// Approvals
export {
  recordApproval,
  getApprovalHistory,
  getApprovalsByVisualId,
  getApprovalsByReviewer,
  getApprovalsByAction,
  getApprovalsByDateRange,
} from './approvals';

// Types
export type {
  ApprovalRecord,
  ApprovalAction,
  BatchApprovalResult,
  ReviewOptions,
  BatchOptions,
} from './types';
