#!/usr/bin/env bash
# =============================================================================
# build-shared.test.sh
#
# Tests for WS-COMPAT-1: build.sh _shared/ copy step
#
# Validates that after build.sh runs:
#   1. Each skill dir in dist/ has a references/ subdirectory
#   2. references/output-format.md exists in every skill dir
#   3. references/model-escalation.md exists in every skill dir
#   4. No ../_shared/ references remain in any dist SKILL.md
#   5. No bare _shared/ references remain in dist SKILL.md content
#      (outside code examples — the test targets the constitution bullet pattern)
#   6. Source src/framework/skills/_shared/ is unchanged after build
#
# Test ordering: misuse → boundary → golden path (CAD protocol)
#
# Usage:
#   ./tests/compat/build-shared.test.sh
#
# Exit codes:
#   0  All tests passed
#   1  One or more tests failed
# =============================================================================

set -uo pipefail

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

DIST_SKILLS="$ROOT_DIR/dist/miniature-guacamole/.claude/skills"
SRC_SHARED="$ROOT_DIR/src/framework/skills/_shared"

# Expected shared files to be bundled into references/
SHARED_FILES=("output-format.md" "model-escalation.md")

# All 16 skill names (mirrors the TypeScript test list)
ALL_SKILLS=(
  mg-accessibility-review
  mg-add-context
  mg-assess
  mg-assess-tech
  mg-build
  mg-code-review
  mg-debug
  mg-design
  mg-design-review
  mg-document
  mg-init
  mg-leadership-team
  mg-refactor
  mg-security-review
  mg-spec
  mg-write
)

# ---------------------------------------------------------------------------
# Test harness
# ---------------------------------------------------------------------------
PASS=0
FAIL=0
FAILURES=()

pass() {
  PASS=$((PASS + 1))
  printf "  [PASS] %s\n" "$1"
}

fail() {
  FAIL=$((FAIL + 1))
  FAILURES+=("$1")
  printf "  [FAIL] %s\n" "$1"
}

section() {
  printf "\n=== %s ===\n" "$1"
}

# ---------------------------------------------------------------------------
# Pre-flight: dist must exist (build.sh must have run)
# ---------------------------------------------------------------------------

if [[ ! -d "$DIST_SKILLS" ]]; then
  printf "\nERROR: %s does not exist.\n" "$DIST_SKILLS"
  printf "Run ./build.sh before running this test.\n\n"
  exit 1
fi

# ---------------------------------------------------------------------------
# MISUSE TESTS
# Confirm that non-compliant patterns are detectable using synthetic temp dirs.
# Tests the detection logic, not the current state of the dist/ directory.
# ---------------------------------------------------------------------------

section "MISUSE: non-compliant patterns are detectable"

# Misuse 1: A skill SKILL.md with ../_shared/ ref is detectable
_tmp_skill_md="$(mktemp)"
printf 'Follow `../_shared/output-format.md` for progress\n' > "$_tmp_skill_md"
if grep -q '\.\./\_shared/' "$_tmp_skill_md" 2>/dev/null; then
  pass "MISUSE-1: ../_shared/ reference pattern is detectable in a file"
else
  fail "MISUSE-1: Failed to detect ../_shared/ reference in synthetic file"
fi
rm -f "$_tmp_skill_md"

# Misuse 2: A missing references/ subdirectory is detectable
_tmp_skill_dir="$(mktemp -d)"
if [[ ! -d "$_tmp_skill_dir/references" ]]; then
  pass "MISUSE-2: Missing references/ dir is detectable (dir check logic works)"
else
  fail "MISUSE-2: references/ dir detection logic broken"
fi
rm -rf "$_tmp_skill_dir"

# Misuse 3: A missing references/output-format.md is detectable
_tmp_skill_dir="$(mktemp -d)"
mkdir -p "$_tmp_skill_dir/references"
if [[ ! -f "$_tmp_skill_dir/references/output-format.md" ]]; then
  pass "MISUSE-3: Missing references/output-format.md is detectable"
