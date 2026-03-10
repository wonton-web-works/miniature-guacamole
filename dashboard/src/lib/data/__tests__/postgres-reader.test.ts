import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// AC-DB-3.1: getAllWorkstreams() reads from Postgres when MG_POSTGRES_URL is set
// AC-DB-3.3: getWorkstreamById(id) reads from Postgres when MG_POSTGRES_URL is set
// AC-DB-3.5: All WorkstreamSummary fields populated correctly from workstreams table columns
// AC-DB-3.6: getWorkstreamCounts() returns correct counts from Postgres
// AC-DB-3.7: postgres-reader.ts is the only file importing a Postgres client

// Mock the postgres client module — implementation should import from 'pg' or 'postgres'
vi.mock('pg', () => {
  const mockQuery = vi.fn();
  const mockEnd = vi.fn().mockResolvedValue(undefined);
  const MockClient = vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    query: mockQuery,
    end: mockEnd,
  }));
  return { Client: MockClient, default: { Client: MockClient } };
});

// Shared mock row factory
function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    workstream_id: 'WS-1',
    name: 'Test Workstream',
    phase: 'step_2_implementation',
    gate_status: null,
    blocker: null,
    agent_id: 'engineering-manager',
    data: {
      status: 'in_progress',
      timestamp: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01',
    },
    ...overrides,
  };
}

