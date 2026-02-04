/**
 * Type definitions for the Shared Memory Layer
 *
 * Defines all interfaces and types used across the memory system.
 */

export interface MemoryEntry {
  timestamp: string;           // ISO 8601 format: "2026-02-04T10:00:00Z"
  agent_id: string;           // Agent identifier: "dev", "qa", "design", etc.
  workstream_id: string;      // Workstream identifier: "ws-1", "ws-2", etc.
  data: Record<string, any>;  // User-defined state payload
}

export interface MemoryWriteResult {
  success: boolean;
  path?: string;
  error?: string;
}

export interface MemoryReadResult {
  success: boolean;
  data?: Record<string, any> | null;
  error?: string;
}

export interface MemoryQuery {
  agent_id?: string;
  workstream_id?: string;
  start?: string;
  end?: string;
}

export interface ValidationResult {
  valid: boolean;
  format: string;
  error?: string;
}

export interface FileLock {
  filePath: string;
  locked: boolean;
  acquired_at: number;
}

export interface BackupResult {
  success: boolean;
  backup_path?: string;
  error?: string;
}

export interface Backup {
  id: string;
  timestamp: string;
  path: string;
  size: number;
}

export interface RestoreResult {
  success: boolean;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}
