import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { getAllMemoryEntries, getMemoryEntry } from '../data/index.js';
import { getMemoryPath } from '../config.js';

// ---------------------------------------------------------------------------
// Memory resource handlers
// AC-MCP-0.7: mg://memory returns JSON array of memory entry keys with metadata
// AC-MCP-0.8: mg://memory/{key} returns full data JSONB or structured error
// ---------------------------------------------------------------------------

const MCP_RESOURCE_NOT_FOUND = -32002;

type McpContent = {
  contents: Array<{ uri: string; mimeType: string; text: string }>;
};

function makeContent(uri: string, data: unknown): McpContent {
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data),
      },
    ],
  };
}

export function getMemoryResourceList(): Array<{ uri: string; name: string; description: string }> {
  return [
    {
      uri: 'mg://memory',
      name: 'Memory Entries',
      description: 'List all agent memory entries with metadata (key, agent_id, workstream_id, timestamp)',
    },
    {
      uri: 'mg://memory/{key}',
      name: 'Memory Entry',
      description: 'Full JSON data for a specific memory entry key',
    },
  ];
}

function parseMemoryUri(uri: string): { key: string | null; workstreamId: string | null } | null {
  // Guard against null/undefined/non-string
  if (!uri || typeof uri !== 'string') return null;

  // Must start with mg://memory
  const MG_MEMORY_PREFIX = 'mg://memory';
  if (!uri.startsWith(MG_MEMORY_PREFIX)) return null;

  // After mg://memory there may be:
  //   nothing          -> list all
  //   ?...             -> list with query params
  //   /{key}           -> specific key
  //   /{key}?...       -> specific key with query params
  const afterPrefix = uri.slice(MG_MEMORY_PREFIX.length);

  let keyPart: string | null = null;
  let queryPart = '';

  if (afterPrefix === '' || afterPrefix.startsWith('?')) {
    // mg://memory or mg://memory?...
    queryPart = afterPrefix.startsWith('?') ? afterPrefix.slice(1) : '';
  } else if (afterPrefix.startsWith('/')) {
    // mg://memory/{key} or mg://memory/{key}?...
    const slashRest = afterPrefix.slice(1);
    const qIdx = slashRest.indexOf('?');
    if (qIdx === -1) {
      keyPart = slashRest || null;
    } else {
      keyPart = slashRest.slice(0, qIdx) || null;
      queryPart = slashRest.slice(qIdx + 1);
    }
  } else {
    // Unrecognized format (e.g., mg://memoryFoo)
    return null;
  }

  // Reject path traversal and null bytes in key
  if (keyPart && (keyPart.includes('..') || keyPart.includes('\0'))) return null;

  let searchParams: URLSearchParams;
  try {
    searchParams = new URLSearchParams(queryPart);
  } catch {
    return null;
  }

  const workstreamId = searchParams.get('workstream_id');

  return { key: keyPart, workstreamId };
}

export async function handleMemoryRead(uri: string): Promise<McpContent> {
  let parsed: { key: string | null; workstreamId: string | null } | null;

  try {
    parsed = parseMemoryUri(uri);
  } catch {
    parsed = null;
  }

  if (!parsed) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Invalid or unsupported URI for memory resource: ${uri}`
    );
  }

  const { key, workstreamId } = parsed;
  const memoryPath = getMemoryPath();

  // mg://memory/{key} — read specific entry
  if (key) {
    try {
      const entry = await getMemoryEntry(key, memoryPath);
      if (!entry) {
        throw new McpError(
          MCP_RESOURCE_NOT_FOUND,
          `Memory entry not found: ${key}`
        );
      }
      return makeContent(uri, entry);
    } catch (err) {
      if (err instanceof McpError) throw err;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to read memory entry ${key}: ${(err as Error).message}`
      );
    }
  }

  // mg://memory — list all entries
  try {
    const entries = await getAllMemoryEntries({
      memoryPath,
      ...(workstreamId ? { workstream_id: workstreamId } : {}),
    });
    return makeContent(uri, entries ?? []);
  } catch (err) {
    if (err instanceof McpError) throw err;
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to list memory entries: ${(err as Error).message}`
    );
  }
}
