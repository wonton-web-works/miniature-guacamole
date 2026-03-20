// Coverage for src/providers/index.ts barrel export (WS-DAEMON-10)
// Importing from the barrel triggers all re-export lines, bringing coverage to 100%.

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/tracker', () => ({
  getProcessedTickets: vi.fn().mockReturnValue([]),
}));

import {
  JiraProvider,
  LinearProvider,
  GitHubProvider,
  createProvider,
} from '../../../src/providers/index';

import type {
  TicketSource,
  TicketStatus,
  NormalizedTicket,
  SubtaskInput,
  TicketProvider,
} from '../../../src/providers/index';

describe('providers/index barrel export (WS-DAEMON-10)', () => {
  describe('AC: All provider classes are re-exported', () => {
    it('GIVEN providers/index import WHEN JiraProvider accessed THEN it is a constructor', () => {
      expect(typeof JiraProvider).toBe('function');
    });

    it('GIVEN providers/index import WHEN LinearProvider accessed THEN it is a constructor', () => {
      expect(typeof LinearProvider).toBe('function');
    });

    it('GIVEN providers/index import WHEN GitHubProvider accessed THEN it is a constructor', () => {
      expect(typeof GitHubProvider).toBe('function');
    });
  });

  describe('AC: createProvider factory is re-exported', () => {
    it('GIVEN providers/index import WHEN createProvider accessed THEN it is a function', () => {
      expect(typeof createProvider).toBe('function');
    });
  });

  describe('AC: Type exports compile without error', () => {
    it('GIVEN type-only usage WHEN types used as annotations THEN no runtime error', () => {
      // Type assertions — these validate that the type exports are present at compile time.
      // At runtime we just verify the import succeeded (no ReferenceError).
      const source: TicketSource = 'jira';
      const status: TicketStatus = 'open';

      const ticket: NormalizedTicket = {
        id: 'T-1',
        source,
        title: 'Test',
        description: 'desc',
        priority: 'high',
        labels: [],
        url: 'https://example.com',
        raw: {},
      };

      const subtask: SubtaskInput = {
        title: 'Subtask',
        body: 'Body',
      };

      // Verify runtime values match expected types
      expect(source).toBe('jira');
      expect(status).toBe('open');
      expect(ticket.id).toBe('T-1');
      expect(subtask.title).toBe('Subtask');

      // TicketProvider is an interface — verify structural compatibility via a mock object
      const mockProvider: TicketProvider = {
        fetchOpenTickets: vi.fn().mockResolvedValue([]),
        createSubtask: vi.fn().mockResolvedValue(undefined),
        addComment: vi.fn().mockResolvedValue(undefined),
        transitionTicket: vi.fn().mockResolvedValue(undefined),
      };

      expect(typeof mockProvider.fetchOpenTickets).toBe('function');
    });
  });
});
