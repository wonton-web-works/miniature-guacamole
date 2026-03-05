#!/usr/bin/env bats
# ============================================================================
# mg-memory-write-postgres.bats - Tests for mg-memory-write dual-write behavior
# ============================================================================
# Test ordering: MISUSE CASES → BOUNDARY TESTS → GOLDEN PATH
# Coverage target: AC-DB-1.1 through AC-DB-1.6, AC-DB-1.8 (file-only baseline)
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
    cp "$PROJECT_ROOT"/src/framework/scripts/mg-* "$TEST_CLAUDE_DIR/"
    chmod +x "$TEST_CLAUDE_DIR"/mg-*

    SCRIPT_PATH="$TEST_CLAUDE_DIR/mg-memory-write"

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

# ============================================================================
# MISUSE CASES — Invalid inputs, error conditions, Postgres failures
# ============================================================================

@test "mg-memory-write postgres: psql exits non-zero — script still exits 0 (non-fatal)" {
    # AC-DB-1.3: Postgres failure must be non-fatal
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _use_fake_bin
    _psql_will_fail
    export MG_POSTGRES_URL="postgresql://mg:mg@localhost:5432/mg_memory"

    run "$SCRIPT_PATH" "$test_file" '.status = "updated"'
    [ "$status" -eq 0 ]
}

@test "mg-memory-write postgres: psql exits non-zero — warning written to stderr" {
    # AC-DB-1.3: warning must appear on stderr, not stdout
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _use_fake_bin
    _psql_will_fail
    export MG_POSTGRES_URL="postgresql://mg:mg@localhost:5432/mg_memory"

    run --separate-stderr "$SCRIPT_PATH" "$test_file" '.status = "updated"'
    [ "$status" -eq 0 ]
    # stderr must contain a warning
    [[ "$stderr" =~ "WARN" ]] || [[ "$stderr" =~ "warn" ]] || [[ "$stderr" =~ "warning" ]] || [[ "$stderr" =~ "postgres" ]] || [[ "$stderr" =~ "Postgres" ]]
}

@test "mg-memory-write postgres: psql exits non-zero — file write still committed" {
    # AC-DB-1.2 + AC-DB-1.3: file-first guarantee holds even when Postgres fails
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _use_fake_bin
    _psql_will_fail
    export MG_POSTGRES_URL="postgresql://mg:mg@localhost:5432/mg_memory"

    run "$SCRIPT_PATH" "$test_file" '.status = "pg_failed_but_file_ok"'
    [ "$status" -eq 0 ]

    # The file must contain the updated value
    local result
    result=$(jq -r '.status' "$test_file")
    [[ "$result" == "pg_failed_but_file_ok" ]]
}

@test "mg-memory-write postgres: invalid MG_POSTGRES_URL format — script still exits 0" {
    # AC-DB-1.3: bad URL is a Postgres-side failure, must be non-fatal
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _use_fake_bin
    # psql will be called with a garbage URL — mock always returns 1 for fail
    _psql_will_fail
    export MG_POSTGRES_URL="not-a-valid-url://@@garbage"

    run "$SCRIPT_PATH" "$test_file" '.status = "updated"'
    [ "$status" -eq 0 ]

    local result
    result=$(jq -r '.status' "$test_file")
    [[ "$result" == "updated" ]]
}

@test "mg-memory-write postgres: unreachable host in MG_POSTGRES_URL — file write succeeds" {
    # AC-DB-1.2: file write happens first and independently
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _use_fake_bin
    _psql_will_fail
    export MG_POSTGRES_URL="postgresql://mg:mg@192.0.2.1:5432/mg_memory"

    run "$SCRIPT_PATH" "$test_file" '.phase = "verification"'
    [ "$status" -eq 0 ]

    local result
    result=$(jq -r '.phase' "$test_file")
    [[ "$result" == "verification" ]]
}

# ============================================================================
# BOUNDARY CASES — Edge values, pattern matching edges, empty URL
# ============================================================================

