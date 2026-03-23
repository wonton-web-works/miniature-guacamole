#!/usr/bin/env bash
# ============================================================================
# Unified Build Script
# ============================================================================
# Builds the miniature-guacamole distribution from src/ → dist/
#
# Usage: ./build.sh
#
# Output:
#   dist/miniature-guacamole/          - Extracted distribution
#   dist/miniature-guacamole.tar.gz    - Tarball archive
#   dist/miniature-guacamole.zip       - Zip archive
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
DIST_DIR="$ROOT_DIR/dist/miniature-guacamole"
DIST_CLAUDE="$DIST_DIR/.claude"

echo ""
echo -e "${BLUE}Building miniature-guacamole distribution...${NC}"
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

# ----------------------------------------------------------------------------
# Clean dist
# ----------------------------------------------------------------------------

echo "Cleaning dist directory..."
rm -rf "$DIST_DIR"
rm -f "$ROOT_DIR/dist/miniature-guacamole.tar.gz"
rm -f "$ROOT_DIR/dist/miniature-guacamole.zip"
mkdir -p "$DIST_CLAUDE"/{agents,skills,shared,hooks,scripts,memory}

# ----------------------------------------------------------------------------
# Copy framework → dist/.claude/
# ----------------------------------------------------------------------------

echo -e "${GREEN}Copying framework...${NC}"

