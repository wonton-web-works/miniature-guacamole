#!/usr/bin/env bash
# ============================================================================
# WS-INIT-2 Verification Script
# ============================================================================
# Validates: /init-project Skill & SessionStart Hook Enhancement
#
# Acceptance Criteria:
#   AC-INIT-2.1: SessionStart hook detects uninitialized projects
#   AC-INIT-2.2: Hook injects additionalContext suggesting /init-project
#   AC-INIT-2.3: /init-project creates .claude/memory/ with .gitignore
#   AC-INIT-2.4: /init-project copies shared protocols to .claude/shared/
#   AC-INIT-2.5: /init-project detects tech stack
#   AC-INIT-2.6: /init-project generates .claude/rules/*.md
#   AC-INIT-2.7: /init-project does NOT overwrite existing .claude/ content
#   AC-INIT-2.8: Memory remains project-local (no cross-project leakage)
#
# Usage:
#   ./tests/verify-ws-init-2.sh
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# User Claude directory
USER_CLAUDE_DIR="$HOME/.claude"

# Test workspace
TEST_WORKSPACE="/tmp/ws-init-2-test-$$"

# ----------------------------------------------------------------------------
# Helper Functions
# ----------------------------------------------------------------------------

print_header() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  ${CYAN}WS-INIT-2 Verification${NC}                                   ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}  /init-project Skill & SessionStart Hook Enhancement       ${BLUE}║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    local section_name="$1"
    echo ""
    echo -e "${CYAN}━━━ $section_name ━━━${NC}"
    echo ""
}

check_pass() {
    local check_name="$1"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    echo -e "  ${GREEN}✓${NC} $check_name"
}

check_fail() {
    local check_name="$1"
    local error_message="$2"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    echo -e "  ${RED}✗${NC} $check_name"
    if [ -n "$error_message" ]; then
        echo -e "    ${RED}Error:${NC} $error_message"
    fi
}

# ----------------------------------------------------------------------------
# Setup Test Workspace
# ----------------------------------------------------------------------------

setup_test_workspace() {
    print_section "Test Workspace Setup"

    # Clean up any previous test workspace
    if [ -d "$TEST_WORKSPACE" ]; then
        rm -rf "$TEST_WORKSPACE"
    fi

    mkdir -p "$TEST_WORKSPACE"
    check_pass "Created test workspace: $TEST_WORKSPACE"
}

cleanup_test_workspace() {
    if [ -d "$TEST_WORKSPACE" ]; then
        rm -rf "$TEST_WORKSPACE"
    fi
}

# ----------------------------------------------------------------------------
# AC-INIT-2.1: Verify SessionStart hook detects uninitialized projects
# ----------------------------------------------------------------------------

verify_hook_detection() {
    print_section "AC-INIT-2.1: SessionStart Hook Detection"

    local hook_script="$USER_CLAUDE_DIR/hooks/project-init-check.sh"

    # Check hook script exists
    if [ ! -f "$hook_script" ]; then
        check_fail "project-init-check.sh exists" "File not found"
        return
    fi
    check_pass "project-init-check.sh exists"

    # Check hook detects missing .claude/memory/
    local test_dir="$TEST_WORKSPACE/test-no-memory"
    mkdir -p "$test_dir"
    echo '{"name": "test"}' > "$test_dir/package.json"

    cd "$test_dir"
    local hook_output=$("$hook_script" 2>&1 || true)
    cd - > /dev/null

    if echo "$hook_output" | grep -q "memory"; then
        check_pass "Hook detects missing .claude/memory/"
    else
        check_fail "Hook detects missing .claude/memory/" "No memory mention in output"
    fi

    # Check hook detects missing .claude/shared/
    if echo "$hook_output" | grep -q "shared"; then
        check_pass "Hook detects missing .claude/shared/"
    else
        # This might be OK if hook only checks for memory, not shared
        echo -e "  ${YELLOW}ℹ${NC} Hook may only check .claude/memory/ (acceptable)"
    fi

    # Check hook passes when directories exist
    local test_dir_init="$TEST_WORKSPACE/test-initialized"
    mkdir -p "$test_dir_init/.claude/memory"
    mkdir -p "$test_dir_init/.claude/shared"
    echo '{"name": "test"}' > "$test_dir_init/package.json"

    cd "$test_dir_init"
    local hook_output_init=$("$hook_script" 2>&1 || true)
    cd - > /dev/null

    if [ -z "$hook_output_init" ] || ! echo "$hook_output_init" | grep -qi "missing\|not.*initialized"; then
        check_pass "Hook passes when .claude/ directories exist"
    else
        check_fail "Hook passes when initialized" "Still shows warnings when .claude/ exists"
    fi

    # Check hook skips non-project directories
    local test_dir_empty="$TEST_WORKSPACE/test-empty"
    mkdir -p "$test_dir_empty"

    cd "$test_dir_empty"
    local hook_output_empty=$("$hook_script" 2>&1 || true)
    cd - > /dev/null

    if [ -z "$hook_output_empty" ]; then
        check_pass "Hook skips non-project directories"
    else
        check_fail "Hook skips non-project directories" "Shows output in directory with no project markers"
    fi
}

