#!/usr/bin/env bats
# Test Specifications: B5 — Global Install Detection + --standalone flag
# Coverage: 12 tests (4M + 4B + 4G)
# Ordering: Misuse → Boundary → Golden Path (CAD protocol)

setup() {
    # Create isolated test environment
    export TEST_DIR=$(mktemp -d)
    export CLAUDE_DIR="$TEST_DIR/.claude"

    # Build test installer from source
    export BUILD_DIR="$BATS_TEST_DIRNAME/../../dist/miniature-guacamole"
    export INSTALL_SCRIPT="$BUILD_DIR/install.sh"

    # Fake HOME so we control ~/.claude detection
    export FAKE_HOME=$(mktemp -d)
    export ORIG_HOME="$HOME"
    export HOME="$FAKE_HOME"

    # Ensure build exists
    if [ ! -f "$INSTALL_SCRIPT" ]; then
        skip "dist/miniature-guacamole/install.sh not found - run ./build.sh first"
    fi
}

teardown() {
    export HOME="$ORIG_HOME"

    if [ -n "$TEST_DIR" ] && [ -d "$TEST_DIR" ]; then
        chmod -R u+w "$TEST_DIR" 2>/dev/null || true
        rm -rf "$TEST_DIR"
    fi

    if [ -n "$FAKE_HOME" ] && [ -d "$FAKE_HOME" ]; then
        rm -rf "$FAKE_HOME"
    fi
}

# ============================================================================
# MISUSE CASES (4 tests)
# ============================================================================

@test "M1: --standalone flag with global install still copies framework" {
    # Simulate global install
    mkdir -p "$FAKE_HOME/.claude/agents"
    mkdir -p "$FAKE_HOME/.claude/skills"
    mkdir -p "$FAKE_HOME/.claude/shared"

    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --standalone --force

    # Framework should be copied because --standalone overrides detection
    [ -d "$CLAUDE_DIR/agents" ]
    local agent_count=$(find "$CLAUDE_DIR/agents" -maxdepth 1 -type d ! -path "$CLAUDE_DIR/agents" | wc -l | tr -d ' ')
    [ "$agent_count" -gt 0 ]
    [ -d "$CLAUDE_DIR/skills" ]
    local skill_count=$(find "$CLAUDE_DIR/skills" -maxdepth 1 -type d -name "mg-*" | wc -l | tr -d ' ')
    [ "$skill_count" -gt 0 ]
    [ -d "$CLAUDE_DIR/shared" ]
    local shared_count=$(find "$CLAUDE_DIR/shared" -maxdepth 1 -type f -name "*.md" | wc -l | tr -d ' ')
    [ "$shared_count" -gt 0 ]
}

@test "M2: Partial global install (missing skills) does not trigger skip" {
    # Only agents and shared exist — skills missing — not a full global install
    mkdir -p "$FAKE_HOME/.claude/agents"
    mkdir -p "$FAKE_HOME/.claude/shared"
    # NOTE: $FAKE_HOME/.claude/skills intentionally NOT created

    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    # Framework should be fully copied (global detection requires all 3 dirs)
    local agent_count=$(find "$CLAUDE_DIR/agents" -maxdepth 1 -type d ! -path "$CLAUDE_DIR/agents" | wc -l | tr -d ' ')
    [ "$agent_count" -gt 0 ]
    local skill_count=$(find "$CLAUDE_DIR/skills" -maxdepth 1 -type d -name "mg-*" | wc -l | tr -d ' ')
    [ "$skill_count" -gt 0 ]
}

@test "M3: Global install dirs are empty — does not trigger skip" {
    # Empty ~/.claude/{agents,skills,shared} - treat as global install
    mkdir -p "$FAKE_HOME/.claude/agents"
    mkdir -p "$FAKE_HOME/.claude/skills"
    mkdir -p "$FAKE_HOME/.claude/shared"

    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    # When global install is detected, agents/skills/shared NOT copied to project
    local agent_count=$(find "$CLAUDE_DIR/agents" -maxdepth 1 -type d ! -path "$CLAUDE_DIR/agents" 2>/dev/null | wc -l | tr -d ' ')
    [ "$agent_count" -eq 0 ]
    local skill_count=$(find "$CLAUDE_DIR/skills" -maxdepth 1 -type d -name "mg-*" 2>/dev/null | wc -l | tr -d ' ')
    [ "$skill_count" -eq 0 ]
}

@test "M4: Unknown flag rejected before global detection runs" {
    mkdir -p "$FAKE_HOME/.claude/agents"
    mkdir -p "$FAKE_HOME/.claude/skills"
    mkdir -p "$FAKE_HOME/.claude/shared"

    cd "$TEST_DIR"
    run bash "$INSTALL_SCRIPT" --unknown-flag --force
    [ "$status" -ne 0 ]
    [[ "$output" =~ "Unknown option" ]] || [[ "$output" =~ "unknown" ]]
}

