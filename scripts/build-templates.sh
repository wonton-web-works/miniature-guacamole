#!/usr/bin/env bash
# ============================================================================
# Build Templates
# ============================================================================
# Builds miniature-guacamole templates for ~/.claude/.mg-configs/
# Copies agents, skills, shared protocols, and configuration templates
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SOURCE_CLAUDE="$ROOT_DIR/.claude"
DIST_DIR="$ROOT_DIR/dist/miniature-guacamole"
DIST_CLAUDE="$DIST_DIR/.claude"
TEMPLATES_DIR="$ROOT_DIR/templates"

echo ""
echo -e "${BLUE}Building miniature-guacamole templates...${NC}"
echo ""

# ----------------------------------------------------------------------------
# Clean and create templates directory
# ----------------------------------------------------------------------------

echo "Cleaning templates directory..."
rm -rf "$TEMPLATES_DIR"/{agents,skills,shared,hooks}
mkdir -p "$TEMPLATES_DIR"/{agents,skills,shared,hooks}

# ----------------------------------------------------------------------------
# Copy agents
# ----------------------------------------------------------------------------

echo -e "${GREEN}Copying agent templates...${NC}"
for agent_dir in "$SOURCE_CLAUDE/agents"/*; do
    if [ -d "$agent_dir" ]; then
        agent_name=$(basename "$agent_dir")
        cp -r "$agent_dir" "$TEMPLATES_DIR/agents/"
        echo "  ✓ $agent_name"
    fi
done

# ----------------------------------------------------------------------------
# Copy skills
# ----------------------------------------------------------------------------

echo -e "${GREEN}Copying skill templates...${NC}"
for skill_dir in "$SOURCE_CLAUDE/skills"/*; do
    if [ -d "$skill_dir" ]; then
        skill_name=$(basename "$skill_dir")
        # Skip internal directories starting with underscore
        if [[ "$skill_name" != _* ]]; then
            cp -r "$skill_dir" "$TEMPLATES_DIR/skills/"
            echo "  ✓ $skill_name"
        fi
    fi
done

# ----------------------------------------------------------------------------
# Copy shared protocols
# ----------------------------------------------------------------------------

echo -e "${GREEN}Copying shared protocol templates...${NC}"
if [ -d "$SOURCE_CLAUDE/shared" ]; then
    cp -r "$SOURCE_CLAUDE/shared"/* "$TEMPLATES_DIR/shared/" 2>/dev/null || true
    echo "  ✓ shared/"
fi

# ----------------------------------------------------------------------------
# Copy hooks
# ----------------------------------------------------------------------------

echo -e "${GREEN}Copying hook templates...${NC}"
if [ -d "$SOURCE_CLAUDE/hooks" ]; then
    cp -r "$SOURCE_CLAUDE/hooks"/* "$TEMPLATES_DIR/hooks/" 2>/dev/null || true
    chmod +x "$TEMPLATES_DIR/hooks"/*.sh 2>/dev/null || true
    echo "  ✓ hooks/"
fi

# ----------------------------------------------------------------------------
# Verify template files exist
# ----------------------------------------------------------------------------

echo ""
echo -e "${GREEN}Verifying templates...${NC}"

required_files=(
    "$TEMPLATES_DIR/settings.json"
    "$TEMPLATES_DIR/CLAUDE.md"
    "$TEMPLATES_DIR/VERSION.json"
    "$TEMPLATES_DIR/README.md"
    "$TEMPLATES_DIR/mg-init"
)

missing=0
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "  ${RED}✗${NC} Missing: $(basename "$file")"
        missing=$((missing + 1))
    else
        echo -e "  ${GREEN}✓${NC} $(basename "$file")"
    fi
done

if [ $missing -gt 0 ]; then
    echo ""
    echo -e "${RED}Error: Missing $missing required template files${NC}"
    exit 1
fi

# Make mg-init executable
chmod +x "$TEMPLATES_DIR/mg-init"

# ----------------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------------

echo ""
echo -e "${GREEN}Templates built successfully!${NC}"
echo ""
echo "Output: $TEMPLATES_DIR"
echo ""
echo "Contents:"
echo "  - $(ls -1 "$TEMPLATES_DIR/agents" | wc -l | xargs) agents"
echo "  - $(ls -1 "$TEMPLATES_DIR/skills" | wc -l | xargs) skills"
echo "  - $(ls -1 "$TEMPLATES_DIR/shared" | wc -l | xargs) protocols"
echo "  - $(ls -1 "$TEMPLATES_DIR/hooks" | wc -l | xargs) hooks"
echo "  - settings.json"
echo "  - CLAUDE.md"
echo "  - VERSION.json"
echo "  - README.md"
echo "  - mg-init"
echo ""
echo "These templates will be installed to ~/.claude/.mg-configs/templates/"
echo ""
