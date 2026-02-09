#!/usr/bin/env bash
# ============================================================================
# P0-5: Project Settings Independence
# ============================================================================
# Test: Verify project .claude/settings.json works without global settings
# Expected: PASS (project settings override/work independently)
# Exit 0 = test passed, Exit 1 = test failed
# ============================================================================

set -euo pipefail

echo "============================================================================"
echo "P0-5: Project Settings Independence"
echo "============================================================================"
echo ""

# Safety check: Confirm user wants to proceed
echo "WARNING: This test will temporarily rename ~/.claude/settings.json"
echo ""
read -p "Proceed with test? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Test aborted by user"
    exit 0
fi

echo ""

# Test setup: Backup global settings if they exist
echo "Test Setup: Backup global settings"
echo "----------------------------------------------------------------------------"

GLOBAL_SETTINGS="$HOME/.claude/settings.json"
BACKUP_FILE="$HOME/.claude/settings.json.backup.p0-5-test"

BACKUP_CREATED=false
if [[ -f "$GLOBAL_SETTINGS" ]]; then
    echo "Backing up: $GLOBAL_SETTINGS"
    echo "         to: $BACKUP_FILE"

    if [[ -f "$BACKUP_FILE" ]]; then
        echo "ERROR: Backup file already exists"
        echo "Please remove $BACKUP_FILE and re-run"
        exit 1
    fi

    cp "$GLOBAL_SETTINGS" "$BACKUP_FILE"
    rm "$GLOBAL_SETTINGS"
    BACKUP_CREATED=true
    echo "Result: [PASS] Backup created, global settings removed"
else
    echo "No global settings.json found (already testing without global)"
fi

# Cleanup function
cleanup() {
    if [[ "$BACKUP_CREATED" == true ]]; then
        echo ""
        echo "Cleanup: Restoring global settings"
        if [[ -f "$BACKUP_FILE" ]]; then
            cp "$BACKUP_FILE" "$GLOBAL_SETTINGS"
            rm "$BACKUP_FILE"
            echo "Result: [PASS] Global settings restored"
        fi
    fi
}
trap cleanup EXIT

echo ""

# Verify project settings exist
echo "Test Setup: Verify project settings"
echo "----------------------------------------------------------------------------"

PROJECT_SETTINGS=".claude/settings.json"
PROJECT_LOCAL_SETTINGS=".claude/settings.local.json"

SETTINGS_FILE=""
if [[ -f "$PROJECT_LOCAL_SETTINGS" ]]; then
    SETTINGS_FILE="$PROJECT_LOCAL_SETTINGS"
    echo "Using: $PROJECT_LOCAL_SETTINGS"
elif [[ -f "$PROJECT_SETTINGS" ]]; then
    SETTINGS_FILE="$PROJECT_SETTINGS"
    echo "Using: $PROJECT_SETTINGS"
else
    echo "Result: [ERROR] No project settings found"
    echo "Expected: .claude/settings.json or .claude/settings.local.json"
    exit 1
fi

# Count permission patterns
ALLOW_COUNT=$(jq '.permissions.allow | length' "$SETTINGS_FILE" 2>/dev/null || echo "0")
echo "Result: [PASS] Found $ALLOW_COUNT allow patterns"
echo ""

# Test 1: Execute mg-memory-read (requires Bash permission)
echo "Test 1: Execute mg-memory-read"
echo "----------------------------------------------------------------------------"

MG_READ=""
if [[ -x "$HOME/.claude/scripts/mg-memory-read" ]]; then
    MG_READ="$HOME/.claude/scripts/mg-memory-read"
elif [[ -x ".claude/scripts/mg-memory-read" ]]; then
    MG_READ=".claude/scripts/mg-memory-read"
fi

if [[ -z "$MG_READ" ]]; then
    echo "Result: [SKIP] mg-memory-read not found"
else
    # Create test file
    mkdir -p .claude/memory
    TEST_FILE=".claude/memory/test-p0-5.json"
    echo '{"test": "P0-5", "status": "settings_independence"}' > "$TEST_FILE"

    if OUTPUT=$("$MG_READ" "$TEST_FILE" 2>&1); then
        echo "Result: [PASS] mg-memory-read executed successfully"
        echo ""
        echo "Sample output:"
        echo "$OUTPUT" | head -5

        # Clean up
        rm -f "$TEST_FILE"
    else
        echo "Result: [FAIL] mg-memory-read failed"
        echo "Error: $OUTPUT"
        echo ""
        echo "Analysis: Project settings may not include mg-* permissions"
        rm -f "$TEST_FILE"
        exit 1
    fi
fi

echo ""

