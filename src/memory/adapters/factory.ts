/**
 * Adapter Factory — WS-ENT-2
 *
 * Returns a StorageAdapter instance based on the MG_STORAGE_ADAPTER environment variable.
 *
 * AC-ENT-2.8: Adapter factory with env-var switch (MG_STORAGE_ADAPTER=postgres|file)
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

    case 'postgres': {
      const connectionString = process.env.MG_POSTGRES_URL;
      if (!connectionString) {
        throw new Error(
          'MG_POSTGRES_URL must be set when MG_STORAGE_ADAPTER=postgres. ' +
          'Example: postgresql://mg:mg@localhost:5432/mg_memory'
        );
      }
      // Dynamic import — enterprise/ is outside rootDir, load only at runtime
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const enterprisePath = '../../../enterprise/src/storage/postgres-adapter';
      const mod = await (import(enterprisePath) as Promise<{ PostgresAdapter: new (opts: { connectionString: string }) => StorageAdapter }>);
      const { PostgresAdapter } = mod;
      return new PostgresAdapter({ connectionString });
    }

    default:
      throw new Error(
        `Unknown adapter type: "${adapterType}". Valid values are "file" or "postgres".`
      );
  }
}
