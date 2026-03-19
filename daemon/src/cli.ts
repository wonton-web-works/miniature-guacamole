#!/usr/bin/env node
// CLI entry point for miniature-guacamole daemon
// WS-DAEMON-3: Commands: init, start, stop, status, logs
// WS-DAEMON-13: Commands: install, uninstall, setup-mac
// WS-DAEMON-14: Commands: dashboard, resume; --dry-run flag for start

import { initConfig, loadConfig } from './config';
import { startDaemon, stopDaemon, statusDaemon, setupSignalHandlers } from './process';
import { installService, uninstallService } from './launchd';
import { checkPrereqs, formatPrereqReport } from './prereqs';
import { createDaemonUser, formatSetupInstructions } from './setup-user';
import { isStale, writeHeartbeat } from './heartbeat';
import { gatherDashboardData, formatDashboard } from './dashboard';
import { ErrorBudget } from './error-budget';
import { runPollCycle } from './orchestrator';
import { createProvider } from './providers/factory';
import { getProcessedTickets, markProcessing, markComplete, markFailed } from './tracker';
import { appendLog } from './log-rotation';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';

const DRY_RUN_STATE_FILE = join('.mg-daemon', 'dry-run');

/**
 * Execute the init command
 * AC-3.1: Creates config template when none exists
 */
export function cmdInit(): void {
  initConfig();
  console.log('Configuration initialized successfully.');
}

/**
 * Run the main poll loop in foreground mode.
 * Polls for tickets on the configured interval and processes them.
 */
async function runForegroundLoop(dryRun: boolean): Promise<void> {
  const config = loadConfig();

  // Override dry-run from CLI flag
  if (!config.orchestration) {
    (config as any).orchestration = { claudeTimeout: 1_800_000, concurrency: 1, delayBetweenTicketsMs: 5000, dryRun, errorBudget: 3 };
  } else {
    config.orchestration.dryRun = dryRun;
  }

  const provider = createProvider(config);
  const intervalMs = (config.polling?.intervalSeconds ?? 300) * 1000;
  const logConfig = { maxSizeBytes: 10 * 1024 * 1024, maxRotations: 5, logPath: join('.mg-daemon', 'daemon.log') };
  const heartbeatConfig = { heartbeatPath: join('.mg-daemon', 'heartbeat'), intervalMs };
  const errorBudgetPath = join('.mg-daemon', 'error-budget.json');
  const errorBudget = ErrorBudget.load(errorBudgetPath, { threshold: config.orchestration?.errorBudget ?? 3 });

  // Ensure .mg-daemon directory exists
  if (!existsSync('.mg-daemon')) {
    mkdirSync('.mg-daemon', { recursive: true });
  }

  const log = (msg: string) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
    appendLog(logConfig, msg);
  };

  const mode = dryRun ? 'DRY-RUN' : 'LIVE';
  log(`Daemon started in ${mode} mode. Polling every ${config.polling?.intervalSeconds ?? 300}s.`);

  // Setup graceful shutdown
  let running = true;
  setupSignalHandlers(() => { running = false; });

  const deps = {
    provider,
    config,
    tracker: { markProcessing, markComplete, markFailed, getProcessedTickets },
  };

  while (running) {
    try {
      // Check error budget
      if (!errorBudget.canProcess) {
        log('ERROR BUDGET EXHAUSTED — daemon paused. Run "mg-daemon resume" to continue.');
        writeHeartbeat(heartbeatConfig);
        await sleep(intervalMs);
        continue;
      }

      log('Polling for tickets...');
      const results = await runPollCycle(deps);

      if (results.length === 0) {
        log('No tickets to process.');
      } else {
        for (const r of results) {
          if (r.success) {
            log(`[${r.ticketId}] ${dryRun ? 'PLANNED' : 'COMPLETED'} — ${r.planned.length} workstreams${r.prUrl ? ` → ${r.prUrl}` : ''}`);
            errorBudget.recordSuccess();
          } else {
            log(`[${r.ticketId}] FAILED — ${r.error ?? 'unknown error'}`);
            errorBudget.recordFailure(r.error ?? 'unknown');
          }
        }
      }

      errorBudget.save(errorBudgetPath);
      writeHeartbeat(heartbeatConfig);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`Poll cycle error: ${msg}`);
      errorBudget.recordFailure(msg);
      errorBudget.save(errorBudgetPath);
    }

    await sleep(intervalMs);
  }

  log('Daemon shutting down.');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute the start command
 * AC-3.2: Starts daemon and prints PID
 * AC-3.3: --foreground runs in foreground with stdout logs
 * WS-DAEMON-14: --dry-run polls tickets and runs planning but does NOT execute builds
 */
export function cmdStart(foreground: boolean = false, dryRun: boolean = false): void {
  const result = startDaemon();

  // Persist dry-run flag to state file
  try {
    if (!existsSync('.mg-daemon')) {
      mkdirSync('.mg-daemon', { recursive: true });
    }
    writeFileSync(DRY_RUN_STATE_FILE, dryRun ? 'true' : 'false', 'utf-8');
  } catch {
    // Non-fatal
  }

  const mode = dryRun ? 'dry-run' : foreground ? 'foreground' : 'background';
  console.log(`Daemon started (PID: ${result.pid}, mode: ${mode})`);

  if (foreground) {
    // Enter the poll loop — this blocks until SIGTERM/SIGINT
    runForegroundLoop(dryRun).catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
  }
}

