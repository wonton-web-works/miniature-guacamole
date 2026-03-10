/**
 * Studio Pipeline Orchestrator
 *
 * Orchestrates compile → elevenlabs → mux in sequence.
 * WS-STUDIO-1: YouTube production pipeline tooling
 */

import * as fs from 'fs';
import * as path from 'path';
import { compile, parseScript } from './compiler';
import { loadStudioConfig, generateNarration } from './elevenlabs';
import { mux } from './mux';
import type { PipelineOptions, PipelineResult, ProductionState } from './types';

const MAX_NARRATION_RETRIES = 3;

/**
 * Sleep for the given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Read the production state for an episode from the memory directory.
 * Returns null if the state file doesn't exist or is corrupted.
 */
export async function readProductionState(
  episodeId: string,
  memoryDir: string
): Promise<ProductionState | null> {
  const statePath = path.join(memoryDir, `studio-production-${episodeId}.json`);

  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(statePath, 'utf-8');
    return JSON.parse(content) as ProductionState;
  } catch {
    // Corrupted state — return null gracefully
    return null;
  }
}

/**
 * Write the production state for an episode to the memory directory.
 * Creates the memory directory if it doesn't exist.
 */
export async function writeProductionState(
  state: ProductionState,
  memoryDir: string
): Promise<void> {
  fs.mkdirSync(memoryDir, { recursive: true });
  const statePath = path.join(memoryDir, `studio-production-${state.episodeId}.json`);
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Run the full YouTube production pipeline:
 * 1. compile: script.yaml → VHS .tape file
 * 2. elevenlabs: generate narration MP3s per scene
 * 3. mux: combine narration audio + terminal video → raw-cut.mp4
 *
 * On ElevenLabs 429 rate limit: retries up to 3x with exponential backoff.
 * On failure: marks state FAILED at the failing step. Preserves narration MP3s.
 * No partial output files left on failure.
 */
export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  // Validate required options
  if (!options.scriptPath) {
    throw new Error('scriptPath is required');
  }
  if (!options.outputDir) {
    throw new Error('outputDir is required');
  }
  if (!options.episodeId) {
    throw new Error('episodeId is required');
  }
  if (!options.memoryDir) {
    throw new Error('memoryDir is required');
  }

  // Check script file exists
  if (!fs.existsSync(options.scriptPath)) {
    throw new Error(`Script file does not exist: ${options.scriptPath}`);
  }

  // Load studio config first (needed for elevenlabs step)
  const config = await loadStudioConfig(options.studioConfigPath);

  // Initialize production state
  const now = new Date().toISOString();
  const state: ProductionState = {
    episodeId: options.episodeId,
    status: 'IN_PROGRESS',
    failedAtStep: null,
    completedSteps: [],
    tapePath: null,
    narrationPaths: [],
    outputPath: null,
    startedAt: now,
    updatedAt: now,
  };
  await writeProductionState(state, options.memoryDir);

  // ── Step 1: Compile ──────────────────────────────────────────────────────
  const tapePath = path.join(options.outputDir, `${options.episodeId}.tape`);
  let tapeOutput: { tapePath: string; sceneCount: number };

  try {
    tapeOutput = await compile(options.scriptPath, tapePath);
    state.completedSteps.push('compile');
    state.tapePath = tapeOutput.tapePath;
    state.updatedAt = new Date().toISOString();
    await writeProductionState(state, options.memoryDir);
  } catch (err: any) {
    console.error(err.message);
    state.status = 'FAILED';
    state.failedAtStep = 'compile';
    state.updatedAt = new Date().toISOString();
    await writeProductionState(state, options.memoryDir);
    throw err;
  }

  // Re-parse the script to get scene narration text and narrator agents
  const scriptYaml = fs.readFileSync(options.scriptPath, 'utf-8');
  const script = parseScript(scriptYaml);

  // ── Step 2: ElevenLabs narration ─────────────────────────────────────────
  const narrationPaths: string[] = [];
  const narrationDir = options.outputDir;

  try {
    for (let sceneIndex = 0; sceneIndex < script.scenes.length; sceneIndex++) {
      const scene = script.scenes[sceneIndex];
      const sceneId = scene.scene_id;
      const narrationText = scene.narration;
      const narratorAgent = scene.narrator_agent;

      let narrationResult: Awaited<ReturnType<typeof generateNarration>> | null = null;
      let attempt = 0;

      while (attempt < MAX_NARRATION_RETRIES) {
        try {
          narrationResult = await generateNarration(
            narrationText,
            narratorAgent,
            sceneId,
            narrationDir,
            config,
            options.dryRun ? { dryRun: true } : undefined
          );
          break;
        } catch (err: any) {
          if (err?.statusCode === 429 && attempt < MAX_NARRATION_RETRIES - 1) {
            // Exponential backoff: 1s, 2s, 4s
            const delayMs = 1000 * Math.pow(2, attempt);
            await sleep(delayMs);
            attempt++;
          } else {
            throw err;
          }
        }
      }

      if (narrationResult) {
        narrationPaths.push(narrationResult.mp3Path);
      }
    }

    state.completedSteps.push('elevenlabs');
    state.narrationPaths = narrationPaths;
    state.updatedAt = new Date().toISOString();
    await writeProductionState(state, options.memoryDir);
  } catch (err: any) {
    console.error(err.message);
    state.status = 'FAILED';
    state.failedAtStep = 'elevenlabs';
    state.updatedAt = new Date().toISOString();
    await writeProductionState(state, options.memoryDir);
    throw err;
  }

  // ── Step 3: Mux ───────────────────────────────────────────────────────────
  const outputMp4Path = path.join(options.outputDir, 'raw-cut.mp4');
  const terminalVideoPath = path.join(options.outputDir, 'terminal.mp4');

  // Build scene timings from narration count
  const sceneTimings: Record<string, { startMs: number; durationMs: number }> = {};
  const sceneDurationMs = 3000; // default per-scene duration
  for (let i = 0; i < narrationPaths.length; i++) {
    const sceneId = `scene-${i + 1}`;
    sceneTimings[sceneId] = {
      startMs: i * sceneDurationMs,
      durationMs: sceneDurationMs,
    };
  }

  let muxResult: { outputPath: string };

  try {
    muxResult = await mux({
      narrationMp3s: narrationPaths,
      terminalMp4: terminalVideoPath,
      sceneTimings,
      outputPath: outputMp4Path,
    });

    state.completedSteps.push('mux');
    state.outputPath = muxResult.outputPath;
    state.status = 'DONE';
    state.updatedAt = new Date().toISOString();
    await writeProductionState(state, options.memoryDir);
  } catch (err: any) {
    // Clean up partial output file (MP3s are preserved — expensive to regenerate)
    if (fs.existsSync(outputMp4Path)) {
      try {
        fs.unlinkSync(outputMp4Path);
      } catch {
        // Best effort cleanup
      }
    }

    state.status = 'FAILED';
    state.failedAtStep = 'mux';
    state.updatedAt = new Date().toISOString();
    await writeProductionState(state, options.memoryDir);
    throw err;
  }

  return {
    episodeId: options.episodeId,
    outputPath: muxResult.outputPath,
    tapePath: tapeOutput.tapePath,
    narrationPaths,
  };
}
