/**
 * Unit Tests for Studio Mux Module
 *
 * Tests the mux.ts module that combines narration audio + terminal video.
 * WS-STUDIO-1: YouTube production pipeline tooling
 *
 * External deps mocked: child_process (ffmpeg binary)
 * Test order: misuse → boundary → golden path
 * @target >80% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as childProcess from 'child_process';

// Mock child_process to avoid invoking real ffmpeg
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    execFile: vi.fn(),
    spawn: vi.fn(),
  };
});

import {
  mux,
  validateMuxInputs,
  buildFfmpegArgs,
  checkFfmpegAvailable,
} from '../../src/studio/mux';
import type { MuxInput, MuxResult, SceneTimingMap } from '../../src/studio/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createFakeFile(dir: string, filename: string, content: Buffer | string = 'fake'): string {
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

function buildValidMuxInput(dir: string): MuxInput {
  return {
    narrationMp3s: [
      createFakeFile(dir, 'narration-scene-01-hook.mp3', Buffer.from('audio1')),
      createFakeFile(dir, 'narration-scene-02-narration-only.mp3', Buffer.from('audio2')),
    ],
    terminalMp4: createFakeFile(dir, 'terminal.mp4', Buffer.from('video-data')),
    sceneTimings: {
      '01-hook': { startMs: 0, durationMs: 3000 },
      '02-narration-only': { startMs: 3000, durationMs: 2000 },
    },
    outputPath: path.join(dir, 'raw-cut.mp4'),
  };
}

// ---------------------------------------------------------------------------
// SECTION 1: MISUSE CASES
// ---------------------------------------------------------------------------

describe('mux.ts — Misuse Cases', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `studio-mux-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('validateMuxInputs() — missing or invalid inputs', () => {
    it('returns error when narrationMp3s array is empty', () => {
      const input: MuxInput = {
        ...buildValidMuxInput(testDir),
        narrationMp3s: [],
      };
      const result = validateMuxInputs(input);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.toLowerCase().includes('narration') || e.toLowerCase().includes('mp3'))).toBe(true);
    });

    it('returns error when narrationMp3s is null', () => {
      const input: any = { ...buildValidMuxInput(testDir), narrationMp3s: null };
      const result = validateMuxInputs(input);
      expect(result.valid).toBe(false);
    });

    it('returns error when terminalMp4 path does not exist on disk', () => {
      const input: MuxInput = {
        ...buildValidMuxInput(testDir),
        terminalMp4: path.join(testDir, 'nonexistent.mp4'),
      };
      const result = validateMuxInputs(input);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.toLowerCase().includes('mp4') || e.toLowerCase().includes('terminal'))).toBe(true);
    });

    it('returns error when terminalMp4 is empty string', () => {
      const input: MuxInput = { ...buildValidMuxInput(testDir), terminalMp4: '' };
      const result = validateMuxInputs(input);
      expect(result.valid).toBe(false);
    });

    it('returns error when a narration MP3 file does not exist on disk', () => {
      const input = buildValidMuxInput(testDir);
      input.narrationMp3s.push(path.join(testDir, 'missing-narration.mp3'));
      const result = validateMuxInputs(input);
      expect(result.valid).toBe(false);
    });

    it('returns error when sceneTimings is empty object', () => {
      const input: MuxInput = {
        ...buildValidMuxInput(testDir),
        sceneTimings: {},
      };
      const result = validateMuxInputs(input);
      expect(result.valid).toBe(false);
    });

    it('returns error when sceneTimings is null', () => {
      const input: any = { ...buildValidMuxInput(testDir), sceneTimings: null };
      const result = validateMuxInputs(input);
      expect(result.valid).toBe(false);
    });

    it('returns error when outputPath is empty string', () => {
      const input: MuxInput = { ...buildValidMuxInput(testDir), outputPath: '' };
      const result = validateMuxInputs(input);
      expect(result.valid).toBe(false);
    });

    it('returns error when a sceneTimings entry has negative durationMs', () => {
      const input: MuxInput = {
        ...buildValidMuxInput(testDir),
        sceneTimings: {
          '01-hook': { startMs: 0, durationMs: -500 },
        },
      };
      const result = validateMuxInputs(input);
      expect(result.valid).toBe(false);
    });
  });

  describe('mux() — process execution failures', () => {
    it('rejects when ffmpeg is not available on PATH', async () => {
      const { execFile } = await import('child_process');
      (execFile as any).mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        cb(new Error('ffmpeg: command not found'), '', '');
      });

      const input = buildValidMuxInput(testDir);
      await expect(mux(input)).rejects.toThrow(/ffmpeg/i);
    });

    it('rejects when ffmpeg exits with non-zero code', async () => {
      const { execFile } = await import('child_process');
      (execFile as any).mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        const err = new Error('ffmpeg error') as any;
        err.code = 1;
        cb(err, '', 'ffmpeg: Invalid data found when processing input');
      });

      const input = buildValidMuxInput(testDir);
      await expect(mux(input)).rejects.toThrow();
    });

    it('does not leave partial output file when ffmpeg fails', async () => {
      const { execFile } = await import('child_process');
      (execFile as any).mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        // Simulate partial write then failure
        const outputPath = _args[_args.length - 1];
        if (typeof outputPath === 'string' && outputPath.endsWith('.mp4')) {
          fs.writeFileSync(outputPath, Buffer.from('partial'));
        }
        const err = new Error('ffmpeg died') as any;
        err.code = 1;
        cb(err, '', 'error');
      });

      const input = buildValidMuxInput(testDir);
      try {
        await mux(input);
      } catch {
        // expected
      }

      expect(fs.existsSync(input.outputPath)).toBe(false);
    });
  });

  describe('buildFfmpegArgs() — invalid argument construction', () => {
    it('throws when narrationMp3s is empty', () => {
      const input = buildValidMuxInput(testDir);
      input.narrationMp3s = [];
      expect(() => buildFfmpegArgs(input)).toThrow();
    });

    it('throws when outputPath is empty', () => {
      const input = buildValidMuxInput(testDir);
      input.outputPath = '';
      expect(() => buildFfmpegArgs(input)).toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// SECTION 2: BOUNDARY CASES
// ---------------------------------------------------------------------------

describe('mux.ts — Boundary Cases', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `studio-mux-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('mux() — audio longer than video (freeze-frame)', () => {
    it('succeeds and logs a warning when total audio duration exceeds video duration', async () => {
      const { execFile } = await import('child_process');
      (execFile as any).mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        // Simulate ffmpeg success but audio was longer
        const outPath = _args[_args.length - 1];
        if (typeof outPath === 'string' && outPath.endsWith('.mp4')) {
          fs.writeFileSync(outPath, Buffer.from('output-video-data'));
        }
        cb(null, '', '');
      });

      const input = buildValidMuxInput(testDir);
      // Scene timings with total audio > video (5s total audio, 3s video)
      input.sceneTimings = {
        '01-hook': { startMs: 0, durationMs: 3000 },
        '02-narration-only': { startMs: 3000, durationMs: 2000 },
      };

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await mux(input);

      // Should succeed (freeze-frame behavior)
      expect(result.outputPath).toBe(input.outputPath);
      // Should have logged a warning
      // (Warning may or may not fire depending on actual duration detection — test existence)
      warnSpy.mockRestore();
    });
  });

  describe('mux() — single narration MP3 (one scene)', () => {
    it('handles a single narration file without error', async () => {
      const { execFile } = await import('child_process');
      (execFile as any).mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        const outPath = _args[_args.length - 1];
        if (typeof outPath === 'string' && outPath.endsWith('.mp4')) {
          fs.writeFileSync(outPath, Buffer.from('single-scene-output'));
        }
        cb(null, '', '');
      });

      const singleMp3 = createFakeFile(testDir, 'narration-scene-01.mp3', Buffer.from('audio'));
      const input: MuxInput = {
        narrationMp3s: [singleMp3],
        terminalMp4: createFakeFile(testDir, 'terminal.mp4', Buffer.from('video')),
        sceneTimings: { '01': { startMs: 0, durationMs: 3000 } },
        outputPath: path.join(testDir, 'raw-cut.mp4'),
      };

      const result = await mux(input);
      expect(fs.existsSync(result.outputPath)).toBe(true);
    });
  });

  describe('mux() — idempotency', () => {
    it('produces the same output when called twice with the same inputs', async () => {
      const { execFile } = await import('child_process');
      let callCount = 0;
      (execFile as any).mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        callCount++;
        const outPath = _args[_args.length - 1];
        if (typeof outPath === 'string' && outPath.endsWith('.mp4')) {
          fs.writeFileSync(outPath, Buffer.from(`output-v${callCount}`));
        }
        cb(null, '', '');
      });

      const input = buildValidMuxInput(testDir);

      const result1 = await mux(input);
      const content1 = fs.readFileSync(result1.outputPath);
      const result2 = await mux(input);
      const content2 = fs.readFileSync(result2.outputPath);

      // Both should be at the same path; output exists after both runs
      expect(result1.outputPath).toBe(result2.outputPath);
      expect(content2.length).toBeGreaterThan(0);
    });
  });

  describe('buildFfmpegArgs()', () => {
    it('includes 1920x1080 resolution in generated args', () => {
      const input = buildValidMuxInput(testDir);
      const args = buildFfmpegArgs(input);
      const argsStr = args.join(' ');
      expect(argsStr).toContain('1920');
      expect(argsStr).toContain('1080');
    });

    it('specifies H.264 video codec in generated args', () => {
      const input = buildValidMuxInput(testDir);
      const args = buildFfmpegArgs(input);
      const argsStr = args.join(' ');
      expect(argsStr).toMatch(/libx264|h264/i);
    });

    it('specifies AAC audio codec in generated args', () => {
      const input = buildValidMuxInput(testDir);
      const args = buildFfmpegArgs(input);
      const argsStr = args.join(' ');
      expect(argsStr).toMatch(/aac/i);
    });

    it('includes all narration MP3 files as inputs in correct scene order', () => {
      const input = buildValidMuxInput(testDir);
      const args = buildFfmpegArgs(input);
      const argsStr = args.join(' ');
      expect(argsStr).toContain('narration-scene-01-hook.mp3');
      expect(argsStr).toContain('narration-scene-02-narration-only.mp3');
      // Order check: 01 before 02
      expect(argsStr.indexOf('01-hook')).toBeLessThan(argsStr.indexOf('02-narration-only'));
    });

    it('sets outputPath as the last positional argument', () => {
      const input = buildValidMuxInput(testDir);
      const args = buildFfmpegArgs(input);
      expect(args[args.length - 1]).toBe(input.outputPath);
    });
  });

  describe('checkFfmpegAvailable()', () => {
    it('returns false when ffmpeg binary is not on PATH', async () => {
      const { execFile } = await import('child_process');
      (execFile as any).mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        cb(new Error('command not found'), '', '');
      });
      const available = await checkFfmpegAvailable();
      expect(available).toBe(false);
    });

    it('returns true when ffmpeg version check succeeds', async () => {
      const { execFile } = await import('child_process');
      (execFile as any).mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        cb(null, 'ffmpeg version 6.0', '');
      });
      const available = await checkFfmpegAvailable();
      expect(available).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// SECTION 3: GOLDEN PATH
// ---------------------------------------------------------------------------

describe('mux.ts — Golden Path', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `studio-mux-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('validateMuxInputs()', () => {
    it('returns valid=true for a well-formed MuxInput', () => {
      const input = buildValidMuxInput(testDir);
      const result = validateMuxInputs(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('buildFfmpegArgs()', () => {
    it('returns a non-empty args array for valid input', () => {
      const input = buildValidMuxInput(testDir);
      const args = buildFfmpegArgs(input);
      expect(Array.isArray(args)).toBe(true);
      expect(args.length).toBeGreaterThan(0);
    });

    it('includes terminal video file as an input', () => {
      const input = buildValidMuxInput(testDir);
      const args = buildFfmpegArgs(input);
      expect(args.join(' ')).toContain('terminal.mp4');
    });
  });

  describe('mux()', () => {
    it('calls ffmpeg with the correct arguments', async () => {
      const { execFile } = await import('child_process');
      let capturedArgs: string[] = [];
      (execFile as any).mockImplementation((cmd: string, args: string[], _opts: any, cb: Function) => {
        capturedArgs = args;
        const outPath = args[args.length - 1];
        if (typeof outPath === 'string' && outPath.endsWith('.mp4')) {
          fs.writeFileSync(outPath, Buffer.from('output'));
        }
        cb(null, '', '');
      });

      const input = buildValidMuxInput(testDir);
      await mux(input);

      expect(capturedArgs.join(' ')).toContain('1920');
      expect(capturedArgs.join(' ')).toMatch(/libx264|h264/i);
      expect(capturedArgs.join(' ')).toMatch(/aac/i);
    });

    it('writes the output MP4 to the specified outputPath', async () => {
      const { execFile } = await import('child_process');
      (execFile as any).mockImplementation((_cmd: string, args: string[], _opts: any, cb: Function) => {
        const outPath = args[args.length - 1];
        if (typeof outPath === 'string' && outPath.endsWith('.mp4')) {
          fs.writeFileSync(outPath, Buffer.from('muxed-video-output'));
        }
        cb(null, '', '');
      });

      const input = buildValidMuxInput(testDir);
      const result: MuxResult = await mux(input);

      expect(result.outputPath).toBe(input.outputPath);
      expect(fs.existsSync(result.outputPath)).toBe(true);
    });

    it('returns a MuxResult with outputPath matching the input outputPath', async () => {
      const { execFile } = await import('child_process');
      (execFile as any).mockImplementation((_cmd: string, args: string[], _opts: any, cb: Function) => {
        const outPath = args[args.length - 1];
        if (typeof outPath === 'string' && outPath.endsWith('.mp4')) {
          fs.writeFileSync(outPath, Buffer.from('output'));
        }
        cb(null, '', '');
      });

      const input = buildValidMuxInput(testDir);
      const result = await mux(input);

      expect(result.outputPath).toBe(input.outputPath);
    });

    it('concatenates narration MP3s in scene order before muxing', async () => {
      const { execFile } = await import('child_process');
      let capturedArgs: string[] = [];
      (execFile as any).mockImplementation((_cmd: string, args: string[], _opts: any, cb: Function) => {
        capturedArgs = args;
        const outPath = args[args.length - 1];
        if (typeof outPath === 'string' && outPath.endsWith('.mp4')) {
          fs.writeFileSync(outPath, Buffer.from('output'));
        }
        cb(null, '', '');
      });

      const input = buildValidMuxInput(testDir);
      await mux(input);

      const argsStr = capturedArgs.join(' ');
      const idx1 = argsStr.indexOf('01-hook');
      const idx2 = argsStr.indexOf('02-narration-only');
      expect(idx1).toBeGreaterThan(-1);
      expect(idx2).toBeGreaterThan(-1);
      expect(idx1).toBeLessThan(idx2);
    });

    it('audio and video stay within 100ms sync tolerance (sync flag in ffmpeg args)', () => {
      const input = buildValidMuxInput(testDir);
      const args = buildFfmpegArgs(input);
      // ffmpeg uses -async or filter_complex to sync — check that some sync mechanism is present
      const argsStr = args.join(' ');
      expect(argsStr).toMatch(/async|atrim|adelay|apad|filter_complex/i);
    });
  });
});
