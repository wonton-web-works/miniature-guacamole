#!/usr/bin/env bats
# ============================================================================
# mg-memory-write-config.bats - Tests for mg-memory-write config-sourcing behavior (WS-DB-5)
# ============================================================================
# Test ordering: MISUSE CASES → BOUNDARY TESTS → GOLDEN PATH
# Coverage target: AC-DB-5.4, AC-DB-5.7, AC-DB-5.8
# ============================================================================

bats_require_minimum_version 1.5.0

setup() {
    # Test fixtures directory
    FIXTURES_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/fixtures" && pwd)"

    # Temporary test directory
    TEST_DIR="$(mktemp -d)"

    # Resolve project root (tests/scripts/ → project root)
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"

    # Create temporary .claude/scripts directory for testing
    TEST_CLAUDE_DIR="$TEST_DIR/.claude/scripts"
    mkdir -p "$TEST_CLAUDE_DIR"

    # Create fake bin dir for mocking psql
    FAKE_BIN="$TEST_DIR/bin"
    mkdir -p "$FAKE_BIN"

    # Copy all mg-* scripts from project to test directory
    cp "$PROJECT_ROOT"/src/framework/scripts/mg-* "$TEST_CLAUDE_DIR/" 2>/dev/null || true
    chmod +x "$TEST_CLAUDE_DIR"/mg-* 2>/dev/null || true

    SCRIPT_PATH="$TEST_CLAUDE_DIR/mg-memory-write"

    # Point mg-config at a test-local config dir — never touches real ~/.config
    export MG_CONFIG_DIR="$TEST_DIR/config/miniature-guacamole"
    mkdir -p "$MG_CONFIG_DIR"
    CONFIG_FILE="$MG_CONFIG_DIR/config.json"

    # Control file: if present, psql exits 1
    PSQL_FAIL_FILE="$TEST_DIR/psql_fail"

    # Log of all psql invocations
    PSQL_CALLS="$TEST_DIR/psql_calls"
    touch "$PSQL_CALLS"

    # Write the mock psql into FAKE_BIN
    cat > "$FAKE_BIN/psql" <<MOCK
#!/bin/sh
if [ -f "$PSQL_FAIL_FILE" ]; then
    echo "psql: connection refused" >&2
    exit 1
fi
echo "\$@" >> "$PSQL_CALLS"
exit 0
MOCK
    chmod +x "$FAKE_BIN/psql"

    # Ensure MG_POSTGRES_URL is unset by default — tests opt in explicitly
    unset MG_POSTGRES_URL
}

teardown() {
    if [[ -n "$TEST_DIR" && -d "$TEST_DIR" ]]; then
        rm -rf "$TEST_DIR"
    fi
}

# ============================================================================
# Helpers
# ============================================================================

# Inject fake bin first in PATH so our mock psql is found
_use_fake_bin() {
    export PATH="$FAKE_BIN:$PATH"
}

# Arm the psql fail control file
_psql_will_fail() {
    touch "$PSQL_FAIL_FILE"
}

# Disarm the psql fail control file
_psql_will_succeed() {
    rm -f "$PSQL_FAIL_FILE"
}

# Write a minimal valid config.json for testing
_write_config() {
    local postgres_url="${1:-postgresql://mg:mg@localhost:5432/mg_memory}"
    local storage_mode="${2:-postgres}"
    cat > "$CONFIG_FILE" <<JSON
{
  "postgres_url": "$postgres_url",
  "storage_mode": "$storage_mode",
  "auto_provision": true,
  "mg_version": ""
}
JSON
}

# ============================================================================
# MISUSE CASES — Error conditions, invalid config values
# ============================================================================

@test "mg-memory-write config: config postgres_url unreachable — script still exits 0 (non-fatal)" {
    # AC-DB-5.4 + non-fatal guarantee: config-sourced Postgres failure must not fail the write
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _write_config "postgresql://mg:mg@localhost:5432/mg_memory" "postgres"
    _use_fake_bin
    _psql_will_fail
    unset MG_POSTGRES_URL

    run "$SCRIPT_PATH" "$test_file" '.status = "updated"'
    [ "$status" -eq 0 ]
}

@test "mg-memory-write config: config postgres_url unreachable — file write still committed" {
    # AC-DB-5.4: file-first guarantee holds even when config-sourced Postgres fails
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _write_config "postgresql://mg:mg@localhost:5432/mg_memory" "postgres"
    _use_fake_bin
    _psql_will_fail
    unset MG_POSTGRES_URL

    run "$SCRIPT_PATH" "$test_file" '.status = "config_pg_fail_file_ok"'
    [ "$status" -eq 0 ]

    local result
    result=$(jq -r '.status' "$test_file")
    [[ "$result" == "config_pg_fail_file_ok" ]]
}

# ============================================================================
# BOUNDARY TESTS — storage_mode=file, env var vs config precedence
# ============================================================================

@test "mg-memory-write config: storage_mode=file in config — no psql call even with postgres_url set" {
    # AC-DB-5.8: storage_mode=file must suppress Postgres even if postgres_url is present
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _write_config "postgresql://mg:mg@localhost:5432/mg_memory" "file"
    _use_fake_bin
    _psql_will_succeed
    unset MG_POSTGRES_URL

    run "$SCRIPT_PATH" "$test_file" '.status = "updated"'
    [ "$status" -eq 0 ]

    # psql must NOT have been called
    [[ ! -s "$PSQL_CALLS" ]]
}

