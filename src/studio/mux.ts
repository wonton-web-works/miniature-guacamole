/**
 * Studio Mux Module
 *
 * Runs ffmpeg to combine narration audio + terminal video into a single raw-cut.mp4.
 * WS-STUDIO-1: YouTube production pipeline tooling
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import type { MuxInput, MuxResult, ValidationResult } from './types';

/**
 * Validate mux inputs before invoking ffmpeg.
 */
export function validateMuxInputs(input: MuxInput): ValidationResult {
  const errors: string[] = [];

  if (!input || input === null) {
    return { valid: false, errors: ['input must not be null'] };
  }

  // Validate narrationMp3s
  if (!input.narrationMp3s || !Array.isArray(input.narrationMp3s)) {
    errors.push('narrationMp3s must be a non-null array');
  } else if (input.narrationMp3s.length === 0) {
    errors.push('narrationMp3s array must not be empty — at least one narration MP3 is required');
  } else {
    for (const mp3Path of input.narrationMp3s) {
      if (!fs.existsSync(mp3Path)) {
        errors.push(`narration MP3 file does not exist: ${mp3Path}`);
      }
    }
  }

  // Validate terminalMp4
  if (!input.terminalMp4) {
    errors.push('terminalMp4 path must not be empty');
  } else if (!fs.existsSync(input.terminalMp4)) {
    errors.push(`terminal MP4 file does not exist: ${input.terminalMp4}`);
  }

  // Validate sceneTimings
  if (!input.sceneTimings || typeof input.sceneTimings !== 'object') {
    errors.push('sceneTimings must not be null');
  } else if (Object.keys(input.sceneTimings).length === 0) {
    errors.push('sceneTimings must not be empty');
  } else {
    for (const [sceneId, timing] of Object.entries(input.sceneTimings)) {
      if (timing.durationMs < 0) {
        errors.push(`sceneTimings['${sceneId}'].durationMs must not be negative`);
      }
    }
  }

  // Validate outputPath
  if (!input.outputPath) {
    errors.push('outputPath must not be empty');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Build the ffmpeg argument array for muxing narration audio + terminal video.
 *
 * Output spec:
 * - Resolution: 1920x1080
 * - Video codec: H.264 (libx264)
 * - Audio codec: AAC
 * - Audio sync via apad filter
 */
export function buildFfmpegArgs(input: MuxInput): string[] {
  if (!input.narrationMp3s || input.narrationMp3s.length === 0) {
    throw new Error('narrationMp3s must not be empty');
  }
  if (!input.outputPath) {
    throw new Error('outputPath must not be empty');
  }

  const args: string[] = [];

  // Input: terminal video
  args.push('-i', input.terminalMp4);

  // Input: all narration MP3s in scene order
  for (const mp3 of input.narrationMp3s) {
    args.push('-i', mp3);
  }

  // Audio filter: concatenate all narration files, add padding to match video length
  const audioInputCount = input.narrationMp3s.length;
  const concatInputs = Array.from({ length: audioInputCount }, (_, i) => `[${i + 1}:a]`).join('');
  const filterComplex = `${concatInputs}concat=n=${audioInputCount}:v=0:a=1[audio_concat];[audio_concat]apad[audio_out]`;

  args.push('-filter_complex', filterComplex);

  // Map video from terminal recording
  args.push('-map', '0:v');
  // Map processed audio
  args.push('-map', '[audio_out]');

  // Video codec: H.264
  args.push('-vcodec', 'libx264');

  // Resolution: 1920x1080
  args.push('-vf', 'scale=1920:1080');

  // Audio codec: AAC
  args.push('-acodec', 'aac');

  // Overwrite output if exists
  args.push('-y');

  // Output path (must be last)
  args.push(input.outputPath);

  return args;
}

/**
 * Check whether ffmpeg is available on the system PATH.
 */
export async function checkFfmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('ffmpeg', ['-version'], {}, (err) => {
      resolve(!err);
    });
  });
}

/**
 * Mux narration audio + terminal video into a single raw-cut.mp4.
 *
 * - Validates inputs
 * - Builds ffmpeg command
 * - Runs ffmpeg via child_process.execFile
 * - On failure: cleans up any partial output file, then rejects
 * - Returns MuxResult with outputPath on success
 */
export async function mux(input: MuxInput): Promise<MuxResult> {
  const validation = validateMuxInputs(input);
  if (!validation.valid) {
    throw new Error(`Invalid mux inputs:\n${validation.errors.join('\n')}`);
  }

  const args = buildFfmpegArgs(input);

  return new Promise((resolve, reject) => {
    execFile('ffmpeg', args, {}, (err, _stdout, stderr) => {
      if (err) {
        // Clean up partial output file if it exists
        if (fs.existsSync(input.outputPath)) {
          try {
            fs.unlinkSync(input.outputPath);
          } catch {
            // Best effort cleanup
          }
        }
        const message = stderr
          ? `ffmpeg failed: ${err.message}\n${stderr}`
          : `ffmpeg failed: ${err.message}`;
        reject(new Error(message));
        return;
      }

      resolve({ outputPath: input.outputPath });
    });
  });
}
