import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const MIGRATION_PATH = join(process.cwd(), 'migrations', '002-dashboard-schema.sql');

let sql: string;

beforeAll(() => {
  if (existsSync(MIGRATION_PATH)) {
    sql = readFileSync(MIGRATION_PATH, 'utf-8');
  }
});

describe.skipIf(!existsSync(MIGRATION_PATH))(
  'migrations/002-dashboard-schema.sql',
  () => {
    // -----------------------------------------------------------------------
    // MISUSE CASES
    // -----------------------------------------------------------------------

    it('M-1: no bare CREATE TABLE workstreams (non-idempotent)', () => {
      expect(sql).not.toMatch(/CREATE TABLE\s+workstreams\b(?!\s+IF\s+NOT\s+EXISTS)/i);
    });

    it('M-2: no bare ALTER TABLE ADD COLUMN (non-idempotent)', () => {
      expect(sql).not.toMatch(/ADD COLUMN\s+(?!IF NOT EXISTS)\w/i);
    });

    it('M-3: no bare CREATE INDEX (non-idempotent)', () => {
      expect(sql).not.toMatch(/CREATE INDEX\s+idx_(?!IF)/i);
      expect(sql).not.toMatch(/CREATE UNIQUE INDEX\s+idx_(?!IF)/i);
    });

    it('M-4: version column is NOT NULL (nullability violation)', () => {
      expect(sql).toMatch(/version\s+BIGINT\s+NOT\s+NULL/i);
    });

    it('M-5: phase column is NOT NULL in workstreams table', () => {
      expect(sql).toMatch(/phase\s+TEXT\s+NOT\s+NULL/i);
    });

    it('M-6: unique partial index must include WHERE clause', () => {
      expect(sql).toMatch(
        /CREATE UNIQUE INDEX IF NOT EXISTS[\s\S]*?idempotency_key[\s\S]*?WHERE\s+idempotency_key\s+IS\s+NOT\s+NULL/i
      );
    });

    it('M-7: phase column must have DEFAULT \'planning\'', () => {
      expect(sql).toMatch(/phase\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'planning'/i);
    });

    it('M-8: version column must have DEFAULT 1 for existing rows', () => {
      expect(sql).toMatch(/version\s+BIGINT\s+NOT\s+NULL\s+DEFAULT\s+1/i);
    });

    // -----------------------------------------------------------------------
    // BOUNDARY TESTS
    // -----------------------------------------------------------------------

    it('B-1: migration is wrapped in a transaction', () => {
      expect(sql.trimStart()).toMatch(/^BEGIN;/i);
      expect(sql.trimEnd()).toMatch(/COMMIT;$/i);
    });

    it('B-2: new index names don\'t collide with 001 index names', () => {
      expect(sql).not.toContain('idx_memory_entries_agent_id');
      expect(sql).not.toContain('idx_memory_entries_workstream_id');
      expect(sql).not.toContain('idx_memory_entries_timestamp');
      expect(sql).not.toContain('idx_agent_events_agent_id');
      expect(sql).not.toContain('idx_agent_events_workstream_id');
      expect(sql).not.toContain('idx_agent_events_event_type');
      expect(sql).not.toContain('idx_agent_events_created_at');
    });

    it('B-3: workstream_id is TEXT PRIMARY KEY (not BIGSERIAL)', () => {
      expect(sql).toMatch(/workstream_id\s+TEXT\s+PRIMARY KEY/i);
      expect(sql).not.toMatch(/workstream_id\s+BIGSERIAL/i);
    });

    it('B-4: ALTER TABLE targets correct existing table names', () => {
      expect(sql).toMatch(/ALTER TABLE\s+(IF EXISTS\s+)?memory_entries/i);
      expect(sql).toMatch(/ALTER TABLE\s+(IF EXISTS\s+)?agent_events/i);
      expect(sql).not.toContain('memory_entry');
      expect(sql).not.toMatch(/agent_event\b/);
    });

    it('B-5: schema_migrations uses ON CONFLICT DO NOTHING', () => {
      expect(sql).toMatch(/INSERT INTO schema_migrations[\s\S]*?ON CONFLICT[\s\S]*?DO NOTHING/i);
    });

    it('B-6: time-based indexes use DESC ordering', () => {
      expect(sql).toMatch(/idx_ws_phase[\s\S]*?updated_at\s+DESC/i);
      expect(sql).toMatch(/idx_ae_created[\s\S]*?created_at\s+DESC/i);
    });

    // -----------------------------------------------------------------------
    // GOLDEN PATH TESTS
    // -----------------------------------------------------------------------

    it('G-1: workstreams CREATE TABLE IF NOT EXISTS present exactly once', () => {
      expect(sql.match(/CREATE TABLE IF NOT EXISTS workstreams/gi)?.length).toBe(1);
    });

    it('G-2: all 10 workstreams columns are present', () => {
      expect(sql).toContain('workstream_id');
      expect(sql).toContain('name');
      expect(sql).toContain('phase');
      expect(sql).toContain('gate_status');
      expect(sql).toContain('blocker');
      expect(sql).toContain('agent_id');
      expect(sql).toContain('synced_at');
      expect(sql).toMatch(/\bdata\s+JSONB/i);
      expect(sql).toMatch(/created_at\s+TIMESTAMPTZ\s+DEFAULT\s+NOW\(\)/i);
      expect(sql).toMatch(/updated_at\s+TIMESTAMPTZ\s+DEFAULT\s+NOW\(\)/i);
    });

    it('G-3: memory_entries new columns present', () => {
      expect(sql).toContain('version');
      expect(sql).toContain('file_path');
    });

    it('G-4: agent_events new columns present', () => {
      expect(sql).toContain('source_file');
      expect(sql).toContain('idempotency_key');
    });

    it('G-5: all 5 new index names present', () => {
      expect(sql).toContain('idx_ws_phase');
      expect(sql).toContain('idx_ws_blocker');
      expect(sql).toContain('idx_me_workstream_state');
      expect(sql).toContain('idx_ae_created');
      expect(sql).toContain('idx_ae_agent_created');
    });

    it('G-6: idx_ws_blocker WHERE clause restricts to non-null blocker', () => {
      expect(sql).toMatch(/idx_ws_blocker[\s\S]*?WHERE\s+blocker\s+IS\s+NOT\s+NULL/i);
    });

    it('G-7: idx_me_workstream_state has LIKE pattern WHERE clause', () => {
      expect(sql).toMatch(/idx_me_workstream_state[\s\S]*?WHERE\s+key\s+LIKE\s+'workstream-%-state'/i);
    });

    it('G-8: schema_migrations records version 2', () => {
      expect(sql).toMatch(/INSERT INTO schema_migrations[\s\S]*?VALUES\s*\(2\)/i);
    });

    it('G-9: file exists and is non-empty (>500 chars)', () => {
      expect(() => readFileSync(MIGRATION_PATH, 'utf-8')).not.toThrow();
      expect(sql.length).toBeGreaterThan(500);
    });
  }
);
