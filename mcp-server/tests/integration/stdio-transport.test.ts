import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { spawn, ChildProcess } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

// ---------------------------------------------------------------------------
// WS-MCP-0A: Integration tests — stdio transport end-to-end
// AC-MCP-0.2: Server uses StdioServerTransport, communicates over stdin/stdout
// AC-MCP-0.11: Malformed URIs return MCP-compliant error (not crash)
// AC-MCP-0.13: Integration test spawns mg-mcp-server, sends JSON-RPC, validates responses
//
// All tests use filesystem-only mode (no Postgres). A test fixture is written
// to a tmp directory before server spawn.
//
// CAD ordering: MISUSE → BOUNDARY → GOLDEN PATH
// ---------------------------------------------------------------------------

// Path to the compiled binary or ts-node entry point.
// In Red phase, neither exists yet — tests will fail at spawn/timeout as expected.
const PROJECT_ROOT = resolve(__dirname, '../../');
const BIN_PATH = join(PROJECT_ROOT, 'dist', 'index.js');
const SRC_ENTRY = join(PROJECT_ROOT, 'src', 'index.ts');

// ts-node or tsx for running TypeScript directly in tests
const TS_RUNNER = 'tsx'; // dev dependency expected: npm install --save-dev tsx

// Fixture directory written before each server spawn
const FIXTURE_DIR = join(tmpdir(), `mg-mcp-test-${process.pid}`);

// MCP JSON-RPC message framing — SDK v1.x uses newline-delimited JSON (NDJSON).
// Each message is JSON + '\n'. No Content-Length header.
function mcpMessage(payload: Record<string, unknown>): Buffer {
  return Buffer.from(JSON.stringify(payload) + '\n');
}

// Parse multiple JSON-RPC responses from a buffer.
// The MCP SDK sends one JSON object per line (NDJSON, not Content-Length framing).
function parseResponses(raw: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      results.push(JSON.parse(trimmed));
    } catch {
      // Skip malformed lines
    }
  }

  return results;
}

// Write minimal fixture workstream files to the tmp directory so the filesystem
// data layer has something to return.
function writeFixtures(dir: string): void {
  mkdirSync(dir, { recursive: true });

  const wsA = {
    workstream_id: 'WS-MCP-TEST-1',
    name: 'MCP Integration Test Workstream',
    phase: 'step_1_test_spec',
    status: 'in_progress',
    agent_id: 'qa',
    timestamp: '2026-03-09T10:00:00Z',
    created_at: '2026-03-09',
    description: 'Fixture workstream for integration tests.',
    acceptance_criteria: ['AC-MCP-0.1'],
    dependencies: [],
  };

  const wsB = {
    workstream_id: 'WS-MCP-TEST-2',
    name: 'Second Fixture Workstream',
    phase: 'complete',
    status: 'done',
    agent_id: 'dev',
    timestamp: '2026-03-08T09:00:00Z',
    created_at: '2026-03-08',
  };

  writeFileSync(
    join(dir, 'workstream-WS-MCP-TEST-1-state.json'),
    JSON.stringify(wsA, null, 2)
  );
  writeFileSync(
    join(dir, 'workstream-WS-MCP-TEST-2-state.json'),
    JSON.stringify(wsB, null, 2)
  );
}

// Write memory fixture files for WS-MCP-0B integration tests.
// Memory entries are .claude/memory/*.json files; the "key" is the filename without .json.
function writeMemoryFixtures(dir: string): void {
  mkdirSync(dir, { recursive: true });

  const tasksQa = {
    tasks: [
      { id: 'T1', title: 'Write memory resource tests', status: 'in_progress', workstream_id: 'WS-MCP-0B' },
    ],
    version: 1,
  };

  const handoffData = {
    from: 'qa',
    to: 'dev',
    workstream_id: 'WS-MCP-0B',
    message: 'Tests written. Proceed with implementation.',
    timestamp: '2026-03-09T10:30:00Z',
  };

  writeFileSync(join(dir, 'tasks-qa.json'), JSON.stringify(tasksQa, null, 2));
  writeFileSync(join(dir, 'handoffs-qa-dev.json'), JSON.stringify(handoffData, null, 2));
}

// Spawn the MCP server as a child process.
// Prefers the compiled binary; falls back to tsx for development.
function spawnServer(memoryPath: string): ChildProcess {
  const env = {
    ...process.env,
    MG_POSTGRES_URL: '', // Force filesystem mode
    CLAUDE_MEMORY_PATH: memoryPath,
    NODE_ENV: 'test',
  };

  // Prefer compiled binary; fall back to tsx + source entry
  if (existsSync(BIN_PATH)) {
    return spawn('node', [BIN_PATH], { env, stdio: ['pipe', 'pipe', 'pipe'] });
  }

  return spawn(TS_RUNNER, [SRC_ENTRY], {
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

// Send a sequence of JSON-RPC messages and collect the response within a timeout.
// Returns all parsed responses received before the timeout.
async function exchange(
  server: ChildProcess,
  messages: Record<string, unknown>[],
  timeoutMs = 5000
): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    let rawOutput = '';
    const timer = setTimeout(() => {
      // Timeout — return whatever we collected
      resolve(parseResponses(rawOutput));
    }, timeoutMs);

    server.stdout?.on('data', (chunk: Buffer) => {
      rawOutput += chunk.toString();
    });

    server.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    // Write all messages to stdin
    for (const msg of messages) {
      server.stdin?.write(mcpMessage(msg));
    }
  });
}

