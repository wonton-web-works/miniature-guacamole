/**
 * WS-16: Token Usage Audit Log - Public API
 *
 * Orchestrates the complete audit logging flow:
 * 1. Load config
 * 2. Execute Claude CLI (if needed)
 * 3. Format response as audit entry
 * 4. Write to audit log
 */

import { loadAuditConfig, resolveLogPath } from './config';
import { captureAuditLog, ClaudeOptions, ClaudeResponse } from './capture';
import { formatAuditEntry } from './format';
import { appendToAuditLog } from './writer';

/**
 * Main entry point for audited Claude requests.
 * Executes Claude CLI, logs usage data, and returns response.
 *
 * @param prompt - User prompt to send to Claude
 * @param options - Optional CLI options (model, temperature, etc.)
 * @returns Claude API response
 */
export async function auditedClaudeRequest(
  prompt: string,
  options: ClaudeOptions = {}
): Promise<ClaudeResponse> {
  // Load configuration
  const config = loadAuditConfig();

  // Execute Claude CLI
  const response = await captureAuditLog(prompt, options);

  // Only log if enabled
  if (config.enabled) {
    try {
      // Resolve log path (expand ~ and relative paths)
      const resolvedConfig = {
        ...config,
        log_path: resolveLogPath(config.log_path)
      };

      // Format response as audit entry
      const auditEntry = formatAuditEntry(response);

      // Write to audit log (non-blocking, errors logged to stderr)
      await appendToAuditLog(auditEntry, resolvedConfig);
    } catch (error) {
      // Log errors but don't block the response
      console.error(`WARNING: Failed to write audit log: ${error}`);
    }
  }

  return response;
}

/**
 * Logs token usage for a completed request without executing CLI.
 * Useful for integrating with existing wrapper implementations.
 *
 * @param response - Claude API response to log
 */
export async function logTokenUsage(response: ClaudeResponse): Promise<void> {
  const config = loadAuditConfig();

  if (!config.enabled) {
    return;
  }

  try {
    const resolvedConfig = {
      ...config,
      log_path: resolveLogPath(config.log_path)
    };

    const auditEntry = formatAuditEntry(response);
    await appendToAuditLog(auditEntry, resolvedConfig);
  } catch (error) {
    console.error(`WARNING: Failed to write audit log: ${error}`);
  }
}

// Export types and utilities
export type { ClaudeOptions, ClaudeResponse } from './capture';
export type { AuditConfig } from './config';
export type { AuditEntry, ApiResponse } from './format';