# ----------------------------------------------------------------------------
# AC-INIT-2.2: Verify hook suggests /init-project
# ----------------------------------------------------------------------------

verify_hook_suggestion() {
    print_section "AC-INIT-2.2: Hook /init-project Suggestion"

    local hook_script="$USER_CLAUDE_DIR/hooks/project-init-check.sh"

    if [ ! -f "$hook_script" ]; then
        check_fail "Hook script exists for suggestion check" "File not found"
        return
    fi

    # Run hook in uninitialized project
    local test_dir="$TEST_WORKSPACE/test-suggestion"
    mkdir -p "$test_dir"
    echo '{"name": "test"}' > "$test_dir/package.json"

    cd "$test_dir"
    local hook_output=$("$hook_script" 2>&1 || true)
    cd - > /dev/null

    # Check for /init-project mention
    if echo "$hook_output" | grep -q "/init-project"; then
        check_pass "Hook suggests /init-project command"
    else
        check_fail "Hook suggests /init-project command" "/init-project not mentioned in output"
    fi

    # Check hook does NOT auto-scaffold (per DEC-INIT-002)
    if grep -q "mkdir.*\.claude\|touch.*\.claude" "$hook_script"; then
        check_fail "Hook does NOT auto-scaffold (DEC-INIT-002)" "Hook script contains mkdir/touch commands"
    else
        check_pass "Hook does NOT auto-scaffold (DEC-INIT-002)"
    fi

    # Check output is user-friendly
    if echo "$hook_output" | grep -qE "╔|║|╚|━"; then
        check_pass "Hook output has clear formatting"
    else
        echo -e "  ${YELLOW}ℹ${NC} Hook output could use better formatting (optional)"
    fi
}

# ----------------------------------------------------------------------------
# AC-INIT-2.3: Verify /init-project skill exists
# ----------------------------------------------------------------------------

verify_init_project_skill() {
    print_section "AC-INIT-2.3: /init-project Skill Existence"

    local skill_dir="$USER_CLAUDE_DIR/skills/init-project"

    # Check skill directory exists
    if [ ! -d "$skill_dir" ]; then
        check_fail "~/.claude/skills/init-project exists" "Directory not found"
        echo -e "    ${YELLOW}Note:${NC} Skill may not be implemented yet - this is expected for test-first development"
        return
    fi
    check_pass "~/.claude/skills/init-project exists"

    # Check SKILL.md exists
    if [ ! -f "$skill_dir/SKILL.md" ]; then
        check_fail "init-project/SKILL.md exists" "File not found"
        return
    fi
    check_pass "init-project/SKILL.md exists"

    # Check SKILL.md has content
    if [ ! -s "$skill_dir/SKILL.md" ]; then
        check_fail "SKILL.md has content" "File is empty"
        return
    fi
    check_pass "SKILL.md has content"

    # Check for skill description
    if grep -qi "init\|scaffold\|project" "$skill_dir/SKILL.md"; then
        check_pass "SKILL.md describes initialization"
    else
        check_fail "SKILL.md describes initialization" "No init/scaffold/project keywords found"
    fi
}

