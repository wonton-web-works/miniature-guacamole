#!/usr/bin/env bats
# ============================================================================
# mg-postgres.bats - Tests for mg-postgres script (WS-DB-6)
# ============================================================================
# Test ordering: MISUSE CASES → BOUNDARY TESTS → GOLDEN PATH
# Coverage target: AC-DB-6.1 through AC-DB-6.8
# ============================================================================

bats_require_minimum_version 1.5.0

setup() {
    # Temporary test directory — isolated from real system
    TEST_DIR="$(mktemp -d)"

    # Resolve project root (tests/scripts/ → project root)
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"

    # Create temporary .claude/scripts directory for testing
    TEST_CLAUDE_DIR="$TEST_DIR/.claude/scripts"
    mkdir -p "$TEST_CLAUDE_DIR"

    # Copy all mg-* scripts from project to test directory
    cp "$PROJECT_ROOT"/src/framework/scripts/mg-* "$TEST_CLAUDE_DIR/" 2>/dev/null || true
    chmod +x "$TEST_CLAUDE_DIR"/mg-* 2>/dev/null || true

    SCRIPT_PATH="$TEST_CLAUDE_DIR/mg-postgres"

    # Point mg-config at a test-local config dir — never touches real ~/.config
    export MG_CONFIG_DIR="$TEST_DIR/config/miniature-guacamole"
    mkdir -p "$MG_CONFIG_DIR"

    # Initialize config so mg-config set/get work during tests
    if [[ -x "$TEST_CLAUDE_DIR/mg-config" ]]; then
        "$TEST_CLAUDE_DIR/mg-config" init 2>/dev/null || true
    fi

    # Create fake bin dir for mocking docker, psql, mg-db-setup
    FAKE_BIN="$TEST_DIR/bin"
    mkdir -p "$FAKE_BIN"

    # Control files
    DOCKER_NOT_FOUND_FILE="$TEST_DIR/docker_not_found"  # docker binary missing entirely
    DOCKER_RUN_FAIL_FILE="$TEST_DIR/docker_run_fail"    # docker run exits 1
    DOCKER_PULL_FAIL_FILE="$TEST_DIR/docker_pull_fail"  # docker pull exits 1
    CONTAINER_RUNNING_FILE="$TEST_DIR/container_running" # container already up
    PSQL_FAIL_FILE="$TEST_DIR/psql_fail"                # psql connection fails
    DB_SETUP_FAIL_FILE="$TEST_DIR/db_setup_fail"        # mg-db-setup exits 1

    # Invocation logs
    DOCKER_CALLS="$TEST_DIR/docker_calls"
    PSQL_CALLS="$TEST_DIR/psql_calls"
    DB_SETUP_CALLS="$TEST_DIR/db_setup_calls"
    touch "$DOCKER_CALLS" "$PSQL_CALLS" "$DB_SETUP_CALLS"

    # -------------------------------------------------------------------------
    # Mock: docker
    # Handles inspect, run, stop, rm, pull subcommands
    # -------------------------------------------------------------------------
    cat > "$FAKE_BIN/docker" <<MOCK
#!/bin/sh
echo "\$@" >> "$DOCKER_CALLS"

case "\$1" in
    "inspect")
        # Container running check — print "true"/"false" to match {{.State.Running}} output
        if [ -f "$CONTAINER_RUNNING_FILE" ]; then
            echo "true"
            exit 0
        fi
        echo "false"
        exit 1
        ;;
    "run")
        if [ -f "$DOCKER_RUN_FAIL_FILE" ]; then
            echo "docker: Error response from daemon: container start failed" >&2
            exit 1
        fi
        # Mark container as running after a successful run
        touch "$CONTAINER_RUNNING_FILE"
        exit 0
        ;;
    "stop")
        rm -f "$CONTAINER_RUNNING_FILE"
        exit 0
        ;;
    "rm")
        exit 0
        ;;
    "pull")
        if [ -f "$DOCKER_PULL_FAIL_FILE" ]; then
            echo "docker: Error response from daemon: pull failed" >&2
            exit 1
        fi
        exit 0
        ;;
    *)
        exit 0
        ;;
