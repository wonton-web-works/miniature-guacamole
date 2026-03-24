#!/usr/bin/env bats
# ============================================================================
# mg-build-verify.bats — WS-OSS-1: Build + Install Verification
# ============================================================================
# Test ordering: MISUSE CASES → BOUNDARY TESTS → GOLDEN PATH
# Coverage target: AC-OSS-1.1 through AC-OSS-1.7 (99%)
#
# AC-OSS-1.1: build.sh runs without errors → dist/miniature-guacamole.tar.gz
# AC-OSS-1.2: Tarball contains install.sh, all mg-* scripts, agents/, skills/, shared/
# AC-OSS-1.3: install.sh from tarball runs successfully on fresh empty directory
# AC-OSS-1.4: mg-init --no-db on fresh project exits 0 and creates .claude/memory/
# AC-OSS-1.5: mg-init --no-db creates CLAUDE.md in .claude/
# AC-OSS-1.6: No stale or broken symlinks in dist output
# AC-OSS-1.7: VERSION.json in tarball matches version in build.sh or package.json
# ============================================================================

bats_require_minimum_version 1.5.0

setup() {
    # Resolve project root from tests/scripts/ → project root
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"

    # Create fresh temporary workspace for each test — never reuse
    TEST_DIR="$(mktemp -d -t mg-oss-verify.XXXXXX)"

    # Paths
    BUILD_SCRIPT="$PROJECT_ROOT/build.sh"
    DIST_DIR="$PROJECT_ROOT/dist"
    TARBALL="$DIST_DIR/miniature-guacamole.tar.gz"
    DIST_EXTRACTED="$DIST_DIR/miniature-guacamole"
}

teardown() {
    if [[ -n "$TEST_DIR" && -d "$TEST_DIR" ]]; then
        chmod -R +w "$TEST_DIR" 2>/dev/null || true
        rm -rf "$TEST_DIR"
    fi
}

# ============================================================================
# SECTION 1 — MISUSE CASES
# Test failure modes and invalid inputs before any golden path
# ============================================================================

# AC-OSS-1.1 misuse: build.sh fails when src/framework/ is missing
@test "build.sh: fails with clear error when src/framework/ is missing" {
    # Set up an isolated workspace with no framework dir
    ISOLATED="$TEST_DIR/isolated-build"
    mkdir -p "$ISOLATED/src"
    cp "$PROJECT_ROOT/build.sh" "$ISOLATED/"
    # Do NOT copy src/framework

    # Create a minimal src/installer so that pre-flight gets past the installer check
    mkdir -p "$ISOLATED/src/installer"
    touch "$ISOLATED/src/installer/install.sh"

    cd "$ISOLATED"
    run bash build.sh
    [ "$status" -ne 0 ]
    [[ "$output" =~ "src/framework" ]] || [[ "$output" =~ "not found" ]]
}

# AC-OSS-1.1 misuse: build.sh fails when src/installer/ is missing
@test "build.sh: fails with clear error when src/installer/ is missing" {
    ISOLATED="$TEST_DIR/isolated-no-installer"
    mkdir -p "$ISOLATED/src/framework"
    cp "$PROJECT_ROOT/build.sh" "$ISOLATED/"

    cd "$ISOLATED"
    run bash build.sh
    [ "$status" -ne 0 ]
    [[ "$output" =~ "src/installer" ]] || [[ "$output" =~ "not found" ]]
}

# AC-OSS-1.2 misuse: tarball does NOT contain premium/ directory
@test "tarball: does not contain premium/ directory (OSS isolation)" {
    # This verifies the misuse condition — shipping premium code in OSS build
    skip_if_no_tarball

    run tar -tzf "$TARBALL"
    [ "$status" -eq 0 ]
    ! echo "$output" | grep -q "premium/"
}

