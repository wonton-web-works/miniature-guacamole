#!/usr/bin/env bats
# ============================================================================
# mg-memory-write.bats - Tests for mg-memory-write script
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

    # Create temporary .claude/scripts directory for testing
    TEST_CLAUDE_DIR="$TEST_DIR/.claude/scripts"
    mkdir -p "$TEST_CLAUDE_DIR"

    # Copy all mg-* scripts from project to test directory
    cp "$PROJECT_ROOT"/src/framework/scripts/mg-* "$TEST_CLAUDE_DIR/"
    chmod +x "$TEST_CLAUDE_DIR"/mg-*

    SCRIPT_PATH="$TEST_CLAUDE_DIR/mg-memory-write"

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

@test "mg-memory-write: missing jq dependency" {
    skip "TODO: Mock PATH to hide jq binary"
}

@test "mg-memory-write: no arguments provided" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "required" ]]
}

@test "mg-memory-write: only file argument (missing jq expression)" {
    local test_file="$TEST_DIR/test.json"
    echo '{"test": "value"}' > "$test_file"

    run "$SCRIPT_PATH" "$test_file"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "expression" ]]
}

@test "mg-memory-write: nonexistent file" {
    run "$SCRIPT_PATH" "/nonexistent/path/to/file.json" '.status = "updated"'
    [ "$status" -eq 1 ]
    [[ "$output" =~ "not found" ]] || [[ "$output" =~ "does not exist" ]]
}

@test "mg-memory-write: file is a directory" {
    run "$SCRIPT_PATH" "$FIXTURES_DIR" '.status = "updated"'
    [ "$status" -eq 1 ]
    [[ "$output" =~ "directory" ]] || [[ "$output" =~ "not a file" ]]
}

@test "mg-memory-write: invalid JSON file" {
    local invalid_file="$TEST_DIR/invalid.json"
    echo 'not valid json' > "$invalid_file"

    run "$SCRIPT_PATH" "$invalid_file" '.status = "updated"'
    [ "$status" -eq 1 ]
    [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "parse error" ]]
}

@test "mg-memory-write: invalid jq expression" {
    local test_file="$TEST_DIR/test.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    run "$SCRIPT_PATH" "$test_file" '.invalid syntax here'
    [ "$status" -eq 1 ]
    [[ "$output" =~ "jq" ]] || [[ "$output" =~ "expression" ]] || [[ "$output" =~ "error" ]]
}

@test "mg-memory-write: unreadable file (no read permissions)" {
    local unreadable_file="$TEST_DIR/unreadable.json"
    echo '{"test": "data"}' > "$unreadable_file"
    chmod 000 "$unreadable_file"

    run "$SCRIPT_PATH" "$unreadable_file" '.status = "updated"'
    [ "$status" -eq 1 ]
    [[ "$output" =~ "permission" ]] || [[ "$output" =~ "cannot read" ]]

    # Cleanup
    chmod 644 "$unreadable_file"
}

@test "mg-memory-write: unwritable file (no write permissions)" {
    local readonly_file="$TEST_DIR/readonly.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$readonly_file"
    chmod 444 "$readonly_file"

    run "$SCRIPT_PATH" "$readonly_file" '.status = "updated"'
    [ "$status" -eq 1 ]
    [[ "$output" =~ "permission" ]] || [[ "$output" =~ "cannot write" ]]

    # Cleanup
    chmod 644 "$readonly_file"
}

@test "mg-memory-write: unwritable directory (cannot create backup)" {
    local readonly_dir="$TEST_DIR/readonly_dir"
    mkdir -p "$readonly_dir"
    local readonly_file="$readonly_dir/test.json"
    echo '{"test": "value"}' > "$readonly_file"
    chmod 555 "$readonly_dir"

    run "$SCRIPT_PATH" "$readonly_file" '.status = "updated"'
    [ "$status" -eq 1 ]
    [[ "$output" =~ "permission" ]] || [[ "$output" =~ "backup" ]]

    # Cleanup
    chmod 755 "$readonly_dir"
}

@test "mg-memory-write: --help flag displays usage" {
    run "$SCRIPT_PATH" --help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
    [[ "$output" =~ "mg-memory-write" ]]
    [[ "$output" =~ "jq expression" ]]
    [[ "$output" =~ ".bak" ]]
}

@test "mg-memory-write: -h flag displays usage" {
    run "$SCRIPT_PATH" -h
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg-memory-write: jq expression that produces non-JSON" {
    local test_file="$TEST_DIR/test.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    # Expression that returns a string instead of JSON object
    run "$SCRIPT_PATH" "$test_file" '.name'
    [ "$status" -eq 1 ]
    [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "object" ]]
}

