# mg-tidy Output Format

Standard output patterns for the mg-tidy state reconciliation skill.

## Output Mode Flag

mg-tidy supports the standard `output_mode` parameter:

| Mode | Behavior | When to use |
|------|----------|-------------|
| `compact` | Single-line per event, no ASCII art (default) | Normal tidy runs |
| `full` | Full banners, ASCII art, status boxes | Verbose/debug sessions, explicit request |
| `silent` | Errors only, all other output suppressed | Automated pipelines, CI |

## Tidy Report Structure

```markdown
## mg-tidy: State Reconciliation

### Preflight
- gh: installed + authenticated
- .claude/memory/: found (N files)

### Audit Results
- Open issues: N
- Duplicates detected: N sets
- Stale issues: N (flagged, no action)
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

### Next Action
{Recommended follow-up or "State is clean — no further action required."}
```

## Plan Output (pre-confirmation)

When showing the plan before applying changes (default mode):

```markdown
## mg-tidy Plan

### Duplicates to close
- Issue #12 "WS-42: Auth feature" → CLOSE (duplicate of #47, keeping #47)
- Issue #18 "WS-42: Auth feature" → CLOSE (duplicate of #47, keeping #47)

### Orphaned memory to remove
- .claude/memory/workstream-WS-08-state.json (no matching open issue)

### Missing memory to create
- workstream-WS-55-state.json (issue #55 "WS-55: New dashboard" exists, no state file)

### Stale issues (flagged, no action)
- Issue #31 "WS-10: Old feature" — no activity in 21 days, no linked PR

Apply these changes? [y/N]
```

## Clean State Output

When no changes are needed:

```markdown
## mg-tidy: State Reconciliation

### Preflight
- gh: installed + authenticated
- .claude/memory/: found (3 files)

### Audit Results
- Open issues: 3
- Duplicates detected: 0
- Stale issues: 0
- Workstream state files: 3
- Orphaned memory: 0
- Missing memory: 0

### Status
CLEAN — no changes required.

### Canonical Workstream List
| ID    | Issue | Status | Memory File |
|-------|-------|--------|-------------|
| WS-42 | #47   | open   | workstream-WS-42-state.json |
| WS-55 | #55   | open   | workstream-WS-55-state.json |
| WS-61 | #61   | open   | workstream-WS-61-state.json |
```

## Full Mode ASCII Dashboard

In full mode, use the workstream dashboard from the shared output format:

```
╔═══════════════════════════════════════════════════════════════════╗
║                    mg-tidy STATE REPORT                           ║
╠═══════════════════════════════════════════════════════════════════╣
║  Issues audited:  12    Duplicates closed:   2                    ║
║  Memory files:     8    Orphaned removed:    1                    ║
║  Stale flagged:    3    Missing created:     1                    ║
╠═══════════════════════════════════════════════════════════════════╣
║  WS-42  │ Auth feature           │  open   │  state: found        ║
║  WS-55  │ New dashboard          │  open   │  state: created      ║
║  WS-61  │ API rate limits        │  open   │  state: found        ║
╚═══════════════════════════════════════════════════════════════════╝
```

## Compact Mode (default)

Single-line progress events during audit:

```
mg-tidy: auditing 12 issues... 2 duplicates, 3 stale, 1 orphaned memory, 1 missing memory
mg-tidy: plan ready — 3 changes queued. Apply? [y/N]
mg-tidy: closed #12, #18 | removed workstream-WS-08-state.json | created workstream-WS-55-state.json
mg-tidy: done. 3 workstreams canonical. State is clean.
```

## Dry-Run Mode

```
mg-tidy [dry-run]: 2 duplicates, 1 orphaned, 1 missing — no changes applied.
Run without --dry-run to apply.
```

## Status Markers

- `CLEAN` — no drift detected, no changes needed
- `CHANGES APPLIED` — reconciliation completed successfully
- `DRY RUN COMPLETE` — audit done, no changes made
- `PARTIAL` — some changes applied, others skipped (escalated or ambiguous)
- `ERROR` — preflight failed (gh not installed, not authenticated, etc.)
