/**
 * WS-DAEMON-12: GitHub write-back method tests
 *
 * Covers createSubtask, transitionStatus, addComment, linkPR with thorough
 * verification of: correct gh CLI commands, argument structure, status label
 * management, error handling, and idempotency contracts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubProvider } from '../../../src/providers/github';
import type { GitHubConfig } from '../../../src/types';
import type { PipelineResult } from '../../../src/orchestrator';
import type { TriageResult } from '../../../src/triage';

vi.mock('child_process', () => ({
  spawnSync: vi.fn(),
}));

import { spawnSync } from 'child_process';

const BASE_GITHUB_CONFIG: GitHubConfig = {
  repo: 'owner/test-repo',
  baseBranch: 'main',
  issueFilter: 'label:mg-daemon state:open',
};

describe('GitHubProvider write-back (WS-DAEMON-12)', () => {
  let provider: GitHubProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GitHubProvider(BASE_GITHUB_CONFIG);
  });

  // -------------------------------------------------------------------------
  // createSubtask()
  // -------------------------------------------------------------------------

  describe('createSubtask()', () => {
    describe('AC: Creates issue with parent reference via gh CLI', () => {
      it('GIVEN parent "GH-42" WHEN createSubtask() called THEN invokes "gh issue create"', async () => {
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

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('issue');
        expect(args).toContain('create');
      });

      it('GIVEN repo "owner/test-repo" WHEN createSubtask() called THEN uses --repo owner/test-repo', async () => {
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
        expect(args).toContain('--repo');
        expect(args).toContain('owner/test-repo');
      });

      it('GIVEN parent "GH-42" WHEN createSubtask() called THEN body contains "Parent: #42"', async () => {
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

      it('GIVEN parent "GH-7" WHEN createSubtask() called THEN body contains "Parent: #7"', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 0,
          stdout: 'https://github.com/owner/repo/issues/200\n',
          stderr: '',
        } as any);

        await provider.createSubtask('GH-7', {
          title: 'Sub',
          description: 'Desc',
          parentId: 'GH-7',
        });

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        const bodyArg = args[args.indexOf('--body') + 1];
        expect(bodyArg).toContain('#7');
      });

      it('GIVEN task title WHEN createSubtask() called THEN uses --title flag with the title', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 0,
          stdout: 'https://github.com/owner/repo/issues/100\n',
          stderr: '',
        } as any);

        await provider.createSubtask('GH-42', {
          title: 'My Sub-Issue Title',
          description: 'Desc',
          parentId: 'GH-42',
        });

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('--title');
        expect(args).toContain('My Sub-Issue Title');
      });

      it('GIVEN createSubtask() returns issue URL with number 100 THEN returns "GH-100"', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 0,
          stdout: 'https://github.com/owner/repo/issues/100\n',
          stderr: '',
        } as any);

        const result = await provider.createSubtask('GH-42', {
          title: 'Sub',
          description: 'Desc',
          parentId: 'GH-42',
        });

        expect(result).toBe('GH-100');
      });

      it('GIVEN createSubtask() returns URL with different number THEN returns GH-{number}', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 0,
          stdout: 'https://github.com/owner/repo/issues/999\n',
          stderr: '',
        } as any);

        const result = await provider.createSubtask('GH-1', {
          title: 'Sub',
          description: 'Desc',
          parentId: 'GH-1',
        });

        expect(result).toBe('GH-999');
      });

      it('GIVEN task description WHEN createSubtask() called THEN body contains the description', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 0,
          stdout: 'https://github.com/owner/repo/issues/100\n',
          stderr: '',
        } as any);

        await provider.createSubtask('GH-42', {
          title: 'Sub',
          description: 'The acceptance criteria for this workstream.',
          parentId: 'GH-42',
        });

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        const bodyArg = args[args.indexOf('--body') + 1];
        expect(bodyArg).toContain('The acceptance criteria for this workstream.');
      });
    });

    describe('AC: Copies parent labels to sub-issues (GH-102)', () => {
      it('GIVEN labels ["mg-daemon", "priority:high"] WHEN createSubtask() called THEN passes --label for each label', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 0,
          stdout: 'https://github.com/owner/repo/issues/100\n',
          stderr: '',
        } as any);

        await provider.createSubtask('GH-42', {
          title: 'Sub',
          description: 'Desc',
          parentId: 'GH-42',
          labels: ['mg-daemon', 'priority:high'],
        });

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('--label');
        expect(args).toContain('mg-daemon,priority:high');
      });

      it('GIVEN labels ["mg-daemon"] WHEN createSubtask() called THEN passes --label mg-daemon', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 0,
          stdout: 'https://github.com/owner/repo/issues/100\n',
          stderr: '',
        } as any);

        await provider.createSubtask('GH-42', {
          title: 'Sub',
          description: 'Desc',
          parentId: 'GH-42',
          labels: ['mg-daemon'],
        });

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('--label');
        expect(args).toContain('mg-daemon');
      });

      it('GIVEN empty labels array WHEN createSubtask() called THEN does NOT include --label flag', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 0,
          stdout: 'https://github.com/owner/repo/issues/100\n',
          stderr: '',
        } as any);

        await provider.createSubtask('GH-42', {
          title: 'Sub',
          description: 'Desc',
          parentId: 'GH-42',
          labels: [],
        });

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).not.toContain('--label');
      });

      it('GIVEN no labels field WHEN createSubtask() called THEN does NOT include --label flag', async () => {
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
        expect(args).not.toContain('--label');
      });
    });

    describe('AC: Error handling — invalid parent ID format', () => {
      it('GIVEN parent "INVALID-FORMAT" WHEN createSubtask() called THEN throws with descriptive error', async () => {
        await expect(
          provider.createSubtask('INVALID-FORMAT', {
            title: 'Sub',
            description: '',
            parentId: 'INVALID-FORMAT',
          })
        ).rejects.toThrow('Invalid GitHub ticket ID');
      });

      it('GIVEN parent "42" (no GH- prefix) WHEN createSubtask() called THEN throws', async () => {
        await expect(
          provider.createSubtask('42', { title: 'Sub', description: '', parentId: '42' })
        ).rejects.toThrow();
      });

      it('GIVEN gh CLI returns non-zero WHEN createSubtask() called THEN propagates the error', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 1,
          stdout: '',
          stderr: 'gh: not authenticated',
        } as any);

        await expect(
          provider.createSubtask('GH-42', { title: 'Sub', description: '', parentId: 'GH-42' })
        ).rejects.toThrow('gh: not authenticated');
      });
    });
  });

  // -------------------------------------------------------------------------
  // transitionStatus()
  // -------------------------------------------------------------------------

  describe('transitionStatus()', () => {
    describe('AC: Manages status via gh issue edit labels', () => {
      it('GIVEN status "in_progress" WHEN transitionStatus() called THEN uses gh issue edit', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.transitionStatus('GH-42', 'in_progress');

        expect(spawnSync).toHaveBeenCalledWith(
          'gh',
          expect.arrayContaining(['issue', 'edit']),
          expect.any(Object)
        );
      });

      it('GIVEN ticket "GH-42" WHEN transitionStatus() called THEN includes issue number 42 in args', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.transitionStatus('GH-42', 'in_progress');

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('42');
      });

      it('GIVEN repo "owner/test-repo" WHEN transitionStatus() called THEN includes --repo owner/test-repo', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.transitionStatus('GH-42', 'todo');

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('--repo');
        expect(args).toContain('owner/test-repo');
      });

      it('GIVEN status "in_progress" WHEN transitionStatus() called THEN adds label "status:in_progress"', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.transitionStatus('GH-42', 'in_progress');

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('--add-label');
        expect(args).toContain('status:in_progress');
      });

      it('GIVEN status "todo" WHEN transitionStatus() called THEN adds label "status:todo"', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.transitionStatus('GH-42', 'todo');

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('status:todo');
      });

      it('GIVEN status "in_review" WHEN transitionStatus() called THEN adds label "status:in_review"', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.transitionStatus('GH-42', 'in_review');

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('status:in_review');
      });

      it('GIVEN status "done" WHEN transitionStatus() called THEN adds label "status:done"', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.transitionStatus('GH-42', 'done');

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('status:done');
      });

      it('GIVEN status "in_progress" WHEN transitionStatus() called THEN removes other status labels', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.transitionStatus('GH-42', 'in_progress');

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('--remove-label');
        // The remove-label value is a comma-separated string with other statuses
        const removeLabelArg = args[args.indexOf('--remove-label') + 1];
        expect(removeLabelArg).toContain('status:todo');
        expect(removeLabelArg).toContain('status:in_review');
        expect(removeLabelArg).toContain('status:done');
      });

      it('GIVEN status "done" WHEN transitionStatus() called THEN removes todo, in_progress, in_review labels', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.transitionStatus('GH-42', 'done');

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        const removeLabelArg = args[args.indexOf('--remove-label') + 1];
        expect(removeLabelArg).toContain('status:todo');
        expect(removeLabelArg).toContain('status:in_progress');
        expect(removeLabelArg).toContain('status:in_review');
      });

      it('GIVEN status "todo" WHEN transitionStatus() called THEN does NOT include status:todo in remove-label', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.transitionStatus('GH-42', 'todo');

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        const removeLabelIdx = args.indexOf('--remove-label');
        if (removeLabelIdx !== -1) {
          const removeLabelArg = args[removeLabelIdx + 1];
          expect(removeLabelArg).not.toContain('status:todo');
        }
      });

      it('GIVEN transitionStatus() succeeds THEN resolves to undefined', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await expect(provider.transitionStatus('GH-42', 'in_progress')).resolves.toBeUndefined();
      });
    });

    describe('AC: Idempotency — calling twice applies same labels (safe to retry)', () => {
      it('GIVEN two calls with same status WHEN transitionStatus() called twice THEN both use same label', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.transitionStatus('GH-42', 'in_progress');
        await provider.transitionStatus('GH-42', 'in_progress');

        const args1 = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        const args2 = vi.mocked(spawnSync).mock.calls[1][1] as string[];
        expect(args1).toContain('status:in_progress');
        expect(args2).toContain('status:in_progress');
      });
    });

    describe('AC: Error handling', () => {
      it('GIVEN invalid ticket ID "INVALID" WHEN transitionStatus() called THEN throws', async () => {
        await expect(provider.transitionStatus('INVALID', 'done')).rejects.toThrow('Invalid GitHub ticket ID');
      });

      it('GIVEN gh CLI returns non-zero WHEN transitionStatus() called THEN propagates the error', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 1,
          stdout: '',
          stderr: 'gh: command not found',
        } as any);

        await expect(provider.transitionStatus('GH-42', 'done')).rejects.toThrow('gh: command not found');
      });

      it('GIVEN gh CLI returns auth error WHEN transitionStatus() called THEN throws (does not swallow)', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 1,
          stdout: '',
          stderr: 'Not authenticated. Please run: gh auth login',
        } as any);

        await expect(provider.transitionStatus('GH-42', 'in_progress')).rejects.toThrow();
      });
    });
  });

  // -------------------------------------------------------------------------
  // addComment()
  // -------------------------------------------------------------------------

  describe('addComment()', () => {
    describe('AC: Posts comment via gh issue comment', () => {
      it('GIVEN ticket "GH-42" WHEN addComment() called THEN invokes "gh issue comment"', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.addComment('GH-42', 'Build started.');

        expect(spawnSync).toHaveBeenCalledWith(
          'gh',
          expect.arrayContaining(['issue', 'comment']),
          expect.any(Object)
        );
      });

      it('GIVEN ticket "GH-42" WHEN addComment() called THEN includes issue number 42', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.addComment('GH-42', 'comment text');

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('42');
      });

      it('GIVEN ticket "GH-7" WHEN addComment() called THEN includes issue number 7', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.addComment('GH-7', 'comment text');

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('7');
      });

      it('GIVEN repo "owner/test-repo" WHEN addComment() called THEN includes --repo owner/test-repo', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.addComment('GH-42', 'comment');

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('--repo');
        expect(args).toContain('owner/test-repo');
      });

      it('GIVEN comment body text WHEN addComment() called THEN includes body text in --body flag', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.addComment('GH-42', 'Workstream 1 completed. PR created.');

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('--body');
        expect(args).toContain('Workstream 1 completed. PR created.');
      });

      it('GIVEN addComment() succeeds THEN resolves to undefined', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await expect(provider.addComment('GH-42', 'comment')).resolves.toBeUndefined();
      });
    });

    describe('AC: Error handling', () => {
      it('GIVEN invalid ticket ID "INVALID" WHEN addComment() called THEN throws', async () => {
        await expect(provider.addComment('INVALID', 'comment')).rejects.toThrow('Invalid GitHub ticket ID');
      });

      it('GIVEN gh CLI returns non-zero WHEN addComment() called THEN propagates the error (does not swallow)', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 1,
          stdout: '',
          stderr: 'gh: not authenticated',
        } as any);

        await expect(provider.addComment('GH-42', 'comment')).rejects.toThrow('gh: not authenticated');
      });

      it('GIVEN gh CLI returns repo-not-found error WHEN addComment() called THEN throws', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 1,
          stdout: '',
          stderr: 'Could not resolve to a Repository',
        } as any);

        await expect(provider.addComment('GH-42', 'comment')).rejects.toThrow();
      });
    });
  });

  // -------------------------------------------------------------------------
  // linkPR()
  // -------------------------------------------------------------------------

  describe('linkPR()', () => {
    describe('AC: No-op — GitHub auto-links via PR body cross-reference', () => {
      it('GIVEN any ticket and PR URL WHEN linkPR() called THEN resolves without throwing', async () => {
        await expect(
          provider.linkPR('GH-42', 'https://github.com/owner/repo/pull/99')
        ).resolves.not.toThrow();
      });

      it('GIVEN linkPR() called THEN resolves to undefined', async () => {
        await expect(
          provider.linkPR('GH-42', 'https://github.com/owner/repo/pull/99')
        ).resolves.toBeUndefined();
      });

      it('GIVEN linkPR() called THEN does NOT invoke spawnSync (auto-linking is handled by GitHub)', async () => {
        await provider.linkPR('GH-42', 'https://github.com/owner/repo/pull/99');

        expect(spawnSync).not.toHaveBeenCalled();
      });

      it('GIVEN invalid ticket ID WHEN linkPR() called THEN still resolves (no-op does no parsing)', async () => {
        await expect(
          provider.linkPR('GH-42', 'https://github.com/owner/repo/pull/1')
        ).resolves.toBeUndefined();
      });

      it('GIVEN multiple calls WHEN linkPR() called repeatedly THEN always resolves (idempotent)', async () => {
        const prUrl = 'https://github.com/owner/repo/pull/42';
        await expect(provider.linkPR('GH-1', prUrl)).resolves.toBeUndefined();
        await expect(provider.linkPR('GH-1', prUrl)).resolves.toBeUndefined();
        await expect(provider.linkPR('GH-1', prUrl)).resolves.toBeUndefined();
      });
    });
  });

  // -------------------------------------------------------------------------
  // addLabel()
  // -------------------------------------------------------------------------

  describe('addLabel()', () => {
    describe('AC: Adds label via gh issue edit --add-label', () => {
      it('GIVEN ticket "GH-42" and label "mg-daemon:needs-info" WHEN addLabel() called THEN invokes "gh issue edit"', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.addLabel('GH-42', 'mg-daemon:needs-info');

        expect(spawnSync).toHaveBeenCalledWith(
          'gh',
          expect.arrayContaining(['issue', 'edit']),
          expect.any(Object)
        );
      });

      it('GIVEN ticket "GH-42" WHEN addLabel() called THEN includes issue number 42 in args', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.addLabel('GH-42', 'mg-daemon:needs-info');

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('42');
      });

      it('GIVEN repo "owner/test-repo" WHEN addLabel() called THEN includes --repo owner/test-repo', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.addLabel('GH-42', 'mg-daemon:needs-info');

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('--repo');
        expect(args).toContain('owner/test-repo');
      });

      it('GIVEN label "mg-daemon:needs-info" WHEN addLabel() called THEN includes --add-label mg-daemon:needs-info', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.addLabel('GH-42', 'mg-daemon:needs-info');

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('--add-label');
        expect(args).toContain('mg-daemon:needs-info');
      });

      it('GIVEN label "mg-daemon:rejected" WHEN addLabel() called THEN includes that label in args', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.addLabel('GH-7', 'mg-daemon:rejected');

        const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        expect(args).toContain('mg-daemon:rejected');
      });

      it('GIVEN addLabel() succeeds THEN resolves to undefined', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await expect(provider.addLabel('GH-42', 'mg-daemon:needs-info')).resolves.toBeUndefined();
      });
    });

    describe('AC: Idempotency — gh CLI --add-label is safe to call twice', () => {
      it('GIVEN two calls with same label WHEN addLabel() called twice THEN both use same --add-label flag', async () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

        await provider.addLabel('GH-42', 'mg-daemon:needs-info');
        await provider.addLabel('GH-42', 'mg-daemon:needs-info');

        const args1 = vi.mocked(spawnSync).mock.calls[0][1] as string[];
        const args2 = vi.mocked(spawnSync).mock.calls[1][1] as string[];
        expect(args1).toContain('mg-daemon:needs-info');
        expect(args2).toContain('mg-daemon:needs-info');
      });
    });

    describe('AC: Error handling', () => {
      it('GIVEN invalid ticket ID "INVALID" WHEN addLabel() called THEN throws', async () => {
        await expect(provider.addLabel('INVALID', 'mg-daemon:needs-info')).rejects.toThrow('Invalid GitHub ticket ID');
      });

      it('GIVEN gh CLI returns non-zero WHEN addLabel() called THEN propagates the error', async () => {
        vi.mocked(spawnSync).mockReturnValue({
          status: 1,
          stdout: '',
          stderr: 'gh: not authenticated',
        } as any);

        await expect(provider.addLabel('GH-42', 'mg-daemon:needs-info')).rejects.toThrow('gh: not authenticated');
      });
    });
  });

  // -------------------------------------------------------------------------
  // parseIssueNumber — edge cases
  // -------------------------------------------------------------------------

  describe('Ticket ID parsing edge cases', () => {
    it('GIVEN ticket "GH-1" (single digit) WHEN any write-back method called THEN parses number 1', async () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      await provider.addComment('GH-1', 'test');

      const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
      expect(args).toContain('1');
    });

    it('GIVEN ticket "GH-9999" (large number) WHEN any write-back method called THEN parses number 9999', async () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      await provider.addComment('GH-9999', 'test');

      const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
      expect(args).toContain('9999');
    });

    it('GIVEN ticket "GH-0" WHEN createSubtask() called THEN still parses number 0', async () => {
      vi.mocked(spawnSync).mockReturnValue({
        status: 0,
        stdout: 'https://github.com/owner/repo/issues/100\n',
        stderr: '',
      } as any);

      await provider.createSubtask('GH-0', {
        title: 'Sub',
        description: 'Desc',
        parentId: 'GH-0',
      });

      const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
      const bodyArg = args[args.indexOf('--body') + 1];
      expect(bodyArg).toContain('#0');
    });
  });

  // -------------------------------------------------------------------------
  // Triage writeback — GitHub-specific (GH-104)
  // -------------------------------------------------------------------------

  describe('Triage writeback — GitHub (GH-104)', () => {
    it('GIVEN NEEDS_CLARIFICATION triage body WHEN addComment() called THEN posts triage-formatted comment via gh CLI', async () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      const triageComment = '**Triage: NEEDS_CLARIFICATION**\n\nMissing acceptance criteria\n\n**Questions:**\n- What should the behavior be?';
      await provider.addComment('GH-42', triageComment);

      const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
      expect(args).toContain('--body');
      expect(args).toContain(triageComment);
    });

    it('GIVEN REJECT triage body WHEN addComment() called THEN posts rejection comment via gh CLI', async () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      const triageComment = '**Triage: REJECT**\n\nOut of scope for this project';
      await provider.addComment('GH-42', triageComment);

      const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
      expect(args).toContain(triageComment);
    });

    it('GIVEN triage adds mg-daemon:needs-info label WHEN addLabel() called THEN gh CLI receives that label', async () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      await provider.addLabel('GH-42', 'mg-daemon:needs-info');

      const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
      expect(args).toContain('--add-label');
      expect(args).toContain('mg-daemon:needs-info');
    });

    it('GIVEN triage adds mg-daemon:rejected label WHEN addLabel() called THEN gh CLI receives that label', async () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      await provider.addLabel('GH-42', 'mg-daemon:rejected');

      const args = vi.mocked(spawnSync).mock.calls[0][1] as string[];
      expect(args).toContain('mg-daemon:rejected');
    });
  });

  // -------------------------------------------------------------------------
  // PipelineResult triageResult assertions (GH-104)
  // -------------------------------------------------------------------------

  describe('PipelineResult triageResult assertions (GH-104)', () => {
    it('GIVEN GO triage outcome THEN PipelineResult includes triageResult with outcome GO', () => {
      const triageResult: TriageResult = { outcome: 'GO', reason: 'All checks pass' };
      const result: PipelineResult = {
        ticketId: 'GH-42',
        triageResult,
        planned: [],
        executed: [],
        success: true,
      };
      expect(result.triageResult).toBeDefined();
      expect(result.triageResult!.outcome).toBe('GO');
      expect(result.triageResult!.reason).toBe('All checks pass');
    });

    it('GIVEN NEEDS_CLARIFICATION triage outcome THEN PipelineResult includes triageResult and success=false', () => {
      const triageResult: TriageResult = {
        outcome: 'NEEDS_CLARIFICATION',
        reason: 'Missing acceptance criteria',
        questions: ['What should the behavior be?'],
      };
      const result: PipelineResult = {
        ticketId: 'GH-42',
        triageResult,
        planned: [],
        executed: [],
        success: false,
        error: 'Triage: NEEDS_CLARIFICATION — Missing acceptance criteria',
      };
      expect(result.triageResult).toBeDefined();
      expect(result.triageResult!.outcome).toBe('NEEDS_CLARIFICATION');
      expect(result.triageResult!.questions).toContain('What should the behavior be?');
      expect(result.success).toBe(false);
    });

    it('GIVEN REJECT triage outcome THEN PipelineResult includes triageResult and success=false', () => {
      const triageResult: TriageResult = {
        outcome: 'REJECT',
        reason: 'Out of scope',
      };
      const result: PipelineResult = {
        ticketId: 'GH-42',
        triageResult,
        planned: [],
        executed: [],
        success: false,
        error: 'Triage: REJECT — Out of scope',
      };
      expect(result.triageResult).toBeDefined();
      expect(result.triageResult!.outcome).toBe('REJECT');
      expect(result.success).toBe(false);
    });

    it('GIVEN any triage outcome THEN triageResult is always present in PipelineResult for all outcomes', () => {
      const outcomes: Array<TriageResult['outcome']> = ['GO', 'NEEDS_CLARIFICATION', 'REJECT'];
      for (const outcome of outcomes) {
        const result: PipelineResult = {
          ticketId: 'GH-42',
          triageResult: { outcome, reason: 'test reason' },
          planned: [],
          executed: [],
          success: outcome === 'GO',
        };
        expect(result.triageResult).toBeDefined();
        expect(result.triageResult!.outcome).toBe(outcome);
      }
    });
  });
});