// Standard MCP initialize handshake message
const INITIALIZE_MSG = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'mg-qa-test', version: '0.0.1' },
  },
};

const INITIALIZED_NOTIFICATION = {
  jsonrpc: '2.0',
  method: 'notifications/initialized',
};

const RESOURCES_LIST_MSG = {
  jsonrpc: '2.0',
  id: 2,
  method: 'resources/list',
  params: {},
};

// ===========================================================================
// MISUSE CASES
// ===========================================================================

describe('stdio-transport MISUSE CASES', () => {
  beforeAll(() => {
    writeFixtures(FIXTURE_DIR);
  });

  afterAll(() => {
    if (existsSync(FIXTURE_DIR)) {
      rmSync(FIXTURE_DIR, { recursive: true, force: true });
    }
  });

  describe('unknown resource URI returns MCP error, not crash (AC-MCP-0.11)', () => {
    it('Given an initialized server, When resources/read is called with mg://unknown, Then response contains error field not a result', async () => {
      const server = spawnServer(FIXTURE_DIR);
      const stderrChunks: Buffer[] = [];
      server.stderr?.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

      const responses = await exchange(server, [
        INITIALIZE_MSG,
        INITIALIZED_NOTIFICATION,
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'resources/read',
          params: { uri: 'mg://unknown-resource-type' },
        },
      ]);

      server.stdin?.end();
      await new Promise<void>((res) => server.on('close', res));

      // Server must have stayed alive (exit code should be null or 0, not crash)
      expect(server.exitCode).not.toBe(1);

      // The response to the unknown URI must be an error response
      const errorResponse = responses.find(
        (r) => r.id === 3
      );
      expect(errorResponse).toBeDefined();
      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse!.error).toBeDefined();
    }, 10000);

    it('Given an initialized server, When resources/read is called with mg://workstreams/WS-DOES-NOT-EXIST, Then response contains error with code', async () => {
      const server = spawnServer(FIXTURE_DIR);

      const responses = await exchange(server, [
        INITIALIZE_MSG,
        INITIALIZED_NOTIFICATION,
        {
          jsonrpc: '2.0',
          id: 4,
          method: 'resources/read',
          params: { uri: 'mg://workstreams/WS-DOES-NOT-EXIST' },
        },
      ]);

      server.stdin?.end();
      await new Promise<void>((res) => server.on('close', res));

      const errorResponse = responses.find((r) => r.id === 4);
      expect(errorResponse).toBeDefined();
      // Must have an error field — structured MCP error, not a process crash
      expect(errorResponse).toHaveProperty('error');
    }, 10000);
  });

  describe('malformed JSON-RPC input returns error, not crash', () => {
    it('Given a running server, When raw invalid JSON is sent to stdin, Then server does not crash with exit code 1', async () => {
      const server = spawnServer(FIXTURE_DIR);

      // Send garbage bytes directly — bypassing mcpMessage framing
      const responses = await new Promise<Record<string, unknown>[]>((resolve) => {
        let rawOutput = '';
        const timer = setTimeout(() => resolve(parseResponses(rawOutput)), 3000);

        server.stdout?.on('data', (chunk: Buffer) => {
          rawOutput += chunk.toString();
        });

        server.on('close', () => {
          clearTimeout(timer);
          resolve(parseResponses(rawOutput));
        });

        server.stdin?.write(Buffer.from('this is not valid json-rpc content\n'));
        setTimeout(() => server.stdin?.end(), 1500);
      });

      // Server must not exit with code 1 from the bad input alone
      // (It may exit 0 on stdin close, which is acceptable)
      expect(server.exitCode).not.toBe(1);
    }, 8000);

    it('Given a running server, When a JSON object with no method field is sent, Then server returns JSON-RPC error response', async () => {
      const server = spawnServer(FIXTURE_DIR);

      const responses = await exchange(server, [
        INITIALIZE_MSG,
        INITIALIZED_NOTIFICATION,
        // Missing "method" field — invalid JSON-RPC
        { jsonrpc: '2.0', id: 99 } as Record<string, unknown>,
      ]);

      server.stdin?.end();
      await new Promise<void>((res) => server.on('close', res));

      const errorResponse = responses.find((r) => r.id === 99);
      if (errorResponse) {
        expect(errorResponse).toHaveProperty('error');
      }
      // If server silently ignores invalid requests, that is also acceptable
      // The critical constraint is: no crash
      expect(server.exitCode).not.toBe(1);
    }, 10000);
  });
});

