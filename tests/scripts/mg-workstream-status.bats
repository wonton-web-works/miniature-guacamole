#!/usr/bin/env bats
# ============================================================================
# mg-workstream-status.bats - Tests for mg-workstream-status script
# ============================================================================
# Test ordering: MISUSE CASES -> BOUNDARY TESTS -> GOLDEN PATH
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

    # Create temporary .claude/scripts directory for testing
    TEST_CLAUDE_DIR="$TEST_DIR/.claude/scripts"
    mkdir -p "$TEST_CLAUDE_DIR"

    # Copy all mg-* scripts from project to test directory
    cp "$PROJECT_ROOT"/src/framework/scripts/mg-* "$TEST_CLAUDE_DIR/"
    chmod +x "$TEST_CLAUDE_DIR"/mg-*

    SCRIPT_PATH="$TEST_CLAUDE_DIR/mg-workstream-status"

    # Create a .claude/memory directory in test dir
    MEMORY_DIR="$TEST_DIR/.claude/memory"
    mkdir -p "$MEMORY_DIR"

    # Skip if BATS not installed
    if ! command -v bats &> /dev/null; then
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
# MISUSE CASES - Invalid inputs, missing dependencies, error conditions
# ============================================================================

@test "mg-workstream-status: no arguments provided" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "required" ]] || [[ "$output" =~ "No workstream" ]]
}

@test "mg-workstream-status: too many arguments" {
    run "$SCRIPT_PATH" "WS-1" "extra-arg"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "too many" ]] || [[ "$output" =~ "Too many" ]]
}

@test "mg-workstream-status: nonexistent workstream ID" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-NONEXISTENT-999"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "not found" ]] || [[ "$output" =~ "does not exist" ]] || [[ "$output" =~ "No workstream" ]]
}

@test "mg-workstream-status: invalid workstream state file (corrupt JSON)" {
    cd "$TEST_DIR"
    echo 'not valid json {broken' > "$MEMORY_DIR/workstream-WS-BAD-state.json"
    run "$SCRIPT_PATH" "WS-BAD"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "parse" ]] || [[ "$output" =~ "Error" ]]
}

@test "mg-workstream-status: workstream file is a directory" {
    cd "$TEST_DIR"
    mkdir -p "$MEMORY_DIR/workstream-WS-DIR-state.json"
    run "$SCRIPT_PATH" "WS-DIR"
    [ "$status" -eq 1 ]
}

@test "mg-workstream-status: unreadable workstream file" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-NOPERM-state.json"
    chmod 000 "$MEMORY_DIR/workstream-WS-NOPERM-state.json"
    run "$SCRIPT_PATH" "WS-NOPERM"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "permission" ]] || [[ "$output" =~ "cannot" ]] || [[ "$output" =~ "Error" ]]
    # Cleanup
    chmod 644 "$MEMORY_DIR/workstream-WS-NOPERM-state.json"
}

@test "mg-workstream-status: missing .claude/memory directory" {
    local empty_dir
    empty_dir="$(mktemp -d)"
    cd "$empty_dir"
    run "$SCRIPT_PATH" "WS-1"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "not found" ]] || [[ "$output" =~ "No .claude/memory" ]] || [[ "$output" =~ "Error" ]]
    rm -rf "$empty_dir"
}

@test "mg-workstream-status: empty string argument" {
    run "$SCRIPT_PATH" ""
    [ "$status" -eq 1 ]
}

@test "mg-workstream-status: argument that looks like a flag (invalid)" {
    run "$SCRIPT_PATH" "--invalid"
    [ "$status" -eq 1 ]
}

@test "mg-workstream-status: missing jq dependency" {
    skip "TODO: Mock PATH to hide jq binary"
}

# ============================================================================
# BOUNDARY TESTS - Edge cases, limits, unusual but valid inputs
# ============================================================================

@test "mg-workstream-status: --help flag displays usage" {
    run "$SCRIPT_PATH" --help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
    [[ "$output" =~ "mg-workstream-status" ]]
}

@test "mg-workstream-status: -h flag displays usage" {
    run "$SCRIPT_PATH" -h
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg-workstream-status: workstream ID with hyphens" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-MULTI-HYPHEN-ID-state.json"
    run "$SCRIPT_PATH" "WS-MULTI-HYPHEN-ID"
    [ "$status" -eq 0 ]
}

@test "mg-workstream-status: workstream ID with lowercase" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-ws-lower-state.json"
    run "$SCRIPT_PATH" "ws-lower"
    [ "$status" -eq 0 ]
}

@test "mg-workstream-status: workstream with no blockers field" {
    cd "$TEST_DIR"
    local no_blockers_file="$MEMORY_DIR/workstream-WS-NOBLK-state.json"
    echo '{"workstream_id":"WS-NOBLK","name":"No Blockers","status":"pending","phase":"planning","gate_status":"not_started"}' > "$no_blockers_file"
    run "$SCRIPT_PATH" "WS-NOBLK"
    [ "$status" -eq 0 ]
}

@test "mg-workstream-status: workstream with empty blockers array" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-EMPTBLK-state.json"
    run "$SCRIPT_PATH" "WS-EMPTBLK"
    [ "$status" -eq 0 ]
    # Should not show blockers section or show "None"
    [[ "$output" =~ "None" ]] || ! [[ "$output" =~ "Blockers:" ]] || [[ "$output" =~ "0" ]]
}

@test "mg-workstream-status: workstream with active blockers" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-in-progress.json" "$MEMORY_DIR/workstream-WS-BLOCKED-state.json"
    run "$SCRIPT_PATH" "WS-BLOCKED"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Need API access" ]] || [[ "$output" =~ "Blocker" ]] || [[ "$output" =~ "blocker" ]]
}

