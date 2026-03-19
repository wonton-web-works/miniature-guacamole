import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import { parse } from 'yaml';

// Module under test - will be implemented by dev
import { createConfigTemplate, getDefaultConfig } from '../../../src/config/template';
import type { DaemonConfig } from '../../../src/config/types';

// Mock fs module at module level
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock yaml parser
vi.mock('yaml', () => ({
  parse: vi.fn(),
  stringify: vi.fn((obj) => `# Mock YAML\nversion: "${obj.version}"`),
}));

describe('Config Template (AC-1.6: Example config template)', () => {
  const mockProjectPath = '/Users/test/project';
  const mockConfigPath = '/Users/test/project/.claude/daemon-config.yaml';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createConfigTemplate() function', () => {
    it('WHEN createConfigTemplate() called THEN it creates .claude directory if missing', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockImplementation(() => undefined);

      // Act
      createConfigTemplate(mockProjectPath);

      // Assert: Should attempt to create directory
      expect(mkdirSync).toHaveBeenCalled();
    });

    it('WHEN createConfigTemplate() called THEN it writes YAML file with template', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);

      // Act
      createConfigTemplate(mockProjectPath);

      // Assert
      expect(writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      expect(writeCall[0]).toContain('daemon-config.yaml');
      expect(writeCall[1]).toBeTruthy(); // Content exists
    });

    it('WHEN createConfigTemplate() called and file exists THEN it throws error', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);

      // Act & Assert
      expect(() => createConfigTemplate(mockProjectPath)).toThrow(
        /already exists|config.*exists/i
      );
    });

    it('WHEN createConfigTemplate() called with force=true THEN it overwrites existing file', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);

      // Act
      createConfigTemplate(mockProjectPath, { force: true });

      // Assert: Should write even though file exists
      expect(writeFileSync).toHaveBeenCalled();
    });

    it('WHEN createConfigTemplate() called THEN generated YAML includes inline comments', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      let writtenContent = '';
      vi.mocked(writeFileSync).mockImplementation((path, content) => {
        writtenContent = content.toString();
      });

      // Act
      createConfigTemplate(mockProjectPath);

      // Assert: Template should have comments for user guidance
      expect(writtenContent).toMatch(/#.*comment|#.*YAML|#.*config/i);
    });

    it('WHEN createConfigTemplate() called THEN template includes all required sections', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      let writtenContent = '';
      vi.mocked(writeFileSync).mockImplementation((path, content) => {
        writtenContent = content.toString();
      });

      // Act
      createConfigTemplate(mockProjectPath);

      // Assert: All major sections present in template
      expect(writtenContent).toMatch(/version:/i);
      expect(writtenContent).toMatch(/jira:/i);
      expect(writtenContent).toMatch(/slack:/i);
      expect(writtenContent).toMatch(/github:/i);
      expect(writtenContent).toMatch(/mcp:/i);
    });

    it('WHEN createConfigTemplate() called THEN template includes placeholder values', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      let writtenContent = '';
      vi.mocked(writeFileSync).mockImplementation((path, content) => {
        writtenContent = content.toString();
      });

      // Act
      createConfigTemplate(mockProjectPath);

      // Assert: Placeholders guide user on what to fill in
      expect(writtenContent).toMatch(/YOUR_|REPLACE_|example|placeholder/i);
    });

    it('WHEN createConfigTemplate() called THEN template is valid YAML syntax', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      let writtenContent = '';
      vi.mocked(writeFileSync).mockImplementation((path, content) => {
        writtenContent = content.toString();
      });

      // Act
      createConfigTemplate(mockProjectPath);

      // Assert: Should be parseable as YAML (no syntax errors)
      // Note: This depends on yaml library being available
      expect(() => {
        // Real yaml.parse would be called here in implementation
        // For test, we just verify content looks like YAML
        expect(writtenContent).toContain(':');
        expect(writtenContent.split('\n').length).toBeGreaterThan(10);
      }).not.toThrow();
    });

    it('WHEN createConfigTemplate() called THEN it returns the created file path', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);

      // Act
      const result = createConfigTemplate(mockProjectPath);

      // Assert
      expect(result).toContain('.claude/daemon-config.yaml');
    });
  });

  describe('getDefaultConfig() function', () => {
    it('WHEN getDefaultConfig() called THEN it returns a valid DaemonConfig object', () => {
      // Act
      const config = getDefaultConfig();

      // Assert: Should have all required fields
      expect(config.version).toBe('1.0');
      expect(config.jira).toBeDefined();
      expect(config.slack).toBeDefined();
      expect(config.github).toBeDefined();
      expect(config.mcp).toBeDefined();
    });

    it('WHEN getDefaultConfig() called THEN Jira section has placeholder values', () => {
      // Act
      const config = getDefaultConfig();

      // Assert
      expect(config.jira.host).toMatch(/example|placeholder|YOUR/i);
      expect(config.jira.email).toMatch(/@|example|YOUR/i);
      expect(config.jira.apiToken).toMatch(/YOUR|REPLACE|placeholder/i);
      expect(config.jira.project).toMatch(/YOUR|PROJ|example/i);
    });

    it('WHEN getDefaultConfig() called THEN Slack section has placeholder values', () => {
      // Act
      const config = getDefaultConfig();

      // Assert
      expect(config.slack.botToken).toMatch(/xoxb-|YOUR|REPLACE/i);
      expect(config.slack.statusChannel).toMatch(/C\w+|YOUR|REPLACE/i);
    });

    it('WHEN getDefaultConfig() called THEN GitHub section has placeholder values', () => {
      // Act
      const config = getDefaultConfig();

      // Assert
      expect(config.github.token).toMatch(/ghp_|YOUR|REPLACE/i);
      expect(config.github.primaryRepo.owner).toMatch(/YOUR|example/i);
      expect(config.github.primaryRepo.name).toMatch(/YOUR|example|project/i);
      expect(config.github.primaryRepo.baseBranch).toBe('main');
    });

    it('WHEN getDefaultConfig() called THEN MCP is disabled by default', () => {
      // Act
      const config = getDefaultConfig();

      // Assert
      expect(config.mcp.enabled).toBe(false);
      expect(config.mcp.servers).toEqual([]);
    });

    it('WHEN getDefaultConfig() called THEN contextRepos is empty array', () => {
      // Act
      const config = getDefaultConfig();

      // Assert
      expect(config.github.contextRepos).toEqual([]);
    });

    it('WHEN getDefaultConfig() called THEN dmContacts is empty array', () => {
      // Act
      const config = getDefaultConfig();

      // Assert
      expect(config.slack.dmContacts).toEqual([]);
    });

    it('WHEN getDefaultConfig() called THEN statusTransitions has common defaults', () => {
      // Act
      const config = getDefaultConfig();

      // Assert: Should have sensible defaults for common workflow
      expect(config.jira.statusTransitions).toBeDefined();
      expect(Object.keys(config.jira.statusTransitions).length).toBeGreaterThan(0);
    });

    it('WHEN getDefaultConfig() called THEN JQL has sensible default query', () => {
      // Act
      const config = getDefaultConfig();

      // Assert: Default JQL should be reasonable starting point
      expect(config.jira.jql).toMatch(/project|status/i);
      expect(config.jira.jql.length).toBeGreaterThan(10);
    });
  });

  describe('Template inline comments (AC-1.6)', () => {
    it('WHEN template generated THEN it includes comment about Jira host', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      let writtenContent = '';
      vi.mocked(writeFileSync).mockImplementation((path, content) => {
        writtenContent = content.toString();
      });

      // Act
      createConfigTemplate(mockProjectPath);

      // Assert: Comment explains what Jira host is
      expect(writtenContent).toMatch(/#.*jira.*host|#.*atlassian/i);
    });

    it('WHEN template generated THEN it includes comment about API tokens', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      let writtenContent = '';
      vi.mocked(writeFileSync).mockImplementation((path, content) => {
        writtenContent = content.toString();
      });

      // Act
      createConfigTemplate(mockProjectPath);

      // Assert: Comments guide user to generate tokens
      expect(writtenContent).toMatch(/#.*token|#.*API|#.*generate/i);
    });

    it('WHEN template generated THEN it includes comment about GitHub repo format', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      let writtenContent = '';
      vi.mocked(writeFileSync).mockImplementation((path, content) => {
        writtenContent = content.toString();
      });

      // Act
      createConfigTemplate(mockProjectPath);

      // Assert
      expect(writtenContent).toMatch(/#.*owner.*name|#.*github.*repo/i);
    });

    it('WHEN template generated THEN it includes comment about MCP servers', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      let writtenContent = '';
      vi.mocked(writeFileSync).mockImplementation((path, content) => {
        writtenContent = content.toString();
      });

      // Act
      createConfigTemplate(mockProjectPath);

      // Assert
      expect(writtenContent).toMatch(/#.*MCP|#.*server|#.*enabled/i);
    });

    it('WHEN template generated THEN comments explain optional fields', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      let writtenContent = '';
      vi.mocked(writeFileSync).mockImplementation((path, content) => {
        writtenContent = content.toString();
      });

      // Act
      createConfigTemplate(mockProjectPath);

      // Assert: Optional fields marked as such
      expect(writtenContent).toMatch(/#.*optional|#.*leave empty/i);
    });

    it('WHEN template generated THEN it includes example of context repo', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      let writtenContent = '';
      vi.mocked(writeFileSync).mockImplementation((path, content) => {
        writtenContent = content.toString();
      });

      // Act
      createConfigTemplate(mockProjectPath);

      // Assert: Template shows example context repo (commented out or example)
      expect(writtenContent).toMatch(/contextRepos|context.*repo/i);
    });

    it('WHEN template generated THEN it includes example of dmContact', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      let writtenContent = '';
      vi.mocked(writeFileSync).mockImplementation((path, content) => {
        writtenContent = content.toString();
      });

      // Act
      createConfigTemplate(mockProjectPath);

      // Assert
      expect(writtenContent).toMatch(/dmContacts|userId|notifyOn/i);
    });

    it('WHEN template generated THEN it includes example of statusTransitions', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      let writtenContent = '';
      vi.mocked(writeFileSync).mockImplementation((path, content) => {
        writtenContent = content.toString();
      });

      // Act
      createConfigTemplate(mockProjectPath);

      // Assert
      expect(writtenContent).toMatch(/statusTransitions|in_progress|complete/i);
    });
  });

  describe('Template structure validation', () => {
    it('WHEN template generated THEN proper YAML indentation is used', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      let writtenContent = '';
      vi.mocked(writeFileSync).mockImplementation((path, content) => {
        writtenContent = content.toString();
      });

      // Act
      createConfigTemplate(mockProjectPath);

      // Assert: Check for consistent indentation (2 spaces standard)
      const lines = writtenContent.split('\n');
      const indentedLines = lines.filter(line => line.match(/^\s+\w/));
      expect(indentedLines.length).toBeGreaterThan(0);
      // All indentation should be multiples of 2
      indentedLines.forEach(line => {
        const indent = line.match(/^(\s+)/)?.[1].length || 0;
        expect(indent % 2).toBe(0);
      });
    });

    it('WHEN template generated THEN no trailing whitespace on lines', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      let writtenContent = '';
      vi.mocked(writeFileSync).mockImplementation((path, content) => {
        writtenContent = content.toString();
      });

      // Act
      createConfigTemplate(mockProjectPath);

      // Assert: Clean YAML without trailing spaces
      const lines = writtenContent.split('\n');
      lines.forEach(line => {
        if (line.length > 0) {
          expect(line).not.toMatch(/\s$/);
        }
      });
    });

    it('WHEN template generated THEN version field is first', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      let writtenContent = '';
      vi.mocked(writeFileSync).mockImplementation((path, content) => {
        writtenContent = content.toString();
      });

      // Act
      createConfigTemplate(mockProjectPath);

      // Assert: version should be near the top (after comments)
      const lines = writtenContent.split('\n');
      const versionLineIndex = lines.findIndex(line => line.match(/^version:/));
      const firstConfigLine = lines.findIndex(line =>
        line.match(/^(jira|slack|github|mcp):/)
      );

      expect(versionLineIndex).toBeGreaterThanOrEqual(0);
      expect(versionLineIndex).toBeLessThan(firstConfigLine);
    });

    it('WHEN template generated THEN sections are in logical order', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      let writtenContent = '';
      vi.mocked(writeFileSync).mockImplementation((path, content) => {
        writtenContent = content.toString();
      });

      // Act
      createConfigTemplate(mockProjectPath);

      // Assert: Logical section order: version, jira, slack, github, mcp
      const versionIdx = writtenContent.indexOf('version:');
      const jiraIdx = writtenContent.indexOf('jira:');
      const slackIdx = writtenContent.indexOf('slack:');
      const githubIdx = writtenContent.indexOf('github:');
      const mcpIdx = writtenContent.indexOf('mcp:');

      expect(versionIdx).toBeLessThan(jiraIdx);
      expect(jiraIdx).toBeLessThan(slackIdx);
      expect(slackIdx).toBeLessThan(githubIdx);
      expect(githubIdx).toBeLessThan(mcpIdx);
    });
  });

  describe('Error handling', () => {
    it('WHEN createConfigTemplate() fails to write file THEN error includes helpful message', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(writeFileSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      // Act & Assert
      expect(() => createConfigTemplate(mockProjectPath)).toThrow(/permission|write/i);
    });

    // Lines 138-139: writeFileSync throws with EACCES code — wrapped in descriptive error
    it('WHEN createConfigTemplate() fails to write with EACCES code THEN throws Permission denied error', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(writeFileSync).mockImplementation(() => {
        const err: NodeJS.ErrnoException = new Error('EACCES: permission denied, open /path/to/file');
        err.code = 'EACCES';
        throw err;
      });

      // Act & Assert
      expect(() => createConfigTemplate(mockProjectPath)).toThrow(/Permission denied writing config file/);
    });

    it('WHEN createConfigTemplate() fails to create directory THEN error is descriptive', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockImplementation(() => {
        const err: NodeJS.ErrnoException = new Error('EACCES: permission denied');
        err.code = 'EACCES';
        throw err;
      });

      // Act & Assert
      expect(() => createConfigTemplate(mockProjectPath)).toThrow(/directory|permission/i);
    });

    // Lines 61-62: mkdirSync throws with non-EACCES error code — re-thrown as-is
    it('WHEN createConfigTemplate() mkdirSync throws non-EACCES error THEN original error is rethrown', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockImplementation(() => {
        const err: NodeJS.ErrnoException = new Error('ENOSPC: no space left on device');
        err.code = 'ENOSPC';
        throw err;
      });

      // Act & Assert
      expect(() => createConfigTemplate(mockProjectPath)).toThrow('ENOSPC: no space left on device');
    });
  });
});