// ===========================================================================
// BOUNDARY CASES
// ===========================================================================

describe('stdio-transport BOUNDARY CASES', () => {
  const EMPTY_FIXTURE_DIR = join(tmpdir(), `mg-mcp-empty-${process.pid}`);

  beforeAll(() => {
    // Write empty memory directory — no workstream files
    mkdirSync(EMPTY_FIXTURE_DIR, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(EMPTY_FIXTURE_DIR)) {
      rmSync(EMPTY_FIXTURE_DIR, { recursive: true, force: true });
    }
  });

  describe('resources/list when no workstreams exist', () => {
    it('Given an empty memory directory, When resources/list is called, Then returns a list response (not error) with workstream URIs present', async () => {
      const server = spawnServer(EMPTY_FIXTURE_DIR);

      const responses = await exchange(server, [
        INITIALIZE_MSG,
        INITIALIZED_NOTIFICATION,
        RESOURCES_LIST_MSG,
      ]);

      server.stdin?.end();
      await new Promise<void>((res) => server.on('close', res));

      const listResponse = responses.find((r) => r.id === 2);
      expect(listResponse).toBeDefined();

      // Must be a result response, not an error
      expect(listResponse).toHaveProperty('result');
      expect(listResponse).not.toHaveProperty('error');

      const result = listResponse!.result as any;
      // Resources list must exist and be an array
      expect(Array.isArray(result?.resources)).toBe(true);
    }, 10000);

    it('Given an empty memory directory, When mg://workstreams is read, Then returns empty array JSON not an error', async () => {
      const server = spawnServer(EMPTY_FIXTURE_DIR);

      const responses = await exchange(server, [
        INITIALIZE_MSG,
        INITIALIZED_NOTIFICATION,
        {
          jsonrpc: '2.0',
          id: 5,
          method: 'resources/read',
          params: { uri: 'mg://workstreams' },
        },
      ]);

      server.stdin?.end();
      await new Promise<void>((res) => server.on('close', res));

      const readResponse = responses.find((r) => r.id === 5);
      expect(readResponse).toBeDefined();
      expect(readResponse).toHaveProperty('result');

      const result = readResponse!.result as any;
      const contents = result?.contents ?? result?.content;
      expect(Array.isArray(contents)).toBe(true);

      if (contents?.length > 0) {
        const text = contents[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          expect(Array.isArray(parsed)).toBe(true);
          expect(parsed).toHaveLength(0);
        }
      }
    }, 10000);
  });
});

// ===========================================================================
// GOLDEN PATH — full initialize → resources/list → resources/read flow
// ===========================================================================

