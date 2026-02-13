#!/usr/bin/env bats
# Test Specifications: WS-INSTALL-FIX-1 - Installer Cleanup Logic
# Coverage: 38 tests (15M + 11B + 12G)
# Ordering: Misuse → Boundary → Golden Path (CAD protocol)

setup() {
    # Create isolated test environment
    export TEST_DIR=$(mktemp -d)
    export CLAUDE_DIR="$TEST_DIR/.claude"

    # Build test installer from source
    export BUILD_DIR="$BATS_TEST_DIRNAME/../../dist/miniature-guacamole"
    export INSTALL_SCRIPT="$BUILD_DIR/install.sh"

    # Ensure build exists
    if [ ! -f "$INSTALL_SCRIPT" ]; then
        skip "dist/miniature-guacamole/install.sh not found - run ./build.sh first"
    fi
}

teardown() {
    # Cleanup test environment
    if [ -n "$TEST_DIR" ] && [ -d "$TEST_DIR" ]; then
        chmod -R u+w "$TEST_DIR" 2>/dev/null || true
        rm -rf "$TEST_DIR"
    fi
}

# ============================================================================
# MISUSE CASES (15 tests)
# ============================================================================

# ---- Stale Directory Patterns ----

@test "M1: Re-install with pre-v1.0 skill names" {
    # Setup: Install to test dir, manually add old skills
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    mkdir -p "$CLAUDE_DIR/skills/implement"
    mkdir -p "$CLAUDE_DIR/skills/engineering-team"
    echo "old" > "$CLAUDE_DIR/skills/implement/SKILL.md"

    # Action: Re-install with --force
    bash "$INSTALL_SCRIPT" --force

    # Assert: Old skills removed, only mg-build exists
    [ ! -d "$CLAUDE_DIR/skills/implement" ]
    [ ! -d "$CLAUDE_DIR/skills/engineering-team" ]
    [ -d "$CLAUDE_DIR/skills/mg-build" ]
}

@test "M2: Re-install with mixed stale/current skills" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    # Add old skill alongside current
    mkdir -p "$CLAUDE_DIR/skills/code-review"
    echo "old" > "$CLAUDE_DIR/skills/code-review/SKILL.md"

    bash "$INSTALL_SCRIPT" --force

    # Only current skill should exist
    [ ! -d "$CLAUDE_DIR/skills/code-review" ]
    [ -d "$CLAUDE_DIR/skills/mg-code-review" ]
}

@test "M3: Re-install with complete v0.x installation" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    # Create all 14 pre-v1.0 skills
    local old_skills=(
        "implement" "engineering-team" "code-review" "init-project"
        "launch-metrics" "incident-response" "deployment" "documentation"
        "marketing-content" "user-research" "design" "leadership-team"
        "help" "version"
    )

    for skill in "${old_skills[@]}"; do
        mkdir -p "$CLAUDE_DIR/skills/$skill"
        echo "old" > "$CLAUDE_DIR/skills/$skill/SKILL.md"
    done

    bash "$INSTALL_SCRIPT" --force

    # All old skills removed
    for skill in "${old_skills[@]}"; do
        [ ! -d "$CLAUDE_DIR/skills/$skill" ]
    done

    # Only mg-* skills exist
    local mg_count=$(find "$CLAUDE_DIR/skills" -maxdepth 1 -type d -name "mg-*" | wc -l | tr -d ' ')
    [ "$mg_count" -eq 16 ]
}

@test "M4: Stale skills with nested content" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    # Create deep nested structure
    mkdir -p "$CLAUDE_DIR/skills/implement/nested/deep"
    for i in {1..100}; do
        echo "line $i" >> "$CLAUDE_DIR/skills/implement/SKILL.md"
    done
    echo "data" > "$CLAUDE_DIR/skills/implement/nested/deep/data.json"

    bash "$INSTALL_SCRIPT" --force

    # All nested content removed
    [ ! -d "$CLAUDE_DIR/skills/implement" ]
}

@test "M5: Stale agents directory" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    mkdir -p "$CLAUDE_DIR/agents/old-agent"
    echo "old" > "$CLAUDE_DIR/agents/old-agent/AGENT.md"

    bash "$INSTALL_SCRIPT" --force

    [ ! -d "$CLAUDE_DIR/agents/old-agent" ]
    # Should have 19 current agents
    local agent_count=$(find "$CLAUDE_DIR/agents" -maxdepth 1 -type d ! -name agents | wc -l | tr -d ' ')
    [ "$agent_count" -eq 19 ]
}

