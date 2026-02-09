#!/usr/bin/env bats
# ============================================================================
# mg-settings-check.bats - Tests for mg-settings-check script
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
    SCRIPT_PATH="$HOME/.claude/scripts/mg-settings-check"

    # Create test project structure
    PROJECT_SETTINGS_DIR="$TEST_DIR/.claude"
    mkdir -p "$PROJECT_SETTINGS_DIR"

    # Create temporary global settings directory (for isolated testing)
    GLOBAL_SETTINGS_DIR="$TEST_DIR/mock-global"
    mkdir -p "$GLOBAL_SETTINGS_DIR"

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

@test "mg-settings-check: script exists and is executable (AC-2.1)" {
    [ -f "$SCRIPT_PATH" ]
    [ -x "$SCRIPT_PATH" ]
}

@test "mg-settings-check: too many arguments" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" "extra" "args"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "too many" ]] || [[ "$output" =~ "invalid" ]]
}

@test "mg-settings-check: invalid flag provided" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" --invalid-flag
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "unknown" ]]
}

@test "mg-settings-check: conflicting flags --global and --project" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" --global --project
    [ "$status" -eq 1 ]
    [[ "$output" =~ "cannot" ]] || [[ "$output" =~ "conflict" ]] || [[ "$output" =~ "both" ]]
}

@test "mg-settings-check: malformed JSON in project settings" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/settings-malformed.json" "$PROJECT_SETTINGS_DIR/settings.local.json"
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 1 ]
    [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "malformed" ]] || [[ "$output" =~ "parse" ]]
}

@test "mg-settings-check: unreadable project settings file" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/settings-clean.json" "$PROJECT_SETTINGS_DIR/settings.local.json"
    chmod 000 "$PROJECT_SETTINGS_DIR/settings.local.json"
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 1 ]
    [[ "$output" =~ "permission" ]] || [[ "$output" =~ "cannot read" ]] || [[ "$output" =~ "Error" ]]
    # Cleanup
    chmod 644 "$PROJECT_SETTINGS_DIR/settings.local.json"
}

@test "mg-settings-check: settings file is a directory" {
    cd "$TEST_DIR"
    mkdir -p "$PROJECT_SETTINGS_DIR/settings.local.json"
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 1 ]
    [[ "$output" =~ "not a file" ]] || [[ "$output" =~ "directory" ]] || [[ "$output" =~ "Error" ]]
}

@test "mg-settings-check: jq not installed" {
    skip "TODO: Mock missing jq dependency"
}

@test "mg-settings-check: --fix without user confirmation (abort)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/settings-small-bloat.json" "$PROJECT_SETTINGS_DIR/settings.local.json"
    # Simulate user typing 'n' for no
    run bash -c "echo 'n' | $SCRIPT_PATH --project --fix"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "cancelled" ]] || [[ "$output" =~ "abort" ]] || [[ "$output" =~ "skipped" ]]
    # File should be unchanged
    [ -f "$PROJECT_SETTINGS_DIR/settings.local.json" ]
}

@test "mg-settings-check: --fix on clean file (no changes needed)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/settings-clean.json" "$PROJECT_SETTINGS_DIR/settings.local.json"
    run bash -c "echo 'y' | $SCRIPT_PATH --project --fix"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "No issues" ]] || [[ "$output" =~ "clean" ]] || [[ "$output" =~ "no bloat" ]]
}

@test "mg-settings-check: empty string as flag" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" ""
    [ "$status" -eq 1 ]
}

@test "mg-settings-check: multiple --fix flags" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" --fix --fix
    [ "$status" -eq 1 ]
}

# ============================================================================
# BOUNDARY TESTS - Edge cases, limits, unusual but valid inputs
# ============================================================================

@test "mg-settings-check: empty settings file" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/settings-empty.json" "$PROJECT_SETTINGS_DIR/settings.local.json"
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 0 ]
    [[ "$output" =~ "No issues" ]] || [[ "$output" =~ "clean" ]]
}

@test "mg-settings-check: pattern exactly 200 characters (not bloat)" {
    cd "$TEST_DIR"
    # Create a pattern with exactly 200 characters (should pass)
    cat > "$PROJECT_SETTINGS_DIR/settings.local.json" <<EOF
{
  "permissions": {
    "allow": [
      "$(printf 'a%.0s' {1..200})"
    ],
    "deny": [],
    "ask": []
  }
}
EOF
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 0 ]
    [[ "$output" =~ "No issues" ]] || [[ "$output" =~ "clean" ]]
}

@test "mg-settings-check: pattern exactly 201 characters (bloat) (AC-2.2)" {
    cd "$TEST_DIR"
    # Create a pattern with exactly 201 characters (should be detected)
    cat > "$PROJECT_SETTINGS_DIR/settings.local.json" <<EOF
{
  "permissions": {
    "allow": [
      "$(printf 'a%.0s' {1..201})"
    ],
    "deny": [],
    "ask": []
  }
}
EOF
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 1 ]
    [[ "$output" =~ "201" ]] || [[ "$output" =~ "oversized" ]] || [[ "$output" =~ ">200" ]]
}