/**
 * Read the dry-run flag from the state file written by cmdStart.
 * Returns false if no state file exists.
 */
export function readDryRunFlag(): boolean {
  try {
    if (!existsSync(DRY_RUN_STATE_FILE)) return false;
    return readFileSync(DRY_RUN_STATE_FILE, 'utf-8').trim() === 'true';
  } catch {
    return false;
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
 * WS-DAEMON-13: Includes heartbeat staleness check
 */
export function cmdStatus(): void {
  const status = statusDaemon();
  if (status.running && status.pid !== undefined && status.uptimeMs !== undefined) {
    const uptimeSeconds = Math.floor(status.uptimeMs / 1000);
    console.log(`Daemon is running (PID: ${status.pid}, uptime: ${uptimeSeconds}s)`);

    // Heartbeat staleness check
    const heartbeatPath = join('.mg-daemon', 'heartbeat');
    const heartbeatConfig = { heartbeatPath, intervalMs: 60000 };
    if (isStale(heartbeatConfig)) {
      console.warn('WARNING: Heartbeat is stale. Daemon may be unresponsive.');
    }
  } else {
    console.log('Daemon is not running.');
  }
}

/**
 * Execute the install command
 * WS-DAEMON-13: Installs daemon as a launchd service
 * P0-1: Accepts optional --user <username> to run as a dedicated system user
 */
export function cmdInstall(username?: string): void {
  let nodePath = process.execPath;
  let daemonPath = join(__dirname, 'cli.js');
  const projectPath = join(process.cwd(), '..');
  const label = `com.mg-daemon.${basename(projectPath)}`;

  const config = { label, projectPath, daemonPath, nodePath, username };
  installService(config);
  console.log(`Service installed: ${label}`);
  console.log(`Plist written to ~/Library/LaunchAgents/${label}.plist`);
  if (username) {
    console.log(`Service configured to run as user: ${username}`);
  }
}

/**
 * Execute the setup-user command
 * P0-1: Creates a dedicated mg-daemon system user for running the daemon securely
 */
export function cmdSetupUser(username: string = 'mg-daemon'): void {
  console.log(`Setting up dedicated system user: ${username}`);
  console.log(formatSetupInstructions(username));
  console.log('');

  const result = createDaemonUser(username);
  if (result.created) {
    console.log(`User ${result.username} created successfully (UID: ${result.uid}).`);
    console.log(`Run 'mg-daemon install --user ${result.username}' to use this user.`);
  } else if (result.error) {
    console.error(`Failed to create user ${result.username}: ${result.error}`);
    console.error('Try running with sudo: sudo mg-daemon setup-user');
    process.exit(1);
  } else {
    console.log(`User ${result.username} already exists. No action needed.`);
  }
}

/**
 * Execute the uninstall command
 * WS-DAEMON-13: Removes the launchd service
 */
export function cmdUninstall(): void {
  const projectPath = join(process.cwd(), '..');
  const label = `com.mg-daemon.${basename(projectPath)}`;

  uninstallService(label);
  console.log(`Service uninstalled: ${label}`);
}

/**
 * Execute the dashboard command
 * WS-DAEMON-14: Shows pipeline status in an 80-column ASCII dashboard
 */
export function cmdDashboard(): void {
  const config = loadConfig();
  const data = gatherDashboardData(config);
  console.log(formatDashboard(data));
}

/**
 * Execute the resume command
 * WS-DAEMON-14: Clears the error budget pause so the daemon resumes processing
 */
export function cmdResume(): void {
  const errorBudgetPath = join('.mg-daemon', 'error-budget.json');
  const config = loadConfig();
  const threshold = config.orchestration?.errorBudget ?? 3;
  const budget = ErrorBudget.load(errorBudgetPath, { threshold });
  budget.resume();
  budget.save(errorBudgetPath);
  console.log('Error budget reset. Daemon will resume processing on next poll.');
}

/**
 * Execute the setup-mac command
 * WS-DAEMON-13: Validates prerequisites and guides setup
 */
export function cmdSetupMac(): void {
  console.log('Checking prerequisites for mg-daemon on macOS...\n');
  const results = checkPrereqs();
  const report = formatPrereqReport(results);
  console.log(report);
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
        const dryRun = args.includes('--dry-run');
        cmdStart(foreground, dryRun);
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
      case 'install': {
        // P0-1: --user <username> runs the daemon as a dedicated system user
        const userFlagIndex = args.indexOf('--user');
        const installUsername = userFlagIndex !== -1 ? args[userFlagIndex + 1] : undefined;
        cmdInstall(installUsername);
        break;
      }
      case 'uninstall':
        cmdUninstall();
        break;
      case 'setup-mac':
        cmdSetupMac();
        break;
      case 'setup-user': {
        // P0-1: Create a dedicated system user for running the daemon
        const setupUsername = args[1] ?? 'mg-daemon';
        cmdSetupUser(setupUsername);
        break;
      }
      case 'dashboard':
        cmdDashboard();
        break;
      case 'resume':
        cmdResume();
        break;
      default:
        console.error('Unknown command. Usage: mg-daemon <init|start|stop|status|logs|install|uninstall|setup-mac|setup-user|dashboard|resume>');
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
