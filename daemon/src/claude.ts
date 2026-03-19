// Claude subprocess wrapper for miniature-guacamole daemon
// WS-DAEMON-11: MG Orchestration Engine
// P0-2: Scrub sensitive env vars before spawn
// P0-3: Kill process group on timeout
// P0-4: Cap stdout/stderr at 50MB

import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';

export interface ClaudeResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

// Dependency-injectable spawn function type for testing
export type SpawnFn = (
  command: string,
  args: string[],
  options: Record<string, unknown>
) => ChildProcess;

const DEFAULT_TIMEOUT_MS = 1_800_000; // 30 minutes
const DEFAULT_MAX_OUTPUT_BYTES = 50 * 1024 * 1024; // 50 MB
const SIGKILL_GRACE_MS = 5_000; // 5 seconds after SIGTERM before SIGKILL

/**
 * Environment variable prefixes that should NEVER be passed to Claude subprocesses.
 * These contain API tokens, credentials, and secrets that could be exfiltrated
 * via prompt injection attacks.
 */
const SCRUB_PREFIXES = [
  'JIRA_',
  'LINEAR_',
  'AWS_',
  'GITHUB_TOKEN',
  'GH_TOKEN',
  'NPM_TOKEN',
  'NPM_CONFIG_',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'STRIPE_',
  'SLACK_',
  'WEBHOOK_',
  'DATABASE_URL',
  'DB_',
  'REDIS_',
  'MONGO_',
  'SECRET_',
  'TOKEN_',
  'API_KEY_',
  'PRIVATE_KEY_',
  'MG_JIRA_',
  'MG_LINEAR_',
];

/**
 * Remove sensitive environment variables before passing to subprocess.
 * Returns a new env object with matching keys removed.
 * Matching is case-insensitive and prefix-based.
 */
export function scrubEnvironment(env: NodeJS.ProcessEnv): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) continue;
    const upperKey = key.toUpperCase();
    const isSensitive = SCRUB_PREFIXES.some(prefix => upperKey.startsWith(prefix));
    if (!isSensitive) {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Execute `claude --print` with the given prompt.
 * @param prompt         - The prompt to send to Claude
 * @param options        - Optional overrides (timeout, cwd, env, maxOutputBytes)
 * @param spawnFn        - Injectable spawn function (defaults to node:child_process.spawn)
 */
export async function execClaude(
  prompt: string,
  options: { timeout?: number; cwd?: string; env?: Record<string, string>; maxOutputBytes?: number } = {},
  spawnFn: SpawnFn = spawn as unknown as SpawnFn
): Promise<ClaudeResult> {
  const timeoutMs = options.timeout ?? DEFAULT_TIMEOUT_MS;
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;

  // P0-2: Scrub sensitive env vars before passing to subprocess
  const baseEnv = scrubEnvironment(process.env);

  const spawnOptions: Record<string, unknown> = {
    env: { ...baseEnv, ...(options.env ?? {}) },
    // P0-3: detached=true spawns Claude in a new process group so we can
    // kill the entire group (including any shell children) on timeout
    detached: true,
  };
  if (options.cwd !== undefined) {
    spawnOptions.cwd = options.cwd;
  }

  const proc = spawnFn('claude', [
    '--print',
    '--permission-mode', 'bypassPermissions',
    '--output-format', 'text',
    prompt,
  ], spawnOptions);

  let stdout = '';
  let stderr = '';
  let timedOut = false;
  // P0-4: track truncation state per stream
  let stdoutTruncated = false;
  let stderrTruncated = false;

  const stdoutStream = (proc as unknown as Record<string, NodeJS.ReadableStream>).stdout;
  const stderrStream = (proc as unknown as Record<string, NodeJS.ReadableStream>).stderr;

  if (stdoutStream) {
    stdoutStream.on('data', (chunk: Buffer) => {
      if (stdoutTruncated) return;
      const remaining = maxOutputBytes - Buffer.byteLength(stdout);
      if (remaining <= 0) {
        stdout += '\n[OUTPUT TRUNCATED AT 50MB]';
        stdoutTruncated = true;
        return;
      }
      const str = chunk.toString();
      const strBytes = Buffer.byteLength(str);
      if (strBytes <= remaining) {
        stdout += str;
      } else {
        // Append as many bytes as fit, then add truncation marker
        stdout += str.substring(0, remaining);
        stdout += '\n[OUTPUT TRUNCATED AT 50MB]';
        stdoutTruncated = true;
      }
    });
  }

  if (stderrStream) {
    stderrStream.on('data', (chunk: Buffer) => {
      if (stderrTruncated) return;
      const remaining = maxOutputBytes - Buffer.byteLength(stderr);
      if (remaining <= 0) {
        stderr += '\n[OUTPUT TRUNCATED AT 50MB]';
        stderrTruncated = true;
        return;
      }
      const str = chunk.toString();
      const strBytes = Buffer.byteLength(str);
      if (strBytes <= remaining) {
        stderr += str;
      } else {
        stderr += str.substring(0, remaining);
        stderr += '\n[OUTPUT TRUNCATED AT 50MB]';
        stderrTruncated = true;
      }
    });
  }

  return new Promise<ClaudeResult>((resolve) => {
    const timer = setTimeout(() => {
      timedOut = true;
      const pid = (proc as unknown as Record<string, unknown>).pid as number | undefined;

      // P0-3: Kill the entire process group (negative PID) with SIGTERM
      try {
        if (pid !== undefined) {
          process.kill(-pid, 'SIGTERM');
        } else {
          const killFn = (proc as unknown as Record<string, () => void>).kill;
          if (typeof killFn === 'function') killFn.call(proc);
        }
      } catch {
        // Process may have already exited — fallback to direct kill
        try {
          const killFn = (proc as unknown as Record<string, () => void>).kill;
          if (typeof killFn === 'function') killFn.call(proc);
        } catch {
          // Already gone
        }
      }

      // P0-3: Escalate to SIGKILL after grace period if SIGTERM didn't work
      setTimeout(() => {
        try {
          if (pid !== undefined) {
            process.kill(-pid, 'SIGKILL');
          }
        } catch {
          // Process already gone — this is fine
        }
      }, SIGKILL_GRACE_MS);
    }, timeoutMs);

    proc.on('close', (code: number | null) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 0,
        timedOut,
      });
    });
  });
}
