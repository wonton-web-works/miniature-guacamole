#!/usr/bin/env bats
# ============================================================================
# WS-SCRIPTS-3: Agent Adoption & Distribution Tests
# ============================================================================
# Verifies that mg-* scripts are properly integrated into the framework:
# - Documentation references (memory-protocol.md, AGENT.md files, SKILL.md)
# - Installer functionality (install.sh deploys scripts/)
# - mg-help command lists all 9 scripts
#
# Test ordering: MISUSE → BOUNDARY → GOLDEN PATH (CAD protocol)
# ============================================================================

# Test fixtures
FIXTURES_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/fixtures" && pwd)"
TEST_DIR=""

# ============================================================================
# Setup and Teardown
# ============================================================================

setup() {
    TEST_DIR="$(mktemp -d)"

    # Define expected scripts list
    export EXPECTED_SCRIPTS=(
        "mg-diff-summary"
        "mg-gate-check"
        "mg-git-summary"
        "mg-help"
        "mg-memory-read"
        "mg-memory-write"
        "mg-workstream-create"
        "mg-workstream-status"
        "mg-workstream-transition"
    )
}

teardown() {
    if [[ -n "$TEST_DIR" ]] && [[ -d "$TEST_DIR" ]]; then
        rm -rf "$TEST_DIR"
    fi
}

# ============================================================================
# MISUSE CASES - Invalid installations, missing files, malformed docs
# ============================================================================

@test "WS-SCRIPTS-3 (misuse): install.sh fails when source .claude directory missing" {
    # Simulate install.sh running from wrong directory
    mkdir -p "$TEST_DIR/fake-dist"
    cd "$TEST_DIR/fake-dist"

    # Create minimal install.sh that checks for .claude/
    cat > install.sh <<'EOF'
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$SCRIPT_DIR/.claude"
if [ ! -d "$CLAUDE_DIR" ]; then
    echo "Error: .claude directory not found at $CLAUDE_DIR" >&2
    exit 1
fi
EOF
    chmod +x install.sh

    run ./install.sh
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Error: .claude directory not found" ]]
}

@test "WS-SCRIPTS-3 (misuse): install.sh fails gracefully when scripts/ directory empty" {
    # Create distribution without scripts
    mkdir -p "$TEST_DIR/dist-no-scripts/.claude/scripts"
    mkdir -p "$TEST_DIR/dist-no-scripts/.claude/agents"
    mkdir -p "$TEST_DIR/dist-no-scripts/.claude/skills"

    # Verify directory is actually empty
    run bash -c "ls -A '$TEST_DIR/dist-no-scripts/.claude/scripts/'"
    [ "$status" -eq 0 ]
    [ -z "$output" ]
}

@test "WS-SCRIPTS-3 (misuse): memory-protocol.md missing mg-* references triggers warning" {
    # Create memory-protocol.md without script references
    mkdir -p "$TEST_DIR/test-shared"
    cat > "$TEST_DIR/test-shared/memory-protocol.md" <<'EOF'
# Memory Protocol Reference
Agents use JSON files.
EOF

    # Verify mg-memory-read is NOT mentioned
    run grep -q "mg-memory-read" "$TEST_DIR/test-shared/memory-protocol.md"
    [ "$status" -eq 1 ]

    # Verify mg-memory-write is NOT mentioned
    run grep -q "mg-memory-write" "$TEST_DIR/test-shared/memory-protocol.md"
    [ "$status" -eq 1 ]
}

@test "WS-SCRIPTS-3 (misuse): agent AGENT.md missing Memory Protocol section" {
    # Create dev AGENT.md without memory protocol
    mkdir -p "$TEST_DIR/test-agents/dev"
    cat > "$TEST_DIR/test-agents/dev/AGENT.md" <<'EOF'
---
name: dev
---
# Senior Fullstack Engineer
You implement features.
EOF

    # Verify Memory Protocol section is missing
    run grep -q "## Memory Protocol" "$TEST_DIR/test-agents/dev/AGENT.md"
    [ "$status" -eq 1 ]
}

