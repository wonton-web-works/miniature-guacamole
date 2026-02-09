#!/usr/bin/env bats
# ============================================================================
# mg-memory-read.bats - Tests for mg-memory-read script
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

    # Expected script location
    SCRIPT_PATH="$HOME/.claude/scripts/mg-memory-read"

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

@test "mg-memory-read: missing jq dependency" {
    # Test that script fails gracefully when jq is not installed
    skip "TODO: Mock PATH to hide jq binary"
}

@test "mg-memory-read: no arguments provided" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "required" ]]
}

@test "mg-memory-read: nonexistent file" {
    run "$SCRIPT_PATH" "/nonexistent/path/to/file.json"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "not found" ]] || [[ "$output" =~ "does not exist" ]]
}

@test "mg-memory-read: file is a directory" {
    run "$SCRIPT_PATH" "$FIXTURES_DIR"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "directory" ]] || [[ "$output" =~ "not a file" ]]
}

@test "mg-memory-read: invalid JSON file" {
    run "$SCRIPT_PATH" "$FIXTURES_DIR/invalid.json"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "parse error" ]]
}

@test "mg-memory-read: unreadable file (permissions)" {
    # Create a file with no read permissions
    local unreadable_file="$TEST_DIR/unreadable.json"
    echo '{"test": "data"}' > "$unreadable_file"
    chmod 000 "$unreadable_file"

    run "$SCRIPT_PATH" "$unreadable_file"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "permission" ]] || [[ "$output" =~ "cannot read" ]]

    # Cleanup
    chmod 644 "$unreadable_file"
}

@test "mg-memory-read: non-JSON file extension" {
    local text_file="$TEST_DIR/test.txt"
    echo "plain text" > "$text_file"

    run "$SCRIPT_PATH" "$text_file"
    [ "$status" -eq 1 ]
    [[ "$output" =~ ".json" ]] || [[ "$output" =~ "invalid" ]]
}

@test "mg-memory-read: corrupted JSON (truncated)" {
    local corrupted_file="$TEST_DIR/corrupted.json"
    echo '{"workstream_id": "WS-1", "name": "Test", "status": "in_pro' > "$corrupted_file"

    run "$SCRIPT_PATH" "$corrupted_file"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "parse error" ]] || [[ "$output" =~ "invalid" ]]
}

@test "mg-memory-read: file with null bytes" {
    local null_file="$TEST_DIR/null-bytes.json"
    printf '{"test":\x00"value"}' > "$null_file"

    run "$SCRIPT_PATH" "$null_file"
    [ "$status" -eq 1 ]
}

@test "mg-memory-read: symbolic link to nonexistent file" {
    local broken_link="$TEST_DIR/broken-link.json"
    ln -s "/nonexistent/target.json" "$broken_link"

    run "$SCRIPT_PATH" "$broken_link"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "not found" ]] || [[ "$output" =~ "does not exist" ]]
}

@test "mg-memory-read: too many arguments" {
    run "$SCRIPT_PATH" "$FIXTURES_DIR/valid-workstream.json" "extra" "args"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "too many" ]]
}

@test "mg-memory-read: --help flag displays usage" {
    run "$SCRIPT_PATH" --help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
    [[ "$output" =~ "mg-memory-read" ]]
    [[ "$output" =~ ".claude/memory" ]]
}

@test "mg-memory-read: -h flag displays usage" {
    run "$SCRIPT_PATH" -h
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg-memory-read: file path with spaces (unquoted)" {
    local space_file="$TEST_DIR/file with spaces.json"
    echo '{"test": "value"}' > "$space_file"

    # Should handle spaces correctly
    run "$SCRIPT_PATH" "$space_file"
    [ "$status" -eq 0 ]
}

@test "mg-memory-read: file path with special characters" {
    local special_file="$TEST_DIR/file-with-\$pecial.json"
    echo '{"test": "value"}' > "$special_file"

    run "$SCRIPT_PATH" "$special_file"
    [ "$status" -eq 0 ]
}

# ============================================================================
# BOUNDARY TESTS - Edge cases, limits, unusual but valid inputs
# ============================================================================

