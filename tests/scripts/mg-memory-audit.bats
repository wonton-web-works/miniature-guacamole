#!/usr/bin/env bats
# ============================================================================
# mg-memory-audit.bats — WS-OSS-4: Stale Workstream + Memory Cleanup
# ============================================================================
# Test ordering: MISUSE CASES → BOUNDARY TESTS → GOLDEN PATH
# Coverage target: 99% (all 6 ACs)
#
# These tests are intentionally RED before WS-OSS-4 is implemented.
# They validate that the .claude/memory/ state files reflect reality:
#   - Merged workstreams show phase=done, gate_status=merged
#   - WS-MCP-0 scope updated to unified server (not read-only resources only)
#   - Completed non-DB workstreams show phase=done
#   - No stale gate_status=tests_written or phase=step_2_implementation
#   - deferred-v1-follow-ups.json references MCP Tier 2
#   - All state files are valid JSON
# ============================================================================

bats_require_minimum_version 1.5.0

setup() {
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"
    MEMORY_DIR="$PROJECT_ROOT/.claude/memory"
    DEFERRED_FILE="$MEMORY_DIR/deferred-v1-follow-ups.json"
}

# ============================================================================
# MISUSE CASES — Missing files, unparseable JSON, structural errors
# ============================================================================

@test "AC-OSS-4.6 MISUSE: WS-DB-1 state file must exist" {
    local f="$MEMORY_DIR/workstream-WS-DB-1-state.json"
    [ -f "$f" ]
}

@test "AC-OSS-4.6 MISUSE: WS-DB-2 state file must exist" {
    local f="$MEMORY_DIR/workstream-WS-DB-2-state.json"
    [ -f "$f" ]
}

@test "AC-OSS-4.6 MISUSE: WS-DB-3 state file must exist" {
    local f="$MEMORY_DIR/workstream-WS-DB-3-state.json"
    [ -f "$f" ]
}

@test "AC-OSS-4.6 MISUSE: WS-DB-5 state file must exist" {
    local f="$MEMORY_DIR/workstream-WS-DB-5-state.json"
    [ -f "$f" ]
}

@test "AC-OSS-4.6 MISUSE: WS-MCP-0 state file must exist" {
    local f="$MEMORY_DIR/workstream-WS-MCP-0-state.json"
    [ -f "$f" ]
}

@test "AC-OSS-4.6 MISUSE: WS-BENCH-1B state file must exist" {
    local f="$MEMORY_DIR/workstream-WS-BENCH-1B-state.json"
    [ -f "$f" ]
}

@test "AC-OSS-4.6 MISUSE: WS-SYNC-1 state file must exist" {
    local f="$MEMORY_DIR/workstream-WS-SYNC-1-state.json"
    [ -f "$f" ]
}

@test "AC-OSS-4.6 MISUSE: WS-OUTPUT-1 state file must exist" {
    local f="$MEMORY_DIR/workstream-WS-OUTPUT-1-state.json"
    [ -f "$f" ]
}

@test "AC-OSS-4.6 MISUSE: WS-OUTPUT-2 state file must exist" {
    local f="$MEMORY_DIR/workstream-WS-OUTPUT-2-state.json"
    [ -f "$f" ]
}

@test "AC-OSS-4.6 MISUSE: WS-OUTPUT-4 state file must exist" {
    local f="$MEMORY_DIR/workstream-WS-OUTPUT-4-state.json"
    [ -f "$f" ]
}

@test "AC-OSS-4.5 MISUSE: deferred-v1-follow-ups.json must exist" {
    [ -f "$DEFERRED_FILE" ]
}

@test "AC-OSS-4.6 MISUSE: WS-DB-1 state file is valid JSON" {
    local f="$MEMORY_DIR/workstream-WS-DB-1-state.json"
    run jq empty "$f"
    [ "$status" -eq 0 ]
}

@test "AC-OSS-4.6 MISUSE: WS-DB-2 state file is valid JSON" {
    local f="$MEMORY_DIR/workstream-WS-DB-2-state.json"
    run jq empty "$f"
    [ "$status" -eq 0 ]
}

