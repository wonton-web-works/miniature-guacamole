import type * as http from 'node:http';
import { URL } from 'node:url';
import {
  getAllWorkstreams,
  getWorkstreamById,
  getWorkstreamCounts,
  getAllMemoryEntries,
  getMemoryEntry,
  getAgentEvents,
} from '../data/index.js';
import { getMemoryPath } from '../config.js';

// ---------------------------------------------------------------------------
// API route handlers for WS-MCP-0D
// Each handler is exported individually for testability.
// All errors use the shape: { error: string, status: number }
// ---------------------------------------------------------------------------

type RouteHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  params: Record<string, string>,
  query: URLSearchParams
) => Promise<void>;

function sendJson(res: http.ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendError(res: http.ServerResponse, status: number, message: string): void {
  sendJson(res, status, { error: message, status });
}

export async function handleGetWorkstreams(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  _params: Record<string, string>,
  _query: URLSearchParams
): Promise<void> {
  const workstreams = await getAllWorkstreams(getMemoryPath());
  sendJson(res, 200, workstreams);
}

export async function handleGetWorkstreamCounts(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  _params: Record<string, string>,
  _query: URLSearchParams
): Promise<void> {
  const counts = await getWorkstreamCounts(getMemoryPath());
  sendJson(res, 200, counts);
}

export async function handleGetWorkstreamById(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  params: Record<string, string>,
  _query: URLSearchParams
): Promise<void> {
  const id = params.id ?? '';
  const detail = await getWorkstreamById(id, getMemoryPath());
  if (detail === null) {
    sendError(res, 404, `Workstream not found: ${id}`);
    return;
  }
  sendJson(res, 200, detail);
}

export async function handleGetMemoryEntries(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  _params: Record<string, string>,
  _query: URLSearchParams
): Promise<void> {
  const entries = await getAllMemoryEntries({ memoryPath: getMemoryPath() });
  sendJson(res, 200, entries);
}

export async function handleGetMemoryEntry(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  params: Record<string, string>,
  _query: URLSearchParams
): Promise<void> {
  const key = params.key ?? '';
  const entry = await getMemoryEntry(key, { memoryPath: getMemoryPath() });
  if (entry === null) {
    sendError(res, 404, `Memory entry not found: ${key}`);
    return;
  }
  sendJson(res, 200, entry);
}

export async function handleGetAgentEvents(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  _params: Record<string, string>,
  query: URLSearchParams
): Promise<void> {
  const workstream_id = query.get('workstream_id') ?? undefined;
  const events = await getAgentEvents({
    workstream_id: workstream_id || undefined,
    memoryPath: getMemoryPath(),
  });
  sendJson(res, 200, events);
}

// ---------------------------------------------------------------------------
// Router: matches path against registered routes in order
// /api/workstreams/counts must be registered BEFORE /api/workstreams/:id
// ---------------------------------------------------------------------------

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

const routes: Route[] = [
  {
    method: 'GET',
    pattern: /^\/api\/workstreams$/,
    paramNames: [],
    handler: handleGetWorkstreams,
  },
  {
    method: 'GET',
    pattern: /^\/api\/workstreams\/counts$/,
    paramNames: [],
    handler: handleGetWorkstreamCounts,
  },
  {
    method: 'GET',
    pattern: /^\/api\/workstreams\/([^/]+)$/,
    paramNames: ['id'],
    handler: handleGetWorkstreamById,
  },
  {
    method: 'GET',
    pattern: /^\/api\/memory$/,
    paramNames: [],
    handler: handleGetMemoryEntries,
  },
  {
    method: 'GET',
    pattern: /^\/api\/memory\/([^/]+)$/,
    paramNames: ['key'],
    handler: handleGetMemoryEntry,
  },
  {
    method: 'GET',
    pattern: /^\/api\/events$/,
    paramNames: [],
    handler: handleGetAgentEvents,
  },
];

export async function handleApiRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<boolean> {
  const rawUrl = req.url ?? '/';
  const parsed = new URL(rawUrl, 'http://localhost');
  const pathname = parsed.pathname;
  const query = parsed.searchParams;
  const method = (req.method ?? 'GET').toUpperCase();

  // Only handle /api/* routes here
  if (!pathname.startsWith('/api')) {
    return false;
  }

  // Find a matching route ignoring method first to detect 405
  let matchedRoute: Route | undefined;
  for (const route of routes) {
    if (route.pattern.test(pathname)) {
      if (route.method === method) {
        matchedRoute = route;
        break;
      } else {
        // Path matched but method not allowed
        sendError(res, 405, `Method ${method} not allowed`);
        return true;
      }
    }
  }

  if (!matchedRoute) {
    sendError(res, 404, `Not found: ${pathname}`);
    return true;
  }

  const match = pathname.match(matchedRoute.pattern)!;
  const params: Record<string, string> = {};
  matchedRoute.paramNames.forEach((name, i) => {
    params[name] = decodeURIComponent(match[i + 1] ?? '');
  });

  try {
    await matchedRoute.handler(req, res, params, query);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    sendError(res, 500, message);
  }

  return true;
}
