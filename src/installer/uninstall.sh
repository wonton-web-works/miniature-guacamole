#!/usr/bin/env bash
# ============================================================================
# miniature-guacamole uninstaller (v3.x)
# ============================================================================
# Removes miniature-guacamole framework from a project's .claude/ directory.
# Preserves user data by default (memory/, user content in CLAUDE.md).
# ============================================================================

set -euo pipefail

# Security hardening - prevent sourcing
if [[ "${BASH_SOURCE[0]:-}" != "$0" ]]; then
    echo "Error: This script must be executed, not sourced" >&2
    return 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default target is current directory
PROJECT_DIR="$PWD"
KEEP_MEMORY=true
PURGE=false
FORCE=false

# ============================================================================
# Helper functions
# ============================================================================

usage() {
    cat <<EOF
miniature-guacamole uninstaller (v3.x)

Usage: $0 [OPTIONS] [PROJECT_DIR]

Options:
  --purge            Remove everything including memory/ (destructive!)
  --remove-memory    Remove memory/ directory (same as --purge)
  --keep-memory      Keep memory/ directory (default)
  --force            Skip confirmation prompt
  --help             Show this help message

Arguments:
  PROJECT_DIR        Target project directory (default: current directory)

Description:
  Removes miniature-guacamole framework from a project's .claude/ directory.
  By default, preserves:
  - .claude/memory/ (user data)
  - User sections of .claude/CLAUDE.md (outside bounded markers)
  - User customizations in .claude/settings.json

  Use --purge to remove everything (including user data).

Examples:
  $0                           # Uninstall from current directory
  $0 /path/to/project          # Uninstall from specific project
  $0 --purge                   # Remove everything including memory
  $0 --force                   # Skip confirmation

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

# ============================================================================
# Parse arguments
# ============================================================================

while [[ $# -gt 0 ]]; do
    case "$1" in
        --purge|--remove-memory)
            PURGE=true
            KEEP_MEMORY=false
            shift
            ;;
        --keep-memory)
            KEEP_MEMORY=true
            PURGE=false
            shift
            ;;
        --force)
            FORCE=true
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
CLAUDE_DIR="$PROJECT_DIR/.claude"
MG_INSTALL_JSON="$CLAUDE_DIR/MG_INSTALL.json"

# ============================================================================
# Banner
# ============================================================================

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  ${RED}miniature-guacamole${NC} Uninstaller                          ${BLUE}║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# Pre-flight checks
# ============================================================================

log_info "Target directory: $PROJECT_DIR"

if [[ ! -d "$CLAUDE_DIR" ]]; then
    log_warning "No .claude/ directory found in: $PROJECT_DIR"
    exit 0
fi

if [[ ! -f "$MG_INSTALL_JSON" ]]; then
    log_warning "No MG_INSTALL.json found - this may not be a miniature-guacamole installation"
    echo "Proceed anyway? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

# ============================================================================
# Confirmation
# ============================================================================

if [[ "$FORCE" != "true" ]]; then
    echo ""
    log_warning "This will remove miniature-guacamole from:"
    echo "  $CLAUDE_DIR"
    echo ""
    echo "The following will be removed:"
    echo "  - agents/"
    echo "  - skills/"
    echo "  - shared/"
    echo "  - scripts/"
    echo "  - hooks/"
    echo "  - schemas/"
    echo "  - team-config.yaml"
    echo "  - team-config.json"
    echo "  - MG_PROJECT"
    echo "  - MG_INSTALL.json"
    echo ""

    if [[ "$PURGE" == "true" ]]; then
        echo -e "${RED}⚠ PURGE MODE - The following will also be removed:${NC}"
        echo "  - memory/ (ALL USER DATA)"
        echo "  - settings.json"
        echo "  - CLAUDE.md"
        echo ""
    else
        echo "The following will be preserved:"
        echo "  - memory/ (user data)"
        echo "  - User sections of CLAUDE.md"
        echo "  - User customizations in settings.json"
        echo ""
    fi

    echo "Continue? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

# ============================================================================
# Remove framework components
# ============================================================================

echo ""
log_info "Removing framework components..."

REMOVED_COUNT=0

# Remove agents
if [[ -d "$CLAUDE_DIR/agents" ]]; then
    rm -rf "$CLAUDE_DIR/agents"
    log_success "Removed agents/"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
fi

