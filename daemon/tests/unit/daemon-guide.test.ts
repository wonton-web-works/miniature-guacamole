import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Documentation verification tests for docs/daemon-guide.md
 * Misuse-first: verify guide exists, contains required sections,
 * and code examples match current source.
 */

const GUIDE_PATH = resolve(__dirname, '../../../docs/daemon-guide.md');

let guide: string;

beforeAll(() => {
  expect(existsSync(GUIDE_PATH), `docs/daemon-guide.md must exist at ${GUIDE_PATH}`).toBe(true);
  guide = readFileSync(GUIDE_PATH, 'utf-8');
});

describe('docs/daemon-guide.md existence and structure', () => {
  it('file exists', () => {
    expect(existsSync(GUIDE_PATH)).toBe(true);
  });

  it('is non-empty', () => {
    expect(guide.length).toBeGreaterThan(500);
  });

  it('has a title', () => {
    expect(guide).toMatch(/^# /m);
  });
});

describe('config schema documentation', () => {
  it('documents .mg-daemon.json as config file', () => {
    expect(guide).toContain('.mg-daemon.json');
  });

  it('documents the provider field with all three options', () => {
    expect(guide).toContain('provider');
    expect(guide).toMatch(/jira.*linear.*github|"jira" \| "linear" \| "github"/);
  });

  it('documents jira config fields', () => {
    const jiraFields = ['jira.host', 'jira.email', 'jira.apiToken', 'jira.project', 'jira.jql'];
    for (const field of jiraFields) {
      expect(guide).toContain(field);
    }
  });

  it('documents linear config fields', () => {
    const linearFields = ['linear.apiKey', 'linear.teamId'];
    for (const field of linearFields) {
      expect(guide).toContain(field);
    }
  });

  it('documents github config fields', () => {
    const githubFields = ['github.repo', 'github.baseBranch'];
    for (const field of githubFields) {
      expect(guide).toContain(field);
    }
  });

  it('documents polling config fields', () => {
    expect(guide).toContain('polling.intervalSeconds');
    expect(guide).toContain('polling.batchSize');
  });

  it('documents orchestration config fields', () => {
    const orchFields = ['claudeTimeout', 'concurrency', 'delayBetweenTicketsMs', 'dryRun', 'errorBudget'];
    for (const field of orchFields) {
      expect(guide).toContain(field);
    }
  });

  it('documents triage config fields', () => {
    expect(guide).toContain('triage.enabled');
    expect(guide).toContain('triage.autoReject');
    expect(guide).toContain('triage.maxTicketSizeChars');
  });

  it('documents file permissions (0o600)', () => {
    expect(guide).toMatch(/600|0o600/);
  });

  it('includes a complete JSON config example', () => {
    // Must have a JSON code block with provider field
    expect(guide).toMatch(/```json[\s\S]*?"provider"[\s\S]*?```/);
  });
});

describe('launchd setup documentation', () => {
  it('documents launchd plist setup', () => {
    expect(guide).toContain('launchd');
    expect(guide).toContain('plist');
  });

  it('documents the install command', () => {
    expect(guide).toContain('mg-daemon install');
  });

  it('documents the uninstall command', () => {
    expect(guide).toContain('mg-daemon uninstall');
  });

  it('documents PATH environment variable in launchd', () => {
    expect(guide).toContain('PATH');
    expect(guide).toContain('/opt/homebrew/bin');
  });

  it('documents HOME environment variable in launchd', () => {
    expect(guide).toContain('HOME');
  });

  it('documents RunAtLoad and KeepAlive behavior', () => {
    expect(guide).toContain('RunAtLoad');
    expect(guide).toContain('KeepAlive');
  });

  it('documents ThrottleInterval', () => {
    expect(guide).toContain('ThrottleInterval');
  });

  it('documents the plist file location', () => {
    expect(guide).toContain('~/Library/LaunchAgents');
  });

  it('documents log paths', () => {
    expect(guide).toContain('daemon.log');
    expect(guide).toContain('daemon.err');
  });

  it('documents the --user flag for dedicated system user', () => {
    expect(guide).toContain('--user');
  });
});

describe('ticket provider setup documentation', () => {
  describe('GitHub provider', () => {
    it('documents gh CLI requirement', () => {
      expect(guide).toMatch(/gh CLI|gh.*command|`gh`/);
    });

    it('documents issueFilter for GitHub', () => {
      expect(guide).toContain('issueFilter');
    });

    it('documents priority labels convention', () => {
      expect(guide).toContain('priority:critical');
    });
  });

  describe('Jira provider', () => {
    it('documents Jira API token setup', () => {
      expect(guide).toMatch(/api[Tt]oken|API token/);
    });

    it('documents JQL query configuration', () => {
      expect(guide).toContain('jql');
    });

    it('documents Jira host URL format', () => {
      expect(guide).toContain('atlassian.net');
    });
  });

  describe('Linear provider', () => {
    it('documents Linear API key', () => {
      expect(guide).toContain('apiKey');
    });

    it('documents Linear team ID', () => {
      expect(guide).toContain('teamId');
    });

    it('documents Linear GraphQL API', () => {
      expect(guide).toMatch(/GraphQL|graphql/);
    });
  });
});

describe('CLI commands documentation', () => {
  const commands = ['init', 'start', 'stop', 'status', 'logs', 'install', 'uninstall', 'dashboard', 'resume', 'setup-mac'];
  for (const cmd of commands) {
    it(`documents the ${cmd} command`, () => {
      expect(guide).toContain(cmd);
    });
  }

  it('documents --foreground flag', () => {
    expect(guide).toContain('--foreground');
  });

  it('documents --dry-run flag', () => {
    expect(guide).toContain('--dry-run');
  });
});

describe('error budget documentation', () => {
  it('documents error budget concept', () => {
    expect(guide).toMatch(/error budget/i);
  });

  it('documents default threshold of 3', () => {
    expect(guide).toContain('3');
  });

  it('documents auto-pause behavior', () => {
    expect(guide).toMatch(/paus/i);
  });

  it('documents the resume command for error budget', () => {
    expect(guide).toContain('resume');
  });
});

describe('safety features documentation', () => {
  it('documents the STOP sentinel file', () => {
    expect(guide).toContain('STOP');
    expect(guide).toContain('.mg-daemon/STOP');
  });

  it('documents disk space check (5 GB)', () => {
    expect(guide).toMatch(/5\s*GB/);
  });

  it('documents heartbeat staleness check', () => {
    expect(guide).toContain('heartbeat');
  });
});

describe('troubleshooting section', () => {
  it('has a troubleshooting section', () => {
    expect(guide).toMatch(/[Tt]roubleshooting/);
  });

  it('covers PATH issues', () => {
    expect(guide).toMatch(/PATH.*issue|PATH.*problem|PATH.*not found/i);
  });

  it('covers auth failures', () => {
    expect(guide).toMatch(/auth.*fail|authentication.*error|token.*invalid/i);
  });

  it('covers crash recovery', () => {
    expect(guide).toMatch(/crash.*recover|restart|KeepAlive/i);
  });

  it('documents the error-budget.json file', () => {
    expect(guide).toContain('error-budget.json');
  });
});

describe('runtime files documentation', () => {
  it('documents the .mg-daemon directory', () => {
    expect(guide).toContain('.mg-daemon');
  });

  it('documents daemon.pid', () => {
    expect(guide).toContain('daemon.pid');
  });

  it('documents heartbeat file', () => {
    expect(guide).toContain('heartbeat');
  });

  it('documents worktrees directory', () => {
    expect(guide).toContain('worktrees');
  });
});
