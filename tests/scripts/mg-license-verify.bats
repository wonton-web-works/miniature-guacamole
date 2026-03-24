#!/usr/bin/env bats
# ============================================================================
# mg-license-verify.bats - License and Repo Hygiene Tests (WS-OSS-3)
# ============================================================================
# Test ordering: MISUSE CASES → BOUNDARY TESTS → GOLDEN PATH
# Coverage target: 99% of all 7 acceptance criteria
#
# Acceptance Criteria:
#   AC-OSS-3.1: LICENSE file exists at repo root with MIT license text
#   AC-OSS-3.2: premium/ directory is excluded from dist tarball
#   AC-OSS-3.3: Stale bench files (src/bench/greeting.html, tests/bench/) removed
#   AC-OSS-3.4: .gitignore covers node_modules, dist/, .env, coverage, *.tar.gz
#   AC-OSS-3.5: No files with real credential patterns in tracked files
#   AC-OSS-3.6: package.json license field set to "MIT"
#   AC-OSS-3.7: premium/ has its own README noting proprietary license
# ============================================================================

bats_require_minimum_version 1.5.0

setup() {
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"
}

# ============================================================================
# MISUSE CASES — Missing required files, wrong values, invalid patterns
# ============================================================================

# --- AC-OSS-3.1 misuse ---

@test "AC-OSS-3.1 MISUSE: LICENSE file exists at repo root" {
    # Fails RED if LICENSE is absent
    [ -f "$PROJECT_ROOT/LICENSE" ]
}

@test "AC-OSS-3.1 MISUSE: LICENSE is a regular file, not a symlink or directory" {
    [ -f "$PROJECT_ROOT/LICENSE" ]
    [ ! -L "$PROJECT_ROOT/LICENSE" ]
    [ ! -d "$PROJECT_ROOT/LICENSE" ]
}

@test "AC-OSS-3.1 MISUSE: LICENSE is not empty" {
    [ -f "$PROJECT_ROOT/LICENSE" ]
    local size
    size=$(wc -c < "$PROJECT_ROOT/LICENSE" | tr -d ' ')
    [ "$size" -gt 0 ]
}

@test "AC-OSS-3.1 MISUSE: LICENSE does not contain Apache or GPL text" {
    [ -f "$PROJECT_ROOT/LICENSE" ]
    run grep -i "apache\|gnu general public\|gpl" "$PROJECT_ROOT/LICENSE"
    [ "$status" -ne 0 ]
}

# --- AC-OSS-3.2 misuse ---

@test "AC-OSS-3.2 MISUSE: build.sh does not copy premium/ into dist staging dir" {
    # build.sh must never cp premium/ into DIST_DIR
    # It copies only src/framework/ and src/installer/ — verify no cp of premium/
    run grep -n "cp.*premium" "$PROJECT_ROOT/build.sh"
    [ "$status" -ne 0 ]
}

@test "AC-OSS-3.2 MISUSE: build.sh does not reference premium/ as a source directory" {
    # tar, rsync, or any archiving command must not include premium/
    run grep -n "tar.*premium\|rsync.*premium\|zip.*premium" "$PROJECT_ROOT/build.sh"
    [ "$status" -ne 0 ]
}

@test "AC-OSS-3.2 MISUSE: build.sh does not add premium/ to FRAMEWORK_DIR or INSTALLER_DIR" {
    run grep -n "FRAMEWORK_DIR.*premium\|INSTALLER_DIR.*premium" "$PROJECT_ROOT/build.sh"
    [ "$status" -ne 0 ]
}

# --- AC-OSS-3.3 misuse ---

@test "AC-OSS-3.3 MISUSE: src/bench/greeting.html does not exist" {
    # Fails RED while stale file is still present
    [ ! -f "$PROJECT_ROOT/src/bench/greeting.html" ]
}

@test "AC-OSS-3.3 MISUSE: tests/bench/ directory does not exist" {
    # Fails RED while empty stale directory is still present
    [ ! -d "$PROJECT_ROOT/tests/bench" ]
}

