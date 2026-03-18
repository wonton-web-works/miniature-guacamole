import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync, statSync, chmodSync } from 'fs';

// Module under test
import { loadConfig, initConfig, validateConfig } from '../../src/config';
import type { DaemonConfig, ValidationError } from '../../src/types';

// Mock fs module at module level
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  statSync: vi.fn(),
  chmodSync: vi.fn(),
}));

// Helper: minimal valid config for each provider
function validJiraConfig(): DaemonConfig {
  return {
    provider: 'jira',
    jira: {
      host: 'https://example.atlassian.net',
      email: 'test@example.com',
      apiToken: 'test-token',
      project: 'PROJ',
      jql: 'project = PROJ AND status = "To Do"',
    },
    github: {
      repo: 'owner/repo',
      baseBranch: 'main',
    },
    polling: { intervalSeconds: 60, batchSize: 5 },
  };
}

function validLinearConfig(): DaemonConfig {
  return {
    provider: 'linear',
    linear: {
      apiKey: 'lin_api_test123',
      teamId: 'team-abc',
      filter: 'state[name][eq]: "Todo"',
    },
    github: {
      repo: 'owner/repo',
      baseBranch: 'main',
    },
    polling: { intervalSeconds: 60, batchSize: 5 },
  };
}

function validGitHubConfig(): DaemonConfig {
  return {
    provider: 'github',
    github: {
      repo: 'owner/repo',
      baseBranch: 'main',
      issueFilter: 'label:mg-daemon state:open',
    },
    polling: { intervalSeconds: 60, batchSize: 5 },
  };
}