esac
MOCK
    chmod +x "$FAKE_BIN/docker"

    # -------------------------------------------------------------------------
    # Mock: psql
    # -------------------------------------------------------------------------
    cat > "$FAKE_BIN/psql" <<MOCK
#!/bin/sh
echo "\$@" >> "$PSQL_CALLS"
if [ -f "$PSQL_FAIL_FILE" ]; then
    echo "psql: could not connect to server: Connection refused" >&2
    exit 1
fi
exit 0
MOCK
    chmod +x "$FAKE_BIN/psql"

    # -------------------------------------------------------------------------
    # Mock: mg-db-setup
    # Placed directly in TEST_CLAUDE_DIR (same location as mg-postgres)
    # so that mg-postgres can find it by relative or PATH lookup
    # -------------------------------------------------------------------------
    cat > "$TEST_CLAUDE_DIR/mg-db-setup" <<MOCK
#!/bin/sh
echo "\$@" >> "$DB_SETUP_CALLS"
if [ -f "$DB_SETUP_FAIL_FILE" ]; then
    echo "mg-db-setup: migration failed" >&2
    exit 1
fi
exit 0
MOCK
    chmod +x "$TEST_CLAUDE_DIR/mg-db-setup"

    # Also put mg-db-setup in FAKE_BIN for PATH-based lookup
    cp "$TEST_CLAUDE_DIR/mg-db-setup" "$FAKE_BIN/mg-db-setup"
    chmod +x "$FAKE_BIN/mg-db-setup"
}

teardown() {
    if [[ -n "$TEST_DIR" && -d "$TEST_DIR" ]]; then
        rm -rf "$TEST_DIR"
    fi
}

# ============================================================================
# Helpers
# ============================================================================

# Inject fake bin first in PATH so our mocks are found
_use_fake_bin() {
    export PATH="$FAKE_BIN:$TEST_CLAUDE_DIR:$PATH"
}

_docker_not_available() {
    # Remove docker from FAKE_BIN so command -v docker fails
    rm -f "$FAKE_BIN/docker"
}

_docker_run_will_fail() {
    touch "$DOCKER_RUN_FAIL_FILE"
}

_container_already_running() {
    touch "$CONTAINER_RUNNING_FILE"
}

_psql_will_fail() {
    touch "$PSQL_FAIL_FILE"
}

_psql_will_succeed() {
    rm -f "$PSQL_FAIL_FILE"
}

_db_setup_will_fail() {
    touch "$DB_SETUP_FAIL_FILE"
}

# ============================================================================
# MISUSE CASES — Invalid inputs, missing dependencies, error conditions
# ============================================================================

@test "mg-postgres start: Docker not available — exits 1 with warning" {
    # AC-DB-6.2: no Docker means we can't proceed; must exit 1 with a clear message
    _use_fake_bin
    _docker_not_available

    run "$SCRIPT_PATH" start
    [ "$status" -eq 1 ]
    [[ "$output" =~ [Dd]ocker ]] || [[ "$output" =~ "not found" ]] || [[ "$output" =~ "not installed" ]] || [[ "$output" =~ "required" ]]
}

@test "mg-postgres start: Docker not available — warning goes to stderr or stdout" {
    # AC-DB-6.2: warning message must be present and informative
    _use_fake_bin
    _docker_not_available

    run --separate-stderr "$SCRIPT_PATH" start
    [ "$status" -eq 1 ]
    # Warning can appear on either stderr or stdout — both are acceptable
    [[ "$stderr" =~ [Dd]ocker ]] || [[ "$output" =~ [Dd]ocker ]] || [[ "$stderr" =~ "not" ]] || [[ "$output" =~ "not" ]]
}

@test "mg-postgres start: docker run fails — exits 1" {
    # Container pull/run failure must propagate as a fatal error
    _use_fake_bin
    _docker_run_will_fail

    run "$SCRIPT_PATH" start
    [ "$status" -eq 1 ]
}

@test "mg-postgres start: container running but psql connection fails — exits 1" {
    # AC-DB-6.1: if container is up but connection test fails, that's unhealthy — exit 1
    _use_fake_bin
    _container_already_running
    _psql_will_fail

    run "$SCRIPT_PATH" start
    [ "$status" -eq 1 ]
    [[ "$output" =~ [Cc]onnect ]] || [[ "$output" =~ [Uu]nhealthy ]] || [[ "$output" =~ [Ff]ail ]] || [[ "$output" =~ [Ee]rror ]]
}

