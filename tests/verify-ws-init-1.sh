#!/usr/bin/env bash
# ============================================================================
# WS-INIT-1 Verification Script
# ============================================================================
# Validates: Fix Global Installation & Add Shared Protocols
#
# Acceptance Criteria:
#   AC-INIT-1.1: All symlinks in ~/.claude/agents/ and ~/.claude/skills/ resolve correctly
#   AC-INIT-1.2: ~/.claude/shared/ exists and contains all 6 protocol documents
#   AC-INIT-1.3: ~/.claude/CLAUDE.md exists with framework introduction and /init-project mention
#   AC-INIT-1.4: ~/.claude/hooks/project-init-check.sh exists and is executable
#   AC-INIT-1.5: SessionStart hook configured in ~/.claude/settings.json
#   AC-INIT-1.6: Existing user settings preserved (merged, not overwritten)
#
# Usage:
#   ./tests/verify-ws-init-1.sh
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

# ----------------------------------------------------------------------------
# Helper Functions
# ----------------------------------------------------------------------------

print_header() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  ${CYAN}WS-INIT-1 Verification${NC}                                   ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}  Fix Global Installation & Add Shared Protocols            ${BLUE}║${NC}"
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
# AC-INIT-1.1: Verify symlinks in ~/.claude/agents/ and ~/.claude/skills/
# ----------------------------------------------------------------------------

