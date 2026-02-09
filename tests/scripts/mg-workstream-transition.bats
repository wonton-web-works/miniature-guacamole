#!/usr/bin/env bats
# ============================================================================
# mg-workstream-transition.bats - Tests for mg-workstream-transition script
# ============================================================================
# Test ordering: MISUSE CASES -> BOUNDARY TESTS -> GOLDEN PATH
# Coverage target: 99% of script functionality
# State machine: pending -> in_progress -> qa_review -> code_review -> approved -> merged
# ============================================================================

# Setup and teardown
setup() {
    # Test fixtures directory
    FIXTURES_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/fixtures" && pwd)"

    # Temporary test directory
    TEST_DIR="$(mktemp -d)"

    # Expected script location
    SCRIPT_PATH="$HOME/.claude/scripts/mg-workstream-transition"
    MG_READ="$HOME/.claude/scripts/mg-memory-read"

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

@test "mg-workstream-transition: no arguments provided" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "required" ]] || [[ "$output" =~ "No workstream" ]]
}

@test "mg-workstream-transition: only one argument (missing new status)" {
    run "$SCRIPT_PATH" "WS-1"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "status" ]] || [[ "$output" =~ "Missing" ]]
}

@test "mg-workstream-transition: too many arguments" {
    run "$SCRIPT_PATH" "WS-1" "in_progress" "extra-arg"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "too many" ]] || [[ "$output" =~ "Too many" ]]
}

@test "mg-workstream-transition: nonexistent workstream ID" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-NONEXISTENT-999" "in_progress"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "not found" ]] || [[ "$output" =~ "does not exist" ]] || [[ "$output" =~ "No workstream" ]]
}

@test "mg-workstream-transition: invalid target status" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-INV-state.json"
    run "$SCRIPT_PATH" "WS-INV" "invalid_status"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "Invalid" ]] || [[ "$output" =~ "not a valid" ]]
}

@test "mg-workstream-transition: invalid transition pending -> qa_review (skip)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-SKIP1-state.json"
    run "$SCRIPT_PATH" "WS-SKIP1" "qa_review"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "Invalid" ]] || [[ "$output" =~ "Cannot" ]] || [[ "$output" =~ "cannot" ]]
}

@test "mg-workstream-transition: invalid transition pending -> code_review (skip)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-SKIP2-state.json"
    run "$SCRIPT_PATH" "WS-SKIP2" "code_review"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "Invalid" ]] || [[ "$output" =~ "Cannot" ]] || [[ "$output" =~ "cannot" ]]
}

@test "mg-workstream-transition: invalid transition pending -> approved (skip)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-SKIP3-state.json"
    run "$SCRIPT_PATH" "WS-SKIP3" "approved"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "Invalid" ]] || [[ "$output" =~ "Cannot" ]] || [[ "$output" =~ "cannot" ]]
}

@test "mg-workstream-transition: invalid transition pending -> merged (skip)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-SKIP4-state.json"
    run "$SCRIPT_PATH" "WS-SKIP4" "merged"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "Invalid" ]] || [[ "$output" =~ "Cannot" ]] || [[ "$output" =~ "cannot" ]]
}

@test "mg-workstream-transition: invalid transition in_progress -> pending (backward)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-in-progress.json" "$MEMORY_DIR/workstream-WS-BACK1-state.json"
    run "$SCRIPT_PATH" "WS-BACK1" "pending"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "Invalid" ]] || [[ "$output" =~ "Cannot" ]] || [[ "$output" =~ "cannot" ]]
}

@test "mg-workstream-transition: invalid transition merged -> anything (terminal state)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-merged.json" "$MEMORY_DIR/workstream-WS-TERM1-state.json"
    run "$SCRIPT_PATH" "WS-TERM1" "in_progress"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "Invalid" ]] || [[ "$output" =~ "Cannot" ]] || [[ "$output" =~ "terminal" ]] || [[ "$output" =~ "already merged" ]]
}

@test "mg-workstream-transition: invalid transition merged -> pending (terminal state)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-merged.json" "$MEMORY_DIR/workstream-WS-TERM2-state.json"
    run "$SCRIPT_PATH" "WS-TERM2" "pending"
    [ "$status" -eq 1 ]
}

