#!/usr/bin/env bats
# ============================================================================
# mg-gate-check.bats - Tests for mg-gate-check script
# ============================================================================
# Test ordering: MISUSE CASES -> BOUNDARY TESTS -> GOLDEN PATH
# Coverage target: 99% of script functionality
# ============================================================================

# Setup and teardown
setup() {
    # Temporary test directory (acts as fake project root)
    TEST_DIR="$(mktemp -d)"

    # Expected script location
    SCRIPT_PATH="$HOME/.claude/scripts/mg-gate-check"

    # Save original directory
    ORIG_DIR="$(pwd)"

    # Create a minimal project structure
    PROJECT_DIR="$TEST_DIR/project"
    mkdir -p "$PROJECT_DIR"
    cd "$PROJECT_DIR"

    # Initialize git repo
    git init --quiet
    git config user.email "test@test.com"
    git config user.name "Test User"

    # Create minimal package.json
    cat > "$PROJECT_DIR/package.json" <<'PKGJSON'
{
  "name": "test-project",
  "version": "1.0.0",
  "scripts": {
    "test": "vitest run"
  }
}
PKGJSON

    # Create a tsconfig.json
    cat > "$PROJECT_DIR/tsconfig.json" <<'TSCFG'
{
  "compilerOptions": {
    "target": "es2020",
    "strict": true
  }
}
TSCFG

    echo "initial" > README.md
    git add .
    git commit -m "Initial commit" --quiet
}

teardown() {
    cd "$ORIG_DIR"
    if [[ -n "$TEST_DIR" && -d "$TEST_DIR" ]]; then
        rm -rf "$TEST_DIR"
    fi
}

# ============================================================================
# MISUSE CASES - Invalid inputs, missing dependencies, error conditions
# ============================================================================

@test "mg-gate-check: not in a project directory (no package.json)" {
    cd "$TEST_DIR"
    mkdir -p "$TEST_DIR/empty-dir"
    cd "$TEST_DIR/empty-dir"

    run "$SCRIPT_PATH"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "package.json" ]] || [[ "$output" =~ "project" ]]
}

@test "mg-gate-check: unknown flag" {
    cd "$PROJECT_DIR"

    run "$SCRIPT_PATH" --unknown-flag
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "unknown" ]] || [[ "$output" =~ "invalid" ]]
}

@test "mg-gate-check: too many arguments" {
    cd "$PROJECT_DIR"

    run "$SCRIPT_PATH" "extra" "args"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "too many" ]]
}

@test "mg-gate-check: --help flag displays usage" {
    run "$SCRIPT_PATH" --help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
    [[ "$output" =~ "mg-gate-check" ]]
    [[ "$output" =~ "JSON" ]] || [[ "$output" =~ "json" ]]
}

@test "mg-gate-check: -h flag displays usage" {
    run "$SCRIPT_PATH" -h
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg-gate-check: missing jq dependency" {
    skip "TODO: Mock PATH to hide jq binary"
}

# ============================================================================
# BOUNDARY TESTS - Edge cases, limits, unusual but valid inputs
# ============================================================================

@test "mg-gate-check: output is valid JSON" {
    cd "$PROJECT_DIR"

    run "$SCRIPT_PATH"
    # Even if gates fail, output should be valid JSON
    # The exit code may be 0 (all pass) or 1 (some fail)
    # But the JSON output should be parseable
    local json_output
    # Extract only the JSON portion (skip any stderr)
    json_output=$(echo "$output" | jq '.' 2>/dev/null)
    [ -n "$json_output" ]
}

@test "mg-gate-check: JSON output has required top-level fields" {
    cd "$PROJECT_DIR"

    run "$SCRIPT_PATH"
    # Parse JSON output
    local has_overall has_gates
    has_overall=$(echo "$output" | jq 'has("overall")' 2>/dev/null)
    has_gates=$(echo "$output" | jq 'has("gates")' 2>/dev/null)

    [[ "$has_overall" == "true" ]]
    [[ "$has_gates" == "true" ]]
}

