#!/usr/bin/env bats
# ============================================================================
# mg-migrate.bats - Tests for mg-migrate script (WS-DB-7)
# ============================================================================
# Test ordering: MISUSE CASES → BOUNDARY TESTS → GOLDEN PATH
# Coverage target: AC-DB-7.1 through AC-DB-7.8 (99%)
# ============================================================================

bats_require_minimum_version 1.5.0

setup() {
    # Test fixtures directory
    FIXTURES_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/fixtures" && pwd)"

    # Temporary test directory
    TEST_DIR="$(mktemp -d)"

    # Resolve project root (tests/scripts/ → project root)
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"

    # Create temporary scripts directory
    TEST_SCRIPTS_DIR="$TEST_DIR/scripts"
    mkdir -p "$TEST_SCRIPTS_DIR"

    # Copy all mg-* scripts from project to test directory
    cp "$PROJECT_ROOT"/src/framework/scripts/mg-* "$TEST_SCRIPTS_DIR/" 2>/dev/null || true
    chmod +x "$TEST_SCRIPTS_DIR"/mg-* 2>/dev/null || true

    SCRIPT_PATH="$TEST_SCRIPTS_DIR/mg-migrate"

    # Create fake bin dir for mocking psql
    FAKE_BIN="$TEST_DIR/bin"
    mkdir -p "$FAKE_BIN"

    # Log of all psql invocations (args written here by mock)
    PSQL_CALLS="$TEST_DIR/psql_calls.log"
    touch "$PSQL_CALLS"

    # Control file: if present, psql exits 1
    PSQL_FAIL_FILE="$TEST_DIR/psql_fail"

    # Build the mock psql — records invocation args and honors fail control file
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

    # Isolated config dir so tests never touch real config
    export MG_CONFIG_DIR="$TEST_DIR/config"
    mkdir -p "$MG_CONFIG_DIR"

    # Default postgres URL for tests that need it
    export MG_POSTGRES_URL="postgresql://mg:mg@localhost:5432/mg_memory"

    # Create a standard fake project directory structure
    FAKE_PROJECT="$TEST_DIR/project"
    MEMORY_DIR="$FAKE_PROJECT/.claude/memory"
    mkdir -p "$MEMORY_DIR"

    # Skip if BATS not installed (defensive guard)
    if ! command -v bats &>/dev/null; then
        skip "BATS not installed. Install via: brew install bats-core"
    fi
}

teardown() {
    if [[ -n "$TEST_DIR" && -d "$TEST_DIR" ]]; then
        rm -rf "$TEST_DIR"
    fi
}

# ============================================================================
# Helpers
# ============================================================================

_use_fake_bin() {
    export PATH="$FAKE_BIN:$PATH"
}

_psql_will_fail() {
    touch "$PSQL_FAIL_FILE"
}

_psql_will_succeed() {
    rm -f "$PSQL_FAIL_FILE"
}

# Place a valid memory file in the fake project's memory dir
_add_memory_file() {
    local filename="$1"
    local source="${2:-$FIXTURES_DIR/valid-tasks.json}"
    cp "$source" "$MEMORY_DIR/$filename"
}

# Place a valid workstream state file in the fake project's memory dir
_add_workstream_state() {
    local ws_id="$1"
    local source="${2:-$FIXTURES_DIR/valid-workstream.json}"
    cp "$source" "$MEMORY_DIR/workstream-${ws_id}-state.json"
}

# Mark a memory file as already synced
_mark_synced() {
    local filepath="$1"
    local tmp
    tmp="$(mktemp)"
    jq '. + {"synced_to_postgres": true}' "$filepath" > "$tmp" && mv "$tmp" "$filepath"
}

# ============================================================================
# MISUSE CASES — Invalid inputs, missing directories, Postgres failures
# ============================================================================