@test "mg-workstream-transition: transition to same state (no-op)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-SAME-state.json"
    run "$SCRIPT_PATH" "WS-SAME" "pending"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "already" ]] || [[ "$output" =~ "same" ]] || [[ "$output" =~ "Cannot" ]] || [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "Invalid" ]]
}

@test "mg-workstream-transition: unreadable workstream file" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-NOPERM-state.json"
    chmod 000 "$MEMORY_DIR/workstream-WS-NOPERM-state.json"
    run "$SCRIPT_PATH" "WS-NOPERM" "in_progress"
    [ "$status" -eq 1 ]
    # Cleanup
    chmod 644 "$MEMORY_DIR/workstream-WS-NOPERM-state.json"
}

@test "mg-workstream-transition: corrupt JSON in state file" {
    cd "$TEST_DIR"
    echo 'not valid json' > "$MEMORY_DIR/workstream-WS-CORRUPT-state.json"
    run "$SCRIPT_PATH" "WS-CORRUPT" "in_progress"
    [ "$status" -eq 1 ]
}

@test "mg-workstream-transition: empty string ws-id argument" {
    run "$SCRIPT_PATH" "" "in_progress"
    [ "$status" -eq 1 ]
}

@test "mg-workstream-transition: empty string status argument" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-EMPTY-state.json"
    run "$SCRIPT_PATH" "WS-EMPTY" ""
    [ "$status" -eq 1 ]
}

@test "mg-workstream-transition: missing jq dependency" {
    skip "TODO: Mock PATH to hide jq binary"
}

@test "mg-workstream-transition: missing .claude/memory directory" {
    local empty_dir
    empty_dir="$(mktemp -d)"
    cd "$empty_dir"
    run "$SCRIPT_PATH" "WS-1" "in_progress"
    [ "$status" -eq 1 ]
    rm -rf "$empty_dir"
}

# ============================================================================
# BOUNDARY TESTS - Edge cases, limits, unusual but valid inputs
# ============================================================================

@test "mg-workstream-transition: --help flag displays usage" {
    run "$SCRIPT_PATH" --help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
    [[ "$output" =~ "mg-workstream-transition" ]]
}

@test "mg-workstream-transition: -h flag displays usage" {
    run "$SCRIPT_PATH" -h
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg-workstream-transition: help mentions valid states" {
    run "$SCRIPT_PATH" --help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "pending" ]]
    [[ "$output" =~ "in_progress" ]]
    [[ "$output" =~ "qa_review" ]]
    [[ "$output" =~ "code_review" ]]
    [[ "$output" =~ "approved" ]]
    [[ "$output" =~ "merged" ]]
}

@test "mg-workstream-transition: error message shows valid transitions for current state" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-ERR-state.json"
    run "$SCRIPT_PATH" "WS-ERR" "merged"
    [ "$status" -eq 1 ]
    # Error should indicate what the valid next state is
    [[ "$output" =~ "in_progress" ]] || [[ "$output" =~ "pending" ]]
}

@test "mg-workstream-transition: workstream ID with hyphens" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-MULTI-HYP-state.json"
    run "$SCRIPT_PATH" "WS-MULTI-HYP" "in_progress"
    [ "$status" -eq 0 ]
}

@test "mg-workstream-transition: workstream ID with lowercase" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-ws-lower-state.json"
    run "$SCRIPT_PATH" "ws-lower" "in_progress"
    [ "$status" -eq 0 ]
}

@test "mg-workstream-transition: in_progress -> qa_review (middle transition)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-in-progress.json" "$MEMORY_DIR/workstream-WS-MID-state.json"
    run "$SCRIPT_PATH" "WS-MID" "qa_review"
    [ "$status" -eq 0 ]
    # Verify state was updated
    local result
    result=$(jq -r '.status' "$MEMORY_DIR/workstream-WS-MID-state.json")
    [[ "$result" == "qa_review" ]]
}

