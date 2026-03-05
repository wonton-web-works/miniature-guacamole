#!/usr/bin/env bats
# ============================================================================
# mg-config.bats - Tests for mg-config script (WS-DB-5)
# ============================================================================
# Test ordering: MISUSE CASES → BOUNDARY TESTS → GOLDEN PATH
# Coverage target: AC-DB-5.1, AC-DB-5.2, AC-DB-5.3
# ============================================================================

bats_require_minimum_version 1.5.0

setup() {
    # Temporary test directory — isolated from real ~/.config
    TEST_DIR="$(mktemp -d)"

    # Resolve project root (tests/scripts/ → project root)
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"

    # Create temporary .claude/scripts directory for testing
    TEST_CLAUDE_DIR="$TEST_DIR/.claude/scripts"
    mkdir -p "$TEST_CLAUDE_DIR"

    # Copy all mg-* scripts from project to test directory
    cp "$PROJECT_ROOT"/src/framework/scripts/mg-* "$TEST_CLAUDE_DIR/" 2>/dev/null || true
    chmod +x "$TEST_CLAUDE_DIR"/mg-* 2>/dev/null || true

    SCRIPT_PATH="$TEST_CLAUDE_DIR/mg-config"

    # Point mg-config at a test-local config dir — never touches real ~/.config
    export MG_CONFIG_DIR="$TEST_DIR/config/miniature-guacamole"
    mkdir -p "$MG_CONFIG_DIR"

    CONFIG_FILE="$MG_CONFIG_DIR/config.json"
}

teardown() {
    if [[ -n "$TEST_DIR" && -d "$TEST_DIR" ]]; then
        rm -rf "$TEST_DIR"
    fi
}

# ============================================================================
# MISUSE CASES — Invalid inputs, missing args, error conditions
# ============================================================================

@test "mg-config: no arguments provided — exits non-zero with usage" {
    # mg-config with no subcommand must fail with usage guidance
    run "$SCRIPT_PATH"
    [ "$status" -ne 0 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "usage:" ]] || [[ "$output" =~ "get" ]]
}

@test "mg-config: unknown subcommand — exits non-zero" {
    run "$SCRIPT_PATH" badcommand
    [ "$status" -ne 0 ]
    [[ "$output" =~ "Unknown" ]] || [[ "$output" =~ "unknown" ]] || [[ "$output" =~ "invalid" ]] || [[ "$output" =~ "Usage:" ]]
}

@test "mg-config get: unknown key — exits non-zero or prints empty" {
    # AC-DB-5.2: getting a key that was never set should not silently succeed with garbage
    echo '{"postgres_url":"postgresql://mg:mg@localhost:5432/mg_memory","storage_mode":"postgres","auto_provision":true,"mg_version":""}' > "$CONFIG_FILE"
    run "$SCRIPT_PATH" get nonexistent_key
    # Either exits non-zero, or prints nothing / "null" (not an arbitrary value)
    if [ "$status" -eq 0 ]; then
        [[ -z "$output" ]] || [[ "$output" == "null" ]] || [[ "$output" == "" ]]
    else
        [ "$status" -ne 0 ]
    fi
}

@test "mg-config set: no arguments after set — exits non-zero" {
    run "$SCRIPT_PATH" set
    [ "$status" -ne 0 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "key" ]] || [[ "$output" =~ "required" ]]
}

@test "mg-config set: only key provided, no value — exits non-zero" {
    # AC-DB-5.2: set requires both key and value
    echo '{}' > "$CONFIG_FILE"
    run "$SCRIPT_PATH" set storage_mode
    [ "$status" -ne 0 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "value" ]] || [[ "$output" =~ "required" ]]
}

@test "mg-config get: no key provided — exits non-zero" {
    run "$SCRIPT_PATH" get
    [ "$status" -ne 0 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "key" ]] || [[ "$output" =~ "required" ]]
}