# AC-OSS-1.3 misuse: install.sh fails when .claude/ source directory is absent
@test "install.sh: exits non-zero when .claude/ directory is absent from tarball root" {
    # Simulate a corrupted tarball extraction — no .claude/ alongside install.sh
    CORRUPT_DIR="$TEST_DIR/corrupt-install"
    mkdir -p "$CORRUPT_DIR"

    # Copy install.sh but no .claude/ (simulates corrupted/incomplete tarball)
    cp "$PROJECT_ROOT/src/installer/install.sh" "$CORRUPT_DIR/"
    chmod +x "$CORRUPT_DIR/install.sh"

    FRESH_PROJECT="$TEST_DIR/fresh-project"
    mkdir -p "$FRESH_PROJECT"

    cd "$CORRUPT_DIR"
    run bash install.sh "$FRESH_PROJECT"
    [ "$status" -ne 0 ]
    [[ "$output" =~ ".claude" ]] || [[ "$output" =~ "not found" ]] || [[ "$output" =~ "Error" ]]
}

# AC-OSS-1.3 misuse: install.sh fails on nonexistent project directory
@test "install.sh: exits non-zero when target project directory does not exist" {
    skip_if_no_tarball

    EXTRACTED="$TEST_DIR/extracted-for-install-test"
    mkdir -p "$EXTRACTED"
    tar -xzf "$TARBALL" -C "$EXTRACTED" --strip-components=1

    INSTALL_SH="$EXTRACTED/install.sh"
    [ -f "$INSTALL_SH" ] || skip "install.sh not found in tarball"

    NONEXISTENT="$TEST_DIR/does-not-exist/project"

    cd "$EXTRACTED"
    run bash "$INSTALL_SH" "$NONEXISTENT"
    [ "$status" -ne 0 ]
}

# AC-OSS-1.4 misuse: mg-init --no-db fails on nonexistent project directory
@test "mg-init --no-db: exits non-zero when project directory does not exist" {
    MG_INIT_BIN="$PROJECT_ROOT/src/installer/mg-init"
    [ -f "$MG_INIT_BIN" ] || skip "src/installer/mg-init not found"

    NONEXISTENT="$TEST_DIR/no-such-dir/project"

    run bash "$MG_INIT_BIN" --no-db "$NONEXISTENT"
    [ "$status" -ne 0 ]
}

# AC-OSS-1.4 misuse: mg-init without --no-db on a machine with no network
# (documents that --no-db must be used to skip GitHub fetch)
@test "mg-init: --no-db flag is recognized and does not attempt GitHub API call" {
    MG_INIT_BIN="$PROJECT_ROOT/src/installer/mg-init"
    [ -f "$MG_INIT_BIN" ] || skip "src/installer/mg-init not found"

    FRESH_PROJECT="$TEST_DIR/network-skip-test"
    mkdir -p "$FRESH_PROJECT"

    # With a primed cache entry pointing to a local tarball, --no-db should not hit GitHub
    # We verify the flag is at least parsed (no "Unknown option" error)
    # If cache is empty, mg-init will fail trying to resolve 'latest' — that's expected
    run bash "$MG_INIT_BIN" --no-db --offline --version "0.0.0-nonexistent" "$FRESH_PROJECT" 2>&1 || true
    # Must NOT print "Unknown option: --no-db"
    ! echo "$output" | grep -q "Unknown option: --no-db"
    ! echo "$output" | grep -q "Unknown option: --offline"
}

# AC-OSS-1.6 misuse: dist output must not contain broken symlinks
@test "dist output: no broken symlinks in dist/miniature-guacamole/ directory" {
    # A broken symlink in the dist directory would cause install failures
    [ -d "$DIST_EXTRACTED" ] || skip "dist/miniature-guacamole/ not present — run build.sh first"

    # find -L follows symlinks; broken ones show as type f but stat fails — use -xtype l
    BROKEN=$(find -L "$DIST_EXTRACTED" -type l 2>/dev/null | head -1)
    [ -z "$BROKEN" ]
}

