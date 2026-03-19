import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubProvider } from '../../../src/providers/github';
import type { GitHubConfig } from '../../../src/types';

vi.mock('child_process', () => ({
  spawnSync: vi.fn(),
}));

import { spawnSync } from 'child_process';

const BASE_GITHUB_CONFIG: GitHubConfig = {
  repo: 'owner/test-repo',
  baseBranch: 'main',
  issueFilter: 'label:mg-daemon state:open',
};

describe('GitHubProvider (WS-DAEMON-10)', () => {
  let provider: GitHubProvider;

  beforeEach(() => {
    provider = new GitHubProvider(BASE_GITHUB_CONFIG);
    vi.clearAllMocks();
  });

  describe('poll()', () => {
    describe('AC: Uses gh CLI for polling', () => {
      it('GIVEN valid config WHEN poll() called THEN invokes gh issue list', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '[]', stderr: '' } as any);

        await provider.poll();

        expect(spawnSync).toHaveBeenCalledWith(
          'gh',
          expect.arrayContaining(['issue', 'list']),
          expect.any(Object)
        );
      });

      it('GIVEN valid config WHEN poll() called THEN includes --repo flag with configured repo', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '[]', stderr: '' } as any);

        await provider.poll();

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('--repo');
        expect(args).toContain('owner/test-repo');
      });

      it('GIVEN valid config WHEN poll() called THEN uses --json flag for structured output', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '[]', stderr: '' } as any);

        await provider.poll();

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('--json');
      });

      it('GIVEN issueFilter configured WHEN poll() called THEN passes --search flag', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '[]', stderr: '' } as any);

        await provider.poll();

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('--search');
      });
    });

    describe('AC: Returns NormalizedTicket[] from GitHub issues', () => {
      it('GIVEN a GitHub issue WHEN poll() called THEN returns ticket with source="github"', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 0,
          stdout: JSON.stringify([
            {
              number: 42,
              title: 'Feature request',
              body: 'Please add this feature.',
              labels: [{ name: 'enhancement' }],
              url: 'https://github.com/owner/test-repo/issues/42',
            },
          ]),
          stderr: '',
        } as any);

        const tickets = await provider.poll();
        expect(tickets[0].source).toBe('github');
      });

      it('GIVEN a GitHub issue with number 42 WHEN poll() called THEN id is "GH-42"', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 0,
          stdout: JSON.stringify([
            {
              number: 42,
              title: 'Test issue',
              body: 'Body',
              labels: [],
              url: 'https://github.com/owner/test-repo/issues/42',
            },
          ]),
          stderr: '',
        } as any);

        const tickets = await provider.poll();
        expect(tickets[0].id).toBe('GH-42');
      });

      it('GIVEN GitHub issue WHEN poll() called THEN maps title to ticket title', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 0,
          stdout: JSON.stringify([
            { number: 1, title: 'Implement OAuth', body: '', labels: [], url: 'https://github.com/issues/1' },
          ]),
          stderr: '',
        } as any);

        const tickets = await provider.poll();
        expect(tickets[0].title).toBe('Implement OAuth');
      });

      it('GIVEN GitHub issue WHEN poll() called THEN maps body to ticket description', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 0,
          stdout: JSON.stringify([
            { number: 1, title: 'Test', body: 'This is the body text', labels: [], url: '' },
          ]),
          stderr: '',
        } as any);

        const tickets = await provider.poll();
        expect(tickets[0].description).toBe('This is the body text');
      });

      it('GIVEN GitHub issue with labels WHEN poll() called THEN maps label names to labels array', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 0,
          stdout: JSON.stringify([
            {
              number: 1, title: 'Test', body: '',
              labels: [{ name: 'bug' }, { name: 'priority:high' }],
              url: '',
            },
          ]),
          stderr: '',
        } as any);

        const tickets = await provider.poll();
        expect(tickets[0].labels).toEqual(['bug', 'priority:high']);
      });

      it('GIVEN GitHub issue with priority:critical label WHEN poll() called THEN maps to "critical" priority', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 0,
          stdout: JSON.stringify([
            {
              number: 1, title: 'Test', body: '',
              labels: [{ name: 'priority:critical' }],
              url: '',
            },
          ]),
          stderr: '',
        } as any);

        const tickets = await provider.poll();
        expect(tickets[0].priority).toBe('critical');
      });

      it('GIVEN GitHub issue with priority:high label WHEN poll() called THEN maps to "high" priority', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 0,
          stdout: JSON.stringify([
            { number: 1, title: 'Test', body: '', labels: [{ name: 'priority:high' }], url: '' },
          ]),
          stderr: '',
        } as any);

        const tickets = await provider.poll();
        expect(tickets[0].priority).toBe('high');
      });

      it('GIVEN GitHub issue with priority:medium label WHEN poll() called THEN maps to "medium" priority', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 0,
          stdout: JSON.stringify([
            { number: 1, title: 'Test', body: '', labels: [{ name: 'priority:medium' }], url: '' },
          ]),
          stderr: '',
        } as any);

        const tickets = await provider.poll();
        expect(tickets[0].priority).toBe('medium');
      });

      it('GIVEN GitHub issue with priority:low label WHEN poll() called THEN maps to "low" priority', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 0,
          stdout: JSON.stringify([
            { number: 1, title: 'Test', body: '', labels: [{ name: 'priority:low' }], url: '' },
          ]),
          stderr: '',
        } as any);

        const tickets = await provider.poll();
        expect(tickets[0].priority).toBe('low');
      });

      it('GIVEN GitHub issue with no priority label WHEN poll() called THEN defaults to "medium"', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 0,
          stdout: JSON.stringify([
            { number: 1, title: 'Test', body: '', labels: [{ name: 'bug' }], url: '' },
          ]),
          stderr: '',
        } as any);

        const tickets = await provider.poll();
        expect(tickets[0].priority).toBe('medium');
      });

      it('GIVEN GitHub issue WHEN poll() called THEN ticket includes raw issue data', async () => {
        const rawIssue = { number: 1, title: 'Test', body: 'Desc', labels: [], url: 'https://github.com/issues/1' };
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: JSON.stringify([rawIssue]), stderr: '' } as any);

        const tickets = await provider.poll();
        expect(tickets[0].raw).toEqual(rawIssue);
      });

      it('GIVEN GitHub issue with null body WHEN poll() called THEN description defaults to empty string', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 0,
          stdout: JSON.stringify([
            { number: 1, title: 'Test', body: null, labels: [], url: '' },
          ]),
          stderr: '',
        } as any);

        const tickets = await provider.poll();
        expect(tickets[0].description).toBe('');
      });
    });

    describe('AC: Error handling', () => {
      it('GIVEN gh CLI returns non-zero exit WHEN poll() called THEN returns empty array without throwing', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 1, stdout: '', stderr: 'gh: command not found' } as any);

        const result = await provider.poll();
        expect(result).toEqual([]);
      });

      it('GIVEN gh CLI returns empty JSON array WHEN poll() called THEN returns empty array', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '[]', stderr: '' } as any);

        const result = await provider.poll();
        expect(result).toEqual([]);
      });

      it('GIVEN poll() called with since date WHEN called THEN does not throw', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '[]', stderr: '' } as any);

        await expect(provider.poll(new Date('2024-01-01'))).resolves.not.toThrow();
      });
    });
  });

  describe('createSubtask()', () => {
    it('GIVEN parent and task input WHEN createSubtask() called THEN invokes gh issue create', async () => {
      vi.mocked(spawnSync).mockReturnValue({
        status: 0,
        stdout: 'https://github.com/owner/repo/issues/100\n',
        stderr: '',
      } as any);

      await provider.createSubtask('GH-42', {
        title: 'Sub-issue title',
        description: 'Sub-issue description',
        parentId: 'GH-42',
      });

      expect(spawnSync).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['issue', 'create']),
        expect.any(Object)
      );
    });

    it('GIVEN createSubtask() WHEN called THEN includes parent reference in body', async () => {
      vi.mocked(spawnSync).mockReturnValue({
        status: 0,
        stdout: 'https://github.com/owner/repo/issues/100\n',
        stderr: '',
      } as any);

      await provider.createSubtask('GH-42', {
        title: 'Sub',
        description: 'Desc',
        parentId: 'GH-42',
      });

      const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
      const bodyArg = args[args.indexOf('--body') + 1];
      expect(bodyArg).toContain('#42');
    });

    it('GIVEN createSubtask() WHEN called THEN includes the --repo flag', async () => {
      vi.mocked(spawnSync).mockReturnValue({
        status: 0,
        stdout: 'https://github.com/owner/repo/issues/100\n',
        stderr: '',
      } as any);

      await provider.createSubtask('GH-42', { title: 'Sub', description: 'Desc', parentId: 'GH-42' });

      const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
      expect(args).toContain('--repo');
      expect(args).toContain('owner/test-repo');
    });

    it('GIVEN createSubtask() succeeds THEN returns new GH-{number} identifier', async () => {
      vi.mocked(spawnSync).mockReturnValue({
        status: 0,
        stdout: 'https://github.com/owner/repo/issues/100\n',
        stderr: '',
      } as any);

      const result = await provider.createSubtask('GH-42', {
        title: 'Sub', description: 'Desc', parentId: 'GH-42',
      });

      expect(result).toBe('GH-100');
    });

    it('GIVEN createSubtask() gh CLI returns non-zero THEN throws an error', async () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 1, stdout: '', stderr: 'gh: command not found' } as any);

      await expect(
        provider.createSubtask('GH-42', { title: 'Sub', description: '', parentId: 'GH-42' })
      ).rejects.toThrow();
    });
  });

  describe('transitionStatus()', () => {
    it('GIVEN ticket and in_progress status WHEN transitionStatus() called THEN adds status:in_progress label', async () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      await provider.transitionStatus('GH-42', 'in_progress');

      const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
      expect(args).toContain('--add-label');
      expect(args).toContain('status:in_progress');
    });

    it('GIVEN ticket and in_review status WHEN transitionStatus() called THEN includes issue number in command', async () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      await provider.transitionStatus('GH-42', 'in_review');

      const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
      expect(args).toContain('42');
    });

    it('GIVEN transitionStatus() WHEN gh edit command returns non-zero THEN throws an error', async () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 1, stdout: '', stderr: 'gh: command not found' } as any);

      await expect(provider.transitionStatus('GH-42', 'done')).rejects.toThrow();
    });

    it('GIVEN transitionStatus() WHEN called THEN uses gh issue edit command', async () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      await provider.transitionStatus('GH-42', 'todo');

      expect(spawnSync).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['issue', 'edit']),
        expect.any(Object)
      );
    });
  });

  describe('addComment()', () => {
    it('GIVEN ticket and body WHEN addComment() called THEN invokes gh issue comment', async () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      await provider.addComment('GH-42', 'Build started.');

      expect(spawnSync).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['issue', 'comment']),
        expect.any(Object)
      );
    });

    it('GIVEN addComment() WHEN called THEN includes issue number in command', async () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      await provider.addComment('GH-42', 'Comment body');

      const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
      expect(args).toContain('42');
    });

    it('GIVEN addComment() WHEN gh command returns non-zero THEN throws an error', async () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 1, stdout: '', stderr: 'gh: not authenticated' } as any);

      await expect(provider.addComment('GH-42', 'comment')).rejects.toThrow();
    });
  });

  describe('addLabel()', () => {
    it('GIVEN ticket and label WHEN addLabel() called THEN invokes gh issue edit with --add-label', async () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      await provider.addLabel('GH-42', 'mg-daemon:needs-info');

      expect(spawnSync).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['issue', 'edit']),
        expect.any(Object)
      );
    });

    it('GIVEN addLabel() WHEN called THEN includes issue number in command', async () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      await provider.addLabel('GH-42', 'mg-daemon:rejected');

      const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
      expect(args).toContain('42');
    });

    it('GIVEN addLabel() WHEN called THEN passes the label via --add-label flag', async () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      await provider.addLabel('GH-42', 'mg-daemon:needs-info');

      const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
      expect(args).toContain('--add-label');
      expect(args).toContain('mg-daemon:needs-info');
    });

    it('GIVEN addLabel() WHEN called THEN includes --repo flag', async () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      await provider.addLabel('GH-42', 'mg-daemon:rejected');

      const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
      expect(args).toContain('--repo');
      expect(args).toContain('owner/test-repo');
    });

    it('GIVEN addLabel() WHEN gh command returns non-zero THEN throws an error', async () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 1, stdout: '', stderr: 'label error' } as any);

      await expect(provider.addLabel('GH-42', 'mg-daemon:needs-info')).rejects.toThrow();
    });
  });

  describe('linkPR()', () => {
    it('GIVEN ticket and PR URL WHEN linkPR() called THEN does not throw (PR body mention is automatic)', async () => {
      await expect(provider.linkPR('GH-42', 'https://github.com/owner/repo/pull/99')).resolves.not.toThrow();
    });

    it('GIVEN linkPR() WHEN called THEN resolves successfully', async () => {
      const result = provider.linkPR('GH-42', 'https://github.com/pr/99');
      await expect(result).resolves.toBeUndefined();
    });
  });
});
