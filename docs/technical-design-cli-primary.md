# Technical Design: CLI-Primary Architecture (DEC-003)

**Status:** Approved — MECHANICAL classification
**Decision:** DEC-003 — Deprecate MCP server (v0.1.0), promote CLI as primary integration layer
**Workstreams:** WS-CLI-1 (MCP deprecation + CLI router)
**Estimated effort:** 4-6 days total

---

## Background

miniature-guacamole has two integration layers: a Claude Code-native CLI (17 scripts in `src/framework/scripts/`) and an MCP server (`mcp-server/`) built on `@modelcontextprotocol/sdk`. The MCP server was never integrated into the build pipeline, CI, or any agent/skill. It exists as a parallel implementation of filesystem operations that are already handled by the CLI scripts and the Task tool + filesystem memory pattern.

Leadership approved removing it and investing instead in making the CLI the clean, composable interface for automation and agent use.

---

## Current State

### MCP server (to be removed)

```
mcp-server/
  src/
    index.ts           — stdio + HTTP server entry point (port 7842)
    resources.ts       — mg://workstreams, mg://memory/*, mg://events
    rest-mirror.ts     — REST mirrors of MCP resources
    database.ts        — Postgres optional, filesystem fallback
    ...9 more .ts files
  tests/ (4 files)
  package.json         — @modelcontextprotocol/sdk v1.0.0
```

Not referenced by `build.sh`, not in CI, not used by any agent or skill. Its filesystem operations duplicate what `mg-memory-read`, `mg-memory-write`, and `mg-workstream-*` already do.

### Existing CLI scripts (17 total)

Location: `src/framework/scripts/` — copied to `.claude/scripts/` by `build.sh`.

| Script | Description |
|---|---|
| `mg-workstream-status` | Display formatted workstream state |
| `mg-workstream-create` | Scaffold new workstream state file |
| `mg-workstream-transition` | Validate + apply state machine transitions |
| `mg-memory-read` | Pretty-print JSON memory files |
| `mg-memory-write` | Atomic JSON updates with .bak backup |
| `mg-gate-check` | Mechanical Gate 4A checks, JSON output |
| `mg-git-summary` | Git diff summary for context |
| `mg-diff-summary` | Staged diff summary |
| `mg-help` | Command index and per-command help |
| `mg-config` | Configuration management |
| `mg-settings-check` | Validate settings.json |
| `mg-util` | Unified init + audit utility |
| `mg-db-seed`, `mg-db-setup`, `mg-db-sync` | Postgres DB management |
| `mg-postgres` | Postgres connection wrapper |
| `mg-migrate` | Schema migrations |

### Established script conventions

From reading the source, all scripts follow these patterns consistently:

- Shebang: `#!/usr/bin/env bash`
- `set -euo pipefail` at the top
- `show_help()` function with a heredoc
- `error()` function that writes to stderr and exits 1
- `command -v jq` for dependency detection (never hardcoded paths)
- `-h|--help` handled before argument validation
- Exit codes: 0 = success, 1 = error (documented in help text)
- `local` for all function variables

Two scripts (`mg-help`, `mg-workstream-transition`) add a location validation block that rejects sourcing and verifies the script runs from a `.claude/scripts/` directory. The router needs this same pattern.

---

## What We're Building

### Phase 1: Archive MCP (1-2 hours)

Remove the MCP server and its documentation surface.

**Files to delete:**

- `mcp-server/` — entire directory
- `docs/mcp-server.md`

**Files to edit:**

- `docs/.vitepress/config.ts` — remove MCP sidebar entry (line ~69)
- `docs/index.md` — remove Tier 2 / MCP section
- `docs/architecture.md` — remove MCP subsection (lines ~146-155)
- `tests/scripts/mg-memory-audit.bats` — remove or update any assertions referencing MCP state files or WS-MCP-* workstreams

**Do not touch:** Daemon `MCPConfig` types anywhere in the codebase — those are for outbound connections to external MCP servers, not our server.

**Verification:** `./build.sh` still produces a clean `dist/`. No reference to `mcp-server` in any built artifact.