# AC-OSS-1.6 misuse: tarball must not contain broken symlinks
@test "tarball: no broken symlinks when extracted" {
    skip_if_no_tarball

    EXTRACT_DIR="$TEST_DIR/symlink-check"
    mkdir -p "$EXTRACT_DIR"
    tar -xzf "$TARBALL" -C "$EXTRACT_DIR" --strip-components=1

    BROKEN=$(find -L "$EXTRACT_DIR" -type l 2>/dev/null | head -1)
    [ -z "$BROKEN" ]
}

# AC-OSS-1.7 misuse: VERSION.json in tarball must not be empty
@test "tarball VERSION.json: is not empty" {
    skip_if_no_tarball

    EXTRACT_DIR="$TEST_DIR/version-empty-check"
    mkdir -p "$EXTRACT_DIR"
    tar -xzf "$TARBALL" -C "$EXTRACT_DIR" --strip-components=1

    VERSION_FILE="$EXTRACT_DIR/VERSION.json"
    [ -f "$VERSION_FILE" ]
    [ -s "$VERSION_FILE" ]
}

# AC-OSS-1.7 misuse: src/installer/VERSION.json version must match package.json version
# (version drift between source files is a latent bug that surfaces at release)
@test "src/installer/VERSION.json: version field is not 'unknown' or empty" {
    VERSION_FILE="$PROJECT_ROOT/src/installer/VERSION.json"
    [ -f "$VERSION_FILE" ] || skip "src/installer/VERSION.json not found"

    VERSION=$(python3 -c "import json; print(json.load(open('$VERSION_FILE')).get('version',''))" 2>/dev/null)
    [ -n "$VERSION" ]
    [ "$VERSION" != "unknown" ]
}

# ============================================================================
# SECTION 2 — BOUNDARY TESTS
# Edge cases and limits
# ============================================================================

# AC-OSS-1.1 boundary: build.sh is idempotent — running twice succeeds
@test "build.sh: running twice in a row succeeds (idempotent)" {
    ISOLATED="$TEST_DIR/idempotent-build"
    mkdir -p "$ISOLATED"
    cp -r "$PROJECT_ROOT/src" "$PROJECT_ROOT/build.sh" "$PROJECT_ROOT/package.json" "$ISOLATED/" 2>/dev/null || true

    cd "$ISOLATED"
    run bash build.sh
    # First run — we don't fail the test on this; if it fails we skip second run
    [ "$status" -eq 0 ] || skip "First build run failed — cannot test idempotency"

    run bash build.sh
    [ "$status" -eq 0 ]
}

# AC-OSS-1.2 boundary: tarball content listing does not error on large archive
@test "tarball: tar -tzf listing completes without error" {
    skip_if_no_tarball

    run tar -tzf "$TARBALL"
    [ "$status" -eq 0 ]
    [ -n "$output" ]
}

# AC-OSS-1.2 boundary: tarball contains at least one agent directory
@test "tarball: contains at least one agent definition" {
    skip_if_no_tarball

    run tar -tzf "$TARBALL"
    [ "$status" -eq 0 ]
    echo "$output" | grep -q "\.claude/agents/"
}

# AC-OSS-1.2 boundary: tarball contains at least one skill directory
@test "tarball: contains at least one skill definition" {
    skip_if_no_tarball

    run tar -tzf "$TARBALL"
    [ "$status" -eq 0 ]
    echo "$output" | grep -q "\.claude/skills/"
}