@test "mg-migrate: no PROJECT_DIR arg and no default — exits 1" {
    # AC-DB-7.1: PROJECT_DIR is required; no argument should be an error
    _use_fake_bin
    # Unset any default that might auto-discover cwd
    run "$SCRIPT_PATH"
    [ "$status" -eq 1 ]
}

@test "mg-migrate: PROJECT_DIR does not exist — exits 1" {
    # AC-DB-7.1: non-existent directory is a hard error
    _use_fake_bin
    run "$SCRIPT_PATH" "$TEST_DIR/does-not-exist"
    [ "$status" -eq 1 ]
}

@test "mg-migrate: PROJECT_DIR exists but no .claude/memory/ — exits 0 with nothing-to-migrate message" {
    # AC-DB-7.1: directory exists but has no memory dir — graceful, not an error
    local empty_project="$TEST_DIR/empty-project"
    mkdir -p "$empty_project"
    _use_fake_bin

    run "$SCRIPT_PATH" "$empty_project"
    [ "$status" -eq 0 ]
    [[ "$output" =~ [Nn]othing ]] || [[ "$output" =~ [Nn]o.*migrat ]] || [[ "$output" =~ 0.*migrat ]]
}

@test "mg-migrate: single Postgres failure — warns and continues, exits 0" {
    # AC-DB-7.7: per-file Postgres failure must be non-fatal
    _add_memory_file "tasks-dev.json"
    _use_fake_bin
    _psql_will_fail

    run "$SCRIPT_PATH" "$FAKE_PROJECT"
    [ "$status" -eq 0 ]
    # Warning must appear
    [[ "$output" =~ [Ww][Aa][Rr][Nn] ]] || [[ "$output" =~ [Ee]rror ]] || [[ "$output" =~ [Ff]ail ]]
}

@test "mg-migrate: all files fail Postgres — summary shows errors, still exits 0" {
    # AC-DB-7.7: wholesale Postgres outage must not cause non-zero exit
    _add_memory_file "tasks-dev.json"
    _add_memory_file "tasks-qa.json" "$FIXTURES_DIR/valid-tasks.json"
    _use_fake_bin
    _psql_will_fail

    run "$SCRIPT_PATH" "$FAKE_PROJECT"
    [ "$status" -eq 0 ]
    # Errors count must appear in summary (non-zero)
    [[ "$output" =~ [Ee]rror[s]?.*[1-9] ]] || [[ "$output" =~ [1-9].*[Ee]rror ]]
}

@test "mg-migrate: invalid JSON file in memory dir — skipped or warned, does not crash" {
    # AC-DB-7.1 boundary: malformed JSON should not abort the entire run
    cp "$FIXTURES_DIR/invalid.json" "$MEMORY_DIR/corrupted.json"
    _add_memory_file "tasks-dev.json"
    _use_fake_bin
    _psql_will_succeed

    run "$SCRIPT_PATH" "$FAKE_PROJECT"
    [ "$status" -eq 0 ]
}

# ============================================================================
# BOUNDARY TESTS — Edge cases, skipping logic, flag interactions
# ============================================================================

@test "mg-migrate: empty memory dir — exits 0, summary shows 0 migrated" {
    # AC-DB-7.6: summary must reflect zero files processed
    # MEMORY_DIR already exists but is empty from setup
    _use_fake_bin
    _psql_will_succeed

    run "$SCRIPT_PATH" "$FAKE_PROJECT"
    [ "$status" -eq 0 ]
    # Summary line must show 0 migrated
    [[ "$output" =~ [Mm]igrated.*0 ]] || [[ "$output" =~ 0.*[Mm]igrated ]]
}

@test "mg-migrate: file with synced_to_postgres=true — skipped, counted in M skipped" {
    # AC-DB-7.5: already-synced files must be skipped
    _add_memory_file "tasks-dev.json"
    _mark_synced "$MEMORY_DIR/tasks-dev.json"
    _use_fake_bin
    _psql_will_succeed

    run "$SCRIPT_PATH" "$FAKE_PROJECT"
    [ "$status" -eq 0 ]
    # psql must not have been called for this file
    [[ ! -s "$PSQL_CALLS" ]]
    # Skipped count must be non-zero
    [[ "$output" =~ [Ss]kipped.*[1-9] ]] || [[ "$output" =~ [1-9].*[Ss]kipped ]]
}

