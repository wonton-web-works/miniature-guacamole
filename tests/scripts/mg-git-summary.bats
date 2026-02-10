#!/usr/bin/env bats
# ============================================================================
# mg-git-summary.bats - Tests for mg-git-summary script
# ============================================================================
# Test ordering: MISUSE CASES -> BOUNDARY TESTS -> GOLDEN PATH
# Coverage target: 99% of script functionality
# ============================================================================

# Setup and teardown
setup() {
    # Temporary test directory (acts as fake git repo)
    TEST_DIR="$(mktemp -d)"

    # Resolve project root (tests/scripts/ → project root)
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"

    # Create temporary .claude/scripts directory for testing
    TEST_CLAUDE_DIR="$TEST_DIR/.claude/scripts"
    mkdir -p "$TEST_CLAUDE_DIR"

    # Copy all mg-* scripts from project to test directory
    cp "$PROJECT_ROOT"/src/framework/scripts/mg-* "$TEST_CLAUDE_DIR/"
    chmod +x "$TEST_CLAUDE_DIR"/mg-*

    SCRIPT_PATH="$TEST_CLAUDE_DIR/mg-git-summary"

    # Initialize a temporary git repo for testing
    git init "$TEST_DIR/repo" --quiet
    REPO_DIR="$TEST_DIR/repo"
    cd "$REPO_DIR"
    git config user.email "test@test.com"
    git config user.name "Test User"

    # Create initial commit
    echo "initial" > README.md
    git add README.md
    git commit -m "Initial commit" --quiet

    # Create a second commit with known date
    echo "second change" >> README.md
    git add README.md
    GIT_AUTHOR_DATE="2026-02-01T10:00:00" GIT_COMMITTER_DATE="2026-02-01T10:00:00" \
        git commit -m "feat: add feature X" --quiet

    # Create a third commit
    echo "third change" >> README.md
    git add README.md
    GIT_AUTHOR_DATE="2026-02-05T14:00:00" GIT_COMMITTER_DATE="2026-02-05T14:00:00" \
        git commit -m "fix: resolve bug in Y" --quiet
}

teardown() {
    if [[ -n "$TEST_DIR" && -d "$TEST_DIR" ]]; then
        rm -rf "$TEST_DIR"
    fi
}

# ============================================================================
# MISUSE CASES - Invalid inputs, missing dependencies, error conditions
# ============================================================================

@test "mg-git-summary: not in a git repository" {
    cd "$TEST_DIR"
    # Create a directory that is NOT a git repo
    mkdir -p "$TEST_DIR/not-a-repo"
    cd "$TEST_DIR/not-a-repo"

    run "$SCRIPT_PATH"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "git" ]] || [[ "$output" =~ "repository" ]]
}

@test "mg-git-summary: invalid --since value" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH" --since "not-a-valid-ref-or-date"
    # Git will still try; script should handle gracefully or show empty
    # The key is it should not crash with an unhandled error
    [[ "$status" -eq 0 ]] || [[ "$status" -eq 1 ]]
}

@test "mg-git-summary: unknown flag" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH" --unknown-flag
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "unknown" ]] || [[ "$output" =~ "invalid" ]]
}

@test "mg-git-summary: too many arguments" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH" --since "2026-01-01" "extra-arg"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "too many" ]]
}

@test "mg-git-summary: --since without value" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH" --since
    [ "$status" -eq 1 ]
    [[ "$output" =~ "value" ]] || [[ "$output" =~ "required" ]] || [[ "$output" =~ "missing" ]]
}

@test "mg-git-summary: --help flag displays usage" {
    run "$SCRIPT_PATH" --help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
    [[ "$output" =~ "mg-git-summary" ]]
    [[ "$output" =~ "--since" ]]
}

@test "mg-git-summary: -h flag displays usage" {
    run "$SCRIPT_PATH" -h
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
}

# ============================================================================
# BOUNDARY TESTS - Edge cases, limits, unusual but valid inputs
# ============================================================================

