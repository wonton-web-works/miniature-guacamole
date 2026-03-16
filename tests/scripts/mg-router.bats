#!/usr/bin/env bats
# ============================================================================
# mg-router.bats - Tests for the mg CLI router
# ============================================================================
# Test ordering: MISUSE CASES -> BOUNDARY TESTS -> GOLDEN PATH
# Coverage target: 99% of router functionality
# ============================================================================

setup() {
    # Resolve project root (tests/scripts/ -> project root)
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"

    # Temporary test directory
    TEST_DIR="$(mktemp -d)"

    # Create .claude/scripts structure (required by location validation)
    TEST_CLAUDE_DIR="$TEST_DIR/.claude/scripts"
    mkdir -p "$TEST_CLAUDE_DIR"

    # Copy all mg-* scripts and the mg router to the test scripts directory
    cp "$PROJECT_ROOT"/src/framework/scripts/mg-* "$TEST_CLAUDE_DIR/"
    cp "$PROJECT_ROOT/src/framework/scripts/mg" "$TEST_CLAUDE_DIR/"
    chmod +x "$TEST_CLAUDE_DIR"/mg-*
    chmod +x "$TEST_CLAUDE_DIR/mg"

    SCRIPT_PATH="$TEST_CLAUDE_DIR/mg"

    # Create .claude/memory directory
    MEMORY_DIR="$TEST_DIR/.claude/memory"
    mkdir -p "$MEMORY_DIR"

    # Skip if BATS not installed
    if ! command -v bats &> /dev/null; then
        skip "BATS not installed. Install via: brew install bats-core"
    fi
}

teardown() {
    if [[ -n "$TEST_DIR" && -d "$TEST_DIR" ]]; then
        rm -rf "$TEST_DIR"
    fi
}

# ============================================================================
# MISUSE CASES - Invalid inputs, error conditions
# ============================================================================

@test "mg: unknown subcommand exits 1" {
    run "$SCRIPT_PATH" foobar
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Unknown subcommand" ]]
}

@test "mg: sourcing is rejected" {
    run bash -c "source '$SCRIPT_PATH'"
    [ "$status" -ne 0 ]
}

@test "mg: workstream with no sub-subcommand exits 1" {
    run "$SCRIPT_PATH" workstream
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg: workstream unknown sub-subcommand exits 1" {
    run "$SCRIPT_PATH" workstream frobnicate
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Unknown workstream subcommand" ]]
}

@test "mg: memory with no sub-subcommand exits 1" {
    run "$SCRIPT_PATH" memory
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg: gate with no sub-subcommand exits 1" {
    run "$SCRIPT_PATH" gate
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg: git with no sub-subcommand exits 1" {
    run "$SCRIPT_PATH" git
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg: diff with no sub-subcommand exits 1" {
    run "$SCRIPT_PATH" diff
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg: settings with no sub-subcommand exits 1" {
    run "$SCRIPT_PATH" settings
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg: db with no sub-subcommand exits 1" {
    run "$SCRIPT_PATH" db
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg: workstream unknown sub-subcommand error message is actionable" {
    run "$SCRIPT_PATH" workstream frobnicate
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Valid:" ]]
}

@test "mg: memory unknown sub-subcommand exits 1" {
    run "$SCRIPT_PATH" memory frobnicate
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Unknown memory subcommand" ]]
}

@test "mg: gate unknown sub-subcommand exits 1" {
    run "$SCRIPT_PATH" gate frobnicate
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Unknown gate subcommand" ]]
}

@test "mg: db unknown sub-subcommand exits 1" {
    run "$SCRIPT_PATH" db frobnicate
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Unknown db subcommand" ]]
}

# ============================================================================
# BOUNDARY TESTS - Edge cases, flags, aliases
# ============================================================================

@test "mg: help subcommand exits 0" {
    run "$SCRIPT_PATH" help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg: --help flag exits 0" {
    run "$SCRIPT_PATH" --help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg: -h flag exits 0" {
    run "$SCRIPT_PATH" -h
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg: version subcommand exits 0 and prints version" {
    run "$SCRIPT_PATH" version
    [ "$status" -eq 0 ]
    [[ "$output" =~ "mg version" ]]
}

@test "mg: --version flag exits 0 and prints version" {
    run "$SCRIPT_PATH" --version
    [ "$status" -eq 0 ]
    [[ "$output" =~ "mg version" ]]
}

@test "mg: version output includes version number" {
    run "$SCRIPT_PATH" version
    [ "$status" -eq 0 ]
    [[ "$output" =~ "2.1.0" ]]
}