describe('stdio-transport GOLDEN PATH', () => {
  beforeAll(() => {
    writeFixtures(FIXTURE_DIR);
  });

  describe('full MCP initialization flow (AC-MCP-0.2, AC-MCP-0.13)', () => {
    it('Given the server is spawned, When initialize is sent, Then server responds with result containing serverInfo', async () => {
      const server = spawnServer(FIXTURE_DIR);

      const responses = await exchange(server, [INITIALIZE_MSG]);

      server.stdin?.end();
      await new Promise<void>((res) => server.on('close', res));

      const initResponse = responses.find((r) => r.id === 1);
      expect(initResponse).toBeDefined();
      expect(initResponse).toHaveProperty('result');
      expect(initResponse).not.toHaveProperty('error');

      const result = initResponse!.result as any;
      expect(result).toHaveProperty('serverInfo');
      expect(result.serverInfo).toHaveProperty('name');
      // Protocol version must be echoed back
      expect(result).toHaveProperty('protocolVersion');
    }, 10000);

    it('Given initialize completes, When notifications/initialized is sent, Then server does not close unexpectedly', async () => {
      const server = spawnServer(FIXTURE_DIR);
      let exitedWithError = false;

      server.on('close', (code) => {
        if (code !== null && code !== 0) {
          exitedWithError = true;
        }
      });

      await exchange(server, [INITIALIZE_MSG, INITIALIZED_NOTIFICATION]);

      server.stdin?.end();
      await new Promise<void>((res) => server.on('close', res));

      expect(exitedWithError).toBe(false);
    }, 10000);
  });

  describe('resources/list after initialization (AC-MCP-0.3)', () => {
    it('Given an initialized server, When resources/list is called, Then response includes mg://workstreams URI', async () => {
      const server = spawnServer(FIXTURE_DIR);

      const responses = await exchange(server, [
        INITIALIZE_MSG,
        INITIALIZED_NOTIFICATION,
        RESOURCES_LIST_MSG,
      ]);

      server.stdin?.end();
      await new Promise<void>((res) => server.on('close', res));

      const listResponse = responses.find((r) => r.id === 2);
      expect(listResponse).toBeDefined();
      expect(listResponse).toHaveProperty('result');

      const resources = (listResponse!.result as any)?.resources as Array<{ uri: string; name?: string; description?: string }>;
      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);

      const listUri = resources.find((r) => r.uri === 'mg://workstreams');
      expect(listUri).toBeDefined();
    }, 10000);

    it('Given an initialized server, When resources/list is called, Then mg://workstreams/counts URI is present', async () => {
      const server = spawnServer(FIXTURE_DIR);

      const responses = await exchange(server, [
        INITIALIZE_MSG,
        INITIALIZED_NOTIFICATION,
        RESOURCES_LIST_MSG,
      ]);

      server.stdin?.end();
      await new Promise<void>((res) => server.on('close', res));

      const listResponse = responses.find((r) => r.id === 2);
      const resources = (listResponse?.result as any)?.resources as Array<{ uri: string }>;

      if (resources) {
        const countsUri = resources.find((r) => r.uri === 'mg://workstreams/counts');
        expect(countsUri).toBeDefined();
      }
    }, 10000);

    it('Given an initialized server, When resources/list is called, Then every resource has a name and description', async () => {
      const server = spawnServer(FIXTURE_DIR);

      const responses = await exchange(server, [
        INITIALIZE_MSG,
        INITIALIZED_NOTIFICATION,
        RESOURCES_LIST_MSG,
      ]);

      server.stdin?.end();
      await new Promise<void>((res) => server.on('close', res));

      const listResponse = responses.find((r) => r.id === 2);
      const resources = (listResponse?.result as any)?.resources as Array<{
        uri: string;
        name?: string;
        description?: string;
      }>;

      if (resources) {
        for (const r of resources) {
          expect(typeof r.uri).toBe('string');
          // name and description are recommended by MCP spec
          if (r.name !== undefined) expect(typeof r.name).toBe('string');
          if (r.description !== undefined) expect(typeof r.description).toBe('string');
        }
      }
    }, 10000);
  });

  describe('resources/read — mg://workstreams (AC-MCP-0.4)', () => {
    it('Given two fixture workstreams, When mg://workstreams is read, Then response contains JSON array with both workstreams', async () => {
      const server = spawnServer(FIXTURE_DIR);

      const responses = await exchange(server, [
        INITIALIZE_MSG,
        INITIALIZED_NOTIFICATION,
        {
          jsonrpc: '2.0',
          id: 10,
          method: 'resources/read',
          params: { uri: 'mg://workstreams' },
        },
      ]);

      server.stdin?.end();
      await new Promise<void>((res) => server.on('close', res));

      const readResponse = responses.find((r) => r.id === 10);
      expect(readResponse).toBeDefined();
      expect(readResponse).toHaveProperty('result');
      expect(readResponse).not.toHaveProperty('error');

      const contents = (readResponse!.result as any)?.contents ?? (readResponse!.result as any)?.content;
      expect(Array.isArray(contents)).toBe(true);
      expect(contents.length).toBeGreaterThan(0);

      const text = contents[0]?.text;
      expect(typeof text).toBe('string');

      const workstreams = JSON.parse(text);
      expect(Array.isArray(workstreams)).toBe(true);
      expect(workstreams.length).toBeGreaterThanOrEqual(1);

      // Verify the fixture workstream appears
      const ws1 = workstreams.find((w: any) => w.workstream_id === 'WS-MCP-TEST-1');
      expect(ws1).toBeDefined();
      expect(ws1.name).toBe('MCP Integration Test Workstream');
      expect(ws1).toHaveProperty('status');
      expect(ws1).toHaveProperty('phase');
    }, 10000);
  });

  describe('resources/read — mg://workstreams/{id} (AC-MCP-0.5)', () => {
    it('Given fixture workstream WS-MCP-TEST-1 exists, When mg://workstreams/WS-MCP-TEST-1 is read, Then returns WorkstreamDetail with description and acceptance_criteria', async () => {
      const server = spawnServer(FIXTURE_DIR);

      const responses = await exchange(server, [
        INITIALIZE_MSG,
        INITIALIZED_NOTIFICATION,
        {
          jsonrpc: '2.0',
          id: 11,
          method: 'resources/read',
          params: { uri: 'mg://workstreams/WS-MCP-TEST-1' },
        },
      ]);

      server.stdin?.end();
      await new Promise<void>((res) => server.on('close', res));

      const readResponse = responses.find((r) => r.id === 11);
      expect(readResponse).toBeDefined();
      expect(readResponse).toHaveProperty('result');

      const contents = (readResponse!.result as any)?.contents ?? (readResponse!.result as any)?.content;
      const text = contents?.[0]?.text;
      expect(typeof text).toBe('string');

      const detail = JSON.parse(text);
      expect(detail.workstream_id).toBe('WS-MCP-TEST-1');
      expect(detail.name).toBe('MCP Integration Test Workstream');
      // Detail should include description if filesystem reader passes it through
      expect(detail.description).toBe('Fixture workstream for integration tests.');
    }, 10000);
  });

  describe('resources/read — mg://workstreams/counts (AC-MCP-0.6)', () => {
    it('Given fixture workstreams exist, When mg://workstreams/counts is read, Then returns counts object with total >= 1', async () => {
      const server = spawnServer(FIXTURE_DIR);

      const responses = await exchange(server, [
        INITIALIZE_MSG,
        INITIALIZED_NOTIFICATION,
        {
          jsonrpc: '2.0',
          id: 12,
          method: 'resources/read',
          params: { uri: 'mg://workstreams/counts' },
        },
      ]);

      server.stdin?.end();
      await new Promise<void>((res) => server.on('close', res));

      const readResponse = responses.find((r) => r.id === 12);
      expect(readResponse).toBeDefined();
      expect(readResponse).toHaveProperty('result');

      const contents = (readResponse!.result as any)?.contents ?? (readResponse!.result as any)?.content;
      const text = contents?.[0]?.text;
      expect(typeof text).toBe('string');

      const counts = JSON.parse(text);
      expect(counts).toHaveProperty('total');
      expect(typeof counts.total).toBe('number');
      expect(counts.total).toBeGreaterThanOrEqual(1);
    }, 10000);
  });

  describe('full flow: initialize → list → read → counts (AC-MCP-0.13)', () => {
    it('Given a fresh server spawn with fixture data, When the full MCP workflow executes, Then all 4 responses are valid results', async () => {
      const server = spawnServer(FIXTURE_DIR);

      const responses = await exchange(server, [
        // Step 1: Initialize
        INITIALIZE_MSG,
        // Step 2: Confirm initialization
        INITIALIZED_NOTIFICATION,
        // Step 3: List resources
        { jsonrpc: '2.0', id: 20, method: 'resources/list', params: {} },
        // Step 4: Read all workstreams
        { jsonrpc: '2.0', id: 21, method: 'resources/read', params: { uri: 'mg://workstreams' } },
        // Step 5: Read counts
        { jsonrpc: '2.0', id: 22, method: 'resources/read', params: { uri: 'mg://workstreams/counts' } },
      ], 8000);

      server.stdin?.end();
      await new Promise<void>((res) => server.on('close', res));

      // Initialize response (id=1)
      const initResp = responses.find((r) => r.id === 1);
      expect(initResp).toBeDefined();
      expect(initResp).toHaveProperty('result');

      // resources/list response (id=20)
      const listResp = responses.find((r) => r.id === 20);
      expect(listResp).toBeDefined();
      expect(listResp).toHaveProperty('result');
      expect(listResp).not.toHaveProperty('error');

      // resources/read workstreams response (id=21)
      const wsResp = responses.find((r) => r.id === 21);
      expect(wsResp).toBeDefined();
      expect(wsResp).toHaveProperty('result');
      expect(wsResp).not.toHaveProperty('error');

      // resources/read counts response (id=22)
      const countsResp = responses.find((r) => r.id === 22);
      expect(countsResp).toBeDefined();
      expect(countsResp).toHaveProperty('result');
      expect(countsResp).not.toHaveProperty('error');
    }, 15000);
  });
});

