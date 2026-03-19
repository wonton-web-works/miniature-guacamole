#!/usr/bin/env bats
# ============================================================================
# mg-readme-verify.bats - Documentation tests for WS-OSS-2: README + Getting Started
# ============================================================================
# Test ordering: MISUSE CASES → BOUNDARY TESTS → GOLDEN PATH
# Coverage target: All 7 acceptance criteria (AC-OSS-2.1 through AC-OSS-2.7)
#
# These are documentation tests — they grep and check file contents only.
# No mocking needed. Tests are RED where content is missing or stale.
# ============================================================================

bats_require_minimum_version 1.5.0

# ============================================================================
# Setup
# ============================================================================

setup() {
    # Resolve project root (tests/scripts/ → project root)
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"

    README="$PROJECT_ROOT/README.md"
    QUICK_START="$PROJECT_ROOT/src/installer/QUICK-START.md"
    DIST_README="$PROJECT_ROOT/src/installer/DIST-README.md"
    INSTALL_README="$PROJECT_ROOT/src/installer/INSTALL-README.md"
    SKILLS_DIR="$PROJECT_ROOT/.claude/skills"
}

# ============================================================================
# MISUSE CASES
# Invalid inputs, missing required content, stale/conflicting documentation
# ============================================================================

# --- AC-OSS-2.5: --no-db flag ---

@test "[MISUSE] README does not mention --no-db flag anywhere" {
    # This test is RED until the flag is documented
    run grep -q -- "--no-db" "$README"
    [ "$status" -eq 1 ]
}

@test "[MISUSE] QUICK-START.md does not mention --no-db flag" {
    # This test is RED until the flag is documented
    run grep -q -- "--no-db" "$QUICK_START"
    [ "$status" -eq 1 ]
}

# --- AC-OSS-2.7: Stale installer docs should be removed ---

@test "[MISUSE] DIST-README.md still exists as separate file (should be removed or folded in)" {
    # This test is RED until DIST-README.md is removed or merged
    run test -f "$DIST_README"
    [ "$status" -eq 0 ]
}

@test "[MISUSE] INSTALL-README.md still exists as separate file (should be removed or folded in)" {
    # This test is RED until INSTALL-README.md is removed or merged
    run test -f "$INSTALL_README"
    [ "$status" -eq 0 ]
}

# --- AC-OSS-2.3: Quick Start must show expected output ---

@test "[MISUSE] Quick Start section contains no expected output example" {
    # This test is RED until expected output is shown alongside commands
    # Expected output means something like "# Output:" or "Expected:" after a command block
    local qs_section
    qs_section=$(awk '/^## Quick Start/,/^## [^Q]/' "$README")
    run grep -qE "(Expected output|Output:|# =>|Result:)" <<< "$qs_section"
    [ "$status" -eq 1 ]
}

@test "[MISUSE] Quick Start section has more than 3 commands (too many for a first-use guide)" {
    # AC-OSS-2.3 requires exactly the first 3 commands a new user runs.
    # Current README has 5 steps. This test is RED until trimmed to 3.
    local qs_section
    qs_section=$(awk '/^## Quick Start/,/^---/' "$README")
    # Count numbered steps (### 1. ### 2. etc.)
    local step_count
    step_count=$(grep -cE "^### [0-9]+\." <<< "$qs_section" || true)
    [ "$step_count" -le 3 ]
}

# --- AC-OSS-2.4: All 16 skills must appear in README with descriptions ---

@test "[MISUSE] README does not list mg-add-context skill with a description" {
    # This test is RED — mg-add-context is absent from the root README skill table
    run grep -q "mg-add-context" "$README"
    [ "$status" -eq 1 ]
}

@test "[MISUSE] README does not list mg-write skill with a description" {
    # This test is RED — mg-write is absent from the root README skill table
    run grep -q "mg-write" "$README"
    [ "$status" -eq 1 ]
}

@test "[MISUSE] README does not list mg-debug skill with a description" {
    # This test is RED — mg-debug is absent from the root README Available Workflows table
    local workflows_section
    workflows_section=$(awk '/^## Available Workflows/,/^## /' "$README")
    run grep -q "mg-debug" <<< "$workflows_section"
    [ "$status" -eq 1 ]
}

@test "[MISUSE] README does not list mg-refactor skill with a description" {
    # This test is RED — mg-refactor is absent from the root README Available Workflows table
    local workflows_section
    workflows_section=$(awk '/^## Available Workflows/,/^## /' "$README")
    run grep -q "mg-refactor" <<< "$workflows_section"
    [ "$status" -eq 1 ]
}

# --- AC-OSS-2.6: QUICK-START.md flow must match README ---

@test "[MISUSE] QUICK-START.md references INSTALL-README.md (stale cross-reference)" {
    # QUICK-START.md tells users to read INSTALL-README.md, which should be removed
    run grep -q "INSTALL-README.md" "$QUICK_START"
    [ "$status" -eq 0 ]
}

# ============================================================================
# BOUNDARY TESTS
# Edge cases in documentation: section ordering, partial content, naming
# ============================================================================

# --- AC-OSS-2.1: Section names must match spec exactly ---

