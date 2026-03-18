// Dedicated mg-daemon user setup for macOS
// P0-1: Security hardening — run daemon as unprivileged system user

import { spawnSync } from 'child_process';

export interface SetupUserResult {
  created: boolean;
  username: string;
  uid?: number;
  error?: string;
}

/**
 * Check if a user exists on macOS.
 * Uses `id -u <username>` — exit code 0 means the user exists.
 */
export function userExists(username: string = 'mg-daemon'): boolean {
  const result = spawnSync('id', ['-u', username], { encoding: 'utf-8', stdio: 'pipe' });
  return result.status === 0;
}

/**
 * Create a dedicated mg-daemon system user on macOS.
 * Requires sudo/root privileges. All dscl invocations use argv arrays (no shell injection).
 *
 * The user is created with:
 * - No login shell (/usr/bin/false)
 * - Home directory set to /var/empty
 * - Hidden from login window
 * - RealName "MG Daemon Service"
 */
export function createDaemonUser(username: string = 'mg-daemon'): SetupUserResult {
  if (userExists(username)) {
    return { created: false, username };
  }

  const userPath = `/Users/${username}`;

  // Find the next available UID (starting at 300 to avoid conflicts with system/regular users)
  const nextUid = findNextAvailableUid(300);

  const dsclCommands: string[][] = [
    ['.', '-create', userPath],
    ['.', '-create', userPath, 'UserShell', '/usr/bin/false'],
    ['.', '-create', userPath, 'RealName', 'MG Daemon Service'],
    ['.', '-create', userPath, 'UniqueID', String(nextUid)],
    ['.', '-create', userPath, 'PrimaryGroupID', '20'],
    ['.', '-create', userPath, 'NFSHomeDirectory', '/var/empty'],
    // Hide from login window
    ['.', '-create', userPath, 'IsHidden', '1'],
  ];

  for (const args of dsclCommands) {
    const result = spawnSync('dscl', args, { encoding: 'utf-8', stdio: 'pipe' });
    if (result.status !== 0) {
      const errMsg = result.stderr?.toString().trim() || `dscl ${args.join(' ')} failed`;
      return { created: false, username, error: errMsg };
    }
  }

  return { created: true, username, uid: nextUid };
}

/**
 * Find the next available UID starting at the given value.
 * Uses `dscl . -list /Users UniqueID` to collect taken UIDs.
 */
function findNextAvailableUid(startAt: number): number {
  const result = spawnSync('dscl', ['.', '-list', '/Users', 'UniqueID'], {
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  const takenUids = new Set<number>();
  if (result.status === 0 && result.stdout) {
    for (const line of result.stdout.split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const uid = parseInt(parts[1], 10);
        if (!isNaN(uid)) takenUids.add(uid);
      }
    }
  }

  let uid = startAt;
  while (takenUids.has(uid)) {
    uid++;
  }
  return uid;
}

/**
 * Format human-readable setup instructions for creating the mg-daemon user.
 */
export function formatSetupInstructions(username: string): string {
  return [
    `To create the dedicated ${username} system user, run:`,
    '',
    `  sudo mg-daemon setup-user`,
    '',
    'This will execute the following dscl commands:',
    `  sudo dscl . -create /Users/${username}`,
    `  sudo dscl . -create /Users/${username} UserShell /usr/bin/false`,
    `  sudo dscl . -create /Users/${username} RealName "MG Daemon Service"`,
    `  sudo dscl . -create /Users/${username} UniqueID <next-available>`,
    `  sudo dscl . -create /Users/${username} PrimaryGroupID 20`,
    `  sudo dscl . -create /Users/${username} NFSHomeDirectory /var/empty`,
    '',
    `The ${username} user will have no login shell and no home directory,`,
    'minimizing the attack surface if the daemon process is compromised.',
  ].join('\n');
}
