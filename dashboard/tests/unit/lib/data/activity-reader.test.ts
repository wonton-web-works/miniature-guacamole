import { describe, it, expect, beforeEach, vi } from 'vitest';

// AC-DASH-1.5: Activity reader with pagination, agent/workstream filtering

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
}));

describe('ActivityReader', () => {
  let getActivities: any;
  let fs: any;

  beforeEach(async () => {
    vi.resetModules();
    fs = await import('node:fs');
    // @ts-expect-error - module not implemented yet
    const module = await import('../../../../src/lib/data/activity-reader');
    getActivities = module.getActivities;
  });

  describe('basic functionality', () => {
    it('should return activities array', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['agent-1.json'] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        agent_id: 'dev',
        workstream_id: 'WS-1',
        timestamp: '2026-02-05T10:00:00Z',
        data: { action: 'implemented feature' }
      }));

      const result = getActivities('/memory/path');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should derive activities from memory files with timestamp/agent_id', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['file-1.json'] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        agent_id: 'qa',
        workstream_id: 'WS-2',
        timestamp: '2026-02-05T11:30:00Z',
        data: { test_results: 'pass' }
      }));

      const result = getActivities('/memory/path');

      expect(result[0]).toHaveProperty('agent_id', 'qa');
      expect(result[0]).toHaveProperty('workstream_id', 'WS-2');
      expect(result[0]).toHaveProperty('timestamp');
    });

    it('should return empty array for empty directory', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([] as any);

      const result = getActivities('/memory/path');

      expect(result).toEqual([]);
    });

    it('should return empty array for non-existent directory', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = getActivities('/nonexistent/path');

      expect(result).toEqual([]);
    });

    it('should handle multiple activity files', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'agent-1.json',
        'agent-2.json',
        'agent-3.json'
      ] as any);
      vi.mocked(fs.readFileSync).mockImplementation((path: string) => {
        const id = (path as string).match(/agent-(\d+)/)?.[1];
        return JSON.stringify({
          agent_id: `agent-${id}`,
          workstream_id: `WS-${id}`,
          timestamp: `2026-02-05T10:${id}0:00Z`,
          data: {}
        });
      });

      const result = getActivities('/memory/path');

      expect(result.length).toBe(3);
    });
  });

  describe('reverse-chronological sorting', () => {
    it('should sort activities reverse-chronologically', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'file-1.json',
        'file-2.json',
        'file-3.json'
      ] as any);
      vi.mocked(fs.readFileSync).mockImplementation((path: string) => {
        if ((path as string).includes('file-1')) {
          return JSON.stringify({
            agent_id: 'dev',
            timestamp: '2026-02-05T10:00:00Z',
            workstream_id: 'WS-1'
          });
        } else if ((path as string).includes('file-2')) {
          return JSON.stringify({
            agent_id: 'qa',
            timestamp: '2026-02-05T12:00:00Z',
            workstream_id: 'WS-2'
          });
        } else {
          return JSON.stringify({
            agent_id: 'ceo',
            timestamp: '2026-02-05T08:00:00Z',
            workstream_id: 'WS-3'
          });
        }
      });

      const result = getActivities('/memory/path');

      expect(result[0].timestamp).toContain('12:00:00');
      expect(result[1].timestamp).toContain('10:00:00');
      expect(result[2].timestamp).toContain('08:00:00');
    });

    it('should handle activities with same timestamp', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['file-1.json', 'file-2.json'] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        agent_id: 'dev',
        timestamp: '2026-02-05T10:00:00Z',
        workstream_id: 'WS-1'
      }));

      const result = getActivities('/memory/path');

      expect(result.length).toBe(2);
      expect(result[0].timestamp).toBe(result[1].timestamp);
    });

    it('should handle missing timestamp gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'file-1.json',
        'file-2.json'
      ] as any);
      vi.mocked(fs.readFileSync).mockImplementation((path: string) => {
        if ((path as string).includes('file-1')) {
          return JSON.stringify({
            agent_id: 'dev',
            workstream_id: 'WS-1'
          });
        } else {
          return JSON.stringify({
            agent_id: 'qa',
            timestamp: '2026-02-05T10:00:00Z',
            workstream_id: 'WS-2'
          });
        }
      });

      const result = getActivities('/memory/path');

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('pagination', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(
        Array.from({ length: 50 }, (_, i) => `file-${i}.json`) as any
      );
      vi.mocked(fs.readFileSync).mockImplementation((path: string) => {
        const id = (path as string).match(/file-(\d+)/)?.[1];
        return JSON.stringify({
          agent_id: `agent-${id}`,
          workstream_id: `WS-${id}`,
          timestamp: `2026-02-05T${String(10 + parseInt(id!)).padStart(2, '0')}:00:00Z`,
          data: {}
        });
      });
    });

    it('should return limited number of activities', () => {
      const result = getActivities('/memory/path', { limit: 10 });

      expect(result.length).toBe(10);
    });

    it('should apply offset correctly', () => {
      const allResults = getActivities('/memory/path');
      const offsetResults = getActivities('/memory/path', { offset: 5 });

      expect(offsetResults[0]).toEqual(allResults[5]);
    });

    it('should combine limit and offset', () => {
      const result = getActivities('/memory/path', { limit: 10, offset: 5 });

      expect(result.length).toBe(10);
    });

    it('should handle offset beyond array length', () => {
      const result = getActivities('/memory/path', { offset: 100 });

      expect(result).toEqual([]);
    });

    it('should handle limit larger than available items', () => {
      const result = getActivities('/memory/path', { limit: 1000 });

      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('should default to no limit when not specified', () => {
      const result = getActivities('/memory/path');

      expect(result.length).toBe(50);
    });

    it('should handle zero limit', () => {
      const result = getActivities('/memory/path', { limit: 0 });

      expect(result).toEqual([]);
    });

    it('should handle negative offset as zero', () => {
      const resultNegative = getActivities('/memory/path', { offset: -5 });
      const resultZero = getActivities('/memory/path', { offset: 0 });

      expect(resultNegative).toEqual(resultZero);
    });
  });

  describe('filtering by agentId', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'file-1.json',
        'file-2.json',
        'file-3.json',
        'file-4.json'
      ] as any);
      vi.mocked(fs.readFileSync).mockImplementation((path: string) => {
        const agents = ['dev', 'qa', 'dev', 'ceo'];
        const id = parseInt((path as string).match(/file-(\d+)/)?.[1] || '0') - 1;
        return JSON.stringify({
          agent_id: agents[id],
          workstream_id: `WS-${id + 1}`,
          timestamp: `2026-02-05T10:0${id}:00Z`,
          data: {}
        });
      });
    });

    it('should filter by agentId returning only matching activities', () => {
      const result = getActivities('/memory/path', { agentId: 'dev' });

      expect(result.length).toBe(2);
      expect(result.every(a => a.agent_id === 'dev')).toBe(true);
    });

    it('should return empty array when no matches', () => {
      const result = getActivities('/memory/path', { agentId: 'nonexistent' });

      expect(result).toEqual([]);
    });

    it('should be case-sensitive', () => {
      const result = getActivities('/memory/path', { agentId: 'DEV' });

      expect(result).toEqual([]);
    });

    it('should work with pagination', () => {
      const result = getActivities('/memory/path', {
        agentId: 'dev',
        limit: 1,
        offset: 1
      });

      expect(result.length).toBe(1);
      expect(result[0].agent_id).toBe('dev');
    });
  });

  describe('filtering by workstreamId', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'file-1.json',
        'file-2.json',
        'file-3.json',
        'file-4.json'
      ] as any);
      vi.mocked(fs.readFileSync).mockImplementation((path: string) => {
        const workstreams = ['WS-1', 'WS-2', 'WS-1', 'WS-3'];
        const id = parseInt((path as string).match(/file-(\d+)/)?.[1] || '0') - 1;
        return JSON.stringify({
          agent_id: `agent-${id}`,
          workstream_id: workstreams[id],
          timestamp: `2026-02-05T10:0${id}:00Z`,
          data: {}
        });
      });
    });

    it('should filter by workstreamId returning only matching activities', () => {
      const result = getActivities('/memory/path', { workstreamId: 'WS-1' });

      expect(result.length).toBe(2);
      expect(result.every(a => a.workstream_id === 'WS-1')).toBe(true);
    });

    it('should return empty array when no matches', () => {
      const result = getActivities('/memory/path', { workstreamId: 'WS-999' });

      expect(result).toEqual([]);
    });

    it('should work with pagination', () => {
      const result = getActivities('/memory/path', {
        workstreamId: 'WS-1',
        limit: 1
      });

      expect(result.length).toBe(1);
      expect(result[0].workstream_id).toBe('WS-1');
    });

    it('should handle missing workstream_id field', () => {
      vi.mocked(fs.readdirSync).mockReturnValue(['file-1.json'] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        agent_id: 'dev',
        timestamp: '2026-02-05T10:00:00Z'
      }));

      const result = getActivities('/memory/path', { workstreamId: 'WS-1' });

      expect(result).toEqual([]);
    });
  });

  describe('combined filtering', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'file-1.json',
        'file-2.json',
        'file-3.json',
        'file-4.json'
      ] as any);
      vi.mocked(fs.readFileSync).mockImplementation((path: string) => {
        const data = [
          { agent_id: 'dev', workstream_id: 'WS-1' },
          { agent_id: 'qa', workstream_id: 'WS-1' },
          { agent_id: 'dev', workstream_id: 'WS-2' },
          { agent_id: 'dev', workstream_id: 'WS-1' }
        ];
        const id = parseInt((path as string).match(/file-(\d+)/)?.[1] || '0') - 1;
        return JSON.stringify({
          ...data[id],
          timestamp: `2026-02-05T10:0${id}:00Z`,
          data: {}
        });
      });
    });

    it('should filter by both agentId and workstreamId', () => {
      const result = getActivities('/memory/path', {
        agentId: 'dev',
        workstreamId: 'WS-1'
      });

      expect(result.length).toBe(2);
      expect(result.every(a => a.agent_id === 'dev' && a.workstream_id === 'WS-1')).toBe(true);
    });

    it('should apply filters before pagination', () => {
      const result = getActivities('/memory/path', {
        agentId: 'dev',
        workstreamId: 'WS-1',
        limit: 1
      });

      expect(result.length).toBe(1);
      expect(result[0].agent_id).toBe('dev');
      expect(result[0].workstream_id).toBe('WS-1');
    });
  });

  describe('error handling', () => {
    it('should skip malformed files', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['file-1.json', 'file-2.json'] as any);
      vi.mocked(fs.readFileSync).mockImplementation((path: string) => {
        if ((path as string).includes('file-1')) {
          return '{ invalid }';
        }
        return JSON.stringify({
          agent_id: 'dev',
          workstream_id: 'WS-1',
          timestamp: '2026-02-05T10:00:00Z',
          data: {}
        });
      });

      const result = getActivities('/memory/path');

      expect(result.length).toBe(1);
      expect(result[0].agent_id).toBe('dev');
    });

    it('should skip files with read errors', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['file-1.json', 'file-2.json'] as any);
      vi.mocked(fs.readFileSync).mockImplementation((path: string) => {
        if ((path as string).includes('file-1')) {
          throw new Error('EACCES: permission denied');
        }
        return JSON.stringify({
          agent_id: 'dev',
          workstream_id: 'WS-1',
          timestamp: '2026-02-05T10:00:00Z',
          data: {}
        });
      });

      const result = getActivities('/memory/path');

      expect(result.length).toBe(1);
    });

    it('should skip files missing required fields', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['file-1.json', 'file-2.json'] as any);
      vi.mocked(fs.readFileSync).mockImplementation((path: string) => {
        if ((path as string).includes('file-1')) {
          return JSON.stringify({ data: {} }); // Missing agent_id, timestamp
        }
        return JSON.stringify({
          agent_id: 'dev',
          workstream_id: 'WS-1',
          timestamp: '2026-02-05T10:00:00Z',
          data: {}
        });
      });

      const result = getActivities('/memory/path');

      expect(result.length).toBe(1);
      expect(result[0].agent_id).toBe('dev');
    });
  });
});