# Remove skills
if [[ -d "$CLAUDE_DIR/skills" ]]; then
    rm -rf "$CLAUDE_DIR/skills"
    log_success "Removed skills/"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
fi

# Remove shared
if [[ -d "$CLAUDE_DIR/shared" ]]; then
    rm -rf "$CLAUDE_DIR/shared"
    log_success "Removed shared/"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
fi

# Remove scripts
if [[ -d "$CLAUDE_DIR/scripts" ]]; then
    rm -rf "$CLAUDE_DIR/scripts"
    log_success "Removed scripts/"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
fi

# Remove hooks
if [[ -d "$CLAUDE_DIR/hooks" ]]; then
    rm -rf "$CLAUDE_DIR/hooks"
    log_success "Removed hooks/"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
fi

# Remove schemas
if [[ -d "$CLAUDE_DIR/schemas" ]]; then
    rm -rf "$CLAUDE_DIR/schemas"
    log_success "Removed schemas/"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
fi

# Remove team-config files
if [[ -f "$CLAUDE_DIR/team-config.yaml" ]]; then
    rm "$CLAUDE_DIR/team-config.yaml"
    log_success "Removed team-config.yaml"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
fi

if [[ -f "$CLAUDE_DIR/team-config.json" ]]; then
    rm "$CLAUDE_DIR/team-config.json"
    log_success "Removed team-config.json"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
fi

# Remove markers
if [[ -f "$CLAUDE_DIR/MG_PROJECT" ]]; then
    rm "$CLAUDE_DIR/MG_PROJECT"
    log_success "Removed MG_PROJECT marker"
fi

if [[ -f "$MG_INSTALL_JSON" ]]; then
    rm "$MG_INSTALL_JSON"
    log_success "Removed MG_INSTALL.json"
fi

# ============================================================================
# Handle settings.json
# ============================================================================

if [[ "$PURGE" == "true" ]]; then
    if [[ -f "$CLAUDE_DIR/settings.json" ]]; then
        rm "$CLAUDE_DIR/settings.json"
        log_success "Removed settings.json (purge mode)"
    fi
else
    # Remove MG-specific allow patterns from settings.json
    if [[ -f "$CLAUDE_DIR/settings.json" ]]; then
        log_info "Cleaning MG patterns from settings.json..."

        # Create backup
        BACKUP_FILE="$CLAUDE_DIR/settings.json.backup.$(date +%Y%m%d-%H%M%S)"
        cp "$CLAUDE_DIR/settings.json" "$BACKUP_FILE"

        # Remove MG-specific bash allow patterns
        python3 <<'CLEAN_SETTINGS_SCRIPT'
import json
import os

settings_path = os.environ.get('CLAUDE_DIR') + '/settings.json'

try:
    with open(settings_path, 'r') as f:
        settings = json.load(f)

    # Remove common MG bash patterns (keep generic ones)
    mg_patterns = [
        'Bash(npm:*)',
        'Bash(git:*)',
        'Bash(node:*)',
        'Bash(npx:*)',
        'Bash(pnpm:*)',
        'Bash(yarn:*)',
        'Bash(vitest:*)',
        'Bash(playwright:*)',
        'Bash(tsc:*)',
        'Bash(eslint:*)',
        'Bash(prettier:*)',
    ]

    if 'permissions' in settings and 'allow' in settings['permissions']:
        original_count = len(settings['permissions']['allow'])
        settings['permissions']['allow'] = [
            p for p in settings['permissions']['allow']
            if p not in mg_patterns
        ]
        removed = original_count - len(settings['permissions']['allow'])

        if removed > 0:
            with open(settings_path, 'w') as f:
                json.dump(settings, f, indent=2)
            print(f"  Removed {removed} MG-specific patterns from settings.json")
        else:
            print("  No MG-specific patterns found in settings.json")
    else:
        print("  No permissions section found in settings.json")

except Exception as e:
    print(f"  Warning: Could not clean settings.json: {e}")

CLEAN_SETTINGS_SCRIPT

        log_success "settings.json preserved with user customizations"
        echo "  Backup saved to: $(basename "$BACKUP_FILE")"
    fi
fi

# ============================================================================
# Handle CLAUDE.md
# ============================================================================

if [[ "$PURGE" == "true" ]]; then
    if [[ -f "$CLAUDE_DIR/CLAUDE.md" ]]; then
        rm "$CLAUDE_DIR/CLAUDE.md"
        log_success "Removed CLAUDE.md (purge mode)"
    fi
