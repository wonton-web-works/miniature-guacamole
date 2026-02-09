#!/usr/bin/env bash
# ============================================================================
# WS-LOCAL-0 Phase 0 Master Validation Script
# ============================================================================
# Executes all 6 Phase 0 validation tests
# Exit 0 = all critical tests pass, Exit 1 = one or more critical tests fail
# ============================================================================

set -euo pipefail

# Colors for output (if supported)
if [[ -t 1 ]]; then
    GREEN='\033[0;32m'
    RED='\033[0;31m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m' # No Color
else
    GREEN=''
    RED=''
    YELLOW=''
    BLUE=''
    NC=''
fi

echo "================================================================================"
echo "WS-LOCAL-0 Phase 0 Validation"
echo "================================================================================"
echo ""
echo "This master script executes 6 validation tests for project-local migration."
echo ""
echo "Test Execution Order:"
echo "  1. P0-6: Hardcoded Paths Audit (identifies all issues)"
echo "  2. P0-0: CLAUDE-MG.md Loading (expected fail)"
echo "  3. P0-1: Script Execution (critical)"
echo "  4. P0-2: Inter-Script Resolution (critical, requires fixes)"
echo "  5. P0-3: mg-help Self-Discovery (critical, requires fixes)"
echo "  6. P0-4: Agent Spawning (informational)"
echo "  7. P0-5: Settings Independence (critical)"
echo ""
echo "Critical tests must pass for Phase 0 validation to succeed."
echo "Informational tests provide guidance for migration decisions."
echo ""
read -p "Press Enter to begin validation..."
echo ""

# Test results
declare -A TEST_STATUS
declare -A TEST_CRITICAL

TEST_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$TEST_DIR/logs"
mkdir -p "$LOG_DIR"

# Test definitions
TESTS=(
    "P0-6:hardcoded-paths-audit:false:Hardcoded Paths Audit"
    "P0-0:claude-mg-loading:false:CLAUDE-MG.md Loading"
    "P0-1:script-execution:true:Script Execution"
    "P0-2:inter-script-resolution:true:Inter-Script Resolution"
    "P0-3:mg-help-discovery:true:mg-help Self-Discovery"
    "P0-4:agent-spawning:false:Agent Spawning"
    "P0-5:settings-independence:true:Settings Independence"
)

# Execute tests
for test in "${TESTS[@]}"; do
    IFS=: read -r test_id test_name is_critical test_desc <<< "$test"

    TEST_CRITICAL["$test_id"]="$is_critical"

    echo "================================================================================"
    echo "$test_id: $test_desc"
    echo "================================================================================"
    echo ""

    SCRIPT_PATH="$TEST_DIR/${test_id}-${test_name}.sh"
    LOG_FILE="$LOG_DIR/${test_id}.log"

    if [[ ! -f "$SCRIPT_PATH" ]]; then
        echo -e "${RED}ERROR: Test script not found: $SCRIPT_PATH${NC}"
        TEST_STATUS["$test_id"]="ERROR"
        continue
    fi

    # Execute test and capture output
    if "$SCRIPT_PATH" 2>&1 | tee "$LOG_FILE"; then
        EXIT_CODE=${PIPESTATUS[0]}

        if [[ $EXIT_CODE -eq 0 ]]; then
            TEST_STATUS["$test_id"]="PASS"
            echo ""
            echo -e "${GREEN}✓ $test_id: PASS${NC}"
        elif [[ $EXIT_CODE -eq 2 ]]; then
            TEST_STATUS["$test_id"]="PREREQ"
            echo ""
            echo -e "${YELLOW}⚠ $test_id: PREREQUISITES NOT MET${NC}"
        else
            TEST_STATUS["$test_id"]="FAIL"
            echo ""
            echo -e "${RED}✗ $test_id: FAIL${NC}"
        fi
    else
        EXIT_CODE=${PIPESTATUS[0]}
        TEST_STATUS["$test_id"]="ERROR"
        echo ""
        echo -e "${RED}✗ $test_id: ERROR (exit code: $EXIT_CODE)${NC}"
    fi

    echo ""
    echo "Log saved to: $LOG_FILE"
    echo ""
    echo "Press Enter to continue to next test..."
    read -r
    echo ""
done

# Generate summary report
echo "================================================================================"
echo "Validation Summary"
echo "================================================================================"
echo ""

# Count results
CRITICAL_PASS=0
CRITICAL_FAIL=0
CRITICAL_PREREQ=0
INFO_PASS=0
INFO_FAIL=0
INFO_PREREQ=0

