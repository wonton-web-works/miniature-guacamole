/**
 * Studio ElevenLabs Module
 *
 * Calls ElevenLabs API to generate narration MP3s per scene, with content-hash caching.
 * WS-STUDIO-1: YouTube production pipeline tooling
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as jsYaml from 'js-yaml';
import { ElevenLabsClient } from './elevenlabs-client';
import type {
  NarrationResult,
  StudioConfig,
  GenerateNarrationOptions,
} from './types';

const VALID_NARRATOR_AGENTS = ['cto', 'product-owner', 'engineering-manager', 'qa', 'staff-engineer'];
const MAX_NARRATION_LENGTH = 5000;

/**
 * Generate a content-hash cache key for a given narration + agent combination.
 * Same text + same agent → same key, enabling cache lookup.
 */
export function getCacheKey(narration: string, narratorAgent: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(`${narratorAgent}:${narration}`);
  return hash.digest('hex');
}

/**
 * Check whether a valid (non-empty) cached MP3 exists for the given cache key.
 */
export function isCached(key: string, outputDir: string): boolean {
  const filePath = path.join(outputDir, `${key}.mp3`);
  if (!fs.existsSync(filePath)) return false;
  const stat = fs.statSync(filePath);
  return stat.size > 0;
}

/**
 * Look up the ElevenLabs voice ID for a narrator agent from the studio config.
 * Throws if the agent is not configured.
 */
export function getVoiceId(narratorAgent: string, config: StudioConfig): string {
  const voiceId = config.voices[narratorAgent];
  if (!voiceId) {
    throw new Error(
      `No voice ID configured for narrator_agent '${narratorAgent}'. ` +
      `Available agents: ${Object.keys(config.voices).join(', ')}`
    );
  }
  return voiceId;
}

/**
 * Load and validate a studio-config.yaml file.
 * Throws if the file is missing, malformed, or missing required voice IDs.
 */
export async function loadStudioConfig(configPath: string): Promise<StudioConfig> {
  const content = fs.readFileSync(configPath, 'utf-8');

  if (!content || !content.trim()) {
    throw new Error(`Studio config file is empty: ${configPath}`);
  }

  let parsed: unknown;
  try {
    parsed = jsYaml.load(content);
  } catch (err: any) {
    throw new Error(`Failed to parse studio config YAML: ${err.message}`);
  }

  if (parsed === null || parsed === undefined || typeof parsed !== 'object') {
    throw new Error(`Studio config file did not parse to a valid object: ${configPath}`);
  }

  const config = parsed as Record<string, unknown>;

  if (!config.voices || typeof config.voices !== 'object') {
    throw new Error(`Studio config missing required 'voices' section`);
  }

  const voices = config.voices as Record<string, unknown>;

  // Validate all 5 required agent voices are present
  for (const agent of VALID_NARRATOR_AGENTS) {
    if (!voices[agent]) {
      throw new Error(
        `Studio config missing voice ID for required agent '${agent}'. ` +
        `All 5 agents must be configured: ${VALID_NARRATOR_AGENTS.join(', ')}`
      );
    }
  }

  if (!config.elevenlabs || typeof config.elevenlabs !== 'object') {
    throw new Error(`Studio config missing required 'elevenlabs' section`);
  }

  return parsed as StudioConfig;
}

/**
 * Generate narration audio for a scene via ElevenLabs API.
 *
 * - Validates inputs
 * - Checks cache (same text + agent = skip API call)
 * - In dry-run mode, returns result without calling the API
 * - Writes MP3 to outputDir/narration-scene-{sceneId}.mp3
 * - Returns NarrationResult with mp3Path, characterCount, cached flag
 */
export async function generateNarration(
  narration: string,
  narratorAgent: string,
  sceneId: string,
  outputDir: string,
  config: StudioConfig,
  options?: GenerateNarrationOptions
): Promise<NarrationResult> {
  // Validate inputs
  if (config === null || config === undefined) {
    throw new Error('Studio config must not be null');
  }

  if (!narration || typeof narration !== 'string') {
    throw new Error('narration must be a non-empty string');
  }

  if (!narration.trim()) {
    throw new Error('narration must not be only whitespace');
  }

  if (narration.length > MAX_NARRATION_LENGTH) {
    throw new Error(`narration exceeds maximum length of ${MAX_NARRATION_LENGTH} characters`);
  }

  if (!narratorAgent || typeof narratorAgent !== 'string') {
    throw new Error('narrator_agent must be a non-empty string');
  }

  if (!VALID_NARRATOR_AGENTS.includes(narratorAgent)) {
    throw new Error(
      `Invalid narrator_agent '${narratorAgent}'. Must be one of: ${VALID_NARRATOR_AGENTS.join(', ')}`
    );
  }

  if (!sceneId || typeof sceneId !== 'string') {
    throw new Error('scene_id must be a non-empty string');
  }

  if (!outputDir || typeof outputDir !== 'string') {
    throw new Error('outputDir must be a non-empty string');
  }

  // Validate outputDir is actually a directory (not a file)
  if (fs.existsSync(outputDir)) {
    const stat = fs.statSync(outputDir);
    if (!stat.isDirectory()) {
      throw new Error(`outputDir exists but is not a directory: ${outputDir}`);
    }
  }

  // Validate config has voice for this agent
  const voiceId = getVoiceId(narratorAgent, config);

  // Validate API key
  if (!config.elevenlabs?.apiKey) {
    throw new Error('ElevenLabs API key is missing or empty in studio config');
  }

  const mp3Path = path.join(outputDir, `narration-scene-${sceneId}.mp3`);
  const characterCount = narration.length;

  // Dry-run mode — no API call
  if (options?.dryRun) {
    return {
      mp3Path,
      characterCount,
      cached: false,
      dryRun: true,
    };
  }

  // Check cache using content hash
  const cacheKey = getCacheKey(narration, narratorAgent);
  const cachedMp3Path = path.join(outputDir, `${cacheKey}.mp3`);

  if (isCached(cacheKey, outputDir)) {
    // Return the scene-named path (copy from cache if needed)
    if (!fs.existsSync(mp3Path)) {
      fs.copyFileSync(cachedMp3Path, mp3Path);
    }
    return {
      mp3Path,
      characterCount,
      cached: true,
      dryRun: false,
    };
  }

  // Call ElevenLabs API
  const client = new ElevenLabsClient(config.elevenlabs.apiKey);
  const rawBuffer = await client.textToSpeech({ text: narration, voiceId, modelId: config.elevenlabs.model });
  const audioBuffer = rawBuffer ?? Buffer.alloc(0);

  // Ensure outputDir exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Write to cache (hash-keyed file)
  fs.writeFileSync(cachedMp3Path, audioBuffer);

  // Also write to scene-named path
  fs.writeFileSync(mp3Path, audioBuffer);

  return {
    mp3Path,
    characterCount,
    cached: false,
    dryRun: false,
  };
}
