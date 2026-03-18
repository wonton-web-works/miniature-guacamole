import { describe, it, expect } from 'vitest';
import type {
  TicketSource,
  TicketStatus,
  NormalizedTicket,
  SubtaskInput,
  TicketProvider,
} from '../../../src/providers/types';

describe('Provider Types (WS-DAEMON-10: Type definitions)', () => {
  describe('TicketSource type', () => {
    it('GIVEN TicketSource type THEN jira is a valid value', () => {
      const source: TicketSource = 'jira';
      expect(source).toBe('jira');
    });

    it('GIVEN TicketSource type THEN linear is a valid value', () => {
      const source: TicketSource = 'linear';
      expect(source).toBe('linear');
    });

    it('GIVEN TicketSource type THEN github is a valid value', () => {
      const source: TicketSource = 'github';
      expect(source).toBe('github');
    });
  });

  describe('TicketStatus type', () => {
    it('GIVEN TicketStatus type THEN all four valid values compile', () => {
      const statuses: TicketStatus[] = ['todo', 'in_progress', 'in_review', 'done'];
      expect(statuses).toHaveLength(4);
    });

    it('GIVEN TicketStatus THEN todo is a valid value', () => {
      const status: TicketStatus = 'todo';
      expect(status).toBe('todo');
    });

    it('GIVEN TicketStatus THEN in_progress is a valid value', () => {
      const status: TicketStatus = 'in_progress';
      expect(status).toBe('in_progress');
    });

    it('GIVEN TicketStatus THEN in_review is a valid value', () => {
      const status: TicketStatus = 'in_review';
      expect(status).toBe('in_review');
    });

    it('GIVEN TicketStatus THEN done is a valid value', () => {
      const status: TicketStatus = 'done';
      expect(status).toBe('done');
    });
  });

  describe('NormalizedTicket interface', () => {
    it('GIVEN a complete NormalizedTicket THEN all required fields are present', () => {
      const ticket: NormalizedTicket = {
        id: 'PROJ-123',
        source: 'jira',
        title: 'Implement feature',
        description: 'Detailed description',
        priority: 'high',
        labels: ['backend', 'feature'],
        url: 'https://example.atlassian.net/browse/PROJ-123',
        raw: { key: 'PROJ-123' },
      };

      expect(ticket.id).toBe('PROJ-123');
      expect(ticket.source).toBe('jira');
      expect(ticket.title).toBe('Implement feature');
      expect(ticket.description).toBe('Detailed description');
      expect(ticket.priority).toBe('high');
      expect(ticket.labels).toEqual(['backend', 'feature']);
      expect(ticket.url).toContain('PROJ-123');
      expect(ticket.raw).toBeDefined();
    });

    it('GIVEN NormalizedTicket THEN priority must be one of the four normalized values', () => {
      const priorities: NormalizedTicket['priority'][] = ['critical', 'high', 'medium', 'low'];
      expect(priorities).toHaveLength(4);
    });

    it('GIVEN NormalizedTicket THEN source can be jira, linear, or github', () => {
      const jiraTicket: NormalizedTicket = {
        id: 'PROJ-1',
        source: 'jira',
        title: 'Test',
        description: '',
        priority: 'low',
        labels: [],
        url: 'https://jira.example.com/browse/PROJ-1',
        raw: null,
      };
      expect(jiraTicket.source).toBe('jira');

      const linearTicket: NormalizedTicket = {
        id: 'LIN-abc',
        source: 'linear',
        title: 'Test',
        description: '',
        priority: 'medium',
        labels: [],
        url: 'https://linear.app/team/issue/LIN-abc',
        raw: null,
      };
      expect(linearTicket.source).toBe('linear');

      const githubTicket: NormalizedTicket = {
        id: 'GH-45',
        source: 'github',
        title: 'Test',
        description: '',
        priority: 'high',
        labels: [],
        url: 'https://github.com/owner/repo/issues/45',
        raw: null,
      };
      expect(githubTicket.source).toBe('github');
    });

    it('GIVEN NormalizedTicket THEN raw field accepts any value', () => {
      const withObject: NormalizedTicket = {
        id: 'T-1', source: 'jira', title: '', description: '', priority: 'low', labels: [], url: '', raw: { key: 'value' },
      };
      const withNull: NormalizedTicket = {
        id: 'T-1', source: 'jira', title: '', description: '', priority: 'low', labels: [], url: '', raw: null,
      };
      const withArray: NormalizedTicket = {
        id: 'T-1', source: 'jira', title: '', description: '', priority: 'low', labels: [], url: '', raw: [1, 2, 3],
      };

      expect(withObject.raw).toEqual({ key: 'value' });
      expect(withNull.raw).toBeNull();
      expect(withArray.raw).toEqual([1, 2, 3]);
    });
  });

  describe('SubtaskInput interface', () => {
    it('GIVEN a SubtaskInput THEN all required fields are present', () => {
      const input: SubtaskInput = {
        title: 'Implement unit tests',
        description: 'Write tests for the new feature',
        parentId: 'PROJ-123',
      };

      expect(input.title).toBe('Implement unit tests');
      expect(input.description).toBe('Write tests for the new feature');
      expect(input.parentId).toBe('PROJ-123');
    });
  });

  describe('TicketProvider interface contract', () => {
    it('GIVEN an object implementing TicketProvider THEN all five methods are present', () => {
      const provider: TicketProvider = {
        poll: async (_since?: Date) => [],
        createSubtask: async (_parent: string, _task: SubtaskInput) => 'NEW-1',
        transitionStatus: async (_ticketId: string, _status: TicketStatus) => {},
        addComment: async (_ticketId: string, _body: string) => {},
        linkPR: async (_ticketId: string, _prUrl: string) => {},
      };

      expect(typeof provider.poll).toBe('function');
      expect(typeof provider.createSubtask).toBe('function');
      expect(typeof provider.transitionStatus).toBe('function');
      expect(typeof provider.addComment).toBe('function');
      expect(typeof provider.linkPR).toBe('function');
    });

    it('GIVEN TicketProvider.poll() THEN it accepts an optional Date parameter', async () => {
      const provider: TicketProvider = {
        poll: async (_since?: Date) => [],
        createSubtask: async () => '',
        transitionStatus: async () => {},
        addComment: async () => {},
        linkPR: async () => {},
      };

      // Call without arg
      const result1 = await provider.poll();
      expect(result1).toEqual([]);

      // Call with date arg
      const result2 = await provider.poll(new Date());
      expect(result2).toEqual([]);
    });

    it('GIVEN TicketProvider.poll() THEN it returns Promise<NormalizedTicket[]>', async () => {
      const ticket: NormalizedTicket = {
        id: 'T-1',
        source: 'jira',
        title: 'Test ticket',
        description: 'desc',
        priority: 'medium',
        labels: [],
        url: 'https://example.com',
        raw: {},
      };
      const provider: TicketProvider = {
        poll: async () => [ticket],
        createSubtask: async () => '',
        transitionStatus: async () => {},
        addComment: async () => {},
        linkPR: async () => {},
      };

      const result = await provider.poll();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('T-1');
    });

    it('GIVEN TicketProvider.createSubtask() THEN it returns Promise<string> (the new ticket ID)', async () => {
      const provider: TicketProvider = {
        poll: async () => [],
        createSubtask: async (_parent, _task) => 'PROJ-456',
        transitionStatus: async () => {},
        addComment: async () => {},
        linkPR: async () => {},
      };

      const result = await provider.createSubtask('PROJ-123', {
        title: 'Subtask',
        description: 'desc',
        parentId: 'PROJ-123',
      });
      expect(result).toBe('PROJ-456');
    });
  });
});