@test "AC-OSS-4.6 MISUSE: WS-DB-3 state file is valid JSON" {
    local f="$MEMORY_DIR/workstream-WS-DB-3-state.json"
    run jq empty "$f"
    [ "$status" -eq 0 ]
}

@test "AC-OSS-4.6 MISUSE: WS-DB-5 state file is valid JSON" {
    local f="$MEMORY_DIR/workstream-WS-DB-5-state.json"
    run jq empty "$f"
    [ "$status" -eq 0 ]
}

@test "AC-OSS-4.6 MISUSE: WS-MCP-0 state file is valid JSON" {
    local f="$MEMORY_DIR/workstream-WS-MCP-0-state.json"
    run jq empty "$f"
    [ "$status" -eq 0 ]
}

@test "AC-OSS-4.6 MISUSE: WS-BENCH-1B state file is valid JSON" {
    local f="$MEMORY_DIR/workstream-WS-BENCH-1B-state.json"
    run jq empty "$f"
    [ "$status" -eq 0 ]
}

@test "AC-OSS-4.6 MISUSE: WS-SYNC-1 state file is valid JSON" {
    local f="$MEMORY_DIR/workstream-WS-SYNC-1-state.json"
    run jq empty "$f"
    [ "$status" -eq 0 ]
}

@test "AC-OSS-4.6 MISUSE: WS-OUTPUT-1 state file is valid JSON" {
    local f="$MEMORY_DIR/workstream-WS-OUTPUT-1-state.json"
    run jq empty "$f"
    [ "$status" -eq 0 ]
}

@test "AC-OSS-4.6 MISUSE: WS-OUTPUT-2 state file is valid JSON" {
    local f="$MEMORY_DIR/workstream-WS-OUTPUT-2-state.json"
    run jq empty "$f"
    [ "$status" -eq 0 ]
}

@test "AC-OSS-4.6 MISUSE: WS-OUTPUT-4 state file is valid JSON" {
    local f="$MEMORY_DIR/workstream-WS-OUTPUT-4-state.json"
    run jq empty "$f"
    [ "$status" -eq 0 ]
}

@test "AC-OSS-4.5 MISUSE: deferred-v1-follow-ups.json is valid JSON" {
    run jq empty "$DEFERRED_FILE"
    [ "$status" -eq 0 ]
}

@test "AC-OSS-4.6 MISUSE: all workstream state files in memory dir are valid JSON" {
    local failures=0
    for f in "$MEMORY_DIR"/workstream-*-state.json; do
        if ! jq empty "$f" 2>/dev/null; then
            echo "Invalid JSON: $f" >&3
            failures=$((failures + 1))
        fi
    done
    [ "$failures" -eq 0 ]
}

# ============================================================================
# BOUNDARY TESTS — Edge cases: workstream_id field present, required keys exist
# ============================================================================

@test "AC-OSS-4.1 BOUNDARY: WS-DB-1 state file has workstream_id field" {
    local f="$MEMORY_DIR/workstream-WS-DB-1-state.json"
    local id
    id="$(jq -r '.workstream_id' "$f")"
    [ "$id" = "WS-DB-1" ]
}

@test "AC-OSS-4.1 BOUNDARY: WS-DB-2 state file has workstream_id field" {
    local f="$MEMORY_DIR/workstream-WS-DB-2-state.json"
    local id
    id="$(jq -r '.workstream_id' "$f")"
    [ "$id" = "WS-DB-2" ]
}

@test "AC-OSS-4.1 BOUNDARY: WS-DB-3 state file has workstream_id field" {
    local f="$MEMORY_DIR/workstream-WS-DB-3-state.json"
    local id
    id="$(jq -r '.workstream_id' "$f")"
    [ "$id" = "WS-DB-3" ]
}

