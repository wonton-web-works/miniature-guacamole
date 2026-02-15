/**
 * Storage Adapter Exports
 *
 * Public API for storage adapters.
 */

export type {
  StorageAdapter,
  MemoryEvent,
  Subscription,
  QueryFilter,
  AdapterReadResult,
  AdapterWriteResult,
  AdapterDeleteResult,
  AdapterQueryResult,
} from './types';

export { FileAdapter } from './file-adapter';
export type { FileAdapterOptions } from './file-adapter';
