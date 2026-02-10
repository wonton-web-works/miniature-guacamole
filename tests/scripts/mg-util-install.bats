#!/usr/bin/env bats
# ============================================================================
# mg-util-install.bats - Tests for mg-util (install/status/uninstall)
# ============================================================================
# Test ordering: MISUSE CASES → BOUNDARY TESTS → GOLDEN PATH
# Coverage target: 99% of script functionality
# Workstream: WS-INSTALL-0 - Core Installation Layout
# ============================================================================

# Setup and teardown
setup() {
    # Resolve project root (tests/scripts/ → project root)
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"

    # Create isolated test home directory
    TEST_HOME="$(mktemp -d)"
    export HOME="$TEST_HOME"

    # Test installation root
    TEST_INSTALL_DIR="$TEST_HOME/.miniature-guacamole"
    TEST_CLAUDE_DIR="$TEST_HOME/.claude"

    # Path to mg-util script (will be created in src/scripts/)
    SCRIPT_PATH="$PROJECT_ROOT/src/scripts/mg-util"

    # Mock shell profile files
    BASH_PROFILE="$TEST_HOME/.bash_profile"
    BASHRC="$TEST_HOME/.bashrc"
    ZSHRC="$TEST_HOME/.zshrc"

    # Skip if BATS not installed
    if ! command -v bats &> /dev/null; then
        skip "BATS not installed. Install via: brew install bats-core"
    fi

    # Skip if script doesn't exist yet
    if [[ ! -f "$SCRIPT_PATH" ]]; then
        skip "mg-util not implemented yet at: $SCRIPT_PATH"
    fi
}

teardown() {
    # Clean up test home directory
    if [[ -n "$TEST_HOME" && -d "$TEST_HOME" ]]; then
        chmod -R u+w "$TEST_HOME" 2>/dev/null || true
        rm -rf "$TEST_HOME"
    fi
}

# ============================================================================
# MISUSE CASES - Invalid inputs, missing dependencies, error conditions
# ============================================================================

@test "mg-util: no subcommand provided" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]]
    [[ "$output" =~ "install" ]]
    [[ "$output" =~ "status" ]]
    [[ "$output" =~ "uninstall" ]]
}

@test "mg-util: invalid subcommand" {
    run "$SCRIPT_PATH" "invalid-command"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Unknown command:" ]] || [[ "$output" =~ "invalid" ]]
}

@test "mg-util: --help shows usage" {
    run "$SCRIPT_PATH" --help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
    [[ "$output" =~ "mg-util" ]]
    [[ "$output" =~ "install" ]]
    [[ "$output" =~ "status" ]]
    [[ "$output" =~ "uninstall" ]]
}

@test "mg-util install: missing framework source directory" {
    # Try to install when no source exists
    run "$SCRIPT_PATH" install
    [ "$status" -eq 1 ]
    [[ "$output" =~ "source" ]] || [[ "$output" =~ "framework" ]]
}

@test "mg-util install: source directory not readable" {
    # Create source but make it unreadable
    SOURCE_DIR="$TEST_HOME/framework-source"
    mkdir -p "$SOURCE_DIR/.claude"
    chmod 000 "$SOURCE_DIR/.claude"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"

    # Cleanup before assertion
    chmod 755 "$SOURCE_DIR/.claude"

    [ "$status" -eq 1 ]
}

@test "mg-util install: invalid source structure (missing .claude/)" {
    # Create source without proper structure
    SOURCE_DIR="$TEST_HOME/invalid-source"
    mkdir -p "$SOURCE_DIR"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 1 ]
    [[ "$output" =~ ".claude" ]] || [[ "$output" =~ "invalid" ]]
}

@test "mg-util install: insufficient disk space simulation" {
    skip "TODO: Requires disk space mocking"
}

@test "mg-util install: no write permission to home directory" {
    # Make home directory read-only
    chmod 555 "$TEST_HOME"

    SOURCE_DIR="$TEST_HOME/temp-source"
    # Create source in /tmp since TEST_HOME is read-only
    mkdir -p "/tmp/mg-util-test-source-$$/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "/tmp/mg-util-test-source-$$"

    # Cleanup
    chmod 755 "$TEST_HOME"
    rm -rf "/tmp/mg-util-test-source-$$"

    [ "$status" -eq 1 ]
}

