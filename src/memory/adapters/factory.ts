/**
 * Adapter Factory
 *
 * Returns a StorageAdapter instance based on the MG_STORAGE_ADAPTER environment variable.
 * OSS edition supports FileAdapter only. Enterprise postgres support is available
 * in the mg-enterprise package.
 *
 * AC-ENT-2.11: Backwards compatible — no env var = FileAdapter
 *
 * Stateless: reads env on every call so callers can switch adapters between calls.
 * Callers are responsible for calling close() when done.
 */

import { FileAdapter } from './file-adapter';
import { MEMORY_CONFIG } from '../config';
import type { StorageAdapter } from './types';

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

    default:
      throw new Error(
        `Unknown adapter type: "${adapterType}". Valid values are "file". ` +
        'For postgres support, use the mg-enterprise package.'
      );
  }
}