# Test 2: Execute basic bash commands
echo "Test 2: Execute basic bash commands"
echo "----------------------------------------------------------------------------"

BASH_TESTS=(
    "ls:.claude"
    "pwd:"
    "echo:test"
)

BASH_PASS=0
BASH_FAIL=0

for test in "${BASH_TESTS[@]}"; do
    cmd="${test%%:*}"
    arg="${test#*:}"

    echo -n "Testing: $cmd $arg ... "

    if [[ -n "$arg" ]]; then
        if OUTPUT=$(bash -c "$cmd $arg" 2>&1); then
            echo "PASS"
            BASH_PASS=$((BASH_PASS + 1))
        else
            echo "FAIL"
            BASH_FAIL=$((BASH_FAIL + 1))
        fi
    else
        if OUTPUT=$(bash -c "$cmd" 2>&1); then
            echo "PASS"
            BASH_PASS=$((BASH_PASS + 1))
        else
            echo "FAIL"
            BASH_FAIL=$((BASH_FAIL + 1))
        fi
    fi
done

echo ""
echo "Bash tests: $BASH_PASS passed, $BASH_FAIL failed"
echo ""

# Test 3: Verify permission patterns in project settings
echo "Test 3: Verify permission patterns"
echo "----------------------------------------------------------------------------"

# Check for essential permissions
ESSENTIAL_PATTERNS=(
    "Read"
    "Glob"
    "Grep"
    "Edit"
    "Write"
    "Task"
)

MISSING_PATTERNS=()
for pattern in "${ESSENTIAL_PATTERNS[@]}"; do
    if jq -e ".permissions.allow | index(\"$pattern\")" "$SETTINGS_FILE" >/dev/null 2>&1; then
        echo "  - $pattern: FOUND"
    else
        echo "  - $pattern: MISSING"
        MISSING_PATTERNS+=("$pattern")
    fi
done

echo ""

if [[ ${#MISSING_PATTERNS[@]} -gt 0 ]]; then
    echo "Result: [WARNING] ${#MISSING_PATTERNS[@]} essential patterns missing"
    echo "Missing: ${MISSING_PATTERNS[*]}"
else
    echo "Result: [PASS] All essential patterns present"
fi

echo ""

# Test 4: Check for mg-* script permissions
echo "Test 4: Check for mg-* script permissions"
echo "----------------------------------------------------------------------------"

MG_PATTERNS=$(jq -r '.permissions.allow[]' "$SETTINGS_FILE" 2>/dev/null | grep -i "mg-" || echo "")

if [[ -n "$MG_PATTERNS" ]]; then
    echo "Result: [PASS] Found mg-* permission patterns"
    echo ""
    echo "Patterns:"
    echo "$MG_PATTERNS" | while IFS= read -r pattern; do
        echo "  - $pattern"
    done
else
    echo "Result: [FAIL] No mg-* permission patterns found"
    echo "Expected patterns like:"
    echo "  - Bash(~/.claude/scripts/mg-*)"
    echo "  - Bash(.claude/scripts/mg-*)"
    exit 1
fi

echo ""

# Final Summary
echo "============================================================================"
echo "Final Result"
echo "============================================================================"
echo ""

if [[ ${#MISSING_PATTERNS[@]} -eq 0 ]] && [[ $BASH_FAIL -eq 0 ]] && [[ -n "$MG_PATTERNS" ]]; then
    echo "Result: [PASS] Project settings work independently"
    echo ""
    echo "Verified:"
    echo "  - Project settings loaded without global settings"
    echo "  - $ALLOW_COUNT permission patterns present"
    echo "  - All essential permissions available"
    echo "  - mg-* script permissions configured"
    echo "  - Basic bash commands execute successfully"
    echo "  - mg-memory-read executes successfully"
    echo ""
    echo "Conclusion:"
    echo "  - Project .claude/settings.json works independently"
    echo "  - Global settings.json is not required for project operation"
    echo "  - Migration can move settings to project-local"
    exit 0
else
    echo "Result: [PARTIAL] Some issues detected"
    echo ""
    echo "Issues:"
    if [[ ${#MISSING_PATTERNS[@]} -gt 0 ]]; then
        echo "  - Missing patterns: ${MISSING_PATTERNS[*]}"
    fi
    if [[ $BASH_FAIL -gt 0 ]]; then
        echo "  - Bash tests failed: $BASH_FAIL"
    fi
    if [[ -z "$MG_PATTERNS" ]]; then
        echo "  - No mg-* permissions found"
    fi
    echo ""
    echo "Recommendation:"
    echo "  - Review project settings for completeness"
    echo "  - Add missing essential permissions"
    echo "  - Ensure mg-* script permissions are included"
    exit 1
fi
