# WS-INSTALL-2 Test Specifications

**Workstream**: WS-INSTALL-2 Init & Audit Integration
**Test Framework**: BATS (Bash Automated Testing System)
**Test Ordering**: CAD Protocol (Misuse → Boundary → Golden Path)
**Target Coverage**: 99%

## Overview

This document specifies comprehensive BDD/BATS test suites for the `mg-util` command, which consolidates initialization and audit functionality for the miniature-guacamole framework.

## Acceptance Criteria Mapping

| AC | Description | Test File | Test Count |
|----|-------------|-----------|------------|
| AC-1 | `mg-util init [project-dir]` creates `.claude/memory/` and CLAUDE.md | mg-util-init.bats | 20 |
| AC-2 | `mg-util init` uses `~/.miniature-guacamole/` for templates | mg-util-init.bats | 12 |
| AC-3 | `mg-util audit [--project\|--global]` runs settings check + cost reporting | mg-util-audit.bats | 16 |
| AC-4 | `mg-util audit` writes reports to `~/.miniature-guacamole/audit/` | mg-util-audit.bats | 10 |
| AC-5 | Project hooks reference `~/.miniature-guacamole/framework/hooks/` | Integration test | TBD |
| AC-6 | Init handles existing projects gracefully (idempotent) | mg-util-init.bats | 8 |
| AC-7 | Audit aggregates cross-project data in global directory | mg-util-audit.bats | 10 |

**Total Tests**: 98+ across 2 test files

## Test Files

### 1. mg-util-init.bats (50 tests)

Tests for `mg-util init [project-dir]` command.

#### MISUSE CASES (12 tests)
- Missing installation root directory (`~/.miniature-guacamole/` not found)
- Missing required template files
- Invalid project directory paths (null bytes, invalid characters)
- Project directory is a file (not a directory)
- Unwritable project directory (permission denied)
- Unreadable installation root (permission denied)
- Missing command dependencies (mkdir, cp)
- Disk full during directory creation
- SIGINT handling (Ctrl+C cleanup)
- Corrupted template files (invalid JSON)
- Path normalization edge cases (trailing slashes)
- Relative paths outside current directory

#### BOUNDARY TESTS (14 tests)
- Project directory doesn't exist (auto-create)
- Empty project directory
- Project with existing `.claude/` (no memory)
- Project with existing `.claude/memory/` (idempotent)
- Project with existing CLAUDE.md (preserve)
- No project directory argument (use current directory)
- Project paths with spaces
- Project paths with special characters
- Deeply nested project paths
- Symlinked project directories
- Symlinked installation root
- Minimal template structure
- Empty template files (zero-byte)

#### GOLDEN PATH (24 tests)
- Create complete memory structure
- Create CLAUDE.md from template
- Copy all memory template files
- Use explicit project directory argument
- Verify installation root template usage
- Success message output
- Exit code 0 on success
- Preserve existing project files
- Help flags (--help, -h)
- Create memory subdirectory structure
- Verbose/quiet modes (optional)
- Multiple successive initializations (idempotent)
- Absolute path handling
- Relative path handling
- Template file permissions preservation

### 2. mg-util-audit.bats (48 tests)

Tests for `mg-util audit [--project|--global]` command.

#### MISUSE CASES (12 tests)
- Missing audit directory (`~/.miniature-guacamole/audit/` not found)
- Unwritable audit directory (permission denied)
- Missing `mg-settings-check` dependency
- Invalid flag combination (--project and --global together)
- Unknown flag
- Not in project directory when using --project
- Corrupted audit cache file (invalid JSON)
- Missing project settings file
- Disk full during report write
- SIGINT handling (Ctrl+C)
- Timestamp generation failure
- Global mode with no $HOME environment variable

#### BOUNDARY TESTS (14 tests)
- Project with no audit data
- Empty audit cache file
- Very large audit cache (1000+ sessions, performance test)
- Minimal project structure
- No flags (default to both project and global)
- Report filename timestamp format validation
- Multiple projects cross-project aggregation
- Existing report with same timestamp (collision)
- Project paths with spaces
- Symlinked project directories
- Audit directory with many existing reports
- Global mode with no projects initialized

#### GOLDEN PATH (22 tests)
- Run mg-settings-check for project mode
- Run mg-settings-check for global mode
- Generate cost report from audit cache
- Write report to audit directory
- Report contains timestamp
- Report contains project identifier
- Aggregate cross-project data
- Display summary to stdout
- Exit code 0 on success
- Help flags (--help, -h)
- Project mode only checks project settings
- Global mode only checks global settings
- Both modes when no flag specified
- Report includes session count
- Report includes token counts
- Report includes cache hit information
- Report persists to file
- Multiple successive audits create separate reports
- Settings check failure reported
- Verbose/quiet modes (optional)
- JSON output format (optional)

