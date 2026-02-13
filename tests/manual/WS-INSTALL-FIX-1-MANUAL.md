# Manual Verification: WS-INSTALL-FIX-1

**Purpose:** End-to-end validation of installer cleanup and path reference fixes.

**Prerequisites:**
- Built distribution at `dist/`
- Clean test environment

**Estimated time:** 2-3 minutes

---

## Step 1: Create Test Environment

```bash
mkdir -p /tmp/test-ws-install-fix-1
cd /tmp/test-ws-install-fix-1
```

**Expected:** Empty directory created.

---

## Step 2: Simulate v0.9 Installation

Create stale pre-v1.0 content to test cleanup:

```bash
mkdir -p .claude/skills/{implement,engineering-team,code-review}
echo "old skill" > .claude/skills/implement/SKILL.md
echo "old skill" > .claude/skills/engineering-team/SKILL.md
echo "old skill" > .claude/skills/code-review/SKILL.md

mkdir -p .claude/agents/old-agent
echo "old agent" > .claude/agents/old-agent/AGENT.md

mkdir -p .claude/shared
echo "old protocol" > .claude/shared/old-protocol.md
```

**Expected:** Stale v0.9-style content created.

**Verify:**
```bash
ls .claude/skills/  # Should show: implement, engineering-team, code-review
ls .claude/agents/  # Should show: old-agent
```

---

## Step 3: Install Current Version

```bash
bash /Users/brodieyazaki/work/agent-tools/miniature-guacamole/dist/install.sh --force
```

**Expected:**
- Installer runs successfully
- Output shows "Copying framework components..."
- No errors

---

## Step 4: Verify Cleanup

**Test: Old skills removed**
```bash
test ! -d .claude/skills/implement && echo "✓ implement removed" || echo "✗ implement still exists"
test ! -d .claude/skills/engineering-team && echo "✓ engineering-team removed" || echo "✗ engineering-team still exists"
test ! -d .claude/skills/code-review && echo "✓ code-review removed" || echo "✗ code-review still exists"
```

**Test: Old agents removed**
```bash
test ! -d .claude/agents/old-agent && echo "✓ old-agent removed" || echo "✗ old-agent still exists"
```

**Test: Old protocols removed**
```bash
test ! -f .claude/shared/old-protocol.md && echo "✓ old-protocol removed" || echo "✗ old-protocol still exists"
```

**Test: New skills installed**
```bash
test -d .claude/skills/mg-build && echo "✓ mg-build exists" || echo "✗ mg-build missing"
test -d .claude/skills/mg-code-review && echo "✓ mg-code-review exists" || echo "✗ mg-code-review missing"
```

**Test: Correct skill count**
```bash
skill_count=$(find .claude/skills -maxdepth 1 -type d -name "mg-*" | wc -l | tr -d ' ')
echo "Skill count: $skill_count (expected: 16)"
[ "$skill_count" -eq 16 ] && echo "✓ Correct skill count" || echo "✗ Wrong skill count"
```

**Test: Correct agent count**
```bash
agent_count=$(find .claude/agents -maxdepth 1 -type d ! -name agents | wc -l | tr -d ' ')
echo "Agent count: $agent_count (expected: 19)"
[ "$agent_count" -eq 19 ] && echo "✓ Correct agent count" || echo "✗ Wrong agent count"
```

**Expected:** All tests pass (✓).

---

## Step 5: Verify Path References

```bash
cd /Users/brodieyazaki/work/agent-tools/miniature-guacamole/dist
```

**Test: No prohibited ~/.claude/ references**
```bash
grep -r '~/.claude/' .claude/ | \
    grep -v 'deny-rules' | \
    grep -v 'config-cache' | \
    grep -v 'globally (~/.claude/)' | \
    grep -v 'ls ~/.claude/' | \
    grep -v 'from.*~/.claude/shared/'
```

**Expected:** No output (or only comments/documentation).

**Test: CLAUDE.md uses project-local paths**
```bash
grep '\.claude/' .claude/CLAUDE.md | head -5
```

**Expected:** Shows references to `.claude/` for project-local paths.

**Test: mg-init uses project-local paths**
```bash
grep '\.claude/' .claude/skills/mg-init/SKILL.md | head -5
```

**Expected:** Shows references to `.claude/` for project-local operations.

---

## Acceptance Criteria Verification

- **AC-1:** Re-install removes stale pre-v1.0 skill directories
  - ✓ Old skills (`implement`, `engineering-team`, `code-review`) removed
  - ✓ New skills (`mg-build`, `mg-code-review`, etc.) installed

- **AC-2:** `grep -r '~/.claude/' src/framework/` returns only safety/config-cache refs
  - ✓ No prohibited references in dist output

- **AC-3:** `./build.sh` succeeds
  - ✓ Dist exists and installer runs

- **AC-4:** Manual verification test passes
  - ✓ All 5 steps verified

---

## Cleanup

```bash
rm -rf /tmp/test-ws-install-fix-1
```

---

## Troubleshooting

**Issue:** Old skills still exist after install
- **Cause:** Installer cleanup not running
- **Fix:** Check install.sh contains cleanup logic before "mkdir -p"

**Issue:** Wrong skill/agent count
- **Cause:** Incomplete installation
- **Fix:** Check dist/ was built with latest source

**Issue:** Path references found
- **Cause:** Source files not updated
- **Fix:** Run path corrections in src/framework/ then rebuild

---

**Test completed:** [Date]
**Result:** PASS / FAIL
**Notes:**