---

### Phase 2: CLI Router (2-3 days)

Create a unified `mg` entrypoint that routes subcommands to the existing scripts.

#### Design decisions

**1. Router pattern: case/dispatch**

`mg-util` already implements multi-command dispatch with `case "$command" in`. Use the same pattern — it's readable, debuggable, and has zero dependencies. No subcommand library needed.

**2. `--json` flag: per-script implementation**

Each script that supports `--json` handles the flag itself. Shared utility code goes in `mg-util` only if 3+ scripts need the exact same helper. Based on the scripts targeted (mg-workstream-status, mg-memory-read, mg-gate-check), the JSON formatting logic is different enough per script that a shared helper adds complexity without saving much. Keep it per-script.

**3. Source location**

`src/framework/scripts/mg` — alongside all other scripts. `build.sh` already copies `src/framework/scripts/mg-*` to `dist/.claude/scripts/`. The router gets copied by the same glob. No `build.sh` changes needed unless we want `mg` on `$PATH`.

**4. PATH integration**

The `install.sh` script puts `.claude/scripts/` in the user's PATH (or provides a shell integration step). The `mg` router goes through the same mechanism — no special casing. Direct script invocation (`mg-workstream-status WS-1`) continues to work.

#### Router implementation

**File:** `src/framework/scripts/mg`

```bash
#!/usr/bin/env bash
# ============================================================================
# mg - Unified CLI entrypoint for miniature-guacamole
# ============================================================================
# Usage: mg <subcommand> [args...]
# Exit 0 = success, Exit 1 = error
# ============================================================================

set -euo pipefail

# ============================================================================
# Script location validation (security hardening)
# ============================================================================
# Prevent sourcing - must be executed directly
if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
    echo "Error: This script must be executed, not sourced" >&2
    return 1
fi

# Resolve symlinks and get canonical script directory
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Validate script is in a trusted .claude/scripts/ directory
case "$SCRIPTS_DIR" in
    */.claude/scripts) ;;
    *) echo "Error: Script must run from a .claude/scripts/ directory, not $SCRIPTS_DIR" >&2; exit 1 ;;
esac

# ============================================================================
# Version
# ============================================================================
MG_VERSION="2.1.0"

# ============================================================================
# Error / help
# ============================================================================
error() { echo "Error: $1" >&2; exit 1; }

show_help() {
    cat <<EOF
Usage: mg <subcommand> [args...]

miniature-guacamole CLI

Subcommands:
  workstream status <ws-id>          Display workstream state
  workstream create <ws-id> <title>  Scaffold new workstream
  workstream transition <ws-id> <status>  Apply state transition

  memory read <file.json>            Read JSON memory file
  memory write <file.json> '<expr>'  Atomic JSON update

  gate check                         Run Gate 4A mechanical checks

  help [command]                     Show help (all or specific command)
  version                            Print version

Options:
  -h, --help     Show this help message
  --version      Print version and exit

Examples:
  mg workstream status WS-42
  mg memory read .claude/memory/workstream-WS-1-state.json
  mg gate check | jq '.overall'

Direct script invocation still works:
  mg-workstream-status WS-42
  mg-memory-read .claude/memory/workstream-WS-1-state.json

EOF
}

# ============================================================================
# Subcommand router
# ============================================================================
route() {
    local subcommand="${1:-}"

    case "$subcommand" in
        -h|--help|help)
            shift || true
            if [[ $# -gt 0 ]]; then
                exec "$SCRIPTS_DIR/mg-help" "$@"
            else
                show_help
            fi
            ;;
        --version|version)
            echo "mg version $MG_VERSION"
            ;;
        workstream|ws)
            shift
            local ws_cmd="${1:-}"
            [[ -z "$ws_cmd" ]] && error "Usage: mg workstream <status|create|transition> [args...]"
            shift
            case "$ws_cmd" in
                status)   exec "$SCRIPTS_DIR/mg-workstream-status" "$@" ;;
                create)   exec "$SCRIPTS_DIR/mg-workstream-create" "$@" ;;
                transition|transit) exec "$SCRIPTS_DIR/mg-workstream-transition" "$@" ;;
                -h|--help) exec "$SCRIPTS_DIR/mg-help" mg-workstream-status ;;
                *) error "Unknown workstream subcommand: '$ws_cmd'. Valid: status, create, transition" ;;
            esac
            ;;
        memory|mem)
            shift
            local mem_cmd="${1:-}"
            [[ -z "$mem_cmd" ]] && error "Usage: mg memory <read|write> [args...]"
            shift
            case "$mem_cmd" in
                read)  exec "$SCRIPTS_DIR/mg-memory-read" "$@" ;;
                write) exec "$SCRIPTS_DIR/mg-memory-write" "$@" ;;
                -h|--help) exec "$SCRIPTS_DIR/mg-help" mg-memory-read ;;
                *) error "Unknown memory subcommand: '$mem_cmd'. Valid: read, write" ;;
            esac
            ;;
        gate)
            shift
            local gate_cmd="${1:-}"
            [[ -z "$gate_cmd" ]] && error "Usage: mg gate <check> [args...]"
            shift
            case "$gate_cmd" in
                check) exec "$SCRIPTS_DIR/mg-gate-check" "$@" ;;
                -h|--help) exec "$SCRIPTS_DIR/mg-help" mg-gate-check ;;
                *) error "Unknown gate subcommand: '$gate_cmd'. Valid: check" ;;
            esac
            ;;
        "")
            show_help
            ;;
        *)
            error "Unknown subcommand: '$subcommand'. Run 'mg help' for usage."
            ;;
    esac
}

route "$@"
exit 0
```