@test "mg-util status: no installation exists" {
    # Run status when nothing is installed
    run "$SCRIPT_PATH" status
    [ "$status" -eq 1 ]
    [[ "$output" =~ "not installed" ]] || [[ "$output" =~ "No installation" ]]
}

@test "mg-util status: corrupted installation (missing VERSION file)" {
    # Create partial installation without VERSION
    mkdir -p "$TEST_INSTALL_DIR"/{bin,framework}
    mkdir -p "$TEST_CLAUDE_DIR"

    run "$SCRIPT_PATH" status
    [ "$status" -eq 1 ]
    [[ "$output" =~ "VERSION" ]] || [[ "$output" =~ "corrupted" ]]
}

@test "mg-util status: broken symlinks detected" {
    # Create installation with broken symlinks
    mkdir -p "$TEST_INSTALL_DIR"/{bin,framework}
    echo "1.0.0" > "$TEST_INSTALL_DIR/VERSION"

    # Create broken symlink
    mkdir -p "$TEST_CLAUDE_DIR"
    ln -s "/nonexistent/path" "$TEST_CLAUDE_DIR/agents"

    run "$SCRIPT_PATH" status
    [ "$status" -eq 1 ]
    [[ "$output" =~ "broken" ]] || [[ "$output" =~ "symlink" ]]
}

@test "mg-util uninstall: no installation exists" {
    run "$SCRIPT_PATH" uninstall
    [ "$status" -eq 1 ]
    [[ "$output" =~ "not installed" ]] || [[ "$output" =~ "No installation" ]]
}

@test "mg-util uninstall: requires confirmation without --force" {
    # Install first
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}
    run "$SCRIPT_PATH" install "$SOURCE_DIR"

    # Try to uninstall without --force (should require confirmation)
    run bash -c "echo 'n' | $SCRIPT_PATH uninstall"
    [ "$status" -eq 1 ] || [ "$status" -eq 0 ]
    [[ "$output" =~ "confirm" ]] || [[ "$output" =~ "cancelled" ]]
}

@test "mg-util: too many arguments" {
    run "$SCRIPT_PATH" install "arg1" "arg2" "arg3"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "too many" ]]
}

@test "mg-util: invalid flag" {
    run "$SCRIPT_PATH" --invalid-flag
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]] || [[ "$output" =~ "invalid" ]]
}

@test "mg-util install: extra arguments after install" {
    run "$SCRIPT_PATH" install "/path" "extra"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg-util install: missing required framework components" {
    # Create source with incomplete structure
    SOURCE_DIR="$TEST_HOME/incomplete-source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills}
    # Missing: shared, scripts, hooks

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "missing" ]] || [[ "$output" =~ "incomplete" ]]
}

# ============================================================================
# BOUNDARY TESTS - Edge cases, limits, unusual but valid inputs
# ============================================================================

@test "mg-util install: already installed (idempotent without --force)" {
    # First installation
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}
    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]

    # Second installation should detect existing
    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 1 ] || [ "$status" -eq 0 ]
    [[ "$output" =~ "already installed" ]] || [[ "$output" =~ "exists" ]]
}

@test "mg-util install: reinstall with --force flag" {
    # First installation
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}
    echo "content1" > "$SOURCE_DIR/.claude/agents/test-agent"
    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]

    # Modify source and reinstall with --force
    echo "content2" > "$SOURCE_DIR/.claude/agents/test-agent"
    run "$SCRIPT_PATH" install --force "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "reinstall" ]] || [[ "$output" =~ "updated" ]]
}

@test "mg-util install: relative path to source directory" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    # Change to TEST_HOME and use relative path
    cd "$TEST_HOME"
    run "$SCRIPT_PATH" install "./source"
    [ "$status" -eq 0 ]
    [[ -d "$TEST_INSTALL_DIR" ]]
}

@test "mg-util install: source path with spaces" {
    SOURCE_DIR="$TEST_HOME/source with spaces"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ -d "$TEST_INSTALL_DIR" ]]
}