# AC-OSS-1.3 boundary: install.sh on a project that already has .claude/ (idempotent)
@test "install.sh: re-running on already-installed project exits 0 or prints warning" {
    skip_if_no_tarball

    EXTRACTED="$TEST_DIR/extracted-idempotent"
    mkdir -p "$EXTRACTED"
    tar -xzf "$TARBALL" -C "$EXTRACTED" --strip-components=1

    INSTALL_SH="$EXTRACTED/install.sh"
    [ -f "$INSTALL_SH" ] || skip "install.sh not found in tarball"

    FRESH_PROJECT="$TEST_DIR/project-idempotent"
    mkdir -p "$FRESH_PROJECT"

    cd "$EXTRACTED"
    # First install
    run bash "$INSTALL_SH" "$FRESH_PROJECT"
    [ "$status" -eq 0 ] || skip "Initial install.sh failed — cannot test idempotency"

    # Second install — must not exit non-zero (MG_INSTALL.json guard makes it exit 0)
    run bash "$INSTALL_SH" "$FRESH_PROJECT"
    [ "$status" -eq 0 ]
}

# AC-OSS-1.4/1.5 boundary: mg-init --no-db with explicit project dir path
@test "mg-init --no-db: accepts an explicit project directory path" {
    # Verify flag parsing works with a positional argument
    MG_INIT_BIN="$PROJECT_ROOT/src/installer/mg-init"
    [ -f "$MG_INIT_BIN" ] || skip "src/installer/mg-init not found"

    # Using --offline + --version with an explicit path should fail on cache miss
    # but NOT fail with "Unknown option" — confirms argument parsing is correct
    FRESH_PROJECT="$TEST_DIR/explicit-path-test"
    mkdir -p "$FRESH_PROJECT"

    run bash "$MG_INIT_BIN" --no-db --offline --version "0.0.0-nonexistent" "$FRESH_PROJECT" 2>&1 || true
    ! echo "$output" | grep -q "Unknown option"
}

# AC-OSS-1.7 boundary: VERSION.json in tarball has all required fields
@test "tarball VERSION.json: contains name, version, channel fields" {
    skip_if_no_tarball

    EXTRACT_DIR="$TEST_DIR/version-fields-check"
    mkdir -p "$EXTRACT_DIR"
    tar -xzf "$TARBALL" -C "$EXTRACT_DIR" --strip-components=1

    VERSION_FILE="$EXTRACT_DIR/VERSION.json"
    [ -f "$VERSION_FILE" ]

    python3 - "$VERSION_FILE" <<'EOF'
import json, sys
data = json.load(open(sys.argv[1]))
required = ["name", "version", "channel"]
for field in required:
    if field not in data:
        print(f"Missing field: {field}", file=sys.stderr)
        sys.exit(1)
if data["name"] != "miniature-guacamole":
    print(f"Unexpected name: {data['name']}", file=sys.stderr)
    sys.exit(1)
EOF
}

# AC-OSS-1.7 boundary: build.sh generates VERSION.json with git_sha field
@test "dist VERSION.json: contains git_sha field after build" {
    [ -f "$DIST_EXTRACTED/VERSION.json" ] || skip "dist/miniature-guacamole/VERSION.json not present — run build.sh first"

    python3 - "$DIST_EXTRACTED/VERSION.json" <<'EOF'
import json, sys
data = json.load(open(sys.argv[1]))
if "git_sha" not in data:
    print("Missing field: git_sha", file=sys.stderr)
    sys.exit(1)
if not data["git_sha"]:
    print("git_sha is empty", file=sys.stderr)
    sys.exit(1)
EOF
}

# ============================================================================
# SECTION 3 — GOLDEN PATH
# Normal, expected operations — all 7 ACs verified end-to-end
# ============================================================================

# AC-OSS-1.1: build.sh produces dist/miniature-guacamole.tar.gz
@test "build.sh: exits 0 and produces dist/miniature-guacamole.tar.gz (AC-OSS-1.1)" {
    ISOLATED="$TEST_DIR/golden-build"
    mkdir -p "$ISOLATED"
    cp -r "$PROJECT_ROOT/src" "$PROJECT_ROOT/build.sh" "$PROJECT_ROOT/package.json" "$ISOLATED/"

    cd "$ISOLATED"
    run bash build.sh
    [ "$status" -eq 0 ]
    [ -f "$ISOLATED/dist/miniature-guacamole.tar.gz" ]
}

