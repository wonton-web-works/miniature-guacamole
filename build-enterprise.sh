#!/usr/bin/env bash
# ============================================================================
# Enterprise Build Script
# ============================================================================
# Builds the miniature-guacamole ENTERPRISE distribution from src/ + enterprise/ → dist/
#
# Usage: ./build-enterprise.sh
#
# Output:
#   dist/miniature-guacamole-enterprise/          - Extracted distribution
#   dist/miniature-guacamole-enterprise.tar.gz    - Tarball archive
#   dist/miniature-guacamole-enterprise.zip       - Zip archive
# ============================================================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Directories
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRAMEWORK_DIR="$ROOT_DIR/src/framework"
INSTALLER_DIR="$ROOT_DIR/src/installer"
ENTERPRISE_DIR="$ROOT_DIR/enterprise"
DIST_DIR="$ROOT_DIR/dist/miniature-guacamole-enterprise"
DIST_CLAUDE="$DIST_DIR/.claude"

echo ""
echo -e "${BLUE}Building miniature-guacamole ENTERPRISE distribution...${NC}"
echo ""

# ----------------------------------------------------------------------------
# Pre-flight checks
# ----------------------------------------------------------------------------

if [[ ! -d "$FRAMEWORK_DIR" ]]; then
    echo -e "${RED}Error: src/framework/ not found${NC}"
    exit 1
fi

if [[ ! -d "$INSTALLER_DIR" ]]; then
    echo -e "${RED}Error: src/installer/ not found${NC}"
    exit 1
fi

if [[ ! -d "$ENTERPRISE_DIR" ]]; then
    echo -e "${RED}Error: enterprise/ directory not found${NC}"
    exit 1
fi

if [[ ! -f "$ENTERPRISE_DIR/package.json" ]]; then
    echo -e "${RED}Error: enterprise/package.json not found${NC}"
    exit 1
fi

# Validate enterprise/package.json is valid JSON
if ! node -e "JSON.parse(require('fs').readFileSync('$ENTERPRISE_DIR/package.json', 'utf-8'))" 2>/dev/null; then
    echo -e "${RED}Error: enterprise/package.json is invalid JSON${NC}"
    exit 1
fi

if [[ ! -f "$ENTERPRISE_DIR/tsconfig.json" ]]; then
    echo -e "${RED}Error: enterprise/tsconfig.json not found${NC}"
    exit 1
fi

# Validate tsconfig extends path exists
TSCONFIG_EXTENDS=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$ENTERPRISE_DIR/tsconfig.json', 'utf-8')).extends)" 2>/dev/null || echo "")
if [[ -n "$TSCONFIG_EXTENDS" ]]; then
    EXTENDS_PATH="$ENTERPRISE_DIR/$TSCONFIG_EXTENDS"
    if [[ ! -f "$EXTENDS_PATH" ]]; then
        echo -e "${RED}Error: tsconfig extends path '$TSCONFIG_EXTENDS' not found${NC}"
        exit 1
    fi
fi

if [[ ! -d "$ENTERPRISE_DIR/src" ]]; then
    echo -e "${RED}Error: enterprise/src/ directory not found${NC}"
    exit 1
fi

# Validate TypeScript compilation in enterprise/
if [[ -f "$ENTERPRISE_DIR/src/index.ts" ]]; then
    echo "Checking TypeScript compilation..."
    if ! (cd "$ENTERPRISE_DIR" && npx tsc --noEmit 2>&1 | head -20); then
        echo -e "${RED}Error: TypeScript compilation failed in enterprise/${NC}"
        exit 1
    fi
fi

# ----------------------------------------------------------------------------
# Clean dist
# ----------------------------------------------------------------------------

echo "Cleaning dist directory..."
rm -rf "$DIST_DIR"
rm -f "$ROOT_DIR/dist/miniature-guacamole-enterprise.tar.gz"
rm -f "$ROOT_DIR/dist/miniature-guacamole-enterprise.zip"
mkdir -p "$DIST_CLAUDE"/{agents,skills,shared,hooks,scripts,memory}

# ----------------------------------------------------------------------------
# Copy framework → dist/.claude/
# ----------------------------------------------------------------------------

echo -e "${GREEN}Copying framework...${NC}"

