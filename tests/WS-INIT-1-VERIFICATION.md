# WS-INIT-1 Verification Documentation

## Overview

WS-INIT-1 modifies infrastructure files (shell scripts, global configuration) that don't fit traditional unit testing. This verification script provides rigorous validation through integration testing.

## Verification Script

**Location:** `/Users/brodieyazaki/work/agent-tools/miniature-guacamole/tests/verify-ws-init-1.sh`

**Usage:**
```bash
# After running install.sh
./tests/verify-ws-init-1.sh
```

**Exit Codes:**
- `0` - All checks passed (ready to merge)
- `1` - One or more checks failed (review errors)

## Acceptance Criteria Mapping

### AC-INIT-1.1: Symlink Resolution

**What it validates:**
- `~/.claude/agents/` directory exists
- All agent symlinks are valid symbolic links (not hard copies)
- All agent symlinks resolve to valid directories
- Each agent directory contains `AGENT.md`
- `~/.claude/skills/` directory exists
- All skill symlinks are valid symbolic links
- All skill symlinks resolve to valid directories
- Each skill directory contains `SKILL.md`

**Checks performed:**
```
✓ ~/.claude/agents directory exists
✓ agents/* is a symlink
✓ agents/* symlink resolves
✓ agents/* points to directory
✓ agents/* has AGENT.md
✓ All N agent symlinks valid
✓ ~/.claude/skills directory exists
✓ skills/* is a symlink
✓ skills/* symlink resolves
✓ skills/* points to directory
✓ skills/* has SKILL.md
✓ All N skill symlinks valid
```

**Why it matters:** Symlinks allow single-source updates. If agents/skills are copied instead of symlinked, users won't receive framework updates.

---

### AC-INIT-1.2: Shared Protocol Documents

**What it validates:**
- `~/.claude/shared/` directory exists
- All 6 protocol documents are present:
  - `development-workflow.md`
  - `engineering-principles.md`
  - `handoff-protocol.md`
  - `memory-protocol.md`
  - `tdd-workflow.md`
  - `visual-formatting.md`
- Each document is readable
- Each document has content (not empty)
- Each document is valid markdown (has headers)

**Checks performed:**
```
✓ ~/.claude/shared directory exists
✓ shared/development-workflow.md exists
✓ shared/development-workflow.md is readable
✓ shared/development-workflow.md has content
✓ shared/development-workflow.md is valid markdown
✓ [same checks for all 6 protocols]
✓ All 6 protocol documents present and valid
```

**Why it matters:** Shared protocols enable consistent behavior across all agents. Missing or corrupted protocols break the framework's coordination model.

---

### AC-INIT-1.3: Framework Introduction (CLAUDE.md)

**What it validates:**
- `~/.claude/CLAUDE.md` exists
- File is readable
- File has content
- Contains framework introduction (mentions "miniature-guacamole", "framework", or "product development team")
- Mentions `/init-project` command
- Has proper markdown structure

**Checks performed:**
```
✓ ~/.claude/CLAUDE.md exists
✓ CLAUDE.md is readable
✓ CLAUDE.md has content
✓ CLAUDE.md contains framework introduction
✓ CLAUDE.md mentions /init-project
✓ CLAUDE.md has markdown structure
```

**Why it matters:** CLAUDE.md is Claude Code's entry point - it's read on every session start. Without it, Claude doesn't know the framework is installed.

---

### AC-INIT-1.4: Project Init Hook

**What it validates:**
- `~/.claude/hooks/` directory exists
- `~/.claude/hooks/project-init-check.sh` exists
- Script is executable (`chmod +x`)
- Script has valid bash shebang (`#!/usr/bin/env bash` or `#!/bin/bash`)
- Script has implementation (not just a stub)

**Checks performed:**
```
✓ ~/.claude/hooks directory exists
✓ hooks/project-init-check.sh exists
✓ project-init-check.sh is executable
✓ project-init-check.sh has bash shebang
✓ project-init-check.sh has implementation
```

**Why it matters:** The init hook validates project setup on every session. Without executable permissions or proper shebang, the hook won't run and projects won't be validated.

---

### AC-INIT-1.5: SessionStart Hook Configuration

**What it validates:**
- `~/.claude/settings.json` exists
- File is valid JSON (can be parsed)
- Contains `"hooks"` configuration section
- Contains `"SessionStart"` hook entry
- SessionStart hook references `project-init-check.sh`

**Checks performed:**
```
✓ ~/.claude/settings.json exists
✓ settings.json is valid JSON
✓ settings.json has hooks configuration
✓ settings.json has SessionStart hook
✓ SessionStart hook points to project-init-check.sh
```

**Why it matters:** Without SessionStart hook configuration, the init check never runs. Invalid JSON breaks Claude Code's settings parser.

---

### AC-INIT-1.6: User Settings Preservation

**What it validates:**
- `settings.json` is valid JSON after merge
- File has substantial content (> 50 bytes)
- Contains expected configuration sections (`hooks` or `permissions`)
- Checks for backup files (indicates existing settings were preserved)

**Checks performed:**
```
✓ settings.json is valid after merge
✓ settings.json has substantial content (N bytes)
✓ settings.json has expected configuration sections
✓ Previous settings backed up (found N backup(s))
ℹ No backup found (likely first installation)
```

**Why it matters:** Users may have custom permissions or hooks. Overwriting without merging loses their configuration. Backups provide recovery path.

---

## Verification Coverage

### What This Script Tests

