import { isPostgresMode, getMemoryPath } from '../config.js';
import * as filesystemReader from './filesystem-reader.js';
import * as postgresReader from './postgres-reader.js';
import type { WorkstreamSummary, WorkstreamDetail, WorkstreamCounts, MemoryEntry, AgentEvent } from '../types.js';

// ---------------------------------------------------------------------------
// Unified data layer — Postgres-first with filesystem fallback
// The tests mock this module directly, so all three functions must be exported
// from here (not re-exported from individual readers).
// ---------------------------------------------------------------------------

export async function getAllWorkstreams(
  memoryPath: string = getMemoryPath()
): Promise<WorkstreamSummary[]> {
  if (isPostgresMode()) {
    try {
      return await postgresReader.getAllWorkstreams(memoryPath);
    } catch (err) {
      console.warn('[mcp-server] Postgres getAllWorkstreams failed, falling back to filesystem:', err);
    }
  }
  return filesystemReader.getAllWorkstreams(memoryPath);
}

export async function getWorkstreamById(
  id: string,
  memoryPath: string = getMemoryPath()
): Promise<WorkstreamDetail | null> {
  if (isPostgresMode()) {
    try {
      return await postgresReader.getWorkstreamById(id, memoryPath);
    } catch (err) {
      console.warn('[mcp-server] Postgres getWorkstreamById failed, falling back to filesystem:', err);
    }
  }
  return filesystemReader.getWorkstreamById(id, memoryPath);
}

export async function getWorkstreamCounts(
  memoryPath: string = getMemoryPath()
): Promise<WorkstreamCounts> {
  if (isPostgresMode()) {
    try {
      return await postgresReader.getWorkstreamCounts(memoryPath);
    } catch (err) {
      console.warn('[mcp-server] Postgres getWorkstreamCounts failed, falling back to filesystem:', err);
    }
  }
  return filesystemReader.getWorkstreamCounts(memoryPath);
}

// ---------------------------------------------------------------------------
// Memory + Agent Event functions (WS-MCP-0B)
// ---------------------------------------------------------------------------

export async function getAllMemoryEntries(
  options: { memoryPath?: string; workstream_id?: string } = {}
): Promise<Pick<MemoryEntry, 'key' | 'agent_id' | 'workstream_id' | 'timestamp'>[]> {
  const memoryPath = options.memoryPath ?? getMemoryPath();
  const workstreamId = options.workstream_id;
  if (isPostgresMode()) {
    try {
      return await postgresReader.getAllMemoryEntries(memoryPath, undefined, workstreamId);
    } catch (err) {
      console.warn('[mcp-server] Postgres getAllMemoryEntries failed, falling back to filesystem:', err);
    }
  }
  return filesystemReader.getAllMemoryEntries(memoryPath, workstreamId);
}

export async function getMemoryEntry(
  key: string,
  options: { memoryPath?: string } | string = {}
): Promise<MemoryEntry | null> {
  // Accept either an options object or a plain string for memoryPath (for test compatibility)
  const memoryPath = typeof options === 'string' ? options : (options.memoryPath ?? getMemoryPath());
  if (isPostgresMode()) {
    try {
      return await postgresReader.getMemoryEntry(key, memoryPath);
    } catch (err) {
      console.warn('[mcp-server] Postgres getMemoryEntry failed, falling back to filesystem:', err);
    }
  }
  return filesystemReader.getMemoryEntry(key, memoryPath);
}

export async function getAgentEvents(
  options: { limit?: number; workstream_id?: string; memoryPath?: string } = {}
): Promise<AgentEvent[]> {
  const { limit = 50, workstream_id: workstreamId } = options;
  if (isPostgresMode()) {
    try {
      return await postgresReader.getAgentEvents({ limit, workstreamId });
    } catch (err) {
      console.warn('[mcp-server] Postgres getAgentEvents failed, falling back to filesystem:', err);
    }
  }
  // Filesystem fallback: events are Postgres-only, return empty array
  return filesystemReader.getAgentEvents();
}
