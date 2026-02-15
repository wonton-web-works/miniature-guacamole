/**
 * Storage Adapter Interface Types
 *
 * Defines the StorageAdapter interface for pluggable storage backends.
 * All adapters must implement this interface for CRUD operations,
 * pub/sub, and EventEmitter integration.
 */

import { EventEmitter } from 'events';
import type { MemoryEntry } from '../types';

export interface MemoryEvent {
  type: 'written' | 'deleted' | 'queried';
  key?: string;
  timestamp: string;
  filters?: any;
  data?: any;
}

export interface Subscription {
  unsubscribe: () => void;
}

export interface QueryFilter {
  agent_id?: string;
  workstream_id?: string;
  start?: string;
  end?: string;
}

export interface AdapterReadResult {
  success: boolean;
  data?: any | null;
  error?: string;
}

export interface AdapterWriteResult {
  success: boolean;
  path?: string;
  error?: string;
}

export interface AdapterDeleteResult {
  success: boolean;
  error?: string;
}

export type AdapterQueryResult = MemoryEntry[];

export interface StorageAdapter {
  // Core CRUD
  read(key: string): Promise<AdapterReadResult>;
  write(key: string, data: any): Promise<AdapterWriteResult>;
  query(filter: QueryFilter): Promise<AdapterQueryResult>;
  delete(key: string): Promise<AdapterDeleteResult>;

  // Pub/sub
  subscribe(channel: string, callback: (event: MemoryEvent) => void): () => void;
  publish(channel: string, event: MemoryEvent): void;

  // Cleanup
  close(): Promise<void>;
}