@test "mg-memory-write: jq expression that deletes entire object" {
    local test_file="$TEST_DIR/test.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    run "$SCRIPT_PATH" "$test_file" 'empty'
    [ "$status" -eq 1 ]
    [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "empty" ]]
}

@test "mg-memory-write: disk full scenario" {
    skip "TODO: Mock disk full condition"
}

@test "mg-memory-write: file path with spaces (unquoted)" {
    local space_file="$TEST_DIR/file with spaces.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$space_file"

    run "$SCRIPT_PATH" "$space_file" '.status = "updated"'
    [ "$status" -eq 0 ]
}

@test "mg-memory-write: symbolic link to nonexistent file" {
    local broken_link="$TEST_DIR/broken-link.json"
    ln -s "/nonexistent/target.json" "$broken_link"

    run "$SCRIPT_PATH" "$broken_link" '.status = "updated"'
    [ "$status" -eq 1 ]
    [[ "$output" =~ "not found" ]] || [[ "$output" =~ "does not exist" ]]
}

@test "mg-memory-write: too many arguments" {
    local test_file="$TEST_DIR/test.json"
    echo '{}' > "$test_file"

    run "$SCRIPT_PATH" "$test_file" '.status = "updated"' "extra" "args"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "too many" ]]
}

# ============================================================================
# BOUNDARY TESTS - Edge cases, limits, unusual but valid inputs
# ============================================================================

@test "mg-memory-write: update empty JSON object" {
    local test_file="$TEST_DIR/empty.json"
    echo '{}' > "$test_file"

    run "$SCRIPT_PATH" "$test_file" '.new_field = "value"'
    [ "$status" -eq 0 ]

    # Verify update
    local result
    result=$(cat "$test_file")
    [[ "$result" =~ "new_field" ]]
    [[ "$result" =~ "value" ]]
}

@test "mg-memory-write: update with complex jq expression" {
    local test_file="$TEST_DIR/complex.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    run "$SCRIPT_PATH" "$test_file" '.tests.passing = (.tests.passing + 5)'
    [ "$status" -eq 0 ]

    # Verify calculation
    local result
    result=$(cat "$test_file" | jq '.tests.passing')
    [[ "$result" == "15" ]]
}

@test "mg-memory-write: add nested object" {
    local test_file="$TEST_DIR/nested.json"
    echo '{}' > "$test_file"

    run "$SCRIPT_PATH" "$test_file" '.metadata = {timestamp: "2026-02-08", version: "1.0"}'
    [ "$status" -eq 0 ]

    # Verify nested structure
    local result
    result=$(cat "$test_file")
    [[ "$result" =~ "metadata" ]]
    [[ "$result" =~ "timestamp" ]]
    [[ "$result" =~ "version" ]]
}

@test "mg-memory-write: add array field" {
    local test_file="$TEST_DIR/array.json"
    echo '{}' > "$test_file"

    run "$SCRIPT_PATH" "$test_file" '.items = [1, 2, 3]'
    [ "$status" -eq 0 ]

    # Verify array
    local result
    result=$(cat "$test_file" | jq '.items | length')
    [[ "$result" == "3" ]]
}

@test "mg-memory-write: delete a field" {
    local test_file="$TEST_DIR/delete.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    run "$SCRIPT_PATH" "$test_file" 'del(.coverage)'
    [ "$status" -eq 0 ]

    # Verify deletion
    local result
    result=$(cat "$test_file" | jq 'has("coverage")')
    [[ "$result" == "false" ]]
}

@test "mg-memory-write: update with Unicode characters" {
    local test_file="$TEST_DIR/unicode.json"
    echo '{}' > "$test_file"

    run "$SCRIPT_PATH" "$test_file" '.emoji = "🚀"'
    [ "$status" -eq 0 ]

    # Verify Unicode
    local result
    result=$(cat "$test_file")
    [[ "$result" =~ "🚀" ]]
}

@test "mg-memory-write: update with escaped characters" {
    local test_file="$TEST_DIR/escaped.json"
    echo '{}' > "$test_file"

    run "$SCRIPT_PATH" "$test_file" '.path = "C:\\Users\\test"'
    [ "$status" -eq 0 ]

    # Verify escaping
    local result
    result=$(cat "$test_file")
    [[ "$result" =~ "C:" ]]
}

@test "mg-memory-write: set field to null" {
    local test_file="$TEST_DIR/null.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    run "$SCRIPT_PATH" "$test_file" '.delegated_to = null'
    [ "$status" -eq 0 ]

    # Verify null value
    local result
    result=$(cat "$test_file" | jq '.delegated_to')
    [[ "$result" == "null" ]]
}

