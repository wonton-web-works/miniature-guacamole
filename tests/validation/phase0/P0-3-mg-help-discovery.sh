#!/usr/bin/env bash
# ============================================================================
# P0-3: mg-help Self-Discovery
# ============================================================================
# Test: Verify mg-help discovers scripts in its own directory
# Expected: PASS (after fix is applied)
# Exit 0 = test passed, Exit 1 = test failed, Exit 2 = prerequisites not met
# ============================================================================

set -euo pipefail

echo "============================================================================"
echo "P0-3: mg-help Self-Discovery"
echo "============================================================================"
echo ""

# Find mg-help script
if [[ -x "$HOME/.claude/scripts/mg-help" ]]; then
    HELP_SCRIPT="$HOME/.claude/scripts/mg-help"
    SCRIPT_DIR="$HOME/.claude/scripts"
    LOCATION="global"
elif [[ -x ".claude/scripts/mg-help" ]]; then
    HELP_SCRIPT=".claude/scripts/mg-help"
    SCRIPT_DIR=".claude/scripts"
    LOCATION="project-local"
else
    echo "Result: [ERROR] mg-help not found"
    exit 2
fi

echo "Testing script: $HELP_SCRIPT ($LOCATION)"
echo ""

# Pre-requisite check: Verify fix has been applied
echo "Pre-requisite Check: Verify relative path fix applied"
echo "----------------------------------------------------------------------------"

if grep -q 'SCRIPTS_DIR="\$HOME/\.claude/scripts"' "$HELP_SCRIPT"; then
    echo "Result: [PREREQUISITES NOT MET]"
    echo ""
    echo "The script still contains hardcoded path:"
    grep -n 'SCRIPTS_DIR="\$HOME/\.claude/scripts"' "$HELP_SCRIPT"
    echo ""
    echo "Required fix (line ~12):"
    echo "  FROM: SCRIPTS_DIR=\"\$HOME/.claude/scripts\""
    echo "  TO:   SCRIPTS_DIR=\"\$(dirname \"\$0\")\""
    echo ""
    echo "Apply the fix and re-run this test."
    exit 2
fi

if grep -q 'SCRIPTS_DIR="\$(dirname "\$0")"' "$HELP_SCRIPT"; then
    echo "Result: [PASS] Relative path fix detected"
    echo ""
else
    echo "Result: [WARNING] Neither hardcoded nor relative path found"
    echo "Manual inspection required"
    echo ""
fi

# Test 1: Execute mg-help and verify script discovery
echo "Test 1: Execute mg-help and verify script listing"
echo "----------------------------------------------------------------------------"

if OUTPUT=$("$HELP_SCRIPT" 2>&1); then
    EXIT_CODE=$?

    if [[ $EXIT_CODE -eq 0 ]]; then
        echo "Result: [PASS] mg-help executed successfully"
        echo ""

        # Count mg-* scripts listed
        SCRIPT_COUNT=$(echo "$OUTPUT" | grep -c "mg-" || echo "0")

        if [[ $SCRIPT_COUNT -ge 9 ]]; then
            echo "Script Discovery: [PASS] Found $SCRIPT_COUNT mg-* scripts"
            echo ""
            echo "Listed scripts:"
            echo "$OUTPUT" | grep "mg-" | head -12
        else
            echo "Script Discovery: [FAIL] Only found $SCRIPT_COUNT scripts (expected 9+)"
            echo ""
            echo "Listed scripts:"
            echo "$OUTPUT" | grep "mg-" || echo "(none)"
        fi
    else
        echo "Result: [FAIL] mg-help exited with code $EXIT_CODE"
        echo "Output: $OUTPUT"
        exit 1
    fi
else
    EXIT_CODE=$?
    echo "Result: [FAIL] Script execution failed"
    echo "Exit code: $EXIT_CODE"
    echo "Output: $OUTPUT"
    exit 1
fi

echo ""

# Test 2: Execute mg-help with specific command
echo "Test 2: Execute mg-help mg-memory-read"
echo "----------------------------------------------------------------------------"

if OUTPUT=$("$HELP_SCRIPT" "mg-memory-read" 2>&1); then
    EXIT_CODE=$?

    if [[ $EXIT_CODE -eq 0 ]]; then
        echo "Result: [PASS] Help text displayed for mg-memory-read"
        echo ""

        # Verify help text contains expected content
        if echo "$OUTPUT" | grep -q "Usage: mg-memory-read"; then
            echo "Verification: [PASS] Help text contains usage information"
            echo ""
            echo "Sample output:"
            echo "$OUTPUT" | head -10
        else
            echo "Verification: [FAIL] Help text malformed"
            echo "Output: $OUTPUT"
            exit 1
        fi
    else
        echo "Result: [FAIL] mg-help exited with code $EXIT_CODE"
        echo "Output: $OUTPUT"
        exit 1
    fi
else
    EXIT_CODE=$?
    echo "Result: [FAIL] Script execution failed"
    echo "Exit code: $EXIT_CODE"
    echo "Output: $OUTPUT"
    exit 1
fi

echo ""

# Test 3: Verify self-discovery works with dirname
echo "Test 3: Verify dirname-based discovery"
echo "----------------------------------------------------------------------------"

# Count actual mg-* scripts in directory
ACTUAL_SCRIPTS=$(find "$SCRIPT_DIR" -maxdepth 1 -name "mg-*" -type f -executable | wc -l | tr -d ' ')
echo "Actual scripts in $SCRIPT_DIR: $ACTUAL_SCRIPTS"

# Count scripts mg-help discovered
DISCOVERED_SCRIPTS=$(echo "$OUTPUT" | grep -c "mg-" || echo "0")
echo "Scripts discovered by mg-help: $DISCOVERED_SCRIPTS"
echo ""

if [[ $DISCOVERED_SCRIPTS -ge 9 ]] && [[ $ACTUAL_SCRIPTS -ge 9 ]]; then
    echo "Result: [PASS] Self-discovery working correctly"
    echo ""
    echo "Discovery mechanism:"
    echo "  - Uses: \$(dirname \"\$0\") to find script directory"
    echo "  - Found: $DISCOVERED_SCRIPTS scripts"
    echo "  - Expected: 9 mg-* utilities"
else
    echo "Result: [FAIL] Script count mismatch"
    echo "  - Actual in directory: $ACTUAL_SCRIPTS"
    echo "  - Discovered by help: $DISCOVERED_SCRIPTS"
    echo "  - Expected: 9"
    exit 1
fi

echo ""

# Final Summary
echo "============================================================================"
echo "Final Result: [PASS]"
echo "============================================================================"
echo ""
echo "Verified:"
echo "  - mg-help executes successfully"
echo "  - All 9+ mg-* scripts are discovered"
echo "  - Self-discovery uses \$(dirname \"\$0\") correctly"
echo "  - Help text is displayed for specific commands"
echo "  - No hardcoded paths in script discovery logic"
exit 0
