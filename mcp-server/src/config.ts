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
