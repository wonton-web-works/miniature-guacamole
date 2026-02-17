/**
 * VectorSearchService — WS-ENT-6
 *
 * Semantic search over memory_entries using pgvector.
 *
 * AC-ENT-6.1: pgvector extension configured in migrations
 * AC-ENT-6.3: Hybrid queries (vector similarity + metadata filters)
 * AC-ENT-6.4: Async embedding generation (non-blocking)
 * AC-ENT-6.5: <200ms p95 latency for vector queries
 *
 * SECURITY: All SQL is parameterized. User values never interpolated into SQL strings.
 */

import type { Pool } from 'pg';
import type { EmbeddingProvider } from './embedding-provider';
import { VECTOR_COLUMN_DIMENSIONS } from './vector-migrations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VectorSearchResult {
  key: string;
  similarity: number;
  agent_id?: string;
  workstream_id?: string;
  timestamp?: string;
  data?: any;
}

export interface SearchFilters {
  agent_id?: string;
  workstream_id?: string;
  start?: string;
  end?: string;
}

export interface SearchOptions {
  filters?: SearchFilters;
  limit?: number;
  minSimilarity?: number;
}

export interface HybridSearchOptions extends SearchOptions {
  textQuery?: string;
}

export interface ReindexResult {
  indexed: number;
  errors: number;
}

export interface VectorSearchServiceConfig {
  pool: Pool;
  embeddingProvider: EmbeddingProvider;
}

const DEFAULT_LIMIT = 10;

// ---------------------------------------------------------------------------
// VectorSearchService
// ---------------------------------------------------------------------------

export class VectorSearchService {
  private readonly pool: Pool;
  private readonly embeddingProvider: EmbeddingProvider;

  constructor(config: VectorSearchServiceConfig) {
    const providerDims = config.embeddingProvider.getDimensions();
    if (providerDims !== VECTOR_COLUMN_DIMENSIONS) {
      throw new Error(
        `EmbeddingProvider returns ${providerDims} dimensions but schema column expects ${VECTOR_COLUMN_DIMENSIONS}. ` +
        `Check your provider config or run a schema migration.`
      );
    }
    this.pool = config.pool;
    this.embeddingProvider = config.embeddingProvider;
  }

  /**
   * Index a document by generating an embedding and storing it in memory_entries.
   */
  async indexDocument(key: string, text: string, metadata?: Partial<Pick<VectorSearchResult, 'agent_id' | 'workstream_id'>>): Promise<void> {
    // Validate key
    if (key === null || key === undefined || key === '') {
      throw new Error('key must not be null, undefined, or empty');
    }
    if (key.includes('../')) {
      throw new Error('key must not contain directory traversal sequences (../)');
    }

    // Validate text
    if (text === null || text === undefined) {
      throw new Error('text must not be null or undefined');
    }

    // Generate embedding
    const embedding = await this.embeddingProvider.generateEmbedding(text);

    // Validate dimensions
    const expectedDims = this.embeddingProvider.getDimensions();
    if (embedding.length !== expectedDims) {
      throw new Error(
        `dimension mismatch: provider reports ${expectedDims} dimensions but returned embedding has ${embedding.length}`
      );
    }

    // Parameterized UPDATE — never interpolate user values into SQL
    await this.pool.query(
      'UPDATE memory_entries SET embedding = $1 WHERE key = $2',
      [embedding, key]
    );
  }

  /**
   * Vector similarity search over memory_entries.
   * All filter values are parameterized.
   */
  async search(queryText: string, options: SearchOptions = {}): Promise<VectorSearchResult[]> {
    const { filters = {}, limit = DEFAULT_LIMIT, minSimilarity } = options;

    // Sanitize filters — only extract known safe keys to prevent prototype pollution
    const safeFilters: SearchFilters = {
      agent_id: Object.prototype.hasOwnProperty.call(filters, 'agent_id') ? (filters as any).agent_id : undefined,
      workstream_id: Object.prototype.hasOwnProperty.call(filters, 'workstream_id') ? (filters as any).workstream_id : undefined,
      start: Object.prototype.hasOwnProperty.call(filters, 'start') ? (filters as any).start : undefined,
      end: Object.prototype.hasOwnProperty.call(filters, 'end') ? (filters as any).end : undefined,
    };

    const queryEmbedding = await this.embeddingProvider.generateEmbedding(queryText);

    return this._executeVectorQuery(queryEmbedding, safeFilters, limit, minSimilarity);
  }

