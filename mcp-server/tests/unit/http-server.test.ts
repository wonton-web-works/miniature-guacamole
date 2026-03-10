import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import * as http from 'node:http';

// ---------------------------------------------------------------------------
// WS-MCP-0D: Unit tests for HTTP server + REST API route handlers
// AC-MCP-0D.1:  mg-mcp-server starts HTTP on MG_HTTP_PORT (default 7842)
// AC-MCP-0D.2:  GET /api/workstreams → WorkstreamSummary[]
// AC-MCP-0D.3:  GET /api/workstreams/:id → WorkstreamDetail | 404 JSON
// AC-MCP-0D.4:  GET /api/workstreams/counts → WorkstreamCounts
// AC-MCP-0D.5:  GET /api/memory → memory entry metadata[]
// AC-MCP-0D.6:  GET /api/memory/:key → MemoryEntry | 404 JSON
// AC-MCP-0D.7:  GET /api/events → AgentEvent[] with ?workstream_id= filter
// AC-MCP-0D.8:  GET / (non-API) → static files if MG_STATIC_PATH set, else 404
// AC-MCP-0D.9:  All HTTP errors → {error: string, status: number}
// AC-MCP-0D.10: HTTP server uses same data/index.ts layer
// AC-MCP-0D.11: stdio MCP transport still works (no regression)
// AC-MCP-0D.12: HTTP server listens only on 127.0.0.1
//
// CAD ordering: MISUSE → BOUNDARY → GOLDEN PATH
// ---------------------------------------------------------------------------

// Mock the data layer so no real I/O is needed.
vi.mock('../../src/data/index.js', () => ({
  getAllWorkstreams: vi.fn(),
  getWorkstreamById: vi.fn(),
  getWorkstreamCounts: vi.fn(),
  getAllMemoryEntries: vi.fn(),
  getMemoryEntry: vi.fn(),
  getAgentEvents: vi.fn(),
}));

// ---- type stubs ----

interface WorkstreamSummary {
  workstream_id: string;
  name: string;
  status: string;
  phase: string;
  agent_id: string;
  timestamp: string;
  created_at: string;
  delegated_to?: string;
  gate_status?: string;
  blocked_reason?: string | null;
}

interface WorkstreamDetail extends WorkstreamSummary {
  description?: string;
  acceptance_criteria?: string[];
  dependencies?: string[];
}

interface WorkstreamCounts {
  total: number;
  by_status: Record<string, number>;
  by_phase: Record<string, number>;
}

interface MemoryEntryMeta {
  key: string;
  agent_id?: string;
  workstream_id?: string;
  timestamp?: string;
}

interface MemoryEntry extends MemoryEntryMeta {
  data: unknown;
}

interface AgentEvent {
  event_id: string;
  agent_id: string;
  workstream_id?: string;
  event_type: string;
  payload?: unknown;
  timestamp: string;
}

// ---- lazy-import helpers ----

async function loadHttpServer() {
  return await import('../../src/http-server.js');
}

async function loadApiRoutes() {
  return await import('../../src/routes/api.js');
}

async function loadDataLayer() {
  return await import('../../src/data/index.js');
}

// ---- fixtures ----

function makeSummary(overrides: Partial<WorkstreamSummary> = {}): WorkstreamSummary {
  return {
    workstream_id: 'WS-MCP-0D',
    name: 'Dashboard Serving',
    status: 'in_progress',
    phase: 'step_1_test_spec',
    agent_id: 'dev',
    timestamp: '2026-03-10T10:00:00Z',
    created_at: '2026-03-10',
    ...overrides,
  };
}

function makeDetail(overrides: Partial<WorkstreamDetail> = {}): WorkstreamDetail {
  return {
    ...makeSummary(),
    description: 'HTTP server alongside stdio MCP transport.',
    acceptance_criteria: ['AC-MCP-0D.1', 'AC-MCP-0D.2'],
    dependencies: ['WS-MCP-0C'],
    ...overrides,
  };
}

function makeCounts(overrides: Partial<WorkstreamCounts> = {}): WorkstreamCounts {
  return {
    total: 4,
    by_status: { in_progress: 2, complete: 2 },
    by_phase: { step_1_test_spec: 1, step_2_implementation: 1, complete: 2 },
    ...overrides,
  };
}

function makeMemoryMeta(overrides: Partial<MemoryEntryMeta> = {}): MemoryEntryMeta {
  return {
    key: 'tasks-qa',
    agent_id: 'qa',
    workstream_id: 'WS-MCP-0D',
    timestamp: '2026-03-10T10:00:00Z',
    ...overrides,
  };
}

function makeMemoryEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    ...makeMemoryMeta(),
    data: { tasks: [], version: 1 },
    ...overrides,
  };
}