@test "mg-workstream-status: workstream in merged/terminal state" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-merged.json" "$MEMORY_DIR/workstream-WS-DONE-state.json"
    run "$SCRIPT_PATH" "WS-DONE"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "merged" ]]
}

@test "mg-workstream-status: workstream with numeric-only ID suffix" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-42-state.json"
    run "$SCRIPT_PATH" "42"
    [ "$status" -eq 0 ]
}

@test "mg-workstream-status: minimal valid workstream (few fields)" {
    cd "$TEST_DIR"
    echo '{"workstream_id":"WS-MIN","name":"Minimal","status":"pending","phase":"planning","gate_status":"not_started"}' > "$MEMORY_DIR/workstream-WS-MIN-state.json"
    run "$SCRIPT_PATH" "WS-MIN"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "WS-MIN" ]]
    [[ "$output" =~ "Minimal" ]]
    [[ "$output" =~ "pending" ]]
}

# ============================================================================
# GOLDEN PATH - Normal, expected operations
# ============================================================================

@test "mg-workstream-status: displays workstream ID" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-FIXTURE-1-state.json"
    run "$SCRIPT_PATH" "WS-FIXTURE-1"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "WS-FIXTURE-1" ]]
}

@test "mg-workstream-status: displays workstream name" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-FIXTURE-1-state.json"
    run "$SCRIPT_PATH" "WS-FIXTURE-1"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Fixture Workstream Pending" ]]
}

@test "mg-workstream-status: displays status" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-FIXTURE-1-state.json"
    run "$SCRIPT_PATH" "WS-FIXTURE-1"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "pending" ]]
}

@test "mg-workstream-status: displays gate status" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-FIXTURE-1-state.json"
    run "$SCRIPT_PATH" "WS-FIXTURE-1"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "not_started" ]] || [[ "$output" =~ "Gate" ]] || [[ "$output" =~ "gate" ]]
}

@test "mg-workstream-status: displays phase" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-FIXTURE-1-state.json"
    run "$SCRIPT_PATH" "WS-FIXTURE-1"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "planning" ]]
}

@test "mg-workstream-status: displays in-progress workstream correctly" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-in-progress.json" "$MEMORY_DIR/workstream-WS-FIXTURE-2-state.json"
    run "$SCRIPT_PATH" "WS-FIXTURE-2"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "WS-FIXTURE-2" ]]
    [[ "$output" =~ "in_progress" ]]
    [[ "$output" =~ "implementation" ]]
}

@test "mg-workstream-status: displays test counts" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-in-progress.json" "$MEMORY_DIR/workstream-WS-FIXTURE-2-state.json"
    run "$SCRIPT_PATH" "WS-FIXTURE-2"
    [ "$status" -eq 0 ]
    # Should show test information
    [[ "$output" =~ "10" ]] || [[ "$output" =~ "test" ]] || [[ "$output" =~ "Test" ]]
}

@test "mg-workstream-status: displays coverage" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-in-progress.json" "$MEMORY_DIR/workstream-WS-FIXTURE-2-state.json"
    run "$SCRIPT_PATH" "WS-FIXTURE-2"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "80" ]] || [[ "$output" =~ "coverage" ]] || [[ "$output" =~ "Coverage" ]]
}

@test "mg-workstream-status: output is formatted (not raw JSON)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-FIXTURE-1-state.json"
    run "$SCRIPT_PATH" "WS-FIXTURE-1"
    [ "$status" -eq 0 ]
    # Should NOT be raw JSON - should be human-readable formatted
    # Raw JSON would have { at start
    ! [[ "${lines[0]}" == "{" ]]
}

@test "mg-workstream-status: exit code 0 on success" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-FIXTURE-1-state.json"
    run "$SCRIPT_PATH" "WS-FIXTURE-1"
    [ "$status" -eq 0 ]
}

@test "mg-workstream-status: idempotent (same output on repeated calls)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-FIXTURE-1-state.json"

    local first_output second_output
    first_output=$(cd "$TEST_DIR" && "$SCRIPT_PATH" "WS-FIXTURE-1")
    second_output=$(cd "$TEST_DIR" && "$SCRIPT_PATH" "WS-FIXTURE-1")
    [[ "$first_output" == "$second_output" ]]
}

@test "mg-workstream-status: does not modify state file" {
    cd "$TEST_DIR"
    local state_file="$MEMORY_DIR/workstream-WS-FIXTURE-1-state.json"
    cp "$FIXTURES_DIR/workstream-pending.json" "$state_file"

    local checksum_before checksum_after
    checksum_before=$(md5 -q "$state_file")

    "$SCRIPT_PATH" "WS-FIXTURE-1" > /dev/null

    checksum_after=$(md5 -q "$state_file")
    [[ "$checksum_before" == "$checksum_after" ]]
}

@test "mg-workstream-status: can be piped to other commands" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-FIXTURE-1-state.json"
    run bash -c "cd '$TEST_DIR' && '$SCRIPT_PATH' 'WS-FIXTURE-1' | grep -q 'WS-FIXTURE-1'"
    [ "$status" -eq 0 ]
}

@test "mg-workstream-status: shows blockers when present" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-in-progress.json" "$MEMORY_DIR/workstream-WS-BLK-state.json"
    run "$SCRIPT_PATH" "WS-BLK"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Need API access" ]]
}

@test "mg-workstream-status: shows dependencies when present" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-in-progress.json" "$MEMORY_DIR/workstream-WS-DEP-state.json"
    run "$SCRIPT_PATH" "WS-DEP"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "WS-FIXTURE-1" ]] || [[ "$output" =~ "depend" ]] || [[ "$output" =~ "Depend" ]]
}
