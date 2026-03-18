/**
 * Contract test suite — runs the same behavioral expectations against all three providers.
 * Each provider is configured with mocked I/O (fetch mock for Jira/Linear, execSync mock for GitHub).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JiraProvider } from '../../../src/providers/jira';
import { LinearProvider } from '../../../src/providers/linear';
import { GitHubProvider } from '../../../src/providers/github';
import type { TicketProvider } from '../../../src/providers/types';

// Mock dependencies
vi.mock('../../../src/tracker', () => ({
  getProcessedTickets: vi.fn().mockReturnValue([]),
}));

vi.mock('child_process', () => ({
  spawnSync: vi.fn(),
}));

import { spawnSync } from 'child_process';

// --- Provider factory helpers ---

function makeJiraProvider(): { provider: TicketProvider; mockFetch: ReturnType<typeof vi.fn> } {
  const mockFetch = vi.fn();
  const provider = new JiraProvider(
    { host: 'https://test.atlassian.net', apiToken: 'token', project: 'TEST', jql: 'project = TEST' },
    { intervalSeconds: 300, batchSize: 5 },
    mockFetch
  );
  return { provider, mockFetch };
}

function makeLinearProvider(): { provider: TicketProvider; mockFetch: ReturnType<typeof vi.fn> } {
  const mockFetch = vi.fn();
  const provider = new LinearProvider(
    { apiKey: 'lin_api_test', teamId: 'team-123', filter: '' },
    mockFetch
  );
  return { provider, mockFetch };
}

function makeGitHubProvider(): { provider: TicketProvider } {
  const provider = new GitHubProvider({ repo: 'owner/repo', baseBranch: 'main' });
  return { provider };
}

// --- Shared helpers for seeding responses ---

function seedJiraPollResponse(mockFetch: ReturnType<typeof vi.fn>, issues: object[]) {
  mockFetch.mockResolvedValue({
    ok: true, status: 200,
    json: async () => ({ issues }),
  });
}

function seedLinearPollResponse(mockFetch: ReturnType<typeof vi.fn>, nodes: object[]) {
  mockFetch.mockResolvedValue({
    ok: true, status: 200,
    json: async () => ({ data: { issues: { nodes } } }),
  });
}

function seedGitHubPollResponse(issues: object[]) {
  vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: JSON.stringify(issues), stderr: '' } as any);
}

// --- Contract: poll() ---

describe('Contract: poll() returns NormalizedTicket[]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('JiraProvider', () => {
    it('WHEN poll() called with no issues THEN returns empty array', async () => {
      const { provider, mockFetch } = makeJiraProvider();
      seedJiraPollResponse(mockFetch, []);
      expect(await provider.poll()).toEqual([]);
    });

    it('WHEN poll() called with one issue THEN returns one NormalizedTicket', async () => {
      const { provider, mockFetch } = makeJiraProvider();
      seedJiraPollResponse(mockFetch, [{
        key: 'TEST-1',
        fields: { summary: 'Fix bug', description: 'A bug', priority: { name: 'High' }, labels: ['backend'] },
      }]);

      const tickets = await provider.poll();
      expect(tickets).toHaveLength(1);
      expect(tickets[0].id).toBeDefined();
      expect(tickets[0].source).toBe('jira');
      expect(tickets[0].title).toBe('Fix bug');
      expect(tickets[0].description).toBe('A bug');
      expect(tickets[0].priority).toMatch(/^(critical|high|medium|low)$/);
      expect(Array.isArray(tickets[0].labels)).toBe(true);
      expect(tickets[0].url).toBeDefined();
      expect(tickets[0].raw).toBeDefined();
    });

    it('WHEN poll() encounters network error THEN returns empty array without throwing', async () => {
      const { provider, mockFetch } = makeJiraProvider();
      mockFetch.mockRejectedValue(new Error('Network error'));
      expect(await provider.poll()).toEqual([]);
    });
  });

  describe('LinearProvider', () => {
    it('WHEN poll() called with no issues THEN returns empty array', async () => {
      const { provider, mockFetch } = makeLinearProvider();
      seedLinearPollResponse(mockFetch, []);
      expect(await provider.poll()).toEqual([]);
    });

    it('WHEN poll() called with one issue THEN returns one NormalizedTicket', async () => {
      const { provider, mockFetch } = makeLinearProvider();
      seedLinearPollResponse(mockFetch, [{
        id: 'lin-id-1', identifier: 'ENG-1', title: 'Fix bug', description: 'A bug',
        priority: 2, labels: { nodes: [{ name: 'backend' }] },
        url: 'https://linear.app/team/issue/ENG-1',
      }]);

      const tickets = await provider.poll();
      expect(tickets).toHaveLength(1);
      expect(tickets[0].id).toBeDefined();
      expect(tickets[0].source).toBe('linear');
      expect(tickets[0].title).toBe('Fix bug');
      expect(tickets[0].description).toBe('A bug');
      expect(tickets[0].priority).toMatch(/^(critical|high|medium|low)$/);
      expect(Array.isArray(tickets[0].labels)).toBe(true);
      expect(tickets[0].url).toBeDefined();
      expect(tickets[0].raw).toBeDefined();
    });

    it('WHEN poll() encounters network error THEN returns empty array without throwing', async () => {
      const { provider, mockFetch } = makeLinearProvider();
      mockFetch.mockRejectedValue(new Error('Network error'));
      expect(await provider.poll()).toEqual([]);
    });
  });

  describe('GitHubProvider', () => {
    it('WHEN poll() called with no issues THEN returns empty array', async () => {
      const { provider } = makeGitHubProvider();
      seedGitHubPollResponse([]);
      expect(await provider.poll()).toEqual([]);
    });

    it('WHEN poll() called with one issue THEN returns one NormalizedTicket', async () => {
      const { provider } = makeGitHubProvider();
      seedGitHubPollResponse([{
        number: 1, title: 'Fix bug', body: 'A bug',
        labels: [{ name: 'backend' }], url: 'https://github.com/owner/repo/issues/1',
      }]);

      const tickets = await provider.poll();
      expect(tickets).toHaveLength(1);
      expect(tickets[0].id).toBeDefined();
      expect(tickets[0].source).toBe('github');
      expect(tickets[0].title).toBe('Fix bug');
      expect(tickets[0].description).toBe('A bug');
      expect(tickets[0].priority).toMatch(/^(critical|high|medium|low)$/);
      expect(Array.isArray(tickets[0].labels)).toBe(true);
      expect(tickets[0].url).toBeDefined();
      expect(tickets[0].raw).toBeDefined();
    });

    it('WHEN poll() encounters CLI error THEN returns empty array without throwing', async () => {
      const { provider } = makeGitHubProvider();
      vi.mocked(spawnSync).mockReturnValue({ status: 1, stdout: '', stderr: 'gh CLI error' } as any);
      expect(await provider.poll()).toEqual([]);
    });
  });
});

// --- Contract: createSubtask() ---

describe('Contract: createSubtask() returns string ID', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('JiraProvider.createSubtask() returns new ticket key string', async () => {
    const { provider, mockFetch } = makeJiraProvider();
    mockFetch.mockResolvedValue({
      ok: true, status: 201,
      json: async () => ({ key: 'TEST-99' }),
    });

    const result = await provider.createSubtask('TEST-1', {
      title: 'Sub', description: 'Desc', parentId: 'TEST-1',
    });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('LinearProvider.createSubtask() returns new issue identifier string', async () => {
    const { provider, mockFetch } = makeLinearProvider();
    mockFetch.mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({
        data: { issueCreate: { issue: { id: 'lin-new', identifier: 'ENG-99' } } },
      }),
    });

    const result = await provider.createSubtask('ENG-1', {
      title: 'Sub', description: 'Desc', parentId: 'lin-parent-id',
    });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('GitHubProvider.createSubtask() returns GH-{number} string', async () => {
    const { provider } = makeGitHubProvider();
    vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: 'https://github.com/owner/repo/issues/100\n', stderr: '' } as any);

    const result = await provider.createSubtask('GH-1', {
      title: 'Sub', description: 'Desc', parentId: 'GH-1',
    });
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^GH-\d+$/);
  });
});

// --- Contract: transitionStatus() ---

describe('Contract: transitionStatus() resolves without value', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('JiraProvider.transitionStatus() resolves to undefined', async () => {
    const { provider, mockFetch } = makeJiraProvider();
    mockFetch
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ transitions: [{ id: '21', name: 'In Progress' }] }),
      })
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });

    await expect(provider.transitionStatus('TEST-1', 'in_progress')).resolves.toBeUndefined();
  });

  it('LinearProvider.transitionStatus() resolves to undefined', async () => {
    const { provider, mockFetch } = makeLinearProvider();
    mockFetch.mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ data: { issueUpdate: { issue: { id: 'lin-id' } } } }),
    });

    await expect(provider.transitionStatus('ENG-1', 'in_review')).resolves.toBeUndefined();
  });

  it('GitHubProvider.transitionStatus() resolves to undefined', async () => {
    const { provider } = makeGitHubProvider();
    vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

    await expect(provider.transitionStatus('GH-42', 'in_progress')).resolves.toBeUndefined();
  });
});

// --- Contract: addComment() ---

describe('Contract: addComment() resolves without value', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('JiraProvider.addComment() resolves to undefined', async () => {
    const { provider, mockFetch } = makeJiraProvider();
    mockFetch.mockResolvedValue({
      ok: true, status: 201,
      json: async () => ({ id: '10001' }),
    });

    await expect(provider.addComment('TEST-1', 'comment')).resolves.toBeUndefined();
  });

  it('LinearProvider.addComment() resolves to undefined', async () => {
    const { provider, mockFetch } = makeLinearProvider();
    mockFetch.mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ data: { createComment: { comment: { id: 'c-id' } } } }),
    });

    await expect(provider.addComment('lin-id', 'comment')).resolves.toBeUndefined();
  });

  it('GitHubProvider.addComment() resolves to undefined', async () => {
    const { provider } = makeGitHubProvider();
    vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

    await expect(provider.addComment('GH-42', 'comment')).resolves.toBeUndefined();
  });
});

// --- Contract: linkPR() ---

describe('Contract: linkPR() resolves without value', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('JiraProvider.linkPR() resolves to undefined', async () => {
    const { provider, mockFetch } = makeJiraProvider();
    mockFetch.mockResolvedValue({
      ok: true, status: 201,
      json: async () => ({ id: 1 }),
    });

    await expect(provider.linkPR('TEST-1', 'https://github.com/pr/1')).resolves.toBeUndefined();
  });

  it('LinearProvider.linkPR() resolves to undefined', async () => {
    const { provider, mockFetch } = makeLinearProvider();
    mockFetch.mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ data: { attachmentCreate: { attachment: { id: 'a-id' } } } }),
    });

    await expect(provider.linkPR('lin-id', 'https://github.com/pr/1')).resolves.toBeUndefined();
  });

  it('GitHubProvider.linkPR() resolves to undefined', async () => {
    const { provider } = makeGitHubProvider();

    await expect(provider.linkPR('GH-42', 'https://github.com/pr/1')).resolves.toBeUndefined();
  });
});
