// Notification hooks for the mg-daemon pipeline
// WS-DAEMON-14: Pipeline Observability & Safety

import { execSync } from 'child_process';
import type { NotificationConfig } from './types';

export interface NotificationContext {
  ticketId: string;
  ticketTitle: string;
  prUrl?: string;
  error?: string;
  source: string;
}

/**
 * Execute a notification shell command with context as env vars.
 * Fire-and-forget: errors are logged but never rethrown.
 *
 * SECURITY NOTE: execSync is intentionally used here because notification commands
 * are user-authored shell strings from the daemon config file (not from ticket content
 * or any untrusted external source). The config file itself must be protected with
 * mode 0o600. execSync is appropriate for this use case; do NOT pass ticket content
 * or any untrusted data as part of shellCommand.
 *
 * Environment variables set:
 *   MG_TICKET_ID, MG_TICKET_TITLE, MG_PR_URL, MG_ERROR, MG_SOURCE
 */
export function notify(shellCommand: string, context: NotificationContext): void {
  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    MG_TICKET_ID: context.ticketId,
    MG_TICKET_TITLE: context.ticketTitle,
    MG_PR_URL: context.prUrl ?? '',
    MG_ERROR: context.error ?? '',
    MG_SOURCE: context.source,
  };

  try {
    execSync(shellCommand, { env });
  } catch (err) {
    // Fire-and-forget — never block the pipeline
    console.error(
      `[notifications] command failed (ticket ${context.ticketId}): ${(err as Error).message}`
    );
  }
}

/**
 * Send onPRCreated notification if configured.
 */
export function notifyPRCreated(
  config: NotificationConfig | undefined,
  context: NotificationContext
): void {
  if (!config?.onPRCreated) return;
  notify(config.onPRCreated, context);
}

/**
 * Send onFailure notification if configured.
 */
export function notifyFailure(
  config: NotificationConfig | undefined,
  context: NotificationContext
): void {
  if (!config?.onFailure) return;
  notify(config.onFailure, context);
}