@test "mg-util install: source path with special characters" {
    SOURCE_DIR="$TEST_HOME/source-123_v2.0"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ -d "$TEST_INSTALL_DIR" ]]
}

@test "mg-util install: symlinks in source directory" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    # Create a file and symlink to it
    echo "content" > "$SOURCE_DIR/.claude/agents/real-file"
    ln -s "real-file" "$SOURCE_DIR/.claude/agents/symlink-file"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    # Should handle symlinks gracefully
}

@test "mg-util install: empty directories in framework structure" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}
    # Leave directories empty

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ -d "$TEST_INSTALL_DIR/framework/agents" ]]
}

@test "mg-util install: bash profile already has PATH entry" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    # Pre-populate bash profile with PATH entry
    echo 'export PATH="$PATH:$HOME/.miniature-guacamole/bin"' > "$BASH_PROFILE"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]

    # Should not duplicate PATH entry
    COUNT=$(grep -c "\.miniature-guacamole/bin" "$BASH_PROFILE")
    [ "$COUNT" -eq 1 ]
}

@test "mg-util install: detect and use zsh profile" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    # Create zshrc to simulate zsh user
    touch "$ZSHRC"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]

    # Should add PATH to zshrc
    [[ -f "$ZSHRC" ]]
    grep -q "\.miniature-guacamole/bin" "$ZSHRC"
}

@test "mg-util install: detect and use bash profile (no bashrc)" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    # Create bash_profile but not bashrc
    touch "$BASH_PROFILE"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]

    # Should add PATH to bash_profile
    grep -q "\.miniature-guacamole/bin" "$BASH_PROFILE"
}

@test "mg-util install: no shell profile exists (creates one)" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    # No shell profile files exist

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]

    # Should create a profile file
    [[ -f "$BASH_PROFILE" ]] || [[ -f "$BASHRC" ]] || [[ -f "$ZSHRC" ]]
}

@test "mg-util status: partial installation (some symlinks missing)" {
    # Create installation
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}
    run "$SCRIPT_PATH" install "$SOURCE_DIR"

    # Remove one symlink
    rm "$TEST_CLAUDE_DIR/agents"

    run "$SCRIPT_PATH" status
    [ "$status" -eq 1 ]
    [[ "$output" =~ "agents" ]] || [[ "$output" =~ "missing" ]]
}

@test "mg-util status: PATH not in current shell" {
    # Install
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}
    run "$SCRIPT_PATH" install "$SOURCE_DIR"

    # Run status with clean PATH
    run env PATH="/usr/bin:/bin" "$SCRIPT_PATH" status
    [ "$status" -eq 0 ] || [ "$status" -eq 1 ]
    [[ "$output" =~ "PATH" ]]
}

@test "mg-util uninstall: PATH entry in multiple profile files" {
    # Install
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    # Manually add PATH to multiple profiles
    echo 'export PATH="$PATH:$HOME/.miniature-guacamole/bin"' > "$BASH_PROFILE"
    echo 'export PATH="$PATH:$HOME/.miniature-guacamole/bin"' > "$ZSHRC"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"

    # Uninstall with --force
    run "$SCRIPT_PATH" uninstall --force
    [ "$status" -eq 0 ]

    # Should remove from both files
    ! grep -q "\.miniature-guacamole/bin" "$BASH_PROFILE"
    ! grep -q "\.miniature-guacamole/bin" "$ZSHRC"
}

@test "mg-util uninstall: symlinks point to different location" {
    # Create installation
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}
    run "$SCRIPT_PATH" install "$SOURCE_DIR"

    # Manually change a symlink
    rm "$TEST_CLAUDE_DIR/agents"
    ln -s "/some/other/path" "$TEST_CLAUDE_DIR/agents"

    run "$SCRIPT_PATH" uninstall --force
    [ "$status" -eq 0 ]
    # Should still remove the symlink
}

@test "mg-util: version information in output" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}
    echo "1.0.0" > "$SOURCE_DIR/.claude/VERSION"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]

    run "$SCRIPT_PATH" status
    [ "$status" -eq 0 ]
    [[ "$output" =~ "1.0.0" ]]
}

