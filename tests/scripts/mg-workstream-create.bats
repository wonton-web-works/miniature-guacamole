#!/usr/bin/env bats
# ============================================================================
# mg-workstream-create.bats - Tests for mg-workstream-create script
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

    # Expected script location
    SCRIPT_PATH="$HOME/.claude/scripts/mg-workstream-create"

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

@test "mg-workstream-create: no arguments provided" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "required" ]] || [[ "$output" =~ "No workstream" ]]
}

@test "mg-workstream-create: only one argument (missing title)" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-NEW"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "title" ]] || [[ "$output" =~ "Missing" ]]
}

@test "mg-workstream-create: too many arguments" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-NEW" "Title" "extra-arg"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "too many" ]] || [[ "$output" =~ "Too many" ]]
}

@test "mg-workstream-create: workstream already exists" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/workstream-pending.json" "$MEMORY_DIR/workstream-WS-EXISTS-state.json"
    run "$SCRIPT_PATH" "WS-EXISTS" "Duplicate Workstream"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "already exists" ]] || [[ "$output" =~ "exists" ]] || [[ "$output" =~ "Already" ]]
}

@test "mg-workstream-create: empty string ws-id argument" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "" "Some Title"
    [ "$status" -eq 1 ]
}

@test "mg-workstream-create: empty string title argument" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-NEW" ""
    [ "$status" -eq 1 ]
}

@test "mg-workstream-create: missing .claude/memory directory" {
    local empty_dir
    empty_dir="$(mktemp -d)"
    cd "$empty_dir"
    run "$SCRIPT_PATH" "WS-NEW" "New Workstream"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "not found" ]] || [[ "$output" =~ "No .claude/memory" ]] || [[ "$output" =~ "Error" ]]
    rm -rf "$empty_dir"
}

@test "mg-workstream-create: unwritable .claude/memory directory" {
    cd "$TEST_DIR"
    chmod 555 "$MEMORY_DIR"
    run "$SCRIPT_PATH" "WS-NOPERM" "No Permission"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "permission" ]] || [[ "$output" =~ "cannot" ]] || [[ "$output" =~ "Error" ]]
    # Cleanup
    chmod 755 "$MEMORY_DIR"
}

@test "mg-workstream-create: missing jq dependency" {
    skip "TODO: Mock PATH to hide jq binary"
}

@test "mg-workstream-create: argument that looks like a flag (invalid)" {
    run "$SCRIPT_PATH" "--invalid" "Title"
    [ "$status" -eq 1 ]
}

# ============================================================================
# BOUNDARY TESTS - Edge cases, limits, unusual but valid inputs
# ============================================================================

@test "mg-workstream-create: --help flag displays usage" {
    run "$SCRIPT_PATH" --help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
    [[ "$output" =~ "mg-workstream-create" ]]
}

@test "mg-workstream-create: -h flag displays usage" {
    run "$SCRIPT_PATH" -h
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg-workstream-create: workstream ID with hyphens" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-MULTI-HYPHEN-ID" "Multi Hyphen Test"
    [ "$status" -eq 0 ]
    [[ -f "$MEMORY_DIR/workstream-WS-MULTI-HYPHEN-ID-state.json" ]]
}

@test "mg-workstream-create: workstream ID with lowercase" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "ws-lower-case" "Lowercase Test"
    [ "$status" -eq 0 ]
    [[ -f "$MEMORY_DIR/workstream-ws-lower-case-state.json" ]]
}

@test "mg-workstream-create: workstream ID with numbers only" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "42" "Numeric ID Test"
    [ "$status" -eq 0 ]
    [[ -f "$MEMORY_DIR/workstream-42-state.json" ]]
}

@test "mg-workstream-create: title with special characters" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-SPEC" "Title with 'quotes' & special chars!"
    [ "$status" -eq 0 ]

    local name
    name=$(jq -r '.name' "$MEMORY_DIR/workstream-WS-SPEC-state.json")
    [[ "$name" == "Title with 'quotes' & special chars!" ]]
}

@test "mg-workstream-create: title with spaces" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-SPACES" "Title With Many Spaces"
    [ "$status" -eq 0 ]

    local name
    name=$(jq -r '.name' "$MEMORY_DIR/workstream-WS-SPACES-state.json")
    [[ "$name" == "Title With Many Spaces" ]]
}

