#!/usr/bin/env bash
# ============================================================================
# P0-4: Agent Spawning with Zero Global MG
# ============================================================================
# Test: Verify agents spawn from project-local path when global agents absent
# Expected: INFORMATIONAL (may pass or fail, fallback available)
# Exit 0 = test passed/informational, Exit 1 = error
# ============================================================================

set -euo pipefail

echo "============================================================================"
echo "P0-4: Agent Spawning with Zero Global MG"
echo "============================================================================"
echo ""
echo "WARNING: This test is INFORMATIONAL only"
echo "If it fails, fallback is to keep minimal global agent stubs"
echo ""

# Safety check: Confirm user wants to proceed
echo "This test will temporarily rename ~/.claude/agents/ if it exists."
echo ""
read -p "Proceed with test? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Test aborted by user"
    exit 0
fi

echo ""

# Test setup: Backup global agents if they exist
echo "Test Setup: Backup global agents"
echo "----------------------------------------------------------------------------"

GLOBAL_AGENTS="$HOME/.claude/agents"
BACKUP_DIR="$HOME/.claude/agents.backup.p0-4-test"

BACKUP_CREATED=false
if [[ -d "$GLOBAL_AGENTS" ]]; then
    echo "Backing up: $GLOBAL_AGENTS"
    echo "         to: $BACKUP_DIR"

    if [[ -d "$BACKUP_DIR" ]]; then
        echo "ERROR: Backup directory already exists"
        echo "Please remove $BACKUP_DIR and re-run"
        exit 1
    fi

    mv "$GLOBAL_AGENTS" "$BACKUP_DIR"
    BACKUP_CREATED=true
    echo "Result: [PASS] Backup created"
else
    echo "No global agents directory found (already testing zero-global state)"
fi

# Cleanup function
cleanup() {
    if [[ "$BACKUP_CREATED" == true ]]; then
        echo ""
        echo "Cleanup: Restoring global agents"
        if [[ -d "$BACKUP_DIR" ]]; then
            rm -rf "$GLOBAL_AGENTS" 2>/dev/null || true
            mv "$BACKUP_DIR" "$GLOBAL_AGENTS"
            echo "Result: [PASS] Global agents restored"
        fi
    fi
}
trap cleanup EXIT

echo ""

# Create minimal project-local agent
echo "Test Setup: Create project-local dev agent"
echo "----------------------------------------------------------------------------"

mkdir -p ".claude/agents/dev"

cat > ".claude/agents/dev/AGENT.md" <<'EOF'
# Dev Agent

You are a software engineer on the miniature-guacamole project.

## Test Marker

P0-4-AGENT-SPAWNING-TEST

This agent is loaded from project-local .claude/agents/dev/
EOF

echo "Created: .claude/agents/dev/AGENT.md"
echo "Marker: P0-4-AGENT-SPAWNING-TEST"
echo ""

# Test execution: Attempt to spawn agent
echo "Test Execution: Agent Spawning"
echo "----------------------------------------------------------------------------"
echo ""
echo "NOTE: This test requires manual verification in Claude Code"
echo ""
echo "Manual Steps:"
echo "  1. Ensure global agents are backed up (done above)"
echo "  2. In Claude Code, attempt to spawn dev agent:"
echo "     - Use Task(subagent_type=\"dev\", prompt=\"What is your test marker?\")"
echo "     - Or use /engineering-team skill"
echo "  3. Verify agent responds with marker: P0-4-AGENT-SPAWNING-TEST"
echo "  4. If agent spawns successfully: Project-local agents work"
echo "     If agent fails to spawn: Claude Code requires global agents"
echo ""

# Automated pre-check
echo "Automated Pre-Check"
echo "----------------------------------------------------------------------------"

# Verify project-local agent exists
if [[ -f ".claude/agents/dev/AGENT.md" ]]; then
    if grep -q "P0-4-AGENT-SPAWNING-TEST" ".claude/agents/dev/AGENT.md"; then
        echo "Result: [PASS] Project-local agent file created correctly"
    else
        echo "Result: [FAIL] Marker not found in agent file"
        exit 1
    fi
else
    echo "Result: [FAIL] Failed to create project-local agent"
    exit 1
fi

# Verify global agents are absent
if [[ -d "$GLOBAL_AGENTS" ]]; then
    echo "Result: [FAIL] Global agents still present"
    echo "Expected: $GLOBAL_AGENTS should not exist"
    exit 1
else
    echo "Result: [PASS] Global agents removed"
fi

echo ""

# Result interpretation
echo "============================================================================"
echo "Test Result: [INFORMATIONAL]"
echo "============================================================================"
echo ""
echo "Automated checks: [PASS]"
echo "  - Project-local agent created: .claude/agents/dev/AGENT.md"
echo "  - Global agents backed up to: $BACKUP_DIR"
echo "  - Test marker present: P0-4-AGENT-SPAWNING-TEST"
echo ""
echo "Manual verification required:"
echo "  - Spawn dev agent in Claude Code"
echo "  - Check if agent loads from project-local path"
echo ""
echo "Expected Outcomes:"
echo ""
echo "  PASS: Agent spawns, responds with test marker"
echo "    - Action: Project-local agents work independently"
echo "    - Migration: Can remove global agents entirely"
echo ""
echo "  FAIL: Agent fails to spawn, or error about missing agents"
echo "    - Action: Claude Code requires global agents directory"
echo "    - Fallback: Keep global stub agents that redirect to project-local"
echo "    - Pattern: Global AGENT.md says 'See .claude/agents/*/AGENT.md'"
echo ""
echo "After manual verification, restore global agents:"
echo "  mv $BACKUP_DIR $GLOBAL_AGENTS"
echo ""
echo "(Restoration will happen automatically on script exit)"
echo ""

# Keep script alive for manual testing
echo "Press Enter to restore global agents and complete test..."
read -r

exit 0