@test "mg-util install: large framework (stress test)" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    # Create many files
    for i in {1..100}; do
        echo "content" > "$SOURCE_DIR/.claude/agents/agent-$i"
    done

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]

    # Verify all copied
    [ $(ls "$TEST_INSTALL_DIR/framework/agents" | wc -l) -eq 100 ]
}

# ============================================================================
# GOLDEN PATH - Normal, expected operations
# ============================================================================

@test "mg-util install: creates ~/.miniature-guacamole/ directory" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ -d "$TEST_INSTALL_DIR" ]]
}

@test "mg-util install: creates bin/ subdirectory" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ -d "$TEST_INSTALL_DIR/bin" ]]
}

@test "mg-util install: creates framework/ subdirectory" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ -d "$TEST_INSTALL_DIR/framework" ]]
}

@test "mg-util install: creates audit/ subdirectory" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ -d "$TEST_INSTALL_DIR/audit" ]]
}

@test "mg-util install: creates config/ subdirectory" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ -d "$TEST_INSTALL_DIR/config" ]]
}

@test "mg-util install: creates cache/ subdirectory" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ -d "$TEST_INSTALL_DIR/cache" ]]
}

@test "mg-util install: creates VERSION file" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}
    echo "1.0.0" > "$SOURCE_DIR/.claude/VERSION"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ -f "$TEST_INSTALL_DIR/VERSION" ]]
}

@test "mg-util install: VERSION file contains correct version" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}
    echo "2.5.1" > "$SOURCE_DIR/.claude/VERSION"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]

    VERSION=$(cat "$TEST_INSTALL_DIR/VERSION")
    [[ "$VERSION" == "2.5.1" ]]
}

@test "mg-util install: adds PATH to bash profile" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}
    touch "$BASH_PROFILE"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]

    grep -q "\.miniature-guacamole/bin" "$BASH_PROFILE"
}

@test "mg-util install: creates ~/.claude/agents symlink" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ -L "$TEST_CLAUDE_DIR/agents" ]]
}

@test "mg-util install: creates ~/.claude/skills symlink" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ -L "$TEST_CLAUDE_DIR/skills" ]]
}

@test "mg-util install: creates ~/.claude/shared symlink" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ -L "$TEST_CLAUDE_DIR/shared" ]]
}

@test "mg-util install: creates ~/.claude/hooks symlink" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ -L "$TEST_CLAUDE_DIR/hooks" ]]
}

@test "mg-util install: creates ~/.claude/scripts symlink" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ -L "$TEST_CLAUDE_DIR/scripts" ]]
}

@test "mg-util install: agents symlink points to correct location" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]

    TARGET=$(readlink "$TEST_CLAUDE_DIR/agents")
    [[ "$TARGET" == *"/.miniature-guacamole/framework/agents" ]]
}

@test "mg-util install: scripts symlink points to bin/" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]

    TARGET=$(readlink "$TEST_CLAUDE_DIR/scripts")
    [[ "$TARGET" == *"/.miniature-guacamole/bin" ]]
}

@test "mg-util install: copies framework files" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}
    echo "test-agent" > "$SOURCE_DIR/.claude/agents/dev"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ -f "$TEST_INSTALL_DIR/framework/agents/dev" ]]
}

@test "mg-util install: copies scripts to bin/" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}
    echo "#!/bin/bash" > "$SOURCE_DIR/.claude/scripts/mg-help"
    chmod +x "$SOURCE_DIR/.claude/scripts/mg-help"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ -f "$TEST_INSTALL_DIR/bin/mg-help" ]]
    [[ -x "$TEST_INSTALL_DIR/bin/mg-help" ]]
}

@test "mg-util install: success message includes location" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ "$output" =~ \.miniature-guacamole ]]
}

@test "mg-util status: shows installation health" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}
    echo "1.0.0" > "$SOURCE_DIR/.claude/VERSION"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    run "$SCRIPT_PATH" status

    [ "$status" -eq 0 ]
    [[ "$output" =~ "Installation" ]] || [[ "$output" =~ "Status" ]]
}

@test "mg-util status: shows version" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}
    echo "1.2.3" > "$SOURCE_DIR/.claude/VERSION"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    run "$SCRIPT_PATH" status

    [ "$status" -eq 0 ]
    [[ "$output" =~ "1.2.3" ]]
}