@test "mg-memory-write config: MG_POSTGRES_URL env set + storage_mode=file in config — env wins, psql IS called" {
    # AC-DB-5.8 + AC-DB-5.7: explicit env var overrides storage_mode=file suppression
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _write_config "postgresql://mg:mg@localhost:5432/mg_memory" "file"
    _use_fake_bin
    _psql_will_succeed
    export MG_POSTGRES_URL="postgresql://mg:mg@localhost:5432/mg_memory"

    run "$SCRIPT_PATH" "$test_file" '.status = "updated"'
    [ "$status" -eq 0 ]

    # psql MUST have been called (env var forces it regardless of storage_mode)
    [[ -s "$PSQL_CALLS" ]]
}

@test "mg-memory-write config: MG_POSTGRES_URL env overrides different config postgres_url" {
    # AC-DB-5.7: env var takes precedence over config value — the env URL is what's used
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    # Config has one URL, env has a different one
    _write_config "postgresql://config-host:5432/mg_memory" "postgres"
    _use_fake_bin
    _psql_will_succeed
    export MG_POSTGRES_URL="postgresql://env-host:5432/mg_memory"

    run "$SCRIPT_PATH" "$test_file" '.status = "updated"'
    [ "$status" -eq 0 ]

    # psql was called (dual-write active from env var)
    [[ -s "$PSQL_CALLS" ]]
    # The env URL (env-host) must appear in the psql args, not the config URL (config-host)
    grep -q "env-host" "$PSQL_CALLS"
}

@test "mg-memory-write config: no config file, no MG_POSTGRES_URL — file-only, exits 0" {
    # Boundary: if neither config nor env var is present, script must still work file-only
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    rm -f "$CONFIG_FILE"
    _use_fake_bin
    unset MG_POSTGRES_URL

    run "$SCRIPT_PATH" "$test_file" '.status = "no_config_file_only"'
    [ "$status" -eq 0 ]

    local result
    result=$(jq -r '.status' "$test_file")
    [[ "$result" == "no_config_file_only" ]]

    # psql must not have been invoked
    [[ ! -s "$PSQL_CALLS" ]]
}

# ============================================================================
# GOLDEN PATH — Config postgres_url used, env override, storage_mode behavior
# ============================================================================

@test "mg-memory-write config: config postgres_url used when MG_POSTGRES_URL not set" {
    # AC-DB-5.4: config must be the fallback source for postgres_url
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _write_config "postgresql://mg:mg@localhost:5432/mg_memory" "postgres"
    _use_fake_bin
    _psql_will_succeed
    unset MG_POSTGRES_URL

    run "$SCRIPT_PATH" "$test_file" '.status = "from_config"'
    [ "$status" -eq 0 ]

    # psql must have been called — sourced from config
    [[ -s "$PSQL_CALLS" ]]
}

@test "mg-memory-write config: config postgres_url sourced — file still written correctly" {
    # AC-DB-5.4: file-first guarantee holds when Postgres URL comes from config
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _write_config "postgresql://mg:mg@localhost:5432/mg_memory" "postgres"
    _use_fake_bin
    _psql_will_succeed
    unset MG_POSTGRES_URL

    run "$SCRIPT_PATH" "$test_file" '.phase = "verification"'
    [ "$status" -eq 0 ]

    local result
    result=$(jq -r '.phase' "$test_file")
    [[ "$result" == "verification" ]]
}

@test "mg-memory-write config: MG_POSTGRES_URL env takes precedence over config" {
    # AC-DB-5.7: env var wins — psql is called with the env URL, not the config URL
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    # Config has a URL (would trigger psql if used)
    _write_config "postgresql://config-fallback:5432/mg_memory" "postgres"
    _use_fake_bin
    _psql_will_succeed
    export MG_POSTGRES_URL="postgresql://env-override:5432/mg_memory"

    run "$SCRIPT_PATH" "$test_file" '.status = "env_wins"'
    [ "$status" -eq 0 ]

    # psql must have been invoked
    [[ -s "$PSQL_CALLS" ]]
    # Must use the env URL (env-override), not the config URL (config-fallback)
    grep -q "env-override" "$PSQL_CALLS"
    ! grep -q "config-fallback" "$PSQL_CALLS"
}

@test "mg-memory-write config: storage_mode=postgres in config — psql called using config url" {
    # AC-DB-5.4 + AC-DB-5.8: default storage_mode=postgres enables dual-write from config
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _write_config "postgresql://mg:mg@localhost:5432/mg_memory" "postgres"
    _use_fake_bin
    _psql_will_succeed
    unset MG_POSTGRES_URL

    run "$SCRIPT_PATH" "$test_file" '.coverage = 100'
    [ "$status" -eq 0 ]

    # Dual-write active via config
    [[ -s "$PSQL_CALLS" ]]

    # File also correct
    local result
    result=$(jq -r '.coverage' "$test_file")
    [[ "$result" == "100" ]]
}

@test "mg-memory-write config: config-sourced write — .bak backup still created" {
    # Regression: backup behavior must be unchanged when URL comes from config
    local test_file="$TEST_DIR/bak-check.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _write_config "postgresql://mg:mg@localhost:5432/mg_memory" "postgres"
    _use_fake_bin
    _psql_will_succeed
    unset MG_POSTGRES_URL

    run "$SCRIPT_PATH" "$test_file" '.status = "bak_with_config"'
    [ "$status" -eq 0 ]

    [[ -f "$test_file.bak" ]]
}
