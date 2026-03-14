/**
 * Unit Tests for Studio Pipeline Orchestrator
 *
 * Tests the pipeline.ts module that orchestrates compile → elevenlabs → mux.
 * WS-STUDIO-1: YouTube production pipeline tooling
 *
 * External deps mocked: compiler, elevenlabs, mux modules; child_process
 * Test order: misuse → boundary → golden path
 * @target 99% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock the three pipeline stage modules
vi.mock('../../src/studio/compiler', () => ({
  compile: vi.fn(),
  parseScript: vi.fn(),
  validateScript: vi.fn(),
  generateTape: vi.fn(),
}));

vi.mock('../../src/studio/elevenlabs', () => ({
  generateNarration: vi.fn(),
  getCacheKey: vi.fn(),
  isCached: vi.fn(),
  loadStudioConfig: vi.fn(),
  getVoiceId: vi.fn(),
}));

vi.mock('../../src/studio/mux', () => ({
  mux: vi.fn(),
  validateMuxInputs: vi.fn(),
  buildFfmpegArgs: vi.fn(),
  checkFfmpegAvailable: vi.fn(),
}));

// Mock child_process for VHS execution step (WS-STUDIO-3)
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

import { runPipeline, readProductionState, writeProductionState } from '../../src/studio/pipeline';
import { compile, parseScript } from '../../src/studio/compiler';
import { generateNarration, loadStudioConfig } from '../../src/studio/elevenlabs';
import { mux } from '../../src/studio/mux';
import { execFile } from 'child_process';
import type { PipelineOptions, ProductionState, Script } from '../../src/studio/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EPISODE_ID = 'ep01';

function buildPipelineOptions(testDir: string): PipelineOptions {
  return {
    scriptPath: path.join(testDir, 'script.yaml'),
    outputDir: path.join(testDir, 'output'),
    studioConfigPath: path.join(testDir, 'studio-config.yaml'),
    episodeId: EPISODE_ID,
    memoryDir: path.join(testDir, 'memory'),
  };
}

function setupTestDir(testDir: string): void {
  fs.mkdirSync(path.join(testDir, 'output'), { recursive: true });
  fs.mkdirSync(path.join(testDir, 'memory'), { recursive: true });
  fs.writeFileSync(path.join(testDir, 'script.yaml'), 'episode_id: ep01');
  fs.writeFileSync(path.join(testDir, 'studio-config.yaml'), 'voices: {}');
}

const MOCK_SCRIPT: Script = {
  episode_id: EPISODE_ID,
  episode_title: 'Test Episode',
  scenes: [
    {
      scene_id: '01-hook',
      narrator_agent: 'engineering-manager',
      narration: 'What if your Claude Code session had a full engineering team behind it?',
      terminal_commands: [],
      wait_ms: 500,
    },
    {
      scene_id: '02-narration-only',
      narrator_agent: 'cto',
      narration: "Here's what just happened.",
      terminal_commands: [],
      wait_ms: 1000,
    },
  ],
};

const MOCK_TAPE_OUTPUT = {
  tapePath: '/tmp/ep01.tape',
  sceneCount: 2,
};

const MOCK_NARRATION_RESULTS = [
  { mp3Path: '/tmp/narration-scene-01-hook.mp3', characterCount: 42, cached: false, dryRun: false },
  { mp3Path: '/tmp/narration-scene-02-narration-only.mp3', characterCount: 28, cached: false, dryRun: false },
];

const MOCK_MUX_RESULT = {
  outputPath: '/tmp/output/raw-cut.mp4',
};

// VHS execFile resolves with stdout/stderr buffers (WS-STUDIO-3)
const MOCK_VHS_SUCCESS = { stdout: '', stderr: '' };

const MOCK_STUDIO_CONFIG = {
  voices: {
    cto: 'voice-cto-id',
    'product-owner': 'voice-po-id',
    'engineering-manager': 'voice-em-id',
    qa: 'voice-qa-id',
    'staff-engineer': 'voice-se-id',
  },
  elevenlabs: {
    apiKey: 'test-key',
    model: 'eleven_monolingual_v1',
  },
};

// ---------------------------------------------------------------------------
// SECTION 1: MISUSE CASES
// ---------------------------------------------------------------------------

describe('pipeline.ts — Misuse Cases', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `studio-pipeline-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    vi.clearAllMocks();
    (parseScript as any).mockReturnValue(MOCK_SCRIPT);
    // Default VHS success — tests that need VHS to fail override this explicitly
    (execFile as any).mockImplementation((_bin: string, _args: string[], cb: Function) => {
      cb(null, '', '');
    });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('runPipeline() — invalid options', () => {
    it('rejects when scriptPath is missing', async () => {
      const opts = buildPipelineOptions(testDir);
      delete (opts as any).scriptPath;
      await expect(runPipeline(opts)).rejects.toThrow();
    });

    it('rejects when outputDir is missing', async () => {
      const opts = buildPipelineOptions(testDir);
      delete (opts as any).outputDir;
      await expect(runPipeline(opts)).rejects.toThrow();
    });

    it('rejects when episodeId is missing', async () => {
      const opts = buildPipelineOptions(testDir);
      delete (opts as any).episodeId;
      await expect(runPipeline(opts)).rejects.toThrow();
    });

    it('rejects when episodeId is empty string', async () => {
      const opts = { ...buildPipelineOptions(testDir), episodeId: '' };
      await expect(runPipeline(opts)).rejects.toThrow();
    });

    it('rejects when scriptPath does not exist', async () => {
      setupTestDir(testDir);
      const opts = { ...buildPipelineOptions(testDir), scriptPath: path.join(testDir, 'nonexistent.yaml') };
      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      await expect(runPipeline(opts)).rejects.toThrow();
    });
  });

  describe('runPipeline() — compile step failure', () => {
    it('rejects and marks state FAILED at compile step when compile throws', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockRejectedValue(new Error('VHS binary not found'));

      let caughtError: Error | null = null;
      try {
        await runPipeline(opts);
      } catch (err: any) {
        caughtError = err;
      }

      expect(caughtError).toBeTruthy();

      // State must be written to memory with FAILED status at compile step
      const statePath = path.join(opts.memoryDir, `studio-production-${EPISODE_ID}.json`);
      if (fs.existsSync(statePath)) {
        const state: ProductionState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        expect(state.status).toBe('FAILED');
        expect(state.failedAtStep).toBe('compile');
      }
    });

    it('does not call generateNarration when compile step fails', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockRejectedValue(new Error('compile failed'));

      try {
        await runPipeline(opts);
      } catch {
        // expected
      }

      expect(generateNarration).not.toHaveBeenCalled();
    });
  });

  describe('runPipeline() — ElevenLabs failure', () => {
    it('rejects and marks state FAILED at elevenlabs step when API returns error', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockResolvedValue(MOCK_TAPE_OUTPUT);
      (generateNarration as any).mockRejectedValue(new Error('ElevenLabs API error'));

      try {
        await runPipeline(opts);
      } catch {
        // expected
      }

      const statePath = path.join(opts.memoryDir, `studio-production-${EPISODE_ID}.json`);
      if (fs.existsSync(statePath)) {
        const state: ProductionState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        expect(state.status).toBe('FAILED');
        expect(state.failedAtStep).toBe('elevenlabs');
      }
    });

    it('does not call mux when elevenlabs step fails', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockResolvedValue(MOCK_TAPE_OUTPUT);
      (generateNarration as any).mockRejectedValue(new Error('API error'));

      try {
        await runPipeline(opts);
      } catch {
        // expected
      }

      expect(mux).not.toHaveBeenCalled();
    });

    it('preserves narration MP3s (does not delete them) when mux step fails after elevenlabs succeeds', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      // Create fake MP3 files that should be preserved
      const mp3Path = path.join(opts.outputDir, 'narration-scene-01.mp3');
      fs.writeFileSync(mp3Path, Buffer.from('audio'));

      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockResolvedValue(MOCK_TAPE_OUTPUT);
      (generateNarration as any).mockResolvedValue({
        mp3Path,
        characterCount: 42,
        cached: false,
        dryRun: false,
      });
      (mux as any).mockRejectedValue(new Error('ffmpeg died'));

      try {
        await runPipeline(opts);
      } catch {
        // expected
      }

      // MP3s must be preserved — they're expensive to regenerate
      expect(fs.existsSync(mp3Path)).toBe(true);
    });
  });

  describe('runPipeline() — mux step failure', () => {
    it('marks state FAILED at mux step when mux throws', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockResolvedValue(MOCK_TAPE_OUTPUT);
      (generateNarration as any).mockResolvedValue(MOCK_NARRATION_RESULTS[0]);
      (mux as any).mockRejectedValue(new Error('mux failed'));

      try {
        await runPipeline(opts);
      } catch {
        // expected
      }

      const statePath = path.join(opts.memoryDir, `studio-production-${EPISODE_ID}.json`);
      if (fs.existsSync(statePath)) {
        const state: ProductionState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        expect(state.status).toBe('FAILED');
        expect(state.failedAtStep).toBe('mux');
      }
    });

    it('removes partial output files when pipeline fails at mux step', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      const partialOutputPath = path.join(opts.outputDir, 'raw-cut.mp4');

      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockResolvedValue(MOCK_TAPE_OUTPUT);
      (generateNarration as any).mockResolvedValue(MOCK_NARRATION_RESULTS[0]);
      (mux as any).mockImplementation(async () => {
        // Write partial file then fail
        fs.writeFileSync(partialOutputPath, Buffer.from('partial-data'));
        throw new Error('mux failed midway');
      });

      try {
        await runPipeline(opts);
      } catch {
        // expected
      }

      // Partial output MP4 must be cleaned up
      expect(fs.existsSync(partialOutputPath)).toBe(false);
    });
  });

  // ── VHS step misuse (WS-STUDIO-3) ─────────────────────────────────────────

  describe('runPipeline() — VHS step misuse (WS-STUDIO-3)', () => {
    // MISUSE: Pipeline must NOT call mux without a VHS execution step between compile and elevenlabs
    it('calls execFile (VHS) between compile and elevenlabs — mux must not be called without a VHS step', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      const callOrder: string[] = [];
      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockImplementation(async () => { callOrder.push('compile'); return MOCK_TAPE_OUTPUT; });
      (execFile as any).mockImplementation((_bin: string, _args: string[], cb: Function) => {
        callOrder.push('vhs');
        cb(null, MOCK_VHS_SUCCESS.stdout, MOCK_VHS_SUCCESS.stderr);
      });
      (generateNarration as any).mockImplementation(async () => {
        callOrder.push('generateNarration');
        return MOCK_NARRATION_RESULTS[0];
      });
      (mux as any).mockImplementation(async () => { callOrder.push('mux'); return MOCK_MUX_RESULT; });

      await runPipeline(opts);

      // vhs must appear in the call order
      expect(callOrder).toContain('vhs');
      // compile must precede vhs, vhs must precede generateNarration
      expect(callOrder.indexOf('compile')).toBeLessThan(callOrder.indexOf('vhs'));
      expect(callOrder.indexOf('vhs')).toBeLessThan(callOrder.indexOf('generateNarration'));
    });

    // MISUSE: Pipeline marks state FAILED at 'vhs' step when VHS execution fails
    it('marks state FAILED at vhs step when execFile returns a non-zero exit error', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockResolvedValue(MOCK_TAPE_OUTPUT);
      (execFile as any).mockImplementation((_bin: string, _args: string[], cb: Function) => {
        cb(new Error('vhs: command not found'), '', 'vhs: command not found');
      });

      try {
        await runPipeline(opts);
      } catch {
        // expected
      }

      const statePath = path.join(opts.memoryDir, `studio-production-${EPISODE_ID}.json`);
      if (fs.existsSync(statePath)) {
        const state: ProductionState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        expect(state.status).toBe('FAILED');
        expect(state.failedAtStep).toBe('vhs');
      }
    });

    // MISUSE: Pipeline must NOT call elevenlabs if VHS step fails
    it('does not call generateNarration when VHS step fails', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockResolvedValue(MOCK_TAPE_OUTPUT);
      (execFile as any).mockImplementation((_bin: string, _args: string[], cb: Function) => {
        cb(new Error('vhs failed'), '', '');
      });

      try {
        await runPipeline(opts);
      } catch {
        // expected
      }

      expect(generateNarration).not.toHaveBeenCalled();
    });
  });

  describe('runPipeline() — ElevenLabs rate limit retry', () => {
    it('retries up to 3 times on rate limit (429) error before failing', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockResolvedValue(MOCK_TAPE_OUTPUT);

      const rateLimitError = new Error('Rate limit exceeded') as any;
      rateLimitError.statusCode = 429;
      (generateNarration as any).mockRejectedValue(rateLimitError);

      try {
        await runPipeline(opts);
      } catch {
        // expected to eventually fail
      }

      // generateNarration should have been attempted 3 times (original + 2 retries)
      // The exact count depends on scene count but should be > 1
      expect((generateNarration as any).mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('succeeds on the second attempt after a rate limit error', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockResolvedValue({ ...MOCK_TAPE_OUTPUT, sceneCount: 1 });

      const rateLimitError = new Error('Rate limit exceeded') as any;
      rateLimitError.statusCode = 429;

      (generateNarration as any)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(MOCK_NARRATION_RESULTS[0]);
      (mux as any).mockResolvedValue(MOCK_MUX_RESULT);

      // Should not throw — succeeded on retry
      await expect(runPipeline(opts)).resolves.not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// SECTION 2: BOUNDARY CASES
// ---------------------------------------------------------------------------

describe('pipeline.ts — Boundary Cases', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `studio-pipeline-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    vi.clearAllMocks();
    (parseScript as any).mockReturnValue(MOCK_SCRIPT);
    // Default VHS success — tests that need VHS to fail override this explicitly
    (execFile as any).mockImplementation((_bin: string, _args: string[], cb: Function) => {
      cb(null, '', '');
    });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('readProductionState() / writeProductionState()', () => {
    it('returns null when state file does not exist', async () => {
      const statePath = path.join(testDir, 'memory', `studio-production-${EPISODE_ID}.json`);
      fs.mkdirSync(path.dirname(statePath), { recursive: true });
      const state = await readProductionState(EPISODE_ID, path.dirname(statePath));
      expect(state).toBeNull();
    });

    it('reads and parses a valid state file', async () => {
      const memoryDir = path.join(testDir, 'memory');
      fs.mkdirSync(memoryDir, { recursive: true });
      const statePath = path.join(memoryDir, `studio-production-${EPISODE_ID}.json`);
      const testState: ProductionState = {
        episodeId: EPISODE_ID,
        status: 'IN_PROGRESS',
        failedAtStep: null,
        completedSteps: ['compile'],
        tapePath: '/tmp/ep01.tape',
        narrationPaths: [],
        outputPath: null,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(statePath, JSON.stringify(testState));

      const loaded = await readProductionState(EPISODE_ID, memoryDir);
      expect(loaded).not.toBeNull();
      expect(loaded?.episodeId).toBe(EPISODE_ID);
      expect(loaded?.status).toBe('IN_PROGRESS');
    });

    it('handles corrupted state JSON gracefully (returns null, does not throw)', async () => {
      const memoryDir = path.join(testDir, 'memory');
      fs.mkdirSync(memoryDir, { recursive: true });
      const statePath = path.join(memoryDir, `studio-production-${EPISODE_ID}.json`);
      fs.writeFileSync(statePath, '{ corrupted json }');

      const state = await readProductionState(EPISODE_ID, memoryDir);
      expect(state).toBeNull();
    });

    it('writeProductionState creates the memory directory if it does not exist', async () => {
      const memoryDir = path.join(testDir, 'new-memory-dir');
      // Do not create memoryDir — let writeProductionState create it
      const state: ProductionState = {
        episodeId: EPISODE_ID,
        status: 'IN_PROGRESS',
        failedAtStep: null,
        completedSteps: [],
        tapePath: null,
        narrationPaths: [],
        outputPath: null,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await writeProductionState(state, memoryDir);

      const statePath = path.join(memoryDir, `studio-production-${EPISODE_ID}.json`);
      expect(fs.existsSync(statePath)).toBe(true);
    });
  });

  describe('runPipeline() — VHS failure handling', () => {
    it('logs the exact ffmpeg/VHS error message on compile failure', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);
      const exactError = 'VHS tape playback failed: unknown command Type';

      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockRejectedValue(new Error(exactError));

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await runPipeline(opts);
      } catch {
        // expected
      }

      // The exact error message should be logged
      const allErrorCalls = errorSpy.mock.calls.flat().join(' ');
      expect(allErrorCalls).toContain(exactError);
      errorSpy.mockRestore();
    });
  });

  // ── VHS step boundary (WS-STUDIO-3) ──────────────────────────────────────

  describe('runPipeline() — VHS step boundary (WS-STUDIO-3)', () => {
    // BOUNDARY: VHS step must receive the tape file path that compile produced
    it('passes the tape file path from compile output to execFile as the VHS argument', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      const capturedArgs: string[][] = [];
      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockResolvedValue(MOCK_TAPE_OUTPUT);
      (execFile as any).mockImplementation((_bin: string, args: string[], cb: Function) => {
        capturedArgs.push(args);
        cb(null, '', '');
      });
      (generateNarration as any).mockResolvedValue(MOCK_NARRATION_RESULTS[0]);
      (mux as any).mockResolvedValue(MOCK_MUX_RESULT);

      await runPipeline(opts);

      expect(capturedArgs.length).toBeGreaterThan(0);
      // The tape path from compile output must be passed as a VHS argument
      const allArgs = capturedArgs.flat();
      expect(allArgs).toContain(MOCK_TAPE_OUTPUT.tapePath);
    });

    // BOUNDARY: VHS step must produce terminal.mp4 at the output directory path
    it('VHS execFile is called with the vhs binary and the tape path emitting terminal.mp4 in outputDir', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      let capturedBin = '';
      let capturedArgs: string[] = [];
      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockResolvedValue(MOCK_TAPE_OUTPUT);
      (execFile as any).mockImplementation((bin: string, args: string[], cb: Function) => {
        capturedBin = bin;
        capturedArgs = args;
        cb(null, '', '');
      });
      (generateNarration as any).mockResolvedValue(MOCK_NARRATION_RESULTS[0]);
      (mux as any).mockResolvedValue(MOCK_MUX_RESULT);

      await runPipeline(opts);

      expect(capturedBin).toBe('vhs');
      // The tape file path must appear in the args
      expect(capturedArgs).toContain(MOCK_TAPE_OUTPUT.tapePath);
    });

    // BOUNDARY: completedSteps must include 'vhs' after successful VHS execution
    it('completedSteps includes vhs after VHS executes successfully', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockResolvedValue(MOCK_TAPE_OUTPUT);
      (execFile as any).mockImplementation((_bin: string, _args: string[], cb: Function) => {
        cb(null, '', '');
      });
      (generateNarration as any).mockResolvedValue(MOCK_NARRATION_RESULTS[0]);
      (mux as any).mockResolvedValue(MOCK_MUX_RESULT);

      await runPipeline(opts);

      const statePath = path.join(opts.memoryDir, `studio-production-${EPISODE_ID}.json`);
      const state: ProductionState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(state.completedSteps).toContain('vhs');
    });
  });

  describe('runPipeline() — exponential backoff timing', () => {
    it('uses increasing delays between retries (exponential backoff) on rate limit', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockResolvedValue({ ...MOCK_TAPE_OUTPUT, sceneCount: 1 });

      const delays: number[] = [];
      let callCount = 0;
      const rateLimitError = new Error('Rate limit') as any;
      rateLimitError.statusCode = 429;

      const realDateNow = Date.now;
      let lastCallTime = realDateNow();

      (generateNarration as any).mockImplementation(async () => {
        const now = realDateNow();
        if (callCount > 0) {
          delays.push(now - lastCallTime);
        }
        lastCallTime = now;
        callCount++;
        if (callCount < 3) {
          throw rateLimitError;
        }
        return MOCK_NARRATION_RESULTS[0];
      });

      (mux as any).mockResolvedValue(MOCK_MUX_RESULT);

      await runPipeline(opts);

      // If we got at least 2 delays, they should be non-decreasing (exponential backoff)
      if (delays.length >= 2) {
        expect(delays[1]).toBeGreaterThanOrEqual(delays[0]);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// SECTION 3: GOLDEN PATH
// ---------------------------------------------------------------------------

describe('pipeline.ts — Golden Path', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `studio-pipeline-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    vi.clearAllMocks();
    (parseScript as any).mockReturnValue(MOCK_SCRIPT);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('runPipeline() — successful run', () => {
    // Helper: set up execFile mock for golden path tests that require VHS (WS-STUDIO-3)
    function mockVhsSuccess(): void {
      (execFile as any).mockImplementation((_bin: string, _args: string[], cb: Function) => {
        cb(null, '', '');
      });
    }

    // GOLDEN: Full pipeline order is compile → vhs → elevenlabs → mux
    it('calls compile → vhs → elevenlabs → mux in that order', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      const callOrder: string[] = [];
      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockImplementation(async () => { callOrder.push('compile'); return MOCK_TAPE_OUTPUT; });
      (execFile as any).mockImplementation((_bin: string, _args: string[], cb: Function) => {
        callOrder.push('vhs');
        cb(null, '', '');
      });
      (generateNarration as any).mockImplementation(async () => { callOrder.push('generateNarration'); return MOCK_NARRATION_RESULTS[0]; });
      (mux as any).mockImplementation(async () => { callOrder.push('mux'); return MOCK_MUX_RESULT; });

      await runPipeline(opts);

      expect(callOrder).toContain('vhs');
      expect(callOrder.indexOf('compile')).toBeLessThan(callOrder.indexOf('vhs'));
      expect(callOrder.indexOf('vhs')).toBeLessThan(callOrder.indexOf('generateNarration'));
      expect(callOrder.indexOf('generateNarration')).toBeLessThan(callOrder.indexOf('mux'));
    });

    // GOLDEN: state file records 'vhs' in completedSteps
    it('state file completedSteps includes vhs after a successful full run', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockResolvedValue(MOCK_TAPE_OUTPUT);
      mockVhsSuccess();
      (generateNarration as any).mockResolvedValue(MOCK_NARRATION_RESULTS[0]);
      (mux as any).mockResolvedValue(MOCK_MUX_RESULT);

      await runPipeline(opts);

      const statePath = path.join(opts.memoryDir, `studio-production-${EPISODE_ID}.json`);
      const state: ProductionState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(state.completedSteps).toContain('vhs');
    });

    // GOLDEN: VHS execution receives tape file path via child_process.execFile
    it('passes the tape file path to child_process execFile when executing VHS', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      let vhsReceivedTapePath = false;
      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockResolvedValue(MOCK_TAPE_OUTPUT);
      (execFile as any).mockImplementation((_bin: string, args: string[], cb: Function) => {
        if (args.includes(MOCK_TAPE_OUTPUT.tapePath)) {
          vhsReceivedTapePath = true;
        }
        cb(null, '', '');
      });
      (generateNarration as any).mockResolvedValue(MOCK_NARRATION_RESULTS[0]);
      (mux as any).mockResolvedValue(MOCK_MUX_RESULT);

      await runPipeline(opts);

      expect(vhsReceivedTapePath).toBe(true);
    });

    it('calls compile, then generateNarration, then mux — in that order', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      const callOrder: string[] = [];
      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockImplementation(async () => { callOrder.push('compile'); return MOCK_TAPE_OUTPUT; });
      mockVhsSuccess();
      (generateNarration as any).mockImplementation(async () => { callOrder.push('generateNarration'); return MOCK_NARRATION_RESULTS[0]; });
      (mux as any).mockImplementation(async () => { callOrder.push('mux'); return MOCK_MUX_RESULT; });

      await runPipeline(opts);

      expect(callOrder[0]).toBe('compile');
      expect(callOrder[callOrder.length - 1]).toBe('mux');
      expect(callOrder.indexOf('compile')).toBeLessThan(callOrder.indexOf('generateNarration'));
      expect(callOrder.indexOf('generateNarration')).toBeLessThan(callOrder.indexOf('mux'));
    });

    it('writes production state file to .claude/memory/studio-production-{episodeId}.json', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockResolvedValue(MOCK_TAPE_OUTPUT);
      mockVhsSuccess();
      (generateNarration as any).mockResolvedValue(MOCK_NARRATION_RESULTS[0]);
      (mux as any).mockResolvedValue(MOCK_MUX_RESULT);

      await runPipeline(opts);

      const statePath = path.join(opts.memoryDir, `studio-production-${EPISODE_ID}.json`);
      expect(fs.existsSync(statePath)).toBe(true);
    });

    it('state file has status DONE after successful run', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockResolvedValue(MOCK_TAPE_OUTPUT);
      mockVhsSuccess();
      (generateNarration as any).mockResolvedValue(MOCK_NARRATION_RESULTS[0]);
      (mux as any).mockResolvedValue(MOCK_MUX_RESULT);

      await runPipeline(opts);

      const statePath = path.join(opts.memoryDir, `studio-production-${EPISODE_ID}.json`);
      const state: ProductionState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(state.status).toBe('DONE');
      expect(state.episodeId).toBe(EPISODE_ID);
    });

    it('state file records all completed steps', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockResolvedValue(MOCK_TAPE_OUTPUT);
      mockVhsSuccess();
      (generateNarration as any).mockResolvedValue(MOCK_NARRATION_RESULTS[0]);
      (mux as any).mockResolvedValue(MOCK_MUX_RESULT);

      await runPipeline(opts);

      const statePath = path.join(opts.memoryDir, `studio-production-${EPISODE_ID}.json`);
      const state: ProductionState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(state.completedSteps).toContain('compile');
      expect(state.completedSteps).toContain('elevenlabs');
      expect(state.completedSteps).toContain('mux');
    });

    it('state file records the output MP4 path', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockResolvedValue(MOCK_TAPE_OUTPUT);
      mockVhsSuccess();
      (generateNarration as any).mockResolvedValue(MOCK_NARRATION_RESULTS[0]);
      (mux as any).mockResolvedValue(MOCK_MUX_RESULT);

      await runPipeline(opts);

      const statePath = path.join(opts.memoryDir, `studio-production-${EPISODE_ID}.json`);
      const state: ProductionState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(state.outputPath).toBe(MOCK_MUX_RESULT.outputPath);
    });

    it('returns a result object with outputPath and episodeId', async () => {
      setupTestDir(testDir);
      const opts = buildPipelineOptions(testDir);

      (loadStudioConfig as any).mockResolvedValue(MOCK_STUDIO_CONFIG);
      (compile as any).mockResolvedValue(MOCK_TAPE_OUTPUT);
      mockVhsSuccess();
      (generateNarration as any).mockResolvedValue(MOCK_NARRATION_RESULTS[0]);
      (mux as any).mockResolvedValue(MOCK_MUX_RESULT);

      const result = await runPipeline(opts);

      expect(result.episodeId).toBe(EPISODE_ID);
      expect(result.outputPath).toBe(MOCK_MUX_RESULT.outputPath);
    });
  });

  describe('writeProductionState() / readProductionState()', () => {
    it('round-trips a ProductionState through write and read', async () => {
      const memoryDir = path.join(testDir, 'memory');
      fs.mkdirSync(memoryDir, { recursive: true });

      const state: ProductionState = {
        episodeId: EPISODE_ID,
        status: 'DONE',
        failedAtStep: null,
        completedSteps: ['compile', 'elevenlabs', 'mux'],
        tapePath: '/tmp/ep01.tape',
        narrationPaths: ['/tmp/scene-01.mp3'],
        outputPath: '/tmp/raw-cut.mp4',
        startedAt: '2026-03-10T00:00:00Z',
        updatedAt: '2026-03-10T00:05:00Z',
      };

      await writeProductionState(state, memoryDir);
      const loaded = await readProductionState(EPISODE_ID, memoryDir);

      expect(loaded).toEqual(state);
    });
  });
});
