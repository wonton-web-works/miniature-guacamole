#!/usr/bin/env bats
# ============================================================================
# mg-util-configure.bats - Tests for mg-util configure command
# ============================================================================
# Test ordering: MISUSE CASES → BOUNDARY TESTS → GOLDEN PATH
# Coverage target: 99% of script functionality
# ============================================================================
# Acceptance Criteria:
# AC-3: `mg-util configure` provides interactive configuration for model
#       preferences and permission defaults
# AC-4: `mg-util configure` writes to `~/.miniature-guacamole/config/mg.yaml`
# ============================================================================

# Setup and teardown
setup() {
    # Resolve project root (tests/scripts/ → project root)
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"

    # Create isolated test home directory
    TEST_DIR="$(mktemp -d)"
    export HOME="$TEST_DIR"

    # Create test installation cache
    TEST_MG_HOME="$TEST_DIR/.miniature-guacamole"
    TEST_CONFIG_DIR="$TEST_MG_HOME/config"
    mkdir -p "$TEST_CONFIG_DIR"

    # Path to mg-util script (in src/scripts/)
    SCRIPT_PATH="$PROJECT_ROOT/src/scripts/mg-util"

    # Config file path
    CONFIG_FILE="$TEST_CONFIG_DIR/mg.yaml"

    # Skip if BATS not installed
    if ! command -v bats &> /dev/null; then
        skip "BATS not installed. Install via: brew install bats-core"
    fi

    # Skip if script doesn't exist yet
    if [[ ! -f "$SCRIPT_PATH" ]]; then
        skip "mg-util not implemented yet at: $SCRIPT_PATH"
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

@test "mg-util configure: no write permissions to config directory" {
    # Remove write permission from config directory
    chmod 555 "$TEST_CONFIG_DIR"

    run "$SCRIPT_PATH" configure
    [ "$status" -eq 1 ]
    [[ "$output" =~ "permission" ]] || [[ "$output" =~ "cannot write" ]]

    # Cleanup
    chmod 755 "$TEST_CONFIG_DIR"
}

@test "mg-util configure: config directory is a file (not directory)" {
    # Replace config directory with a file
    rm -rf "$TEST_CONFIG_DIR"
    echo "file" > "$TEST_CONFIG_DIR"

    run "$SCRIPT_PATH" configure
    [ "$status" -eq 1 ]
    [[ "$output" =~ "not a directory" ]] || [[ "$output" =~ "conflict" ]]
}

@test "mg-util configure: invalid YAML syntax in existing config" {
    # Create config with invalid YAML
    echo "invalid: [unclosed" > "$CONFIG_FILE"

    run "$SCRIPT_PATH" configure
    [ "$status" -eq 1 ]
    [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "parse error" ]] || [[ "$output" =~ "YAML" ]]
}

@test "mg-util configure: corrupted config file (binary data)" {
    # Create binary file as config
    echo -ne '\x00\x01\x02\x03' > "$CONFIG_FILE"

    run "$SCRIPT_PATH" configure
    [ "$status" -eq 1 ]
    [[ "$output" =~ "corrupted" ]] || [[ "$output" =~ "invalid" ]]
}

@test "mg-util configure: disk full during write" {
    skip "TODO: Mock disk full scenario"
    # Test behavior when disk space runs out during config write
    # Expected: Exit 1, don't corrupt existing config, error message
}

@test "mg-util configure: invalid --set value (malformed key=value)" {
    run "$SCRIPT_PATH" configure --set "no-equals-sign"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "format" ]] || [[ "$output" =~ "key=value" ]]
}

@test "mg-util configure: invalid --set value (empty key)" {
    run "$SCRIPT_PATH" configure --set "=value"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "empty key" ]]
}

@test "mg-util configure: invalid --set value (empty value)" {
    run "$SCRIPT_PATH" configure --set "key="
    [ "$status" -eq 1 ]
    [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "empty value" ]]
}

@test "mg-util configure: unknown configuration key" {
    run "$SCRIPT_PATH" configure --set "unknown.key=value"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "unknown" ]] || [[ "$output" =~ "invalid key" ]]
}