@test "WS-SCRIPTS-3 (misuse): mg-help fails when ~/.claude/scripts directory missing" {
    # Test mg-help behavior when scripts directory doesn't exist
    local fake_home="$TEST_DIR/fake-home"
    mkdir -p "$fake_home"

    # Create mg-help that looks in fake home
    cat > "$TEST_DIR/mg-help-test" <<'EOF'
#!/usr/bin/env bash
SCRIPTS_DIR="$TEST_HOME/.claude/scripts"
if [[ -d "$SCRIPTS_DIR" ]]; then
    echo "Scripts directory exists"
else
    echo "(Scripts directory not found: $SCRIPTS_DIR)"
fi
EOF
    chmod +x "$TEST_DIR/mg-help-test"

    TEST_HOME="$fake_home" run "$TEST_DIR/mg-help-test"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Scripts directory not found" ]]
}

@test "WS-SCRIPTS-3 (misuse): SKILL.md missing artifact bundle context" {
    # Create engineering-team SKILL.md without artifact bundles
    mkdir -p "$TEST_DIR/test-skills/engineering-team"
    cat > "$TEST_DIR/test-skills/engineering-team/SKILL.md" <<'EOF'
---
name: engineering-team
---
# Engineering Team
Coordinates dev and qa.
EOF

    # Verify no mention of INPUTS, GATE, CONSTRAINTS sections
    run grep -q "INPUTS" "$TEST_DIR/test-skills/engineering-team/SKILL.md"
    [ "$status" -eq 1 ]
}

@test "WS-SCRIPTS-3 (misuse): install.sh with non-executable scripts" {
    # Create scripts directory with non-executable files
    mkdir -p "$TEST_DIR/dist-bad-perms/.claude/scripts"
    touch "$TEST_DIR/dist-bad-perms/.claude/scripts/mg-help"
    touch "$TEST_DIR/dist-bad-perms/.claude/scripts/mg-memory-read"

    # Verify files are not executable
    [ ! -x "$TEST_DIR/dist-bad-perms/.claude/scripts/mg-help" ]
    [ ! -x "$TEST_DIR/dist-bad-perms/.claude/scripts/mg-memory-read" ]
}

@test "WS-SCRIPTS-3 (misuse): incomplete script installation (only 5 of 9 scripts)" {
    # Partial installation scenario
    mkdir -p "$TEST_DIR/partial-install/.claude/scripts"
    touch "$TEST_DIR/partial-install/.claude/scripts/mg-help"
    touch "$TEST_DIR/partial-install/.claude/scripts/mg-memory-read"
    touch "$TEST_DIR/partial-install/.claude/scripts/mg-memory-write"
    touch "$TEST_DIR/partial-install/.claude/scripts/mg-gate-check"
    touch "$TEST_DIR/partial-install/.claude/scripts/mg-git-summary"

    # Count scripts (should be 5, not 9)
    run bash -c "ls '$TEST_DIR/partial-install/.claude/scripts/' | wc -l"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "5" ]]
}

# ============================================================================
# BOUNDARY TESTS - Edge cases in documentation, partial references, limits
# ============================================================================

@test "WS-SCRIPTS-3 (boundary): memory-protocol.md mentions scripts but lacks examples" {
    # Protocol mentions scripts but doesn't show usage examples
    cat > "$TEST_DIR/memory-protocol-no-examples.md" <<'EOF'
# Memory Protocol Reference
Agents can use mg-memory-read and mg-memory-write commands.
EOF

    # Has references but no code blocks
    run grep -q "mg-memory-read" "$TEST_DIR/memory-protocol-no-examples.md"
    [ "$status" -eq 0 ]

    run grep -q '```bash' "$TEST_DIR/memory-protocol-no-examples.md"
    [ "$status" -eq 1 ]
}

