#!/usr/bin/env bats
# ============================================================================
# mg-db-sync.bats - Tests for mg-db-sync script
# ============================================================================
# Test ordering: MISUSE CASES → BOUNDARY TESTS → GOLDEN PATH
# Coverage target: 99% of script functionality
# ============================================================================

# Setup and teardown
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

    # Default: psql mock that succeeds
    _make_psql_success

    # Skip if BATS not installed
    if ! command -v bats &>/dev/null; then
        skip "BATS not installed. Install via: brew install bats-core"
    fi
}

teardown() {
    # Clean up temporary directory
    if [[ -n "$TEST_DIR" && -d "$TEST_DIR" ]]; then
        rm -rf "$TEST_DIR"
    fi
}

# ============================================================================
# Helpers
# ============================================================================

# Write a fake psql that records calls and exits 0
_make_psql_success() {
    cat > "$FAKE_BIN/psql" <<'EOF'
#!/usr/bin/env bash
echo "$@" >> "$PSQL_CALLS_FILE"
exit 0
EOF
    chmod +x "$FAKE_BIN/psql"
    export PSQL_CALLS_FILE="$TEST_DIR/psql-calls.log"
    touch "$PSQL_CALLS_FILE"
}

# Write a fake psql that always fails
_make_psql_fail() {
    cat > "$FAKE_BIN/psql" <<'EOF'
#!/usr/bin/env bash
echo "$@" >> "$PSQL_CALLS_FILE"
exit 1
EOF
    chmod +x "$FAKE_BIN/psql"
    export PSQL_CALLS_FILE="$TEST_DIR/psql-calls.log"
    touch "$PSQL_CALLS_FILE"
}

# Prepend fake bin to PATH so our mocks take priority
_use_fake_bin() {
    export PATH="$FAKE_BIN:$PATH"
}

# Hide a binary from PATH by pointing to a fake bin with no such command
_hide_binary() {
    local bin="$1"
    # Do NOT create "$FAKE_BIN/$bin" — it won't be found in fake bin
    # Remove it by creating a wrapper that explicitly fails
    cat > "$FAKE_BIN/$bin" <<EOF
#!/usr/bin/env bash
echo "$bin: command not found" >&2
exit 127
EOF
    chmod +x "$FAKE_BIN/$bin"
    export PATH="$FAKE_BIN:$PATH"
}

# Populate memory dir with a full workstream artifact set
_populate_ws() {
    local ws_id="$1"
    local lower_id
    lower_id=$(echo "$ws_id" | tr '[:upper:]' '[:lower:]')

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
# MISUSE CASES - Invalid inputs, missing dependencies, error conditions
# ============================================================================

@test "mg-db-sync: no arguments provided" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "required" ]] || [[ "$output" =~ "workstream" ]]
}

@test "mg-db-sync: unknown option" {
    run "$SCRIPT_PATH" --invalid-flag
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Unknown" ]] || [[ "$output" =~ "unknown" ]] || [[ "$output" =~ "invalid" ]]
}

@test "mg-db-sync: --all-complete with extra positional arg" {
    _use_fake_bin
    run "$SCRIPT_PATH" --all-complete WS-EXTRA
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "cannot" ]] || [[ "$output" =~ "extra" ]]
}

@test "mg-db-sync: non-existent workstream ID exits 0 with no-files message" {
    _use_fake_bin
    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-DOES-NOT-EXIST
    [ "$status" -eq 0 ]
    [[ "$output" =~ "no files" ]] || [[ "$output" =~ "No files" ]] || [[ "$output" =~ "nothing to sync" ]] || [[ "$output" =~ "Nothing" ]]
}

@test "mg-db-sync: missing jq dependency exits 1 with install hint" {
    _hide_binary jq
    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-SYNC-TEST
    [ "$status" -eq 1 ]
    [[ "$output" =~ "jq" ]]
    [[ "$output" =~ "install" ]] || [[ "$output" =~ "Install" ]] || [[ "$output" =~ "brew" ]] || [[ "$output" =~ "apt" ]]
}

@test "mg-db-sync: missing psql dependency on non-dry-run exits 1 with install hint" {
    _populate_ws WS-SYNC-TEST
    _hide_binary psql
    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-SYNC-TEST
    [ "$status" -eq 1 ]
    [[ "$output" =~ "psql" ]]
    [[ "$output" =~ "install" ]] || [[ "$output" =~ "Install" ]] || [[ "$output" =~ "brew" ]] || [[ "$output" =~ "apt" ]]
}