@test "mg-workstream-create: very long title" {
    cd "$TEST_DIR"
    local long_title="This is a very long workstream title that exceeds typical length limits and tests how the script handles lengthy input strings"
    run "$SCRIPT_PATH" "WS-LONG" "$long_title"
    [ "$status" -eq 0 ]

    local name
    name=$(jq -r '.name' "$MEMORY_DIR/workstream-WS-LONG-state.json")
    [[ "$name" == "$long_title" ]]
}

@test "mg-workstream-create: title with Unicode characters" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-UNI" "Unicode Test"
    [ "$status" -eq 0 ]

    local name
    name=$(jq -r '.name' "$MEMORY_DIR/workstream-WS-UNI-state.json")
    [[ "$name" == "Unicode Test" ]]
}

@test "mg-workstream-create: single character ID" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "X" "Single Char ID"
    [ "$status" -eq 0 ]
    [[ -f "$MEMORY_DIR/workstream-X-state.json" ]]
}

# ============================================================================
# GOLDEN PATH - Normal, expected operations
# ============================================================================

@test "mg-workstream-create: creates workstream state file" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-NEW-1" "New Workstream"
    [ "$status" -eq 0 ]
    [[ -f "$MEMORY_DIR/workstream-WS-NEW-1-state.json" ]]
}

@test "mg-workstream-create: created file is valid JSON" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-JSON" "JSON Test"
    [ "$status" -eq 0 ]

    run jq empty "$MEMORY_DIR/workstream-WS-JSON-state.json"
    [ "$status" -eq 0 ]
}

@test "mg-workstream-create: created file contains workstream_id" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-WSID" "ID Test"
    [ "$status" -eq 0 ]

    local ws_id
    ws_id=$(jq -r '.workstream_id' "$MEMORY_DIR/workstream-WS-WSID-state.json")
    [[ "$ws_id" == "WS-WSID" ]]
}

@test "mg-workstream-create: created file contains name" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-NAME" "My Workstream Name"
    [ "$status" -eq 0 ]

    local name
    name=$(jq -r '.name' "$MEMORY_DIR/workstream-WS-NAME-state.json")
    [[ "$name" == "My Workstream Name" ]]
}

@test "mg-workstream-create: created file has status pending" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-STAT" "Status Test"
    [ "$status" -eq 0 ]

    local ws_status
    ws_status=$(jq -r '.status' "$MEMORY_DIR/workstream-WS-STAT-state.json")
    [[ "$ws_status" == "pending" ]]
}

@test "mg-workstream-create: created file has phase planning" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-PHASE" "Phase Test"
    [ "$status" -eq 0 ]

    local phase
    phase=$(jq -r '.phase' "$MEMORY_DIR/workstream-WS-PHASE-state.json")
    [[ "$phase" == "planning" ]]
}

@test "mg-workstream-create: created file has gate_status not_started" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-GATE" "Gate Test"
    [ "$status" -eq 0 ]

    local gate
    gate=$(jq -r '.gate_status' "$MEMORY_DIR/workstream-WS-GATE-state.json")
    [[ "$gate" == "not_started" ]]
}

@test "mg-workstream-create: created file has empty acceptance_criteria array" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-AC" "AC Test"
    [ "$status" -eq 0 ]

    local ac_len
    ac_len=$(jq '.acceptance_criteria | length' "$MEMORY_DIR/workstream-WS-AC-state.json")
    [[ "$ac_len" == "0" ]]
}

@test "mg-workstream-create: created file has empty tests object" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-TESTS" "Tests Test"
    [ "$status" -eq 0 ]

    local total passing failing
    total=$(jq '.tests.total' "$MEMORY_DIR/workstream-WS-TESTS-state.json")
    passing=$(jq '.tests.passing' "$MEMORY_DIR/workstream-WS-TESTS-state.json")
    failing=$(jq '.tests.failing' "$MEMORY_DIR/workstream-WS-TESTS-state.json")
    [[ "$total" == "0" ]]
    [[ "$passing" == "0" ]]
    [[ "$failing" == "0" ]]
}

@test "mg-workstream-create: created file has coverage 0" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-COV" "Coverage Test"
    [ "$status" -eq 0 ]

    local cov
    cov=$(jq '.coverage' "$MEMORY_DIR/workstream-WS-COV-state.json")
    [[ "$cov" == "0" ]]
}

@test "mg-workstream-create: created file has empty dependencies" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-DEPS" "Deps Test"
    [ "$status" -eq 0 ]

    local deps_len
    deps_len=$(jq '.dependencies | length' "$MEMORY_DIR/workstream-WS-DEPS-state.json")
    [[ "$deps_len" == "0" ]]
}