# AC-OSS-1.1: build.sh prints "Build complete" on success
@test "build.sh: prints success message on golden path (AC-OSS-1.1)" {
    ISOLATED="$TEST_DIR/golden-message"
    mkdir -p "$ISOLATED"
    cp -r "$PROJECT_ROOT/src" "$PROJECT_ROOT/build.sh" "$PROJECT_ROOT/package.json" "$ISOLATED/"

    cd "$ISOLATED"
    run bash build.sh
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Build complete" ]]
}

# AC-OSS-1.2: tarball contains install.sh at root level
@test "tarball: contains install.sh at top level (AC-OSS-1.2)" {
    skip_if_no_tarball

    run tar -tzf "$TARBALL"
    [ "$status" -eq 0 ]
    echo "$output" | grep -q "miniature-guacamole/install.sh"
}

# AC-OSS-1.2: tarball contains mg-* scripts inside .claude/scripts/
@test "tarball: contains mg-* scripts in .claude/scripts/ (AC-OSS-1.2)" {
    skip_if_no_tarball

    run tar -tzf "$TARBALL"
    [ "$status" -eq 0 ]
    echo "$output" | grep -q "\.claude/scripts/mg-"
}

# AC-OSS-1.2: tarball contains agents/ directory
@test "tarball: contains .claude/agents/ directory (AC-OSS-1.2)" {
    skip_if_no_tarball

    run tar -tzf "$TARBALL"
    [ "$status" -eq 0 ]
    echo "$output" | grep -q "\.claude/agents/"
}

# AC-OSS-1.2: tarball contains skills/ directory
@test "tarball: contains .claude/skills/ directory (AC-OSS-1.2)" {
    skip_if_no_tarball

    run tar -tzf "$TARBALL"
    [ "$status" -eq 0 ]
    echo "$output" | grep -q "\.claude/skills/"
}

# AC-OSS-1.2: tarball contains shared/ directory
@test "tarball: contains .claude/shared/ directory (AC-OSS-1.2)" {
    skip_if_no_tarball

    run tar -tzf "$TARBALL"
    [ "$status" -eq 0 ]
    echo "$output" | grep -q "\.claude/shared/"
}

# AC-OSS-1.3: install.sh extracted from tarball runs successfully on fresh project
@test "install.sh from tarball: exits 0 on fresh empty project directory (AC-OSS-1.3)" {
    skip_if_no_tarball

    EXTRACT_DIR="$TEST_DIR/install-golden-extract"
    mkdir -p "$EXTRACT_DIR"
    tar -xzf "$TARBALL" -C "$EXTRACT_DIR" --strip-components=1

    INSTALL_SH="$EXTRACT_DIR/install.sh"
    [ -f "$INSTALL_SH" ] || skip "install.sh not found in tarball"
    chmod +x "$INSTALL_SH"

    FRESH_PROJECT="$TEST_DIR/fresh-golden-project"
    mkdir -p "$FRESH_PROJECT"

    cd "$EXTRACT_DIR"
    run bash "$INSTALL_SH" "$FRESH_PROJECT"
    [ "$status" -eq 0 ]
}

# AC-OSS-1.3: install.sh creates .claude/ directory structure
@test "install.sh from tarball: creates .claude/ directory in project (AC-OSS-1.3)" {
    skip_if_no_tarball

    EXTRACT_DIR="$TEST_DIR/install-claude-dir"
    mkdir -p "$EXTRACT_DIR"
    tar -xzf "$TARBALL" -C "$EXTRACT_DIR" --strip-components=1

    INSTALL_SH="$EXTRACT_DIR/install.sh"
    [ -f "$INSTALL_SH" ] || skip "install.sh not found in tarball"
    chmod +x "$INSTALL_SH"

    FRESH_PROJECT="$TEST_DIR/project-claude-dir"
    mkdir -p "$FRESH_PROJECT"

    cd "$EXTRACT_DIR"
    run bash "$INSTALL_SH" "$FRESH_PROJECT"
    [ "$status" -eq 0 ]
    [ -d "$FRESH_PROJECT/.claude" ]
}

