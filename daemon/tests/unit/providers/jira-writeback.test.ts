/**
 * WS-DAEMON-12: Jira write-back method tests
 *
 * Covers createSubtask, transitionStatus, addComment, linkPR with thorough
 * verification of: correct API endpoints, request body structure, status
 * mapping, error handling, and idempotency contracts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JiraProvider } from '../../../src/providers/jira';
import type { JiraConfig } from '../../../src/types';

vi.mock('../../../src/tracker', () => ({
  getProcessedTickets: vi.fn().mockReturnValue([]),
}));

const BASE_JIRA_CONFIG: JiraConfig = {
  host: 'https://test.atlassian.net',
  email: 'test@example.com',
  apiToken: 'test-api-token',
  project: 'TEST',
  jql: 'project = TEST AND status = "To Do"',
};

const BASE_POLLING = { intervalSeconds: 300, batchSize: 5 };

describe('JiraProvider write-back (WS-DAEMON-12)', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let provider: JiraProvider;

  beforeEach(() => {
    mockFetch = vi.fn();
    provider = new JiraProvider(BASE_JIRA_CONFIG, BASE_POLLING, mockFetch);
  });

  // -------------------------------------------------------------------------
  // createSubtask()
  // -------------------------------------------------------------------------

  describe('createSubtask()', () => {
    describe('AC: POSTs to correct endpoint with Sub-task issue type', () => {
      it('GIVEN parent and task WHEN createSubtask() called THEN uses POST /rest/api/3/issue', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => ({ key: 'TEST-100' }),
        });

        await provider.createSubtask('TEST-1', {
          title: 'Sub-task title',
          description: 'Sub-task description',
          parentId: 'TEST-1',
        });

        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toBe('https://test.atlassian.net/rest/api/3/issue');
        expect(options.method).toBe('POST');
      });

      it('GIVEN parent and task WHEN createSubtask() called THEN sends issuetype Sub-task', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => ({ key: 'TEST-100' }),
        });

        await provider.createSubtask('TEST-1', {
          title: 'Sub-task title',
          description: 'Sub-task description',
          parentId: 'TEST-1',
        });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.fields.issuetype.name).toBe('Sub-task');
      });

      it('GIVEN parent key "TEST-42" WHEN createSubtask() called THEN sends parent.key = "TEST-42"', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => ({ key: 'TEST-100' }),
        });

        await provider.createSubtask('TEST-42', {
          title: 'Sub-task',
          description: 'Desc',
          parentId: 'TEST-42',
        });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.fields.parent.key).toBe('TEST-42');
      });

      it('GIVEN task with title WHEN createSubtask() called THEN sends summary in fields', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => ({ key: 'TEST-100' }),
        });

        await provider.createSubtask('TEST-1', {
          title: 'My subtask title',
          description: 'Desc',
          parentId: 'TEST-1',
        });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.fields.summary).toBe('My subtask title');
      });

      it('GIVEN task with description WHEN createSubtask() called THEN sends description in fields', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => ({ key: 'TEST-100' }),
        });

        await provider.createSubtask('TEST-1', {
          title: 'Title',
          description: 'My detailed description',
          parentId: 'TEST-1',
        });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.fields.description).toBe('My detailed description');
      });

      it('GIVEN configured project "TEST" WHEN createSubtask() called THEN sends project.key = "TEST"', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => ({ key: 'TEST-100' }),
        });

        await provider.createSubtask('TEST-1', {
          title: 'Sub',
          description: 'Desc',
          parentId: 'TEST-1',
        });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.fields.project.key).toBe('TEST');
      });

      it('GIVEN createSubtask() response includes key "TEST-456" THEN returns "TEST-456"', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => ({ key: 'TEST-456' }),
        });

        const result = await provider.createSubtask('TEST-1', {
          title: 'Sub',
          description: 'Desc',
          parentId: 'TEST-1',
        });

        expect(result).toBe('TEST-456');
      });

      it('GIVEN createSubtask() uses Authorization header THEN sends Basic auth', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => ({ key: 'TEST-100' }),
        });

        await provider.createSubtask('TEST-1', {
          title: 'Sub',
          description: '',
          parentId: 'TEST-1',
        });

        const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
        expect(headers['Authorization']).toMatch(/^Basic /);
        expect(headers['Content-Type']).toBe('application/json');
      });
    });

    describe('AC: Error handling', () => {
      it('GIVEN 400 response WHEN createSubtask() called THEN throws with status in message', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 400,
          json: async () => ({}),
        });

        await expect(
          provider.createSubtask('TEST-1', { title: 'Sub', description: '', parentId: 'TEST-1' })
        ).rejects.toThrow('400');
      });

      it('GIVEN 403 forbidden WHEN createSubtask() called THEN throws', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 403 });

        await expect(
          provider.createSubtask('TEST-1', { title: 'Sub', description: '', parentId: 'TEST-1' })
        ).rejects.toThrow();
      });

      it('GIVEN network failure WHEN createSubtask() called THEN throws (does not swallow)', async () => {
        mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

        await expect(
          provider.createSubtask('TEST-1', { title: 'Sub', description: '', parentId: 'TEST-1' })
        ).rejects.toThrow('ECONNREFUSED');
      });
    });
  });

  // -------------------------------------------------------------------------
  // transitionStatus()
  // -------------------------------------------------------------------------

  describe('transitionStatus()', () => {
    describe('AC: GETs transitions then POSTs the matching one', () => {
      it('GIVEN status "todo" WHEN transitionStatus() called THEN matches transition named "To Do"', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
              transitions: [
                { id: '11', name: 'To Do' },
                { id: '21', name: 'In Progress' },
              ],
            }),
          })
          .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });

        await provider.transitionStatus('TEST-1', 'todo');

        const postBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);
        expect(postBody.transition.id).toBe('11');
      });

      it('GIVEN status "in_progress" WHEN transitionStatus() called THEN matches transition named "In Progress"', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
              transitions: [
                { id: '21', name: 'In Progress' },
                { id: '31', name: 'In Review' },
              ],
            }),
          })
          .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });

        await provider.transitionStatus('TEST-1', 'in_progress');

        const postBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);
        expect(postBody.transition.id).toBe('21');
      });

      it('GIVEN status "in_review" WHEN transitionStatus() called THEN matches transition named "In Review"', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
              transitions: [
                { id: '31', name: 'In Review' },
                { id: '41', name: 'Done' },
              ],
            }),
          })
          .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });

        await provider.transitionStatus('TEST-1', 'in_review');

        const postBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);
        expect(postBody.transition.id).toBe('31');
      });

      it('GIVEN status "done" WHEN transitionStatus() called THEN matches transition named "Done"', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
              transitions: [
                { id: '11', name: 'To Do' },
                { id: '41', name: 'Done' },
              ],
            }),
          })
          .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });

        await provider.transitionStatus('TEST-1', 'done');

        const postBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);
        expect(postBody.transition.id).toBe('41');
      });

      it('GIVEN ticket "TEST-42" WHEN transitionStatus() called THEN GETs transitions for TEST-42', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ transitions: [{ id: '11', name: 'To Do' }] }),
          })
          .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });

        await provider.transitionStatus('TEST-42', 'todo');

        expect(mockFetch.mock.calls[0][0]).toContain('/issue/TEST-42/transitions');
      });

      it('GIVEN transition name with extra prefix WHEN transitionStatus() called THEN still matches by substring', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
              transitions: [{ id: '21', name: 'Start In Progress' }],
            }),
          })
          .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });

        await provider.transitionStatus('TEST-1', 'in_progress');

        const postBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);
        expect(postBody.transition.id).toBe('21');
      });
    });

    describe('AC: Idempotency — no matching transition is a no-op', () => {
      it('GIVEN no matching transition in list WHEN transitionStatus() called THEN resolves without throwing', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ transitions: [] }),
        });

        await expect(provider.transitionStatus('TEST-1', 'in_review')).resolves.toBeUndefined();
      });

      it('GIVEN no matching transition WHEN transitionStatus() called THEN does NOT POST a transition', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            transitions: [{ id: '11', name: 'To Do' }],
          }),
        });

        await provider.transitionStatus('TEST-1', 'done');

        // Only the GET call should have been made, no POST
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    describe('AC: Error handling', () => {
      it('GIVEN GET transitions returns 500 WHEN transitionStatus() called THEN throws', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 500 });

        await expect(provider.transitionStatus('TEST-1', 'done')).rejects.toThrow('500');
      });

      it('GIVEN POST transition returns 400 WHEN transitionStatus() called THEN throws', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ transitions: [{ id: '21', name: 'In Progress' }] }),
          })
          .mockResolvedValueOnce({ ok: false, status: 400 });

        await expect(provider.transitionStatus('TEST-1', 'in_progress')).rejects.toThrow('400');
      });

      it('GIVEN network error on GET transitions WHEN transitionStatus() called THEN throws', async () => {
        mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

        await expect(provider.transitionStatus('TEST-1', 'todo')).rejects.toThrow();
      });
    });
  });

  // -------------------------------------------------------------------------
  // addComment()
  // -------------------------------------------------------------------------

  describe('addComment()', () => {
    describe('AC: POSTs ADF document to comment endpoint', () => {
      it('GIVEN ticket "TEST-99" WHEN addComment() called THEN POSTs to /issue/TEST-99/comment', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => ({ id: '10001' }),
        });

        await provider.addComment('TEST-99', 'Work started on this ticket.');

        expect(mockFetch.mock.calls[0][0]).toBe(
          'https://test.atlassian.net/rest/api/3/issue/TEST-99/comment'
        );
        expect(mockFetch.mock.calls[0][1].method).toBe('POST');
      });

      it('GIVEN comment body text WHEN addComment() called THEN sends ADF doc containing the text', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => ({ id: '10001' }),
        });

        await provider.addComment('TEST-1', 'Build completed successfully.');

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.body.type).toBe('doc');
        expect(body.body.version).toBe(1);
        expect(JSON.stringify(body)).toContain('Build completed successfully.');
      });

      it('GIVEN comment body WHEN addComment() called THEN wraps text in paragraph content node', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => ({ id: '10001' }),
        });

        await provider.addComment('TEST-1', 'Test comment text');

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        const paragraph = body.body.content[0];
        expect(paragraph.type).toBe('paragraph');
        const textNode = paragraph.content[0];
        expect(textNode.type).toBe('text');
        expect(textNode.text).toBe('Test comment text');
      });

      it('GIVEN addComment() called THEN uses Authorization header', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => ({ id: '10001' }),
        });

        await provider.addComment('TEST-1', 'comment');

        const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
        expect(headers['Authorization']).toMatch(/^Basic /);
      });
    });

    describe('AC: Error handling', () => {
      it('GIVEN 400 response WHEN addComment() called THEN throws with status', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 400 });

        await expect(provider.addComment('TEST-1', 'comment')).rejects.toThrow('400');
      });

      it('GIVEN 401 unauthorized WHEN addComment() called THEN throws', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 401 });

        await expect(provider.addComment('TEST-1', 'comment')).rejects.toThrow();
      });

      it('GIVEN network error WHEN addComment() called THEN throws (does not swallow)', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        await expect(provider.addComment('TEST-1', 'comment')).rejects.toThrow('Network error');
      });
    });
  });

  // -------------------------------------------------------------------------
  // linkPR()
  // -------------------------------------------------------------------------

  describe('linkPR()', () => {
    describe('AC: POSTs remote link to Jira issue', () => {
      it('GIVEN ticket "TEST-77" WHEN linkPR() called THEN POSTs to /issue/TEST-77/remotelink', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => ({ id: 1 }),
        });

        await provider.linkPR('TEST-77', 'https://github.com/owner/repo/pull/42');

        expect(mockFetch.mock.calls[0][0]).toBe(
          'https://test.atlassian.net/rest/api/3/issue/TEST-77/remotelink'
        );
        expect(mockFetch.mock.calls[0][1].method).toBe('POST');
      });

      it('GIVEN PR URL WHEN linkPR() called THEN remote link object contains the PR URL', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => ({ id: 1 }),
        });

        const prUrl = 'https://github.com/owner/repo/pull/42';
        await provider.linkPR('TEST-1', prUrl);

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.object.url).toBe(prUrl);
      });

      it('GIVEN PR URL WHEN linkPR() called THEN remote link title references the PR URL', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => ({ id: 1 }),
        });

        const prUrl = 'https://github.com/owner/repo/pull/99';
        await provider.linkPR('TEST-1', prUrl);

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.object.title).toContain(prUrl);
      });

      it('GIVEN linkPR() WHEN called THEN uses Authorization header', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => ({ id: 1 }),
        });

        await provider.linkPR('TEST-1', 'https://github.com/pr/1');

        const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
        expect(headers['Authorization']).toMatch(/^Basic /);
      });
    });

    describe('AC: Idempotency via globalId deduplication', () => {
      it('GIVEN two calls for the same PR URL to the same ticket THEN both POST to the same endpoint (Jira deduplicates via globalId)', async () => {
        // Jira uses globalId to deduplicate remote links — calling twice is safe
        mockFetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => ({ id: 1 }),
        });

        const prUrl = 'https://github.com/owner/repo/pull/42';
        await provider.linkPR('TEST-1', prUrl);
        await provider.linkPR('TEST-1', prUrl);

        // Both calls should POST to the same remotelink endpoint
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockFetch.mock.calls[0][0]).toBe(mockFetch.mock.calls[1][0]);
      });
    });

    describe('AC: Error handling', () => {
      it('GIVEN 500 response WHEN linkPR() called THEN throws with status', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 500 });

        await expect(provider.linkPR('TEST-1', 'https://github.com/pr/1')).rejects.toThrow('500');
      });

      it('GIVEN 403 forbidden WHEN linkPR() called THEN throws', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 403 });

        await expect(provider.linkPR('TEST-1', 'https://github.com/pr/1')).rejects.toThrow();
      });

      it('GIVEN network error WHEN linkPR() called THEN throws (does not swallow)', async () => {
        mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

        await expect(provider.linkPR('TEST-1', 'https://github.com/pr/1')).rejects.toThrow('ECONNREFUSED');
      });
    });
  });

  // -------------------------------------------------------------------------
  // addLabel()
  // -------------------------------------------------------------------------

  describe('addLabel()', () => {
    describe('AC: PUTs label update to Jira issue endpoint', () => {
      it('GIVEN ticket "TEST-99" and label WHEN addLabel() called THEN PUTs to /rest/api/3/issue/TEST-99', async () => {
        mockFetch.mockResolvedValue({
          ok: true, status: 204,
          json: async () => ({}),
        });

        await provider.addLabel('TEST-99', 'mg-daemon:needs-info');

        expect(mockFetch.mock.calls[0][0]).toBe(
          'https://test.atlassian.net/rest/api/3/issue/TEST-99'
        );
        expect(mockFetch.mock.calls[0][1].method).toBe('PUT');
      });

      it('GIVEN label "mg-daemon:needs-info" WHEN addLabel() called THEN sends update.labels[{add}] payload', async () => {
        mockFetch.mockResolvedValue({
          ok: true, status: 204,
          json: async () => ({}),
        });

        await provider.addLabel('TEST-1', 'mg-daemon:needs-info');

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.update.labels).toEqual([{ add: 'mg-daemon:needs-info' }]);
      });

      it('GIVEN label "mg-daemon:rejected" WHEN addLabel() called THEN sends that label in payload', async () => {
        mockFetch.mockResolvedValue({
          ok: true, status: 204,
          json: async () => ({}),
        });

        await provider.addLabel('TEST-1', 'mg-daemon:rejected');

        const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
        expect(body.update.labels).toEqual([{ add: 'mg-daemon:rejected' }]);
      });

      it('GIVEN addLabel() called THEN uses Authorization header', async () => {
        mockFetch.mockResolvedValue({
          ok: true, status: 204,
          json: async () => ({}),
        });

        await provider.addLabel('TEST-1', 'mg-daemon:needs-info');

        const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
        expect(headers['Authorization']).toMatch(/^Basic /);
        expect(headers['Content-Type']).toBe('application/json');
      });

      it('GIVEN addLabel() succeeds THEN resolves to undefined', async () => {
        mockFetch.mockResolvedValue({
          ok: true, status: 204,
          json: async () => ({}),
        });

        await expect(provider.addLabel('TEST-1', 'mg-daemon:needs-info')).resolves.toBeUndefined();
      });
    });

    describe('AC: Idempotency — Jira add operation is idempotent (does not duplicate)', () => {
      it('GIVEN two addLabel() calls for the same label THEN both POST to the same endpoint (Jira deduplicates via add semantics)', async () => {
        mockFetch.mockResolvedValue({
          ok: true, status: 204,
          json: async () => ({}),
        });

        await provider.addLabel('TEST-1', 'mg-daemon:needs-info');
        await provider.addLabel('TEST-1', 'mg-daemon:needs-info');

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockFetch.mock.calls[0][0]).toBe(mockFetch.mock.calls[1][0]);
      });
    });

    describe('AC: Error handling', () => {
      it('GIVEN 400 response WHEN addLabel() called THEN throws with status', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 400 });

        await expect(provider.addLabel('TEST-1', 'mg-daemon:needs-info')).rejects.toThrow('400');
      });

      it('GIVEN 403 forbidden WHEN addLabel() called THEN throws', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 403 });

        await expect(provider.addLabel('TEST-1', 'mg-daemon:needs-info')).rejects.toThrow();
      });

      it('GIVEN network error WHEN addLabel() called THEN throws (does not swallow)', async () => {
        mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

        await expect(provider.addLabel('TEST-1', 'mg-daemon:needs-info')).rejects.toThrow('ECONNREFUSED');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Auth header encoding
  // -------------------------------------------------------------------------

  describe('Auth header encoding', () => {
    it('GIVEN email "user@example.com" and apiToken "my-secret-token" WHEN any write-back method called THEN Authorization header is Base64 of "email:token"', async () => {
      const config: JiraConfig = { ...BASE_JIRA_CONFIG, email: 'user@example.com', apiToken: 'my-secret-token' };
      const testProvider = new JiraProvider(config, BASE_POLLING, mockFetch);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ key: 'TEST-1' }),
      });

      await testProvider.createSubtask('TEST-1', { title: 'T', description: '', parentId: 'TEST-1' });

      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      const expectedEncoded = Buffer.from('user@example.com:my-secret-token').toString('base64');
      expect(headers['Authorization']).toBe(`Basic ${expectedEncoded}`);
    });
  });
});
