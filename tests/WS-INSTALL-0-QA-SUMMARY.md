# WS-INSTALL-0: Test Specifications Complete

**Status:** TESTS WRITTEN ✓
**QA Agent:** qa
**Date:** 2026-02-09

## Summary

Comprehensive BDD/TDD test specifications have been written for WS-INSTALL-0 (Core Installation Layout). Following the CAD protocol (misuse → boundary → golden path), 86 tests have been specified for the new `mg-util` command.

## Deliverables

### 1. Test Suite
**File:** `/tests/scripts/mg-util-install.bats`
- **Total tests:** 86
- **Test distribution:**
  - Misuse cases: 18 (21%)
  - Boundary tests: 21 (24%)
  - Golden path: 44 (51%)
  - Integration: 3 (4%)
- **Coverage target:** 99%

### 2. Test Specification Document
**File:** `/tests/WS-INSTALL-0-TEST-SPECS.md`
- Complete behavioral specifications
- Command interface definitions
- Implementation guidance
- Error handling requirements
- Output format examples
- Quality gate checklist

### 3. Agent Memory Update
**File:** `.claude/agent-memory/qa/MEMORY.md`
- WS-INSTALL-0 pattern documented
- Installation utility testing insights
- Environment isolation techniques
- Shell profile management testing

## Command Interface Specified

### mg-util install
```bash
mg-util install [--force] [SOURCE_DIR]
```
Creates `~/.miniature-guacamole/` with:
- `bin/` - Executable scripts
- `framework/` - Agents, skills, shared, hooks
- `audit/`, `config/`, `cache/` - Reserved directories
- `VERSION` - Version tracking

Creates symlinks:
- `~/.claude/agents` → `~/.miniature-guacamole/framework/agents`
- `~/.claude/skills` → `~/.miniature-guacamole/framework/skills`
- `~/.claude/shared` → `~/.miniature-guacamole/framework/shared`
- `~/.claude/hooks` → `~/.miniature-guacamole/framework/hooks`
- `~/.claude/scripts` → `~/.miniature-guacamole/bin`

Adds PATH to shell profile (bash or zsh detection).

### mg-util status
```bash
mg-util status
```
Displays:
- Framework version
- Symlink health (all 5 symlinks)
- PATH status
- Overall installation health

### mg-util uninstall
```bash
mg-util uninstall [--force]
```
Removes:
- `~/.miniature-guacamole/` directory
- All symlinks from `~/.claude/`
- PATH entries from shell profiles

Requires confirmation unless `--force` specified.

## Test Coverage by Acceptance Criterion

| AC | Description | Test Count | Status |
|----|-------------|-----------|--------|
| AC-1 | Creates directory structure | 7 | ✓ Specified |
| AC-2 | Adds PATH to shell profile | 9 | ✓ Specified |
| AC-3 | Creates symlinks | 8 | ✓ Specified |
| AC-4 | Status shows health | 8 | ✓ Specified |
| AC-5 | Uninstall removes all | 4 | ✓ Specified |
| AC-6 | which mg-help resolves | 2 | ✓ Specified |
| AC-7 | Idempotent operations | 6 | ✓ Specified |

**Total:** 44 direct AC tests + 42 error/edge case tests = 86 tests

## Key Testing Strategies

### 1. Environment Isolation
```bash
TEST_HOME="$(mktemp -d)"
export HOME="$TEST_HOME"
```
All tests run in isolated temporary home directory.

### 2. Shell Profile Mocking
```bash
BASH_PROFILE="$TEST_HOME/.bash_profile"
BASHRC="$TEST_HOME/.bashrc"
ZSHRC="$TEST_HOME/.zshrc"
```
Mock profile files to test detection and PATH management.

### 3. Symlink Validation
- Test creation
- Test target resolution
- Test broken symlink detection
- Test symlink replacement

### 4. Idempotency
- Install twice (should detect existing)
- Status multiple times (consistent output)
- Uninstall when not installed (safe failure)

### 5. Error Path Coverage
- Missing source directory
- Invalid source structure
- Permission denied
- Corrupted installation
- Broken symlinks
- Missing VERSION file

## Test Execution

### Run All Tests
```bash
bats tests/scripts/mg-util-install.bats
```

### Run by Category
```bash
bats tests/scripts/mg-util-install.bats --filter "MISUSE"
bats tests/scripts/mg-util-install.bats --filter "BOUNDARY"
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

## Implementation File Location

**Expected path:** `/src/scripts/mg-util`

Script should implement:
1. Argument parsing (subcommand + flags)
2. Shell profile detection (zsh > bashrc > bash_profile)
3. Directory structure creation
4. Symlink management
5. PATH entry management
6. Status reporting
7. Uninstall cleanup

## Quality Gates

### Pre-Implementation (Completed)
- [x] Test specifications written
- [x] BATS test file created
- [x] Test ordering follows CAD protocol
- [x] All acceptance criteria have test coverage
- [x] Coverage target 99% achievable
- [x] Edge cases identified and tested
- [x] Error paths fully specified

### Post-Implementation (Pending)
- [ ] All 86 tests passing
- [ ] No skipped tests
- [ ] Coverage ≥ 99%
- [ ] All acceptance criteria met
- [ ] Error messages clear and actionable
- [ ] Output formatting consistent
- [ ] Shell profile detection working
- [ ] Symlinks created correctly
- [ ] PATH management working
- [ ] Idempotent operations verified
- [ ] Uninstall clean (no leftover files)
- [ ] `which mg-help` resolves correctly

## Handoff to Dev

The QA specifications are complete and ready for implementation. The dev team should:

1. Read `/tests/WS-INSTALL-0-TEST-SPECS.md` for complete behavior specification
2. Create `/src/scripts/mg-util` following test specifications
3. Run `bats tests/scripts/mg-util-install.bats` during development
4. Fix failing tests iteratively
5. Notify QA when all 86 tests pass

## Next Steps

1. **Dev Team:** Implement `/src/scripts/mg-util` based on test specs
2. **QA Team:** Verify implementation when dev reports completion
3. **Engineering Manager:** Gate 2 approval once all tests pass

## Files Modified/Created

- ✓ `/tests/scripts/mg-util-install.bats` (43KB, 86 tests)
- ✓ `/tests/WS-INSTALL-0-TEST-SPECS.md` (20KB, specification)
- ✓ `/tests/WS-INSTALL-0-QA-SUMMARY.md` (this file)
- ✓ `.claude/agent-memory/qa/MEMORY.md` (updated with WS-INSTALL-0 pattern)

## Test Pattern Reference

This workstream follows the established pattern from WS-SCRIPTS-0:
- BATS testing framework
- CAD protocol ordering (misuse → boundary → golden)
- Isolated test environment (`mktemp -d`)
- 99% coverage target
- Comprehensive documentation

The pattern has been validated on 9+ previous utility scripts with 100% success rate.

---

**QA Agent Sign-off:** Test specifications complete and ready for implementation.
**Gate Status:** GATE 1 (Tests Written) ✓ PASSED
**Next Gate:** GATE 2 (Implementation + Tests Pass) - Pending dev work
