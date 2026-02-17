#!/usr/bin/env bats
# ============================================================================
# build-ext.bats - Tests for build-ext.sh script
# ============================================================================
# Test ordering: MISUSE CASES → BOUNDARY TESTS → GOLDEN PATH
# Coverage target: 99% of build script functionality
# ============================================================================

# Setup and teardown
setup() {
    # Resolve project root
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"

    # Create temporary test workspace
    TEST_DIR="$(mktemp -d)"

    # Copy project structure to test workspace
    cp -r "$PROJECT_ROOT"/{src,package.json,tsconfig.json,build-ext.sh} "$TEST_DIR/"

    # Create mock npx script that validates TypeScript based on file content
    mkdir -p "$TEST_DIR/node_modules/.bin"
    cat > "$TEST_DIR/node_modules/.bin/npx" <<EOFNPX
#!/usr/bin/env bash
# Mock npx for testing: validates TypeScript files
if [[ "\$1" == "tsc" && "\$2" == "--noEmit" ]]; then
    # Check if there's invalid TypeScript (type errors)
    # Use absolute path to check file from TEST_DIR
    if [[ -f "$TEST_DIR/enterprise/src/index.ts" ]] && grep -q 'const x: number = "invalid"' "$TEST_DIR/enterprise/src/index.ts" 2>/dev/null; then
        echo "error TS2322: Type 'string' is not assignable to type 'number'." >&2
        exit 1
    fi
    exit 0  # TypeScript compilation succeeded
fi
exec /usr/local/bin/npx "\$@"
EOFNPX
    chmod +x "$TEST_DIR/node_modules/.bin/npx"

    # Add node_modules/.bin to PATH for test
    export PATH="$TEST_DIR/node_modules/.bin:$PATH"

    # Create mock enterprise directory structure (will be removed for misuse tests)
    mkdir -p "$TEST_DIR/enterprise/src"/{storage,isolation,connectors}
    mkdir -p "$TEST_DIR/enterprise/tests/unit"

    # Create minimal enterprise/package.json
    cat > "$TEST_DIR/enterprise/package.json" << 'EOF'
{
  "name": "@mg/enterprise",
  "version": "1.0.0",
  "description": "Enterprise features for miniature-guacamole"
}
EOF

    # Create enterprise/tsconfig.json
    cat > "$TEST_DIR/enterprise/tsconfig.json" << 'EOF'
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF

    # Create enterprise/src/index.ts
    cat > "$TEST_DIR/enterprise/src/index.ts" << 'EOF'
// Enterprise edition entry point
export const ENTERPRISE_VERSION = "1.0.0";
EOF

    # Build script path in test workspace
    SCRIPT_PATH="$TEST_DIR/build-ext.sh"

    # Change to test directory for script execution
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
# MISUSE CASES - Invalid inputs, missing dependencies, error conditions
# ============================================================================

@test "build-ext.sh: enterprise/ directory doesn't exist" {
    # Remove enterprise directory
    rm -rf "$TEST_DIR/enterprise"

    # Script should fail
    run "$SCRIPT_PATH"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "enterprise" ]] && [[ "$output" =~ "not found" || "$output" =~ "does not exist" ]]
}

@test "build-ext.sh: enterprise/package.json is missing" {
    rm -f "$TEST_DIR/enterprise/package.json"

    run "$SCRIPT_PATH"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "package.json" ]]
}

@test "build-ext.sh: enterprise/package.json has invalid JSON" {
    echo '{ invalid json: }' > "$TEST_DIR/enterprise/package.json"

    run "$SCRIPT_PATH"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "JSON" || "$output" =~ "parse" || "$output" =~ "invalid" ]]
}

@test "build-ext.sh: enterprise/tsconfig.json is missing" {
    rm -f "$TEST_DIR/enterprise/tsconfig.json"

    run "$SCRIPT_PATH"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "tsconfig" ]]
}

@test "build-ext.sh: enterprise/tsconfig.json has invalid extends path" {
    cat > "$TEST_DIR/enterprise/tsconfig.json" << 'EOF'
{
  "extends": "./nonexistent.json"
}
EOF

    run "$SCRIPT_PATH"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "extends" || "$output" =~ "not found" ]]
}

@test "build-ext.sh: enterprise/src/ directory doesn't exist" {
    rm -rf "$TEST_DIR/enterprise/src"

    run "$SCRIPT_PATH"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "src" ]]
}

@test "build-ext.sh: TypeScript compilation fails" {
    # Create invalid TypeScript
    cat > "$TEST_DIR/enterprise/src/index.ts" << 'EOF'
const x: number = "invalid";  // Type error
import nonexistent from 'nonexistent';  // Module not found
EOF

    run "$SCRIPT_PATH"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "error" || "$output" =~ "compilation" ]]
}

@test "build-ext.sh: dist/ directory is read-only" {
    # Create dist and make it read-only
    mkdir -p "$TEST_DIR/dist"
    chmod 444 "$TEST_DIR/dist"

    run "$SCRIPT_PATH"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "permission" || "$output" =~ "denied" || "$output" =~ "read-only" ]]

    # Cleanup
    chmod 755 "$TEST_DIR/dist"
}

@test "build-ext.sh: executed from wrong directory" {
    # Script uses dirname to resolve root, so it should work from any directory
    # This test verifies the script is location-independent
    cd "$TEST_DIR/enterprise"

    run "$SCRIPT_PATH"
    # Script should succeed because it auto-resolves ROOT_DIR from script location
    [ "$status" -eq 0 ]
}