else
    # Remove content between bounded markers
    if [[ -f "$CLAUDE_DIR/CLAUDE.md" ]]; then
        if grep -q "<!-- BEGIN MINIATURE-GUACAMOLE -->" "$CLAUDE_DIR/CLAUDE.md" 2>/dev/null; then
            log_info "Removing framework documentation from CLAUDE.md..."

            # Create backup
            BACKUP_FILE="$CLAUDE_DIR/CLAUDE.md.backup.$(date +%Y%m%d-%H%M%S)"
            cp "$CLAUDE_DIR/CLAUDE.md" "$BACKUP_FILE"

            # Remove content between markers
            python3 <<'CLEAN_CLAUDE_MD_SCRIPT'
import os
import re

claude_md_path = os.environ.get('CLAUDE_DIR') + '/CLAUDE.md'

try:
    with open(claude_md_path, 'r') as f:
        content = f.read()

    # Remove content between markers
    cleaned = re.sub(
        r'<!-- BEGIN MINIATURE-GUACAMOLE -->.*?<!-- END MINIATURE-GUACAMOLE -->\n*',
        '',
        content,
        flags=re.DOTALL
    )

    # Remove the "---" separator if it's now at the start
    cleaned = re.sub(r'^\s*---\s*\n\s*# Existing Project Context\s*\n', '', cleaned)
    cleaned = re.sub(r'^\s*---\s*\n', '', cleaned)

    # Only write if something changed
    if cleaned != content:
        with open(claude_md_path, 'w') as f:
            f.write(cleaned)
        print("  Removed framework documentation from CLAUDE.md")
    else:
        print("  No framework markers found in CLAUDE.md")

except Exception as e:
    print(f"  Warning: Could not clean CLAUDE.md: {e}")

CLEAN_CLAUDE_MD_SCRIPT

            log_success "CLAUDE.md preserved with user content"
            echo "  Backup saved to: $(basename "$BACKUP_FILE")"
        else
            log_success "CLAUDE.md preserved (no framework markers found)"
        fi
    fi
fi

# ============================================================================
# Handle memory directory
# ============================================================================

if [[ "$PURGE" == "true" ]]; then
    if [[ -d "$CLAUDE_DIR/memory" ]]; then
        rm -rf "$CLAUDE_DIR/memory"
        log_warning "Removed memory/ (ALL USER DATA)"
    fi
else
    if [[ -d "$CLAUDE_DIR/memory" ]]; then
        log_info "Preserved memory/ (user data)"
    fi
fi

# ============================================================================
# Cleanup empty .claude directory
# ============================================================================

# Check if .claude is now empty (or only contains backups/memory)
if [[ -d "$CLAUDE_DIR" ]]; then
    REMAINING=$(find "$CLAUDE_DIR" -mindepth 1 -maxdepth 1 ! -name "*.backup.*" ! -name "memory" | wc -l | tr -d ' ')

    if [[ "$REMAINING" -eq 0 ]] && [[ "$PURGE" == "true" ]]; then
        # Only remove if purge mode and nothing left
        rmdir "$CLAUDE_DIR" 2>/dev/null || true
        if [[ ! -d "$CLAUDE_DIR" ]]; then
            log_success "Removed empty .claude/ directory"
        fi
    fi
fi

# ============================================================================
# Summary
# ============================================================================

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  Uninstall Complete!                                         ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_info "Summary:"
echo "  Removed $REMOVED_COUNT framework components from:"
echo "  $CLAUDE_DIR"
echo ""

if [[ "$PURGE" == "true" ]]; then
    log_warning "PURGE MODE: All files including user data were removed"
else
    log_info "Preserved:"
    if [[ -d "$CLAUDE_DIR/memory" ]]; then
        echo "  ✓ memory/ (user data)"
    fi
    if [[ -f "$CLAUDE_DIR/settings.json" ]]; then
        echo "  ✓ settings.json (user customizations)"
    fi
    if [[ -f "$CLAUDE_DIR/CLAUDE.md" ]]; then
        echo "  ✓ CLAUDE.md (user content)"
    fi

    echo ""
    log_info "Backup files remain in $CLAUDE_DIR/"
    echo "  Remove them manually if desired: rm $CLAUDE_DIR/*.backup.*"
fi

echo ""
