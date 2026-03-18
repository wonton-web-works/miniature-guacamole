// Heartbeat / health monitoring for miniature-guacamole daemon
// WS-DAEMON-13: Mac Mini Setup & Process Hardening

import { existsSync, writeFileSync, renameSync, readFileSync } from 'fs';

export interface HeartbeatConfig {
  heartbeatPath: string; // default .mg-daemon/heartbeat
  intervalMs: number;    // should match polling interval
}

interface HeartbeatData {
  timestamp: string; // ISO string
  pid: number;
}

/**
 * Write a heartbeat file atomically (write-tmp-then-rename pattern).
 * Records current timestamp and PID.
 */
export function writeHeartbeat(config: HeartbeatConfig): void {
  const { heartbeatPath } = config;
  const tmpPath = `${heartbeatPath}.tmp`;

  const data: HeartbeatData = {
    timestamp: new Date().toISOString(),
    pid: process.pid,
  };

  writeFileSync(tmpPath, JSON.stringify(data), 'utf-8');
  renameSync(tmpPath, heartbeatPath);
}

/**
 * Read the heartbeat file and return parsed data, or null if missing/invalid.
 */
export function readHeartbeat(
  config: HeartbeatConfig
): { timestamp: Date; pid: number } | null {
  const { heartbeatPath } = config;

  if (!existsSync(heartbeatPath)) {
    return null;
  }

  try {
    const content = readFileSync(heartbeatPath, 'utf-8');
    const data = JSON.parse(content) as HeartbeatData;
    return {
      timestamp: new Date(data.timestamp),
      pid: data.pid,
    };
  } catch {
    return null;
  }
}

/**
 * Returns true if the heartbeat is stale (older than thresholdMultiplier * intervalMs).
 * Also returns true if the heartbeat file is missing or unreadable.
 */
export function isStale(
  config: HeartbeatConfig,
  thresholdMultiplier: number = 3
): boolean {
  const heartbeat = readHeartbeat(config);

  if (!heartbeat) {
    return true;
  }

  const ageMs = Date.now() - heartbeat.timestamp.getTime();
  const threshold = thresholdMultiplier * config.intervalMs;

  return ageMs >= threshold;
}
