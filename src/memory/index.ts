/**
 * Shared Memory Layer - Public API
 *
 * Exports all memory operations for use by agents and external clients.
 */

// Types
export * from './types';

// Configuration
export { MEMORY_CONFIG } from './config';

// Core operations
export { writeMemory } from './write';
export { readMemory } from './read';
export { queryMemory } from './query';
export { validateMemoryFile } from './validate';

// Locking
export { acquireLock, releaseLock } from './locking';

// Backup and recovery
export {
  createBackup,
  listBackups,
  restoreFromBackup,
  deleteMemory,
  cleanupOldBackups,
} from './backup';

// Error handling
export {
  recoverMemory,
  validatePath,
  checkDiskSpace,
  detectCircularReferences,
  isValidUTF8,
} from './errors';
