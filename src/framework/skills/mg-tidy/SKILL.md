---
name: mg-tidy
description: "Reconciles project state — deduplicates GitHub issues, syncs workstream memory, and generates a state report."
model: sonnet
allowed-tools: Bash, Read, Write, Glob, Grep
compatibility: "Requires Claude Code and gh CLI"
metadata:
  version: "1.0.0"
---

> Inherits: [skill-base](../_base/skill-base.md)

# mg-tidy

Housekeeping skill that reconciles project state across GitHub issues, `.claude/memory/`, and workstream files. Detects drift between what GitHub tracks and what memory knows — closes duplicates, creates missing memory, removes orphaned state, and produces a canonical state report.

## Constitution

1. **Audit before acting** - Always run both audits (GH issues and memory) before making any changes. Never close an issue or remove a file without first completing the full audit.
2. **Conservative closes** - Only close issues that are confirmed duplicates (same title). Never close on ambiguity. When in doubt, report and ask.
3. **Keep the highest-numbered duplicate** - When closing duplicates, keep the highest-numbered issue and close the lower-numbered ones. The highest number is most recently filed and most likely to have current conversation attached.
4. **Preserve user data** - Memory files are project state. Only remove a memory file when its workstream issue is confirmed closed or deleted on GitHub. Otherwise report the orphan and leave it.
5. **Dry-run by default** - Show the full plan before making any writes or closes. Wait for confirmation unless `--auto` flag is passed.
6. **gh dependency** - This skill requires `gh` (GitHub CLI). Check it is installed and authenticated before proceeding.
7. **Follow output format** — See `references/output-format.md` for standard visual patterns

## Usage

```
/mg-tidy
/mg-tidy --auto
/mg-tidy --dry-run
```

- No flags: audit, show plan, ask for confirmation before applying
- `--auto`: audit and apply immediately without confirmation prompt
- `--dry-run`: audit only, show report, make no changes

## Trigger Phrases

Invoke this skill when the user says: "clean up state", "tidy", "reconcile", "sync state", or similar.

## Workflow

### Step 1: Preflight

1. Check `gh` is installed and authenticated
2. Detect if `.claude/memory/` exists
3. Report preflight status

### Step 2: Audit GH Issues

List all open GitHub issues via `gh issue list --state open --limit 200 --json number,title,updatedAt,url`.

For each issue:
- **Duplicate detection**: Group issues by normalized title (lowercase, punctuation stripped). Any group with 2+ issues = duplicate set. Record which to close (all but the highest-numbered).
- **Stale detection**: Issues with `updatedAt` older than 14 days and no linked PR. Flag for reporting only — do not auto-close stale issues.

### Step 3: Audit Memory

Scan `.claude/memory/` for workstream state files (`workstream-*-state.json`).

For each state file:
- Extract the workstream ID
- Look for a matching GitHub issue (title contains the workstream ID or name)
- If no matching open issue found: flag as **orphaned memory**

For each open GitHub issue that looks like a workstream (title contains `WS-` or matches a workstream naming pattern):
- Look for a matching `workstream-{id}-state.json` file
- If no matching file found: flag as **missing memory**

### Step 4: Show Plan

Before applying any changes, output the full tidy plan:

```
## mg-tidy Plan

### Duplicates to close
- Issue #12 "WS-42: Auth feature" → CLOSE (duplicate of #47, keeping #47)

### Orphaned memory to remove
- .claude/memory/workstream-WS-08-state.json (no matching open issue)

### Missing memory to create
- workstream-WS-55-state.json (issue #55 exists, no state file)

### Stale issues (flagged, no action)
- Issue #31 "WS-10: Old feature" — no activity in 21 days, no linked PR

Apply these changes? [y/N]
```

In `--dry-run` mode: show plan, exit with no changes.
In `--auto` mode: apply without prompting.
In default mode: show plan, wait for confirmation.

### Step 5: Reconcile

Apply confirmed changes:

1. **Close duplicate issues**: For each duplicate to close, run:
   ```
   gh issue close <number> --comment "Closing as duplicate of #<keep-number>."
   ```

2. **Remove orphaned memory**: Delete orphaned `workstream-*-state.json` files from `.claude/memory/`. Log each removal.

3. **Create missing memory**: For each issue with no state file, create a minimal `workstream-{id}-state.json`:
   ```json
   {
     "workstream_id": "<id>",
     "status": "unknown",
     "source_issue": "<issue number>",
     "created_by": "mg-tidy",
     "created_at": "<timestamp>",
     "note": "State file created by mg-tidy — update with actual workstream status."
   }
   ```

### Step 6: State Report

Output the canonical workstream list and a summary of what was changed.

## Output Format

Follow `references/output-format.md`. Use the Audit/Reconcile pattern:

```markdown
## mg-tidy: State Reconciliation

### Preflight
- gh: installed + authenticated
- .claude/memory/: found (N files)

### Audit Results
- Open issues: N
- Duplicates detected: N sets
- Stale issues: N
- Workstream state files: N
- Orphaned memory: N
- Missing memory: N

### Changes Applied
- Closed N duplicate issues
- Removed N orphaned memory files
- Created N missing memory files

### Canonical Workstream List
| ID    | Issue | Status | Memory File |
|-------|-------|--------|-------------|
| WS-42 | #47   | open   | workstream-WS-42-state.json |
| WS-55 | #55   | open   | workstream-WS-55-state.json (created) |

### Stale Issues (no action taken)
- #31 "WS-10: Old feature" — last activity: 21 days ago
```

## Error Handling

### `gh` not installed

```
Error: gh is not installed or not in PATH.
Install it from https://cli.github.com/ then re-run /mg-tidy.
```

### `gh` not authenticated

```
Error: gh is not authenticated with GitHub.
Run: gh auth login
Then re-run /mg-tidy.
```

### `.claude/memory/` not found

Report in preflight: `.claude/memory/: not found — skipping memory audit`. Proceed with GitHub audit only. Report GH issues but skip memory reconciliation steps.

### No open issues

```
No open GitHub issues found. Nothing to reconcile.
```

Report memory state if `.claude/memory/` exists, then exit cleanly.

## Agents Used

- **engineering-manager** — orchestration and final sign-off on plan
- **supervisor** — audit phase (GH issues scan, memory file scan)

## Boundaries

**CAN:** List and close duplicate GitHub issues, read and write `.claude/memory/` workstream state files, remove orphaned memory files, create missing memory stubs, generate state reports
**CANNOT:** Close non-duplicate issues, delete code files, modify agent definitions, modify skill definitions, force-push or merge branches, close issues marked `keep` or `wontfix`
**ESCALATES TO:** engineering-manager if a duplicate set is ambiguous (different titles but appear to be the same workstream) or if memory state conflicts with GitHub state in a non-obvious way