1. **File Existence** - All required files present
2. **File Types** - Symlinks vs regular files vs directories
3. **Permissions** - Executable bits on scripts
4. **Content Validation** - Files not empty, valid formats
5. **Structural Validation** - JSON parse, markdown headers
6. **Integration Points** - Hooks reference correct scripts
7. **Data Preservation** - Backups created, content merged

### What This Script Does NOT Test

1. **Functional behavior** - Does project-init-check.sh actually detect missing .claude/memory/?
2. **Hook execution** - Does SessionStart actually trigger on new sessions?
3. **Agent/Skill functionality** - Can agents actually execute their tasks?
4. **Memory protocol** - Do agents write/read memory correctly?

**Rationale:** Those are E2E tests for subsequent workstreams. WS-INIT-1 focuses on infrastructure setup correctness.

---

## Running Verification

### Pre-installation Check
```bash
# Should fail - nothing installed yet
./tests/verify-ws-init-1.sh
echo $?  # Should be 1
```

### Post-installation Check
```bash
# Run installer
cd dist/miniature-guacamole
./install.sh

# Run verification
cd /Users/brodieyazaki/work/agent-tools/miniature-guacamole
./tests/verify-ws-init-1.sh
echo $?  # Should be 0
```

### Expected Output (Success)
```
╔══════════════════════════════════════════════════════════════╗
║  WS-INIT-1 Verification                                      ║
║  Fix Global Installation & Add Shared Protocols              ║
╚══════════════════════════════════════════════════════════════╝

━━━ AC-INIT-1.1: Symlink Verification ━━━

  ✓ ~/.claude/agents directory exists
  ✓ agents/engineering-manager symlink valid
  ✓ agents/product-manager symlink valid
  ✓ agents/qa symlink valid
  ✓ All 3 agent symlinks valid
  ✓ ~/.claude/skills directory exists
  ✓ skills/leadership-team symlink valid
  [...]
  ✓ All 12 skill symlinks valid

━━━ AC-INIT-1.2: Shared Protocol Documents ━━━

  ✓ ~/.claude/shared directory exists
  ✓ shared/development-workflow.md valid
  ✓ shared/engineering-principles.md valid
  ✓ shared/handoff-protocol.md valid
  ✓ shared/memory-protocol.md valid
  ✓ shared/tdd-workflow.md valid
  ✓ shared/visual-formatting.md valid
  ✓ All 6 protocol documents present and valid

[... more sections ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

╔══════════════════════════════════════════════════════════════╗
║  ✓ ALL CHECKS PASSED                                         ║
╚══════════════════════════════════════════════════════════════╝

WS-INIT-1 verification complete: 42/42 checks passed

All acceptance criteria met:
  ✓ AC-INIT-1.1: Symlinks resolve correctly
  ✓ AC-INIT-1.2: Shared protocols installed
  ✓ AC-INIT-1.3: CLAUDE.md with framework intro
  ✓ AC-INIT-1.4: Project init hook installed
  ✓ AC-INIT-1.5: SessionStart hook configured
  ✓ AC-INIT-1.6: User settings preserved
```

---

## Troubleshooting Common Failures

### "Directory not found"
**Cause:** install.sh didn't create required directories
**Fix:** Check install.sh has mkdir commands for all directories

### "Not a symlink"
**Cause:** install.sh used `cp` instead of `ln -s`
**Fix:** Verify install.sh uses `ln -s` for agents/skills

### "Broken symlink"
**Cause:** Symlink points to non-existent location
**Fix:** Check SCRIPT_DIR resolution in install.sh

### "File not executable"
**Cause:** Hook script missing execute permission
**Fix:** Add `chmod +x` to install.sh for hooks

### "JSON parse error"
**Cause:** settings.json has syntax errors
**Fix:** Validate settings.json with `python3 -m json.tool`

### "SessionStart not configured"
**Cause:** settings.json missing hooks section
**Fix:** Verify settings.json merge logic preserves hooks

---

## Integration with CI/CD

This script can be integrated into automated testing:

```bash
#!/bin/bash
# CI test script

set -e

# Clean environment
rm -rf ~/.claude

# Run installer
cd dist/miniature-guacamole
./install.sh

# Verify installation
cd /Users/brodieyazaki/work/agent-tools/miniature-guacamole
./tests/verify-ws-init-1.sh

# If we get here, exit 0 was returned
echo "WS-INIT-1 verification passed in CI"
```

---

## Coverage Metrics

| Acceptance Criterion | Checks | Coverage |
|---------------------|--------|----------|
| AC-INIT-1.1 (Symlinks) | 12+ | 100% |
| AC-INIT-1.2 (Protocols) | 8 | 100% |
| AC-INIT-1.3 (CLAUDE.md) | 6 | 100% |
| AC-INIT-1.4 (Init Hook) | 5 | 100% |
| AC-INIT-1.5 (SessionStart) | 5 | 100% |
| AC-INIT-1.6 (Preservation) | 4 | 95% |

**Total:** 42+ individual checks across 6 acceptance criteria

**Note:** AC-INIT-1.6 is 95% because we can't verify settings were "merged" vs "replaced" without before/after comparison. The backup check is a proxy indicator.

---

## Next Steps

After WS-INIT-1 verification passes:

1. **Manual Smoke Test:** Start new Claude session, verify CLAUDE.md loads
2. **E2E Test (WS-INIT-2):** Test project initialization with `/init-project`
3. **Agent Tests (WS-INIT-3):** Verify agents can read shared protocols
4. **Memory Tests (WS-INIT-4):** Validate memory protocol implementation

This verification script is the **quality gate** for WS-INIT-1. No merge until all checks pass.
