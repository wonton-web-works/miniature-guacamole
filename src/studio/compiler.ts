/**
 * Studio Compiler
 *
 * Reads a script.yaml file and outputs a VHS .tape file for terminal recording.
 * WS-STUDIO-1: YouTube production pipeline tooling
 */

import * as fs from 'fs';
import * as path from 'path';
import * as jsYaml from 'js-yaml';
import type { Script, TapeOutput, ValidationResult } from './types';

const VALID_NARRATOR_AGENTS = ['cto', 'product-owner', 'engineering-manager', 'qa', 'staff-engineer'];
const MAX_NARRATION_LENGTH = 5000;
const WORDS_PER_MINUTE = 150;

export function parseScript(yaml: string): Script {
  const parsed: unknown = jsYaml.load(yaml);

  if (parsed === null || parsed === undefined || typeof parsed !== 'object') {
    throw new Error('Invalid script: YAML did not produce a valid object');
  }
  return parsed as Script;
}

export function validateScript(script: unknown): ValidationResult {
  const errors: string[] = [];

  if (script === null || script === undefined || typeof script !== 'object') {
    return { valid: false, errors: ['script must be a non-null object'] };
  }

  const s = script as Record<string, unknown>;

  if (!s.episode_id) {
    errors.push('Missing required field: episode_id');
  }

  if (!s.episode_title) {
    errors.push('Missing required field: episode_title');
  }

  if (!s.scenes) {
    errors.push('Missing required field: scenes');
  } else if (!Array.isArray(s.scenes)) {
    errors.push('scenes must be an array');
  } else {
    for (let i = 0; i < s.scenes.length; i++) {
      const scene = s.scenes[i] as Record<string, unknown>;

      if (!scene.scene_id) {
        errors.push(`Scene ${i}: missing required field: scene_id`);
      } else if (typeof scene.scene_id === 'string' && !/^[a-z0-9][a-z0-9-]*$/.test(scene.scene_id)) {
        errors.push(`Scene ${i}: scene_id must match /^[a-z0-9][a-z0-9-]*$/ (lowercase letters, digits, hyphens only)`);
      }

      if (scene.narration === undefined || scene.narration === null) {
        errors.push(`Scene ${i}: missing required field: narration`);
      } else if (typeof scene.narration === 'string' && scene.narration.length > MAX_NARRATION_LENGTH) {
        errors.push(`Scene ${i}: narration exceeds maximum length of ${MAX_NARRATION_LENGTH} characters`);
      }

      if (scene.narrator_agent === undefined || scene.narrator_agent === null) {
        errors.push(`Scene ${i}: missing required field: narrator_agent`);
      } else if (typeof scene.narrator_agent !== 'string' || !VALID_NARRATOR_AGENTS.includes(scene.narrator_agent)) {
        errors.push(`Scene ${i}: invalid narrator_agent '${scene.narrator_agent}'. Must be one of: ${VALID_NARRATOR_AGENTS.join(', ')}`);
      }

      if (Array.isArray(scene.terminal_commands)) {
        for (let j = 0; j < scene.terminal_commands.length; j++) {
          const cmd = scene.terminal_commands[j] as Record<string, unknown>;
          if (cmd.command === null || cmd.command === undefined) {
            errors.push(`Scene ${i}, command ${j}: command must not be null`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function generateTape(script: Script): string {
  const lines: string[] = [];

  for (const scene of script.scenes) {
    if (scene.terminal_commands && scene.terminal_commands.length > 0) {
      for (const cmd of scene.terminal_commands) {
        // Escape single quotes in commands by replacing ' with '\''
        const escapedCmd = cmd.command.replace(/'/g, "'\\''");
        lines.push(`Type '${escapedCmd}'`);
        lines.push('Enter');
        if (cmd.wait_after_ms > 0) {
          lines.push(`Sleep ${cmd.wait_after_ms}`);
        }
      }
    } else {
      // Narration-only scene — sleep for estimated narration duration
      const wordCount = scene.narration.split(/\s+/).filter(Boolean).length;
      const durationMs = Math.round((wordCount / WORDS_PER_MINUTE) * 60 * 1000);
      lines.push(`Sleep ${durationMs > 0 ? durationMs : 1000}`);
    }

    if (scene.wait_ms > 0) {
      lines.push(`Sleep ${scene.wait_ms}`);
    }
  }

  return lines.join('\n');
}

export async function compile(scriptPath: string, outputPath: string): Promise<TapeOutput> {
  if (!scriptPath) {
    throw new Error('scriptPath must not be empty');
  }
  if (!outputPath) {
    throw new Error('outputPath must not be empty');
  }

  // Read the script file
  const yamlContent = fs.readFileSync(scriptPath, 'utf-8');

  if (!yamlContent || !yamlContent.trim()) {
    throw new Error('Script file is empty or contains only whitespace');
  }

  // Check for binary content (null bytes)
  const buf = fs.readFileSync(scriptPath);
  for (let i = 0; i < Math.min(buf.length, 512); i++) {
    if (buf[i] === 0x00) {
      throw new Error('Script file appears to be a binary file, not a text YAML file');
    }
  }

  // Parse using parseScript (which handles mocked js-yaml via fallback)
  const script = parseScript(yamlContent);

  // Validate
  const validation = validateScript(script);
  if (!validation.valid) {
    throw new Error(`Script validation failed:\n${validation.errors.join('\n')}`);
  }

  // Generate tape content
  const tapeContent = generateTape(script);

  // Create output directory if needed
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  // Write tape file
  fs.writeFileSync(outputPath, tapeContent, 'utf-8');

  return {
    tapePath: outputPath,
    sceneCount: script.scenes.length,
  };
}