@test "AC-OSS-4.1 BOUNDARY: WS-DB-5 state file has workstream_id field" {
    local f="$MEMORY_DIR/workstream-WS-DB-5-state.json"
    local id
    id="$(jq -r '.workstream_id' "$f")"
    [ "$id" = "WS-DB-5" ]
}

@test "AC-OSS-4.1 BOUNDARY: WS-DB-1 state file has both phase and gate_status fields" {
    local f="$MEMORY_DIR/workstream-WS-DB-1-state.json"
    local phase gate_status
    phase="$(jq -r '.phase' "$f")"
    gate_status="$(jq -r '.gate_status' "$f")"
    [ "$phase" != "null" ]
    [ "$gate_status" != "null" ]
}

@test "AC-OSS-4.2 BOUNDARY: WS-MCP-0 state file has workstream_id field" {
    local f="$MEMORY_DIR/workstream-WS-MCP-0-state.json"
    local id
    id="$(jq -r '.workstream_id' "$f")"
    [ "$id" = "WS-MCP-0" ]
}

@test "AC-OSS-4.3 BOUNDARY: WS-BENCH-1B state file has workstream_id field" {
    local f="$MEMORY_DIR/workstream-WS-BENCH-1B-state.json"
    local id
    id="$(jq -r '.workstream_id' "$f")"
    [ "$id" = "WS-BENCH-1B" ]
}

@test "AC-OSS-4.3 BOUNDARY: WS-SYNC-1 state file has workstream_id field" {
    local f="$MEMORY_DIR/workstream-WS-SYNC-1-state.json"
    local id
    id="$(jq -r '.workstream_id' "$f")"
    [ "$id" = "WS-SYNC-1" ]
}

@test "AC-OSS-4.4 BOUNDARY: no workstream state file has phase=step_2_implementation" {
    # Any file with this phase signals in-flight work — stale for merged WSes
    local found=0
    for f in "$MEMORY_DIR"/workstream-WS-DB-1-state.json \
              "$MEMORY_DIR"/workstream-WS-DB-2-state.json \
              "$MEMORY_DIR"/workstream-WS-DB-3-state.json \
              "$MEMORY_DIR"/workstream-WS-DB-5-state.json; do
        local phase
        phase="$(jq -r '.phase' "$f" 2>/dev/null)"
        if [ "$phase" = "step_2_implementation" ]; then
            echo "STALE: $f has phase=step_2_implementation" >&3
            found=$((found + 1))
        fi
    done
    [ "$found" -eq 0 ]
}

@test "AC-OSS-4.4 BOUNDARY: no workstream state file has gate_status=tests_written for merged DBworkstreams" {
    local found=0
    for f in "$MEMORY_DIR"/workstream-WS-DB-1-state.json \
              "$MEMORY_DIR"/workstream-WS-DB-2-state.json \
              "$MEMORY_DIR"/workstream-WS-DB-3-state.json \
              "$MEMORY_DIR"/workstream-WS-DB-5-state.json; do
        local gs
        gs="$(jq -r '.gate_status' "$f" 2>/dev/null)"
        if [ "$gs" = "tests_written" ]; then
            echo "STALE: $f has gate_status=tests_written" >&3
            found=$((found + 1))
        fi
    done
    [ "$found" -eq 0 ]
}

@test "AC-OSS-4.4 BOUNDARY: no workstream state file has gate_status=pending for merged DB workstreams" {
    local found=0
    for f in "$MEMORY_DIR"/workstream-WS-DB-1-state.json \
              "$MEMORY_DIR"/workstream-WS-DB-2-state.json \
              "$MEMORY_DIR"/workstream-WS-DB-3-state.json \
              "$MEMORY_DIR"/workstream-WS-DB-5-state.json; do
        local gs
        gs="$(jq -r '.gate_status' "$f" 2>/dev/null)"
        if [ "$gs" = "pending" ]; then
            echo "STALE: $f has gate_status=pending" >&3
            found=$((found + 1))
        fi
    done
    [ "$found" -eq 0 ]
}

