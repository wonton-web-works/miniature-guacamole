import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

// AC-DASH-1.9: Integration test: fixture → data layer → response
// End-to-end data layer flow using real filesystem

describe('Data Layer Integration', () => {
  let tempDir: string;
  let memoryPath: string;
  let dashboardPath: string;

  beforeAll(() => {
    // Create temp directory for test data
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dashboard-test-'));
    memoryPath = path.join(tempDir, 'memory');
    dashboardPath = path.join(tempDir, 'dashboard');

    fs.mkdirSync(memoryPath, { recursive: true });
    fs.mkdirSync(dashboardPath, { recursive: true });

    // Copy fixtures to temp memory path
    const fixturesDir = path.join(__dirname, '../fixtures');
    fs.copyFileSync(
      path.join(fixturesDir, 'workstream-active.json'),
      path.join(memoryPath, 'workstream-WS-TEST-1-state.json')
    );
    fs.copyFileSync(
      path.join(fixturesDir, 'workstream-blocked.json'),
      path.join(memoryPath, 'workstream-WS-TEST-2-state.json')
    );
    fs.copyFileSync(
      path.join(fixturesDir, 'workstream-complete.json'),
      path.join(memoryPath, 'workstream-WS-TEST-3-state.json')
    );
    fs.copyFileSync(
      path.join(fixturesDir, 'shared-memory.json'),
      path.join(memoryPath, 'shared.json')
    );
  });

  afterAll(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('memory reader → workstream reader flow', () => {
    it('should read all workstream files from directory', async () => {
      // @ts-expect-error - module not implemented yet
      const { getAllWorkstreams } = await import('../../src/lib/data/workstream-reader');

      const workstreams = getAllWorkstreams(memoryPath);

      expect(workstreams.length).toBeGreaterThan(0);
      expect(workstreams.every(ws => ws.workstream_id)).toBe(true);
    });

    it('should normalize status across different file formats', async () => {
      // @ts-expect-error - module not implemented yet
      const { getAllWorkstreams } = await import('../../src/lib/data/workstream-reader');

      const workstreams = getAllWorkstreams(memoryPath);
      const statuses = workstreams.map(ws => ws.status);

      expect(statuses).toContain('in_progress');
      expect(statuses).toContain('blocked');
      expect(statuses).toContain('complete');
    });

    it('should retrieve specific workstream by ID', async () => {
      // @ts-expect-error - module not implemented yet
      const { getWorkstreamById } = await import('../../src/lib/data/workstream-reader');

      const workstream = getWorkstreamById('WS-DASH-TEST-ACTIVE', memoryPath);

      expect(workstream).not.toBeNull();
      expect(workstream?.workstream_id).toBe('WS-DASH-TEST-ACTIVE');
    });

    it('should return accurate workstream counts', async () => {
      // @ts-expect-error - module not implemented yet
      const { getWorkstreamCounts } = await import('../../src/lib/data/workstream-reader');

      const counts = getWorkstreamCounts(memoryPath);

      expect(counts.total).toBe(3);
      expect(counts.in_progress).toBe(1);
      expect(counts.blocked).toBe(1);
      expect(counts.complete).toBe(1);
    });
  });

  describe('memory reader → activity reader flow', () => {
    it('should derive activities from memory files', async () => {
      // @ts-expect-error - module not implemented yet
      const { getActivities } = await import('../../src/lib/data/activity-reader');

      const activities = getActivities(memoryPath);

      expect(activities.length).toBeGreaterThan(0);
      expect(activities[0]).toHaveProperty('agent_id');
      expect(activities[0]).toHaveProperty('timestamp');
    });

    it('should sort activities reverse-chronologically', async () => {
      // @ts-expect-error - module not implemented yet
      const { getActivities } = await import('../../src/lib/data/activity-reader');

      const activities = getActivities(memoryPath);

      if (activities.length > 1) {
        const timestamps = activities.map(a => new Date(a.timestamp).getTime());
        const sorted = [...timestamps].sort((a, b) => b - a);
        expect(timestamps).toEqual(sorted);
      }
    });

    it('should paginate activities correctly', async () => {
      // @ts-expect-error - module not implemented yet
      const { getActivities } = await import('../../src/lib/data/activity-reader');

      const page1 = getActivities(memoryPath, { limit: 2, offset: 0 });
      const page2 = getActivities(memoryPath, { limit: 2, offset: 2 });

      expect(page1.length).toBeLessThanOrEqual(2);
      if (page1.length > 0 && page2.length > 0) {
        expect(page1[0].timestamp).not.toBe(page2[0].timestamp);
      }
    });
  });

  describe('project registry creation and management', () => {
    it('should create default registry when file missing', async () => {
      // @ts-expect-error - module not implemented yet
      const { getRegistry } = await import('../../src/lib/data/project-registry');

      const registry = getRegistry(dashboardPath);

      expect(registry.version).toBe('1.0');
      expect(Array.isArray(registry.projects)).toBe(true);
    });

    it('should persist registry to disk', async () => {
      // @ts-expect-error - module not implemented yet
      const { getRegistry } = await import('../../src/lib/data/project-registry');

      getRegistry(dashboardPath);

      const registryPath = path.join(dashboardPath, 'project-registry.json');
      expect(fs.existsSync(registryPath)).toBe(true);
    });

    it('should add and retrieve projects', async () => {
      // @ts-expect-error - module not implemented yet
      const { getRegistry, addProject } = await import('../../src/lib/data/project-registry');

      const project = {
        id: 'test-project',
        name: 'Test Project',
        memory_path: memoryPath,
        status: 'active'
      };

      addProject(dashboardPath, project);
      const registry = getRegistry(dashboardPath);

      expect(registry.projects.length).toBeGreaterThan(0);
      expect(registry.projects.find(p => p.id === 'test-project')).toBeDefined();
    });
  });

  describe('cache integration', () => {
    it('should cache and retrieve data within TTL', async () => {
      // @ts-expect-error - module not implemented yet
      const { MemoryCache } = await import('../../src/lib/data/cache');

      const cache = new MemoryCache(1000);
      cache.set('test-key', { data: 'test' });

      const result = cache.get('test-key');
      expect(result).toEqual({ data: 'test' });
    });

    it('should report cache age', async () => {
      // @ts-expect-error - module not implemented yet
      const { MemoryCache } = await import('../../src/lib/data/cache');

      const cache = new MemoryCache(1000);
      cache.set('test-key', { data: 'test' });

      await new Promise(resolve => setTimeout(resolve, 50));

      const result = cache.getWithMeta('test-key');
      expect(result.meta.cacheAge).toBeGreaterThan(0);
    });

    it('should expire data after TTL', async () => {
      // @ts-expect-error - module not implemented yet
      const { MemoryCache } = await import('../../src/lib/data/cache');

      const cache = new MemoryCache(100);
      cache.set('test-key', { data: 'test' });

      await new Promise(resolve => setTimeout(resolve, 150));

      const result = cache.get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('end-to-end data flow', () => {
    it('should flow from disk → reader → cache → response', async () => {
      // @ts-expect-error - module not implemented yet
      const { getAllWorkstreams } = await import('../../src/lib/data/workstream-reader');
      // @ts-expect-error - module not implemented yet
      const { MemoryCache } = await import('../../src/lib/data/cache');

      const cache = new MemoryCache(5000);

      // First read (cache miss)
      const workstreams1 = getAllWorkstreams(memoryPath);
      cache.set('workstreams', workstreams1);

      // Second read (cache hit)
      const cached = cache.get('workstreams');

      expect(cached).toEqual(workstreams1);
      expect(cached.length).toBe(workstreams1.length);
    });

    it('should handle concurrent data access', async () => {
      // @ts-expect-error - module not implemented yet
      const { getAllWorkstreams } = await import('../../src/lib/data/workstream-reader');

      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(getAllWorkstreams(memoryPath))
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(result.length).toBe(results[0].length);
      });
    });

    it('should handle malformed files gracefully in integration', async () => {
      // Add malformed file
      fs.writeFileSync(
        path.join(memoryPath, 'malformed.json'),
        '{ invalid json }'
      );

      // @ts-expect-error - module not implemented yet
      const { getAllWorkstreams } = await import('../../src/lib/data/workstream-reader');

      const workstreams = getAllWorkstreams(memoryPath);

      // Should skip malformed and return valid ones
      expect(workstreams.length).toBe(3);
    });
  });

  describe('real filesystem operations', () => {
    it('should handle directory creation recursively', async () => {
      const deepPath = path.join(tempDir, 'deep', 'nested', 'path');

      // @ts-expect-error - module not implemented yet
      const { getRegistry } = await import('../../src/lib/data/project-registry');

      getRegistry(deepPath);

      expect(fs.existsSync(deepPath)).toBe(true);
    });

    it('should handle concurrent writes safely', async () => {
      // @ts-expect-error - module not implemented yet
      const { addProject, getRegistry } = await import('../../src/lib/data/project-registry');

      const promises = Array.from({ length: 5 }, (_, i) =>
        Promise.resolve(addProject(dashboardPath, {
          id: `concurrent-${i}`,
          name: `Project ${i}`,
          memory_path: `/path/${i}`
        }))
      );

      await Promise.all(promises);

      const registry = getRegistry(dashboardPath);
      expect(registry.projects.length).toBeGreaterThanOrEqual(5);
    });

    it('should preserve data integrity across reads and writes', async () => {
      // @ts-expect-error - module not implemented yet
      const { getRegistry, addProject, removeProject } = await import('../../src/lib/data/project-registry');

      const project = {
        id: 'integrity-test',
        name: 'Integrity Test',
        memory_path: '/test/path'
      };

      addProject(dashboardPath, project);
      const registry1 = getRegistry(dashboardPath);

      removeProject(dashboardPath, 'integrity-test');
      const registry2 = getRegistry(dashboardPath);

      expect(registry1.projects.find(p => p.id === 'integrity-test')).toBeDefined();
      expect(registry2.projects.find(p => p.id === 'integrity-test')).toBeUndefined();
    });
  });
});
