#!/usr/bin/env bash
# ============================================================================
# Block --no-verify Hook (vendored replacement for npx block-no-verify)
# ============================================================================
# Prevents agents from using --no-verify or --no-gpg-sign flags on git
# commands, ensuring hooks and signing are never bypassed.
#
# Checks both tool_input.command (string) and tool_input.args (array) to
# prevent bypass via alternative tool schemas. Also normalizes whitespace
# and strips escape sequences before matching.
# ============================================================================

INPUT=$(cat)

# Extract command string and args array
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')
ARGS=$(echo "$INPUT" | jq -r '(.tool_input.args // []) | join(" ")')

# Combine and normalize: collapse whitespace, strip backslash escapes, tabs
COMBINED="$COMMAND $ARGS"
NORMALIZED=$(echo "$COMBINED" | tr '\t\r' '  ' | sed 's/\\//g' | tr -s ' ')

# Check for forbidden flags
if echo "$NORMALIZED" | grep -qiE '(--no-verify|--no-gpg-sign|commit\.gpgsign\s*=\s*false|gpg\.sign\s*=\s*false)'; then
  echo "BLOCKED: --no-verify, --no-gpg-sign, and gpg sign overrides are not allowed." >&2
  echo "Git hooks and signing must not be bypassed." >&2
  exit 2
fi

exit 0