Key design choices in the router:

- `exec` replaces the router process with the target script — no subprocess overhead, exit codes propagate cleanly.
- `shift` before delegating so the target script receives only its own args.
- `ws` and `mem` as short aliases reduce typing for agents.
- Unknown subcommand exits 1, prints an actionable error — consistent with how all individual scripts handle invalid input.
- `--version` and `version` both work (flag vs subcommand style).

#### `--json` flag additions

Three scripts get a `--json` flag. Implementation pattern is the same in all three — check for the flag early, set a variable, branch output at the end.

**`mg-workstream-status --json`**

Add after the existing help/flag checks:

```bash
# Parse --json flag (must precede ws-id argument check)
JSON_OUTPUT=false
ARGS=()
for arg in "$@"; do
    case "$arg" in
        --json) JSON_OUTPUT=true ;;
        *)      ARGS+=("$arg") ;;
    esac
done
set -- "${ARGS[@]}"
```

Then replace the `cat <<EOF` output block at the end with a branch:

```bash
if [[ "$JSON_OUTPUT" == "true" ]]; then
    "$JQ_PATH" -n \
        --arg id "$ws_id" \
        --arg name "$ws_name" \
        --arg status "$ws_status" \
        --arg phase "$ws_phase" \
        --arg gate "$ws_gate" \
        --arg agent "$ws_agent" \
        --arg created "$ws_created" \
        --argjson coverage "$ws_coverage" \
        --argjson tests_total "$ws_tests_total" \
        --argjson tests_passing "$ws_tests_passing" \
        --argjson tests_failing "$ws_tests_failing" \
        '{
            workstream_id: $id,
            name: $name,
            status: $status,
            phase: $phase,
            gate_status: $gate,
            agent_id: $agent,
            created_at: $created,
            coverage: $coverage,
            tests: {total: $tests_total, passing: $tests_passing, failing: $tests_failing}
        }'
else
    # existing human-readable output
    cat <<EOF
...
EOF
fi
```

Blockers and dependencies in JSON mode: append them to the object using `jq` after the initial build, or build them inline with `--argjson`. Inline is cleaner:

```bash
blockers_json=$("$JQ_PATH" '.blockers // []' "$STATE_FILE")
deps_json=$("$JQ_PATH" '.dependencies // []' "$STATE_FILE")

"$JQ_PATH" -n \
    ... \
    --argjson blockers "$blockers_json" \
    --argjson deps "$deps_json" \
    '{ ..., blockers: $blockers, dependencies: $deps }'
```