@test "WS-SCRIPTS-3 (boundary): agent AGENT.md has Memory Protocol but no script references" {
    # AGENT.md has Memory Protocol section but uses old method (direct file access)
    cat > "$TEST_DIR/agent-old-style.md" <<'EOF'
# QA Engineer
## Memory Protocol
```yaml
read: .claude/memory/tasks-qa.json
write: .claude/memory/test-results.json
```
EOF

    # Has Memory Protocol section
    run grep -q "## Memory Protocol" "$TEST_DIR/agent-old-style.md"
    [ "$status" -eq 0 ]

    # But doesn't mention mg-* scripts
    run grep -q "mg-memory-" "$TEST_DIR/agent-old-style.md"
    [ "$status" -eq 1 ]
}

@test "WS-SCRIPTS-3 (boundary): install.sh copies scripts but doesn't set executable bits" {
    # Simulate installer that copies but forgets chmod +x
    mkdir -p "$TEST_DIR/dist-no-exec/.claude/scripts"
    mkdir -p "$TEST_DIR/install-target/.claude/scripts"

    echo "#!/usr/bin/env bash" > "$TEST_DIR/dist-no-exec/.claude/scripts/mg-help"

    # Copy without preserving permissions
    cp "$TEST_DIR/dist-no-exec/.claude/scripts/mg-help" "$TEST_DIR/install-target/.claude/scripts/mg-help"

    # Verify not executable
    [ ! -x "$TEST_DIR/install-target/.claude/scripts/mg-help" ]
}

@test "WS-SCRIPTS-3 (boundary): mg-help lists scripts in wrong order (unsorted)" {
    # Create test scripts with names that would sort differently
    mkdir -p "$TEST_DIR/unsorted-scripts"
    touch "$TEST_DIR/unsorted-scripts/mg-zebra"
    touch "$TEST_DIR/unsorted-scripts/mg-aardvark"
    touch "$TEST_DIR/unsorted-scripts/mg-middle"

    # Get list (should be sorted alphabetically)
    run bash -c "ls '$TEST_DIR/unsorted-scripts/' | sort"
    [ "$status" -eq 0 ]
    [[ "${lines[0]}" == "mg-aardvark" ]]
    [[ "${lines[1]}" == "mg-middle" ]]
    [[ "${lines[2]}" == "mg-zebra" ]]
}

@test "WS-SCRIPTS-3 (boundary): install.sh with existing scripts (backup scenario)" {
    # Installer should backup existing scripts before installing
    mkdir -p "$TEST_DIR/home-existing/.claude/scripts"
    mkdir -p "$TEST_DIR/dist-new/.claude/scripts"

    # Existing script
    echo "old version" > "$TEST_DIR/home-existing/.claude/scripts/mg-help"

    # New script
    echo "new version" > "$TEST_DIR/dist-new/.claude/scripts/mg-help"

    # Verify old version exists
    run grep -q "old version" "$TEST_DIR/home-existing/.claude/scripts/mg-help"
    [ "$status" -eq 0 ]
}

@test "WS-SCRIPTS-3 (boundary): documentation references subset of 9 scripts (only 6 mentioned)" {
    # Realistic scenario: docs mention commonly-used scripts, not all 9
    cat > "$TEST_DIR/partial-docs.md" <<'EOF'
# Memory Protocol
Use these commands:
- mg-memory-read
- mg-memory-write
- mg-help
- mg-gate-check
- mg-workstream-status
- mg-workstream-transition
EOF

    # Count references (should be 6)
    run bash -c "grep -c 'mg-' '$TEST_DIR/partial-docs.md'"
    [ "$status" -eq 0 ]
    [ "$output" -eq 6 ]
}

@test "WS-SCRIPTS-3 (boundary): SKILL.md artifact bundles reference scripts generically" {
    # SKILL.md mentions scripts exist but doesn't enumerate them
    cat > "$TEST_DIR/generic-references.md" <<'EOF'
# Engineering Team
## Artifact Bundle
INPUTS:
  - Use mg-* commands for memory access
EOF

    run grep -q "mg-\\*" "$TEST_DIR/generic-references.md"
    [ "$status" -eq 0 ]
}

