import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// Module under test - will be implemented by dev
import {
  getProcessedTickets,
  markProcessing,
  markComplete,
  markFailed,
} from '../../src/tracker';
import type { ProcessedTicket } from '../../src/types';

// Mock fs module at module level
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  renameSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    dirname: vi.fn(),
  };
});

describe('Tracker Module', () => {
  const mockProcessedPath = '/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data/processed.json';
  const mockTempPath = '/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data/processed.json.tmp';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getProcessedTickets()', () => {
    it('GIVEN processed.json exists with tickets WHEN getProcessedTickets called THEN returns array of ticket keys', () => {
      // Arrange
      const mockData = {
        'TEST-1': {
          processedAt: '2026-02-08T10:00:00Z',
          status: 'complete',
          prUrl: 'https://github.com/owner/repo/pull/1',
        },
        'TEST-2': {
          processedAt: '2026-02-08T11:00:00Z',
          status: 'processing',
        },
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockData));

      // Act
      const result = getProcessedTickets();

      // Assert
      expect(result).toEqual(['TEST-1', 'TEST-2']);
    });

    it('GIVEN processed.json does not exist WHEN getProcessedTickets called THEN returns empty array', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);

      // Act
      const result = getProcessedTickets();

      // Assert
      expect(result).toEqual([]);
    });

    it('GIVEN processed.json is empty object WHEN getProcessedTickets called THEN returns empty array', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('{}');

      // Act
      const result = getProcessedTickets();

      // Assert
      expect(result).toEqual([]);
    });

    it('GIVEN processed.json contains invalid JSON WHEN getProcessedTickets called THEN returns empty array', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('invalid json{]');

      // Act
      const result = getProcessedTickets();

      // Assert
      expect(result).toEqual([]);
    });

    it('GIVEN file read error WHEN getProcessedTickets called THEN returns empty array', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      // Act
      const result = getProcessedTickets();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('AC-4.9: Atomic file operations (write-tmp-then-rename)', () => {
    it('GIVEN new ticket to mark WHEN markProcessing called THEN writes to temp file first', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markProcessing('TEST-1');

      // Assert
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.tmp'),
        expect.any(String),
        'utf-8'
      );
    });

    it('GIVEN new ticket to mark WHEN markProcessing called THEN renames temp file to final file', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markProcessing('TEST-1');

      // Assert
      expect(renameSync).toHaveBeenCalledWith(
        expect.stringContaining('.tmp'),
        expect.stringContaining('processed.json')
      );
    });

    it('GIVEN directory does not exist WHEN markProcessing called THEN creates directory before writing', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markProcessing('TEST-1');

      // Assert
      expect(mkdirSync).toHaveBeenCalledWith(
        '/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data',
        { recursive: true }
      );
    });

    it('GIVEN existing file WHEN markComplete called THEN follows atomic write pattern', () => {
      // Arrange
      const existingData = {
        'TEST-1': {
          processedAt: '2026-02-08T10:00:00Z',
          status: 'processing',
        },
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existingData));
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markComplete('TEST-1', 'https://github.com/owner/repo/pull/1');

      // Assert
      expect(writeFileSync).toHaveBeenCalled();
      expect(renameSync).toHaveBeenCalled();
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const renameCall = vi.mocked(renameSync).mock.calls[0];
      expect(writeCall[0]).toContain('.tmp');
      expect(renameCall[0]).toContain('.tmp');
      expect(renameCall[1]).toContain('processed.json');
    });
  });

  describe('AC-4.10: Store correct data structure', () => {
    it('GIVEN processed tickets WHEN stored THEN uses issue key as object key', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markProcessing('TEST-123');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData).toHaveProperty('TEST-123');
    });

    it('GIVEN processed ticket WHEN stored THEN includes processedAt timestamp', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markProcessing('TEST-1');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData['TEST-1']).toHaveProperty('processedAt');
      expect(writtenData['TEST-1'].processedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('GIVEN processed ticket WHEN stored THEN includes status field', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markProcessing('TEST-1');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData['TEST-1']).toHaveProperty('status');
    });

    it('GIVEN completed ticket WHEN stored THEN includes prUrl field', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markComplete('TEST-1', 'https://github.com/owner/repo/pull/1');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData['TEST-1']).toHaveProperty('prUrl', 'https://github.com/owner/repo/pull/1');
    });

    it('GIVEN failed ticket WHEN stored THEN includes error field', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markFailed('TEST-1', 'API authentication failed');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData['TEST-1']).toHaveProperty('error', 'API authentication failed');
    });

    it('GIVEN multiple tickets WHEN stored THEN preserves existing entries', () => {
      // Arrange
      const existingData = {
        'TEST-1': {
          processedAt: '2026-02-08T10:00:00Z',
          status: 'complete',
          prUrl: 'https://github.com/owner/repo/pull/1',
        },
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existingData));
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markProcessing('TEST-2');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData).toHaveProperty('TEST-1');
      expect(writtenData).toHaveProperty('TEST-2');
    });
  });

  describe('AC-4.11: markProcessing(key) updates status=processing with timestamp', () => {
    it('GIVEN ticket key WHEN markProcessing called THEN sets status to processing', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markProcessing('TEST-1');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData['TEST-1'].status).toBe('processing');
    });

    it('GIVEN ticket key WHEN markProcessing called THEN adds current timestamp', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');
      const beforeTime = new Date().toISOString();

      // Act
      markProcessing('TEST-1');

      // Assert
      const afterTime = new Date().toISOString();
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      const timestamp = writtenData['TEST-1'].processedAt;
      expect(timestamp >= beforeTime && timestamp <= afterTime).toBe(true);
    });

    it('GIVEN existing processing ticket WHEN markProcessing called again THEN updates timestamp', () => {
      // Arrange
      const existingData = {
        'TEST-1': {
          processedAt: '2026-02-08T10:00:00Z',
          status: 'processing',
        },
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existingData));
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markProcessing('TEST-1');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData['TEST-1'].processedAt).not.toBe('2026-02-08T10:00:00Z');
    });

    it('GIVEN ticket key WHEN markProcessing called THEN does not include prUrl or error fields', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markProcessing('TEST-1');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData['TEST-1']).not.toHaveProperty('prUrl');
      expect(writtenData['TEST-1']).not.toHaveProperty('error');
    });
  });

  describe('AC-4.12: markComplete(key, prUrl) updates status=complete with prUrl', () => {
    it('GIVEN ticket key and PR URL WHEN markComplete called THEN sets status to complete', () => {
      // Arrange
      const existingData = {
        'TEST-1': {
          processedAt: '2026-02-08T10:00:00Z',
          status: 'processing',
        },
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existingData));
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markComplete('TEST-1', 'https://github.com/owner/repo/pull/1');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData['TEST-1'].status).toBe('complete');
    });

    it('GIVEN ticket key and PR URL WHEN markComplete called THEN stores prUrl', () => {
      // Arrange
      const existingData = {
        'TEST-1': {
          processedAt: '2026-02-08T10:00:00Z',
          status: 'processing',
        },
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existingData));
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markComplete('TEST-1', 'https://github.com/owner/repo/pull/42');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData['TEST-1'].prUrl).toBe('https://github.com/owner/repo/pull/42');
    });

    it('GIVEN ticket key and PR URL WHEN markComplete called THEN preserves processedAt timestamp', () => {
      // Arrange
      const originalTimestamp = '2026-02-08T10:00:00Z';
      const existingData = {
        'TEST-1': {
          processedAt: originalTimestamp,
          status: 'processing',
        },
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existingData));
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markComplete('TEST-1', 'https://github.com/owner/repo/pull/1');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData['TEST-1'].processedAt).toBe(originalTimestamp);
    });

    it('GIVEN ticket key and PR URL WHEN markComplete called THEN does not include error field', () => {
      // Arrange
      const existingData = {
        'TEST-1': {
          processedAt: '2026-02-08T10:00:00Z',
          status: 'processing',
        },
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existingData));
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markComplete('TEST-1', 'https://github.com/owner/repo/pull/1');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData['TEST-1']).not.toHaveProperty('error');
    });

    it('GIVEN non-existent ticket WHEN markComplete called THEN creates new entry with complete status', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markComplete('TEST-1', 'https://github.com/owner/repo/pull/1');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData['TEST-1'].status).toBe('complete');
      expect(writtenData['TEST-1'].prUrl).toBe('https://github.com/owner/repo/pull/1');
    });
  });

  describe('AC-4.13: markFailed(key, error) updates status=failed with error message', () => {
    it('GIVEN ticket key and error message WHEN markFailed called THEN sets status to failed', () => {
      // Arrange
      const existingData = {
        'TEST-1': {
          processedAt: '2026-02-08T10:00:00Z',
          status: 'processing',
        },
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existingData));
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markFailed('TEST-1', 'Failed to create PR: API rate limit exceeded');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData['TEST-1'].status).toBe('failed');
    });

    it('GIVEN ticket key and error message WHEN markFailed called THEN stores error message', () => {
      // Arrange
      const existingData = {
        'TEST-1': {
          processedAt: '2026-02-08T10:00:00Z',
          status: 'processing',
        },
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existingData));
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markFailed('TEST-1', 'Validation failed: missing acceptance criteria');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData['TEST-1'].error).toBe('Validation failed: missing acceptance criteria');
    });

    it('GIVEN ticket key and error message WHEN markFailed called THEN preserves processedAt timestamp', () => {
      // Arrange
      const originalTimestamp = '2026-02-08T10:00:00Z';
      const existingData = {
        'TEST-1': {
          processedAt: originalTimestamp,
          status: 'processing',
        },
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existingData));
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markFailed('TEST-1', 'Something went wrong');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData['TEST-1'].processedAt).toBe(originalTimestamp);
    });

    it('GIVEN ticket key and error message WHEN markFailed called THEN does not include prUrl field', () => {
      // Arrange
      const existingData = {
        'TEST-1': {
          processedAt: '2026-02-08T10:00:00Z',
          status: 'processing',
        },
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existingData));
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markFailed('TEST-1', 'Error occurred');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData['TEST-1']).not.toHaveProperty('prUrl');
    });

    it('GIVEN non-existent ticket WHEN markFailed called THEN creates new entry with failed status', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markFailed('TEST-1', 'Initial processing failed');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData['TEST-1'].status).toBe('failed');
      expect(writtenData['TEST-1'].error).toBe('Initial processing failed');
    });
  });

  describe('Edge cases and error handling', () => {
    it('GIVEN write failure WHEN markProcessing called THEN throws error', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');
      vi.mocked(writeFileSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      // Act & Assert
      expect(() => markProcessing('TEST-1')).toThrow();
    });

    it('GIVEN rename failure WHEN markComplete called THEN throws error', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');
      vi.mocked(renameSync).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      // Act & Assert
      expect(() => markComplete('TEST-1', 'https://github.com/owner/repo/pull/1')).toThrow();
    });

    it('GIVEN corrupted existing file WHEN markProcessing called THEN handles gracefully by starting fresh', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('corrupted{json]');
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markProcessing('TEST-1');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData['TEST-1']).toHaveProperty('status', 'processing');
    });

    it('GIVEN empty string as error message WHEN markFailed called THEN stores empty error', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markFailed('TEST-1', '');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData['TEST-1'].error).toBe('');
    });

    it('GIVEN very long error message WHEN markFailed called THEN stores full message', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');
      const longError = 'Error: '.repeat(100);

      // Act
      markFailed('TEST-1', longError);

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData['TEST-1'].error).toBe(longError);
    });

    it('GIVEN special characters in ticket key WHEN markProcessing called THEN handles gracefully', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markProcessing('TEST-123_ABC');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData).toHaveProperty('TEST-123_ABC');
    });

    it('GIVEN file system race condition WHEN multiple marks called THEN handles atomically', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markProcessing('TEST-1');
      markProcessing('TEST-2');

      // Assert - each operation should write and rename separately
      expect(writeFileSync).toHaveBeenCalledTimes(2);
      expect(renameSync).toHaveBeenCalledTimes(2);
    });

    it('GIVEN JSON with formatting WHEN written THEN uses pretty print with 2 spaces', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markProcessing('TEST-1');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenString = writeCall[1] as string;
      expect(writtenString).toContain('\n');
      expect(writtenString).toContain('  '); // 2-space indentation
    });
  });

  describe('AC-4.15: Branch coverage (99%+ target)', () => {
    it('GIVEN existing file with data WHEN reading THEN follows read path', () => {
      // Arrange
      const mockData = {
        'TEST-1': {
          processedAt: '2026-02-08T10:00:00Z',
          status: 'complete',
          prUrl: 'https://github.com/owner/repo/pull/1',
        },
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockData));

      // Act
      const result = getProcessedTickets();

      // Assert
      expect(existsSync).toHaveBeenCalled();
      expect(readFileSync).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('GIVEN no existing file WHEN reading THEN follows no-file path', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);

      // Act
      const result = getProcessedTickets();

      // Assert
      expect(existsSync).toHaveBeenCalled();
      expect(readFileSync).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('GIVEN existing data WHEN updating THEN follows merge path', () => {
      // Arrange
      const existingData = {
        'TEST-1': {
          processedAt: '2026-02-08T10:00:00Z',
          status: 'complete',
          prUrl: 'https://github.com/owner/repo/pull/1',
        },
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existingData));
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markProcessing('TEST-2');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(Object.keys(writtenData)).toHaveLength(2);
    });

    it('GIVEN no existing data WHEN creating THEN follows create-new path', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markProcessing('TEST-1');

      // Assert
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(Object.keys(writtenData)).toHaveLength(1);
    });

    it('GIVEN directory exists WHEN writing THEN skips directory creation', () => {
      // Arrange
      vi.mocked(existsSync)
        .mockReturnValueOnce(false) // processed.json doesn't exist
        .mockReturnValueOnce(true); // directory exists
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markProcessing('TEST-1');

      // Assert
      expect(mkdirSync).not.toHaveBeenCalled();
    });

    it('GIVEN directory does not exist WHEN writing THEN creates directory', () => {
      // Arrange
      vi.mocked(existsSync)
        .mockReturnValueOnce(false) // processed.json doesn't exist
        .mockReturnValueOnce(false); // directory doesn't exist
      vi.mocked(dirname).mockReturnValue('/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data');

      // Act
      markProcessing('TEST-1');

      // Assert
      expect(mkdirSync).toHaveBeenCalledWith(
        '/Users/brodieyazaki/work/claude_things/miniature-guacamole/daemon/data',
        { recursive: true }
      );
    });
  });
});
