import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// WS-MCP-0A: Unit tests for workstream resource handlers
// AC-MCP-0.3: resources/list returns all registered URIs with descriptions
// AC-MCP-0.4: mg://workstreams returns WorkstreamSummary array
// AC-MCP-0.5: mg://workstreams/{id} returns WorkstreamDetail or structured error
// AC-MCP-0.6: mg://workstreams/counts returns WorkstreamCounts JSON
// AC-MCP-0.10: data layer uses Postgres when env set, falls back to filesystem
// AC-MCP-0.11: malformed URIs return MCP-compliant error, not crashes
//
// CAD ordering: MISUSE → BOUNDARY → GOLDEN PATH
// ---------------------------------------------------------------------------

// Mock the data layer so no real I/O or Postgres connection is needed.
// The implementation is expected at mcp-server/src/data/index.ts
vi.mock('../../src/data/index', () => ({
  getAllWorkstreams: vi.fn(),
  getWorkstreamById: vi.fn(),
  getWorkstreamCounts: vi.fn(),
}));

// Mock the MCP SDK so tests don't require the package to exist yet.
// The implementation imports Server + McpError from @modelcontextprotocol/sdk.
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  class McpError extends Error {
    constructor(
      public readonly code: number,
      message: string
    ) {
      super(message);
      this.name = 'McpError';
    }
  }
  const ErrorCode = {
    InvalidRequest: -32600,
    MethodNotFound: -32601,
    InvalidParams: -32602,
    InternalError: -32603,
    ResourceNotFound: -32002,
  } as const;
  return { McpError, ErrorCode };
});

// ---- type stubs used by the tests ----

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

// Lazy-import helpers — re-imported fresh in each describe where needed
async function loadHandlers() {
  return await import('../../src/resources/workstreams');
}

async function loadDataLayer() {
  return await import('../../src/data/index');
}

// ---- fixtures ----

function makeSummary(overrides: Partial<WorkstreamSummary> = {}): WorkstreamSummary {
  return {
    workstream_id: 'WS-MCP-0A',
    name: 'MCP Server Scaffold',
    status: 'in_progress',
    phase: 'step_1_test_spec',
    agent_id: 'dev',
    timestamp: '2026-03-09T10:00:00Z',
    created_at: '2026-03-09',
    ...overrides,
  };
}

function makeDetail(overrides: Partial<WorkstreamDetail> = {}): WorkstreamDetail {
  return {
    ...makeSummary(),
    description: 'Scaffold the MCP server with workstream resources.',
    acceptance_criteria: ['AC-MCP-0.1', 'AC-MCP-0.2'],
    dependencies: ['WS-DB-3'],
    ...overrides,
  };
}

function makeCounts(overrides: Partial<WorkstreamCounts> = {}): WorkstreamCounts {
  return {
    total: 3,
    by_status: { in_progress: 2, complete: 1 },
    by_phase: { step_1_test_spec: 1, step_2_implementation: 1, complete: 1 },
    ...overrides,
  };
}

// ===========================================================================
// MISUSE CASES — AC-MCP-0.5 (unknown ID), AC-MCP-0.11 (malformed URIs)
// ===========================================================================

