import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// AC-DASH-1.7: GET /api/questions returns 200 (empty if file missing)

describe('GET /api/questions', () => {
  let GET: any;

  beforeEach(async () => {
    // @ts-expect-error - module not implemented yet
    const module = await import('../../../src/app/api/questions/route');
    GET = module.GET;
  });

  it('should return 200 with ApiResponse envelope', async () => {
    const request = new NextRequest('http://localhost:3000/api/questions');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('meta');
  });

  it('should return array of questions', async () => {
    const request = new NextRequest('http://localhost:3000/api/questions');
    const response = await GET(request);
    const data = await response.json();

    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should return empty array when file missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/questions');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should include question fields when present', async () => {
    const request = new NextRequest('http://localhost:3000/api/questions');
    const response = await GET(request);
    const data = await response.json();

    if (data.data.length > 0) {
      expect(data.data[0]).toHaveProperty('id');
      expect(data.data[0]).toHaveProperty('question');
      expect(data.data[0]).toHaveProperty('agent_id');
    }
  });

  describe('filtering', () => {
    it('should filter by status', async () => {
      const request = new NextRequest('http://localhost:3000/api/questions?status=pending');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.forEach((q: any) => {
        expect(q.status).toBe('pending');
      });
    });

    it('should filter by agentId', async () => {
      const request = new NextRequest('http://localhost:3000/api/questions?agentId=dev');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.forEach((q: any) => {
        expect(q.agent_id).toBe('dev');
      });
    });

    it('should filter by workstreamId', async () => {
      const request = new NextRequest('http://localhost:3000/api/questions?workstreamId=WS-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.forEach((q: any) => {
        expect(q.workstream_id).toBe('WS-1');
      });
    });
  });

  describe('caching', () => {
    it('should include cached flag', async () => {
      const request = new NextRequest('http://localhost:3000/api/questions');
      const response = await GET(request);
      const data = await response.json();

      expect(data.meta).toHaveProperty('cached');
    });
  });
});
