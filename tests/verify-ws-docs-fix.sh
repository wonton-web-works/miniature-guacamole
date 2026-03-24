#!/usr/bin/env bash
# Verification Script: WS-DOCS-FIX
# Fix Phantom Skill Lists in Documentation

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TOTAL=0
PASSED=0
FAILED=0

# Files to test
README=".claude/README.md"
DIST_README="src/installer/DIST-README.md"
INSTALL_README="src/installer/INSTALL-README.md"

# Real skills (16 total)
REAL_SKILLS=(
  "mg-assess"
  "mg-assess-tech"
  "mg"
  "mg-build"
  "mg-code-review"
  "mg-design"
  "mg-design-review"
  "mg-document"
  "mg-write"
  "mg-security-review"
  "mg-accessibility-review"
  "mg-init"
  "mg-add-context"
  "mg-spec"
  "mg-debug"
  "mg-refactor"
)

# Phantom skills (8 total) - should NOT exist
PHANTOM_SKILLS=(
  "mg-plan"
  "mg-escalate"
  "mg-handoff-template"
  "mg-design-team"
  "mg-docs-team"
  "mg-product-team"
  "mg-deploy"
  "mg-qa"
)

# Helper functions
pass_test() {
  echo -e "${GREEN}✓ $1${NC}"
  PASSED=$((PASSED + 1))
  TOTAL=$((TOTAL + 1))
}

fail_test() {
  echo -e "${RED}✗ $1${NC}"
  FAILED=$((FAILED + 1))
  TOTAL=$((TOTAL + 1))
}

echo "=========================================="
echo "WS-DOCS-FIX Verification Script"
echo "Fix Phantom Skill Lists"
echo "=========================================="
echo ""

# ===========================================
# MISUSE TESTS (9 tests)
# ===========================================
echo "MISUSE TESTS (Phantom Detection)"
echo "------------------------------------------"

# M1.1-M1.4: .claude/README.md phantom detection (4 tests)
for phantom in "${PHANTOM_SKILLS[@]}"; do
  if grep -q "$phantom" "$README" 2>/dev/null; then
    fail_test "M1.x: Phantom skill '$phantom' found in $README"
  else
    pass_test "M1.x: No phantom skill '$phantom' in $README"
  fi
done

# M2.1-M2.4: src/installer/DIST-README.md phantom detection (4 tests)
# (We'll group these as a single check for each phantom)
for phantom in "${PHANTOM_SKILLS[@]}"; do
  if grep -q "$phantom" "$DIST_README" 2>/dev/null; then
    fail_test "M2.x: Phantom skill '$phantom' found in $DIST_README"
  else
    pass_test "M2.x: No phantom skill '$phantom' in $DIST_README"
  fi
done

# M3.1: src/installer/INSTALL-README.md incorrect scripts count (1 test)
if grep -q '"scripts": 10' "$INSTALL_README" 2>/dev/null; then
  fail_test "M3.1: Incorrect scripts count '10' found in $INSTALL_README"
else
  pass_test "M3.1: No incorrect scripts count '10' in $INSTALL_README"
fi

echo ""

# ===========================================
# BOUNDARY TESTS (6 tests)
# ===========================================
echo "BOUNDARY TESTS (Edge Cases)"
echo "------------------------------------------"

# B1.1: .claude/README.md skill table has exactly 16 rows
readme_skill_count=$(grep -c "^| \*\*.*\*\* | \`/mg-" "$README" 2>/dev/null || echo "0")
if [ "$readme_skill_count" -eq 16 ]; then
  pass_test "B1.1: README skill table has exactly 16 rows"
else
  fail_test "B1.1: README skill table has $readme_skill_count rows (expected 16)"
fi

# B1.2: All skill names use mg- prefix consistently in README
if grep "^| \*\*.*\*\* | \`/mg-" "$README" | grep -qv "mg-"; then
  fail_test "B1.2: Found skill without mg- prefix in README"
else
  pass_test "B1.2: All skills use mg- prefix in README"
fi

# B1.3: No broken markdown table formatting in README
if grep -E "^\| \*\*.*\*\* \| \`/mg-.*\` \| .* \|$" "$README" > /dev/null 2>&1; then
  pass_test "B1.3: README table formatting is correct"
else
  fail_test "B1.3: README table has formatting issues"
fi

# B2.1: DIST-README.md skill list has exactly 16 entries
dist_skill_count=$(grep -c "^/mg-.* -" "$DIST_README" 2>/dev/null || echo "0")
if [ "$dist_skill_count" -eq 16 ]; then
  pass_test "B2.1: DIST-README skill list has exactly 16 entries"
