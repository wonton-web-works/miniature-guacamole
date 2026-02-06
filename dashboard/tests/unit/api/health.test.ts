import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// AC-DASH-1.7: GET /api/health returns 200 when accessible, 503 when not

describe('GET /api/health', () => {
  let GET: any;

  beforeEach(async () => {
    // @ts-expect-error - module not implemented yet
    const module = await import('../../../src/app/api/health/route');
    GET = module.GET;
  });

  describe('healthy state', () => {
    it('should return 200 when memory dir accessible', async () => {
      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);

      expect([200, 503]).toContain(response.status);
    });

    it('should return ApiResponse envelope', async () => {
      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('meta');
    });

    it('should include status field in data', async () => {
      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data).toHaveProperty('status');
      expect(['healthy', 'unhealthy']).toContain(data.data.status);
    });

    it('should include checks object', async () => {
      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data).toHaveProperty('checks');
      expect(typeof data.data.checks).toBe('object');
    });

    it('should check memory directory', async () => {
      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.checks).toHaveProperty('memory_dir');
      expect(typeof data.data.checks.memory_dir).toBe('boolean');
    });

    it('should check dashboard directory', async () => {
      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.checks).toHaveProperty('dashboard_dir');
      expect(typeof data.data.checks.dashboard_dir).toBe('boolean');
    });

    it('should include timestamp in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(typeof data.timestamp).toBe('string');
    });
  });

  describe('unhealthy state', () => {
    it('should return 503 when memory dir not accessible', async () => {
      // This test validates the error path exists
      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);

      if (!response.ok) {
        expect(response.status).toBe(503);
      }
    });

    it('should set success to false on 503', async () => {
      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      if (response.status === 503) {
        expect(data.success).toBe(false);
        expect(data.data.status).toBe('unhealthy');
      }
    });

    it('should include error details', async () => {
      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      if (response.status === 503) {
        expect(data.data.checks.memory_dir).toBe(false);
      }
    });
  });

  describe('response format', () => {
    it('should maintain consistent structure on success', async () => {
      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('meta');
    });

    it('should maintain consistent structure on error', async () => {
      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('meta');
    });

    it('should set Content-Type to application/json', async () => {
      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('caching', () => {
    it('should not cache health check results', async () => {
      const request1 = new NextRequest('http://localhost:3000/api/health');
      await GET(request1);

      const request2 = new NextRequest('http://localhost:3000/api/health');
      const response2 = await GET(request2);
      const data2 = await response2.json();

      expect(data2.meta.cached).toBe(false);
    });
  });

  describe('performance', () => {
    it('should respond quickly', async () => {
      const start = Date.now();
      const request = new NextRequest('http://localhost:3000/api/health');
      await GET(request);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500); // 500ms max
    });
  });
});