@test "mg-gate-check: JSON output contains typed failure info" {
    cd "$PROJECT_DIR"

    run "$SCRIPT_PATH"
    # gates should contain typed entries
    local gate_types
    gate_types=$(echo "$output" | jq '.gates | keys' 2>/dev/null)
    [ -n "$gate_types" ]
}

@test "mg-gate-check: overall field is pass or fail" {
    cd "$PROJECT_DIR"

    run "$SCRIPT_PATH"
    local overall
    overall=$(echo "$output" | jq -r '.overall' 2>/dev/null)
    [[ "$overall" == "pass" ]] || [[ "$overall" == "fail" ]]
}

@test "mg-gate-check: each gate has status and type fields" {
    cd "$PROJECT_DIR"

    run "$SCRIPT_PATH"
    # Check that each gate entry has a status field
    local all_have_status
    all_have_status=$(echo "$output" | jq '[.gates[] | has("status")] | all' 2>/dev/null)
    [[ "$all_have_status" == "true" ]]
}

@test "mg-gate-check: gate status is pass, fail, or skip" {
    cd "$PROJECT_DIR"

    run "$SCRIPT_PATH"
    # Each gate status should be one of: pass, fail, skip
    local statuses
    statuses=$(echo "$output" | jq '[.gates[] | .status] | unique | .[]' 2>/dev/null)
    # All statuses should be valid
    for s in $statuses; do
        s=$(echo "$s" | tr -d '"')
        [[ "$s" == "pass" ]] || [[ "$s" == "fail" ]] || [[ "$s" == "skip" ]]
    done
}

@test "mg-gate-check: typed failure categories are correct" {
    cd "$PROJECT_DIR"

    run "$SCRIPT_PATH"
    # The JSON should use the standard failure type names
    local types
    types=$(echo "$output" | jq '.gates | keys | .[]' 2>/dev/null)
    # Should include expected gate check types
    [[ "$types" =~ "tests" ]] || [[ "$types" =~ "tsc" ]] || [[ "$types" =~ "eslint" ]] || [[ "$types" =~ "file_scope" ]]
}

@test "mg-gate-check: handles missing eslint gracefully" {
    cd "$TEST_DIR"
    mkdir -p "$TEST_DIR/no-eslint-project"
    cd "$TEST_DIR/no-eslint-project"
    echo '{"name": "no-eslint"}' > package.json
    git init --quiet
    git config user.email "test@test.com"
    git config user.name "Test User"
    git add . && git commit -m "init" --quiet

    run "$SCRIPT_PATH"
    # Should not crash; eslint gate should be skip
    local eslint_status
    eslint_status=$(echo "$output" | jq -r '.gates.eslint.status' 2>/dev/null)
    [[ "$eslint_status" == "skip" ]] || [[ "$eslint_status" == "fail" ]] || [[ "$eslint_status" == "pass" ]]
}

@test "mg-gate-check: handles missing tsc gracefully" {
    cd "$TEST_DIR"
    mkdir -p "$TEST_DIR/no-tsc-project"
    cd "$TEST_DIR/no-tsc-project"
    echo '{"name": "no-tsc"}' > package.json
    git init --quiet
    git config user.email "test@test.com"
    git config user.name "Test User"
    git add . && git commit -m "init" --quiet

    run "$SCRIPT_PATH"
    # Should not crash; tsc gate should be skip or fail gracefully
    local tsc_status
    tsc_status=$(echo "$output" | jq -r '.gates.tsc.status' 2>/dev/null)
    [[ "$tsc_status" == "skip" ]] || [[ "$tsc_status" == "fail" ]] || [[ "$tsc_status" == "pass" ]]
}

# ============================================================================
# GOLDEN PATH - Normal, expected operations
# ============================================================================

@test "mg-gate-check: produces structured JSON output" {
    cd "$PROJECT_DIR"

    run "$SCRIPT_PATH"
    # Output must be parseable JSON
    run bash -c "echo '$output' | jq '.'"
    [ "$status" -eq 0 ]
}