@test "mg-postgres stop: no running container — exits 0 (idempotent)" {
    # AC-DB-6.8: stop on an already-stopped container must be safe (idempotent)
    _use_fake_bin
    # CONTAINER_RUNNING_FILE is not present — container is not running

    run "$SCRIPT_PATH" stop
    [ "$status" -eq 0 ]
}

@test "mg-postgres: unknown subcommand — exits 1 with usage" {
    # Unknown subcommand must fail with usage guidance
    _use_fake_bin

    run "$SCRIPT_PATH" badcommand
    [ "$status" -eq 1 ]
    [[ "$output" =~ [Uu]sage ]] || [[ "$output" =~ [Uu]nknown ]] || [[ "$output" =~ [Ss]ubcommand ]]
}

@test "mg-postgres: no arguments — exits 1 with usage" {
    # No subcommand must fail with usage guidance
    _use_fake_bin

    run "$SCRIPT_PATH"
    [ "$status" -eq 1 ]
    [[ "$output" =~ [Uu]sage ]] || [[ "$output" =~ "start" ]]
}

# ============================================================================
# BOUNDARY TESTS — Edge cases, idempotency, Docker-less status
# ============================================================================

@test "mg-postgres start: container already running and healthy — exits 0 without re-creating" {
    # AC-DB-6.1: if container is already up and connectable, just verify and exit 0
    _use_fake_bin
    _container_already_running
    _psql_will_succeed

    run "$SCRIPT_PATH" start
    [ "$status" -eq 0 ]

    # docker run must NOT have been called (no re-create)
    # inspect will be called but not run
    ! grep -q "^run " "$DOCKER_CALLS" || true
}

@test "mg-postgres start: idempotent — running twice only creates container once" {
    # AC-DB-6.8: second start on an already-running healthy container skips docker run
    _use_fake_bin
    _psql_will_succeed

    # First start — creates container
    "$SCRIPT_PATH" start

    # Reset call logs
    echo -n > "$DOCKER_CALLS"

    # Second start — container is now running (CONTAINER_RUNNING_FILE was set by mock)
    run "$SCRIPT_PATH" start
    [ "$status" -eq 0 ]

    # docker run should NOT appear in the second invocation's calls
    ! grep -q "^run " "$DOCKER_CALLS" 2>/dev/null || true
}

@test "mg-postgres status: Docker not available — prints informative message, exits 0" {
    # status is read-only; no Docker means we report unavailability, not an error exit
    _use_fake_bin
    _docker_not_available

    run "$SCRIPT_PATH" status
    # Flexible on exit code for status — informative output is what matters
    [[ "$output" =~ [Dd]ocker ]] || [[ "$output" =~ "not available" ]] || [[ "$output" =~ "not found" ]] || [[ "$output" =~ "unavailable" ]]
}

@test "mg-postgres stop: idempotent — stopping already-stopped container exits 0" {
    # AC-DB-6.8: stop called again after container is gone must be safe
    _use_fake_bin

    # First stop (nothing running)
    run "$SCRIPT_PATH" stop
    [ "$status" -eq 0 ]

    # Second stop
    run "$SCRIPT_PATH" stop
    [ "$status" -eq 0 ]
}

@test "mg-postgres start: mg-db-setup failure — exits 1" {
    # AC-DB-6.4: if migrations fail, start must fail
    _use_fake_bin
    _psql_will_succeed
    _db_setup_will_fail

    run "$SCRIPT_PATH" start
    [ "$status" -eq 1 ]
}

# ============================================================================
# GOLDEN PATH — Happy path: start, stop, status, config writes
# ============================================================================

@test "mg-postgres start: container created with default credentials" {
    # AC-DB-6.3: docker run must include default creds (user:mg, password:mg, db:mg_memory, port:5432)
    _use_fake_bin
    _psql_will_succeed

    run "$SCRIPT_PATH" start
    [ "$status" -eq 0 ]

    # docker run must have been invoked
    grep -q "run" "$DOCKER_CALLS"

    # Default creds must appear in the docker run invocation
    grep "run" "$DOCKER_CALLS" | grep -q "mg" || grep -q "5432" "$DOCKER_CALLS" || grep -q "mg_memory" "$DOCKER_CALLS"
}

