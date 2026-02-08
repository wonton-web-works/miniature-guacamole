import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

// AC-DASH-1.9: Integration test: Full API request/response cycle
// Tests complete flow: HTTP request → API handler → data layer → filesystem → response

describe('API Routes Integration', () => {
  let tempDir: string;
  let memoryPath: string;

  beforeAll(() => {
    // Setup test environment
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dashboard-api-test-'));
    memoryPath = path.join(tempDir, 'memory');
    fs.mkdirSync(memoryPath, { recursive: true });
    process.env.CLAUDE_MEMORY_PATH = memoryPath;

    // Create test workstreams
    fs.writeFileSync(
      path.join(memoryPath, 'workstream-WS-INT-1-state.json'),
      JSON.stringify({
        workstream_id: 'WS-INT-1',
        name: 'Integration Test Active',
        status: 'in_progress',
        phase: 'step_2_implementation',
        agent_id: 'dev',
        timestamp: '2026-02-05T10:00:00Z'
      })
    );

    fs.writeFileSync(
      path.join(memoryPath, 'workstream-WS-INT-2-state.json'),
      JSON.stringify({
        workstream_id: 'WS-INT-2',
        name: 'Integration Test Blocked',
        status: 'blocked',
        blocked_reason: 'Waiting for dependencies',
        agent_id: 'qa',
        timestamp: '2026-02-05T09:00:00Z'
      })
    );

    fs.writeFileSync(
      path.join(memoryPath, 'agent-dev.json'),
      JSON.stringify({
        agent_id: 'dev',
        workstream_id: 'WS-INT-1',
        timestamp: '2026-02-05T10:30:00Z',
        data: { action: 'implemented feature' }
      })
    );

    fs.writeFileSync(
      path.join(memoryPath, 'agent-qa.json'),
      JSON.stringify({
        agent_id: 'qa',
        workstream_id: 'WS-INT-2',
        timestamp: '2026-02-05T10:00:00Z',
        data: { action: 'wrote tests' }
      })
    );
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('GET /api/workstreams - full cycle', () => {
    it('should complete full request-response cycle', async () => {
      // @ts-expect-error - module not implemented yet
      const { GET } = await import('../../src/app/api/workstreams/route');

      const request = new NextRequest('http://localhost:3000/api/workstreams');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    it('should return correctly structured workstreams from filesystem', async () => {
      // @ts-expect-error - module not implemented yet
      const { GET } = await import('../../src/app/api/workstreams/route');

      const request = new NextRequest('http://localhost:3000/api/workstreams');
      const response = await GET(request);
      const data = await response.json();

      const workstream = data.data.find((ws: any) => ws.workstream_id === 'WS-INT-1');
      expect(workstream).toBeDefined();
      expect(workstream.name).toBe('Integration Test Active');
      expect(workstream.status).toBe('in_progress');
    });

    it('should filter workstreams by status across full stack', async () => {
      // @ts-expect-error - module not implemented yet
      const { GET } = await import('../../src/app/api/workstreams/route');

      const request = new NextRequest('http://localhost:3000/api/workstreams?status=blocked');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((ws: any) => ws.status === 'blocked')).toBe(true);
      expect(data.data.find((ws: any) => ws.workstream_id === 'WS-INT-2')).toBeDefined();
    });

    it('should include proper response headers', async () => {
      // @ts-expect-error - module not implemented yet
      const { GET } = await import('../../src/app/api/workstreams/route');

      const request = new NextRequest('http://localhost:3000/api/workstreams');
      const response = await GET(request);

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('GET /api/workstreams/[id] - full cycle', () => {
    it('should retrieve specific workstream from filesystem', async () => {
      // @ts-expect-error - module not implemented yet
      const { GET } = await import('../../src/app/api/workstreams/[id]/route');

      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-INT-1');
      const response = await GET(request, { params: { id: 'WS-INT-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.workstream_id).toBe('WS-INT-1');
      expect(data.data.name).toBe('Integration Test Active');
    });

    it('should return 404 for non-existent workstream', async () => {
      // @ts-expect-error - module not implemented yet
      const { GET } = await import('../../src/app/api/workstreams/[id]/route');

      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-NONEXISTENT');
      const response = await GET(request, { params: { id: 'WS-NONEXISTENT' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.data).toBeNull();
      expect(data.error).toBeDefined();
    });

    it('should normalize status in detail response', async () => {
      // @ts-expect-error - module not implemented yet
      const { GET } = await import('../../src/app/api/workstreams/[id]/route');

      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-INT-2');
      const response = await GET(request, { params: { id: 'WS-INT-2' } });
      const data = await response.json();

      expect(data.data.status).toBe('blocked');
      expect(data.data.blocked_reason).toBe('Waiting for dependencies');
    });
  });

  describe('GET /api/activities - full cycle', () => {
    it('should derive activities from memory files', async () => {
      // @ts-expect-error - module not implemented yet
      const { GET } = await import('../../src/app/api/activities/route');

      const request = new NextRequest('http://localhost:3000/api/activities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    it('should return activities in reverse-chronological order', async () => {
      // @ts-expect-error - module not implemented yet
      const { GET } = await import('../../src/app/api/activities/route');

      const request = new NextRequest('http://localhost:3000/api/activities');
      const response = await GET(request);
      const data = await response.json();

      if (data.data.length > 1) {
        const first = new Date(data.data[0].timestamp);
        const second = new Date(data.data[1].timestamp);
        expect(first >= second).toBe(true);
      }
    });

    it('should filter activities by agentId', async () => {
      // @ts-expect-error - module not implemented yet
      const { GET } = await import('../../src/app/api/activities/route');

      const request = new NextRequest('http://localhost:3000/api/activities?agentId=dev');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.forEach((activity: any) => {
        expect(activity.agent_id).toBe('dev');
      });
    });

    it('should paginate activities correctly', async () => {
      // @ts-expect-error - module not implemented yet
      const { GET } = await import('../../src/app/api/activities/route');

      const request = new NextRequest('http://localhost:3000/api/activities?limit=1');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.length).toBeLessThanOrEqual(1);
      expect(data.meta.limit).toBe(1);
    });
  });

  describe('GET /api/health - full cycle', () => {
    it('should check filesystem accessibility', async () => {
      // @ts-expect-error - module not implemented yet
      const { GET } = await import('../../src/app/api/health/route');

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect([200, 503]).toContain(response.status);
      expect(data.data).toHaveProperty('status');
      expect(data.data).toHaveProperty('checks');
    });

    it('should report memory dir check result', async () => {
      // @ts-expect-error - module not implemented yet
      const { GET } = await import('../../src/app/api/health/route');

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.checks).toHaveProperty('memory_dir');
      expect(typeof data.data.checks.memory_dir).toBe('boolean');
    });
  });

  describe('cross-endpoint consistency', () => {
    it('should return same workstream data across list and detail endpoints', async () => {
      // @ts-expect-error - module not implemented yet
      const listModule = await import('../../src/app/api/workstreams/route');
      // @ts-expect-error - module not implemented yet
      const detailModule = await import('../../src/app/api/workstreams/[id]/route');

      const listRequest = new NextRequest('http://localhost:3000/api/workstreams');
      const listResponse = await listModule.GET(listRequest);
      const listData = await listResponse.json();

      const workstreamId = listData.data[0]?.workstream_id;
      if (workstreamId) {
        const detailRequest = new NextRequest(`http://localhost:3000/api/workstreams/${workstreamId}`);
        const detailResponse = await detailModule.GET(detailRequest, { params: { id: workstreamId } });
        const detailData = await detailResponse.json();

        expect(detailData.data.workstream_id).toBe(workstreamId);
        expect(detailData.data.name).toBe(listData.data[0].name);
        expect(detailData.data.status).toBe(listData.data[0].status);
      }
    });

    it('should maintain consistent timestamp format across all endpoints', async () => {
      // @ts-expect-error - module not implemented yet
      const workstreamsModule = await import('../../src/app/api/workstreams/route');
      // @ts-expect-error - module not implemented yet
      const activitiesModule = await import('../../src/app/api/activities/route');
      // @ts-expect-error - module not implemented yet
      const healthModule = await import('../../src/app/api/health/route');

      const endpoints = [
        workstreamsModule.GET(new NextRequest('http://localhost:3000/api/workstreams')),
        activitiesModule.GET(new NextRequest('http://localhost:3000/api/activities')),
        healthModule.GET(new NextRequest('http://localhost:3000/api/health'))
      ];

      const responses = await Promise.all(endpoints);
      const data = await Promise.all(responses.map(r => r.json()));

      data.forEach(d => {
        expect(d.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });
    });

    it('should maintain consistent ApiResponse structure', async () => {
      // @ts-expect-error - module not implemented yet
      const workstreamsModule = await import('../../src/app/api/workstreams/route');
      // @ts-expect-error - module not implemented yet
      const activitiesModule = await import('../../src/app/api/activities/route');

      const responses = await Promise.all([
        workstreamsModule.GET(new NextRequest('http://localhost:3000/api/workstreams')),
        activitiesModule.GET(new NextRequest('http://localhost:3000/api/activities'))
      ]);

      const data = await Promise.all(responses.map(r => r.json()));

      data.forEach(d => {
        expect(d).toHaveProperty('success');
        expect(d).toHaveProperty('data');
        expect(d).toHaveProperty('timestamp');
        expect(d).toHaveProperty('meta');
      });
    });
  });

  describe('error resilience', () => {
    it('should handle concurrent API requests', async () => {
      // @ts-expect-error - module not implemented yet
      const { GET } = await import('../../src/app/api/workstreams/route');

      const requests = Array.from({ length: 10 }, () =>
        GET(new NextRequest('http://localhost:3000/api/workstreams'))
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle mixed success and error responses', async () => {
      // @ts-expect-error - module not implemented yet
      const { GET } = await import('../../src/app/api/workstreams/[id]/route');

      const requests = [
        GET(new NextRequest('http://localhost:3000/api/workstreams/WS-INT-1'), { params: { id: 'WS-INT-1' } }),
        GET(new NextRequest('http://localhost:3000/api/workstreams/WS-NONEXISTENT'), { params: { id: 'WS-NONEXISTENT' } })
      ];

      const responses = await Promise.all(requests);

      expect(responses[0].status).toBe(200);
      expect(responses[1].status).toBe(404);
    });

    it('should gracefully handle filesystem changes during requests', async () => {
      // Add new workstream mid-test
      fs.writeFileSync(
        path.join(memoryPath, 'workstream-WS-INT-3-state.json'),
        JSON.stringify({
          workstream_id: 'WS-INT-3',
          name: 'Dynamically Added',
          status: 'in_progress'
        })
      );

      // @ts-expect-error - module not implemented yet
      const { GET } = await import('../../src/app/api/workstreams/route');

      const request = new NextRequest('http://localhost:3000/api/workstreams');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('performance under load', () => {
    it('should handle rapid sequential requests efficiently', async () => {
      // @ts-expect-error - module not implemented yet
      const { GET } = await import('../../src/app/api/workstreams/route');

      const start = Date.now();

      for (let i = 0; i < 20; i++) {
        const request = new NextRequest('http://localhost:3000/api/workstreams');
        await GET(request);
      }

      const duration = Date.now() - start;
      const avgTime = duration / 20;

      expect(avgTime).toBeLessThan(100); // Average under 100ms
    });

    it('should benefit from caching on subsequent requests', async () => {
      // @ts-expect-error - module not implemented yet
      const { GET } = await import('../../src/app/api/workstreams/route');

      // First request (cache miss)
      const start1 = Date.now();
      const request1 = new NextRequest('http://localhost:3000/api/workstreams');
      await GET(request1);
      const duration1 = Date.now() - start1;

      // Second request (cache hit)
      const start2 = Date.now();
      const request2 = new NextRequest('http://localhost:3000/api/workstreams');
      const response2 = await GET(request2);
      const duration2 = Date.now() - start2;

      const data2 = await response2.json();

      expect(data2.meta.cached).toBe(true);
      expect(duration2).toBeLessThanOrEqual(duration1);
    });
  });
});