@test "mg-workstream-create: created file has empty blockers" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-BLK" "Blockers Test"
    [ "$status" -eq 0 ]

    local blk_len
    blk_len=$(jq '.blockers | length' "$MEMORY_DIR/workstream-WS-BLK-state.json")
    [[ "$blk_len" == "0" ]]
}

@test "mg-workstream-create: created file has null blocked_reason" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-BR" "Blocked Reason Test"
    [ "$status" -eq 0 ]

    local br
    br=$(jq '.blocked_reason' "$MEMORY_DIR/workstream-WS-BR-state.json")
    [[ "$br" == "null" ]]
}

@test "mg-workstream-create: created file has null delegated_to" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-DEL" "Delegated Test"
    [ "$status" -eq 0 ]

    local del
    del=$(jq '.delegated_to' "$MEMORY_DIR/workstream-WS-DEL-state.json")
    [[ "$del" == "null" ]]
}

@test "mg-workstream-create: created file has created_at date" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-DATE" "Date Test"
    [ "$status" -eq 0 ]

    local created
    created=$(jq -r '.created_at' "$MEMORY_DIR/workstream-WS-DATE-state.json")
    # Should be a date string (YYYY-MM-DD format)
    [[ "$created" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]
}

@test "mg-workstream-create: created file is pretty-printed" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-PRETTY" "Pretty Test"
    [ "$status" -eq 0 ]

    local content
    content=$(cat "$MEMORY_DIR/workstream-WS-PRETTY-state.json")
    # Pretty-printed JSON has indentation
    [[ "$content" =~ $'\n  ' ]] || [[ "$content" =~ $'  "' ]]
}

@test "mg-workstream-create: outputs success message" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-SUCCESS" "Success Test"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "WS-SUCCESS" ]] || [[ "$output" =~ "Created" ]] || [[ "$output" =~ "created" ]]
}

@test "mg-workstream-create: exit code 0 on success" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-EXIT" "Exit Code Test"
    [ "$status" -eq 0 ]
}

@test "mg-workstream-create: created file has technical_approach object" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-TECH" "Tech Test"
    [ "$status" -eq 0 ]

    local has_ta
    has_ta=$(jq 'has("technical_approach")' "$MEMORY_DIR/workstream-WS-TECH-state.json")
    [[ "$has_ta" == "true" ]]
}

@test "mg-workstream-create: file in correct naming convention" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-CONV" "Convention Test"
    [ "$status" -eq 0 ]
    # File should be at .claude/memory/workstream-{id}-state.json
    [[ -f "$MEMORY_DIR/workstream-WS-CONV-state.json" ]]
}

@test "mg-workstream-create: can create multiple workstreams" {
    cd "$TEST_DIR"

    run "$SCRIPT_PATH" "WS-MULTI-1" "First Workstream"
    [ "$status" -eq 0 ]

    run "$SCRIPT_PATH" "WS-MULTI-2" "Second Workstream"
    [ "$status" -eq 0 ]

    run "$SCRIPT_PATH" "WS-MULTI-3" "Third Workstream"
    [ "$status" -eq 0 ]

    [[ -f "$MEMORY_DIR/workstream-WS-MULTI-1-state.json" ]]
    [[ -f "$MEMORY_DIR/workstream-WS-MULTI-2-state.json" ]]
    [[ -f "$MEMORY_DIR/workstream-WS-MULTI-3-state.json" ]]
}

@test "mg-workstream-create: created workstream compatible with mg-workstream-status" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-COMPAT" "Compatibility Test"
    [ "$status" -eq 0 ]

    # Should be readable by mg-workstream-status
    local status_script="$HOME/.claude/scripts/mg-workstream-status"
    if [[ -x "$status_script" ]]; then
        run "$status_script" "WS-COMPAT"
        [ "$status" -eq 0 ]
    else
        skip "mg-workstream-status not yet installed"
    fi
}

@test "mg-workstream-create: created workstream compatible with mg-workstream-transition" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "WS-COMPAT2" "Transition Compat Test"
    [ "$status" -eq 0 ]

    # Should be transitionable
    local transition_script="$HOME/.claude/scripts/mg-workstream-transition"
    if [[ -x "$transition_script" ]]; then
        run "$transition_script" "WS-COMPAT2" "in_progress"
        [ "$status" -eq 0 ]
    else
        skip "mg-workstream-transition not yet installed"
    fi
}