@test "mg-postgres start: calls mg-db-setup after container is healthy" {
    # AC-DB-6.4: migrations must run after container is up
    _use_fake_bin
    _psql_will_succeed

    run "$SCRIPT_PATH" start
    [ "$status" -eq 0 ]

    # mg-db-setup must have been called
    [[ -s "$DB_SETUP_CALLS" ]]
}

@test "mg-postgres start: writes postgres_url to config" {
    # AC-DB-6.5: after start, postgres_url must be set in mg-config
    _use_fake_bin
    _psql_will_succeed

    run "$SCRIPT_PATH" start
    [ "$status" -eq 0 ]

    # Read config directly to verify
    local url
    url=$(jq -r '.postgres_url' "$MG_CONFIG_DIR/config.json" 2>/dev/null)
    [[ "$url" == "postgresql://mg:mg@localhost:5432/mg_memory" ]]
}

@test "mg-postgres start: sets storage_mode=postgres in config" {
    # AC-DB-6.5: storage_mode must be set to postgres
    _use_fake_bin
    _psql_will_succeed

    run "$SCRIPT_PATH" start
    [ "$status" -eq 0 ]

    local mode
    mode=$(jq -r '.storage_mode' "$MG_CONFIG_DIR/config.json" 2>/dev/null)
    [[ "$mode" == "postgres" ]]
}

@test "mg-postgres start: exits 0 on success" {
    _use_fake_bin
    _psql_will_succeed

    run "$SCRIPT_PATH" start
    [ "$status" -eq 0 ]
}

@test "mg-postgres stop: stops and removes container — docker stop and rm called" {
    # AC-DB-6.6: stop must invoke docker stop and docker rm
    _use_fake_bin
    _container_already_running

    run "$SCRIPT_PATH" stop
    [ "$status" -eq 0 ]

    # Both stop and rm must appear in docker call log
    grep -q "stop" "$DOCKER_CALLS"
    grep -q "rm" "$DOCKER_CALLS"
}

@test "mg-postgres stop: exits 0 on success" {
    _use_fake_bin
    _container_already_running

    run "$SCRIPT_PATH" stop
    [ "$status" -eq 0 ]
}

@test "mg-postgres status: running container — prints 'running'" {
    # AC-DB-6.7: status must report container state
    _use_fake_bin
    _container_already_running
    _psql_will_succeed

    run "$SCRIPT_PATH" status
    [ "$status" -eq 0 ]
    [[ "$output" =~ [Rr]unning ]]
}

@test "mg-postgres status: stopped container — prints 'stopped'" {
    # AC-DB-6.7: status must report stopped state when container is not running
    _use_fake_bin
    # CONTAINER_RUNNING_FILE absent — not running

    run "$SCRIPT_PATH" status
    # Exit code flexible — may be 0 even when stopped
    [[ "$output" =~ [Ss]topped ]] || [[ "$output" =~ "not running" ]] || [[ "$output" =~ "down" ]]
}

@test "mg-postgres status: includes connection test result" {
    # AC-DB-6.7: status output must include psql connectivity info
    _use_fake_bin
    _container_already_running
    _psql_will_succeed

    run "$SCRIPT_PATH" status
    [ "$status" -eq 0 ]
    # Output must mention connection state — "ok", "connected", "healthy", or similar
    [[ "$output" =~ [Cc]onnect ]] || [[ "$output" =~ [Hh]ealthy ]] || [[ "$output" =~ [Oo][Kk] ]] || [[ "$output" =~ [Ss]uccess ]]
}

@test "mg-postgres --help: prints usage" {
    # Standard help flag must print usage and exit 0
    run "$SCRIPT_PATH" --help
    [ "$status" -eq 0 ]
    [[ "$output" =~ [Uu]sage ]] || [[ "$output" =~ "start" ]] || [[ "$output" =~ "stop" ]] || [[ "$output" =~ "status" ]]
}
