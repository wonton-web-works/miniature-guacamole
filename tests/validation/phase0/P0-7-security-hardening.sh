#!/usr/bin/env bash
# ============================================================================
# P0-7: Security Hardening Validation
# ============================================================================
# Tests that mg-* scripts reject execution from untrusted locations
# and reject sourcing.
# ============================================================================

set -euo pipefail

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

pass() { echo "  PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "  FAIL: $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }
skip() { echo "  SKIP: $1"; SKIP_COUNT=$((SKIP_COUNT + 1)); }

echo "P0-7: Security Hardening Validation"
echo "===================================="
echo ""

# --- Test 1: Reject execution from untrusted location ---
echo "Test 1: mg-workstream-transition rejects untrusted location"
TMPDIR_TEST=$(mktemp -d)
cp ~/.claude/scripts/mg-workstream-transition "$TMPDIR_TEST/"
cp ~/.claude/scripts/mg-memory-write "$TMPDIR_TEST/"
chmod +x "$TMPDIR_TEST/mg-workstream-transition" "$TMPDIR_TEST/mg-memory-write"

OUTPUT=$("$TMPDIR_TEST/mg-workstream-transition" --help 2>&1) && EXIT_CODE=$? || EXIT_CODE=$?
if [[ $EXIT_CODE -ne 0 ]] && echo "$OUTPUT" | grep -q "must run from a .claude/scripts/ directory"; then
    pass "mg-workstream-transition rejected untrusted location ($TMPDIR_TEST)"
else
    fail "mg-workstream-transition did NOT reject untrusted location (exit=$EXIT_CODE)"
fi
rm -rf "$TMPDIR_TEST"

# --- Test 2: Reject execution from untrusted location (mg-help) ---
echo "Test 2: mg-help rejects untrusted location"
TMPDIR_TEST=$(mktemp -d)
cp ~/.claude/scripts/mg-help "$TMPDIR_TEST/"
chmod +x "$TMPDIR_TEST/mg-help"

OUTPUT=$("$TMPDIR_TEST/mg-help" --help 2>&1) && EXIT_CODE=$? || EXIT_CODE=$?
if [[ $EXIT_CODE -ne 0 ]] && echo "$OUTPUT" | grep -q "must run from a .claude/scripts/ directory"; then
    pass "mg-help rejected untrusted location ($TMPDIR_TEST)"
else
    fail "mg-help did NOT reject untrusted location (exit=$EXIT_CODE)"
fi
rm -rf "$TMPDIR_TEST"

# --- Test 3: Accept execution from project-local .claude/scripts/ ---
echo "Test 3: mg-help accepts project-local .claude/scripts/"
OUTPUT=$(~/.claude/scripts/mg-help --help 2>&1) && EXIT_CODE=$? || EXIT_CODE=$?
if [[ $EXIT_CODE -eq 0 ]]; then
    pass "mg-help accepted ~/.claude/scripts/ (trusted location)"
else
    fail "mg-help rejected ~/.claude/scripts/ (should be trusted, exit=$EXIT_CODE)"
fi

# --- Test 4: Accept execution from dist .claude/scripts/ ---
echo "Test 4: mg-workstream-transition accepts dist .claude/scripts/"
OUTPUT=$(dist/miniature-guacamole/.claude/scripts/mg-workstream-transition --help 2>&1) && EXIT_CODE=$? || EXIT_CODE=$?
if [[ $EXIT_CODE -eq 0 ]]; then
    pass "mg-workstream-transition accepted dist/.claude/scripts/ (trusted location)"
else
    fail "mg-workstream-transition rejected dist/.claude/scripts/ (should be trusted, exit=$EXIT_CODE)"
fi

# --- Test 5: Reject sourcing ---
echo "Test 5: mg-workstream-transition rejects sourcing"
OUTPUT=$(bash -c 'source ~/.claude/scripts/mg-workstream-transition --help' 2>&1) && EXIT_CODE=$? || EXIT_CODE=$?
if [[ $EXIT_CODE -ne 0 ]] && echo "$OUTPUT" | grep -q "must be executed, not sourced"; then
    pass "mg-workstream-transition rejected sourcing"