function makeAgentEvent(overrides: Partial<AgentEvent> = {}): AgentEvent {
  return {
    event_id: 'evt-001',
    agent_id: 'qa',
    workstream_id: 'WS-MCP-0D',
    event_type: 'task_started',
    payload: { detail: 'writing tests' },
    timestamp: '2026-03-10T10:00:00Z',
    ...overrides,
  };
}

// ---- HTTP helper: make a real request against a running test server ----
// We spin up the actual HTTP server in beforeAll and hit it with Node's http
// module, so we exercise the full routing stack without real data I/O.

function makeRequest(
  server: http.Server,
  method: string,
  path: string
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as { port: number };
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: addr.port,
      path,
      method,
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode ?? 0, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ===========================================================================
// MISUSE CASES
// ===========================================================================

// ---------------------------------------------------------------------------
// MISUSE: config — getHttpPort and getStaticPath with bad env values (AC-MCP-0D.1, AC-MCP-0D.8)
// ---------------------------------------------------------------------------

describe('config MISUSE: getHttpPort bad env values (AC-MCP-0D.1)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Given MG_HTTP_PORT=abc (non-numeric), When getHttpPort is called, Then returns default 7842 not NaN', async () => {
    vi.stubEnv('MG_HTTP_PORT', 'abc');
    const { getHttpPort } = await import('../../src/config.js');
    const port = getHttpPort();
    expect(Number.isNaN(port)).toBe(false);
    expect(port).toBe(7842);
  });

  it('Given MG_HTTP_PORT=-1 (negative), When getHttpPort is called, Then returns default 7842 not -1', async () => {
    vi.stubEnv('MG_HTTP_PORT', '-1');
    const { getHttpPort } = await import('../../src/config.js');
    const port = getHttpPort();
    expect(port).toBe(7842);
  });

  it('Given MG_HTTP_PORT=99999 (above valid range), When getHttpPort is called, Then returns default 7842 not 99999', async () => {
    vi.stubEnv('MG_HTTP_PORT', '99999');
    const { getHttpPort } = await import('../../src/config.js');
    const port = getHttpPort();
    expect(port).toBe(7842);
  });

  it('Given MG_HTTP_PORT="" (empty string), When getHttpPort is called, Then returns default 7842', async () => {
    vi.stubEnv('MG_HTTP_PORT', '');
    const { getHttpPort } = await import('../../src/config.js');
    const port = getHttpPort();
    expect(port).toBe(7842);
  });

  it('Given MG_STATIC_PATH not set, When getStaticPath is called, Then returns undefined not empty string', async () => {
    delete process.env.MG_STATIC_PATH;
    const { getStaticPath } = await import('../../src/config.js');
    const staticPath = getStaticPath();
    // Must be undefined or null — never an empty string that would be used as a path
    expect(staticPath == null || staticPath === undefined).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// MISUSE: HTTP method not allowed (AC-MCP-0D.9)
// ---------------------------------------------------------------------------

describe('http-server MISUSE: unsupported HTTP methods (AC-MCP-0D.9)', () => {
  let server: http.Server;

  beforeAll(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([]);
    vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(null);
    vi.mocked(dataLayer.getWorkstreamCounts).mockResolvedValue(makeCounts());
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([]);
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(null);
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { createHttpServer } = await loadHttpServer();
    server = await createHttpServer(0); // port 0 = OS assigns a free port
  });

  afterAll(() => {
    server?.close();
  });

  it('Given POST /api/workstreams, When request sent, Then responds 405 with JSON error body (AC-MCP-0D.9)', async () => {
    const { status, body } = await makeRequest(server, 'POST', '/api/workstreams');
    expect(status).toBe(405);
    const json = JSON.parse(body);
    expect(json).toHaveProperty('error');
    expect(json).toHaveProperty('status', 405);
  });

  it('Given DELETE /api/workstreams/WS-1, When request sent, Then responds 405 with JSON error body', async () => {
    const { status, body } = await makeRequest(server, 'DELETE', '/api/workstreams/WS-1');
    expect(status).toBe(405);
    const json = JSON.parse(body);
    expect(json).toHaveProperty('error');
    expect(json).toHaveProperty('status', 405);
  });

  it('Given PUT /api/memory, When request sent, Then responds 405 with JSON error body', async () => {
    const { status, body } = await makeRequest(server, 'PUT', '/api/memory');
    expect(status).toBe(405);
    const json = JSON.parse(body);
    expect(json).toHaveProperty('error');
    expect(json).toHaveProperty('status', 405);
  });

  it('Given PATCH /api/events, When request sent, Then responds 405 with JSON error body', async () => {
    const { status, body } = await makeRequest(server, 'PATCH', '/api/events');
    expect(status).toBe(405);
    const json = JSON.parse(body);
    expect(json).toHaveProperty('error');
    expect(json).toHaveProperty('status', 405);
  });
});

// ---------------------------------------------------------------------------
// MISUSE: unknown API routes return 404 JSON, not HTML (AC-MCP-0D.9)
// ---------------------------------------------------------------------------

describe('http-server MISUSE: unknown API routes return 404 JSON (AC-MCP-0D.9)', () => {
  let server: http.Server;

  beforeAll(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([]);
    vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(null);
    vi.mocked(dataLayer.getWorkstreamCounts).mockResolvedValue(makeCounts());
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([]);
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(null);
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { createHttpServer } = await loadHttpServer();
    server = await createHttpServer(0);
  });

  afterAll(() => {
    server?.close();
  });

  it('Given GET /api/nonexistent, When request sent, Then responds 404 with JSON error body', async () => {
    const { status, body } = await makeRequest(server, 'GET', '/api/nonexistent');
    expect(status).toBe(404);
    const json = JSON.parse(body);
    expect(json).toHaveProperty('error');
    expect(json).toHaveProperty('status', 404);
  });

  it('Given GET /api/workstreams/WS-DOES-NOT-EXIST, When request sent, Then responds 404 with JSON error body (AC-MCP-0D.3)', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(null);

    const { status, body } = await makeRequest(server, 'GET', '/api/workstreams/WS-DOES-NOT-EXIST');
    expect(status).toBe(404);
    const json = JSON.parse(body);
    expect(json).toHaveProperty('error');
    expect(json).toHaveProperty('status', 404);
    expect(typeof json.error).toBe('string');
  });

  it('Given GET /api/memory/nonexistent-key, When request sent, Then responds 404 with JSON error body (AC-MCP-0D.6)', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(null);

    const { status, body } = await makeRequest(server, 'GET', '/api/memory/nonexistent-key');
    expect(status).toBe(404);
    const json = JSON.parse(body);
    expect(json).toHaveProperty('error');
    expect(json).toHaveProperty('status', 404);
  });

  it('Given GET /api/workstreams/WS-<script>alert(1)</script>, When request sent, Then responds 404 JSON not crash', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(null);

    const { status, body } = await makeRequest(
      server,
      'GET',
      '/api/workstreams/WS-%3Cscript%3Ealert(1)%3C%2Fscript%3E'
    );
    // 404 is expected — ID won't be found. Server must not crash.
    expect(status).toBe(404);
    const json = JSON.parse(body);
    expect(json).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// MISUSE: static file serving without MG_STATIC_PATH configured (AC-MCP-0D.8)
// ---------------------------------------------------------------------------

describe('http-server MISUSE: static path not configured (AC-MCP-0D.8)', () => {
  let server: http.Server;

  beforeAll(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.MG_STATIC_PATH;

    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([]);
    vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(null);
    vi.mocked(dataLayer.getWorkstreamCounts).mockResolvedValue(makeCounts());
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([]);
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(null);
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { createHttpServer } = await loadHttpServer();
    server = await createHttpServer(0);
  });

  afterAll(() => {
    server?.close();
  });

  it('Given MG_STATIC_PATH is unset, When GET / is requested, Then responds 404 JSON not HTML (AC-MCP-0D.8)', async () => {
    const { status, body, headers } = await makeRequest(server, 'GET', '/');
    expect(status).toBe(404);
    // Must be JSON, not HTML
    expect(headers['content-type']).toMatch(/application\/json/);
    const json = JSON.parse(body);
    expect(json).toHaveProperty('error');
    expect(json).toHaveProperty('status', 404);
  });

  it('Given MG_STATIC_PATH is unset, When GET /index.html is requested, Then responds 404 JSON (AC-MCP-0D.8)', async () => {
    const { status, body } = await makeRequest(server, 'GET', '/index.html');
    expect(status).toBe(404);
    const json = JSON.parse(body);
    expect(json).toHaveProperty('error');
  });

  it('Given MG_STATIC_PATH is unset, When GET /dashboard is requested, Then responds 404 JSON not crash', async () => {
    const { status, body } = await makeRequest(server, 'GET', '/dashboard');
    expect(status).toBe(404);
    const json = JSON.parse(body);
    expect(json).toHaveProperty('error');
    expect(json).toHaveProperty('status', 404);
  });
});

// ---------------------------------------------------------------------------
// MISUSE: data layer errors surface as 500 JSON (AC-MCP-0D.9)
// ---------------------------------------------------------------------------

describe('http-server MISUSE: data layer throws → 500 JSON (AC-MCP-0D.9)', () => {
  let server: http.Server;

  beforeAll(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllWorkstreams).mockRejectedValue(new Error('disk read failed'));
    vi.mocked(dataLayer.getWorkstreamById).mockRejectedValue(new Error('db timeout'));
    vi.mocked(dataLayer.getWorkstreamCounts).mockRejectedValue(new Error('connection refused'));
    vi.mocked(dataLayer.getAllMemoryEntries).mockRejectedValue(new Error('filesystem unavailable'));
    vi.mocked(dataLayer.getMemoryEntry).mockRejectedValue(new Error('parse error'));
    vi.mocked(dataLayer.getAgentEvents).mockRejectedValue(new Error('network error'));

    const { createHttpServer } = await loadHttpServer();
    server = await createHttpServer(0);
  });

  afterAll(() => {
    server?.close();
  });

  it('Given getAllWorkstreams throws, When GET /api/workstreams, Then responds 500 with JSON error (AC-MCP-0D.9)', async () => {
    const { status, body } = await makeRequest(server, 'GET', '/api/workstreams');
    expect(status).toBe(500);
    const json = JSON.parse(body);
    expect(json).toHaveProperty('error');
    expect(json).toHaveProperty('status', 500);
  });

  it('Given getWorkstreamById throws, When GET /api/workstreams/WS-1, Then responds 500 with JSON error', async () => {
    const { status, body } = await makeRequest(server, 'GET', '/api/workstreams/WS-1');
    expect(status).toBe(500);
    const json = JSON.parse(body);
    expect(json).toHaveProperty('error');
    expect(json).toHaveProperty('status', 500);
  });

  it('Given getWorkstreamCounts throws, When GET /api/workstreams/counts, Then responds 500 with JSON error', async () => {
    const { status, body } = await makeRequest(server, 'GET', '/api/workstreams/counts');
    expect(status).toBe(500);
    const json = JSON.parse(body);
    expect(json).toHaveProperty('error');
    expect(json).toHaveProperty('status', 500);
  });

  it('Given getAllMemoryEntries throws, When GET /api/memory, Then responds 500 with JSON error', async () => {
    const { status, body } = await makeRequest(server, 'GET', '/api/memory');
    expect(status).toBe(500);
    const json = JSON.parse(body);
    expect(json).toHaveProperty('error');
    expect(json).toHaveProperty('status', 500);
  });

  it('Given getAgentEvents throws, When GET /api/events, Then responds 500 with JSON error', async () => {
    const { status, body } = await makeRequest(server, 'GET', '/api/events');
    expect(status).toBe(500);
    const json = JSON.parse(body);
    expect(json).toHaveProperty('error');
    expect(json).toHaveProperty('status', 500);
  });
});

