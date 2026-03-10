import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// WS-MCP-0B: Unit tests for memory and event resource handlers
// AC-MCP-0.7: mg://memory returns JSON array of memory entry keys with metadata
// AC-MCP-0.8: mg://memory/{key} returns full data JSONB or structured error
// AC-MCP-0.9: mg://events returns recent agent events (default limit 50),
//             supports ?workstream_id= filter
//
// CAD ordering: MISUSE → BOUNDARY → GOLDEN PATH
// ---------------------------------------------------------------------------

// Mock the data layer — implementation expected at mcp-server/src/data/index.ts.
// New functions: getAllMemoryEntries, getMemoryEntry, getAgentEvents
vi.mock('../../src/data/index', () => ({
  getAllWorkstreams: vi.fn(),
  getWorkstreamById: vi.fn(),
  getWorkstreamCounts: vi.fn(),
  getAllMemoryEntries: vi.fn(),
  getMemoryEntry: vi.fn(),
  getAgentEvents: vi.fn(),
}));

// Mock the MCP SDK types module — matches the import path used by resource handlers
vi.mock('@modelcontextprotocol/sdk/types.js', () => {
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
  } as const;
  return { McpError, ErrorCode };
});

// ---- type stubs ----

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

// Lazy-import helpers — re-imported fresh in each describe block
async function loadMemoryHandlers() {
  return await import('../../src/resources/memory');
}

async function loadEventHandlers() {
  return await import('../../src/resources/events');
}

async function loadDataLayer() {
  return await import('../../src/data/index');
}

// ---- fixtures ----

function makeMemoryMeta(overrides: Partial<MemoryEntryMeta> = {}): MemoryEntryMeta {
  return {
    key: 'tasks-qa',
    agent_id: 'qa',
    workstream_id: 'WS-MCP-0B',
    timestamp: '2026-03-09T10:00:00Z',
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
    workstream_id: 'WS-MCP-0B',
    event_type: 'task_started',
    payload: { detail: 'writing tests' },
    timestamp: '2026-03-09T10:00:00Z',
    ...overrides,
  };
}

// ===========================================================================
// MISUSE CASES
// ===========================================================================

// ---------------------------------------------------------------------------
// MISUSE: memory resource handler — invalid and malformed URIs
// ---------------------------------------------------------------------------

describe('memory-resources MISUSE: invalid URI schemes and paths', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Given an http:// URI, When handleMemoryRead is called, Then returns McpError not a crash', async () => {
    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead('http://memory').catch((e: Error) => e);
    expect(result).toBeDefined();
    if (result instanceof Error) {
      expect(result.name).toBe('McpError');
    } else {
      expect(result).toHaveProperty('error');
    }
  });

  it('Given an empty string URI, When handleMemoryRead is called, Then returns structured error not unhandled rejection', async () => {
    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead('').catch((e: Error) => e);
    expect(result).toBeDefined();
    if (result instanceof Error) {
      expect(result.name).toBe('McpError');
    } else {
      expect(result).toHaveProperty('error');
    }
  });

  it('Given null as URI argument, When handleMemoryRead is called, Then does not crash process', async () => {
    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead(null as unknown as string).catch((e: Error) => e);
    expect(result).toBeDefined();
  });

  it('Given a URI with path traversal (../../etc/passwd), When handleMemoryRead is called, Then returns error not file read', async () => {
    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead('mg://memory/../../etc/passwd').catch((e: Error) => e);
    expect(result).toBeDefined();
    if (result instanceof Error) {
      expect(result.name).toBe('McpError');
    } else {
      expect(result).toHaveProperty('error');
    }
  });

  it('Given a URI with null bytes in the key, When handleMemoryRead is called, Then returns error not crash', async () => {
    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead('mg://memory/tasks\x00qa').catch((e: Error) => e);
    expect(result).toBeDefined();
  });

  it('Given a URI targeting wrong resource type (mg://workstreams), When handleMemoryRead is called, Then returns error for unrecognized resource', async () => {
    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead('mg://workstreams').catch((e: Error) => e);
    expect(result).toBeDefined();
    if (result instanceof Error) {
      expect(result.name).toBe('McpError');
    } else {
      expect(result).toHaveProperty('error');
    }
  });
});

// ---------------------------------------------------------------------------
// MISUSE: not-found cases — unknown memory key returns structured error
// ---------------------------------------------------------------------------