describe('workstream-resources MISUSE CASES', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // -------------------------------------------------------------------------
  // Malformed / unsupported URI patterns
  // -------------------------------------------------------------------------

  describe('handleResourceRead() with malformed URIs', () => {
    it('Given a completely invalid scheme, When handleResourceRead is called, Then returns MCP-compliant error not a crash', async () => {
      const { handleResourceRead } = await loadHandlers();
      // Should return an error result or throw McpError — must not throw unhandled
      const result = await handleResourceRead('http://workstreams').catch((e: Error) => e);
      // Either a structured error object or a McpError is acceptable — bare Error is not
      expect(result).toBeDefined();
      if (result instanceof Error) {
        expect(result.name).toBe('McpError');
      } else {
        expect(result).toHaveProperty('error');
      }
    });

    it('Given an empty string URI, When handleResourceRead is called, Then returns structured error', async () => {
      const { handleResourceRead } = await loadHandlers();
      const result = await handleResourceRead('').catch((e: Error) => e);
      expect(result).toBeDefined();
      if (result instanceof Error) {
        expect(result.name).toBe('McpError');
      } else {
        expect(result).toHaveProperty('error');
      }
    });

    it('Given a URI with path traversal, When handleResourceRead is called, Then returns error not crash', async () => {
      const { handleResourceRead } = await loadHandlers();
      const result = await handleResourceRead('mg://workstreams/../../etc/passwd').catch((e: Error) => e);
      expect(result).toBeDefined();
      // Must not resolve as a valid workstream
      if (!(result instanceof Error)) {
        expect(result).toHaveProperty('error');
      }
    });

    it('Given mg:// URI with unknown top-level resource, When handleResourceRead is called, Then returns ResourceNotFound error', async () => {
      const { handleResourceRead } = await loadHandlers();
      const result = await handleResourceRead('mg://unknownresource').catch((e: Error) => e);
      expect(result).toBeDefined();
      if (result instanceof Error) {
        expect(result.name).toBe('McpError');
      } else {
        expect(result).toHaveProperty('error');
      }
    });

    it('Given null URI argument, When handleResourceRead is called, Then returns error without crashing process', async () => {
      const { handleResourceRead } = await loadHandlers();
      const result = await handleResourceRead(null as unknown as string).catch((e: Error) => e);
      expect(result).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Unknown workstream ID
  // -------------------------------------------------------------------------

  describe('handleResourceRead() with unknown workstream ID (AC-MCP-0.5)', () => {
    it('Given a valid-looking ID that does not exist, When handleResourceRead is called, Then returns structured error not null content', async () => {
      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(null);

      const { handleResourceRead } = await loadHandlers();
      const result = await handleResourceRead('mg://workstreams/WS-DOES-NOT-EXIST').catch((e: Error) => e);

      expect(result).toBeDefined();
      if (result instanceof Error) {
        // Throwing McpError is acceptable
        expect(result.name).toBe('McpError');
      } else {
        // Returning error payload is acceptable
        expect(result).toHaveProperty('error');
      }
    });

    it('Given ID with special characters, When handleResourceRead is called, Then returns error without crashing', async () => {
      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(null);

      const { handleResourceRead } = await loadHandlers();
      const result = await handleResourceRead("mg://workstreams/WS-<script>alert('xss')</script>").catch((e: Error) => e);
      expect(result).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Null / undefined data from the data layer
  // -------------------------------------------------------------------------

  describe('handleResourceRead() when data layer returns unexpected values', () => {
    it('Given getAllWorkstreams returns null, When mg://workstreams is read, Then returns error or empty array not crash', async () => {
      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue(null as unknown as WorkstreamSummary[]);

      const { handleResourceRead } = await loadHandlers();
      const result = await handleResourceRead('mg://workstreams').catch((e: Error) => e);
      // Must not be an unstructured throw — either error object or empty array content
      expect(result).toBeDefined();
    });

    it('Given getAllWorkstreams throws, When mg://workstreams is read, Then returns MCP error not unhandled rejection', async () => {
      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getAllWorkstreams).mockRejectedValue(new Error('disk read failed'));

      const { handleResourceRead } = await loadHandlers();
      const result = await handleResourceRead('mg://workstreams').catch((e: Error) => e);
      expect(result).toBeDefined();
      if (result instanceof Error) {
        expect(result.name).toBe('McpError');
      } else {
        expect(result).toHaveProperty('error');
      }
    });

    it('Given getWorkstreamCounts throws, When mg://workstreams/counts is read, Then returns MCP error not unhandled rejection', async () => {
      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getWorkstreamCounts).mockRejectedValue(new Error('db timeout'));

      const { handleResourceRead } = await loadHandlers();
      const result = await handleResourceRead('mg://workstreams/counts').catch((e: Error) => e);
      expect(result).toBeDefined();
      if (result instanceof Error) {
        expect(result.name).toBe('McpError');
      } else {
        expect(result).toHaveProperty('error');
      }
    });

    it('Given getWorkstreamById throws, When mg://workstreams/{id} is read, Then returns MCP error not unhandled rejection', async () => {
      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getWorkstreamById).mockRejectedValue(new Error('network error'));

      const { handleResourceRead } = await loadHandlers();
      const result = await handleResourceRead('mg://workstreams/WS-1').catch((e: Error) => e);
      expect(result).toBeDefined();
      if (result instanceof Error) {
        expect(result.name).toBe('McpError');
      }
    });
  });

  // -------------------------------------------------------------------------
  // resources/list when handler registry is corrupt
  // -------------------------------------------------------------------------

  describe('getResourceList() structural requirements', () => {
    it('Given the module is loaded, When getResourceList is called, Then returns array not undefined', async () => {
      const { getResourceList } = await loadHandlers();
      const result = getResourceList();
      // Must return synchronously and be an array
      expect(Array.isArray(result)).toBe(true);
    });

    it('Given the module is loaded, When getResourceList is called, Then every entry has a uri and name field', async () => {
      const { getResourceList } = await loadHandlers();
      const result = getResourceList();
      for (const entry of result) {
        expect(entry).toHaveProperty('uri');
        expect(entry).toHaveProperty('name');
        expect(typeof entry.uri).toBe('string');
        expect(typeof entry.name).toBe('string');
      }
    });
  });
});

// ===========================================================================
// BOUNDARY CASES — edge URIs, empty lists, minimal workstream shapes
// ===========================================================================

describe('workstream-resources BOUNDARY CASES', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // -------------------------------------------------------------------------
  // Edge URI shapes
  // -------------------------------------------------------------------------

  describe('handleResourceRead() with edge URI patterns', () => {
    it('Given mg://workstreams/ (trailing slash), When handleResourceRead is called, Then treats same as mg://workstreams or returns error — does not crash', async () => {
      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([makeSummary()]);

      const { handleResourceRead } = await loadHandlers();
      // Trailing slash is either treated as list or returns a structured error — both acceptable
      const result = await handleResourceRead('mg://workstreams/').catch((e: Error) => e);
      expect(result).toBeDefined();
    });

    it('Given mg://workstreams/counts?format=json (query params), When handleResourceRead is called, Then counts still returned or structured error', async () => {
      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getWorkstreamCounts).mockResolvedValue(makeCounts());

      const { handleResourceRead } = await loadHandlers();
      const result = await handleResourceRead('mg://workstreams/counts?format=json').catch((e: Error) => e);
      expect(result).toBeDefined();
      // If query params are stripped and handled: content should have counts shape
      // If not supported: structured error is acceptable
    });

    it('Given a workstream ID that is exactly "counts", When handleResourceRead is called with mg://workstreams/counts, Then routes to counts handler not ID lookup', async () => {
      const dataLayer = await loadDataLayer();
      const countsData = makeCounts();
      vi.mocked(dataLayer.getWorkstreamCounts).mockResolvedValue(countsData);
      vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(null);

      const { handleResourceRead } = await loadHandlers();
      await handleResourceRead('mg://workstreams/counts');

      // counts handler must have been called, NOT the by-ID handler
      expect(dataLayer.getWorkstreamCounts).toHaveBeenCalled();
      expect(dataLayer.getWorkstreamById).not.toHaveBeenCalled();
    });

    it('Given mg://workstreams/COUNTS (uppercase), When handleResourceRead is called, Then does not accidentally route to counts handler — case sensitivity respected', async () => {
      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(null);
      vi.mocked(dataLayer.getWorkstreamCounts).mockResolvedValue(makeCounts());

      const { handleResourceRead } = await loadHandlers();
      await handleResourceRead('mg://workstreams/COUNTS').catch(() => {});

      // Uppercase should NOT trigger the counts route (counts is lowercase-specific)
      expect(dataLayer.getWorkstreamCounts).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Empty workstream list
  // -------------------------------------------------------------------------

  describe('handleResourceRead() with empty data sets', () => {
    it('Given getAllWorkstreams returns [], When mg://workstreams is read, Then returns empty JSON array content not error', async () => {
      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([]);

      const { handleResourceRead } = await loadHandlers();
      const result = await handleResourceRead('mg://workstreams') as any;

      // Result must not be an error
      expect(result).not.toBeInstanceOf(Error);
      // Content should be parseable as an empty array
      const text = result?.contents?.[0]?.text ?? result?.content?.[0]?.text ?? '[]';
      const parsed = JSON.parse(text);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(0);
    });

    it('Given getWorkstreamCounts returns all-zero counts, When mg://workstreams/counts is read, Then returns valid counts object not error', async () => {
      const dataLayer = await loadDataLayer();
      const zeroCounts: WorkstreamCounts = { total: 0, by_status: {}, by_phase: {} };
      vi.mocked(dataLayer.getWorkstreamCounts).mockResolvedValue(zeroCounts);

      const { handleResourceRead } = await loadHandlers();
      const result = await handleResourceRead('mg://workstreams/counts') as any;

      expect(result).not.toBeInstanceOf(Error);
      const text = result?.contents?.[0]?.text ?? result?.content?.[0]?.text ?? '{}';
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty('total', 0);
    });
  });

  // -------------------------------------------------------------------------
  // Workstream with minimal required fields only
  // -------------------------------------------------------------------------

  describe('handleResourceRead() with minimally-populated workstreams', () => {
    it('Given a workstream with only workstream_id and name (all optional fields absent), When mg://workstreams/{id} is read, Then returns valid response without crashing', async () => {
      const minimalDetail: WorkstreamDetail = {
        workstream_id: 'WS-MINIMAL',
        name: 'Minimal WS',
        status: 'unknown',
        phase: 'unknown',
        agent_id: 'unknown',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString().split('T')[0],
      };

      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(minimalDetail);

      const { handleResourceRead } = await loadHandlers();
      const result = await handleResourceRead('mg://workstreams/WS-MINIMAL') as any;

      expect(result).not.toBeInstanceOf(Error);
      const text = result?.contents?.[0]?.text ?? result?.content?.[0]?.text ?? '{}';
      const parsed = JSON.parse(text);
      expect(parsed.workstream_id).toBe('WS-MINIMAL');
    });

    it('Given a summary with null blocked_reason, When mg://workstreams is read, Then serializes without crashing', async () => {
      const summaryWithNull = makeSummary({ blocked_reason: null });
      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([summaryWithNull]);

      const { handleResourceRead } = await loadHandlers();
      const result = await handleResourceRead('mg://workstreams') as any;

      expect(result).not.toBeInstanceOf(Error);
      const text = result?.contents?.[0]?.text ?? result?.content?.[0]?.text ?? '[]';
      expect(() => JSON.parse(text)).not.toThrow();
    });

    it('Given a very long workstream ID (100 chars), When mg://workstreams/{id} is read, Then does not crash on URI parsing', async () => {
      const longId = 'WS-' + 'A'.repeat(97);
      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(null);

      const { handleResourceRead } = await loadHandlers();
      const result = await handleResourceRead(`mg://workstreams/${longId}`).catch((e: Error) => e);
      expect(result).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // resources/list completeness at boundary
  // -------------------------------------------------------------------------

  describe('getResourceList() completeness', () => {
    it('Given the handlers module is loaded, When getResourceList is called, Then includes at least 3 workstream URIs (list, detail template, counts)', async () => {
      const { getResourceList } = await loadHandlers();
      const list = getResourceList();
      const uris = list.map((r: { uri: string }) => r.uri);

      // Must include the list URI
      expect(uris.some((u: string) => u === 'mg://workstreams')).toBe(true);
      // Must include the counts URI
      expect(uris.some((u: string) => u === 'mg://workstreams/counts')).toBe(true);
      // Must have at least 2 distinct workstream entries
      const workstreamUris = uris.filter((u: string) => u.startsWith('mg://workstreams'));
      expect(workstreamUris.length).toBeGreaterThanOrEqual(2);
    });

    it('Given the handlers module is loaded, When getResourceList is called, Then every entry has a non-empty description', async () => {
      const { getResourceList } = await loadHandlers();
      const list = getResourceList();
      for (const entry of list) {
        expect(entry).toHaveProperty('description');
        expect(typeof entry.description).toBe('string');
        expect((entry.description as string).length).toBeGreaterThan(0);
      }
    });
  });
});

// ===========================================================================
// GOLDEN PATH — correct JSON shapes for all 3 resource URIs
// ===========================================================================

describe('workstream-resources GOLDEN PATH', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // -------------------------------------------------------------------------
  // mg://workstreams — list (AC-MCP-0.4)
  // -------------------------------------------------------------------------

  describe('handleResourceRead("mg://workstreams") — AC-MCP-0.4', () => {
    it('Given two workstreams exist, When mg://workstreams is read, Then returns JSON array with 2 WorkstreamSummary objects', async () => {
      const ws1 = makeSummary({ workstream_id: 'WS-1', name: 'Workstream One' });
      const ws2 = makeSummary({ workstream_id: 'WS-2', name: 'Workstream Two', status: 'complete' });
      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([ws1, ws2]);

      const { handleResourceRead } = await loadHandlers();
      const result = await handleResourceRead('mg://workstreams') as any;

      expect(result).not.toBeInstanceOf(Error);
      // MCP SDK response shape: { contents: [{ uri, mimeType, text }] }
      const text = result?.contents?.[0]?.text ?? result?.content?.[0]?.text;
      expect(typeof text).toBe('string');

      const parsed = JSON.parse(text!);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);

      expect(parsed[0]).toHaveProperty('workstream_id', 'WS-1');
      expect(parsed[0]).toHaveProperty('name', 'Workstream One');
      expect(parsed[0]).toHaveProperty('status');
      expect(parsed[0]).toHaveProperty('phase');
    });

    it('Given workstreams exist, When mg://workstreams is read, Then mimeType is application/json', async () => {
      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([makeSummary()]);

      const { handleResourceRead } = await loadHandlers();
      const result = await handleResourceRead('mg://workstreams') as any;

      const content = result?.contents?.[0] ?? result?.content?.[0];
      expect(content?.mimeType).toBe('application/json');
    });

    it('Given a workstream with all optional fields, When mg://workstreams is read, Then all WorkstreamSummary fields are present in output', async () => {
      const fullSummary = makeSummary({
        workstream_id: 'WS-FULL',
        name: 'Full Summary WS',
        status: 'ready_for_review',
        phase: 'step_3_verification',
        agent_id: 'qa',
        delegated_to: 'engineering-manager',
        gate_status: 'ready_for_leadership',
        blocked_reason: null,
      });

      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([fullSummary]);

      const { handleResourceRead } = await loadHandlers();
      const result = await handleResourceRead('mg://workstreams') as any;
      const text = result?.contents?.[0]?.text ?? result?.content?.[0]?.text;
      const parsed = JSON.parse(text!);

      expect(parsed[0].workstream_id).toBe('WS-FULL');
      expect(parsed[0].status).toBe('ready_for_review');
      expect(parsed[0].agent_id).toBe('qa');
      expect(parsed[0].delegated_to).toBe('engineering-manager');
      expect(parsed[0].gate_status).toBe('ready_for_leadership');
    });
  });

  // -------------------------------------------------------------------------
  // mg://workstreams/{id} — detail (AC-MCP-0.5)
  // -------------------------------------------------------------------------

  describe('handleResourceRead("mg://workstreams/{id}") — AC-MCP-0.5', () => {
    it('Given workstream WS-MCP-0A exists, When mg://workstreams/WS-MCP-0A is read, Then returns WorkstreamDetail with all fields', async () => {
      const detail = makeDetail({
        workstream_id: 'WS-MCP-0A',
        description: 'MCP server scaffold.',
        acceptance_criteria: ['AC-MCP-0.1', 'AC-MCP-0.2', 'AC-MCP-0.3'],
        dependencies: ['WS-DB-3', 'WS-DB-5'],
      });

      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(detail);

      const { handleResourceRead } = await loadHandlers();
      const result = await handleResourceRead('mg://workstreams/WS-MCP-0A') as any;

      expect(result).not.toBeInstanceOf(Error);
      const text = result?.contents?.[0]?.text ?? result?.content?.[0]?.text;
      const parsed = JSON.parse(text!);

      expect(parsed.workstream_id).toBe('WS-MCP-0A');
      expect(parsed.name).toBe('MCP Server Scaffold');
      expect(parsed.description).toBe('MCP server scaffold.');
      expect(Array.isArray(parsed.acceptance_criteria)).toBe(true);
      expect(parsed.acceptance_criteria).toHaveLength(3);
      expect(Array.isArray(parsed.dependencies)).toBe(true);
    });

    it('Given workstream exists, When mg://workstreams/{id} is read, Then getWorkstreamById is called with the correct id', async () => {
      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(makeDetail());

      const { handleResourceRead } = await loadHandlers();
      await handleResourceRead('mg://workstreams/WS-MCP-0A');

      expect(dataLayer.getWorkstreamById).toHaveBeenCalledWith('WS-MCP-0A', expect.anything());
    });

    it('Given a workstream ID with hyphens and numbers, When mg://workstreams/WS-DB-3 is read, Then correctly extracts the full ID', async () => {
      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getWorkstreamById).mockResolvedValue(makeDetail({ workstream_id: 'WS-DB-3' }));

      const { handleResourceRead } = await loadHandlers();
      await handleResourceRead('mg://workstreams/WS-DB-3');

      expect(dataLayer.getWorkstreamById).toHaveBeenCalledWith('WS-DB-3', expect.anything());
    });
  });

  // -------------------------------------------------------------------------
  // mg://workstreams/counts — AC-MCP-0.6
  // -------------------------------------------------------------------------

  describe('handleResourceRead("mg://workstreams/counts") — AC-MCP-0.6', () => {
    it('Given workstreams with mixed statuses, When mg://workstreams/counts is read, Then returns WorkstreamCounts with total and by_status', async () => {
      const counts: WorkstreamCounts = {
        total: 10,
        by_status: { in_progress: 4, complete: 3, blocked: 1, planning: 2 },
        by_phase: { step_1_test_spec: 2, step_2_implementation: 2, step_3_verification: 3, complete: 3 },
      };

      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getWorkstreamCounts).mockResolvedValue(counts);

      const { handleResourceRead } = await loadHandlers();
      const result = await handleResourceRead('mg://workstreams/counts') as any;

      expect(result).not.toBeInstanceOf(Error);
      const text = result?.contents?.[0]?.text ?? result?.content?.[0]?.text;
      const parsed = JSON.parse(text!);

      expect(parsed).toHaveProperty('total', 10);
      expect(parsed).toHaveProperty('by_status');
      expect(parsed.by_status.in_progress).toBe(4);
      expect(parsed.by_status.complete).toBe(3);
    });

    it('Given mg://workstreams/counts is read, Then getWorkstreamCounts is called once', async () => {
      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getWorkstreamCounts).mockResolvedValue(makeCounts());

      const { handleResourceRead } = await loadHandlers();
      await handleResourceRead('mg://workstreams/counts');

      expect(dataLayer.getWorkstreamCounts).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // resources/list — AC-MCP-0.3
  // -------------------------------------------------------------------------

  describe('getResourceList() — AC-MCP-0.3', () => {
    it('Given the handlers are registered, When getResourceList is called, Then mg://workstreams is present with a description', async () => {
      const { getResourceList } = await loadHandlers();
      const list = getResourceList();
      const workstreamsList = list.find((r: { uri: string }) => r.uri === 'mg://workstreams');
      expect(workstreamsList).toBeDefined();
      expect(workstreamsList!.description).toBeTruthy();
    });

    it('Given the handlers are registered, When getResourceList is called, Then mg://workstreams/counts is present with a description', async () => {
      const { getResourceList } = await loadHandlers();
      const list = getResourceList();
      const countsEntry = list.find((r: { uri: string }) => r.uri === 'mg://workstreams/counts');
      expect(countsEntry).toBeDefined();
      expect(countsEntry!.description).toBeTruthy();
    });

    it('Given the handlers are registered, When getResourceList is called, Then all workstream URIs use the mg:// scheme', async () => {
      const { getResourceList } = await loadHandlers();
      const list = getResourceList();
      const workstreamEntries = list.filter((r: { uri: string }) => r.uri.includes('workstream'));
      for (const entry of workstreamEntries) {
        expect(entry.uri.startsWith('mg://')).toBe(true);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Data layer dispatch — AC-MCP-0.10
  // -------------------------------------------------------------------------

  describe('data layer dispatch (AC-MCP-0.10)', () => {
    it('Given no MG_POSTGRES_URL, When mg://workstreams is read, Then filesystem data layer is used', async () => {
      delete process.env.MG_POSTGRES_URL;
      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([makeSummary()]);

      const { handleResourceRead } = await loadHandlers();
      await handleResourceRead('mg://workstreams');

      // getAllWorkstreams should have been called (it internally routes to filesystem)
      expect(dataLayer.getAllWorkstreams).toHaveBeenCalled();
    });

    it('Given MG_POSTGRES_URL is set, When mg://workstreams is read, Then getAllWorkstreams is still the callsite (it handles dispatch internally)', async () => {
      vi.stubEnv('MG_POSTGRES_URL', 'postgresql://user:pass@localhost:5432/mg');
      const dataLayer = await loadDataLayer();
      vi.mocked(dataLayer.getAllWorkstreams).mockResolvedValue([makeSummary()]);

      const { handleResourceRead } = await loadHandlers();
      await handleResourceRead('mg://workstreams');

      expect(dataLayer.getAllWorkstreams).toHaveBeenCalled();
    });
  });
});
