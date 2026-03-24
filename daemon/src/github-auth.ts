// GitHub account token resolver — GH issue #14
// Uses per-command GH_TOKEN injection (process-isolated, concurrency-safe).
// Never uses `gh auth switch` which mutates global state.

import { spawnSync } from 'child_process';

let tokenCache: Record<string, string> = {};

export function resolveGhToken(account?: string): string | undefined {
  if (!account) return undefined;
  if (tokenCache[account]) return tokenCache[account];

  const result = spawnSync('gh', ['auth', 'token', '--user', account], {
    encoding: 'utf-8',
    timeout: 10000,
  });

  if (result.status !== 0) {
    throw new Error(
      `Failed to resolve gh auth token for account "${account}": ${result.stderr?.trim()}`
    );
  }

  const token = result.stdout.trim();
  tokenCache[account] = token;
  return token;
}

// For testing
export function clearTokenCache(): void {
  tokenCache = {};
}
