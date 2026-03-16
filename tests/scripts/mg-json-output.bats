#!/usr/bin/env bats
# ============================================================================
# mg-json-output.bats - Tests for --json flag across mg-* scripts
# ============================================================================
# Test ordering: MISUSE CASES -> BOUNDARY TESTS -> GOLDEN PATH
# Coverage target: 99% of --json flag functionality
# ============================================================================

# Setup and teardown
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

    # Copy all mg-* scripts from project to test directory
    cp "$PROJECT_ROOT"/src/framework/scripts/mg-* "$TEST_CLAUDE_DIR/"
    chmod +x "$TEST_CLAUDE_DIR"/mg-*

    WS_STATUS_PATH="$TEST_CLAUDE_DIR/mg-workstream-status"
    MEM_READ_PATH="$TEST_CLAUDE_DIR/mg-memory-read"
    GATE_CHECK_PATH="$TEST_CLAUDE_DIR/mg-gate-check"

    # Create a .claude/memory directory in test dir
    MEMORY_DIR="$TEST_DIR/.claude/memory"
    mkdir -p "$MEMORY_DIR"

    # Copy a fixture workstream into memory dir for ws-status tests
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-JSON-1-state.json"

    # Set up a minimal project dir for gate-check tests
    PROJECT_DIR="$TEST_DIR/project"
    mkdir -p "$PROJECT_DIR"
    cd "$PROJECT_DIR"
    git init --quiet
    git config user.email "test@test.com"
    git config user.name "Test User"
    printf '{"name":"test-project","version":"1.0.0"}' > package.json
    git add .
    git commit -m "Initial commit" --quiet

    # Skip if BATS not installed
    if ! command -v bats &> /dev/null; then
        skip "BATS not installed. Install via: brew install bats-core"
    fi

    # Skip if jq not installed
    if ! command -v jq &> /dev/null; then
        skip "jq not installed. Install via: brew install jq"
    fi
}

teardown() {
    if [[ -n "$TEST_DIR" && -d "$TEST_DIR" ]]; then
        rm -rf "$TEST_DIR"
    fi
}

# ============================================================================
# MISUSE CASES — mg-workstream-status --json
# ============================================================================

@test "mg-workstream-status --json: missing workstream ID exits 1 with JSON error" {
    cd "$TEST_DIR"
    run "$WS_STATUS_PATH" --json
    [ "$status" -eq 1 ]
    # Should still produce a JSON error object, not raw text
    local err
    err=$(echo "$output" | jq -r '.error' 2>/dev/null)
    [ -n "$err" ]
}

@test "mg-workstream-status --json: nonexistent workstream outputs JSON error object" {
    cd "$TEST_DIR"
    run "$WS_STATUS_PATH" WS-DOES-NOT-EXIST --json
    [ "$status" -eq 1 ]
    local err
    err=$(echo "$output" | jq -r '.error' 2>/dev/null)
    [[ "$err" =~ "WS-DOES-NOT-EXIST" ]]
}

@test "mg-workstream-status --json: corrupt state file outputs JSON error" {
    cd "$TEST_DIR"
    echo 'not valid json {broken' > "$MEMORY_DIR/workstream-WS-CORRUPT-state.json"
    run "$WS_STATUS_PATH" WS-CORRUPT --json
    [ "$status" -eq 1 ]
    local err
    err=$(echo "$output" | jq -r '.error' 2>/dev/null)
    [ -n "$err" ]
}

@test "mg-workstream-status --json: no .claude/memory dir outputs JSON error" {
    local empty_dir
    empty_dir="$(mktemp -d)"
    cd "$empty_dir"
    run "$WS_STATUS_PATH" WS-JSON-1 --json
    [ "$status" -eq 1 ]
    local err
    err=$(echo "$output" | jq -r '.error' 2>/dev/null)
    [ -n "$err" ]
    rm -rf "$empty_dir"
}

# ============================================================================
# BOUNDARY TESTS — flag position independence + format differences
# ============================================================================

