#!/usr/bin/env bash
# ============================================================================
# P0-6: Hardcoded Paths Audit
# ============================================================================
# Test: Audit all 9 mg-* scripts for hardcoded $HOME/.claude/scripts/ paths
# Expected: Complete list of scripts needing fixes
# Exit 0 = audit complete, Exit 1 = error
# ============================================================================

set -euo pipefail

echo "============================================================================"
echo "P0-6: Hardcoded Paths Audit"
echo "============================================================================"
echo ""

# Find mg-* scripts (check both global and project-local)
SCRIPT_DIRS=(
    "$HOME/.claude/scripts"
    ".claude/scripts"
)

SCRIPTS_FOUND=()
for dir in "${SCRIPT_DIRS[@]}"; do
    if [[ -d "$dir" ]]; then
        while IFS= read -r script; do
            if [[ -f "$script" && -x "$script" ]]; then
                SCRIPTS_FOUND+=("$script")
            fi
        done < <(find "$dir" -maxdepth 1 -name "mg-*" -type f 2>/dev/null || true)
    fi
done

if [[ ${#SCRIPTS_FOUND[@]} -eq 0 ]]; then
    echo "ERROR: No mg-* scripts found"
    exit 1
fi

echo "Found ${#SCRIPTS_FOUND[@]} mg-* scripts to audit"
echo ""

# Audit results
ISSUES_FOUND=0
CALLER_ISSUES=0
SELF_REF_ISSUES=0

echo "Searching for hardcoded paths: \$HOME/.claude/scripts/"
echo "----------------------------------------------------------------------------"
echo ""

for script in "${SCRIPTS_FOUND[@]}"; do
    script_name=$(basename "$script")

    # Search for $HOME/.claude/scripts/ patterns
    if grep -n '\$HOME/\.claude/scripts/' "$script" >/dev/null 2>&1; then
        echo "[$script_name]"

        while IFS=: read -r line_num line_content; do
            ISSUES_FOUND=$((ISSUES_FOUND + 1))

            # Classify as CALLER or SELF-REF
            if echo "$line_content" | grep -q "mg-"; then
                # Calls another mg-* script
                CALLER_ISSUES=$((CALLER_ISSUES + 1))
                issue_type="CALLER"
                recommended_fix="Use: \$(dirname \"\$0\")/mg-script-name"
            else
                # References own directory
                SELF_REF_ISSUES=$((SELF_REF_ISSUES + 1))
                issue_type="SELF-REF"
                recommended_fix="Use: \$(dirname \"\$0\")"
            fi

            echo "  Line $line_num: [$issue_type]"
            echo "    Current: $(echo "$line_content" | sed 's/^[[:space:]]*//')"
            echo "    Fix: $recommended_fix"
            echo ""
        done < <(grep -n '\$HOME/\.claude/scripts/' "$script")
    fi
done

echo "============================================================================"
echo "Audit Summary"
echo "============================================================================"
echo ""
echo "Total hardcoded paths found: $ISSUES_FOUND"
echo "  - CALLER issues (calls other scripts): $CALLER_ISSUES"
echo "  - SELF-REF issues (references own dir): $SELF_REF_ISSUES"
echo ""

if [[ $ISSUES_FOUND -eq 0 ]]; then
    echo "Result: [PASS] No hardcoded paths found"
    echo ""
    echo "All scripts use relative paths correctly."
    exit 0
else
    echo "Result: [AUDIT COMPLETE] Found $ISSUES_FOUND issues"
    echo ""
    echo "Recommended Actions:"
    echo "  1. Apply fixes to $CALLER_ISSUES CALLER scripts"
    echo "  2. Apply fixes to $SELF_REF_ISSUES SELF-REF scripts"
    echo "  3. Re-run P0-2 and P0-3 tests to verify fixes"
    echo ""
    echo "Fix Pattern Examples:"
    echo "  CALLER:   MG_WRITE=\"\$(dirname \"\$0\")/mg-memory-write\""
    echo "  SELF-REF: SCRIPTS_DIR=\"\$(dirname \"\$0\")\""
    exit 0
fi