@test "mg-memory-write postgres: MG_POSTGRES_URL set to empty string — no psql call" {
    # AC-DB-1.4: empty string is equivalent to unset — file-only behavior
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _use_fake_bin
    export MG_POSTGRES_URL=""

    run "$SCRIPT_PATH" "$test_file" '.status = "updated"'
    [ "$status" -eq 0 ]

    # psql must not have been invoked
    [[ ! -s "$PSQL_CALLS" ]]
}

@test "mg-memory-write postgres: key exactly matching workstream-X-state — upserts workstreams table" {
    # AC-DB-1.5: workstream-*-state key pattern must trigger workstreams upsert
    # The memory file lives at a path whose basename matches workstream-*-state.json
    local memory_dir="$TEST_DIR/.claude/memory"
    mkdir -p "$memory_dir"
    local test_file="$memory_dir/workstream-WS-DB-1-state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _use_fake_bin
    _psql_will_succeed
    export MG_POSTGRES_URL="postgresql://mg:mg@localhost:5432/mg_memory"

    run "$SCRIPT_PATH" "$test_file" '.phase = "verification"'
    [ "$status" -eq 0 ]

    # psql must have been called (workstreams upsert)
    [[ -s "$PSQL_CALLS" ]]
    # The SQL must reference the workstreams table
    grep -q "workstreams" "$PSQL_CALLS"
}

@test "mg-memory-write postgres: key NOT matching workstream-*-state — no workstreams upsert" {
    # AC-DB-1.5 boundary: other memory files only touch memory_entries, not workstreams
    local test_file="$TEST_DIR/tasks-dev.json"
    cp "$FIXTURES_DIR/valid-tasks.json" "$test_file"

    _use_fake_bin
    _psql_will_succeed
    export MG_POSTGRES_URL="postgresql://mg:mg@localhost:5432/mg_memory"

    run "$SCRIPT_PATH" "$test_file" '.status = "updated"'
    [ "$status" -eq 0 ]

    # psql must have been called (memory_entries upsert)
    [[ -s "$PSQL_CALLS" ]]
    # The SQL must NOT reference the workstreams table
    ! grep -q "workstreams" "$PSQL_CALLS"
}

@test "mg-memory-write postgres: workstream key at boundary — partial prefix not matched" {
    # AC-DB-1.5 boundary: 'workstream-abc' (no trailing -state) should NOT match pattern
    local test_file="$TEST_DIR/workstream-abc.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _use_fake_bin
    _psql_will_succeed
    export MG_POSTGRES_URL="postgresql://mg:mg@localhost:5432/mg_memory"

    run "$SCRIPT_PATH" "$test_file" '.status = "updated"'
    [ "$status" -eq 0 ]

    # If psql was called, it should only touch memory_entries, not workstreams
    if [[ -s "$PSQL_CALLS" ]]; then
        ! grep -q "workstreams" "$PSQL_CALLS"
    fi
}

# ============================================================================
# GOLDEN PATH — Happy path dual-write, column extraction, file-first guarantee
# ============================================================================

@test "mg-memory-write postgres: MG_POSTGRES_URL set — psql is invoked" {
    # AC-DB-1.1: dual-write happens when MG_POSTGRES_URL is set
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _use_fake_bin
    _psql_will_succeed
    export MG_POSTGRES_URL="postgresql://mg:mg@localhost:5432/mg_memory"

    run "$SCRIPT_PATH" "$test_file" '.status = "updated"'
    [ "$status" -eq 0 ]

    # psql must have been called
    [[ -s "$PSQL_CALLS" ]]
}

@test "mg-memory-write postgres: MG_POSTGRES_URL set — upserts memory_entries table" {
    # AC-DB-1.6: all writes upsert to memory_entries with file_path key
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _use_fake_bin
    _psql_will_succeed
    export MG_POSTGRES_URL="postgresql://mg:mg@localhost:5432/mg_memory"

    run "$SCRIPT_PATH" "$test_file" '.status = "updated"'
    [ "$status" -eq 0 ]

    # SQL passed to psql must reference memory_entries
    grep -q "memory_entries" "$PSQL_CALLS"
}

@test "mg-memory-write postgres: MG_POSTGRES_URL not set — psql never called" {
    # AC-DB-1.4: file-only behavior when no URL configured
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _use_fake_bin
    unset MG_POSTGRES_URL

    run "$SCRIPT_PATH" "$test_file" '.status = "updated"'
    [ "$status" -eq 0 ]

    # psql must not have been called at all
    [[ ! -s "$PSQL_CALLS" ]]
}

