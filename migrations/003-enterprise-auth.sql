BEGIN;

-- ============================================================================
-- 003-enterprise-auth.sql
-- Enterprise auth and licensing schema for miniature-guacamole / PrivateEnterprise
-- ============================================================================
-- Idempotent: safe to run multiple times (IF NOT EXISTS on all objects).
-- Mirrors the Prisma schema at dashboard/prisma/schema.prisma exactly.
-- Use this file in environments that connect to Postgres directly without
-- running Prisma migrate (e.g. Docker init scripts, CI fixtures, bare psql).
--
-- Requires: pgcrypto extension for gen_random_uuid().
-- Enable once per database: CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- organizations
-- A tenant. Identified by a URL-safe slug. Each org may hold one License.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
    id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name       TEXT        NOT NULL,
    slug       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT organizations_slug_unique UNIQUE (slug)
);

COMMENT ON TABLE organizations IS
    'Tenant table. Each organization is one paying customer or team.';
COMMENT ON COLUMN organizations.slug IS
    'URL-safe unique identifier used in license files and API paths. '
    'Format: lower-kebab-case, e.g. "acme-corp".';

-- ---------------------------------------------------------------------------
-- users
-- An authenticated individual within an Organization.
-- Passwords are stored as bcrypt hashes — never plaintext.
-- role: "admin" can manage the org; "member" is read-only.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    email         TEXT        NOT NULL,
    name          TEXT,
    password_hash TEXT        NOT NULL,
    org_id        TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'member',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_email_unique  UNIQUE (email),
    CONSTRAINT users_org_id_fk     FOREIGN KEY (org_id)
        REFERENCES organizations (id),
    CONSTRAINT users_role_check    CHECK (role IN ('admin', 'member'))
);

COMMENT ON TABLE users IS
    'Authenticated individuals. Scoped to exactly one Organization via org_id.';
COMMENT ON COLUMN users.password_hash IS
    'bcrypt hash (cost ≥ 12). Never store plaintext.';
COMMENT ON COLUMN users.role IS
    'admin: can manage org settings and licenses. member: read-only access.';

CREATE INDEX IF NOT EXISTS idx_users_org_id
    ON users (org_id);

CREATE INDEX IF NOT EXISTS idx_users_email
    ON users (email);

-- ---------------------------------------------------------------------------
-- licenses
-- Enterprise entitlement record. One org may hold at most one license (orgId
-- is UNIQUE). tier: starter | team | enterprise. features is a text array
-- containing the authoritative list of licensed feature keys.
--
-- Known feature keys:
--   sage, selective-routing, session-management,
--   research-specialists, drift-enforcement,
--   cmo-enterprise, cfo-enterprise
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS licenses (
    id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    org_id        TEXT        NOT NULL,
    tier          TEXT        NOT NULL,
    seats         INTEGER     NOT NULL,
    features      TEXT[]      NOT NULL DEFAULT '{}',
    issued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMPTZ NOT NULL,
    active        BOOLEAN     NOT NULL DEFAULT TRUE,
    revoked_at    TIMESTAMPTZ,
    revoke_reason TEXT,

    CONSTRAINT licenses_org_id_unique UNIQUE (org_id),
    CONSTRAINT licenses_org_id_fk     FOREIGN KEY (org_id)
        REFERENCES organizations (id),
    CONSTRAINT licenses_tier_check    CHECK (tier IN ('starter', 'team', 'enterprise')),
    CONSTRAINT licenses_seats_positive CHECK (seats > 0)
);

COMMENT ON TABLE licenses IS
    'Enterprise entitlement records. One license per organization. '
    'The features array is authoritative at validation time — tier is informational.';
COMMENT ON COLUMN licenses.features IS
    'Explicit list of licensed feature keys. Validation checks membership in this array. '
    'A team license with "sage" here is valid for Sage use regardless of tier.';
COMMENT ON COLUMN licenses.active IS
    'FALSE after revocation. Expired-but-not-revoked licenses retain active=TRUE; '
    'expiry is enforced via expires_at at validation time.';

CREATE INDEX IF NOT EXISTS idx_licenses_org_id
    ON licenses (org_id);

-- Partial index for active-license lookups with expiry filtering.
-- Most license queries filter on active=TRUE and check expires_at.
CREATE INDEX IF NOT EXISTS idx_licenses_active_expires
    ON licenses (active, expires_at)
    WHERE active = TRUE;

-- ---------------------------------------------------------------------------
-- sessions
-- CLI auth tokens. Scoped to a User. Deleted when the user is deleted
-- (ON DELETE CASCADE). machineId is the first 16 hex chars of
-- SHA-256(hostname::username::platform::arch::homedir).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id    TEXT        NOT NULL,
    token      TEXT        NOT NULL,
    machine_id TEXT,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT sessions_token_unique UNIQUE (token),
    CONSTRAINT sessions_user_id_fk   FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
);

COMMENT ON TABLE sessions IS
    'CLI authentication tokens. Scoped to a user. '
    'Cascade-deleted when the parent user is removed.';
COMMENT ON COLUMN sessions.token IS
    'Opaque bearer token. Stored as-is; callers must treat it as a secret.';
COMMENT ON COLUMN sessions.machine_id IS
    'First 16 hex chars of SHA-256(hostname::username::platform::arch::homedir). '
    'Used for soft machine binding — not cryptographically enforced by default.';
COMMENT ON COLUMN sessions.user_agent IS
    'CLI version string, e.g. "teo/0.4.0 darwin-arm64". Informational only.';

CREATE INDEX IF NOT EXISTS idx_sessions_user_id
    ON sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_token
    ON sessions (token);

-- Partial index for expiry sweeps — only unexpired, unrevoked sessions.
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
    ON sessions (expires_at)
    WHERE revoked_at IS NULL;

-- ---------------------------------------------------------------------------
-- audit_logs
-- Immutable append-only record of security-relevant events. userId and orgId
-- are nullable to support unauthenticated events (e.g. failed login attempts).
--
-- Known action values:
--   login, logout, upgrade, download_sage,
--   revoke_license, revoke_session, license_issued
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id    TEXT,
    org_id     TEXT,
    action     TEXT        NOT NULL,
    details    JSONB,
    ip         TEXT,
    machine_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

    -- Intentionally no FK on user_id/org_id: audit records must survive
    -- user/org deletion. Do not add FK constraints here.
);

COMMENT ON TABLE audit_logs IS
    'Immutable append-only security event log. '
    'No foreign keys on user_id/org_id — records must outlive the referenced rows.';
COMMENT ON COLUMN audit_logs.details IS
    'Arbitrary JSONB metadata for the action. '
    'Examples: {tier: "enterprise"} for upgrade, {reason: "expired"} for revoke.';

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
    ON audit_logs (user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id
    ON audit_logs (org_id)
    WHERE org_id IS NOT NULL;

-- Compound index for action-type reporting with time ordering.
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created
    ON audit_logs (action, created_at DESC);

-- ---------------------------------------------------------------------------
-- Schema version tracking
-- ---------------------------------------------------------------------------
INSERT INTO schema_migrations (version)
VALUES (3)
ON CONFLICT (version) DO NOTHING;

COMMIT;