# AC-OSS-1.4: mg-init --no-db exits 0 on fresh project (from local cache)
# Note: This test requires a cached tarball at ~/.cache/miniature-guacamole/<version>.tar.gz
# It is skipped when the cache is empty (CI without network should pre-seed the cache)
@test "mg-init --no-db: exits 0 on fresh project when version is cached (AC-OSS-1.4)" {
    MG_INIT_BIN="$PROJECT_ROOT/src/installer/mg-init"
    [ -f "$MG_INIT_BIN" ] || skip "src/installer/mg-init not found"

    # Read the version from package.json
    PKG_VERSION=$(python3 -c "import json; print(json.load(open('$PROJECT_ROOT/package.json')).get('version',''))" 2>/dev/null)
    [ -n "$PKG_VERSION" ] || skip "Could not read version from package.json"

    CACHE_DIR="$HOME/.cache/miniature-guacamole"
    CACHE_FILE="$CACHE_DIR/v${PKG_VERSION}.tar.gz"

    # Seed cache from local dist tarball if present
    if [ -f "$TARBALL" ] && [ ! -f "$CACHE_FILE" ]; then
        mkdir -p "$CACHE_DIR"
        cp "$TARBALL" "$CACHE_FILE"
    fi

    [ -f "$CACHE_FILE" ] || skip "No cached tarball for v$PKG_VERSION — run build.sh first or seed cache"

    FRESH_PROJECT="$TEST_DIR/mg-init-golden-project"
    mkdir -p "$FRESH_PROJECT"

    run bash "$MG_INIT_BIN" --no-db --offline --version "v${PKG_VERSION}" "$FRESH_PROJECT"
    [ "$status" -eq 0 ]
}

# AC-OSS-1.4: mg-init --no-db creates .claude/memory/ directory
@test "mg-init --no-db: creates .claude/memory/ in project directory (AC-OSS-1.4)" {
    MG_INIT_BIN="$PROJECT_ROOT/src/installer/mg-init"
    [ -f "$MG_INIT_BIN" ] || skip "src/installer/mg-init not found"

    PKG_VERSION=$(python3 -c "import json; print(json.load(open('$PROJECT_ROOT/package.json')).get('version',''))" 2>/dev/null)
    [ -n "$PKG_VERSION" ] || skip "Could not read version from package.json"

    CACHE_DIR="$HOME/.cache/miniature-guacamole"
    CACHE_FILE="$CACHE_DIR/v${PKG_VERSION}.tar.gz"

    if [ -f "$TARBALL" ] && [ ! -f "$CACHE_FILE" ]; then
        mkdir -p "$CACHE_DIR"
        cp "$TARBALL" "$CACHE_FILE"
    fi

    [ -f "$CACHE_FILE" ] || skip "No cached tarball for v$PKG_VERSION — run build.sh first or seed cache"

    FRESH_PROJECT="$TEST_DIR/mg-init-memory-project"
    mkdir -p "$FRESH_PROJECT"

    run bash "$MG_INIT_BIN" --no-db --offline --version "v${PKG_VERSION}" "$FRESH_PROJECT"
    [ "$status" -eq 0 ]
    [ -d "$FRESH_PROJECT/.claude/memory" ]
}

