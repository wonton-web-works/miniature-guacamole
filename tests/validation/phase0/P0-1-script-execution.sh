#!/usr/bin/env bash
# ============================================================================
# P0-1: Script Execution + Permission Pattern
# ============================================================================
# Test: Verify project-local mg-* scripts execute successfully
# Expected: PASS
# Exit 0 = test passed, Exit 1 = error
# ============================================================================

set -euo pipefail

echo "============================================================================"
echo "P0-1: Script Execution + Permission Pattern"
echo "============================================================================"
echo ""

PASSED=0
FAILED=0

# Test 1: Execute mg-memory-read --help from project root
echo "Test 1: Execute mg-memory-read --help"
echo "----------------------------------------------------------------------------"

# Try global location first (current state)
if [[ -x "$HOME/.claude/scripts/mg-memory-read" ]]; then
    SCRIPT_PATH="$HOME/.claude/scripts/mg-memory-read"
    echo "Using global script: $SCRIPT_PATH"
elif [[ -x ".claude/scripts/mg-memory-read" ]]; then
    SCRIPT_PATH=".claude/scripts/mg-memory-read"
    echo "Using project-local script: $SCRIPT_PATH"
else
    echo "Result: [FAIL] mg-memory-read not found"
    FAILED=$((FAILED + 1))
    SCRIPT_PATH=""
fi

if [[ -n "$SCRIPT_PATH" ]]; then
    # Execute and capture output
    if OUTPUT=$("$SCRIPT_PATH" --help 2>&1); then
        EXIT_CODE=$?

        if [[ $EXIT_CODE -eq 0 ]]; then
            # Verify help text contains expected content
            if echo "$OUTPUT" | grep -q "Usage: mg-memory-read"; then
                echo "Result: [PASS] Script executed, help text displayed"
                echo ""
                echo "Sample output:"
                echo "$OUTPUT" | head -5
                PASSED=$((PASSED + 1))
            else
                echo "Result: [FAIL] Script executed but help text malformed"
                FAILED=$((FAILED + 1))
            fi
        else
            echo "Result: [FAIL] Script exited with code $EXIT_CODE"
            FAILED=$((FAILED + 1))
        fi
    else
        echo "Result: [FAIL] Script execution failed"
        echo "Error: $OUTPUT"
        FAILED=$((FAILED + 1))
    fi
fi

echo ""

# Test 2: Verify permission pattern in settings.json
echo "Test 2: Verify Permission Pattern in settings.json"
echo "----------------------------------------------------------------------------"

SETTINGS_FILES=(
    ".claude/settings.json"
    ".claude/settings.local.json"
    "$HOME/.claude/settings.json"
)

PERMISSION_FOUND=false
for settings_file in "${SETTINGS_FILES[@]}"; do
    if [[ -f "$settings_file" ]]; then
        echo "Checking: $settings_file"

        # Check for mg-* permission patterns
        if grep -q 'Bash.*mg-' "$settings_file" 2>/dev/null; then
            echo "  - Found mg-* permission pattern"
            PERMISSION_FOUND=true

            # Show the pattern(s)
            grep 'Bash.*mg-' "$settings_file" | head -3 | while IFS= read -r pattern; do
                echo "    Pattern: $(echo "$pattern" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')"
            done
        fi
    fi
done

echo ""

if [[ "$PERMISSION_FOUND" == true ]]; then
    echo "Result: [PASS] Permission pattern exists"
    PASSED=$((PASSED + 1))
else
    echo "Result: [FAIL] No mg-* permission pattern found"
    echo "Expected patterns:"
    echo "  - Bash(~/.claude/scripts/mg-*)"
    echo "  - Bash(.claude/scripts/mg-*)"
    FAILED=$((FAILED + 1))
fi

echo ""

# Test 3: Execute mg-memory-read with actual file
echo "Test 3: Execute mg-memory-read with real memory file"
echo "----------------------------------------------------------------------------"

# Find a memory file to test with
MEMORY_FILE=""
if [[ -d ".claude/memory" ]]; then
    # Find first .json file
    MEMORY_FILE=$(find .claude/memory -maxdepth 1 -name "*.json" -type f | head -1)
fi

if [[ -z "$MEMORY_FILE" ]]; then
    # Create a test file
    mkdir -p .claude/memory
    MEMORY_FILE=".claude/memory/test-p0-1.json"
    echo '{"test": "P0-1 validation", "status": "testing"}' > "$MEMORY_FILE"
    echo "Created test file: $MEMORY_FILE"
fi

if [[ -n "$SCRIPT_PATH" && -f "$MEMORY_FILE" ]]; then
    echo "Testing with file: $MEMORY_FILE"

    if OUTPUT=$("$SCRIPT_PATH" "$MEMORY_FILE" 2>&1); then
        EXIT_CODE=$?

        if [[ $EXIT_CODE -eq 0 ]]; then
            # Verify JSON output
            if echo "$OUTPUT" | grep -q '"test"' || echo "$OUTPUT" | grep -q '{'; then
                echo "Result: [PASS] Successfully read and parsed JSON"
                echo ""
                echo "Sample output:"
                echo "$OUTPUT" | head -5
                PASSED=$((PASSED + 1))
            else
                echo "Result: [FAIL] Output doesn't look like JSON"
                FAILED=$((FAILED + 1))
            fi
        else
            echo "Result: [FAIL] Script exited with code $EXIT_CODE"
            echo "Error: $OUTPUT"
            FAILED=$((FAILED + 1))
        fi
    else
        echo "Result: [FAIL] Script execution failed"
        echo "Error: $OUTPUT"
        FAILED=$((FAILED + 1))
    fi

    # Clean up test file if we created it
    if [[ "$MEMORY_FILE" == ".claude/memory/test-p0-1.json" ]]; then
        rm -f "$MEMORY_FILE"
    fi
else
    echo "Result: [SKIP] No memory file available for testing"
fi

echo ""

# Final Summary
echo "============================================================================"
echo "Test Summary"
echo "============================================================================"
echo ""
echo "Tests passed: $PASSED"
echo "Tests failed: $FAILED"
echo ""

if [[ $FAILED -eq 0 ]]; then
    echo "Result: [PASS] All script execution tests passed"
    echo ""
    echo "Verified:"
    echo "  - mg-memory-read executes successfully"
    echo "  - Help text is displayed correctly"
    echo "  - Permission patterns exist in settings.json"
    echo "  - JSON files are read and parsed correctly"
    exit 0
else
    echo "Result: [FAIL] $FAILED test(s) failed"
    echo ""
    echo "Remediation Actions:"
    if [[ -z "$SCRIPT_PATH" ]]; then
        echo "  1. Verify mg-* scripts are installed"
    fi
    if [[ "$PERMISSION_FOUND" == false ]]; then
        echo "  2. Add Bash(.claude/scripts/mg-*) to settings.json"
    fi
    exit 1
fi