@test "mg-util status: shows symlink status (agents)" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    run "$SCRIPT_PATH" status

    [ "$status" -eq 0 ]
    [[ "$output" =~ "agents" ]]
}

@test "mg-util status: shows symlink status (skills)" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    run "$SCRIPT_PATH" status

    [ "$status" -eq 0 ]
    [[ "$output" =~ "skills" ]]
}

@test "mg-util status: shows symlink status (shared)" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    run "$SCRIPT_PATH" status

    [ "$status" -eq 0 ]
    [[ "$output" =~ "shared" ]]
}

@test "mg-util status: shows symlink status (hooks)" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    run "$SCRIPT_PATH" status

    [ "$status" -eq 0 ]
    [[ "$output" =~ "hooks" ]]
}

@test "mg-util status: shows symlink status (scripts)" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    run "$SCRIPT_PATH" status

    [ "$status" -eq 0 ]
    [[ "$output" =~ "scripts" ]]
}

@test "mg-util status: shows PATH status (in shell)" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"

    # Source the profile and check status
    source "$BASH_PROFILE" 2>/dev/null || true
    run "$SCRIPT_PATH" status

    [ "$status" -eq 0 ]
    [[ "$output" =~ "PATH" ]]
}

@test "mg-util status: indicates healthy installation" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    run "$SCRIPT_PATH" status

    [ "$status" -eq 0 ]
    [[ "$output" =~ "OK" ]] || [[ "$output" =~ "healthy" ]] || [[ "$output" =~ "✓" ]]
}

@test "mg-util uninstall: removes ~/.miniature-guacamole/ directory" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    run "$SCRIPT_PATH" uninstall --force

    [ "$status" -eq 0 ]
    [[ ! -d "$TEST_INSTALL_DIR" ]]
}

@test "mg-util uninstall: removes symlinks" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    run "$SCRIPT_PATH" uninstall --force

    [ "$status" -eq 0 ]
    [[ ! -L "$TEST_CLAUDE_DIR/agents" ]]
    [[ ! -L "$TEST_CLAUDE_DIR/skills" ]]
    [[ ! -L "$TEST_CLAUDE_DIR/shared" ]]
    [[ ! -L "$TEST_CLAUDE_DIR/scripts" ]]
}

@test "mg-util uninstall: removes PATH entry from bash profile" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}
    touch "$BASH_PROFILE"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    run "$SCRIPT_PATH" uninstall --force

    [ "$status" -eq 0 ]
    ! grep -q "\.miniature-guacamole/bin" "$BASH_PROFILE"
}

@test "mg-util uninstall: success message" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    run "$SCRIPT_PATH" uninstall --force

    [ "$status" -eq 0 ]
    [[ "$output" =~ "uninstall" ]] || [[ "$output" =~ "removed" ]]
}

@test "mg-util: which mg-help resolves after installation" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}
    echo "#!/bin/bash" > "$SOURCE_DIR/.claude/scripts/mg-help"
    chmod +x "$SOURCE_DIR/.claude/scripts/mg-help"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]

    # Update PATH and check which
    export PATH="$TEST_INSTALL_DIR/bin:$PATH"
    run which mg-help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "mg-help" ]]
}

@test "mg-util install: preserves file permissions" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    # Create executable and non-executable files
    echo "#!/bin/bash" > "$SOURCE_DIR/.claude/scripts/executable"
    chmod +x "$SOURCE_DIR/.claude/scripts/executable"

    echo "data" > "$SOURCE_DIR/.claude/agents/non-executable"
    chmod 644 "$SOURCE_DIR/.claude/agents/non-executable"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]

    # Check permissions preserved
    [[ -x "$TEST_INSTALL_DIR/bin/executable" ]]
    [[ ! -x "$TEST_INSTALL_DIR/framework/agents/non-executable" ]]
}

@test "mg-util install: creates parent directories if needed" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    # Ensure ~/.claude doesn't exist
    rm -rf "$TEST_CLAUDE_DIR"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ -d "$TEST_CLAUDE_DIR" ]]
}

