#!/usr/bin/env bash
# ============================================================================
# verify-session.sh — Cryptographic enterprise session verification
# ============================================================================
# Verifies that ext-session.json was signed by the PrivateEnterprise server
# using Ed25519 asymmetric signing. The public key ships with the framework;
# the private key lives server-side only.
#
# Usage:
#   verify-session.sh [session-file]
#
# Exit codes:
#   0 — valid session (enterprise mode)
#   1 — invalid/missing/expired session (fall back to community)
#   2 — verification tooling not available
#
# This script is called by the Sage bootstrap check. On failure, the system
# silently falls back to community mode — it never blocks work.
# ============================================================================

set -euo pipefail

# ─────────────────────────────────────────────────
# Locate files
# ─────────────────────────────────────────────────

SESSION_FILE="${1:-${HOME}/.claude/ext-session.json}"
MG_HOME="${MG_HOME:-${HOME}/.miniature-guacamole}"

# Public key: check framework install, then project-local
PUB_KEY=""
for candidate in \
  "${MG_HOME}/.claude/keys/enterprise-signing.pub" \
  "${HOME}/.claude/keys/enterprise-signing.pub" \
  "${PWD}/.claude/keys/enterprise-signing.pub"; do
  if [[ -f "$candidate" ]]; then
    PUB_KEY="$candidate"
    break
  fi
done

if [[ -z "$PUB_KEY" ]]; then
  echo "verify-session: public key not found — cannot verify" >&2
  exit 1
fi

if [[ ! -f "$SESSION_FILE" ]]; then
  exit 1
fi

# ─────────────────────────────────────────────────
# Dependency check
# ─────────────────────────────────────────────────

if ! command -v openssl &>/dev/null; then
  echo "verify-session: openssl not found — cannot verify signature" >&2
  exit 2
fi

HAS_JQ=false
if command -v jq &>/dev/null; then
  HAS_JQ=true
fi

# ─────────────────────────────────────────────────
# Extract signature and payload
# ─────────────────────────────────────────────────

if $HAS_JQ; then
  SIGNATURE_B64=$(jq -r '.signature // empty' "$SESSION_FILE")
  # Canonical payload = session JSON without the signature field, keys sorted
  PAYLOAD=$(jq -cS 'del(.signature)' "$SESSION_FILE")
else
  # Best-effort without jq
  SIGNATURE_B64=$(grep -o '"signature"[[:space:]]*:[[:space:]]*"[^"]*"' "$SESSION_FILE" \
    | head -1 | sed 's/.*:.*"\(.*\)"/\1/')
  # Without jq, canonical form is unreliable — fail open
  echo "verify-session: jq required for signature verification" >&2
  exit 2
fi

if [[ -z "$SIGNATURE_B64" ]]; then
  echo "verify-session: no signature in session file" >&2
  exit 1
fi

# ─────────────────────────────────────────────────
# Check devMode — dev keys skip signature verification
# ─────────────────────────────────────────────────

if $HAS_JQ; then
  DEV_MODE=$(jq -r '.devMode // false' "$SESSION_FILE")
  if [[ "$DEV_MODE" == "true" ]]; then
    # Dev mode sessions (from mg-dev-key) are valid without signature
    # They are local-only and non-expiring — for framework development
    exit 0
  fi
fi

# ─────────────────────────────────────────────────
# Check expiry
# ─────────────────────────────────────────────────

if $HAS_JQ; then
  EXPIRES_AT=$(jq -r '.license.expiresAt // empty' "$SESSION_FILE")
  if [[ -n "$EXPIRES_AT" ]]; then
    EXPIRES_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${EXPIRES_AT%%.*}" "+%s" 2>/dev/null \
      || date -d "${EXPIRES_AT}" "+%s" 2>/dev/null \
      || echo "0")
    NOW_EPOCH=$(date "+%s")
    if [[ "$EXPIRES_EPOCH" -gt 0 && "$NOW_EPOCH" -gt "$EXPIRES_EPOCH" ]]; then
      echo "verify-session: license expired at ${EXPIRES_AT}" >&2
      exit 1
    fi
  fi
fi

# ─────────────────────────────────────────────────
# Verify Ed25519 signature
# ─────────────────────────────────────────────────

# Create temp files for verification
TMPDIR_VERIFY=$(mktemp -d)
trap 'command rm -rf "$TMPDIR_VERIFY"' EXIT

echo -n "$PAYLOAD" > "${TMPDIR_VERIFY}/payload.bin"
echo "$SIGNATURE_B64" | base64 -d > "${TMPDIR_VERIFY}/signature.bin" 2>/dev/null \
  || echo "$SIGNATURE_B64" | base64 --decode > "${TMPDIR_VERIFY}/signature.bin" 2>/dev/null

# Verify with openssl
VERIFY_RESULT=$(openssl pkeyutl \
  -verify \
  -pubin \
  -inkey "$PUB_KEY" \
  -in "${TMPDIR_VERIFY}/payload.bin" \
  -sigfile "${TMPDIR_VERIFY}/signature.bin" 2>&1) || true

if echo "$VERIFY_RESULT" | grep -qi "signature verified\|verified ok\|verified OK"; then
  exit 0
else
  echo "verify-session: signature verification failed" >&2
  exit 1
fi
