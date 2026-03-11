/**
 * Unit Tests for Studio CLI Entry Point
 *
 * Tests the cli.ts module that exposes `npx mg-studio compile <script> [output-dir]`.
 * WS-STUDIO-1: YouTube production pipeline tooling
 *
 * Test order: misuse → boundary → golden path
 * @target 99% coverage on cli.ts
 *
 * Design contract enforced by these tests:
 *   cli.ts exports `main(argv: string[]): Promise<void>`
 *   main() calls compile() from compiler.ts
 *   main() calls process.exit(0) on success
 *   main() calls process.exit(1) + writes to stderr on error
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Mock compiler so tests stay unit-level
// ---------------------------------------------------------------------------
vi.mock('../../src/studio/compiler', () => ({
  compile: vi.fn(),
}));

import { main } from '../../src/studio/cli';
import { compile } from '../../src/studio/compiler';

const mockCompile = compile as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function captureExit(): { exitCode: number | null; restore: () => void } {
  const state: { exitCode: number | null } = { exitCode: null };
  const original = process.exit.bind(process);
  // @ts-expect-error — override for testing
  process.exit = (code?: number) => {
    state.exitCode = code ?? 0;
    throw new ExitError(code ?? 0);
  };
  return {
    exitCode: state.exitCode,
    restore: () => {
      // @ts-expect-error — restore
      process.exit = original;
    },
  };
}

class ExitError extends Error {
  constructor(public code: number) {
    super(`process.exit(${code})`);
    this.name = 'ExitError';
  }
}

function captureStderr(): { messages: string[]; restore: () => void } {
  const messages: string[] = [];
  const original = process.stderr.write.bind(process.stderr);
  process.stderr.write = (chunk: string | Buffer): boolean => {
    messages.push(typeof chunk === 'string' ? chunk : chunk.toString());
    return true;
  };
  return {
    messages,
    restore: () => {
      process.stderr.write = original;
    },
  };
}

async function runMain(argv: string[]): Promise<{ exitCode: number; stderrOutput: string }> {
  const stderrCapture = captureStderr();
  let exitCode = 0;

  try {
    await main(argv);
  } catch (err) {
    if (err instanceof ExitError) {
      exitCode = err.code;
    } else {
      stderrCapture.restore();
      throw err;
    }
  }

  stderrCapture.restore();
  return { exitCode, stderrOutput: stderrCapture.messages.join('') };
}

// ---------------------------------------------------------------------------
// SECTION 1: MISUSE CASES
// ---------------------------------------------------------------------------

describe('cli.ts — Misuse Cases', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `studio-cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    vi.clearAllMocks();

    // Install process.exit override before each test
    const original = process.exit.bind(process);
    // @ts-expect-error — override for testing
    process.exit = (code?: number) => {
      throw new ExitError(code ?? 0);
    };
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
    // Restore process.exit by clearing the override
    // (runMain's captureExit handles individual test restores)
  });

  describe('missing subcommand', () => {
    it('exits 1 when no arguments are provided (just node + script)', async () => {
      const result = await runMain(['node', 'cli.js']);
      expect(result.exitCode).toBe(1);
    });

    it('writes usage info to stderr when no subcommand given', async () => {
      const result = await runMain(['node', 'cli.js']);
      const lower = result.stderrOutput.toLowerCase();
      expect(lower).toMatch(/usage|subcommand|compile/);
    });

    it('does not call compile() when no subcommand given', async () => {
      await runMain(['node', 'cli.js']);
      expect(mockCompile).not.toHaveBeenCalled();
    });
  });

  describe('unknown subcommand', () => {
    it('exits 1 when subcommand is "foo"', async () => {
      const result = await runMain(['node', 'cli.js', 'foo']);
      expect(result.exitCode).toBe(1);
    });

    it('writes stderr mentioning the unknown subcommand or usage', async () => {
      const result = await runMain(['node', 'cli.js', 'foo']);
      const lower = result.stderrOutput.toLowerCase();
      expect(lower).toMatch(/unknown|usage|foo/);
    });

    it('exits 1 for subcommand "run" (not a valid command)', async () => {
      const result = await runMain(['node', 'cli.js', 'run']);
      expect(result.exitCode).toBe(1);
    });

    it('does not call compile() for unknown subcommands', async () => {
      await runMain(['node', 'cli.js', 'bar']);
      expect(mockCompile).not.toHaveBeenCalled();
    });
  });

  describe('compile subcommand — missing script path', () => {
    it('exits 1 when "compile" is given with no script path', async () => {
      const result = await runMain(['node', 'cli.js', 'compile']);
      expect(result.exitCode).toBe(1);
    });

    it('writes stderr mentioning script path is required', async () => {
      const result = await runMain(['node', 'cli.js', 'compile']);
      const lower = result.stderrOutput.toLowerCase();
      expect(lower).toMatch(/script|path|required|missing|usage/);
    });

    it('does not call compile() when script path is missing', async () => {
      await runMain(['node', 'cli.js', 'compile']);
      expect(mockCompile).not.toHaveBeenCalled();
    });
  });

  describe('compile subcommand — compile() throws', () => {
    it('exits 1 when compile() rejects with an error', async () => {
      mockCompile.mockRejectedValue(new Error('Script validation failed:\nMissing required field: episode_id'));
      const scriptPath = path.join(testDir, 'script.yaml');
      fs.writeFileSync(scriptPath, 'placeholder');

      const result = await runMain(['node', 'cli.js', 'compile', scriptPath]);
      expect(result.exitCode).toBe(1);
    });

    it('writes the error message to stderr when compile() rejects', async () => {
      mockCompile.mockRejectedValue(new Error('Script validation failed'));
      const scriptPath = path.join(testDir, 'script.yaml');
      fs.writeFileSync(scriptPath, 'placeholder');

      const result = await runMain(['node', 'cli.js', 'compile', scriptPath]);
      expect(result.stderrOutput.toLowerCase()).toMatch(/error|failed|script/);
    });
  });
});

// ---------------------------------------------------------------------------
// SECTION 2: BOUNDARY CASES
// ---------------------------------------------------------------------------

describe('cli.ts — Boundary Cases', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `studio-cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    vi.clearAllMocks();

    // @ts-expect-error — override for testing
    process.exit = (code?: number) => {
      throw new ExitError(code ?? 0);
    };
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('output directory handling', () => {
    it('uses explicit output-dir when provided as third argument', async () => {
      const scriptPath = path.join(testDir, 'script.yaml');
      const outputDir = path.join(testDir, 'out');
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(scriptPath, 'placeholder');

      mockCompile.mockResolvedValue({ tapePath: path.join(outputDir, 'ep01.tape'), sceneCount: 2 });

      const result = await runMain(['node', 'cli.js', 'compile', scriptPath, outputDir]);
      expect(result.exitCode).toBe(0);
      // compile should have been called with the script path and a path inside outputDir
      expect(mockCompile).toHaveBeenCalledWith(
        scriptPath,
        expect.stringContaining(outputDir),
      );
    });

    it('derives output path from script directory when no output-dir given', async () => {
      const scriptPath = path.join(testDir, 'script.yaml');
      fs.writeFileSync(scriptPath, 'placeholder');

      mockCompile.mockResolvedValue({ tapePath: path.join(testDir, 'script.tape'), sceneCount: 1 });

      await runMain(['node', 'cli.js', 'compile', scriptPath]);
      // compile should be called with a path that shares the script's directory
      expect(mockCompile).toHaveBeenCalledWith(scriptPath, expect.any(String));
      const calledOutput: string = mockCompile.mock.calls[0][1];
      expect(calledOutput.startsWith(testDir) || calledOutput.endsWith('.tape')).toBe(true);
    });

    it('handles script path that already has .yaml extension', async () => {
      const scriptPath = path.join(testDir, 'ep02.yaml');
      fs.writeFileSync(scriptPath, 'placeholder');
      mockCompile.mockResolvedValue({ tapePath: path.join(testDir, 'ep02.tape'), sceneCount: 3 });

      const result = await runMain(['node', 'cli.js', 'compile', scriptPath]);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('success feedback', () => {
    it('does not write to stderr on success', async () => {
      const scriptPath = path.join(testDir, 'script.yaml');
      fs.writeFileSync(scriptPath, 'placeholder');
      mockCompile.mockResolvedValue({ tapePath: path.join(testDir, 'ep01.tape'), sceneCount: 2 });

      const result = await runMain(['node', 'cli.js', 'compile', scriptPath]);
      // stderr should be empty on success
      expect(result.stderrOutput).toBe('');
    });

    it('calls compile() exactly once for a single compile invocation', async () => {
      const scriptPath = path.join(testDir, 'script.yaml');
      fs.writeFileSync(scriptPath, 'placeholder');
      mockCompile.mockResolvedValue({ tapePath: path.join(testDir, 'ep01.tape'), sceneCount: 1 });

      await runMain(['node', 'cli.js', 'compile', scriptPath]);
      expect(mockCompile).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// SECTION 3: GOLDEN PATH
// ---------------------------------------------------------------------------

describe('cli.ts — Golden Path', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `studio-cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    vi.clearAllMocks();

    // @ts-expect-error — override for testing
    process.exit = (code?: number) => {
      throw new ExitError(code ?? 0);
    };
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('compile subcommand — happy path', () => {
    it('exits 0 for a valid compile invocation', async () => {
      const scriptPath = path.join(testDir, 'script.yaml');
      fs.writeFileSync(scriptPath, 'placeholder');
      mockCompile.mockResolvedValue({ tapePath: path.join(testDir, 'ep01.tape'), sceneCount: 3 });

      const result = await runMain(['node', 'cli.js', 'compile', scriptPath]);
      expect(result.exitCode).toBe(0);
    });

    it('passes the correct script path to compile()', async () => {
      const scriptPath = path.join(testDir, 'script.yaml');
      fs.writeFileSync(scriptPath, 'placeholder');
      mockCompile.mockResolvedValue({ tapePath: path.join(testDir, 'ep01.tape'), sceneCount: 2 });

      await runMain(['node', 'cli.js', 'compile', scriptPath]);
      expect(mockCompile).toHaveBeenCalledWith(scriptPath, expect.any(String));
    });

    it('exits 0 with explicit output directory', async () => {
      const scriptPath = path.join(testDir, 'script.yaml');
      const outputDir = path.join(testDir, 'dist');
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(scriptPath, 'placeholder');
      mockCompile.mockResolvedValue({ tapePath: path.join(outputDir, 'ep01.tape'), sceneCount: 4 });

      const result = await runMain(['node', 'cli.js', 'compile', scriptPath, outputDir]);
      expect(result.exitCode).toBe(0);
    });

    it('passes output path inside the specified output directory', async () => {
      const scriptPath = path.join(testDir, 'ep02.yaml');
      const outputDir = path.join(testDir, 'out');
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(scriptPath, 'placeholder');
      mockCompile.mockResolvedValue({ tapePath: path.join(outputDir, 'ep02.tape'), sceneCount: 3 });

      await runMain(['node', 'cli.js', 'compile', scriptPath, outputDir]);
      const calledOutput: string = mockCompile.mock.calls[0][1];
      expect(calledOutput).toContain(outputDir);
    });

    it('output path ends with .tape extension', async () => {
      const scriptPath = path.join(testDir, 'script.yaml');
      fs.writeFileSync(scriptPath, 'placeholder');
      mockCompile.mockResolvedValue({ tapePath: path.join(testDir, 'ep01.tape'), sceneCount: 2 });

      await runMain(['node', 'cli.js', 'compile', scriptPath]);
      const calledOutput: string = mockCompile.mock.calls[0][1];
      expect(calledOutput.endsWith('.tape')).toBe(true);
    });
  });

  describe('exported main() function contract', () => {
    it('exports main as an async function', async () => {
      const mod = await import('../../src/studio/cli');
      expect(typeof mod.main).toBe('function');
    });

    it('main() returns a Promise', () => {
      const scriptPath = path.join(testDir, 'script.yaml');
      fs.writeFileSync(scriptPath, 'placeholder');
      mockCompile.mockResolvedValue({ tapePath: path.join(testDir, 'ep01.tape'), sceneCount: 1 });

      const result = main(['node', 'cli.js', 'compile', scriptPath]);
      expect(result).toBeInstanceOf(Promise);
      // consume the promise to avoid unhandled rejection
      return result.catch(() => {});
    });
  });
});