@test "mg-workstream-status --json: flag before ws-id produces valid JSON" {
    cd "$TEST_DIR"
    run "$WS_STATUS_PATH" --json WS-JSON-1
    [ "$status" -eq 0 ]
    echo "$output" | jq '.' > /dev/null
}

@test "mg-workstream-status --json: flag after ws-id produces valid JSON" {
    cd "$TEST_DIR"
    run "$WS_STATUS_PATH" WS-JSON-1 --json
    [ "$status" -eq 0 ]
    echo "$output" | jq '.' > /dev/null
}

@test "mg-workstream-status --json: output is NOT human-readable format" {
    cd "$TEST_DIR"
    run "$WS_STATUS_PATH" WS-JSON-1 --json
    [ "$status" -eq 0 ]
    # JSON output must not start with the ASCII banner
    ! [[ "${lines[0]}" =~ "====" ]]
}

@test "mg-workstream-status: without --json output is human-readable (not JSON)" {
    cd "$TEST_DIR"
    run "$WS_STATUS_PATH" WS-JSON-1
    [ "$status" -eq 0 ]
    # Human-readable output starts with the ASCII banner
    [[ "${lines[0]}" =~ "====" ]]
    # Must not be parseable as a JSON object at top level
    local parsed
    parsed=$(echo "$output" | jq -r '.workstream_id' 2>/dev/null || true)
    [ -z "$parsed" ] || [ "$parsed" == "null" ]
}

@test "mg-memory-read --json: flag before file path produces compact JSON" {
    run "$MEM_READ_PATH" --json "$FIXTURES_DIR/valid-workstream.json"
    [ "$status" -eq 0 ]
    # Compact JSON has no internal newlines
    local line_count
    line_count=$(echo "$output" | wc -l | tr -d ' ')
    [ "$line_count" -eq 1 ]
}

@test "mg-memory-read --json: flag after file path produces compact JSON" {
    run "$MEM_READ_PATH" "$FIXTURES_DIR/valid-workstream.json" --json
    [ "$status" -eq 0 ]
    local line_count
    line_count=$(echo "$output" | wc -l | tr -d ' ')
    [ "$line_count" -eq 1 ]
}

@test "mg-memory-read: without --json output is pretty-printed (multi-line)" {
    run "$MEM_READ_PATH" "$FIXTURES_DIR/valid-workstream.json"
    [ "$status" -eq 0 ]
    local line_count
    line_count=$(echo "$output" | wc -l | tr -d ' ')
    [ "$line_count" -gt 1 ]
}

@test "mg-gate-check --json: flag position before produces compact JSON" {
    cd "$PROJECT_DIR"
    run "$GATE_CHECK_PATH" --json
    # May be 0 (all pass) or 1 (some fail) — both are valid
    local line_count
    line_count=$(echo "$output" | wc -l | tr -d ' ')
    [ "$line_count" -eq 1 ]
}

@test "mg-gate-check: without --json output is pretty-printed (multi-line)" {
    cd "$PROJECT_DIR"
    run "$GATE_CHECK_PATH"
    local line_count
    line_count=$(echo "$output" | wc -l | tr -d ' ')
    [ "$line_count" -gt 1 ]
}

# ============================================================================
# GOLDEN PATH — correct JSON structure and field coverage
# ============================================================================

@test "mg-workstream-status --json: outputs valid parseable JSON" {
    cd "$TEST_DIR"
    run "$WS_STATUS_PATH" WS-JSON-1 --json
    [ "$status" -eq 0 ]
    echo "$output" | jq '.' > /dev/null
}

@test "mg-workstream-status --json: contains workstream_id field" {
    cd "$TEST_DIR"
    run "$WS_STATUS_PATH" WS-JSON-1 --json
    [ "$status" -eq 0 ]
    local val
    val=$(echo "$output" | jq -r '.workstream_id')
    [ -n "$val" ]
    [ "$val" != "null" ]
}

@test "mg-workstream-status --json: contains name field" {
    cd "$TEST_DIR"
    run "$WS_STATUS_PATH" WS-JSON-1 --json
    [ "$status" -eq 0 ]
    local val
    val=$(echo "$output" | jq -r '.name')
    [ -n "$val" ]
    [ "$val" != "null" ]
}