@test "AC-OSS-3.3 MISUSE: src/bench/ directory itself is removed when empty" {
    # If greeting.html is the only file, src/bench/ should also be gone
    if [ ! -f "$PROJECT_ROOT/src/bench/greeting.html" ]; then
        # src/bench/ should not exist as an orphaned empty directory
        local bench_count
        bench_count=$(find "$PROJECT_ROOT/src/bench" -maxdepth 1 -type f 2>/dev/null | wc -l | tr -d ' ')
        # Either the dir is gone or it contains other intentional files (not greeting.html)
        [ ! -d "$PROJECT_ROOT/src/bench" ] || [ "$bench_count" -gt 0 ]
    else
        skip "greeting.html still present — separate test covers that"
    fi
}

# --- AC-OSS-3.4 misuse ---

@test "AC-OSS-3.4 MISUSE: .gitignore exists at repo root" {
    [ -f "$PROJECT_ROOT/.gitignore" ]
}

@test "AC-OSS-3.4 MISUSE: .gitignore covers *.tar.gz pattern" {
    # Fails RED — *.tar.gz is currently not in .gitignore
    run grep -q "\*\.tar\.gz" "$PROJECT_ROOT/.gitignore"
    [ "$status" -eq 0 ]
}

# --- AC-OSS-3.5 misuse ---

@test "AC-OSS-3.5 MISUSE: no real AWS access key IDs (AKIA prefix + 16 alphanum) in tracked files" {
    # Regex: AKIA followed by exactly 16 uppercase letters/digits
    # Excludes the regex pattern itself in launch-validation.test.ts
    cd "$PROJECT_ROOT"
    run bash -c "git grep -n 'AKIA[A-Z0-9]\{16\}' -- . | grep -v '/AKIA\[' | grep -v 'AKIAIOSFODNN7EXAMPLE'"
    [ "$status" -ne 0 ]
}

@test "AC-OSS-3.5 MISUSE: no real OpenAI/Anthropic API keys (sk- followed by 32+ alphanum) in tracked files" {
    # sk-test-key is explicitly allowed (short, clearly a test stub)
    # A real key would be sk- followed by 32+ chars
    cd "$PROJECT_ROOT"
    run bash -c "git grep -n 'sk-[a-zA-Z0-9]\{32,\}' -- ."
    [ "$status" -ne 0 ]
}

@test "AC-OSS-3.5 MISUSE: no real GitHub personal access tokens (ghp_ followed by 36+ alphanum) in tracked files" {
    # ghp_test, ghp_YOUR_GITHUB_TOKEN, and sequential alphabetic sequences (AbCdEf...) are safe fixtures
    # Real PATs are random — exclude obvious sequential/alphabetic test fixtures
    cd "$PROJECT_ROOT"
    run bash -c "git grep -n 'ghp_[a-zA-Z0-9]\{36,\}' -- . \
        | grep -v 'AbCdEfGhIjKlMnOpQrStUvWxYz' \
        | grep -v 'YOUR_GITHUB_TOKEN' \
        | grep -v 'placeholder\|example\|fake\|dummy'"
    [ "$status" -ne 0 ]
}

@test "AC-OSS-3.5 MISUSE: no AWS secret access keys pattern in tracked files" {
    # Real AWS secret keys are 40-char base64-like strings after known context
    # Check for hardcoded patterns with 40-char values after aws_secret_access_key =
    cd "$PROJECT_ROOT"
    run bash -c "git grep -in 'aws_secret_access_key\s*=\s*[A-Za-z0-9/+]\{40\}' -- ."
    [ "$status" -ne 0 ]
}

# --- AC-OSS-3.6 misuse ---

@test "AC-OSS-3.6 MISUSE: package.json exists" {
    [ -f "$PROJECT_ROOT/package.json" ]
}

@test "AC-OSS-3.6 MISUSE: package.json license field is not missing" {
    run grep -q '"license"' "$PROJECT_ROOT/package.json"
    [ "$status" -eq 0 ]
}

@test "AC-OSS-3.6 MISUSE: package.json license field is not UNLICENSED" {
    run grep '"license"' "$PROJECT_ROOT/package.json"
    [ "$status" -eq 0 ]
    [[ ! "$output" =~ "UNLICENSED" ]]
}

