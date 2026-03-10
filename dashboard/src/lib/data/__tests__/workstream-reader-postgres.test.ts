import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// AC-DB-3.1: When MG_POSTGRES_URL is set, getAllWorkstreams() uses Postgres path
// AC-DB-3.2: When MG_POSTGRES_URL is not set or empty, filesystem path is used
// AC-DB-3.4: Postgres failure falls back to filesystem with console.warn (non-fatal)

// Mock postgres-reader — the implementation that wraps the Postgres client
vi.mock('../postgres-reader', () => ({
  getAllWorkstreamsFromPostgres: vi.fn(),
  getWorkstreamByIdFromPostgres: vi.fn(),
  getWorkstreamCountsFromPostgres: vi.fn(),
}));

// Mock memory-reader so filesystem path never hits disk
vi.mock('../memory-reader', () => ({
  readJsonFile: vi.fn(),
  listJsonFiles: vi.fn(),
}));

// Mock node:fs so workstream-reader's filesystem path is fully controlled
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
}));

function makeWorkstreamSummary(id = 'WS-1') {
  return {
    workstream_id: id,
    name: `Workstream ${id}`,
    status: 'in_progress' as const,
    phase: 'step_2_implementation',
    agent_id: 'dev',
    timestamp: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01',
  };
}

