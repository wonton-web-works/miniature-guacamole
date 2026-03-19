/**
 * WS-DAEMON-12: Linear write-back method tests
 *
 * Covers createSubtask, transitionStatus, addComment, linkPR with thorough
 * verification of: correct GraphQL mutations, variable payloads, status
 * mapping, error handling, and idempotency contracts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinearProvider } from '../../../src/providers/linear';
import type { LinearConfig } from '../../../src/types';

const BASE_LINEAR_CONFIG: LinearConfig = {
  apiKey: 'lin_api_test123',
  teamId: 'team-abc123',
  filter: 'state[name][eq]: "Todo"',
};

const LINEAR_GRAPHQL_URL = 'https://api.linear.app/graphql';

describe('LinearProvider write-back (WS-DAEMON-12)', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let provider: LinearProvider;

  beforeEach(() => {
    mockFetch = vi.fn();
    provider = new LinearProvider(BASE_LINEAR_CONFIG, mockFetch);
  });

  // -------------------------------------------------------------------------
  // createSubtask()
  // -------------------------------------------------------------------------

  describe('createSubtask()', () => {
    describe('AC: Sends issueCreate mutation with parentId', () => {
      it('GIVEN parent and task WHEN createSubtask() called THEN POSTs to Linear GraphQL endpoint', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            data: { issueCreate: { issue: { id: 'lin-new-id', identifier: 'ENG-99' } } },
          }),
        });

        await provider.createSubtask('ENG-1', {
          title: 'Sub-issue',
          description: 'Sub desc',
          parentId: 'lin-parent-uuid',
        });

        expect(mockFetch.mock.calls[0][0]).toBe(LINEAR_GRAPHQL_URL);
      });

      it('GIVEN createSubtask() WHEN called THEN mutation name is "issueCreate" or "IssueCreate"', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            data: { issueCreate: { issue: { id: 'lin-new', identifier: 'ENG-99' } } },
          }),
        });

        await provider.createSubtask('ENG-1', {
          title: 'Sub',
          description: '',
          parentId: 'lin-parent-uuid',
        });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.query).toContain('issueCreate');
      });

      it('GIVEN parentId "lin-parent-uuid" WHEN createSubtask() called THEN sends parentId in mutation variables', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            data: { issueCreate: { issue: { id: 'lin-new', identifier: 'ENG-99' } } },
          }),
        });

        await provider.createSubtask('ENG-1', {
          title: 'Sub',
          description: 'Desc',
          parentId: 'lin-parent-uuid',
        });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.variables.input.parentId).toBe('lin-parent-uuid');
      });

      it('GIVEN task title "Workstream 1: Auth" WHEN createSubtask() called THEN sends title in variables', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            data: { issueCreate: { issue: { id: 'lin-new', identifier: 'ENG-99' } } },
          }),
        });

        await provider.createSubtask('ENG-1', {
          title: 'Workstream 1: Auth',
          description: 'Desc',
          parentId: 'lin-parent-uuid',
        });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.variables.input.title).toBe('Workstream 1: Auth');
      });

      it('GIVEN task description WHEN createSubtask() called THEN sends description in variables', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            data: { issueCreate: { issue: { id: 'lin-new', identifier: 'ENG-99' } } },
          }),
        });

        await provider.createSubtask('ENG-1', {
          title: 'Sub',
          description: 'Detailed acceptance criteria',
          parentId: 'lin-parent-uuid',
        });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.variables.input.description).toBe('Detailed acceptance criteria');
      });

      it('GIVEN configured teamId "team-abc123" WHEN createSubtask() called THEN sends teamId in variables', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            data: { issueCreate: { issue: { id: 'lin-new', identifier: 'ENG-99' } } },
          }),
        });

        await provider.createSubtask('ENG-1', {
          title: 'Sub',
          description: '',
          parentId: 'lin-parent-uuid',
        });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.variables.input.teamId).toBe('team-abc123');
      });

      it('GIVEN successful response with identifier "ENG-99" THEN returns "ENG-99"', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            data: { issueCreate: { issue: { id: 'lin-new', identifier: 'ENG-99' } } },
          }),
        });

        const result = await provider.createSubtask('ENG-1', {
          title: 'Sub',
          description: 'Desc',
          parentId: 'lin-parent-uuid',
        });

        expect(result).toBe('ENG-99');
      });

      it('GIVEN response data has no issue WHEN createSubtask() called THEN throws', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            data: { issueCreate: { issue: null } },
          }),
        });

        await expect(
          provider.createSubtask('ENG-1', { title: 'Sub', description: '', parentId: 'lin-id' })
        ).rejects.toThrow();
      });
    });

    describe('AC: Error handling', () => {
      it('GIVEN GraphQL errors in response WHEN createSubtask() called THEN throws with error message', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            errors: [{ message: 'Team not found' }],
          }),
        });

        await expect(
          provider.createSubtask('ENG-1', { title: 'Sub', description: '', parentId: 'lin-id' })
        ).rejects.toThrow('Team not found');
      });

      it('GIVEN HTTP 401 WHEN createSubtask() called THEN throws', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 401 });

        await expect(
          provider.createSubtask('ENG-1', { title: 'Sub', description: '', parentId: 'lin-id' })
        ).rejects.toThrow('401');
      });

      it('GIVEN network error WHEN createSubtask() called THEN throws (does not swallow)', async () => {
        mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

        await expect(
          provider.createSubtask('ENG-1', { title: 'Sub', description: '', parentId: 'lin-id' })
        ).rejects.toThrow('ECONNREFUSED');
      });

      it('GIVEN multiple GraphQL errors WHEN createSubtask() called THEN error message includes all errors', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            errors: [{ message: 'Error A' }, { message: 'Error B' }],
          }),
        });

        await expect(
          provider.createSubtask('ENG-1', { title: 'Sub', description: '', parentId: 'lin-id' })
        ).rejects.toThrow(/Error A.*Error B|Error B.*Error A/);
      });
    });
  });

  // -------------------------------------------------------------------------
  // transitionStatus()
  // -------------------------------------------------------------------------

  describe('transitionStatus()', () => {
    // Helper: mock the 2-step team states fetch + issueUpdate pattern
    function mockTeamStatesThenUpdate(stateName: string, stateId: string, updateResponse?: object) {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              team: {
                states: {
                  nodes: [
                    { id: 'state-todo', name: 'Todo' },
                    { id: 'state-in-progress', name: 'In Progress' },
                    { id: 'state-in-review', name: 'In Review' },
                    { id: 'state-done', name: 'Done' },
                  ],
                },
              },
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => updateResponse ?? { data: { issueUpdate: { issue: { id: 'lin-id' } } } },
        });
    }

    describe('AC: Sends issueUpdate mutation with correct stateId (resolved from team states)', () => {
      it('GIVEN status "todo" WHEN transitionStatus() called THEN resolves "Todo" state and sends its stateId', async () => {
        mockTeamStatesThenUpdate('Todo', 'state-todo');

        await provider.transitionStatus('lin-id-1', 'todo');

        const updateBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);
        expect(updateBody.variables.stateId).toBe('state-todo');
      });

      it('GIVEN status "in_progress" WHEN transitionStatus() called THEN resolves "In Progress" state and sends its stateId', async () => {
        mockTeamStatesThenUpdate('In Progress', 'state-in-progress');

        await provider.transitionStatus('lin-id-1', 'in_progress');

        const updateBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);
        expect(updateBody.variables.stateId).toBe('state-in-progress');
      });

      it('GIVEN status "in_review" WHEN transitionStatus() called THEN resolves "In Review" state and sends its stateId', async () => {
        mockTeamStatesThenUpdate('In Review', 'state-in-review');

        await provider.transitionStatus('lin-id-1', 'in_review');

        const updateBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);
        expect(updateBody.variables.stateId).toBe('state-in-review');
      });

      it('GIVEN status "done" WHEN transitionStatus() called THEN resolves "Done" state and sends its stateId', async () => {
        mockTeamStatesThenUpdate('Done', 'state-done');

        await provider.transitionStatus('lin-id-1', 'done');

        const updateBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);
        expect(updateBody.variables.stateId).toBe('state-done');
      });

      it('GIVEN ticket id "lin-id-1" WHEN transitionStatus() called THEN sends id in issueUpdate variables', async () => {
        mockTeamStatesThenUpdate('In Progress', 'state-in-progress');

        await provider.transitionStatus('lin-id-1', 'in_progress');

        const updateBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);
        expect(updateBody.variables.id).toBe('lin-id-1');
      });

      it('GIVEN transitionStatus() WHEN called THEN issueUpdate mutation is sent as second call', async () => {
        mockTeamStatesThenUpdate('Done', 'state-done');

        await provider.transitionStatus('lin-id-1', 'done');

        const updateBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);
        expect(updateBody.query).toContain('issueUpdate');
      });

      it('GIVEN transitionStatus() succeeds THEN resolves to undefined', async () => {
        mockTeamStatesThenUpdate('In Progress', 'state-in-progress');

        await expect(provider.transitionStatus('lin-id-1', 'in_progress')).resolves.toBeUndefined();
      });
    });

    describe('AC: Error handling', () => {
      it('GIVEN GraphQL errors WHEN transitionStatus() called THEN throws with error message', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ errors: [{ message: 'Issue not found' }] }),
        });

        await expect(provider.transitionStatus('lin-id-1', 'done')).rejects.toThrow('Issue not found');
      });

      it('GIVEN HTTP 403 WHEN transitionStatus() called THEN throws', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 403 });

        await expect(provider.transitionStatus('lin-id-1', 'done')).rejects.toThrow('403');
      });

      it('GIVEN network failure WHEN transitionStatus() called THEN throws (does not swallow)', async () => {
        mockFetch.mockRejectedValue(new Error('Network timeout'));

        await expect(provider.transitionStatus('lin-id-1', 'done')).rejects.toThrow('Network timeout');
      });
    });
  });

  // -------------------------------------------------------------------------
  // addComment()
  // -------------------------------------------------------------------------

  describe('addComment()', () => {
    describe('AC: Sends createComment mutation with body text', () => {
      it('GIVEN addComment() called THEN mutation is "createComment"', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: { createComment: { comment: { id: 'c-id' } } } }),
        });

        await provider.addComment('lin-id-1', 'Build started.');

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.query).toContain('createComment');
      });

      it('GIVEN issueId "lin-id-1" WHEN addComment() called THEN sends issueId in variables', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: { createComment: { comment: { id: 'c-id' } } } }),
        });

        await provider.addComment('lin-id-1', 'Build started.');

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.variables.issueId).toBe('lin-id-1');
      });

      it('GIVEN comment body "PR created successfully" WHEN addComment() called THEN sends body in variables', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: { createComment: { comment: { id: 'c-id' } } } }),
        });

        await provider.addComment('lin-id-1', 'PR created successfully.');

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.variables.body).toBe('PR created successfully.');
      });

      it('GIVEN addComment() called THEN POSTs to Linear GraphQL endpoint', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: { createComment: { comment: { id: 'c-id' } } } }),
        });

        await provider.addComment('lin-id-1', 'comment');

        expect(mockFetch.mock.calls[0][0]).toBe(LINEAR_GRAPHQL_URL);
        expect(mockFetch.mock.calls[0][1].method).toBe('POST');
      });

      it('GIVEN addComment() succeeds THEN resolves to undefined', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: { createComment: { comment: { id: 'c-id' } } } }),
        });

        await expect(provider.addComment('lin-id-1', 'comment')).resolves.toBeUndefined();
      });

      it('GIVEN addComment() WHEN called THEN uses Authorization header with API key', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: { createComment: { comment: { id: 'c-id' } } } }),
        });

        await provider.addComment('lin-id-1', 'comment');

        const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
        expect(headers['Authorization']).toBe('lin_api_test123');
      });
    });

    describe('AC: Error handling', () => {
      it('GIVEN GraphQL errors WHEN addComment() called THEN throws with error message', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ errors: [{ message: 'Issue archived' }] }),
        });

        await expect(provider.addComment('lin-id-1', 'comment')).rejects.toThrow('Issue archived');
      });

      it('GIVEN HTTP 500 WHEN addComment() called THEN throws', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 500 });

        await expect(provider.addComment('lin-id-1', 'comment')).rejects.toThrow('500');
      });

      it('GIVEN network error WHEN addComment() called THEN throws (does not swallow)', async () => {
        mockFetch.mockRejectedValue(new Error('ECONNRESET'));

        await expect(provider.addComment('lin-id-1', 'comment')).rejects.toThrow('ECONNRESET');
      });
    });
  });

  // -------------------------------------------------------------------------
  // addLabel()
  // -------------------------------------------------------------------------

  describe('addLabel()', () => {
    describe('AC: Finds or creates label, then adds to issue via issueUpdate', () => {
      it('GIVEN existing label "mg-daemon:needs-info" WHEN addLabel() called THEN queries issueLabels first', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true, status: 200,
            json: async () => ({ data: { issueLabels: { nodes: [{ id: 'lbl-1', name: 'mg-daemon:needs-info' }] } } }),
          })
          .mockResolvedValueOnce({
            ok: true, status: 200,
            json: async () => ({ data: { issue: { labels: { nodes: [] } } } }),
          })
          .mockResolvedValueOnce({
            ok: true, status: 200,
            json: async () => ({ data: { issueUpdate: { issue: { id: 'lin-id-1' } } } }),
          });

        await provider.addLabel('lin-id-1', 'mg-daemon:needs-info');

        const firstBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(firstBody.query).toContain('issueLabels');
      });

      it('GIVEN label does not exist WHEN addLabel() called THEN creates label via issueLabelCreate', async () => {
        mockFetch
          // Label not found
          .mockResolvedValueOnce({
            ok: true, status: 200,
            json: async () => ({ data: { issueLabels: { nodes: [] } } }),
          })
          // Create label
          .mockResolvedValueOnce({
            ok: true, status: 200,
            json: async () => ({ data: { issueLabelCreate: { issueLabel: { id: 'new-lbl-id' } } } }),
          })
          // Get issue labels
          .mockResolvedValueOnce({
            ok: true, status: 200,
            json: async () => ({ data: { issue: { labels: { nodes: [] } } } }),
          })
          // Update issue
          .mockResolvedValueOnce({
            ok: true, status: 200,
            json: async () => ({ data: { issueUpdate: { issue: { id: 'lin-id-1' } } } }),
          });

        await provider.addLabel('lin-id-1', 'mg-daemon:needs-info');

        const createBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);
        expect(createBody.query).toContain('issueLabelCreate');
        expect(createBody.variables.input.name).toBe('mg-daemon:needs-info');
        expect(createBody.variables.input.teamId).toBe('team-abc123');
      });

      it('GIVEN label exists and issue has no labels WHEN addLabel() called THEN updates issue with labelIds', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true, status: 200,
            json: async () => ({ data: { issueLabels: { nodes: [{ id: 'lbl-1', name: 'mg-daemon:needs-info' }] } } }),
          })
          .mockResolvedValueOnce({
            ok: true, status: 200,
            json: async () => ({ data: { issue: { labels: { nodes: [] } } } }),
          })
          .mockResolvedValueOnce({
            ok: true, status: 200,
            json: async () => ({ data: { issueUpdate: { issue: { id: 'lin-id-1' } } } }),
          });

        await provider.addLabel('lin-id-1', 'mg-daemon:needs-info');

        const updateBody = JSON.parse(mockFetch.mock.calls[2][1].body as string);
        expect(updateBody.query).toContain('issueUpdate');
        expect(updateBody.variables.labelIds).toContain('lbl-1');
      });

      it('GIVEN issue already has other labels WHEN addLabel() called THEN preserves existing labels and adds new one', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true, status: 200,
            json: async () => ({ data: { issueLabels: { nodes: [{ id: 'lbl-new', name: 'mg-daemon:rejected' }] } } }),
          })
          .mockResolvedValueOnce({
            ok: true, status: 200,
            json: async () => ({ data: { issue: { labels: { nodes: [{ id: 'lbl-existing' }] } } } }),
          })
          .mockResolvedValueOnce({
            ok: true, status: 200,
            json: async () => ({ data: { issueUpdate: { issue: { id: 'lin-id-1' } } } }),
          });

        await provider.addLabel('lin-id-1', 'mg-daemon:rejected');

        const updateBody = JSON.parse(mockFetch.mock.calls[2][1].body as string);
        expect(updateBody.variables.labelIds).toContain('lbl-existing');
        expect(updateBody.variables.labelIds).toContain('lbl-new');
      });

      it('GIVEN addLabel() succeeds THEN resolves to undefined', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true, status: 200,
            json: async () => ({ data: { issueLabels: { nodes: [{ id: 'lbl-1', name: 'mg-daemon:needs-info' }] } } }),
          })
          .mockResolvedValueOnce({
            ok: true, status: 200,
            json: async () => ({ data: { issue: { labels: { nodes: [] } } } }),
          })
          .mockResolvedValueOnce({
            ok: true, status: 200,
            json: async () => ({ data: { issueUpdate: { issue: { id: 'lin-id-1' } } } }),
          });

        await expect(provider.addLabel('lin-id-1', 'mg-daemon:needs-info')).resolves.toBeUndefined();
      });
    });

    describe('AC: Idempotency — does not duplicate label if already on issue', () => {
      it('GIVEN issue already has the label WHEN addLabel() called THEN skips issueUpdate (no-op)', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true, status: 200,
            json: async () => ({ data: { issueLabels: { nodes: [{ id: 'lbl-1', name: 'mg-daemon:needs-info' }] } } }),
          })
          .mockResolvedValueOnce({
            ok: true, status: 200,
            json: async () => ({ data: { issue: { labels: { nodes: [{ id: 'lbl-1' }] } } } }),
          });

        await provider.addLabel('lin-id-1', 'mg-daemon:needs-info');

        // Only 2 calls (find label + get issue labels), no update call
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    describe('AC: Error handling', () => {
      it('GIVEN GraphQL errors on label query WHEN addLabel() called THEN throws', async () => {
        mockFetch.mockResolvedValue({
          ok: true, status: 200,
          json: async () => ({ errors: [{ message: 'Unauthorized' }] }),
        });

        await expect(provider.addLabel('lin-id-1', 'mg-daemon:needs-info')).rejects.toThrow('Unauthorized');
      });

      it('GIVEN HTTP 401 WHEN addLabel() called THEN throws', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 401 });

        await expect(provider.addLabel('lin-id-1', 'mg-daemon:needs-info')).rejects.toThrow('401');
      });

      it('GIVEN network error WHEN addLabel() called THEN throws (does not swallow)', async () => {
        mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

        await expect(provider.addLabel('lin-id-1', 'mg-daemon:needs-info')).rejects.toThrow('ECONNREFUSED');
      });
    });
  });

  // -------------------------------------------------------------------------
  // linkPR()
  // -------------------------------------------------------------------------

  describe('linkPR()', () => {
    describe('AC: Sends attachmentCreate mutation with PR URL', () => {
      it('GIVEN linkPR() called THEN mutation is "attachmentCreate"', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: { attachmentCreate: { attachment: { id: 'a-id' } } } }),
        });

        await provider.linkPR('lin-id-1', 'https://github.com/owner/repo/pull/42');

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.query).toContain('attachmentCreate');
      });

      it('GIVEN issueId "lin-id-1" WHEN linkPR() called THEN sends issueId in variables', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: { attachmentCreate: { attachment: { id: 'a-id' } } } }),
        });

        await provider.linkPR('lin-id-1', 'https://github.com/owner/repo/pull/42');

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.variables.issueId).toBe('lin-id-1');
      });

      it('GIVEN PR URL WHEN linkPR() called THEN sends url in variables', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: { attachmentCreate: { attachment: { id: 'a-id' } } } }),
        });

        const prUrl = 'https://github.com/owner/repo/pull/42';
        await provider.linkPR('lin-id-1', prUrl);

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.variables.url).toBe(prUrl);
      });

      it('GIVEN PR URL WHEN linkPR() called THEN sends title referencing the PR URL', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: { attachmentCreate: { attachment: { id: 'a-id' } } } }),
        });

        const prUrl = 'https://github.com/owner/repo/pull/42';
        await provider.linkPR('lin-id-1', prUrl);

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.variables.title).toContain(prUrl);
      });

      it('GIVEN linkPR() called THEN POSTs to Linear GraphQL endpoint', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: { attachmentCreate: { attachment: { id: 'a-id' } } } }),
        });

        await provider.linkPR('lin-id-1', 'https://github.com/pr/1');

        expect(mockFetch.mock.calls[0][0]).toBe(LINEAR_GRAPHQL_URL);
        expect(mockFetch.mock.calls[0][1].method).toBe('POST');
      });

      it('GIVEN linkPR() succeeds THEN resolves to undefined', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: { attachmentCreate: { attachment: { id: 'a-id' } } } }),
        });

        await expect(provider.linkPR('lin-id-1', 'https://github.com/pr/1')).resolves.toBeUndefined();
      });
    });

    describe('AC: Error handling', () => {
      it('GIVEN GraphQL errors WHEN linkPR() called THEN throws with error message', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ errors: [{ message: 'Invalid URL' }] }),
        });

        await expect(provider.linkPR('lin-id-1', 'https://github.com/pr/1')).rejects.toThrow('Invalid URL');
      });

      it('GIVEN HTTP 401 WHEN linkPR() called THEN throws', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 401 });

        await expect(provider.linkPR('lin-id-1', 'https://github.com/pr/1')).rejects.toThrow('401');
      });

      it('GIVEN network error WHEN linkPR() called THEN throws (does not swallow)', async () => {
        mockFetch.mockRejectedValue(new Error('DNS lookup failed'));

        await expect(provider.linkPR('lin-id-1', 'https://github.com/pr/1')).rejects.toThrow('DNS lookup failed');
      });
    });
  });
});
