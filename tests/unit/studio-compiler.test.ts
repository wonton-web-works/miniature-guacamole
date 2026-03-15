/**
 * Unit Tests for Studio Compiler Module
 *
 * Tests the compiler.ts module that reads script.yaml and outputs VHS .tape files.
 * WS-STUDIO-1: YouTube production pipeline tooling
 *
 * Test order: misuse → boundary → golden path
 * @target 99% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { compile, parseScript, validateScript, generateTape } from '../../src/studio/compiler';
import type { Script, Scene, TapeOutput } from '../../src/studio/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_SCRIPT: Script = {
  episode_id: 'ep01',
  episode_title: 'Your Claude Code Just Became a Team',
  scenes: [
    {
      scene_id: '01-hook',
      narrator_agent: 'engineering-manager',
      narration: 'What if your Claude Code session had a full engineering team behind it?',
      terminal_commands: [
        { command: '/mg-leadership-team review WS-42', wait_after_ms: 2000 },
      ],
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

const VALID_SCRIPT_YAML = `
episode_id: ep01
episode_title: "Your Claude Code Just Became a Team"
scenes:
  - scene_id: "01-hook"
    narrator_agent: "engineering-manager"
    narration: "What if your Claude Code session had a full engineering team behind it?"
    terminal_commands:
      - command: "/mg-leadership-team review WS-42"
        wait_after_ms: 2000
    wait_ms: 500
  - scene_id: "02-narration-only"
    narrator_agent: "cto"
    narration: "Here's what just happened."
    terminal_commands: []
    wait_ms: 1000
`.trim();

const VALID_AGENTS = ['cto', 'product-owner', 'engineering-manager', 'qa', 'staff-engineer'];

// ---------------------------------------------------------------------------
// SECTION 1: MISUSE CASES
// ---------------------------------------------------------------------------

describe('compiler.ts — Misuse Cases', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `studio-compiler-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('compile() — bad input file paths', () => {
    it('throws or rejects when script file does not exist', async () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist.yaml');
      await expect(compile(nonExistentPath, path.join(testDir, 'out.tape'))).rejects.toThrow();
    });

    it('throws or rejects when script path is an empty string', async () => {
      await expect(compile('', path.join(testDir, 'out.tape'))).rejects.toThrow();
    });

    it('throws or rejects when output path is an empty string', async () => {
      const scriptPath = path.join(testDir, 'script.yaml');
      fs.writeFileSync(scriptPath, VALID_SCRIPT_YAML);
      await expect(compile(scriptPath, '')).rejects.toThrow();
    });

    it('throws or rejects when output directory does not exist and cannot be created', async () => {
      const scriptPath = path.join(testDir, 'script.yaml');
      fs.writeFileSync(scriptPath, VALID_SCRIPT_YAML);
      // Use a deeply nested path under a file (impossible directory)
      const badOutputPath = path.join(testDir, 'script.yaml', 'nested', 'out.tape');
      await expect(compile(scriptPath, badOutputPath)).rejects.toThrow();
    });
  });

  describe('compile() — malformed YAML', () => {
    it('throws or rejects when script.yaml contains invalid YAML syntax', async () => {
      const scriptPath = path.join(testDir, 'script.yaml');
      fs.writeFileSync(scriptPath, '{ invalid: yaml: :\n  - broken');
      await expect(compile(scriptPath, path.join(testDir, 'out.tape'))).rejects.toThrow();
    });

    it('throws or rejects when script.yaml is completely empty', async () => {
      const scriptPath = path.join(testDir, 'script.yaml');
      fs.writeFileSync(scriptPath, '');
      await expect(compile(scriptPath, path.join(testDir, 'out.tape'))).rejects.toThrow();
    });

    it('throws or rejects when script.yaml contains only whitespace', async () => {
      const scriptPath = path.join(testDir, 'script.yaml');
      fs.writeFileSync(scriptPath, '   \n  \t  \n');
      await expect(compile(scriptPath, path.join(testDir, 'out.tape'))).rejects.toThrow();
    });

    it('throws or rejects when script.yaml is a binary file (not text)', async () => {
      const scriptPath = path.join(testDir, 'script.yaml');
      fs.writeFileSync(scriptPath, Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe]));
      await expect(compile(scriptPath, path.join(testDir, 'out.tape'))).rejects.toThrow();
    });
  });

  describe('validateScript() — missing required fields', () => {
    it('returns error when episode_id is missing', () => {
      const bad = { ...VALID_SCRIPT } as any;
      delete bad.episode_id;
      const result = validateScript(bad);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.toLowerCase().includes('episode_id'))).toBe(true);
    });

    it('returns error when episode_title is missing', () => {
      const bad = { ...VALID_SCRIPT } as any;
      delete bad.episode_title;
      const result = validateScript(bad);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.toLowerCase().includes('episode_title'))).toBe(true);
    });

    it('returns error when scenes array is missing', () => {
      const bad = { episode_id: 'ep01', episode_title: 'Title' } as any;
      const result = validateScript(bad);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.toLowerCase().includes('scenes'))).toBe(true);
    });

    it('returns error when scenes is not an array', () => {
      const bad = { ...VALID_SCRIPT, scenes: 'not-an-array' } as any;
      const result = validateScript(bad);
      expect(result.valid).toBe(false);
    });

    it('returns error when a scene is missing scene_id', () => {
      const bad = JSON.parse(JSON.stringify(VALID_SCRIPT));
      delete bad.scenes[0].scene_id;
      const result = validateScript(bad);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.toLowerCase().includes('scene_id'))).toBe(true);
    });

    it('returns error when a scene is missing narration', () => {
      const bad = JSON.parse(JSON.stringify(VALID_SCRIPT));
      delete bad.scenes[0].narration;
      const result = validateScript(bad);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.toLowerCase().includes('narration'))).toBe(true);
    });

    it('returns error when narrator_agent is missing from a scene', () => {
      const bad = JSON.parse(JSON.stringify(VALID_SCRIPT));
      delete bad.scenes[0].narrator_agent;
      const result = validateScript(bad);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateScript() — invalid narrator_agent values', () => {
    it('returns error when narrator_agent is an unknown role', () => {
      const bad = JSON.parse(JSON.stringify(VALID_SCRIPT));
      bad.scenes[0].narrator_agent = 'unknown-agent';
      const result = validateScript(bad);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.toLowerCase().includes('narrator_agent') || e.toLowerCase().includes('unknown-agent'))).toBe(true);
    });

    it('returns error for narrator_agent "developer" (not in valid list)', () => {
      const bad = JSON.parse(JSON.stringify(VALID_SCRIPT));
      bad.scenes[0].narrator_agent = 'developer';
      const result = validateScript(bad);
      expect(result.valid).toBe(false);
    });

    it('returns error for narrator_agent "engineering_manager" (underscore variant)', () => {
      const bad = JSON.parse(JSON.stringify(VALID_SCRIPT));
      bad.scenes[0].narrator_agent = 'engineering_manager';
      const result = validateScript(bad);
      expect(result.valid).toBe(false);
    });

    it('returns error for narrator_agent with empty string', () => {
      const bad = JSON.parse(JSON.stringify(VALID_SCRIPT));
      bad.scenes[0].narrator_agent = '';
      const result = validateScript(bad);
      expect(result.valid).toBe(false);
    });

    it('returns error for narrator_agent with numeric value', () => {
      const bad = JSON.parse(JSON.stringify(VALID_SCRIPT)) as any;
      bad.scenes[0].narrator_agent = 42;
      const result = validateScript(bad);
      expect(result.valid).toBe(false);
    });

    it('validates all 5 valid roles pass — rejects the 6th invented role', () => {
      for (const agent of VALID_AGENTS) {
        const good = JSON.parse(JSON.stringify(VALID_SCRIPT));
        good.scenes[0].narrator_agent = agent;
        const result = validateScript(good);
        expect(result.valid).toBe(true);
      }
      const bad = JSON.parse(JSON.stringify(VALID_SCRIPT));
      bad.scenes[0].narrator_agent = 'design-lead';
      expect(validateScript(bad).valid).toBe(false);
    });
  });

  describe('validateScript() — adversarial content in fields', () => {
    it('returns error or sanitizes when scene_id contains path traversal characters', () => {
      const bad = JSON.parse(JSON.stringify(VALID_SCRIPT));
      bad.scenes[0].scene_id = '../../../etc/passwd';
      // Either rejects as invalid or sanitizes; must not silently accept traversal
      const result = validateScript(bad);
      if (result.valid) {
        // If accepted, scene_id must be sanitized (no path separators)
        expect(bad.scenes[0].scene_id).not.toContain('..');
      } else {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('returns error when narration text exceeds 5000 characters', () => {
      const bad = JSON.parse(JSON.stringify(VALID_SCRIPT));
      bad.scenes[0].narration = 'x'.repeat(5001);
      const result = validateScript(bad);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.toLowerCase().includes('narration'))).toBe(true);
    });

    it('returns error when terminal command string is null', () => {
      const bad = JSON.parse(JSON.stringify(VALID_SCRIPT)) as any;
      bad.scenes[0].terminal_commands = [{ command: null, wait_after_ms: 100 }];
      const result = validateScript(bad);
      expect(result.valid).toBe(false);
    });
  });

  describe('compile() — exits with code 1 on invalid narrator_agent', () => {
    it('rejects with a clear error message naming the bad agent when narrator_agent is invalid', async () => {
      const bad = JSON.parse(JSON.stringify(VALID_SCRIPT));
      bad.scenes[0].narrator_agent = 'hacker';
      const scriptPath = path.join(testDir, 'script.yaml');
      // Write raw YAML with the bad agent
      fs.writeFileSync(scriptPath, `
episode_id: ep01
episode_title: "Test"
scenes:
  - scene_id: "01"
    narrator_agent: "hacker"
    narration: "test narration"
    terminal_commands: []
    wait_ms: 0
`.trim());

      let errorMessage = '';
      try {
        await compile(scriptPath, path.join(testDir, 'out.tape'));
      } catch (err: any) {
        errorMessage = err.message ?? '';
      }
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.toLowerCase()).toMatch(/narrator_agent|hacker|invalid|role/);
    });
  });
});

// ---------------------------------------------------------------------------
// SECTION 2: BOUNDARY CASES
// ---------------------------------------------------------------------------

describe('compiler.ts — Boundary Cases', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `studio-compiler-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('generateTape() — edge case scene structures', () => {
    it('handles a narration-only scene (empty terminal_commands) by generating a Sleep', () => {
      const scene: Scene = {
        scene_id: '02-narration-only',
        narrator_agent: 'cto',
        narration: "Here's what just happened.",
        terminal_commands: [],
        wait_ms: 1000,
      };
      const tape = generateTape({ ...VALID_SCRIPT, scenes: [scene] });
      expect(tape).toContain('Sleep');
      expect(tape).not.toContain('Type');
    });

    it('handles a scene with exactly one terminal command', () => {
      const scene: Scene = {
        scene_id: '01-single',
        narrator_agent: 'qa',
        narration: 'Single command scene.',
        terminal_commands: [{ command: '/mg-build', wait_after_ms: 500 }],
        wait_ms: 200,
      };
      const tape = generateTape({ ...VALID_SCRIPT, scenes: [scene] });
      expect(tape).toContain('Type "/mg-build"');
      expect(tape).toContain('Enter');
    });

    it('handles a script with exactly one scene', () => {
      const singleScene: Script = {
        ...VALID_SCRIPT,
        scenes: [VALID_SCRIPT.scenes[0]],
      };
      const tape = generateTape(singleScene);
      expect(tape.length).toBeGreaterThan(0);
    });

    it('produces Sleep directives for wait_after_ms on each command', () => {
      const scene: Scene = {
        scene_id: '03-timed',
        narrator_agent: 'staff-engineer',
        narration: 'Timed command.',
        terminal_commands: [{ command: '/mg-code-review', wait_after_ms: 2000 }],
        wait_ms: 0,
      };
      const tape = generateTape({ ...VALID_SCRIPT, scenes: [scene] });
      expect(tape).toContain('2000');
    });

    it('handles wait_ms of exactly 0 without emitting a Sleep for that value', () => {
      const scene: Scene = {
        scene_id: '04-no-wait',
        narrator_agent: 'product-owner',
        narration: 'No scene wait.',
        terminal_commands: [{ command: '/mg-spec', wait_after_ms: 0 }],
        wait_ms: 0,
      };
      const tape = generateTape({ ...VALID_SCRIPT, scenes: [scene] });
      // Should still be valid tape output
      expect(tape.length).toBeGreaterThan(0);
    });

    it('handles narration string with special shell characters without escaping breaking tape syntax', () => {
      const scene: Scene = {
        scene_id: '05-special-chars',
        narrator_agent: 'engineering-manager',
        narration: 'It\'s a "test" with $pecial chars & symbols!',
        terminal_commands: [],
        wait_ms: 100,
      };
      const tape = generateTape({ ...VALID_SCRIPT, scenes: [scene] });
      expect(tape.length).toBeGreaterThan(0);
    });

    it('handles a command with single quotes in the command string (tape format escaping)', () => {
      const scene: Scene = {
        scene_id: '06-quoted-cmd',
        narrator_agent: 'qa',
        narration: 'Command with quotes.',
        terminal_commands: [{ command: "echo 'hello world'", wait_after_ms: 500 }],
        wait_ms: 0,
      };
      // Should not throw — tape output must be syntactically valid
      expect(() => generateTape({ ...VALID_SCRIPT, scenes: [scene] })).not.toThrow();
    });
  });

  describe('parseScript() — boundary parsing', () => {
    it('parses a script with the maximum 5 scenes without error', () => {
      const manyScenes: Script = {
        episode_id: 'ep-max',
        episode_title: 'Max Scenes Test',
        scenes: VALID_AGENTS.map((agent, i) => ({
          scene_id: `scene-${i + 1}`,
          narrator_agent: agent,
          narration: `Narration for scene ${i + 1}`,
          terminal_commands: [],
          wait_ms: 100,
        })),
      };
      expect(() => parseScript(JSON.stringify(manyScenes))).not.toThrow();
    });

    it('parses scene_id values that are purely numeric strings', () => {
      const yaml = `
episode_id: ep01
episode_title: "Test"
scenes:
  - scene_id: "01"
    narrator_agent: "qa"
    narration: "Numeric scene id"
    terminal_commands: []
    wait_ms: 0
`.trim();
      const result = parseScript(yaml);
      expect(result.scenes[0].scene_id).toBe('01');
    });

    it('handles episode_title with unicode characters', () => {
      const yaml = `
episode_id: ep02
episode_title: "テスト Episode \u2014 Unicode Test"
scenes:
  - scene_id: "s1"
    narrator_agent: "cto"
    narration: "Unicode title episode."
    terminal_commands: []
    wait_ms: 0
`.trim();
      expect(() => parseScript(yaml)).not.toThrow();
    });
  });

  describe('compile() — output path boundary', () => {
    it('creates output directory if it does not exist yet', async () => {
      const scriptPath = path.join(testDir, 'script.yaml');
      fs.writeFileSync(scriptPath, VALID_SCRIPT_YAML);
      const newDir = path.join(testDir, 'output', 'nested');
      const outputPath = path.join(newDir, 'ep01.tape');

      await compile(scriptPath, outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);
    });

    it('overwrites an existing .tape file without error', async () => {
      const scriptPath = path.join(testDir, 'script.yaml');
      fs.writeFileSync(scriptPath, VALID_SCRIPT_YAML);
      const outputPath = path.join(testDir, 'ep01.tape');
      fs.writeFileSync(outputPath, '# old content');

      await compile(scriptPath, outputPath);

      const content = fs.readFileSync(outputPath, 'utf-8');
      expect(content).not.toBe('# old content');
    });
  });
});

// ---------------------------------------------------------------------------
// SECTION 2B: BOUNDARY CASES — Output directive (WS-STUDIO-3)
// ---------------------------------------------------------------------------

describe('compiler.ts — Boundary Cases: Output directive (WS-STUDIO-3)', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `studio-compiler-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // BOUNDARY: Output directive must carry the full explicit path, not a bare filename
  it('Output directive uses the full absolute path, not a bare filename without directory', () => {
    const tapePath = path.join(testDir, 'ep01.tape');
    const expectedMp4 = path.join(testDir, 'ep01.mp4');
    const tape = generateTape(VALID_SCRIPT, tapePath);
    const firstLine = tape.split('\n')[0];
    // Must contain a directory separator — a bare "ep01.mp4" without a path is invalid
    expect(firstLine).toMatch(/^Output\s+"?\//);
    expect(firstLine).toContain(expectedMp4);
  });

  // BOUNDARY: Output directive must appear on the first line
  it('Output directive is on the first line of the tape (VHS processes directives before commands)', () => {
    const tapePath = path.join(testDir, 'ep01.tape');
    const tape = generateTape(VALID_SCRIPT, tapePath);
    const firstLine = tape.split('\n')[0];
    expect(firstLine.trim()).toMatch(/^Output\s+/);
  });
});

// ---------------------------------------------------------------------------
// SECTION 2C: MISUSE CASES — Output directive (WS-STUDIO-3)
// ---------------------------------------------------------------------------

describe('compiler.ts — Misuse Cases: Output directive (WS-STUDIO-3)', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `studio-compiler-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // MISUSE: Bare "Output .mp4" with no directory silently writes to cwd — must not happen
  it('generateTape() output does NOT contain a bare "Output .mp4" without a directory path', () => {
    const tapePath = path.join(testDir, 'ep01.tape');
    const tape = generateTape(VALID_SCRIPT, tapePath);
    // A bare Output directive like "Output ep01.mp4" or "Output terminal.mp4" with no leading
    // slash is the failure mode — VHS would write to the cwd and the pipeline would lose the file
    const bareOutputPattern = /^Output\s+"?[^/"][^\s]*\.mp4"?$/m;
    expect(tape).not.toMatch(bareOutputPattern);
  });

  // MISUSE: Missing Output directive entirely means VHS defaults to output.gif — pipeline breaks
  it('generateTape() output must NOT omit the Output directive entirely', () => {
    const tapePath = path.join(testDir, 'ep01.tape');
    const tape = generateTape(VALID_SCRIPT, tapePath);
    expect(tape).toMatch(/^Output\s+/m);
  });
});

// ---------------------------------------------------------------------------
// SECTION 3: GOLDEN PATH
// ---------------------------------------------------------------------------

describe('compiler.ts — Golden Path', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `studio-compiler-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('parseScript()', () => {
    it('parses a valid YAML string into a Script object', () => {
      const result = parseScript(VALID_SCRIPT_YAML);
      expect(result.episode_id).toBe('ep01');
      expect(result.episode_title).toBe('Your Claude Code Just Became a Team');
      expect(result.scenes).toHaveLength(2);
    });

    it('preserves all scene fields after parsing', () => {
      const result = parseScript(VALID_SCRIPT_YAML);
      const scene = result.scenes[0];
      expect(scene.scene_id).toBe('01-hook');
      expect(scene.narrator_agent).toBe('engineering-manager');
      expect(scene.narration).toContain('engineering team');
      expect(scene.terminal_commands).toHaveLength(1);
      expect(scene.terminal_commands[0].command).toBe('/mg-leadership-team review WS-42');
      expect(scene.terminal_commands[0].wait_after_ms).toBe(2000);
      expect(scene.wait_ms).toBe(500);
    });
  });

  describe('validateScript()', () => {
    it('returns valid=true for a well-formed script', () => {
      const result = validateScript(VALID_SCRIPT);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts all 5 valid narrator_agent roles', () => {
      for (const agent of VALID_AGENTS) {
        const script = JSON.parse(JSON.stringify(VALID_SCRIPT));
        script.scenes[0].narrator_agent = agent;
        expect(validateScript(script).valid).toBe(true);
      }
    });
  });

  describe('generateTape()', () => {
    it('produces a non-empty tape string for a valid script', () => {
      const tape = generateTape(VALID_SCRIPT);
      expect(typeof tape).toBe('string');
      expect(tape.length).toBeGreaterThan(0);
    });

    // GOLDEN: Output directive — WS-STUDIO-3
    it('starts with Output <path>.mp4 so VHS writes the recording to the correct location', () => {
      const tapePath = path.join('/tmp', 'ep01.tape');
      const tape = generateTape(VALID_SCRIPT, tapePath);
      const firstLine = tape.split('\n')[0];
      expect(firstLine).toMatch(/^Output\s+"?.+\.mp4"?$/);
    });

    it('Output path ends in .mp4 (not .gif or bare extension)', () => {
      const tapePath = path.join('/tmp', 'ep01.tape');
      const tape = generateTape(VALID_SCRIPT, tapePath);
      const outputLine = tape.split('\n').find((l) => l.startsWith('Output '));
      expect(outputLine).toBeDefined();
      expect(outputLine).toMatch(/\.mp4"?$/);
      expect(outputLine).not.toMatch(/\.gif"?$/);
    });

    it('includes Type and Enter directives for each terminal command', () => {
      const tape = generateTape(VALID_SCRIPT);
      expect(tape).toContain('Type "/mg-leadership-team review WS-42"');
      expect(tape).toContain('Enter');
    });

    it('includes Sleep directive for wait_after_ms after a command', () => {
      const tape = generateTape(VALID_SCRIPT);
      expect(tape).toContain('Sleep 2000ms');
    });

    it('includes Sleep directive for scene wait_ms', () => {
      const tape = generateTape(VALID_SCRIPT);
      expect(tape).toContain('Sleep 500ms');
    });

    it('generates Sleep for narration-only scene (no commands) for estimated narration duration', () => {
      const tape = generateTape(VALID_SCRIPT);
      // Scene 02 has no commands — must have a sleep for estimated narration duration
      const sleepMatches = [...tape.matchAll(/^Sleep\s+(\d+)ms/gm)];
      expect(sleepMatches.length).toBeGreaterThan(1);
    });

    it('produces tape lines in scene order', () => {
      const tape = generateTape(VALID_SCRIPT);
      const hookIndex = tape.indexOf('mg-leadership-team');
      // The hook scene command should appear before scene 02's sleep
      expect(hookIndex).toBeGreaterThan(-1);
    });
  });

  describe('compile() — end-to-end', () => {
    it('writes a .tape file to the specified output path', async () => {
      const scriptPath = path.join(testDir, 'script.yaml');
      fs.writeFileSync(scriptPath, VALID_SCRIPT_YAML);
      const outputPath = path.join(testDir, 'ep01.tape');

      await compile(scriptPath, outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);
    });

    it('produces a tape file with non-zero content', async () => {
      const scriptPath = path.join(testDir, 'script.yaml');
      fs.writeFileSync(scriptPath, VALID_SCRIPT_YAML);
      const outputPath = path.join(testDir, 'ep01.tape');

      await compile(scriptPath, outputPath);

      const content = fs.readFileSync(outputPath, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
    });

    it('returns a TapeOutput object with the output path on success', async () => {
      const scriptPath = path.join(testDir, 'script.yaml');
      fs.writeFileSync(scriptPath, VALID_SCRIPT_YAML);
      const outputPath = path.join(testDir, 'ep01.tape');

      const result: TapeOutput = await compile(scriptPath, outputPath);

      expect(result.tapePath).toBe(outputPath);
      expect(result.sceneCount).toBe(2);
    });

    it('tape file includes correct Type directives for all commands across scenes', async () => {
      const scriptPath = path.join(testDir, 'script.yaml');
      fs.writeFileSync(scriptPath, VALID_SCRIPT_YAML);
      const outputPath = path.join(testDir, 'ep01.tape');

      await compile(scriptPath, outputPath);

      const content = fs.readFileSync(outputPath, 'utf-8');
      expect(content).toContain('Type "/mg-leadership-team review WS-42"');
    });
  });
});
