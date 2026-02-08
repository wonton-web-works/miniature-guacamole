#!/usr/bin/env node
// CLI entry point for miniature-guacamole daemon
// WS-DAEMON-3: Commands: init, start, stop, status, logs

import { initConfig } from './config';
import { startDaemon, stopDaemon, statusDaemon } from './process';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Execute the init command
 * AC-3.1: Creates config template when none exists
 */
export function cmdInit(): void {
  initConfig();
  console.log('Configuration initialized successfully.');
}

/**
 * Execute the start command
 * AC-3.2: Starts daemon and prints PID
 * AC-3.3: --foreground runs in foreground with stdout logs
 */
export function cmdStart(foreground: boolean = false): void {
  const result = startDaemon();
  if (foreground) {
    console.log(`Daemon running in foreground mode (PID: ${result.pid})`);
  } else {
    console.log(`Daemon started with PID: ${result.pid}`);
  }
}

/**
 * Execute the stop command
 * AC-3.4: Stops daemon
 * AC-3.5: Prints "No daemon running" when not running
 */
export function cmdStop(): void {
  try {
    stopDaemon();
    console.log('Daemon stopped successfully.');
  } catch (error) {
    console.log('No daemon running.');
  }
}

/**
 * Execute the status command
 * AC-3.6: Shows running state with PID and uptime
 */
export function cmdStatus(): void {
  const status = statusDaemon();
  if (status.running && status.pid !== undefined && status.uptimeMs !== undefined) {
    const uptimeSeconds = Math.floor(status.uptimeMs / 1000);
    console.log(`Daemon is running (PID: ${status.pid}, uptime: ${uptimeSeconds}s)`);
  } else {
    console.log('Daemon is not running.');
  }
}

/**
 * Execute the logs command
 * AC-3.7: Shows last N lines from daemon.log
 */
export function cmdLogs(tail: number = 50): void {
  const logPath = join('.mg-daemon', 'daemon.log');
  try {
    const content = readFileSync(logPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const tailLines = lines.slice(-tail);
    tailLines.forEach(line => console.log(line));
  } catch (error) {
    console.error('Error reading log file.');
  }
}

/**
 * Main CLI entry point
 * AC-3.12: CLI entry point is daemon/src/cli.ts
 */
export function main(argv: string[] = process.argv): void {
  const args = argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'init':
        cmdInit();
        break;
      case 'start': {
        const foreground = args.includes('--foreground') || args.includes('-f');
        cmdStart(foreground);
        break;
      }
      case 'stop':
        cmdStop();
        break;
      case 'status':
        cmdStatus();
        break;
      case 'logs': {
        const tailIndex = args.indexOf('--tail') !== -1 ? args.indexOf('--tail') : args.indexOf('-n');
        const tail = tailIndex !== -1 && args[tailIndex + 1] ? parseInt(args[tailIndex + 1], 10) : 50;
        cmdLogs(tail);
        break;
      }
      default:
        console.error('Unknown command. Usage: mg-daemon <init|start|stop|status|logs>');
        process.exit(1);
    }
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}

// Run main if executed directly
if (require.main === module) {
  main();
}