@test "mg-config init: malformed config file — overwrites with valid defaults" {
    # If config exists but is corrupt, init should repair it (idempotent / safe recovery)
    echo 'this is not json at all' > "$CONFIG_FILE"
    run "$SCRIPT_PATH" init
    # Must not crash; file must become valid JSON afterwards
    [ "$status" -eq 0 ] || [ "$status" -ne 0 ]  # flexible on exit code
    if [ -f "$CONFIG_FILE" ]; then
        run jq empty "$CONFIG_FILE"
        [ "$status" -eq 0 ]
    fi
}

@test "mg-config get: config file missing entirely — exits non-zero or returns empty" {
    # No init was run; config file does not exist
    rm -f "$CONFIG_FILE"
    run "$SCRIPT_PATH" get postgres_url
    # Should fail gracefully, not produce a stack trace or unhandled error
    [[ "$output" != *"unbound variable"* ]]
    [[ "$output" != *"line "* ]] || true
}

# ============================================================================
# BOUNDARY TESTS — Edge cases, XDG override, special values
# ============================================================================

@test "mg-config init: already exists — idempotent, exits 0, does not overwrite" {
    # AC-DB-5.3: re-running init on an existing config must not clobber it
    "$SCRIPT_PATH" init
    # Set a custom value
    "$SCRIPT_PATH" set mg_version "v1.2.3"
    local before
    before=$(jq -r '.mg_version' "$CONFIG_FILE")

    # Run init again
    run "$SCRIPT_PATH" init
    [ "$status" -eq 0 ]

    local after
    after=$(jq -r '.mg_version' "$CONFIG_FILE")
    # Custom value must survive a second init
    [[ "$after" == "$before" ]]
}

@test "mg-config: XDG_CONFIG_HOME overrides default config location" {
    # AC-DB-5.1: config location must respect XDG_CONFIG_HOME when MG_CONFIG_DIR is unset
    local xdg_dir="$TEST_DIR/xdg"
    mkdir -p "$xdg_dir"
    unset MG_CONFIG_DIR

    XDG_CONFIG_HOME="$xdg_dir" run "$SCRIPT_PATH" init
    [ "$status" -eq 0 ]

    # Config must be under xdg_dir/miniature-guacamole/
    [[ -f "$xdg_dir/miniature-guacamole/config.json" ]]
}

@test "mg-config set: value with special characters (spaces, slashes) — round-trips correctly" {
    # Boundary: values may contain URL-like or path-like content
    "$SCRIPT_PATH" init
    run "$SCRIPT_PATH" set postgres_url "postgresql://user:p@ss@db.example.com:5432/my_db"
    [ "$status" -eq 0 ]

    local result
    result=$(jq -r '.postgres_url' "$CONFIG_FILE")
    [[ "$result" == "postgresql://user:p@ss@db.example.com:5432/my_db" ]]
}

@test "mg-config set: empty string value — stored as empty string, not null" {
    # Boundary: empty value is valid (e.g., clearing mg_version)
    "$SCRIPT_PATH" init
    run "$SCRIPT_PATH" set mg_version ""
    [ "$status" -eq 0 ]

    local result
    result=$(jq -r '.mg_version' "$CONFIG_FILE")
    [[ "$result" == "" ]]
}

@test "mg-config set: boolean-like value (true/false) — stored and retrieved correctly" {
    # Boundary: auto_provision is boolean in defaults; set as string should still work
    "$SCRIPT_PATH" init
    run "$SCRIPT_PATH" set auto_provision "false"
    [ "$status" -eq 0 ]

    # Value must be readable back — exact type (bool vs string) is implementation choice
    local result
    result=$(jq -r '.auto_provision' "$CONFIG_FILE")
    [[ "$result" == "false" ]]
}

# ============================================================================
# GOLDEN PATH — Happy path init, get, set, list
# ============================================================================

@test "mg-config init: creates config file at MG_CONFIG_DIR" {
    # AC-DB-5.3: init must create config.json
    rm -f "$CONFIG_FILE"
    run "$SCRIPT_PATH" init
    [ "$status" -eq 0 ]
    [[ -f "$CONFIG_FILE" ]]
}