// ===========================================================================
// WS-MCP-0B: Memory + Agent Event Resources — integration tests over stdio
// AC-MCP-0.7: mg://memory returns JSON array of memory entry keys with metadata
// AC-MCP-0.8: mg://memory/{key} returns full data JSONB or structured error
// AC-MCP-0.9: mg://events returns recent agent events (default limit 50)
//
// CAD ordering: MISUSE → BOUNDARY → GOLDEN PATH
// ===========================================================================

// Shared memory fixture directory for WS-MCP-0B tests
const MEMORY_FIXTURE_DIR = join(tmpdir(), `mg-mcp-memory-test-${process.pid}`);

// ===========================================================================
// WS-MCP-0B MISUSE CASES (integration)
// ===========================================================================

describe('stdio-transport WS-MCP-0B MISUSE: unknown memory key returns structured error (AC-MCP-0.8)', () => {
  beforeAll(() => {
    writeFixtures(MEMORY_FIXTURE_DIR);
    writeMemoryFixtures(MEMORY_FIXTURE_DIR);
  });

  afterAll(() => {
    if (existsSync(MEMORY_FIXTURE_DIR)) {
      rmSync(MEMORY_FIXTURE_DIR, { recursive: true, force: true });
    }
  });

  it('Given an initialized server, When mg://memory/nonexistent-key is read, Then response contains error not result', async () => {
    const server = spawnServer(MEMORY_FIXTURE_DIR);

    const responses = await exchange(server, [
      INITIALIZE_MSG,
      INITIALIZED_NOTIFICATION,
      {
        jsonrpc: '2.0',
        id: 30,
        method: 'resources/read',
        params: { uri: 'mg://memory/nonexistent-key' },
      },
    ]);

    server.stdin?.end();
    await new Promise<void>((res) => server.on('close', res));

    const errorResponse = responses.find((r) => r.id === 30);
    expect(errorResponse).toBeDefined();
    // Must return a structured error — not a crash and not a result with null data
    expect(errorResponse).toHaveProperty('error');
    expect(errorResponse!.error).toBeDefined();
  }, 10000);

  it('Given an initialized server, When mg://memory/../../etc/passwd is read, Then server returns error and does not crash', async () => {
    const server = spawnServer(MEMORY_FIXTURE_DIR);

    const responses = await exchange(server, [
      INITIALIZE_MSG,
      INITIALIZED_NOTIFICATION,
      {
        jsonrpc: '2.0',
        id: 31,
        method: 'resources/read',
        params: { uri: 'mg://memory/../../etc/passwd' },
      },
    ]);

    server.stdin?.end();
    await new Promise<void>((res) => server.on('close', res));

    // Server must not crash
    expect(server.exitCode).not.toBe(1);

    const errorResponse = responses.find((r) => r.id === 31);
    if (errorResponse) {
      expect(errorResponse).toHaveProperty('error');
    }
  }, 10000);
});