else
  fail "MISUSE-3: File presence check logic broken"
fi
rm -rf "$_tmp_skill_dir"

# Misuse 4: A missing references/model-escalation.md is detectable
_tmp_skill_dir="$(mktemp -d)"
mkdir -p "$_tmp_skill_dir/references"
if [[ ! -f "$_tmp_skill_dir/references/model-escalation.md" ]]; then
  pass "MISUSE-4: Missing references/model-escalation.md is detectable"
else
  fail "MISUSE-4: File presence check logic broken"
fi
rm -rf "$_tmp_skill_dir"

# Misuse 5: Confirm that source _shared/ files exist (prerequisite for build step)
_missing_src_shared=0
for f in "${SHARED_FILES[@]}"; do
  if [[ ! -f "$SRC_SHARED/$f" ]]; then
    _missing_src_shared=$((_missing_src_shared + 1))
  fi
done
if [[ $_missing_src_shared -eq 0 ]]; then
  pass "MISUSE-5: Source _shared/ files are present (output-format.md, model-escalation.md)"
else
  fail "MISUSE-5: $_missing_src_shared source _shared/ file(s) missing — build step has nothing to copy"
fi

# ---------------------------------------------------------------------------
# BOUNDARY TESTS
# Edge cases that must hold after implementation.
# ---------------------------------------------------------------------------

section "BOUNDARY: edge cases"

# Boundary 1: _shared/ directory itself must NOT appear in dist/.claude/skills/
# (It's an internal source directory and should be excluded from distribution.)
if [[ ! -d "$DIST_SKILLS/_shared" ]]; then
  pass "BOUNDARY-1: _shared/ internal directory correctly excluded from dist/skills/"
else
  fail "BOUNDARY-1: _shared/ directory leaked into dist/skills/ — build.sh exclude pattern broken"
fi

# Boundary 2: Source _shared/ files must NOT be modified by the build process
# Check that output-format.md still starts with expected content
_src_output="$SRC_SHARED/output-format.md"
if [[ -f "$_src_output" ]]; then
  # File must be non-empty and have a markdown header
  if grep -q '^#' "$_src_output" 2>/dev/null; then
    pass "BOUNDARY-2: src/_shared/output-format.md is unchanged (has markdown header)"
  else
    fail "BOUNDARY-2: src/_shared/output-format.md appears empty or header stripped"
  fi
else
  fail "BOUNDARY-2: src/_shared/output-format.md does not exist"
fi

# Boundary 3: Source _shared/model-escalation.md must NOT be modified
_src_escalation="$SRC_SHARED/model-escalation.md"
if [[ -f "$_src_escalation" ]]; then
  if grep -q '^#' "$_src_escalation" 2>/dev/null; then
    pass "BOUNDARY-3: src/_shared/model-escalation.md is unchanged (has markdown header)"
  else
    fail "BOUNDARY-3: src/_shared/model-escalation.md appears empty or header stripped"
  fi
else
  fail "BOUNDARY-3: src/_shared/model-escalation.md does not exist"
fi

# Boundary 4: references/ files in dist must be copies, not symlinks
# (Archives can't bundle symlinks portably.)
_symlink_count=0
for skill in "${ALL_SKILLS[@]}"; do
  for f in "${SHARED_FILES[@]}"; do
    ref="$DIST_SKILLS/$skill/references/$f"
    if [[ -L "$ref" ]]; then
      _symlink_count=$((_symlink_count + 1))
    fi
  done
done
if [[ $_symlink_count -eq 0 ]]; then
  pass "BOUNDARY-4: No symlinks in dist references/ dirs (all are regular files)"
else
  fail "BOUNDARY-4: $_symlink_count symlink(s) found in dist references/ — must be copies"
fi