@test "mg-util install: handles nested framework directories" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}
    mkdir -p "$SOURCE_DIR/.claude/agents/nested/deep"
    echo "content" > "$SOURCE_DIR/.claude/agents/nested/deep/file"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ -f "$TEST_INSTALL_DIR/framework/agents/nested/deep/file" ]]
}

@test "mg-util: full workflow (install → status → uninstall)" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}
    echo "1.0.0" > "$SOURCE_DIR/.claude/VERSION"

    # Install
    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    [[ -d "$TEST_INSTALL_DIR" ]]

    # Status
    run "$SCRIPT_PATH" status
    [ "$status" -eq 0 ]
    [[ "$output" =~ "1.0.0" ]]

    # Uninstall
    run "$SCRIPT_PATH" uninstall --force
    [ "$status" -eq 0 ]
    [[ ! -d "$TEST_INSTALL_DIR" ]]

    # Status after uninstall
    run "$SCRIPT_PATH" status
    [ "$status" -eq 1 ]
    [[ "$output" =~ "not installed" ]]
}

@test "mg-util install: output shows progress" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]
    # Should show some progress indication
    [[ "$output" =~ "Creating" ]] || [[ "$output" =~ "Installing" ]] || [[ "$output" =~ "Copying" ]]
}

@test "mg-util uninstall: confirmation prompt with user input" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"

    # Confirm uninstall
    run bash -c "echo 'y' | $SCRIPT_PATH uninstall"
    [ "$status" -eq 0 ]
    [[ ! -d "$TEST_INSTALL_DIR" ]]
}

@test "mg-util: idempotent operations (multiple status calls)" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    run "$SCRIPT_PATH" install "$SOURCE_DIR"

    # Multiple status calls should be identical
    run "$SCRIPT_PATH" status
    OUTPUT1="$output"

    run "$SCRIPT_PATH" status
    OUTPUT2="$output"

    [ "$OUTPUT1" == "$OUTPUT2" ]
}

# ============================================================================
# INTEGRATION TESTS - End-to-end scenarios
# ============================================================================

@test "mg-util: complete installation verification with mg-help" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}

    # Create mg-help script
    cat > "$SOURCE_DIR/.claude/scripts/mg-help" << 'EOF'
#!/bin/bash
echo "Available commands:"
echo "  mg-help - Show this help"
EOF
    chmod +x "$SOURCE_DIR/.claude/scripts/mg-help"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]

    # Verify mg-help is accessible
    export PATH="$TEST_INSTALL_DIR/bin:$PATH"
    run mg-help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Available commands" ]]
}

@test "mg-util: installation with real framework structure" {
    # Simulate actual miniature-guacamole structure
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents/{dev,qa,pm},skills/{engineering-team},shared,scripts,hooks}

    echo "1.0.0" > "$SOURCE_DIR/.claude/VERSION"
    echo "# Dev Agent" > "$SOURCE_DIR/.claude/agents/dev/AGENT.md"
    echo "# QA Agent" > "$SOURCE_DIR/.claude/agents/qa/AGENT.md"
    echo "#!/bin/bash" > "$SOURCE_DIR/.claude/scripts/mg-help"
    chmod +x "$SOURCE_DIR/.claude/scripts/mg-help"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    [ "$status" -eq 0 ]

    # Verify structure
    [[ -f "$TEST_INSTALL_DIR/framework/agents/dev/AGENT.md" ]]
    [[ -f "$TEST_INSTALL_DIR/framework/agents/qa/AGENT.md" ]]
    [[ -x "$TEST_INSTALL_DIR/bin/mg-help" ]]
}

@test "mg-util: status output format includes all required information" {
    SOURCE_DIR="$TEST_HOME/source"
    mkdir -p "$SOURCE_DIR/.claude"/{agents,skills,shared,scripts,hooks}
    echo "2.0.0" > "$SOURCE_DIR/.claude/VERSION"

    run "$SCRIPT_PATH" install "$SOURCE_DIR"
    run "$SCRIPT_PATH" status

    [ "$status" -eq 0 ]

    # Should show all key information
    [[ "$output" =~ "version" ]] || [[ "$output" =~ "Version" ]]
    [[ "$output" =~ "symlink" ]] || [[ "$output" =~ "Symlink" ]]
    [[ "$output" =~ "PATH" ]]
}