@test "mg-workstream-status --json: contains status field" {
    cd "$TEST_DIR"
    run "$WS_STATUS_PATH" WS-JSON-1 --json
    [ "$status" -eq 0 ]
    local val
    val=$(echo "$output" | jq -r '.status')
    [ -n "$val" ]
    [ "$val" != "null" ]
}

@test "mg-workstream-status --json: contains phase field" {
    cd "$TEST_DIR"
    run "$WS_STATUS_PATH" WS-JSON-1 --json
    [ "$status" -eq 0 ]
    local val
    val=$(echo "$output" | jq -r '.phase')
    [ -n "$val" ]
    [ "$val" != "null" ]
}

@test "mg-workstream-status --json: contains gate_status field" {
    cd "$TEST_DIR"
    run "$WS_STATUS_PATH" WS-JSON-1 --json
    [ "$status" -eq 0 ]
    local has
    has=$(echo "$output" | jq 'has("gate_status")')
    [ "$has" == "true" ]
}

@test "mg-workstream-status --json: contains coverage field" {
    cd "$TEST_DIR"
    run "$WS_STATUS_PATH" WS-JSON-1 --json
    [ "$status" -eq 0 ]
    local has
    has=$(echo "$output" | jq 'has("coverage")')
    [ "$has" == "true" ]
}

@test "mg-workstream-status --json: contains tests object with total/passing/failing" {
    cd "$TEST_DIR"
    run "$WS_STATUS_PATH" WS-JSON-1 --json
    [ "$status" -eq 0 ]
    local total passing failing
    total=$(echo "$output" | jq '.tests.total')
    passing=$(echo "$output" | jq '.tests.passing')
    failing=$(echo "$output" | jq '.tests.failing')
    [ "$total" != "null" ]
    [ "$passing" != "null" ]
    [ "$failing" != "null" ]
}

@test "mg-workstream-status --json: contains blockers field" {
    cd "$TEST_DIR"
    run "$WS_STATUS_PATH" WS-JSON-1 --json
    [ "$status" -eq 0 ]
    local has
    has=$(echo "$output" | jq 'has("blockers")')
    [ "$has" == "true" ]
}

@test "mg-workstream-status --json: contains dependencies field" {
    cd "$TEST_DIR"
    run "$WS_STATUS_PATH" WS-JSON-1 --json
    [ "$status" -eq 0 ]
    local has
    has=$(echo "$output" | jq 'has("dependencies")')
    [ "$has" == "true" ]
}

@test "mg-workstream-status --json: contains agent_id field" {
    cd "$TEST_DIR"
    run "$WS_STATUS_PATH" WS-JSON-1 --json
    [ "$status" -eq 0 ]
    local has
    has=$(echo "$output" | jq 'has("agent_id")')
    [ "$has" == "true" ]
}

@test "mg-workstream-status --json: contains created_at field" {
    cd "$TEST_DIR"
    run "$WS_STATUS_PATH" WS-JSON-1 --json
    [ "$status" -eq 0 ]
    local has
    has=$(echo "$output" | jq 'has("created_at")')
    [ "$has" == "true" ]
}

@test "mg-workstream-status --json: can be piped through jq" {
    cd "$TEST_DIR"
    run bash -c "cd '$TEST_DIR' && '$WS_STATUS_PATH' WS-JSON-1 --json | jq -r '.workstream_id'"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "WS" ]]
}

@test "mg-workstream-status --json: exit code unchanged (0 on success)" {
    cd "$TEST_DIR"
    run "$WS_STATUS_PATH" WS-JSON-1 --json
    [ "$status" -eq 0 ]
}

@test "mg-workstream-status --json: exit code unchanged (1 on missing ws)" {
    cd "$TEST_DIR"
    run "$WS_STATUS_PATH" WS-NOT-REAL --json
    [ "$status" -eq 1 ]
}

@test "mg-memory-read --json: outputs valid compact JSON" {
    run "$MEM_READ_PATH" --json "$FIXTURES_DIR/valid-workstream.json"
    [ "$status" -eq 0 ]
    echo "$output" | jq '.' > /dev/null
}

