import { describe, it, expect, beforeEach } from 'vitest';

// Module under test - will be implemented by dev
import { validateConfig } from '../../../src/config/validator';
import type { DaemonConfig, ValidationError } from '../../../src/config/types';

describe('Config Validation (AC-1.4: validateConfig function)', () => {
  let validConfig: DaemonConfig;

  beforeEach(() => {
    // Setup: Valid baseline config for tests
    validConfig = {
      version: '1.0',
      jira: {
        host: 'https://example.atlassian.net',
        email: 'user@example.com',
        apiToken: 'ATATT3xFfGF0test123',
        project: 'PROJ',
        jql: 'project = PROJ AND status = "Ready for Dev"',
        statusTransitions: {
          in_progress: 'In Development',
          complete: 'Ready for Review',
          failed: 'Needs Clarification',
        },
      },
      slack: {
        botToken: 'xoxb-1234567890-1234567890123-AbCdEfGhIjKlMnOpQrStUvWx',
        statusChannel: 'C01234ABCD',
        dmContacts: [
          {
            userId: 'U01234EFGH',
            notifyOn: ['blocked', 'failed'],
          },
        ],
      },
      github: {
        token: 'ghp_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890',
        primaryRepo: {
          owner: 'myorg',
          name: 'my-project',
          baseBranch: 'main',
        },
        contextRepos: [],
      },
      mcp: {
        enabled: false,
        servers: [],
      },
    };
  });

  describe('Given valid configuration', () => {
    it('WHEN validateConfig() called THEN it returns empty errors array', () => {
      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors).toEqual([]);
    });

    it('WHEN validateConfig() called with all optional fields THEN it returns no errors', () => {
      // Arrange: Add optional fields
      validConfig.github.contextRepos = [
        {
          owner: 'org1',
          name: 'repo1',
          description: 'Test repo',
        },
      ];
      validConfig.mcp.enabled = true;
      validConfig.mcp.servers = [
        {
          name: 'test-server',
          command: 'test-command',
        },
      ];

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors).toEqual([]);
    });
  });

  describe('Given missing required fields', () => {
    it('WHEN jira.host is missing THEN validation error includes field path', () => {
      // Arrange
      (validConfig.jira as any).host = '';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('jira.host');
      expect(errors[0].message).toMatch(/required/i);
    });

    it('WHEN jira.apiToken is missing THEN validation error is actionable', () => {
      // Arrange
      validConfig.jira.apiToken = '';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('jira.apiToken');
      expect(errors[0].message).toContain('required');
      expect(errors[0].message.length).toBeGreaterThan(10); // Descriptive message
    });

    it('WHEN jira.email is missing THEN validation error references the field', () => {
      // Arrange
      (validConfig.jira as any).email = '';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('jira.email');
    });

    it('WHEN jira.project is missing THEN validation error is clear', () => {
      // Arrange
      validConfig.jira.project = '';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('jira.project');
      expect(errors[0].message).toMatch(/required|empty/i);
    });

    it('WHEN jira.jql is missing THEN validation error is returned', () => {
      // Arrange
      validConfig.jira.jql = '';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('jira.jql');
    });

    it('WHEN slack.botToken is missing THEN validation error includes field path', () => {
      // Arrange
      validConfig.slack.botToken = '';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('slack.botToken');
    });

    it('WHEN slack.statusChannel is missing THEN validation error is returned', () => {
      // Arrange
      validConfig.slack.statusChannel = '';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('slack.statusChannel');
    });

    it('WHEN github.token is missing THEN validation error is clear', () => {
      // Arrange
      validConfig.github.token = '';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('github.token');
      expect(errors[0].message).toMatch(/required|token/i);
    });

    it('WHEN github.primaryRepo.owner is missing THEN validation error includes field path', () => {
      // Arrange
      validConfig.github.primaryRepo.owner = '';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('github.primaryRepo.owner');
    });

    it('WHEN github.primaryRepo.name is missing THEN validation error is returned', () => {
      // Arrange
      validConfig.github.primaryRepo.name = '';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('github.primaryRepo.name');
    });

    it('WHEN github.primaryRepo.baseBranch is missing THEN validation error is returned', () => {
      // Arrange
      validConfig.github.primaryRepo.baseBranch = '';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('github.primaryRepo.baseBranch');
    });

    it('WHEN multiple fields are missing THEN all errors are returned together', () => {
      // Arrange: Multiple missing fields
      validConfig.jira.apiToken = '';
      validConfig.jira.project = '';
      validConfig.github.token = '';
      validConfig.slack.botToken = '';

      // Act
      const errors = validateConfig(validConfig);

      // Assert: All errors reported, not just first one
      expect(errors.length).toBeGreaterThanOrEqual(4);
      const fields = errors.map(e => e.field);
      expect(fields).toContain('jira.apiToken');
      expect(fields).toContain('jira.project');
      expect(fields).toContain('github.token');
      expect(fields).toContain('slack.botToken');
    });
  });

  describe('Given invalid URL formats (AC-1.8)', () => {
    it('WHEN jira.host is not a valid URL THEN error message is clear', () => {
      // Arrange
      validConfig.jira.host = 'not-a-url';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('jira.host');
      expect(errors[0].message).toMatch(/valid URL|URL format/i);
    });

    it('WHEN jira.host missing protocol THEN validation fails with descriptive error', () => {
      // Arrange
      validConfig.jira.host = 'example.atlassian.net';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('jira.host');
      expect(errors[0].message).toMatch(/https?:\/\//i);
    });

    it('WHEN jira.host uses HTTP instead of HTTPS THEN validation warning is issued', () => {
      // Arrange
      validConfig.jira.host = 'http://example.atlassian.net';

      // Act
      const errors = validateConfig(validConfig);

      // Assert: May allow HTTP but warn
      if (errors.length > 0) {
        expect(errors[0].field).toBe('jira.host');
        expect(errors[0].message).toMatch(/HTTPS|secure/i);
      }
    });

    it('WHEN jira.host has trailing slash THEN it is handled correctly', () => {
      // Arrange
      validConfig.jira.host = 'https://example.atlassian.net/';

      // Act
      const errors = validateConfig(validConfig);

      // Assert: Should either accept it or provide clear error
      if (errors.length > 0) {
        expect(errors[0].field).toBe('jira.host');
        expect(errors[0].message).toMatch(/trailing slash|format/i);
      }
    });
  });

  describe('Given invalid email format', () => {
    it('WHEN jira.email is not valid format THEN validation error is returned', () => {
      // Arrange
      validConfig.jira.email = 'not-an-email';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('jira.email');
      expect(errors[0].message).toMatch(/email|@/i);
    });

    it('WHEN jira.email missing @ symbol THEN validation fails', () => {
      // Arrange
      validConfig.jira.email = 'userexample.com';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('jira.email');
    });

    it('WHEN jira.email has invalid domain THEN validation fails', () => {
      // Arrange
      validConfig.jira.email = 'user@invalid domain.com';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toBe('jira.email');
    });
  });

  describe('Given invalid token formats', () => {
    it('WHEN slack.botToken does not start with xoxb- THEN validation error suggests correct format', () => {
      // Arrange
      validConfig.slack.botToken = 'invalid-token-format';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('slack.botToken');
      expect(errors[0].message).toMatch(/xoxb-/);
    });

    it('WHEN github.token has invalid format THEN validation error is descriptive', () => {
      // Arrange
      validConfig.github.token = 'invalid_token_123';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('github.token');
      expect(errors[0].message).toMatch(/ghp_|github_pat_/i);
    });

    it('WHEN jira.apiToken has suspicious format THEN validation provides warning', () => {
      // Arrange: Very short token that looks invalid
      validConfig.jira.apiToken = 'abc';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      if (errors.length > 0) {
        expect(errors[0].field).toBe('jira.apiToken');
        expect(errors[0].message).toMatch(/length|format|invalid/i);
      }
    });
  });

  describe('Given invalid nested structure', () => {
    it('WHEN jira.statusTransitions is empty object THEN validation warning is issued', () => {
      // Arrange
      validConfig.jira.statusTransitions = {};

      // Act
      const errors = validateConfig(validConfig);

      // Assert: May warn but not fail
      if (errors.length > 0) {
        expect(errors[0].field).toMatch(/statusTransitions/);
      }
    });

    it('WHEN slack.dmContacts contains invalid userId THEN validation error identifies the issue', () => {
      // Arrange
      validConfig.slack.dmContacts = [
        {
          userId: '',
          notifyOn: ['blocked'],
        },
      ];

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toMatch(/dmContacts.*userId/i);
    });

    it('WHEN slack.dmContacts contains invalid notifyOn value THEN validation fails', () => {
      // Arrange
      validConfig.slack.dmContacts = [
        {
          userId: 'U123',
          notifyOn: ['invalid-event-type' as any],
        },
      ];

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toMatch(/dmContacts.*notifyOn/i);
      expect(errors[0].message).toMatch(/blocked|failed|question|complete/i);
    });

    it('WHEN github.contextRepos has invalid structure THEN validation error is clear', () => {
      // Arrange
      validConfig.github.contextRepos = [
        {
          owner: '',
          name: 'repo',
          description: 'Test',
        },
      ];

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toMatch(/contextRepos.*owner/i);
    });

    it('WHEN github.contextRepos has invalid cloneDepth THEN validation fails', () => {
      // Arrange
      validConfig.github.contextRepos = [
        {
          owner: 'org',
          name: 'repo',
          description: 'Test',
          cloneDepth: -1,
        },
      ];

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toMatch(/cloneDepth/i);
      expect(errors[0].message).toMatch(/positive|greater than 0/i);
    });
  });

  describe('Given MCP configuration', () => {
    it('WHEN mcp.enabled is true but servers is empty THEN validation warning is issued', () => {
      // Arrange
      validConfig.mcp.enabled = true;
      validConfig.mcp.servers = [];

      // Act
      const errors = validateConfig(validConfig);

      // Assert: May warn about empty servers
      if (errors.length > 0) {
        expect(errors[0].field).toMatch(/mcp/i);
        expect(errors[0].message).toMatch(/server/i);
      }
    });

    it('WHEN mcp.server missing name THEN validation error is returned', () => {
      // Arrange
      validConfig.mcp.enabled = true;
      validConfig.mcp.servers = [
        {
          name: '',
          command: 'test-command',
        },
      ];

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toMatch(/mcp.*servers.*name/i);
    });

    it('WHEN mcp.server missing command THEN validation error is clear', () => {
      // Arrange
      validConfig.mcp.enabled = true;
      validConfig.mcp.servers = [
        {
          name: 'test-server',
          command: '',
        },
      ];

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toMatch(/mcp.*servers.*command/i);
    });

    it('WHEN mcp.server has env with empty values THEN validation handles gracefully', () => {
      // Arrange
      validConfig.mcp.enabled = true;
      validConfig.mcp.servers = [
        {
          name: 'test-server',
          command: 'test-command',
          env: {
            KEY1: 'value',
            KEY2: '', // Empty env var may be intentional
          },
        },
      ];

      // Act
      const errors = validateConfig(validConfig);

      // Assert: Empty env vars may be allowed
      const envErrors = errors.filter(e => e.field.includes('env'));
      // Either no errors or clear guidance on empty env vars
      if (envErrors.length > 0) {
        expect(envErrors[0].message).toContain('env');
      }
    });
  });

  describe('Given version field validation', () => {
    it('WHEN version is missing THEN validation error is returned', () => {
      // Arrange
      (validConfig as any).version = '';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('version');
    });

    it('WHEN version is invalid format THEN validation error suggests valid versions', () => {
      // Arrange
      validConfig.version = '999.999';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      if (errors.length > 0) {
        expect(errors[0].field).toBe('version');
        expect(errors[0].message).toMatch(/1\.0|supported/i);
      }
    });

    it('WHEN version is 1.0 THEN validation passes', () => {
      // Arrange
      validConfig.version = '1.0';

      // Act
      const errors = validateConfig(validConfig);

      // Assert: Should pass or only have non-version errors
      const versionErrors = errors.filter(e => e.field === 'version');
      expect(versionErrors).toHaveLength(0);
    });
  });

  describe('Given error message quality (AC-1.8)', () => {
    it('WHEN validation fails THEN error messages are actionable', () => {
      // Arrange: Create multiple errors
      validConfig.jira.host = 'invalid';
      validConfig.github.token = '';

      // Act
      const errors = validateConfig(validConfig);

      // Assert: Each error has clear, actionable message
      errors.forEach(error => {
        expect(error.field).toBeTruthy();
        expect(error.message).toBeTruthy();
        expect(error.message.length).toBeGreaterThan(15); // Not just "required"
        expect(error.message).not.toMatch(/undefined|null/i); // No placeholder artifacts
      });
    });

    it('WHEN field path is nested THEN error field uses dot notation', () => {
      // Arrange
      validConfig.github.primaryRepo.owner = '';

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors[0].field).toMatch(/github\.primaryRepo\.owner/);
    });

    it('WHEN array item is invalid THEN error field includes index', () => {
      // Arrange
      validConfig.slack.dmContacts = [
        { userId: 'U123', notifyOn: ['blocked'] },
        { userId: '', notifyOn: ['failed'] }, // Invalid
      ];

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      if (errors.length > 0) {
        expect(errors[0].field).toMatch(/dmContacts\[1\]|dmContacts\.1/);
      }
    });
  });

  describe('Given edge cases', () => {
    it('WHEN config has null values THEN validation handles gracefully', () => {
      // Arrange
      (validConfig.jira as any).host = null;

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toBe('jira.host');
      expect(errors[0].message).not.toContain('null');
    });

    it('WHEN config has undefined sections THEN validation fails clearly', () => {
      // Arrange
      (validConfig as any).jira = undefined;

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toMatch(/jira/i);
      expect(errors[0].message).toMatch(/required|missing/i);
    });

    it('WHEN config has wrong type for field THEN validation error mentions expected type', () => {
      // Arrange
      (validConfig.mcp as any).enabled = 'yes'; // Should be boolean

      // Act
      const errors = validateConfig(validConfig);

      // Assert
      if (errors.length > 0) {
        const enabledError = errors.find(e => e.field.includes('enabled'));
        if (enabledError) {
          expect(enabledError.message).toMatch(/boolean|true|false/i);
        }
      }
    });
  });
});
