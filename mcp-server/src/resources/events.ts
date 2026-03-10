import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { getAgentEvents } from '../data/index.js';

// ---------------------------------------------------------------------------
// Events resource handlers
// AC-MCP-0.9: mg://events returns recent agent events (default limit 50),
//             supports ?limit= and ?workstream_id= filters
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 50;

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

export function getEventsResourceList(): Array<{ uri: string; name: string; description: string }> {
  return [
    {
      uri: 'mg://events',
      name: 'Agent Events',
      description: 'Recent agent events with optional ?limit= and ?workstream_id= filters (Postgres-only; returns empty array in filesystem mode)',
    },
  ];
}

function parseEventsUri(
  uri: string
): { workstreamId: string | null; limit: number } | null {
  // Guard against null/undefined/non-string
  if (!uri || typeof uri !== 'string') return null;

  // Must start with mg://events (optionally followed by ? for query params)
  const MG_EVENTS_PREFIX = 'mg://events';
  if (!uri.startsWith(MG_EVENTS_PREFIX)) return null;

  // After mg://events there should be nothing, or ? (for query params)
  const afterPrefix = uri.slice(MG_EVENTS_PREFIX.length);
  if (afterPrefix !== '' && !afterPrefix.startsWith('?')) return null;

  // Parse query params using URLSearchParams
  let searchParams: URLSearchParams;
  try {
    searchParams = new URLSearchParams(afterPrefix.startsWith('?') ? afterPrefix.slice(1) : '');
  } catch {
    return null;
  }

  const workstreamId = searchParams.get('workstream_id');

  // Parse limit — invalid/negative/zero/non-numeric values fall back to default
  let limit = DEFAULT_LIMIT;
  const limitParam = searchParams.get('limit');
  if (limitParam !== null) {
    const parsed_limit = parseInt(limitParam, 10);
    if (!isNaN(parsed_limit) && parsed_limit > 0) {
      limit = parsed_limit;
    }
    // For invalid values (NaN, negative, zero): keep default
  }

  return { workstreamId, limit };
}

export async function handleEventsRead(uri: string): Promise<McpContent> {
  let parsed: { workstreamId: string | null; limit: number } | null;

  try {
    parsed = parseEventsUri(uri);
  } catch {
    parsed = null;
  }

  if (!parsed) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Invalid or unsupported URI for events resource: ${uri}`
    );
  }

  const { workstreamId, limit } = parsed;

  try {
    const events = await getAgentEvents({
      limit,
      ...(workstreamId ? { workstream_id: workstreamId } : {}),
    });
    return makeContent(uri, events ?? []);
  } catch (err) {
    if (err instanceof McpError) throw err;
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to read agent events: ${(err as Error).message}`
    );
  }
}
