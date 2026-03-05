BEGIN;

-- ============================================================================
-- 002-dashboard-schema.sql - Dashboard schema additions
-- ============================================================================
-- Idempotent: safe to run multiple times (IF NOT EXISTS on all objects).
-- Adds workstreams table, extends memory_entries and agent_events,
-- and creates indexes for dashboard query patterns.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- workstreams - dashboard state table for workstream tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workstreams (
  workstream_id  TEXT PRIMARY KEY,
  name           TEXT,
  phase          TEXT NOT NULL DEFAULT 'planning',
  gate_status    TEXT,
  blocker        TEXT,
  agent_id       TEXT,
  data           JSONB,
  synced_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Index for dashboard phase filtering sorted by most-recently updated
CREATE INDEX IF NOT EXISTS idx_ws_phase
  ON workstreams (phase, updated_at DESC);

-- Partial index covering only workstreams with an active blocker
CREATE INDEX IF NOT EXISTS idx_ws_blocker
  ON workstreams (updated_at DESC)
  WHERE blocker IS NOT NULL;

-- ---------------------------------------------------------------------------
-- memory_entries - new columns for sync versioning and file tracking
-- ---------------------------------------------------------------------------
ALTER TABLE memory_entries
  ADD COLUMN IF NOT EXISTS version   BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Partial index targeting workstream state keys for fast dashboard lookups
CREATE INDEX IF NOT EXISTS idx_me_workstream_state
  ON memory_entries ((data->>'phase'), updated_at DESC)
  WHERE key LIKE 'workstream-%-state';

-- ---------------------------------------------------------------------------
-- agent_events - new columns for source attribution and idempotency
-- ---------------------------------------------------------------------------
ALTER TABLE agent_events
  ADD COLUMN IF NOT EXISTS source_file      TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key  TEXT;

-- Partial unique index to prevent duplicate events via idempotency_key
CREATE UNIQUE INDEX IF NOT EXISTS idx_ae_idempotency
  ON agent_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Index for time-ordered event queries
CREATE INDEX IF NOT EXISTS idx_ae_created
  ON agent_events (created_at DESC);

-- Compound index for per-agent time-ordered queries
CREATE INDEX IF NOT EXISTS idx_ae_agent_created
  ON agent_events (agent_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Schema version tracking
-- ---------------------------------------------------------------------------
INSERT INTO schema_migrations (version)
VALUES (2)
ON CONFLICT (version) DO NOTHING;

COMMIT;