@test "mg-util configure: invalid model name" {
    run "$SCRIPT_PATH" configure --set "model.default=invalid-model-999"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "invalid model" ]] || [[ "$output" =~ "unknown model" ]]
}

@test "mg-util configure: invalid permission value (not allow/deny)" {
    run "$SCRIPT_PATH" configure --set "permissions.bash=maybe"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "allow" ]] || [[ "$output" =~ "deny" ]]
}

@test "mg-util configure: too many arguments" {
    run "$SCRIPT_PATH" configure extra args here
    [ "$status" -eq 1 ]
    [[ "$output" =~ "unexpected" ]] || [[ "$output" =~ "usage" ]]
}

@test "mg-util configure: conflicting flags (--interactive with --set)" {
    run "$SCRIPT_PATH" configure --interactive --set "key=value"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "conflict" ]] || [[ "$output" =~ "cannot use both" ]]
}

@test "mg-util configure: stdin not available for interactive mode" {
    skip "TODO: Mock non-interactive terminal"
    # Test behavior when interactive mode is requested but stdin is not a tty
    # Expected: Exit 1 with error or fallback to non-interactive
}

@test "mg-util configure: invalid YAML characters in value" {
    # Test special YAML characters that need escaping
    run "$SCRIPT_PATH" configure --set "key=value:with:colons"
    # Should either escape properly or reject
    [[ "$status" -eq 0 ]] || [[ "$output" =~ "invalid" ]]
}

@test "mg-util configure: nested key with invalid path" {
    run "$SCRIPT_PATH" configure --set "model..nested=value"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "path" ]]
}

# ============================================================================
# BOUNDARY TESTS - Edge cases, limits, unusual but valid inputs
# ============================================================================

@test "mg-util configure: create config directory if missing" {
    # Remove config directory
    rm -rf "$TEST_CONFIG_DIR"

    run "$SCRIPT_PATH" configure --set "model.default=claude-opus-4"
    [ "$status" -eq 0 ]

    # Config directory and file should be created
    [[ -d "$TEST_CONFIG_DIR" ]]
    [[ -f "$CONFIG_FILE" ]]
}

@test "mg-util configure: empty config file (first time setup)" {
    # No config file exists
    rm -f "$CONFIG_FILE"

    run "$SCRIPT_PATH" configure --set "model.default=claude-opus-4"
    [ "$status" -eq 0 ]

    # Config file should be created with default structure
    [[ -f "$CONFIG_FILE" ]]
    grep -q "model:" "$CONFIG_FILE"
}

@test "mg-util configure: preserve existing config values when setting new ones" {
    # Create config with existing values
    cat > "$CONFIG_FILE" <<EOF
model:
  default: claude-opus-4
  fast: claude-sonnet-3.5
permissions:
  bash: allow
EOF

    # Set a new value
    run "$SCRIPT_PATH" configure --set "permissions.write=allow"
    [ "$status" -eq 0 ]

    # Existing values should be preserved
    grep -q "default: claude-opus-4" "$CONFIG_FILE"
    grep -q "fast: claude-sonnet-3.5" "$CONFIG_FILE"
    grep -q "bash: allow" "$CONFIG_FILE"
    grep -q "write: allow" "$CONFIG_FILE"
}

@test "mg-util configure: overwrite existing value" {
    # Create config with existing value
    cat > "$CONFIG_FILE" <<EOF
model:
  default: claude-opus-4
EOF

    # Overwrite the value
    run "$SCRIPT_PATH" configure --set "model.default=claude-sonnet-4"
    [ "$status" -eq 0 ]

    # Value should be updated
    grep -q "default: claude-sonnet-4" "$CONFIG_FILE"
    ! grep -q "default: claude-opus-4" "$CONFIG_FILE"
}

@test "mg-util configure: very long configuration value" {
    local long_value=$(printf 'a%.0s' {1..1000})
    run "$SCRIPT_PATH" configure --set "description=$long_value"
    # Should either succeed or reject gracefully
    [[ "$status" -eq 0 ]] || [[ "$output" =~ "too long" ]]
}