@test "mg-workstream-transition: qa_review -> code_review" {
    cd "$TEST_DIR"
    local state_file="$MEMORY_DIR/workstream-WS-QA-state.json"
    cp "$FIXTURES_DIR/workstream-in-progress.json" "$state_file"
    # Set to qa_review first
    jq '.status = "qa_review"' "$state_file" > "$state_file.tmp" && mv "$state_file.tmp" "$state_file"
    run "$SCRIPT_PATH" "WS-QA" "code_review"
    [ "$status" -eq 0 ]
    local result
    result=$(jq -r '.status' "$state_file")
    [[ "$result" == "code_review" ]]
}

@test "mg-workstream-transition: code_review -> approved" {
    cd "$TEST_DIR"
    local state_file="$MEMORY_DIR/workstream-WS-CR-state.json"
    cp "$FIXTURES_DIR/workstream-in-progress.json" "$state_file"
    jq '.status = "code_review"' "$state_file" > "$state_file.tmp" && mv "$state_file.tmp" "$state_file"
    run "$SCRIPT_PATH" "WS-CR" "approved"
    [ "$status" -eq 0 ]
    local result
    result=$(jq -r '.status' "$state_file")
    [[ "$result" == "approved" ]]
}

@test "mg-workstream-transition: approved -> merged" {
    cd "$TEST_DIR"
    local state_file="$MEMORY_DIR/workstream-WS-AP-state.json"
    cp "$FIXTURES_DIR/workstream-in-progress.json" "$state_file"
    jq '.status = "approved"' "$state_file" > "$state_file.tmp" && mv "$state_file.tmp" "$state_file"
    run "$SCRIPT_PATH" "WS-AP" "merged"
    [ "$status" -eq 0 ]
    local result
    result=$(jq -r '.status' "$state_file")
    [[ "$result" == "merged" ]]
}

@test "mg-workstream-transition: full state machine traversal" {
    cd "$TEST_DIR"
    local state_file="$MEMORY_DIR/workstream-WS-FULL-state.json"
    cp "$FIXTURES_DIR/workstream-pending.json" "$state_file"

    # pending -> in_progress
    run "$SCRIPT_PATH" "WS-FULL" "in_progress"
    [ "$status" -eq 0 ]

    # in_progress -> qa_review
    run "$SCRIPT_PATH" "WS-FULL" "qa_review"
    [ "$status" -eq 0 ]

    # qa_review -> code_review
    run "$SCRIPT_PATH" "WS-FULL" "code_review"
    [ "$status" -eq 0 ]

    # code_review -> approved
    run "$SCRIPT_PATH" "WS-FULL" "approved"
    [ "$status" -eq 0 ]

    # approved -> merged
    run "$SCRIPT_PATH" "WS-FULL" "merged"
    [ "$status" -eq 0 ]

    # Verify final state
    local result
    result=$(jq -r '.status' "$state_file")
    [[ "$result" == "merged" ]]
}

@test "mg-workstream-transition: preserves other fields after transition" {
    cd "$TEST_DIR"
    local state_file="$MEMORY_DIR/workstream-WS-PRES-state.json"
    cp "$FIXTURES_DIR/workstream-pending.json" "$state_file"

    run "$SCRIPT_PATH" "WS-PRES" "in_progress"
    [ "$status" -eq 0 ]

    # Verify other fields are preserved
    local name agent ws_id
    name=$(jq -r '.name' "$state_file")
    agent=$(jq -r '.agent_id' "$state_file")
    ws_id=$(jq -r '.workstream_id' "$state_file")

    [[ "$name" == "Fixture Workstream Pending" ]]
    [[ "$agent" == "dev" ]]
    [[ "$ws_id" == "WS-FIXTURE-1" ]]
}

# ============================================================================
# GOLDEN PATH - Normal, expected operations
# ============================================================================

@test "mg-workstream-transition: valid transition pending -> in_progress" {
    cd "$TEST_DIR"
    local state_file="$MEMORY_DIR/workstream-WS-GP1-state.json"
    cp "$FIXTURES_DIR/workstream-pending.json" "$state_file"

    run "$SCRIPT_PATH" "WS-GP1" "in_progress"
    [ "$status" -eq 0 ]

    # Verify state was updated
    local result
    result=$(jq -r '.status' "$state_file")
    [[ "$result" == "in_progress" ]]
}