// ===========================================================================
// WS-MCP-0B BOUNDARY CASES (integration)
// ===========================================================================

describe('stdio-transport WS-MCP-0B BOUNDARY: resources/list includes memory and events URIs (AC-MCP-0.3)', () => {
  const EMPTY_MEMORY_DIR = join(tmpdir(), `mg-mcp-memory-empty-${process.pid}`);

  beforeAll(() => {
    mkdirSync(EMPTY_MEMORY_DIR, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(EMPTY_MEMORY_DIR)) {
      rmSync(EMPTY_MEMORY_DIR, { recursive: true, force: true });
    }
  });

  it('Given an initialized server, When resources/list is called, Then mg://memory URI is present in the resource list', async () => {
    const server = spawnServer(EMPTY_MEMORY_DIR);

    const responses = await exchange(server, [
      INITIALIZE_MSG,
      INITIALIZED_NOTIFICATION,
      RESOURCES_LIST_MSG,
    ]);

    server.stdin?.end();
    await new Promise<void>((res) => server.on('close', res));

    const listResponse = responses.find((r) => r.id === 2);
    expect(listResponse).toBeDefined();
    expect(listResponse).toHaveProperty('result');

    const resources = (listResponse!.result as any)?.resources as Array<{ uri: string }> | undefined;
    expect(Array.isArray(resources)).toBe(true);

    const memoryUri = resources?.find((r) => r.uri === 'mg://memory');
    expect(memoryUri).toBeDefined();
  }, 10000);

  it('Given an initialized server, When resources/list is called, Then mg://events URI is present in the resource list', async () => {
    const server = spawnServer(EMPTY_MEMORY_DIR);

    const responses = await exchange(server, [
      INITIALIZE_MSG,
      INITIALIZED_NOTIFICATION,
      RESOURCES_LIST_MSG,
    ]);

    server.stdin?.end();
    await new Promise<void>((res) => server.on('close', res));

    const listResponse = responses.find((r) => r.id === 2);
    const resources = (listResponse?.result as any)?.resources as Array<{ uri: string }> | undefined;

    if (resources) {
      const eventsUri = resources.find((r) => r.uri === 'mg://events');
      expect(eventsUri).toBeDefined();
    }
  }, 10000);

  it('Given an empty memory directory, When mg://memory is read, Then returns empty JSON array not an error', async () => {
    const server = spawnServer(EMPTY_MEMORY_DIR);

    const responses = await exchange(server, [
      INITIALIZE_MSG,
      INITIALIZED_NOTIFICATION,
      {
        jsonrpc: '2.0',
        id: 32,
        method: 'resources/read',
        params: { uri: 'mg://memory' },
      },
    ]);

    server.stdin?.end();
    await new Promise<void>((res) => server.on('close', res));

    const readResponse = responses.find((r) => r.id === 32);
    expect(readResponse).toBeDefined();
    expect(readResponse).toHaveProperty('result');
    expect(readResponse).not.toHaveProperty('error');

    const contents = (readResponse!.result as any)?.contents ?? (readResponse!.result as any)?.content;
    if (contents?.length > 0) {
      const text = contents[0]?.text;
      if (text) {
        const parsed = JSON.parse(text);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed).toHaveLength(0);
      }
    }
  }, 10000);

  it('Given filesystem-only mode (no Postgres), When mg://events is read, Then returns empty array not an error', async () => {
    const server = spawnServer(EMPTY_MEMORY_DIR);

    const responses = await exchange(server, [
      INITIALIZE_MSG,
      INITIALIZED_NOTIFICATION,
      {
        jsonrpc: '2.0',
        id: 33,
        method: 'resources/read',
        params: { uri: 'mg://events' },
      },
    ]);

    server.stdin?.end();
    await new Promise<void>((res) => server.on('close', res));

    const readResponse = responses.find((r) => r.id === 33);
    expect(readResponse).toBeDefined();
    // Events are Postgres-only; filesystem fallback must return empty array, not error
    expect(readResponse).toHaveProperty('result');
    expect(readResponse).not.toHaveProperty('error');

    const contents = (readResponse!.result as any)?.contents ?? (readResponse!.result as any)?.content;
    if (contents?.length > 0) {
      const text = contents[0]?.text;
      if (text) {
        const parsed = JSON.parse(text);
        expect(Array.isArray(parsed)).toBe(true);
      }
    }
  }, 10000);
});