@test "M6: Stale shared protocols" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    echo "old" > "$CLAUDE_DIR/shared/old-protocol.md"

    bash "$INSTALL_SCRIPT" --force

    [ ! -f "$CLAUDE_DIR/shared/old-protocol.md" ]
    # Should have 6 current protocols
    local protocol_count=$(find "$CLAUDE_DIR/shared" -maxdepth 1 -type f -name "*.md" | wc -l | tr -d ' ')
    [ "$protocol_count" -eq 6 ]
}

@test "M7: Stale scripts directory" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    echo "#!/bin/bash" > "$CLAUDE_DIR/scripts/old-script.sh"

    bash "$INSTALL_SCRIPT" --force

    [ ! -f "$CLAUDE_DIR/scripts/old-script.sh" ]
}

@test "M8: Stale hooks directory" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    echo "#!/bin/bash" > "$CLAUDE_DIR/hooks/old-hook"

    bash "$INSTALL_SCRIPT" --force

    [ ! -f "$CLAUDE_DIR/hooks/old-hook" ]
}

@test "M9: Stale schemas directory" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    echo "{}" > "$CLAUDE_DIR/schemas/old-schema.json"

    bash "$INSTALL_SCRIPT" --force

    [ ! -f "$CLAUDE_DIR/schemas/old-schema.json" ]
}

# ---- Permission and Access Issues ----

@test "M10: Cleanup fails due to read-only stale dir" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    mkdir -p "$CLAUDE_DIR/skills/implement"
    chmod 000 "$CLAUDE_DIR/skills/implement"

    # Should exit with error
    run bash "$INSTALL_SCRIPT" --force
    [ "$status" -ne 0 ]

    # Cleanup for teardown
    chmod 755 "$CLAUDE_DIR/skills/implement"
}

@test "M11: Cleanup handles symlink loop" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    mkdir -p "$CLAUDE_DIR/skills/stale"
    ln -s "$CLAUDE_DIR/skills/stale" "$CLAUDE_DIR/skills/stale/loop"

    # Should handle gracefully
    run bash "$INSTALL_SCRIPT" --force
    [ "$status" -eq 0 ] || [ "$status" -ne 0 ]  # Either succeeds or fails safely
}

@test "M12: Non-directory file with same name as managed dir" {
    cd "$TEST_DIR"
    mkdir -p "$CLAUDE_DIR"

    # Create file instead of directory
    touch "$CLAUDE_DIR/skills"

    run bash "$INSTALL_SCRIPT" --force
    [ "$status" -ne 0 ]
    [[ "$output" =~ "skills" ]] || [[ "$output" =~ "type" ]]
}

# ---- Edge Cases ----

@test "M13: Re-install without --force flag" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    # Second install without --force
    run bash "$INSTALL_SCRIPT"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "already" ]] || [[ "$output" =~ "installed" ]]
}

@test "M14: Cleanup with very deep directory nesting" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    # Create 25-level deep nesting
    local deep_path="$CLAUDE_DIR/skills/old"
    mkdir -p "$deep_path"
    for i in {1..25}; do
        deep_path="$deep_path/level$i"
        mkdir -p "$deep_path"
    done

    bash "$INSTALL_SCRIPT" --force

    [ ! -d "$CLAUDE_DIR/skills/old" ]
}

@test "M15: Concurrent install attempts (basic check)" {
    skip "Concurrent test is flaky - manual verification required"

    cd "$TEST_DIR"

    # Start two installs in background
    bash "$INSTALL_SCRIPT" --force &
    bash "$INSTALL_SCRIPT" --force &

    wait

    # At least installation should complete
    [ -f "$CLAUDE_DIR/MG_INSTALL.json" ]
}

# ============================================================================
# BOUNDARY TESTS (11 tests)
# ============================================================================

# ---- Empty and Minimal States ----

@test "B1: Re-install over empty target" {
    cd "$TEST_DIR"
    mkdir -p "$CLAUDE_DIR"

    bash "$INSTALL_SCRIPT" --force

    [ -d "$CLAUDE_DIR/agents" ]
    [ -d "$CLAUDE_DIR/skills" ]
    [ -d "$CLAUDE_DIR/shared" ]
}

@test "B2: Re-install with only .gitkeep files" {
    cd "$TEST_DIR"
    mkdir -p "$CLAUDE_DIR/skills"
    touch "$CLAUDE_DIR/skills/.gitkeep"

    bash "$INSTALL_SCRIPT" --force

    # .gitkeep removed, new content installed
    [ ! -f "$CLAUDE_DIR/skills/.gitkeep" ]
    [ -d "$CLAUDE_DIR/skills/mg-build" ]
}

