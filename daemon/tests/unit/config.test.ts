import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'fs';

// Module under test - will be implemented by dev
import { loadConfig, initConfig, validateConfig } from '../../src/config';
import type { DaemonConfig, ValidationError } from '../../src/types';

// Mock fs module at module level
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe('Configuration Module', () => {
  const mockConfigPath = '/Users/brodieyazaki/work/claude_things/miniature-guacamole/.mg-daemon.json';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadConfig()', () => {
    describe('AC-1.1: Error handling when config file does not exist', () => {
      it('GIVEN no config file exists WHEN loadConfig() called THEN it throws a structured error with message "Config not found. Run mg-daemon init."', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(false);

        // Act & Assert
        expect(() => loadConfig()).toThrow('Config not found. Run mg-daemon init.');
      });

      it('GIVEN no config file exists WHEN loadConfig() called THEN the error should be an Error instance', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(false);

        // Act & Assert
        expect(() => loadConfig()).toThrowError(Error);
      });
    });

    describe('AC-1.4: Validation of required fields', () => {
      it('GIVEN config with missing github.token WHEN loadConfig() called THEN it returns structured validation errors array with field and message', () => {
        // Arrange
        const invalidConfig = {
          jira: {
            host: 'https://example.atlassian.net',
            apiToken: 'test-token',
            project: 'PROJ',
            jql: 'project = PROJ',
          },
          github: {
            repo: 'owner/repo',
            token: '', // Missing
            baseBranch: 'main',
          },
          polling: {
            intervalSeconds: 60,
            batchSize: 5,
          },
        };

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalidConfig));

        // Act & Assert
        expect(() => loadConfig()).toThrow();

        // The error should contain validation information
        try {
          loadConfig();
        } catch (error: any) {
          expect(error.message).toContain('github.token');
        }
      });

      it('GIVEN config with missing jira.apiToken WHEN loadConfig() called THEN validation error includes field reference', () => {
        // Arrange
        const invalidConfig = {
          jira: {
            host: 'https://example.atlassian.net',
            apiToken: '', // Missing
            project: 'PROJ',
            jql: 'project = PROJ',
          },
          github: {
            repo: 'owner/repo',
            token: 'ghp_test',
            baseBranch: 'main',
          },
          polling: {
            intervalSeconds: 60,
            batchSize: 5,
          },
        };

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalidConfig));

        // Act & Assert
        expect(() => loadConfig()).toThrow();

        try {
          loadConfig();
        } catch (error: any) {
          expect(error.message).toContain('jira.apiToken');
        }
      });

      it('GIVEN config with missing multiple required fields WHEN loadConfig() called THEN all validation errors are reported', () => {
        // Arrange
        const invalidConfig = {
          jira: {
            host: 'https://example.atlassian.net',
            apiToken: '', // Missing
            project: '',  // Missing
            jql: 'project = PROJ',
          },
          github: {
            repo: '',      // Missing
            token: '',     // Missing
            baseBranch: 'main',
          },
          polling: {
            intervalSeconds: 60,
            batchSize: 5,
          },
        };

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalidConfig));

        // Act & Assert
        expect(() => loadConfig()).toThrow();

        try {
          loadConfig();
        } catch (error: any) {
          const message = error.message;
          expect(message).toContain('jira.apiToken');
          expect(message).toContain('jira.project');
          expect(message).toContain('github.repo');
          expect(message).toContain('github.token');
        }
      });
    });

    describe('AC-1.5: URL validation for jira.host', () => {
      it('GIVEN config with invalid URL for jira.host WHEN loadConfig() called THEN validation error includes "jira.host must be a valid URL"', () => {
        // Arrange
        const invalidConfig = {
          jira: {
            host: 'not-a-valid-url', // Invalid URL
            apiToken: 'test-token',
            project: 'PROJ',
            jql: 'project = PROJ',
          },
          github: {
            repo: 'owner/repo',
            token: 'ghp_test',
            baseBranch: 'main',
          },
          polling: {
            intervalSeconds: 60,
            batchSize: 5,
          },
        };

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalidConfig));

        // Act & Assert
        expect(() => loadConfig()).toThrow('jira.host must be a valid URL');
      });

      it('GIVEN config with jira.host missing protocol WHEN loadConfig() called THEN validation error occurs', () => {
        // Arrange
        const invalidConfig = {
          jira: {
            host: 'example.atlassian.net', // Missing protocol
            apiToken: 'test-token',
            project: 'PROJ',
            jql: 'project = PROJ',
          },
          github: {
            repo: 'owner/repo',
            token: 'ghp_test',
            baseBranch: 'main',
          },
          polling: {
            intervalSeconds: 60,
            batchSize: 5,
          },
        };

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalidConfig));

        // Act & Assert
        expect(() => loadConfig()).toThrow('jira.host must be a valid URL');
      });
    });

    describe('AC-1.6: Valid configuration loading', () => {
      it('GIVEN valid config WHEN loaded THEN it returns typed DaemonConfig object with all fields populated', () => {
        // Arrange
        const validConfig = {
          jira: {
            host: 'https://example.atlassian.net',
            apiToken: 'test-token',
            project: 'PROJ',
            jql: 'project = PROJ AND status = "To Do"',
          },
          github: {
            repo: 'owner/repo',
            token: 'ghp_test123',
            baseBranch: 'main',
          },
          polling: {
            intervalSeconds: 60,
            batchSize: 5,
          },
        };

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validConfig));

        // Act
        const config = loadConfig();

        // Assert - all fields should be populated
        expect(config).toBeDefined();
        expect(config.jira).toBeDefined();
        expect(config.jira.host).toBe('https://example.atlassian.net');
        expect(config.jira.apiToken).toBe('test-token');
        expect(config.jira.project).toBe('PROJ');
        expect(config.jira.jql).toBe('project = PROJ AND status = "To Do"');

        expect(config.github).toBeDefined();
        expect(config.github.repo).toBe('owner/repo');
        expect(config.github.token).toBe('ghp_test123');
        expect(config.github.baseBranch).toBe('main');

        expect(config.polling).toBeDefined();
        expect(config.polling.intervalSeconds).toBe(60);
        expect(config.polling.batchSize).toBe(5);
      });

      it('GIVEN valid config WHEN loaded THEN config object matches DaemonConfig type structure', () => {
        // Arrange
        const validConfig: DaemonConfig = {
          jira: {
            host: 'https://example.atlassian.net',
            apiToken: 'test-token',
            project: 'PROJ',
            jql: 'project = PROJ',
          },
          github: {
            repo: 'owner/repo',
            token: 'ghp_test',
            baseBranch: 'main',
          },
          polling: {
            intervalSeconds: 120,
            batchSize: 10,
          },
        };

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validConfig));

        // Act
        const config = loadConfig();

        // Assert - TypeScript compilation will enforce type safety
        const typedConfig: DaemonConfig = config;
        expect(typedConfig).toEqual(validConfig);
      });
    });

    describe('Edge cases and error handling', () => {
      it('GIVEN config file with invalid JSON WHEN loadConfig() called THEN it throws a parse error', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue('{ invalid json }');

        // Act & Assert
        expect(() => loadConfig()).toThrow();
      });

      it('GIVEN config file with null values WHEN loadConfig() called THEN it throws validation error', () => {
        // Arrange
        const invalidConfig = {
          jira: null,
          github: {
            repo: 'owner/repo',
            token: 'ghp_test',
            baseBranch: 'main',
          },
          polling: {
            intervalSeconds: 60,
            batchSize: 5,
          },
        };

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalidConfig));

        // Act & Assert
        expect(() => loadConfig()).toThrow();
      });
    });
  });

  describe('initConfig()', () => {
    describe('AC-1.2: Config file initialization with template', () => {
      it('GIVEN mg-daemon init run WHEN no .mg-daemon.json exists THEN it creates a template with all required fields', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(writeFileSync).mockImplementation(() => {});

        // Act
        initConfig();

        // Assert
        expect(writeFileSync).toHaveBeenCalledOnce();

        const writeCall = vi.mocked(writeFileSync).mock.calls[0];
        const writtenContent = writeCall[1] as string;
        const config = JSON.parse(writtenContent);

        // Verify all required fields exist
        expect(config.jira).toBeDefined();
        expect(config.jira.host).toBeDefined();
        expect(config.jira.apiToken).toBeDefined();
        expect(config.jira.project).toBeDefined();
        expect(config.jira.jql).toBeDefined();

        expect(config.github).toBeDefined();
        expect(config.github.repo).toBeDefined();
        expect(config.github.token).toBeDefined();
        expect(config.github.baseBranch).toBeDefined();

        expect(config.polling).toBeDefined();
        expect(config.polling.intervalSeconds).toBeDefined();
        expect(config.polling.batchSize).toBeDefined();
      });

      it('GIVEN mg-daemon init run WHEN no .mg-daemon.json exists THEN template has placeholder values for secrets', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(writeFileSync).mockImplementation(() => {});

        // Act
        initConfig();

        // Assert
        const writeCall = vi.mocked(writeFileSync).mock.calls[0];
        const writtenContent = writeCall[1] as string;
        const config = JSON.parse(writtenContent);

        // Secrets should have placeholder values, not real values
        expect(config.jira.apiToken).toMatch(/YOUR_|your-|<|placeholder/i);
        expect(config.github.token).toMatch(/YOUR_|your-|ghp_|<|placeholder/i);
      });

      it('GIVEN mg-daemon init run WHEN no .mg-daemon.json exists THEN file is written to project root', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(writeFileSync).mockImplementation(() => {});

        // Act
        initConfig();

        // Assert
        const writeCall = vi.mocked(writeFileSync).mock.calls[0];
        const filePath = writeCall[0] as string;

        expect(filePath).toContain('.mg-daemon.json');
        expect(filePath).toMatch(/\.mg-daemon\.json$/);
      });
    });

    describe('AC-1.3: Config already exists error handling', () => {
      it('GIVEN .mg-daemon.json exists WHEN mg-daemon init run THEN it exits with code 1 and message "Config already exists"', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);

        // Act & Assert
        expect(() => initConfig()).toThrow('Config already exists');
      });

      it('GIVEN .mg-daemon.json exists WHEN mg-daemon init run THEN it does not overwrite existing config', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(writeFileSync).mockImplementation(() => {});

        // Act
        try {
          initConfig();
        } catch {
          // Expected to throw
        }

        // Assert
        expect(writeFileSync).not.toHaveBeenCalled();
      });
    });

    describe('Config template structure', () => {
      it('GIVEN initConfig() called WHEN template created THEN JSON is properly formatted with indentation', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(writeFileSync).mockImplementation(() => {});

        // Act
        initConfig();

        // Assert
        const writeCall = vi.mocked(writeFileSync).mock.calls[0];
        const writtenContent = writeCall[1] as string;

        // Should have indentation (not minified)
        expect(writtenContent).toContain('\n');
        expect(writtenContent).toMatch(/  "/); // 2-space indentation
      });
    });
  });

  describe('validateConfig()', () => {
    describe('AC-1.4 & AC-1.9: Comprehensive validation coverage', () => {
      it('GIVEN config with all valid fields WHEN validateConfig() called THEN it returns empty errors array', () => {
        // Arrange
        const validConfig: DaemonConfig = {
          jira: {
            host: 'https://example.atlassian.net',
            apiToken: 'test-token',
            project: 'PROJ',
            jql: 'project = PROJ',
          },
          github: {
            repo: 'owner/repo',
            token: 'ghp_test',
            baseBranch: 'main',
          },
          polling: {
            intervalSeconds: 60,
            batchSize: 5,
          },
        };

        // Act
        const errors = validateConfig(validConfig);

        // Assert
        expect(errors).toEqual([]);
        expect(errors.length).toBe(0);
      });

      it('GIVEN config missing jira.host WHEN validateConfig() called THEN errors array contains {field: "jira.host", message: "..."}', () => {
        // Arrange
        const invalidConfig = {
          jira: {
            host: '',
            apiToken: 'test-token',
            project: 'PROJ',
            jql: 'project = PROJ',
          },
          github: {
            repo: 'owner/repo',
            token: 'ghp_test',
            baseBranch: 'main',
          },
          polling: {
            intervalSeconds: 60,
            batchSize: 5,
          },
        } as DaemonConfig;

        // Act
        const errors = validateConfig(invalidConfig);

        // Assert
        expect(errors.length).toBeGreaterThan(0);
        const hostError = errors.find((e: ValidationError) => e.field === 'jira.host');
        expect(hostError).toBeDefined();
        expect(hostError?.message).toBeDefined();
      });

      it('GIVEN config with invalid jira.host URL WHEN validateConfig() called THEN errors array contains URL validation error', () => {
        // Arrange
        const invalidConfig = {
          jira: {
            host: 'not-a-url',
            apiToken: 'test-token',
            project: 'PROJ',
            jql: 'project = PROJ',
          },
          github: {
            repo: 'owner/repo',
            token: 'ghp_test',
            baseBranch: 'main',
          },
          polling: {
            intervalSeconds: 60,
            batchSize: 5,
          },
        } as DaemonConfig;

        // Act
        const errors = validateConfig(invalidConfig);

        // Assert
        expect(errors.length).toBeGreaterThan(0);
        const hostError = errors.find((e: ValidationError) => e.field === 'jira.host');
        expect(hostError).toBeDefined();
        expect(hostError?.message).toContain('must be a valid URL');
      });

      it('GIVEN config missing github.repo WHEN validateConfig() called THEN errors array contains repo error', () => {
        // Arrange
        const invalidConfig = {
          jira: {
            host: 'https://example.atlassian.net',
            apiToken: 'test-token',
            project: 'PROJ',
            jql: 'project = PROJ',
          },
          github: {
            repo: '',
            token: 'ghp_test',
            baseBranch: 'main',
          },
          polling: {
            intervalSeconds: 60,
            batchSize: 5,
          },
        } as DaemonConfig;

        // Act
        const errors = validateConfig(invalidConfig);

        // Assert
        expect(errors.length).toBeGreaterThan(0);
        const repoError = errors.find((e: ValidationError) => e.field === 'github.repo');
        expect(repoError).toBeDefined();
      });

      it('GIVEN config with invalid polling.intervalSeconds (negative) WHEN validateConfig() called THEN errors array contains validation error', () => {
        // Arrange
        const invalidConfig = {
          jira: {
            host: 'https://example.atlassian.net',
            apiToken: 'test-token',
            project: 'PROJ',
            jql: 'project = PROJ',
          },
          github: {
            repo: 'owner/repo',
            token: 'ghp_test',
            baseBranch: 'main',
          },
          polling: {
            intervalSeconds: -1,
            batchSize: 5,
          },
        } as DaemonConfig;

        // Act
        const errors = validateConfig(invalidConfig);

        // Assert
        expect(errors.length).toBeGreaterThan(0);
        const intervalError = errors.find((e: ValidationError) => e.field === 'polling.intervalSeconds');
        expect(intervalError).toBeDefined();
      });

      it('GIVEN config with invalid polling.batchSize (zero) WHEN validateConfig() called THEN errors array contains validation error', () => {
        // Arrange
        const invalidConfig = {
          jira: {
            host: 'https://example.atlassian.net',
            apiToken: 'test-token',
            project: 'PROJ',
            jql: 'project = PROJ',
          },
          github: {
            repo: 'owner/repo',
            token: 'ghp_test',
            baseBranch: 'main',
          },
          polling: {
            intervalSeconds: 60,
            batchSize: 0,
          },
        } as DaemonConfig;

        // Act
        const errors = validateConfig(invalidConfig);

        // Assert
        expect(errors.length).toBeGreaterThan(0);
        const batchError = errors.find((e: ValidationError) => e.field === 'polling.batchSize');
        expect(batchError).toBeDefined();
      });

      it('GIVEN config with multiple validation errors WHEN validateConfig() called THEN all errors are returned in array', () => {
        // Arrange
        const invalidConfig = {
          jira: {
            host: 'invalid-url',
            apiToken: '',
            project: '',
            jql: '',
          },
          github: {
            repo: '',
            token: '',
            baseBranch: '',
          },
          polling: {
            intervalSeconds: -1,
            batchSize: 0,
          },
        } as DaemonConfig;

        // Act
        const errors = validateConfig(invalidConfig);

        // Assert
        expect(errors.length).toBeGreaterThanOrEqual(8); // At least 8 validation errors

        // Verify structure of errors
        errors.forEach((error: ValidationError) => {
          expect(error).toHaveProperty('field');
          expect(error).toHaveProperty('message');
          expect(typeof error.field).toBe('string');
          expect(typeof error.message).toBe('string');
        });
      });
    });

    describe('ValidationError structure', () => {
      it('GIVEN validation error WHEN returned THEN it has field and message properties', () => {
        // Arrange
        const invalidConfig = {
          jira: {
            host: '',
            apiToken: 'test-token',
            project: 'PROJ',
            jql: 'project = PROJ',
          },
          github: {
            repo: 'owner/repo',
            token: 'ghp_test',
            baseBranch: 'main',
          },
          polling: {
            intervalSeconds: 60,
            batchSize: 5,
          },
        } as DaemonConfig;

        // Act
        const errors = validateConfig(invalidConfig);

        // Assert
        expect(errors.length).toBeGreaterThan(0);
        const error = errors[0];
        expect(error).toHaveProperty('field');
        expect(error).toHaveProperty('message');
        expect(typeof error.field).toBe('string');
        expect(typeof error.message).toBe('string');
      });
    });
  });

  describe('AC-1.9: Coverage for all validation branches', () => {
    describe('Jira configuration branches', () => {
      it('validates jira.host as required', () => {
        const config = { jira: { host: '', apiToken: 'x', project: 'x', jql: 'x' }, github: { repo: 'x/x', token: 'x', baseBranch: 'x' }, polling: { intervalSeconds: 60, batchSize: 5 } } as DaemonConfig;
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'jira.host')).toBe(true);
      });

      it('validates jira.apiToken as required', () => {
        const config = { jira: { host: 'https://x.com', apiToken: '', project: 'x', jql: 'x' }, github: { repo: 'x/x', token: 'x', baseBranch: 'x' }, polling: { intervalSeconds: 60, batchSize: 5 } } as DaemonConfig;
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'jira.apiToken')).toBe(true);
      });

      it('validates jira.project as required', () => {
        const config = { jira: { host: 'https://x.com', apiToken: 'x', project: '', jql: 'x' }, github: { repo: 'x/x', token: 'x', baseBranch: 'x' }, polling: { intervalSeconds: 60, batchSize: 5 } } as DaemonConfig;
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'jira.project')).toBe(true);
      });

      it('validates jira.jql as required', () => {
        const config = { jira: { host: 'https://x.com', apiToken: 'x', project: 'x', jql: '' }, github: { repo: 'x/x', token: 'x', baseBranch: 'x' }, polling: { intervalSeconds: 60, batchSize: 5 } } as DaemonConfig;
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'jira.jql')).toBe(true);
      });
    });

    describe('GitHub configuration branches', () => {
      it('validates github.repo as required', () => {
        const config = { jira: { host: 'https://x.com', apiToken: 'x', project: 'x', jql: 'x' }, github: { repo: '', token: 'x', baseBranch: 'x' }, polling: { intervalSeconds: 60, batchSize: 5 } } as DaemonConfig;
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'github.repo')).toBe(true);
      });

      it('validates github.token as required', () => {
        const config = { jira: { host: 'https://x.com', apiToken: 'x', project: 'x', jql: 'x' }, github: { repo: 'x/x', token: '', baseBranch: 'x' }, polling: { intervalSeconds: 60, batchSize: 5 } } as DaemonConfig;
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'github.token')).toBe(true);
      });

      it('validates github.baseBranch as required', () => {
        const config = { jira: { host: 'https://x.com', apiToken: 'x', project: 'x', jql: 'x' }, github: { repo: 'x/x', token: 'x', baseBranch: '' }, polling: { intervalSeconds: 60, batchSize: 5 } } as DaemonConfig;
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'github.baseBranch')).toBe(true);
      });
    });

    describe('Polling configuration branches', () => {
      it('validates polling.intervalSeconds as positive number', () => {
        const config = { jira: { host: 'https://x.com', apiToken: 'x', project: 'x', jql: 'x' }, github: { repo: 'x/x', token: 'x', baseBranch: 'x' }, polling: { intervalSeconds: -1, batchSize: 5 } } as DaemonConfig;
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'polling.intervalSeconds')).toBe(true);
      });

      it('validates polling.intervalSeconds as non-zero', () => {
        const config = { jira: { host: 'https://x.com', apiToken: 'x', project: 'x', jql: 'x' }, github: { repo: 'x/x', token: 'x', baseBranch: 'x' }, polling: { intervalSeconds: 0, batchSize: 5 } } as DaemonConfig;
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'polling.intervalSeconds')).toBe(true);
      });

      it('validates polling.batchSize as positive number', () => {
        const config = { jira: { host: 'https://x.com', apiToken: 'x', project: 'x', jql: 'x' }, github: { repo: 'x/x', token: 'x', baseBranch: 'x' }, polling: { intervalSeconds: 60, batchSize: -1 } } as DaemonConfig;
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'polling.batchSize')).toBe(true);
      });

      it('validates polling.batchSize as non-zero', () => {
        const config = { jira: { host: 'https://x.com', apiToken: 'x', project: 'x', jql: 'x' }, github: { repo: 'x/x', token: 'x', baseBranch: 'x' }, polling: { intervalSeconds: 60, batchSize: 0 } } as DaemonConfig;
        const errors = validateConfig(config);
        expect(errors.some((e: ValidationError) => e.field === 'polling.batchSize')).toBe(true);
      });
    });
  });
});