@test "mg-workstream-transition: outputs success message" {
    cd "$TEST_DIR"
    local state_file="$MEMORY_DIR/workstream-WS-MSG-state.json"
    cp "$FIXTURES_DIR/workstream-pending.json" "$state_file"

    run "$SCRIPT_PATH" "WS-MSG" "in_progress"
    [ "$status" -eq 0 ]
    # Should output confirmation of the transition
    [[ "$output" =~ "pending" ]] && [[ "$output" =~ "in_progress" ]]
}

@test "mg-workstream-transition: creates backup via mg-memory-write" {
    cd "$TEST_DIR"
    local state_file="$MEMORY_DIR/workstream-WS-BAK-state.json"
    cp "$FIXTURES_DIR/workstream-pending.json" "$state_file"

    run "$SCRIPT_PATH" "WS-BAK" "in_progress"
    [ "$status" -eq 0 ]

    # Verify .bak file was created
    [[ -f "$state_file.bak" ]]
}

@test "mg-workstream-transition: backup contains previous state" {
    cd "$TEST_DIR"
    local state_file="$MEMORY_DIR/workstream-WS-BAKV-state.json"
    cp "$FIXTURES_DIR/workstream-pending.json" "$state_file"

    run "$SCRIPT_PATH" "WS-BAKV" "in_progress"
    [ "$status" -eq 0 ]

    # Verify backup has previous state
    local bak_status
    bak_status=$(jq -r '.status' "$state_file.bak")
    [[ "$bak_status" == "pending" ]]
}

@test "mg-workstream-transition: file remains valid JSON after transition" {
    cd "$TEST_DIR"
    local state_file="$MEMORY_DIR/workstream-WS-VALID-state.json"
    cp "$FIXTURES_DIR/workstream-pending.json" "$state_file"

    run "$SCRIPT_PATH" "WS-VALID" "in_progress"
    [ "$status" -eq 0 ]

    # Verify JSON is valid
    run jq empty "$state_file"
    [ "$status" -eq 0 ]
}

@test "mg-workstream-transition: exit code 0 on successful transition" {
    cd "$TEST_DIR"
    local state_file="$MEMORY_DIR/workstream-WS-EXIT-state.json"
    cp "$FIXTURES_DIR/workstream-pending.json" "$state_file"

    run "$SCRIPT_PATH" "WS-EXIT" "in_progress"
    [ "$status" -eq 0 ]
}

@test "mg-workstream-transition: exit code 1 on invalid transition" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-FAIL-state.json"
    run "$SCRIPT_PATH" "WS-FAIL" "merged"
    [ "$status" -eq 1 ]
}

@test "mg-workstream-transition: atomic update (no partial writes on error)" {
    cd "$TEST_DIR"
    local state_file="$MEMORY_DIR/workstream-WS-ATOM-state.json"
    cp "$FIXTURES_DIR/workstream-pending.json" "$state_file"

    # Attempt invalid transition
    run "$SCRIPT_PATH" "WS-ATOM" "merged"
    [ "$status" -eq 1 ]

    # Verify original state is preserved (no partial write)
    local result
    result=$(jq -r '.status' "$state_file")
    [[ "$result" == "pending" ]]
}

@test "mg-workstream-transition: consecutive valid transitions" {
    cd "$TEST_DIR"
    local state_file="$MEMORY_DIR/workstream-WS-CONSEC-state.json"
    cp "$FIXTURES_DIR/workstream-pending.json" "$state_file"

    # pending -> in_progress
    "$SCRIPT_PATH" "WS-CONSEC" "in_progress"
    local s1
    s1=$(jq -r '.status' "$state_file")
    [[ "$s1" == "in_progress" ]]

    # in_progress -> qa_review
    "$SCRIPT_PATH" "WS-CONSEC" "qa_review"
    local s2
    s2=$(jq -r '.status' "$state_file")
    [[ "$s2" == "qa_review" ]]
}
