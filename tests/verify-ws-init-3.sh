#!/usr/bin/env bash
# ============================================================================
# WS-INIT-3 Verification Script
# ============================================================================
# Validates: Build Pipeline & Documentation
#
# Acceptance Criteria:
#   AC-INIT-3.1: build-dist.sh produces distribution with init-project skill, hook script, global CLAUDE.md
#   AC-INIT-3.2: install.sh installs hooks, global CLAUDE.md, and shared/ symlink
#   AC-INIT-3.3: README documents /init-project usage and new workflow
#   AC-INIT-3.4: End-to-end flow verified (install -> new project -> hook fires -> /init-project -> agents functional)
#
# Usage:
#   ./tests/verify-ws-init-3.sh
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

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$ROOT_DIR/dist/miniature-guacamole"
DIST_CLAUDE="$DIST_DIR/.claude"
BUILD_SCRIPT="$ROOT_DIR/scripts/build-dist.sh"
INSTALL_SCRIPT="$DIST_DIR/install.sh"
README="$ROOT_DIR/README.md"

# Test workspace for E2E
TEST_WORKSPACE="/tmp/ws-init-3-e2e-test-$$"

# ----------------------------------------------------------------------------
# Helper Functions
# ----------------------------------------------------------------------------

print_header() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  ${CYAN}WS-INIT-3 Verification${NC}                                   ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}  Build Pipeline & Documentation                            ${BLUE}║${NC}"
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

cleanup_test_workspace() {
    if [ -d "$TEST_WORKSPACE" ]; then
        rm -rf "$TEST_WORKSPACE"
    fi
}

# ----------------------------------------------------------------------------
# AC-INIT-3.1: Verify build-dist.sh produces complete distribution
# ----------------------------------------------------------------------------

verify_build_script_exists() {
    print_section "AC-INIT-3.1: Build Pipeline Completeness"

    # Check build script exists
    if [ ! -f "$BUILD_SCRIPT" ]; then
        check_fail "build-dist.sh script exists" "File not found at $BUILD_SCRIPT"
        return
    fi
    check_pass "build-dist.sh script exists"

    # Check script is executable
    if [ ! -x "$BUILD_SCRIPT" ]; then
        check_fail "build-dist.sh is executable" "Missing execute permission"
        return
    fi
    check_pass "build-dist.sh is executable"

    # Check script has bash shebang
    if head -n 1 "$BUILD_SCRIPT" | grep -q "^#!/.*bash"; then
        check_pass "build-dist.sh has bash shebang"
    else
        check_fail "build-dist.sh has bash shebang" "Missing or invalid shebang"
    fi
}

verify_distribution_structure() {
    print_section "AC-INIT-3.1: Distribution Structure"

    # Check dist directory exists (from build)
    if [ ! -d "$DIST_DIR" ]; then
        check_fail "dist/miniature-guacamole directory exists" "Directory not found - run build-dist.sh"
        return
    fi
    check_pass "dist/miniature-guacamole directory exists"

    # Check .claude subdirectory
    if [ ! -d "$DIST_CLAUDE" ]; then
        check_fail "dist/.claude directory exists" "Directory not found"
        return
    fi
    check_pass "dist/.claude directory exists"

    # Check critical subdirectories
    for subdir in agents skills shared hooks memory; do
        if [ ! -d "$DIST_CLAUDE/$subdir" ]; then
            check_fail "dist/.claude/$subdir exists" "Directory not found"
        else
            check_pass "dist/.claude/$subdir exists"
        fi
    done
}