@test "mg-memory-read --json: output is single line (compact)" {
    run "$MEM_READ_PATH" --json "$FIXTURES_DIR/valid-workstream.json"
    [ "$status" -eq 0 ]
    local line_count
    line_count=$(echo "$output" | wc -l | tr -d ' ')
    [ "$line_count" -eq 1 ]
}

@test "mg-memory-read --json: same data as pretty-print, just compact" {
    local pretty compact_ws_id pretty_ws_id
    pretty=$("$MEM_READ_PATH" "$FIXTURES_DIR/valid-workstream.json")
    compact=$("$MEM_READ_PATH" --json "$FIXTURES_DIR/valid-workstream.json")
    pretty_ws_id=$(echo "$pretty" | jq -r '.workstream_id')
    compact_ws_id=$(echo "$compact" | jq -r '.workstream_id')
    [ "$pretty_ws_id" == "$compact_ws_id" ]
}

@test "mg-memory-read --json: exit code unchanged (0 on success)" {
    run "$MEM_READ_PATH" --json "$FIXTURES_DIR/valid-workstream.json"
    [ "$status" -eq 0 ]
}

@test "mg-memory-read --json: exit code unchanged (1 on nonexistent file)" {
    run "$MEM_READ_PATH" --json "/nonexistent/path/file.json"
    [ "$status" -eq 1 ]
}

@test "mg-gate-check --json: outputs valid compact JSON" {
    cd "$PROJECT_DIR"
    run "$GATE_CHECK_PATH" --json
    echo "$output" | jq '.' > /dev/null
}

@test "mg-gate-check --json: output is single line (compact)" {
    cd "$PROJECT_DIR"
    run "$GATE_CHECK_PATH" --json
    local line_count
    line_count=$(echo "$output" | wc -l | tr -d ' ')
    [ "$line_count" -eq 1 ]
}

@test "mg-gate-check --json: same data as pretty-print, just compact" {
    cd "$PROJECT_DIR"
    local pretty_overall compact_overall
    pretty_overall=$("$GATE_CHECK_PATH" 2>/dev/null | jq -r '.overall' || true)
    compact_overall=$("$GATE_CHECK_PATH" --json 2>/dev/null | jq -r '.overall' || true)
    [ "$pretty_overall" == "$compact_overall" ]
}

@test "mg-gate-check --json: has all required top-level keys" {
    cd "$PROJECT_DIR"
    run "$GATE_CHECK_PATH" --json
    local has_overall has_timestamp has_gates
    has_overall=$(echo "$output" | jq 'has("overall")')
    has_timestamp=$(echo "$output" | jq 'has("timestamp")')
    has_gates=$(echo "$output" | jq 'has("gates")')
    [ "$has_overall" == "true" ]
    [ "$has_timestamp" == "true" ]
    [ "$has_gates" == "true" ]
}

@test "mg-gate-check --json: exit code unchanged (matches non-json run)" {
    cd "$PROJECT_DIR"
    local plain_exit json_exit
    "$GATE_CHECK_PATH" > /dev/null 2>&1 || plain_exit=$?
    plain_exit="${plain_exit:-0}"
    "$GATE_CHECK_PATH" --json > /dev/null 2>&1 || json_exit=$?
    json_exit="${json_exit:-0}"
    [ "$plain_exit" -eq "$json_exit" ]
}

@test "mg-gate-check --json: can be piped through jq" {
    cd "$PROJECT_DIR"
    run bash -c "cd '$PROJECT_DIR' && '$GATE_CHECK_PATH' --json | jq -r '.overall'"
    [ "$status" -eq 0 ]
    [[ "$output" == "pass" ]] || [[ "$output" == "fail" ]]
}

@test "mg-workstream-status --help: documents --json flag" {
    run "$WS_STATUS_PATH" --help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "--json" ]]
}

@test "mg-memory-read --help: documents --json flag" {
    run "$MEM_READ_PATH" --help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "--json" ]]
}

@test "mg-gate-check --help: documents --json flag" {
    run "$GATE_CHECK_PATH" --help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "--json" ]]
}