// ===========================================================================
// BOUNDARY CASES
// ===========================================================================

// ---------------------------------------------------------------------------
// BOUNDARY: empty result sets (AC-MCP-0D.2, 0D.5, 0D.7)
// ---------------------------------------------------------------------------

describe('http-server BOUNDARY: empty result sets', () => {
  let server: http.Server;

  beforeAll(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([]);
    vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(null);
    vi.mocked(dataLayer.getWorkstreamCounts).mockResolvedValue({ total: 0, by_status: {}, by_phase: {} });
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([]);
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(null);
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { createHttpServer } = await loadHttpServer();
    server = await createHttpServer(0);
  });

  afterAll(() => {
    server?.close();
  });

  it('Given zero workstreams, When GET /api/workstreams, Then responds 200 with empty JSON array (AC-MCP-0D.2)', async () => {
    const { status, body } = await makeRequest(server, 'GET', '/api/workstreams');
    expect(status).toBe(200);
    const json = JSON.parse(body);
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(0);
  });

  it('Given zero counts, When GET /api/workstreams/counts, Then responds 200 with total=0 WorkstreamCounts (AC-MCP-0D.4)', async () => {
    const { status, body } = await makeRequest(server, 'GET', '/api/workstreams/counts');
    expect(status).toBe(200);
    const json = JSON.parse(body);
    expect(json).toHaveProperty('total', 0);
    expect(json).toHaveProperty('by_status');
    expect(json).toHaveProperty('by_phase');
  });

  it('Given zero memory entries, When GET /api/memory, Then responds 200 with empty JSON array (AC-MCP-0D.5)', async () => {
    const { status, body } = await makeRequest(server, 'GET', '/api/memory');
    expect(status).toBe(200);
    const json = JSON.parse(body);
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(0);
  });

  it('Given zero events, When GET /api/events, Then responds 200 with empty JSON array (AC-MCP-0D.7)', async () => {
    const { status, body } = await makeRequest(server, 'GET', '/api/events');
    expect(status).toBe(200);
    const json = JSON.parse(body);
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY: long workstream IDs and special characters in routes
// ---------------------------------------------------------------------------

describe('http-server BOUNDARY: edge ID and key values', () => {
  let server: http.Server;

  beforeAll(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([]);
    vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(null);
    vi.mocked(dataLayer.getWorkstreamCounts).mockResolvedValue(makeCounts());
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([]);
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(null);
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { createHttpServer } = await loadHttpServer();
    server = await createHttpServer(0);
  });

  afterAll(() => {
    server?.close();
  });

  it('Given a workstream ID that is exactly "counts", When GET /api/workstreams/counts, Then routes to counts handler not ID lookup (AC-MCP-0D.4)', async () => {
    const dataLayer = await loadDataLayer();
    const countsData = makeCounts({ total: 5 });
    vi.mocked(dataLayer.getWorkstreamCounts).mockResolvedValue(countsData);

    const { status, body } = await makeRequest(server, 'GET', '/api/workstreams/counts');
    expect(status).toBe(200);
    const json = JSON.parse(body);
    // Must be counts shape, not a 404 for an ID named "counts"
    expect(json).toHaveProperty('total');
    expect(json).toHaveProperty('by_status');
    expect(dataLayer.getWorkstreamCounts).toHaveBeenCalled();
    expect(dataLayer.getWorkstreamById).not.toHaveBeenCalledWith('counts', expect.anything());
  });

  it('Given a very long workstream ID (100 chars), When GET /api/workstreams/{id}, Then responds 404 JSON without crashing', async () => {
    const longId = 'WS-' + 'A'.repeat(97);
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(null);

    const { status, body } = await makeRequest(server, 'GET', `/api/workstreams/${longId}`);
    expect(status).toBe(404);
    expect(() => JSON.parse(body)).not.toThrow();
  });

  it('Given a memory key with 200 characters, When GET /api/memory/{key}, Then responds 404 JSON without crashing (AC-MCP-0D.6)', async () => {
    const longKey = 'tasks-' + 'a'.repeat(194);
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(null);

    const { status, body } = await makeRequest(server, 'GET', `/api/memory/${longKey}`);
    expect(status).toBe(404);
    expect(() => JSON.parse(body)).not.toThrow();
  });

  it('Given ?workstream_id= with empty string, When GET /api/events?workstream_id=, Then responds 200 not crash (AC-MCP-0D.7)', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { status, body } = await makeRequest(server, 'GET', '/api/events?workstream_id=');
    expect(status).toBe(200);
    const json = JSON.parse(body);
    expect(Array.isArray(json)).toBe(true);
  });

  it('Given unknown query params on /api/workstreams, When GET /api/workstreams?foo=bar, Then responds 200 and ignores unknown param (AC-MCP-0D.2)', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([makeSummary()]);

    const { status, body } = await makeRequest(server, 'GET', '/api/workstreams?foo=bar');
    expect(status).toBe(200);
    const json = JSON.parse(body);
    expect(Array.isArray(json)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY: localhost binding only (AC-MCP-0D.12)
// ---------------------------------------------------------------------------

describe('http-server BOUNDARY: localhost-only binding (AC-MCP-0D.12)', () => {
  it('Given createHttpServer is called, When server starts, Then server address is 127.0.0.1', async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([]);
    vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(null);
    vi.mocked(dataLayer.getWorkstreamCounts).mockResolvedValue(makeCounts());
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([]);
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(null);
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { createHttpServer } = await loadHttpServer();
    const srv = await createHttpServer(0);

    try {
      const addr = srv.address() as { address: string; port: number };
      expect(addr.address).toBe('127.0.0.1');
    } finally {
      srv.close();
    }
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY: Content-Type header is always application/json on API routes
// ---------------------------------------------------------------------------

describe('http-server BOUNDARY: Content-Type is application/json on all API responses', () => {
  let server: http.Server;

  beforeAll(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([makeSummary()]);
    vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(makeDetail());
    vi.mocked(dataLayer.getWorkstreamCounts).mockResolvedValue(makeCounts());
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([makeMemoryMeta()]);
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(makeMemoryEntry());
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([makeAgentEvent()]);

    const { createHttpServer } = await loadHttpServer();
    server = await createHttpServer(0);
  });

  afterAll(() => {
    server?.close();
  });

  it('Given GET /api/workstreams, When request sent, Then Content-Type is application/json', async () => {
    const { headers } = await makeRequest(server, 'GET', '/api/workstreams');
    expect(headers['content-type']).toMatch(/application\/json/);
  });

  it('Given GET /api/workstreams/WS-MCP-0D, When request sent, Then Content-Type is application/json', async () => {
    const { headers } = await makeRequest(server, 'GET', '/api/workstreams/WS-MCP-0D');
    expect(headers['content-type']).toMatch(/application\/json/);
  });

  it('Given GET /api/workstreams/counts, When request sent, Then Content-Type is application/json', async () => {
    const { headers } = await makeRequest(server, 'GET', '/api/workstreams/counts');
    expect(headers['content-type']).toMatch(/application\/json/);
  });

  it('Given GET /api/memory, When request sent, Then Content-Type is application/json', async () => {
    const { headers } = await makeRequest(server, 'GET', '/api/memory');
    expect(headers['content-type']).toMatch(/application\/json/);
  });

  it('Given GET /api/events, When request sent, Then Content-Type is application/json', async () => {
    const { headers } = await makeRequest(server, 'GET', '/api/events');
    expect(headers['content-type']).toMatch(/application\/json/);
  });
});

// ===========================================================================
// GOLDEN PATH
// ===========================================================================

// ---------------------------------------------------------------------------
// GOLDEN PATH: GET /api/workstreams (AC-MCP-0D.2)
// ---------------------------------------------------------------------------

describe('http-server GOLDEN PATH: GET /api/workstreams (AC-MCP-0D.2)', () => {
  let server: http.Server;

  beforeAll(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([
      makeSummary({ workstream_id: 'WS-MCP-0D', name: 'Dashboard Serving' }),
      makeSummary({ workstream_id: 'WS-MCP-0C', name: 'Binary Build', status: 'complete' }),
    ]);
    vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(null);
    vi.mocked(dataLayer.getWorkstreamCounts).mockResolvedValue(makeCounts());
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([]);
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(null);
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { createHttpServer } = await loadHttpServer();
    server = await createHttpServer(0);
  });

  afterAll(() => {
    server?.close();
  });

  it('Given two workstreams exist, When GET /api/workstreams, Then responds 200 with JSON array of 2 WorkstreamSummary objects (AC-MCP-0D.2)', async () => {
    const { status, body } = await makeRequest(server, 'GET', '/api/workstreams');
    expect(status).toBe(200);
    const json = JSON.parse(body);
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(2);
    expect(json[0]).toHaveProperty('workstream_id', 'WS-MCP-0D');
    expect(json[0]).toHaveProperty('name', 'Dashboard Serving');
    expect(json[0]).toHaveProperty('status');
    expect(json[0]).toHaveProperty('phase');
  });

  it('Given workstreams with all optional fields set, When GET /api/workstreams, Then all WorkstreamSummary fields are present in response', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([
      makeSummary({
        workstream_id: 'WS-FULL',
        delegated_to: 'engineering-manager',
        gate_status: 'ready_for_leadership',
        blocked_reason: null,
      }),
    ]);

    const { body } = await makeRequest(server, 'GET', '/api/workstreams');
    const json = JSON.parse(body);
    expect(json[0].workstream_id).toBe('WS-FULL');
    expect(json[0].delegated_to).toBe('engineering-manager');
    expect(json[0].gate_status).toBe('ready_for_leadership');
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH: GET /api/workstreams/:id (AC-MCP-0D.3)
// ---------------------------------------------------------------------------

describe('http-server GOLDEN PATH: GET /api/workstreams/:id (AC-MCP-0D.3)', () => {
  let server: http.Server;

  beforeAll(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([]);
    vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(
      makeDetail({ workstream_id: 'WS-MCP-0D' })
    );
    vi.mocked(dataLayer.getWorkstreamCounts).mockResolvedValue(makeCounts());
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([]);
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(null);
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { createHttpServer } = await loadHttpServer();
    server = await createHttpServer(0);
  });

  afterAll(() => {
    server?.close();
  });

  it('Given WS-MCP-0D exists, When GET /api/workstreams/WS-MCP-0D, Then responds 200 with WorkstreamDetail including description and acceptance_criteria (AC-MCP-0D.3)', async () => {
    const { status, body } = await makeRequest(server, 'GET', '/api/workstreams/WS-MCP-0D');
    expect(status).toBe(200);
    const json = JSON.parse(body);
    expect(json).toHaveProperty('workstream_id', 'WS-MCP-0D');
    expect(json).toHaveProperty('description');
    expect(Array.isArray(json.acceptance_criteria)).toBe(true);
    expect(Array.isArray(json.dependencies)).toBe(true);
  });

  it('Given workstream exists, When GET /api/workstreams/:id, Then getWorkstreamById is called with correct ID (AC-MCP-0D.10)', async () => {
    const dataLayer = await loadDataLayer();
    await makeRequest(server, 'GET', '/api/workstreams/WS-MCP-0D');
    expect(dataLayer.getWorkstreamById).toHaveBeenCalledWith('WS-MCP-0D', expect.anything());
  });

  it('Given an ID with hyphens and numbers (WS-DB-3), When GET /api/workstreams/WS-DB-3, Then full ID is extracted and passed to data layer', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(makeDetail({ workstream_id: 'WS-DB-3' }));

    await makeRequest(server, 'GET', '/api/workstreams/WS-DB-3');
    expect(dataLayer.getWorkstreamById).toHaveBeenCalledWith('WS-DB-3', expect.anything());
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH: GET /api/workstreams/counts (AC-MCP-0D.4)
// ---------------------------------------------------------------------------

describe('http-server GOLDEN PATH: GET /api/workstreams/counts (AC-MCP-0D.4)', () => {
  let server: http.Server;

  beforeAll(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([]);
    vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(null);
    vi.mocked(dataLayer.getWorkstreamCounts).mockResolvedValue(
      makeCounts({ total: 10, by_status: { in_progress: 4, complete: 6 } })
    );
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([]);
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(null);
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { createHttpServer } = await loadHttpServer();
    server = await createHttpServer(0);
  });

  afterAll(() => {
    server?.close();
  });

  it('Given counts with 10 total, When GET /api/workstreams/counts, Then responds 200 with WorkstreamCounts shape (AC-MCP-0D.4)', async () => {
    const { status, body } = await makeRequest(server, 'GET', '/api/workstreams/counts');
    expect(status).toBe(200);
    const json = JSON.parse(body);
    expect(json).toHaveProperty('total', 10);
    expect(json).toHaveProperty('by_status');
    expect(json).toHaveProperty('by_phase');
    expect(json.by_status.in_progress).toBe(4);
    expect(json.by_status.complete).toBe(6);
  });

  it('Given counts request, When GET /api/workstreams/counts, Then getWorkstreamCounts is called once (AC-MCP-0D.10)', async () => {
    const dataLayer = await loadDataLayer();
    await makeRequest(server, 'GET', '/api/workstreams/counts');
    expect(dataLayer.getWorkstreamCounts).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH: GET /api/memory (AC-MCP-0D.5)
// ---------------------------------------------------------------------------

describe('http-server GOLDEN PATH: GET /api/memory (AC-MCP-0D.5)', () => {
  let server: http.Server;

  beforeAll(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([]);
    vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(null);
    vi.mocked(dataLayer.getWorkstreamCounts).mockResolvedValue(makeCounts());
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([
      makeMemoryMeta({ key: 'tasks-qa', agent_id: 'qa' }),
      makeMemoryMeta({ key: 'tasks-dev', agent_id: 'dev' }),
    ]);
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(null);
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { createHttpServer } = await loadHttpServer();
    server = await createHttpServer(0);
  });

  afterAll(() => {
    server?.close();
  });

  it('Given two memory entries, When GET /api/memory, Then responds 200 with JSON array of 2 MemoryEntryMeta objects (AC-MCP-0D.5)', async () => {
    const { status, body } = await makeRequest(server, 'GET', '/api/memory');
    expect(status).toBe(200);
    const json = JSON.parse(body);
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(2);
    expect(json[0]).toHaveProperty('key');
    // Must NOT include data field — metadata only
    expect(json[0]).not.toHaveProperty('data');
  });

  it('Given memory entries exist, When GET /api/memory, Then response items include key, agent_id, workstream_id, timestamp fields (AC-MCP-0D.5)', async () => {
    const { body } = await makeRequest(server, 'GET', '/api/memory');
    const json = JSON.parse(body);
    expect(json[0]).toHaveProperty('key', 'tasks-qa');
    expect(json[0]).toHaveProperty('agent_id', 'qa');
    expect(json[0]).toHaveProperty('workstream_id', 'WS-MCP-0D');
    expect(json[0]).toHaveProperty('timestamp');
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH: GET /api/memory/:key (AC-MCP-0D.6)
// ---------------------------------------------------------------------------

describe('http-server GOLDEN PATH: GET /api/memory/:key (AC-MCP-0D.6)', () => {
  let server: http.Server;

  beforeAll(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([]);
    vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(null);
    vi.mocked(dataLayer.getWorkstreamCounts).mockResolvedValue(makeCounts());
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([]);
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(
      makeMemoryEntry({
        key: 'tasks-qa',
        data: { tasks: [{ id: 'T1', title: 'Write tests', status: 'done' }], version: 3 },
      })
    );
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { createHttpServer } = await loadHttpServer();
    server = await createHttpServer(0);
  });

  afterAll(() => {
    server?.close();
  });

  it('Given tasks-qa entry exists, When GET /api/memory/tasks-qa, Then responds 200 with full MemoryEntry including data field (AC-MCP-0D.6)', async () => {
    const { status, body } = await makeRequest(server, 'GET', '/api/memory/tasks-qa');
    expect(status).toBe(200);
    const json = JSON.parse(body);
    expect(json).toHaveProperty('key', 'tasks-qa');
    expect(json).toHaveProperty('data');
    expect(json.data).toHaveProperty('tasks');
    expect(Array.isArray(json.data.tasks)).toBe(true);
  });

  it('Given entry exists, When GET /api/memory/tasks-qa, Then getMemoryEntry is called with key "tasks-qa" (AC-MCP-0D.10)', async () => {
    const dataLayer = await loadDataLayer();
    await makeRequest(server, 'GET', '/api/memory/tasks-qa');
    expect(dataLayer.getMemoryEntry).toHaveBeenCalledWith('tasks-qa', expect.anything());
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH: GET /api/events (AC-MCP-0D.7)
// ---------------------------------------------------------------------------

describe('http-server GOLDEN PATH: GET /api/events (AC-MCP-0D.7)', () => {
  let server: http.Server;

  beforeAll(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([]);
    vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(null);
    vi.mocked(dataLayer.getWorkstreamCounts).mockResolvedValue(makeCounts());
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([]);
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(null);
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([
      makeAgentEvent({ event_id: 'evt-001', event_type: 'task_started' }),
      makeAgentEvent({ event_id: 'evt-002', event_type: 'gate_passed', agent_id: 'dev' }),
    ]);

    const { createHttpServer } = await loadHttpServer();
    server = await createHttpServer(0);
  });

  afterAll(() => {
    server?.close();
  });

  it('Given two events, When GET /api/events, Then responds 200 with JSON array of 2 AgentEvent objects (AC-MCP-0D.7)', async () => {
    const { status, body } = await makeRequest(server, 'GET', '/api/events');
    expect(status).toBe(200);
    const json = JSON.parse(body);
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(2);
    expect(json[0]).toHaveProperty('event_id', 'evt-001');
    expect(json[0]).toHaveProperty('agent_id');
    expect(json[0]).toHaveProperty('event_type', 'task_started');
    expect(json[0]).toHaveProperty('timestamp');
  });

  it('Given events exist, When GET /api/events?workstream_id=WS-MCP-0D, Then getAgentEvents is called with workstream_id filter (AC-MCP-0D.7)', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([makeAgentEvent()]);

    await makeRequest(server, 'GET', '/api/events?workstream_id=WS-MCP-0D');
    expect(dataLayer.getAgentEvents).toHaveBeenCalledWith(
      expect.objectContaining({ workstream_id: 'WS-MCP-0D' })
    );
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH: HTTP port default and env override (AC-MCP-0D.1)
// ---------------------------------------------------------------------------

describe('config GOLDEN PATH: getHttpPort default and MG_HTTP_PORT override (AC-MCP-0D.1)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Given MG_HTTP_PORT is not set, When getHttpPort is called, Then returns 7842 (AC-MCP-0D.1)', async () => {
    delete process.env.MG_HTTP_PORT;
    const { getHttpPort } = await import('../../src/config.js');
    expect(getHttpPort()).toBe(7842);
  });

  it('Given MG_HTTP_PORT=8080, When getHttpPort is called, Then returns 8080 (AC-MCP-0D.1)', async () => {
    vi.stubEnv('MG_HTTP_PORT', '8080');
    const { getHttpPort } = await import('../../src/config.js');
    expect(getHttpPort()).toBe(8080);
  });

  it('Given MG_STATIC_PATH=/tmp/dashboard, When getStaticPath is called, Then returns that path (AC-MCP-0D.8)', async () => {
    vi.stubEnv('MG_STATIC_PATH', '/tmp/dashboard');
    const { getStaticPath } = await import('../../src/config.js');
    expect(getStaticPath()).toBe('/tmp/dashboard');
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH: createHttpServer exports and shape (AC-MCP-0D.1, AC-MCP-0D.12)
// ---------------------------------------------------------------------------

describe('http-server GOLDEN PATH: createHttpServer returns a listening Server (AC-MCP-0D.1)', () => {
  it('Given createHttpServer is called with port 0, When awaited, Then returns a listening http.Server instance', async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([]);
    vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(null);
    vi.mocked(dataLayer.getWorkstreamCounts).mockResolvedValue(makeCounts());
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([]);
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(null);
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { createHttpServer } = await loadHttpServer();
    const srv = await createHttpServer(0);

    try {
      expect(srv).toBeInstanceOf(http.Server);
      expect(srv.listening).toBe(true);
    } finally {
      srv.close();
    }
  });
});