@test "mg-memory-read: empty JSON file" {
    run "$SCRIPT_PATH" "$FIXTURES_DIR/empty.json"
    [ "$status" -eq 0 ]
    [[ "$output" == "{}" ]] || [[ "$output" =~ "{}" ]]
}

@test "mg-memory-read: minimal valid JSON (empty object)" {
    local minimal_file="$TEST_DIR/minimal.json"
    echo '{}' > "$minimal_file"

    run "$SCRIPT_PATH" "$minimal_file"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "{}" ]]
}

@test "mg-memory-read: minimal valid JSON (empty array)" {
    local array_file="$TEST_DIR/array.json"
    echo '[]' > "$array_file"

    run "$SCRIPT_PATH" "$array_file"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "[]" ]]
}

@test "mg-memory-read: deeply nested JSON structure" {
    run "$SCRIPT_PATH" "$FIXTURES_DIR/large-nested.json"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "deeply nested value" ]]
    [[ "$output" =~ "level5" ]]
}

@test "mg-memory-read: large JSON file (>1KB)" {
    local large_file="$TEST_DIR/large.json"
    {
        echo '{"items": ['
        for i in {1..100}; do
            echo "  {\"id\": $i, \"name\": \"item_$i\", \"value\": $((i * 100))},"
        done
        echo '  {"id": 101, "name": "item_101", "value": 10100}'
        echo ']}'
    } > "$large_file"

    run "$SCRIPT_PATH" "$large_file"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "item_1" ]]
    [[ "$output" =~ "item_101" ]]
}

@test "mg-memory-read: JSON with Unicode characters" {
    local unicode_file="$TEST_DIR/unicode.json"
    echo '{"emoji": "🚀", "chinese": "你好", "arabic": "مرحبا"}' > "$unicode_file"

    run "$SCRIPT_PATH" "$unicode_file"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "emoji" ]]
}

@test "mg-memory-read: JSON with escaped characters" {
    local escaped_file="$TEST_DIR/escaped.json"
    echo '{"path": "C:\\Users\\test", "quote": "He said \"hello\""}' > "$escaped_file"

    run "$SCRIPT_PATH" "$escaped_file"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "path" ]]
}

@test "mg-memory-read: JSON with null values" {
    local null_file="$TEST_DIR/nulls.json"
    echo '{"field1": null, "field2": "value", "field3": null}' > "$null_file"

    run "$SCRIPT_PATH" "$null_file"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "null" ]]
}

@test "mg-memory-read: JSON with boolean values" {
    local bool_file="$TEST_DIR/booleans.json"
    echo '{"enabled": true, "disabled": false}' > "$bool_file"

    run "$SCRIPT_PATH" "$bool_file"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "true" ]]
    [[ "$output" =~ "false" ]]
}

@test "mg-memory-read: JSON with numeric edge cases" {
    local numeric_file="$TEST_DIR/numbers.json"
    echo '{"zero": 0, "negative": -42, "float": 3.14159, "exp": 1.5e10}' > "$numeric_file"

    run "$SCRIPT_PATH" "$numeric_file"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "3.14159" ]]
}

@test "mg-memory-read: symbolic link to valid file" {
    local link_file="$TEST_DIR/symlink.json"
    ln -s "$FIXTURES_DIR/valid-workstream.json" "$link_file"

    run "$SCRIPT_PATH" "$link_file"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "WS-TEST-1" ]]
}

@test "mg-memory-read: file with trailing newlines" {
    local trailing_file="$TEST_DIR/trailing.json"
    printf '{"test": "value"}\n\n\n' > "$trailing_file"

    run "$SCRIPT_PATH" "$trailing_file"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "test" ]]
}

@test "mg-memory-read: file with no trailing newline" {
    local no_newline_file="$TEST_DIR/no-newline.json"
    printf '{"test": "value"}' > "$no_newline_file"

    run "$SCRIPT_PATH" "$no_newline_file"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "test" ]]
}

@test "mg-memory-read: absolute path vs relative path" {
    local rel_file="$TEST_DIR/relative.json"
    echo '{"test": "value"}' > "$rel_file"

    # Test with absolute path
    run "$SCRIPT_PATH" "$rel_file"
    [ "$status" -eq 0 ]

    # Test with relative path (from test directory)
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "./relative.json"
    [ "$status" -eq 0 ]
}

