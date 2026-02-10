#!/usr/bin/env bash
# ============================================================================
# miniature-guacamole web installer
# ============================================================================
# Downloads and installs miniature-guacamole from GitHub releases.
# Usage: curl -fsSL https://raw.githubusercontent.com/USER/REPO/main/web-install.sh | bash
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

# Configuration
GITHUB_REPO="yourusername/miniature-guacamole"  # Update this with actual repo
RELEASE_TAG="latest"  # Can be overridden with --version
PROJECT_DIR="$PWD"
FORCE=false
INSTALL_CONFIG_CACHE=false

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
miniature-guacamole web installer

Usage: $0 [OPTIONS] [PROJECT_DIR]

Options:
  --version TAG      Install specific version (default: latest)
  --force            Force re-installation
  --config-cache     Also install config cache to ~/.claude/.mg-configs/
  --help             Show this help message

Arguments:
  PROJECT_DIR        Target project directory (default: current directory)

Examples:
  $0                                  # Install latest to current directory
  $0 --version v2.0.0                # Install specific version
  $0 /path/to/project                # Install to specific project
  $0 --force --config-cache          # Force re-install with config cache

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

# ============================================================================
# Banner
# ============================================================================

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  ${GREEN}miniature-guacamole${NC} Web Installer                        ${BLUE}║${NC}"
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
if [[ -f "$PROJECT_DIR/.claude/MG_INSTALL.json" ]] && [[ "$FORCE" != "true" ]]; then
    log_warning "Project already has miniature-guacamole installed"
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
# Run installer
# ============================================================================

echo ""
log_info "Running installer..."

INSTALLER="$EXTRACTED_DIR/install.sh"
if [[ ! -f "$INSTALLER" ]]; then
    log_error "Installer script not found: $INSTALLER"
    exit 1
fi

chmod +x "$INSTALLER"

# Build installer arguments
INSTALLER_ARGS=()
if [[ "$FORCE" == "true" ]]; then
    INSTALLER_ARGS+=("--force")
fi
if [[ "$INSTALL_CONFIG_CACHE" == "true" ]]; then
    INSTALLER_ARGS+=("--config-cache")
fi
INSTALLER_ARGS+=("$PROJECT_DIR")

# Run installer
if ! bash "$INSTALLER" "${INSTALLER_ARGS[@]}"; then
    log_error "Installation failed"
    exit 1
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
echo -e "${GREEN}║${NC}  Web Installation Complete!                                  ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_info "miniature-guacamole has been installed to:"
echo "  $PROJECT_DIR/.claude/"
echo ""

log_info "Next steps:"
echo "  1. cd $PROJECT_DIR"
echo "  2. Review settings: .claude/settings.json"
echo "  3. Review context: .claude/CLAUDE.md"
echo "  4. Add scripts to PATH: export PATH=\"\$PATH:$PROJECT_DIR/.claude/scripts\""
echo ""

log_info "Documentation:"
echo "  GitHub: https://github.com/$GITHUB_REPO"
echo ""
