/**
 * WS-16: Token Usage Audit Log - Capture Module
 *
 * Executes Claude CLI with JSON output format and parses the response.
 * Handles CLI errors and malformed responses.
 */

import { execSync } from 'child_process';

export interface ClaudeOptions {
  model?: string;
  [key: string]: any;
}

export interface ClaudeResponse {
  model: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  session_id: string;
  total_cost_usd?: number;
  duration_ms?: number;
  duration_api_ms?: number;
  models_used?: string[];
}

/**
 * Parses Claude CLI JSON response.
 * Throws error if JSON is malformed.
 */
export function parseClaudeResponse(jsonOutput: string): ClaudeResponse {
  if (!jsonOutput || jsonOutput.trim() === '') {
    throw new Error('Empty response from Claude CLI');
  }

  try {
    const parsed = JSON.parse(jsonOutput);
    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse Claude CLI response: ${error}`);
  }
}

/**
 * Executes Claude CLI with --output-format=json and returns parsed response.
 * Throws error if CLI execution fails.
 */
export async function captureAuditLog(
  prompt: string,
  options: ClaudeOptions = {}
): Promise<ClaudeResponse> {
  try {
    // Build CLI command
    let command = `claude --output-format=json`;

    // Add model if specified
    if (options.model) {
      command += ` --model ${options.model}`;
    }

    // Add prompt
    command += ` "${prompt.replace(/"/g, '\\"')}"`;

    // Execute CLI
    const output = execSync(command, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 120000 // 2 minute timeout
    });

    // Parse and return response
    return parseClaudeResponse(output);
  } catch (error: any) {
    // Enhance error message based on error type
    if (error.code === 'ETIMEDOUT') {
      throw new Error('Claude CLI execution timed out');
    } else if (error.code === 'ENOENT') {
      throw new Error('Claude CLI not found - ensure it is installed and in PATH');
    } else {
      throw error;
    }
  }
}