**`mg-memory-read --json`**

`mg-memory-read` already outputs valid JSON (it runs `jq '.'`). The `--json` flag on this script means "output compact JSON, not pretty-printed" — useful for piping. Implementation:

```bash
JSON_OUTPUT=false
ARGS=()
for arg in "$@"; do
    case "$arg" in
        --json) JSON_OUTPUT=true ;;
        *)      ARGS+=("$arg") ;;
    esac
done
set -- "${ARGS[@]}"

# ...existing validation...

if [[ "$JSON_OUTPUT" == "true" ]]; then
    "$JQ_PATH" -c '.' "$FILE_PATH"
else
    "$JQ_PATH" '.' "$FILE_PATH"
fi
```

**`mg-gate-check --json`**

`mg-gate-check` already outputs JSON unconditionally. The `--json` flag here enables compact output (same pattern as mg-memory-read). Add the flag parse before the `while [[ $# -gt 0 ]]` loop and pass `-c` to the final `jq -n` call when set.

---

### Phase 3: Docs + Version (1 day)

**`docs/architecture.md`**

Replace the MCP section with a CLI-primary section:

```
## Integration Layers

miniature-guacamole exposes two interfaces for automation and agent use:

**Task tool + filesystem memory** — the primary agentic interface.
Agents use Claude Code's Task tool to spawn subagents and read/write
JSON files in .claude/memory/.

**CLI scripts** — the primary human and scripting interface.
17 scripts in .claude/scripts/ (also reachable via the `mg` router).
Use these from your shell, Makefiles, CI, or hooks.

The `mg` router is the recommended entry point for humans.
Direct script invocation (mg-workstream-status, mg-memory-read, etc.)
continues to work and is preferred in scripts that need predictable $PATH resolution.
```

**`CHANGELOG.md`** — add v2.1.0 entry covering MCP removal and mg router.

**Version bump** — `package.json` `2.0.0` → `2.1.0`.

---

## Build pipeline impact

`build.sh` currently copies all `mg-*` files from `src/framework/scripts/`:

```bash
for script_file in "$FRAMEWORK_DIR/scripts"/mg-*; do
    if [[ -f "$script_file" ]]; then
        cp "$script_file" "$DIST_CLAUDE/scripts/"
        chmod +x "$DIST_CLAUDE/scripts/$(basename "$script_file")"
```

The `mg` router is named `mg`, not `mg-*`, so the glob won't pick it up. Add one line:

```bash
# Router
if [[ -f "$FRAMEWORK_DIR/scripts/mg" ]]; then
    cp "$FRAMEWORK_DIR/scripts/mg" "$DIST_CLAUDE/scripts/"
    chmod +x "$DIST_CLAUDE/scripts/mg"
fi
```

No other build changes needed. `mcp-server/` was never in the build; removing the directory has zero build impact.

---

## Tests

### Phase 1 — update existing tests

**`tests/scripts/mg-memory-audit.bats`**

This file contains assertions referencing WS-MCP-* state files and MCP-specific memory entries. After MCP removal, those workstream state files will be deleted from `.claude/memory/`. Either:

- Delete the WS-MCP-* tests entirely (they're validating MCP state that no longer exists), or
- Update them to validate that WS-MCP-* state files are gone

The simpler path: delete the WS-MCP-* tests. Add a replacement test that validates no mcp-server references appear in built artifacts:

```bash
@test "AC-CLI-1.1 MISUSE: no mcp-server references in dist after build" {
    [[ -d "$PROJECT_ROOT/dist" ]] || skip "Run ./build.sh first"
    ! grep -r "mcp-server" "$PROJECT_ROOT/dist/" 2>/dev/null
}
```

### Phase 2 — new router tests

**File:** `tests/scripts/mg-router.bats`

Test order follows misuse-first convention:

```bash
#!/usr/bin/env bats
# mg-router.bats — Tests for the mg CLI router
# Test ordering: MISUSE CASES → BOUNDARY TESTS → GOLDEN PATH

setup() {
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"
    TEST_DIR="$(mktemp -d)"
    TEST_CLAUDE_DIR="$TEST_DIR/.claude/scripts"
    mkdir -p "$TEST_CLAUDE_DIR"
    cp "$PROJECT_ROOT"/src/framework/scripts/mg-* "$TEST_CLAUDE_DIR/"
    cp "$PROJECT_ROOT/src/framework/scripts/mg" "$TEST_CLAUDE_DIR/"
    chmod +x "$TEST_CLAUDE_DIR"/mg-*
    chmod +x "$TEST_CLAUDE_DIR/mg"
    SCRIPT_PATH="$TEST_CLAUDE_DIR/mg"
    MEMORY_DIR="$TEST_DIR/.claude/memory"
    mkdir -p "$MEMORY_DIR"
}

teardown() {
    [[ -n "$TEST_DIR" && -d "$TEST_DIR" ]] && rm -rf "$TEST_DIR"
}

# MISUSE CASES

@test "mg: unknown subcommand exits 1" {
    run "$SCRIPT_PATH" foobar
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Unknown subcommand" ]]
}

@test "mg: sourcing rejected" {
    run bash -c "source '$SCRIPT_PATH'"
    [ "$status" -ne 0 ]
}

@test "mg: workstream with no sub-subcommand exits 1" {
    run "$SCRIPT_PATH" workstream
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg: workstream unknown sub-subcommand exits 1" {
    run "$SCRIPT_PATH" workstream frobnicate
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Unknown workstream subcommand" ]]
}

@test "mg: memory with no sub-subcommand exits 1" {
    run "$SCRIPT_PATH" memory
    [ "$status" -eq 1 ]
}

@test "mg: gate with no sub-subcommand exits 1" {
    run "$SCRIPT_PATH" gate
    [ "$status" -eq 1 ]
}

# BOUNDARY TESTS

@test "mg: help subcommand exits 0" {
    run "$SCRIPT_PATH" help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg: --help flag exits 0" {
    run "$SCRIPT_PATH" --help
    [ "$status" -eq 0 ]
}

@test "mg: -h flag exits 0" {
    run "$SCRIPT_PATH" -h
    [ "$status" -eq 0 ]
}

@test "mg: version subcommand exits 0 and prints version" {
    run "$SCRIPT_PATH" version
    [ "$status" -eq 0 ]
    [[ "$output" =~ "mg version" ]]
}

@test "mg: --version flag exits 0 and prints version" {
    run "$SCRIPT_PATH" --version
    [ "$status" -eq 0 ]
    [[ "$output" =~ "mg version" ]]
}

@test "mg: ws alias routes to workstream" {
    run "$SCRIPT_PATH" ws
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg: mem alias routes to memory" {
    run "$SCRIPT_PATH" mem
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]]
}

# GOLDEN PATH

@test "mg: no args shows help" {
    run "$SCRIPT_PATH"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "mg workstream status delegates to mg-workstream-status" {
    # Missing workstream ID — should get usage error from the underlying script
    run "$SCRIPT_PATH" workstream status
    [ "$status" -eq 1 ]
    [[ "$output" =~ "No workstream ID" ]] || [[ "$output" =~ "Usage:" ]]
}

@test "mg workstream create delegates to mg-workstream-create" {
    run "$SCRIPT_PATH" workstream create
    [ "$status" -eq 1 ]
    [[ "$output" =~ "No arguments" ]] || [[ "$output" =~ "Usage:" ]]
}

@test "mg memory read delegates to mg-memory-read" {
    run "$SCRIPT_PATH" memory read
    [ "$status" -eq 1 ]
    [[ "$output" =~ "No file specified" ]] || [[ "$output" =~ "Usage:" ]]
}

@test "mg memory write delegates to mg-memory-write" {
    run "$SCRIPT_PATH" memory write
    [ "$status" -eq 1 ]
    [[ "$output" =~ "No arguments" ]] || [[ "$output" =~ "Usage:" ]]
}
```

### Phase 2 — `--json` flag tests

Add to existing `.bats` files for the affected scripts. Example for `mg-workstream-status`:

```bash
@test "mg-workstream-status: --json flag with valid workstream outputs valid JSON" {
    echo '{"workstream_id":"WS-1","name":"Test","status":"pending","phase":"planning",
           "gate_status":"not_started","agent_id":"dev","created_at":"2026-03-16",
           "coverage":0,"tests":{"total":0,"passing":0,"failing":0},
           "blockers":[],"dependencies":[]}' > "$MEMORY_DIR/workstream-WS-1-state.json"
    cd "$TEST_DIR"
    run "$SCRIPT_PATH" WS-1 --json
    [ "$status" -eq 0 ]
    echo "$output" | jq . >/dev/null   # valid JSON
    [[ "$(echo "$output" | jq -r '.workstream_id')" == "WS-1" ]]
}

@test "mg-workstream-status: --json includes tests and coverage fields" {
    # ...setup...
    run "$SCRIPT_PATH" WS-1 --json
    [ "$status" -eq 0 ]
    [[ "$(echo "$output" | jq '.tests')" != "null" ]]
    [[ "$(echo "$output" | jq '.coverage')" != "null" ]]
}

@test "mg-workstream-status: --json and ws-id can be in either order" {
    # --json before ws-id
    run "$SCRIPT_PATH" --json WS-1
    [ "$status" -eq 0 ]
    echo "$output" | jq . >/dev/null
}
```

---

## Acceptance criteria

### WS-CLI-1 Phase 1

- [ ] `mcp-server/` directory removed from repo
- [ ] `docs/mcp-server.md` removed
- [ ] VitePress sidebar no longer references MCP server
- [ ] `docs/architecture.md` no longer references MCP server
- [ ] `./build.sh` runs clean, `dist/` contains no mcp-server artifacts
- [ ] All existing tests pass (no regressions from MCP removal)

### WS-CLI-1 Phase 2

- [ ] `src/framework/scripts/mg` exists and is executable
- [ ] `mg help` exits 0 and shows usage
- [ ] `mg workstream status WS-X` delegates correctly (exit codes match underlying script)
- [ ] `mg workstream create`, `mg workstream transition` delegate correctly
- [ ] `mg memory read`, `mg memory write` delegate correctly
- [ ] `mg gate check` delegates correctly
- [ ] `mg unknown-cmd` exits 1 with actionable error
- [ ] `mg` sourcing is rejected
- [ ] `mg --version` and `mg version` both work
- [ ] `ws` and `mem` short aliases work
- [ ] `mg-workstream-status --json` outputs valid JSON with all fields
- [ ] `mg-memory-read --json` outputs compact JSON
- [ ] `mg-gate-check --json` outputs compact JSON
- [ ] `--json` flag position-independent (before or after other args)
- [ ] Direct script invocation still works (`mg-workstream-status WS-1`)
- [ ] `tests/scripts/mg-router.bats` passes
- [ ] `build.sh` copies `mg` router to `dist/.claude/scripts/`

### WS-CLI-1 Phase 3

- [ ] `docs/architecture.md` reflects CLI-primary model
- [ ] `CHANGELOG.md` has v2.1.0 entry
- [ ] `package.json` version is `2.1.0`

---

## What this is not

This is a MECHANICAL workstream. It is not:

- A new CLI framework or flag parsing library
- A change to the Task tool + filesystem memory pattern (agents keep using that)
- A change to agent/skill AGENT.md or SKILL.md files
- A new agentic capability

The MCP server never worked as an integration path for Claude Code agents. Removing it and adding a router is purely housekeeping.

---

## Risk

Low. The MCP server has no downstream dependencies — no agent, skill, hook, or build step references it. The `mg` router uses `exec` to delegate to existing scripts, so behavioral changes to individual scripts are impossible from the router layer. The `--json` additions are additive (new flag, existing behavior unchanged without the flag).

The one thing to watch: the `mg-memory-audit.bats` MCP-related tests. Confirm which assertions reference WS-MCP-* state files before deleting them, and decide whether those state files get archived or deleted.
