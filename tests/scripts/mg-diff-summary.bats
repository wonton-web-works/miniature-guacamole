#!/usr/bin/env bats
# ============================================================================
# mg-diff-summary.bats - Tests for mg-diff-summary script
# ============================================================================
# Test ordering: MISUSE CASES -> BOUNDARY TESTS -> GOLDEN PATH
# Coverage target: 99% of script functionality
# ============================================================================

# Setup and teardown
setup() {
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

    SCRIPT_PATH="$TEST_CLAUDE_DIR/mg-diff-summary"

    # Initialize a git repo with a main branch and changes
    REPO_DIR="$TEST_DIR/repo"
    git init "$REPO_DIR" --initial-branch=main --quiet
    cd "$REPO_DIR"
    git config user.email "test@test.com"
    git config user.name "Test User"

    # Create initial commit on main
    echo "initial content" > README.md
    mkdir -p src
    echo "console.log('hello');" > src/index.ts
    git add .
    git commit -m "Initial commit" --quiet

    # Create a feature branch with changes
    git checkout -b feature/test-branch --quiet
    echo "new feature code" > src/feature.ts
    echo "updated content" >> README.md
    echo "more lines" >> README.md
    mkdir -p tests
    echo "test code" > tests/feature.test.ts
    git add .
    git commit -m "feat: add feature" --quiet
}

teardown() {
    if [[ -n "$TEST_DIR" && -d "$TEST_DIR" ]]; then
        rm -rf "$TEST_DIR"
    fi
}

# ============================================================================
# MISUSE CASES - Invalid inputs, missing dependencies, error conditions
# ============================================================================

@test "mg-diff-summary: not in a git repository" {
    cd "$TEST_DIR"
    mkdir -p "$TEST_DIR/not-a-repo"
    cd "$TEST_DIR/not-a-repo"

    run "$SCRIPT_PATH"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "git" ]] || [[ "$output" =~ "repository" ]]
}

@test "mg-diff-summary: invalid base branch" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH" "nonexistent-branch"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "branch" ]] || [[ "$output" =~ "not found" ]] || [[ "$output" =~ "unknown" ]]
}

@test "mg-diff-summary: too many arguments" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH" "main" "extra" "args"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "too many" ]]
}

@test "mg-diff-summary: unknown flag" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH" --unknown-flag
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "unknown" ]] || [[ "$output" =~ "invalid" ]]
}

@test "mg-diff-summary: --help flag displays usage" {
    run "$SCRIPT_PATH" --help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
    [[ "$output" =~ "mg-diff-summary" ]]
    [[ "$output" =~ "base" ]] || [[ "$output" =~ "branch" ]]
}

@test "mg-diff-summary: -h flag displays usage" {
    run "$SCRIPT_PATH" -h
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
}

# ============================================================================
# BOUNDARY TESTS - Edge cases, limits, unusual but valid inputs
# ============================================================================

@test "mg-diff-summary: no changes from base branch (on main itself)" {
    cd "$REPO_DIR"
    git checkout main --quiet 2>/dev/null || git checkout master --quiet

    run "$SCRIPT_PATH" "main"
    [ "$status" -eq 0 ]
    # Should indicate no changes or show empty summary
    [[ "$output" =~ "0" ]] || [[ "$output" =~ "no change" ]] || [[ "$output" =~ "No change" ]] || [[ -z "$output" ]] || [[ "$output" =~ "Files changed:" ]]
}

@test "mg-diff-summary: single file changed" {
    cd "$REPO_DIR"
    # Create branch with just one change
    git checkout main --quiet 2>/dev/null || git checkout master --quiet
    git checkout -b single-change --quiet
    echo "one change" >> README.md
    git add .
    git commit -m "single change" --quiet

    run "$SCRIPT_PATH" "main"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "README" ]]
}

@test "mg-diff-summary: binary files changed" {
    cd "$REPO_DIR"
    # Create a binary-like file
    printf '\x00\x01\x02\x03' > binary.bin
    git add binary.bin
    git commit -m "add binary" --quiet

    run "$SCRIPT_PATH" "main"
    [ "$status" -eq 0 ]
    # Should handle binary files without crashing
}

