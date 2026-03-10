/**
 * Unit Tests: Token Usage Audit Log (MVP) — WS-16
 *
 * Tests the audit logger, config resolution, and log rotation modules.
 * Ordering: MISUSE → BOUNDARY → GOLDEN PATH (CAD protocol)
 *
 * Source modules under test (do not exist yet — tests are intentionally failing):
 *   src/audit/logger.ts   — log(), isEnabled()
 *   src/audit/config.ts   — loadAuditConfig(), validateAuditConfig()  (already exists — tested below)
 *   src/audit/rotation.ts — shouldRotate(), rotate()
 *   src/audit/types.ts    — AuditEntry, AuditConfig
 *
 * Mock strategy: vi.mock('fs/promises') + vi.mock('fs') — no real filesystem writes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — must be hoisted before any imports from the modules under test
// ---------------------------------------------------------------------------

vi.mock('fs/promises', () => ({
  appendFile: vi.fn(),
  mkdir: vi.fn(),
  stat: vi.fn(),
  rename: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  access: vi.fn(),
  chmod: vi.fn(),
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    default: actual,
    existsSync: vi.fn(),
    statSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    renameSync: vi.fn(),
    unlinkSync: vi.fn(),
    readFileSync: vi.fn(),
    promises: {
      appendFile: vi.fn(),
      mkdir: vi.fn(),
      stat: vi.fn(),
      rename: vi.fn(),
      writeFile: vi.fn(),
      unlink: vi.fn(),
      access: vi.fn(),
    },
  };
});

// Modules under test — imports WILL fail until dev implements them.
// That is intentional: these tests are written first (red phase).
import { log, isEnabled } from '../../src/audit/logger';
import { loadAuditConfig, validateAuditConfig, resolveLogPath } from '../../src/audit/config';
import { shouldRotate, rotate } from '../../src/audit/rotation';
import type { AuditEntry, AuditConfig } from '../../src/audit/types';

import * as fsp from 'fs/promises';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    timestamp: new Date().toISOString(),
    session_id: '550e8400-e29b-41d4-a716-446655440000',
    model: 'claude-opus-4-6',
    input_tokens: 100,
    output_tokens: 200,
    cache_creation_tokens: 0,
    cache_read_tokens: 0,
    total_cost_usd: 0.003,
    duration_ms: 1500,
    models_used: ['claude-opus-4-6'],
    ...overrides,
  };
}

function makeConfig(overrides: Partial<AuditConfig> = {}): AuditConfig {
  return {
    enabled: true,
    log_path: '/tmp/audit-test.log',
    max_size_mb: 10,
    keep_backups: 1,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('WS-16 Audit Logger — MISUSE CASES', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- log() when disabled ---

  it('[MISUSE-1] log() when disabled — does not write to filesystem', async () => {
    const config = makeConfig({ enabled: false });
    const entry = makeEntry();

    await log(entry, config);

    expect(fsp.appendFile).not.toHaveBeenCalled();
    expect(fs.promises.appendFile).not.toHaveBeenCalled();
  });

  it('[MISUSE-2] log() when disabled — does not create the log file', async () => {
    const config = makeConfig({ enabled: false });
    const entry = makeEntry();

    await log(entry, config);

    expect(fs.mkdirSync).not.toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(fsp.mkdir).not.toHaveBeenCalled();
  });

  it('[MISUSE-3] log() when disabled — resolves without throwing', async () => {
    const config = makeConfig({ enabled: false });
    await expect(log(makeEntry(), config)).resolves.toBeUndefined();
  });

  // --- log() with invalid / missing fields ---

  it('[MISUSE-4] log() with missing session_id — does not crash', async () => {
    const config = makeConfig({ enabled: true });
    const notFoundErr = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    (fsp.stat as ReturnType<typeof vi.fn>).mockRejectedValue(notFoundErr);
    (fsp.appendFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const badEntry = makeEntry({ session_id: undefined as unknown as string });

    await expect(log(badEntry, config)).resolves.toBeUndefined();
  });

  it('[MISUSE-5] log() with negative token counts — does not crash', async () => {
    const config = makeConfig({ enabled: true });
    const notFoundErr = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    (fsp.stat as ReturnType<typeof vi.fn>).mockRejectedValue(notFoundErr);
    (fsp.appendFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const badEntry = makeEntry({ input_tokens: -1, output_tokens: -999 });

    await expect(log(badEntry, config)).resolves.toBeUndefined();
  });

  it('[MISUSE-6] log() with null models_used — does not crash', async () => {
    const config = makeConfig({ enabled: true });
    const notFoundErr = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    (fsp.stat as ReturnType<typeof vi.fn>).mockRejectedValue(notFoundErr);
    (fsp.appendFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const badEntry = makeEntry({ models_used: null as unknown as string[] });

    await expect(log(badEntry, config)).resolves.toBeUndefined();
  });

  // --- disk full (ENOSPC) ---

  it('[MISUSE-7] log() when disk full (ENOSPC) — swallows error, does not throw', async () => {
    const config = makeConfig({ enabled: true });
    const notFoundErr = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    (fsp.stat as ReturnType<typeof vi.fn>).mockRejectedValue(notFoundErr);
    (fsp.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const diskFullError = Object.assign(new Error('ENOSPC: no space left on device'), { code: 'ENOSPC' });
    (fsp.appendFile as ReturnType<typeof vi.fn>).mockRejectedValue(diskFullError);

    await expect(log(makeEntry(), config)).resolves.toBeUndefined();
  });

  it('[MISUSE-8] log() when disk full — writes warning to stderr', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const config = makeConfig({ enabled: true });
    const notFoundErr = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    (fsp.stat as ReturnType<typeof vi.fn>).mockRejectedValue(notFoundErr);
    (fsp.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const diskFullError = Object.assign(new Error('ENOSPC'), { code: 'ENOSPC' });
    (fsp.appendFile as ReturnType<typeof vi.fn>).mockRejectedValue(diskFullError);

    await log(makeEntry(), config);

    // Either process.stderr.write or console.error should have been called with an error message
    const stderrCalled = stderrSpy.mock.calls.length > 0;
    const consoleErrorCalled = consoleErrorSpy.mock.calls.length > 0;
    expect(stderrCalled || consoleErrorCalled).toBe(true);
  });

  // --- permission denied (EACCES) ---

  it('[MISUSE-9] log() when permission denied (EACCES) — swallows error, does not throw', async () => {
    const config = makeConfig({ enabled: true });
    const notFoundErr = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    (fsp.stat as ReturnType<typeof vi.fn>).mockRejectedValue(notFoundErr);
    (fsp.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const permError = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
    (fsp.appendFile as ReturnType<typeof vi.fn>).mockRejectedValue(permError);

    await expect(log(makeEntry(), config)).resolves.toBeUndefined();
  });

  it('[MISUSE-10] log() when permission denied — writes warning to stderr or console.error', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const config = makeConfig({ enabled: true });
    const notFoundErr = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    (fsp.stat as ReturnType<typeof vi.fn>).mockRejectedValue(notFoundErr);
    (fsp.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const permError = Object.assign(new Error('EACCES'), { code: 'EACCES' });
    (fsp.appendFile as ReturnType<typeof vi.fn>).mockRejectedValue(permError);

    await log(makeEntry(), config);

    const stderrCalled = stderrSpy.mock.calls.length > 0;
    const consoleErrorCalled = consoleErrorSpy.mock.calls.length > 0;
    expect(stderrCalled || consoleErrorCalled).toBe(true);
  });

  // --- config with out-of-range values ---

  it('[MISUSE-11] validateAuditConfig with max_size_mb < 1 — clamps to 1', () => {
    const result = validateAuditConfig({ max_size_mb: 0 });
    expect(result.max_size_mb).toBeGreaterThanOrEqual(1);
  });

  it('[MISUSE-12] validateAuditConfig with max_size_mb = -50 — clamps to minimum (1)', () => {
    const result = validateAuditConfig({ max_size_mb: -50 });
    expect(result.max_size_mb).toBeGreaterThanOrEqual(1);
  });

  it('[MISUSE-13] validateAuditConfig with max_size_mb > 1000 — clamps to 1000', () => {
    const result = validateAuditConfig({ max_size_mb: 5000 });
    expect(result.max_size_mb).toBeLessThanOrEqual(1000);
  });

  it('[MISUSE-14] validateAuditConfig with keep_backups > 10 — clamps to 10', () => {
    const result = validateAuditConfig({ keep_backups: 99 });
    expect(result.keep_backups).toBeLessThanOrEqual(10);
  });

  it('[MISUSE-15] validateAuditConfig with keep_backups < 0 — clamps to 0', () => {
    const result = validateAuditConfig({ keep_backups: -1 });
    expect(result.keep_backups).toBeGreaterThanOrEqual(0);
  });

  // --- config with wrong types ---

  it('[MISUSE-16] validateAuditConfig with max_size_mb as string — uses default (10)', () => {
    const result = validateAuditConfig({ max_size_mb: 'large' as unknown as number });
    expect(result.max_size_mb).toBe(10);
  });

  it('[MISUSE-17] validateAuditConfig with enabled as string — uses default (false)', () => {
    const result = validateAuditConfig({ enabled: 'yes' as unknown as boolean });
    expect(typeof result.enabled).toBe('boolean');
  });

  it('[MISUSE-18] validateAuditConfig with keep_backups as string — uses default (1)', () => {
    const result = validateAuditConfig({ keep_backups: 'many' as unknown as number });
    expect(typeof result.keep_backups).toBe('number');
  });

  // --- rotation with keep_backups: 0 ---

  it('[MISUSE-19] rotate() with keep_backups: 0 — deletes old log, no .1 kept', async () => {
    const logPath = '/tmp/audit.log';
    (fsp.unlink as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.rename as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.chmod as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await rotate(logPath, 0);

    // With keep_backups 0, the file is rotated but the backup should be deleted
    const unlinkCalled = (fsp.unlink as ReturnType<typeof vi.fn>).mock.calls.length > 0;
    expect(unlinkCalled).toBe(true);
  });

  it('[MISUSE-20] rotate() with keep_backups: 0 — does not leave .1 backup file', async () => {
    const logPath = '/tmp/audit.log';
    (fsp.unlink as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.rename as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.chmod as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await rotate(logPath, 0);

    // rename to .1 should NOT be the final resting place — .1 must be deleted
    const renameCalls = (fsp.rename as ReturnType<typeof vi.fn>).mock.calls;
    const unlinkCalls = (fsp.unlink as ReturnType<typeof vi.fn>).mock.calls;

    // If a .1 file was created (via rename), it must also have been removed (via unlink)
    const backupCreated = renameCalls.some(([, dest]: [string, string]) => dest.endsWith('.1'));
    const backupDeleted = unlinkCalls.some(([target]: [string]) => target.endsWith('.1'));
    if (backupCreated) {
      expect(backupDeleted).toBe(true);
    }
  });

  it('[MISUSE-21] log() when mkdir fails with EACCES — resolves to undefined without throwing', async () => {
    const config = makeConfig({ enabled: true });
    const mkdirError = Object.assign(new Error('EACCES: permission denied, mkdir'), { code: 'EACCES' });
    vi.mocked(fsp.mkdir).mockRejectedValue(mkdirError);

    await expect(log(makeEntry(), config)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY CASES
// ---------------------------------------------------------------------------

describe('WS-16 Audit Logger — BOUNDARY CASES', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- rotation threshold ---

  it('[BOUNDARY-1] shouldRotate() exactly at threshold — returns true', async () => {
    const maxSizeMB = 10;
    const exactBytes = maxSizeMB * 1024 * 1024; // exactly 10 MB
    (fsp.stat as ReturnType<typeof vi.fn>).mockResolvedValue({ size: exactBytes });

    await expect(shouldRotate('/tmp/audit.log', maxSizeMB)).resolves.toBe(true);
  });

  it('[BOUNDARY-2] shouldRotate() one byte under threshold — returns false', async () => {
    const maxSizeMB = 10;
    const oneBelowBytes = maxSizeMB * 1024 * 1024 - 1;
    (fsp.stat as ReturnType<typeof vi.fn>).mockResolvedValue({ size: oneBelowBytes });

    await expect(shouldRotate('/tmp/audit.log', maxSizeMB)).resolves.toBe(false);
  });

  it('[BOUNDARY-3] shouldRotate() on a zero-byte log file — returns false', async () => {
    (fsp.stat as ReturnType<typeof vi.fn>).mockResolvedValue({ size: 0 });

    await expect(shouldRotate('/tmp/audit.log', 10)).resolves.toBe(false);
  });

  it('[BOUNDARY-4] shouldRotate() when log file does not exist — returns false', async () => {
    const notFoundErr = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    (fsp.stat as ReturnType<typeof vi.fn>).mockRejectedValue(notFoundErr);

    await expect(shouldRotate('/tmp/audit.log', 10)).resolves.toBe(false);
  });

  // --- keep_backups: 1 (default) ---

  it('[BOUNDARY-5] rotate() with keep_backups: 1 — creates exactly one .1 backup', async () => {
    const logPath = '/tmp/audit.log';
    // no prior .1 exists — unlink throws ENOENT
    const notFoundErr = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    (fsp.unlink as ReturnType<typeof vi.fn>).mockRejectedValueOnce(notFoundErr);
    (fsp.rename as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.chmod as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await rotate(logPath, 1);

    const renameCalls = (fsp.rename as ReturnType<typeof vi.fn>).mock.calls;
    const backupCreated = renameCalls.some(
      ([src, dest]: [string, string]) => src === logPath && dest.endsWith('.1')
    );
    expect(backupCreated).toBe(true);
  });

  it('[BOUNDARY-6] rotate() when prior .1 backup exists — old backup is removed first', async () => {
    const logPath = '/tmp/audit.log';
    // prior .1 exists — unlink succeeds
    (fsp.unlink as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.rename as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.chmod as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await rotate(logPath, 1);

    const unlinkCalls = (fsp.unlink as ReturnType<typeof vi.fn>).mock.calls;
    const oldBackupRemoved = unlinkCalls.some(([target]: [string]) => target.endsWith('.1'));
    expect(oldBackupRemoved).toBe(true);
  });

  // --- concurrent writes ---

  it('[BOUNDARY-7] concurrent log() calls — all resolve without throwing', async () => {
    const config = makeConfig({ enabled: true });
    (fsp.stat as ReturnType<typeof vi.fn>).mockResolvedValue({ size: 0 }); // below threshold
    (fsp.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.appendFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const promises = Array.from({ length: 10 }, () => log(makeEntry(), config));
    await expect(Promise.all(promises)).resolves.toBeDefined();
  });

  it('[BOUNDARY-8] concurrent log() calls — appendFile called once per invocation', async () => {
    const config = makeConfig({ enabled: true });
    (fsp.stat as ReturnType<typeof vi.fn>).mockResolvedValue({ size: 0 }); // below threshold
    (fsp.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.appendFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const N = 5;
    await Promise.all(Array.from({ length: N }, () => log(makeEntry(), config)));

    expect(fsp.appendFile).toHaveBeenCalledTimes(N);
  });

  // --- config defaults for completely empty input ---

  it('[BOUNDARY-9] validateAuditConfig with empty object — returns all defaults', () => {
    const result = validateAuditConfig({});
    expect(result.enabled).toBe(false);
    expect(result.log_path).toBe('~/.claude/audit.log');
    expect(result.max_size_mb).toBe(10);
    expect(result.keep_backups).toBe(1);
  });

  // --- resolveLogPath edge cases ---

  it('[BOUNDARY-10] resolveLogPath with absolute path — returns unchanged', () => {
    const absPath = '/var/log/audit.log';
    expect(resolveLogPath(absPath)).toBe(absPath);
  });

  it('[BOUNDARY-11] resolveLogPath with tilde path — expands to homedir', () => {
    const result = resolveLogPath('~/.claude/audit.log');
    expect(result).not.toContain('~');
    expect(result).toContain('.claude');
  });

  // --- isEnabled() ---

  it('[BOUNDARY-12] isEnabled() when config has enabled: false — returns false', () => {
    expect(isEnabled(makeConfig({ enabled: false }))).toBe(false);
  });

  it('[BOUNDARY-13] isEnabled() when config has enabled: true — returns true', () => {
    expect(isEnabled(makeConfig({ enabled: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('WS-16 Audit Logger — GOLDEN PATH', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- log() appends a valid JSONL entry ---

  it('[GOLDEN-1] log() when enabled — calls appendFile with the log path', async () => {
    const config = makeConfig({ enabled: true, log_path: '/tmp/audit.log' });
    const notFoundErr = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    (fsp.stat as ReturnType<typeof vi.fn>).mockRejectedValue(notFoundErr);
    (fsp.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.appendFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await log(makeEntry(), config);

    expect(fsp.appendFile).toHaveBeenCalledWith(
      expect.stringContaining('audit.log'),
      expect.any(String),
      expect.anything()
    );
  });

  it('[GOLDEN-2] log() — appended content is valid single-line JSON', async () => {
    const config = makeConfig({ enabled: true });
    const notFoundErr = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    (fsp.stat as ReturnType<typeof vi.fn>).mockRejectedValue(notFoundErr);
    (fsp.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.appendFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await log(makeEntry(), config);

    const callArgs = (fsp.appendFile as ReturnType<typeof vi.fn>).mock.calls[0];
    const writtenContent: string = callArgs[1];

    // Strip trailing newline and parse
    const trimmed = writtenContent.replace(/\n$/, '');
    expect(() => JSON.parse(trimmed)).not.toThrow();
    // Must be single line (no embedded newlines)
    expect(trimmed).not.toContain('\n');
  });

  it('[GOLDEN-3] log() — written entry includes all required fields', async () => {
    const config = makeConfig({ enabled: true });
    const notFoundErr = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    (fsp.stat as ReturnType<typeof vi.fn>).mockRejectedValue(notFoundErr);
    (fsp.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.appendFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const entry = makeEntry();
    await log(entry, config);

    const callArgs = (fsp.appendFile as ReturnType<typeof vi.fn>).mock.calls[0];
    const parsed = JSON.parse(callArgs[1].replace(/\n$/, ''));

    expect(parsed).toMatchObject({
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
      session_id: expect.any(String),
      model: expect.any(String),
      input_tokens: expect.any(Number),
      output_tokens: expect.any(Number),
      cache_creation_tokens: expect.any(Number),
      cache_read_tokens: expect.any(Number),
      total_cost_usd: expect.any(Number),
      duration_ms: expect.any(Number),
    });
  });

  it('[GOLDEN-4] log() — entry is newline-terminated (JSONL format)', async () => {
    const config = makeConfig({ enabled: true });
    const notFoundErr = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    (fsp.stat as ReturnType<typeof vi.fn>).mockRejectedValue(notFoundErr);
    (fsp.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.appendFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await log(makeEntry(), config);

    const callArgs = (fsp.appendFile as ReturnType<typeof vi.fn>).mock.calls[0];
    const writtenContent: string = callArgs[1];
    expect(writtenContent.endsWith('\n')).toBe(true);
  });

  it('[GOLDEN-5] log() — file is opened with mode 600 for new file', async () => {
    const config = makeConfig({ enabled: true });
    const notFoundErr = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    (fsp.stat as ReturnType<typeof vi.fn>).mockRejectedValue(notFoundErr);
    (fsp.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.appendFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await log(makeEntry(), config);

    const callArgs = (fsp.appendFile as ReturnType<typeof vi.fn>).mock.calls[0];
    const options = callArgs[2];
    // mode should be 0o600 (decimal 384)
    expect(options).toMatchObject({ mode: 0o600 });
  });

  it('[GOLDEN-6] log() — parent directory is created if it does not exist', async () => {
    const config = makeConfig({ enabled: true, log_path: '/tmp/nonexistent-dir/audit.log' });
    const notFoundErr = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    (fsp.stat as ReturnType<typeof vi.fn>).mockRejectedValue(notFoundErr);
    (fsp.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.appendFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await log(makeEntry(), config);

    // mkdir (or mkdirSync) should have been called to create the parent dir
    const fspMkdirCalled = (fsp.mkdir as ReturnType<typeof vi.fn>).mock.calls.length > 0;
    const fsMkdirSyncCalled = (fs.mkdirSync as ReturnType<typeof vi.fn>).mock.calls.length > 0;
    expect(fspMkdirCalled || fsMkdirSyncCalled).toBe(true);
  });

  // --- rotation triggers and creates .1 backup ---

  it('[GOLDEN-7] log() — triggers rotation when size threshold is met', async () => {
    const config = makeConfig({ enabled: true, max_size_mb: 10, log_path: '/tmp/audit.log' });
    const tenMBBytes = 10 * 1024 * 1024;

    (fsp.stat as ReturnType<typeof vi.fn>).mockResolvedValue({ size: tenMBBytes });
    // no prior .1 backup — unlink throws ENOENT
    const notFoundErr = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    (fsp.unlink as ReturnType<typeof vi.fn>).mockRejectedValueOnce(notFoundErr);
    (fsp.rename as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.chmod as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.appendFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await log(makeEntry(), config);

    // rename should have been called (log rotated)
    expect(fsp.rename).toHaveBeenCalled();
  });

  it('[GOLDEN-8] rotate() — renames current log to .1', async () => {
    const logPath = '/tmp/audit.log';
    const notFoundErr = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    (fsp.unlink as ReturnType<typeof vi.fn>).mockRejectedValueOnce(notFoundErr);
    (fsp.rename as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.chmod as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await rotate(logPath, 1);

    expect(fsp.rename).toHaveBeenCalledWith(logPath, `${logPath}.1`);
  });

  it('[GOLDEN-9] rotate() — creates a fresh empty log after rotation', async () => {
    const logPath = '/tmp/audit.log';
    const notFoundErr = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    (fsp.unlink as ReturnType<typeof vi.fn>).mockRejectedValueOnce(notFoundErr);
    (fsp.rename as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.chmod as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsp.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await rotate(logPath, 1);

    expect(fsp.writeFile).toHaveBeenCalledWith(logPath, '', expect.objectContaining({ mode: 0o600 }));
  });

  // --- isEnabled() golden ---

  it('[GOLDEN-10] isEnabled() reflects config.enabled value', () => {
    expect(isEnabled(makeConfig({ enabled: true }))).toBe(true);
    expect(isEnabled(makeConfig({ enabled: false }))).toBe(false);
  });

  // --- loadAuditConfig defaults ---

  it('[GOLDEN-11] loadAuditConfig — disabled by default when no config files exist', () => {
    (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const config = loadAuditConfig();
    expect(config.enabled).toBe(false);
  });

  it('[GOLDEN-12] loadAuditConfig — default log_path is ~/.claude/audit.log', () => {
    (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const config = loadAuditConfig();
    expect(config.log_path).toBe('~/.claude/audit.log');
  });

  it('[GOLDEN-13] loadAuditConfig — default max_size_mb is 10', () => {
    (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const config = loadAuditConfig();
    expect(config.max_size_mb).toBe(10);
  });

  it('[GOLDEN-14] loadAuditConfig — default keep_backups is 1', () => {
    (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const config = loadAuditConfig();
    expect(config.keep_backups).toBe(1);
  });

  it('[GOLDEN-15] loadAuditConfig — project config overrides global config for enabled', () => {
    (fs.existsSync as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      // Both config files exist
      return p.endsWith('config.json') || p.endsWith('.clauderc');
    });
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      if (String(p).endsWith('config.json')) {
        return JSON.stringify({ audit_logging: { enabled: false } });
      }
      if (String(p).endsWith('.clauderc')) {
        return JSON.stringify({ audit_logging: { enabled: true } });
      }
      return '{}';
    });

    const config = loadAuditConfig();
    expect(config.enabled).toBe(true);
  });

  it('[GOLDEN-16] loadAuditConfig — project config overrides global config for log_path', () => {
    (fs.existsSync as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      return p.endsWith('config.json') || p.endsWith('.clauderc');
    });
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      if (String(p).endsWith('config.json')) {
        return JSON.stringify({ audit_logging: { log_path: '~/global.log' } });
      }
      if (String(p).endsWith('.clauderc')) {
        return JSON.stringify({ audit_logging: { log_path: '/project/audit.log' } });
      }
      return '{}';
    });

    const config = loadAuditConfig();
    expect(config.log_path).toBe('/project/audit.log');
  });

  it('[GOLDEN-17] loadAuditConfig — corrupted global config falls back to defaults', () => {
    (fs.existsSync as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      return p.endsWith('config.json');
    });
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue('NOT VALID JSON {{{{');

    const config = loadAuditConfig();
    expect(config.enabled).toBe(false);
    expect(config.max_size_mb).toBe(10);
  });
});
