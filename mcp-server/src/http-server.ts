import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getStaticPath } from './config.js';
import { handleApiRequest } from './routes/api.js';

// ---------------------------------------------------------------------------
// HTTP server for WS-MCP-0D
// AC-MCP-0D.1:  Listens on the given port, bound to 127.0.0.1 only
// AC-MCP-0D.8:  Serves static files if MG_STATIC_PATH is set; else 404
// AC-MCP-0D.9:  All errors return { error: string, status: number } JSON
// ---------------------------------------------------------------------------

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

function sendError(
  res: http.ServerResponse,
  status: number,
  message: string
): void {
  const body = JSON.stringify({ error: message, status });
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

async function handleStaticRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const staticRoot = getStaticPath();
  if (!staticRoot) {
    sendError(res, 404, 'Static file serving is not configured');
    return;
  }

  const rawPath = new URL(req.url ?? '/', 'http://localhost').pathname;
  // Serve index.html for root
  const filePath = rawPath === '/'
    ? path.join(staticRoot, 'index.html')
    : path.join(staticRoot, rawPath);

  // Prevent path traversal
  if (!filePath.startsWith(path.resolve(staticRoot))) {
    sendError(res, 403, 'Forbidden');
    return;
  }

  try {
    const data = await fs.promises.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch {
    sendError(res, 404, `Not found: ${rawPath}`);
  }
}

async function requestHandler(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  try {
    // Try API routes first
    const handled = await handleApiRequest(req, res);
    if (!handled) {
      // Fall through to static file serving
      await handleStaticRequest(req, res);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    sendError(res, 500, message);
  }
}

/**
 * Creates and starts an HTTP server bound to 127.0.0.1.
 * Passing port=0 lets the OS assign a free port (useful for tests).
 */
export function createHttpServer(port: number): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      requestHandler(req, res).catch((err) => {
        const message = err instanceof Error ? err.message : 'Internal server error';
        if (!res.headersSent) {
          sendError(res, 500, message);
        }
      });
    });

    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });

    server.on('error', reject);
  });
}