# Boundary 5: Code examples inside SKILL.md body may legitimately reference _shared/
# The rewrite must only target the constitution bullet pattern, not code block examples.
# Verify that at least one skill SKILL.md in src/ has a _shared/ reference inside a
# code block (so we can confirm the rewrite won't over-apply).
_has_code_block_ref=false
for skill in "${ALL_SKILLS[@]}"; do
  src_md="$ROOT_DIR/src/framework/skills/$skill/SKILL.md"
  if [[ -f "$src_md" ]]; then
    # Look for _shared/ inside a fenced code block (``` ... ```)
    if awk '/^```/{in_block=!in_block} in_block && /_shared\//' "$src_md" | grep -q '_shared/'; then
      _has_code_block_ref=true
      break
    fi
  fi
done
if [[ "$_has_code_block_ref" == "true" ]]; then
  pass "BOUNDARY-5: At least one SKILL.md has _shared/ reference inside a code block (rewrite scope matters)"
else
  pass "BOUNDARY-5: No _shared/ references inside code blocks found (rewrite scope is unconstrained)"
fi

# Boundary 6: mg-init SKILL.md — a skill with no Task tool — should also get references/
# (All skills get the same build treatment regardless of tool list.)
_init_refs="$DIST_SKILLS/mg-init/references"
if [[ -d "$_init_refs" ]]; then
  pass "BOUNDARY-6: mg-init (no Task tool) has references/ dir in dist"
else
  fail "BOUNDARY-6: mg-init missing references/ dir in dist — all skills must get references/ including those without Task tool"
fi

# ---------------------------------------------------------------------------
# GOLDEN PATH TESTS
# Post-implementation assertions — ALL must pass after build.sh is updated.
# ---------------------------------------------------------------------------

section "GOLDEN PATH: post-build compliance"

# Golden 1: Every skill has a references/ subdirectory in dist
_missing=0
for skill in "${ALL_SKILLS[@]}"; do
  refs_dir="$DIST_SKILLS/$skill/references"
  if [[ ! -d "$refs_dir" ]]; then
    _missing=$((_missing + 1))
    printf "    missing references/: %s\n" "$skill"
  fi
done
if [[ $_missing -eq 0 ]]; then
  pass "GOLDEN-1: All ${#ALL_SKILLS[@]} skills have references/ subdir in dist"
else
  fail "GOLDEN-1: $_missing skill(s) missing references/ subdir in dist"
fi

# Golden 2: references/output-format.md exists in every skill dir
_missing=0
for skill in "${ALL_SKILLS[@]}"; do
  ref_file="$DIST_SKILLS/$skill/references/output-format.md"
  if [[ ! -f "$ref_file" ]]; then
    _missing=$((_missing + 1))
    printf "    missing output-format.md: %s\n" "$skill"
  fi
done
if [[ $_missing -eq 0 ]]; then
  pass "GOLDEN-2: references/output-format.md present in all ${#ALL_SKILLS[@]} skill dirs"
else
  fail "GOLDEN-2: $_missing skill(s) missing references/output-format.md"
fi

# Golden 3: references/model-escalation.md exists in every skill dir
_missing=0
for skill in "${ALL_SKILLS[@]}"; do
  ref_file="$DIST_SKILLS/$skill/references/model-escalation.md"
  if [[ ! -f "$ref_file" ]]; then
    _missing=$((_missing + 1))
    printf "    missing model-escalation.md: %s\n" "$skill"
  fi
done
if [[ $_missing -eq 0 ]]; then
  pass "GOLDEN-3: references/model-escalation.md present in all ${#ALL_SKILLS[@]} skill dirs"
else
  fail "GOLDEN-3: $_missing skill(s) missing references/model-escalation.md"
fi

# Golden 4: No ../_shared/ references remain in any dist SKILL.md
_found=0
for skill in "${ALL_SKILLS[@]}"; do
  skill_md="$DIST_SKILLS/$skill/SKILL.md"
  if [[ -f "$skill_md" ]]; then
    count=0
    count=$(grep -c '\.\./\_shared/' "$skill_md" 2>/dev/null) || count=0
    if [[ $count -gt 0 ]]; then
      _found=$((_found + count))
      printf "    ../_shared/ found in: %s (%s occurrences)\n" "$skill" "$count"
    fi
  fi