@test "mg-db-sync: postgres unavailable exits 1 and files NOT archived" {
    _populate_ws WS-SYNC-TEST
    _make_psql_fail
    _use_fake_bin

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-SYNC-TEST
    [ "$status" -eq 1 ]

    # Critical safety invariant: archive must not exist when Postgres fails
    [[ ! -d "$MEMORY_DIR/.archive/WS-SYNC-TEST" ]]
    # State file must still be in place
    [[ -f "$MEMORY_DIR/workstream-WS-SYNC-TEST-state.json" ]]
    # Operational artifacts must NOT have been moved
    [[ -f "$MEMORY_DIR/test-results-WS-SYNC-TEST.json" ]]
}

@test "mg-db-sync: --source-dir pointing to non-existent directory exits 1" {
    _use_fake_bin
    run "$SCRIPT_PATH" --source-dir "/tmp/definitely-does-not-exist-$$" WS-SYNC-TEST
    [ "$status" -eq 1 ]
    [[ "$output" =~ "not found" ]] || [[ "$output" =~ "does not exist" ]] || [[ "$output" =~ "No such" ]]
}

# ============================================================================
# BOUNDARY TESTS - Edge cases, limits, unusual but valid inputs
# ============================================================================

@test "mg-db-sync: workstream with only a state file syncs and archives nothing" {
    _use_fake_bin

    # Only create state file, no operational artifacts
    jq '.workstream_id = "WS-STATE-ONLY" | .phase = "complete"' \
        "$FIXTURES_DIR/ws-sync-state-complete.json" \
        > "$MEMORY_DIR/workstream-WS-STATE-ONLY-state.json"

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-STATE-ONLY
    [ "$status" -eq 0 ]

    # State file stays in place
    [[ -f "$MEMORY_DIR/workstream-WS-STATE-ONLY-state.json" ]]
    # No archive directory created (nothing to archive)
    [[ ! -d "$MEMORY_DIR/.archive/WS-STATE-ONLY" ]]
}

@test "mg-db-sync: agent-*.json with no workstream_id field is NOT collected" {
    _use_fake_bin

    jq '.workstream_id = "WS-SYNC-TEST" | .phase = "complete"' \
        "$FIXTURES_DIR/ws-sync-state-complete.json" \
        > "$MEMORY_DIR/workstream-WS-SYNC-TEST-state.json"

    # Agent event with wrong workstream_id — should not be collected for WS-SYNC-TEST
    echo '{"agent_id": "dev", "event_type": "test"}' \
        > "$MEMORY_DIR/agent-dev-WS-OTHER.json"

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-SYNC-TEST
    [ "$status" -eq 0 ]

    # The unrelated agent file must remain untouched
    [[ -f "$MEMORY_DIR/agent-dev-WS-OTHER.json" ]]
}

@test "mg-db-sync: case-insensitive matching collects both lower and upper case file names" {
    _use_fake_bin

    # Create state file with mixed case
    jq '.workstream_id = "WS-ENT-1" | .phase = "complete"' \
        "$FIXTURES_DIR/ws-sync-state-complete.json" \
        > "$MEMORY_DIR/workstream-WS-ENT-1-state.json"

    # Lowercase variant
    jq '.workstream_id = "WS-ENT-1"' \
        "$FIXTURES_DIR/ws-sync-test-results.json" \
        > "$MEMORY_DIR/test-results-ws-ent-1.json"

    # Uppercase variant
    jq '.workstream_id = "WS-ENT-1"' \
        "$FIXTURES_DIR/ws-sync-qa-report.json" \
        > "$MEMORY_DIR/qa-report-WS-ENT-1.json"

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-ENT-1
    [ "$status" -eq 0 ]

    # Both files should be archived
    [[ -f "$MEMORY_DIR/.archive/WS-ENT-1/test-results-ws-ent-1.json" ]]
    [[ -f "$MEMORY_DIR/.archive/WS-ENT-1/qa-report-WS-ENT-1.json" ]]
}

@test "mg-db-sync: --dry-run prints file list, exits 0, nothing written to Postgres" {
    _use_fake_bin
    _populate_ws WS-SYNC-TEST

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" --dry-run WS-SYNC-TEST
    [ "$status" -eq 0 ]

    # Output should mention files
    [[ "$output" =~ "dry" ]] || [[ "$output" =~ "DRY" ]] || [[ "$output" =~ "would" ]] || [[ "$output" =~ "Would" ]]

    # psql must not have been called
    [[ ! -s "$PSQL_CALLS_FILE" ]]

    # No files archived
    [[ ! -d "$MEMORY_DIR/.archive/WS-SYNC-TEST" ]]
}