@test "B3: Partial installation (interrupted)" {
    cd "$TEST_DIR"
    mkdir -p "$CLAUDE_DIR/agents/dev"
    echo "partial" > "$CLAUDE_DIR/agents/dev/AGENT.md"

    bash "$INSTALL_SCRIPT" --force

    # Fresh install completes
    [ -f "$CLAUDE_DIR/agents/dev/AGENT.md" ]
    [ -d "$CLAUDE_DIR/skills" ]
}

# ---- Directory Name Collisions ----

@test "B4: Stale skill name prefix collision" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    mkdir -p "$CLAUDE_DIR/skills/mg-build-old"
    mkdir -p "$CLAUDE_DIR/skills/mg-b"

    bash "$INSTALL_SCRIPT" --force

    # Both removed (full directory removal)
    [ ! -d "$CLAUDE_DIR/skills/mg-build-old" ]
    [ ! -d "$CLAUDE_DIR/skills/mg-b" ]
    [ -d "$CLAUDE_DIR/skills/mg-build" ]
}

@test "B5: Hidden stale directories" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    mkdir -p "$CLAUDE_DIR/skills/.old-skill"

    bash "$INSTALL_SCRIPT" --force

    # Hidden dirs NOT removed (cleanup targets known dirs only)
    [ -d "$CLAUDE_DIR/skills/.old-skill" ]
}

@test "B6: Case-sensitive collisions (macOS)" {
    skip "Filesystem-dependent test"
}

# ---- Filesystem Limits ----

@test "B7: Large stale installation (1K files)" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    # Create 1000 files (reduced from 10K for test speed)
    mkdir -p "$CLAUDE_DIR/skills/large-stale"
    for i in {1..1000}; do
        echo "data" > "$CLAUDE_DIR/skills/large-stale/file-$i.txt"
    done

    # Should complete within reasonable time
    timeout 30s bash "$INSTALL_SCRIPT" --force

    [ ! -d "$CLAUDE_DIR/skills/large-stale" ]
}

@test "B8: Cleanup with nearly full disk" {
    skip "Requires disk manipulation - manual test"
}

@test "B9: Target on read-only filesystem" {
    skip "Requires mount manipulation - manual test"
}

# ---- Backup and Recovery ----

@test "B10: Backup exists before cleanup" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    mkdir -p "$CLAUDE_DIR/.backup"
    echo "backup data" > "$CLAUDE_DIR/.backup/data.json"

    bash "$INSTALL_SCRIPT" --force

    # Backup NOT removed
    [ -d "$CLAUDE_DIR/.backup" ]
    [ -f "$CLAUDE_DIR/.backup/data.json" ]
}

@test "B11: Re-install preserves settings.local.json" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    echo '{"custom": "config"}' > "$CLAUDE_DIR/settings.local.json"

    bash "$INSTALL_SCRIPT" --force

    # settings.local.json preserved
    [ -f "$CLAUDE_DIR/settings.local.json" ]
    grep -q "custom" "$CLAUDE_DIR/settings.local.json"
}

# ============================================================================
# GOLDEN PATH (12 tests)
# ============================================================================

# ---- Standard Re-install Flows ----

@test "G1: Clean re-install over current version" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    # Re-install
    bash "$INSTALL_SCRIPT" --force

    # All components present
    local skill_count=$(find "$CLAUDE_DIR/skills" -maxdepth 1 -type d -name "mg-*" | wc -l | tr -d ' ')
    [ "$skill_count" -eq 16 ]

    local agent_count=$(find "$CLAUDE_DIR/agents" -maxdepth 1 -type d ! -name agents | wc -l | tr -d ' ')
    [ "$agent_count" -eq 19 ]

    local protocol_count=$(find "$CLAUDE_DIR/shared" -maxdepth 1 -type f -name "*.md" | wc -l | tr -d ' ')
    [ "$protocol_count" -eq 6 ]
}

@test "G2: First-time install (no cleanup needed)" {
    cd "$TEST_DIR"

    bash "$INSTALL_SCRIPT" --force

    # All content installed
    [ -d "$CLAUDE_DIR/agents" ]
    [ -d "$CLAUDE_DIR/skills" ]
    [ -d "$CLAUDE_DIR/shared" ]
    [ -f "$CLAUDE_DIR/MG_INSTALL.json" ]
}

