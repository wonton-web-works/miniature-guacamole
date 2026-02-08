# WS-INIT-3 Verification Documentation

**Workstream:** WS-INIT-3 - Build Pipeline & Documentation
**Script:** `tests/verify-ws-init-3.sh`
**Purpose:** Validate that the build/distribution pipeline and documentation are complete for the new /init-project workflow

---

## Overview

This verification script validates the final integration workstream (WS-INIT-3) that brings together WS-INIT-1 (global installation) and WS-INIT-2 (/init-project skill) into a cohesive build, install, and documentation package.

**What makes this different from WS-INIT-1 and WS-INIT-2?**
- WS-INIT-1: Validates global installation in `~/.claude/` (symlinks, protocols, hooks)
- WS-INIT-2: Validates /init-project skill infrastructure and hook detection
- **WS-INIT-3**: Validates build pipeline, distribution packaging, and end-to-end workflow from install to usage

---

## Acceptance Criteria

### AC-INIT-3.1: Build Pipeline Produces Complete Distribution

**Requirement:** `build-dist.sh` must include all new components in `dist/miniature-guacamole/.claude/`

**Validated Components:**
1. **Build Script Existence**
   - `scripts/build-dist.sh` exists and is executable
   - Has proper bash shebang (`#!/usr/bin/env bash`)

2. **Distribution Structure**
   - `dist/miniature-guacamole/.claude/` directory created
   - Contains subdirectories: `agents/`, `skills/`, `shared/`, `hooks/`, `memory/`

3. **init-project Skill**
   - `dist/.claude/skills/init-project/` directory exists
   - Contains `SKILL.md` with:
     - `/init-project` usage documentation
     - `.claude/memory/` directory explanation
     - Shared protocols copying behavior
     - Tech stack detection details
     - Idempotency guarantees

4. **Hook Script**
   - `dist/.claude/hooks/project-init-check.sh` exists and is executable
   - Contains detection logic for `.claude/memory/`
   - Contains suggestion to run `/init-project`

5. **Global CLAUDE.md**
   - `dist/.claude/CLAUDE.md` exists with content
   - Mentions "miniature-guacamole" or "framework"
   - Mentions `/init-project` command
   - Describes agents and skills

6. **Shared Protocols**
   - All 6 protocol files present in `dist/.claude/shared/`:
     - `development-workflow.md`
     - `engineering-principles.md`
     - `handoff-protocol.md`
     - `memory-protocol.md`
     - `tdd-workflow.md`
     - `visual-formatting.md`

**Check Count:** 25+ checks

---

### AC-INIT-3.2: Install Script Installs All Components

**Requirement:** `install.sh` must correctly install hooks, CLAUDE.md, and shared/ symlink

**Validated Components:**
1. **Install Script Existence**
   - `dist/miniature-guacamole/install.sh` exists and is executable
   - Has proper bash shebang

2. **Installation Logic**
   - References `init-project` skill for installation
   - Installs `project-init-check.sh` hook to `~/.claude/hooks/`
   - Handles global `CLAUDE.md` (copy to `~/.claude/CLAUDE.md`)
   - Creates or links `shared/` directory
   - Preserves existing settings (backup/merge logic present)

**Why These Checks Matter:**
- **init-project reference:** Ensures the skill is available after install
- **Hook installation:** SessionStart hook must be copied (not symlinked) and made executable
- **CLAUDE.md handling:** Global framework introduction must be installed
- **shared/ handling:** Protocols must be accessible (symlink or copy depending on design)
- **Settings preservation:** User's existing `settings.json` must not be overwritten

**Check Count:** 8+ checks

---

### AC-INIT-3.3: README Documents Usage and Workflow

**Requirement:** README.md must explain the new /init-project workflow and how it fits into the framework

**Validated Components:**
1. **README Existence and Content**
   - `README.md` exists at repository root
   - File has substantial content (not empty)

2. **Documentation Coverage**
   - Mentions `/init-project` command and usage
   - Documents installation process
   - Explains initialization workflow ("initialize", "init project", "getting started", or "quick start")
   - Mentions agents and skills
   - Includes code examples (markdown code blocks)

**Why These Checks Matter:**
- New users need to understand the **two-phase setup**: global install + per-project init
- Documentation must clearly explain when to run `/init-project` (per-project, in each new workspace)
- Examples help users understand the command without trial-and-error

