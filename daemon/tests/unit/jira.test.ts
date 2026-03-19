import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Module under test - will be implemented by dev
import { pollJira } from '../../src/jira';
import type { DaemonConfig, TicketData } from '../../src/types';
import * as tracker from '../../src/tracker';

// Mock tracker module
vi.mock('../../src/tracker', () => ({
  getProcessedTickets: vi.fn(),
}));

describe('Jira Client Module', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockConfig: DaemonConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock fetch function
    mockFetch = vi.fn();

    // Standard test config
    mockConfig = {
      jira: {
        host: 'https://test.atlassian.net',
        apiToken: 'test-api-token',
        project: 'TEST',
        jql: 'project = TEST AND status = "To Do"',
      },
      github: {
        repo: 'owner/repo',
        token: 'ghp_test',
        baseBranch: 'main',
      },
      polling: {
        intervalSeconds: 300,
        batchSize: 1,
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('pollJira()', () => {
    describe('AC-4.1: Fetch issues via Jira REST API v3 with JQL filter', () => {
      it('GIVEN valid credentials WHEN pollJira called THEN fetches issues via Jira API with correct URL', async () => {
        // Arrange
        const mockIssues = {
          issues: [
            {
              key: 'TEST-1',
              fields: {
                summary: 'Test issue',
                description: 'Test description',
                priority: { name: 'High' },
                labels: ['bug', 'urgent'],
              },
            },
          ],
        };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        });
        vi.mocked(tracker.getProcessedTickets).mockReturnValue([]);

        // Act
        await pollJira(mockConfig, mockFetch);

        // Assert
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('https://test.atlassian.net/rest/api/3/search'),
          expect.any(Object)
        );
      });

      it('GIVEN valid credentials WHEN pollJira called THEN uses correct Authorization header with base64 encoded token', async () => {
        // Arrange
        const mockIssues = { issues: [] };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        });
        vi.mocked(tracker.getProcessedTickets).mockReturnValue([]);

        // Act
        await pollJira(mockConfig, mockFetch);

        // Assert
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: expect.stringMatching(/^Basic /),
            }),
          })
        );
      });

      it('GIVEN valid credentials WHEN pollJira called THEN uses JQL filter from config', async () => {
        // Arrange
        const mockIssues = { issues: [] };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        });
        vi.mocked(tracker.getProcessedTickets).mockReturnValue([]);

        // Act
        await pollJira(mockConfig, mockFetch);

        // Assert
        const callUrl = mockFetch.mock.calls[0][0] as string;
        expect(callUrl).toContain(encodeURIComponent('project = TEST AND status = "To Do"'));
      });

      it('GIVEN valid credentials WHEN pollJira called THEN uses Accept and Content-Type headers for JSON', async () => {
        // Arrange
        const mockIssues = { issues: [] };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        });
        vi.mocked(tracker.getProcessedTickets).mockReturnValue([]);

        // Act
        await pollJira(mockConfig, mockFetch);

        // Assert
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Accept: 'application/json',
              'Content-Type': 'application/json',
            }),
          })
        );
      });
    });

    describe('AC-4.2: Respect batchSize=1, return only first issue by JQL ORDER BY', () => {
      it('GIVEN batchSize=1 and 3 issues available WHEN pollJira called THEN returns only first issue', async () => {
        // Arrange
        const mockIssues = {
          issues: [
            {
              key: 'TEST-1',
              fields: {
                summary: 'First issue',
                description: 'Description 1',
                priority: { name: 'High' },
                labels: ['bug'],
              },
            },
            {
              key: 'TEST-2',
              fields: {
                summary: 'Second issue',
                description: 'Description 2',
                priority: { name: 'Medium' },
                labels: [],
              },
            },
            {
              key: 'TEST-3',
              fields: {
                summary: 'Third issue',
                description: 'Description 3',
                priority: { name: 'Low' },
                labels: [],
              },
            },
          ],
        };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        });
        vi.mocked(tracker.getProcessedTickets).mockReturnValue([]);

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].key).toBe('TEST-1');
      });

      it('GIVEN batchSize=1 WHEN pollJira called THEN includes maxResults=1 in API call', async () => {
        // Arrange
        const mockIssues = { issues: [] };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        });
        vi.mocked(tracker.getProcessedTickets).mockReturnValue([]);

        // Act
        await pollJira(mockConfig, mockFetch);

        // Assert
        const callUrl = mockFetch.mock.calls[0][0] as string;
        expect(callUrl).toContain('maxResults=1');
      });

      it('GIVEN batchSize=5 WHEN pollJira called THEN includes maxResults=5 in API call', async () => {
        // Arrange
        mockConfig.polling.batchSize = 5;
        const mockIssues = { issues: [] };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        });
        vi.mocked(tracker.getProcessedTickets).mockReturnValue([]);

        // Act
        await pollJira(mockConfig, mockFetch);

        // Assert
        const callUrl = mockFetch.mock.calls[0][0] as string;
        expect(callUrl).toContain('maxResults=5');
      });
    });

    describe('AC-4.3: Skip issues that exist in processed.json', () => {
      it('GIVEN 1 issue already processed WHEN pollJira called THEN filters it out from results', async () => {
        // Arrange
        const mockIssues = {
          issues: [
            {
              key: 'TEST-1',
              fields: {
                summary: 'Already processed',
                description: 'Description',
                priority: { name: 'High' },
                labels: [],
              },
            },
          ],
        };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        });
        vi.mocked(tracker.getProcessedTickets).mockReturnValue(['TEST-1']);

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result).toHaveLength(0);
      });

      it('GIVEN 2 issues, 1 processed and 1 new WHEN pollJira called THEN returns only the new issue', async () => {
        // Arrange
        const mockIssues = {
          issues: [
            {
              key: 'TEST-1',
              fields: {
                summary: 'Already processed',
                description: 'Description 1',
                priority: { name: 'High' },
                labels: [],
              },
            },
            {
              key: 'TEST-2',
              fields: {
                summary: 'New issue',
                description: 'Description 2',
                priority: { name: 'Medium' },
                labels: ['feature'],
              },
            },
          ],
        };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        });
        vi.mocked(tracker.getProcessedTickets).mockReturnValue(['TEST-1']);

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].key).toBe('TEST-2');
      });

      it('GIVEN all issues already processed WHEN pollJira called THEN returns empty array', async () => {
        // Arrange
        const mockIssues = {
          issues: [
            {
              key: 'TEST-1',
              fields: {
                summary: 'Issue 1',
                description: 'Description 1',
                priority: { name: 'High' },
                labels: [],
              },
            },
            {
              key: 'TEST-2',
              fields: {
                summary: 'Issue 2',
                description: 'Description 2',
                priority: { name: 'Medium' },
                labels: [],
              },
            },
          ],
        };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        });
        vi.mocked(tracker.getProcessedTickets).mockReturnValue(['TEST-1', 'TEST-2']);

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result).toHaveLength(0);
      });
    });

    describe('AC-4.4: Return TicketData with correct structure', () => {
      it('GIVEN valid Jira issue WHEN pollJira called THEN returns TicketData with key field', async () => {
        // Arrange
        const mockIssues = {
          issues: [
            {
              key: 'TEST-123',
              fields: {
                summary: 'Test issue',
                description: 'Test description',
                priority: { name: 'High' },
                labels: ['bug'],
              },
            },
          ],
        };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        });
        vi.mocked(tracker.getProcessedTickets).mockReturnValue([]);

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result[0]).toHaveProperty('key', 'TEST-123');
      });

      it('GIVEN valid Jira issue WHEN pollJira called THEN returns TicketData with summary field', async () => {
        // Arrange
        const mockIssues = {
          issues: [
            {
              key: 'TEST-1',
              fields: {
                summary: 'Implement new feature',
                description: 'Test description',
                priority: { name: 'High' },
                labels: [],
              },
            },
          ],
        };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        });
        vi.mocked(tracker.getProcessedTickets).mockReturnValue([]);

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result[0]).toHaveProperty('summary', 'Implement new feature');
      });

      it('GIVEN valid Jira issue WHEN pollJira called THEN returns TicketData with description field', async () => {
        // Arrange
        const mockIssues = {
          issues: [
            {
              key: 'TEST-1',
              fields: {
                summary: 'Test',
                description: 'Detailed description here',
                priority: { name: 'High' },
                labels: [],
              },
            },
          ],
        };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        });
        vi.mocked(tracker.getProcessedTickets).mockReturnValue([]);

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result[0]).toHaveProperty('description', 'Detailed description here');
      });

      it('GIVEN valid Jira issue WHEN pollJira called THEN returns TicketData with priority field', async () => {
        // Arrange
        const mockIssues = {
          issues: [
            {
              key: 'TEST-1',
              fields: {
                summary: 'Test',
                description: 'Description',
                priority: { name: 'Critical' },
                labels: [],
              },
            },
          ],
        };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        });
        vi.mocked(tracker.getProcessedTickets).mockReturnValue([]);

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result[0]).toHaveProperty('priority', 'Critical');
      });

      it('GIVEN valid Jira issue WHEN pollJira called THEN returns TicketData with labels array', async () => {
        // Arrange
        const mockIssues = {
          issues: [
            {
              key: 'TEST-1',
              fields: {
                summary: 'Test',
                description: 'Description',
                priority: { name: 'High' },
                labels: ['frontend', 'bug', 'urgent'],
              },
            },
          ],
        };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        });
        vi.mocked(tracker.getProcessedTickets).mockReturnValue([]);

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result[0]).toHaveProperty('labels');
        expect(result[0].labels).toEqual(['frontend', 'bug', 'urgent']);
      });

      it('GIVEN valid Jira issue WHEN pollJira called THEN returns TicketData with url field constructed from host and key', async () => {
        // Arrange
        const mockIssues = {
          issues: [
            {
              key: 'TEST-456',
              fields: {
                summary: 'Test',
                description: 'Description',
                priority: { name: 'High' },
                labels: [],
              },
            },
          ],
        };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        });
        vi.mocked(tracker.getProcessedTickets).mockReturnValue([]);

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result[0]).toHaveProperty('url');
        expect(result[0].url).toBe('https://test.atlassian.net/browse/TEST-456');
      });

      it('GIVEN Jira issue with empty labels WHEN pollJira called THEN returns empty labels array', async () => {
        // Arrange
        const mockIssues = {
          issues: [
            {
              key: 'TEST-1',
              fields: {
                summary: 'Test',
                description: 'Description',
                priority: { name: 'High' },
                labels: [],
              },
            },
          ],
        };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        });
        vi.mocked(tracker.getProcessedTickets).mockReturnValue([]);

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result[0].labels).toEqual([]);
      });

      it('GIVEN Jira issue with null description WHEN pollJira called THEN returns empty string for description', async () => {
        // Arrange
        const mockIssues = {
          issues: [
            {
              key: 'TEST-1',
              fields: {
                summary: 'Test',
                description: null,
                priority: { name: 'High' },
                labels: [],
              },
            },
          ],
        };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        });
        vi.mocked(tracker.getProcessedTickets).mockReturnValue([]);

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result[0].description).toBe('');
      });
    });

    describe('AC-4.5: Handle 401 Unauthorized', () => {
      it('GIVEN invalid credentials WHEN pollJira called with 401 response THEN returns empty array', async () => {
        // Arrange
        mockFetch.mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        });

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result).toEqual([]);
      });

      it('GIVEN invalid credentials WHEN pollJira called with 401 response THEN does not throw error', async () => {
        // Arrange
        mockFetch.mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        });

        // Act & Assert
        await expect(pollJira(mockConfig, mockFetch)).resolves.not.toThrow();
      });
    });

    describe('AC-4.6: Handle 429 Rate Limit', () => {
      it('GIVEN rate limit exceeded WHEN pollJira called with 429 response THEN returns empty array', async () => {
        // Arrange
        mockFetch.mockResolvedValue({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Map([['Retry-After', '60']]),
        });

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result).toEqual([]);
      });

      it('GIVEN rate limit with Retry-After header WHEN pollJira called with 429 response THEN does not throw error', async () => {
        // Arrange
        mockFetch.mockResolvedValue({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Map([['Retry-After', '120']]),
        });

        // Act & Assert
        await expect(pollJira(mockConfig, mockFetch)).resolves.not.toThrow();
      });
    });

    describe('AC-4.7: Handle 500 Server Error', () => {
      it('GIVEN server error WHEN pollJira called with 500 response THEN returns empty array', async () => {
        // Arrange
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result).toEqual([]);
      });

      it('GIVEN server error WHEN pollJira called with 503 response THEN returns empty array', async () => {
        // Arrange
        mockFetch.mockResolvedValue({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        });

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result).toEqual([]);
      });

      it('GIVEN server error WHEN pollJira called with 500 response THEN does not throw error', async () => {
        // Arrange
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });

        // Act & Assert
        await expect(pollJira(mockConfig, mockFetch)).resolves.not.toThrow();
      });
    });

    describe('AC-4.8: Handle network timeout', () => {
      it('GIVEN network timeout WHEN pollJira called and fetch times out THEN returns empty array', async () => {
        // Arrange
        mockFetch.mockRejectedValue(new Error('Network timeout'));

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result).toEqual([]);
      });

      it('GIVEN network error WHEN pollJira called and fetch fails THEN does not throw error', async () => {
        // Arrange
        mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

        // Act & Assert
        await expect(pollJira(mockConfig, mockFetch)).resolves.not.toThrow();
      });

      it('GIVEN DNS resolution failure WHEN pollJira called THEN returns empty array', async () => {
        // Arrange
        mockFetch.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result).toEqual([]);
      });
    });

    describe('AC-4.14: Dependency injection for HTTP calls', () => {
      it('GIVEN custom fetch function WHEN pollJira called THEN uses the provided fetch function', async () => {
        // Arrange
        const customFetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ issues: [] }),
        });
        vi.mocked(tracker.getProcessedTickets).mockReturnValue([]);

        // Act
        await pollJira(mockConfig, customFetch);

        // Assert
        expect(customFetch).toHaveBeenCalled();
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('GIVEN no fetch function provided WHEN pollJira called THEN uses default fetch', async () => {
        // Arrange
        const globalFetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ issues: [] }),
        });
        global.fetch = globalFetch;
        vi.mocked(tracker.getProcessedTickets).mockReturnValue([]);

        // Act
        await pollJira(mockConfig);

        // Assert
        expect(globalFetch).toHaveBeenCalled();
      });
    });

    describe('AC-4.0: Guard against missing jira config', () => {
      // Lines 44-45: config.jira is undefined
      it('GIVEN config with no jira section WHEN pollJira() called THEN returns empty array without calling fetch', async () => {
        // Arrange: config without jira section
        const configWithoutJira: DaemonConfig = {
          github: { repo: 'owner/repo', baseBranch: 'main' },
          polling: { intervalSeconds: 300, batchSize: 1 },
        } as any;

        // Act
        const result = await pollJira(configWithoutJira, mockFetch);

        // Assert
        expect(result).toEqual([]);
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('Edge cases and error handling', () => {
      it('GIVEN malformed JSON response WHEN pollJira called THEN returns empty array', async () => {
        // Arrange
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => {
            throw new Error('Unexpected token in JSON');
          },
        });

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result).toEqual([]);
      });

      it('GIVEN response with missing issues field WHEN pollJira called THEN returns empty array', async () => {
        // Arrange
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({}),
        });

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result).toEqual([]);
      });

      it('GIVEN issue with missing fields WHEN pollJira called THEN handles gracefully with defaults', async () => {
        // Arrange
        const mockIssues = {
          issues: [
            {
              key: 'TEST-1',
              fields: {
                summary: 'Test',
                // description missing
                priority: null,
                // labels missing
              },
            },
          ],
        };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockIssues,
        });
        vi.mocked(tracker.getProcessedTickets).mockReturnValue([]);

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].description).toBe('');
        expect(result[0].priority).toBe('');
        expect(result[0].labels).toEqual([]);
      });

      it('GIVEN 404 response WHEN pollJira called THEN returns empty array', async () => {
        // Arrange
        mockFetch.mockResolvedValue({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        });

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result).toEqual([]);
      });

      it('GIVEN empty issues array WHEN pollJira called THEN returns empty array', async () => {
        // Arrange
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ issues: [] }),
        });
        vi.mocked(tracker.getProcessedTickets).mockReturnValue([]);

        // Act
        const result = await pollJira(mockConfig, mockFetch);

        // Assert
        expect(result).toEqual([]);
      });
    });
  });
});
