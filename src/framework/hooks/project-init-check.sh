#!/usr/bin/env bash
# ============================================================================
# miniature-guacamole Project Initialization Check
# ============================================================================
# SessionStart hook that validates project initialization.
# Runs automatically when Claude Code starts in a new directory.
#
# Checks:
#   - .claude/memory/ directory exists (required for agent memory protocol)
#   - .claude/rules/ directory exists (project-specific context per DEC-INIT-003)
#
# If checks fail, suggests running /mg-init to set up the project.
# Per DEC-INIT-002: Hook does NOT auto-scaffold, only detects and suggests.
# ============================================================================

set -e

# ----------------------------------------------------------------------------
# Configuration
# ----------------------------------------------------------------------------

PROJECT_ROOT="$(pwd)"
CLAUDE_DIR="$PROJECT_ROOT/.claude"
MEMORY_DIR="$CLAUDE_DIR/memory"
RULES_DIR="$CLAUDE_DIR/rules"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# ----------------------------------------------------------------------------
# Skip check in home directory or system directories
# ----------------------------------------------------------------------------

if [[ "$PROJECT_ROOT" == "$HOME" ]] || [[ "$PROJECT_ROOT" == "/" ]] || [[ "$PROJECT_ROOT" == "/Users" ]] || [[ "$PROJECT_ROOT" == "/System" ]]; then
    # Don't spam warnings in home directory or system paths
    exit 0
fi

# ----------------------------------------------------------------------------
# Skip check if this is the framework repository itself
# ----------------------------------------------------------------------------

if [ -f "$PROJECT_ROOT/dist/miniature-guacamole/install.sh" ]; then
    # This is the miniature-guacamole framework repository
    exit 0
fi

# ----------------------------------------------------------------------------
# Check if this appears to be a code project
# ----------------------------------------------------------------------------

# Only run checks if this looks like a project directory
# (has .git, package.json, or other common project markers)
has_git=false
has_package_json=false
has_requirements_txt=false
has_cargo_toml=false
has_go_mod=false
has_pyproject_toml=false

[ -d "$PROJECT_ROOT/.git" ] && has_git=true
[ -f "$PROJECT_ROOT/package.json" ] && has_package_json=true
[ -f "$PROJECT_ROOT/requirements.txt" ] && has_requirements_txt=true
[ -f "$PROJECT_ROOT/Cargo.toml" ] && has_cargo_toml=true
[ -f "$PROJECT_ROOT/go.mod" ] && has_go_mod=true
[ -f "$PROJECT_ROOT/pyproject.toml" ] && has_pyproject_toml=true

# If no project markers found, skip check
if ! $has_git && ! $has_package_json && ! $has_requirements_txt && ! $has_cargo_toml && ! $has_go_mod && ! $has_pyproject_toml; then
    exit 0
fi

# ----------------------------------------------------------------------------
# Check for required directories
# ----------------------------------------------------------------------------

memory_exists=false
if [ -d "$MEMORY_DIR" ]; then
    memory_exists=true
fi

# ----------------------------------------------------------------------------
# Report status
# ----------------------------------------------------------------------------

# If memory exists, project is initialized
# .claude/memory/ is the critical component - it enables agent collaboration
if $memory_exists; then
    exit 0
fi

# If memory missing, show warning and suggest /mg-init
echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║${NC}  miniature-guacamole Project Initialization Check          ${YELLOW}║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}This project is not initialized for miniature-guacamole.${NC}"
echo ""

echo -e "  ${RED}✗${NC} .claude/memory/ directory missing"
echo -e "     Required for agent memory protocol and collaboration"
echo ""

echo ""
echo -e "${BLUE}To initialize this project, run:${NC}"
echo -e "  ${GREEN}/mg-init${NC}"
echo ""
echo "This will:"
echo "  • Create .claude/memory/ with .gitignore (project-local agent state)"
echo "  • Copy shared protocols to .claude/shared/ (customizable per project)"
echo "  • Detect your tech stack (Node.js, Rust, Python, Go, etc.)"
echo "  • Generate .claude/rules/*.md with project context"
echo ""

exit 0