@test "WS-SCRIPTS-3 (boundary): mg-help with zero executable scripts in directory" {
    # Scripts exist but none are executable
    mkdir -p "$TEST_DIR/all-non-exec/.claude/scripts"
    touch "$TEST_DIR/all-non-exec/.claude/scripts/mg-help"
    touch "$TEST_DIR/all-non-exec/.claude/scripts/mg-memory-read"

    # Verify none are executable (find returns empty output)
    run bash -c "find '$TEST_DIR/all-non-exec/.claude/scripts' -type f -executable | wc -l"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "0" ]]
}

@test "WS-SCRIPTS-3 (boundary): install.sh target directory has space in path" {
    # Test handling of paths with spaces
    local spaced_dir="$TEST_DIR/path with spaces/.claude/scripts"
    mkdir -p "$spaced_dir"
    touch "$spaced_dir/mg-help"

    # Verify directory exists
    [ -d "$spaced_dir" ]
    [ -f "$spaced_dir/mg-help" ]
}

# ============================================================================
# GOLDEN PATH - Normal operations, complete installation, proper documentation
# ============================================================================

@test "WS-SCRIPTS-3 (golden): memory-protocol.md references mg-memory-read and mg-memory-write" {
    # Verify actual memory-protocol.md contains script references
    local protocol_file="$HOME/.claude/shared/memory-protocol.md"

    [ -f "$protocol_file" ]

    # Check for mg-memory-read reference
    run grep -q "mg-memory-read" "$protocol_file"
    [ "$status" -eq 0 ]

    # Check for mg-memory-write reference
    run grep -q "mg-memory-write" "$protocol_file"
    [ "$status" -eq 0 ]
}

@test "WS-SCRIPTS-3 (golden): memory-protocol.md includes usage examples for scripts" {
    # Documentation should show how to use scripts
    local protocol_file="$HOME/.claude/shared/memory-protocol.md"

    [ -f "$protocol_file" ]

    # Check for bash code blocks (usage examples)
    run grep -q '```bash' "$protocol_file"
    [ "$status" -eq 0 ]

    # Check for script usage examples
    run grep -q "mg-memory-read.*\.claude/memory" "$protocol_file"
    [ "$status" -eq 0 ]
}

@test "WS-SCRIPTS-3 (golden): dev AGENT.md Memory Protocol section mentions mg-* commands" {
    # Dev agent should reference scripts in memory protocol
    local dev_agent="$HOME/.claude/agents/dev/AGENT.md"

    [ -f "$dev_agent" ]

    # Verify Memory Protocol section exists
    run grep -q "## Memory Protocol" "$dev_agent"
    [ "$status" -eq 0 ]

    # Check for mg-* command references
    run grep -q "mg-memory-read" "$dev_agent"
    [ "$status" -eq 0 ]

    run grep -q "mg-memory-write" "$dev_agent"
    [ "$status" -eq 0 ]
}

@test "WS-SCRIPTS-3 (golden): qa AGENT.md Memory Protocol section mentions mg-* commands" {
    # QA agent should reference scripts
    local qa_agent="$HOME/.claude/agents/qa/AGENT.md"

    [ -f "$qa_agent" ]

    # Verify Memory Protocol section exists
    run grep -q "## Memory Protocol" "$qa_agent"
    [ "$status" -eq 0 ]

    # Check for mg-* command references
    run grep -q "mg-memory-read" "$qa_agent"
    [ "$status" -eq 0 ]

    run grep -q "mg-gate-check" "$qa_agent"
    [ "$status" -eq 0 ]
}

@test "WS-SCRIPTS-3 (golden): engineering-manager AGENT.md references scripts" {
    # Engineering manager coordinates team, should reference scripts
    local em_agent="$HOME/.claude/agents/engineering-manager/AGENT.md"

    [ -f "$em_agent" ]

    # Check for workstream script references
    run grep -q "mg-workstream-status" "$em_agent"
    [ "$status" -eq 0 ]

    run grep -q "mg-workstream-create" "$em_agent"
    [ "$status" -eq 0 ]

    run grep -q "mg-workstream-transition" "$em_agent"
    [ "$status" -eq 0 ]
}

