#!/usr/bin/env bash
# ============================================================================
# miniature-guacamole Config Cache Installer
# ============================================================================
# Installs miniature-guacamole config cache to ~/.claude/.mg-configs/
# This is the ONLY global directory used by miniature-guacamole v2.x
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
TEMPLATES_DIR="$ROOT_DIR/templates"
DIST_SCRIPTS_DIR="$ROOT_DIR/dist/miniature-guacamole/.claude/scripts"
CONFIG_CACHE_DIR="$HOME/.claude/.mg-configs"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  ${GREEN}miniature-guacamole v2.0${NC} - Config Cache Installer        ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  Project-Local Architecture                                  ${BLUE}║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ----------------------------------------------------------------------------
# Pre-flight checks
# ----------------------------------------------------------------------------

# Check if templates directory exists
if [ ! -d "$TEMPLATES_DIR" ]; then
    echo -e "${RED}Error: Templates directory not found at $TEMPLATES_DIR${NC}"
    echo "Run './scripts/build-templates.sh' first to build templates."
    exit 1
fi

# Check required template files
required_files=(
    "$TEMPLATES_DIR/settings.json"
    "$TEMPLATES_DIR/CLAUDE.md"
    "$TEMPLATES_DIR/VERSION.json"
    "$TEMPLATES_DIR/README.md"
    "$TEMPLATES_DIR/mg-init"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}Error: Required template file missing: $(basename "$file")${NC}"
        echo "Run './scripts/build-templates.sh' first to build templates."
        exit 1
    fi
done

# ----------------------------------------------------------------------------
# Create config cache directory structure
# ----------------------------------------------------------------------------

echo -e "${GREEN}Creating config cache directory...${NC}"

if [ -d "$CONFIG_CACHE_DIR" ]; then
    # Backup existing config cache
    backup="$CONFIG_CACHE_DIR.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${YELLOW}Backing up existing config cache to $backup${NC}"
    mv "$CONFIG_CACHE_DIR" "$backup"
fi

mkdir -p "$CONFIG_CACHE_DIR"/{scripts,templates/{agents,skills,shared,hooks}}

echo -e "  ${GREEN}✓${NC} ~/.claude/.mg-configs/"

# ----------------------------------------------------------------------------
# Install templates
# ----------------------------------------------------------------------------

echo ""
echo -e "${GREEN}Installing templates...${NC}"

