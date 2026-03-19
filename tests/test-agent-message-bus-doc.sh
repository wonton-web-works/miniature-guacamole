#!/usr/bin/env bash
# Test suite: docs/agent-message-bus.md validation
# Run from repo root: bash tests/test-agent-message-bus-doc.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC="$REPO_ROOT/docs/agent-message-bus.md"

PASS=0
FAIL=0

pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "=== Agent Message Bus Doc Tests ==="
echo ""

# 1. File exists
echo "--- Existence ---"
if [[ -f "$DOC" ]]; then
  pass "docs/agent-message-bus.md exists"
else
  fail "docs/agent-message-bus.md does not exist"
fi

# Guard: remaining tests need the file to exist
if [[ ! -f "$DOC" ]]; then
  echo ""
  echo "Skipping content tests — file does not exist."
  echo ""
  echo "Results: $PASS passed, $FAIL failed"
  exit 1
fi

# 2. JSON schema section with all required envelope fields
echo ""
echo "--- JSON Schema Fields ---"
for field in '"id"' '"from"' '"to"' '"workstream_id"' '"timestamp"' '"type"' '"subject"' '"body"' '"requires_response"'; do
  if grep -q "$field" "$DOC"; then
    pass "Schema contains field $field"
  else
    fail "Schema missing field $field"
  fi
done

# 3. All four message type sections
echo ""
echo "--- Message Type Sections ---"
for type in info question blocker handoff; do
  if grep -qi "### $type\|## $type\|\`$type\`\b\|type.*$type\|$type.*type" "$DOC"; then
    pass "Contains message type: $type"
  else
    fail "Missing message type: $type"
  fi
done

# 4. At least 4 JSON code blocks (one example per type)
echo ""
echo "--- JSON Code Block Count ---"
JSON_BLOCK_COUNT=$(grep -c '```json' "$DOC" || true)
if [[ "$JSON_BLOCK_COUNT" -ge 4 ]]; then
  pass "Contains $JSON_BLOCK_COUNT JSON code blocks (>= 4 required)"
else
  fail "Only $JSON_BLOCK_COUNT JSON code block(s) found — need at least 4 (one per message type)"
fi

# 5. Read/write patterns section
echo ""
echo "--- Read/Write Patterns Section ---"
if grep -qi "read.*pattern\|write.*pattern\|patterns.*read\|patterns.*write\|## read\|## write\|read/write\|when to read\|when to write" "$DOC"; then
  pass "Contains read/write patterns section"
else
  fail "Missing read/write patterns section"
fi

# 6. Cross-reference to technical-design-agent-comms.md
echo ""
echo "--- Cross-Reference to Phase 2 Design ---"
if grep -q "technical-design-agent-comms" "$DOC"; then
  pass "Contains cross-reference to technical-design-agent-comms.md"
else
  fail "Missing cross-reference to technical-design-agent-comms.md"
fi

# 7. Valid markdown — no broken local file links
echo ""
echo "--- Local Link Validity ---"
BROKEN=0
DOC_DIR="$(dirname "$DOC")"
# Extract local markdown link targets (exclude http URLs and pure anchors)
while IFS= read -r href; do
  [[ "$href" == http* ]] && continue
  [[ "$href" == "#"* ]] && continue
  resolved="$DOC_DIR/$href"
  if [[ ! -e "$resolved" ]]; then
    fail "Broken local link: $href"
    BROKEN=$((BROKEN + 1))
  fi
done < <(grep -oE '\[([^]]+)\]\(([^)]+)\)' "$DOC" | sed 's/.*](\(.*\))/\1/' | grep -v '^http' | grep -v '^#')
if [[ "$BROKEN" -eq 0 ]]; then
  pass "No broken local file links"
fi

# Summary
echo ""
echo "==================================="
echo "Results: $PASS passed, $FAIL failed"
echo "==================================="

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
exit 0
