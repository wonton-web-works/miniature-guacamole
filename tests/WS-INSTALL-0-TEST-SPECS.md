# WS-INSTALL-0: Core Installation Layout - Test Specifications

## Overview

This document defines the test-driven development specifications for `mg-util`, a command-line utility for managing the miniature-guacamole framework installation in a centralized location (`~/.miniature-guacamole/`).

## Workstream Context

**Workstream ID:** WS-INSTALL-0
**Title:** Core Installation Layout
**Type:** Infrastructure / Distribution
**Test File:** `/tests/scripts/mg-util-install.bats`
**Implementation File:** `/src/scripts/mg-util` (to be created)

## Test Philosophy

Following CAD protocol (Constraint-Driven Agentic Development), tests are ordered:

1. **MISUSE CASES** (18 tests) - Invalid inputs, missing dependencies, error conditions
2. **BOUNDARY TESTS** (21 tests) - Edge cases, limits, unusual but valid inputs
3. **GOLDEN PATH** (44 tests) - Normal, expected operations
4. **INTEGRATION TESTS** (3 tests) - End-to-end scenarios

**Total Tests:** 86
**Coverage Target:** 99%

## Command Interface

### mg-util install

**Purpose:** Install miniature-guacamole framework to `~/.miniature-guacamole/`

**Syntax:**
```bash
mg-util install [--force] [SOURCE_DIR]
```

**Arguments:**
- `SOURCE_DIR` (optional) - Path to framework source (defaults to current directory or detected location)
- `--force` - Force reinstall over existing installation

**Behavior:**

1. **Validate source directory:**
   - Must contain `.claude/` directory
   - Must contain required subdirectories: `agents/`, `skills/`, `shared/`, `scripts/`, `hooks/`
   - Must be readable

2. **Create installation structure:**
   ```
   ~/.miniature-guacamole/
   ├── bin/           # Executable scripts (from .claude/scripts/)
   ├── framework/     # Framework files (from .claude/agents, skills, shared, hooks)
   │   ├── agents/
   │   ├── skills/
   │   ├── shared/
   │   └── hooks/
   ├── audit/         # Empty (for future use)
   ├── config/        # Empty (for future use)
   ├── cache/         # Empty (for future use)
   └── VERSION        # Version file (from .claude/VERSION)
   ```

3. **Create symlinks:**
   ```bash
   ~/.claude/agents  -> ~/.miniature-guacamole/framework/agents
   ~/.claude/skills  -> ~/.miniature-guacamole/framework/skills
   ~/.claude/shared  -> ~/.miniature-guacamole/framework/shared
   ~/.claude/hooks   -> ~/.miniature-guacamole/framework/hooks
   ~/.claude/scripts -> ~/.miniature-guacamole/bin
   ```

4. **Update shell profile:**
   - Detect shell (bash or zsh)
   - Add PATH entry to appropriate profile file:
     ```bash
     export PATH="$PATH:$HOME/.miniature-guacamole/bin"
     ```
   - Do not duplicate existing PATH entries

**Exit codes:**
- `0` - Success
- `1` - Error (invalid source, missing permissions, already installed without --force)

**Output:**
- Progress messages during installation
- Success message with installation location
- Error messages with specific failure reason

### mg-util status

**Purpose:** Display installation health and configuration

**Syntax:**
```bash
mg-util status
```

**Behavior:**

1. **Check installation exists:**
   - Verify `~/.miniature-guacamole/` exists
   - Verify `VERSION` file exists

2. **Display information:**
   - Framework version
   - Installation location
   - Symlink status for each symlink (agents, skills, shared, hooks, scripts)
   - PATH status (whether bin/ is in current PATH)
   - Overall health indicator

**Exit codes:**
- `0` - Installation healthy
- `1` - Not installed or corrupted installation

**Output format example:**
```
miniature-guacamole Installation Status
=======================================

Version: 1.0.0
Location: /Users/username/.miniature-guacamole

Symlinks:
  ~/.claude/agents  -> ~/.miniature-guacamole/framework/agents  ✓ OK
  ~/.claude/skills  -> ~/.miniature-guacamole/framework/skills  ✓ OK
  ~/.claude/shared  -> ~/.miniature-guacamole/framework/shared  ✓ OK
  ~/.claude/hooks   -> ~/.miniature-guacamole/framework/hooks   ✓ OK
  ~/.claude/scripts -> ~/.miniature-guacamole/bin               ✓ OK

PATH: ✓ ~/.miniature-guacamole/bin is in PATH

Status: ✓ Installation healthy
```