@test "mg-memory-write: update boolean field" {
    local test_file="$TEST_DIR/boolean.json"
    echo '{"enabled": false}' > "$test_file"

    run "$SCRIPT_PATH" "$test_file" '.enabled = true'
    [ "$status" -eq 0 ]

    # Verify boolean
    local result
    result=$(cat "$test_file" | jq '.enabled')
    [[ "$result" == "true" ]]
}

@test "mg-memory-write: update numeric field with float" {
    local test_file="$TEST_DIR/float.json"
    echo '{"coverage": 0}' > "$test_file"

    run "$SCRIPT_PATH" "$test_file" '.coverage = 99.7'
    [ "$status" -eq 0 ]

    # Verify float
    local result
    result=$(cat "$test_file" | jq '.coverage')
    [[ "$result" == "99.7" ]]
}

@test "mg-memory-write: symbolic link to valid file" {
    local link_file="$TEST_DIR/symlink.json"
    local target_file="$TEST_DIR/target.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$target_file"
    ln -s "$target_file" "$link_file"

    run "$SCRIPT_PATH" "$link_file" '.status = "updated"'
    [ "$status" -eq 0 ]

    # Verify update followed the symlink
    local result
    result=$(cat "$target_file" | jq -r '.status')
    [[ "$result" == "updated" ]]
}

@test "mg-memory-write: large JSON file update" {
    local large_file="$TEST_DIR/large.json"
    {
        echo '{"items": ['
        for i in {1..100}; do
            echo "  {\"id\": $i, \"name\": \"item_$i\"},"
        done
        echo '  {"id": 101, "name": "item_101"}'
        echo ']}'
    } > "$large_file"

    run "$SCRIPT_PATH" "$large_file" '.metadata = {count: 101}'
    [ "$status" -eq 0 ]

    # Verify update and original data preserved
    local result
    result=$(cat "$large_file" | jq '.metadata.count')
    [[ "$result" == "101" ]]
}

@test "mg-memory-write: deeply nested update" {
    local test_file="$TEST_DIR/deep.json"
    cp "$FIXTURES_DIR/large-nested.json" "$test_file"

    run "$SCRIPT_PATH" "$test_file" '.level1.level2.level3.level4.level5.data = "updated"'
    [ "$status" -eq 0 ]

    # Verify deep update
    local result
    result=$(cat "$test_file" | jq -r '.level1.level2.level3.level4.level5.data')
    [[ "$result" == "updated" ]]
}

@test "mg-memory-write: multiple field updates in one expression" {
    local test_file="$TEST_DIR/multi.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    run "$SCRIPT_PATH" "$test_file" '.status = "completed" | .phase = "done" | .coverage = 100'
    [ "$status" -eq 0 ]

    # Verify all updates
    local status phase coverage
    status=$(cat "$test_file" | jq -r '.status')
    phase=$(cat "$test_file" | jq -r '.phase')
    coverage=$(cat "$test_file" | jq '.coverage')

    [[ "$status" == "completed" ]]
    [[ "$phase" == "done" ]]
    [[ "$coverage" == "100" ]]
}

# ============================================================================
# GOLDEN PATH - Normal, expected operations
# ============================================================================

@test "mg-memory-write: update workstream status" {
    local test_file="$TEST_DIR/workstream.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    run "$SCRIPT_PATH" "$test_file" '.status = "completed"'
    [ "$status" -eq 0 ]

    # Verify update
    local result
    result=$(cat "$test_file" | jq -r '.status')
    [[ "$result" == "completed" ]]
}

@test "mg-memory-write: creates .bak backup file" {
    local test_file="$TEST_DIR/backup-test.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    run "$SCRIPT_PATH" "$test_file" '.status = "updated"'
    [ "$status" -eq 0 ]

    # Verify backup exists
    [[ -f "$test_file.bak" ]]
}

@test "mg-memory-write: backup file contains original content" {
    local test_file="$TEST_DIR/backup-content.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    # Get original content
    local original
    original=$(cat "$test_file")

    # Update file
    run "$SCRIPT_PATH" "$test_file" '.status = "updated"'
    [ "$status" -eq 0 ]

    # Verify backup matches original
    local backup
    backup=$(cat "$test_file.bak")
    [[ "$backup" == "$original" ]]
}

@test "mg-memory-write: atomic update (no partial writes)" {
    local test_file="$TEST_DIR/atomic.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    # Update should be atomic - either all or nothing
    run "$SCRIPT_PATH" "$test_file" '.tests.total = 20'
    [ "$status" -eq 0 ]

    # Verify file is still valid JSON
    run jq empty "$test_file"
    [ "$status" -eq 0 ]
}

@test "mg-memory-write: update test count" {
    local test_file="$TEST_DIR/tests.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    run "$SCRIPT_PATH" "$test_file" '.tests.passing = 15'
    [ "$status" -eq 0 ]

    # Verify update
    local result
    result=$(cat "$test_file" | jq '.tests.passing')
    [[ "$result" == "15" ]]
}

