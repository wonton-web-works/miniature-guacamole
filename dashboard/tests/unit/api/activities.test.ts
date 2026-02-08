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

      expect(data.meta).toHaveProperty('cached');
      expect(typeof data.meta.cached).toBe('boolean');
    });
  });

  // AC-DASH-5+6.1: Pagination metadata tests
  describe('pagination metadata - AC-DASH-5+6.1', () => {
    it('should include meta.total with total count of activities', async () => {
      const request = new NextRequest('http://localhost:3000/api/activities');
      const response = await GET(request);
      const data = await response.json();

      expect(data.meta).toHaveProperty('total');
      expect(typeof data.meta.total).toBe('number');
      expect(data.meta.total).toBeGreaterThanOrEqual(0);
    });

    it('should include meta.offset with current offset', async () => {
      const request = new NextRequest('http://localhost:3000/api/activities?offset=5');
      const response = await GET(request);
      const data = await response.json();

      expect(data.meta).toHaveProperty('offset');
      expect(data.meta.offset).toBe(5);
    });

    it('should include meta.offset=0 when no offset specified', async () => {
      const request = new NextRequest('http://localhost:3000/api/activities');
      const response = await GET(request);
      const data = await response.json();

      expect(data.meta).toHaveProperty('offset');
      expect(data.meta.offset).toBe(0);
    });

    it('should include meta.limit with page size', async () => {
      const request = new NextRequest('http://localhost:3000/api/activities?limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(data.meta).toHaveProperty('limit');
      expect(data.meta.limit).toBe(10);
    });

    it('should include meta.limit with default when not specified', async () => {
      const request = new NextRequest('http://localhost:3000/api/activities');
      const response = await GET(request);
      const data = await response.json();

      expect(data.meta).toHaveProperty('limit');
      expect(typeof data.meta.limit).toBe('number');
    });

    it('should include meta.hasMore=true when more results exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/activities?limit=1');
      const response = await GET(request);
      const data = await response.json();

      expect(data.meta).toHaveProperty('hasMore');
      expect(typeof data.meta.hasMore).toBe('boolean');

      // If there's at least 1 activity and we're limiting to 1, hasMore should reflect if there are more
      if (data.data.length === 1 && data.meta.total > 1) {
        expect(data.meta.hasMore).toBe(true);
      }
    });

    it('should include meta.hasMore=false when no more results exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/activities?limit=1000');
      const response = await GET(request);
      const data = await response.json();

      expect(data.meta).toHaveProperty('hasMore');

      // If we requested more than total, hasMore should be false
      if (data.meta.limit >= data.meta.total) {
        expect(data.meta.hasMore).toBe(false);
      }
    });

    it('should calculate hasMore correctly with offset and limit', async () => {
      // First get total count
      const totalRequest = new NextRequest('http://localhost:3000/api/activities');
      const totalResponse = await GET(totalRequest);
      const totalData = await totalResponse.json();
      const total = totalData.meta.total;

      if (total > 2) {
        // Request from offset that leaves more data
        const request = new NextRequest('http://localhost:3000/api/activities?offset=1&limit=1');
        const response = await GET(request);
        const data = await response.json();

        const expectedHasMore = (data.meta.offset + data.meta.limit) < data.meta.total;
        expect(data.meta.hasMore).toBe(expectedHasMore);
      }
    });

    it('should include all pagination metadata fields together', async () => {
      const request = new NextRequest('http://localhost:3000/api/activities?limit=5&offset=2');
      const response = await GET(request);
      const data = await response.json();

      // All 4 required fields must be present
      expect(data.meta).toHaveProperty('total');
      expect(data.meta).toHaveProperty('offset');
      expect(data.meta).toHaveProperty('limit');
      expect(data.meta).toHaveProperty('hasMore');

      // Verify types
      expect(typeof data.meta.total).toBe('number');
      expect(typeof data.meta.offset).toBe('number');
      expect(typeof data.meta.limit).toBe('number');
      expect(typeof data.meta.hasMore).toBe('boolean');
    });

    it('should maintain pagination metadata accuracy with filters', async () => {
      const request = new NextRequest('http://localhost:3000/api/activities?agentId=dev&limit=5');
      const response = await GET(request);
      const data = await response.json();

      // Even with filters, all pagination metadata should be present
      expect(data.meta.total).toBeGreaterThanOrEqual(data.data.length);
      expect(data.meta.offset).toBe(0);
      expect(data.meta.limit).toBe(5);
      expect(typeof data.meta.hasMore).toBe('boolean');
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
