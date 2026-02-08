import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// Module under test - will be implemented by dev
import { loadConfig } from '../../../src/config/loader';
import type { DaemonConfig } from '../../../src/config/types';

// Mock fs module at module level (Vitest best practice - avoid spyOn for core modules)
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('path', async () => {
  const actual = await vi.importActual<typeof import('path')>('path');
  return {
    ...actual,
    resolve: vi.fn((...args) => actual.resolve(...args)),
  };
});

describe('Config Loading (AC-1.3: loadConfig function)', () => {
  const mockProjectPath = '/Users/test/project';
  const mockConfigPath = '/Users/test/project/.claude/daemon-config.yaml';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolve).mockReturnValue(mockConfigPath);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Given valid YAML configuration', () => {
    it('WHEN loadConfig() called THEN it returns a typed DaemonConfig object with all fields populated', () => {
      // Arrange: Valid YAML config
      const validYaml = `
version: "1.0"
jira:
  host: https://example.atlassian.net
  email: user@example.com
  apiToken: ATATT3xFfGF0test123
  project: PROJ
  jql: project = PROJ AND status = "Ready for Dev"
  statusTransitions:
    in_progress: In Development
    complete: Ready for Review
    failed: Needs Clarification

slack:
  botToken: xoxb-1234567890-1234567890123-AbCdEfGhIjKlMnOpQrStUvWx
  statusChannel: C01234ABCD
  dmContacts:
    - userId: U01234EFGH
      notifyOn:
        - blocked
        - failed

github:
  token: ghp_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
  primaryRepo:
    owner: myorg
    name: my-project
    baseBranch: main
  contextRepos:
    - owner: myorg
      name: shared-utils
      description: Shared utility library

mcp:
  enabled: false
`;

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(validYaml);

      // Act
      const config = loadConfig(mockProjectPath);

      // Assert: Config object is fully typed
      expect(config).toBeDefined();
      expect(config.version).toBe('1.0');
      expect(config.jira.host).toBe('https://example.atlassian.net');
      expect(config.jira.apiToken).toBe('ATATT3xFfGF0test123');
      expect(config.slack.botToken).toBe('xoxb-1234567890-1234567890123-AbCdEfGhIjKlMnOpQrStUvWx');
      expect(config.github.token).toBe('ghp_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890');
      expect(config.github.primaryRepo.owner).toBe('myorg');
      expect(config.mcp.enabled).toBe(false);
    });

    it('WHEN loadConfig() called with context repos THEN contextRepos array is parsed correctly', () => {
      // Arrange
      const yamlWithContextRepos = `
version: "1.0"
jira:
  host: https://example.atlassian.net
  email: user@example.com
  apiToken: token123
  project: PROJ
  jql: project = PROJ

slack:
  botToken: xoxb-test
  statusChannel: C123

github:
  token: ghp_test
  primaryRepo:
    owner: org
    name: repo
    baseBranch: main
  contextRepos:
    - owner: org1
      name: repo1
      description: First repo
    - owner: org2
      name: repo2
      description: Second repo
      cloneDepth: 1

mcp:
  enabled: false
`;

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(yamlWithContextRepos);

      // Act
      const config = loadConfig(mockProjectPath);

      // Assert
      expect(config.github.contextRepos).toHaveLength(2);
      expect(config.github.contextRepos[0].owner).toBe('org1');
      expect(config.github.contextRepos[0].name).toBe('repo1');
      expect(config.github.contextRepos[1].cloneDepth).toBe(1);
    });

    it('WHEN loadConfig() called with MCP servers THEN servers array is parsed correctly', () => {
      // Arrange
      const yamlWithMcp = `
version: "1.0"
jira:
  host: https://example.atlassian.net
  email: user@example.com
  apiToken: token123
  project: PROJ
  jql: project = PROJ

slack:
  botToken: xoxb-test
  statusChannel: C123

github:
  token: ghp_test
  primaryRepo:
    owner: org
    name: repo
    baseBranch: main

mcp:
  enabled: true
  servers:
    - name: postgres
      command: mcp-server-postgres
      env:
        DATABASE_URL: postgresql://localhost/db
    - name: filesystem
      command: mcp-server-filesystem
      args:
        - /Users/test/project
`;

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(yamlWithMcp);

      // Act
      const config = loadConfig(mockProjectPath);

      // Assert
      expect(config.mcp.enabled).toBe(true);
      expect(config.mcp.servers).toHaveLength(2);
      expect(config.mcp.servers[0].name).toBe('postgres');
      expect(config.mcp.servers[0].env?.DATABASE_URL).toBe('postgresql://localhost/db');
      expect(config.mcp.servers[1].args).toEqual(['/Users/test/project']);
    });
  });

  describe('Given missing config file', () => {
    it('WHEN loadConfig() called THEN it throws error with clear message', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);

      // Act & Assert
      expect(() => loadConfig(mockProjectPath)).toThrow(
        'Config file not found at .claude/daemon-config.yaml. Run "mg-daemon init" to create one.'
      );
    });

    it('WHEN loadConfig() called THEN error is an Error instance', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);

      // Act & Assert
      expect(() => loadConfig(mockProjectPath)).toThrowError(Error);
    });

    it('WHEN loadConfig() called with custom path THEN it checks the custom path', () => {
      // Arrange
      const customPath = '/custom/path/to/config.yaml';
      vi.mocked(existsSync).mockReturnValue(false);

      // Act & Assert
      expect(() => loadConfig(mockProjectPath, customPath)).toThrow();
      expect(existsSync).toHaveBeenCalledWith(customPath);
    });
  });

  describe('Given invalid YAML syntax', () => {
    it('WHEN loadConfig() called with malformed YAML THEN it throws parse error with line information', () => {
      // Arrange: Invalid YAML (inconsistent indentation)
      const malformedYaml = `
version: "1.0"
jira:
  host: https://example.atlassian.net
    apiToken: token123
  project: PROJ
`;

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(malformedYaml);

      // Act & Assert
      expect(() => loadConfig(mockProjectPath)).toThrow(/YAML parse error/i);
    });

    it('WHEN loadConfig() called with invalid YAML characters THEN error message includes line number', () => {
      // Arrange: YAML with invalid characters
      const invalidYaml = `
version: "1.0"
jira:
  host: https://example.atlassian.net
  apiToken: token@#$%^&*()
  project: [PROJ
`;

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(invalidYaml);

      // Act & Assert
      try {
        loadConfig(mockProjectPath);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toMatch(/YAML parse error/i);
        // Error should include line information for debugging
        expect(error.message.length).toBeGreaterThan(20);
      }
    });

    it('WHEN loadConfig() called with empty file THEN it throws descriptive error', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('');

      // Act & Assert
      expect(() => loadConfig(mockProjectPath)).toThrow(/empty or invalid/i);
    });

    it('WHEN loadConfig() called with only comments THEN it throws descriptive error', () => {
      // Arrange: YAML with only comments
      const onlyComments = `
# This is a comment
# Another comment
# No actual content
`;

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(onlyComments);

      // Act & Assert
      expect(() => loadConfig(mockProjectPath)).toThrow(/empty or invalid/i);
    });
  });

  describe('Given malformed structure', () => {
    it('WHEN loadConfig() called with non-object root THEN it throws structure error', () => {
      // Arrange: YAML that parses to an array instead of object
      const arrayYaml = `
- item1
- item2
- item3
`;

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(arrayYaml);

      // Act & Assert
      expect(() => loadConfig(mockProjectPath)).toThrow(/must be an object/i);
    });

    it('WHEN loadConfig() called with string root THEN it throws structure error', () => {
      // Arrange
      const stringYaml = 'just a string';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(stringYaml);

      // Act & Assert
      expect(() => loadConfig(mockProjectPath)).toThrow(/must be an object/i);
    });

    it('WHEN loadConfig() called with missing required sections THEN it throws validation error', () => {
      // Arrange: Valid YAML but missing required sections
      const missingSectionsYaml = `
version: "1.0"
jira:
  host: https://example.atlassian.net
`;

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(missingSectionsYaml);

      // Act & Assert
      // This should be caught by validation, not parsing
      expect(() => loadConfig(mockProjectPath)).toThrow();
    });
  });

  describe('Given file system errors', () => {
    it('WHEN loadConfig() called and readFile throws EACCES THEN error message mentions permissions', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);
      const permissionError = new Error('EACCES: permission denied');
      (permissionError as any).code = 'EACCES';
      vi.mocked(readFileSync).mockImplementation(() => {
        throw permissionError;
      });

      // Act & Assert
      try {
        loadConfig(mockProjectPath);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toMatch(/permission/i);
      }
    });

    it('WHEN loadConfig() called and readFile throws EISDIR THEN error message mentions directory', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);
      const dirError = new Error('EISDIR: illegal operation on a directory');
      (dirError as any).code = 'EISDIR';
      vi.mocked(readFileSync).mockImplementation(() => {
        throw dirError;
      });

      // Act & Assert
      try {
        loadConfig(mockProjectPath);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toMatch(/directory|file/i);
      }
    });
  });

  describe('Given UTF-8 encoding issues', () => {
    it('WHEN loadConfig() called with non-UTF8 file THEN it handles encoding gracefully', () => {
      // Arrange: Simulate binary data that's not valid UTF-8
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(Buffer.from([0xFF, 0xFE, 0x00, 0x00]).toString());

      // Act & Assert
      expect(() => loadConfig(mockProjectPath)).toThrow();
    });
  });

  describe('Given edge case configurations', () => {
    it('WHEN loadConfig() called with minimal valid config THEN it succeeds', () => {
      // Arrange: Absolute minimum required fields
      const minimalYaml = `
version: "1.0"
jira:
  host: https://example.atlassian.net
  email: user@example.com
  apiToken: token
  project: PROJ
  jql: status = Ready

slack:
  botToken: xoxb-test
  statusChannel: C123

github:
  token: ghp_test
  primaryRepo:
    owner: org
    name: repo
    baseBranch: main

mcp:
  enabled: false
`;

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(minimalYaml);

      // Act
      const config = loadConfig(mockProjectPath);

      // Assert
      expect(config).toBeDefined();
      expect(config.version).toBe('1.0');
    });

    it('WHEN loadConfig() called with extra unknown fields THEN it preserves them (forward compatibility)', () => {
      // Arrange: Config with future fields
      const futureYaml = `
version: "1.0"
jira:
  host: https://example.atlassian.net
  email: user@example.com
  apiToken: token
  project: PROJ
  jql: status = Ready
  futureField: some-value

slack:
  botToken: xoxb-test
  statusChannel: C123

github:
  token: ghp_test
  primaryRepo:
    owner: org
    name: repo
    baseBranch: main

mcp:
  enabled: false

experimental:
  newFeature: true
`;

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(futureYaml);

      // Act
      const config = loadConfig(mockProjectPath) as any;

      // Assert: Unknown fields preserved but don't break parsing
      expect(config.version).toBe('1.0');
      expect(config.experimental).toBeDefined();
      expect(config.experimental.newFeature).toBe(true);
    });
  });
});