# Agents
# NOTE: Enterprise-only agents are excluded from the community distribution.
# They are identified by a .enterprise-only marker file in their directory.
# Enterprise agents (excluded from community build):
#   - sage  (TheEngOrg Enterprise — theengorg.wontonwebworks.com/enterprise)
AGENT_COUNT=0
ENTERPRISE_AGENTS=("sage")
for agent_dir in "$FRAMEWORK_DIR/agents"/*; do
    if [[ -d "$agent_dir" ]]; then
        agent_name=$(basename "$agent_dir")
        # Skip enterprise-only agents
        is_enterprise=0
        for ea in "${ENTERPRISE_AGENTS[@]}"; do
            if [[ "$agent_name" == "$ea" ]]; then
                is_enterprise=1
                break
            fi
        done
        if [[ $is_enterprise -eq 1 ]]; then
            echo "  [enterprise] skipping agent: $agent_name"
            continue
        fi
        cp -r "$agent_dir" "$DIST_CLAUDE/agents/"
        AGENT_COUNT=$((AGENT_COUNT + 1))
    fi
done
echo "  agents: $AGENT_COUNT (enterprise agents excluded from community build)"

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

# Note: _shared/ skill resources were migrated into per-skill references/ directories.
# Each skill now bundles its own output-format.md and model-escalation.md.
# No cross-skill copy step needed.

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

# Router (named 'mg', not 'mg-*', so the glob above won't pick it up)
if [[ -f "$FRAMEWORK_DIR/scripts/mg" ]]; then
    cp "$FRAMEWORK_DIR/scripts/mg" "$DIST_CLAUDE/scripts/"
    chmod +x "$DIST_CLAUDE/scripts/mg"
fi

echo "  scripts: $SCRIPT_COUNT (+ mg router)"

# Hooks
if [[ -d "$FRAMEWORK_DIR/hooks" ]]; then
    cp -r "$FRAMEWORK_DIR/hooks"/* "$DIST_CLAUDE/hooks/"
    chmod +x "$DIST_CLAUDE/hooks"/*.sh 2>/dev/null || true
    echo "  hooks: copied"
fi

# Config files
cp "$FRAMEWORK_DIR/settings.json" "$DIST_CLAUDE/"
cp "$FRAMEWORK_DIR/settings.enterprise.json" "$DIST_CLAUDE/"
cp "$FRAMEWORK_DIR/CLAUDE.md" "$DIST_CLAUDE/"
cp "$FRAMEWORK_DIR/team-config.yaml" "$DIST_CLAUDE/"
cp "$FRAMEWORK_DIR/team-config.json" "$DIST_CLAUDE/"

# Enterprise signing public key (for session verification)
if [[ -d "$FRAMEWORK_DIR/keys" ]]; then
  mkdir -p "$DIST_CLAUDE/keys"
  cp "$FRAMEWORK_DIR/keys/enterprise-signing.pub" "$DIST_CLAUDE/keys/" 2>/dev/null || true
  echo "  keys: enterprise-signing.pub"
fi

echo "  config: settings.json, settings.enterprise.json, CLAUDE.md, team-config.*"

# Memory .gitignore
cat > "$DIST_CLAUDE/memory/.gitignore" << 'EOF'
# Ignore all memory files (they're runtime state)
*.json
!.gitignore
EOF

# ----------------------------------------------------------------------------
# Copy installer → dist/
# ----------------------------------------------------------------------------

echo -e "${GREEN}Copying installer...${NC}"

# NOTE: Enterprise-only installer scripts are excluded from the community distribution.
# Enterprise scripts (excluded from community build):
#   - mg-dev-key  (TheEngOrg Enterprise — developer key provisioning, never ships in community)
ENTERPRISE_SCRIPTS=("mg-dev-key")

cp "$INSTALLER_DIR/install.sh" "$DIST_DIR/"
cp "$INSTALLER_DIR/uninstall.sh" "$DIST_DIR/"
cp "$INSTALLER_DIR/web-install.sh" "$DIST_DIR/"
cp "$INSTALLER_DIR/mg-migrate" "$DIST_DIR/"
cp "$INSTALLER_DIR/mg-init" "$DIST_DIR/"
cp "$INSTALLER_DIR/QUICK-START.md" "$DIST_DIR/"
cp "$ROOT_DIR/README.md" "$DIST_DIR/README.md" 2>/dev/null || true

chmod +x "$DIST_DIR/install.sh"
chmod +x "$DIST_DIR/uninstall.sh"
chmod +x "$DIST_DIR/web-install.sh"
chmod +x "$DIST_DIR/mg-migrate"
chmod +x "$DIST_DIR/mg-init"

echo "  install.sh, uninstall.sh, web-install.sh, mg-migrate, mg-init"

# Templates (used by mg-init for project scaffolding)
TEMPLATES_SRC="$ROOT_DIR/src/framework/templates"
if [[ -d "$TEMPLATES_SRC" ]]; then
    cp -r "$TEMPLATES_SRC" "$DIST_DIR/templates"
    echo "  templates/ copied"
fi

# ----------------------------------------------------------------------------
# Generate VERSION.json
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
  "git_sha": "$GIT_SHA",
  "build_date": "$BUILD_DATE",
  "description": "Product Development Team agent system for Claude Code"
}
VERSIONJSON

echo "  version: $VERSION (sha: $GIT_SHA)"

# ----------------------------------------------------------------------------
# Create archives
# ----------------------------------------------------------------------------

echo -e "${GREEN}Creating archives...${NC}"

cd "$ROOT_DIR/dist"
tar -czf miniature-guacamole.tar.gz miniature-guacamole/
zip -rq miniature-guacamole.zip miniature-guacamole/
cd "$ROOT_DIR"

TARBALL_SIZE=$(du -h "$ROOT_DIR/dist/miniature-guacamole.tar.gz" | cut -f1)
ZIP_SIZE=$(du -h "$ROOT_DIR/dist/miniature-guacamole.zip" | cut -f1)

echo "  miniature-guacamole.tar.gz ($TARBALL_SIZE)"
echo "  miniature-guacamole.zip ($ZIP_SIZE)"

# ----------------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------------

echo ""
echo -e "${GREEN}Build complete!${NC}"
echo ""
echo "Distribution: dist/miniature-guacamole/"
echo "  $AGENT_COUNT agents, $SKILL_COUNT skills, $SHARED_COUNT protocols, $SCRIPT_COUNT scripts"
echo ""
echo "Archives:"
echo "  dist/miniature-guacamole.tar.gz ($TARBALL_SIZE)"
echo "  dist/miniature-guacamole.zip ($ZIP_SIZE)"
echo ""
echo "To test:"
echo "  1. bash dist/miniature-guacamole/web-install.sh  # global install"
echo "  2. mg-init /tmp/test-project                     # per-project init"
echo ""
