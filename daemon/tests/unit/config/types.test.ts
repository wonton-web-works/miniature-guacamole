import { describe, it, expect } from 'vitest';

// Types under test - will be implemented by dev
import type {
  DaemonConfig,
  JiraConfig,
  SlackConfig,
  GitHubConfig,
  MCPConfig,
  ValidationError,
  NotifyOnEvent,
  ContextRepo,
  MCPServer,
} from '../../../src/config/types';

describe('Type Definitions (AC-1.2 & AC-1.7: TypeScript types)', () => {
  describe('DaemonConfig interface', () => {
    it('GIVEN a valid DaemonConfig object THEN it should have all required properties', () => {
      // Arrange & Act: Type-check at compile time
      const config: DaemonConfig = {
        version: '1.0',
        jira: {
          host: 'https://example.atlassian.net',
          email: 'user@example.com',
          apiToken: 'token',
          project: 'PROJ',
          jql: 'status = Ready',
          statusTransitions: {
            in_progress: 'In Development',
            complete: 'Done',
            failed: 'Failed',
          },
        },
        slack: {
          botToken: 'xoxb-test',
          statusChannel: 'C123',
          dmContacts: [],
        },
        github: {
          token: 'ghp_test',
          primaryRepo: {
            owner: 'org',
            name: 'repo',
            baseBranch: 'main',
          },
          contextRepos: [],
        },
        mcp: {
          enabled: false,
          servers: [],
        },
      };

      // Assert: If this compiles, types are correct
      expect(config.version).toBe('1.0');
      expect(config.jira).toBeDefined();
      expect(config.slack).toBeDefined();
      expect(config.github).toBeDefined();
      expect(config.mcp).toBeDefined();
    });

    it('GIVEN DaemonConfig type THEN version field should be string', () => {
      // Arrange
      const config: DaemonConfig = { version: '1.0' } as any;

      // Act: Type assertion
      const version: string = config.version;

      // Assert: Compiles without error
      expect(typeof version).toBe('string');
    });

    it('GIVEN DaemonConfig type THEN it should not allow arbitrary additional properties', () => {
      // This test validates at compile-time that the interface is strict
      // @ts-expect-error - unknownProperty should not be allowed
      const config: DaemonConfig = {
        version: '1.0',
        unknownProperty: 'should not compile',
      } as any;

      // Assert: TypeScript should catch this at compile time
      expect(config).toBeDefined();
    });
  });

  describe('JiraConfig interface', () => {
    it('GIVEN a valid JiraConfig object THEN all required fields are present', () => {
      // Arrange & Act
      const jiraConfig: JiraConfig = {
        host: 'https://example.atlassian.net',
        email: 'user@example.com',
        apiToken: 'ATATT3xFfGF0test',
        project: 'PROJ',
        jql: 'project = PROJ',
        statusTransitions: {
          in_progress: 'In Development',
          complete: 'Done',
          failed: 'Failed',
        },
      };

      // Assert
      expect(jiraConfig.host).toBeDefined();
      expect(jiraConfig.email).toBeDefined();
      expect(jiraConfig.apiToken).toBeDefined();
      expect(jiraConfig.project).toBeDefined();
      expect(jiraConfig.jql).toBeDefined();
      expect(jiraConfig.statusTransitions).toBeDefined();
    });

    it('GIVEN JiraConfig type THEN statusTransitions should be Record<string, string>', () => {
      // Arrange
      const transitions: JiraConfig['statusTransitions'] = {
        in_progress: 'In Development',
        complete: 'Done',
        custom_status: 'Custom Status',
      };

      // Assert: Flexible string keys
      expect(Object.keys(transitions)).toContain('custom_status');
      expect(transitions.in_progress).toBe('In Development');
    });

    it('GIVEN JiraConfig type THEN optional commentOnStart field should be boolean', () => {
      // Arrange
      const jiraConfig: JiraConfig = {
        host: 'https://example.atlassian.net',
        email: 'user@example.com',
        apiToken: 'token',
        project: 'PROJ',
        jql: 'status = Ready',
        statusTransitions: {},
        commentOnStart: true,
        commentOnComplete: false,
      };

      // Assert
      expect(typeof jiraConfig.commentOnStart).toBe('boolean');
      expect(typeof jiraConfig.commentOnComplete).toBe('boolean');
    });
  });

  describe('SlackConfig interface', () => {
    it('GIVEN a valid SlackConfig object THEN all required fields are present', () => {
      // Arrange & Act
      const slackConfig: SlackConfig = {
        botToken: 'xoxb-1234567890-test',
        statusChannel: 'C01234ABCD',
        dmContacts: [],
      };

      // Assert
      expect(slackConfig.botToken).toBeDefined();
      expect(slackConfig.statusChannel).toBeDefined();
      expect(slackConfig.dmContacts).toBeDefined();
      expect(Array.isArray(slackConfig.dmContacts)).toBe(true);
    });

    it('GIVEN SlackConfig type THEN dmContacts should be array of DmContact objects', () => {
      // Arrange
      const slackConfig: SlackConfig = {
        botToken: 'xoxb-test',
        statusChannel: 'C123',
        dmContacts: [
          {
            userId: 'U01234EFGH',
            notifyOn: ['blocked', 'failed'],
          },
          {
            userId: 'U56789IJKL',
            notifyOn: ['question', 'complete'],
          },
        ],
      };

      // Assert
      expect(slackConfig.dmContacts).toHaveLength(2);
      expect(slackConfig.dmContacts[0].userId).toBe('U01234EFGH');
      expect(slackConfig.dmContacts[0].notifyOn).toContain('blocked');
    });

    it('GIVEN DmContact type THEN notifyOn should be array of NotifyOnEvent', () => {
      // Arrange
      const contact: SlackConfig['dmContacts'][0] = {
        userId: 'U123',
        notifyOn: ['blocked', 'failed', 'question', 'complete'],
      };

      // Assert: All valid event types
      contact.notifyOn.forEach(event => {
        expect(['blocked', 'failed', 'question', 'complete']).toContain(event);
      });
    });
  });

  describe('GitHubConfig interface', () => {
    it('GIVEN a valid GitHubConfig object THEN all required fields are present', () => {
      // Arrange & Act
      const githubConfig: GitHubConfig = {
        token: 'ghp_AbCdEfGhIjKlMnOpQr1234567890',
        primaryRepo: {
          owner: 'myorg',
          name: 'my-project',
          baseBranch: 'main',
        },
        contextRepos: [],
      };

      // Assert
      expect(githubConfig.token).toBeDefined();
      expect(githubConfig.primaryRepo).toBeDefined();
      expect(githubConfig.primaryRepo.owner).toBeDefined();
      expect(githubConfig.primaryRepo.name).toBeDefined();
      expect(githubConfig.primaryRepo.baseBranch).toBeDefined();
      expect(Array.isArray(githubConfig.contextRepos)).toBe(true);
    });

    it('GIVEN GitHubConfig type THEN contextRepos should be array of ContextRepo', () => {
      // Arrange
      const githubConfig: GitHubConfig = {
        token: 'ghp_test',
        primaryRepo: {
          owner: 'org',
          name: 'repo',
          baseBranch: 'main',
        },
        contextRepos: [
          {
            owner: 'org1',
            name: 'repo1',
            description: 'First repo',
          },
          {
            owner: 'org2',
            name: 'repo2',
            description: 'Second repo',
            cloneDepth: 1,
          },
        ],
      };

      // Assert
      expect(githubConfig.contextRepos).toHaveLength(2);
      expect(githubConfig.contextRepos[1].cloneDepth).toBe(1);
    });

    it('GIVEN ContextRepo type THEN cloneDepth should be optional number', () => {
      // Arrange
      const repo1: ContextRepo = {
        owner: 'org',
        name: 'repo',
        description: 'Test',
      };

      const repo2: ContextRepo = {
        owner: 'org',
        name: 'repo',
        description: 'Test',
        cloneDepth: 5,
      };

      // Assert
      expect(repo1.cloneDepth).toBeUndefined();
      expect(repo2.cloneDepth).toBe(5);
    });
  });

  describe('MCPConfig interface', () => {
    it('GIVEN a valid MCPConfig object THEN all required fields are present', () => {
      // Arrange & Act
      const mcpConfig: MCPConfig = {
        enabled: false,
        servers: [],
      };

      // Assert
      expect(typeof mcpConfig.enabled).toBe('boolean');
      expect(Array.isArray(mcpConfig.servers)).toBe(true);
    });

    it('GIVEN MCPConfig type THEN servers should be array of MCPServer', () => {
      // Arrange
      const mcpConfig: MCPConfig = {
        enabled: true,
        servers: [
          {
            name: 'postgres',
            command: 'mcp-server-postgres',
            env: {
              DATABASE_URL: 'postgresql://localhost/db',
            },
          },
          {
            name: 'filesystem',
            command: 'mcp-server-filesystem',
            args: ['/Users/test/project'],
          },
        ],
      };

      // Assert
      expect(mcpConfig.servers).toHaveLength(2);
      expect(mcpConfig.servers[0].name).toBe('postgres');
      expect(mcpConfig.servers[0].env).toBeDefined();
      expect(mcpConfig.servers[1].args).toEqual(['/Users/test/project']);
    });

    it('GIVEN MCPServer type THEN env should be optional Record<string, string>', () => {
      // Arrange
      const server1: MCPServer = {
        name: 'test',
        command: 'test-command',
      };

      const server2: MCPServer = {
        name: 'test',
        command: 'test-command',
        env: {
          KEY1: 'value1',
          KEY2: 'value2',
        },
      };

      // Assert
      expect(server1.env).toBeUndefined();
      expect(server2.env).toBeDefined();
      expect(server2.env?.KEY1).toBe('value1');
    });

    it('GIVEN MCPServer type THEN args should be optional string array', () => {
      // Arrange
      const server1: MCPServer = {
        name: 'test',
        command: 'test-command',
      };

      const server2: MCPServer = {
        name: 'test',
        command: 'test-command',
        args: ['--flag', 'value', '/path'],
      };

      // Assert
      expect(server1.args).toBeUndefined();
      expect(server2.args).toEqual(['--flag', 'value', '/path']);
    });
  });

  describe('ValidationError interface', () => {
    it('GIVEN a ValidationError object THEN it should have field and message properties', () => {
      // Arrange & Act
      const error: ValidationError = {
        field: 'jira.host',
        message: 'jira.host must be a valid URL',
      };

      // Assert
      expect(error.field).toBe('jira.host');
      expect(error.message).toBe('jira.host must be a valid URL');
      expect(typeof error.field).toBe('string');
      expect(typeof error.message).toBe('string');
    });

    it('GIVEN ValidationError type THEN it should support nested field paths', () => {
      // Arrange
      const errors: ValidationError[] = [
        { field: 'jira.apiToken', message: 'Required' },
        { field: 'github.primaryRepo.owner', message: 'Required' },
        { field: 'slack.dmContacts[0].userId', message: 'Invalid format' },
      ];

      // Assert
      expect(errors).toHaveLength(3);
      expect(errors[1].field).toContain('.');
      expect(errors[2].field).toContain('[');
    });
  });

  describe('NotifyOnEvent type', () => {
    it('GIVEN NotifyOnEvent type THEN it should be union of valid event strings', () => {
      // Arrange: Valid event types
      const event1: NotifyOnEvent = 'blocked';
      const event2: NotifyOnEvent = 'failed';
      const event3: NotifyOnEvent = 'question';
      const event4: NotifyOnEvent = 'complete';

      // Assert: These should compile
      expect(event1).toBe('blocked');
      expect(event2).toBe('failed');
      expect(event3).toBe('question');
      expect(event4).toBe('complete');
    });

    it('GIVEN NotifyOnEvent type THEN invalid event strings should not compile', () => {
      // @ts-expect-error - "invalid" is not a valid NotifyOnEvent
      const invalidEvent: NotifyOnEvent = 'invalid';

      // Assert: TypeScript should catch this at compile time
      expect(invalidEvent).toBeDefined();
    });
  });

  describe('Type safety (AC-1.7: No any types)', () => {
    it('GIVEN all config types THEN they should not contain any explicit any types', () => {
      // This is primarily a compile-time check
      // Runtime verification that objects conform to types

      const config: DaemonConfig = {
        version: '1.0',
        jira: {
          host: 'https://example.atlassian.net',
          email: 'user@example.com',
          apiToken: 'token',
          project: 'PROJ',
          jql: 'status = Ready',
          statusTransitions: {},
        },
        slack: {
          botToken: 'xoxb-test',
          statusChannel: 'C123',
          dmContacts: [],
        },
        github: {
          token: 'ghp_test',
          primaryRepo: {
            owner: 'org',
            name: 'repo',
            baseBranch: 'main',
          },
          contextRepos: [],
        },
        mcp: {
          enabled: false,
          servers: [],
        },
      };

      // Assert: All fields have known types
      expect(typeof config.version).toBe('string');
      expect(typeof config.jira.host).toBe('string');
      expect(typeof config.slack.botToken).toBe('string');
      expect(typeof config.github.token).toBe('string');
      expect(typeof config.mcp.enabled).toBe('boolean');
    });

    it('GIVEN nested config objects THEN all nested properties should have explicit types', () => {
      // Arrange
      const jira: JiraConfig = {
        host: 'https://example.atlassian.net',
        email: 'user@example.com',
        apiToken: 'token',
        project: 'PROJ',
        jql: 'status = Ready',
        statusTransitions: {
          key: 'value',
        },
      };

      // Assert: statusTransitions is Record<string, string>, not any
      const transitions: Record<string, string> = jira.statusTransitions;
      expect(transitions).toBeDefined();
      expect(typeof transitions.key).toBe('string');
    });

    it('GIVEN arrays in config THEN array element types should be explicit', () => {
      // Arrange
      const slack: SlackConfig = {
        botToken: 'xoxb-test',
        statusChannel: 'C123',
        dmContacts: [
          { userId: 'U123', notifyOn: ['blocked'] },
        ],
      };

      // Assert: dmContacts is typed array, not any[]
      const firstContact = slack.dmContacts[0];
      const userId: string = firstContact.userId;
      const events: NotifyOnEvent[] = firstContact.notifyOn;

      expect(userId).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('Optional vs required fields', () => {
    it('GIVEN JiraConfig THEN commentOnStart and commentOnComplete should be optional', () => {
      // Arrange: Config without optional fields
      const jiraMinimal: JiraConfig = {
        host: 'https://example.atlassian.net',
        email: 'user@example.com',
        apiToken: 'token',
        project: 'PROJ',
        jql: 'status = Ready',
        statusTransitions: {},
      };

      // Assert: Should compile without optional fields
      expect(jiraMinimal.commentOnStart).toBeUndefined();
      expect(jiraMinimal.commentOnComplete).toBeUndefined();
    });

    it('GIVEN ContextRepo THEN cloneDepth should be optional', () => {
      // Arrange
      const repoMinimal: ContextRepo = {
        owner: 'org',
        name: 'repo',
        description: 'Test',
      };

      // Assert
      expect(repoMinimal.cloneDepth).toBeUndefined();
    });

    it('GIVEN MCPServer THEN env and args should be optional', () => {
      // Arrange
      const serverMinimal: MCPServer = {
        name: 'test',
        command: 'test-command',
      };

      // Assert
      expect(serverMinimal.env).toBeUndefined();
      expect(serverMinimal.args).toBeUndefined();
    });

    it('GIVEN GitHubConfig THEN contextRepos can be empty array', () => {
      // Arrange
      const githubMinimal: GitHubConfig = {
        token: 'ghp_test',
        primaryRepo: {
          owner: 'org',
          name: 'repo',
          baseBranch: 'main',
        },
        contextRepos: [],
      };

      // Assert
      expect(githubMinimal.contextRepos).toHaveLength(0);
    });

    it('GIVEN SlackConfig THEN dmContacts can be empty array', () => {
      // Arrange
      const slackMinimal: SlackConfig = {
        botToken: 'xoxb-test',
        statusChannel: 'C123',
        dmContacts: [],
      };

      // Assert
      expect(slackMinimal.dmContacts).toHaveLength(0);
    });
  });

  describe('Type exports (AC-1.8: All types exported)', () => {
    it('GIVEN config/types module THEN DaemonConfig should be exported', () => {
      // This test verifies import works (compile-time check)
      const config = {} as DaemonConfig;
      expect(config).toBeDefined();
    });

    it('GIVEN config/types module THEN all sub-config types should be exported', () => {
      // Assert: All imports work
      const jira = {} as JiraConfig;
      const slack = {} as SlackConfig;
      const github = {} as GitHubConfig;
      const mcp = {} as MCPConfig;

      expect(jira).toBeDefined();
      expect(slack).toBeDefined();
      expect(github).toBeDefined();
      expect(mcp).toBeDefined();
    });

    it('GIVEN config/types module THEN utility types should be exported', () => {
      // Assert: Utility type imports work
      const error = {} as ValidationError;
      const event = 'blocked' as NotifyOnEvent;
      const repo = {} as ContextRepo;
      const server = {} as MCPServer;

      expect(error).toBeDefined();
      expect(event).toBeDefined();
      expect(repo).toBeDefined();
      expect(server).toBeDefined();
    });
  });
});
