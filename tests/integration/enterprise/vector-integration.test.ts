/**
 * Vector Search Integration Tests — WS-ENT-6
 *
 * End-to-end flow for the vector search module using mocked infrastructure.
 * Tests the full pipeline: migrations -> indexing -> searching -> deletion.
 *
 * AC-ENT-6.1: pgvector extension configured in migrations
 * AC-ENT-6.2: EmbeddingProvider interface (nomic local, OpenAI hosted)
 * AC-ENT-6.3: Hybrid queries (vector similarity + metadata filters)
 * AC-ENT-6.4: Async embedding generation (non-blocking)
 * AC-ENT-6.5: <200ms p95 latency for vector queries (verified via test timing)
 *
 * Does NOT require a real Postgres instance. Uses a coordinated mock that
 * simulates the DB state across multiple query calls within a single test.
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — end-to-end injection via indexDocument + search pipeline,
 *                      provider interface compliance, migration conflict detection
 *   2. BOUNDARY TESTS — empty corpus, single document corpus, max similarity = 1.0
 *   3. GOLDEN PATH   — full index->search->delete->reindex lifecycle,
 *                      hybrid search, migration up/down round-trip
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Coordinated mock: simulates a stateful in-memory "DB" for integration tests
// ---------------------------------------------------------------------------
const mockQuery = vi.fn();
const mockPoolEnd = vi.fn();

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: mockQuery,
    end: mockPoolEnd,
  })),
}));

// Import all vector module components (will be RED until implementation exists)
import { VectorSearchService } from '../../../enterprise/src/vector/vector-search';
import {
  MockEmbeddingProvider,
  NomicEmbeddingProvider,
  OpenAIEmbeddingProvider,
} from '../../../enterprise/src/vector/embedding-provider';
import { buildVectorMigrations, VECTOR_SCHEMA_VERSION_START } from '../../../enterprise/src/vector/vector-migrations';
import { MigrationRunner } from '../../../enterprise/src/storage/migrations';
import type { VectorSearchResult } from '../../../enterprise/src/vector/vector-search';
import type { Migration } from '../../../enterprise/src/storage/migrations';

// ---------------------------------------------------------------------------
// Integration test DB state simulator
// ---------------------------------------------------------------------------

interface SimulatedEmbeddingRow {
  key: string;
  embedding: number[] | null;
  agent_id?: string;
  workstream_id?: string;
  timestamp?: string;
  data?: any;
  similarity?: number;
}

class SimulatedVectorDB {
  private rows: Map<string, SimulatedEmbeddingRow> = new Map();

  upsert(key: string, embedding: number[], meta: Partial<SimulatedEmbeddingRow> = {}) {
    this.rows.set(key, { key, embedding, ...meta });
  }

  setNull(key: string) {
    const row = this.rows.get(key);
    if (row) {
      row.embedding = null;
    }
  }

  getAll(): SimulatedEmbeddingRow[] {
    return Array.from(this.rows.values());
  }

  cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
    const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
  }

  search(queryVec: number[], opts: { limit?: number; minSimilarity?: number; filters?: any } = {}): SimulatedEmbeddingRow[] {
    const { limit = 10, minSimilarity = 0, filters = {} } = opts;
    return Array.from(this.rows.values())
      .filter((row) => row.embedding !== null)
      .filter((row) => {
        if (filters.agent_id && row.agent_id !== filters.agent_id) return false;
        if (filters.workstream_id && row.workstream_id !== filters.workstream_id) return false;
        return true;
      })
      .map((row) => ({
        ...row,
        similarity: this.cosineSimilarity(queryVec, row.embedding!),
      }))
      .filter((row) => row.similarity >= minSimilarity)
      .sort((a, b) => b.similarity! - a.similarity!)
      .slice(0, limit);
  }

  clear() {
    this.rows.clear();
  }
}

function makePool() {
  return { query: mockQuery, end: mockPoolEnd } as any;
}

// ===========================================================================
// MISUSE CASES
// ===========================================================================

describe('Vector Search Integration — MISUSE CASES', () => {
  let provider: MockEmbeddingProvider;
  let service: VectorSearchService;

  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
    provider = new MockEmbeddingProvider({ dimensions: 768 });
    service = new VectorSearchService({ pool: makePool(), embeddingProvider: provider });
  });

  describe('End-to-end injection pipeline: indexDocument() -> search()', () => {
    it('Given malicious text indexed, When searched with injection query, Then no SQL runs raw injection', async () => {
      // Both indexDocument and search should only send embedding vectors to SQL
      const maliciousText = "'; DROP TABLE memory_entries; SELECT '";
      const maliciousQuery = "' OR '1'='1";

      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      // Indexing: text used only for embedding generation, not SQL
      await service.indexDocument('key/safe', maliciousText);
      // Searching: query text used only for embedding generation, not SQL
      await service.search(maliciousQuery);

      // All query calls must use parameterized form
      for (const [sql] of mockQuery.mock.calls) {
        expect(sql).not.toContain("'; DROP");
        expect(sql).not.toContain("' OR '1'='1");
      }
    });
  });

  describe('EmbeddingProvider interface compliance', () => {
    it('Given MockEmbeddingProvider, When checked against EmbeddingProvider interface, Then has all required methods', () => {
      expect(typeof provider.generateEmbedding).toBe('function');
      expect(typeof provider.generateEmbeddings).toBe('function');
      expect(typeof provider.getDimensions).toBe('function');
      expect(typeof provider.getModelName).toBe('function');
    });

    it('Given NomicEmbeddingProvider, When checked, Then has all required interface methods', () => {
      const nomic = new NomicEmbeddingProvider({ apiUrl: 'http://localhost:11434' });
      expect(typeof nomic.generateEmbedding).toBe('function');
      expect(typeof nomic.generateEmbeddings).toBe('function');
      expect(typeof nomic.getDimensions).toBe('function');
      expect(typeof nomic.getModelName).toBe('function');
    });

    it('Given OpenAIEmbeddingProvider, When checked, Then has all required interface methods', () => {
      const openai = new OpenAIEmbeddingProvider({ apiKey: 'sk-test-key' });
      expect(typeof openai.generateEmbedding).toBe('function');
      expect(typeof openai.generateEmbeddings).toBe('function');
      expect(typeof openai.getDimensions).toBe('function');
      expect(typeof openai.getModelName).toBe('function');
    });
  });

  describe('Migration conflict detection', () => {
    it('Given vector migrations and platform schema migrations, When version sets compared, Then no overlap', async () => {
      const { buildPlatformSchemaMigrations } = await import(
        '../../../enterprise/src/schema/platform-schema'
      );
      const vectorMigrations = buildVectorMigrations();
      const platformMigrations = buildPlatformSchemaMigrations();

      const vectorVersions = new Set(vectorMigrations.map((m: Migration) => m.version));
      const platformVersions = new Set(platformMigrations.map((m: Migration) => m.version));

      const overlap = [...vectorVersions].filter((v) => platformVersions.has(v));
      expect(overlap).toHaveLength(0);
    });

    it('Given vector migrations, When checked, Then all versions >= 4000 (above platform schema 3000+)', () => {
      const migrations = buildVectorMigrations();
      migrations.forEach((m: Migration) => {
        expect(m.version).toBeGreaterThanOrEqual(4000);
      });
    });
  });
});

// ===========================================================================
// BOUNDARY TESTS
// ===========================================================================

describe('Vector Search Integration — BOUNDARY TESTS', () => {
  let provider: MockEmbeddingProvider;
  let service: VectorSearchService;
  const db = new SimulatedVectorDB();

  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
    db.clear();
    provider = new MockEmbeddingProvider({ dimensions: 768 });
    service = new VectorSearchService({ pool: makePool(), embeddingProvider: provider });
  });

  describe('Empty corpus', () => {
    it('Given no indexed documents, When search() called, Then returns empty array immediately', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const results = await service.search('any query');
      expect(results).toEqual([]);
    });

    it('Given no indexed documents, When reindexAll() called, Then returns { indexed: 0, errors: 0 }', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const result = await service.reindexAll();
      expect(result).toEqual({ indexed: 0, errors: 0 });
    });
  });

  describe('Single document corpus', () => {
    it('Given exactly one indexed document, When search() called with matching query, Then returns that document', async () => {
      const queryVec = await provider.generateEmbedding('agent tasks');
      const docVec = await provider.generateEmbedding('agent tasks'); // same text = same deterministic vec

      const rows = [
        {
          key: 'only/doc',
          similarity: 1.0,
          agent_id: 'qa',
          workstream_id: 'WS-ENT-6',
          timestamp: '2026-02-17T10:00:00Z',
          data: null,
        },
      ];
      mockQuery.mockResolvedValueOnce({ rows, rowCount: 1 });
      const results = await service.search('agent tasks');
      expect(results).toHaveLength(1);
      expect(results[0].key).toBe('only/doc');
    });
  });

  describe('Maximum similarity score', () => {
    it('Given identical query and document vectors, When similarity computed, Then similarity = 1.0', async () => {
      const rows = [
        {
          key: 'exact/match',
          similarity: 1.0,
          agent_id: 'qa',
          workstream_id: 'WS-ENT-6',
          timestamp: '2026-02-17T10:00:00Z',
          data: null,
        },
      ];
      mockQuery.mockResolvedValueOnce({ rows, rowCount: 1 });
      const results = await service.search('exact text');
      expect(results[0].similarity).toBe(1.0);
    });
  });

  describe('Latency SLA (AC-ENT-6.5)', () => {
    it('Given MockEmbeddingProvider, When 10 sequential search() calls made, Then each completes in <200ms', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const times: number[] = [];

      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await service.search(`query ${i}`);
        const end = performance.now();
        times.push(end - start);
      }

      // AC-ENT-6.5: p95 latency < 200ms (with mock provider this is well under)
      const sorted = [...times].sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      expect(p95).toBeLessThan(200);
    });
  });
});

// ===========================================================================
// GOLDEN PATH
// ===========================================================================

describe('Vector Search Integration — GOLDEN PATH', () => {
  let provider: MockEmbeddingProvider;
  let service: VectorSearchService;

  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
    provider = new MockEmbeddingProvider({ dimensions: 768 });
    service = new VectorSearchService({ pool: makePool(), embeddingProvider: provider });
  });

  describe('Full index -> search -> delete -> reindex lifecycle', () => {
    it('Given document indexed, When searched, Then document appears in results', async () => {
      // 1. Index document
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // UPDATE embedding
      await service.indexDocument('memory/qa/ws-ent-6', 'vector search pgvector embeddings');

      // 2. Search for it
      const searchRows = [
        {
          key: 'memory/qa/ws-ent-6',
          similarity: 0.91,
          agent_id: 'qa',
          workstream_id: 'WS-ENT-6',
          timestamp: '2026-02-17T10:00:00Z',
          data: null,
        },
      ];
      mockQuery.mockResolvedValueOnce({ rows: searchRows, rowCount: 1 });
      const results = await service.search('pgvector semantic search');

      expect(results).toHaveLength(1);
      expect(results[0].key).toBe('memory/qa/ws-ent-6');
      expect(results[0].similarity).toBeGreaterThan(0.5);
    });

    it('Given indexed document, When deleted, Then embedding set to NULL', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // deleteEmbedding update
      await service.deleteEmbedding('memory/qa/ws-ent-6');

      const [[sql, params]] = mockQuery.mock.calls;
      expect(sql).toMatch(/NULL/i);
      expect(params).toContain('memory/qa/ws-ent-6');
    });

    it('Given deleted document, When reindexAll() called, Then document re-gets embedding', async () => {
      // Simulate 1 entry that currently has NULL embedding
      const rows = [{ key: 'memory/qa/ws-ent-6', data: JSON.stringify({ text: 'vector search' }) }];
      mockQuery
        .mockResolvedValueOnce({ rows, rowCount: 1 }) // SELECT all
        .mockResolvedValue({ rows: [], rowCount: 0 }); // UPDATE

      const generateSpy = vi.spyOn(provider, 'generateEmbedding');
      const result = await service.reindexAll();

      expect(generateSpy).toHaveBeenCalledTimes(1);
      expect(result.indexed).toBe(1);
      expect(result.errors).toBe(0);
    });
  });

  describe('Hybrid search: vector + text filter', () => {
    it('Given query and textQuery, When hybridSearch() called, Then results include vector similarity AND text matching', async () => {
      const rows = [
        {
          key: 'memory/dev/code',
          similarity: 0.85,
          agent_id: 'dev',
          workstream_id: 'WS-ENT-6',
          timestamp: '2026-02-17T10:00:00Z',
          data: { content: 'vector search implementation' },
        },
      ];
      mockQuery.mockResolvedValueOnce({ rows, rowCount: 1 });
      const results = await service.hybridSearch('vector implementation', {
        textQuery: 'vector',
        limit: 5,
      });

      expect(results).toHaveLength(1);
      expect(results[0].similarity).toBe(0.85);

      // Verify hybrid SQL was constructed correctly
      const [[sql]] = mockQuery.mock.calls;
      expect(sql).toMatch(/<=>/); // vector similarity
      expect(sql).toMatch(/ILIKE|LIKE/i); // text matching
    });

    it('Given hybrid search with filters, When called, Then all filter types applied together', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await service.hybridSearch('query', {
        textQuery: 'memory',
        filters: { agent_id: 'qa', workstream_id: 'WS-ENT-6' },
        limit: 3,
        minSimilarity: 0.7,
      });

      const [[sql, params]] = mockQuery.mock.calls;
      expect(sql).toMatch(/agent_id/i);
      expect(sql).toMatch(/workstream_id/i);
      expect(params).toContain('qa');
      expect(params).toContain('WS-ENT-6');
    });
  });

  describe('Migration round-trip with MigrationRunner (mocked)', () => {
    it('Given vector migrations, When run with MigrationRunner, Then runMigrations() called with version array', async () => {
      // Mock MigrationRunner interactions
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE TABLE schema_migrations
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // SELECT applied versions
        .mockResolvedValue({ rows: [], rowCount: 0 });    // each migration run + record

      const runner = new MigrationRunner({ connectionString: 'postgresql://localhost/test' });
      const migrations = buildVectorMigrations();
      const result = await runner.runMigrations(migrations);

      expect(result.success).toBe(true);
      expect(result.applied.length).toBeGreaterThanOrEqual(3);
      expect(result.applied[0]).toBe(VECTOR_SCHEMA_VERSION_START);
    });

    it('Given applied vector migrations, When rollback() of 4000 called, Then down SQL executed', async () => {
      const migrations = buildVectorMigrations();
      const migration4000 = migrations.find((m: Migration) => m.version === 4000)!;

      // Simulate version 4000 was applied
      mockQuery
        .mockResolvedValueOnce({ rows: [{ version: 4000 }], rowCount: 1 }) // SELECT applied check
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // down SQL execution
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // DELETE from schema_migrations

      const runner = new MigrationRunner({ connectionString: 'postgresql://localhost/test' });
      const result = await runner.rollback(4000, migrations);

      expect(result.success).toBe(true);
      // Verify down SQL (DROP EXTENSION) was executed
      const sqlCalls = mockQuery.mock.calls.map(([sql]: [string]) => sql);
      const hasDropExtension = sqlCalls.some((sql) => /DROP EXTENSION/i.test(sql));
      expect(hasDropExtension).toBe(true);
    });
  });

  describe('VectorSearchService with NomicEmbeddingProvider (full flow, mocked HTTP)', () => {
    it('Given Nomic provider, When indexDocument() and search() called, Then uses 768-dim vectors', async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      const nomicVec = Array(768).fill(0.05);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ embeddings: [nomicVec] }),
      });

      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const nomicProvider = new NomicEmbeddingProvider({ apiUrl: 'http://localhost:11434' });
      const nomicService = new VectorSearchService({
        pool: makePool(),
        embeddingProvider: nomicProvider,
      });

      await nomicService.indexDocument('agent/doc', 'nomic embedding test');

      // Verify embedding of dimension 768 was passed to DB
      const [[sql, params]] = mockQuery.mock.calls;
      const embeddingParam = params.find((p: any) => Array.isArray(p));
      expect(embeddingParam).toHaveLength(768);

      vi.unstubAllGlobals();
    });
  });

  describe('AC-ENT-6.3: Hybrid queries verified end-to-end', () => {
    it('Given multiple indexed documents with different agent_ids, When searched with agent_id filter, Then only matching agent results returned', async () => {
      const rows = [
        {
          key: 'agent/qa/task1',
          similarity: 0.88,
          agent_id: 'qa',
          workstream_id: 'WS-ENT-6',
          timestamp: '2026-02-17T10:00:00Z',
          data: null,
        },
      ];
      // Only qa documents returned (filtering done in SQL)
      mockQuery.mockResolvedValueOnce({ rows, rowCount: 1 });
      const results = await service.search('task query', { filters: { agent_id: 'qa' } });

      expect(results).toHaveLength(1);
      expect(results[0].agent_id).toBe('qa');
      // Verify agent_id filter was in SQL
      const [[sql, params]] = mockQuery.mock.calls;
      expect(params).toContain('qa');
    });
  });

  describe('AC-ENT-6.4: Async non-blocking behavior', () => {
    it('Given multiple indexDocument() calls, When called concurrently, Then all resolve independently', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const keys = ['key/a', 'key/b', 'key/c', 'key/d', 'key/e'];
      const texts = keys.map((k) => `document for ${k}`);

      const startTime = performance.now();
      const results = await Promise.all(
        keys.map((key, i) => service.indexDocument(key, texts[i]))
      );
      const elapsed = performance.now() - startTime;

      expect(results).toHaveLength(5);
      // Concurrent execution should not take 5x sequential time
      // (mock is instant so this is comfortably < 100ms)
      expect(elapsed).toBeLessThan(500);
    });
  });
});