describe('Configuration Module (Updated for multi-provider schema)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // statSync returns mode 0o100600 (owner-readable only) so chmodSync is not called
    vi.mocked(statSync).mockReturnValue({ mode: 0o100600 } as ReturnType<typeof statSync>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadConfig()', () => {
    describe('AC-1.1: Error handling when config file does not exist', () => {
      it('GIVEN no config file exists WHEN loadConfig() called THEN throws "Config not found. Run mg-daemon init."', () => {
        vi.mocked(existsSync).mockReturnValue(false);
        expect(() => loadConfig()).toThrow('Config not found. Run mg-daemon init.');
      });

      it('GIVEN no config file exists WHEN loadConfig() called THEN the error is an Error instance', () => {
        vi.mocked(existsSync).mockReturnValue(false);
        expect(() => loadConfig()).toThrowError(Error);
      });
    });

    describe('AC-1.4: Validation of required fields', () => {
      it('GIVEN config missing provider field WHEN loadConfig() called THEN throws with "provider" in message', () => {
        const invalid = { github: { repo: 'x/y', baseBranch: 'main' }, polling: { intervalSeconds: 60, batchSize: 5 } };
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalid));

        expect(() => loadConfig()).toThrow();
        try {
          loadConfig();
        } catch (error: unknown) {
          expect((error as Error).message).toContain('provider');
        }
      });

      it('GIVEN provider="jira" with missing jira.apiToken WHEN loadConfig() called THEN throws with "jira.apiToken" in message', () => {
        const invalid = {
          ...validJiraConfig(),
          jira: { host: 'https://example.atlassian.net', apiToken: '', project: 'PROJ', jql: 'project = PROJ' },
        };
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalid));

        expect(() => loadConfig()).toThrow();
        try {
          loadConfig();
        } catch (error: unknown) {
          expect((error as Error).message).toContain('jira.apiToken');
        }
      });

      it('GIVEN provider="jira" with invalid jira.host URL WHEN loadConfig() called THEN throws with "jira.host must be a valid URL"', () => {
        const invalid = {
          ...validJiraConfig(),
          jira: { host: 'not-a-url', apiToken: 'token', project: 'PROJ', jql: 'q' },
        };
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalid));

        expect(() => loadConfig()).toThrow('jira.host must be a valid URL');
      });

      it('GIVEN provider="linear" with missing linear.apiKey WHEN loadConfig() called THEN throws with "linear.apiKey"', () => {
        const invalid = {
          ...validLinearConfig(),
          linear: { apiKey: '', teamId: 'team-123', filter: '' },
        };
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalid));

        expect(() => loadConfig()).toThrow();
        try {
          loadConfig();
        } catch (error: unknown) {
          expect((error as Error).message).toContain('linear.apiKey');
        }
      });

      it('GIVEN config missing github.repo WHEN loadConfig() called THEN throws with "github.repo"', () => {
        const invalid = { ...validJiraConfig(), github: { repo: '', baseBranch: 'main' } };
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalid));

        expect(() => loadConfig()).toThrow();
        try {
          loadConfig();
        } catch (error: unknown) {
          expect((error as Error).message).toContain('github.repo');
        }
      });

      it('GIVEN config missing github.baseBranch WHEN loadConfig() called THEN throws with "github.baseBranch"', () => {
        const invalid = { ...validJiraConfig(), github: { repo: 'owner/repo', baseBranch: '' } };
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalid));

        expect(() => loadConfig()).toThrow();
        try {
          loadConfig();
        } catch (error: unknown) {
          expect((error as Error).message).toContain('github.baseBranch');
        }
      });

      it('GIVEN config with multiple missing required fields WHEN loadConfig() called THEN all errors reported', () => {
        const invalid = {
          provider: 'jira',
          jira: { host: 'https://example.atlassian.net', apiToken: '', project: '', jql: '' },
          github: { repo: '', baseBranch: '' },
          polling: { intervalSeconds: 60, batchSize: 5 },
        };
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalid));

        expect(() => loadConfig()).toThrow();
        try {
          loadConfig();
        } catch (error: unknown) {
          const message = (error as Error).message;
          expect(message).toContain('jira.apiToken');
          expect(message).toContain('jira.project');
          expect(message).toContain('github.repo');
        }
      });
    });

    describe('AC-1.5: URL validation for jira.host', () => {
      it('GIVEN jira.host missing protocol WHEN loadConfig() called THEN throws with "jira.host must be a valid URL"', () => {
        const invalid = {
          ...validJiraConfig(),
          jira: { host: 'example.atlassian.net', apiToken: 'tok', project: 'P', jql: 'q' },
        };
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalid));

        expect(() => loadConfig()).toThrow('jira.host must be a valid URL');
      });
    });

    describe('AC-1.6: Valid configuration loading', () => {
      it('GIVEN valid jira config WHEN loadConfig() called THEN returns typed DaemonConfig', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validJiraConfig()));

        const config = loadConfig();
        expect(config.provider).toBe('jira');
        expect(config.jira?.host).toBe('https://example.atlassian.net');
        expect(config.github.repo).toBe('owner/repo');
        expect(config.polling.intervalSeconds).toBe(60);
      });

      it('GIVEN valid linear config WHEN loadConfig() called THEN returns typed DaemonConfig', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validLinearConfig()));

        const config = loadConfig();
        expect(config.provider).toBe('linear');
        expect(config.linear?.apiKey).toBe('lin_api_test123');
      });

      it('GIVEN valid github config WHEN loadConfig() called THEN returns typed DaemonConfig', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validGitHubConfig()));

        const config = loadConfig();
        expect(config.provider).toBe('github');
        expect(config.github.repo).toBe('owner/repo');
      });
    });

    describe('Edge cases and error handling', () => {
      it('GIVEN config file with invalid JSON WHEN loadConfig() called THEN throws a parse error', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue('{ invalid json }');

        expect(() => loadConfig()).toThrow();
      });

      it('GIVEN config file with null jira section WHEN loadConfig() with provider=jira THEN throws validation error', () => {
        const invalid = { provider: 'jira', jira: null, github: { repo: 'x', baseBranch: 'main' }, polling: { intervalSeconds: 60, batchSize: 5 } };
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalid));

        expect(() => loadConfig()).toThrow();
      });
    });
  });

  describe('initConfig()', () => {
    describe('AC-1.2: Config file initialization with template', () => {
      it('GIVEN no .mg-daemon.json exists WHEN initConfig() called THEN creates template with provider field', () => {
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(writeFileSync).mockImplementation(() => {});

        initConfig();

        expect(writeFileSync).toHaveBeenCalledOnce();
        const writeCall = vi.mocked(writeFileSync).mock.calls[0];
        const config = JSON.parse(writeCall[1] as string);

        expect(config.provider).toBeDefined();
        expect(['jira', 'linear', 'github']).toContain(config.provider);
      });

      it('GIVEN no .mg-daemon.json exists WHEN initConfig() called THEN template has jira, linear, github sections', () => {
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(writeFileSync).mockImplementation(() => {});

        initConfig();

        const writeCall = vi.mocked(writeFileSync).mock.calls[0];
        const config = JSON.parse(writeCall[1] as string);

        expect(config.jira).toBeDefined();
        expect(config.jira.host).toBeDefined();
        expect(config.jira.email).toBeDefined();
        expect(config.jira.apiToken).toBeDefined();
        expect(config.jira.project).toBeDefined();
        expect(config.jira.jql).toBeDefined();

        expect(config.linear).toBeDefined();
        expect(config.linear.apiKey).toBeDefined();
        expect(config.linear.teamId).toBeDefined();

        expect(config.github).toBeDefined();
        expect(config.github.repo).toBeDefined();
        expect(config.github.baseBranch).toBeDefined();

        expect(config.polling).toBeDefined();
        expect(config.polling.intervalSeconds).toBeDefined();
        expect(config.polling.batchSize).toBeDefined();
      });

      it('GIVEN initConfig() WHEN template created THEN JSON is properly formatted with indentation', () => {
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(writeFileSync).mockImplementation(() => {});

        initConfig();

        const writeCall = vi.mocked(writeFileSync).mock.calls[0];
        const writtenContent = writeCall[1] as string;

        expect(writtenContent).toContain('\n');
        expect(writtenContent).toMatch(/  "/); // 2-space indentation
      });

      it('GIVEN initConfig() WHEN called THEN template has placeholder values for secrets', () => {
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(writeFileSync).mockImplementation(() => {});

        initConfig();

        const writeCall = vi.mocked(writeFileSync).mock.calls[0];
        const config = JSON.parse(writeCall[1] as string);

        expect(config.jira.apiToken).toMatch(/YOUR_|your-|<|placeholder/i);
        expect(config.linear.apiKey).toMatch(/YOUR_|your-|<|placeholder/i);
      });

      it('GIVEN initConfig() WHEN called THEN file is written to path containing .mg-daemon.json', () => {
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(writeFileSync).mockImplementation(() => {});

        initConfig();

        const writeCall = vi.mocked(writeFileSync).mock.calls[0];
        const filePath = writeCall[0] as string;
        expect(filePath).toMatch(/\.mg-daemon\.json$/);
      });
    });

    describe('AC-1.3: Config already exists error handling', () => {
      it('GIVEN .mg-daemon.json already exists WHEN initConfig() called THEN throws "Config already exists"', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        expect(() => initConfig()).toThrow('Config already exists');
      });

      it('GIVEN .mg-daemon.json already exists WHEN initConfig() called THEN does not overwrite existing config', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(writeFileSync).mockImplementation(() => {});

        try {
          initConfig();
        } catch {
          // Expected to throw
        }

        expect(writeFileSync).not.toHaveBeenCalled();
      });
    });
  });

  describe('validateConfig()', () => {
    describe('AC: provider field validation', () => {
      it('GIVEN config with valid provider="jira" WHEN validateConfig() THEN no provider error', () => {
        const errors = validateConfig(validJiraConfig());
        const providerError = errors.find((e: ValidationError) => e.field === 'provider');
        expect(providerError).toBeUndefined();
      });

      it('GIVEN config with valid provider="linear" WHEN validateConfig() THEN no provider error', () => {
        const errors = validateConfig(validLinearConfig());
        const providerError = errors.find((e: ValidationError) => e.field === 'provider');
        expect(providerError).toBeUndefined();
      });

      it('GIVEN config with valid provider="github" WHEN validateConfig() THEN no provider error', () => {
        const errors = validateConfig(validGitHubConfig());
        const providerError = errors.find((e: ValidationError) => e.field === 'provider');
        expect(providerError).toBeUndefined();
      });

      it('GIVEN config with missing provider WHEN validateConfig() THEN returns provider error', () => {
        const config = { ...validJiraConfig() };
        (config as Record<string, unknown>).provider = undefined;
        const errors = validateConfig(config as DaemonConfig);
        expect(errors.some((e: ValidationError) => e.field === 'provider')).toBe(true);
      });

      it('GIVEN config with invalid provider WHEN validateConfig() THEN returns provider error', () => {
        const config = { ...validJiraConfig(), provider: 'slack' as 'jira' };
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'provider')).toBe(true);
      });
    });

    describe('AC: provider="jira" validates only jira section', () => {
      it('GIVEN valid jira config WHEN validateConfig() called THEN returns empty errors array', () => {
        const errors = validateConfig(validJiraConfig());
        expect(errors).toEqual([]);
      });

      it('GIVEN provider="jira" with missing jira.host WHEN validateConfig() THEN errors contain jira.host', () => {
        const config = validJiraConfig();
        config.jira!.host = '';
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'jira.host')).toBe(true);
      });

      it('GIVEN provider="jira" with invalid jira.host URL WHEN validateConfig() THEN errors contain URL error', () => {
        const config = validJiraConfig();
        config.jira!.host = 'not-a-url';
        const errors = validateConfig(config);
        const hostError = errors.find((e: ValidationError) => e.field === 'jira.host');
        expect(hostError?.message).toContain('must be a valid URL');
      });

      it('GIVEN provider="jira" with missing jira.email WHEN validateConfig() THEN errors contain jira.email', () => {
        const config = validJiraConfig();
        config.jira!.email = '';
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'jira.email')).toBe(true);
      });

      it('GIVEN provider="jira" with missing jira.apiToken WHEN validateConfig() THEN errors contain jira.apiToken', () => {
        const config = validJiraConfig();
        config.jira!.apiToken = '';
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'jira.apiToken')).toBe(true);
      });

      it('GIVEN provider="jira" with missing jira.project WHEN validateConfig() THEN errors contain jira.project', () => {
        const config = validJiraConfig();
        config.jira!.project = '';
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'jira.project')).toBe(true);
      });

      it('GIVEN provider="jira" with missing jira.jql WHEN validateConfig() THEN errors contain jira.jql', () => {
        const config = validJiraConfig();
        config.jira!.jql = '';
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'jira.jql')).toBe(true);
      });
    });

    describe('AC: provider="linear" validates only linear section', () => {
      it('GIVEN valid linear config WHEN validateConfig() THEN returns empty errors array', () => {
        const errors = validateConfig(validLinearConfig());
        expect(errors).toEqual([]);
      });

      it('GIVEN provider="linear" with missing linear.apiKey WHEN validateConfig() THEN errors contain linear.apiKey', () => {
        const config = validLinearConfig();
        config.linear!.apiKey = '';
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'linear.apiKey')).toBe(true);
      });

      it('GIVEN provider="linear" with missing linear.teamId WHEN validateConfig() THEN errors contain linear.teamId', () => {
        const config = validLinearConfig();
        config.linear!.teamId = '';
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'linear.teamId')).toBe(true);
      });

      it('GIVEN provider="linear" THEN does NOT validate jira.host (jira section not required)', () => {
        const config = validLinearConfig();
        // No jira section at all
        const errors = validateConfig(config);
        const jiraError = errors.find((e: ValidationError) => e.field.startsWith('jira'));
        expect(jiraError).toBeUndefined();
      });
    });

    describe('AC: provider="github" validates github section only', () => {
      it('GIVEN valid github config WHEN validateConfig() THEN returns empty errors array', () => {
        const errors = validateConfig(validGitHubConfig());
        expect(errors).toEqual([]);
      });
    });

    describe('AC: github section always validated (needed for PR creation)', () => {
      it('GIVEN provider="jira" with missing github.repo WHEN validateConfig() THEN errors contain github.repo', () => {
        const config = validJiraConfig();
        config.github.repo = '';
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'github.repo')).toBe(true);
      });

      it('GIVEN provider="jira" with missing github.baseBranch WHEN validateConfig() THEN errors contain github.baseBranch', () => {
        const config = validJiraConfig();
        config.github.baseBranch = '';
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'github.baseBranch')).toBe(true);
      });
    });

    describe('AC: polling section validated', () => {
      it('GIVEN config with negative polling.intervalSeconds WHEN validateConfig() THEN errors contain polling.intervalSeconds', () => {
        const config = validJiraConfig();
        config.polling.intervalSeconds = -1;
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'polling.intervalSeconds')).toBe(true);
      });

      it('GIVEN config with zero polling.batchSize WHEN validateConfig() THEN errors contain polling.batchSize', () => {
        const config = validJiraConfig();
        config.polling.batchSize = 0;
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'polling.batchSize')).toBe(true);
      });

      it('GIVEN config with zero polling.intervalSeconds WHEN validateConfig() THEN errors contain polling.intervalSeconds', () => {
        const config = validJiraConfig();
        config.polling.intervalSeconds = 0;
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'polling.intervalSeconds')).toBe(true);
      });

      it('GIVEN config with negative polling.batchSize WHEN validateConfig() THEN errors contain polling.batchSize', () => {
        const config = validJiraConfig();
        config.polling.batchSize = -1;
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'polling.batchSize')).toBe(true);
      });
    });

    describe('AC: ValidationError structure', () => {
      it('GIVEN validation fails THEN each error has field and message string properties', () => {
        const config = validJiraConfig();
        config.jira!.host = '';
        const errors = validateConfig(config);

        expect(errors.length).toBeGreaterThan(0);
        errors.forEach((e: ValidationError) => {
          expect(typeof e.field).toBe('string');
          expect(typeof e.message).toBe('string');
        });
      });
    });
  });
});