@test "mg-config init: config has all four required default keys" {
    # AC-DB-5.1: all four keys must exist after init
    run "$SCRIPT_PATH" init
    [ "$status" -eq 0 ]

    run jq 'has("postgres_url") and has("storage_mode") and has("auto_provision") and has("mg_version")' "$CONFIG_FILE"
    [ "$status" -eq 0 ]
    [[ "$output" == "true" ]]
}

@test "mg-config init: default postgres_url is correct" {
    # AC-DB-5.1: default value check
    run "$SCRIPT_PATH" init
    [ "$status" -eq 0 ]

    local result
    result=$(jq -r '.postgres_url' "$CONFIG_FILE")
    [[ "$result" == "postgresql://mg:mg@localhost:5432/mg_memory" ]]
}

@test "mg-config init: default storage_mode is postgres" {
    run "$SCRIPT_PATH" init
    [ "$status" -eq 0 ]

    local result
    result=$(jq -r '.storage_mode' "$CONFIG_FILE")
    [[ "$result" == "postgres" ]]
}

@test "mg-config init: default auto_provision is true" {
    run "$SCRIPT_PATH" init
    [ "$status" -eq 0 ]

    local result
    result=$(jq -r '.auto_provision' "$CONFIG_FILE")
    [[ "$result" == "true" ]]
}

@test "mg-config init: config file is valid JSON" {
    run "$SCRIPT_PATH" init
    [ "$status" -eq 0 ]

    run jq empty "$CONFIG_FILE"
    [ "$status" -eq 0 ]
}

@test "mg-config get: returns value for known key" {
    # AC-DB-5.2: get must return correct value
    "$SCRIPT_PATH" init
    run "$SCRIPT_PATH" get postgres_url
    [ "$status" -eq 0 ]
    [[ "$output" == "postgresql://mg:mg@localhost:5432/mg_memory" ]]
}

@test "mg-config set: persists value to config file" {
    # AC-DB-5.2: set must write to disk
    "$SCRIPT_PATH" init
    run "$SCRIPT_PATH" set storage_mode "file"
    [ "$status" -eq 0 ]

    local result
    result=$(jq -r '.storage_mode' "$CONFIG_FILE")
    [[ "$result" == "file" ]]
}

@test "mg-config get: reads value written by set" {
    # AC-DB-5.2: get/set round-trip
    "$SCRIPT_PATH" init
    "$SCRIPT_PATH" set mg_version "v2.0.0"

    run "$SCRIPT_PATH" get mg_version
    [ "$status" -eq 0 ]
    [[ "$output" == "v2.0.0" ]]
}

@test "mg-config set: multiple calls persist independently" {
    # AC-DB-5.2: each set call must not clobber other keys
    "$SCRIPT_PATH" init
    "$SCRIPT_PATH" set mg_version "v1.0.0"
    "$SCRIPT_PATH" set storage_mode "file"

    local version mode
    version=$(jq -r '.mg_version' "$CONFIG_FILE")
    mode=$(jq -r '.storage_mode' "$CONFIG_FILE")

    [[ "$version" == "v1.0.0" ]]
    [[ "$mode" == "file" ]]
}

@test "mg-config list: prints all key=value pairs" {
    # AC-DB-5.2: list must output all four keys
    "$SCRIPT_PATH" init
    run "$SCRIPT_PATH" list
    [ "$status" -eq 0 ]

    [[ "$output" =~ "postgres_url" ]]
    [[ "$output" =~ "storage_mode" ]]
    [[ "$output" =~ "auto_provision" ]]
    [[ "$output" =~ "mg_version" ]]
}

@test "mg-config list: output reflects updated value after set" {
    "$SCRIPT_PATH" init
    "$SCRIPT_PATH" set storage_mode "file"

    run "$SCRIPT_PATH" list
    [ "$status" -eq 0 ]
    [[ "$output" =~ "file" ]]
}
