import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// AC-DASH-1.7: GET /api/activities returns 200 with paginated data

describe('GET /api/activities', () => {
  let GET: any;

  beforeEach(async () => {
    // @ts-expect-error - module not implemented yet
    const module = await import('../../../src/app/api/activities/route');
    GET = module.GET;
  });

  it('should return 200 with ApiResponse envelope', async () => {
    const request = new NextRequest('http://localhost:3000/api/activities');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('meta');
  });

  it('should return array of activities', async () => {
    const request = new NextRequest('http://localhost:3000/api/activities');
    const response = await GET(request);
    const data = await response.json();

    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should include activity fields', async () => {
    const request = new NextRequest('http://localhost:3000/api/activities');
    const response = await GET(request);
    const data = await response.json();

    if (data.data.length > 0) {
      expect(data.data[0]).toHaveProperty('agent_id');
      expect(data.data[0]).toHaveProperty('timestamp');
    }
  });

  describe('pagination - limit and offset', () => {
    it('should handle limit parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/activities?limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBeLessThanOrEqual(10);
    });

    it('should handle offset parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/activities?offset=5');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should combine limit and offset', async () => {
      const request = new NextRequest('http://localhost:3000/api/activities?limit=10&offset=5');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBeLessThanOrEqual(10);
    });

    it('should handle limit=0', async () => {
      const request = new NextRequest('http://localhost:3000/api/activities?limit=0');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data).toEqual([]);
    });

    it('should handle invalid limit gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/activities?limit=invalid');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should include pagination meta', async () => {
      const request = new NextRequest('http://localhost:3000/api/activities?limit=10&offset=5');
      const response = await GET(request);
      const data = await response.json();

      expect(data.meta).toHaveProperty('limit');
      expect(data.meta).toHaveProperty('offset');
    });
  });

  describe('filtering', () => {
    it('should filter by agentId', async () => {
      const request = new NextRequest('http://localhost:3000/api/activities?agentId=dev');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.forEach((activity: any) => {
        expect(activity.agent_id).toBe('dev');
      });
    });

    it('should filter by workstreamId', async () => {
      const request = new NextRequest('http://localhost:3000/api/activities?workstreamId=WS-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.forEach((activity: any) => {
        expect(activity.workstream_id).toBe('WS-1');
      });
    });

    it('should combine filters with pagination', async () => {
      const request = new NextRequest('http://localhost:3000/api/activities?agentId=dev&limit=5');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('sorting', () => {
    it('should return activities in reverse-chronological order', async () => {
      const request = new NextRequest('http://localhost:3000/api/activities');
      const response = await GET(request);
      const data = await response.json();

      if (data.data.length > 1) {
        const first = new Date(data.data[0].timestamp);
        const second = new Date(data.data[1].timestamp);
        expect(first >= second).toBe(true);
      }
    });
  });

  describe('caching', () => {
    it('should include cached flag in meta', async () => {
      const request = new NextRequest('http://localhost:3000/api/activities');
      const response = await GET(request);
      const data = await response.json();

      expect(data.meta).toHaveProperty('cached');
      expect(typeof data.meta.cached).toBe('boolean');
    });
  });
});