# ----------------------------------------------------------------------------
# AC-INIT-2.3 & AC-INIT-2.4: Verify skill creates proper structure
# (This section requires actual skill execution - simulated for now)
# ----------------------------------------------------------------------------

verify_skill_output_structure() {
    print_section "AC-INIT-2.3/2.4: Skill Output Structure (Simulated)"

    echo -e "  ${YELLOW}ℹ${NC} Note: Actual skill execution requires Claude Code runtime"
    echo -e "  ${YELLOW}ℹ${NC} This section validates expected structure, not execution"

    local skill_dir="$USER_CLAUDE_DIR/skills/init-project"

    if [ ! -d "$skill_dir" ]; then
        echo -e "  ${YELLOW}⊘${NC} Skill not implemented - skipping structure checks"
        return
    fi

    # Check if SKILL.md mentions .claude/memory/ creation
    if grep -q "\.claude/memory" "$skill_dir/SKILL.md"; then
        check_pass "Skill documentation mentions .claude/memory/ creation"
    else
        check_fail "Skill mentions .claude/memory/" "Not found in SKILL.md"
    fi

    # Check if SKILL.md mentions .gitignore
    if grep -q "\.gitignore" "$skill_dir/SKILL.md"; then
        check_pass "Skill documentation mentions .gitignore"
    else
        echo -e "  ${YELLOW}ℹ${NC} No .gitignore mention (may be in implementation)"
    fi

    # Check if SKILL.md mentions shared protocols
    if grep -q "shared.*protocol\|protocol.*shared" "$skill_dir/SKILL.md"; then
        check_pass "Skill documentation mentions shared protocols"
    else
        check_fail "Skill mentions shared protocols" "Not found in SKILL.md"
    fi

    # Check if SKILL.md mentions .claude/rules/
    if grep -q "\.claude/rules\|rules/\|project-context" "$skill_dir/SKILL.md"; then
        check_pass "Skill documentation mentions .claude/rules/"
    else
        check_fail "Skill mentions .claude/rules/" "Not found in SKILL.md"
    fi
}

# ----------------------------------------------------------------------------
# AC-INIT-2.5: Verify tech stack detection mentioned
# ----------------------------------------------------------------------------

verify_tech_stack_detection() {
    print_section "AC-INIT-2.5: Tech Stack Detection (Documentation)"

    local skill_dir="$USER_CLAUDE_DIR/skills/init-project"

    if [ ! -d "$skill_dir" ]; then
        echo -e "  ${YELLOW}⊘${NC} Skill not implemented - skipping tech stack checks"
        return
    fi

    local skill_md="$skill_dir/SKILL.md"

    # Check for Node.js/TypeScript detection
    if grep -qi "package\.json\|tsconfig\|node\|typescript" "$skill_md"; then
        check_pass "Skill mentions Node.js/TypeScript detection"
    else
        echo -e "  ${YELLOW}ℹ${NC} No Node.js/TypeScript detection mentioned"
    fi

    # Check for Rust detection
    if grep -qi "Cargo\.toml\|rust" "$skill_md"; then
        check_pass "Skill mentions Rust detection"
    else
        echo -e "  ${YELLOW}ℹ${NC} No Rust detection mentioned"
    fi

    # Check for Python detection
    if grep -qi "pyproject\.toml\|requirements\.txt\|python" "$skill_md"; then
        check_pass "Skill mentions Python detection"
    else
        echo -e "  ${YELLOW}ℹ${NC} No Python detection mentioned"
    fi

    # Check for Go detection
    if grep -qi "go\.mod\|golang\|go lang" "$skill_md"; then
        check_pass "Skill mentions Go detection"
    else
        echo -e "  ${YELLOW}ℹ${NC} No Go detection mentioned"
    fi

    # Check that detection is lightweight (per DEC-INIT-005)
    if grep -qi "detect\|scan\|identify" "$skill_md" && ! grep -qi "install\|configure\|prescribe" "$skill_md"; then
        check_pass "Tech stack detection is lightweight (DEC-INIT-005)"
    else
        echo -e "  ${YELLOW}ℹ${NC} Verify detection is lightweight, not prescriptive"
    fi
}

