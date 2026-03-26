#!/usr/bin/env bats
# Test Specifications: GH-266 — install-lib.sh embedding contract
# Coverage: 14 tests (5M + 4B + 5G)
# Ordering: Misuse → Boundary → Golden Path (CAD protocol)
#
# These tests validate that install-lib.sh can be safely embedded (sourced)
# by a calling script. They run against the BUILT artefact in dist/ so they
# exercise the same file that end users receive.
#
# All tests FAIL against the current codebase (install-lib.sh does not exist).

setup() {
    # Isolated temp environment for every test
    export TEST_DIR=$(mktemp -d)
    export CLAUDE_DIR="$TEST_DIR/.claude"

    # Redirect HOME so global install detection uses a clean fake home
    export FAKE_HOME=$(mktemp -d)
    export ORIG_HOME="$HOME"
    export HOME="$FAKE_HOME"

    # Path to built artefacts
    export BUILD_DIR="$BATS_TEST_DIRNAME/../../dist/miniature-guacamole"
    export INSTALL_LIB="$BUILD_DIR/install-lib.sh"
    export INSTALL_SH="$BUILD_DIR/install.sh"

    # Skip entire suite if the dist has not been built yet
    if [ ! -f "$INSTALL_SH" ]; then
        skip "dist/miniature-guacamole/install.sh not found — run ./build.sh first"
    fi

    # All embedding tests also require install-lib.sh
    if [ ! -f "$INSTALL_LIB" ]; then
        skip "dist/miniature-guacamole/install-lib.sh not found — run ./build.sh first"
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
# MISUSE CASES (5 tests)
# ============================================================================

@test "M1: sourcing install-lib.sh produces no output" {
    # AC-1: the library must be silent when sourced so embedding scripts are
    # not polluted with unexpected stdout/stderr.
    run bash -c "source '$INSTALL_LIB'"
    [ "$status" -eq 0 ]
    [ -z "$output" ]
}

@test "M2: sourcing install-lib.sh produces no output even when HOME is unset" {
    # AC-1: robustness — no output even if HOME is missing in the environment.
    run bash -c "unset HOME; source '$INSTALL_LIB'"
    [ "$status" -eq 0 ]
    [ -z "$output" ]
}

@test "M3: mg_install_framework --target /nonexistent returns non-zero and does not kill embedding script" {
    # AC-7: a bad --target must not call exit; the embedding script must survive.
    run bash -c "
        source '$INSTALL_LIB'
        mg_install_framework --target /nonexistent/path/does/not/exist
        echo \"exit_code=\$?\"
    "
    # The embedding script must reach the echo (not be killed by exit)
    [[ "$output" =~ "exit_code=" ]]
    # The reported exit code must be non-zero
    [[ "$output" =~ "exit_code=[^0]" ]]
}

@test "M4: sourcing install.sh (the wrapper) is rejected by the anti-sourcing guard" {
    # AC-4: the guard in the wrapper must still fire; install.sh must not be
    # sourceable even after the refactor.
    run bash -c "source '$INSTALL_SH'"
    [ "$status" -ne 0 ]
    [[ "$output" =~ [Ee]rror ]] || [[ "$output" =~ "must be executed" ]]
}

@test "M5: mg_install_framework without --target uses CWD and returns non-zero when CWD has no source" {
    # AC-7 (boundary of default): when called from an empty tmpdir with no
    # framework source present, the function must fail gracefully (return, not exit).
    run bash -c "
        cd '$TEST_DIR'
        source '$INSTALL_LIB'
        mg_install_framework --force
        echo \"survived=yes\"
    "
    # The script must survive past mg_install_framework
    [[ "$output" =~ "survived=yes" ]]
}

# ============================================================================
# BOUNDARY TESTS (4 tests)
# ============================================================================

@test "B1: mg_install_framework is defined after sourcing install-lib.sh" {
    # AC-5: the function must be available in the calling shell immediately
    # after the source command — no additional steps required.
    run bash -c "
        source '$INSTALL_LIB'
        declare -f mg_install_framework > /dev/null && echo 'defined'
    "
    [ "$status" -eq 0 ]
    [[ "$output" =~ "defined" ]]
}

@test "B2: multiple sources of install-lib.sh in the same shell do not error" {
    # Boundary: re-sourcing (e.g. if an embedding script is sourced twice)
    # must be idempotent and silent.
    run bash -c "
        source '$INSTALL_LIB'
        source '$INSTALL_LIB'
        echo 'ok'
    "
    [ "$status" -eq 0 ]
    [[ "$output" == "ok" ]]
}

@test "B3: mg_install_framework --skip-settings-merge skips settings.json creation" {
    # AC-8: the flag must suppress settings.json so embedding tools that manage
    # their own settings are not overwritten.
    run bash -c "
        source '$INSTALL_LIB'
        mg_install_framework \
            --target '$TEST_DIR' \
            --source '$BUILD_DIR' \
            --force \
            --skip-settings-merge \
            --quiet
    "
    [ "$status" -eq 0 ]
    [ ! -f "$CLAUDE_DIR/settings.json" ]
}

@test "B4: mg_install_framework --skip-claude-md skips CLAUDE.md creation" {
    # AC-9: the flag must suppress CLAUDE.md so embedding tools that manage
    # their own documentation are not overwritten.
    run bash -c "
        source '$INSTALL_LIB'
        mg_install_framework \
            --target '$TEST_DIR' \
            --source '$BUILD_DIR' \
            --force \
            --skip-claude-md \
            --quiet
    "
    [ "$status" -eq 0 ]
    [ ! -f "$CLAUDE_DIR/CLAUDE.md" ]
}

# ============================================================================
# GOLDEN PATH (5 tests)
# ============================================================================

@test "G1: mg_install_framework completes a full install via library entry point" {
    # AC-5 + AC-10: the library function must install the same components as
    # the monolithic install.sh used to.
    run bash -c "
        source '$INSTALL_LIB'
        mg_install_framework \
            --target '$TEST_DIR' \
            --source '$BUILD_DIR' \
            --force \
            --quiet
    "
    [ "$status" -eq 0 ]
    [ -d "$CLAUDE_DIR/memory" ]
    [ -f "$CLAUDE_DIR/memory/.gitignore" ]
}

@test "G2: mg_install_framework creates settings.json by default" {
    # AC-10 regression: default install (without --skip-settings-merge) must
    # still produce settings.json.
    run bash -c "
        source '$INSTALL_LIB'
        mg_install_framework \
            --target '$TEST_DIR' \
            --source '$BUILD_DIR' \
            --force \
            --quiet
    "
    [ "$status" -eq 0 ]
    [ -f "$CLAUDE_DIR/settings.json" ]
}

@test "G3: mg_install_framework creates CLAUDE.md by default" {
    # AC-10 regression: default install (without --skip-claude-md) must still
    # produce CLAUDE.md.
    run bash -c "
        source '$INSTALL_LIB'
        mg_install_framework \
            --target '$TEST_DIR' \
            --source '$BUILD_DIR' \
            --force \
            --quiet
    "
    [ "$status" -eq 0 ]
    [ -f "$CLAUDE_DIR/CLAUDE.md" ]
}

@test "G4: direct execution of install.sh still succeeds (regression)" {
    # AC-10: the wrapper must behave identically to the old monolithic script.
    cd "$TEST_DIR"
    run bash "$INSTALL_SH" \
        --target "$TEST_DIR" \
        --source "$BUILD_DIR" \
        --force
    [ "$status" -eq 0 ]
    [ -d "$CLAUDE_DIR/memory" ]
    [ -f "$CLAUDE_DIR/settings.json" ]
    [ -f "$CLAUDE_DIR/CLAUDE.md" ]
}

@test "G5: install-lib.sh can be sourced inside a function without leaking globals" {
    # AC-1 (side-effect contract): sourcing inside a function must not leak
    # variables or functions into the outer shell beyond mg_install_framework.
    run bash -c "
        _before=\$(compgen -v | sort)
        source '$INSTALL_LIB'
        _after=\$(compgen -v | sort)
        # Only mg_* names should be new exports; no raw UPPERCASE install vars
        new_vars=\$(comm -13 <(echo \"\$_before\") <(echo \"\$_after\") | grep -v '^mg_' | grep -v '^_' || true)
        if [ -n \"\$new_vars\" ]; then
            echo \"leaked: \$new_vars\"
        else
            echo 'clean'
        fi
    "
    [ "$status" -eq 0 ]
    [[ "$output" == "clean" ]]
}
