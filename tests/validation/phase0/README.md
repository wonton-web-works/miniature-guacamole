# WS-LOCAL-0 Phase 0 Validation Suite

## Overview

This directory contains the Phase 0 validation test suite for the project-local migration (WS-LOCAL-0). These tests verify 6 critical assumptions before proceeding with moving framework components from global (`~/.claude/`) to project-local (`.claude/`) locations.

## Test Suite Structure

```
phase0/
├── README.md                           # This file
├── WS-LOCAL-0-TEST-SPECS.md           # Detailed test specifications
├── run-all.sh                         # Master validation script
├── P0-0-claude-mg-loading.sh          # CLAUDE-MG.md loading test
├── P0-1-script-execution.sh           # Script execution test
├── P0-2-inter-script-resolution.sh    # Inter-script resolution test
├── P0-3-mg-help-discovery.sh          # mg-help self-discovery test
├── P0-4-agent-spawning.sh             # Agent spawning test
├── P0-5-settings-independence.sh      # Settings independence test
├── P0-6-hardcoded-paths-audit.sh      # Hardcoded paths audit
└── logs/                              # Test execution logs (created on run)
```

## Quick Start

### Run All Tests

```bash
cd tests/validation/phase0
./run-all.sh
```

The master script will:
1. Execute all 6 tests in order
2. Generate logs for each test
3. Provide a final validation verdict
4. Pause between tests for review

### Run Individual Tests

```bash
# Audit hardcoded paths first
./P0-6-hardcoded-paths-audit.sh

# Run specific test
./P0-1-script-execution.sh

# View test output
cat logs/P0-1.log
```

## Test Descriptions

### P0-0: CLAUDE-MG.md Loading Test

**Status**: INFORMATIONAL (expected fail)

**Purpose**: Verify if Claude Code loads `CLAUDE-MG.md` from `.claude/` directory.

**Expected Result**: FAIL - Claude Code likely only loads `CLAUDE.md`

**Fallback**: Use bounded markers in single `CLAUDE.md` file:
```markdown
<!-- MG-START -->
Framework content here
<!-- MG-END -->
```

### P0-1: Script Execution + Permission Pattern

**Status**: CRITICAL

**Purpose**: Verify project-local mg-* scripts execute successfully.

**Pass Criteria**:
- `mg-memory-read --help` executes successfully
- Permission pattern `Bash(.claude/scripts/mg-*)` works
- JSON files are read correctly

**Failure Actions**: Add missing permission patterns to settings.json

### P0-2: Inter-Script Resolution

**Status**: CRITICAL (requires fixes)

**Purpose**: Verify mg-* scripts can call other mg-* scripts using relative paths.

**Prerequisites**: Apply fix to `mg-workstream-transition` line 101:
```bash
# FROM:
MG_WRITE="$HOME/.claude/scripts/mg-memory-write"

# TO:
MG_WRITE="$(dirname "$0")/mg-memory-write"
```

**Pass Criteria**:
- `mg-workstream-transition` calls `mg-memory-write` successfully
- No "command not found" errors
- State transitions complete atomically

### P0-3: mg-help Self-Discovery

**Status**: CRITICAL (requires fixes)

**Purpose**: Verify mg-help discovers scripts in its own directory.

**Prerequisites**: Apply fix to `mg-help` line 12:
```bash
# FROM:
SCRIPTS_DIR="$HOME/.claude/scripts"

# TO:
SCRIPTS_DIR="$(dirname "$0")"
```

**Pass Criteria**:
- `mg-help` lists all 9 mg-* scripts
- Self-discovery uses `$(dirname "$0")` correctly
- Help text displays for specific commands

### P0-4: Agent Spawning with Zero Global MG

**Status**: INFORMATIONAL

**Purpose**: Verify agents spawn from project-local when global agents are absent.

**Test Method**:
1. Backup `~/.claude/agents/` (if exists)
2. Create project-local agent in `.claude/agents/dev/`
3. Attempt to spawn agent via Task tool
4. Verify agent loads from project-local path
5. Restore global agents

**Expected Outcomes**:
- **PASS**: Agents work independently, can remove global agents
- **FAIL**: Keep minimal global stub agents that redirect to project-local

**WARNING**: Requires manual verification in Claude Code session.

### P0-5: Settings Independence

**Status**: CRITICAL

**Purpose**: Verify project `.claude/settings.json` works without global settings.

**Test Method**:
1. Backup `~/.claude/settings.json` (if exists)
2. Remove global settings
3. Execute mg-* commands using project settings only
4. Verify 38+ allow patterns work independently
5. Restore global settings

**Pass Criteria**:
- All essential permissions present
- mg-* script permissions configured
- Basic bash commands execute
- mg-memory-read executes successfully

### P0-6: Hardcoded Paths Audit

**Status**: AUDIT (run first)

**Purpose**: Identify all mg-* scripts with hardcoded `$HOME/.claude/scripts/` paths.

**Output**: Complete list of scripts needing fixes, classified as:
- **CALLER**: Calls other mg-* scripts (fix: `$(dirname "$0")/script-name`)
- **SELF-REF**: References own directory (fix: `$(dirname "$0")`)