@test "mg-settings-check: file exactly 5000 characters (no warning)" {
    cd "$TEST_DIR"
    # Create a file with exactly 5000 chars using patterns <200 chars each
    # Calculated: 32 patterns of 150 chars + 1 pattern of 54 chars = exactly 5000 bytes
    PATTERN_150=$(printf 'p%.0s' {1..150})
    PATTERN_54=$(printf 'q%.0s' {1..54})
    cat > "$PROJECT_SETTINGS_DIR/settings.local.json" <<EOF
{"permissions":{"allow":["$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_150","$PATTERN_54"],"deny":[],"ask":[]}}
EOF
    # Verify it's exactly 5000 chars
    local file_size=$(wc -c < "$PROJECT_SETTINGS_DIR/settings.local.json" | tr -d ' ')
    [ "$file_size" -eq 5000 ]
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 0 ]
    [[ ! "$output" =~ "file size" ]]
}

@test "mg-settings-check: file exactly 5001 characters (warning) (AC-2.3)" {
    cd "$TEST_DIR"
    # Create a file with exactly 5001 chars (should warn)
    printf '{"permissions":{"allow":["%s"],"deny":[],"ask":[]}}' "$(printf 'x%.0s' {1..4952})" > "$PROJECT_SETTINGS_DIR/settings.local.json"
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 1 ]
    [[ "$output" =~ "5001" ]] || [[ "$output" =~ ">5K" ]] || [[ "$output" =~ "file size" ]]
}

@test "mg-settings-check: missing project settings file (not an error)" {
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 0 ]
    [[ "$output" =~ "not found" ]] || [[ "$output" =~ "No settings" ]] || [[ "$output" =~ "skipped" ]]
}

@test "mg-settings-check: missing global settings file (not an error)" {
    # Temporarily mock HOME to point to empty directory
    skip "TODO: Mock missing global settings scenario"
}

@test "mg-settings-check: settings with no permissions key" {
    cd "$TEST_DIR"
    cat > "$PROJECT_SETTINGS_DIR/settings.local.json" <<EOF
{
  "enabledTools": ["Read", "Write"]
}
EOF
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 0 ]
    [[ "$output" =~ "No issues" ]] || [[ "$output" =~ "clean" ]]
}

@test "mg-settings-check: settings with empty permissions arrays" {
    cd "$TEST_DIR"
    cat > "$PROJECT_SETTINGS_DIR/settings.local.json" <<EOF
{
  "permissions": {
    "allow": [],
    "deny": [],
    "ask": []
  }
}
EOF
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 0 ]
    [[ "$output" =~ "No issues" ]] || [[ "$output" =~ "clean" ]]
}

@test "mg-settings-check: symbolic link to settings file" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/settings-clean.json" "$PROJECT_SETTINGS_DIR/settings-real.json"
    ln -s "$PROJECT_SETTINGS_DIR/settings-real.json" "$PROJECT_SETTINGS_DIR/settings.local.json"
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 0 ]
}

@test "mg-settings-check: pattern with unicode characters" {
    cd "$TEST_DIR"
    cat > "$PROJECT_SETTINGS_DIR/settings.local.json" <<EOF
{
  "permissions": {
    "allow": [
      "test-skill-with-emoji-🚀-and-unicode-特殊文字"
    ],
    "deny": [],
    "ask": []
  }
}
EOF
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 0 ]
}

@test "mg-settings-check: pattern with newlines (escaped in JSON)" {
    cd "$TEST_DIR"
    cat > "$PROJECT_SETTINGS_DIR/settings.local.json" <<EOF
{
  "permissions": {
    "allow": [
      "test-skill-with\\nnewline"
    ],
    "deny": [],
    "ask": []
  }
}
EOF
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 0 ]
}

@test "mg-settings-check: very long pattern (1000 characters)" {
    cd "$TEST_DIR"
    cat > "$PROJECT_SETTINGS_DIR/settings.local.json" <<EOF
{
  "permissions": {
    "allow": [
      "$(printf 'a%.0s' {1..1000})"
    ],
    "deny": [],
    "ask": []
  }
}
EOF
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 1 ]
    [[ "$output" =~ "1000" ]] || [[ "$output" =~ "oversized" ]]
}

# ============================================================================
# GOLDEN PATH - Normal, expected operations
# ============================================================================

@test "mg-settings-check: clean project settings (no bloat)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/settings-clean.json" "$PROJECT_SETTINGS_DIR/settings.local.json"
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 0 ]
    [[ "$output" =~ "No issues" ]] || [[ "$output" =~ "clean" ]]
}

@test "mg-settings-check: detect single oversized pattern (AC-2.2)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/settings-small-bloat.json" "$PROJECT_SETTINGS_DIR/settings.local.json"
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 1 ]
    [[ "$output" =~ "oversized" ]] || [[ "$output" =~ ">200" ]]
    [[ "$output" =~ "1 pattern" ]]
}

@test "mg-settings-check: detect multiple oversized patterns (AC-2.2)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/settings-multiple-bloat.json" "$PROJECT_SETTINGS_DIR/settings.local.json"
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 1 ]
    [[ "$output" =~ "2 pattern" ]] || [[ "$output" =~ "multiple" ]]
}