describe('memory-resources MISUSE: not-found memory entry (AC-MCP-0.8)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Given a valid-looking key that does not exist, When mg://memory/{key} is read, Then returns structured error not null content', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(null);

    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead('mg://memory/does-not-exist').catch((e: Error) => e);

    expect(result).toBeDefined();
    if (result instanceof Error) {
      expect(result.name).toBe('McpError');
    } else {
      expect(result).toHaveProperty('error');
    }
  });

  it('Given an unknown key with special characters (<>&), When mg://memory/{key} is read, Then returns error without crashing', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(null);

    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead("mg://memory/<script>alert('xss')</script>").catch((e: Error) => e);
    expect(result).toBeDefined();
  });

  it('Given getMemoryEntry throws, When mg://memory/{key} is read, Then returns McpError not unhandled rejection', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getMemoryEntry).mockRejectedValue(new Error('disk read failed'));

    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead('mg://memory/tasks-qa').catch((e: Error) => e);

    expect(result).toBeDefined();
    if (result instanceof Error) {
      expect(result.name).toBe('McpError');
    } else {
      expect(result).toHaveProperty('error');
    }
  });

  it('Given getAllMemoryEntries throws, When mg://memory is read, Then returns McpError not unhandled rejection', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllMemoryEntries).mockRejectedValue(new Error('filesystem unavailable'));

    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead('mg://memory').catch((e: Error) => e);

    expect(result).toBeDefined();
    if (result instanceof Error) {
      expect(result.name).toBe('McpError');
    } else {
      expect(result).toHaveProperty('error');
    }
  });

  it('Given getAllMemoryEntries returns null, When mg://memory is read, Then returns error or empty array — does not crash', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue(null as unknown as MemoryEntryMeta[]);

    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead('mg://memory').catch((e: Error) => e);
    expect(result).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// MISUSE: event resource handler — invalid inputs
// ---------------------------------------------------------------------------

describe('events-resources MISUSE: invalid URI schemes and inputs', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Given an http:// URI, When handleEventsRead is called, Then returns McpError not a crash', async () => {
    const { handleEventsRead } = await loadEventHandlers();
    const result = await handleEventsRead('http://events').catch((e: Error) => e);
    expect(result).toBeDefined();
    if (result instanceof Error) {
      expect(result.name).toBe('McpError');
    } else {
      expect(result).toHaveProperty('error');
    }
  });

  it('Given an empty string URI, When handleEventsRead is called, Then returns structured error not unhandled rejection', async () => {
    const { handleEventsRead } = await loadEventHandlers();
    const result = await handleEventsRead('').catch((e: Error) => e);
    expect(result).toBeDefined();
    if (result instanceof Error) {
      expect(result.name).toBe('McpError');
    } else {
      expect(result).toHaveProperty('error');
    }
  });

  it('Given null as URI argument, When handleEventsRead is called, Then does not crash process', async () => {
    const { handleEventsRead } = await loadEventHandlers();
    const result = await handleEventsRead(null as unknown as string).catch((e: Error) => e);
    expect(result).toBeDefined();
  });

  it('Given a URI targeting wrong resource type (mg://memory), When handleEventsRead is called, Then returns error for unrecognized resource', async () => {
    const { handleEventsRead } = await loadEventHandlers();
    const result = await handleEventsRead('mg://memory').catch((e: Error) => e);
    expect(result).toBeDefined();
    if (result instanceof Error) {
      expect(result.name).toBe('McpError');
    } else {
      expect(result).toHaveProperty('error');
    }
  });

  it('Given getAgentEvents throws, When mg://events is read, Then returns McpError not unhandled rejection', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAgentEvents).mockRejectedValue(new Error('db connection refused'));

    const { handleEventsRead } = await loadEventHandlers();
    const result = await handleEventsRead('mg://events').catch((e: Error) => e);

    expect(result).toBeDefined();
    if (result instanceof Error) {
      expect(result.name).toBe('McpError');
    } else {
      expect(result).toHaveProperty('error');
    }
  });

  it('Given getAgentEvents returns null, When mg://events is read, Then returns error or empty array — does not crash', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue(null as unknown as AgentEvent[]);

    const { handleEventsRead } = await loadEventHandlers();
    const result = await handleEventsRead('mg://events').catch((e: Error) => e);
    expect(result).toBeDefined();
  });
});

