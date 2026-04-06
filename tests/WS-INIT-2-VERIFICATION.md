# WS-INIT-2 Verification Documentation

## Overview

WS-INIT-2 extends the initialization infrastructure by adding the `/init-project` skill and enhancing the SessionStart hook from WS-INIT-1. This workstream focuses on project scaffolding, tech stack detection, and ensuring proper memory isolation.

## Verification Script

**Location:** `/Users/brodieyazaki/work/agent-tools/miniature-guacamole/tests/verify-ws-init-2.sh`

**Usage:**
```bash
# After implementing WS-INIT-2
./tests/verify-ws-init-2.sh
```

**Exit Codes:**
- `0` - All checks passed (ready to merge)
- `1` - One or more checks failed (review errors)

## Architecture Decisions Reference

- **DEC-INIT-002**: `/init-project` prompts user, does NOT auto-run scaffolding
- **DEC-INIT-003**: Use `.claude/rules/*.md` (modular) not monolithic `CLAUDE.md`
- **DEC-INIT-005**: Lightweight tech-stack detection (detect what exists, don't prescribe)
- **DEC-INIT-006**: Never overwrite existing `.claude/` content

## Acceptance Criteria Mapping

### AC-INIT-2.1: SessionStart Hook Detects Uninitialized Projects

**What it validates:**
- Hook detects missing `.claude/memory/` directory
- Hook detects missing `.claude/shared/` directory (optional check)
- Hook passes (exits silently) when both directories exist
- Hook skips non-project directories (no `.git`, `package.json`, etc.)

**Checks performed:**
```
✓ project-init-check.sh exists
✓ Hook detects missing .claude/memory/
✓ Hook detects missing .claude/shared/ (optional)
✓ Hook passes when .claude/ directories exist
✓ Hook skips non-project directories
```

**Test methodology:**
- Create test directory with `package.json` but no `.claude/memory/`
- Run hook script, verify warning output mentions "memory"
- Create test directory with both directories, verify no warnings
- Create empty directory (no project markers), verify silent exit

**Why it matters:**
The hook is the first line of defense - it must reliably detect when a project needs initialization without false positives in non-project directories.

---

### AC-INIT-2.2: Hook Suggests /init-project (Does NOT Auto-Scaffold)

**What it validates:**
- Hook output mentions `/init-project` command
- Hook script contains NO `mkdir` or `touch` commands (detection only, per DEC-INIT-002)
- Hook output is user-friendly with clear formatting

**Checks performed:**
```
✓ Hook suggests /init-project command
✓ Hook does NOT auto-scaffold (DEC-INIT-002)
✓ Hook output has clear formatting
```

**Test methodology:**
- Run hook in uninitialized project, capture output
- Search output for `/init-project` string
- Grep hook script for `mkdir.*\.claude` or `touch.*\.claude` (should NOT exist)
- Verify output uses formatting characters (box drawing, colors)

**Why it matters:**
Per DEC-INIT-002, the framework must NOT auto-scaffold without user consent. The hook provides information and suggestions, but the user must explicitly run `/init-project`.

---

### AC-INIT-2.3: /init-project Creates .claude/memory/ with .gitignore

**What it validates:**
- `~/.claude/skills/init-project/` directory exists
- `SKILL.md` exists and has content
- Skill documentation mentions `.claude/memory/` creation
- Skill documentation mentions `.gitignore` for memory files

**Checks performed:**
```
✓ ~/.claude/skills/init-project exists
✓ init-project/SKILL.md exists
✓ SKILL.md has content
✓ SKILL.md describes initialization
✓ Skill documentation mentions .claude/memory/ creation
✓ Skill documentation mentions .gitignore
```

**Expected .gitignore content:**
```gitignore
# Ignore all memory files (agent task queues, state, etc.)
*.json

# Keep .gitignore itself
!.gitignore
```

**Test methodology:**
- Verify skill directory and SKILL.md exist
- Grep SKILL.md for keywords: `.claude/memory`, `.gitignore`
- For E2E testing (separate): Execute skill, verify `.claude/memory/.gitignore` created with correct content

**Why it matters:**
Memory files contain project-specific agent state and should NEVER be committed to shared repositories. The `.gitignore` prevents accidental commits that could leak cross-project data.

---

### AC-INIT-2.4: /init-project Copies Shared Protocols to .claude/shared/

**What it validates:**
- Global shared protocols exist in `~/.claude/shared/` (WS-INIT-1 dependency)
- Skill documentation mentions copying protocols to project `.claude/shared/`
- Protocols are COPIED, not symlinked (project-local per DEC-INIT-004)

**Checks performed:**
```
✓ ~/.claude/shared/ exists (prerequisite)
✓ All 6 shared protocols available for copying
✓ Skill documentation mentions shared protocols
```

**Expected protocols to copy:**
1. `development-workflow.md`
2. `engineering-principles.md`
3. `handoff-protocol.md`
4. `memory-protocol.md`
5. `tdd-workflow.md`

**Test methodology:**
- Verify all 5 protocols exist in `~/.claude/shared/`
- Grep SKILL.md for "shared.*protocol" or "protocol.*shared"
- For E2E testing (separate): Execute skill, verify files copied to project `.claude/shared/`, verify they're regular files (not symlinks), compare checksums

**Why it matters:**
Projects may customize protocols. Copying (vs symlinking) allows project-specific overrides without affecting the global framework or other projects.

---

### AC-INIT-2.5: /init-project Detects Tech Stack

**What it validates:**
- Skill mentions detection of Node.js/TypeScript (`package.json`, `tsconfig.json`)
- Skill mentions detection of Rust (`Cargo.toml`)
- Skill mentions detection of Python (`pyproject.toml`, `requirements.txt`)
- Skill mentions detection of Go (`go.mod`)
- Detection is lightweight (per DEC-INIT-005) - identifies, doesn't prescribe

**Checks performed:**
```
✓ Skill mentions Node.js/TypeScript detection
✓ Skill mentions Rust detection
✓ Skill mentions Python detection
✓ Skill mentions Go detection
✓ Tech stack detection is lightweight (DEC-INIT-005)
```

**Tech stack markers:**

| Language/Framework | Detection Files |
|--------------------|-----------------|
| Node.js/TypeScript | `package.json`, `tsconfig.json` |
| Rust | `Cargo.toml` |
| Python | `pyproject.toml`, `requirements.txt`, `setup.py` |
| Go | `go.mod` |
| Java | `pom.xml`, `build.gradle` |

**Test methodology:**
- Grep SKILL.md for tech stack keywords
- Verify skill mentions "detect", "scan", "identify" (not "install", "configure", "prescribe")
- For E2E testing (separate): Create test projects with different markers, verify detection in `.claude/rules/tech-stack.md`

**Why it matters:**
Per DEC-INIT-005, the framework should detect what exists, not impose structure. This allows `/init-project` to work with any project structure without being opinionated about tooling.

---

### AC-INIT-2.6: /init-project Generates .claude/rules/*.md

**What it validates:**
- Skill uses modular `.claude/rules/*.md` structure (per DEC-INIT-003)
- Skill does NOT use monolithic `.claude/CLAUDE.md`
- Skill mentions generating project context files

**Checks performed:**
```
✓ Skill mentions modular .claude/rules/*.md (DEC-INIT-003)
✓ Skill avoids monolithic CLAUDE.md (DEC-INIT-003)
```

**Expected rules structure:**
```
.claude/rules/
├── README.md               # Explains rules structure
├── project-context.md      # Project overview, purpose
├── tech-stack.md           # Detected languages/frameworks
├── architecture.md         # (optional) Architecture notes
└── conventions.md          # (optional) Project conventions
```

**Test methodology:**
- Grep SKILL.md for `.claude/rules/*.md`, `modular.*rules`
- Verify SKILL.md does NOT recommend `.claude/CLAUDE.md` (or marks it as deprecated)
- For E2E testing (separate): Execute skill, verify multiple `.md` files created in `.claude/rules/`

**Rationale (DEC-INIT-003):**
Monolithic `CLAUDE.md` becomes unwieldy in large projects. Modular rules allow agents to load only relevant context (e.g., QA loads `tech-stack.md` and `testing.md`, not entire project history).

---

### AC-INIT-2.7: /init-project Does NOT Overwrite Existing Content

**What it validates:**
- Skill documentation mentions preserving existing content (per DEC-INIT-006)
- Skill uses conditional creation (`mkdir -p` or existence checks)
- Skill is idempotent (can run multiple times safely)

**Checks performed:**
```
✓ Skill mentions preserving existing content (DEC-INIT-006)
✓ Skill mentions conditional creation (mkdir -p or existence checks)
```

**No-overwrite scenarios:**

| Scenario | Expected Behavior |
|----------|-------------------|
| `.claude/memory/` exists | Skip creation, preserve existing files |
| `.claude/shared/custom.md` exists | Preserve custom file, add standard protocols |
| `.claude/rules/custom-rule.md` exists | Preserve custom rule, add generated rules |
| Modified protocol file | Do NOT overwrite user changes |

**Test methodology:**
- Grep SKILL.md for "preserve", "not.*overwrite", "keep.*existing", "idempotent"
- Verify conditional language ("if exists", "check before")
- For E2E testing (separate):
  - Create `.claude/memory/test.json`
  - Run skill
  - Verify `test.json` still exists and unchanged

**Why it matters (DEC-INIT-006):**
Users may have partially initialized projects or customized protocols. Running `/init-project` again should be safe and fill in missing pieces without destroying work.

---

### AC-INIT-2.8: Memory Remains Project-Local (No Cross-Project Leakage)

**What it validates:**
- Skill creates `.claude/` in current directory (not `~/.claude/`)
- Skill uses project-relative paths (no absolute paths to other projects)
- `.gitignore` properly excludes memory files from version control
- Each project has isolated memory

**Checks performed:**
```
✓ Skill creates .claude/ in current/project directory
✓ Skill mentions .gitignore for memory isolation
✓ Skill uses project-relative paths (no absolute paths to other projects)
```

**Isolation requirements:**

| Requirement | Validation |
|-------------|------------|
| Memory in project root | `.claude/memory/` created in `$(pwd)/.claude/`, not `~/.claude/` |
| No absolute paths | Generated files use relative paths (`.claude/`, `./src/`) |
| Git ignored | `.claude/memory/.gitignore` prevents commits |
| Independent instances | Two projects can both run `/init-project` with isolated memory |

**Test methodology:**
- Grep SKILL.md for "current.*directory", "project.*directory", `\./\.claude`
- Verify no references to `/home/`, `/Users/`, `~/` (except for global protocol source)
- Check for `.gitignore` mention to prevent memory commits
- For E2E testing (separate):
  - Create two test projects: `/tmp/project-a`, `/tmp/project-b`
  - Run skill in both
  - Verify separate `.claude/memory/` directories, no shared state

**Why it matters:**
This is the core NDA-safe design. Memory must NEVER leak between projects or clients. Each project's `.claude/memory/` is completely isolated.

---

## Verification Coverage

### What This Script Tests

1. **Infrastructure Setup**
   - SessionStart hook exists and detects missing directories
   - /init-project skill exists with proper documentation

2. **Documentation Validation**
   - SKILL.md mentions all required features
   - Architecture decisions are followed (DEC-INIT-002/003/005/006)
   - No-overwrite policy is documented

3. **Integration Points**
   - Hook suggests `/init-project` (doesn't auto-run)
   - Shared protocols from WS-INIT-1 are available

4. **Policy Compliance**
   - No auto-scaffolding in hook
   - Modular rules structure (not monolithic)
   - Lightweight detection (not prescriptive)
   - Preservation of existing content

### What This Script Does NOT Test

1. **Functional Execution** (requires Claude Code runtime)
   - Actually running `/init-project` and creating files
   - Actual tech stack detection logic
   - File content generation (`.gitignore`, `tech-stack.md`)
   - Checksums of copied protocols

2. **E2E User Flows** (separate test suite)
   - User starts Claude in new project → sees warning → runs `/init-project` → success
   - Running `/init-project` twice (idempotency)
   - Customizing protocols and re-running skill

3. **Agent Behavior** (agent-specific tests)
   - Agents reading generated rules
   - Memory protocol usage
   - Cross-agent coordination

**Rationale:**
Like WS-INIT-1, this verification validates infrastructure setup and documentation correctness. E2E testing requires the Claude Code execution environment and would be part of integration test suites.

---

## Running Verification

### Prerequisites

```bash
# WS-INIT-1 must be complete
./tests/verify-ws-init-1.sh
# Should pass before running WS-INIT-2 verification
```

### Post-Implementation Check

```bash
# After implementing /init-project skill
./tests/verify-ws-init-2.sh
echo $?  # Should be 0
```

### Expected Output (Success)

```
╔══════════════════════════════════════════════════════════════╗
║  WS-INIT-2 Verification                                      ║
║  /init-project Skill & SessionStart Hook Enhancement        ║
╚══════════════════════════════════════════════════════════════╝

━━━ Test Workspace Setup ━━━

  ✓ Created test workspace: /tmp/ws-init-2-test-12345

━━━ Prerequisite: Shared Protocols from WS-INIT-1 ━━━

  ✓ ~/.claude/shared/ exists
  ✓ All 6 shared protocols available for copying

━━━ AC-INIT-2.1: SessionStart Hook Detection ━━━

  ✓ project-init-check.sh exists
  ✓ Hook detects missing .claude/memory/
  ℹ Hook may only check .claude/memory/ (acceptable)
  ✓ Hook passes when .claude/ directories exist
  ✓ Hook skips non-project directories

━━━ AC-INIT-2.2: Hook /init-project Suggestion ━━━

  ✓ Hook suggests /init-project command
  ✓ Hook does NOT auto-scaffold (DEC-INIT-002)
  ✓ Hook output has clear formatting

━━━ AC-INIT-2.3: /init-project Skill Existence ━━━

  ✓ ~/.claude/skills/init-project exists
  ✓ init-project/SKILL.md exists
  ✓ SKILL.md has content
  ✓ SKILL.md describes initialization

[... more sections ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

╔══════════════════════════════════════════════════════════════╗
║  ✓ ALL CHECKS PASSED                                         ║
╚══════════════════════════════════════════════════════════════╝

WS-INIT-2 verification complete: 35/35 checks passed

All acceptance criteria validated:
  ✓ AC-INIT-2.1: SessionStart hook detects uninitialized projects
  ✓ AC-INIT-2.2: Hook suggests /init-project (no auto-scaffold)
  ✓ AC-INIT-2.3: /init-project skill exists
  ✓ AC-INIT-2.4: Skill documentation mentions protocols
  ✓ AC-INIT-2.5: Tech stack detection mentioned
  ✓ AC-INIT-2.6: Modular .claude/rules/ structure
  ✓ AC-INIT-2.7: No-overwrite policy documented
  ✓ AC-INIT-2.8: Project-local memory isolation

Note: This verification validates infrastructure and documentation.
      E2E testing (actual skill execution) requires Claude Code runtime.
```

---

## Troubleshooting Common Failures

### "Hook does NOT auto-scaffold" fails
**Cause:** Hook script contains `mkdir` or `touch` commands for `.claude/` directories
**Fix:** Remove scaffolding logic from hook - it should only detect and warn
**Reference:** DEC-INIT-002 (user must explicitly run `/init-project`)

### "Skill mentions modular rules" fails
**Cause:** SKILL.md recommends creating `.claude/CLAUDE.md` instead of `.claude/rules/*.md`
**Fix:** Update documentation to use modular rules structure
**Reference:** DEC-INIT-003

### "Skill mentions Node.js/TypeScript detection" fails
**Cause:** SKILL.md doesn't document tech stack detection
**Fix:** Add section describing detection of `package.json`, `tsconfig.json`, etc.
**Reference:** AC-INIT-2.5, DEC-INIT-005

### "Skill preserves existing content" fails
**Cause:** SKILL.md doesn't mention no-overwrite policy
**Fix:** Add section on idempotency and preservation of existing files
**Reference:** DEC-INIT-006

### "All 6 shared protocols available" fails
**Cause:** WS-INIT-1 not complete or protocols missing from `~/.claude/shared/`
**Fix:** Run WS-INIT-1 verification and implementation first

---

## Test Environments for E2E (Future Work)

When implementing E2E tests for actual skill execution, test these scenarios:

### Environment 1: Node.js/TypeScript Project
```bash
mkdir test-nodejs
cd test-nodejs
npm init -y
echo '{}' > tsconfig.json
# Run /init-project
# Verify .claude/rules/tech-stack.md mentions "Node.js" and "TypeScript"
```

### Environment 2: Rust Project
```bash
mkdir test-rust
cd test-rust
cargo init
# Run /init-project
# Verify .claude/rules/tech-stack.md mentions "Rust"
```

### Environment 3: Multi-Language Project
```bash
mkdir test-multi
cd test-multi
npm init -y
cargo init
# Run /init-project
# Verify both Node.js and Rust detected
```

### Environment 4: Partially Initialized Project
```bash
mkdir test-partial
cd test-partial
npm init -y
mkdir -p .claude/memory
echo '{"task": "test"}' > .claude/memory/tasks-dev.json
# Run /init-project
# Verify tasks-dev.json preserved
# Verify .claude/shared/ and .claude/rules/ created
```

### Environment 5: Fully Initialized Project (Idempotency)
```bash
mkdir test-full
cd test-full
npm init -y
# Run /init-project (first time)
# Modify .claude/shared/memory-protocol.md
# Run /init-project (second time)
# Verify modifications preserved
# Verify no duplicate files created
```

### Environment 6: Custom Rules Project
```bash
mkdir test-custom
cd test-custom
npm init -y
mkdir -p .claude/rules
echo '# Custom Rule' > .claude/rules/custom-conventions.md
# Run /init-project
# Verify custom-conventions.md preserved
# Verify standard rules (project-context.md, tech-stack.md) added
```

---

## Coverage Metrics

| Acceptance Criterion | Infrastructure Checks | E2E Checks (Future) | Total |
|---------------------|----------------------|---------------------|-------|
| AC-INIT-2.1 (Detection) | 5 | 4 | 9 |
| AC-INIT-2.2 (Suggestion) | 3 | 1 | 4 |
| AC-INIT-2.3 (Memory/.gitignore) | 6 | 3 | 9 |
| AC-INIT-2.4 (Protocols) | 3 | 4 | 7 |
| AC-INIT-2.5 (Tech Stack) | 6 | 6 | 12 |
| AC-INIT-2.6 (Rules) | 2 | 3 | 5 |
| AC-INIT-2.7 (No Overwrite) | 2 | 4 | 6 |
| AC-INIT-2.8 (Isolation) | 3 | 4 | 7 |

**Current Script Total:** ~35 infrastructure/documentation checks
**E2E Total (Future):** ~29 execution checks
**Grand Total:** ~64 checks across all criteria

---

## Integration with CI/CD

```bash
#!/bin/bash
# CI test script for WS-INIT-2

set -e

# Ensure WS-INIT-1 is complete
./tests/verify-ws-init-1.sh || {
  echo "WS-INIT-1 verification failed - prerequisite not met"
  exit 1
}

# Run WS-INIT-2 verification
./tests/verify-ws-init-2.sh

echo "WS-INIT-2 verification passed in CI"
```

---

## Next Steps

After WS-INIT-2 verification passes:

1. **Manual Smoke Test**
   - Start Claude in new project with `package.json`
   - Verify SessionStart warning appears
   - Run `/init-project`
   - Verify `.claude/` structure created

2. **E2E Test Suite (WS-INIT-3)**
   - Implement actual skill execution tests
   - Test all 6 environments listed above
   - Validate file content (not just existence)
   - Verify idempotency

3. **Integration Tests (WS-INIT-4)**
   - Test agents reading generated rules
   - Test memory protocol with project-local storage
   - Test cross-agent coordination with new structure

This verification script is the **quality gate** for WS-INIT-2. No merge until all checks pass.

---

## Comparison with WS-INIT-1

| Aspect | WS-INIT-1 | WS-INIT-2 |
|--------|-----------|-----------|
| **Scope** | Global installation | Project initialization |
| **Files Modified** | `~/.claude/*` | `.claude/*` in project |
| **Verification Type** | File existence, symlinks, JSON | Detection logic, documentation |
| **Dependencies** | None | WS-INIT-1 complete |
| **User Action** | Run `install.sh` once | Run `/init-project` per project |
| **Check Count** | 42 checks | 35+ checks |
| **E2E Required** | No (static files) | Yes (skill execution) |

Both use the infrastructure verification pattern: validate setup correctness, defer functional testing to E2E suites.