# ============================================================================
# GOLDEN PATH — AC-by-AC assertions on the correct final state
# ============================================================================

# --- AC-OSS-4.1: WS-DB-1, WS-DB-2, WS-DB-3, WS-DB-5 → phase=done, gate_status=merged ---

@test "AC-OSS-4.1: WS-DB-1 has phase=done" {
    local f="$MEMORY_DIR/workstream-WS-DB-1-state.json"
    local phase
    phase="$(jq -r '.phase' "$f")"
    [ "$phase" = "done" ]
}

@test "AC-OSS-4.1: WS-DB-1 has gate_status=merged" {
    local f="$MEMORY_DIR/workstream-WS-DB-1-state.json"
    local gs
    gs="$(jq -r '.gate_status' "$f")"
    [ "$gs" = "merged" ]
}

@test "AC-OSS-4.1: WS-DB-2 has phase=done" {
    local f="$MEMORY_DIR/workstream-WS-DB-2-state.json"
    local phase
    phase="$(jq -r '.phase' "$f")"
    [ "$phase" = "done" ]
}

@test "AC-OSS-4.1: WS-DB-2 has gate_status=merged" {
    local f="$MEMORY_DIR/workstream-WS-DB-2-state.json"
    local gs
    gs="$(jq -r '.gate_status' "$f")"
    [ "$gs" = "merged" ]
}

@test "AC-OSS-4.1: WS-DB-3 has phase=done" {
    local f="$MEMORY_DIR/workstream-WS-DB-3-state.json"
    local phase
    phase="$(jq -r '.phase' "$f")"
    [ "$phase" = "done" ]
}

@test "AC-OSS-4.1: WS-DB-3 has gate_status=merged" {
    local f="$MEMORY_DIR/workstream-WS-DB-3-state.json"
    local gs
    gs="$(jq -r '.gate_status' "$f")"
    [ "$gs" = "merged" ]
}

@test "AC-OSS-4.1: WS-DB-5 has phase=done" {
    local f="$MEMORY_DIR/workstream-WS-DB-5-state.json"
    local phase
    phase="$(jq -r '.phase' "$f")"
    [ "$phase" = "done" ]
}

@test "AC-OSS-4.1: WS-DB-5 has gate_status=merged" {
    local f="$MEMORY_DIR/workstream-WS-DB-5-state.json"
    local gs
    gs="$(jq -r '.gate_status' "$f")"
    [ "$gs" = "merged" ]
}

@test "AC-OSS-4.1: WS-DB-1 records merged commit hash" {
    local f="$MEMORY_DIR/workstream-WS-DB-1-state.json"
    local commit
    commit="$(jq -r '.merged_commit // .commit_hash // empty' "$f")"
    [ -n "$commit" ]
}

@test "AC-OSS-4.1: WS-DB-2 records merged commit hash" {
    local f="$MEMORY_DIR/workstream-WS-DB-2-state.json"
    local commit
    commit="$(jq -r '.merged_commit // .commit_hash // empty' "$f")"
    [ -n "$commit" ]
}

@test "AC-OSS-4.1: WS-DB-3 records merged commit hash" {
    local f="$MEMORY_DIR/workstream-WS-DB-3-state.json"
    local commit
    commit="$(jq -r '.merged_commit // .commit_hash // empty' "$f")"
    [ -n "$commit" ]
}

@test "AC-OSS-4.1: WS-DB-5 records merged commit hash" {
    local f="$MEMORY_DIR/workstream-WS-DB-5-state.json"
    local commit
    commit="$(jq -r '.merged_commit // .commit_hash // empty' "$f")"
    [ -n "$commit" ]
}

# --- AC-OSS-4.2: WS-MCP-0 scope updated to unified server ---

@test "AC-OSS-4.2: WS-MCP-0 name no longer describes read-only resources only" {
    local f="$MEMORY_DIR/workstream-WS-MCP-0-state.json"
    local name
    name="$(jq -r '.name' "$f")"
    # Old name was "MCP Resource Server - Read-Only Data Layer"
    # New scope is unified server; name must not be the old read-only label
    [[ "$name" != "MCP Resource Server - Read-Only Data Layer" ]]
}