# ============================================================================
# GOLDEN PATH - Normal, expected operations
# ============================================================================

@test "mg-memory-read: read valid workstream state file" {
    run "$SCRIPT_PATH" "$FIXTURES_DIR/valid-workstream.json"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "WS-TEST-1" ]]
    [[ "$output" =~ "Test Workstream" ]]
    [[ "$output" =~ "in_progress" ]]
}

@test "mg-memory-read: read valid tasks file" {
    run "$SCRIPT_PATH" "$FIXTURES_DIR/valid-tasks.json"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "task-1" ]]
    [[ "$output" =~ "tasks" ]]
}

@test "mg-memory-read: output is pretty-printed" {
    run "$SCRIPT_PATH" "$FIXTURES_DIR/valid-workstream.json"
    [ "$status" -eq 0 ]
    # Pretty-printed JSON has indentation
    [[ "$output" =~ $'\n  ' ]] || [[ "$output" =~ $'  "' ]]
}

@test "mg-memory-read: output contains all top-level keys" {
    run "$SCRIPT_PATH" "$FIXTURES_DIR/valid-workstream.json"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "workstream_id" ]]
    [[ "$output" =~ "name" ]]
    [[ "$output" =~ "status" ]]
    [[ "$output" =~ "phase" ]]
    [[ "$output" =~ "agent_id" ]]
}

@test "mg-memory-read: output contains nested objects" {
    run "$SCRIPT_PATH" "$FIXTURES_DIR/valid-workstream.json"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "technical_approach" ]]
    [[ "$output" =~ "scope" ]]
    [[ "$output" =~ "tests" ]]
}

@test "mg-memory-read: output contains arrays" {
    run "$SCRIPT_PATH" "$FIXTURES_DIR/valid-workstream.json"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "acceptance_criteria" ]]
    [[ "$output" =~ "Test criteria 1" ]]
}

@test "mg-memory-read: can read from .claude/memory directory" {
    # Copy fixture to test .claude/memory structure
    local memory_dir="$TEST_DIR/.claude/memory"
    mkdir -p "$memory_dir"
    cp "$FIXTURES_DIR/valid-workstream.json" "$memory_dir/workstream-WS-TEST-1-state.json"

    run "$SCRIPT_PATH" "$memory_dir/workstream-WS-TEST-1-state.json"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "WS-TEST-1" ]]
}

@test "mg-memory-read: handles typical workstream state schema" {
    run "$SCRIPT_PATH" "$FIXTURES_DIR/valid-workstream.json"
    [ "$status" -eq 0 ]
    # Validate typical workstream state fields
    [[ "$output" =~ "workstream_id" ]]
    [[ "$output" =~ "status" ]]
    [[ "$output" =~ "phase" ]]
    [[ "$output" =~ "agent_id" ]]
    [[ "$output" =~ "gate_status" ]]
    [[ "$output" =~ "coverage" ]]
}

@test "mg-memory-read: exit code 0 on success" {
    run "$SCRIPT_PATH" "$FIXTURES_DIR/valid-workstream.json"
    [ "$status" -eq 0 ]
}

@test "mg-memory-read: can be piped to other commands" {
    # Test that output can be used in a pipeline
    run bash -c "$SCRIPT_PATH '$FIXTURES_DIR/valid-workstream.json' | grep -q 'WS-TEST-1'"
    [ "$status" -eq 0 ]
}

@test "mg-memory-read: idempotent (multiple reads return same result)" {
    local first_output second_output
    first_output=$("$SCRIPT_PATH" "$FIXTURES_DIR/valid-workstream.json")
    second_output=$("$SCRIPT_PATH" "$FIXTURES_DIR/valid-workstream.json")

    [[ "$first_output" == "$second_output" ]]
}

@test "mg-memory-read: does not modify source file" {
    local test_file="$TEST_DIR/readonly-test.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    local checksum_before checksum_after
    checksum_before=$(md5 -q "$test_file")

    "$SCRIPT_PATH" "$test_file" > /dev/null

    checksum_after=$(md5 -q "$test_file")
    [[ "$checksum_before" == "$checksum_after" ]]
}