// ===========================================================================
// BOUNDARY CASES
// ===========================================================================

// ---------------------------------------------------------------------------
// BOUNDARY: empty results — no memory entries, no events
// ---------------------------------------------------------------------------

describe('memory-resources BOUNDARY: empty data sets', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Given getAllMemoryEntries returns [], When mg://memory is read, Then returns empty JSON array not error', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([]);

    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead('mg://memory') as any;

    expect(result).not.toBeInstanceOf(Error);
    const text = result?.contents?.[0]?.text ?? result?.content?.[0]?.text ?? '[]';
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(0);
  });

  it('Given an empty memory directory, When mg://memory is read, Then mimeType is application/json', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([]);

    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead('mg://memory') as any;

    const content = result?.contents?.[0] ?? result?.content?.[0];
    expect(content?.mimeType).toBe('application/json');
  });
});

describe('events-resources BOUNDARY: empty data sets', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Given getAgentEvents returns [], When mg://events is read, Then returns empty JSON array not error', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { handleEventsRead } = await loadEventHandlers();
    const result = await handleEventsRead('mg://events') as any;

    expect(result).not.toBeInstanceOf(Error);
    const text = result?.contents?.[0]?.text ?? result?.content?.[0]?.text ?? '[]';
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(0);
  });

  it('Given filesystem-only mode (no Postgres), When mg://events is read, Then returns empty array not error (events are Postgres-only)', async () => {
    delete process.env.MG_POSTGRES_URL;
    const dataLayer = await loadDataLayer();
    // Filesystem fallback for events returns empty array
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { handleEventsRead } = await loadEventHandlers();
    const result = await handleEventsRead('mg://events') as any;

    expect(result).not.toBeInstanceOf(Error);
    const text = result?.contents?.[0]?.text ?? result?.content?.[0]?.text ?? '[]';
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY: limit query parameter edge cases (AC-MCP-0.9)
// ---------------------------------------------------------------------------

describe('events-resources BOUNDARY: limit parameter edge cases (AC-MCP-0.9)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Given limit=0 in query params, When mg://events?limit=0 is read, Then does not crash (returns empty array or error)', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { handleEventsRead } = await loadEventHandlers();
    const result = await handleEventsRead('mg://events?limit=0').catch((e: Error) => e);
    expect(result).toBeDefined();
  });

  it('Given limit=-1 in query params, When mg://events?limit=-1 is read, Then returns error or falls back to default limit — does not crash', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { handleEventsRead } = await loadEventHandlers();
    const result = await handleEventsRead('mg://events?limit=-1').catch((e: Error) => e);
    expect(result).toBeDefined();
    // If handler rejects negative limit: McpError is acceptable
    // If handler treats negative as default: result with empty array is acceptable
  });

  it('Given limit=999999 in query params, When mg://events?limit=999999 is read, Then calls getAgentEvents with capped or exact limit — does not crash', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { handleEventsRead } = await loadEventHandlers();
    const result = await handleEventsRead('mg://events?limit=999999').catch((e: Error) => e);
    expect(result).toBeDefined();
    // getAgentEvents must have been called (limit is passed through or capped)
    if (!(result instanceof Error)) {
      expect(dataLayer.getAgentEvents).toHaveBeenCalled();
    }
  });

  it('Given limit=abc (non-numeric) in query params, When mg://events?limit=abc is read, Then returns error or falls back to default 50 — does not crash', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { handleEventsRead } = await loadEventHandlers();
    const result = await handleEventsRead('mg://events?limit=abc').catch((e: Error) => e);
    expect(result).toBeDefined();
  });

  it('Given limit=1.5 (float) in query params, When mg://events?limit=1.5 is read, Then does not crash (truncates or rejects)', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([makeAgentEvent()]);

    const { handleEventsRead } = await loadEventHandlers();
    const result = await handleEventsRead('mg://events?limit=1.5').catch((e: Error) => e);
    expect(result).toBeDefined();
  });

  it('Given no limit param, When mg://events is read, Then getAgentEvents is called with default limit of 50', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { handleEventsRead } = await loadEventHandlers();
    await handleEventsRead('mg://events');

    expect(dataLayer.getAgentEvents).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 })
    );
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY: workstream_id filter edge cases
// ---------------------------------------------------------------------------

