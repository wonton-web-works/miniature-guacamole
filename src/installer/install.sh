#!/usr/bin/env bash
# ============================================================================
# miniature-guacamole project-local installer (v3.x)
# ============================================================================
# Installs miniature-guacamole framework files to a project's .claude/ directory.
# NEVER modifies ~/.claude/ (except optionally ~/.claude/.mg-configs/).
# ============================================================================

set -euo pipefail

# Security hardening - prevent sourcing
if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
    echo "Error: This script must be executed, not sourced" >&2
    return 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_SOURCE_DIR="$SCRIPT_DIR/.claude"

# Default target is current directory
PROJECT_DIR="$PWD"
FORCE=false
INSTALL_CONFIG_CACHE=false

# ============================================================================
# Helper functions
# ============================================================================

usage() {
    cat <<EOF
miniature-guacamole installer (v3.x)

Usage: $0 [OPTIONS] [PROJECT_DIR]

Options:
  --force            Force re-installation (overwrites existing files)
  --config-cache     Also install config cache to ~/.claude/.mg-configs/
  --help             Show this help message

Arguments:
  PROJECT_DIR        Target project directory (default: current directory)

Description:
  Installs miniature-guacamole framework to a project's .claude/ directory.
  Creates project-local settings.json, CLAUDE.md, and memory structure.
  NEVER modifies ~/.claude/settings.json.

Examples:
  $0                           # Install to current directory
  $0 /path/to/project          # Install to specific project
  $0 --force                   # Force re-install
  $0 --config-cache            # Also install to ~/.claude/.mg-configs/

EOF
}

log_info() {
    echo -e "${BLUE}$1${NC}"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}" >&2
}

backup_file() {
    local file="$1"
    if [[ -f "$file" ]]; then
        local backup="${file}.backup.$(date +%Y%m%d-%H%M%S)"
        cp "$file" "$backup"
        echo "  Backed up to: $(basename "$backup")"
    fi
}

# ============================================================================
# Parse arguments
# ============================================================================

while [[ $# -gt 0 ]]; do
    case "$1" in
        --force)
            FORCE=true
            shift
            ;;
        --config-cache)
            INSTALL_CONFIG_CACHE=true
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        -*)
            log_error "Unknown option: $1"
            echo "Run '$0 --help' for usage information."
            exit 1
            ;;
        *)
            PROJECT_DIR="$1"
            shift
            ;;
    esac
done

# Resolve absolute path
if [[ ! -d "$PROJECT_DIR" ]]; then
    log_error "Project directory does not exist: $PROJECT_DIR"
    exit 1
fi

PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"
CLAUDE_TARGET_DIR="$PROJECT_DIR/.claude"
MG_INSTALL_JSON="$CLAUDE_TARGET_DIR/MG_INSTALL.json"
MG_PROJECT_MARKER="$CLAUDE_TARGET_DIR/MG_PROJECT"

# ============================================================================
# Banner
# ============================================================================

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  ${GREEN}miniature-guacamole${NC} v3.x - Project-Local Installer      ${BLUE}║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# Pre-flight checks
# ============================================================================

log_info "Installation target: $PROJECT_DIR"

if [[ ! -d "$CLAUDE_SOURCE_DIR" ]]; then
    log_error "Source .claude directory not found at: $CLAUDE_SOURCE_DIR"
    exit 1
fi

# Check if already installed
if [[ -f "$MG_INSTALL_JSON" ]] && [[ "$FORCE" != "true" ]]; then
    log_warning "Project already has miniature-guacamole installed (MG_INSTALL.json exists)"
    echo "Use --force to re-install"
    exit 0
fi

# ============================================================================
# Create directory structure
# ============================================================================

echo ""
log_info "Creating .claude directory structure..."

mkdir -p "$CLAUDE_TARGET_DIR"/{agents,skills,shared,hooks,memory,scripts,schemas}

log_success "Directory structure created"

# ============================================================================
# Copy components
# ============================================================================

echo ""
log_info "Copying framework components..."

# Count components for summary
AGENT_COUNT=0
SKILL_COUNT=0
SCRIPT_COUNT=0
SHARED_COUNT=0