# Copy agents
if [ -d "$TEMPLATES_DIR/agents" ]; then
    cp -r "$TEMPLATES_DIR/agents"/* "$CONFIG_CACHE_DIR/templates/agents/" 2>/dev/null || true
    agent_count=$(ls -1 "$CONFIG_CACHE_DIR/templates/agents" | wc -l | xargs)
    echo -e "  ${GREEN}✓${NC} agents/ ($agent_count templates)"
fi

# Copy skills
if [ -d "$TEMPLATES_DIR/skills" ]; then
    cp -r "$TEMPLATES_DIR/skills"/* "$CONFIG_CACHE_DIR/templates/skills/" 2>/dev/null || true
    skill_count=$(ls -1 "$CONFIG_CACHE_DIR/templates/skills" | wc -l | xargs)
    echo -e "  ${GREEN}✓${NC} skills/ ($skill_count templates)"
fi

# Copy shared protocols
if [ -d "$TEMPLATES_DIR/shared" ]; then
    cp -r "$TEMPLATES_DIR/shared"/* "$CONFIG_CACHE_DIR/templates/shared/" 2>/dev/null || true
    protocol_count=$(ls -1 "$CONFIG_CACHE_DIR/templates/shared" | wc -l | xargs)
    echo -e "  ${GREEN}✓${NC} shared/ ($protocol_count protocols)"
fi

# Copy hooks
if [ -d "$TEMPLATES_DIR/hooks" ]; then
    cp -r "$TEMPLATES_DIR/hooks"/* "$CONFIG_CACHE_DIR/templates/hooks/" 2>/dev/null || true
    chmod +x "$CONFIG_CACHE_DIR/templates/hooks"/*.sh 2>/dev/null || true
    hook_count=$(ls -1 "$CONFIG_CACHE_DIR/templates/hooks" | wc -l | xargs)
    echo -e "  ${GREEN}✓${NC} hooks/ ($hook_count hooks)"
fi

# Copy configuration files
cp "$TEMPLATES_DIR/settings.json" "$CONFIG_CACHE_DIR/templates/"
echo -e "  ${GREEN}✓${NC} settings.json"

cp "$TEMPLATES_DIR/CLAUDE.md" "$CONFIG_CACHE_DIR/templates/"
echo -e "  ${GREEN}✓${NC} CLAUDE.md"

# Copy mg-init script
cp "$TEMPLATES_DIR/mg-init" "$CONFIG_CACHE_DIR/scripts/"
chmod +x "$CONFIG_CACHE_DIR/scripts/mg-init"
echo -e "  ${GREEN}✓${NC} mg-init"

# ----------------------------------------------------------------------------
# Install utility scripts
# ----------------------------------------------------------------------------

echo ""
echo -e "${GREEN}Installing utility scripts...${NC}"

# Copy mg-* scripts from dist
if [ -d "$DIST_SCRIPTS_DIR" ]; then
    script_count=0
    for script_file in "$DIST_SCRIPTS_DIR"/mg-*; do
        if [ -f "$script_file" ]; then
            script_name=$(basename "$script_file")
            # Don't overwrite mg-init (already installed from templates)
            if [ "$script_name" != "mg-init" ]; then
                cp "$script_file" "$CONFIG_CACHE_DIR/scripts/"
                chmod +x "$CONFIG_CACHE_DIR/scripts/$script_name"
                echo -e "  ${GREEN}✓${NC} $script_name"
                script_count=$((script_count + 1))
            fi
        fi
    done

    if [ $script_count -eq 0 ]; then
        echo -e "  ${YELLOW}⚠${NC} No additional scripts found"
    fi
else
    echo -e "  ${YELLOW}⚠${NC} Scripts directory not found (run build-dist.sh first)"
fi

# ----------------------------------------------------------------------------
# Install VERSION.json and README.md
# ----------------------------------------------------------------------------

echo ""
echo -e "${GREEN}Installing metadata...${NC}"

# Update VERSION.json with current timestamp
python3 <<PYTHON_VERSION
import json
import os
from datetime import datetime

template_path = os.path.join(os.environ['TEMPLATES_DIR'], 'VERSION.json')
output_path = os.path.join(os.environ['CONFIG_CACHE_DIR'], 'VERSION.json')

with open(template_path, 'r') as f:
    version_data = json.load(f)

# Update timestamps
now = datetime.utcnow().isoformat() + 'Z'
version_data['installed_at'] = now
version_data['last_updated'] = now

with open(output_path, 'w') as f:
    json.dump(version_data, f, indent=2)

print(f"Version: {version_data['version']}")
PYTHON_VERSION

echo -e "  ${GREEN}✓${NC} VERSION.json"

cp "$TEMPLATES_DIR/README.md" "$CONFIG_CACHE_DIR/"
echo -e "  ${GREEN}✓${NC} README.md"

# ----------------------------------------------------------------------------
# Add scripts to PATH (optional)
# ----------------------------------------------------------------------------

echo ""
echo -e "${YELLOW}Optional: Add mg-* scripts to PATH${NC}"
echo ""
echo "To use mg-* commands globally, add to your shell profile:"
echo ""
echo -e "  ${BLUE}export PATH=\"\$HOME/.claude/.mg-configs/scripts:\$PATH\"${NC}"
echo ""
echo "Or create symlinks to /usr/local/bin:"
echo ""
echo -e "  ${BLUE}cd ~/.claude/.mg-configs/scripts && for f in mg-*; do ln -s \"\$PWD/\$f\" /usr/local/bin/; done${NC}"
echo ""

# ----------------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------------

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  Config cache installation complete!                        ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Config cache location:"
echo -e "  ${BLUE}~/.claude/.mg-configs/${NC}"
echo ""
echo "Contents:"
echo "  - templates/ (agents, skills, shared, hooks, config files)"
echo "  - scripts/ (mg-* utility commands)"
echo "  - VERSION.json"
echo "  - README.md"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo "1. Initialize a project with miniature-guacamole:"
echo ""
echo -e "   ${GREEN}~/.claude/.mg-configs/scripts/mg-init /path/to/project${NC}"
echo ""
echo "   Or from within a project directory:"
echo ""
echo -e "   ${GREEN}~/.claude/.mg-configs/scripts/mg-init${NC}"
echo ""
echo "2. Use mg-* utilities for memory operations:"
echo ""
echo "   - mg-memory-read     - Read JSON memory files"
echo "   - mg-memory-write    - Atomically update JSON"
echo "   - mg-workstream-*    - Workstream management"
echo "   - mg-gate-check      - Quality gate checks"
echo "   - mg-help            - Show command help"
echo ""
echo -e "${BLUE}Data Isolation (NDA-safe):${NC}"
echo "  ✓ Config cache: Shared templates only (no project data)"
echo "  ✓ Project memory: .claude/memory/ (project-local, never shared)"
echo "  ✓ No code or data crosses between clients or projects"
echo ""
echo -e "${YELLOW}Migration from v1.x:${NC}"
echo ""
echo "  v1.x used global ~/.claude/ installation"
echo "  v2.x uses project-local .claude/ + minimal config cache"
echo ""
echo "  Old global installation can be removed:"
echo -e "  ${BLUE}rm -rf ~/.claude/agents ~/.claude/skills ~/.claude/shared${NC}"
echo ""