@test "mg-memory-write: update coverage percentage" {
    local test_file="$TEST_DIR/coverage.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    run "$SCRIPT_PATH" "$test_file" '.coverage = 100'
    [ "$status" -eq 0 ]

    # Verify update
    local result
    result=$(cat "$test_file" | jq '.coverage')
    [[ "$result" == "100" ]]
}

@test "mg-memory-write: update phase" {
    local test_file="$TEST_DIR/phase.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    run "$SCRIPT_PATH" "$test_file" '.phase = "verification"'
    [ "$status" -eq 0 ]

    # Verify update
    local result
    result=$(cat "$test_file" | jq -r '.phase')
    [[ "$result" == "verification" ]]
}

@test "mg-memory-write: preserves other fields" {
    local test_file="$TEST_DIR/preserve.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    # Update one field
    run "$SCRIPT_PATH" "$test_file" '.status = "updated"'
    [ "$status" -eq 0 ]

    # Verify other fields are preserved
    local name agent
    name=$(cat "$test_file" | jq -r '.name')
    agent=$(cat "$test_file" | jq -r '.agent_id')

    [[ "$name" == "Test Workstream" ]]
    [[ "$agent" == "dev" ]]
}

@test "mg-memory-write: output is pretty-printed" {
    local test_file="$TEST_DIR/pretty.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    run "$SCRIPT_PATH" "$test_file" '.status = "updated"'
    [ "$status" -eq 0 ]

    # Verify pretty-printing (indentation)
    local content
    content=$(cat "$test_file")
    [[ "$content" =~ $'\n  ' ]] || [[ "$content" =~ $'  "' ]]
}

@test "mg-memory-write: exit code 0 on success" {
    local test_file="$TEST_DIR/success.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    run "$SCRIPT_PATH" "$test_file" '.status = "updated"'
    [ "$status" -eq 0 ]
}

@test "mg-memory-write: can chain multiple writes" {
    local test_file="$TEST_DIR/chain.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    # First write
    "$SCRIPT_PATH" "$test_file" '.status = "step1"'
    # Second write
    "$SCRIPT_PATH" "$test_file" '.status = "step2"'
    # Third write
    run "$SCRIPT_PATH" "$test_file" '.status = "step3"'
    [ "$status" -eq 0 ]

    # Verify final state
    local result
    result=$(cat "$test_file" | jq -r '.status')
    [[ "$result" == "step3" ]]
}

@test "mg-memory-write: creates new backup on each write" {
    local test_file="$TEST_DIR/multi-backup.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    # First write
    "$SCRIPT_PATH" "$test_file" '.status = "step1"'
    local backup1
    backup1=$(cat "$test_file.bak" | jq -r '.status')

    # Second write
    "$SCRIPT_PATH" "$test_file" '.status = "step2"'
    local backup2
    backup2=$(cat "$test_file.bak" | jq -r '.status')

    # Backup should contain state before second write
    [[ "$backup1" == "in_progress" ]]  # Original
    [[ "$backup2" == "step1" ]]        # After first write
}

@test "mg-memory-write: works with typical memory file schemas" {
    local test_file="$TEST_DIR/schema.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    # Typical workstream state update
    run "$SCRIPT_PATH" "$test_file" '.gate_status = "ready_for_verification"'
    [ "$status" -eq 0 ]

    # Verify schema compliance
    local result
    result=$(cat "$test_file" | jq -r '.gate_status')
    [[ "$result" == "ready_for_verification" ]]
}

@test "mg-memory-write: handles .claude/memory directory paths" {
    local memory_dir="$TEST_DIR/.claude/memory"
    mkdir -p "$memory_dir"
    local memory_file="$memory_dir/workstream-WS-TEST-1-state.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$memory_file"

    run "$SCRIPT_PATH" "$memory_file" '.status = "updated"'
    [ "$status" -eq 0 ]

    # Verify update
    local result
    result=$(cat "$memory_file" | jq -r '.status')
    [[ "$result" == "updated" ]]

    # Verify backup in same directory
    [[ -f "$memory_file.bak" ]]
}

@test "mg-memory-write: idempotent updates produce same result" {
    local test_file="$TEST_DIR/idempotent.json"
    cp "$FIXTURES_DIR/valid-workstream.json" "$test_file"

    # First update
    "$SCRIPT_PATH" "$test_file" '.coverage = 100'
    local first_result
    first_result=$(cat "$test_file")

    # Second identical update
    "$SCRIPT_PATH" "$test_file" '.coverage = 100'
    local second_result
    second_result=$(cat "$test_file")

    [[ "$first_result" == "$second_result" ]]
}
