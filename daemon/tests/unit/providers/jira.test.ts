import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JiraProvider } from '../../../src/providers/jira';
import type { JiraConfig } from '../../../src/types';

const BASE_JIRA_CONFIG: JiraConfig = {
  host: 'https://test.atlassian.net',
  email: 'test@example.com',
  apiToken: 'test-api-token',
  project: 'TEST',
  jql: 'project = TEST AND status = "To Do"',
};

const BASE_POLLING = { intervalSeconds: 300, batchSize: 5 };

function makeConfig(jira: Partial<JiraConfig> = {}) {
  return { ...BASE_JIRA_CONFIG, ...jira };
}

describe('JiraProvider (WS-DAEMON-10)', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let provider: JiraProvider;

  beforeEach(() => {
    mockFetch = vi.fn();
    provider = new JiraProvider(makeConfig(), BASE_POLLING, mockFetch);
  });

  describe('poll()', () => {
    describe('AC: Returns NormalizedTicket[] from Jira issues', () => {
      it('GIVEN valid credentials WHEN poll() called THEN fetches from Jira API v3', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ issues: [] }),
        });

        await provider.poll();

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/rest/api/3/search'),
          expect.any(Object)
        );
      });

      it('GIVEN valid credentials WHEN poll() called THEN uses Basic auth header', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ issues: [] }),
        });

        await provider.poll();

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: expect.stringMatching(/^Basic /),
            }),
          })
        );
      });

      it('GIVEN email and apiToken WHEN poll() called THEN auth encodes email:token (not :token)', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ issues: [] }),
        });

        await provider.poll();

        const call = vi.mocked(mockFetch).mock.calls[0];
        const authHeader = (call[1] as RequestInit).headers as Record<string, string>;
        const decoded = Buffer.from(authHeader.Authorization.replace('Basic ', ''), 'base64').toString('utf-8');
        // Must be email:token format, not :token
        expect(decoded).toBe('test@example.com:test-api-token');
      });

      it('GIVEN a Jira issue with High priority WHEN poll() called THEN maps to normalized "high"', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            issues: [{
              key: 'TEST-1',
              fields: {
                summary: 'Test issue',
                description: 'Description',
                priority: { name: 'High' },
                labels: [],
              },
            }],
          }),
        });

        const tickets = await provider.poll();

        expect(tickets).toHaveLength(1);
        expect(tickets[0].priority).toBe('high');
      });

      it('GIVEN a Jira issue with Highest priority WHEN poll() called THEN maps to normalized "critical"', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            issues: [{
              key: 'TEST-1',
              fields: {
                summary: 'Critical issue',
                description: '',
                priority: { name: 'Highest' },
                labels: [],
              },
            }],
          }),
        });

        const tickets = await provider.poll();
        expect(tickets[0].priority).toBe('critical');
      });

      it('GIVEN a Jira issue with Medium priority WHEN poll() called THEN maps to normalized "medium"', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            issues: [{
              key: 'TEST-1',
              fields: { summary: 'Med', description: '', priority: { name: 'Medium' }, labels: [] },
            }],
          }),
        });

        const tickets = await provider.poll();
        expect(tickets[0].priority).toBe('medium');
      });

      it('GIVEN a Jira issue with Low priority WHEN poll() called THEN maps to normalized "low"', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            issues: [{
              key: 'TEST-1',
              fields: { summary: 'Low', description: '', priority: { name: 'Low' }, labels: [] },
            }],
          }),
        });

        const tickets = await provider.poll();
        expect(tickets[0].priority).toBe('low');
      });

      it('GIVEN a Jira issue with Lowest priority WHEN poll() called THEN maps to normalized "low"', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            issues: [{
              key: 'TEST-1',
              fields: { summary: 'Lowest', description: '', priority: { name: 'Lowest' }, labels: [] },
            }],
          }),
        });

        const tickets = await provider.poll();
        expect(tickets[0].priority).toBe('low');
      });

      it('GIVEN a Jira issue with unknown priority WHEN poll() called THEN defaults to normalized "medium"', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            issues: [{
              key: 'TEST-1',
              fields: { summary: 'Test', description: '', priority: { name: 'SomeCustomPriority' }, labels: [] },
            }],
          }),
        });

        const tickets = await provider.poll();
        expect(tickets[0].priority).toBe('medium');
      });

      it('GIVEN a Jira issue WHEN poll() called THEN ticket has source="jira"', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            issues: [{
              key: 'TEST-1',
              fields: { summary: 'Test', description: 'Desc', priority: { name: 'High' }, labels: [] },
            }],
          }),
        });

        const tickets = await provider.poll();
        expect(tickets[0].source).toBe('jira');
      });

      it('GIVEN a Jira issue WHEN poll() called THEN ticket id is the Jira key', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            issues: [{
              key: 'TEST-42',
              fields: { summary: 'Test', description: '', priority: { name: 'High' }, labels: [] },
            }],
          }),
        });

        const tickets = await provider.poll();
        expect(tickets[0].id).toBe('TEST-42');
      });

      it('GIVEN a Jira issue WHEN poll() called THEN ticket url is constructed from host and key', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            issues: [{
              key: 'TEST-42',
              fields: { summary: 'Test', description: '', priority: { name: 'High' }, labels: [] },
            }],
          }),
        });

        const tickets = await provider.poll();
        expect(tickets[0].url).toBe('https://test.atlassian.net/browse/TEST-42');
      });

      it('GIVEN a Jira issue WHEN poll() called THEN ticket has raw field with original issue', async () => {
        const rawIssue = {
          key: 'TEST-1',
          fields: { summary: 'Test', description: 'Desc', priority: { name: 'High' }, labels: [] },
        };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ issues: [rawIssue] }),
        });

        const tickets = await provider.poll();
        expect(tickets[0].raw).toEqual(rawIssue);
      });

      it('GIVEN multiple tickets from API WHEN poll() called THEN returns all tickets (dedup handled by runPollCycle)', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            issues: [
              { key: 'TEST-1', fields: { summary: 'Old', description: '', priority: { name: 'High' }, labels: [] } },
              { key: 'TEST-2', fields: { summary: 'New', description: '', priority: { name: 'High' }, labels: [] } },
            ],
          }),
        });

        const tickets = await provider.poll();
        expect(tickets).toHaveLength(2);
        expect(tickets.map(t => t.id)).toContain('TEST-1');
        expect(tickets.map(t => t.id)).toContain('TEST-2');
      });

      it('GIVEN poll() called with since date WHEN poll() called THEN still calls the API', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ issues: [] }),
        });

        await provider.poll(new Date('2024-01-01'));
        expect(mockFetch).toHaveBeenCalledOnce();
      });
    });

    describe('AC: Error handling', () => {
      it('GIVEN 401 response WHEN poll() called THEN returns empty array without throwing', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 401 });

        const result = await provider.poll();
        expect(result).toEqual([]);
      });

      it('GIVEN 429 response WHEN poll() called THEN returns empty array without throwing', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 429 });

        const result = await provider.poll();
        expect(result).toEqual([]);
      });

      it('GIVEN 500 response WHEN poll() called THEN returns empty array without throwing', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 500 });

        const result = await provider.poll();
        expect(result).toEqual([]);
      });

      it('GIVEN network error WHEN poll() called THEN returns empty array without throwing', async () => {
        mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

        const result = await provider.poll();
        expect(result).toEqual([]);
      });
    });
  });

  describe('createSubtask()', () => {
    it('GIVEN parent ticket and task input WHEN createSubtask() called THEN POSTs to Jira issue creation endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ key: 'TEST-999' }),
      });

      await provider.createSubtask('TEST-1', {
        title: 'Sub-task title',
        description: 'Sub-task description',
        parentId: 'TEST-1',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rest/api/3/issue'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('GIVEN parent ticket WHEN createSubtask() called THEN sends issuetype Sub-task in body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ key: 'TEST-999' }),
      });

      await provider.createSubtask('TEST-1', {
        title: 'Sub-task title',
        description: 'Sub-task description',
        parentId: 'TEST-1',
      });

      const body = JSON.parse(vi.mocked(mockFetch).mock.calls[0][1].body as string);
      expect(body.fields.issuetype.name).toBe('Sub-task');
    });

    it('GIVEN createSubtask() succeeds THEN returns the new ticket key', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ key: 'TEST-456' }),
      });

      const result = await provider.createSubtask('TEST-1', {
        title: 'Sub-task',
        description: 'Desc',
        parentId: 'TEST-1',
      });

      expect(result).toBe('TEST-456');
    });

    it('GIVEN createSubtask() API fails THEN throws an error', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 400, json: async () => ({}) });

      await expect(
        provider.createSubtask('TEST-1', { title: 'Sub', description: '', parentId: 'TEST-1' })
      ).rejects.toThrow();
    });
  });

  describe('transitionStatus()', () => {
    it('GIVEN a ticket and todo status WHEN transitionStatus() called THEN GETs available transitions first', async () => {
      // First call: get transitions
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            transitions: [{ id: '11', name: 'To Do' }],
          }),
        })
        // Second call: execute transition
        .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });

      await provider.transitionStatus('TEST-1', 'todo');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/transitions'),
        expect.any(Object)
      );
    });

    it('GIVEN a ticket WHEN transitionStatus() called with in_progress THEN POSTs transition', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            transitions: [
              { id: '21', name: 'In Progress' },
              { id: '11', name: 'To Do' },
            ],
          }),
        })
        .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });

      await provider.transitionStatus('TEST-1', 'in_progress');

      const secondCall = vi.mocked(mockFetch).mock.calls[1];
      expect(secondCall[1].method).toBe('POST');
      expect(secondCall[0]).toContain('/transitions');
    });

    it('GIVEN transitionStatus() WHEN no matching transition found THEN does not throw', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ transitions: [] }),
      });

      await expect(provider.transitionStatus('TEST-1', 'in_review')).resolves.not.toThrow();
    });

    it('GIVEN transitionStatus() API fails THEN throws an error', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      await expect(provider.transitionStatus('TEST-1', 'done')).rejects.toThrow();
    });
  });

  describe('addComment()', () => {
    it('GIVEN ticket and body WHEN addComment() called THEN POSTs to comment endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: '10001' }),
      });

      await provider.addComment('TEST-1', 'Work started on this ticket.');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/comment'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('GIVEN addComment() WHEN body contains the comment text THEN sends it in request body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: '10001' }),
      });

      await provider.addComment('TEST-1', 'Build started at 12:00.');

      const body = JSON.parse(vi.mocked(mockFetch).mock.calls[0][1].body as string);
      expect(JSON.stringify(body)).toContain('Build started at 12:00');
    });

    it('GIVEN addComment() API fails THEN throws an error', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 400 });

      await expect(provider.addComment('TEST-1', 'comment')).rejects.toThrow();
    });
  });

  describe('linkPR()', () => {
    it('GIVEN ticket and PR URL WHEN linkPR() called THEN POSTs to remotelink endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: 1 }),
      });

      await provider.linkPR('TEST-1', 'https://github.com/owner/repo/pull/42');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/remotelink'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('GIVEN linkPR() WHEN called THEN includes the PR URL in the remote link body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: 1 }),
      });

      const prUrl = 'https://github.com/owner/repo/pull/42';
      await provider.linkPR('TEST-1', prUrl);

      const body = JSON.parse(vi.mocked(mockFetch).mock.calls[0][1].body as string);
      expect(JSON.stringify(body)).toContain(prUrl);
    });

    it('GIVEN linkPR() API fails THEN throws an error', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      await expect(provider.linkPR('TEST-1', 'https://github.com/pr/1')).rejects.toThrow();
    });
  });

  describe('Coverage gap tests', () => {
    // Lines 109-110: poll() returns [] when response has no issues or issues is not array
    it('GIVEN API response with no issues field WHEN poll() called THEN returns empty array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}), // no issues field
      });

      const result = await provider.poll();
      expect(result).toEqual([]);
    });

    it('GIVEN API response where issues is not an array WHEN poll() called THEN returns empty array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ issues: 'not-an-array' }),
      });

      const result = await provider.poll();
      expect(result).toEqual([]);
    });
  });
});