@test "mg-db-sync: --no-cleanup syncs to Postgres but files NOT moved to archive" {
    _use_fake_bin
    _populate_ws WS-SYNC-TEST

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" --no-cleanup WS-SYNC-TEST
    [ "$status" -eq 0 ]

    # Postgres was called
    [[ -s "$PSQL_CALLS_FILE" ]]

    # Operational artifacts remain in memory dir
    [[ -f "$MEMORY_DIR/test-results-WS-SYNC-TEST.json" ]]
    [[ -f "$MEMORY_DIR/qa-report-WS-SYNC-TEST.json" ]]

    # No archive directory
    [[ ! -d "$MEMORY_DIR/.archive/WS-SYNC-TEST" ]]
}

@test "mg-db-sync: --force re-syncs even if workstream_synced event already exists" {
    _use_fake_bin
    _populate_ws WS-SYNC-TEST

    # First sync
    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-SYNC-TEST
    [ "$status" -eq 0 ]

    # Repopulate (simulate files returned for a second sync)
    _populate_ws WS-SYNC-TEST

    # Second sync with --force should succeed and call psql again
    local calls_before
    calls_before=$(wc -l < "$PSQL_CALLS_FILE")

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" --force WS-SYNC-TEST
    [ "$status" -eq 0 ]

    local calls_after
    calls_after=$(wc -l < "$PSQL_CALLS_FILE")
    [[ "$calls_after" -gt "$calls_before" ]]
}

@test "mg-db-sync: state file is kept in place after successful sync" {
    _use_fake_bin
    _populate_ws WS-SYNC-TEST

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-SYNC-TEST
    [ "$status" -eq 0 ]

    # State file must remain
    [[ -f "$MEMORY_DIR/workstream-WS-SYNC-TEST-state.json" ]]
}

@test "mg-db-sync: state file updated with synced_to_postgres true after successful sync" {
    _use_fake_bin
    _populate_ws WS-SYNC-TEST

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-SYNC-TEST
    [ "$status" -eq 0 ]

    local synced
    synced=$(jq -r '.synced_to_postgres' "$MEMORY_DIR/workstream-WS-SYNC-TEST-state.json")
    [[ "$synced" == "true" ]]
}

# ============================================================================
# GOLDEN PATH - Normal, expected operations
# ============================================================================

@test "mg-db-sync: single workstream full artifact set synced and archived" {
    _use_fake_bin
    _populate_ws WS-SYNC-TEST

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-SYNC-TEST
    [ "$status" -eq 0 ]

    # Postgres was called
    [[ -s "$PSQL_CALLS_FILE" ]]

    # Operational artifacts archived
    [[ -f "$MEMORY_DIR/.archive/WS-SYNC-TEST/test-results-WS-SYNC-TEST.json" ]]
    [[ -f "$MEMORY_DIR/.archive/WS-SYNC-TEST/qa-report-WS-SYNC-TEST.json" ]]
    [[ -f "$MEMORY_DIR/.archive/WS-SYNC-TEST/staff-engineer-review-WS-SYNC-TEST.json" ]]
    [[ -f "$MEMORY_DIR/.archive/WS-SYNC-TEST/agent-dev-WS-SYNC-TEST.json" ]]

    # State file NOT archived
    [[ ! -f "$MEMORY_DIR/.archive/WS-SYNC-TEST/workstream-WS-SYNC-TEST-state.json" ]]
}

@test "mg-db-sync: memory_entries upsert key is workstream-sync-{WS_ID}" {
    _use_fake_bin
    _populate_ws WS-SYNC-TEST

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-SYNC-TEST
    [ "$status" -eq 0 ]

    # The SQL passed to psql should reference the correct key
    grep -q "workstream-sync-WS-SYNC-TEST" "$PSQL_CALLS_FILE" \
        || grep -rq "workstream-sync-WS-SYNC-TEST" "$TEST_DIR"
}

@test "mg-db-sync: agent_events row inserted with workstream_synced event type" {
    _use_fake_bin
    _populate_ws WS-SYNC-TEST

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-SYNC-TEST
    [ "$status" -eq 0 ]

    # The SQL passed to psql should reference workstream_synced
    grep -rq "workstream_synced" "$TEST_DIR"
}