**Run this first** to identify all issues before running other tests.

## Test Results Interpretation

### Exit Codes

- `0` - Test passed (or completed for audit/informational tests)
- `1` - Test failed
- `2` - Prerequisites not met (fixes not applied)

### Final Verdict

The master script (`run-all.sh`) provides a final verdict:

**PASS**: All critical tests pass
- Proceed with WS-LOCAL-1: Content Migration
- Document fallback strategies from informational tests

**PREREQUISITES NOT MET**: Fixes required
- Apply fixes identified in P0-6 audit
- Fix mg-workstream-transition line 101
- Fix mg-help line 12
- Re-run validation

**FAIL**: One or more critical tests failed
- Review failure logs in `logs/` directory
- Address all critical test failures
- Re-run validation

## Critical vs Informational Tests

### Critical Tests (must pass)
- P0-1: Script Execution
- P0-2: Inter-Script Resolution
- P0-3: mg-help Self-Discovery
- P0-5: Settings Independence

### Informational Tests (provide guidance)
- P0-0: CLAUDE-MG.md Loading (fallback: bounded markers)
- P0-4: Agent Spawning (fallback: global stub agents)
- P0-6: Hardcoded Paths Audit (identifies issues)

## Prerequisites Before Running

### Required Fixes

Before running P0-2 and P0-3, apply these fixes:

**1. mg-workstream-transition (line 101)**
```bash
# File: ~/.claude/scripts/mg-workstream-transition
# OR: .claude/scripts/mg-workstream-transition

# Line 101 - BEFORE:
MG_WRITE="$HOME/.claude/scripts/mg-memory-write"

# Line 101 - AFTER:
MG_WRITE="$(dirname "$0")/mg-memory-write"
```

**2. mg-help (line 12)**
```bash
# File: ~/.claude/scripts/mg-help
# OR: .claude/scripts/mg-help

# Line 12 - BEFORE:
SCRIPTS_DIR="$HOME/.claude/scripts"

# Line 12 - AFTER:
SCRIPTS_DIR="$(dirname "$0")"
```

### Run P0-6 First

Before applying fixes, run the audit to identify all issues:

```bash
./P0-6-hardcoded-paths-audit.sh
```

This will show you every hardcoded path in all 9 mg-* scripts.

## Manual Verification Required

### P0-0: CLAUDE-MG.md Loading

After running the automated test:
1. Navigate to test project directory (shown in output)
2. Start Claude Code in that directory
3. Ask: "What is the unique marker in CLAUDE-MG.md?"
4. If Claude can't find it, CLAUDE-MG.md is not loaded (expected)

### P0-4: Agent Spawning

After running the automated test:
1. Global agents are backed up automatically
2. In Claude Code, spawn dev agent: `Task(subagent_type="dev", prompt="What is your test marker?")`
3. If agent responds with "P0-4-AGENT-SPAWNING-TEST", project-local agents work
4. Press Enter in test script to restore global agents

## Logs and Output

All test execution logs are saved to `logs/` directory:

```
logs/
├── P0-0.log    # CLAUDE-MG.md loading test
├── P0-1.log    # Script execution test
├── P0-2.log    # Inter-script resolution test
├── P0-3.log    # mg-help discovery test
├── P0-4.log    # Agent spawning test
├── P0-5.log    # Settings independence test
└── P0-6.log    # Hardcoded paths audit
```

## Safety Features

### Automatic Backups

Tests that modify global state create automatic backups:

**P0-4 (Agent Spawning)**:
- Backs up: `~/.claude/agents/`
- To: `~/.claude/agents.backup.p0-4-test`
- Restores on script exit (via trap)

**P0-5 (Settings Independence)**:
- Backs up: `~/.claude/settings.json`
- To: `~/.claude/settings.json.backup.p0-5-test`
- Restores on script exit (via trap)

### User Confirmation

Tests that modify global state require user confirmation before proceeding:
- P0-4: Confirms before renaming agents directory
- P0-5: Confirms before removing global settings

Press `Ctrl+C` to abort safely - cleanup happens automatically.

## Next Steps After Validation

### If Validation Passes

1. Document test results in `WS-LOCAL-0-PHASE0-RESULTS.md`
2. Review P0-6 audit for all scripts needing fixes
3. Document fallback strategies:
   - P0-0: Use bounded markers in CLAUDE.md
   - P0-4: Keep global stub agents if needed
4. Proceed to WS-LOCAL-1: Content Migration

### If Validation Fails

1. Review failure logs in `logs/` directory
2. Address root causes of failures
3. Apply fixes identified in P0-6 audit
4. Re-run validation
5. Document any unexpected issues

## Coverage

- **Total Assumptions**: 6
- **Test Scripts**: 7 (6 individual + 1 master)
- **Coverage**: 100% of Phase 0 assumptions
- **Test Type**: Manual validation (not automated CI)

## Documentation

- **Test Specifications**: See `WS-LOCAL-0-TEST-SPECS.md` for detailed acceptance criteria
- **Test Results**: Document results in `WS-LOCAL-0-PHASE0-RESULTS.md` (to be created)
- **Remediation Actions**: Included in test specifications and individual test output