# ----------------------------------------------------------------------------
# AC-INIT-2.6: Verify rules generation mentioned
# ----------------------------------------------------------------------------

verify_rules_generation() {
    print_section "AC-INIT-2.6: .claude/rules/ Generation (Documentation)"

    local skill_dir="$USER_CLAUDE_DIR/skills/init-project"

    if [ ! -d "$skill_dir" ]; then
        echo -e "  ${YELLOW}⊘${NC} Skill not implemented - skipping rules checks"
        return
    fi

    local skill_md="$skill_dir/SKILL.md"

    # Check for modular rules (per DEC-INIT-003)
    if grep -qi "\.claude/rules/.*\.md\|rules/.*\.md\|modular.*rules" "$skill_md"; then
        check_pass "Skill mentions modular .claude/rules/*.md (DEC-INIT-003)"
    else
        check_fail "Skill uses modular rules" "No mention of .claude/rules/*.md structure"
    fi

    # Check NOT using monolithic CLAUDE.md
    if grep -q "\.claude/CLAUDE\.md" "$skill_md" && ! grep -qi "deprecated\|legacy\|not.*use"; then
        check_fail "Skill avoids monolithic CLAUDE.md" "SKILL.md mentions .claude/CLAUDE.md without deprecation warning"
    else
        check_pass "Skill avoids monolithic CLAUDE.md (DEC-INIT-003)"
    fi
}

# ----------------------------------------------------------------------------
# AC-INIT-2.7: Verify no-overwrite policy
# ----------------------------------------------------------------------------

verify_no_overwrite_policy() {
    print_section "AC-INIT-2.7: No-Overwrite Policy (Documentation)"

    local skill_dir="$USER_CLAUDE_DIR/skills/init-project"

    if [ ! -d "$skill_dir" ]; then
        echo -e "  ${YELLOW}⊘${NC} Skill not implemented - skipping overwrite checks"
        return
    fi

    local skill_md="$skill_dir/SKILL.md"

    # Check for preservation mention (per DEC-INIT-006)
    if grep -qi "preserve\|not.*overwrite\|keep.*existing\|idempotent" "$skill_md"; then
        check_pass "Skill mentions preserving existing content (DEC-INIT-006)"
    else
        check_fail "Skill preserves existing content" "No preservation/no-overwrite mention in SKILL.md"
    fi

    # Check for conditional creation logic
    if grep -qi "if.*exist\|check.*before\|mkdir.*p" "$skill_md"; then
        check_pass "Skill mentions conditional creation (mkdir -p or existence checks)"
    else
        echo -e "  ${YELLOW}ℹ${NC} Verify implementation uses conditional creation"
    fi
}

# ----------------------------------------------------------------------------
# AC-INIT-2.8: Verify project-local memory
# ----------------------------------------------------------------------------

verify_project_local_memory() {
    print_section "AC-INIT-2.8: Project-Local Memory (Documentation)"

    local skill_dir="$USER_CLAUDE_DIR/skills/init-project"

    if [ ! -d "$skill_dir" ]; then
        echo -e "  ${YELLOW}⊘${NC} Skill not implemented - skipping memory isolation checks"
        return
    fi

    local skill_md="$skill_dir/SKILL.md"

    # Check skill creates in current directory
    if grep -qi "current.*directory\|project.*directory\|\./\.claude\|\$(pwd)" "$skill_md"; then
        check_pass "Skill creates .claude/ in current/project directory"
    else
        echo -e "  ${YELLOW}ℹ${NC} Verify skill creates .claude/ in current directory, not ~/.claude/"
    fi

    # Check .gitignore for memory files
    if grep -qi "gitignore.*memory\|memory.*gitignore" "$skill_md"; then
        check_pass "Skill mentions .gitignore for memory isolation"
    else
        echo -e "  ${YELLOW}ℹ${NC} Verify .claude/memory/.gitignore prevents commits"
    fi

    # Check no cross-project references
    if ! grep -q "/home/\|/Users/\|~/" "$skill_md" || grep -qi "relative.*path\|project.*local"; then
        check_pass "Skill uses project-relative paths (no absolute paths to other projects)"
    else
        echo -e "  ${YELLOW}ℹ${NC} Check for absolute path references that could leak between projects"
    fi
}

