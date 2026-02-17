#!/usr/bin/env bats
# ============================================================================
# build-oss-isolation.bats - Tests for build.sh OSS isolation from enterprise/
# ============================================================================
# Test ordering: MISUSE CASES → BOUNDARY TESTS → GOLDEN PATH
# Coverage target: 99% of OSS build isolation
# ============================================================================

# Setup and teardown
setup() {
    # Resolve project root
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"

    # Create temporary test workspace
    TEST_DIR="$(mktemp -d)"

    # Copy project structure to test workspace
    cp -r "$PROJECT_ROOT"/{src,package.json,tsconfig.json,build.sh} "$TEST_DIR/"

    # Create enterprise directory (to test isolation)
    mkdir -p "$TEST_DIR/enterprise/src"/{storage,isolation,connectors}

    # Create enterprise files
    cat > "$TEST_DIR/enterprise/package.json" << 'EOF'
{
  "name": "@mg/enterprise",
  "version": "1.0.0"
}
EOF

    cat > "$TEST_DIR/enterprise/tsconfig.json" << 'EOF'
{
  "extends": "../tsconfig.json"
}
EOF

    cat > "$TEST_DIR/enterprise/src/index.ts" << 'EOF'
// Enterprise code that should NOT be in OSS build
export const ENTERPRISE_ONLY = "This should not appear in OSS";
EOF

    # OSS build script path
    SCRIPT_PATH="$TEST_DIR/build.sh"

    # Change to test directory
    cd "$TEST_DIR"
}

teardown() {
    # Clean up test directory
    if [[ -n "$TEST_DIR" && -d "$TEST_DIR" ]]; then
        chmod -R +w "$TEST_DIR" 2>/dev/null || true
        rm -rf "$TEST_DIR"
    fi
}

# ============================================================================
# MISUSE CASES - Verify enterprise/ is NEVER included
# ============================================================================

@test "build.sh: does NOT include enterprise/ files in output" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    # Verify enterprise directory does NOT exist in dist
    [ ! -d "$TEST_DIR/dist/miniature-guacamole/enterprise" ]
}

@test "build.sh: does NOT include enterprise/ in archives" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    # Extract tarball and verify no enterprise/
    mkdir -p "$TEST_DIR/extracted"
    cd "$TEST_DIR/extracted"
    tar -xzf "$TEST_DIR/dist/miniature-guacamole.tar.gz"

    [ ! -d "$TEST_DIR/extracted/miniature-guacamole/enterprise" ]
}

@test "build.sh: no references to 'enterprise/' in dist files" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    # Grep for 'enterprise' string in dist (excluding node_modules, hidden files)
    cd "$TEST_DIR/dist/miniature-guacamole"

    # This should return no matches (exit 1 from grep)
    run grep -r "enterprise/" . --exclude-dir=node_modules 2>/dev/null || true

    # If grep found matches, it would exit 0
    # We want NO matches, so we check output is empty or grep failed
    [ -z "$output" ] || [[ ! "$output" =~ "enterprise/" ]]
}

@test "build.sh: no conflicts when enterprise/ has conflicting file names" {
    # Create potentially conflicting file
    mkdir -p "$TEST_DIR/enterprise/.claude"
    echo "ENTERPRISE VERSION" > "$TEST_DIR/enterprise/.claude/CLAUDE.md"

    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    # Verify OSS .claude/CLAUDE.md is not overwritten
    [ -f "$TEST_DIR/dist/miniature-guacamole/.claude/CLAUDE.md" ]

    # Verify it does NOT contain "ENTERPRISE VERSION"
    ! grep -q "ENTERPRISE VERSION" "$TEST_DIR/dist/miniature-guacamole/.claude/CLAUDE.md"
}

# ============================================================================
# BOUNDARY TESTS - Edge cases with enterprise/ present
# ============================================================================

@test "build.sh: enterprise/ directory exists but is empty" {
    # Remove all enterprise content
    rm -rf "$TEST_DIR/enterprise"/*

    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    # Verify no enterprise/ in dist
    [ ! -d "$TEST_DIR/dist/miniature-guacamole/enterprise" ]
}

@test "build.sh: enterprise/ has large files (OSS archive unaffected)" {
    # Create large file in enterprise (10MB)
    dd if=/dev/zero of="$TEST_DIR/enterprise/large-file.bin" bs=1048576 count=10 2>/dev/null

    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    # OSS archive should be normal size (< 2MB typical)
    size=$(stat -f%z "$TEST_DIR/dist/miniature-guacamole.tar.gz" 2>/dev/null || stat -c%s "$TEST_DIR/dist/miniature-guacamole.tar.gz")
    [ "$size" -lt 2097152 ]  # < 2MB (large-file should NOT be included)
}

# ============================================================================
# GOLDEN PATH - OSS build succeeds normally
# ============================================================================

@test "build.sh: OSS build succeeds when enterprise/ exists" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Build complete" || "$output" =~ "success" ]]
}

@test "build.sh: OSS dist does not contain enterprise/ directory" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    # Use find to search for any 'enterprise' directory
    cd "$TEST_DIR/dist/miniature-guacamole"
    result=$(find . -type d -name "enterprise" 2>/dev/null)

    [ -z "$result" ]
}

@test "build.sh: OSS archives do not contain enterprise/" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    # List archive contents
    tar -tzf "$TEST_DIR/dist/miniature-guacamole.tar.gz" > "$TEST_DIR/archive-contents.txt"

    # Verify no 'enterprise/' in archive
    ! grep -q "enterprise/" "$TEST_DIR/archive-contents.txt"
}

@test "build.sh: VERSION.json does not have enterprise flag" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    VERSION_FILE="$TEST_DIR/dist/miniature-guacamole/VERSION.json"
    [ -f "$VERSION_FILE" ]

    # Verify NO enterprise flag
    ! grep -q '"enterprise"' "$VERSION_FILE"
}
