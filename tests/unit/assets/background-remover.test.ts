/**
 * Unit Tests: Background Remover
 *
 * Tests background removal via rembg child process.
 *
 * Test ordering: misuse-first per CAD TDD protocol
 *   1. MISUSE   — missing rembg, bad inputs
 *   2. BOUNDARY — option edge cases
 *   3. GOLDEN   — happy path invocation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process before importing the module
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual, default: actual };
});

import { execFile } from 'child_process';
import * as fs from 'fs';
import { removeBackground, removeBackgroundFromBuffer } from '../../../src/visuals/assets/background-remover';

const mockExecFile = execFile as unknown as ReturnType<typeof vi.fn>;

// Helper: make execFile resolve successfully
function mockExecFileSuccess() {
  mockExecFile.mockImplementation((_cmd: string, _args: string[], callback: Function) => {
    callback(null, '', '');
  });
}

// Helper: make execFile fail with "command not found"
function mockExecFileNotFound() {
  mockExecFile.mockImplementation((_cmd: string, _args: string[], callback: Function) => {
    const err = new Error('command not found: rembg');
    (err as any).code = 127;
    callback(err, '', '');
  });
}

// Helper: make execFile fail with a generic error
function mockExecFileError(message: string) {
  mockExecFile.mockImplementation((_cmd: string, _args: string[], callback: Function) => {
    callback(new Error(message), '', '');
  });
}

// ============================================================================
// MISUSE CASES
// ============================================================================

describe('Misuse: removeBackground — rembg not installed', () => {
  beforeEach(() => {
    mockExecFileNotFound();
  });

  it('throws a helpful error when rembg is not on PATH', async () => {
    await expect(removeBackground('/in.png', '/out.png')).rejects.toThrow(
      /rembg.*not.*install|install.*rembg/i
    );
  });

  it('error message includes pip install hint', async () => {
    await expect(removeBackground('/in.png', '/out.png')).rejects.toThrow(/pip/i);
  });
});

describe('Misuse: removeBackground — rembg process failure', () => {
  beforeEach(() => {
    mockExecFileError('rembg: unexpected error processing image');
  });

  it('throws when rembg exits with a non-zero error', async () => {
    await expect(removeBackground('/in.png', '/out.png')).rejects.toThrow();
  });
});

describe('Misuse: removeBackgroundFromBuffer — rembg not installed', () => {
  beforeEach(() => {
    mockExecFileNotFound();
  });

  it('throws a helpful error when rembg is not on PATH', async () => {
    const buf = Buffer.from('fake-png-data');
    await expect(removeBackgroundFromBuffer(buf)).rejects.toThrow(/rembg.*not.*install|install.*rembg/i);
  });
});

// ============================================================================
// BOUNDARY CASES
// ============================================================================

describe('Boundary: removeBackground — model option', () => {
  beforeEach(() => {
    mockExecFileSuccess();
    vi.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('png-data'));
  });

  it('passes -m u2net flag when model is u2net', async () => {
    await removeBackground('/in.png', '/out.png', { model: 'u2net' });
    const [, args] = mockExecFile.mock.calls[0];
    expect(args).toContain('-m');
    expect(args).toContain('u2net');
  });

  it('passes -m u2net_human_seg flag when model is u2net_human_seg', async () => {
    await removeBackground('/in.png', '/out.png', { model: 'u2net_human_seg' });
    const [, args] = mockExecFile.mock.calls[0];
    expect(args).toContain('u2net_human_seg');
  });

  it('passes -m isnet-general-use flag when model is isnet-general-use', async () => {
    await removeBackground('/in.png', '/out.png', { model: 'isnet-general-use' });
    const [, args] = mockExecFile.mock.calls[0];
    expect(args).toContain('isnet-general-use');
  });

  it('omits -m flag when no model specified', async () => {
    await removeBackground('/in.png', '/out.png');
    const [, args] = mockExecFile.mock.calls[0];
    expect(args).not.toContain('-m');
  });
});

describe('Boundary: removeBackground — alphaMatte option', () => {
  beforeEach(() => {
    mockExecFileSuccess();
    vi.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('png-data'));
  });

  it('passes -a flag when alphaMatte is true', async () => {
    await removeBackground('/in.png', '/out.png', { alphaMatte: true });
    const [, args] = mockExecFile.mock.calls[0];
    expect(args).toContain('-a');
  });

  it('omits -a flag when alphaMatte is false', async () => {
    await removeBackground('/in.png', '/out.png', { alphaMatte: false });
    const [, args] = mockExecFile.mock.calls[0];
    expect(args).not.toContain('-a');
  });
});

// ============================================================================
// GOLDEN PATH
// ============================================================================

describe('Golden: removeBackground — happy path', () => {
  beforeEach(() => {
    mockExecFileSuccess();
    vi.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('png-data'));
  });

  it('calls rembg with i subcommand and correct paths', async () => {
    await removeBackground('/input/image.png', '/output/result.png');
    const [cmd, args] = mockExecFile.mock.calls[0];
    expect(cmd).toBe('rembg');
    expect(args[0]).toBe('i');
    expect(args).toContain('/input/image.png');
    expect(args).toContain('/output/result.png');
  });

  it('returns the output path', async () => {
    const result = await removeBackground('/input/image.png', '/output/result.png');
    expect(result).toBe('/output/result.png');
  });
});

describe('Golden: removeBackgroundFromBuffer — happy path', () => {
  beforeEach(() => {
    mockExecFileSuccess();
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    vi.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('result-png-data'));
    vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
  });

  it('returns a Buffer', async () => {
    const input = Buffer.from('fake-png-data');
    const result = await removeBackgroundFromBuffer(input);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('writes input to a temp file and reads output from a temp file', async () => {
    const input = Buffer.from('fake-png-data');
    await removeBackgroundFromBuffer(input);
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(fs.readFileSync).toHaveBeenCalled();
  });

  it('cleans up temp files after processing', async () => {
    const input = Buffer.from('fake-png-data');
    await removeBackgroundFromBuffer(input);
    expect(fs.unlinkSync).toHaveBeenCalled();
  });
});