done
if [[ $_found -eq 0 ]]; then
  pass "GOLDEN-4: No ../_shared/ references remain in any dist SKILL.md"
else
  fail "GOLDEN-4: $_found ../_shared/ reference(s) remain in dist SKILL.md files"
fi

# Golden 5: No bare _shared/ references in the constitution bullet pattern in dist SKILL.md
# The pattern to detect: a bullet point line (starting with optional whitespace then "-")
# that references _shared/ directly (not ../_shared/).
# We exclude code block content to avoid false positives.
_found=0
for skill in "${ALL_SKILLS[@]}"; do
  skill_md="$DIST_SKILLS/$skill/SKILL.md"
  if [[ -f "$skill_md" ]]; then
    # Outside of code fences, look for bullet lines containing _shared/ (bare, not preceded by ../)
    count=$(awk '
      /^```/ { in_block = !in_block; next }
      !in_block && /^\s*-.*[^.]_shared\// { count++ }
      END { print count+0 }
    ' "$skill_md")
    if [[ $count -gt 0 ]]; then
      _found=$((_found + count))
      printf "    bare _shared/ bullet found in: %s (%s occurrences)\n" "$skill" "$count"
    fi
  fi
done
if [[ $_found -eq 0 ]]; then
  pass "GOLDEN-5: No bare _shared/ bullet references remain in dist SKILL.md files"
else
  fail "GOLDEN-5: $_found bare _shared/ bullet reference(s) remain in dist SKILL.md files"
fi

# Golden 6: Source src/framework/skills/_shared/ is unchanged after build
# Verify both expected files still exist and are non-empty
_src_issues=0
for f in "${SHARED_FILES[@]}"; do
  src_file="$SRC_SHARED/$f"
  if [[ ! -f "$src_file" ]]; then
    fail "GOLDEN-6a: src/_shared/$f missing after build"
    _src_issues=$((_src_issues + 1))
  elif [[ ! -s "$src_file" ]]; then
    fail "GOLDEN-6a: src/_shared/$f is empty after build"
    _src_issues=$((_src_issues + 1))
  fi
done
if [[ $_src_issues -eq 0 ]]; then
  pass "GOLDEN-6: src/framework/skills/_shared/ is unchanged (both files present and non-empty)"
fi

# Golden 7: references/ files in dist have the same content as their source
_content_mismatch=0
for skill in "${ALL_SKILLS[@]}"; do
  for f in "${SHARED_FILES[@]}"; do
    dist_file="$DIST_SKILLS/$skill/references/$f"
    src_file="$SRC_SHARED/$f"
    if [[ -f "$dist_file" && -f "$src_file" ]]; then
      if ! diff -q "$src_file" "$dist_file" > /dev/null 2>&1; then
        _content_mismatch=$((_content_mismatch + 1))
        printf "    content mismatch: %s/references/%s\n" "$skill" "$f"
      fi
    fi
  done
done
if [[ $_content_mismatch -eq 0 ]]; then
  pass "GOLDEN-7: All references/ files in dist match source _shared/ content"
else
  fail "GOLDEN-7: $_content_mismatch content mismatch(es) between dist references/ and src _shared/"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

TOTAL=$((PASS + FAIL))

printf "\n"
printf "============================================================\n"
printf " WS-COMPAT-1 build-shared test results\n"
printf "============================================================\n"
printf " Total:  %d\n" "$TOTAL"
printf " Passed: %d\n" "$PASS"
printf " Failed: %d\n" "$FAIL"
printf "============================================================\n"

if [[ $FAIL -gt 0 ]]; then
  printf "\nFailed tests:\n"
  for f in "${FAILURES[@]}"; do
    printf "  - %s\n" "$f"
  done
  printf "\n"
  exit 1
fi

printf "\nAll tests passed.\n\n"
exit 0