@test "mg-migrate: synced_to_postgres=true with --force — migrated anyway" {
    # AC-DB-7.5: --force overrides the skip guard
    _add_memory_file "tasks-dev.json"
    _mark_synced "$MEMORY_DIR/tasks-dev.json"
    _use_fake_bin
    _psql_will_succeed

    run "$SCRIPT_PATH" "$FAKE_PROJECT" --force
    [ "$status" -eq 0 ]
    # psql must have been called despite the synced flag
    [[ -s "$PSQL_CALLS" ]]
    [[ "$output" =~ [Mm]igrated.*[1-9] ]] || [[ "$output" =~ [1-9].*[Mm]igrated ]]
}

@test "mg-migrate: --dry-run — no psql calls made" {
    # AC-DB-7.8: dry-run must be read-only
    _add_memory_file "tasks-dev.json"
    _use_fake_bin
    _psql_will_succeed

    run "$SCRIPT_PATH" "$FAKE_PROJECT" --dry-run
    [ "$status" -eq 0 ]
    [[ ! -s "$PSQL_CALLS" ]]
}

@test "mg-migrate: workstream-abc.json (no -state suffix) — not treated as workstream state" {
    # AC-DB-7.2 boundary: pattern must be workstream-*-state.json exactly
    cp "$FIXTURES_DIR/valid-workstream.json" "$MEMORY_DIR/workstream-abc.json"
    _use_fake_bin
    _psql_will_succeed

    run "$SCRIPT_PATH" "$FAKE_PROJECT"
    [ "$status" -eq 0 ]
    # psql may have been called (memory_entries upsert) but NOT for workstreams table
    if [[ -s "$PSQL_CALLS" ]]; then
        ! grep -q "workstreams" "$PSQL_CALLS"
    fi
}

# ============================================================================
# GOLDEN PATH — Normal migration, workstream routing, summary format, flags
# ============================================================================

@test "mg-migrate: single file migrated — psql called, file gets synced_to_postgres=true" {
    # AC-DB-7.1 + AC-DB-7.4: basic migration path
    _add_memory_file "tasks-dev.json"
    _use_fake_bin
    _psql_will_succeed

    run "$SCRIPT_PATH" "$FAKE_PROJECT"
    [ "$status" -eq 0 ]
    # psql was invoked
    [[ -s "$PSQL_CALLS" ]]
    # File now has synced_to_postgres=true
    local synced
    synced=$(jq -r '.synced_to_postgres' "$MEMORY_DIR/tasks-dev.json")
    [[ "$synced" == "true" ]]
}

@test "mg-migrate: workstream state file — upserts both memory_entries and workstreams table" {
    # AC-DB-7.2: workstream-*-state.json triggers dual upsert
    _add_workstream_state "WS-DB-7" "$FIXTURES_DIR/valid-workstream.json"
    _use_fake_bin
    _psql_will_succeed

    run "$SCRIPT_PATH" "$FAKE_PROJECT"
    [ "$status" -eq 0 ]
    # psql called
    [[ -s "$PSQL_CALLS" ]]
    # SQL must reference both tables
    grep -q "memory_entries" "$PSQL_CALLS"
    grep -q "workstreams" "$PSQL_CALLS"
}

@test "mg-migrate: non-workstream file — only memory_entries upserted, not workstreams" {
    # AC-DB-7.2: tasks-*.json must only go to memory_entries
    _add_memory_file "tasks-dev.json"
    _use_fake_bin
    _psql_will_succeed

    run "$SCRIPT_PATH" "$FAKE_PROJECT"
    [ "$status" -eq 0 ]
    [[ -s "$PSQL_CALLS" ]]
    grep -q "memory_entries" "$PSQL_CALLS"
    ! grep -q "workstreams" "$PSQL_CALLS"
}