@test "AC-OSS-3.6 MISUSE: package.json license field is not Apache-2.0 or GPL" {
    run grep '"license"' "$PROJECT_ROOT/package.json"
    [ "$status" -eq 0 ]
    [[ ! "$output" =~ "Apache" ]]
    [[ ! "$output" =~ "GPL" ]]
}

# --- AC-OSS-3.7 misuse ---

@test "AC-OSS-3.7 MISUSE: premium/README.md exists" {
    [ -f "$PROJECT_ROOT/premium/README.md" ]
}

@test "AC-OSS-3.7 MISUSE: premium/README.md is not empty" {
    [ -f "$PROJECT_ROOT/premium/README.md" ]
    local size
    size=$(wc -c < "$PROJECT_ROOT/premium/README.md" | tr -d ' ')
    [ "$size" -gt 0 ]
}

@test "AC-OSS-3.7 MISUSE: premium/README.md does not say MIT license" {
    [ -f "$PROJECT_ROOT/premium/README.md" ]
    run grep -i "mit license\|mit licensed\|\"mit\"" "$PROJECT_ROOT/premium/README.md"
    [ "$status" -ne 0 ]
}

# ============================================================================
# BOUNDARY TESTS — Edge cases, limits, unusual but valid inputs
# ============================================================================

# --- AC-OSS-3.1 boundary ---

@test "AC-OSS-3.1 BOUNDARY: LICENSE contains the word 'MIT' exactly (case-sensitive)" {
    [ -f "$PROJECT_ROOT/LICENSE" ]
    run grep -c "^MIT License$" "$PROJECT_ROOT/LICENSE"
    [ "$status" -eq 0 ]
    [ "$output" -ge 1 ]
}

@test "AC-OSS-3.1 BOUNDARY: LICENSE contains both grant and warranty disclaimer sections" {
    [ -f "$PROJECT_ROOT/LICENSE" ]
    run grep -c "Permission is hereby granted" "$PROJECT_ROOT/LICENSE"
    [ "$status" -eq 0 ]
    [ "$output" -ge 1 ]
    run grep -c "THE SOFTWARE IS PROVIDED" "$PROJECT_ROOT/LICENSE"
    [ "$status" -eq 0 ]
    [ "$output" -ge 1 ]
}

# --- AC-OSS-3.2 boundary ---

@test "AC-OSS-3.2 BOUNDARY: build.sh tar command archives only the dist/miniature-guacamole/ subtree" {
    # The tar command should reference miniature-guacamole/ (relative inside dist/)
    # not the repo root, ensuring premium/ can't leak in via a broad glob
    run grep "tar.*-czf\|tar.*-cf" "$PROJECT_ROOT/build.sh"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "miniature-guacamole" ]]
    # Must NOT be tarballing from repo root (would capture premium/)
    [[ ! "$output" =~ "tar.*-czf.*miniature-guacamole.tar.gz \." ]]
}

@test "AC-OSS-3.2 BOUNDARY: build.sh FRAMEWORK_DIR points to src/framework, not repo root" {
    run grep "FRAMEWORK_DIR=" "$PROJECT_ROOT/build.sh"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "src/framework" ]]
    [[ ! "$output" =~ "FRAMEWORK_DIR=\"\$ROOT_DIR\"" ]]
}

# --- AC-OSS-3.3 boundary ---

@test "AC-OSS-3.3 BOUNDARY: no other files in tests/bench/ if directory still exists" {
    if [ -d "$PROJECT_ROOT/tests/bench" ]; then
        local file_count
        file_count=$(find "$PROJECT_ROOT/tests/bench" -maxdepth 1 -type f | wc -l | tr -d ' ')
        # An empty directory is still stale — the test is designed to fail RED
        # until the directory is removed. File count 0 + dir exists = still stale.
        [ "$file_count" -eq 0 ]
        # Fail: directory should not exist even if empty
        false
    fi
}

@test "AC-OSS-3.3 BOUNDARY: no greeting-page test files anywhere in tests/" {
    run find "$PROJECT_ROOT/tests" -name "greeting-page*" -type f
    [ "$status" -eq 0 ]
    [ -z "$output" ]
}