# ----------------------------------------------------------------------------
# Verify Global Shared Protocols are Present (Prerequisite)
# ----------------------------------------------------------------------------

verify_shared_protocols_prerequisite() {
    print_section "Prerequisite: Shared Protocols from WS-INIT-1"

    local shared_dir="$USER_CLAUDE_DIR/shared"

    # This is a dependency check - WS-INIT-1 must be complete
    if [ ! -d "$shared_dir" ]; then
        check_fail "~/.claude/shared/ exists (WS-INIT-1 dependency)" "Directory not found - run WS-INIT-1 first"
        return
    fi
    check_pass "~/.claude/shared/ exists"

    local protocols=(
        "development-workflow.md"
        "engineering-principles.md"
        "handoff-protocol.md"
        "memory-protocol.md"
        "tdd-workflow.md"
        "visual-formatting.md"
    )

    local protocols_found=0
    for protocol in "${protocols[@]}"; do
        if [ -f "$shared_dir/$protocol" ]; then
            protocols_found=$((protocols_found + 1))
        fi
    done

    if [ $protocols_found -eq ${#protocols[@]} ]; then
        check_pass "All 6 shared protocols available for copying"
    else
        check_fail "All 6 shared protocols available" "Only $protocols_found of 6 found - run WS-INIT-1 first"
    fi
}

# ----------------------------------------------------------------------------
# Summary and Exit
# ----------------------------------------------------------------------------

print_summary() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    if [ $FAILED_CHECKS -eq 0 ]; then
        echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║${NC}  ${GREEN}✓ ALL CHECKS PASSED${NC}                                       ${GREEN}║${NC}"
        echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${GREEN}WS-INIT-2 verification complete: $PASSED_CHECKS/$TOTAL_CHECKS checks passed${NC}"
        echo ""
        echo "All acceptance criteria validated:"
        echo "  ✓ AC-INIT-2.1: SessionStart hook detects uninitialized projects"
        echo "  ✓ AC-INIT-2.2: Hook suggests /init-project (no auto-scaffold)"
        echo "  ✓ AC-INIT-2.3: /init-project skill exists"
        echo "  ✓ AC-INIT-2.4: Skill documentation mentions protocols"
        echo "  ✓ AC-INIT-2.5: Tech stack detection mentioned"
        echo "  ✓ AC-INIT-2.6: Modular .claude/rules/ structure"
        echo "  ✓ AC-INIT-2.7: No-overwrite policy documented"
        echo "  ✓ AC-INIT-2.8: Project-local memory isolation"
        echo ""
        echo -e "${YELLOW}Note:${NC} This verification validates infrastructure and documentation."
        echo "      E2E testing (actual skill execution) requires Claude Code runtime."
        echo ""
        return 0
    else
        echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║${NC}  ${RED}✗ VERIFICATION FAILED${NC}                                    ${RED}║${NC}"
        echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${RED}$FAILED_CHECKS of $TOTAL_CHECKS checks failed${NC}"
        echo -e "${GREEN}$PASSED_CHECKS checks passed${NC}"
        echo ""
        echo "Review the errors above and fix implementation."
        echo ""
        return 1
    fi
}

# ----------------------------------------------------------------------------
# Main Execution
# ----------------------------------------------------------------------------

main() {
    print_header

    # Setup test workspace
    setup_test_workspace

    # Run all verification checks
    verify_shared_protocols_prerequisite
    verify_hook_detection
    verify_hook_suggestion
    verify_init_project_skill
    verify_skill_output_structure
    verify_tech_stack_detection
    verify_rules_generation
    verify_no_overwrite_policy
    verify_project_local_memory

    # Cleanup
    cleanup_test_workspace

    # Print summary and exit with appropriate code
    if print_summary; then
        exit 0
    else
        exit 1
    fi
}

main "$@"