@test "mg-git-summary: repo with single commit" {
    cd "$TEST_DIR"
    mkdir single-commit-repo && cd single-commit-repo
    git init --quiet
    git config user.email "test@test.com"
    git config user.name "Test User"
    echo "only" > file.txt
    git add file.txt
    git commit -m "only commit" --quiet

    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "only commit" ]]
}

@test "mg-git-summary: --since with date that excludes all commits" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH" --since "2099-01-01"
    [ "$status" -eq 0 ]
    # Output should be empty or show no commits
    # Should not error
}

@test "mg-git-summary: --since with date that includes all commits" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH" --since "2000-01-01"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Initial commit" ]]
    [[ "$output" =~ "feat: add feature X" ]]
    [[ "$output" =~ "fix: resolve bug in Y" ]]
}

@test "mg-git-summary: --since with git ref (commit hash)" {
    cd "$REPO_DIR"
    local first_hash
    first_hash=$(git rev-list --reverse HEAD | head -1)

    run "$SCRIPT_PATH" --since "$first_hash"
    [ "$status" -eq 0 ]
    # Should show commits after the first one
    [[ "$output" =~ "feat: add feature X" ]] || [[ "$output" =~ "fix: resolve bug in Y" ]]
}

@test "mg-git-summary: commit messages with special characters" {
    cd "$REPO_DIR"
    echo "special" > special.txt
    git add special.txt
    git commit -m 'fix: handle "quotes" & <angles>' --quiet

    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "quotes" ]] || [[ "$output" =~ "angles" ]]
}

@test "mg-git-summary: repo with merge commits" {
    cd "$REPO_DIR"
    git checkout -b feature-branch --quiet
    echo "feature" > feature.txt
    git add feature.txt
    git commit -m "feat: branch work" --quiet
    git checkout main --quiet 2>/dev/null || git checkout master --quiet
    git merge feature-branch --no-edit --quiet

    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "feat: branch work" ]] || [[ "$output" =~ "Merge" ]]
}

# ============================================================================
# GOLDEN PATH - Normal, expected operations
# ============================================================================

@test "mg-git-summary: default output shows all commits" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Initial commit" ]]
    [[ "$output" =~ "feat: add feature X" ]]
    [[ "$output" =~ "fix: resolve bug in Y" ]]
}

@test "mg-git-summary: output contains commit hashes" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]
    # Should contain abbreviated commit hashes (7+ hex chars)
    [[ "$output" =~ [0-9a-f]{7} ]]
}

@test "mg-git-summary: output contains author names" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Test User" ]]
}

@test "mg-git-summary: output contains dates" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "2026" ]]
}

@test "mg-git-summary: output contains commit messages" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "feat:" ]]
    [[ "$output" =~ "fix:" ]]
}

@test "mg-git-summary: --since filters commits by date" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH" --since "2026-02-03"
    [ "$status" -eq 0 ]
    # Should only include the Feb 5 commit
    [[ "$output" =~ "fix: resolve bug in Y" ]]
    # Should NOT include the Feb 1 commit
    [[ ! "$output" =~ "feat: add feature X" ]]
}

@test "mg-git-summary: output is formatted for status reports" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]
    # Output should have multiple lines (formatted, not one blob)
    local line_count
    line_count=$(echo "$output" | wc -l)
    [ "$line_count" -gt 2 ]
}

@test "mg-git-summary: exit code 0 on success" {
    cd "$REPO_DIR"

    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]
}

@test "mg-git-summary: can be piped to other commands" {
    cd "$REPO_DIR"

    run bash -c "cd '$REPO_DIR' && '$SCRIPT_PATH' | grep -c 'commit'"
    [ "$status" -eq 0 ]
}

@test "mg-git-summary: idempotent (same output on repeated calls)" {
    cd "$REPO_DIR"

    local first_output second_output
    first_output=$("$SCRIPT_PATH")
    second_output=$("$SCRIPT_PATH")
    [[ "$first_output" == "$second_output" ]]
}
