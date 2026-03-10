import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { getAllWorkstreams, getWorkstreamById, getWorkstreamCounts } from '../data/index.js';
import { getMemoryPath } from '../config.js';

// ---------------------------------------------------------------------------
// Workstream resource handlers
// AC-MCP-0.3: resources/list returns all registered URIs with descriptions
// AC-MCP-0.4: mg://workstreams → WorkstreamSummary[]
// AC-MCP-0.5: mg://workstreams/{id} → WorkstreamDetail or structured error
// AC-MCP-0.6: mg://workstreams/counts → WorkstreamCounts { total, by_status, by_phase }
// AC-MCP-0.11: malformed URIs return MCP-compliant errors
// ---------------------------------------------------------------------------

// ResourceNotFound is not in the MCP SDK ErrorCode enum for this SDK version.
const MCP_RESOURCE_NOT_FOUND = -32002;

// Resource list returned by resources/list
export function getResourceList(): Array<{ uri: string; name: string; description: string }> {
  return [
    {
      uri: 'mg://workstreams',
      name: 'Workstream List',
      description: 'List all workstreams with summary status (WorkstreamSummary[])',
    },
    {
      uri: 'mg://workstreams/counts',
      name: 'Workstream Counts',
      description: 'Workstream counts grouped by status and phase ({ total, by_status, by_phase })',
    },
    {
      uri: 'mg://workstreams/{workstream_id}',
      name: 'Workstream Detail',
      description: 'Full WorkstreamDetail for a specific workstream ID',
    },
  ];
}

type McpContent = {
  contents: Array<{ uri: string; mimeType: string; text: string }>;
};

type McpErrorResult = {
  error: { code: number; message: string };
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

function makeError(code: number, message: string): McpErrorResult {
  return { error: { code, message } };
}

function parseUri(uri: string): { scheme: string; resource: string; id: string | null } | null {
  // Guard against null/undefined
  if (!uri || typeof uri !== 'string') return null;

  // Must start with mg://
  const MG_PREFIX = 'mg://';
  if (!uri.startsWith(MG_PREFIX)) return null;

  const rest = uri.slice(MG_PREFIX.length);
  // Reject path traversal
  if (rest.includes('..')) return null;

  const slashIdx = rest.indexOf('/');
  if (slashIdx === -1) {
    return { scheme: 'mg', resource: rest, id: null };
  }

  const resource = rest.slice(0, slashIdx);
  // Strip query params from id segment
  const idRaw = rest.slice(slashIdx + 1);
  const id = idRaw.split('?')[0];

  return { scheme: 'mg', resource, id: id || null };
}

export async function handleResourceRead(
  uri: string
): Promise<McpContent | McpErrorResult> {
  // --- URI validation ---
  const parsed = parseUri(uri);

  if (!parsed) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Invalid or unsupported URI scheme: ${uri}`
    );
  }

  const { resource, id } = parsed;

  // --- Route: mg://workstreams ---
  if (resource === 'workstreams') {
    // mg://workstreams/counts — must check BEFORE falling through to ID lookup
    if (id === 'counts') {
      try {
        const counts = await getWorkstreamCounts(getMemoryPath());
        return makeContent(uri, counts);
      } catch (err) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to read workstream counts: ${(err as Error).message}`
        );
      }
    }

    // mg://workstreams (no id or empty id)
    if (!id) {
      try {
        const workstreams = await getAllWorkstreams(getMemoryPath());
        return makeContent(uri, workstreams ?? []);
      } catch (err) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to read workstreams: ${(err as Error).message}`
        );
      }
    }

    // mg://workstreams/{id} — specific workstream
    try {
      const detail = await getWorkstreamById(id, getMemoryPath());
      if (!detail) {
        throw new McpError(
          MCP_RESOURCE_NOT_FOUND,
          `Workstream not found: ${id}`
        );
      }
      return makeContent(uri, detail);
    } catch (err) {
      if (err instanceof McpError) throw err;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to read workstream ${id}: ${(err as Error).message}`
      );
    }
  }

  // --- Unknown resource type ---
  throw new McpError(
    MCP_RESOURCE_NOT_FOUND,
    `Unknown resource: ${uri}`
  );
}