# --- AC-OSS-3.4 boundary ---

@test "AC-OSS-3.4 BOUNDARY: .gitignore node_modules entry covers top-level (not just nested)" {
    run grep -n "^node_modules/" "$PROJECT_ROOT/.gitignore"
    [ "$status" -eq 0 ]
}

@test "AC-OSS-3.4 BOUNDARY: .gitignore dist/ entry covers the dist directory" {
    run grep -n "^dist/" "$PROJECT_ROOT/.gitignore"
    [ "$status" -eq 0 ]
}

@test "AC-OSS-3.4 BOUNDARY: .gitignore .env entry is present and not commented out" {
    run grep -n "^\.env$" "$PROJECT_ROOT/.gitignore"
    [ "$status" -eq 0 ]
}

@test "AC-OSS-3.4 BOUNDARY: .gitignore coverage entry covers coverage/ output directory" {
    run grep -n "^coverage/" "$PROJECT_ROOT/.gitignore"
    [ "$status" -eq 0 ]
}

# --- AC-OSS-3.5 boundary ---

@test "AC-OSS-3.5 BOUNDARY: sk-test-key placeholder in test files is acceptable (short, clearly fake)" {
    cd "$PROJECT_ROOT"
    # sk-test-key is 11 chars after sk- — well under the 32-char real-key threshold
    run bash -c "git grep -c 'sk-test-key' -- ."
    # We don't fail on this — just confirm it exists as an expected test stub
    # This test documents the intended allowance
    [ "$status" -eq 0 ]
}

@test "AC-OSS-3.5 BOUNDARY: ghp_ test fixtures (sequential alphabetic, YOUR_ placeholders) are acceptable" {
    cd "$PROJECT_ROOT"
    # ghp_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890 is a clearly synthetic sequential fixture
    # ghp_YOUR_GITHUB_TOKEN is a template placeholder
    # Neither looks like a real randomly-generated PAT
    run bash -c "git grep -n 'ghp_YOUR_GITHUB_TOKEN\|ghp_AbCdEfGhIjKlMnOpQrStUvWxYz' -- ."
    [ "$status" -eq 0 ]
    # Confirm at least one known safe fixture is present — this documents the allowance
    [[ "$output" =~ "ghp_" ]]
}

# --- AC-OSS-3.6 boundary ---

@test "AC-OSS-3.6 BOUNDARY: package.json license field is a string (not an object)" {
    run node -e "const p = require('./package.json'); process.exit(typeof p.license === 'string' ? 0 : 1)"
    [ "$status" -eq 0 ]
}

# --- AC-OSS-3.7 boundary ---

@test "AC-OSS-3.7 BOUNDARY: premium/README.md has a License section heading" {
    [ -f "$PROJECT_ROOT/premium/README.md" ]
    run grep -i "^## License\|^# License\|^### License" "$PROJECT_ROOT/premium/README.md"
    [ "$status" -eq 0 ]
}

# ============================================================================
# GOLDEN PATH — Full acceptance criteria verification
# ============================================================================

# --- AC-OSS-3.1 golden ---

@test "AC-OSS-3.1 GOLDEN: LICENSE exists and contains standard MIT license header and body" {
    [ -f "$PROJECT_ROOT/LICENSE" ]
    run grep "^MIT License$" "$PROJECT_ROOT/LICENSE"
    [ "$status" -eq 0 ]
    run grep "Permission is hereby granted, free of charge" "$PROJECT_ROOT/LICENSE"
    [ "$status" -eq 0 ]
    run grep "THE SOFTWARE IS PROVIDED \"AS IS\"" "$PROJECT_ROOT/LICENSE"
    [ "$status" -eq 0 ]
}

# --- AC-OSS-3.2 golden ---

@test "AC-OSS-3.2 GOLDEN: build.sh excludes premium/ — only src/framework and src/installer feed the tarball" {
    # Verify the build pipeline sources
    run grep "FRAMEWORK_DIR=" "$PROJECT_ROOT/build.sh"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "src/framework" ]]

    run grep "INSTALLER_DIR=" "$PROJECT_ROOT/build.sh"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "src/installer" ]]

    # Confirm premium/ is never mentioned as a copy source
    run grep "cp.*premium\|premium.*cp" "$PROJECT_ROOT/build.sh"
    [ "$status" -ne 0 ]
}