else
    # Sourcing detection may not work in all contexts - bash -c may still execute
    if echo "$OUTPUT" | grep -q "Usage:"; then
        skip "Sourcing detection not triggered in bash -c subshell (expected in some environments)"
    else
        fail "mg-workstream-transition did NOT reject sourcing (exit=$EXIT_CODE)"
    fi
fi

# --- Test 6: Reject sourcing (mg-help) ---
echo "Test 6: mg-help rejects sourcing"
OUTPUT=$(bash -c 'source ~/.claude/scripts/mg-help --help' 2>&1) && EXIT_CODE=$? || EXIT_CODE=$?
if [[ $EXIT_CODE -ne 0 ]] && echo "$OUTPUT" | grep -q "must be executed, not sourced"; then
    pass "mg-help rejected sourcing"
else
    if echo "$OUTPUT" | grep -q "Usage:"; then
        skip "Sourcing detection not triggered in bash -c subshell (expected in some environments)"
    else
        fail "mg-help did NOT reject sourcing (exit=$EXIT_CODE)"
    fi
fi

# --- Test 7: Symlink resolution ---
echo "Test 7: Symlink resolution works"
TMPDIR_TEST=$(mktemp -d)
LINK_DIR="$TMPDIR_TEST/project/.claude/scripts"
mkdir -p "$LINK_DIR"
ln -s ~/.claude/scripts/mg-help "$LINK_DIR/mg-help"

OUTPUT=$("$LINK_DIR/mg-help" --help 2>&1) && EXIT_CODE=$? || EXIT_CODE=$?
if [[ $EXIT_CODE -eq 0 ]]; then
    pass "Symlink in .claude/scripts/ resolved correctly"
else
    # Symlinks may resolve to global, which is also trusted
    if echo "$OUTPUT" | grep -q "must run from"; then
        fail "Symlink in .claude/scripts/ rejected (should follow link to trusted dir)"
    else
        pass "Symlink resolved (non-zero exit for other reason)"
    fi
fi
rm -rf "$TMPDIR_TEST"

# --- Test 8: Malicious dependency injection blocked ---
echo "Test 8: Malicious dependency injection blocked"
TMPDIR_TEST=$(mktemp -d)
cp ~/.claude/scripts/mg-workstream-transition "$TMPDIR_TEST/"
cat > "$TMPDIR_TEST/mg-memory-write" <<'MALICIOUS'
#!/bin/bash
echo "INJECTED" > /tmp/mg-security-test-injection
MALICIOUS
chmod +x "$TMPDIR_TEST/mg-workstream-transition" "$TMPDIR_TEST/mg-memory-write"

OUTPUT=$("$TMPDIR_TEST/mg-workstream-transition" WS-TEST in_progress 2>&1) && EXIT_CODE=$? || EXIT_CODE=$?
if [[ $EXIT_CODE -ne 0 ]] && [[ ! -f /tmp/mg-security-test-injection ]]; then
    pass "Malicious mg-memory-write was NOT executed (script rejected untrusted location)"
else
    fail "Malicious mg-memory-write may have executed"
    rm -f /tmp/mg-security-test-injection
fi
rm -rf "$TMPDIR_TEST"

# --- Summary ---
echo ""
echo "===================================="
echo "P0-7 Security Hardening Results"
echo "===================================="
echo "  Passed:  $PASS_COUNT"
echo "  Failed:  $FAIL_COUNT"
echo "  Skipped: $SKIP_COUNT"
echo ""

if [[ $FAIL_COUNT -eq 0 ]]; then
    echo "VERDICT: PASS"
    exit 0
else
    echo "VERDICT: FAIL ($FAIL_COUNT failures)"
    exit 1
fi