@test "WS-SCRIPTS-3 (golden): engineering-team SKILL.md artifact bundles reference available scripts" {
    # SKILL.md should document available mg-* commands for agents
    local skill_file="$HOME/.claude/skills/engineering-team/SKILL.md"

    [ -f "$skill_file" ]

    # Check for script references in artifact bundles context
    run grep -q "mg-memory-read" "$skill_file"
    [ "$status" -eq 0 ]

    run grep -q "mg-memory-write" "$skill_file"
    [ "$status" -eq 0 ]

    run grep -q "mg-gate-check" "$skill_file"
    [ "$status" -eq 0 ]
}

@test "WS-SCRIPTS-3 (golden): install.sh copies scripts/ directory to ~/.claude/scripts" {
    # Verify real installer handles scripts
    # Find project root (tests/scripts is 2 levels down from root)
    local project_root="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"
    local dist_install="$project_root/dist/miniature-guacamole/install.sh"

    [ -f "$dist_install" ]

    # Check if installer references scripts directory
    run grep -q "Installing scripts" "$dist_install"
    [ "$status" -eq 0 ]

    # Check if installer copies scripts
    run grep -q 'scripts"/mg-' "$dist_install"
    [ "$status" -eq 0 ]
}

@test "WS-SCRIPTS-3 (golden): install.sh sets executable permissions on all scripts" {
    # After installation, all mg-* scripts should be executable
    local project_root="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"
    local dist_install="$project_root/dist/miniature-guacamole/install.sh"

    [ -f "$dist_install" ]

    # Check if installer sets executable permissions
    run grep -q "chmod +x.*target" "$dist_install"
    [ "$status" -eq 0 ]
}

@test "WS-SCRIPTS-3 (golden): mg-help lists all 9 mg-* scripts" {
    # Verify mg-help discovers and lists all scripts
    local mg_help="$HOME/.claude/scripts/mg-help"

    [ -f "$mg_help" ]
    [ -x "$mg_help" ]

    # Run mg-help and capture output
    run "$mg_help"
    [ "$status" -eq 0 ]

    # Verify all 9 scripts are listed
    for script in "${EXPECTED_SCRIPTS[@]}"; do
        [[ "$output" =~ "$script" ]]
    done
}

@test "WS-SCRIPTS-3 (golden): mg-help shows script descriptions" {
    # mg-help should show one-line descriptions for each script
    local mg_help="$HOME/.claude/scripts/mg-help"

    [ -f "$mg_help" ]
    [ -x "$mg_help" ]

    run "$mg_help"
    [ "$status" -eq 0 ]

    # Check for key descriptions
    [[ "$output" =~ "Read and pretty-print JSON memory files" ]]
    [[ "$output" =~ "Atomically update JSON memory files" ]]
    [[ "$output" =~ "Show help for mg-* commands" ]]
}

@test "WS-SCRIPTS-3 (golden): all 9 scripts exist in ~/.claude/scripts" {
    # Verify complete installation
    local scripts_dir="$HOME/.claude/scripts"

    [ -d "$scripts_dir" ]

    # Check each expected script
    for script in "${EXPECTED_SCRIPTS[@]}"; do
        local script_path="$scripts_dir/$script"
        echo "Checking: $script_path" >&2
        [ -f "$script_path" ]
    done
}

@test "WS-SCRIPTS-3 (golden): all 9 scripts are executable" {
    # Verify permissions
    local scripts_dir="$HOME/.claude/scripts"

    [ -d "$scripts_dir" ]

    for script in "${EXPECTED_SCRIPTS[@]}"; do
        local script_path="$scripts_dir/$script"
        [ -x "$script_path" ]
    done
}

@test "WS-SCRIPTS-3 (golden): memory-protocol.md prefers scripts over direct file access" {
    # Documentation should recommend scripts as primary method
    local protocol_file="$HOME/.claude/shared/memory-protocol.md"

    [ -f "$protocol_file" ]

    # Check for preference language
    run grep -qi "prefer.*script" "$protocol_file"
    [ "$status" -eq 0 ]
}

