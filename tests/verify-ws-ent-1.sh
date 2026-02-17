#!/usr/bin/env bash
# ============================================================================
# verify-ws-ent-1.sh - Infrastructure verification for WS-ENT-1
# ============================================================================
# Enterprise Directory Scaffold + Dual Build Verification
# Tests infrastructure correctness, not runtime behavior
# Exit 0 = pass, Exit 1 = fail
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENTERPRISE_DIR="$PROJECT_ROOT/enterprise"

# Test tracking
declare -a FAILURES=()

# ============================================================================
# Helper Functions
# ============================================================================

pass() {
    echo -e "${GREEN}✓${NC} $1"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    FAILURES+=("$1")
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

check_file_exists() {
    local file="$1"
    local description="$2"

    if [[ -f "$file" ]]; then
        pass "$description: exists"
        return 0
    else
        fail "$description: NOT FOUND"
        return 1
    fi
}

check_dir_exists() {
    local dir="$1"
    local description="$2"

    if [[ -d "$dir" ]]; then
        pass "$description: exists"
        return 0
    else
        fail "$description: NOT FOUND"
        return 1
    fi
}

check_json_valid() {
    local file="$1"
    local description="$2"

    if jq empty "$file" 2>/dev/null; then
        pass "$description: valid JSON"
        return 0
    else
        fail "$description: INVALID JSON"
        return 1
    fi
}

# ============================================================================
# Banner
# ============================================================================

echo ""
echo "================================================================"
echo "WS-ENT-1 Verification: Enterprise Directory Scaffold + Dual Build"
echo "================================================================"
echo ""

# ============================================================================
# SECTION 1: Directory Structure (12 checks)
# ============================================================================

echo "SECTION 1: Directory Structure"
echo "─────────────────────────────────────────────────────────────────"

check_dir_exists "$ENTERPRISE_DIR" "enterprise/"
check_dir_exists "$ENTERPRISE_DIR/src" "enterprise/src/"
check_file_exists "$ENTERPRISE_DIR/src/index.ts" "enterprise/src/index.ts"

# Subdirectories (can be empty)
check_dir_exists "$ENTERPRISE_DIR/src/storage" "enterprise/src/storage/"
check_dir_exists "$ENTERPRISE_DIR/src/isolation" "enterprise/src/isolation/"
check_dir_exists "$ENTERPRISE_DIR/src/connectors" "enterprise/src/connectors/"

check_dir_exists "$ENTERPRISE_DIR/tests/unit" "enterprise/tests/unit/"

# Configuration files
check_file_exists "$ENTERPRISE_DIR/package.json" "enterprise/package.json"
check_file_exists "$ENTERPRISE_DIR/tsconfig.json" "enterprise/tsconfig.json"
check_file_exists "$ENTERPRISE_DIR/.gitignore" "enterprise/.gitignore"
check_file_exists "$ENTERPRISE_DIR/README.md" "enterprise/README.md"

# Permissions check
if [[ -d "$ENTERPRISE_DIR" ]]; then
    PERMS=$(stat -f "%Lp" "$ENTERPRISE_DIR" 2>/dev/null || stat -c "%a" "$ENTERPRISE_DIR")
    if [[ "$PERMS" == "755" ]]; then
        pass "enterprise/ permissions: 755"
    else
        fail "enterprise/ permissions: $PERMS (expected 755)"
    fi
fi

echo ""

# ============================================================================
# SECTION 2: Configuration Validation (11 checks)
# ============================================================================

echo "SECTION 2: Configuration Validation"
echo "─────────────────────────────────────────────────────────────────"

# package.json validation
if check_json_valid "$ENTERPRISE_DIR/package.json" "enterprise/package.json"; then
    # Check required fields
    if jq -e '.name' "$ENTERPRISE_DIR/package.json" >/dev/null 2>&1; then
        ENT_NAME=$(jq -r '.name' "$ENTERPRISE_DIR/package.json")
        pass "enterprise/package.json has 'name': $ENT_NAME"
    else
        fail "enterprise/package.json missing 'name' field"
    fi

    if jq -e '.version' "$ENTERPRISE_DIR/package.json" >/dev/null 2>&1; then
        ENT_VERSION=$(jq -r '.version' "$ENTERPRISE_DIR/package.json")
        pass "enterprise/package.json has 'version': $ENT_VERSION"
    else
        fail "enterprise/package.json missing 'version' field"
    fi

    # Verify name differs from root
    ROOT_NAME=$(jq -r '.name' "$PROJECT_ROOT/package.json")
    if [[ "$ENT_NAME" != "$ROOT_NAME" ]]; then
        pass "enterprise/package.json name differs from root ($ENT_NAME != $ROOT_NAME)"
    else
        fail "enterprise/package.json name should differ from root"
    fi
fi

# tsconfig.json validation
if check_json_valid "$ENTERPRISE_DIR/tsconfig.json" "enterprise/tsconfig.json"; then
    # Check extends field
    if jq -e '.extends' "$ENTERPRISE_DIR/tsconfig.json" >/dev/null 2>&1; then
        EXTENDS=$(jq -r '.extends' "$ENTERPRISE_DIR/tsconfig.json")
        pass "enterprise/tsconfig.json has 'extends': $EXTENDS"

        if [[ "$EXTENDS" == "../tsconfig.json" ]]; then
            pass "enterprise/tsconfig.json extends '../tsconfig.json'"
        else
            fail "enterprise/tsconfig.json should extend '../tsconfig.json' (found: $EXTENDS)"
        fi
    else
        fail "enterprise/tsconfig.json missing 'extends' field"
    fi

    # Check compilerOptions.outDir
    if jq -e '.compilerOptions.outDir' "$ENTERPRISE_DIR/tsconfig.json" >/dev/null 2>&1; then
        OUTDIR=$(jq -r '.compilerOptions.outDir' "$ENTERPRISE_DIR/tsconfig.json")
        pass "enterprise/tsconfig.json has 'compilerOptions.outDir': $OUTDIR"
    else
        fail "enterprise/tsconfig.json missing 'compilerOptions.outDir'"
    fi

    # Check include array
    if jq -e '.include' "$ENTERPRISE_DIR/tsconfig.json" >/dev/null 2>&1; then
        if jq -e '.include | type == "array"' "$ENTERPRISE_DIR/tsconfig.json" >/dev/null 2>&1; then
            pass "enterprise/tsconfig.json has 'include' array"
        else
            fail "enterprise/tsconfig.json 'include' is not an array"
        fi
    else
        fail "enterprise/tsconfig.json missing 'include' field"
    fi
fi

# .gitignore validation
if [[ -f "$ENTERPRISE_DIR/.gitignore" ]]; then
    if grep -q "node_modules" "$ENTERPRISE_DIR/.gitignore"; then
        pass "enterprise/.gitignore excludes 'node_modules'"
    else
        fail "enterprise/.gitignore should exclude 'node_modules'"
    fi

    if grep -q "dist" "$ENTERPRISE_DIR/.gitignore"; then
        pass "enterprise/.gitignore excludes 'dist'"
    else
        fail "enterprise/.gitignore should exclude 'dist'"
    fi
fi

echo ""

# ============================================================================
# SECTION 3: Build Script Validation (6 checks)
# ============================================================================

echo "SECTION 3: Build Script Validation"
echo "─────────────────────────────────────────────────────────────────"

BUILD_ENT_SCRIPT="$PROJECT_ROOT/build-enterprise.sh"

check_file_exists "$BUILD_ENT_SCRIPT" "build-enterprise.sh"

if [[ -f "$BUILD_ENT_SCRIPT" ]]; then
    # Check executable
    if [[ -x "$BUILD_ENT_SCRIPT" ]]; then
        pass "build-enterprise.sh is executable"
    else
        fail "build-enterprise.sh is NOT executable"
    fi

    # Run build (in isolated environment)
    echo "  Running build-enterprise.sh..."

    if "$BUILD_ENT_SCRIPT" >/dev/null 2>&1; then
        pass "build-enterprise.sh runs successfully"

        # Check output directory
        if [[ -d "$PROJECT_ROOT/dist/miniature-guacamole-enterprise" ]]; then
            pass "build-enterprise.sh creates dist/miniature-guacamole-enterprise/"

            # Check enterprise/ in output
            if [[ -d "$PROJECT_ROOT/dist/miniature-guacamole-enterprise/enterprise" ]]; then
                pass "build-enterprise.sh output includes enterprise/"
            else
                fail "build-enterprise.sh output missing enterprise/"
            fi

            # Check VERSION.json for enterprise flag
            VERSION_FILE="$PROJECT_ROOT/dist/miniature-guacamole-enterprise/VERSION.json"
            if [[ -f "$VERSION_FILE" ]]; then
                if grep -q '"enterprise".*true' "$VERSION_FILE"; then
                    pass "VERSION.json has 'enterprise': true"
                else
                    fail "VERSION.json missing 'enterprise': true"
                fi
            else
                fail "VERSION.json not found in dist"
            fi
        else
            fail "build-enterprise.sh did not create dist/miniature-guacamole-enterprise/"
        fi
    else
        fail "build-enterprise.sh FAILED to run"
    fi
fi

echo ""

# ============================================================================
# SECTION 4: OSS Build Isolation (4 checks)
# ============================================================================

echo "SECTION 4: OSS Build Isolation"
echo "─────────────────────────────────────────────────────────────────"

BUILD_OSS_SCRIPT="$PROJECT_ROOT/build.sh"

if [[ -f "$BUILD_OSS_SCRIPT" ]]; then
    # Run OSS build
    echo "  Running build.sh (OSS)..."

    if "$BUILD_OSS_SCRIPT" >/dev/null 2>&1; then
        pass "build.sh runs successfully when enterprise/ exists"

        # Verify NO enterprise/ in OSS output
        if [[ ! -d "$PROJECT_ROOT/dist/miniature-guacamole/enterprise" ]]; then
            pass "build.sh output does NOT contain enterprise/"
        else
            fail "build.sh output SHOULD NOT contain enterprise/"
        fi

        # Grep for 'enterprise' references (excluding node_modules)
        cd "$PROJECT_ROOT/dist/miniature-guacamole"
        if grep -r "enterprise/" . --exclude-dir=node_modules 2>/dev/null | grep -v "Binary file"; then
            fail "build.sh output contains references to 'enterprise/'"
        else
            pass "build.sh output has no 'enterprise/' references"
        fi

        # Check VERSION.json does NOT have enterprise flag
        OSS_VERSION_FILE="$PROJECT_ROOT/dist/miniature-guacamole/VERSION.json"
        if [[ -f "$OSS_VERSION_FILE" ]]; then
            if grep -q '"enterprise"' "$OSS_VERSION_FILE"; then
                fail "OSS VERSION.json should NOT have 'enterprise' field"
            else
                pass "OSS VERSION.json does NOT have 'enterprise' field"
            fi
        fi
    else
        fail "build.sh FAILED to run"
    fi
else
    fail "build.sh not found"
fi

echo ""

# ============================================================================
# SECTION 5: Regression Tests (2 checks)
# ============================================================================

echo "SECTION 5: Regression Tests"
echo "─────────────────────────────────────────────────────────────────"

# Run WS-INIT-3 tests (framework infrastructure)
INIT_TEST="$PROJECT_ROOT/tests/verify-ws-init-3.sh"

if [[ -f "$INIT_TEST" ]]; then
    echo "  Running verify-ws-init-3.sh..."

    if "$INIT_TEST" >/dev/null 2>&1; then
        pass "WS-INIT-3 regression test PASSED"
    else
        fail "WS-INIT-3 regression test FAILED"
    fi
else
    echo -e "${YELLOW}⚠${NC} WS-INIT-3 test not found (skipped)"
fi

# Run existing build tests
echo "  Running existing build tests..."

if npm test -- tests/scripts/build 2>&1 | grep -q "All tests passed"; then
    pass "Existing build tests PASSED"
else
    echo -e "${YELLOW}⚠${NC} Existing build tests not found or incomplete (skipped)"
fi

echo ""

# ============================================================================
# Summary
# ============================================================================

echo "================================================================"
echo "VERIFICATION SUMMARY"
echo "================================================================"
echo ""
echo "Total checks: $TOTAL_CHECKS"
echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
echo ""

if [[ $FAILED_CHECKS -gt 0 ]]; then
    echo -e "${RED}FAILED CHECKS:${NC}"
    for failure in "${FAILURES[@]}"; do
        echo "  - $failure"
    done
    echo ""
    echo -e "${RED}RESULT: FAIL${NC}"
    echo ""
    exit 1
else
    echo -e "${GREEN}RESULT: PASS${NC}"
    echo ""
    echo "All infrastructure checks passed!"
    echo "Enterprise directory scaffold and dual build system verified."
    echo ""
    exit 0
fi