@test "AC-OSS-4.2: WS-MCP-0 description references unified server scope" {
    local f="$MEMORY_DIR/workstream-WS-MCP-0-state.json"
    local desc
    desc="$(jq -r '.description' "$f")"
    # The updated scope covers a unified server — description must mention it
    [[ "$desc" =~ [Uu]nified ]] || [[ "$desc" =~ [Ss]erver ]]
}

@test "AC-OSS-4.2: WS-MCP-0 description does not describe scope as read-only resources only" {
    local f="$MEMORY_DIR/workstream-WS-MCP-0-state.json"
    local desc
    desc="$(jq -r '.description' "$f")"
    # The old description said "read-only MCP resources" — new scope is broader
    [[ "$desc" != *"read-only MCP resources"* ]]
}

@test "AC-OSS-4.2: WS-MCP-0 strategic_context or scope_notes field reflects expanded scope" {
    local f="$MEMORY_DIR/workstream-WS-MCP-0-state.json"
    # Either the strategic_context.what_this_is is updated or a scope_notes field exists
    local has_scope_update
    has_scope_update="$(jq -r '
        if .scope_notes != null then "yes"
        elif (.strategic_context.what_this_is // "" | test("unified|dashboard|serve"; "i")) then "yes"
        else "no"
        end
    ' "$f")"
    [ "$has_scope_update" = "yes" ]
}

# --- AC-OSS-4.3: WS-BENCH-1B, WS-SYNC-1, WS-OUTPUT-1/2/4 → phase=done ---

@test "AC-OSS-4.3: WS-BENCH-1B has phase=done" {
    local f="$MEMORY_DIR/workstream-WS-BENCH-1B-state.json"
    local phase
    phase="$(jq -r '.phase' "$f")"
    [ "$phase" = "done" ]
}

@test "AC-OSS-4.3: WS-SYNC-1 has phase=done" {
    local f="$MEMORY_DIR/workstream-WS-SYNC-1-state.json"
    local phase
    phase="$(jq -r '.phase' "$f")"
    [ "$phase" = "done" ]
}

@test "AC-OSS-4.3: WS-OUTPUT-1 has phase=done" {
    local f="$MEMORY_DIR/workstream-WS-OUTPUT-1-state.json"
    local phase
    phase="$(jq -r '.phase' "$f")"
    [ "$phase" = "done" ]
}

@test "AC-OSS-4.3: WS-OUTPUT-2 has phase=done" {
    local f="$MEMORY_DIR/workstream-WS-OUTPUT-2-state.json"
    local phase
    phase="$(jq -r '.phase' "$f")"
    [ "$phase" = "done" ]
}

@test "AC-OSS-4.3: WS-OUTPUT-4 has phase=done" {
    local f="$MEMORY_DIR/workstream-WS-OUTPUT-4-state.json"
    local phase
    phase="$(jq -r '.phase' "$f")"
    [ "$phase" = "done" ]
}

@test "AC-OSS-4.3: WS-SYNC-1 gate_status is not code_review_complete" {
    local f="$MEMORY_DIR/workstream-WS-SYNC-1-state.json"
    local phase
    phase="$(jq -r '.phase' "$f")"
    [ "$phase" != "code_review_complete" ]
}

@test "AC-OSS-4.3: WS-OUTPUT-1 gate_status is not code_approved" {
    local f="$MEMORY_DIR/workstream-WS-OUTPUT-1-state.json"
    local gs
    gs="$(jq -r '.gate_status' "$f")"
    [ "$gs" != "code_approved" ]
}

@test "AC-OSS-4.3: WS-OUTPUT-2 gate_status is not code_approved" {
    local f="$MEMORY_DIR/workstream-WS-OUTPUT-2-state.json"
    local gs
    gs="$(jq -r '.gate_status' "$f")"
    [ "$gs" != "code_approved" ]
}

@test "AC-OSS-4.3: WS-OUTPUT-4 gate_status is not code_approved" {
    local f="$MEMORY_DIR/workstream-WS-OUTPUT-4-state.json"
    local gs
    gs="$(jq -r '.gate_status' "$f")"
    [ "$gs" != "code_approved" ]
}

# --- AC-OSS-4.4: No merged workstream has stale in-progress status ---

@test "AC-OSS-4.4: WS-DB-1 gate_status is not tests_written" {
    local f="$MEMORY_DIR/workstream-WS-DB-1-state.json"
    local gs
    gs="$(jq -r '.gate_status' "$f")"
    [ "$gs" != "tests_written" ]
}

@test "AC-OSS-4.4: WS-DB-2 gate_status is not pending" {
    local f="$MEMORY_DIR/workstream-WS-DB-2-state.json"
    local gs
    gs="$(jq -r '.gate_status' "$f")"
    [ "$gs" != "pending" ]
}

@test "AC-OSS-4.4: WS-DB-3 gate_status is not tests_written" {
    local f="$MEMORY_DIR/workstream-WS-DB-3-state.json"
    local gs
    gs="$(jq -r '.gate_status' "$f")"
    [ "$gs" != "tests_written" ]
}

@test "AC-OSS-4.4: WS-DB-5 gate_status is not tests_written" {
    local f="$MEMORY_DIR/workstream-WS-DB-5-state.json"
    local gs
    gs="$(jq -r '.gate_status' "$f")"
    [ "$gs" != "tests_written" ]
}

@test "AC-OSS-4.4: WS-DB-1 phase is not step_1_test_spec" {
    local f="$MEMORY_DIR/workstream-WS-DB-1-state.json"
    local phase
    phase="$(jq -r '.phase' "$f")"
    [ "$phase" != "step_1_test_spec" ]
}

@test "AC-OSS-4.4: WS-DB-2 phase is not step_1_test_spec" {
    local f="$MEMORY_DIR/workstream-WS-DB-2-state.json"
    local phase
    phase="$(jq -r '.phase' "$f")"
    [ "$phase" != "step_1_test_spec" ]
}

@test "AC-OSS-4.4: WS-DB-3 phase is not step_2_implementation" {
    local f="$MEMORY_DIR/workstream-WS-DB-3-state.json"
    local phase
    phase="$(jq -r '.phase' "$f")"
    [ "$phase" != "step_2_implementation" ]
}

@test "AC-OSS-4.4: WS-DB-5 phase is not step_2_implementation" {
    local f="$MEMORY_DIR/workstream-WS-DB-5-state.json"
    local phase
    phase="$(jq -r '.phase' "$f")"
    [ "$phase" != "step_2_implementation" ]
}

@test "AC-OSS-4.4: WS-BENCH-1B phase is not review_complete" {
    # review_complete means it shipped — should now be done
    local f="$MEMORY_DIR/workstream-WS-BENCH-1B-state.json"
    local phase
    phase="$(jq -r '.phase' "$f")"
    [ "$phase" != "review_complete" ]
}

@test "AC-OSS-4.4: WS-SYNC-1 phase is not code_review_complete" {
    local f="$MEMORY_DIR/workstream-WS-SYNC-1-state.json"
    local phase
    phase="$(jq -r '.phase' "$f")"
    [ "$phase" != "code_review_complete" ]
}

@test "AC-OSS-4.4: WS-OUTPUT-1 phase is not code_review_complete" {
    local f="$MEMORY_DIR/workstream-WS-OUTPUT-1-state.json"
    local phase
    phase="$(jq -r '.phase' "$f")"
    [ "$phase" != "code_review_complete" ]
}

@test "AC-OSS-4.4: WS-OUTPUT-2 phase is not code_review_complete" {
    local f="$MEMORY_DIR/workstream-WS-OUTPUT-2-state.json"
    local phase
    phase="$(jq -r '.phase' "$f")"
    [ "$phase" != "code_review_complete" ]
}

@test "AC-OSS-4.4: WS-OUTPUT-4 phase is not code_review_complete" {
    local f="$MEMORY_DIR/workstream-WS-OUTPUT-4-state.json"
    local phase
    phase="$(jq -r '.phase' "$f")"
    [ "$phase" != "code_review_complete" ]
}

# --- AC-OSS-4.5: deferred-v1-follow-ups.json references MCP Tier 2 ---

@test "AC-OSS-4.5: deferred-v1-follow-ups.json has a deferred item referencing MCP Tier 2" {
    # The file must contain an entry that references MCP and Tier 2
    # Accept: name or description containing "MCP" and ("Tier 2" or "tier-2" or "mcp-tier-2")
    local found
    found="$(jq -r '
        [
            (.deferred_skills // []),
            (.deferred_agents // []),
            (.deferred_infrastructure // []),
            (.deferred_mcp // [])
        ]
        | flatten
        | map(
            select(
                ((.name // "") | test("MCP"; "i")) and
                (
                    ((.name // "") | test("Tier 2|tier-2|mcp-tier-2"; "i")) or
                    ((.reason // "") | test("Tier 2|tier-2"; "i")) or
                    ((.id // "") | test("MCP.*2|mcp.*tier"; "i"))
                )
            )
        )
        | length
    ' "$DEFERRED_FILE")"
    [ "$found" -gt 0 ]
}

@test "AC-OSS-4.5: deferred-v1-follow-ups.json MCP Tier 2 entry has an id field" {
    local id
    id="$(jq -r '
        [
            (.deferred_skills // []),
            (.deferred_agents // []),
            (.deferred_infrastructure // []),
            (.deferred_mcp // [])
        ]
        | flatten
        | map(
            select(
                ((.name // "") | test("MCP"; "i")) and
                (
                    ((.name // "") | test("Tier 2|tier-2|mcp-tier-2"; "i")) or
                    ((.reason // "") | test("Tier 2|tier-2"; "i"))
                )
            )
        )
        | .[0].id // ""
    ' "$DEFERRED_FILE")"
    [ -n "$id" ]
}

@test "AC-OSS-4.5: deferred-v1-follow-ups.json MCP Tier 2 entry has a reason field" {
    local reason
    reason="$(jq -r '
        [
            (.deferred_skills // []),
            (.deferred_agents // []),
            (.deferred_infrastructure // []),
            (.deferred_mcp // [])
        ]
        | flatten
        | map(
            select(
                ((.name // "") | test("MCP"; "i")) and
                (
                    ((.name // "") | test("Tier 2|tier-2|mcp-tier-2"; "i")) or
                    ((.reason // "") | test("Tier 2|tier-2"; "i"))
                )
            )
        )
        | .[0].reason // ""
    ' "$DEFERRED_FILE")"
    [ -n "$reason" ]
}

# --- AC-OSS-4.6 GOLDEN: all memory state files are valid JSON (exhaustive) ---

@test "AC-OSS-4.6: WS-DB-6 state file is valid JSON (regression)" {
    local f="$MEMORY_DIR/workstream-WS-DB-6-state.json"
    if [ -f "$f" ]; then
        run jq empty "$f"
        [ "$status" -eq 0 ]
    else
        skip "WS-DB-6 state file not present"
    fi
}

@test "AC-OSS-4.6: WS-DB-7 state file is valid JSON (regression)" {
    local f="$MEMORY_DIR/workstream-WS-DB-7-state.json"
    if [ -f "$f" ]; then
        run jq empty "$f"
        [ "$status" -eq 0 ]
    else
        skip "WS-DB-7 state file not present"
    fi
}

@test "AC-OSS-4.6: WS-DB-8 state file is valid JSON (regression)" {
    local f="$MEMORY_DIR/workstream-WS-DB-8-state.json"
    if [ -f "$f" ]; then
        run jq empty "$f"
        [ "$status" -eq 0 ]
    else
        skip "WS-DB-8 state file not present"
    fi
}