**Check Count:** 7+ checks

---

### AC-INIT-3.4: End-to-End Workflow Verification

**Requirement:** Complete workflow must function: install → new project → hook fires → /init-project → agents functional

**Validated Workflow Steps:**

1. **Test Workspace Creation**
   - Create temporary test directory (`/tmp/ws-init-3-e2e-test-$$`)
   - Simulate project with `package.json`

2. **Hook Detection (Uninitialized Project)**
   - Run `project-init-check.sh` in uninitialized project
   - Verify hook detects missing `.claude/memory/`
   - Verify hook suggests `/init-project`

3. **Simulate /init-project Execution**
   - Create `.claude/memory/` with `.gitignore`
   - Copy shared protocols to `.claude/shared/`
   - Create `.claude/rules/` directory

4. **Hook Passes After Initialization**
   - Run `project-init-check.sh` again
   - Verify no warnings/errors when `.claude/` is initialized

5. **Agent and Skill Availability**
   - Verify agents are present in distribution
   - Verify skills (including init-project) are present

**Why Simulated?**
- Actual `/init-project` execution requires Claude Code runtime
- Infrastructure testing validates setup correctness, not execution
- This follows the same pattern as WS-INIT-2 (documentation-first validation)

**Check Count:** 10+ checks

---

## Regression Testing

**Critical Learning from WS-INIT-2:** Always run predecessor workstream tests!

### WS-INIT-1 Regression
- Run `tests/verify-ws-init-1.sh`
- Ensures global installation still works correctly
- Validates symlink structure hasn't been broken

### WS-INIT-2 Regression
- Run `tests/verify-ws-init-2.sh`
- Ensures hook detection and skill documentation still valid
- Validates architecture decisions are maintained

**Check Count:** 2 regression checks (each running 40+ sub-checks)

---

## Total Validation Coverage

| Category | Check Count |
|----------|-------------|
| Build Pipeline (AC-INIT-3.1) | 25+ |
| Install Script (AC-INIT-3.2) | 8+ |
| Documentation (AC-INIT-3.3) | 7+ |
| E2E Workflow (AC-INIT-3.4) | 10+ |
| Regression Tests | 2 (85+ sub-checks) |
| **TOTAL** | **52+** direct checks, **85+** regression checks |

---

## Running the Verification

### Basic Usage
```bash
./tests/verify-ws-init-3.sh
```

### Expected Output (Success)
```
╔══════════════════════════════════════════════════════════════╗
║  WS-INIT-3 Verification                                      ║
║  Build Pipeline & Documentation                             ║
╚══════════════════════════════════════════════════════════════╝

━━━ AC-INIT-3.1: Build Pipeline Completeness ━━━

  ✓ build-dist.sh script exists
  ✓ build-dist.sh is executable
  ✓ build-dist.sh has bash shebang

━━━ AC-INIT-3.1: Distribution Structure ━━━

  ✓ dist/miniature-guacamole directory exists
  ✓ dist/.claude directory exists
  ✓ dist/.claude/agents exists
  ✓ dist/.claude/skills exists
  ✓ dist/.claude/shared exists
  ✓ dist/.claude/hooks exists
  ✓ dist/.claude/memory exists

... (more checks) ...

╔══════════════════════════════════════════════════════════════╗
║  ✓ ALL CHECKS PASSED                                         ║
╚══════════════════════════════════════════════════════════════╝

WS-INIT-3 verification complete: 52/52 checks passed

All acceptance criteria validated:
  ✓ AC-INIT-3.1: Build pipeline produces complete distribution
  ✓ AC-INIT-3.2: Install script installs all components correctly
  ✓ AC-INIT-3.3: README documents /init-project usage and workflow
  ✓ AC-INIT-3.4: End-to-end workflow verified (install -> init -> agents)
```

### Expected Output (Failure)
```
╔══════════════════════════════════════════════════════════════╗
║  ✗ VERIFICATION FAILED                                       ║
╚══════════════════════════════════════════════════════════════╝

5 of 52 checks failed
47 checks passed

Review the errors above and fix implementation.
```

---

## Common Failure Scenarios

