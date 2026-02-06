import { describe, it, expect, beforeEach, vi } from 'vitest';

// AC-DASH-1.4: Workstream reader normalizes all observed status variants

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
}));

describe('WorkstreamReader', () => {
  let getAllWorkstreams: any;
  let getWorkstreamById: any;
  let getWorkstreamCounts: any;
  let fs: any;

  beforeEach(async () => {
    vi.resetModules();
    fs = await import('node:fs');
    // @ts-expect-error - module not implemented yet
    const module = await import('../../../../src/lib/data/workstream-reader');
    getAllWorkstreams = module.getAllWorkstreams;
    getWorkstreamById = module.getWorkstreamById;
    getWorkstreamCounts = module.getWorkstreamCounts;
  });

  describe('getAllWorkstreams', () => {
    describe('basic functionality', () => {
      it('should return WorkstreamSummary array', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json'] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          workstream_id: 'WS-1',
          name: 'Test Workstream',
          status: 'in_progress',
          phase: 'step_2_implementation'
        }));

        const result = getAllWorkstreams('/memory/path');

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toHaveProperty('workstream_id');
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('status');
      });

      it('should return empty array for empty directory', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue([] as any);

        const result = getAllWorkstreams('/memory/path');

        expect(result).toEqual([]);
      });

      it('should return empty array for non-existent directory', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = getAllWorkstreams('/nonexistent/path');

        expect(result).toEqual([]);
      });

      it('should handle multiple workstreams', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue([
          'ws-1.json',
          'ws-2.json',
          'ws-3.json'
        ] as any);
        vi.mocked(fs.readFileSync).mockImplementation((path: string) => {
          const id = (path as string).match(/ws-(\d+)/)?.[1];
          return JSON.stringify({
            workstream_id: `WS-${id}`,
            name: `Workstream ${id}`,
            status: 'in_progress'
          });
        });

        const result = getAllWorkstreams('/memory/path');

        expect(result.length).toBe(3);
      });
    });

    describe('status normalization - complete variants', () => {
      it('should normalize phase: "complete" to WorkstreamStatus.complete', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json'] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          workstream_id: 'WS-1',
          name: 'Test',
          phase: 'complete'
        }));

        const result = getAllWorkstreams('/memory/path');

        expect(result[0].status).toBe('complete');
      });

      it('should normalize status: "merged" to WorkstreamStatus.complete', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json'] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          workstream_id: 'WS-1',
          name: 'Test',
          status: 'merged'
        }));

        const result = getAllWorkstreams('/memory/path');

        expect(result[0].status).toBe('complete');
      });

      it('should normalize status: "success" to WorkstreamStatus.complete', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json'] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          workstream_id: 'WS-1',
          name: 'Test',
          status: 'success'
        }));

        const result = getAllWorkstreams('/memory/path');

        expect(result[0].status).toBe('complete');
      });

      it('should normalize status: "done" to WorkstreamStatus.complete', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json'] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          workstream_id: 'WS-1',
          name: 'Test',
          status: 'done'
        }));

        const result = getAllWorkstreams('/memory/path');

        expect(result[0].status).toBe('complete');
      });
    });

    describe('status normalization - blocked variants', () => {
      it('should normalize blocked_reason presence to WorkstreamStatus.blocked', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json'] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          workstream_id: 'WS-1',
          name: 'Test',
          status: 'in_progress',
          blocked_reason: 'Waiting for API'
        }));

        const result = getAllWorkstreams('/memory/path');

        expect(result[0].status).toBe('blocked');
      });

      it('should normalize status: "blocked" to WorkstreamStatus.blocked', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json'] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          workstream_id: 'WS-1',
          name: 'Test',
          status: 'blocked'
        }));

        const result = getAllWorkstreams('/memory/path');

        expect(result[0].status).toBe('blocked');
      });

      it('should prioritize blocked_reason over status field', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json'] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          workstream_id: 'WS-1',
          name: 'Test',
          status: 'in_progress',
          blocked_reason: 'Dependencies not met'
        }));

        const result = getAllWorkstreams('/memory/path');

        expect(result[0].status).toBe('blocked');
      });
    });

    describe('status normalization - in_progress variants', () => {
      it('should normalize status: "in_progress" correctly', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json'] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          workstream_id: 'WS-1',
          name: 'Test',
          status: 'in_progress'
        }));

        const result = getAllWorkstreams('/memory/path');

        expect(result[0].status).toBe('in_progress');
      });

      it('should normalize status: "active" to in_progress', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json'] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          workstream_id: 'WS-1',
          name: 'Test',
          status: 'active'
        }));

        const result = getAllWorkstreams('/memory/path');

        expect(result[0].status).toBe('in_progress');
      });

      it('should normalize phase: "step_2_implementation" to in_progress', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json'] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          workstream_id: 'WS-1',
          name: 'Test',
          phase: 'step_2_implementation'
        }));

        const result = getAllWorkstreams('/memory/path');

        expect(result[0].status).toBe('in_progress');
      });
    });

    describe('status normalization - unknown/unrecognized', () => {
      it('should normalize unrecognized status to "unknown"', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json'] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          workstream_id: 'WS-1',
          name: 'Test',
          status: 'weird_status'
        }));

        const result = getAllWorkstreams('/memory/path');

        expect(result[0].status).toBe('unknown');
      });

      it('should handle missing status and phase fields', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json'] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          workstream_id: 'WS-1',
          name: 'Test'
        }));

        const result = getAllWorkstreams('/memory/path');

        expect(result[0].status).toBe('unknown');
      });

      it('should handle null status', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json'] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          workstream_id: 'WS-1',
          name: 'Test',
          status: null
        }));

        const result = getAllWorkstreams('/memory/path');

        expect(result[0].status).toBe('unknown');
      });

      it('should handle empty string status', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json'] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          workstream_id: 'WS-1',
          name: 'Test',
          status: ''
        }));

        const result = getAllWorkstreams('/memory/path');

        expect(result[0].status).toBe('unknown');
      });
    });

    describe('malformed workstream files', () => {
      it('should skip malformed workstream files (not thrown)', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json', 'ws-2.json'] as any);
        vi.mocked(fs.readFileSync).mockImplementation((path: string) => {
          if ((path as string).includes('ws-1')) {
            return '{ invalid json }';
          }
          return JSON.stringify({
            workstream_id: 'WS-2',
            name: 'Valid',
            status: 'in_progress'
          });
        });

        const result = getAllWorkstreams('/memory/path');

        expect(result.length).toBe(1);
        expect(result[0].workstream_id).toBe('WS-2');
      });

      it('should skip files missing required fields', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json', 'ws-2.json'] as any);
        vi.mocked(fs.readFileSync).mockImplementation((path: string) => {
          if ((path as string).includes('ws-1')) {
            return JSON.stringify({ name: 'Missing ID' });
          }
          return JSON.stringify({
            workstream_id: 'WS-2',
            name: 'Valid',
            status: 'in_progress'
          });
        });

        const result = getAllWorkstreams('/memory/path');

        expect(result.length).toBe(1);
        expect(result[0].workstream_id).toBe('WS-2');
      });

      it('should handle all files being malformed', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json', 'ws-2.json'] as any);
        vi.mocked(fs.readFileSync).mockReturnValue('{ invalid }');

        const result = getAllWorkstreams('/memory/path');

        expect(result).toEqual([]);
      });

      it('should handle read errors on individual files', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json', 'ws-2.json'] as any);
        vi.mocked(fs.readFileSync).mockImplementation((path: string) => {
          if ((path as string).includes('ws-1')) {
            throw new Error('EACCES: permission denied');
          }
          return JSON.stringify({
            workstream_id: 'WS-2',
            name: 'Valid',
            status: 'in_progress'
          });
        });

        const result = getAllWorkstreams('/memory/path');

        expect(result.length).toBe(1);
        expect(result[0].workstream_id).toBe('WS-2');
      });
    });
  });

  describe('getWorkstreamById', () => {
    it('should return WorkstreamDetail for valid ID', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        workstream_id: 'WS-1',
        name: 'Test Workstream',
        status: 'in_progress',
        phase: 'step_2_implementation',
        acceptance_criteria: ['AC-1', 'AC-2'],
        tests: { total: 10, passing: 5, failing: 5 }
      }));

      const result = getWorkstreamById('WS-1', '/memory/path');

      expect(result).not.toBeNull();
      expect(result?.workstream_id).toBe('WS-1');
      expect(result).toHaveProperty('acceptance_criteria');
      expect(result).toHaveProperty('tests');
    });

    it('should return null for non-existent ID', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = getWorkstreamById('WS-NONEXISTENT', '/memory/path');

      expect(result).toBeNull();
    });

    it('should return null for malformed file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{ invalid }');

      const result = getWorkstreamById('WS-1', '/memory/path');

      expect(result).toBeNull();
    });

    it('should handle multiple file name patterns', () => {
      // Should try: workstream-WS-1-state.json, WS-1-state.json, WS-1.json
      vi.mocked(fs.existsSync).mockImplementation((path: string) => {
        return (path as string).includes('workstream-WS-1-state.json');
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        workstream_id: 'WS-1',
        name: 'Test',
        status: 'in_progress'
      }));

      const result = getWorkstreamById('WS-1', '/memory/path');

      expect(result).not.toBeNull();
    });

    it('should normalize status in detail view', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        workstream_id: 'WS-1',
        name: 'Test',
        status: 'merged'
      }));

      const result = getWorkstreamById('WS-1', '/memory/path');

      expect(result?.status).toBe('complete');
    });
  });

  describe('getWorkstreamCounts', () => {
    it('should return correct tallies', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'ws-1.json',
        'ws-2.json',
        'ws-3.json',
        'ws-4.json',
        'ws-5.json'
      ] as any);
      vi.mocked(fs.readFileSync).mockImplementation((path: string) => {
        const id = (path as string).match(/ws-(\d+)/)?.[1];
        const statuses = ['in_progress', 'blocked', 'merged', 'in_progress', 'unknown'];
        return JSON.stringify({
          workstream_id: `WS-${id}`,
          name: `Test ${id}`,
          status: statuses[parseInt(id!) - 1]
        });
      });

      const result = getWorkstreamCounts('/memory/path');

      expect(result).toHaveProperty('total', 5);
      expect(result).toHaveProperty('in_progress', 2);
      expect(result).toHaveProperty('blocked', 1);
      expect(result).toHaveProperty('complete', 1);
      expect(result).toHaveProperty('unknown', 1);
    });

    it('should return zero counts for empty directory', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([] as any);

      const result = getWorkstreamCounts('/memory/path');

      expect(result.total).toBe(0);
      expect(result.in_progress).toBe(0);
      expect(result.blocked).toBe(0);
      expect(result.complete).toBe(0);
      expect(result.unknown).toBe(0);
    });

    it('should skip malformed files in counts', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['ws-1.json', 'ws-2.json'] as any);
      vi.mocked(fs.readFileSync).mockImplementation((path: string) => {
        if ((path as string).includes('ws-1')) {
          return '{ invalid }';
        }
        return JSON.stringify({
          workstream_id: 'WS-2',
          name: 'Valid',
          status: 'in_progress'
        });
      });

      const result = getWorkstreamCounts('/memory/path');

      expect(result.total).toBe(1);
      expect(result.in_progress).toBe(1);
    });
  });
});
