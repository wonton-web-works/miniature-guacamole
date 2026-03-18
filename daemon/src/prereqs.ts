// Prerequisite validator for miniature-guacamole daemon
// WS-DAEMON-13: Mac Mini Setup & Process Hardening

import { execSync } from 'child_process';

export interface PrereqResult {
  name: string;
  found: boolean;
  version?: string;
  path?: string;
  error?: string;
}

const TOOLS = ['node', 'gh', 'claude', 'git'] as const;

type Tool = (typeof TOOLS)[number];

function checkTool(name: Tool): PrereqResult {
  try {
    const toolPath = execSync(`which ${name}`, { stdio: 'pipe' })
      .toString()
      .trim();

    let version: string | undefined;
    try {
      version = execSync(`${name} --version`, { stdio: 'pipe' })
        .toString()
        .trim()
        .split('\n')[0]; // first line only
    } catch {
      // Version check failed but tool was found via which
    }

    return { name, found: true, path: toolPath, version };
  } catch (error) {
    const err = error as Error;
    return {
      name,
      found: false,
      error: err.message || `${name} not found`,
    };
  }
}

/**
 * Check for all required prerequisite tools.
 * Returns one PrereqResult per tool: node, gh, claude, git.
 */
export function checkPrereqs(): PrereqResult[] {
  return TOOLS.map(checkTool);
}

/**
 * Format prerequisite check results as a readable terminal report.
 * Output fits within 80 columns.
 */
export function formatPrereqReport(results: PrereqResult[]): string {
  if (results.length === 0) {
    return 'No prerequisites to check.';
  }

  const lines: string[] = ['Prerequisite Check', '=================='];

  for (const result of results) {
    const status = result.found ? 'OK' : 'MISSING';
    const detail = result.found
      ? result.version
        ? `${result.path} (${result.version})`
        : result.path ?? ''
      : result.error ?? 'not found';

    // Format: "  node      OK    /usr/local/bin/node (v20.0.0)"
    const namePad = result.name.padEnd(10);
    const statusPad = status.padEnd(8);
    const fullLine = `  ${namePad}${statusPad}${detail}`;

    // Truncate to 80 chars if needed
    lines.push(fullLine.length > 80 ? fullLine.slice(0, 80) : fullLine);
  }

  const allFound = results.every((r) => r.found);
  lines.push('');
  lines.push(allFound ? 'All prerequisites satisfied.' : 'Some prerequisites are missing. Install the tools listed above.');

  return lines.join('\n');
}