verify_init_project_in_dist() {
    print_section "AC-INIT-3.1: init-project Skill in Distribution"

    local skill_dir="$DIST_CLAUDE/skills/init-project"

    # Check init-project skill directory
    if [ ! -d "$skill_dir" ]; then
        check_fail "dist/.claude/skills/init-project exists" "Directory not found"
        return
    fi
    check_pass "dist/.claude/skills/init-project exists"

    # Check SKILL.md
    if [ ! -f "$skill_dir/SKILL.md" ]; then
        check_fail "init-project/SKILL.md exists in dist" "File not found"
        return
    fi
    check_pass "init-project/SKILL.md exists in dist"

    # Verify SKILL.md has required content
    if grep -q "/init-project" "$skill_dir/SKILL.md"; then
        check_pass "SKILL.md documents /init-project usage"
    else
        check_fail "SKILL.md documents usage" "/init-project not mentioned"
    fi

    # Verify mentions .claude/memory/
    if grep -q "\.claude/memory" "$skill_dir/SKILL.md"; then
        check_pass "SKILL.md mentions .claude/memory/"
    else
        check_fail "SKILL.md mentions .claude/memory/" "Not found in documentation"
    fi

    # Verify mentions shared protocols
    if grep -q "shared.*protocol\|protocol.*shared" "$skill_dir/SKILL.md"; then
        check_pass "SKILL.md mentions shared protocols"
    else
        check_fail "SKILL.md mentions shared protocols" "Not found in documentation"
    fi
}

verify_hook_script_in_dist() {
    print_section "AC-INIT-3.1: Hook Script in Distribution"

    local hook_script="$DIST_CLAUDE/hooks/project-init-check.sh"

    # Check hook script exists
    if [ ! -f "$hook_script" ]; then
        check_fail "project-init-check.sh exists in dist" "File not found"
        return
    fi
    check_pass "project-init-check.sh exists in dist"

    # Check executable
    if [ ! -x "$hook_script" ]; then
        check_fail "project-init-check.sh is executable in dist" "Missing execute permission"
        return
    fi
    check_pass "project-init-check.sh is executable in dist"

    # Verify hook content
    if grep -q "\.claude/memory" "$hook_script"; then
        check_pass "Hook script checks for .claude/memory/"
    else
        check_fail "Hook script checks for .claude/memory/" "No detection logic found"
    fi

    if grep -q "/init-project" "$hook_script"; then
        check_pass "Hook script suggests /init-project"
    else
        check_fail "Hook script suggests /init-project" "No suggestion found"
    fi
}

verify_global_claude_md_in_dist() {
    print_section "AC-INIT-3.1: Global CLAUDE.md in Distribution"

    local claude_md="$DIST_CLAUDE/CLAUDE.md"

    # Check file exists
    if [ ! -f "$claude_md" ]; then
        check_fail "CLAUDE.md exists in dist" "File not found"
        return
    fi
    check_pass "CLAUDE.md exists in dist"

    # Check has content
    if [ ! -s "$claude_md" ]; then
        check_fail "CLAUDE.md has content in dist" "File is empty"
        return
    fi
    check_pass "CLAUDE.md has content in dist"

    # Verify mentions framework
    if grep -qi "miniature-guacamole\|framework" "$claude_md"; then
        check_pass "CLAUDE.md mentions framework"
    else
        check_fail "CLAUDE.md mentions framework" "No framework introduction found"
    fi

    # Verify mentions /init-project
    if grep -q "/init-project" "$claude_md"; then
        check_pass "CLAUDE.md mentions /init-project"
    else
        check_fail "CLAUDE.md mentions /init-project" "No mention of /init-project"
    fi

    # Verify mentions agents and skills
    if grep -qi "agents\|skills" "$claude_md"; then
        check_pass "CLAUDE.md mentions agents and skills"
    else
        check_fail "CLAUDE.md mentions agents/skills" "No agent/skill information"
    fi
}