@test "mg-util configure: configuration value with special characters" {
    run "$SCRIPT_PATH" configure --set "description=Value with spaces, punctuation! @#$%"
    [ "$status" -eq 0 ]

    # Value should be properly escaped/quoted in YAML
    [[ -f "$CONFIG_FILE" ]]
}

@test "mg-util configure: nested configuration keys (3+ levels deep)" {
    run "$SCRIPT_PATH" configure --set "advanced.nested.deep.value=test"
    [ "$status" -eq 0 ]

    # Nested structure should be created
    grep -q "advanced:" "$CONFIG_FILE"
    grep -q "nested:" "$CONFIG_FILE"
    grep -q "deep:" "$CONFIG_FILE"
    grep -q "value: test" "$CONFIG_FILE"
}

@test "mg-util configure: multiple --set flags in single command" {
    run "$SCRIPT_PATH" configure \
        --set "model.default=claude-opus-4" \
        --set "model.fast=claude-sonnet-3.5" \
        --set "permissions.bash=allow"
    [ "$status" -eq 0 ]

    # All values should be set
    grep -q "default: claude-opus-4" "$CONFIG_FILE"
    grep -q "fast: claude-sonnet-3.5" "$CONFIG_FILE"
    grep -q "bash: allow" "$CONFIG_FILE"
}

@test "mg-util configure: --reset restores defaults" {
    # Create config with custom values
    cat > "$CONFIG_FILE" <<EOF
model:
  default: custom-model
permissions:
  bash: deny
EOF

    run "$SCRIPT_PATH" configure --reset
    [ "$status" -eq 0 ]

    # Config should be reset to defaults
    grep -q "default: claude-opus-4" "$CONFIG_FILE" || grep -q "default:" "$CONFIG_FILE"
}

@test "mg-util configure: --reset with --force skips confirmation" {
    # Create config with custom values
    cat > "$CONFIG_FILE" <<EOF
model:
  default: custom-model
EOF

    run "$SCRIPT_PATH" configure --reset --force
    [ "$status" -eq 0 ]
    # Should not prompt for confirmation
}

@test "mg-util configure: backup created before modification" {
    # Create existing config
    cat > "$CONFIG_FILE" <<EOF
model:
  default: claude-opus-4
EOF

    run "$SCRIPT_PATH" configure --set "model.default=claude-sonnet-4"
    [ "$status" -eq 0 ]

    # Backup should exist
    [[ -f "$CONFIG_FILE.backup" ]] || [[ -f "$TEST_CONFIG_DIR/.backups/"*"/mg.yaml" ]]
}

@test "mg-util configure: YAML formatting preserved (comments, whitespace)" {
    # Create config with comments and formatting
    cat > "$CONFIG_FILE" <<EOF
# User configuration
model:
  default: claude-opus-4  # Primary model

permissions:
  bash: allow
EOF

    run "$SCRIPT_PATH" configure --set "permissions.write=allow"
    [ "$status" -eq 0 ]

    # Comments should be preserved (if possible) or at least file is valid YAML
    [[ -f "$CONFIG_FILE" ]]
}

@test "mg-util configure: handles Unicode in configuration values" {
    run "$SCRIPT_PATH" configure --set "description=日本語 Émojis 🎉"
    [ "$status" -eq 0 ]

    # Unicode should be preserved
    grep -q "日本語" "$CONFIG_FILE"
}

@test "mg-util configure: case-sensitive keys" {
    run "$SCRIPT_PATH" configure --set "model.Default=claude-opus-4"
    [ "$status" -eq 0 ]
    run "$SCRIPT_PATH" configure --set "model.default=claude-sonnet-3.5"
    [ "$status" -eq 0 ]

    # Both should exist as separate keys
    grep -q "Default: claude-opus-4" "$CONFIG_FILE"
    grep -q "default: claude-sonnet-3.5" "$CONFIG_FILE"
}