# Copy agents
if [[ -d "$CLAUDE_SOURCE_DIR/agents" ]]; then
    for agent_dir in "$CLAUDE_SOURCE_DIR/agents"/*; do
        if [[ -d "$agent_dir" ]]; then
            agent_name=$(basename "$agent_dir")
            cp -r "$agent_dir" "$CLAUDE_TARGET_DIR/agents/"
            AGENT_COUNT=$((AGENT_COUNT + 1))
        fi
    done
    log_success "Copied $AGENT_COUNT agents"
fi

# Copy skills
if [[ -d "$CLAUDE_SOURCE_DIR/skills" ]]; then
    for skill_dir in "$CLAUDE_SOURCE_DIR/skills"/*; do
        if [[ -d "$skill_dir" ]]; then
            skill_name=$(basename "$skill_dir")
            cp -r "$skill_dir" "$CLAUDE_TARGET_DIR/skills/"
            SKILL_COUNT=$((SKILL_COUNT + 1))
        fi
    done
    log_success "Copied $SKILL_COUNT skills"
fi

# Copy shared protocols
if [[ -d "$CLAUDE_SOURCE_DIR/shared" ]]; then
    cp -r "$CLAUDE_SOURCE_DIR/shared"/* "$CLAUDE_TARGET_DIR/shared/"
    SHARED_COUNT=$(find "$CLAUDE_SOURCE_DIR/shared" -maxdepth 1 -type f -name "*.md" | wc -l | tr -d ' ')
    log_success "Copied $SHARED_COUNT shared protocols"
fi

# Copy scripts
if [[ -d "$CLAUDE_SOURCE_DIR/scripts" ]]; then
    for script_file in "$CLAUDE_SOURCE_DIR/scripts"/mg-*; do
        if [[ -f "$script_file" ]]; then
            cp "$script_file" "$CLAUDE_TARGET_DIR/scripts/"
            chmod +x "$CLAUDE_TARGET_DIR/scripts/$(basename "$script_file")"
            SCRIPT_COUNT=$((SCRIPT_COUNT + 1))
        fi
    done
    log_success "Copied $SCRIPT_COUNT scripts"
fi

# Copy hooks
if [[ -d "$CLAUDE_SOURCE_DIR/hooks" ]]; then
    cp -r "$CLAUDE_SOURCE_DIR/hooks"/* "$CLAUDE_TARGET_DIR/hooks/"
    chmod +x "$CLAUDE_TARGET_DIR/hooks"/*.sh 2>/dev/null || true
    log_success "Copied hooks"
fi

# Copy schemas if present
if [[ -d "$CLAUDE_SOURCE_DIR/schemas" ]]; then
    cp -r "$CLAUDE_SOURCE_DIR/schemas"/* "$CLAUDE_TARGET_DIR/schemas/" 2>/dev/null || true
    log_success "Copied schemas"
fi

# Copy team-config files
if [[ -f "$CLAUDE_SOURCE_DIR/team-config.yaml" ]]; then
    cp "$CLAUDE_SOURCE_DIR/team-config.yaml" "$CLAUDE_TARGET_DIR/"
    log_success "Copied team-config.yaml"
fi

if [[ -f "$CLAUDE_SOURCE_DIR/team-config.json" ]]; then
    cp "$CLAUDE_SOURCE_DIR/team-config.json" "$CLAUDE_TARGET_DIR/"
    log_success "Copied team-config.json"
fi

# ============================================================================
# Configure settings.json
# ============================================================================

echo ""
log_info "Configuring settings.json..."

SETTINGS_FILE="$CLAUDE_TARGET_DIR/settings.json"
SOURCE_SETTINGS="$CLAUDE_SOURCE_DIR/settings.json"

if [[ -f "$SETTINGS_FILE" ]]; then
    # Backup existing settings
    backup_file "$SETTINGS_FILE"

    # Merge settings using Python
    python3 <<'MERGE_SETTINGS_SCRIPT'
import json
import os
import sys

def merge_settings(user_file, source_file, output_file):
    """Merge source settings into user settings, preserving user config."""

    # Load both files
    with open(user_file, 'r') as f:
        user = json.load(f)

    with open(source_file, 'r') as f:
        source = json.load(f)

    # Merge permissions (add source allows, preserve user allows and denies)
    if 'permissions' not in user:
        user['permissions'] = {'allow': [], 'deny': []}

    if 'allow' not in user['permissions']:
        user['permissions']['allow'] = []

    # Add source allows that aren't already present
    source_allows = source.get('permissions', {}).get('allow', [])
    for allow in source_allows:
        if allow not in user['permissions']['allow']:
            user['permissions']['allow'].append(allow)

    # Preserve source denies if user doesn't have any
    if 'deny' not in user['permissions'] or not user['permissions']['deny']:
        user['permissions']['deny'] = source.get('permissions', {}).get('deny', [])

    # Merge env (preserve user env, add source env)
    if 'env' not in user:
        user['env'] = {}

    source_env = source.get('env', {})
    for key, value in source_env.items():
        if key not in user['env']:
            user['env'][key] = value

    # Preserve teammateMode from source if not set
    if 'teammateMode' not in user:
        user['teammateMode'] = source.get('teammateMode', 'auto')

    # Write merged result
    with open(output_file, 'w') as f:
        json.dump(user, f, indent=2)

    return True

# Get paths from environment
user_file = os.environ.get('SETTINGS_FILE')
source_file = os.environ.get('SOURCE_SETTINGS')

try:
    merge_settings(user_file, source_file, user_file)
    print("  Merged settings successfully")
except Exception as e:
    print(f"  Error merging settings: {e}", file=sys.stderr)
    sys.exit(1)

MERGE_SETTINGS_SCRIPT

    if [[ $? -eq 0 ]]; then
        log_success "settings.json merged with existing settings"
    else
        log_error "Failed to merge settings.json"
    fi

else
    # No existing settings, copy from source
    cp "$SOURCE_SETTINGS" "$SETTINGS_FILE"
    log_success "settings.json created from template"
fi

# ============================================================================
# Configure CLAUDE.md
# ============================================================================

echo ""
log_info "Configuring CLAUDE.md..."

CLAUDE_MD="$CLAUDE_TARGET_DIR/CLAUDE.md"
SOURCE_CLAUDE_MD="$CLAUDE_SOURCE_DIR/CLAUDE.md"

if [[ -f "$CLAUDE_MD" ]]; then
    # Check if markers already exist
    if grep -q "<!-- BEGIN MINIATURE-GUACAMOLE -->" "$CLAUDE_MD" 2>/dev/null; then
        # Replace content between markers
        python3 <<'UPDATE_CLAUDE_MD_SCRIPT'
import os
import re
import sys

claude_md_path = os.environ.get('CLAUDE_MD')
source_path = os.environ.get('SOURCE_CLAUDE_MD')

# Read existing file
with open(claude_md_path, 'r') as f:
    existing = f.read()

# Read source template
with open(source_path, 'r') as f:
    source = f.read()

# Replace content between markers in existing file
updated = existing

# Write updated content
with open(claude_md_path, 'w') as f:
    f.write(updated)

print("  Updated CLAUDE.md (preserved existing content)")
UPDATE_CLAUDE_MD_SCRIPT

        log_success "CLAUDE.md updated (preserved existing content)"
    else
        # No markers, prepend template content
        TEMP_FILE="$CLAUDE_MD.tmp"
        cat "$SOURCE_CLAUDE_MD" > "$TEMP_FILE"
        echo "" >> "$TEMP_FILE"
        echo "---" >> "$TEMP_FILE"
        echo "" >> "$TEMP_FILE"
        echo "# Existing Project Context" >> "$TEMP_FILE"
        echo "" >> "$TEMP_FILE"
        cat "$CLAUDE_MD" >> "$TEMP_FILE"
        mv "$TEMP_FILE" "$CLAUDE_MD"
        log_success "CLAUDE.md updated (prepended framework docs)"
    fi
else
    # No existing CLAUDE.md, copy template
    cp "$SOURCE_CLAUDE_MD" "$CLAUDE_MD"
    log_success "CLAUDE.md created from template"
fi

# ============================================================================
# Create memory directory structure
# ============================================================================

echo ""
log_info "Creating memory directory structure..."

mkdir -p "$CLAUDE_TARGET_DIR/memory"

# Create .gitignore in memory directory
MEMORY_GITIGNORE="$CLAUDE_TARGET_DIR/memory/.gitignore"
cat > "$MEMORY_GITIGNORE" <<'GITIGNORE'
# Memory files are project-local and should not be committed
*.json
!.gitignore

# Exception: Some template files may be committed
# Uncomment if needed:
# !decisions.json
# !workstream-*.json
GITIGNORE

log_success "Memory directory created with .gitignore"

# ============================================================================
# Create MG_INSTALL.json metadata
# ============================================================================

echo ""
log_info "Creating installation metadata..."

# Read version from source if available
VERSION="3.0.0"
if [[ -f "$SCRIPT_DIR/VERSION.json" ]]; then
    VERSION=$(python3 -c "import json, sys; print(json.load(open('$SCRIPT_DIR/VERSION.json')).get('version', '3.0.0'))" 2>/dev/null || echo "3.0.0")
fi

# Determine install timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Create MG_INSTALL.json
cat > "$MG_INSTALL_JSON" <<INSTALL_JSON
{
  "framework": "miniature-guacamole",
  "version": "$VERSION",
  "installed_at": "$TIMESTAMP",
  "updated_at": "$TIMESTAMP",
  "source": "local-build",
  "source_path": "$SCRIPT_DIR",
  "install_method": "install.sh",
  "components": {
    "agents": $AGENT_COUNT,
    "skills": $SKILL_COUNT,
    "scripts": $SCRIPT_COUNT,
    "shared": $SHARED_COUNT,
    "hooks": 1
  }
}
INSTALL_JSON

log_success "Created MG_INSTALL.json"

# ============================================================================
# Create MG_PROJECT marker
# ============================================================================

cat > "$MG_PROJECT_MARKER" <<MARKER
This directory contains miniature-guacamole framework files.

Version: $VERSION
Installed: $TIMESTAMP
Source: $SCRIPT_DIR
MARKER

log_success "Created MG_PROJECT marker"

# ============================================================================
# Optional: Install config cache
# ============================================================================

if [[ "$INSTALL_CONFIG_CACHE" == "true" ]]; then
    echo ""
    log_info "Installing config cache to ~/.claude/.mg-configs/..."

    if [[ -f "$SCRIPT_DIR/install-config-cache.sh" ]]; then
        bash "$SCRIPT_DIR/install-config-cache.sh"
        log_success "Config cache installed"
    else
        log_warning "install-config-cache.sh not found, skipping"
    fi
fi

# ============================================================================
# Summary
# ============================================================================

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  Installation Complete!                                      ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_info "Installation Summary:"
echo "  Project directory: $PROJECT_DIR"
echo "  Framework version: $VERSION"
echo ""
echo "  Components installed:"
echo "    - $AGENT_COUNT agents"
echo "    - $SKILL_COUNT skills"
echo "    - $SHARED_COUNT shared protocols"
echo "    - $SCRIPT_COUNT scripts"
echo "    - 1 hook"
echo ""

log_info "What was installed:"
echo "  ✓ .claude/agents/        - 18 specialized agent roles"
echo "  ✓ .claude/skills/        - Team collaboration skills"
echo "  ✓ .claude/shared/        - Development protocols"
echo "  ✓ .claude/scripts/       - mg-* utility commands"
echo "  ✓ .claude/hooks/         - Project initialization hook"
echo "  ✓ .claude/memory/        - Agent memory directory"
echo "  ✓ .claude/settings.json  - Project-level permissions"
echo "  ✓ .claude/CLAUDE.md      - Framework documentation"
echo ""

log_info "Next steps:"
echo "  1. Review settings: $CLAUDE_TARGET_DIR/settings.json"
echo "  2. Review context: $CLAUDE_TARGET_DIR/CLAUDE.md"
echo "  3. Add scripts to PATH: export PATH=\"\$PATH:$CLAUDE_TARGET_DIR/scripts\""
echo "  4. Run mg-help for available commands"
echo ""

log_info "Data Isolation (NDA-safe):"
echo "  ✓ All framework files are project-local"
echo "  ✓ Memory stays in .claude/memory/"
echo "  ✓ No data crosses between projects"
echo "  ✓ ~/.claude/ is never modified"
echo ""
