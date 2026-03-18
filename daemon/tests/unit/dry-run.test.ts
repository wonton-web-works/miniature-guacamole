import { describe, it, expect } from 'vitest';
import { formatDryRunReport } from '../../src/dry-run';
import type { DryRunResult } from '../../src/dry-run';

describe('Dry Run Module', () => {
  // ─── formatDryRunReport ─────────────────────────────────────────────────────

  describe('formatDryRunReport()', () => {
    describe('GIVEN an empty results array WHEN formatDryRunReport called THEN returns string', () => {
      it('GIVEN empty array THEN returns a non-empty string', () => {
        const output = formatDryRunReport([]);
        expect(typeof output).toBe('string');
        expect(output.length).toBeGreaterThan(0);
      });

      it('GIVEN empty array THEN output indicates no tickets', () => {
        const output = formatDryRunReport([]);
        expect(output.toLowerCase()).toMatch(/no tickets|0 tickets|none/);
      });
    });

    describe('GIVEN a single result WHEN formatDryRunReport called THEN shows ticket info', () => {
      it('GIVEN result with ticketId THEN ticketId appears in output', () => {
        const results: DryRunResult[] = [{
          ticketId: 'PROJ-123',
          ticketTitle: 'Add login feature',
          plannedWorkstreams: [],
          wouldCreatePR: true,
          wouldCreateSubtasks: 0,
        }];

        const output = formatDryRunReport(results);
        expect(output).toContain('PROJ-123');
      });

      it('GIVEN result with ticketTitle THEN title appears in output', () => {
        const results: DryRunResult[] = [{
          ticketId: 'PROJ-123',
          ticketTitle: 'Add login feature',
          plannedWorkstreams: [],
          wouldCreatePR: true,
          wouldCreateSubtasks: 0,
        }];

        const output = formatDryRunReport(results);
        expect(output).toContain('Add login feature');
      });

      it('GIVEN result with wouldCreatePR true THEN output mentions PR creation', () => {
        const results: DryRunResult[] = [{
          ticketId: 'PROJ-123',
          ticketTitle: 'Feature',
          plannedWorkstreams: [],
          wouldCreatePR: true,
          wouldCreateSubtasks: 0,
        }];

        const output = formatDryRunReport(results);
        expect(output.toLowerCase()).toContain('pr');
      });

      it('GIVEN result with wouldCreatePR false THEN output does not say would create PR', () => {
        const results: DryRunResult[] = [{
          ticketId: 'PROJ-123',
          ticketTitle: 'Feature',
          plannedWorkstreams: [],
          wouldCreatePR: false,
          wouldCreateSubtasks: 0,
        }];

        const output = formatDryRunReport(results);
        // Should either not mention PR creation or say it would NOT create one
        const hasSkip = output.toLowerCase().includes('skip') ||
                        output.toLowerCase().includes('no pr') ||
                        output.toLowerCase().includes('would not');
        const hasPR = output.toLowerCase().includes('would create pr') ||
                      output.toLowerCase().includes('create pull request');
        expect(hasPR).toBe(false);
      });

      it('GIVEN result with wouldCreateSubtasks 3 THEN output mentions subtask count', () => {
        const results: DryRunResult[] = [{
          ticketId: 'PROJ-123',
          ticketTitle: 'Feature',
          plannedWorkstreams: [],
          wouldCreatePR: true,
          wouldCreateSubtasks: 3,
        }];

        const output = formatDryRunReport(results);
        expect(output).toContain('3');
      });
    });

    describe('GIVEN result with workstreams WHEN formatDryRunReport called THEN shows workstreams', () => {
      it('GIVEN 2 planned workstreams THEN both appear in output', () => {
        const results: DryRunResult[] = [{
          ticketId: 'PROJ-123',
          ticketTitle: 'Feature',
          plannedWorkstreams: [
            { id: 'WS-1', name: 'Backend API', acceptanceCriteria: 'endpoint exists' },
            { id: 'WS-2', name: 'Frontend UI', acceptanceCriteria: 'form renders' },
          ],
          wouldCreatePR: true,
          wouldCreateSubtasks: 2,
        }];

        const output = formatDryRunReport(results);
        expect(output).toContain('Backend API');
        expect(output).toContain('Frontend UI');
      });

      it('GIVEN workstream with acceptanceCriteria THEN AC appears in output', () => {
        const results: DryRunResult[] = [{
          ticketId: 'PROJ-123',
          ticketTitle: 'Feature',
          plannedWorkstreams: [
            { id: 'WS-1', name: 'Backend', acceptanceCriteria: 'endpoint returns 200' },
          ],
          wouldCreatePR: true,
          wouldCreateSubtasks: 1,
        }];

        const output = formatDryRunReport(results);
        expect(output).toContain('endpoint returns 200');
      });
    });

    describe('GIVEN multiple results WHEN formatDryRunReport called THEN shows all tickets', () => {
      it('GIVEN 3 results THEN all ticket IDs appear in output', () => {
        const results: DryRunResult[] = [
          { ticketId: 'PROJ-1', ticketTitle: 'First', plannedWorkstreams: [], wouldCreatePR: true, wouldCreateSubtasks: 0 },
          { ticketId: 'PROJ-2', ticketTitle: 'Second', plannedWorkstreams: [], wouldCreatePR: true, wouldCreateSubtasks: 0 },
          { ticketId: 'PROJ-3', ticketTitle: 'Third', plannedWorkstreams: [], wouldCreatePR: false, wouldCreateSubtasks: 0 },
        ];

        const output = formatDryRunReport(results);
        expect(output).toContain('PROJ-1');
        expect(output).toContain('PROJ-2');
        expect(output).toContain('PROJ-3');
      });

      it('GIVEN 3 results THEN output summary mentions ticket count', () => {
        const results: DryRunResult[] = [
          { ticketId: 'PROJ-1', ticketTitle: 'First', plannedWorkstreams: [], wouldCreatePR: true, wouldCreateSubtasks: 0 },
          { ticketId: 'PROJ-2', ticketTitle: 'Second', plannedWorkstreams: [], wouldCreatePR: true, wouldCreateSubtasks: 0 },
          { ticketId: 'PROJ-3', ticketTitle: 'Third', plannedWorkstreams: [], wouldCreatePR: false, wouldCreateSubtasks: 0 },
        ];

        const output = formatDryRunReport(results);
        expect(output).toContain('3');
      });
    });

    describe('GIVEN output WHEN checked THEN header indicates dry-run mode', () => {
      it('GIVEN any results THEN output contains "DRY RUN" or similar header', () => {
        const output = formatDryRunReport([]);
        expect(output.toUpperCase()).toMatch(/DRY.?RUN/);
      });
    });

    describe('GIVEN output lines WHEN checked THEN each line is at most 80 characters', () => {
      it('GIVEN a result with long title THEN lines are wrapped/truncated to 80 chars', () => {
        const results: DryRunResult[] = [{
          ticketId: 'PROJ-123',
          ticketTitle: 'A'.repeat(100),
          plannedWorkstreams: [],
          wouldCreatePR: true,
          wouldCreateSubtasks: 0,
        }];

        const output = formatDryRunReport(results);
        const lines = output.split('\n');
        for (const line of lines) {
          expect(line.length).toBeLessThanOrEqual(80);
        }
      });
    });
  });
});
