#!/usr/bin/env bash
# ============================================================================
# WS-LOCAL-6: Integration Test Suite
# ============================================================================
# Tests the complete end-to-end flow for miniature-guacamole v2.x
# project-local architecture.
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test counters
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

# Helper functions
pass() {
    echo -e "  ${GREEN}PASS${NC}: $1"
    PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
    echo -e "  ${RED}FAIL${NC}: $1"
    FAIL_COUNT=$((FAIL_COUNT + 1))
}

skip() {
    echo -e "  ${YELLOW}SKIP${NC}: $1"
    SKIP_COUNT=$((SKIP_COUNT + 1))
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
DIST_DIR="$ROOT_DIR/dist/miniature-guacamole"
INSTALLER="$DIST_DIR/install.sh"
UNINSTALLER="$DIST_DIR/uninstall.sh"
CONFIG_CACHE_INSTALLER="$ROOT_DIR/scripts/install-config-cache.sh"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  ${CYAN}WS-LOCAL-6: Integration Test Suite${NC}                      ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  Testing miniature-guacamole v2.x Project-Local Architecture${BLUE}║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Pre-flight checks
if [[ ! -f "$INSTALLER" ]]; then
    echo -e "${RED}Error: Installer not found at $INSTALLER${NC}"
    echo "Run './scripts/build-dist.sh' first to build distribution."
    exit 1
fi

if [[ ! -f "$UNINSTALLER" ]]; then
    echo -e "${RED}Error: Uninstaller not found at $UNINSTALLER${NC}"
    exit 1
fi

# ============================================================================
# Test 1: Fresh Install
# ============================================================================

echo -e "${CYAN}Test 1: Fresh Install${NC}"
echo ""

TEST_DIR=$(mktemp -d)
echo "  Test directory: $TEST_DIR"

# Run installer
OUTPUT=$("$INSTALLER" "$TEST_DIR" 2>&1)
EXIT_CODE=$?

if [[ $EXIT_CODE -eq 0 ]]; then
    pass "Installer executed successfully"
else
    fail "Installer failed with exit code $EXIT_CODE"
    echo "$OUTPUT"
    rm -rf "$TEST_DIR"
    exit 1
fi

# Verify .claude/ directory structure
if [[ -d "$TEST_DIR/.claude" ]]; then
    pass ".claude/ directory created"
else
    fail ".claude/ directory not created"
fi

# Verify subdirectories
for subdir in agents skills shared scripts hooks memory; do
    if [[ -d "$TEST_DIR/.claude/$subdir" ]]; then
        pass ".claude/$subdir/ directory exists"
    else
        fail ".claude/$subdir/ directory missing"
    fi
done

# Verify settings.json is project-local
if [[ -f "$TEST_DIR/.claude/settings.json" ]]; then
    pass "settings.json exists (project-local)"

    # Verify it's valid JSON
    if python3 -c "import json; json.load(open('$TEST_DIR/.claude/settings.json'))" 2>/dev/null; then
        pass "settings.json is valid JSON"
    else
        fail "settings.json is not valid JSON"
    fi
else
    fail "settings.json not created"
fi

# Verify CLAUDE.md has bounded markers
if [[ -f "$TEST_DIR/.claude/CLAUDE.md" ]]; then
    pass "CLAUDE.md exists"

    if grep -q "<!-- BEGIN MINIATURE-GUACAMOLE -->" "$TEST_DIR/.claude/CLAUDE.md"; then
        pass "CLAUDE.md has BEGIN marker"
    else
        fail "CLAUDE.md missing BEGIN marker"
    fi

    if grep -q "<!-- END MINIATURE-GUACAMOLE -->" "$TEST_DIR/.claude/CLAUDE.md"; then
        pass "CLAUDE.md has END marker"
    else
        fail "CLAUDE.md missing END marker"
    fi
else
    fail "CLAUDE.md not created"
fi

# Verify MG_INSTALL.json
if [[ -f "$TEST_DIR/.claude/MG_INSTALL.json" ]]; then
    pass "MG_INSTALL.json exists"

    # Check for required fields
    if python3 -c "import json; data=json.load(open('$TEST_DIR/.claude/MG_INSTALL.json')); assert 'version' in data and 'installed_at' in data and 'components' in data" 2>/dev/null; then
        pass "MG_INSTALL.json has required metadata"
    else
        fail "MG_INSTALL.json missing required fields"
    fi
else
    fail "MG_INSTALL.json not created"
fi

# Verify MG_PROJECT marker
if [[ -f "$TEST_DIR/.claude/MG_PROJECT" ]]; then
    pass "MG_PROJECT marker exists"
else
    fail "MG_PROJECT marker not created"
fi

# Verify memory/ with .gitignore
if [[ -f "$TEST_DIR/.claude/memory/.gitignore" ]]; then
    pass "memory/.gitignore exists"
else
    fail "memory/.gitignore not created"
fi

# Verify agents are present
AGENT_COUNT=$(find "$TEST_DIR/.claude/agents" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
if [[ $AGENT_COUNT -gt 0 ]]; then
    pass "Agents installed ($AGENT_COUNT agents)"
else
    fail "No agents installed"
fi

# Verify skills are present
SKILL_COUNT=$(find "$TEST_DIR/.claude/skills" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
if [[ $SKILL_COUNT -gt 0 ]]; then
    pass "Skills installed ($SKILL_COUNT skills)"
else
    fail "No skills installed"
fi

# Verify scripts are present
SCRIPT_COUNT=$(find "$TEST_DIR/.claude/scripts" -name "mg-*" -type f | wc -l | tr -d ' ')
if [[ $SCRIPT_COUNT -gt 0 ]]; then
    pass "Scripts installed ($SCRIPT_COUNT scripts)"
else
    fail "No scripts installed"
fi

echo ""

# ============================================================================
# Test 2: Idempotent Install
# ============================================================================

echo -e "${CYAN}Test 2: Idempotent Install${NC}"
echo ""

# Add custom content to CLAUDE.md
echo "# My Custom Content" >> "$TEST_DIR/.claude/CLAUDE.md"

# Run installer again
OUTPUT=$("$INSTALLER" "$TEST_DIR" 2>&1)
EXIT_CODE=$?

if [[ $EXIT_CODE -eq 0 ]]; then
    pass "Second install completed (idempotent)"
else
    fail "Second install failed with exit code $EXIT_CODE"
fi

# Verify custom content preserved
if grep -q "My Custom Content" "$TEST_DIR/.claude/CLAUDE.md"; then
    pass "Custom CLAUDE.md content preserved"
else
    fail "Custom CLAUDE.md content lost"
fi

# Verify settings backup created
BACKUP_COUNT=$(find "$TEST_DIR/.claude" -name "settings.json.backup.*" -type f | wc -l | tr -d ' ')
if [[ $BACKUP_COUNT -gt 0 ]]; then
    pass "Settings backup created on second install"
else
    skip "Settings backup not created (may not be needed)"
fi

echo ""

# ============================================================================
# Test 3: Script Functionality
# ============================================================================

echo -e "${CYAN}Test 3: Script Functionality${NC}"
echo ""

# Test mg-help works
if [[ -f "$TEST_DIR/.claude/scripts/mg-help" ]]; then
    OUTPUT=$("$TEST_DIR/.claude/scripts/mg-help" --help 2>&1)
    EXIT_CODE=$?

    if [[ $EXIT_CODE -eq 0 ]]; then
        pass "mg-help executes successfully"
    else
        fail "mg-help failed with exit code $EXIT_CODE"
    fi
else
    fail "mg-help not found"
fi

# Test mg-memory-read --help works
if [[ -f "$TEST_DIR/.claude/scripts/mg-memory-read" ]]; then
    OUTPUT=$("$TEST_DIR/.claude/scripts/mg-memory-read" --help 2>&1)
    EXIT_CODE=$?

    if [[ $EXIT_CODE -eq 0 ]]; then
        pass "mg-memory-read --help works"
    else
        fail "mg-memory-read --help failed with exit code $EXIT_CODE"
    fi
else
    fail "mg-memory-read not found"
fi

# Test mg-workstream-create --help works
if [[ -f "$TEST_DIR/.claude/scripts/mg-workstream-create" ]]; then
    OUTPUT=$("$TEST_DIR/.claude/scripts/mg-workstream-create" --help 2>&1)
    EXIT_CODE=$?

    if [[ $EXIT_CODE -eq 0 ]]; then
        pass "mg-workstream-create --help works"
    else
        fail "mg-workstream-create --help failed with exit code $EXIT_CODE"
    fi
else
    fail "mg-workstream-create not found"
fi

# Verify security-sensitive scripts have path verification
# Only mg-help and mg-workstream-transition need this (from WS-LOCAL-0)
SECURITY_SENSITIVE_SCRIPTS=("mg-help" "mg-workstream-transition")
SCRIPT_CHECKS=0
SCRIPT_PASS=0

for script_name in "${SECURITY_SENSITIVE_SCRIPTS[@]}"; do
    script_path="$TEST_DIR/.claude/scripts/$script_name"
    if [[ -f "$script_path" ]]; then
        SCRIPT_CHECKS=$((SCRIPT_CHECKS + 1))

        # Check that script has security hardening
        if grep -q "must run from.*\\.claude/scripts" "$script_path" 2>/dev/null || \
           grep -q "\.mg-configs/scripts" "$script_path" 2>/dev/null; then
            SCRIPT_PASS=$((SCRIPT_PASS + 1))
        fi
    fi
done

if [[ $SCRIPT_PASS -eq $SCRIPT_CHECKS ]]; then
    pass "Security-sensitive scripts have path verification ($SCRIPT_PASS/$SCRIPT_CHECKS)"
else
    fail "Some security-sensitive scripts missing path verification ($SCRIPT_PASS/$SCRIPT_CHECKS)"
fi

echo ""

# ============================================================================
# Test 4: Uninstall Preserves User Data
# ============================================================================

echo -e "${CYAN}Test 4: Uninstall Preserves User Data${NC}"
echo ""

# Create fake memory files
mkdir -p "$TEST_DIR/.claude/memory"
echo '{"test": "data"}' > "$TEST_DIR/.claude/memory/test-data.json"

# Remember custom content from earlier
CUSTOM_CONTENT_BEFORE=$(grep "My Custom Content" "$TEST_DIR/.claude/CLAUDE.md" | wc -l)

# Run uninstaller
OUTPUT=$("$UNINSTALLER" --force "$TEST_DIR" 2>&1)
EXIT_CODE=$?

if [[ $EXIT_CODE -eq 0 ]]; then
    pass "Uninstaller executed successfully"
else
    fail "Uninstaller failed with exit code $EXIT_CODE"
fi

# Verify memory preserved
if [[ -f "$TEST_DIR/.claude/memory/test-data.json" ]]; then
    pass "memory/ directory preserved"
else
    fail "memory/ directory removed"
fi

# Verify custom CLAUDE.md content preserved
if [[ -f "$TEST_DIR/.claude/CLAUDE.md" ]]; then
    CUSTOM_CONTENT_AFTER=$(grep "My Custom Content" "$TEST_DIR/.claude/CLAUDE.md" | wc -l)

    if [[ $CUSTOM_CONTENT_AFTER -eq $CUSTOM_CONTENT_BEFORE ]]; then
        pass "Custom CLAUDE.md content preserved"
    else
        fail "Custom CLAUDE.md content modified"
    fi
else
    fail "CLAUDE.md removed"
fi

# Verify MG components removed
if [[ ! -d "$TEST_DIR/.claude/agents" ]]; then
    pass "agents/ directory removed"
else
    fail "agents/ directory still exists"
fi

if [[ ! -d "$TEST_DIR/.claude/skills" ]]; then
    pass "skills/ directory removed"
else
    fail "skills/ directory still exists"
fi

if [[ ! -f "$TEST_DIR/.claude/MG_PROJECT" ]]; then
    pass "MG_PROJECT marker removed"
else
    fail "MG_PROJECT marker still exists"
fi

if [[ ! -f "$TEST_DIR/.claude/MG_INSTALL.json" ]]; then
    pass "MG_INSTALL.json removed"
else
    fail "MG_INSTALL.json still exists"
fi

echo ""

# Clean up Test 1-4 directory
rm -rf "$TEST_DIR"

# ============================================================================
# Test 5: Config Cache Install
# ============================================================================

echo -e "${CYAN}Test 5: Config Cache Install${NC}"
echo ""

if [[ ! -f "$CONFIG_CACHE_INSTALLER" ]]; then
    skip "Config cache installer not found (expected at $CONFIG_CACHE_INSTALLER)"
else
    # Backup existing config cache if present
    CONFIG_CACHE_DIR="$HOME/.claude/.mg-configs"
    if [[ -d "$CONFIG_CACHE_DIR" ]]; then
        BACKUP_DIR="${CONFIG_CACHE_DIR}.backup.test.$(date +%Y%m%d-%H%M%S)"
        mv "$CONFIG_CACHE_DIR" "$BACKUP_DIR"
        echo "  Backed up existing config cache to: $BACKUP_DIR"
    fi

    # Run config cache installer
    OUTPUT=$("$CONFIG_CACHE_INSTALLER" 2>&1)
    EXIT_CODE=$?

    if [[ $EXIT_CODE -eq 0 ]]; then
        pass "Config cache installer executed successfully"
    else
        fail "Config cache installer failed with exit code $EXIT_CODE"

        # Restore backup
        if [[ -n "${BACKUP_DIR:-}" ]] && [[ -d "$BACKUP_DIR" ]]; then
            mv "$BACKUP_DIR" "$CONFIG_CACHE_DIR"
        fi

        echo "$OUTPUT"
    fi

    # Verify config cache structure
    if [[ -d "$CONFIG_CACHE_DIR" ]]; then
        pass "Config cache directory created at ~/.claude/.mg-configs/"
    else
        fail "Config cache directory not created"
    fi

    # Verify templates present
    if [[ -d "$CONFIG_CACHE_DIR/templates" ]]; then
        pass "templates/ directory exists"

        for subdir in agents skills shared hooks; do
            if [[ -d "$CONFIG_CACHE_DIR/templates/$subdir" ]]; then
                pass "templates/$subdir/ exists"
            else
                fail "templates/$subdir/ missing"
            fi
        done
    else
        fail "templates/ directory missing"
    fi

    # Verify scripts present
    if [[ -d "$CONFIG_CACHE_DIR/scripts" ]]; then
        pass "scripts/ directory exists"

        if [[ -f "$CONFIG_CACHE_DIR/scripts/mg-init" ]]; then
            pass "mg-init script present"
        else
            fail "mg-init script missing"
        fi
    else
        fail "scripts/ directory missing"
    fi

    # Verify VERSION.json
    if [[ -f "$CONFIG_CACHE_DIR/VERSION.json" ]]; then
        pass "VERSION.json exists"
    else
        fail "VERSION.json missing"
    fi
fi

echo ""

# ============================================================================
# Test 6: mg-init from Config Cache
# ============================================================================

echo -e "${CYAN}Test 6: mg-init from Config Cache${NC}"
echo ""

if [[ ! -f "$HOME/.claude/.mg-configs/scripts/mg-init" ]]; then
    skip "mg-init not found (Test 5 may have failed)"
else
    TEST_DIR=$(mktemp -d)
    echo "  Test directory: $TEST_DIR"

    # Run mg-init
    OUTPUT=$("$HOME/.claude/.mg-configs/scripts/mg-init" "$TEST_DIR" 2>&1)
    EXIT_CODE=$?

    if [[ $EXIT_CODE -eq 0 ]]; then
        pass "mg-init executed successfully"
    else
        fail "mg-init failed with exit code $EXIT_CODE"
        echo "$OUTPUT"
    fi

    # Verify structure matches direct install from Test 1
    if [[ -d "$TEST_DIR/.claude" ]]; then
        pass ".claude/ directory created"
    else
        fail ".claude/ directory not created"
    fi

    if [[ -f "$TEST_DIR/.claude/settings.json" ]]; then
        pass "settings.json created"
    else
        fail "settings.json not created"
    fi

    if [[ -f "$TEST_DIR/.claude/CLAUDE.md" ]]; then
        pass "CLAUDE.md created"
    else
        fail "CLAUDE.md not created"
    fi

    if [[ -f "$TEST_DIR/.claude/MG_PROJECT" ]]; then
        pass "MG_PROJECT marker created"
    else
        fail "MG_PROJECT marker not created"
    fi

    # Verify agents/skills/shared/scripts all present
    AGENT_COUNT=$(find "$TEST_DIR/.claude/agents" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
    if [[ $AGENT_COUNT -gt 0 ]]; then
        pass "Agents installed from config cache ($AGENT_COUNT agents)"
    else
        fail "No agents installed from config cache"
    fi

    SKILL_COUNT=$(find "$TEST_DIR/.claude/skills" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
    if [[ $SKILL_COUNT -gt 0 ]]; then
        pass "Skills installed from config cache ($SKILL_COUNT skills)"
    else
        fail "No skills installed from config cache"
    fi

    # Clean up
    rm -rf "$TEST_DIR"
fi

echo ""

# ============================================================================
# Test 7: Security Hardening Still Works
# ============================================================================

echo -e "${CYAN}Test 7: Security Hardening Still Works${NC}"
echo ""

# Test with mg-help
TMPDIR_TEST=$(mktemp -d)
if [[ -f "$HOME/.claude/.mg-configs/scripts/mg-help" ]]; then
    cp "$HOME/.claude/.mg-configs/scripts/mg-help" "$TMPDIR_TEST/"
    chmod +x "$TMPDIR_TEST/mg-help"

    OUTPUT=$("$TMPDIR_TEST/mg-help" --help 2>&1) && EXIT_CODE=$? || EXIT_CODE=$?

    if [[ $EXIT_CODE -ne 0 ]] && echo "$OUTPUT" | grep -q "must run from"; then
        pass "mg-help rejected execution from untrusted location ($TMPDIR_TEST)"
    else
        fail "mg-help did NOT reject untrusted location (exit=$EXIT_CODE)"
    fi
else
    skip "mg-help not found in config cache"
fi
rm -rf "$TMPDIR_TEST"

# Test with mg-workstream-transition from dist
TMPDIR_TEST=$(mktemp -d)
if [[ -f "$DIST_DIR/.claude/scripts/mg-workstream-transition" ]]; then
    cp "$DIST_DIR/.claude/scripts/mg-workstream-transition" "$TMPDIR_TEST/"
    chmod +x "$TMPDIR_TEST/mg-workstream-transition"

    OUTPUT=$("$TMPDIR_TEST/mg-workstream-transition" --help 2>&1) && EXIT_CODE=$? || EXIT_CODE=$?

    if [[ $EXIT_CODE -ne 0 ]] && echo "$OUTPUT" | grep -q "must run from"; then
        pass "mg-workstream-transition rejected untrusted location"
    else
        fail "mg-workstream-transition did NOT reject untrusted location (exit=$EXIT_CODE)"
    fi
else
    skip "mg-workstream-transition not found in dist"
fi
rm -rf "$TMPDIR_TEST"

echo ""

# ============================================================================
# Summary
# ============================================================================

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  ${CYAN}WS-LOCAL-6: Integration Test Results${NC}                    ${BLUE}║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}Passed:${NC}  $PASS_COUNT"
echo -e "  ${RED}Failed:${NC}  $FAIL_COUNT"
echo -e "  ${YELLOW}Skipped:${NC} $SKIP_COUNT"
echo ""

if [[ $FAIL_COUNT -eq 0 ]]; then
    echo -e "${GREEN}VERDICT: PASS${NC}"
    echo ""
    echo "All integration tests passed. Project-local architecture is working correctly."
    exit 0
else
    echo -e "${RED}VERDICT: FAIL ($FAIL_COUNT failures)${NC}"
    echo ""
    echo "Some integration tests failed. Review output above for details."
    exit 1
fi
