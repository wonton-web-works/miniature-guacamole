/**
 * Vector Search Migrations — WS-ENT-6
 *
 * Defines migration SQL for pgvector extension and embedding column.
 *
 * AC-ENT-6.1: pgvector extension configured in migrations
 *
 * Version range: 4000+ (above platform schema 3000+ range)
 */

import type { Migration } from '../storage/migrations';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Vector schema migration versions start here.
 * Must not collide with platform schema (3000+), RLS migrations (2000+),
 * or postgres adapter migrations (1000+).
 * Using 4000+ range.
 */
export const VECTOR_SCHEMA_VERSION_START = 4000;

/**
 * The vector column dimension size used in migrations.
 * Must match the embedding provider dimensions when wiring VectorSearchService.
 */
export const VECTOR_COLUMN_DIMENSIONS = 768;

// ---------------------------------------------------------------------------
// buildVectorMigrations
// ---------------------------------------------------------------------------

/**
 * Build an array of Migration objects for the vector search schema.
 *
 * Migrations:
 *   4000 — CREATE EXTENSION IF NOT EXISTS vector
 *   4001 — ADD COLUMN IF NOT EXISTS embedding vector(768) on memory_entries
 *   4002 — CREATE INDEX USING hnsw on embedding with vector_cosine_ops
 */
export function buildVectorMigrations(): Migration[] {
  return [
    {
      version: 4000,
      up: 'CREATE EXTENSION IF NOT EXISTS vector',
      down: 'DROP EXTENSION IF EXISTS vector',
    },
    {
      version: 4001,
      up: 'ALTER TABLE memory_entries ADD COLUMN IF NOT EXISTS embedding vector(768)',
      down: 'ALTER TABLE memory_entries DROP COLUMN IF EXISTS embedding',
    },
    {
      version: 4002,
      up: 'CREATE INDEX IF NOT EXISTS memory_entries_embedding_hnsw_idx ON memory_entries USING hnsw (embedding vector_cosine_ops)',
      down: 'DROP INDEX IF EXISTS memory_entries_embedding_hnsw_idx',
    },
  ];
}