  /**
   * Hybrid search combining vector similarity with text matching.
   * All values are parameterized.
   */
  async hybridSearch(queryText: string, options: HybridSearchOptions = {}): Promise<VectorSearchResult[]> {
    const { filters = {}, limit = DEFAULT_LIMIT, minSimilarity, textQuery } = options;

    // Sanitize filters
    const safeFilters: SearchFilters = {
      agent_id: Object.prototype.hasOwnProperty.call(filters, 'agent_id') ? (filters as any).agent_id : undefined,
      workstream_id: Object.prototype.hasOwnProperty.call(filters, 'workstream_id') ? (filters as any).workstream_id : undefined,
      start: Object.prototype.hasOwnProperty.call(filters, 'start') ? (filters as any).start : undefined,
      end: Object.prototype.hasOwnProperty.call(filters, 'end') ? (filters as any).end : undefined,
    };

    const queryEmbedding = await this.embeddingProvider.generateEmbedding(queryText);

    if (!textQuery) {
      // No text filter — behaves like regular vector search
      return this._executeVectorQuery(queryEmbedding, safeFilters, limit, minSimilarity);
    }

    return this._executeHybridQuery(queryEmbedding, textQuery, safeFilters, limit, minSimilarity);
  }

  /**
   * Remove embedding from a memory_entries row (sets to NULL).
   * Idempotent — no error if key doesn't exist.
   */
  async deleteEmbedding(key: string): Promise<void> {
    await this.pool.query(
      'UPDATE memory_entries SET embedding = NULL WHERE key = $1',
      [key]
    );
  }

  /**
   * Regenerate embeddings for all entries in memory_entries.
   * Reads data JSON field for text content, continues on individual failures.
   */
  async reindexAll(batchSize?: number): Promise<ReindexResult> {
    const result = await this.pool.query(
      'SELECT key, data FROM memory_entries'
    );

    const rows = result.rows;
    if (rows.length === 0) {
      return { indexed: 0, errors: 0 };
    }

    let indexed = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        let text: string;
        try {
          const parsed = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
          text = parsed?.text ?? '';
        } catch {
          text = '';
        }

        const embedding = await this.embeddingProvider.generateEmbedding(text);
        await this.pool.query(
          'UPDATE memory_entries SET embedding = $1 WHERE key = $2',
          [embedding, row.key]
        );
        indexed++;
      } catch {
        errors++;
      }
    }

    return { indexed, errors };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async _executeVectorQuery(
    queryEmbedding: number[],
    filters: SearchFilters,
    limit: number,
    minSimilarity?: number
  ): Promise<VectorSearchResult[]> {
    const params: any[] = [queryEmbedding];
    const whereClauses: string[] = ['embedding IS NOT NULL'];

    if (filters.agent_id !== undefined) {
      params.push(filters.agent_id);
      whereClauses.push(`agent_id = $${params.length}`);
    }
    if (filters.workstream_id !== undefined) {
      params.push(filters.workstream_id);
      whereClauses.push(`workstream_id = $${params.length}`);
    }
    if (filters.start !== undefined) {
      params.push(filters.start);
      whereClauses.push(`timestamp >= $${params.length}`);
    }
    if (filters.end !== undefined) {
      params.push(filters.end);
      whereClauses.push(`timestamp <= $${params.length}`);
    }

    params.push(limit);
    const limitParam = params.length;

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT
        key,
        1 - (embedding <=> $1) AS similarity,
        agent_id,
        workstream_id,
        timestamp,
        data
      FROM memory_entries
      ${whereClause}
      ORDER BY embedding <=> $1
      LIMIT $${limitParam}
    `;

    const result = await this.pool.query(sql, params);
    let rows: VectorSearchResult[] = result.rows;

    // Post-filter by minSimilarity if provided
    if (minSimilarity !== undefined) {
      rows = rows.filter((r) => r.similarity >= minSimilarity);
    }

    return rows;
  }

  private async _executeHybridQuery(
    queryEmbedding: number[],
    textQuery: string,
    filters: SearchFilters,
    limit: number,
    minSimilarity?: number
  ): Promise<VectorSearchResult[]> {
    const params: any[] = [queryEmbedding];
    const whereClauses: string[] = ['embedding IS NOT NULL'];

    // Text query — parameterized, never interpolated
    params.push(`%${textQuery}%`);
    whereClauses.push(`key ILIKE $${params.length}`);

    if (filters.agent_id !== undefined) {
      params.push(filters.agent_id);
      whereClauses.push(`agent_id = $${params.length}`);
    }
    if (filters.workstream_id !== undefined) {
      params.push(filters.workstream_id);
      whereClauses.push(`workstream_id = $${params.length}`);
    }
    if (filters.start !== undefined) {
      params.push(filters.start);
      whereClauses.push(`timestamp >= $${params.length}`);
    }
    if (filters.end !== undefined) {
      params.push(filters.end);
      whereClauses.push(`timestamp <= $${params.length}`);
    }

    params.push(limit);
    const limitParam = params.length;

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT
        key,
        1 - (embedding <=> $1) AS similarity,
        agent_id,
        workstream_id,
        timestamp,
        data
      FROM memory_entries
      ${whereClause}
      ORDER BY embedding <=> $1
      LIMIT $${limitParam}
    `;

    const result = await this.pool.query(sql, params);
    let rows: VectorSearchResult[] = result.rows;

    if (minSimilarity !== undefined) {
      rows = rows.filter((r) => r.similarity >= minSimilarity);
    }

    return rows;
  }
}
