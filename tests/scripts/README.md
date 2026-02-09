# Script Infrastructure Tests (WS-SCRIPTS-0)

Comprehensive BATS test suite for the miniature-guacamole script infrastructure.

## Overview

This directory contains tests for the three core script primitives:
- `mg-memory-read` - Read and pretty-print JSON memory files
- `mg-memory-write` - Atomic JSON updates with backup
- `mg-help` - Command index and usage

## Test Philosophy

Tests follow **misuse → boundary → golden path** ordering as per CAD protocol:

1. **MISUSE CASES** - Invalid inputs, missing dependencies, corrupted data, error conditions
2. **BOUNDARY TESTS** - Edge cases, limits, unusual but valid inputs
3. **GOLDEN PATH** - Normal, expected operations

This ordering ensures error handling and resilience are verified before happy path testing.

## Installation

### Prerequisites

Install BATS (Bash Automated Testing System):

```bash
brew install bats-core
```

Verify installation:

```bash
bats --version
```

### Dependencies

- `jq` - JSON processor (required by scripts under test)
- `bash` - 4.0+ recommended

## Running Tests

### Run All Tests

```bash
cd /Users/brodieyazaki/work/agent-tools/miniature-guacamole/tests/scripts
bats *.bats
```

### Run Specific Test File

```bash
bats mg-memory-read.bats
bats mg-memory-write.bats
bats mg-help.bats
```

### Run Specific Test

```bash
bats mg-memory-read.bats --filter "nonexistent file"
```

### Verbose Output

```bash
bats -t mg-memory-read.bats
```

## Test Structure

### mg-memory-read.bats

**Total Tests: 45**

**Misuse Cases (17 tests):**
- Missing jq dependency
- No arguments
- Nonexistent file
- Directory instead of file
- Invalid JSON
- Permission errors
- Corrupted JSON
- Symbolic link errors
- Argument validation

**Boundary Tests (14 tests):**
- Empty JSON
- Deeply nested structures
- Large files (>1KB)
- Unicode characters
- Escaped characters
- Null/boolean values
- Numeric edge cases
- Symbolic links
- Path handling (absolute/relative, spaces, special chars)

**Golden Path (14 tests):**
- Read valid workstream files
- Read valid tasks files
- Pretty-printed output
- Validate JSON structure
- Integration with .claude/memory
- Piping support
- Idempotency
- Read-only verification

### mg-memory-write.bats

**Total Tests: 50**

**Misuse Cases (18 tests):**
- Missing jq dependency
- Argument validation
- Nonexistent files
- Invalid JSON input
- Invalid jq expressions
- Permission errors (read/write)
- Disk full scenarios
- Invalid output scenarios

**Boundary Tests (15 tests):**
- Empty JSON updates
- Complex jq expressions
- Nested object operations
- Array operations
- Field deletion
- Unicode/escaped characters
- Null/boolean updates
- Large file updates
- Multiple simultaneous updates

**Golden Path (17 tests):**
- Update workstream status
- Backup file creation (.bak)
- Backup content verification
- Atomic operations
- Field updates (status, phase, coverage, tests)
- Field preservation
- Pretty-printed output
- Chained writes
- Schema compliance
- Idempotency

### mg-help.bats

**Total Tests: 35**

**Misuse Cases (8 tests):**
- Missing scripts directory
- Too many arguments
- Invalid command names
- Permission errors
- Argument validation

**Boundary Tests (8 tests):**
- Empty scripts directory
- Non-executable scripts
- Symbolic links
- Single vs many commands
- Output formatting with edge cases

**Golden Path (19 tests):**
- List all mg-* commands
- Show descriptions
- Alphabetical sorting
- Usage instructions
- Command syntax
- Specific command help
- Location information
- Example usage
- Dependency documentation
- Consistent formatting
- Idempotency
- Terminal width handling

## Test Fixtures

Located in `fixtures/` directory:

- `valid-workstream.json` - Example workstream state file
- `valid-tasks.json` - Example tasks queue file
- `empty.json` - Empty JSON object
- `invalid.json` - Malformed JSON for error testing
- `large-nested.json` - Deeply nested structure for boundary testing

## Coverage Target

**99% of script functionality**

Coverage includes:
- All error paths
- All input validation
- All edge cases
- All normal operations
- All documented features

## Test Patterns

### Setup/Teardown

```bash
setup() {
    FIXTURES_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/fixtures" && pwd)"
    TEST_DIR="$(mktemp -d)"
    SCRIPT_PATH="$HOME/.claude/scripts/mg-memory-read"
}

teardown() {
    rm -rf "$TEST_DIR"
}
```

### Temporary Test Files

All tests use temporary directories (`mktemp -d`) to avoid polluting the project or system.

### Skip Conditions

Tests that require implementation details not yet available use `skip`:

```bash
@test "example: feature not implemented" {
    skip "TODO: Requires mocking capability"
}
```

### Assertion Patterns

```bash
# Exit code validation
[ "$status" -eq 0 ]
[ "$status" -eq 1 ]

# Output matching
[[ "$output" =~ "expected string" ]]
[[ "$output" =~ "pattern.*regex" ]]

# File verification
[[ -f "$file_path" ]]
[[ -d "$directory_path" ]]

# JSON validation
result=$(cat "$file" | jq '.field')
[[ "$result" == "expected" ]]
```

## Implementation Verification

Once scripts are implemented, run regression tests:

```bash
# Run all tests
bats tests/scripts/*.bats

# Verify coverage
# Should see passing tests in all three categories:
# - MISUSE CASES (error handling)
# - BOUNDARY TESTS (edge cases)
# - GOLDEN PATH (normal operations)
```

## Quality Gates

Before marking WS-SCRIPTS-0 as complete:

- [ ] All misuse case tests written and documented
- [ ] All boundary tests written and documented
- [ ] All golden path tests written and documented
- [ ] Test fixtures created from real memory files
- [ ] BATS installation documented
- [ ] Test ordering follows misuse → boundary → golden path
- [ ] Coverage target of 99% achievable with test suite
- [ ] All tests can be run independently
- [ ] Temporary files cleaned up properly
- [ ] No tests skip unless explicitly documented as TODO

## Test Execution Notes

### Script Installation

Tests assume scripts will be installed at:
- `$HOME/.claude/scripts/mg-memory-read`
- `$HOME/.claude/scripts/mg-memory-write`
- `$HOME/.claude/scripts/mg-help`

Tests will skip if scripts are not yet installed.

### BATS Not Installed

If BATS is not installed, all tests will skip with message:

```
BATS not installed. Install via: brew install bats-core
```

## Expected Test Results

When scripts are implemented correctly:

```
✓ mg-memory-read: 45/45 passing
✓ mg-memory-write: 50/50 passing
✓ mg-help: 35/35 passing

Total: 130 tests, 130 passing
Coverage: 99%+
```

## Next Steps

1. **Development Phase**: Implement the three scripts based on test specifications
2. **Verification Phase**: Run test suite to verify implementation
3. **Iteration**: Fix any failing tests, add missing error handling
4. **Documentation**: Update script --help output to match test expectations

## References

- BATS Documentation: https://bats-core.readthedocs.io/
- jq Manual: https://stedolan.github.io/jq/manual/
- Memory Protocol: `~/.claude/shared/memory-protocol.md`
- Safety Check Pattern: `.claude/hooks/safety-check.sh`