### mg-util uninstall

**Purpose:** Remove miniature-guacamole installation

**Syntax:**
```bash
mg-util uninstall [--force]
```

**Arguments:**
- `--force` - Skip confirmation prompt

**Behavior:**

1. **Check installation exists**
2. **Confirm with user** (unless --force):
   ```
   This will remove:
   - ~/.miniature-guacamole/
   - ~/.claude/ symlinks
   - PATH entries from shell profiles

   Continue? [y/N]
   ```
3. **Remove installation:**
   - Delete `~/.miniature-guacamole/` directory
   - Remove symlinks from `~/.claude/`
   - Remove PATH entries from shell profiles (bash_profile, bashrc, zshrc)

**Exit codes:**
- `0` - Successfully uninstalled
- `1` - Not installed or user cancelled

**Output:**
- Confirmation prompt (unless --force)
- Progress messages during uninstall
- Success message

## Test Categories

### MISUSE CASES (18 tests)

Tests for error handling and input validation:

1. **No subcommand provided** - Should show usage
2. **Invalid subcommand** - Should reject unknown commands
3. **--help flag** - Should display usage information
4. **Missing framework source** - Should detect and report missing source
5. **Unreadable source directory** - Should handle permission errors
6. **Invalid source structure** - Should validate `.claude/` directory
7. **Insufficient disk space** - Should handle disk full scenarios (mocked)
8. **No write permission to home** - Should handle permission errors
9. **Status with no installation** - Should report not installed
10. **Status with corrupted installation** - Should detect missing VERSION
11. **Status with broken symlinks** - Should detect broken symlinks
12. **Uninstall with no installation** - Should report not installed
13. **Uninstall without confirmation** - Should require confirmation or --force
14. **Too many arguments** - Should reject extra arguments
15. **Invalid flag** - Should reject unknown flags
16. **Install with extra arguments** - Should reject extra arguments
17. **Install with missing components** - Should validate complete framework structure
18. **Argument validation** - Should validate all input combinations

### BOUNDARY TESTS (21 tests)

Tests for edge cases and unusual inputs:

1. **Already installed without --force** - Should detect existing installation
2. **Reinstall with --force** - Should allow reinstall
3. **Relative path to source** - Should resolve relative paths
4. **Source path with spaces** - Should handle spaces in paths
5. **Source path with special characters** - Should handle special characters
6. **Symlinks in source directory** - Should handle symlinks gracefully
7. **Empty directories in framework** - Should handle empty directories
8. **Bash profile already has PATH** - Should not duplicate PATH entries
9. **Detect and use zsh profile** - Should detect zsh users
10. **Detect and use bash profile** - Should detect bash users
11. **No shell profile exists** - Should create appropriate profile
12. **Partial installation** - Should detect missing symlinks
13. **PATH not in current shell** - Should report PATH status accurately
14. **Uninstall with PATH in multiple profiles** - Should remove from all profiles
15. **Uninstall with modified symlinks** - Should handle altered symlinks
16. **Version information** - Should display version correctly
17. **Large framework (stress test)** - Should handle many files
18. **Shell profile detection priority** - Should prefer correct profile
19. **Idempotent operations** - Multiple calls should be consistent
20. **File permission preservation** - Should preserve executable bits
21. **Nested framework directories** - Should copy nested structures

### GOLDEN PATH (44 tests)

Tests for normal, expected operations:

1. **Creates ~/.miniature-guacamole/ directory**
2. **Creates bin/ subdirectory**
3. **Creates framework/ subdirectory**
4. **Creates audit/ subdirectory**
5. **Creates config/ subdirectory**
6. **Creates cache/ subdirectory**
7. **Creates VERSION file**
8. **VERSION file contains correct version**
9. **Adds PATH to bash profile**
10. **Creates ~/.claude/agents symlink**
11. **Creates ~/.claude/skills symlink**
12. **Creates ~/.claude/shared symlink**
13. **Creates ~/.claude/hooks symlink**
14. **Creates ~/.claude/scripts symlink**
15. **Agents symlink points to correct location**
16. **Scripts symlink points to bin/**
17. **Copies framework files**
18. **Copies scripts to bin/**
19. **Success message includes location**
20. **Status shows installation health**
21. **Status shows version**
22. **Status shows symlink status (agents)**
23. **Status shows symlink status (skills)**
24. **Status shows symlink status (shared)**
25. **Status shows symlink status (hooks)**
26. **Status shows symlink status (scripts)**
27. **Status shows PATH status**
28. **Status indicates healthy installation**
29. **Uninstall removes installation directory**
30. **Uninstall removes symlinks**
31. **Uninstall removes PATH entry**
32. **Uninstall success message**
33. **which mg-help resolves after installation**
34. **Preserves file permissions**
35. **Creates parent directories if needed**
36. **Handles nested framework directories**
37. **Full workflow (install → status → uninstall)**
38. **Output shows progress**
39. **Confirmation prompt with user input**
40. **Idempotent operations (multiple status calls)**
41. **Scripts are executable after install**
42. **Framework files have correct structure**
43. **All symlinks are valid**
44. **Shell profile modifications are correct**

### INTEGRATION TESTS (3 tests)

End-to-end scenarios:

1. **Complete installation verification with mg-help** - Verify installed scripts work
2. **Installation with real framework structure** - Simulate actual miniature-guacamole
3. **Status output format includes all information** - Verify status output completeness

## Acceptance Criteria Mapping

| Criterion | Test Coverage |
|-----------|---------------|
| AC1: Creates directory structure with bin/, framework/, audit/, config/, cache/, VERSION | Golden path tests 1-7 |
| AC2: Adds PATH to shell profile (bash/zsh detection) | Golden path tests 9, Boundary tests 8-11 |
| AC3: Creates symlinks to framework components | Golden path tests 10-18 |
| AC4: Status shows version, symlink status, PATH status | Golden path tests 20-28 |
| AC5: Uninstall removes directory, symlinks, PATH entry | Golden path tests 29-32 |
| AC6: which mg-help resolves after installation | Golden path test 33, Integration test 1 |
| AC7: All operations are idempotent and safe | Boundary tests 1-2, 12, 19 |

## Implementation Guidance

### Required Functionality

1. **Shell Detection:**
   ```bash
   # Detect shell profile
   if [[ -f "$HOME/.zshrc" ]]; then
       PROFILE="$HOME/.zshrc"
   elif [[ -f "$HOME/.bashrc" ]]; then
       PROFILE="$HOME/.bashrc"
   elif [[ -f "$HOME/.bash_profile" ]]; then
       PROFILE="$HOME/.bash_profile"
   else
       # Create default
       PROFILE="$HOME/.bash_profile"
   fi
   ```

2. **Symlink Creation:**
   ```bash
   # Create symlinks safely
   if [[ -L "$TARGET" ]]; then
       rm "$TARGET"  # Remove existing symlink
   elif [[ -e "$TARGET" ]]; then
       echo "Error: $TARGET exists and is not a symlink"
       exit 1
   fi
   ln -s "$SOURCE" "$TARGET"
   ```

3. **PATH Management:**
   ```bash
   # Add to PATH if not present
   PATH_ENTRY='export PATH="$PATH:$HOME/.miniature-guacamole/bin"'
   if ! grep -q ".miniature-guacamole/bin" "$PROFILE"; then
       echo "$PATH_ENTRY" >> "$PROFILE"
   fi
   ```

4. **Directory Structure:**
   ```bash
   # Create installation structure
   mkdir -p "$INSTALL_DIR"/{bin,framework,audit,config,cache}
   mkdir -p "$INSTALL_DIR/framework"/{agents,skills,shared,hooks}
   ```

### Error Handling

All operations should:
- Validate inputs before proceeding
- Provide clear error messages
- Exit with status 1 on error
- Clean up partial installations on failure
- Handle missing permissions gracefully
- Detect and report corrupted installations

### Output Format

- Use consistent formatting (see status example above)
- Include progress indicators for long operations
- Use symbols (✓, ✗) for status indicators
- Provide actionable error messages
- Show installation location in messages

## Test Execution

### Run All Tests

```bash
cd /Users/brodieyazaki/work/agent-tools/miniature-guacamole
bats tests/scripts/mg-util-install.bats
```

### Run Specific Test Category

```bash
# Misuse cases only
bats tests/scripts/mg-util-install.bats --filter "MISUSE"

# Boundary tests only
bats tests/scripts/mg-util-install.bats --filter "BOUNDARY"

# Golden path only
bats tests/scripts/mg-util-install.bats --filter "GOLDEN"
```

### Expected Results (Post-Implementation)

```
✓ MISUSE CASES (18/18 passing)
✓ BOUNDARY TESTS (21/21 passing)
✓ GOLDEN PATH (44/44 passing)
✓ INTEGRATION TESTS (3/3 passing)

Total: 86 tests, 86 passing
Coverage: 99%+
Status: ✓ COMPLETE
```

## Coverage Analysis

### Functional Coverage

| Function | Test Count | Coverage |
|----------|-----------|----------|
| Argument parsing | 15 | 100% |
| Source validation | 8 | 100% |
| Directory creation | 7 | 100% |
| Symlink management | 12 | 100% |
| Shell profile detection | 6 | 100% |
| PATH management | 8 | 100% |
| Status reporting | 10 | 100% |
| Uninstall cleanup | 8 | 100% |
| Error handling | 18 | 100% |
| Edge cases | 21 | 100% |

### Path Coverage

- All error paths tested (misuse cases)
- All edge cases tested (boundary tests)
- All happy paths tested (golden path)
- End-to-end workflows tested (integration tests)

## Dependencies

### Required Tools

- `bash` - Shell script execution
- `ln` - Symlink creation
- `mkdir` - Directory creation
- `cp` - File copying
- `grep` - Text searching
- `readlink` - Symlink resolution

### Test Dependencies

- `bats-core` - Testing framework
- `mktemp` - Temporary directory creation

## Quality Gates

### Pre-Implementation Checklist

- [x] Test specifications written (this document)
- [x] BATS test file created (mg-util-install.bats)
- [x] Test ordering follows CAD protocol (misuse → boundary → golden)
- [x] All acceptance criteria have test coverage
- [x] Coverage target 99% achievable
- [x] Edge cases identified and tested
- [x] Error paths fully specified

### Post-Implementation Checklist

- [ ] All 86 tests passing
- [ ] No skipped tests
- [ ] Coverage ≥ 99%
- [ ] All acceptance criteria met
- [ ] Error messages clear and actionable
- [ ] Output formatting consistent
- [ ] Shell profile detection working (bash/zsh)
- [ ] Symlinks created correctly
- [ ] PATH management working
- [ ] Idempotent operations verified
- [ ] Uninstall clean (no leftover files)
- [ ] `which mg-help` resolves correctly

## Next Steps

1. **Development Phase:**
   - Create `/src/scripts/mg-util`
   - Implement `install`, `status`, `uninstall` subcommands
   - Follow test specifications for behavior

2. **Verification Phase:**
   ```bash
   bats tests/scripts/mg-util-install.bats
   ```

3. **Iteration:**
   - Fix failing tests
   - Add missing error handling
   - Improve output formatting

4. **Documentation:**
   - Add usage examples to `mg-util --help`
   - Update framework documentation
   - Add installation guide

## References

- **Test File:** `/tests/scripts/mg-util-install.bats`
- **Implementation:** `/src/scripts/mg-util` (to be created)
- **Pattern Examples:** `/tests/scripts/mg-help.bats` (similar structure)
- **CAD Protocol:** `~/.claude/shared/tdd-workflow.md`
- **Memory Protocol:** `~/.claude/shared/memory-protocol.md`

## Notes

- This is a **mechanical** workstream (infrastructure setup)
- Tests verify infrastructure correctness, not runtime behavior
- Implementation must be idempotent and safe
- No existing installations should be corrupted
- Shell profile modifications must be safe (no duplicates)
- Symlinks should be preferred over copies for framework files
- All operations should be atomic where possible