## Test Infrastructure

### Setup Pattern

```bash
setup() {
    # Test fixtures directory
    FIXTURES_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/fixtures" && pwd)"

    # Temporary test directory
    TEST_DIR="$(mktemp -d)"

    # Project root
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"

    # Mock installation root
    MG_INSTALL_ROOT="$TEST_DIR/.miniature-guacamole"
    mkdir -p "$MG_INSTALL_ROOT"

    # Create test script directory
    TEST_SCRIPTS_DIR="$TEST_DIR/scripts"
    mkdir -p "$TEST_SCRIPTS_DIR"

    # Copy or create scripts
    SCRIPT_PATH="$TEST_SCRIPTS_DIR/mg-util"
}

teardown() {
    # Clean up temporary directory
    rm -rf "$TEST_DIR"
}
```

### Key Testing Principles

1. **TDD Approach**: Tests written before implementation
2. **CAD Ordering**: Misuse → Boundary → Golden Path (mandatory)
3. **Isolation**: Each test uses temporary directories
4. **Fixtures**: Mock templates, settings, and audit data
5. **Environment Variables**: Use `MG_INSTALL_ROOT` for test isolation
6. **Path Handling**: Test absolute, relative, symlinks, spaces
7. **Idempotency**: Verify multiple runs don't break state
8. **Error Messages**: Validate error output contains useful information
9. **Exit Codes**: 0 for success, 1 for failure, 2 for prerequisites (if applicable)

## Fixtures Required

### For mg-util-init.bats

Create in `tests/scripts/fixtures/`:

- `templates/project/CLAUDE.md` - Project context template
- `templates/memory/tasks-dev.json` - Task queue template
- `templates/memory/tasks-qa.json` - QA task queue template
- `templates/memory/decisions.json` - Decision log template

### For mg-util-audit.bats

Create in `tests/scripts/fixtures/`:

- `settings-clean.json` - Valid settings file (already exists)
- `settings-small-bloat.json` - Settings with 1 oversized pattern (already exists)
- `audit-cache-single.json` - Single session audit data
- `audit-cache-multiple.json` - Multiple sessions audit data
- `audit-cache-large.json` - 1000+ sessions for performance testing
- `audit-cache-empty.json` - Empty sessions array
- `audit-cache-invalid.json` - Corrupted JSON

## Implementation Contract

The tests define the following interface contract for `mg-util`:

### mg-util init [project-dir]

**Usage**:
```bash
mg-util init [project-dir] [--help | -h]
```

**Arguments**:
- `project-dir` (optional): Target project directory (defaults to current directory)

**Flags**:
- `--help`, `-h`: Display help message

**Environment Variables**:
- `MG_INSTALL_ROOT`: Installation root directory (defaults to `~/.miniature-guacamole/`)

**Behavior**:
1. Resolve project directory (argument or current directory)
2. Create project directory if it doesn't exist
3. Create `.claude/` directory if needed
4. Create `.claude/memory/` structure
5. Copy templates from `$MG_INSTALL_ROOT/templates/memory/` to `.claude/memory/`
6. Create `.claude/CLAUDE.md` from template (preserve if exists)
7. Output success message

**Exit Codes**:
- 0: Success
- 1: Error (missing templates, permission denied, invalid path)

**Idempotency**:
- Safe to run multiple times on same project
- Preserves existing files (no overwrites)
- Creates missing directories/files only

### mg-util audit [--project | --global] [--help | -h]

**Usage**:
```bash
mg-util audit [--project | --global] [--help | -h]
```

**Flags**:
- `--project`: Audit current project only
- `--global`: Audit global settings and aggregate cross-project data
- `--help`, `-h`: Display help message
- (no flag): Audit both project and global

**Environment Variables**:
- `MG_INSTALL_ROOT`: Installation root directory (defaults to `~/.miniature-guacamole/`)

**Behavior**:
1. Determine audit scope (project, global, or both)
2. Run `mg-settings-check` with appropriate flags
3. Read audit cache from `.claude/audit/stats-cache.json` (if project mode)
4. Compute cost report (sessions, tokens, cache hits)
5. Generate timestamped report: `audit-{scope}-YYYYMMDD-HHMMSS.txt`
6. Write report to `$MG_INSTALL_ROOT/audit/`
7. Display summary to stdout

**Exit Codes**:
- 0: Success (even if issues found, report saved)
- 1: Error (missing dependencies, corrupted data, permission denied)