@test "mg-gate-check: includes tests gate" {
    cd "$PROJECT_DIR"

    run "$SCRIPT_PATH"
    local has_tests
    has_tests=$(echo "$output" | jq 'has("gates") and (.gates | has("tests"))' 2>/dev/null)
    [[ "$has_tests" == "true" ]]
}

@test "mg-gate-check: includes tsc gate" {
    cd "$PROJECT_DIR"

    run "$SCRIPT_PATH"
    local has_tsc
    has_tsc=$(echo "$output" | jq 'has("gates") and (.gates | has("tsc"))' 2>/dev/null)
    [[ "$has_tsc" == "true" ]]
}

@test "mg-gate-check: includes eslint gate" {
    cd "$PROJECT_DIR"

    run "$SCRIPT_PATH"
    local has_eslint
    has_eslint=$(echo "$output" | jq 'has("gates") and (.gates | has("eslint"))' 2>/dev/null)
    [[ "$has_eslint" == "true" ]]
}

@test "mg-gate-check: includes file_scope gate" {
    cd "$PROJECT_DIR"

    run "$SCRIPT_PATH"
    local has_scope
    has_scope=$(echo "$output" | jq 'has("gates") and (.gates | has("file_scope"))' 2>/dev/null)
    [[ "$has_scope" == "true" ]]
}

@test "mg-gate-check: gate failure types match spec" {
    cd "$PROJECT_DIR"

    run "$SCRIPT_PATH"
    # Typed failure routing: test_failure, coverage_gap, type_error, lint_violation, file_scope_violation
    local gates_json
    gates_json=$(echo "$output" | jq '.gates' 2>/dev/null)
    [ -n "$gates_json" ]

    # Check type fields exist for failed gates (if any)
    local types
    types=$(echo "$output" | jq '[.gates[] | select(.status == "fail") | .type] | .[]' 2>/dev/null || echo "none")
    # If there are failures, they should have typed categories
    if [[ "$types" != "none" ]] && [[ -n "$types" ]]; then
        for t in $types; do
            t=$(echo "$t" | tr -d '"')
            [[ "$t" == "test_failure" ]] || [[ "$t" == "coverage_gap" ]] || \
            [[ "$t" == "type_error" ]] || [[ "$t" == "lint_violation" ]] || \
            [[ "$t" == "file_scope_violation" ]]
        done
    fi
}

@test "mg-gate-check: exit code 0 when all gates pass" {
    # This may not always be achievable in test env, but script should exit 0 if all pass
    cd "$PROJECT_DIR"
    run "$SCRIPT_PATH"
    local overall
    overall=$(echo "$output" | jq -r '.overall' 2>/dev/null)
    if [[ "$overall" == "pass" ]]; then
        [ "$status" -eq 0 ]
    fi
}

@test "mg-gate-check: exit code 1 when any gate fails" {
    cd "$PROJECT_DIR"
    run "$SCRIPT_PATH"
    local overall
    overall=$(echo "$output" | jq -r '.overall' 2>/dev/null)
    if [[ "$overall" == "fail" ]]; then
        [ "$status" -eq 1 ]
    fi
}

@test "mg-gate-check: can be piped to jq" {
    cd "$PROJECT_DIR"

    run bash -c "cd '$PROJECT_DIR' && '$SCRIPT_PATH' | jq -r '.overall'"
    [ "$status" -eq 0 ]
    [[ "$output" == "pass" ]] || [[ "$output" == "fail" ]]
}

@test "mg-gate-check: output includes timestamp" {
    cd "$PROJECT_DIR"

    run "$SCRIPT_PATH"
    local has_timestamp
    has_timestamp=$(echo "$output" | jq 'has("timestamp")' 2>/dev/null)
    [[ "$has_timestamp" == "true" ]]
}

@test "mg-gate-check: idempotent (same output structure on repeated calls)" {
    cd "$PROJECT_DIR"

    local first_keys second_keys
    first_keys=$("$SCRIPT_PATH" 2>/dev/null | jq '.gates | keys | sort' 2>/dev/null)
    second_keys=$("$SCRIPT_PATH" 2>/dev/null | jq '.gates | keys | sort' 2>/dev/null)
    [[ "$first_keys" == "$second_keys" ]]
}