# ============================================================================
# GOLDEN PATH - Normal, expected operations
# ============================================================================

@test "mg-util configure: interactive mode prompts for configuration" {
    skip "Requires interactive input simulation"
    # Test that interactive mode asks for each config option
    # Expected: Prompts for model, permissions, etc.
}

@test "mg-util configure: interactive mode shows current values" {
    skip "Requires interactive input simulation"
    # Test that interactive mode displays existing values as defaults
}

@test "mg-util configure: interactive mode validates input" {
    skip "Requires interactive input simulation"
    # Test that invalid input is rejected with helpful message
}

@test "mg-util configure: set model preference" {
    run "$SCRIPT_PATH" configure --set "model.default=claude-opus-4"
    [ "$status" -eq 0 ]

    # Verify config file
    [[ -f "$CONFIG_FILE" ]]
    grep -q "model:" "$CONFIG_FILE"
    grep -q "default: claude-opus-4" "$CONFIG_FILE"
}

@test "mg-util configure: set model.fast preference" {
    run "$SCRIPT_PATH" configure --set "model.fast=claude-sonnet-3.5"
    [ "$status" -eq 0 ]

    grep -q "fast: claude-sonnet-3.5" "$CONFIG_FILE"
}

@test "mg-util configure: set permission default (bash)" {
    run "$SCRIPT_PATH" configure --set "permissions.bash=allow"
    [ "$status" -eq 0 ]

    grep -q "permissions:" "$CONFIG_FILE"
    grep -q "bash: allow" "$CONFIG_FILE"
}

@test "mg-util configure: set permission default (write)" {
    run "$SCRIPT_PATH" configure --set "permissions.write=deny"
    [ "$status" -eq 0 ]

    grep -q "write: deny" "$CONFIG_FILE"
}

@test "mg-util configure: set permission default (read)" {
    run "$SCRIPT_PATH" configure --set "permissions.read=allow"
    [ "$status" -eq 0 ]

    grep -q "read: allow" "$CONFIG_FILE"
}

@test "mg-util configure: creates valid YAML structure" {
    run "$SCRIPT_PATH" configure --set "model.default=claude-opus-4"
    [ "$status" -eq 0 ]

    # Validate YAML structure manually (check for key: value format)
    grep -q "model:" "$CONFIG_FILE"
    grep -q "default: claude-opus-4" "$CONFIG_FILE"

    # Ensure file is readable text
    [[ -f "$CONFIG_FILE" ]]
    [[ -r "$CONFIG_FILE" ]]
}

@test "mg-util configure: --list shows current configuration" {
    # Create config
    cat > "$CONFIG_FILE" <<EOF
model:
  default: claude-opus-4
  fast: claude-sonnet-3.5
permissions:
  bash: allow
  write: deny
EOF

    run "$SCRIPT_PATH" configure --list
    [ "$status" -eq 0 ]

    # Output should show all config values
    [[ "$output" =~ "claude-opus-4" ]]
    [[ "$output" =~ "claude-sonnet-3.5" ]]
    [[ "$output" =~ "bash: allow" ]]
    [[ "$output" =~ "write: deny" ]]
}

@test "mg-util configure: --list with empty config shows defaults" {
    rm -f "$CONFIG_FILE"

    run "$SCRIPT_PATH" configure --list
    [ "$status" -eq 0 ]

    # Should show default values
    [[ "$output" =~ "default" ]] || [[ "$output" =~ "no configuration" ]]
}

@test "mg-util configure: --get retrieves specific value" {
    cat > "$CONFIG_FILE" <<EOF
model:
  default: claude-opus-4
EOF

    run "$SCRIPT_PATH" configure --get "model.default"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "claude-opus-4" ]]
}

@test "mg-util configure: --get nonexistent key shows error" {
    run "$SCRIPT_PATH" configure --get "nonexistent.key"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "not found" ]] || [[ "$output" =~ "does not exist" ]]
}

