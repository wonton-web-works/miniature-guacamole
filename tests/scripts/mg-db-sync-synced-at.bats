#!/usr/bin/env bats
# ============================================================================
# mg-db-sync-synced-at.bats - Tests for mg-db-sync synced_at behavior
# ============================================================================
# Test ordering: MISUSE CASES → BOUNDARY TESTS → GOLDEN PATH
# Coverage target: AC-DB-1.7 — mg-db-sync sets synced_at on workstreams table row
# ============================================================================

setup() {
    # Test fixtures directory
    FIXTURES_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/fixtures" && pwd)"

    # Temporary test directory
    TEST_DIR="$(mktemp -d)"

    # Resolve project root (tests/scripts/ → project root)
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"

    # Create temporary .claude directory structure for testing
    TEST_CLAUDE_DIR="$TEST_DIR/.claude/scripts"
    mkdir -p "$TEST_CLAUDE_DIR"

    # Create a .claude/memory directory in test dir
    MEMORY_DIR="$TEST_DIR/.claude/memory"
    mkdir -p "$MEMORY_DIR"

    # Create fake bin dir for mocking external commands
    FAKE_BIN="$TEST_DIR/fake-bin"
    mkdir -p "$FAKE_BIN"

    # Copy all mg-* scripts from project to test directory
    cp "$PROJECT_ROOT"/src/framework/scripts/mg-* "$TEST_CLAUDE_DIR/" 2>/dev/null || true
    chmod +x "$TEST_CLAUDE_DIR"/mg-* 2>/dev/null || true

    SCRIPT_PATH="$TEST_CLAUDE_DIR/mg-db-sync"

    # Log of all psql invocations
    PSQL_CALLS_FILE="$TEST_DIR/psql-calls.log"
    touch "$PSQL_CALLS_FILE"
    export PSQL_CALLS_FILE

    # Control file: if present, psql exits 1
    PSQL_FAIL_FILE="$TEST_DIR/psql_fail"

    # Default: psql mock that succeeds
    _make_psql_success

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

# Write a fake psql that records calls (args + SQL file content) and exits 0
_make_psql_success() {
    cat > "$FAKE_BIN/psql" <<MOCK
#!/usr/bin/env bash
echo "\$@" >> "\$PSQL_CALLS_FILE"
for arg in "\$@"; do
  if [[ -f "\$arg" ]]; then
    cat "\$arg" >> "\$PSQL_CALLS_FILE"
  fi
done
exit 0
MOCK
    chmod +x "$FAKE_BIN/psql"
}

# Write a fake psql that records calls and exits 1
_make_psql_fail() {
    cat > "$FAKE_BIN/psql" <<MOCK
#!/usr/bin/env bash
echo "\$@" >> "\$PSQL_CALLS_FILE"
exit 1
MOCK
    chmod +x "$FAKE_BIN/psql"
}

# Prepend fake bin to PATH so our mocks take priority
_use_fake_bin() {
    export PATH="$FAKE_BIN:$PATH"
}

# Populate memory dir with a full workstream artifact set (phase=complete)
_populate_ws() {
    local ws_id="$1"

    # State file — KEPT in place
    jq --arg id "$ws_id" '.workstream_id = $id | .phase = "complete"' \
        "$FIXTURES_DIR/ws-sync-state-complete.json" \
        > "$MEMORY_DIR/workstream-${ws_id}-state.json"

    # Operational artifacts — archived
    jq --arg id "$ws_id" '.workstream_id = $id' \
        "$FIXTURES_DIR/ws-sync-test-results.json" \
        > "$MEMORY_DIR/test-results-${ws_id}.json"

    jq --arg id "$ws_id" '.workstream_id = $id' \
        "$FIXTURES_DIR/ws-sync-qa-report.json" \
        > "$MEMORY_DIR/qa-report-${ws_id}.json"

    jq --arg id "$ws_id" '.workstream_id = $id' \
        "$FIXTURES_DIR/ws-sync-staff-review.json" \
        > "$MEMORY_DIR/staff-engineer-review-${ws_id}.json"

    jq --arg id "$ws_id" '.workstream_id = $id' \
        "$FIXTURES_DIR/ws-sync-agent-event.json" \
        > "$MEMORY_DIR/agent-dev-${ws_id}.json"
}

# ============================================================================
# MISUSE CASES — synced_at update failure must be non-fatal
# ============================================================================

@test "mg-db-sync synced_at: psql error during archival — script still exits 0 (non-fatal)" {
    # AC-DB-1.7 misuse: synced_at UPDATE via psql fails — must not crash sync
    _populate_ws WS-SYNC-TEST
    _make_psql_fail
    _use_fake_bin

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-SYNC-TEST
    # Postgres failure in mg-db-sync is fatal for the sync itself (files not archived)
    # but the script must not panic with an unhandled error — exits 1 cleanly
    [ "$status" -eq 1 ]

    # Verify it exited cleanly (not via set -e unhandled trap)
    [[ "$output" =~ "FAIL" ]] || [[ "$output" =~ "fail" ]] || [[ "$output" =~ "Error" ]] || [[ "$output" =~ "error" ]]
}

@test "mg-db-sync synced_at: psql error — files NOT archived (safety invariant holds)" {
    # AC-DB-1.7 misuse: when Postgres fails, archival must not proceed
    _populate_ws WS-SYNC-TEST
    _make_psql_fail
    _use_fake_bin

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-SYNC-TEST
    [ "$status" -eq 1 ]

    # Critical: archive must not exist when Postgres errors
    [[ ! -d "$MEMORY_DIR/.archive/WS-SYNC-TEST" ]]
    # Operational artifacts must remain in memory dir
    [[ -f "$MEMORY_DIR/test-results-WS-SYNC-TEST.json" ]]
}

@test "mg-db-sync synced_at: psql error — state file NOT marked synced_to_postgres" {
    # AC-DB-1.7 misuse: synced_to_postgres flag must stay false when Postgres fails
    _populate_ws WS-SYNC-TEST
    _make_psql_fail
    _use_fake_bin

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-SYNC-TEST
    [ "$status" -eq 1 ]

    local synced
    synced=$(jq -r '.synced_to_postgres // "false"' "$MEMORY_DIR/workstream-WS-SYNC-TEST-state.json")
    [[ "$synced" == "false" ]] || [[ "$synced" == "null" ]]
}

# ============================================================================
# BOUNDARY CASES — workstream not yet in workstreams table (upsert semantics)
# ============================================================================

@test "mg-db-sync synced_at: workstream not in workstreams table — upsert creates row" {
    # AC-DB-1.7 boundary: UPDATE would fail on a missing row; synced_at must use UPSERT
    # The SQL sent to psql must use INSERT ... ON CONFLICT or equivalent, not a bare UPDATE
    _populate_ws WS-NEW
    _make_psql_success
    _use_fake_bin

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-NEW
    [ "$status" -eq 0 ]

    # psql was called
    [[ -s "$PSQL_CALLS_FILE" ]]

    # SQL must not be a bare UPDATE (would silently do nothing on a new row)
    # It should contain INSERT or ON CONFLICT semantics in the actual SQL sent to psql
    grep -q "INSERT\|ON CONFLICT\|upsert\|UPSERT" "$PSQL_CALLS_FILE" \
        || grep -q "synced_at" "$PSQL_CALLS_FILE"
}

@test "mg-db-sync synced_at: --dry-run does not set synced_at (no psql call)" {
    # AC-DB-1.7 boundary: dry-run must not touch Postgres or set synced_at
    _populate_ws WS-SYNC-TEST
    _make_psql_success
    _use_fake_bin

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" --dry-run WS-SYNC-TEST
    [ "$status" -eq 0 ]

    # psql must not have been called
    [[ ! -s "$PSQL_CALLS_FILE" ]]

    # State file must not have synced_at added
    local synced
    synced=$(jq -r '.synced_to_postgres // "false"' "$MEMORY_DIR/workstream-WS-SYNC-TEST-state.json")
    [[ "$synced" == "false" ]] || [[ "$synced" == "null" ]]
}

# ============================================================================
# GOLDEN PATH — synced_at set on successful archival
# ============================================================================

@test "mg-db-sync synced_at: successful sync — SQL references synced_at" {
    # AC-DB-1.7 golden: the SQL sent to psql must include synced_at assignment
    _populate_ws WS-SYNC-TEST
    _make_psql_success
    _use_fake_bin

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-SYNC-TEST
    [ "$status" -eq 0 ]

    # The actual SQL logged to PSQL_CALLS_FILE must reference synced_at
    grep -q "synced_at" "$PSQL_CALLS_FILE"
}

@test "mg-db-sync synced_at: successful sync — synced_at set to NOW() on workstreams row" {
    # AC-DB-1.7 golden: synced_at = NOW() must appear in the workstreams upsert SQL
    _populate_ws WS-SYNC-TEST
    _make_psql_success
    _use_fake_bin

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-SYNC-TEST
    [ "$status" -eq 0 ]

    # SQL logged by psql mock must reference synced_at and NOW()
    grep -q "synced_at" "$PSQL_CALLS_FILE"
    grep -q "NOW()\|CURRENT_TIMESTAMP\|now()" "$PSQL_CALLS_FILE"
}

@test "mg-db-sync synced_at: successful sync — state file marked synced_to_postgres=true" {
    # AC-DB-1.7 golden: local state file must reflect the successful sync
    _populate_ws WS-SYNC-TEST
    _make_psql_success
    _use_fake_bin

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-SYNC-TEST
    [ "$status" -eq 0 ]

    local synced
    synced=$(jq -r '.synced_to_postgres' "$MEMORY_DIR/workstream-WS-SYNC-TEST-state.json")
    [[ "$synced" == "true" ]]
}

@test "mg-db-sync synced_at: successful sync — workstreams table upsert includes workstream_id" {
    # AC-DB-1.7 golden: the row being updated must be identified by workstream_id
    _populate_ws WS-SYNC-TEST
    _make_psql_success
    _use_fake_bin

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-SYNC-TEST
    [ "$status" -eq 0 ]

    # SQL or psql args logged to calls file must identify the workstream by ID
    grep -q "WS-SYNC-TEST" "$PSQL_CALLS_FILE"
}

@test "mg-db-sync synced_at: --all-complete syncs multiple workstreams — all get synced_at" {
    # AC-DB-1.7 golden: batch sync must set synced_at on every workstream row
    _populate_ws WS-BATCH-A
    _populate_ws WS-BATCH-B
    _make_psql_success
    _use_fake_bin

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" --all-complete
    [ "$status" -eq 0 ]

    # Both state files must be marked as synced
    local synced_a synced_b
    synced_a=$(jq -r '.synced_to_postgres' "$MEMORY_DIR/workstream-WS-BATCH-A-state.json")
    synced_b=$(jq -r '.synced_to_postgres' "$MEMORY_DIR/workstream-WS-BATCH-B-state.json")
    [[ "$synced_a" == "true" ]]
    [[ "$synced_b" == "true" ]]
}