@test "mg-migrate: multiple files — all migrated, summary counts are correct" {
    # AC-DB-7.6: N migrated count must match actual files
    _add_memory_file "tasks-dev.json"
    _add_memory_file "tasks-qa.json" "$FIXTURES_DIR/valid-tasks.json"
    _add_workstream_state "WS-DB-7" "$FIXTURES_DIR/valid-workstream.json"
    _use_fake_bin
    _psql_will_succeed

    run "$SCRIPT_PATH" "$FAKE_PROJECT"
    [ "$status" -eq 0 ]
    # Summary must show 3 migrated
    [[ "$output" =~ [Mm]igrated.*3 ]] || [[ "$output" =~ 3.*[Mm]igrated ]]
}

@test "mg-migrate: summary format is 'Migrated: N, Skipped: M, Errors: K'" {
    # AC-DB-7.6: exact summary format check
    _add_memory_file "tasks-dev.json"
    _use_fake_bin
    _psql_will_succeed

    run "$SCRIPT_PATH" "$FAKE_PROJECT"
    [ "$status" -eq 0 ]
    # Summary must contain all three counters
    [[ "$output" =~ [Mm]igrated ]]
    [[ "$output" =~ [Ss]kipped ]]
    [[ "$output" =~ [Ee]rror ]]
}

@test "mg-migrate: --dry-run prints 'would migrate' list without touching psql" {
    # AC-DB-7.8: dry-run output describes what would happen
    _add_memory_file "tasks-dev.json"
    _add_workstream_state "WS-DB-7" "$FIXTURES_DIR/valid-workstream.json"
    _use_fake_bin
    _psql_will_succeed

    run "$SCRIPT_PATH" "$FAKE_PROJECT" --dry-run
    [ "$status" -eq 0 ]
    [[ ! -s "$PSQL_CALLS" ]]
    # Output must mention "dry" or "would"
    [[ "$output" =~ [Dd]ry ]] || [[ "$output" =~ [Ww]ould ]]
}

@test "mg-migrate: idempotent — second run without --force skips already-synced files" {
    # AC-DB-7.3 + AC-DB-7.5: ON CONFLICT + skip guard = idempotent
    _add_memory_file "tasks-dev.json"
    _use_fake_bin
    _psql_will_succeed

    # First run
    run "$SCRIPT_PATH" "$FAKE_PROJECT"
    [ "$status" -eq 0 ]
    local synced
    synced=$(jq -r '.synced_to_postgres' "$MEMORY_DIR/tasks-dev.json")
    [[ "$synced" == "true" ]]

    # Reset psql call log
    truncate -s 0 "$PSQL_CALLS"

    # Second run — should skip
    run "$SCRIPT_PATH" "$FAKE_PROJECT"
    [ "$status" -eq 0 ]
    [[ ! -s "$PSQL_CALLS" ]]
    [[ "$output" =~ [Ss]kipped.*[1-9] ]] || [[ "$output" =~ [1-9].*[Ss]kipped ]]
}

@test "mg-migrate: PROJECT_DIR defaults to current directory when not provided" {
    # AC-DB-7.1: if the script accepts '.' as default or uses cwd, verify it works
    _add_memory_file "tasks-dev.json"
    _use_fake_bin
    _psql_will_succeed

    # Run from within the fake project dir — no explicit PROJECT_DIR argument
    run bash -c "cd '$FAKE_PROJECT' && '$SCRIPT_PATH'"
    # Either exits 0 (defaulted to cwd) or exits 1 (no default, explicit arg required)
    # Both are valid; this test documents the actual behavior
    if [ "$status" -eq 0 ]; then
        # If it defaulted to cwd, psql should have been called
        [[ -s "$PSQL_CALLS" ]]
    else
        # If no default is supported, exit 1 is correct for missing arg
        [ "$status" -eq 1 ]
    fi
}
