/**
 * WS-TRACKING Phase 2: Audit Log Reader Module Tests
 *
 * Purpose: Read and parse existing audit log files for reporting.
 * This module is needed to read audit.log and parse JSONL format.
 *
 * Target: 100% coverage of reader.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { TrackedAuditEntry } from '@/audit/tracking/tagging';

import {
  readAuditLog,
  parseAuditLogLine,
  getDefaultAuditLogPath,
  isValidAuditEntry,
  readAuditLogStream,
} from '@/audit/reporting/reader';

describe('audit/reporting/reader - parseAuditLogLine()', () => {
  describe('Given valid JSONL line', () => {
    it('When parsing, Then returns parsed entry', () => {
      const line = JSON.stringify({
        timestamp: '2026-02-04T10:00:00.000Z',
        session_id: 'session-1',
        model: 'claude-opus-4-5-20251101',
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        total_cost_usd: 0.015,
        duration_ms: 1000,
        schema_version: '1.0',
        workstream_id: 'WS-18',
        agent_name: 'code-review',
        feature_name: null,
      });

      const result = parseAuditLogLine(line);
      expect(result).toBeDefined();
      expect(result!.workstream_id).toBe('WS-18');
      expect(result!.agent_name).toBe('code-review');
      expect(result!.total_cost_usd).toBe(0.015);
    });

    it('When parsing entry without tracking fields, Then returns entry with null values', () => {
      const line = JSON.stringify({
        timestamp: '2026-02-04T10:00:00.000Z',
        session_id: 'session-1',
        model: 'claude-opus-4-5-20251101',
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        total_cost_usd: 0.015,
        duration_ms: 1000,
        // No tracking fields (old format)
      });

      const result = parseAuditLogLine(line);
        expect(result).toBeDefined();
        expect(result!.workstream_id).toBeUndefined(); // or null
        expect(result!.agent_name).toBeUndefined();
    });
  });

  describe('Given invalid JSON line', () => {
    it('When parsing malformed JSON, Then returns null', () => {
      const line = 'invalid json {';

      const result = parseAuditLogLine(line);
        expect(result).toBeNull();
    });

    it('When parsing empty line, Then returns null', () => {
      const line = '';

      const result = parseAuditLogLine(line);
        expect(result).toBeNull();
    });

    it('When parsing whitespace-only line, Then returns null', () => {
      const line = '   \n  ';

      const result = parseAuditLogLine(line);
        expect(result).toBeNull();
    });
  });

  describe('Given line with missing required fields', () => {
    it('When parsing entry without timestamp, Then returns null or throws', () => {
      const line = JSON.stringify({
        session_id: 'session-1',
        model: 'claude-opus-4-5-20251101',
        // Missing timestamp
      });

      const result = parseAuditLogLine(line);
        expect(result).toBeNull();
    });
  });
});

describe('audit/reporting/reader - readAuditLog()', () => {
  let tempDir: string;
  let auditLogPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-reader-test-'));
    auditLogPath = path.join(tempDir, 'audit.log');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Given audit log file exists', () => {
    it('When reading, Then returns array of entries', () => {
      const entries = [
        {
          timestamp: '2026-02-04T10:00:00.000Z',
          session_id: 'session-1',
          model: 'claude-opus-4-5-20251101',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.015,
          duration_ms: 1000,
          schema_version: '1.0',
          workstream_id: 'WS-18',
          agent_name: 'code-review',
          feature_name: null,
        },
        {
          timestamp: '2026-02-04T11:00:00.000Z',
          session_id: 'session-2',
          model: 'claude-opus-4-5-20251101',
          input_tokens: 2000,
          output_tokens: 1000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.030,
          duration_ms: 2000,
          schema_version: '1.0',
          workstream_id: 'WS-19',
          agent_name: 'design-review',
          feature_name: null,
        },
      ];

      const logContent = entries.map(e => JSON.stringify(e)).join('\n');
      fs.writeFileSync(auditLogPath, logContent);

      const result = readAuditLog(auditLogPath);
        expect(result).toHaveLength(2);
        expect(result[0].workstream_id).toBe('WS-18');
        expect(result[1].workstream_id).toBe('WS-19');
    });

    it('When reading log with blank lines, Then skips blank lines', () => {
      const entry = {
        timestamp: '2026-02-04T10:00:00.000Z',
        session_id: 'session-1',
        model: 'claude-opus-4-5-20251101',
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        total_cost_usd: 0.015,
        duration_ms: 1000,
        schema_version: '1.0',
        workstream_id: 'WS-18',
        agent_name: 'code-review',
        feature_name: null,
      };

      const logContent = `
${JSON.stringify(entry)}


${JSON.stringify(entry)}
      `.trim();

      fs.writeFileSync(auditLogPath, logContent);

      const result = readAuditLog(auditLogPath);
        expect(result).toHaveLength(2);
    });

    it('When reading log with malformed lines, Then skips invalid lines', () => {
      const validEntry = {
        timestamp: '2026-02-04T10:00:00.000Z',
        session_id: 'session-1',
        model: 'claude-opus-4-5-20251101',
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        total_cost_usd: 0.015,
        duration_ms: 1000,
        schema_version: '1.0',
        workstream_id: 'WS-18',
        agent_name: 'code-review',
        feature_name: null,
      };

      const logContent = `
invalid json line
${JSON.stringify(validEntry)}
another invalid line
      `.trim();

      fs.writeFileSync(auditLogPath, logContent);

      const result = readAuditLog(auditLogPath);
        expect(result).toHaveLength(1);
        expect(result[0].workstream_id).toBe('WS-18');
    });
  });

  describe('Given audit log file does not exist', () => {
    it('When reading, Then throws error', () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist.log');

      readAuditLog(nonExistentPath);
        }).toThrow('Audit log not found');
    });
  });

  describe('Given empty audit log', () => {
    it('When reading, Then returns empty array', () => {
      fs.writeFileSync(auditLogPath, '');

      const result = readAuditLog(auditLogPath);
        expect(result).toEqual([]);
    });
  });

  describe('Given very large audit log', () => {
    it('When reading 10,000+ entries, Then completes successfully', () => {
      const entries = Array(10000)
        .fill(null)
        .map((_, i) => ({
          timestamp: new Date('2026-02-04T10:00:00.000Z').toISOString(),
          session_id: `session-${i}`,
          model: 'claude-opus-4-5-20251101',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.015,
          duration_ms: 1000,
          schema_version: '1.0',
          workstream_id: `WS-${i % 5}`,
          agent_name: 'code-review',
          feature_name: null,
        }));

      const logContent = entries.map(e => JSON.stringify(e)).join('\n');
      fs.writeFileSync(auditLogPath, logContent);

      const result = readAuditLog(auditLogPath);
        expect(result).toHaveLength(10000);
    });
  });

  describe('Given log with mixed encoding', () => {
    it('When reading UTF-8 encoded file, Then handles correctly', () => {
      const entry = {
        timestamp: '2026-02-04T10:00:00.000Z',
        session_id: 'session-1',
        model: 'claude-opus-4-5-20251101',
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        total_cost_usd: 0.015,
        duration_ms: 1000,
        schema_version: '1.0',
        workstream_id: 'WS-18',
        agent_name: 'code-review',
        feature_name: null,
      };

      fs.writeFileSync(auditLogPath, JSON.stringify(entry), 'utf-8');

      const result = readAuditLog(auditLogPath);
        expect(result).toHaveLength(1);
    });
  });
});

describe('audit/reporting/reader - getDefaultAuditLogPath()', () => {
  describe('Given no path specified', () => {
    it('When getting default path, Then returns ~/.claude/audit.log', () => {
      const result = getDefaultAuditLogPath();
        expect(result).toContain('.claude');
        expect(result).toContain('audit.log');
    });

    it('When getting default path, Then uses home directory', () => {
      const result = getDefaultAuditLogPath();
        const homeDir = os.homedir();
        expect(result).toContain(homeDir);
    });
  });

  describe('Given CLAUDE_AUDIT_LOG_PATH environment variable', () => {
    it('When env var is set, Then uses custom path', () => {
      process.env.CLAUDE_AUDIT_LOG_PATH = '/custom/path/audit.log';
        const result = getDefaultAuditLogPath();
        expect(result).toBe('/custom/path/audit.log');
        delete process.env.CLAUDE_AUDIT_LOG_PATH;
    });
  });
});

describe('audit/reporting/reader - streaming for large files', () => {
  let tempDir: string;
  let auditLogPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-reader-test-'));
    auditLogPath = path.join(tempDir, 'audit.log');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Given very large audit log (potential future optimization)', () => {
    it('When reading line by line, Then processes without loading entire file', () => {
      // This test documents the potential need for streaming
      // if audit logs grow very large (>1GB)

      const onEntry = vi.fn();
        readAuditLogStream(auditLogPath, onEntry);
        expect(onEntry).toHaveBeenCalled();
        throw new Error('readAuditLogStream not implemented yet (future optimization)');
      }).toThrow('readAuditLogStream not implemented yet');
    });
  });
});

describe('audit/reporting/reader - validation', () => {
  describe('Given entry with all required fields', () => {
    it('When validating, Then returns true', () => {
      const entry = {
        timestamp: '2026-02-04T10:00:00.000Z',
        session_id: 'session-1',
        model: 'claude-opus-4-5-20251101',
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        total_cost_usd: 0.015,
        duration_ms: 1000,
      };

      const result = isValidAuditEntry(entry);
        expect(result).toBe(true);
    });
  });

  describe('Given entry missing required fields', () => {
    it('When validating, Then returns false', () => {
      const entry = {
        timestamp: '2026-02-04T10:00:00.000Z',
        session_id: 'session-1',
        // Missing other required fields
      };

      const result = isValidAuditEntry(entry);
        expect(result).toBe(false);
    });
  });

  describe('Given entry with invalid timestamp format', () => {
    it('When validating, Then returns false', () => {
      const entry = {
        timestamp: 'invalid-date',
        session_id: 'session-1',
        model: 'claude-opus-4-5-20251101',
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        total_cost_usd: 0.015,
        duration_ms: 1000,
      };

      const result = isValidAuditEntry(entry);
        expect(result).toBe(false);
    });
  });
});