# Agents
AGENT_COUNT=0
for agent_dir in "$FRAMEWORK_DIR/agents"/*; do
    if [[ -d "$agent_dir" ]]; then
        cp -r "$agent_dir" "$DIST_CLAUDE/agents/"
        AGENT_COUNT=$((AGENT_COUNT + 1))
    fi
done
echo "  agents: $AGENT_COUNT"

# Skills (skip _shared internal dir)
SKILL_COUNT=0
for skill_dir in "$FRAMEWORK_DIR/skills"/*; do
    if [[ -d "$skill_dir" ]]; then
        skill_name=$(basename "$skill_dir")
        if [[ "$skill_name" != _* ]]; then
            cp -r "$skill_dir" "$DIST_CLAUDE/skills/"
            SKILL_COUNT=$((SKILL_COUNT + 1))
        fi
    fi
done
echo "  skills: $SKILL_COUNT"

# Shared protocols
cp -r "$FRAMEWORK_DIR/shared"/* "$DIST_CLAUDE/shared/"
SHARED_COUNT=$(find "$FRAMEWORK_DIR/shared" -maxdepth 1 -type f -name "*.md" | wc -l | tr -d ' ')
echo "  shared: $SHARED_COUNT"

# Scripts
SCRIPT_COUNT=0
for script_file in "$FRAMEWORK_DIR/scripts"/mg-*; do
    if [[ -f "$script_file" ]]; then
        cp "$script_file" "$DIST_CLAUDE/scripts/"
        chmod +x "$DIST_CLAUDE/scripts/$(basename "$script_file")"
        SCRIPT_COUNT=$((SCRIPT_COUNT + 1))
    fi
done
echo "  scripts: $SCRIPT_COUNT"

# Hooks
if [[ -d "$FRAMEWORK_DIR/hooks" ]]; then
    cp -r "$FRAMEWORK_DIR/hooks"/* "$DIST_CLAUDE/hooks/"
    chmod +x "$DIST_CLAUDE/hooks"/*.sh 2>/dev/null || true
    echo "  hooks: copied"
fi

# Config files
cp "$FRAMEWORK_DIR/settings.json" "$DIST_CLAUDE/"
cp "$FRAMEWORK_DIR/CLAUDE.md" "$DIST_CLAUDE/"
cp "$FRAMEWORK_DIR/team-config.yaml" "$DIST_CLAUDE/"
cp "$FRAMEWORK_DIR/team-config.json" "$DIST_CLAUDE/"
echo "  config: settings.json, CLAUDE.md, team-config.*"

# Memory .gitignore
cat > "$DIST_CLAUDE/memory/.gitignore" << 'EOF'
# Ignore all memory files (they're runtime state)
*.json
!.gitignore
EOF

# ----------------------------------------------------------------------------
# Copy enterprise/ → dist/enterprise/
# ----------------------------------------------------------------------------

echo -e "${GREEN}Copying enterprise features...${NC}"

mkdir -p "$DIST_DIR/enterprise"
cp -r "$ENTERPRISE_DIR"/* "$DIST_DIR/enterprise/"

# Preserve executable permissions if any
find "$DIST_DIR/enterprise" -type f -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true

echo "  enterprise: copied"

# ----------------------------------------------------------------------------
# Copy installer → dist/
# ----------------------------------------------------------------------------

echo -e "${GREEN}Copying installer...${NC}"

cp "$INSTALLER_DIR/install.sh" "$DIST_DIR/"
cp "$INSTALLER_DIR/uninstall.sh" "$DIST_DIR/"
cp "$INSTALLER_DIR/web-install.sh" "$DIST_DIR/"
cp "$INSTALLER_DIR/mg-migrate" "$DIST_DIR/"
cp "$INSTALLER_DIR/mg-init" "$DIST_DIR/"
cp "$INSTALLER_DIR/INSTALL-README.md" "$DIST_DIR/"
cp "$INSTALLER_DIR/QUICK-START.md" "$DIST_DIR/"
cp "$INSTALLER_DIR/DIST-README.md" "$DIST_DIR/README.md"

chmod +x "$DIST_DIR/install.sh"
chmod +x "$DIST_DIR/uninstall.sh"
chmod +x "$DIST_DIR/web-install.sh"
chmod +x "$DIST_DIR/mg-migrate"
chmod +x "$DIST_DIR/mg-init"

echo "  install.sh, uninstall.sh, web-install.sh, mg-migrate, mg-init"

# ----------------------------------------------------------------------------
# Generate VERSION.json (with enterprise flag)
# ----------------------------------------------------------------------------

echo -e "${GREEN}Generating VERSION.json...${NC}"

VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "1.0.0")
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > "$DIST_DIR/VERSION.json" <<VERSIONJSON
{
  "name": "miniature-guacamole",
  "version": "$VERSION",
  "channel": "stable",
  "enterprise": true,
  "git_sha": "$GIT_SHA",
  "build_date": "$BUILD_DATE",
  "description": "Product Development Team agent system for Claude Code (Enterprise Edition)"
}
VERSIONJSON

echo "  version: $VERSION (sha: $GIT_SHA, enterprise: true)"

# ----------------------------------------------------------------------------
# Create archives
# ----------------------------------------------------------------------------

echo -e "${GREEN}Creating archives...${NC}"

cd "$ROOT_DIR/dist"
tar -czf miniature-guacamole-enterprise.tar.gz miniature-guacamole-enterprise/
zip -rq miniature-guacamole-enterprise.zip miniature-guacamole-enterprise/
cd "$ROOT_DIR"

TARBALL_SIZE=$(du -h "$ROOT_DIR/dist/miniature-guacamole-enterprise.tar.gz" | cut -f1)
ZIP_SIZE=$(du -h "$ROOT_DIR/dist/miniature-guacamole-enterprise.zip" | cut -f1)

echo "  miniature-guacamole-enterprise.tar.gz ($TARBALL_SIZE)"
echo "  miniature-guacamole-enterprise.zip ($ZIP_SIZE)"

# ----------------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------------

echo ""
echo -e "${GREEN}Build complete!${NC}"
echo ""
echo "Distribution: dist/miniature-guacamole-enterprise/"
echo "  $AGENT_COUNT agents, $SKILL_COUNT skills, $SHARED_COUNT protocols, $SCRIPT_COUNT scripts"
echo "  + enterprise features"
echo ""
echo "Archives:"
echo "  dist/miniature-guacamole-enterprise.tar.gz ($TARBALL_SIZE)"
echo "  dist/miniature-guacamole-enterprise.zip ($ZIP_SIZE)"
echo ""
echo "To test:"
echo "  dist/miniature-guacamole-enterprise/install.sh ~/temp-test"
echo ""
