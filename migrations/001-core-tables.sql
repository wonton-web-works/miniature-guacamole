-- ============================================================================
-- 001-core-tables.sql - Core schema for miniature-guacamole Postgres storage
-- ============================================================================
-- Idempotent: safe to run multiple times (IF NOT EXISTS on all objects).
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
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id     TEXT        NOT NULL,
    workstream_id  TEXT        NOT NULL,
    entry_type     TEXT        NOT NULL,
    agent_id       TEXT,
    -- key retained for compatibility with 002-dashboard-schema.sql index predicate
    key            TEXT,
    data           JSONB       NOT NULL,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_entries_project
    ON memory_entries (project_id);

CREATE INDEX IF NOT EXISTS idx_memory_entries_workstream
    ON memory_entries (workstream_id);

-- ---------------------------------------------------------------------------
-- agent_events - append-only event log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_events (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id     TEXT        NOT NULL,
    workstream_id  TEXT,
    event_type     TEXT        NOT NULL,
    agent_id       TEXT        NOT NULL,
    data           JSONB,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_events_project
    ON agent_events (project_id);

COMMIT;
