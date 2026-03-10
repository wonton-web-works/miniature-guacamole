import { isPostgresMode, getMemoryPath } from '../config.js';
import * as filesystemReader from './filesystem-reader.js';
import * as postgresReader from './postgres-reader.js';
import type { WorkstreamSummary, WorkstreamDetail, WorkstreamCounts } from '../types.js';

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