@test "mg-diff-summary: file deleted in diff" {
    cd "$REPO_DIR"
    git rm src/index.ts --quiet
    git commit -m "remove file" --quiet

    run "$SCRIPT_PATH" "main"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "index.ts" ]] || [[ "$output" =~ "src" ]]
}

@test "mg-diff-summary: many files changed" {
    cd "$REPO_DIR"
    for i in {1..20}; do
        echo "file $i content" > "src/file-$i.ts"
    done
    git add .
    git commit -m "add many files" --quiet

    run "$SCRIPT_PATH" "main"
    [ "$status" -eq 0 ]
    # Should show file count
    [[ "$output" =~ "2[0-9]" ]] || [[ "$output" =~ "files" ]]
}

@test "mg-diff-summary: file renamed in diff" {
    cd "$REPO_DIR"
    git mv src/feature.ts src/renamed-feature.ts
    git commit -m "rename file" --quiet

    run "$SCRIPT_PATH" "main"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "renamed" ]] || [[ "$output" =~ "feature" ]]
}

@test "mg-diff-summary: defaults to main when no base branch specified" {
    cd "$REPO_DIR"

    # Should default to 'main' as base branch
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "feature.ts" ]] || [[ "$output" =~ "README" ]]
}

# ============================================================================
# GOLDEN PATH - Normal, expected operations
# ============================================================================

@test "mg-diff-summary: shows files changed" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH" "main"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "feature.ts" ]]
    [[ "$output" =~ "README" ]]
}

@test "mg-diff-summary: shows lines added" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH" "main"
    [ "$status" -eq 0 ]
    # Should show line counts (additions)
    [[ "$output" =~ "add" ]] || [[ "$output" =~ "+" ]] || [[ "$output" =~ "insert" ]]
}

@test "mg-diff-summary: shows lines removed" {
    cd "$REPO_DIR"
    # Make a deletion
    echo "replaced" > src/index.ts
    git add .
    git commit -m "modify file" --quiet

    run "$SCRIPT_PATH" "main"
    [ "$status" -eq 0 ]
    # Should show line counts (removals)
    [[ "$output" =~ "remov" ]] || [[ "$output" =~ "delet" ]] || [[ "$output" =~ "-" ]]
}

@test "mg-diff-summary: shows scope summary (file categories)" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH" "main"
    [ "$status" -eq 0 ]
    # Should categorize files (src/, tests/, etc.)
    [[ "$output" =~ "src" ]] || [[ "$output" =~ "test" ]] || [[ "$output" =~ "scope" ]] || [[ "$output" =~ "Scope" ]]
}

@test "mg-diff-summary: shows file count" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH" "main"
    [ "$status" -eq 0 ]
    # Should show number of files changed
    [[ "$output" =~ [0-9] ]]
}

@test "mg-diff-summary: explicit base branch argument works" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH" "main"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "feature.ts" ]]
}

@test "mg-diff-summary: exit code 0 on success" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH" "main"
    [ "$status" -eq 0 ]
}

@test "mg-diff-summary: can be piped to other commands" {
    cd "$REPO_DIR"

    run bash -c "cd '$REPO_DIR' && '$SCRIPT_PATH' main | wc -l"
    [ "$status" -eq 0 ]
    local lines
    lines=$(echo "$output" | tr -d ' ')
    [ "$lines" -gt 0 ]
}

@test "mg-diff-summary: idempotent (same output on repeated calls)" {
    cd "$REPO_DIR"

    local first_output second_output
    first_output=$("$SCRIPT_PATH" "main")
    second_output=$("$SCRIPT_PATH" "main")
    [[ "$first_output" == "$second_output" ]]
}

@test "mg-diff-summary: output is human-readable format" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH" "main"
    [ "$status" -eq 0 ]
    # Output should be multi-line formatted text
    local line_count
    line_count=$(echo "$output" | wc -l)
    [ "$line_count" -gt 1 ]
}