@test "AC-OSS-3.2 GOLDEN: build.sh tar command scoped to dist subdirectory (no accidental root tarball)" {
    # The tar must run from dist/ and archive miniature-guacamole/ — not from root
    run grep -A2 "cd.*dist" "$PROJECT_ROOT/build.sh"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "miniature-guacamole" ]]
}

# --- AC-OSS-3.3 golden ---

@test "AC-OSS-3.3 GOLDEN: src/bench/greeting.html is removed" {
    [ ! -f "$PROJECT_ROOT/src/bench/greeting.html" ]
}

@test "AC-OSS-3.3 GOLDEN: tests/bench/ directory is removed" {
    [ ! -d "$PROJECT_ROOT/tests/bench" ]
}

# --- AC-OSS-3.4 golden ---

@test "AC-OSS-3.4 GOLDEN: .gitignore covers all required patterns" {
    [ -f "$PROJECT_ROOT/.gitignore" ]

    run grep "^node_modules/" "$PROJECT_ROOT/.gitignore"
    [ "$status" -eq 0 ]

    run grep "^dist/" "$PROJECT_ROOT/.gitignore"
    [ "$status" -eq 0 ]

    run grep "^\.env$" "$PROJECT_ROOT/.gitignore"
    [ "$status" -eq 0 ]

    run grep "^coverage/" "$PROJECT_ROOT/.gitignore"
    [ "$status" -eq 0 ]

    run grep "\*\.tar\.gz" "$PROJECT_ROOT/.gitignore"
    [ "$status" -eq 0 ]
}

# --- AC-OSS-3.5 golden ---

@test "AC-OSS-3.5 GOLDEN: no real credential patterns in git-tracked files" {
    cd "$PROJECT_ROOT"

    # AWS Access Key IDs (AKIA + exactly 16 uppercase alphanum)
    run bash -c "git grep -n 'AKIA[A-Z0-9]\{16\}' -- . | grep -v '/AKIA\[' | grep -v 'AKIAIOSFODNN7EXAMPLE'"
    [ "$status" -ne 0 ]

    # Real OpenAI/Anthropic keys (sk- + 32 or more chars)
    run bash -c "git grep -n 'sk-[a-zA-Z0-9]\{32,\}' -- ."
    [ "$status" -ne 0 ]

    # Real GitHub PATs (ghp_ + 36 or more chars, excluding known alphabetic test fixtures)
    run bash -c "git grep -n 'ghp_[a-zA-Z0-9]\{36,\}' -- . \
        | grep -v 'AbCdEfGhIjKlMnOpQrStUvWxYz' \
        | grep -v 'YOUR_GITHUB_TOKEN' \
        | grep -v 'placeholder\|example\|fake\|dummy'"
    [ "$status" -ne 0 ]
}

# --- AC-OSS-3.6 golden ---

@test "AC-OSS-3.6 GOLDEN: package.json license field is exactly \"MIT\"" {
    [ -f "$PROJECT_ROOT/package.json" ]
    run node -e "
const p = require('$PROJECT_ROOT/package.json');
if (p.license !== 'MIT') { console.error('license is: ' + p.license); process.exit(1); }
"
    [ "$status" -eq 0 ]
}

# --- AC-OSS-3.7 golden ---

@test "AC-OSS-3.7 GOLDEN: premium/README.md exists and mentions proprietary license" {
    [ -f "$PROJECT_ROOT/premium/README.md" ]
    run grep -i "proprietary\|not for distribution\|premium distribution only" "$PROJECT_ROOT/premium/README.md"
    [ "$status" -eq 0 ]
}

@test "AC-OSS-3.7 GOLDEN: premium/README.md License section explicitly states PROPRIETARY" {
    [ -f "$PROJECT_ROOT/premium/README.md" ]
    run grep "PROPRIETARY" "$PROJECT_ROOT/premium/README.md"
    [ "$status" -eq 0 ]
}