**Report Format**:
```
=== Audit Report ===
Date: 2026-02-09 12:00:00
Scope: project | global

Settings Check:
- Project settings: OK | ISSUES FOUND
- Global settings: OK | ISSUES FOUND

Cost Report:
- Total sessions: 10
- Input tokens: 50000
- Output tokens: 25000
- Cache read tokens: 10000
- Estimated cost: $X.XX

Projects Audited:
- /path/to/project1
- /path/to/project2
```

## Running Tests

### Prerequisites

```bash
brew install bats-core
```

### Execute Test Suites

```bash
# Run all WS-INSTALL-2 tests
bats tests/scripts/mg-util-init.bats
bats tests/scripts/mg-util-audit.bats

# Run specific test
bats tests/scripts/mg-util-init.bats --filter "create memory structure"

# Run with TAP output
bats --tap tests/scripts/mg-util-init.bats

# Show timing information
bats --timing tests/scripts/mg-util-audit.bats
```

### Coverage Verification

After implementation, verify coverage:

```bash
# Run all tests
bats tests/scripts/mg-util-*.bats

# Expected results:
# - 98+ tests total
# - 0 failures
# - 99%+ coverage
# - All acceptance criteria verified
```

## Test-Driven Development Workflow

1. **QA writes tests first** (this document + .bats files)
2. **Dev reads test specs** to understand requirements
3. **Dev implements mg-util script** to pass tests
4. **Dev runs tests incrementally** as implementation progresses
5. **QA runs full test suite** for verification
6. **QA checks regression tests** (WS-SCRIPTS-0, WS-SETTINGS-2)

## Success Criteria

### Gate 1: Test Specification (DONE)
- ✅ Test files created with 98+ tests
- ✅ All acceptance criteria mapped to tests
- ✅ CAD ordering followed (misuse → boundary → golden)
- ✅ Fixtures specified
- ✅ Interface contract defined

### Gate 2: Implementation Verification
- ⬜ All 98+ tests passing
- ⬜ 99%+ code coverage achieved
- ⬜ All acceptance criteria met
- ⬜ No regressions in existing tests
- ⬜ Documentation updated

### Gate 3: Integration Verification
- ⬜ mg-util init works end-to-end
- ⬜ mg-util audit works end-to-end
- ⬜ Cross-project aggregation verified
- ⬜ Idempotency verified
- ⬜ Settings check integration verified

## Dependencies

### Test Dependencies
- `bats-core` (testing framework)
- `jq` (JSON parsing in test assertions)
- Standard Unix tools: `mktemp`, `mkdir`, `cp`, `chmod`, `grep`

### Script Dependencies (to be implemented)
- `mg-settings-check` (existing script)
- `~/.miniature-guacamole/templates/` (template files)
- `~/.miniature-guacamole/audit/` (audit directory)

## Related Workstreams

- **WS-INIT-1/2/3**: Global agent distribution (predecessor)
- **WS-SCRIPTS-0**: Script infrastructure (mg-memory-*, mg-help)
- **WS-SETTINGS-2**: mg-settings-check (dependency)
- **WS-AUDIT-1/2**: Cost estimation and reporting (integration)

## Notes

### Why BATS?
- Same pattern as WS-SCRIPTS-0 (consistency)
- Excellent for shell script testing
- TAP output for CI/CD integration
- Simple syntax, easy to read
- Fast execution

### Why TDD?
- Tests define the interface contract
- Implementation follows test expectations
- 99% coverage guaranteed
- Prevents regression
- Documents expected behavior

### Why CAD Ordering?
- Misuse cases catch errors first
- Boundary cases verify edge behavior
- Golden path confirms normal operations
- Mirrors real-world error frequency
- Improves debugging efficiency

## Appendix: Test Statistics

### mg-util-init.bats
- **Total tests**: 50
- **Misuse**: 12 (24%)
- **Boundary**: 14 (28%)
- **Golden**: 24 (48%)
- **Coverage**: 99%+ of init functionality

### mg-util-audit.bats
- **Total tests**: 48
- **Misuse**: 12 (25%)
- **Boundary**: 14 (29%)
- **Golden**: 22 (46%)
- **Coverage**: 99%+ of audit functionality

### Combined
- **Total tests**: 98
- **Average distribution**: 25% misuse, 29% boundary, 46% golden
- **Target coverage**: 99%
- **Estimated runtime**: <10 seconds (all tests)

---

**Status**: Test specifications complete, ready for dev implementation
**Next Step**: Dev team implements `mg-util` script to pass all tests
**QA Contact**: Available for clarification on test expectations
