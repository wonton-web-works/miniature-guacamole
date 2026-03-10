import { join } from 'node:path';
import { homedir } from 'node:os';

// ---------------------------------------------------------------------------
// Config resolution for the MCP server
// Priority: MG_POSTGRES_URL env > CLAUDE_MEMORY_PATH env > ~/.claude/memory/
// ---------------------------------------------------------------------------

export function getMemoryPath(): string {
  return (
    process.env.CLAUDE_MEMORY_PATH ??
    join(homedir(), '.claude', 'memory')
  );
}

export function getPostgresUrl(): string | undefined {
  const url = process.env.MG_POSTGRES_URL;
  // Treat empty string as unset
  return url && url.trim() !== '' ? url : undefined;
}

export function isPostgresMode(): boolean {
  return getPostgresUrl() !== undefined;
}

const DEFAULT_HTTP_PORT = 7842;

export function getHttpPort(): number {
  const raw = process.env.MG_HTTP_PORT;
  if (!raw || raw.trim() === '') return DEFAULT_HTTP_PORT;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    return DEFAULT_HTTP_PORT;
  }
  return parsed;
}

export function getStaticPath(): string | undefined {
  const raw = process.env.MG_STATIC_PATH;
  return raw && raw.trim() !== '' ? raw : undefined;
}