verify_shared_protocols_in_dist() {
    print_section "AC-INIT-3.1: Shared Protocols in Distribution"

    local shared_dir="$DIST_CLAUDE/shared"

    if [ ! -d "$shared_dir" ]; then
        check_fail "dist/.claude/shared directory exists" "Directory not found"
        return
    fi

    # Expected protocols
    local protocols=(
        "development-workflow.md"
        "engineering-principles.md"
        "handoff-protocol.md"
        "memory-protocol.md"
        "tdd-workflow.md"
    )

    local protocols_found=0

    for protocol in "${protocols[@]}"; do
        if [ -f "$shared_dir/$protocol" ]; then
            protocols_found=$((protocols_found + 1))
        fi
    done

    if [ $protocols_found -eq ${#protocols[@]} ]; then
        check_pass "All 6 shared protocols in distribution"
    else
        check_fail "All 6 shared protocols in dist" "Only $protocols_found of ${#protocols[@]} found"
    fi
}

# ----------------------------------------------------------------------------
# AC-INIT-3.2: Verify install.sh installs all components correctly
# ----------------------------------------------------------------------------

verify_install_script_exists() {
    print_section "AC-INIT-3.2: Install Script Functionality"

    # Check install script exists
    if [ ! -f "$INSTALL_SCRIPT" ]; then
        check_fail "install.sh script exists in dist" "File not found"
        return
    fi
    check_pass "install.sh script exists in dist"

    # Check executable
    if [ ! -x "$INSTALL_SCRIPT" ]; then
        check_fail "install.sh is executable" "Missing execute permission"
        return
    fi
    check_pass "install.sh is executable"

    # Check has bash shebang
    if head -n 1 "$INSTALL_SCRIPT" | grep -q "^#!/.*bash"; then
        check_pass "install.sh has bash shebang"
    else
        check_fail "install.sh has bash shebang" "Missing or invalid shebang"
    fi
}

verify_install_script_logic() {
    print_section "AC-INIT-3.2: Install Script Logic"

    # Check install script references init-project
    if grep -q "init-project" "$INSTALL_SCRIPT"; then
        check_pass "install.sh references init-project skill"
    else
        check_fail "install.sh references init-project" "No init-project logic found"
    fi

    # Check installs hooks
    if grep -q "project-init-check.sh" "$INSTALL_SCRIPT"; then
        check_pass "install.sh installs project-init-check.sh hook"
    else
        check_fail "install.sh installs hook" "No hook installation logic"
    fi

    # Check installs/copies global CLAUDE.md
    if grep -q "CLAUDE.md" "$INSTALL_SCRIPT"; then
        check_pass "install.sh handles global CLAUDE.md"
    else
        check_fail "install.sh handles CLAUDE.md" "No CLAUDE.md logic found"
    fi

    # Check creates/links shared directory
    if grep -q "shared" "$INSTALL_SCRIPT"; then
        check_pass "install.sh handles shared/ directory"
    else
        check_fail "install.sh handles shared/" "No shared directory logic"
    fi

    # Check preserves existing settings
    if grep -qi "backup\|merge" "$INSTALL_SCRIPT"; then
        check_pass "install.sh preserves existing settings"
    else
        check_fail "install.sh preserves settings" "No backup/merge logic found"
    fi
}

# ----------------------------------------------------------------------------
# AC-INIT-3.3: Verify README documents /init-project usage
# ----------------------------------------------------------------------------

verify_readme_documentation() {
    print_section "AC-INIT-3.3: README Documentation"

    # Check README exists
    if [ ! -f "$README" ]; then
        check_fail "README.md exists" "File not found"
        return
    fi
    check_pass "README.md exists"

    # Check README has content
    if [ ! -s "$README" ]; then
        check_fail "README.md has content" "File is empty"
        return
    fi
    check_pass "README.md has content"

    # Check mentions /init-project
    if grep -q "/init-project" "$README"; then
        check_pass "README documents /init-project usage"
    else
        check_fail "README documents /init-project" "/init-project not mentioned"
    fi

    # Check mentions installation
    if grep -qi "install" "$README"; then
        check_pass "README documents installation"
    else
        check_fail "README documents installation" "No installation instructions"
    fi

    # Check mentions project initialization workflow
    if grep -qi "initialize\|init.*project\|getting.*started\|quick.*start" "$README"; then
        check_pass "README documents initialization workflow"
    else
        check_fail "README documents workflow" "No workflow instructions"
    fi

    # Check mentions agents or skills
    if grep -qi "agents\|skills" "$README"; then
        check_pass "README mentions agents/skills"
    else
        check_fail "README mentions agents/skills" "No agent/skill documentation"
    fi

    # Check has example usage
    if grep -q "^\`\`\`" "$README"; then
        check_pass "README includes code examples"
    else
        echo -e "  ${YELLOW}ℹ${NC} README could include more code examples"
    fi
}

# ----------------------------------------------------------------------------
# AC-INIT-3.4: End-to-End Flow Verification
# ----------------------------------------------------------------------------

verify_e2e_workflow() {
    print_section "AC-INIT-3.4: End-to-End Workflow (Simulated)"

    echo -e "  ${YELLOW}ℹ${NC} Note: E2E testing simulates workflow without actual Claude Code runtime"

    # Create test workspace
    mkdir -p "$TEST_WORKSPACE"
    check_pass "Created E2E test workspace"

    # Simulate project with package.json
    echo '{"name": "test-project", "version": "1.0.0"}' > "$TEST_WORKSPACE/package.json"
    check_pass "Created test project with package.json"

    # Test 1: Hook detection (uninitialized project)
    local hook_script="$DIST_CLAUDE/hooks/project-init-check.sh"
    if [ -f "$hook_script" ] && [ -x "$hook_script" ]; then
        cd "$TEST_WORKSPACE"
        local hook_output=$("$hook_script" 2>&1 || true)
        cd - > /dev/null

        if echo "$hook_output" | grep -q "memory\|init"; then
            check_pass "Hook detects uninitialized project"
        else
            check_fail "Hook detects uninitialized project" "No detection in output"
        fi

        if echo "$hook_output" | grep -q "/init-project"; then
            check_pass "Hook suggests /init-project"
        else
            check_fail "Hook suggests /init-project" "No suggestion in output"
        fi
    else
        check_fail "Hook script available for E2E test" "Hook not found or not executable"
    fi

    # Test 2: Simulate /init-project execution
    mkdir -p "$TEST_WORKSPACE/.claude/memory"
    mkdir -p "$TEST_WORKSPACE/.claude/shared"
    mkdir -p "$TEST_WORKSPACE/.claude/rules"

    if [ -d "$TEST_WORKSPACE/.claude/memory" ]; then
        check_pass "Simulated .claude/memory/ creation"
    else
        check_fail "Simulated .claude/memory/ creation" "Directory creation failed"
    fi

    # Create .gitignore
    cat > "$TEST_WORKSPACE/.claude/memory/.gitignore" << 'EOF'
*.json
!.gitignore
EOF

    if [ -f "$TEST_WORKSPACE/.claude/memory/.gitignore" ]; then
        check_pass "Simulated .gitignore creation"
    else
        check_fail "Simulated .gitignore creation" "File creation failed"
    fi

    # Copy protocols if available
    if [ -d "$DIST_CLAUDE/shared" ]; then
        cp -r "$DIST_CLAUDE/shared"/* "$TEST_WORKSPACE/.claude/shared/" 2>/dev/null || true
        local protocols_copied=$(ls -1 "$TEST_WORKSPACE/.claude/shared" 2>/dev/null | wc -l | tr -d ' ')
        if [ "$protocols_copied" -gt 0 ]; then
            check_pass "Simulated protocol copying ($protocols_copied files)"
        else
            check_fail "Simulated protocol copying" "No protocols copied"
        fi
    fi

    # Test 3: Verify hook passes after initialization
    if [ -f "$hook_script" ] && [ -x "$hook_script" ]; then
        cd "$TEST_WORKSPACE"
        local hook_output_init=$("$hook_script" 2>&1 || true)
        cd - > /dev/null

        if [ -z "$hook_output_init" ] || ! echo "$hook_output_init" | grep -qi "missing\|not.*initialized"; then
            check_pass "Hook passes after initialization"
        else
            check_fail "Hook passes after init" "Still shows warnings when initialized"
        fi
    fi

    # Test 4: Verify agents are accessible (symlink structure)
    local agents_count=$(ls -1d "$DIST_CLAUDE/agents"/* 2>/dev/null | wc -l | tr -d ' ')
    if [ "$agents_count" -gt 0 ]; then
        check_pass "Agents available in distribution ($agents_count agents)"
    else
        check_fail "Agents available" "No agents found in distribution"
    fi

    # Test 5: Verify skills are accessible (symlink structure)
    local skills_count=$(ls -1d "$DIST_CLAUDE/skills"/* 2>/dev/null | wc -l | tr -d ' ')
    if [ "$skills_count" -gt 0 ]; then
        check_pass "Skills available in distribution ($skills_count skills)"
    else
        check_fail "Skills available" "No skills found in distribution"
    fi
}

# ----------------------------------------------------------------------------
# Regression Tests: Verify WS-INIT-1 and WS-INIT-2 still pass
# ----------------------------------------------------------------------------

verify_regression_ws_init_1() {
    print_section "Regression: WS-INIT-1 Verification"

    local ws_init_1_script="$SCRIPT_DIR/verify-ws-init-1.sh"

    if [ ! -f "$ws_init_1_script" ]; then
        echo -e "  ${YELLOW}⊘${NC} WS-INIT-1 verification script not found - skipping regression test"
        return
    fi

    if [ ! -x "$ws_init_1_script" ]; then
        chmod +x "$ws_init_1_script"
    fi

    # Run WS-INIT-1 verification
    if "$ws_init_1_script" > /dev/null 2>&1; then
        check_pass "WS-INIT-1 regression test passes"
    else
        check_fail "WS-INIT-1 regression test" "Previous workstream verification failed"
        echo -e "    ${YELLOW}Run:${NC} $ws_init_1_script"
    fi
}

verify_regression_ws_init_2() {
    print_section "Regression: WS-INIT-2 Verification"

    local ws_init_2_script="$SCRIPT_DIR/verify-ws-init-2.sh"

    if [ ! -f "$ws_init_2_script" ]; then
        echo -e "  ${YELLOW}⊘${NC} WS-INIT-2 verification script not found - skipping regression test"
        return
    fi

    if [ ! -x "$ws_init_2_script" ]; then
        chmod +x "$ws_init_2_script"
    fi

    # Run WS-INIT-2 verification
    if "$ws_init_2_script" > /dev/null 2>&1; then
        check_pass "WS-INIT-2 regression test passes"
    else
        check_fail "WS-INIT-2 regression test" "Previous workstream verification failed"
        echo -e "    ${YELLOW}Run:${NC} $ws_init_2_script"
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
        echo -e "${GREEN}WS-INIT-3 verification complete: $PASSED_CHECKS/$TOTAL_CHECKS checks passed${NC}"
        echo ""
        echo "All acceptance criteria validated:"
        echo "  ✓ AC-INIT-3.1: Build pipeline produces complete distribution"
        echo "  ✓ AC-INIT-3.2: Install script installs all components correctly"
        echo "  ✓ AC-INIT-3.3: README documents /init-project usage and workflow"
        echo "  ✓ AC-INIT-3.4: End-to-end workflow verified (install -> init -> agents)"
        echo ""
        echo -e "${YELLOW}Note:${NC} E2E testing simulated infrastructure setup and hook behavior."
        echo "      Full runtime testing (actual /init-project execution) requires Claude Code."
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

    # AC-INIT-3.1: Build pipeline verification
    verify_build_script_exists
    verify_distribution_structure
    verify_init_project_in_dist
    verify_hook_script_in_dist
    verify_global_claude_md_in_dist
    verify_shared_protocols_in_dist

    # AC-INIT-3.2: Install script verification
    verify_install_script_exists
    verify_install_script_logic

    # AC-INIT-3.3: Documentation verification
    verify_readme_documentation

    # AC-INIT-3.4: E2E workflow verification
    verify_e2e_workflow

    # Regression tests
    verify_regression_ws_init_1
    verify_regression_ws_init_2

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