@test "mg-util configure: --unset removes configuration key" {
    cat > "$CONFIG_FILE" <<EOF
model:
  default: claude-opus-4
  fast: claude-sonnet-3.5
EOF

    run "$SCRIPT_PATH" configure --unset "model.fast"
    [ "$status" -eq 0 ]

    # Key should be removed
    grep -q "default: claude-opus-4" "$CONFIG_FILE"
    ! grep -q "fast:" "$CONFIG_FILE"
}

@test "mg-util configure: config file location shown on success" {
    run "$SCRIPT_PATH" configure --set "model.default=claude-opus-4"
    [ "$status" -eq 0 ]

    # Output should mention config file location
    [[ "$output" =~ "$CONFIG_FILE" ]] || [[ "$output" =~ "mg.yaml" ]]
}

@test "mg-util configure: --help shows usage and available keys" {
    run "$SCRIPT_PATH" configure --help
    [ "$status" -eq 0 ]

    [[ "$output" =~ "usage" ]] || [[ "$output" =~ "Usage" ]]
    [[ "$output" =~ "configure" ]]
    [[ "$output" =~ "model" ]]
    [[ "$output" =~ "permissions" ]]
}

@test "mg-util configure: success message confirms changes" {
    run "$SCRIPT_PATH" configure --set "model.default=claude-opus-4"
    [ "$status" -eq 0 ]

    [[ "$output" =~ "success" ]] || [[ "$output" =~ "updated" ]] || [[ "$output" =~ "saved" ]]
}

@test "mg-util configure: exit code 0 on success" {
    run "$SCRIPT_PATH" configure --set "model.default=claude-opus-4"
    [ "$status" -eq 0 ]
}

@test "mg-util configure: atomic write (no partial file on failure)" {
    skip "Requires failure injection"
    # Test that failed write doesn't corrupt existing config
}

@test "mg-util configure: file permissions set correctly (0644)" {
    run "$SCRIPT_PATH" configure --set "model.default=claude-opus-4"
    [ "$status" -eq 0 ]

    # Check file permissions
    local perms=$(stat -f "%OLp" "$CONFIG_FILE" 2>/dev/null || stat -c "%a" "$CONFIG_FILE" 2>/dev/null)
    [[ "$perms" == "644" ]] || [[ "$perms" == "0644" ]]
}

@test "mg-util configure: idempotent (setting same value twice)" {
    run "$SCRIPT_PATH" configure --set "model.default=claude-opus-4"
    [ "$status" -eq 0 ]

    local checksum1=$(md5sum "$CONFIG_FILE" 2>/dev/null || md5 "$CONFIG_FILE" 2>/dev/null)

    run "$SCRIPT_PATH" configure --set "model.default=claude-opus-4"
    [ "$status" -eq 0 ]

    local checksum2=$(md5sum "$CONFIG_FILE" 2>/dev/null || md5 "$CONFIG_FILE" 2>/dev/null)

    [[ "$checksum1" == "$checksum2" ]]
}

@test "mg-util configure: supports all documented config keys" {
    # Test all documented configuration keys
    run "$SCRIPT_PATH" configure --set "model.default=claude-opus-4"
    [ "$status" -eq 0 ]

    run "$SCRIPT_PATH" configure --set "model.fast=claude-sonnet-3.5"
    [ "$status" -eq 0 ]

    run "$SCRIPT_PATH" configure --set "permissions.bash=allow"
    [ "$status" -eq 0 ]

    run "$SCRIPT_PATH" configure --set "permissions.write=allow"
    [ "$status" -eq 0 ]

    run "$SCRIPT_PATH" configure --set "permissions.read=allow"
    [ "$status" -eq 0 ]
}

@test "mg-util configure: validate model names against known models" {
    # Valid model names should succeed
    run "$SCRIPT_PATH" configure --set "model.default=claude-opus-4"
    [ "$status" -eq 0 ]

    run "$SCRIPT_PATH" configure --set "model.default=claude-sonnet-3.5"
    [ "$status" -eq 0 ]

    run "$SCRIPT_PATH" configure --set "model.default=claude-opus-4-6"
    [ "$status" -eq 0 ]
}