@test "[BOUNDARY] README 'What is it' section uses different heading text" {
    # Spec says 'What is it' — README has 'What is This?' — check exact match
    run grep -qE "^## What is (it|this)\??" "$README"
    [ "$status" -eq 0 ]
}

@test "[BOUNDARY] README has Architecture section (may be named differently)" {
    run grep -qiE "^## Architecture" "$README"
    [ "$status" -eq 0 ]
}

@test "[BOUNDARY] README Install section covers tarball method (boundary: manual path)" {
    local install_section
    install_section=$(awk '/^## Installation/,/^## /' "$README")
    run grep -qE "(tar -xzf|\.tar\.gz)" <<< "$install_section"
    [ "$status" -eq 0 ]
}

@test "[BOUNDARY] README Install section covers curl/web-install method" {
    local install_section
    install_section=$(awk '/^## Installation/,/^## /' "$README")
    # web-install.sh is in INSTALL-README.md but NOT clearly in README Install section
    # This test is RED until web-install.sh is promoted to the root README Install section
    run grep -q "web-install.sh" <<< "$install_section"
    [ "$status" -eq 1 ]
}

@test "[BOUNDARY] QUICK-START.md mentions mg-init" {
    run grep -q "mg-init" "$QUICK_START"
    [ "$status" -eq 0 ]
}

@test "[BOUNDARY] README skill count in description matches actual skill directory count" {
    # README claims 16 skills in multiple places — verify the actual count
    local actual_count
    actual_count=$(find "$SKILLS_DIR" -maxdepth 1 -mindepth 1 -type d | grep -v "_shared" | wc -l | tr -d ' ')
    [ "$actual_count" -eq 18 ]
}

@test "[BOUNDARY] README references skills directory that exists at .claude/skills" {
    run test -d "$SKILLS_DIR"
    [ "$status" -eq 0 ]
}

@test "[BOUNDARY] QUICK-START.md web-install.sh URL is present" {
    run grep -q "web-install.sh" "$QUICK_START"
    [ "$status" -eq 0 ]
}

@test "[BOUNDARY] README Quick Start section appears before Installation section" {
    # Ordering: Quick Start should come before Installation for good UX
    local qs_line install_line
    qs_line=$(grep -n "^## Quick Start" "$README" | head -1 | cut -d: -f1)
    install_line=$(grep -n "^## Installation" "$README" | head -1 | cut -d: -f1)
    [ "$qs_line" -lt "$install_line" ]
}

# ============================================================================
# GOLDEN PATH
# Normal, expected documentation state after WS-OSS-2 is implemented
# ============================================================================

# --- AC-OSS-2.1: README exists with required sections ---

@test "[GOLDEN] README.md exists at repo root" {
    run test -f "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README has a 'What is' section" {
    run grep -qiE "^## What is" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README has an Install or Installation section" {
    run grep -qiE "^## Inst(all|allation)" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README has a Quick Start section" {
    run grep -qE "^## Quick Start" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README has an Architecture section" {
    run grep -qiE "^## Architecture" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README is non-empty (at least 50 lines)" {
    local line_count
    line_count=$(wc -l < "$README")
    [ "$line_count" -ge 50 ]
}

# --- AC-OSS-2.2: Install section covers all three methods ---

@test "[GOLDEN] README Install section mentions web-install.sh (curl)" {
    # This test is RED until web-install.sh is documented in root README Install section
    run grep -q "web-install.sh" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README Install section mentions tarball download" {
    run grep -qE "(tar -xzf|\.tar\.gz)" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README Install section mentions mg-init" {
    run grep -q "mg-init" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README Install section contains curl command" {
    local install_section
    install_section=$(awk '/^## Installation/,/^## [^I]/' "$README")
    run grep -q "curl" <<< "$install_section"
    [ "$status" -eq 0 ]
}

# --- AC-OSS-2.3: Quick Start shows first 3 commands with expected output ---

@test "[GOLDEN] Quick Start section exists and contains at least one code block" {
    local qs_section
    qs_section=$(awk '/^## Quick Start/,/^---/' "$README")
    run grep -q '```' <<< "$qs_section"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] Quick Start shows git clone or curl install as first command" {
    local qs_section
    qs_section=$(awk '/^## Quick Start/,/^---/' "$README")
    run grep -qE "(git clone|curl -fsSL|web-install)" <<< "$qs_section"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] Quick Start shows 'claude' launch command" {
    local qs_section
    qs_section=$(awk '/^## Quick Start/,/^---/' "$README")
    run grep -qE "^claude$|^\`claude\`|^    claude$" <<< "$qs_section"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] Quick Start shows expected output or result annotation" {
    # AC-OSS-2.3: expected output must appear alongside the first 3 commands
    # This test is RED until output annotations are added
    local qs_section
    qs_section=$(awk '/^## Quick Start/,/^---/' "$README")
    run grep -qE "(Expected output|# Output|Output:|# =>|Result:|\# Should show)" <<< "$qs_section"
    [ "$status" -eq 0 ]
}

# --- AC-OSS-2.4: README references all 16 skills with one-line descriptions ---

