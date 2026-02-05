/**
 * WS-21: Git Integration and LFS Support - Public API
 *
 * Exports all git integration and LFS functions.
 */

// Commit operations
export {
  commitApprovedVisual,
  commitMultipleVisuals,
  validateGitRepository,
  checkUncommittedChanges,
  buildCommitMessage,
} from './commit';

// LFS operations
export {
  isLfsInstalled,
  isLfsInitialized,
  checkLfsPrerequisites,
  shouldUseLfs,
  trackFileWithLfs,
  configureGitAttributes,
  ensureLfsTracking,
} from './lfs';