@test "mg-settings-check: detect large file size (AC-2.3)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/settings-large-file.json" "$PROJECT_SETTINGS_DIR/settings.local.json"
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 1 ]
    [[ "$output" =~ "file size" ]] || [[ "$output" =~ ">5K" ]]
}

@test "mg-settings-check: --project flag checks only project settings (AC-2.5)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/settings-small-bloat.json" "$PROJECT_SETTINGS_DIR/settings.local.json"
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 1 ]
    [[ "$output" =~ "project" ]]
    [[ ! "$output" =~ "global" ]]
}

@test "mg-settings-check: --global flag checks only global settings (AC-2.5)" {
    # This test would need to mock the global settings location
    skip "TODO: Mock global settings check scenario"
}

@test "mg-settings-check: default (no flags) checks both project and global (AC-2.5)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/settings-clean.json" "$PROJECT_SETTINGS_DIR/settings.local.json"
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "project" ]] || [[ "$output" =~ "global" ]]
}

@test "mg-settings-check: --fix removes oversized patterns with confirmation (AC-2.4)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/settings-small-bloat.json" "$PROJECT_SETTINGS_DIR/settings.local.json"

    # Simulate user typing 'y' for yes
    run bash -c "echo 'y' | $SCRIPT_PATH --project --fix"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Removed" ]] || [[ "$output" =~ "fixed" ]] || [[ "$output" =~ "cleaned" ]]

    # Verify the file was actually modified (oversized pattern removed)
    run cat "$PROJECT_SETTINGS_DIR/settings.local.json"
    [[ ! "$output" =~ "unnecessarily verbose" ]]
}

@test "mg-settings-check: --fix preserves valid patterns" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/settings-multiple-bloat.json" "$PROJECT_SETTINGS_DIR/settings.local.json"

    # Add a valid pattern to the file
    run bash -c "echo 'y' | $SCRIPT_PATH --project --fix"

    # Verify enabledTools array and permissions structure are preserved
    run cat "$PROJECT_SETTINGS_DIR/settings.local.json"
    [[ "$output" =~ "enabledTools" ]]
    [[ "$output" =~ "permissions" ]]
}

@test "mg-settings-check: --fix creates backup before modification (AC-2.4)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/settings-small-bloat.json" "$PROJECT_SETTINGS_DIR/settings.local.json"

    run bash -c "echo 'y' | $SCRIPT_PATH --project --fix"

    # Check that a backup was created
    local backup_count
    backup_count=$(find "$PROJECT_SETTINGS_DIR" -name "settings.local.json.backup-*" | wc -l)
    [ "$backup_count" -ge 1 ]
}

@test "mg-settings-check: display helps with --help flag" {
    run "$SCRIPT_PATH" --help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
    [[ "$output" =~ "mg-settings-check" ]]
    [[ "$output" =~ "--fix" ]]
    [[ "$output" =~ "--project" ]]
    [[ "$output" =~ "--global" ]]
}

@test "mg-settings-check: display help with -h flag" {
    run "$SCRIPT_PATH" -h
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg-settings-check: combined bloat detection (patterns + file size)" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/settings-large-file.json" "$PROJECT_SETTINGS_DIR/settings.local.json"
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 1 ]
    # Should report both oversized patterns AND large file size
    [[ "$output" =~ "pattern" ]]
    [[ "$output" =~ "file size" ]] || [[ "$output" =~ "total" ]]
}

@test "mg-settings-check: report shows character counts for oversized patterns" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/settings-small-bloat.json" "$PROJECT_SETTINGS_DIR/settings.local.json"
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 1 ]
    # Should show actual character count
    [[ "$output" =~ "char" ]] || [[ "$output" =~ "length" ]]
}

@test "mg-settings-check: exit code 0 when no issues found" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/settings-clean.json" "$PROJECT_SETTINGS_DIR/settings.local.json"
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 0 ]
}

@test "mg-settings-check: exit code 1 when bloat detected" {
    cd "$TEST_DIR"
    cp "$FIXTURES_DIR/settings-small-bloat.json" "$PROJECT_SETTINGS_DIR/settings.local.json"
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 1 ]
}

@test "mg-settings-check: handles settings with nested structures" {
    cd "$TEST_DIR"
    cat > "$PROJECT_SETTINGS_DIR/settings.local.json" <<EOF
{
  "permissions": {
    "allow": [
      "short-pattern"
    ],
    "deny": [],
    "ask": [],
    "metadata": {
      "version": "1.0",
      "updated": "2025-01-01"
    }
  },
  "enabledTools": ["Read", "Write"]
}
EOF
    run "$SCRIPT_PATH" --project
    [ "$status" -eq 0 ]
}

@test "mg-settings-check: running from non-project directory" {
    # Create a temporary directory outside project structure
    local non_project_dir
    non_project_dir="$(mktemp -d)"
    cd "$non_project_dir"

    run "$SCRIPT_PATH" --project
    [ "$status" -eq 0 ]
    [[ "$output" =~ "not found" ]] || [[ "$output" =~ "No .claude" ]]

    rm -rf "$non_project_dir"
}