describe('memory-resources BOUNDARY: workstream_id filter edge cases (AC-MCP-0.7)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Given workstream_id filter with no matching entries, When mg://memory?workstream_id=WS-NONE is read, Then returns empty array not error', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([]);

    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead('mg://memory?workstream_id=WS-NONE') as any;

    expect(result).not.toBeInstanceOf(Error);
    const text = result?.contents?.[0]?.text ?? result?.content?.[0]?.text ?? '[]';
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(0);
  });

  it('Given empty string workstream_id filter, When mg://memory?workstream_id= is read, Then does not crash (returns all or empty)', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([makeMemoryMeta()]);

    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead('mg://memory?workstream_id=').catch((e: Error) => e);
    expect(result).toBeDefined();
  });

  it('Given workstream_id filter with special characters, When mg://memory?workstream_id=WS-<script> is read, Then does not crash', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([]);

    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead('mg://memory?workstream_id=WS-<script>').catch((e: Error) => e);
    expect(result).toBeDefined();
  });
});

describe('events-resources BOUNDARY: workstream_id filter edge cases (AC-MCP-0.9)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Given workstream_id filter with no matching events, When mg://events?workstream_id=WS-NONE is read, Then returns empty array not error', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { handleEventsRead } = await loadEventHandlers();
    const result = await handleEventsRead('mg://events?workstream_id=WS-NONE') as any;

    expect(result).not.toBeInstanceOf(Error);
    const text = result?.contents?.[0]?.text ?? result?.content?.[0]?.text ?? '[]';
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(0);
  });

  it('Given empty string workstream_id filter, When mg://events?workstream_id= is read, Then does not crash', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { handleEventsRead } = await loadEventHandlers();
    const result = await handleEventsRead('mg://events?workstream_id=').catch((e: Error) => e);
    expect(result).toBeDefined();
  });

  it('Given a memory key with a very long name (200 chars), When mg://memory/{key} is read, Then does not crash on URI parsing', async () => {
    const longKey = 'tasks-' + 'a'.repeat(194);
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(null);

    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead(`mg://memory/${longKey}`).catch((e: Error) => e);
    expect(result).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY: query param parsing — handlers must parse params from the full URI
// ---------------------------------------------------------------------------

describe('memory-resources BOUNDARY: query param isolation from key (AC-MCP-0.7)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Given mg://memory/tasks-qa?foo=bar, When handleMemoryRead is called, Then key passed to getMemoryEntry is "tasks-qa" not "tasks-qa?foo=bar"', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(makeMemoryEntry({ key: 'tasks-qa' }));

    const { handleMemoryRead } = await loadMemoryHandlers();
    await handleMemoryRead('mg://memory/tasks-qa?foo=bar').catch(() => {});

    const calls = vi.mocked(dataLayer.getMemoryEntry).mock.calls;
    if (calls.length > 0) {
      const keyArg = calls[0][0] as string;
      expect(keyArg).toBe('tasks-qa');
      expect(keyArg).not.toContain('?');
    }
  });

  it('Given mg://memory?workstream_id=WS-MCP-0B, When handleMemoryRead is called, Then getAllMemoryEntries is called with workstream_id filter', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([makeMemoryMeta()]);

    const { handleMemoryRead } = await loadMemoryHandlers();
    await handleMemoryRead('mg://memory?workstream_id=WS-MCP-0B').catch(() => {});

    expect(dataLayer.getAllMemoryEntries).toHaveBeenCalledWith(
      expect.objectContaining({ workstream_id: 'WS-MCP-0B' })
    );
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY: getResourceList completeness for memory and events
// ---------------------------------------------------------------------------

describe('memory-resources BOUNDARY: getResourceList includes memory and events URIs', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('Given the memory module is loaded, When getMemoryResourceList is called, Then returns array not undefined', async () => {
    const { getMemoryResourceList } = await loadMemoryHandlers();
    const result = getMemoryResourceList();
    expect(Array.isArray(result)).toBe(true);
  });

  it('Given the memory module is loaded, When getMemoryResourceList is called, Then every entry has uri and name fields', async () => {
    const { getMemoryResourceList } = await loadMemoryHandlers();
    const result = getMemoryResourceList();
    for (const entry of result) {
      expect(entry).toHaveProperty('uri');
      expect(entry).toHaveProperty('name');
      expect(typeof entry.uri).toBe('string');
      expect(typeof entry.name).toBe('string');
    }
  });

  it('Given the events module is loaded, When getEventsResourceList is called, Then returns array not undefined', async () => {
    const { getEventsResourceList } = await loadEventHandlers();
    const result = getEventsResourceList();
    expect(Array.isArray(result)).toBe(true);
  });

  it('Given the events module is loaded, When getEventsResourceList is called, Then every entry has uri and name fields', async () => {
    const { getEventsResourceList } = await loadEventHandlers();
    const result = getEventsResourceList();
    for (const entry of result) {
      expect(entry).toHaveProperty('uri');
      expect(entry).toHaveProperty('name');
      expect(typeof entry.uri).toBe('string');
      expect(typeof entry.name).toBe('string');
    }
  });
});

// ===========================================================================
// GOLDEN PATH
// ===========================================================================

// ---------------------------------------------------------------------------
// GOLDEN PATH: mg://memory — list all memory entry keys with metadata (AC-MCP-0.7)
// ---------------------------------------------------------------------------

describe('memory-resources GOLDEN PATH: mg://memory list (AC-MCP-0.7)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Given two memory entries exist, When mg://memory is read, Then returns JSON array with 2 MemoryEntryMeta objects', async () => {
    const entry1 = makeMemoryMeta({ key: 'tasks-qa', agent_id: 'qa', workstream_id: 'WS-MCP-0B' });
    const entry2 = makeMemoryMeta({ key: 'tasks-dev', agent_id: 'dev', workstream_id: 'WS-MCP-0A' });
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([entry1, entry2]);

    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead('mg://memory') as any;

    expect(result).not.toBeInstanceOf(Error);
    const text = result?.contents?.[0]?.text ?? result?.content?.[0]?.text;
    expect(typeof text).toBe('string');

    const parsed = JSON.parse(text!);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);

    // Each entry must have a key and metadata fields
    expect(parsed[0]).toHaveProperty('key');
    expect(parsed[0].key).toBe('tasks-qa');
    expect(parsed[0]).toHaveProperty('agent_id', 'qa');
    expect(parsed[0]).toHaveProperty('workstream_id', 'WS-MCP-0B');
  });

  it('Given memory entries exist, When mg://memory is read, Then mimeType is application/json', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([makeMemoryMeta()]);

    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead('mg://memory') as any;

    const content = result?.contents?.[0] ?? result?.content?.[0];
    expect(content?.mimeType).toBe('application/json');
  });

  it('Given memory entries exist, When mg://memory is read, Then getAllMemoryEntries is called with no workstream_id filter (returns all)', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([makeMemoryMeta()]);

    const { handleMemoryRead } = await loadMemoryHandlers();
    await handleMemoryRead('mg://memory');

    expect(dataLayer.getAllMemoryEntries).toHaveBeenCalledTimes(1);
  });

  it('Given workstream_id=WS-MCP-0B filter, When mg://memory?workstream_id=WS-MCP-0B is read, Then only entries for that workstream are returned', async () => {
    const filteredEntry = makeMemoryMeta({ key: 'tasks-qa', workstream_id: 'WS-MCP-0B' });
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAllMemoryEntries).mockResolvedValue([filteredEntry]);

    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead('mg://memory?workstream_id=WS-MCP-0B') as any;

    expect(result).not.toBeInstanceOf(Error);
    const text = result?.contents?.[0]?.text ?? result?.content?.[0]?.text;
    const parsed = JSON.parse(text!);

    expect(Array.isArray(parsed)).toBe(true);
    // The returned data must have the correct workstream_id
    expect(parsed[0].workstream_id).toBe('WS-MCP-0B');
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH: mg://memory/{key} — read specific entry (AC-MCP-0.8)
// ---------------------------------------------------------------------------

describe('memory-resources GOLDEN PATH: mg://memory/{key} (AC-MCP-0.8)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Given tasks-qa entry exists, When mg://memory/tasks-qa is read, Then returns full data including the JSONB payload', async () => {
    const entry = makeMemoryEntry({
      key: 'tasks-qa',
      agent_id: 'qa',
      workstream_id: 'WS-MCP-0B',
      data: { tasks: [{ id: 'T1', title: 'Write tests', status: 'in_progress' }], version: 2 },
    });
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(entry);

    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead('mg://memory/tasks-qa') as any;

    expect(result).not.toBeInstanceOf(Error);
    const text = result?.contents?.[0]?.text ?? result?.content?.[0]?.text;
    expect(typeof text).toBe('string');

    const parsed = JSON.parse(text!);
    expect(parsed).toHaveProperty('key', 'tasks-qa');
    expect(parsed).toHaveProperty('data');
    expect(parsed.data).toHaveProperty('tasks');
    expect(Array.isArray(parsed.data.tasks)).toBe(true);
  });

  it('Given entry exists, When mg://memory/tasks-qa is read, Then getMemoryEntry is called with key "tasks-qa"', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(makeMemoryEntry({ key: 'tasks-qa' }));

    const { handleMemoryRead } = await loadMemoryHandlers();
    await handleMemoryRead('mg://memory/tasks-qa');

    expect(dataLayer.getMemoryEntry).toHaveBeenCalledWith('tasks-qa', expect.anything());
  });

  it('Given a key with hyphens and dots (bdd-scenarios), When mg://memory/bdd-scenarios is read, Then full key is correctly extracted', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(makeMemoryEntry({ key: 'bdd-scenarios' }));

    const { handleMemoryRead } = await loadMemoryHandlers();
    await handleMemoryRead('mg://memory/bdd-scenarios');

    expect(dataLayer.getMemoryEntry).toHaveBeenCalledWith('bdd-scenarios', expect.anything());
  });

  it('Given an entry with complex nested JSONB data, When mg://memory/{key} is read, Then full nested structure is preserved in response', async () => {
    const complexData = {
      nested: { deep: { value: [1, 2, 3], flag: true } },
      timestamp: '2026-03-09T10:00:00Z',
      tags: ['qa', 'mcp', 'test'],
    };
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getMemoryEntry).mockResolvedValue(makeMemoryEntry({ data: complexData }));

    const { handleMemoryRead } = await loadMemoryHandlers();
    const result = await handleMemoryRead('mg://memory/tasks-qa') as any;

    const text = result?.contents?.[0]?.text ?? result?.content?.[0]?.text;
    const parsed = JSON.parse(text!);
    expect(parsed.data.nested.deep.value).toEqual([1, 2, 3]);
    expect(parsed.data.tags).toContain('qa');
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH: mg://events — list recent events (AC-MCP-0.9)
// ---------------------------------------------------------------------------

describe('events-resources GOLDEN PATH: mg://events list (AC-MCP-0.9)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Given three events exist, When mg://events is read, Then returns JSON array with all 3 AgentEvent objects', async () => {
    const evt1 = makeAgentEvent({ event_id: 'evt-001', event_type: 'task_started' });
    const evt2 = makeAgentEvent({ event_id: 'evt-002', event_type: 'gate_passed', agent_id: 'dev' });
    const evt3 = makeAgentEvent({ event_id: 'evt-003', event_type: 'handoff_sent', workstream_id: 'WS-MCP-0A' });
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([evt1, evt2, evt3]);

    const { handleEventsRead } = await loadEventHandlers();
    const result = await handleEventsRead('mg://events') as any;

    expect(result).not.toBeInstanceOf(Error);
    const text = result?.contents?.[0]?.text ?? result?.content?.[0]?.text;
    expect(typeof text).toBe('string');

    const parsed = JSON.parse(text!);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(3);

    expect(parsed[0]).toHaveProperty('event_id', 'evt-001');
    expect(parsed[0]).toHaveProperty('agent_id', 'qa');
    expect(parsed[0]).toHaveProperty('event_type', 'task_started');
    expect(parsed[0]).toHaveProperty('timestamp');
  });

  it('Given events exist, When mg://events is read, Then mimeType is application/json', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([makeAgentEvent()]);

    const { handleEventsRead } = await loadEventHandlers();
    const result = await handleEventsRead('mg://events') as any;

    const content = result?.contents?.[0] ?? result?.content?.[0];
    expect(content?.mimeType).toBe('application/json');
  });

  it('Given no limit param, When mg://events is read, Then response contains at most 50 items (default limit respected)', async () => {
    const events = Array.from({ length: 50 }, (_, i) =>
      makeAgentEvent({ event_id: `evt-${i.toString().padStart(3, '0')}` })
    );
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue(events);

    const { handleEventsRead } = await loadEventHandlers();
    const result = await handleEventsRead('mg://events') as any;

    const text = result?.contents?.[0]?.text ?? result?.content?.[0]?.text;
    const parsed = JSON.parse(text!);
    expect(parsed.length).toBeLessThanOrEqual(50);
  });

  it('Given limit=5 in query params, When mg://events?limit=5 is read, Then getAgentEvents is called with limit 5', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([makeAgentEvent()]);

    const { handleEventsRead } = await loadEventHandlers();
    await handleEventsRead('mg://events?limit=5');

    expect(dataLayer.getAgentEvents).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5 })
    );
  });

  it('Given workstream_id=WS-MCP-0B filter, When mg://events?workstream_id=WS-MCP-0B is read, Then getAgentEvents is called with workstream_id filter', async () => {
    const filteredEvent = makeAgentEvent({ workstream_id: 'WS-MCP-0B' });
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([filteredEvent]);

    const { handleEventsRead } = await loadEventHandlers();
    const result = await handleEventsRead('mg://events?workstream_id=WS-MCP-0B') as any;

    expect(result).not.toBeInstanceOf(Error);
    expect(dataLayer.getAgentEvents).toHaveBeenCalledWith(
      expect.objectContaining({ workstream_id: 'WS-MCP-0B' })
    );
  });

  it('Given both limit and workstream_id params, When mg://events?workstream_id=WS-MCP-0B&limit=10 is read, Then both filters are passed to getAgentEvents', async () => {
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([]);

    const { handleEventsRead } = await loadEventHandlers();
    await handleEventsRead('mg://events?workstream_id=WS-MCP-0B&limit=10');

    expect(dataLayer.getAgentEvents).toHaveBeenCalledWith(
      expect.objectContaining({ workstream_id: 'WS-MCP-0B', limit: 10 })
    );
  });

  it('Given events with optional payload field absent, When mg://events is read, Then missing payload does not crash serialization', async () => {
    const eventWithoutPayload: AgentEvent = {
      event_id: 'evt-minimal',
      agent_id: 'dev',
      event_type: 'gate_passed',
      timestamp: '2026-03-09T10:00:00Z',
    };
    const dataLayer = await loadDataLayer();
    vi.mocked(dataLayer.getAgentEvents).mockResolvedValue([eventWithoutPayload]);

    const { handleEventsRead } = await loadEventHandlers();
    const result = await handleEventsRead('mg://events') as any;

    expect(result).not.toBeInstanceOf(Error);
    const text = result?.contents?.[0]?.text ?? result?.content?.[0]?.text;
    expect(() => JSON.parse(text)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH: getResourceList — memory and events URIs in combined list
// ---------------------------------------------------------------------------

describe('memory-resources GOLDEN PATH: getResourceList (AC-MCP-0.3 extension)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('Given the memory module is loaded, When getMemoryResourceList is called, Then mg://memory URI is present with a description', async () => {
    const { getMemoryResourceList } = await loadMemoryHandlers();
    const list = getMemoryResourceList();
    const listEntry = list.find((r: { uri: string }) => r.uri === 'mg://memory');
    expect(listEntry).toBeDefined();
    expect(listEntry!.description).toBeTruthy();
    expect(typeof listEntry!.description).toBe('string');
    expect(listEntry!.description.length).toBeGreaterThan(0);
  });

  it('Given the memory module is loaded, When getMemoryResourceList is called, Then all URIs use the mg:// scheme', async () => {
    const { getMemoryResourceList } = await loadMemoryHandlers();
    const list = getMemoryResourceList();
    for (const entry of list) {
      expect(entry.uri.startsWith('mg://')).toBe(true);
    }
  });

  it('Given the events module is loaded, When getEventsResourceList is called, Then mg://events URI is present with a description', async () => {
    const { getEventsResourceList } = await loadEventHandlers();
    const list = getEventsResourceList();
    const eventsEntry = list.find((r: { uri: string }) => r.uri === 'mg://events');
    expect(eventsEntry).toBeDefined();
    expect(eventsEntry!.description).toBeTruthy();
    expect(typeof eventsEntry!.description).toBe('string');
    expect(eventsEntry!.description.length).toBeGreaterThan(0);
  });

  it('Given the events module is loaded, When getEventsResourceList is called, Then all URIs use the mg:// scheme', async () => {
    const { getEventsResourceList } = await loadEventHandlers();
    const list = getEventsResourceList();
    for (const entry of list) {
      expect(entry.uri.startsWith('mg://')).toBe(true);
    }
  });
});