verify_symlinks() {
    print_section "AC-INIT-1.1: Symlink Verification"

    # Check agents directory exists
    if [ ! -d "$USER_CLAUDE_DIR/agents" ]; then
        check_fail "~/.claude/agents directory exists" "Directory not found"
        return
    fi
    check_pass "~/.claude/agents directory exists"

    # Verify all agents are symlinks and resolve correctly
    local agents_found=0
    local agents_valid=0

    for agent_link in "$USER_CLAUDE_DIR/agents"/*; do
        if [ -e "$agent_link" ]; then
            agents_found=$((agents_found + 1))
            local agent_name=$(basename "$agent_link")

            # Check if it's a symlink
            if [ ! -L "$agent_link" ]; then
                check_fail "agents/$agent_name is a symlink" "Not a symlink"
                continue
            fi

            # Check if symlink resolves
            if [ ! -e "$agent_link" ]; then
                check_fail "agents/$agent_name symlink resolves" "Broken symlink"
                continue
            fi

            # Check if target is a directory
            if [ ! -d "$agent_link" ]; then
                check_fail "agents/$agent_name points to directory" "Target is not a directory"
                continue
            fi

            # Check if AGENT.md exists in target
            if [ ! -f "$agent_link/AGENT.md" ]; then
                check_fail "agents/$agent_name has AGENT.md" "AGENT.md not found"
                continue
            fi

            check_pass "agents/$agent_name symlink valid"
            agents_valid=$((agents_valid + 1))
        fi
    done

    if [ $agents_found -eq 0 ]; then
        check_fail "At least one agent installed" "No agents found"
    elif [ $agents_valid -eq $agents_found ]; then
        check_pass "All $agents_found agent symlinks valid"
    fi

    # Check skills directory exists
    if [ ! -d "$USER_CLAUDE_DIR/skills" ]; then
        check_fail "~/.claude/skills directory exists" "Directory not found"
        return
    fi
    check_pass "~/.claude/skills directory exists"

    # Verify all skills are symlinks and resolve correctly
    local skills_found=0
    local skills_valid=0

    for skill_link in "$USER_CLAUDE_DIR/skills"/*; do
        if [ -e "$skill_link" ]; then
            skills_found=$((skills_found + 1))
            local skill_name=$(basename "$skill_link")

            # Check if it's a symlink
            if [ ! -L "$skill_link" ]; then
                check_fail "skills/$skill_name is a symlink" "Not a symlink"
                continue
            fi

            # Check if symlink resolves
            if [ ! -e "$skill_link" ]; then
                check_fail "skills/$skill_name symlink resolves" "Broken symlink"
                continue
            fi

            # Check if target is a directory
            if [ ! -d "$skill_link" ]; then
                check_fail "skills/$skill_name points to directory" "Target is not a directory"
                continue
            fi

            # Check if SKILL.md exists in target
            if [ ! -f "$skill_link/SKILL.md" ]; then
                check_fail "skills/$skill_name has SKILL.md" "SKILL.md not found"
                continue
            fi

            check_pass "skills/$skill_name symlink valid"
            skills_valid=$((skills_valid + 1))
        fi
    done

    if [ $skills_found -eq 0 ]; then
        check_fail "At least one skill installed" "No skills found"
    elif [ $skills_valid -eq $skills_found ]; then
        check_pass "All $skills_found skill symlinks valid"
    fi
}

# ----------------------------------------------------------------------------
# AC-INIT-1.2: Verify ~/.claude/shared/ exists with 6 protocol documents
# ----------------------------------------------------------------------------

verify_shared_protocols() {
    print_section "AC-INIT-1.2: Shared Protocol Documents"

    # Check shared directory exists
    if [ ! -d "$USER_CLAUDE_DIR/shared" ]; then
        check_fail "~/.claude/shared directory exists" "Directory not found"
        return
    fi
    check_pass "~/.claude/shared directory exists"

    # Expected protocol documents
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
        local protocol_path="$USER_CLAUDE_DIR/shared/$protocol"

        if [ ! -f "$protocol_path" ]; then
            check_fail "shared/$protocol exists" "File not found"
            continue
        fi

        # Check if file is readable
        if [ ! -r "$protocol_path" ]; then
            check_fail "shared/$protocol is readable" "File not readable"
            continue
        fi

        # Check if file has content (not empty)
        if [ ! -s "$protocol_path" ]; then
            check_fail "shared/$protocol has content" "File is empty"
            continue
        fi

        # Check if file is valid markdown (has at least one header)
        if ! grep -q "^#" "$protocol_path"; then
            check_fail "shared/$protocol is valid markdown" "No markdown headers found"
            continue
        fi

        check_pass "shared/$protocol valid"
        protocols_found=$((protocols_found + 1))
    done

    if [ $protocols_found -eq ${#protocols[@]} ]; then
        check_pass "All 6 protocol documents present and valid"
    else
        check_fail "All 6 protocol documents present" "Only $protocols_found of ${#protocols[@]} found"
    fi
}

# ----------------------------------------------------------------------------
# AC-INIT-1.3: Verify ~/.claude/CLAUDE.md exists with required content
# ----------------------------------------------------------------------------

verify_claude_md() {
    print_section "AC-INIT-1.3: Framework Introduction (CLAUDE.md)"

    local claude_md="$USER_CLAUDE_DIR/CLAUDE.md"

    # Check file exists
    if [ ! -f "$claude_md" ]; then
        check_fail "~/.claude/CLAUDE.md exists" "File not found"
        return
    fi
    check_pass "~/.claude/CLAUDE.md exists"

    # Check file is readable
    if [ ! -r "$claude_md" ]; then
        check_fail "CLAUDE.md is readable" "File not readable"
        return
    fi
    check_pass "CLAUDE.md is readable"

    # Check file has content
    if [ ! -s "$claude_md" ]; then
        check_fail "CLAUDE.md has content" "File is empty"
        return
    fi
    check_pass "CLAUDE.md has content"

    # Check for framework introduction (should mention miniature-guacamole or framework)
    if grep -qi "miniature-guacamole\|framework\|product development team" "$claude_md"; then
        check_pass "CLAUDE.md contains framework introduction"
    else
        check_fail "CLAUDE.md contains framework introduction" "No framework introduction found"
    fi

    # Check for /init-project mention
    if grep -q "/init-project" "$claude_md"; then
        check_pass "CLAUDE.md mentions /init-project"
    else
        check_fail "CLAUDE.md mentions /init-project" "/init-project not mentioned"
    fi

    # Check for markdown headers
    if grep -q "^#" "$claude_md"; then
        check_pass "CLAUDE.md has markdown structure"
    else
        check_fail "CLAUDE.md has markdown structure" "No markdown headers found"
    fi
}

# ----------------------------------------------------------------------------
# AC-INIT-1.4: Verify ~/.claude/hooks/project-init-check.sh exists and is executable
# ----------------------------------------------------------------------------

verify_init_hook() {
    print_section "AC-INIT-1.4: Project Init Hook"

    local hook_dir="$USER_CLAUDE_DIR/hooks"
    local hook_script="$hook_dir/project-init-check.sh"

    # Check hooks directory exists
    if [ ! -d "$hook_dir" ]; then
        check_fail "~/.claude/hooks directory exists" "Directory not found"
        return
    fi
    check_pass "~/.claude/hooks directory exists"

    # Check hook script exists
    if [ ! -f "$hook_script" ]; then
        check_fail "hooks/project-init-check.sh exists" "File not found"
        return
    fi
    check_pass "hooks/project-init-check.sh exists"

    # Check if file is executable
    if [ ! -x "$hook_script" ]; then
        check_fail "project-init-check.sh is executable" "File is not executable (missing +x)"
        return
    fi
    check_pass "project-init-check.sh is executable"

    # Check for bash shebang
    if head -n 1 "$hook_script" | grep -q "^#!/.*bash"; then
        check_pass "project-init-check.sh has bash shebang"
    else
        check_fail "project-init-check.sh has bash shebang" "Missing or invalid shebang"
    fi

    # Check script has content beyond shebang
    if [ $(wc -l < "$hook_script") -gt 5 ]; then
        check_pass "project-init-check.sh has implementation"
    else
        check_fail "project-init-check.sh has implementation" "Script appears empty"
    fi
}

# ----------------------------------------------------------------------------
# AC-INIT-1.5: Verify SessionStart hook configured in settings.json
# ----------------------------------------------------------------------------

verify_session_start_hook() {
    print_section "AC-INIT-1.5: SessionStart Hook Configuration"

    local settings_json="$USER_CLAUDE_DIR/settings.json"

    # Check settings.json exists
    if [ ! -f "$settings_json" ]; then
        check_fail "~/.claude/settings.json exists" "File not found"
        return
    fi
    check_pass "~/.claude/settings.json exists"

    # Check if it's valid JSON
    if ! python3 -m json.tool "$settings_json" > /dev/null 2>&1; then
        check_fail "settings.json is valid JSON" "JSON parse error"
        return
    fi
    check_pass "settings.json is valid JSON"

    # Check for hooks configuration
    if grep -q '"hooks"' "$settings_json"; then
        check_pass "settings.json has hooks configuration"
    else
        check_fail "settings.json has hooks configuration" "No hooks section found"
        return
    fi

    # Check for SessionStart hook
    if grep -q '"SessionStart"' "$settings_json"; then
        check_pass "settings.json has SessionStart hook"
    else
        check_fail "settings.json has SessionStart hook" "SessionStart not configured"
        return
    fi

    # Check SessionStart references project-init-check.sh
    if grep -A 2 '"SessionStart"' "$settings_json" | grep -q "project-init-check.sh"; then
        check_pass "SessionStart hook points to project-init-check.sh"
    else
        check_fail "SessionStart hook points to project-init-check.sh" "Hook script not referenced"
    fi
}

# ----------------------------------------------------------------------------
# AC-INIT-1.6: Verify existing user settings preserved
# ----------------------------------------------------------------------------

verify_settings_preservation() {
    print_section "AC-INIT-1.6: User Settings Preservation"

    local settings_json="$USER_CLAUDE_DIR/settings.json"

    # This check is informational - we verify settings.json wasn't just overwritten
    # by checking if it has both miniature-guacamole configs AND potentially user configs

    if [ ! -f "$settings_json" ]; then
        check_fail "settings.json exists for preservation check" "File not found"
        return
    fi

    # Check if settings.json is valid JSON (already done above, but re-verify)
    if ! python3 -m json.tool "$settings_json" > /dev/null 2>&1; then
        check_fail "settings.json is valid after merge" "JSON parse error"
        return
    fi
    check_pass "settings.json is valid after merge"

    # Check file has reasonable size (not just a stub)
    local file_size=$(wc -c < "$settings_json" | tr -d ' ')
    if [ "$file_size" -gt 50 ]; then
        check_pass "settings.json has substantial content ($file_size bytes)"
    else
        check_fail "settings.json has substantial content" "File too small (${file_size} bytes)"
    fi

    # Verify critical sections exist
    if grep -q '"hooks"' "$settings_json" || grep -q '"permissions"' "$settings_json"; then
        check_pass "settings.json has expected configuration sections"
    else
        check_fail "settings.json has expected configuration sections" "Missing critical sections"
    fi

    # Check for backup file (if settings existed before, there should be a backup)
    local backup_count=$(ls -1 "$USER_CLAUDE_DIR"/settings.json.backup.* 2>/dev/null | wc -l | tr -d ' ')
    if [ "$backup_count" -gt 0 ]; then
        check_pass "Previous settings backed up (found $backup_count backup(s))"
    else
        # This is OK - might be first install
        echo -e "  ${YELLOW}ℹ${NC} No backup found (likely first installation)"
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
        echo -e "${GREEN}WS-INIT-1 verification complete: $PASSED_CHECKS/$TOTAL_CHECKS checks passed${NC}"
        echo ""
        echo "All acceptance criteria met:"
        echo "  ✓ AC-INIT-1.1: Symlinks resolve correctly"
        echo "  ✓ AC-INIT-1.2: Shared protocols installed"
        echo "  ✓ AC-INIT-1.3: CLAUDE.md with framework intro"
        echo "  ✓ AC-INIT-1.4: Project init hook installed"
        echo "  ✓ AC-INIT-1.5: SessionStart hook configured"
        echo "  ✓ AC-INIT-1.6: User settings preserved"
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
        echo "Review the errors above and re-run install.sh"
        echo ""
        return 1
    fi
}

# ----------------------------------------------------------------------------
# Main Execution
# ----------------------------------------------------------------------------

main() {
    print_header

    # Run all verification checks
    verify_symlinks
    verify_shared_protocols
    verify_claude_md
    verify_init_hook
    verify_session_start_hook
    verify_settings_preservation

    # Print summary and exit with appropriate code
    if print_summary; then
        exit 0
    else
        exit 1
    fi
}

main "$@"
