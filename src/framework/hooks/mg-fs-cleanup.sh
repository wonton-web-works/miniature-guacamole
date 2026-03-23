#!/usr/bin/env bash
# ============================================================================
# mg-fs-cleanup — Safe file deletion within project boundary
# ============================================================================
# Allows controlled file removal only within .claude/memory/ and other
# approved project paths. Enforces boundary checks and logs all deletions.
#
# Usage:
#   .claude/hooks/mg-fs-cleanup.sh <file-path>
#   .claude/hooks/mg-fs-cleanup.sh <file-path> [<file-path>...]
#
# Exit codes:
#   0 — all files removed successfully
#   1 — path violation or error
# ============================================================================

set -euo pipefail

# Project root detection
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Approved deletion paths (relative to project root)
APPROVED_PATHS=(
  ".claude/memory/"
  ".claude/memory/.archive/"
)

log() {
  echo "[mg-fs-cleanup] $1"
}

is_approved_path() {
  local filepath="$1"
  local realpath
  realpath="$(cd "$(dirname "$filepath")" 2>/dev/null && pwd)/$(basename "$filepath")" || return 1

  for approved in "${APPROVED_PATHS[@]}"; do
    local full_approved="$PROJECT_ROOT/$approved"
    if [[ "$realpath" == "$full_approved"* ]]; then
      return 0
    fi
  done
  return 1
}

if [ $# -eq 0 ]; then
  echo "Usage: mg-fs-cleanup.sh <file-path> [<file-path>...]" >&2
  exit 1
fi

ERRORS=0
for filepath in "$@"; do
  if [ ! -e "$filepath" ]; then
    log "SKIP: $filepath (does not exist)"
    continue
  fi

  if ! is_approved_path "$filepath"; then
    log "BLOCKED: $filepath is outside approved paths" >&2
    ERRORS=$((ERRORS + 1))
    continue
  fi

  if [ -d "$filepath" ]; then
    log "BLOCKED: $filepath is a directory (only files allowed)" >&2
    ERRORS=$((ERRORS + 1))
    continue
  fi

  python3 -c "import os; os.remove('$filepath')"
  log "REMOVED: $filepath"
done

if [ $ERRORS -gt 0 ]; then
  exit 1
fi
exit 0
