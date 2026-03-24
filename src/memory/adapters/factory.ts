/**
 * Adapter Factory
 *
 * Returns a StorageAdapter instance based on the MG_STORAGE_ADAPTER environment variable.
 * OSS edition supports FileAdapter only. Postgres support is available
 * in the mg-premium package.
 *
 * AC-ENT-2.11: Backwards compatible — no env var = FileAdapter
 *
 * Stateless: reads env on every call so callers can switch adapters between calls.
 * Callers are responsible for calling close() when done.
 */

import { FileAdapter } from './file-adapter';
import { MEMORY_CONFIG } from '../config';
import type { StorageAdapter } from './types';
// Case-sensitive: env var must match exactly as registered.
import { getRegistered, listAdapters } from './registry';

export async function getAdapter(): Promise<StorageAdapter> {
  const adapterType = process.env.MG_STORAGE_ADAPTER;

  // Unset or empty string defaults to file
  if (!adapterType) {
    return new FileAdapter({ baseDir: MEMORY_CONFIG.MEMORY_DIR });
  }

  const normalizedType = adapterType.toLowerCase();

  switch (normalizedType) {
    case 'file':
      return new FileAdapter({ baseDir: MEMORY_CONFIG.MEMORY_DIR });

    default: {
      const registered = getRegistered(adapterType);
      if (registered) {
        // Each adapter reads its own config from the environment.
        return new registered();
      }
      throw new Error(
        `Unknown adapter type: "${adapterType}". Valid values: ${listAdapters().join(', ')}. ` +
        'For postgres support, use the mg-premium package.'
      );
    }
  }
}
