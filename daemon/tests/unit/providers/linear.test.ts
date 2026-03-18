import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinearProvider } from '../../../src/providers/linear';
import type { LinearConfig } from '../../../src/types';

const BASE_LINEAR_CONFIG: LinearConfig = {
  apiKey: 'lin_api_test123',
  teamId: 'team-abc123',
  filter: 'state[name][eq]: "Todo"',
};

describe('LinearProvider (WS-DAEMON-10)', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let provider: LinearProvider;

  beforeEach(() => {
    mockFetch = vi.fn();
    provider = new LinearProvider(BASE_LINEAR_CONFIG, mockFetch);
  });

  describe('poll()', () => {
    describe('AC: Uses Linear GraphQL API', () => {
      it('GIVEN valid config WHEN poll() called THEN POSTs to Linear GraphQL endpoint', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            data: { issues: { nodes: [] } },
          }),
        });

        await provider.poll();

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.linear.app/graphql',
          expect.any(Object)
        );
      });

      it('GIVEN valid config WHEN poll() called THEN uses Authorization header with API key', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: { issues: { nodes: [] } } }),
        });

        await provider.poll();

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'lin_api_test123',
            }),
          })
        );
      });

      it('GIVEN valid config WHEN poll() called THEN sends a GraphQL query in body', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: { issues: { nodes: [] } } }),
        });

        await provider.poll();

        const callBody = JSON.parse(vi.mocked(mockFetch).mock.calls[0][1].body as string);
        expect(callBody.query).toBeDefined();
        expect(typeof callBody.query).toBe('string');
      });

      it('GIVEN valid config WHEN poll() called THEN Content-Type is application/json', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: { issues: { nodes: [] } } }),
        });

        await provider.poll();

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
      });
    });

    describe('AC: Priority mapping (1=urgent → critical, 2=high, 3=medium, 4=low, 0=none → medium)', () => {
      it('GIVEN Linear issue with priority 1 (urgent) WHEN poll() called THEN maps to "critical"', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              issues: {
                nodes: [{
                  id: 'lin-id-1',
                  identifier: 'ENG-1',
                  title: 'Urgent issue',
                  description: 'Desc',
                  priority: 1,
                  labels: { nodes: [] },
                  url: 'https://linear.app/team/issue/ENG-1',
                }],
              },
            },
          }),
        });

        const tickets = await provider.poll();
        expect(tickets[0].priority).toBe('critical');
      });

      it('GIVEN Linear issue with priority 2 (high) WHEN poll() called THEN maps to "high"', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              issues: {
                nodes: [{
                  id: 'lin-id-1', identifier: 'ENG-1', title: 'High', description: '',
                  priority: 2, labels: { nodes: [] }, url: 'https://linear.app/team/issue/ENG-1',
                }],
              },
            },
          }),
        });

        const tickets = await provider.poll();
        expect(tickets[0].priority).toBe('high');
      });

      it('GIVEN Linear issue with priority 3 (medium) WHEN poll() called THEN maps to "medium"', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              issues: {
                nodes: [{
                  id: 'lin-id-1', identifier: 'ENG-1', title: 'Med', description: '',
                  priority: 3, labels: { nodes: [] }, url: 'https://linear.app/team/issue/ENG-1',
                }],
              },
            },
          }),
        });

        const tickets = await provider.poll();
        expect(tickets[0].priority).toBe('medium');
      });

      it('GIVEN Linear issue with priority 4 (low) WHEN poll() called THEN maps to "low"', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              issues: {
                nodes: [{
                  id: 'lin-id-1', identifier: 'ENG-1', title: 'Low', description: '',
                  priority: 4, labels: { nodes: [] }, url: 'https://linear.app/team/issue/ENG-1',
                }],
              },
            },
          }),
        });

        const tickets = await provider.poll();
        expect(tickets[0].priority).toBe('low');
      });

      it('GIVEN Linear issue with priority 0 (none) WHEN poll() called THEN maps to "medium"', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              issues: {
                nodes: [{
                  id: 'lin-id-1', identifier: 'ENG-1', title: 'No priority', description: '',
                  priority: 0, labels: { nodes: [] }, url: 'https://linear.app/team/issue/ENG-1',
                }],
              },
            },
          }),
        });

        const tickets = await provider.poll();
        expect(tickets[0].priority).toBe('medium');
      });
    });

    describe('AC: NormalizedTicket shape', () => {
      it('GIVEN Linear issue WHEN poll() called THEN ticket has source="linear"', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              issues: {
                nodes: [{
                  id: 'lin-id-1', identifier: 'ENG-1', title: 'Test', description: 'Desc',
                  priority: 2, labels: { nodes: [] }, url: 'https://linear.app/team/issue/ENG-1',
                }],
              },
            },
          }),
        });

        const tickets = await provider.poll();
        expect(tickets[0].source).toBe('linear');
      });

      it('GIVEN Linear issue WHEN poll() called THEN ticket id uses identifier', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              issues: {
                nodes: [{
                  id: 'lin-id-1', identifier: 'ENG-42', title: 'Test', description: '',
                  priority: 3, labels: { nodes: [] }, url: 'https://linear.app/team/issue/ENG-42',
                }],
              },
            },
          }),
        });

        const tickets = await provider.poll();
        expect(tickets[0].id).toBe('ENG-42');
      });

      it('GIVEN Linear issue with labels WHEN poll() called THEN maps labels to string array', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              issues: {
                nodes: [{
                  id: 'lin-id-1', identifier: 'ENG-1', title: 'Test', description: '',
                  priority: 2,
                  labels: { nodes: [{ name: 'backend' }, { name: 'bug' }] },
                  url: 'https://linear.app/team/issue/ENG-1',
                }],
              },
            },
          }),
        });

        const tickets = await provider.poll();
        expect(tickets[0].labels).toEqual(['backend', 'bug']);
      });

      it('GIVEN Linear issue WHEN poll() called THEN ticket includes raw Linear issue data', async () => {
        const rawIssue = {
          id: 'lin-id-1', identifier: 'ENG-1', title: 'Test', description: 'Desc',
          priority: 2, labels: { nodes: [] }, url: 'https://linear.app/team/issue/ENG-1',
        };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: { issues: { nodes: [rawIssue] } } }),
        });

        const tickets = await provider.poll();
        expect(tickets[0].raw).toEqual(rawIssue);
      });
    });

    describe('AC: Error handling', () => {
      it('GIVEN network error WHEN poll() called THEN returns empty array without throwing', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const result = await provider.poll();
        expect(result).toEqual([]);
      });

      it('GIVEN 401 unauthorized WHEN poll() called THEN returns empty array', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 401 });

        const result = await provider.poll();
        expect(result).toEqual([]);
      });

      it('GIVEN GraphQL errors in response WHEN poll() called THEN returns empty array', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            errors: [{ message: 'Unauthorized' }],
          }),
        });

        const result = await provider.poll();
        expect(result).toEqual([]);
      });

      it('GIVEN poll() with since date WHEN called THEN still fetches from Linear API', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: { issues: { nodes: [] } } }),
        });

        await provider.poll(new Date('2024-01-01'));
        expect(mockFetch).toHaveBeenCalledOnce();
      });
    });
  });

  describe('createSubtask()', () => {
    it('GIVEN parent and task input WHEN createSubtask() called THEN POSTs GraphQL mutation to Linear', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: { issueCreate: { issue: { id: 'lin-new-id', identifier: 'ENG-99' } } },
        }),
      });

      await provider.createSubtask('ENG-1', {
        title: 'Sub-task',
        description: 'Sub desc',
        parentId: 'lin-parent-id',
      });

      const callBody = JSON.parse(vi.mocked(mockFetch).mock.calls[0][1].body as string);
      expect(callBody.query).toContain('issueCreate');
    });

    it('GIVEN createSubtask() succeeds THEN returns the new issue identifier', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: { issueCreate: { issue: { id: 'lin-new-id', identifier: 'ENG-99' } } },
        }),
      });

      const result = await provider.createSubtask('ENG-1', {
        title: 'Sub-task',
        description: 'Desc',
        parentId: 'lin-parent-id',
      });

      expect(result).toBe('ENG-99');
    });

    it('GIVEN createSubtask() API returns errors THEN throws', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          errors: [{ message: 'Team not found' }],
        }),
      });

      await expect(
        provider.createSubtask('ENG-1', { title: 'Sub', description: '', parentId: 'lin-id' })
      ).rejects.toThrow();
    });
  });

  describe('transitionStatus()', () => {
    it('GIVEN ticket and status WHEN transitionStatus() called THEN queries team states first', async () => {
      // First call: fetch team states
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: { team: { states: { nodes: [{ id: 'state-ip', name: 'In Progress' }] } } },
          }),
        })
        // Second call: update issue with stateId
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: { issueUpdate: { issue: { id: 'lin-id-1' } } } }),
        });

      await provider.transitionStatus('ENG-1', 'in_progress');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const firstBody = JSON.parse(vi.mocked(mockFetch).mock.calls[0][1].body as string);
      expect(firstBody.query).toContain('states');
    });

    it('GIVEN ticket and status WHEN transitionStatus() called THEN sends issueUpdate with stateId', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: { team: { states: { nodes: [{ id: 'state-ip-uuid', name: 'In Progress' }] } } },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: { issueUpdate: { issue: { id: 'lin-id-1' } } } }),
        });

      await provider.transitionStatus('ENG-1', 'in_progress');

      const secondBody = JSON.parse(vi.mocked(mockFetch).mock.calls[1][1].body as string);
      expect(secondBody.query).toContain('issueUpdate');
      // Must pass stateId, not stateName
      expect(JSON.stringify(secondBody.variables)).toContain('state-ip-uuid');
      expect(JSON.stringify(secondBody.variables)).not.toContain('stateName');
    });

    it('GIVEN matching state not found WHEN transitionStatus() called THEN does not throw', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: { team: { states: { nodes: [{ id: 'state-todo', name: 'Todo' }] } } },
        }),
      });

      // Should resolve without throwing even if target state is absent
      await expect(provider.transitionStatus('ENG-1', 'done')).resolves.not.toThrow();
      // Only one call (states lookup), no update call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('GIVEN state cache populated WHEN transitionStatus() called twice THEN only one states query made', async () => {
      const statesResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          data: { team: { states: { nodes: [{ id: 'state-ip', name: 'In Progress' }] } } },
        }),
      };
      const updateResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: { issueUpdate: { issue: { id: 'lin-id-1' } } } }),
      };

      mockFetch
        .mockResolvedValueOnce(statesResponse) // first states lookup
        .mockResolvedValueOnce(updateResponse) // first update
        .mockResolvedValueOnce(updateResponse); // second update (no second states lookup)

      await provider.transitionStatus('ENG-1', 'in_progress');
      await provider.transitionStatus('ENG-2', 'in_progress');

      // 3 calls total: 1 states + 2 updates (not 4)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('GIVEN transitionStatus() issueUpdate API fails THEN throws', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: { team: { states: { nodes: [{ id: 'state-done', name: 'Done' }] } } },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ errors: [{ message: 'Not found' }] }),
        });

      await expect(provider.transitionStatus('ENG-1', 'done')).rejects.toThrow();
    });
  });

  describe('addComment()', () => {
    it('GIVEN ticket and body WHEN addComment() called THEN sends createComment mutation', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: { createComment: { comment: { id: 'comment-id' } } },
        }),
      });

      await provider.addComment('lin-id-1', 'Build started.');

      const callBody = JSON.parse(vi.mocked(mockFetch).mock.calls[0][1].body as string);
      expect(callBody.query).toContain('createComment');
    });

    it('GIVEN addComment() WHEN called THEN includes the comment body in variables', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: { createComment: { comment: { id: 'comment-id' } } },
        }),
      });

      await provider.addComment('lin-id-1', 'PR created successfully.');

      const callBody = JSON.parse(vi.mocked(mockFetch).mock.calls[0][1].body as string);
      expect(JSON.stringify(callBody)).toContain('PR created successfully');
    });

    it('GIVEN addComment() API fails THEN throws', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ errors: [{ message: 'Not found' }] }),
      });

      await expect(provider.addComment('lin-id-1', 'comment')).rejects.toThrow();
    });
  });

  describe('linkPR()', () => {
    it('GIVEN ticket and PR URL WHEN linkPR() called THEN sends attachmentCreate mutation', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: { attachmentCreate: { attachment: { id: 'attach-id' } } },
        }),
      });

      await provider.linkPR('lin-id-1', 'https://github.com/owner/repo/pull/42');

      const callBody = JSON.parse(vi.mocked(mockFetch).mock.calls[0][1].body as string);
      expect(callBody.query).toContain('attachmentCreate');
    });

    it('GIVEN linkPR() WHEN called THEN includes PR URL in mutation variables', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: { attachmentCreate: { attachment: { id: 'attach-id' } } },
        }),
      });

      const prUrl = 'https://github.com/owner/repo/pull/42';
      await provider.linkPR('lin-id-1', prUrl);

      const callBody = JSON.parse(vi.mocked(mockFetch).mock.calls[0][1].body as string);
      expect(JSON.stringify(callBody)).toContain(prUrl);
    });

    it('GIVEN linkPR() API fails THEN throws', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ errors: [{ message: 'Not found' }] }),
      });

      await expect(provider.linkPR('lin-id-1', 'https://github.com/pr/1')).rejects.toThrow();
    });
  });
});
