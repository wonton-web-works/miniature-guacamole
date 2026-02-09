#!/usr/bin/env bash
# ============================================================================
# P0-0: CLAUDE-MG.md Loading Test
# ============================================================================
# Test: Verify if Claude Code loads CLAUDE-MG.md from .claude/
# Expected: FAIL (Claude Code likely only loads CLAUDE.md)
# Exit 0 = test passed, Exit 1 = error
# ============================================================================

set -euo pipefail

echo "============================================================================"
echo "P0-0: CLAUDE-MG.md Loading Test"
echo "============================================================================"
echo ""

# Create temporary test project
TEST_DIR=$(mktemp -d -t ws-local-0-p0-0-XXXXXX)
cleanup() {
    rm -rf "$TEST_DIR"
}
trap cleanup EXIT

echo "Creating test project: $TEST_DIR"
mkdir -p "$TEST_DIR/.claude"

# Create unique marker
UNIQUE_MARKER="MG-FRAMEWORK-MARKER-$(date +%s)-$$"

# Create CLAUDE-MG.md with unique marker
cat > "$TEST_DIR/.claude/CLAUDE-MG.md" <<EOF
# Miniature-Guacamole Framework Test

This file tests if Claude Code loads CLAUDE-MG.md from .claude/ directory.

## Unique Marker

$UNIQUE_MARKER

This marker should appear in Claude Code's context if CLAUDE-MG.md is loaded.
EOF

echo "Created CLAUDE-MG.md with marker: $UNIQUE_MARKER"
echo ""

# Verification steps (manual inspection required)
echo "============================================================================"
echo "Test Verification (Manual Steps Required)"
echo "============================================================================"
echo ""
echo "1. Navigate to test project:"
echo "   cd $TEST_DIR"
echo ""
echo "2. Start Claude Code in that directory"
echo ""
echo "3. Ask Claude: 'What is the unique marker in CLAUDE-MG.md?'"
echo ""
echo "4. If Claude can provide the marker: CLAUDE-MG.md is loaded"
echo "   If Claude cannot find it: CLAUDE-MG.md is NOT loaded"
echo ""
echo "5. Expected Result: Claude CANNOT find the marker (FAIL expected)"
echo ""

# Automated check: Verify file was created correctly
echo "============================================================================"
echo "Automated Pre-Check"
echo "============================================================================"
echo ""

if [[ ! -f "$TEST_DIR/.claude/CLAUDE-MG.md" ]]; then
    echo "Result: [ERROR] Failed to create test file"
    exit 1
fi

if ! grep -q "$UNIQUE_MARKER" "$TEST_DIR/.claude/CLAUDE-MG.md"; then
    echo "Result: [ERROR] Marker not found in test file"
    exit 1
fi

echo "Pre-check: [PASS]"
echo "  - Test file created: $TEST_DIR/.claude/CLAUDE-MG.md"
echo "  - Marker present: $UNIQUE_MARKER"
echo ""

# Documentation check
echo "============================================================================"
echo "Documentation Analysis"
echo "============================================================================"
echo ""

# Check Claude Code documentation patterns
CLAUDE_MD_REFS=0
CLAUDE_MG_REFS=0

# Search for references to CLAUDE.md in known docs (if available)
if [[ -f "$HOME/.claude/README.md" ]]; then
    CLAUDE_MD_REFS=$(grep -c "CLAUDE\.md" "$HOME/.claude/README.md" 2>/dev/null || echo "0")
    CLAUDE_MG_REFS=$(grep -c "CLAUDE-MG\.md" "$HOME/.claude/README.md" 2>/dev/null || echo "0")
fi

echo "Documentation references:"
echo "  - CLAUDE.md mentions: $CLAUDE_MD_REFS"
echo "  - CLAUDE-MG.md mentions: $CLAUDE_MG_REFS"
echo ""

if [[ $CLAUDE_MG_REFS -eq 0 ]]; then
    echo "Analysis: No documentation references to CLAUDE-MG.md"
    echo "Conclusion: Claude Code likely does NOT support CLAUDE-MG.md"
fi

echo ""
echo "============================================================================"
echo "Test Result"
echo "============================================================================"
echo ""
echo "Result: [EXPECTED FAIL]"
echo ""
echo "Reasoning:"
echo "  - Claude Code's standard behavior is to load .claude/CLAUDE.md"
echo "  - No documentation suggests CLAUDE-MG.md is a valid alternative"
echo "  - Manual verification required to confirm"
echo ""
echo "Fallback Action:"
echo "  - Use bounded markers in single CLAUDE.md file"
echo "  - Pattern: <!-- MG-START -->...<!-- MG-END -->"
echo "  - This allows framework content to be isolated but still loaded"
echo ""
echo "Test project preserved at: $TEST_DIR"
echo "(Directory will be cleaned up on script exit)"
echo ""

exit 0