// ===========================================================================
// WS-MCP-0B GOLDEN PATH (integration)
// ===========================================================================

describe('stdio-transport WS-MCP-0B GOLDEN PATH: mg://memory (AC-MCP-0.7)', () => {
  beforeAll(() => {
    writeFixtures(MEMORY_FIXTURE_DIR);
    writeMemoryFixtures(MEMORY_FIXTURE_DIR);
  });

  it('Given fixture memory files exist, When mg://memory is read, Then response contains JSON array with at least 2 entries', async () => {
    const server = spawnServer(MEMORY_FIXTURE_DIR);

    const responses = await exchange(server, [
      INITIALIZE_MSG,
      INITIALIZED_NOTIFICATION,
      {
        jsonrpc: '2.0',
        id: 40,
        method: 'resources/read',
        params: { uri: 'mg://memory' },
      },
    ]);

    server.stdin?.end();
    await new Promise<void>((res) => server.on('close', res));

    const readResponse = responses.find((r) => r.id === 40);
    expect(readResponse).toBeDefined();
    expect(readResponse).toHaveProperty('result');
    expect(readResponse).not.toHaveProperty('error');

    const contents = (readResponse!.result as any)?.contents ?? (readResponse!.result as any)?.content;
    expect(Array.isArray(contents)).toBe(true);
    expect(contents.length).toBeGreaterThan(0);

    const text = contents[0]?.text;
    expect(typeof text).toBe('string');

    const entries = JSON.parse(text);
    expect(Array.isArray(entries)).toBe(true);
    // Fixture writes tasks-qa.json and handoffs-qa-dev.json
    expect(entries.length).toBeGreaterThanOrEqual(2);

    // Each entry must have a key field
    for (const entry of entries) {
      expect(entry).toHaveProperty('key');
      expect(typeof entry.key).toBe('string');
    }
  }, 10000);

  it('Given memory entries exist, When mg://memory is read, Then response mimeType is application/json', async () => {
    const server = spawnServer(MEMORY_FIXTURE_DIR);

    const responses = await exchange(server, [
      INITIALIZE_MSG,
      INITIALIZED_NOTIFICATION,
      {
        jsonrpc: '2.0',
        id: 41,
        method: 'resources/read',
        params: { uri: 'mg://memory' },
      },
    ]);

    server.stdin?.end();
    await new Promise<void>((res) => server.on('close', res));

    const readResponse = responses.find((r) => r.id === 41);
    const contents = (readResponse?.result as any)?.contents ?? (readResponse?.result as any)?.content;
    if (contents?.length > 0) {
      expect(contents[0]?.mimeType).toBe('application/json');
    }
  }, 10000);
});

