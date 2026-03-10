/**
 * Query operations for the Shared Memory Layer
 *
 * Handles filtering and retrieving memory entries by various criteria.
 * Delegates to the StorageAdapter (FileAdapter by default, PostgresAdapter when
 * MG_STORAGE_ADAPTER=postgres) instead of hitting the filesystem directly.
 *
 * AC-ENT-2.9: query.ts migrated to use adapter pattern
 */

import { MemoryEntry, MemoryQuery } from './types';
import { getAdapter } from './adapters/factory';

export async function queryMemory(filters: MemoryQuery): Promise<MemoryEntry[]> {
  try {
    if (!filters || typeof filters !== 'object') {
      return [];
    }

    const adapter = await getAdapter();
    const results = await adapter.query({
      agent_id: filters.agent_id,
      workstream_id: filters.workstream_id,
      start: filters.start,
      end: filters.end,
    });

    // Ensure chronological sort (adapters should sort, but guarantee it here)
    results.sort(
      (a: MemoryEntry, b: MemoryEntry) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return results as MemoryEntry[];
  } catch {
    return [];
  }
}