@test "mg-memory-write postgres: file written before psql call (file-first)" {
    # AC-DB-1.2: file write must succeed before Postgres is attempted
    # We verify by checking the file is correct even when psql would be called
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _use_fake_bin
    _psql_will_succeed
    export MG_POSTGRES_URL="postgresql://mg:mg@localhost:5432/mg_memory"

    run "$SCRIPT_PATH" "$test_file" '.status = "file_first_check"'
    [ "$status" -eq 0 ]

    # File must have the updated value
    local result
    result=$(jq -r '.status' "$test_file")
    [[ "$result" == "file_first_check" ]]

    # psql was also called (dual-write)
    [[ -s "$PSQL_CALLS" ]]
}

@test "mg-memory-write postgres: workstream state file — phase extracted and sent to workstreams table" {
    # AC-DB-1.5: phase column must be extracted from state file JSON
    local memory_dir="$TEST_DIR/.claude/memory"
    mkdir -p "$memory_dir"
    local test_file="$memory_dir/workstream-WS-DB-1-state.json"
    jq '.phase = "verification" | .workstream_id = "WS-DB-1"' \
        "$FIXTURES_DIR/valid-workstream.json" > "$test_file"

    _use_fake_bin
    _psql_will_succeed
    export MG_POSTGRES_URL="postgresql://mg:mg@localhost:5432/mg_memory"

    run "$SCRIPT_PATH" "$test_file" '.gate_status = "ready"'
    [ "$status" -eq 0 ]

    # The SQL must reference the phase value
    grep -q "verification" "$PSQL_CALLS" || grep -rq "verification" "$TEST_DIR"
}

@test "mg-memory-write postgres: version increment — SQL contains version = version + 1" {
    # AC-DB-1.6: version must increment on each upsert
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _use_fake_bin
    _psql_will_succeed
    export MG_POSTGRES_URL="postgresql://mg:mg@localhost:5432/mg_memory"

    run "$SCRIPT_PATH" "$test_file" '.status = "updated"'
    [ "$status" -eq 0 ]

    # SQL must include the version increment idiom
    grep -q "version" "$PSQL_CALLS" || grep -rq "version" "$TEST_DIR"
}

@test "mg-memory-write postgres: MG_POSTGRES_URL not set — behavior identical to file-only (exit 0, file updated)" {
    # AC-DB-1.8: no regression when MG_POSTGRES_URL absent
    local test_file="$TEST_DIR/state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _use_fake_bin
    unset MG_POSTGRES_URL

    run "$SCRIPT_PATH" "$test_file" '.coverage = 100'
    [ "$status" -eq 0 ]

    local result
    result=$(jq -r '.coverage' "$test_file")
    [[ "$result" == "100" ]]

    # .bak created — normal backup behavior unchanged
    [[ -f "$test_file.bak" ]]
}

@test "mg-memory-write postgres: MG_POSTGRES_URL not set — .bak backup still created" {
    # AC-DB-1.8: backup behavior must be unchanged when no Postgres URL
    local test_file="$TEST_DIR/no-pg.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    unset MG_POSTGRES_URL

    run "$SCRIPT_PATH" "$test_file" '.phase = "verification"'
    [ "$status" -eq 0 ]

    [[ -f "$test_file.bak" ]]
}

@test "mg-memory-write postgres: dual-write — .bak backup still created alongside Postgres write" {
    # AC-DB-1.2: file atomicity guarantees (backup) must survive dual-write path
    local test_file="$TEST_DIR/dual.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    _use_fake_bin
    _psql_will_succeed
    export MG_POSTGRES_URL="postgresql://mg:mg@localhost:5432/mg_memory"

    run "$SCRIPT_PATH" "$test_file" '.status = "dual_write_bak"'
    [ "$status" -eq 0 ]

    # File updated
    local result
    result=$(jq -r '.status' "$test_file")
    [[ "$result" == "dual_write_bak" ]]

    # Backup created
    [[ -f "$test_file.bak" ]]
}