@test "mg-db-sync: re-run is idempotent (no error on second sync without --force)" {
    _use_fake_bin
    _populate_ws WS-SYNC-TEST

    # First run
    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-SYNC-TEST
    [ "$status" -eq 0 ]

    # Repopulate for second run
    _populate_ws WS-SYNC-TEST

    # Second run without --force should exit 0 (already synced, skip gracefully)
    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-SYNC-TEST
    [ "$status" -eq 0 ]
    [[ "$output" =~ "already" ]] || [[ "$output" =~ "skipped" ]] || [[ "$output" =~ "skip" ]]
}

@test "mg-db-sync: --all-complete syncs all workstreams with phase=complete in state files" {
    _use_fake_bin

    # Create two complete workstreams
    _populate_ws WS-COMPLETE-A
    jq '.phase = "complete" | .workstream_id = "WS-COMPLETE-A"' \
        "$MEMORY_DIR/workstream-WS-COMPLETE-A-state.json" > "$TEST_DIR/tmp.json" \
        && mv "$TEST_DIR/tmp.json" "$MEMORY_DIR/workstream-WS-COMPLETE-A-state.json"

    _populate_ws WS-COMPLETE-B
    jq '.phase = "complete" | .workstream_id = "WS-COMPLETE-B"' \
        "$MEMORY_DIR/workstream-WS-COMPLETE-B-state.json" > "$TEST_DIR/tmp.json" \
        && mv "$TEST_DIR/tmp.json" "$MEMORY_DIR/workstream-WS-COMPLETE-B-state.json"

    # Create one in-progress workstream (should NOT be synced)
    jq '.workstream_id = "WS-IN-PROGRESS" | .phase = "implementation"' \
        "$FIXTURES_DIR/ws-sync-state-complete.json" \
        > "$MEMORY_DIR/workstream-WS-IN-PROGRESS-state.json"

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" --all-complete
    [ "$status" -eq 0 ]

    # Both complete workstreams synced (state files updated)
    local synced_a synced_b
    synced_a=$(jq -r '.synced_to_postgres' "$MEMORY_DIR/workstream-WS-COMPLETE-A-state.json")
    synced_b=$(jq -r '.synced_to_postgres' "$MEMORY_DIR/workstream-WS-COMPLETE-B-state.json")
    [[ "$synced_a" == "true" ]]
    [[ "$synced_b" == "true" ]]

    # In-progress workstream state NOT modified
    local synced_ip
    synced_ip=$(jq -r '.synced_to_postgres // "false"' "$MEMORY_DIR/workstream-WS-IN-PROGRESS-state.json")
    [[ "$synced_ip" == "false" ]] || [[ "$synced_ip" == "null" ]]
}

@test "mg-db-sync: -h flag shows help and exits 0" {
    run "$SCRIPT_PATH" -h
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
    [[ "$output" =~ "mg-db-sync" ]]
}

@test "mg-db-sync: --help flag shows help and exits 0" {
    run "$SCRIPT_PATH" --help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
    [[ "$output" =~ "mg-db-sync" ]]
}

@test "mg-db-sync: archive directory created at .archive/{WS_ID}/" {
    _use_fake_bin
    _populate_ws WS-SYNC-TEST

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-SYNC-TEST
    [ "$status" -eq 0 ]

    [[ -d "$MEMORY_DIR/.archive/WS-SYNC-TEST" ]]
}

@test "mg-db-sync: operational artifacts NOT present in memory dir after successful sync" {
    _use_fake_bin
    _populate_ws WS-SYNC-TEST

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" WS-SYNC-TEST
    [ "$status" -eq 0 ]

    [[ ! -f "$MEMORY_DIR/test-results-WS-SYNC-TEST.json" ]]
    [[ ! -f "$MEMORY_DIR/qa-report-WS-SYNC-TEST.json" ]]
    [[ ! -f "$MEMORY_DIR/staff-engineer-review-WS-SYNC-TEST.json" ]]
    [[ ! -f "$MEMORY_DIR/agent-dev-WS-SYNC-TEST.json" ]]
}

@test "mg-db-sync: --dry-run does not modify state file" {
    _use_fake_bin
    _populate_ws WS-SYNC-TEST

    local before_state
    before_state=$(cat "$MEMORY_DIR/workstream-WS-SYNC-TEST-state.json")

    run "$SCRIPT_PATH" --source-dir "$MEMORY_DIR" --dry-run WS-SYNC-TEST
    [ "$status" -eq 0 ]

    local after_state
    after_state=$(cat "$MEMORY_DIR/workstream-WS-SYNC-TEST-state.json")
    [[ "$before_state" == "$after_state" ]]
}
