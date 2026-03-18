import { describe, it, expect, vi } from 'vitest';
import { createProvider } from '../../../src/providers/factory';
import { JiraProvider } from '../../../src/providers/jira';
import { LinearProvider } from '../../../src/providers/linear';
import { GitHubProvider } from '../../../src/providers/github';
import type { DaemonConfig } from '../../../src/types';

vi.mock('../../../src/tracker', () => ({
  getProcessedTickets: vi.fn().mockReturnValue([]),
}));

const BASE_CONFIG: DaemonConfig = {
  provider: 'jira',
  jira: {
    host: 'https://test.atlassian.net',
    apiToken: 'token',
    project: 'TEST',
    jql: 'project = TEST',
  },
  linear: {
    apiKey: 'lin_api_test',
    teamId: 'team-123',
    filter: 'state[name][eq]: "Todo"',
  },
  github: {
    repo: 'owner/repo',
    baseBranch: 'main',
    issueFilter: 'label:mg-daemon',
  },
  polling: {
    intervalSeconds: 300,
    batchSize: 5,
  },
};

describe('createProvider() factory (WS-DAEMON-10)', () => {
  describe('AC: Selects provider based on config.provider', () => {
    it('GIVEN config.provider="jira" WHEN createProvider() called THEN returns JiraProvider instance', () => {
      const config: DaemonConfig = { ...BASE_CONFIG, provider: 'jira' };
      const provider = createProvider(config);
      expect(provider).toBeInstanceOf(JiraProvider);
    });

    it('GIVEN config.provider="linear" WHEN createProvider() called THEN returns LinearProvider instance', () => {
      const config: DaemonConfig = { ...BASE_CONFIG, provider: 'linear' };
      const provider = createProvider(config);
      expect(provider).toBeInstanceOf(LinearProvider);
    });

    it('GIVEN config.provider="github" WHEN createProvider() called THEN returns GitHubProvider instance', () => {
      const config: DaemonConfig = { ...BASE_CONFIG, provider: 'github' };
      const provider = createProvider(config);
      expect(provider).toBeInstanceOf(GitHubProvider);
    });
  });

  describe('AC: Returned provider satisfies TicketProvider interface', () => {
    it('GIVEN provider="jira" WHEN createProvider() THEN returned provider has poll method', () => {
      const provider = createProvider({ ...BASE_CONFIG, provider: 'jira' });
      expect(typeof provider.poll).toBe('function');
    });

    it('GIVEN provider="linear" WHEN createProvider() THEN returned provider has createSubtask method', () => {
      const provider = createProvider({ ...BASE_CONFIG, provider: 'linear' });
      expect(typeof provider.createSubtask).toBe('function');
    });

    it('GIVEN provider="github" WHEN createProvider() THEN returned provider has all 5 methods', () => {
      const provider = createProvider({ ...BASE_CONFIG, provider: 'github' });
      expect(typeof provider.poll).toBe('function');
      expect(typeof provider.createSubtask).toBe('function');
      expect(typeof provider.transitionStatus).toBe('function');
      expect(typeof provider.addComment).toBe('function');
      expect(typeof provider.linkPR).toBe('function');
    });
  });

  describe('AC: Error cases', () => {
    it('GIVEN unknown provider value WHEN createProvider() called THEN throws descriptive error', () => {
      const config = { ...BASE_CONFIG, provider: 'unknown' as 'jira' };
      expect(() => createProvider(config)).toThrow();
    });

    it('GIVEN config.provider="jira" but jira section missing WHEN createProvider() called THEN throws', () => {
      const config: DaemonConfig = {
        ...BASE_CONFIG,
        provider: 'jira',
        jira: undefined,
      };
      expect(() => createProvider(config)).toThrow();
    });

    it('GIVEN config.provider="linear" but linear section missing WHEN createProvider() called THEN throws', () => {
      const config: DaemonConfig = {
        ...BASE_CONFIG,
        provider: 'linear',
        linear: undefined,
      };
      expect(() => createProvider(config)).toThrow();
    });

    it('GIVEN config.provider="github" but github.repo is empty WHEN createProvider() called THEN throws', () => {
      const config: DaemonConfig = {
        ...BASE_CONFIG,
        provider: 'github',
        github: { repo: '', baseBranch: 'main' },
      };
      expect(() => createProvider(config)).toThrow('config.github.repo is required');
    });
  });
});
