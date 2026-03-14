/**
 * Type definitions for the Studio production pipeline.
 * WS-STUDIO-1: YouTube production pipeline tooling
 *
 * These are stubs — implementation is NOT YET WRITTEN.
 * Tests import these types to validate the contract before implementation.
 */

export interface TerminalCommand {
  command: string;
  wait_after_ms: number;
}

export interface Scene {
  scene_id: string;
  narrator_agent: string;
  narration: string;
  terminal_commands: TerminalCommand[];
  wait_ms: number;
}

export interface Script {
  episode_id: string;
  episode_title: string;
  scenes: Scene[];
}

export interface TapeOutput {
  tapePath: string;
  sceneCount: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface VoicesConfig {
  cto?: string;
  'product-owner'?: string;
  'engineering-manager'?: string;
  qa?: string;
  'staff-engineer'?: string;
  [key: string]: string | undefined;
}

export interface ElevenLabsConfig {
  apiKey: string;
  model: string;
}

export interface StudioConfig {
  voices: VoicesConfig;
  elevenlabs: ElevenLabsConfig;
}

export interface NarrationResult {
  mp3Path: string;
  characterCount: number;
  cached: boolean;
  dryRun: boolean;
}

export interface GenerateNarrationOptions {
  dryRun?: boolean;
}

export interface SceneTiming {
  startMs: number;
  durationMs: number;
}

export interface SceneTimingMap {
  [sceneId: string]: SceneTiming;
}

export interface MuxInput {
  narrationMp3s: string[];
  terminalMp4: string;
  sceneTimings: SceneTimingMap;
  outputPath: string;
}

export interface MuxResult {
  outputPath: string;
}

export interface PipelineOptions {
  scriptPath: string;
  outputDir: string;
  studioConfigPath: string;
  episodeId: string;
  memoryDir: string;
  dryRun?: boolean;
}

export interface PipelineResult {
  episodeId: string;
  outputPath: string;
  tapePath: string;
  narrationPaths: string[];
}

export type PipelineStep = 'compile' | 'vhs' | 'elevenlabs' | 'mux';
export type PipelineStatus = 'IN_PROGRESS' | 'DONE' | 'FAILED';

export interface ProductionState {
  episodeId: string;
  status: PipelineStatus;
  failedAtStep: PipelineStep | null;
  completedSteps: PipelineStep[];
  tapePath: string | null;
  narrationPaths: string[];
  outputPath: string | null;
  startedAt: string;
  updatedAt: string;
}
