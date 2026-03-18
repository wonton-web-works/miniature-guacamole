#!/usr/bin/env bash
# ============================================================================
# miniature-guacamole global CLI installer
# ============================================================================
# Downloads and installs miniature-guacamole globally.
# Puts mg, mg-init, and all mg-* scripts on PATH via ~/.local/bin/.
#
# Usage: curl -fsSL https://raw.githubusercontent.com/wonton-web-works/miniature-guacamole/main/src/installer/web-install.sh | bash
# ============================================================================

set -euo pipefail

# Security hardening - prevent sourcing
# When piped (curl | bash), BASH_SOURCE[0] is unset — skip the guard in that case
if [[ -n "${BASH_SOURCE[0]:-}" ]] && [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
    echo "Error: This script must be executed, not sourced" >&2
    return 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GITHUB_REPO="wonton-web-works/miniature-guacamole"
RELEASE_TAG="latest"  # Can be overridden with --version
MG_HOME="$HOME/.miniature-guacamole"
BIN_DIR="$HOME/.local/bin"
FORCE=false

# ============================================================================
# Helper functions
# ============================================================================

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

usage() {
    cat <<EOF
miniature-guacamole global installer

Usage: $0 [OPTIONS]

Options:
  --version TAG      Install specific version (default: latest)
  --force            Force re-installation
  --help             Show this help message

Examples:
  $0                                  # Install latest globally
  $0 --version v2.1.0                # Install specific version
  $0 --force                         # Force re-install

EOF
}

# ============================================================================
# Parse arguments
# ============================================================================

while [[ $# -gt 0 ]]; do
    case "$1" in
        --version)
            RELEASE_TAG="$2"
            shift 2
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
            log_error "Unexpected argument: $1"
            echo "Run '$0 --help' for usage information."
            exit 1
            ;;
    esac
done

# ============================================================================
# Banner
# ============================================================================

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  ${GREEN}miniature-guacamole${NC} Global Installer                      ${BLUE}║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# Pre-flight checks
# ============================================================================

log_info "Checking requirements..."

# Check for required commands
for cmd in curl tar; do
    if ! command -v "$cmd" &> /dev/null; then
        log_error "Required command not found: $cmd"
        exit 1
    fi
done

log_success "All requirements met"

# Check if already installed
if [[ -f "$MG_HOME/VERSION.json" ]] && [[ "$FORCE" != "true" ]]; then
    INSTALLED_VERSION=$(python3 -c "import json; print(json.load(open('$MG_HOME/VERSION.json')).get('version', 'unknown'))" 2>/dev/null || echo "unknown")
    log_warning "miniature-guacamole $INSTALLED_VERSION is already installed at $MG_HOME"
    echo "Use --force to re-install"
    exit 0
fi

# ============================================================================
# Download release
# ============================================================================

echo ""
log_info "Downloading miniature-guacamole $RELEASE_TAG..."

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf '$TEMP_DIR'" EXIT

# Construct download URL
if [[ "$RELEASE_TAG" == "latest" ]]; then
    DOWNLOAD_URL="https://github.com/$GITHUB_REPO/releases/latest/download/miniature-guacamole.tar.gz"
else
    DOWNLOAD_URL="https://github.com/$GITHUB_REPO/releases/download/$RELEASE_TAG/miniature-guacamole.tar.gz"
fi

# Download tarball
TARBALL="$TEMP_DIR/miniature-guacamole.tar.gz"
if ! curl -fsSL -o "$TARBALL" "$DOWNLOAD_URL"; then
    log_error "Failed to download release from: $DOWNLOAD_URL"
    log_error "Make sure the release exists and the URL is correct"
    exit 1
fi

log_success "Downloaded release tarball"

# Download checksum if available
CHECKSUM_URL="${DOWNLOAD_URL}.sha256"
CHECKSUM_FILE="$TEMP_DIR/miniature-guacamole.tar.gz.sha256"
if curl -fsSL -o "$CHECKSUM_FILE" "$CHECKSUM_URL" 2>/dev/null; then
    log_info "Verifying checksum..."

    cd "$TEMP_DIR"
    if command -v sha256sum &> /dev/null; then
        if sha256sum -c "$CHECKSUM_FILE" &> /dev/null; then
            log_success "Checksum verified"
        else
            log_error "Checksum verification failed"
            exit 1
        fi
    elif command -v shasum &> /dev/null; then
        if shasum -a 256 -c "$CHECKSUM_FILE" &> /dev/null; then
            log_success "Checksum verified"
        else
            log_error "Checksum verification failed"
            exit 1
        fi
    else
        log_warning "No checksum tool found, skipping verification"
    fi
    cd - > /dev/null
else
    log_warning "No checksum file found, skipping verification"
fi

# ============================================================================
# Extract tarball
# ============================================================================

echo ""
log_info "Extracting archive..."

cd "$TEMP_DIR"
tar -xzf "$TARBALL"
cd - > /dev/null

# Find extracted directory
EXTRACTED_DIR="$TEMP_DIR/miniature-guacamole"
if [[ ! -d "$EXTRACTED_DIR" ]]; then
    # Try to find it
    EXTRACTED_DIR=$(find "$TEMP_DIR" -maxdepth 1 -type d -name "miniature-guacamole*" | head -1)
    if [[ -z "$EXTRACTED_DIR" ]] || [[ ! -d "$EXTRACTED_DIR" ]]; then
        log_error "Failed to find extracted directory"
        exit 1
    fi
fi

log_success "Extracted to temporary directory"

# ============================================================================
# Install to ~/.miniature-guacamole/
# ============================================================================

echo ""
log_info "Installing to $MG_HOME..."

# Clean previous install
if [[ -d "$MG_HOME" ]]; then
    rm -rf "$MG_HOME"
fi

# Copy extracted dist contents to MG_HOME
cp -r "$EXTRACTED_DIR" "$MG_HOME"

log_success "Framework bundle installed to $MG_HOME"

# ============================================================================
# Symlink scripts to ~/.local/bin/
# ============================================================================

echo ""
log_info "Creating symlinks in $BIN_DIR..."

mkdir -p "$BIN_DIR"

# Remove existing mg* symlinks that point into MG_HOME (clean re-install)
for existing in "$BIN_DIR"/mg*; do
    if [[ -L "$existing" ]]; then
        link_target=$(readlink "$existing" 2>/dev/null || true)
        if [[ "$link_target" == *"/.miniature-guacamole/"* ]]; then
            rm "$existing"
        fi
    fi
done

# Symlink each mg-* script from .claude/scripts/
LINK_COUNT=0
for script in "$MG_HOME/.claude/scripts"/mg*; do
    if [[ -f "$script" ]]; then
        script_name=$(basename "$script")
        ln -sf "$script" "$BIN_DIR/$script_name"
        LINK_COUNT=$((LINK_COUNT + 1))
    fi
done

# Symlink mg-init from the top-level bundle
if [[ -f "$MG_HOME/mg-init" ]]; then
    ln -sf "$MG_HOME/mg-init" "$BIN_DIR/mg-init"
    # Don't double-count if mg-init was already linked from scripts/
    if [[ ! -f "$MG_HOME/.claude/scripts/mg-init" ]]; then
        LINK_COUNT=$((LINK_COUNT + 1))
    fi
fi

log_success "Created $LINK_COUNT symlinks in $BIN_DIR"

# ============================================================================
# Ensure ~/.local/bin is on PATH
# ============================================================================

echo ""
if echo "$PATH" | tr ':' '\n' | grep -qx "$BIN_DIR"; then
    log_success "$BIN_DIR is already on PATH"
else
    log_warning "$BIN_DIR is not on PATH"

    # Detect shell and append to rc file
    SHELL_NAME=$(basename "${SHELL:-/bin/bash}")
    RC_FILE=""

    case "$SHELL_NAME" in
        zsh)  RC_FILE="$HOME/.zshrc" ;;
        bash)
            if [[ -f "$HOME/.bashrc" ]]; then
                RC_FILE="$HOME/.bashrc"
            elif [[ -f "$HOME/.bash_profile" ]]; then
                RC_FILE="$HOME/.bash_profile"
            fi
            ;;
    esac

    PATH_LINE='export PATH="$HOME/.local/bin:$PATH"'

    if [[ -n "$RC_FILE" ]]; then
        # Only append if not already present
        if ! grep -qF '.local/bin' "$RC_FILE" 2>/dev/null; then
            echo "" >> "$RC_FILE"
            echo "# Added by miniature-guacamole installer" >> "$RC_FILE"
            echo "$PATH_LINE" >> "$RC_FILE"
            log_success "Added $BIN_DIR to PATH in $RC_FILE"
        else
            log_info "$BIN_DIR reference already exists in $RC_FILE"
        fi
        echo ""
        log_warning "Restart your shell or run: source $RC_FILE"
    else
        echo ""
        log_warning "Add this to your shell profile:"
        echo "  $PATH_LINE"
    fi
fi

# ============================================================================
# Cleanup
# ============================================================================

log_info "Cleaning up temporary files..."
rm -rf "$TEMP_DIR"
log_success "Cleanup complete"

# ============================================================================
# Success
# ============================================================================

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  Installation Complete!                                      ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_info "mg and mg-init are now available globally."
echo ""
echo "  Bundle:  $MG_HOME"
echo "  Scripts: $BIN_DIR/mg*"
echo ""

log_info "Next steps:"
echo "  1. cd your-project"
echo "  2. mg-init"
echo "  3. Start Claude Code and run: /mg-assess Build something"
echo ""

log_info "Documentation:"
echo "  GitHub: https://github.com/$GITHUB_REPO"
echo ""