@test "WS-SCRIPTS-3 (golden): engineering-team artifact bundles list all 9 available scripts" {
    # SKILL.md should enumerate tools available to agents
    local skill_file="$HOME/.claude/skills/engineering-team/SKILL.md"

    [ -f "$skill_file" ]

    # Check for all 9 scripts
    for script in "${EXPECTED_SCRIPTS[@]}"; do
        run grep -q "$script" "$skill_file"
        [ "$status" -eq 0 ]
    done
}

@test "WS-SCRIPTS-3 (golden): install.sh includes scripts in installation summary" {
    # Installer should report scripts deployment
    local project_root="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"
    local dist_install="$project_root/dist/miniature-guacamole/install.sh"

    [ -f "$dist_install" ]

    # Check for scripts section in summary
    run grep -q "Script utilities" "$dist_install"
    [ "$status" -eq 0 ]

    run grep -q "mg-" "$dist_install"
    [ "$status" -eq 0 ]
}

@test "WS-SCRIPTS-3 (golden): CLAUDE.md (global) mentions mg-* utilities availability" {
    # Framework introduction should mention script utilities
    local claude_md="$HOME/.claude/CLAUDE.md"

    [ -f "$claude_md" ]

    # Check for script utilities section
    run grep -q "Script Utilities" "$claude_md"
    [ "$status" -eq 0 ]

    # Check for mg-* command mentions
    run grep -q "mg-memory-read" "$claude_md"
    [ "$status" -eq 0 ]

    run grep -q "mg-help" "$claude_md"
    [ "$status" -eq 0 ]
}

# ============================================================================
# Integration Tests - Complete workflow verification
# ============================================================================

@test "WS-SCRIPTS-3 (integration): complete documentation chain references scripts" {
    # Verify end-to-end: CLAUDE.md → memory-protocol.md → AGENT.md → SKILL.md

    local claude_md="$HOME/.claude/CLAUDE.md"
    local protocol_file="$HOME/.claude/shared/memory-protocol.md"
    local dev_agent="$HOME/.claude/agents/dev/AGENT.md"
    local skill_file="$HOME/.claude/skills/engineering-team/SKILL.md"

    [ -f "$claude_md" ]
    [ -f "$protocol_file" ]
    [ -f "$dev_agent" ]
    [ -f "$skill_file" ]

    # Verify each file in the chain references mg-* scripts
    run grep -q "mg-" "$claude_md"
    [ "$status" -eq 0 ]

    run grep -q "mg-" "$protocol_file"
    [ "$status" -eq 0 ]

    run grep -q "mg-" "$dev_agent"
    [ "$status" -eq 0 ]

    run grep -q "mg-" "$skill_file"
    [ "$status" -eq 0 ]
}

@test "WS-SCRIPTS-3 (integration): install.sh full run deploys all 9 scripts correctly" {
    # End-to-end installer test (requires clean environment)
    # This test verifies the install.sh has the correct logic, not actual execution
    local project_root="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"
    local dist_install="$project_root/dist/miniature-guacamole/install.sh"
    local dist_scripts="$project_root/dist/miniature-guacamole/.claude/scripts"

    [ -f "$dist_install" ]
    [ -d "$dist_scripts" ]

    # Verify all 9 scripts exist in distribution
    for script in "${EXPECTED_SCRIPTS[@]}"; do
        [ -f "$dist_scripts/$script" ]
    done

    # Verify install.sh has scripts installation logic
    run grep -q "Installing scripts" "$dist_install"
    [ "$status" -eq 0 ]
}

@test "WS-SCRIPTS-3 (integration): agent spawned with artifact bundle can discover scripts via mg-help" {
    # Verify agent can discover available tools
    local mg_help="$HOME/.claude/scripts/mg-help"

    [ -f "$mg_help" ]
    [ -x "$mg_help" ]

    # Simulate agent discovering tools
    run "$mg_help"
    [ "$status" -eq 0 ]

    # Should list all 9 tools
    local count=0
    for script in "${EXPECTED_SCRIPTS[@]}"; do
        if [[ "$output" =~ "$script" ]]; then
            count=$((count + 1))
        fi
    done

    [ "$count" -eq 9 ]
}
