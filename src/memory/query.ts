/**
 * Query operations for the Shared Memory Layer
 *
 * Handles filtering and retrieving memory entries by various criteria.
 */

import * as fs from 'fs';
import * as path from 'path';
import { MemoryEntry, MemoryQuery } from './types';
import { MEMORY_CONFIG } from './config';
import { parseJSON } from './utils';

export async function queryMemory(filters: MemoryQuery): Promise<MemoryEntry[]> {
  try {
    const results: MemoryEntry[] = [];

    // Read all JSON files from memory directory
    if (!fs.existsSync(MEMORY_CONFIG.MEMORY_DIR)) {
      return [];
    }

    const files = fs.readdirSync(MEMORY_CONFIG.MEMORY_DIR);

    for (const file of files) {
      // Skip non-JSON files and backups directory
      if (!file.endsWith('.json') || file === 'backups') {
        continue;
      }

      const filePath = path.join(MEMORY_CONFIG.MEMORY_DIR, file);
      const stat = fs.statSync(filePath);

      if (!stat.isFile()) {
        continue;
      }

      try {
        const content = fs.readFileSync(filePath, MEMORY_CONFIG.ENCODING);
        const data = parseJSON(content);

        // Apply filters
        if (filters.agent_id && data.agent_id !== filters.agent_id) {
          continue;
        }

        if (filters.workstream_id && data.workstream_id !== filters.workstream_id) {
          continue;
        }

        if (filters.start && data.timestamp < filters.start) {
          continue;
        }

        if (filters.end && data.timestamp > filters.end) {
          continue;
        }

        results.push(data);
      } catch (error) {
        // Skip files that can't be parsed
        continue;
      }
    }

    // Sort by timestamp (chronological order)
    results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return results;
  } catch (error) {
    return [];
  }
}
