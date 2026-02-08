import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the data layer to return test data
vi.mock('../../../src/lib/data', () => ({
  getWorkstreamById: vi.fn((id: string) => {
    if (id === 'WS-1' || id === 'WS-2' || id === 'WS-16' || id === 'WS-DASH-1' || id === 'WS-TRACKING-P2') {
      return {
        workstream_id: id,
        name: `Test Workstream ${id}`,
        status: 'in_progress',
        phase: 'in_progress',
        agent_id: 'test-agent',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString().split('T')[0],
        description: 'Test description',
        acceptance_criteria: ['AC-1', 'AC-2'],
        tests: {
          total: 10,
          passing: 8,
          failing: 2,
        },
        tdd_cycle: {
          step: 'red',
        },
      };
    }
    return null;
  }),
  MemoryCache: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockReturnValue(null),
    getWithMeta: vi.fn().mockReturnValue(null),
    set: vi.fn(),
  })),
}));

// AC-DASH-1.7: GET /api/workstreams/[id] returns 200 with detail or 404

describe('GET /api/workstreams/[id]', () => {
  let GET: any;

  beforeEach(async () => {
    vi.resetModules();
    // @ts-expect-error - module not implemented yet
    const module = await import('../../../src/app/api/workstreams/[id]/route');
    GET = module.GET;
  });

  describe('successful retrieval', () => {
    it('should return 200 for existing workstream', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-1');
      const response = await GET(request, { params: { id: 'WS-1' } });

      expect(response.status).toBe(200);
    });

    it('should return WorkstreamDetail with full data', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-1');
      const response = await GET(request, { params: { id: 'WS-1' } });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data).toHaveProperty('workstream_id');
      expect(data.data).toHaveProperty('name');
      expect(data.data).toHaveProperty('status');
    });

    it('should include acceptance_criteria if present', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-1');
      const response = await GET(request, { params: { id: 'WS-1' } });
      const data = await response.json();

      if (data.data?.acceptance_criteria) {
        expect(Array.isArray(data.data.acceptance_criteria)).toBe(true);
      }
    });

    it('should include tests object if present', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-1');
      const response = await GET(request, { params: { id: 'WS-1' } });
      const data = await response.json();

      if (data.data?.tests) {
        expect(data.data.tests).toHaveProperty('total');
        expect(data.data.tests).toHaveProperty('passing');
        expect(data.data.tests).toHaveProperty('failing');
      }
    });

    it('should include tdd_cycle if present', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-1');
      const response = await GET(request, { params: { id: 'WS-1' } });
      const data = await response.json();

      if (data.data?.tdd_cycle) {
        expect(typeof data.data.tdd_cycle).toBe('object');
      }
    });

    it('should normalize status in detail view', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-1');
      const response = await GET(request, { params: { id: 'WS-1' } });
      const data = await response.json();

      const validStatuses = ['in_progress', 'blocked', 'complete', 'unknown'];
      if (data.data) {
        expect(validStatuses).toContain(data.data.status);
      }
    });

    it('should return ApiResponse envelope', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-1');
      const response = await GET(request, { params: { id: 'WS-1' } });
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('timestamp');
      // meta is only present on success responses
      if (data.success) {
        expect(data).toHaveProperty('meta');
      }
    });
  });

  describe('not found', () => {
    it('should return 404 for non-existent workstream', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-NONEXISTENT');
      const response = await GET(request, { params: { id: 'WS-NONEXISTENT' } });

      expect(response.status).toBe(404);
    });

    it('should return error message in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-NONEXISTENT');
      const response = await GET(request, { params: { id: 'WS-NONEXISTENT' } });
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
      expect(typeof data.error).toBe('string');
    });

    it('should set data to null on 404', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-NONEXISTENT');
      const response = await GET(request, { params: { id: 'WS-NONEXISTENT' } });
      const data = await response.json();

      expect(data.data).toBeNull();
    });

    it('should include timestamp even on error', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-NONEXISTENT');
      const response = await GET(request, { params: { id: 'WS-NONEXISTENT' } });
      const data = await response.json();

      expect(data).toHaveProperty('timestamp');
      expect(typeof data.timestamp).toBe('string');
    });
  });

  describe('ID variations', () => {
    it('should handle WS-16 format', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-16');
      const response = await GET(request, { params: { id: 'WS-16' } });

      expect([200, 404]).toContain(response.status);
    });

    it('should handle WS-DASH-1 format', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-DASH-1');
      const response = await GET(request, { params: { id: 'WS-DASH-1' } });

      expect([200, 404]).toContain(response.status);
    });

    it('should handle WS-TRACKING-P2 format', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-TRACKING-P2');
      const response = await GET(request, { params: { id: 'WS-TRACKING-P2' } });

      expect([200, 404]).toContain(response.status);
    });

    it('should be case-sensitive', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/ws-1');
      const response = await GET(request, { params: { id: 'ws-1' } });

      // Lowercase should not match uppercase WS-1
      expect(response.status).toBe(404);
    });

    it('should handle URL-encoded IDs', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/WS%2D1');
      const response = await GET(request, { params: { id: 'WS-1' } });

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('caching', () => {
    it('should cache workstream detail', async () => {
      const request1 = new NextRequest('http://localhost:3000/api/workstreams/WS-1');
      await GET(request1, { params: { id: 'WS-1' } });

      const request2 = new NextRequest('http://localhost:3000/api/workstreams/WS-1');
      const response2 = await GET(request2, { params: { id: 'WS-1' } });
      const data2 = await response2.json();

      if (data2.success) {
        expect(data2.meta.cached).toBe(true);
      }
    });

    it('should not cache 404 responses', async () => {
      const request1 = new NextRequest('http://localhost:3000/api/workstreams/WS-NONEXISTENT');
      await GET(request1, { params: { id: 'WS-NONEXISTENT' } });

      const request2 = new NextRequest('http://localhost:3000/api/workstreams/WS-NONEXISTENT');
      const response2 = await GET(request2, { params: { id: 'WS-NONEXISTENT' } });
      const data2 = await response2.json();

      // 404 responses do not have meta field because they are not cached
      expect(data2.meta).toBeUndefined();
    });

    it('should cache different IDs separately', async () => {
      const request1 = new NextRequest('http://localhost:3000/api/workstreams/WS-1');
      await GET(request1, { params: { id: 'WS-1' } });

      const request2 = new NextRequest('http://localhost:3000/api/workstreams/WS-2');
      const response2 = await GET(request2, { params: { id: 'WS-2' } });
      const data2 = await response2.json();

      expect(data2.meta.cached).toBe(false); // First request for WS-2
    });
  });

  describe('error handling', () => {
    it('should handle malformed workstream files', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-MALFORMED');
      const response = await GET(request, { params: { id: 'WS-MALFORMED' } });

      expect(response.status).toBe(404);
    });

    it('should handle missing params object', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-1');
      const response = await GET(request, { params: {} as any });

      expect([400, 404]).toContain(response.status);
    });

    it('should handle empty ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/');
      const response = await GET(request, { params: { id: '' } });

      expect([400, 404]).toContain(response.status);
    });
  });

  describe('response structure', () => {
    it('should maintain consistent envelope on success', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-1');
      const response = await GET(request, { params: { id: 'WS-1' } });
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('timestamp');
      // meta is only present on success responses
      if (data.success) {
        expect(data).toHaveProperty('meta');
      }
    });

    it('should maintain consistent envelope on error', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-NONEXISTENT');
      const response = await GET(request, { params: { id: 'WS-NONEXISTENT' } });
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('timestamp');
      // Error responses do not include meta field
      expect(data.meta).toBeUndefined();
    });

    it('should set Content-Type to application/json', async () => {
      const request = new NextRequest('http://localhost:3000/api/workstreams/WS-1');
      const response = await GET(request, { params: { id: 'WS-1' } });

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });
});
