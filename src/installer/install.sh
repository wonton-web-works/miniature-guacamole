#!/usr/bin/env bash
# ============================================================================
# miniature-guacamole project-local installer (thin wrapper)
# ============================================================================
# Delegates all install logic to install-lib.sh via mg_install_framework().
# ============================================================================

# Security hardening - prevent sourcing
# When piped (curl | bash), BASH_SOURCE[0] is unset — skip the guard in that case
if [[ -n "${BASH_SOURCE[0]:-}" ]] && [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
    echo "Error: This script must be executed, not sourced" >&2
    return 1
fi

set -euo pipefail

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source the install library
# shellcheck source=install-lib.sh
source "$SCRIPT_DIR/install-lib.sh"

# ============================================================================
# Parse CLI arguments
# ============================================================================

PROJECT_DIR="$PWD"
FORCE=false
INSTALL_CONFIG_CACHE=false
STANDALONE=false
MG_EXTRA_ARGS=()

usage() {
    cat <<EOF
miniature-guacamole installer

Usage: $0 [OPTIONS] [PROJECT_DIR]

Options:
  --force                  Force re-installation (overwrites existing files)
  --config-cache           Also install config cache to ~/.claude/.mg-configs/
  --standalone             Copy all framework files even when a global install exists at ~/.claude/
  --skip-settings-merge    Skip settings.json creation/merge entirely
  --skip-claude-md         Skip CLAUDE.md creation/update entirely
  --help                   Show this help message

Arguments:
  PROJECT_DIR        Target project directory (default: current directory)

Description:
  Installs miniature-guacamole framework to a project's .claude/ directory.
  Creates project-local settings.json, CLAUDE.md, and memory structure.
  NEVER modifies ~/.claude/settings.json.

  When a global install is detected at ~/.claude/ (agents/, skills/, shared/ all
  present), the installer skips copying framework files to the project, since they
  are already available globally. Use --standalone to override this behavior and
  copy everything project-locally.

Examples:
  $0                           # Install to current directory
  $0 /path/to/project          # Install to specific project
  $0 --force                   # Force re-install
  $0 --standalone              # Force project-local copy even with global install
  $0 --config-cache            # Also install to ~/.claude/.mg-configs/

EOF
}

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
        --standalone)
            STANDALONE=true
            shift
            ;;
        --skip-settings-merge)
            MG_EXTRA_ARGS+=("--skip-settings-merge")
            shift
            ;;
        --skip-claude-md)
            MG_EXTRA_ARGS+=("--skip-claude-md")
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        -*)
            echo "Error: Unknown option: $1" >&2
            echo "Run '$0 --help' for usage information."
            exit 1
            ;;
        *)
            PROJECT_DIR="$1"
            shift
            ;;
    esac
done

# ============================================================================
# Build mg_install_framework flags and invoke
# ============================================================================

MG_ARGS=("--target" "$PROJECT_DIR" "--source" "$SCRIPT_DIR")

[[ "$FORCE"      == "true" ]] && MG_ARGS+=("--force")
[[ "$STANDALONE" == "true" ]] && MG_ARGS+=("--standalone")
[[ "${#MG_EXTRA_ARGS[@]}" -gt 0 ]] && MG_ARGS+=("${MG_EXTRA_ARGS[@]}")

mg_install_framework "${MG_ARGS[@]}"
STATUS=$?

# ============================================================================
# Optional: Install config cache (wrapper-only feature)
# ============================================================================

if [[ "$INSTALL_CONFIG_CACHE" == "true" ]] && [[ $STATUS -eq 0 || $STATUS -eq 3 ]]; then
    echo ""
    echo "Installing config cache to ~/.claude/.mg-configs/..."

    if [[ -f "$SCRIPT_DIR/install-config-cache.sh" ]]; then
        bash "$SCRIPT_DIR/install-config-cache.sh"
    else
        echo "Warning: install-config-cache.sh not found, skipping" >&2
    fi
fi

exit $STATUS
