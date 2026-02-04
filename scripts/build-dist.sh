#!/usr/bin/env bash
# ============================================================================
# Build Distribution
# ============================================================================
# Builds the miniature-guacamole distribution from source.
# Copies agents, skills, and configuration to dist/miniature-guacamole/
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

echo ""
echo -e "${BLUE}Building miniature-guacamole distribution...${NC}"
echo ""

# ----------------------------------------------------------------------------
# Clean and create dist directory
# ----------------------------------------------------------------------------

echo "Cleaning dist directory..."
rm -rf "$DIST_DIR/.claude"
mkdir -p "$DIST_CLAUDE"/{agents,skills,shared,memory,hooks}

# ----------------------------------------------------------------------------
# Copy agents
# ----------------------------------------------------------------------------

echo -e "${GREEN}Copying agents...${NC}"
for agent_dir in "$SOURCE_CLAUDE/agents"/*; do
    if [ -d "$agent_dir" ]; then
        agent_name=$(basename "$agent_dir")
        cp -r "$agent_dir" "$DIST_CLAUDE/agents/"
        echo "  ✓ $agent_name"
    fi
done

# ----------------------------------------------------------------------------
# Copy team configuration
# ----------------------------------------------------------------------------

echo -e "${GREEN}Copying configuration...${NC}"
if [ -f "$SOURCE_CLAUDE/team-config.yaml" ]; then
    cp "$SOURCE_CLAUDE/team-config.yaml" "$DIST_CLAUDE/"
    echo "  ✓ team-config.yaml"
fi

# Also copy JSON config if it exists (for backwards compatibility)
if [ -f "$SOURCE_CLAUDE/team-config.json" ]; then
    cp "$SOURCE_CLAUDE/team-config.json" "$DIST_CLAUDE/"
    echo "  ✓ team-config.json"
fi

# ----------------------------------------------------------------------------
# Copy shared context files
# ----------------------------------------------------------------------------

echo -e "${GREEN}Copying shared context...${NC}"
if [ -d "$SOURCE_CLAUDE/shared" ]; then
    cp -r "$SOURCE_CLAUDE/shared"/* "$DIST_CLAUDE/shared/" 2>/dev/null || true
    echo "  ✓ shared/"
fi

# ----------------------------------------------------------------------------
# Copy select skills (workflow-level only, not individual roles)
# ----------------------------------------------------------------------------

echo -e "${GREEN}Copying workflow skills...${NC}"

# List of workflow skills to include in distribution
# Individual agent skills are not needed - agents have their own definitions
WORKFLOW_SKILLS=(
    "leadership-team"
    "engineering-team"
    "product-team"
    "design-team"
)

for skill in "${WORKFLOW_SKILLS[@]}"; do
    if [ -d "$SOURCE_CLAUDE/skills/$skill" ]; then
        cp -r "$SOURCE_CLAUDE/skills/$skill" "$DIST_CLAUDE/skills/"
        echo "  ✓ $skill"
    fi
done

# ----------------------------------------------------------------------------
# Copy hooks and settings
# ----------------------------------------------------------------------------

echo -e "${GREEN}Copying safety hooks...${NC}"
if [ -d "$SOURCE_CLAUDE/hooks" ]; then
    cp -r "$SOURCE_CLAUDE/hooks"/* "$DIST_CLAUDE/hooks/" 2>/dev/null || true
    chmod +x "$DIST_CLAUDE/hooks"/*.sh 2>/dev/null || true
    echo "  ✓ hooks/"
fi

if [ -f "$SOURCE_CLAUDE/settings.json" ]; then
    cp "$SOURCE_CLAUDE/settings.json" "$DIST_CLAUDE/"
    echo "  ✓ settings.json"
fi

# ----------------------------------------------------------------------------
# Create .gitignore for memory directory
# ----------------------------------------------------------------------------

echo -e "${GREEN}Setting up memory directory...${NC}"
cat > "$DIST_CLAUDE/memory/.gitignore" << 'EOF'
# Ignore all memory files (they're runtime state)
*.json
!.gitignore
EOF
echo "  ✓ memory/.gitignore"

# ----------------------------------------------------------------------------
# Make scripts executable
# ----------------------------------------------------------------------------

chmod +x "$DIST_DIR/install.sh"
chmod +x "$DIST_DIR/uninstall.sh"

# ----------------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------------

echo ""
echo -e "${GREEN}Distribution built successfully!${NC}"
echo ""
echo "Output: $DIST_DIR"
echo ""
echo "Contents:"
find "$DIST_DIR" -type f | sed "s|$DIST_DIR/||" | sort | head -30
echo ""
echo "To test locally:"
echo "  cd $DIST_DIR && ./install.sh"
echo ""