describe('postgres-reader', () => {
  let getAllWorkstreamsFromPostgres: any;
  let getWorkstreamByIdFromPostgres: any;
  let getWorkstreamCountsFromPostgres: any;
  let pg: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv('MG_POSTGRES_URL', 'postgresql://user:pass@localhost:5432/testdb');
    pg = await import('pg');
    const module = await import('../postgres-reader');
    getAllWorkstreamsFromPostgres = module.getAllWorkstreamsFromPostgres;
    getWorkstreamByIdFromPostgres = module.getWorkstreamByIdFromPostgres;
    getWorkstreamCountsFromPostgres = module.getWorkstreamCountsFromPostgres;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // MISUSE CASES
  // ---------------------------------------------------------------------------

  describe('misuse: Postgres client throws on connect', () => {
    it('should throw or return empty array when client.connect() rejects', async () => {
      const mockClient = new pg.Client();
      mockClient.connect.mockRejectedValue(new Error('ECONNREFUSED connect ECONNREFUSED 127.0.0.1:5432'));

      await expect(getAllWorkstreamsFromPostgres()).rejects.toThrow();
    });
  });

  describe('misuse: query throws after connect', () => {
    it('getAllWorkstreams — query error propagates as thrown error', async () => {
      const mockClient = new pg.Client();
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockRejectedValue(new Error('relation "workstreams" does not exist'));

      await expect(getAllWorkstreamsFromPostgres()).rejects.toThrow('relation "workstreams" does not exist');
    });

    it('getWorkstreamById — query error propagates as thrown error', async () => {
      const mockClient = new pg.Client();
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockRejectedValue(new Error('SSL connection required'));

      await expect(getWorkstreamByIdFromPostgres('WS-1')).rejects.toThrow();
    });
  });

  describe('misuse: row missing required workstream_id field', () => {
    it('should skip or throw on rows without workstream_id', async () => {
      const mockClient = new pg.Client();
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockResolvedValue({
        rows: [{ name: 'No ID Row', phase: 'in_progress', data: {} }],
      });

      // Either throws or filters out invalid rows — result must be safe
      const result = await getAllWorkstreamsFromPostgres().catch(() => []);
      // If it doesn't throw, it should skip the invalid row
      if (Array.isArray(result)) {
        expect(result.length).toBe(0);
      }
    });
  });

  describe('misuse: row missing required name field', () => {
    it('should skip or throw on rows without name', async () => {
      const mockClient = new pg.Client();
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockResolvedValue({
        rows: [{ workstream_id: 'WS-X', phase: 'in_progress', data: {} }],
      });

      const result = await getAllWorkstreamsFromPostgres().catch(() => []);
      if (Array.isArray(result)) {
        expect(result.length).toBe(0);
      }
    });
  });

  describe('misuse: data JSONB column is null', () => {
    it('should not crash when data column is null — uses column-level defaults', async () => {
      const mockClient = new pg.Client();
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockResolvedValue({
        rows: [makeRow({ data: null })],
      });

      const result = await getAllWorkstreamsFromPostgres();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].workstream_id).toBe('WS-1');
    });
  });

  // ---------------------------------------------------------------------------
  // BOUNDARY CASES
  // ---------------------------------------------------------------------------

  describe('boundary: empty result set', () => {
    it('getAllWorkstreams returns empty array when table has no rows', async () => {
      const mockClient = new pg.Client();
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await getAllWorkstreamsFromPostgres();
      expect(result).toEqual([]);
    });

    it('getWorkstreamById returns null when no row matches', async () => {
      const mockClient = new pg.Client();
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await getWorkstreamByIdFromPostgres('WS-NONE');
      expect(result).toBeNull();
    });
  });

  describe('boundary: single workstream row', () => {
    it('getAllWorkstreams returns array with exactly one element', async () => {
      const mockClient = new pg.Client();
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockResolvedValue({ rows: [makeRow()] });

      const result = await getAllWorkstreamsFromPostgres();
      expect(result).toHaveLength(1);
    });
  });

  describe('boundary: optional column fields are null', () => {
    it('WorkstreamSummary with null gate_status, blocker, agent_id uses safe defaults', async () => {
      const mockClient = new pg.Client();
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockResolvedValue({
        rows: [makeRow({ gate_status: null, blocker: null, agent_id: null })],
      });

      const result = await getAllWorkstreamsFromPostgres();
      expect(result[0]).toHaveProperty('workstream_id', 'WS-1');
      expect(result[0].gate_status).toBeFalsy();
      expect(result[0].blocked_reason).toBeFalsy();
    });
  });

  describe('boundary: data JSONB missing nested fields', () => {
    it('WorkstreamSummary timestamps fall back to defaults when data.timestamp absent', async () => {
      const mockClient = new pg.Client();
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockResolvedValue({
        rows: [makeRow({ data: {} })],
      });

      const result = await getAllWorkstreamsFromPostgres();
      expect(typeof result[0].timestamp).toBe('string');
      expect(result[0].timestamp.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // GOLDEN PATH
  // ---------------------------------------------------------------------------

  describe('golden path: getAllWorkstreams correct WorkstreamSummary mapping', () => {
    it('maps all WorkstreamSummary fields from Postgres columns correctly', async () => {
      const mockClient = new pg.Client();
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockResolvedValue({
        rows: [
          makeRow({
            workstream_id: 'WS-42',
            name: 'Feature Launch',
            phase: 'step_2_implementation',
            gate_status: 'ready_for_leadership',
            blocker: null,
            agent_id: 'dev',
            data: {
              status: 'in_progress',
              timestamp: '2026-03-01T10:00:00Z',
              created_at: '2026-03-01',
              delegated_to: 'qa',
            },
          }),
        ],
      });

      const result = await getAllWorkstreamsFromPostgres();
      expect(result).toHaveLength(1);

      const ws = result[0];
      expect(ws.workstream_id).toBe('WS-42');
      expect(ws.name).toBe('Feature Launch');
      expect(ws.phase).toBe('step_2_implementation');
      expect(ws.gate_status).toBe('ready_for_leadership');
      expect(ws.agent_id).toBe('dev');
      expect(ws.timestamp).toBe('2026-03-01T10:00:00Z');
      expect(ws.created_at).toBe('2026-03-01');
      expect(ws.delegated_to).toBe('qa');
      // Status should be normalized
      expect(['in_progress', 'ready_for_review', 'planning', 'blocked', 'complete', 'unknown']).toContain(ws.status);
    });
  });

  describe('golden path: getWorkstreamById returns correct detail', () => {
    it('returns WorkstreamDetail with all fields for matching id', async () => {
      const mockClient = new pg.Client();
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockResolvedValue({
        rows: [
          makeRow({
            workstream_id: 'WS-5',
            name: 'DB Migration',
            phase: 'step_3_verification',
            data: {
              status: 'in_progress',
              timestamp: '2026-02-15T08:00:00Z',
              created_at: '2026-02-14',
              description: 'Migrate data layer',
              acceptance_criteria: ['AC-1', 'AC-2'],
              dependencies: ['WS-4'],
            },
          }),
        ],
      });

      const result = await getWorkstreamByIdFromPostgres('WS-5');
      expect(result).not.toBeNull();
      expect(result!.workstream_id).toBe('WS-5');
      expect(result!.name).toBe('DB Migration');
      expect(result!.phase).toBe('step_3_verification');
    });

    it('passes the id as query parameter (parameterized query)', async () => {
      const mockClient = new pg.Client();
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockResolvedValue({
        rows: [makeRow({ workstream_id: 'WS-9' })],
      });

      await getWorkstreamByIdFromPostgres('WS-9');

      // The query should have been called with ['WS-9'] as params
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['WS-9'])
      );
    });
  });

  describe('golden path: getWorkstreamCounts tallies status buckets correctly', () => {
    it('returns correct counts across all status buckets', async () => {
      const mockClient = new pg.Client();
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockResolvedValue({
        rows: [
          makeRow({ workstream_id: 'WS-1', data: { status: 'in_progress' } }),
          makeRow({ workstream_id: 'WS-2', data: { status: 'in_progress' } }),
          makeRow({ workstream_id: 'WS-3', data: { status: 'merged' } }),
          makeRow({ workstream_id: 'WS-4', phase: 'complete', data: {} }),
          makeRow({ workstream_id: 'WS-5', data: {}, blocker: 'Waiting on approval' }),
        ],
      });

      const result = await getWorkstreamCountsFromPostgres();
      expect(result.total).toBe(5);
      expect(typeof result.in_progress).toBe('number');
      expect(typeof result.complete).toBe('number');
      expect(typeof result.blocked).toBe('number');
      expect(result.in_progress + result.complete + result.blocked + result.planning + result.ready_for_review + result.unknown).toBe(5);
    });

    it('returns all-zero counts when table is empty', async () => {
      const mockClient = new pg.Client();
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await getWorkstreamCountsFromPostgres();
      expect(result.total).toBe(0);
      expect(result.in_progress).toBe(0);
      expect(result.complete).toBe(0);
      expect(result.blocked).toBe(0);
    });
  });

  describe('golden path: client is closed after query', () => {
    it('calls client.end() after getAllWorkstreams query completes', async () => {
      const mockClient = new pg.Client();
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockResolvedValue({ rows: [makeRow()] });

      await getAllWorkstreamsFromPostgres();

      expect(mockClient.end).toHaveBeenCalled();
    });

    it('calls client.end() after getWorkstreamById query completes', async () => {
      const mockClient = new pg.Client();
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockResolvedValue({ rows: [makeRow()] });

      await getWorkstreamByIdFromPostgres('WS-1');

      expect(mockClient.end).toHaveBeenCalled();
    });
  });
});