@test "mg: ws alias routes to workstream (no sub-subcommand exits 1 with usage)" {
    run "$SCRIPT_PATH" ws
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg: mem alias routes to memory (no sub-subcommand exits 1 with usage)" {
    run "$SCRIPT_PATH" mem
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg: ws alias unknown sub-subcommand exits 1" {
    run "$SCRIPT_PATH" ws frobnicate
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Unknown workstream subcommand" ]]
}

@test "mg: mem alias unknown sub-subcommand exits 1" {
    run "$SCRIPT_PATH" mem frobnicate
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Unknown memory subcommand" ]]
}

@test "mg: help output lists subcommands" {
    run "$SCRIPT_PATH" help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "workstream" ]]
    [[ "$output" =~ "memory" ]]
    [[ "$output" =~ "gate" ]]
}

@test "mg: help output mentions aliases" {
    run "$SCRIPT_PATH" help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "ws" ]]
    [[ "$output" =~ "mem" ]]
}

# ============================================================================
# GOLDEN PATH - Normal, expected delegation
# ============================================================================

@test "mg: no args shows help and exits 0" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg workstream status delegates to mg-workstream-status (no ws-id -> usage error from underlying script)" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" workstream status
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "No workstream" ]] || [[ "$output" =~ "required" ]]
}

@test "mg workstream create delegates to mg-workstream-create (no args -> usage error from underlying script)" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" workstream create
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "No arguments" ]] || [[ "$output" =~ "required" ]]
}

@test "mg memory read delegates to mg-memory-read (no args -> usage error from underlying script)" {
    run "$SCRIPT_PATH" memory read
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "No file" ]] || [[ "$output" =~ "required" ]]
}

@test "mg memory write delegates to mg-memory-write (no args -> usage error from underlying script)" {
    run "$SCRIPT_PATH" memory write
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "No arguments" ]] || [[ "$output" =~ "required" ]]
}

@test "mg ws status delegates correctly (same as workstream status)" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" ws status
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "No workstream" ]] || [[ "$output" =~ "required" ]]
}

@test "mg mem read delegates correctly (same as memory read)" {
    run "$SCRIPT_PATH" mem read
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "No file" ]] || [[ "$output" =~ "required" ]]
}

@test "mg workstream status with valid workstream delegates and returns data" {
    cd "$TEST_DIR"
    echo '{"workstream_id":"WS-RTR-1","name":"Router Test","status":"pending","phase":"planning","gate_status":"not_started","agent_id":"dev","created_at":"2026-03-16","coverage":0,"tests":{"total":0,"passing":0,"failing":0},"blockers":[],"dependencies":[]}' \
        > "$MEMORY_DIR/workstream-WS-RTR-1-state.json"
    run "$SCRIPT_PATH" workstream status WS-RTR-1
    [ "$status" -eq 0 ]
    [[ "$output" =~ "WS-RTR-1" ]]
}

@test "mg ws status with valid workstream delegates correctly" {
    cd "$TEST_DIR"
    echo '{"workstream_id":"WS-RTR-2","name":"Router Alias Test","status":"in_progress","phase":"implementation","gate_status":"passing","agent_id":"dev","created_at":"2026-03-16","coverage":80,"tests":{"total":10,"passing":8,"failing":2},"blockers":[],"dependencies":[]}' \
        > "$MEMORY_DIR/workstream-WS-RTR-2-state.json"
    run "$SCRIPT_PATH" ws status WS-RTR-2
    [ "$status" -eq 0 ]
    [[ "$output" =~ "WS-RTR-2" ]]
}

@test "mg memory read with valid file delegates and returns data" {
    cd "$TEST_DIR"
    echo '{"key":"value","count":42}' > "$MEMORY_DIR/test-data.json"
    run "$SCRIPT_PATH" memory read "$MEMORY_DIR/test-data.json"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "value" ]]
}

@test "mg mem read with valid file delegates correctly" {
    cd "$TEST_DIR"
    echo '{"key":"alias_test"}' > "$MEMORY_DIR/alias-data.json"
    run "$SCRIPT_PATH" mem read "$MEMORY_DIR/alias-data.json"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "alias_test" ]]
}

@test "mg: exit code propagates from delegated script" {
    cd "$TEST_DIR"
    # No workstream file -> underlying script returns 1
    run "$SCRIPT_PATH" workstream status WS-NONEXISTENT-999
    [ "$status" -eq 1 ]
}
