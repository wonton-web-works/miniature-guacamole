#!/usr/bin/env bash
# ============================================================================
# miniature-guacamole installer (convenience wrapper)
# ============================================================================
# Runs ./build.sh if needed, then delegates to dist/miniature-guacamole/install.sh
#
# Usage: ./install.sh [OPTIONS] [PROJECT_DIR]
# ============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_INSTALLER="$ROOT_DIR/dist/miniature-guacamole/install.sh"

# Build if dist doesn't exist
if [[ ! -f "$DIST_INSTALLER" ]]; then
    echo "Building distribution first..."
    "$ROOT_DIR/build.sh"
    echo ""
fi

# Delegate to dist installer
exec "$DIST_INSTALLER" "$@"