for test_id in "${!TEST_STATUS[@]}"; do
    status="${TEST_STATUS[$test_id]}"
    is_critical="${TEST_CRITICAL[$test_id]}"

    if [[ "$is_critical" == "true" ]]; then
        case "$status" in
            PASS) CRITICAL_PASS=$((CRITICAL_PASS + 1)) ;;
            FAIL) CRITICAL_FAIL=$((CRITICAL_FAIL + 1)) ;;
            PREREQ) CRITICAL_PREREQ=$((CRITICAL_PREREQ + 1)) ;;
        esac
    else
        case "$status" in
            PASS) INFO_PASS=$((INFO_PASS + 1)) ;;
            FAIL) INFO_FAIL=$((INFO_FAIL + 1)) ;;
            PREREQ) INFO_PREREQ=$((INFO_PREREQ + 1)) ;;
        esac
    fi
done

# Display results
echo "Test Results:"
echo "----------------------------------------------------------------------------"
echo ""

for test in "${TESTS[@]}"; do
    IFS=: read -r test_id test_name is_critical test_desc <<< "$test"
    status="${TEST_STATUS[$test_id]}"

    # Format status with color
    case "$status" in
        PASS)
            status_display="${GREEN}[PASS]${NC}"
            ;;
        FAIL)
            status_display="${RED}[FAIL]${NC}"
            ;;
        PREREQ)
            status_display="${YELLOW}[PREREQ]${NC}"
            ;;
        ERROR)
            status_display="${RED}[ERROR]${NC}"
            ;;
        *)
            status_display="[UNKNOWN]"
            ;;
    esac

    # Mark critical tests
    if [[ "$is_critical" == "true" ]]; then
        critical_marker="${BLUE}(CRITICAL)${NC}"
    else
        critical_marker="(INFO)"
    fi

    printf "%-6s %-30s %-12s %s\n" "$test_id" "$test_desc" "$critical_marker" "$status_display"
done

echo ""
echo "----------------------------------------------------------------------------"
echo ""
echo "Critical Tests: $CRITICAL_PASS passed, $CRITICAL_FAIL failed, $CRITICAL_PREREQ prereq not met"
echo "Informational:  $INFO_PASS passed, $INFO_FAIL failed, $INFO_PREREQ prereq not met"
echo ""

# Final verdict
echo "================================================================================"
echo "Final Verdict"
echo "================================================================================"
echo ""

CRITICAL_TOTAL=$((CRITICAL_PASS + CRITICAL_FAIL + CRITICAL_PREREQ))
VERDICT="UNKNOWN"

if [[ $CRITICAL_PREREQ -gt 0 ]]; then
    echo -e "${YELLOW}Result: PREREQUISITES NOT MET${NC}"
    echo ""
    echo "Action Required:"
    echo "  - Apply prerequisite fixes identified in P0-6 audit"
    echo "  - Fix mg-workstream-transition line 101 (inter-script resolution)"
    echo "  - Fix mg-help line 12 (self-discovery)"
    echo "  - Re-run validation after fixes applied"
    VERDICT="PREREQ"
elif [[ $CRITICAL_FAIL -gt 0 ]]; then
    echo -e "${RED}Result: VALIDATION FAILED${NC}"
    echo ""
    echo "Failed Critical Tests: $CRITICAL_FAIL"
    echo ""
    echo "Action Required:"
    echo "  - Review failure logs in: $LOG_DIR"
    echo "  - Address all critical test failures"
    echo "  - Re-run validation"
    VERDICT="FAIL"
elif [[ $CRITICAL_PASS -eq $CRITICAL_TOTAL ]]; then
    echo -e "${GREEN}Result: VALIDATION PASSED${NC}"
    echo ""
    echo "All critical tests passed!"
    echo ""
    echo "Summary:"
    echo "  - Script execution: VERIFIED"
    echo "  - Inter-script resolution: VERIFIED"
    echo "  - Self-discovery: VERIFIED"
    echo "  - Settings independence: VERIFIED"
    echo ""
    echo "Informational Results:"
    if [[ "${TEST_STATUS[P0-0]}" == "PASS" ]]; then
        echo "  - P0-0 (CLAUDE-MG.md): Supported by Claude Code"
    else
        echo "  - P0-0 (CLAUDE-MG.md): Not supported (use bounded markers)"
    fi
    if [[ "${TEST_STATUS[P0-4]}" == "PASS" ]]; then
        echo "  - P0-4 (Agent Spawning): Project-local agents work independently"
    else
        echo "  - P0-4 (Agent Spawning): Keep minimal global agent stubs"
    fi
    echo ""
    echo "Next Steps:"
    echo "  - Proceed with WS-LOCAL-1: Content Migration"
    echo "  - Review P0-6 audit results for all hardcoded paths"
    echo "  - Document fallback strategies from informational tests"
    VERDICT="PASS"
else
    echo -e "${RED}Result: INCOMPLETE${NC}"
    echo ""
    echo "Some tests did not complete successfully."
    VERDICT="INCOMPLETE"
fi

echo ""
echo "Logs saved to: $LOG_DIR"
echo ""
echo "================================================================================"

# Exit with appropriate code
case "$VERDICT" in
    PASS)
        exit 0
        ;;
    PREREQ)
        exit 2
        ;;
    *)
        exit 1
        ;;
esac
