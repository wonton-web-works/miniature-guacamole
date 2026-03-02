-- ============================================================================
-- 001-core-tables.sql - Core schema for miniature-guacamole Postgres storage
-- ============================================================================
-- Idempotent: safe to run multiple times (IF NOT EXISTS on all objects).
-- Matches the schema expected by enterprise/src/storage/postgres-adapter.ts.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Schema version tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
    version   INTEGER PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Record this migration (skip if already applied)
INSERT INTO schema_migrations (version)
VALUES (1)
ON CONFLICT (version) DO NOTHING;

-- ---------------------------------------------------------------------------
-- memory_entries - primary CRUD table for agent memory
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memory_entries (
    key            TEXT PRIMARY KEY,
    agent_id       TEXT NOT NULL,
    workstream_id  TEXT NOT NULL,
    timestamp      TIMESTAMPTZ NOT NULL,
    data           JSONB NOT NULL,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_entries_agent_id
    ON memory_entries (agent_id);

CREATE INDEX IF NOT EXISTS idx_memory_entries_workstream_id
    ON memory_entries (workstream_id);

CREATE INDEX IF NOT EXISTS idx_memory_entries_timestamp
    ON memory_entries (timestamp);

-- ---------------------------------------------------------------------------
-- agent_events - append-only event log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_events (
    id             BIGSERIAL PRIMARY KEY,
    agent_id       TEXT NOT NULL,
    workstream_id  TEXT NOT NULL,
    event_type     TEXT NOT NULL,
    payload        JSONB NOT NULL,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_events_agent_id
    ON agent_events (agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_events_workstream_id
    ON agent_events (workstream_id);

CREATE INDEX IF NOT EXISTS idx_agent_events_event_type
    ON agent_events (event_type);

CREATE INDEX IF NOT EXISTS idx_agent_events_created_at
    ON agent_events (created_at);

COMMIT;