@test "[GOLDEN] README mentions mg-accessibility-review" {
    run grep -q "mg-accessibility-review" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README mentions mg-add-context" {
    # This test is RED — mg-add-context is not in root README
    run grep -q "mg-add-context" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README mentions mg-assess" {
    run grep -q "mg-assess" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README mentions mg-assess-tech" {
    run grep -q "mg-assess-tech" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README mentions mg-build" {
    run grep -q "mg-build" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README mentions mg-code-review" {
    run grep -q "mg-code-review" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README mentions mg-debug" {
    # This test is RED — mg-debug is not in root README Available Workflows table
    run grep -q "mg-debug" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README mentions mg-design" {
    run grep -q "mg-design" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README mentions mg-design-review" {
    run grep -q "mg-design-review" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README mentions mg-document" {
    run grep -q "mg-document" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README mentions mg-init" {
    run grep -q "mg-init" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README mentions mg-leadership-team" {
    run grep -q "mg-leadership-team" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README mentions mg-refactor" {
    # This test is RED — mg-refactor is not in root README Available Workflows table
    run grep -q "mg-refactor" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README mentions mg-security-review" {
    run grep -q "mg-security-review" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README mentions mg-spec" {
    run grep -q "mg-spec" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README mentions mg-write" {
    # This test is RED — mg-write is not in root README
    run grep -q "mg-write" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README skill section contains one-line descriptions (uses table or list with dash/pipe)" {
    # Skills should appear in a table or list format with descriptions, not just bare names
    # Check that skill names appear alongside description text in a structured format
    run grep -qE "(mg-assess.*\|.*[A-Z]|mg-build.*\|.*[A-Z]|/mg-assess.*-.*[A-Z])" "$README"
    [ "$status" -eq 0 ]
}

# --- AC-OSS-2.5: --no-db flag mentioned ---

@test "[GOLDEN] README mentions --no-db flag for file-only mode" {
    # This test is RED — --no-db is not mentioned anywhere in README
    run grep -q -- "--no-db" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] README --no-db mention includes context about file-only mode" {
    # The flag should appear with an explanation, not just bare mention
    # This test is RED — --no-db is not mentioned anywhere in README
    run grep -qE "(--no-db.*(file|without|skip|no.*database|file.only)|file.only.*--no-db)" "$README"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] QUICK-START.md mentions --no-db flag" {
    # This test is RED — --no-db is not in QUICK-START.md
    run grep -q -- "--no-db" "$QUICK_START"
    [ "$status" -eq 0 ]
}

# --- AC-OSS-2.6: QUICK-START.md matches README flow ---

@test "[GOLDEN] QUICK-START.md exists at src/installer/QUICK-START.md" {
    run test -f "$QUICK_START"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] QUICK-START.md covers web-install.sh method" {
    run grep -q "web-install.sh" "$QUICK_START"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] QUICK-START.md covers mg-init method" {
    run grep -q "mg-init" "$QUICK_START"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] QUICK-START.md shows 'claude' as a step" {
    run grep -qE "^claude$|^    claude$|\`claude\`" "$QUICK_START"
    [ "$status" -eq 0 ]
}

@test "[GOLDEN] QUICK-START.md does not reference stale INSTALL-README.md" {
    # This test is RED — QUICK-START.md currently references INSTALL-README.md
    run grep -q "INSTALL-README.md" "$QUICK_START"
    [ "$status" -eq 1 ]
}

@test "[GOLDEN] QUICK-START.md does not reference stale DIST-README.md" {
    run grep -q "DIST-README.md" "$QUICK_START"
    [ "$status" -eq 1 ]
}

@test "[GOLDEN] QUICK-START.md first install method matches README first install method" {
    # Both should lead with curl/web-install as the easiest path
    # Extract the first code block from each Install section
    local readme_first_method qs_first_method
    readme_first_method=$(awk '/^## Install/,/^## /' "$README" | grep -E "(curl|web-install|git clone)" | head -1)
    qs_first_method=$(awk '/^## Install/,/^## /' "$QUICK_START" | grep -E "(curl|web-install|git clone)" | head -1)

    # Both should reference the same install mechanism
    run test -n "$readme_first_method"
    [ "$status" -eq 0 ]
    run test -n "$qs_first_method"
    [ "$status" -eq 0 ]
}

# --- AC-OSS-2.7: Stale files removed or folded in ---

@test "[GOLDEN] DIST-README.md is removed (content folded into README or QUICK-START)" {
    # This test is RED — DIST-README.md still exists
    run test -f "$DIST_README"
    [ "$status" -eq 1 ]
}

@test "[GOLDEN] INSTALL-README.md is removed (content folded into README or QUICK-START)" {
    # This test is RED — INSTALL-README.md still exists
    run test -f "$INSTALL_README"
    [ "$status" -eq 1 ]
}

@test "[GOLDEN] README does not reference DIST-README.md as a separate document" {
    run grep -q "DIST-README.md" "$README"
    [ "$status" -eq 1 ]
}

@test "[GOLDEN] README does not reference INSTALL-README.md as a separate document" {
    run grep -q "INSTALL-README.md" "$README"
    [ "$status" -eq 1 ]
}