# ============================================================================
# BOUNDARY TESTS (4 tests)
# ============================================================================

@test "B1: No global install — all components installed normally" {
    # FAKE_HOME/.claude does not exist at all
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    local agent_count=$(find "$CLAUDE_DIR/agents" -maxdepth 1 -type d ! -path "$CLAUDE_DIR/agents" | wc -l | tr -d ' ')
    [ "$agent_count" -gt 0 ]
    local skill_count=$(find "$CLAUDE_DIR/skills" -maxdepth 1 -type d -name "mg-*" | wc -l | tr -d ' ')
    [ "$skill_count" -gt 0 ]
    local shared_count=$(find "$CLAUDE_DIR/shared" -maxdepth 1 -type f -name "*.md" | wc -l | tr -d ' ')
    [ "$shared_count" -gt 0 ]
}

@test "B2: Global install detected — memory dir still created" {
    mkdir -p "$FAKE_HOME/.claude/agents"
    mkdir -p "$FAKE_HOME/.claude/skills"
    mkdir -p "$FAKE_HOME/.claude/shared"

    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    # memory/ must still be created (project-local)
    [ -d "$CLAUDE_DIR/memory" ]
    [ -f "$CLAUDE_DIR/memory/.gitignore" ]
}

@test "B3: Global install detected — settings.json still created" {
    mkdir -p "$FAKE_HOME/.claude/agents"
    mkdir -p "$FAKE_HOME/.claude/skills"
    mkdir -p "$FAKE_HOME/.claude/shared"

    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    # settings.json must still be created (project-level config)
    [ -f "$CLAUDE_DIR/settings.json" ]
}

@test "B4: Global install detected — CLAUDE.md still created" {
    mkdir -p "$FAKE_HOME/.claude/agents"
    mkdir -p "$FAKE_HOME/.claude/skills"
    mkdir -p "$FAKE_HOME/.claude/shared"

    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    # CLAUDE.md must still be created (project-specific context)
    [ -f "$CLAUDE_DIR/CLAUDE.md" ]
}

# ============================================================================
# GOLDEN PATH (4 tests)
# ============================================================================

@test "G1: Global install detected — prints skip message" {
    mkdir -p "$FAKE_HOME/.claude/agents"
    mkdir -p "$FAKE_HOME/.claude/skills"
    mkdir -p "$FAKE_HOME/.claude/shared"

    cd "$TEST_DIR"
    run bash "$INSTALL_SCRIPT" --force
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Global install detected" ]] || [[ "$output" =~ "global" ]]
}

@test "G2: Global install detected — agents/skills/shared NOT copied to project" {
    mkdir -p "$FAKE_HOME/.claude/agents"
    mkdir -p "$FAKE_HOME/.claude/skills"
    mkdir -p "$FAKE_HOME/.claude/shared"

    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    # Agents dir exists but is empty (no agent subdirs)
    local agent_count=$(find "$CLAUDE_DIR/agents" -maxdepth 1 -type d ! -path "$CLAUDE_DIR/agents" 2>/dev/null | wc -l | tr -d ' ')
    [ "$agent_count" -eq 0 ]

    # Skills dir exists but is empty (no mg-* subdirs)
    local skill_count=$(find "$CLAUDE_DIR/skills" -maxdepth 1 -type d -name "mg-*" 2>/dev/null | wc -l | tr -d ' ')
    [ "$skill_count" -eq 0 ]

    # Shared dir exists but has no .md files
    local shared_count=$(find "$CLAUDE_DIR/shared" -maxdepth 1 -type f -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
    [ "$shared_count" -eq 0 ]
}

@test "G3: --standalone overrides global detection — message mentions standalone" {
    mkdir -p "$FAKE_HOME/.claude/agents"
    mkdir -p "$FAKE_HOME/.claude/skills"
    mkdir -p "$FAKE_HOME/.claude/shared"

    cd "$TEST_DIR"
    run bash "$INSTALL_SCRIPT" --standalone --force
    [ "$status" -eq 0 ]
    # Should NOT print skip message (standalone overrides)
    [[ ! "$output" =~ "skipping framework copy" ]] || true
}

@test "G4: Global install detected — team-config.yaml still created" {
    mkdir -p "$FAKE_HOME/.claude/agents"
    mkdir -p "$FAKE_HOME/.claude/skills"
    mkdir -p "$FAKE_HOME/.claude/shared"

    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    # team-config.yaml must still be created
    [ -f "$CLAUDE_DIR/team-config.yaml" ]
}