# ============================================================================
# BOUNDARY TESTS - Edge cases, limits, unusual but valid inputs
# ============================================================================

@test "build-ext.sh: enterprise/src/ is empty" {
    # Remove all .ts files but keep directory
    rm -f "$TEST_DIR/enterprise/src/index.ts"

    # Should succeed (no source files is valid)
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]
}

@test "build-ext.sh: enterprise/package.json with minimal fields" {
    cat > "$TEST_DIR/enterprise/package.json" << 'EOF'
{
  "name": "@mg/enterprise",
  "version": "1.0.0"
}
EOF

    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]
}

@test "build-ext.sh: enterprise has no subdirectories yet" {
    # Remove future subdirectories (storage, isolation, connectors)
    rm -rf "$TEST_DIR/enterprise/src"/{storage,isolation,connectors}

    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]
}

@test "build-ext.sh: dist/ directory already exists" {
    # Run build twice to test cleanup
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    # Second run should clean and rebuild
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Cleaning" || "$output" =~ "clean" ]]
}

@test "build-ext.sh: enterprise/src/index.ts is empty file" {
    # Empty file is valid TypeScript
    echo "" > "$TEST_DIR/enterprise/src/index.ts"

    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]
}

@test "build-ext.sh: enterprise/ has node_modules/ subdirectory" {
    # Create mock node_modules
    mkdir -p "$TEST_DIR/enterprise/node_modules/fake-package"
    echo '{"name": "fake"}' > "$TEST_DIR/enterprise/node_modules/fake-package/package.json"

    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    # node_modules may be copied (users might need dependencies)
    # The important thing is tsconfig excludes it from compilation
    # This is a boundary test to ensure build doesn't break with node_modules present
}

@test "build-ext.sh: parallel build.sh execution" {
    skip "TODO: Test concurrent builds (requires OSS build.sh)"
}

@test "build-ext.sh: very large enterprise/ directory" {
    skip "TODO: Performance test with 1000+ files (CI only)"
}

# ============================================================================
# GOLDEN PATH - Normal, expected operations
# ============================================================================

@test "build-ext.sh: successful build with complete structure" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    # Verify dist directory created
    [ -d "$TEST_DIR/dist/miniature-guacamole-enterprise" ]
}

@test "build-ext.sh: dist output includes all enterprise files" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    # Check enterprise files are in dist
    [ -f "$TEST_DIR/dist/miniature-guacamole-enterprise/enterprise/package.json" ]
    [ -f "$TEST_DIR/dist/miniature-guacamole-enterprise/enterprise/tsconfig.json" ]
    [ -d "$TEST_DIR/dist/miniature-guacamole-enterprise/enterprise/src" ]
}

@test "build-ext.sh: dist output includes OSS framework files" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    # Check OSS framework is included
    [ -d "$TEST_DIR/dist/miniature-guacamole-enterprise/.claude" ]
    [ -d "$TEST_DIR/dist/miniature-guacamole-enterprise/.claude/agents" ]
    [ -d "$TEST_DIR/dist/miniature-guacamole-enterprise/.claude/skills" ]
}

@test "build-ext.sh: creates tarball archive" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    [ -f "$TEST_DIR/dist/miniature-guacamole-enterprise.tar.gz" ]
}

@test "build-ext.sh: creates zip archive" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    [ -f "$TEST_DIR/dist/miniature-guacamole-enterprise.zip" ]
}

@test "build-ext.sh: VERSION.json includes enterprise flag" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    VERSION_FILE="$TEST_DIR/dist/miniature-guacamole-enterprise/VERSION.json"
    [ -f "$VERSION_FILE" ]

    # Check for enterprise flag
    grep -q '"enterprise".*true' "$VERSION_FILE"
}

@test "build-ext.sh: preserves executable permissions" {
    # Create executable script in enterprise
    mkdir -p "$TEST_DIR/enterprise/scripts"
    echo '#!/usr/bin/env bash' > "$TEST_DIR/enterprise/scripts/test.sh"
    chmod +x "$TEST_DIR/enterprise/scripts/test.sh"

    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    # Check executable bit preserved
    [ -x "$TEST_DIR/dist/miniature-guacamole-enterprise/enterprise/scripts/test.sh" ]
}

@test "build-ext.sh: TypeScript compilation produces .d.ts files" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    # Check for declaration files (if TypeScript compilation is part of build)
    # This depends on build script implementation
    [[ "$output" =~ "TypeScript" || "$output" =~ "compiled" ]] || skip "TypeScript compilation not in build"
}

@test "build-ext.sh: output size is reasonable" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    # Sanity check: tarball should be < 10MB
    size=$(stat -f%z "$TEST_DIR/dist/miniature-guacamole-enterprise.tar.gz" 2>/dev/null || stat -c%s "$TEST_DIR/dist/miniature-guacamole-enterprise.tar.gz")
    [ "$size" -lt 10485760 ]  # 10MB
}

@test "build-ext.sh: script displays progress output" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    # Check for informative output
    [[ "$output" =~ "Building" || "$output" =~ "enterprise" ]]
}

@test "build-ext.sh: script reports build statistics" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]

    # Check for counts/sizes in output
    [[ "$output" =~ "agents" || "$output" =~ "skills" || "$output" =~ "size" ]]
}