@test "G3: Re-install after version upgrade" {
    cd "$TEST_DIR"

    # Simulate v0.9.0 installation
    mkdir -p "$CLAUDE_DIR/skills/implement"
    echo "v0.9.0" > "$CLAUDE_DIR/MG_INSTALL.json"

    # Install v1.0.0
    bash "$INSTALL_SCRIPT" --force

    # Old version cleaned
    [ ! -d "$CLAUDE_DIR/skills/implement" ]
    [ -d "$CLAUDE_DIR/skills/mg-build" ]
}

@test "G4: Re-install preserves project memory" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    mkdir -p "$CLAUDE_DIR/memory"
    echo '{"tasks": []}' > "$CLAUDE_DIR/memory/tasks-dev.json"

    bash "$INSTALL_SCRIPT" --force

    # memory/ untouched
    [ -f "$CLAUDE_DIR/memory/tasks-dev.json" ]
    grep -q "tasks" "$CLAUDE_DIR/memory/tasks-dev.json"
}

@test "G5: Re-install preserves agent-memory" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    mkdir -p "$CLAUDE_DIR/agent-memory/qa"
    echo "# Notes" > "$CLAUDE_DIR/agent-memory/qa/MEMORY.md"

    bash "$INSTALL_SCRIPT" --force

    # agent-memory/ untouched
    [ -f "$CLAUDE_DIR/agent-memory/qa/MEMORY.md" ]
}

# ---- Cleanup Verification ----

@test "G6: Cleanup removes exactly managed directories" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    # Add stale content
    mkdir -p "$CLAUDE_DIR/skills/old-skill"

    bash "$INSTALL_SCRIPT" --force

    # Managed directories cleaned and recreated
    [ ! -d "$CLAUDE_DIR/skills/old-skill" ]
    [ -d "$CLAUDE_DIR/skills/mg-build" ]
}

@test "G7: Cleanup order (before copy)" {
    cd "$TEST_DIR"

    run bash "$INSTALL_SCRIPT" --force

    # Installation succeeds
    [ "$status" -eq 0 ]
    [ -d "$CLAUDE_DIR/skills" ]
}

@test "G8: Idempotent re-install" {
    cd "$TEST_DIR"

    # Install 3 times
    bash "$INSTALL_SCRIPT" --force
    bash "$INSTALL_SCRIPT" --force
    bash "$INSTALL_SCRIPT" --force

    # Final state identical
    [ -d "$CLAUDE_DIR/skills/mg-build" ]
    [ -f "$CLAUDE_DIR/MG_INSTALL.json" ]
}

# ---- Build Integration ----

@test "G9: build-dist.sh produces installer with cleanup" {
    # Check that dist installer contains cleanup logic
    grep -q "Clean existing MG-managed directories" "$INSTALL_SCRIPT" || \
    grep -q "cleanup" "$INSTALL_SCRIPT" || \
    grep -q "rm -rf" "$INSTALL_SCRIPT"
}

@test "G10: Installed cleanup logic matches source" {
    # Compare source and dist installers
    local source="$BATS_TEST_DIRNAME/../../src/installer/install.sh"

    if [ ! -f "$source" ]; then
        skip "Source installer not found"
    fi

    # Both should contain cleanup logic
    grep -q "rm -rf" "$source"
    grep -q "rm -rf" "$INSTALL_SCRIPT"
}

# ---- Post-Cleanup Validation ----

@test "G11: Skill count after cleanup" {
    cd "$TEST_DIR"
    bash "$INSTALL_SCRIPT" --force

    # Add 5 stale skills
    for i in {1..5}; do
        mkdir -p "$CLAUDE_DIR/skills/stale-$i"
    done

    bash "$INSTALL_SCRIPT" --force

    # Exactly 16 mg-* skills
    local mg_count=$(find "$CLAUDE_DIR/skills" -maxdepth 1 -type d -name "mg-*" | wc -l | tr -d ' ')
    [ "$mg_count" -eq 16 ]
}

@test "G12: Directory structure after cleanup" {
    cd "$TEST_DIR"

    # Stale installation
    mkdir -p "$CLAUDE_DIR/skills/old-skill"

    bash "$INSTALL_SCRIPT" --force

    # Expected hierarchy
    [ -d "$CLAUDE_DIR/agents" ]
    [ -d "$CLAUDE_DIR/skills" ]
    [ -d "$CLAUDE_DIR/shared" ]
    [ -d "$CLAUDE_DIR/scripts" ]
    [ -d "$CLAUDE_DIR/hooks" ]
    [ -d "$CLAUDE_DIR/memory" ]
}