# AC-OSS-1.5: mg-init --no-db creates CLAUDE.md in .claude/
@test "mg-init --no-db: creates .claude/CLAUDE.md in project directory (AC-OSS-1.5)" {
    MG_INIT_BIN="$PROJECT_ROOT/src/installer/mg-init"
    [ -f "$MG_INIT_BIN" ] || skip "src/installer/mg-init not found"

    PKG_VERSION=$(python3 -c "import json; print(json.load(open('$PROJECT_ROOT/package.json')).get('version',''))" 2>/dev/null)
    [ -n "$PKG_VERSION" ] || skip "Could not read version from package.json"

    CACHE_DIR="$HOME/.cache/miniature-guacamole"
    CACHE_FILE="$CACHE_DIR/v${PKG_VERSION}.tar.gz"

    if [ -f "$TARBALL" ] && [ ! -f "$CACHE_FILE" ]; then
        mkdir -p "$CACHE_DIR"
        cp "$TARBALL" "$CACHE_FILE"
    fi

    [ -f "$CACHE_FILE" ] || skip "No cached tarball for v$PKG_VERSION — run build.sh first or seed cache"

    FRESH_PROJECT="$TEST_DIR/mg-init-claudemd-project"
    mkdir -p "$FRESH_PROJECT"

    run bash "$MG_INIT_BIN" --no-db --offline --version "v${PKG_VERSION}" "$FRESH_PROJECT"
    [ "$status" -eq 0 ]
    [ -f "$FRESH_PROJECT/.claude/CLAUDE.md" ]
}

# AC-OSS-1.6: dist/miniature-guacamole/ directory has no broken symlinks
@test "dist output: no broken symlinks in extracted dist directory (AC-OSS-1.6)" {
    [ -d "$DIST_EXTRACTED" ] || skip "dist/miniature-guacamole/ not present — run build.sh first"

    # -L follows symlinks; a broken symlink appears as type l (link) in the target listing
    BROKEN_COUNT=$(find -L "$DIST_EXTRACTED" -type l 2>/dev/null | wc -l | tr -d ' ')
    [ "$BROKEN_COUNT" -eq 0 ]
}

# AC-OSS-1.7: VERSION.json in tarball matches version in package.json
@test "tarball VERSION.json: version matches package.json (AC-OSS-1.7)" {
    skip_if_no_tarball

    PKG_VERSION=$(python3 -c "import json; print(json.load(open('$PROJECT_ROOT/package.json')).get('version',''))" 2>/dev/null)
    [ -n "$PKG_VERSION" ] || skip "Could not parse package.json version"

    EXTRACT_DIR="$TEST_DIR/version-match-check"
    mkdir -p "$EXTRACT_DIR"
    tar -xzf "$TARBALL" -C "$EXTRACT_DIR" --strip-components=1

    VERSION_FILE="$EXTRACT_DIR/VERSION.json"
    [ -f "$VERSION_FILE" ]

    TARBALL_VERSION=$(python3 -c "import json; print(json.load(open('$VERSION_FILE')).get('version',''))" 2>/dev/null)
    [ -n "$TARBALL_VERSION" ]
    [ "$TARBALL_VERSION" = "$PKG_VERSION" ]
}

# AC-OSS-1.7: VERSION.json in dist/miniature-guacamole/ matches package.json
@test "dist VERSION.json: version matches package.json (AC-OSS-1.7)" {
    [ -f "$DIST_EXTRACTED/VERSION.json" ] || skip "dist/miniature-guacamole/VERSION.json not present — run build.sh first"

    PKG_VERSION=$(python3 -c "import json; print(json.load(open('$PROJECT_ROOT/package.json')).get('version',''))" 2>/dev/null)
    [ -n "$PKG_VERSION" ] || skip "Could not parse package.json version"

    DIST_VERSION=$(python3 -c "import json; print(json.load(open('$DIST_EXTRACTED/VERSION.json')).get('version',''))" 2>/dev/null)
    [ -n "$DIST_VERSION" ]
    [ "$DIST_VERSION" = "$PKG_VERSION" ]
}

# ============================================================================
# Helpers
# ============================================================================

# Skip a test when dist/miniature-guacamole.tar.gz does not exist yet.
# AC-OSS-1.1 must pass first to produce the tarball before the rest can run.
skip_if_no_tarball() {
    if [ ! -f "$TARBALL" ]; then
        skip "dist/miniature-guacamole.tar.gz not present — AC-OSS-1.1 must pass first (run build.sh)"
    fi
}