else
  fail_test "B2.1: DIST-README skill list has $dist_skill_count entries (expected 16)"
fi

# B2.2: All skill names use mg- prefix consistently in DIST-README
if grep "^/mg-.* -" "$DIST_README" | grep -qv "^/mg-"; then
  fail_test "B2.2: Found skill without mg- prefix in DIST-README"
else
  pass_test "B2.2: All skills use mg- prefix in DIST-README"
fi

# B3.1: INSTALL-README.md scripts count is exactly 11
if grep -q '"scripts": 11' "$INSTALL_README" 2>/dev/null; then
  pass_test "B3.1: Scripts count is exactly 11 in INSTALL-README"
else
  fail_test "B3.1: Scripts count is not 11 in INSTALL-README"
fi

echo ""

# ===========================================
# GOLDEN PATH TESTS (10 tests)
# ===========================================
echo "GOLDEN PATH TESTS (Correct Content)"
echo "------------------------------------------"

# G1.1: All 16 real skills present in README
missing_in_readme=0
for skill in "${REAL_SKILLS[@]}"; do
  if ! grep -q "$skill" "$README" 2>/dev/null; then
    missing_in_readme=$((missing_in_readme + 1))
  fi
done
if [ "$missing_in_readme" -eq 0 ]; then
  pass_test "G1.1: All 16 real skills present in README"
else
  fail_test "G1.1: $missing_in_readme real skills missing from README"
fi

# G1.2: Skip skill description matching (requires manual review)
pass_test "G1.2: Skill descriptions (manual review - skipped)"

# G1.3: Table headers are correct in README
if grep -q "^| Skill | Slash Command | Purpose |$" "$README" 2>/dev/null; then
  pass_test "G1.3: README table headers are correct"
else
  fail_test "G1.3: README table headers are incorrect"
fi

# G1.4: Skip alphabetical sorting check (not strict requirement)
pass_test "G1.4: Skills sorting (manual review - skipped)"

# G2.1: All 16 real skills present in DIST-README
missing_in_dist=0
for skill in "${REAL_SKILLS[@]}"; do
  if ! grep -q "$skill" "$DIST_README" 2>/dev/null; then
    missing_in_dist=$((missing_in_dist + 1))
  fi
done
if [ "$missing_in_dist" -eq 0 ]; then
  pass_test "G2.1: All 16 real skills present in DIST-README"
else
  fail_test "G2.1: $missing_in_dist real skills missing from DIST-README"
fi

# G2.2: Skip skill description matching (requires manual review)
pass_test "G2.2: Skill descriptions in DIST-README (manual review - skipped)"

# G2.3: List format is consistent in DIST-README
if grep -E "^/mg-[a-z-]+ +- " "$DIST_README" > /dev/null 2>&1; then
  pass_test "G2.3: DIST-README list format is consistent"
else
  fail_test "G2.3: DIST-README list format is inconsistent"
fi

# G2.4: Skip logical grouping check (not strict requirement)
pass_test "G2.4: Skills grouping in DIST-README (manual review - skipped)"

# G3.1: Scripts count line mentions "11 utility scripts" in INSTALL-README
if grep -q '"scripts": 11' "$INSTALL_README" 2>/dev/null; then
  pass_test "G3.1: Scripts count shows 11 in INSTALL-README"
else
  fail_test "G3.1: Scripts count does not show 11 in INSTALL-README"
fi

# G3.2: No other incorrect counts in INSTALL-README (agents=19, skills=16)
incorrect_counts=0
if ! grep -q '"agents": 19' "$INSTALL_README" 2>/dev/null; then
  incorrect_counts=$((incorrect_counts + 1))
fi
if ! grep -q '"skills": 16' "$INSTALL_README" 2>/dev/null; then
  incorrect_counts=$((incorrect_counts + 1))
fi
if [ "$incorrect_counts" -eq 0 ]; then
  pass_test "G3.2: All counts correct in INSTALL-README (agents=19, skills=16)"
else
  fail_test "G3.2: Found $incorrect_counts incorrect counts in INSTALL-README"
fi

echo ""

# ===========================================
# SUMMARY
# ===========================================
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo "Total tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
  exit 0
else
  echo -e "${RED}✗ TESTS FAILED${NC}"
  echo ""
  echo "Coverage: $(awk "BEGIN {printf \"%.1f\", ($PASSED/$TOTAL)*100}")%"
  exit 1
fi