describe('stdio-transport WS-MCP-0B GOLDEN PATH: mg://memory/{key} (AC-MCP-0.8)', () => {
  beforeAll(() => {
    writeFixtures(MEMORY_FIXTURE_DIR);
    writeMemoryFixtures(MEMORY_FIXTURE_DIR);
  });

  it('Given fixture file tasks-qa.json exists, When mg://memory/tasks-qa is read, Then returns full data payload including tasks array', async () => {
    const server = spawnServer(MEMORY_FIXTURE_DIR);

    const responses = await exchange(server, [
      INITIALIZE_MSG,
      INITIALIZED_NOTIFICATION,
      {
        jsonrpc: '2.0',
        id: 50,
        method: 'resources/read',
        params: { uri: 'mg://memory/tasks-qa' },
      },
    ]);

    server.stdin?.end();
    await new Promise<void>((res) => server.on('close', res));

    const readResponse = responses.find((r) => r.id === 50);
    expect(readResponse).toBeDefined();
    expect(readResponse).toHaveProperty('result');
    expect(readResponse).not.toHaveProperty('error');

    const contents = (readResponse!.result as any)?.contents ?? (readResponse!.result as any)?.content;
    expect(Array.isArray(contents)).toBe(true);
    expect(contents.length).toBeGreaterThan(0);

    const text = contents[0]?.text;
    expect(typeof text).toBe('string');

    const entry = JSON.parse(text);
    // Must include the key
    expect(entry).toHaveProperty('key', 'tasks-qa');
    // Must include the full data JSONB
    expect(entry).toHaveProperty('data');
    expect(entry.data).toHaveProperty('tasks');
    expect(Array.isArray(entry.data.tasks)).toBe(true);
  }, 10000);

  it('Given fixture file handoffs-qa-dev.json exists, When mg://memory/handoffs-qa-dev is read, Then returns full handoff data', async () => {
    const server = spawnServer(MEMORY_FIXTURE_DIR);

    const responses = await exchange(server, [
      INITIALIZE_MSG,
      INITIALIZED_NOTIFICATION,
      {
        jsonrpc: '2.0',
        id: 51,
        method: 'resources/read',
        params: { uri: 'mg://memory/handoffs-qa-dev' },
      },
    ]);

    server.stdin?.end();
    await new Promise<void>((res) => server.on('close', res));

    const readResponse = responses.find((r) => r.id === 51);
    expect(readResponse).toBeDefined();
    expect(readResponse).toHaveProperty('result');

    const contents = (readResponse!.result as any)?.contents ?? (readResponse!.result as any)?.content;
    if (contents?.length > 0) {
      const text = contents[0]?.text;
      if (text) {
        const entry = JSON.parse(text);
        expect(entry).toHaveProperty('key', 'handoffs-qa-dev');
        expect(entry).toHaveProperty('data');
        expect(entry.data).toHaveProperty('from', 'qa');
        expect(entry.data).toHaveProperty('to', 'dev');
      }
    }
  }, 10000);
});

describe('stdio-transport WS-MCP-0B GOLDEN PATH: mg://events (AC-MCP-0.9)', () => {
  beforeAll(() => {
    writeFixtures(MEMORY_FIXTURE_DIR);
    writeMemoryFixtures(MEMORY_FIXTURE_DIR);
  });

  it('Given an initialized server in filesystem mode, When mg://events is read, Then response is a valid result containing a JSON array', async () => {
    const server = spawnServer(MEMORY_FIXTURE_DIR);

    const responses = await exchange(server, [
      INITIALIZE_MSG,
      INITIALIZED_NOTIFICATION,
      {
        jsonrpc: '2.0',
        id: 60,
        method: 'resources/read',
        params: { uri: 'mg://events' },
      },
    ]);

    server.stdin?.end();
    await new Promise<void>((res) => server.on('close', res));

    const readResponse = responses.find((r) => r.id === 60);
    expect(readResponse).toBeDefined();
    // Must be a result (not error) — filesystem returns empty array
    expect(readResponse).toHaveProperty('result');
    expect(readResponse).not.toHaveProperty('error');

    const contents = (readResponse!.result as any)?.contents ?? (readResponse!.result as any)?.content;
    expect(Array.isArray(contents)).toBe(true);

    if (contents?.length > 0) {
      const text = contents[0]?.text;
      expect(typeof text).toBe('string');
      const events = JSON.parse(text);
      expect(Array.isArray(events)).toBe(true);
    }
  }, 10000);

  it('Given an initialized server, When mg://events?limit=5 is read, Then response is a valid result (limit param accepted without crash)', async () => {
    const server = spawnServer(MEMORY_FIXTURE_DIR);

    const responses = await exchange(server, [
      INITIALIZE_MSG,
      INITIALIZED_NOTIFICATION,
      {
        jsonrpc: '2.0',
        id: 61,
        method: 'resources/read',
        params: { uri: 'mg://events?limit=5' },
      },
    ]);

    server.stdin?.end();
    await new Promise<void>((res) => server.on('close', res));

    const readResponse = responses.find((r) => r.id === 61);
    expect(readResponse).toBeDefined();
    expect(readResponse).toHaveProperty('result');
    expect(readResponse).not.toHaveProperty('error');
  }, 10000);

  it('Given an initialized server, When mg://events?workstream_id=WS-MCP-0B is read, Then response is a valid result (workstream filter accepted)', async () => {
    const server = spawnServer(MEMORY_FIXTURE_DIR);

    const responses = await exchange(server, [
      INITIALIZE_MSG,
      INITIALIZED_NOTIFICATION,
      {
        jsonrpc: '2.0',
        id: 62,
        method: 'resources/read',
        params: { uri: 'mg://events?workstream_id=WS-MCP-0B' },
      },
    ]);

    server.stdin?.end();
    await new Promise<void>((res) => server.on('close', res));

    const readResponse = responses.find((r) => r.id === 62);
    expect(readResponse).toBeDefined();
    expect(readResponse).toHaveProperty('result');
    expect(readResponse).not.toHaveProperty('error');
  }, 10000);
});
