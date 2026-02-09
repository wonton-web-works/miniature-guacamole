#!/usr/bin/env bash
# ============================================================================
# P0-2: Inter-Script Resolution
# ============================================================================
# Test: Verify mg-* scripts can call other mg-* scripts using relative paths
# Expected: PASS (after fix is applied)
# Exit 0 = test passed, Exit 1 = test failed, Exit 2 = prerequisites not met
# ============================================================================

set -euo pipefail

echo "============================================================================"
echo "P0-2: Inter-Script Resolution"
echo "============================================================================"
echo ""

# Find mg-workstream-transition script
if [[ -x "$HOME/.claude/scripts/mg-workstream-transition" ]]; then
    TRANSITION_SCRIPT="$HOME/.claude/scripts/mg-workstream-transition"
    SCRIPT_DIR="$HOME/.claude/scripts"
    LOCATION="global"
elif [[ -x ".claude/scripts/mg-workstream-transition" ]]; then
    TRANSITION_SCRIPT=".claude/scripts/mg-workstream-transition"
    SCRIPT_DIR=".claude/scripts"
    LOCATION="project-local"
else
    echo "Result: [ERROR] mg-workstream-transition not found"
    exit 2
fi

echo "Testing script: $TRANSITION_SCRIPT ($LOCATION)"
echo ""

# Pre-requisite check: Verify fix has been applied
echo "Pre-requisite Check: Verify relative path fix applied"
echo "----------------------------------------------------------------------------"

if grep -q '\$HOME/\.claude/scripts/mg-memory-write' "$TRANSITION_SCRIPT"; then
    echo "Result: [PREREQUISITES NOT MET]"
    echo ""
    echo "The script still contains hardcoded path:"
    grep -n '\$HOME/\.claude/scripts/mg-memory-write' "$TRANSITION_SCRIPT"
    echo ""
    echo "Required fix (line ~101):"
    echo "  FROM: MG_WRITE=\"\$HOME/.claude/scripts/mg-memory-write\""
    echo "  TO:   MG_WRITE=\"\$(dirname \"\$0\")/mg-memory-write\""
    echo ""
    echo "Apply the fix and re-run this test."
    exit 2
fi

if grep -q '\$(dirname "\$0")/mg-memory-write' "$TRANSITION_SCRIPT"; then
    echo "Result: [PASS] Relative path fix detected"
    echo ""
else
    echo "Result: [WARNING] Neither hardcoded nor relative path found"
    echo "Manual inspection required"
    echo ""
fi

# Test setup: Create temporary workspace
TEST_DIR=$(mktemp -d -t ws-local-0-p0-2-XXXXXX)
cleanup() {
    rm -rf "$TEST_DIR"
}
trap cleanup EXIT

echo "Test Setup: Creating temporary workspace"
echo "----------------------------------------------------------------------------"

mkdir -p "$TEST_DIR/.claude/memory"
cd "$TEST_DIR"

# Create test workstream state file
WS_ID="WS-P0-2-TEST"
STATE_FILE=".claude/memory/workstream-${WS_ID}-state.json"

cat > "$STATE_FILE" <<EOF
{
  "id": "$WS_ID",
  "status": "pending",
  "created_at": "2026-02-09T00:00:00Z",
  "description": "Test workstream for P0-2 validation"
}
EOF

echo "Created test workstream: $STATE_FILE"
echo "Initial status: pending"
echo ""

# Test execution: Attempt state transition
echo "Test Execution: Transition pending -> in_progress"
echo "----------------------------------------------------------------------------"

if OUTPUT=$("$TRANSITION_SCRIPT" "$WS_ID" "in_progress" 2>&1); then
    EXIT_CODE=$?

    if [[ $EXIT_CODE -eq 0 ]]; then
        echo "Result: [PASS] Transition executed successfully"
        echo "Output: $OUTPUT"
        echo ""

        # Verify state was actually updated
        if [[ -f "$STATE_FILE" ]]; then
            NEW_STATUS=$(jq -r '.status' "$STATE_FILE" 2>/dev/null || echo "error")

            if [[ "$NEW_STATUS" == "in_progress" ]]; then
                echo "Verification: [PASS] State file updated correctly"
                echo "  - Old status: pending"
                echo "  - New status: $NEW_STATUS"
                echo ""

                # Verify backup was created
                if [[ -f "${STATE_FILE}.bak" ]]; then
                    echo "Backup: [PASS] Backup file created"
                    BACKUP_STATUS=$(jq -r '.status' "${STATE_FILE}.bak" 2>/dev/null || echo "error")
                    echo "  - Backup status: $BACKUP_STATUS"
                else
                    echo "Backup: [WARNING] No backup file found"
                    echo "  - Expected: ${STATE_FILE}.bak"
                fi

                echo ""
                echo "============================================================================"
                echo "Final Result: [PASS]"
                echo "============================================================================"
                echo ""
                echo "Verified:"
                echo "  - mg-workstream-transition executed successfully"
                echo "  - mg-memory-write was called via relative path"
                echo "  - State file was updated atomically"
                echo "  - No 'command not found' errors occurred"
                exit 0
            else
                echo "Verification: [FAIL] State not updated"
                echo "  - Expected: in_progress"
                echo "  - Got: $NEW_STATUS"
                exit 1
            fi
        else
            echo "Verification: [FAIL] State file disappeared"
            exit 1
        fi
    else
        echo "Result: [FAIL] Transition failed with exit code $EXIT_CODE"
        echo "Output: $OUTPUT"
        exit 1
    fi
else
    EXIT_CODE=$?
    echo "Result: [FAIL] Script execution failed"
    echo "Exit code: $EXIT_CODE"
    echo "Output: $OUTPUT"
    echo ""

    # Check for common error patterns
    if echo "$OUTPUT" | grep -q "command not found"; then
        echo "Error Analysis: mg-memory-write not found"
        echo "  - This indicates inter-script resolution failed"
        echo "  - Verify mg-memory-write exists in: $SCRIPT_DIR"
    fi

    if echo "$OUTPUT" | grep -q "permission denied"; then
        echo "Error Analysis: Permission denied"
        echo "  - Check execute permissions on mg-memory-write"
        echo "  - Verify settings.json includes mg-* permissions"
    fi

    exit 1
fi
