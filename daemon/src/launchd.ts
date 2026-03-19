// macOS launchd integration for miniature-guacamole daemon
// WS-DAEMON-13: Mac Mini Setup & Process Hardening

import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { execSync, spawnSync } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';

export interface LaunchdConfig {
  label: string;       // e.g. "com.mg-daemon.my-project"
  projectPath: string; // absolute path to project root
  daemonPath: string;  // absolute path to daemon dist/cli.js
  nodePath: string;    // absolute path to node binary
  username?: string;   // if set, adds UserName to plist so launchd runs as this user
  extraPath?: string;  // additional PATH entries (launchd has minimal PATH by default)
}

/**
 * Escape special XML characters to prevent injection in plist values.
 * Covers the five predefined XML entities.
 */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getPlistPath(label: string): string {
  return join(homedir(), 'Library', 'LaunchAgents', `${label}.plist`);
}

/**
 * Generate a macOS launchd plist XML string for the daemon.
 * Configures auto-start on boot, restart on crash, working directory,
 * and stdout/stderr log paths.
 */
export function generatePlist(config: LaunchdConfig): string {
  const { label, projectPath, daemonPath, nodePath, username, extraPath } = config;
  const stdoutPath = join(projectPath, '.mg-daemon', 'daemon.log');
  const stderrPath = join(projectPath, '.mg-daemon', 'daemon.err');

  const userNameBlock = username
    ? `    <key>UserName</key>\n    <string>${xmlEscape(username)}</string>\n`
    : '';

  // launchd has a minimal PATH (/usr/bin:/bin:/usr/sbin:/sbin).
  // Tools like gh, git, claude need Homebrew and Volta paths.
  const pathValue = extraPath
    ? `${extraPath}:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`
    : '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${xmlEscape(label)}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${xmlEscape(nodePath)}</string>
        <string>${xmlEscape(daemonPath)}</string>
        <string>start</string>
        <string>--foreground</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${xmlEscape(projectPath)}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>${xmlEscape(pathValue)}</string>
        <key>HOME</key>
        <string>${xmlEscape(homedir())}</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>ThrottleInterval</key>
    <integer>30</integer>
    <key>ProcessType</key>
    <string>Background</string>
    <key>LowPriorityIO</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${xmlEscape(stdoutPath)}</string>
    <key>StandardErrorPath</key>
    <string>${xmlEscape(stderrPath)}</string>
${userNameBlock}</dict>
</plist>
`;
}

/**
 * Install the daemon as a launchd service.
 * 1. Generate plist
 * 2. Write to ~/Library/LaunchAgents/{label}.plist
 * 3. Run: launchctl load ~/Library/LaunchAgents/{label}.plist
 */
export function installService(config: LaunchdConfig): void {
  const plistPath = getPlistPath(config.label);
  const plistContent = generatePlist(config);

  writeFileSync(plistPath, plistContent, 'utf-8');

  execSync(`launchctl load "${plistPath}"`, { stdio: 'pipe' });
}

/**
 * Uninstall the daemon launchd service.
 * 1. Run: launchctl unload ~/Library/LaunchAgents/{label}.plist
 * 2. Delete plist file
 */
export function uninstallService(label: string): void {
  const plistPath = getPlistPath(label);

  try {
    execSync(`launchctl unload "${plistPath}"`, { stdio: 'pipe' });
  } catch {
    // Gracefully handle launchctl failure (service may not be loaded)
  }

  if (existsSync(plistPath)) {
    unlinkSync(plistPath);
  }
}

/**
 * Get the status of a launchd service.
 * Parses output of: launchctl list | grep {label}
 * Output columns: PID  Status  Label
 */
export function getServiceStatus(label: string): {
  loaded: boolean;
  running: boolean;
  pid?: number;
} {
  try {
    // MED-4: Use spawnSync for launchctl list — filter in JS to avoid grep injection
    const list = spawnSync('launchctl', ['list'], { encoding: 'utf-8', stdio: 'pipe' });
    if (list.status !== 0) {
      return { loaded: false, running: false };
    }

    const line = list.stdout.split('\n').find(l => l.includes(label));

    if (!line || !line.trim()) {
      return { loaded: false, running: false };
    }

    // Format: PID\tStatus\tLabel
    const parts = line.trim().split('\t');
    const pidStr = parts[0]?.trim();

    if (!pidStr || pidStr === '-') {
      return { loaded: true, running: false };
    }

    const pid = parseInt(pidStr, 10);
    if (isNaN(pid)) {
      return { loaded: true, running: false };
    }

    return { loaded: true, running: true, pid };
  } catch {
    return { loaded: false, running: false };
  }
}