describe('workstream-reader conditional dispatch', () => {
  let getAllWorkstreams: any;
  let getWorkstreamById: any;
  let getWorkstreamCounts: any;
  let postgresReader: any;
  let fs: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    postgresReader = await import('../postgres-reader');
    fs = await import('node:fs');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function loadWorkstreamReader() {
    const module = await import('../workstream-reader');
    getAllWorkstreams = module.getAllWorkstreams;
    getWorkstreamById = module.getWorkstreamById;
    getWorkstreamCounts = module.getWorkstreamCounts;
  }

  // ---------------------------------------------------------------------------
  // MISUSE CASES
  // ---------------------------------------------------------------------------

  describe('misuse: MG_POSTGRES_URL set but Postgres throws', () => {
    it('getAllWorkstreams falls back to filesystem and emits console.warn (AC-DB-3.4)', async () => {
      vi.stubEnv('MG_POSTGRES_URL', 'postgresql://bad-host/db');
      postgresReader.getAllWorkstreamsFromPostgres.mockRejectedValue(
        new Error('ECONNREFUSED')
      );
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json'] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ workstream_id: 'WS-1', name: 'FS Workstream', status: 'in_progress' })
      );

      await loadWorkstreamReader();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await getAllWorkstreams('/memory/path');

      // Non-fatal: should return filesystem data
      expect(Array.isArray(result)).toBe(true);
      // console.warn must have been called
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('getWorkstreamById falls back to filesystem on Postgres error', async () => {
      vi.stubEnv('MG_POSTGRES_URL', 'postgresql://bad-host/db');
      postgresReader.getWorkstreamByIdFromPostgres.mockRejectedValue(
        new Error('connection refused')
      );
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ workstream_id: 'WS-1', name: 'FS Detail', status: 'blocked' })
      );

      await loadWorkstreamReader();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await getWorkstreamById('WS-1', '/memory/path');

      expect(result).not.toBeNull();
      expect(result!.workstream_id).toBe('WS-1');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('getWorkstreamCounts falls back to filesystem on Postgres error', async () => {
      vi.stubEnv('MG_POSTGRES_URL', 'postgresql://bad-host/db');
      postgresReader.getWorkstreamCountsFromPostgres.mockRejectedValue(
        new Error('timeout')
      );
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([]);

      await loadWorkstreamReader();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await getWorkstreamCounts('/memory/path');

      expect(result.total).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // BOUNDARY CASES
  // ---------------------------------------------------------------------------

  describe('boundary: MG_POSTGRES_URL is empty string (treated as unset)', () => {
    it('getAllWorkstreams uses filesystem when MG_POSTGRES_URL is ""', async () => {
      vi.stubEnv('MG_POSTGRES_URL', '');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json'] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ workstream_id: 'WS-1', name: 'FS Only', status: 'in_progress' })
      );

      await loadWorkstreamReader();

      const result = await getAllWorkstreams('/memory/path');

      expect(postgresReader.getAllWorkstreamsFromPostgres).not.toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('getWorkstreamById uses filesystem when MG_POSTGRES_URL is ""', async () => {
      vi.stubEnv('MG_POSTGRES_URL', '');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ workstream_id: 'WS-1', name: 'FS Detail', status: 'complete' })
      );

      await loadWorkstreamReader();

      await getWorkstreamById('WS-1', '/memory/path');

      expect(postgresReader.getWorkstreamByIdFromPostgres).not.toHaveBeenCalled();
    });
  });

  describe('boundary: MG_POSTGRES_URL not set at all', () => {
    it('getAllWorkstreams does not call Postgres reader when env var is absent', async () => {
      // Ensure env var is absent
      delete process.env.MG_POSTGRES_URL;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([]);

      await loadWorkstreamReader();

      await getAllWorkstreams('/memory/path');

      expect(postgresReader.getAllWorkstreamsFromPostgres).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // GOLDEN PATH
  // ---------------------------------------------------------------------------

  describe('golden path: MG_POSTGRES_URL set — uses Postgres path', () => {
    it('getAllWorkstreams calls postgres-reader and returns its results', async () => {
      vi.stubEnv('MG_POSTGRES_URL', 'postgresql://user:pass@localhost:5432/db');
      const pgResults = [makeWorkstreamSummary('WS-10'), makeWorkstreamSummary('WS-11')];
      postgresReader.getAllWorkstreamsFromPostgres.mockResolvedValue(pgResults);

      await loadWorkstreamReader();

      const result = await getAllWorkstreams('/memory/path');

      expect(postgresReader.getAllWorkstreamsFromPostgres).toHaveBeenCalled();
      expect(result).toEqual(pgResults);
      // Filesystem must NOT have been queried
      expect(fs.readdirSync).not.toHaveBeenCalled();
    });

    it('getWorkstreamById calls postgres-reader and returns its result', async () => {
      vi.stubEnv('MG_POSTGRES_URL', 'postgresql://user:pass@localhost:5432/db');
      const pgDetail = { ...makeWorkstreamSummary('WS-7'), description: 'From Postgres' };
      postgresReader.getWorkstreamByIdFromPostgres.mockResolvedValue(pgDetail);

      await loadWorkstreamReader();

      const result = await getWorkstreamById('WS-7', '/memory/path');

      expect(postgresReader.getWorkstreamByIdFromPostgres).toHaveBeenCalledWith('WS-7');
      expect(result).toEqual(pgDetail);
    });

    it('getWorkstreamCounts calls postgres-reader and returns its counts', async () => {
      vi.stubEnv('MG_POSTGRES_URL', 'postgresql://user:pass@localhost:5432/db');
      const pgCounts = { total: 8, planning: 1, in_progress: 3, ready_for_review: 1, blocked: 1, complete: 2, unknown: 0 };
      postgresReader.getWorkstreamCountsFromPostgres.mockResolvedValue(pgCounts);

      await loadWorkstreamReader();

      const result = await getWorkstreamCounts('/memory/path');

      expect(postgresReader.getWorkstreamCountsFromPostgres).toHaveBeenCalled();
      expect(result).toEqual(pgCounts);
    });

    it('filesystem path is completely bypassed when Postgres succeeds', async () => {
      vi.stubEnv('MG_POSTGRES_URL', 'postgresql://user:pass@localhost:5432/db');
      postgresReader.getAllWorkstreamsFromPostgres.mockResolvedValue([makeWorkstreamSummary()]);

      await loadWorkstreamReader();

      await getAllWorkstreams('/memory/path');

      expect(fs.existsSync).not.toHaveBeenCalled();
      expect(fs.readdirSync).not.toHaveBeenCalled();
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });
  });
});