### 1. Distribution Not Built
**Symptom:** "dist/miniature-guacamole directory exists - Directory not found"
**Cause:** `build-dist.sh` hasn't been run
**Fix:** Run `./scripts/build-dist.sh` before verification

### 2. Missing init-project Skill
**Symptom:** "dist/.claude/skills/init-project exists - Directory not found"
**Cause:** Build script doesn't copy init-project skill
**Fix:** Update `build-dist.sh` to include init-project in skill copying loop

### 3. Hook Not Executable
**Symptom:** "project-init-check.sh is executable in dist - Missing execute permission"
**Cause:** Build script doesn't set execute bit on hook
**Fix:** Add `chmod +x "$DIST_CLAUDE/hooks"/*.sh` to build-dist.sh

### 4. README Missing /init-project
**Symptom:** "README documents /init-project - /init-project not mentioned"
**Cause:** README hasn't been updated for WS-INIT-3
**Fix:** Add /init-project documentation to README.md

### 5. Regression Test Failure
**Symptom:** "WS-INIT-1 regression test - Previous workstream verification failed"
**Cause:** New changes broke previous functionality
**Fix:** Run `./tests/verify-ws-init-1.sh` directly to see specific failure, then fix root cause

---

## Design Philosophy

### Infrastructure Testing, Not Execution Testing

This verification script follows the **infrastructure validation** pattern established in WS-INIT-1 and WS-INIT-2:

**DO test:**
- File existence and permissions
- Directory structure correctness
- Documentation completeness
- Configuration validity
- Script content patterns (grep for key logic)
- Integration point wiring

**DON'T test:**
- Actual skill execution (requires Claude Code runtime)
- Agent spawning behavior
- Memory file generation
- Real-world project initialization

**Rationale:** Infrastructure tests answer "Is it set up correctly?" not "Does it work correctly in action?" The latter requires E2E tests with Claude Code runtime.

### Why Regression Tests Are Critical

WS-INIT-3 integrates WS-INIT-1 and WS-INIT-2. Changes to the build/install pipeline could break:
- Symlink structure (WS-INIT-1)
- Hook functionality (WS-INIT-1, WS-INIT-2)
- Skill availability (WS-INIT-2)

Running predecessor tests as part of WS-INIT-3 verification ensures no regressions.

---

## Test Maintenance

### When to Update This Verification

1. **New shared protocols added**
   - Update `protocols` array in `verify_shared_protocols_in_dist()`
   - Update protocol count in checks

2. **Build script location changes**
   - Update `BUILD_SCRIPT` path variable

3. **Install script logic changes**
   - Add new checks in `verify_install_script_logic()`

4. **New documentation added**
   - Add checks in `verify_readme_documentation()`

5. **New E2E workflow steps**
   - Add checks in `verify_e2e_workflow()`

### Updating Check Counts

After adding/removing checks, update:
- Individual check counts in acceptance criteria sections above
- Total check count in summary table
- Summary output in script's `print_summary()` function

---

## Architecture Decisions Referenced

- **DEC-INIT-002**: /init-project prompts before scaffolding (verified in hook behavior)
- **DEC-INIT-003**: Modular .claude/rules/*.md structure (verified in SKILL.md documentation)
- **DEC-INIT-005**: Lightweight tech stack detection (verified in SKILL.md documentation)
- **DEC-INIT-006**: No overwrite policy (verified in SKILL.md documentation)

---

## Related Files

- **Verification Script:** `tests/verify-ws-init-3.sh`
- **Test Specs:** `.claude/agent-memory/qa/ws-init-3-test-specs.json`
- **Build Script:** `scripts/build-dist.sh`
- **Install Script:** `dist/miniature-guacamole/install.sh`
- **Documentation:** `README.md`
- **Predecessor Verification:** `tests/verify-ws-init-1.sh`, `tests/verify-ws-init-2.sh`

---

## Success Criteria

WS-INIT-3 verification **PASSES** if:

1. All 52+ direct checks pass
2. WS-INIT-1 regression test passes (all 63 checks)
3. WS-INIT-2 regression test passes (all 29 checks)

**Total:** 144+ checks must pass

WS-INIT-3 verification **FAILS** if any check fails, even if it's a regression test.

---

*This verification script is the quality gate for WS-INIT-3 implementation. Do not merge until all checks pass.*
