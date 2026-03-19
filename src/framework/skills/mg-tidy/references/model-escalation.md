# Model Escalation Protocol

Defines when mg-tidy should escalate complex or ambiguous reconciliation decisions to higher-tier agents for deeper reasoning.

## Principle

mg-tidy runs on Sonnet for cost efficiency. The audit and mechanical reconciliation steps (close confirmed duplicates, create missing stubs, remove confirmed orphans) stay on Sonnet. When a decision requires nuanced judgment — conflicting signals, ambiguous duplicates, or state inconsistencies that could mean data loss — the skill spawns an Opus-tier subagent via the Task tool.

## Escalation Triggers

A reconciliation decision is "complex" when it matches ANY of these indicators:

| Indicator | Description | Example |
|-----------|-------------|---------|
| **Ambiguous duplicate** | Same workstream but different titles — unclear which is canonical | #12 "WS-42: Auth" and #31 "WS-42: Authentication Service" — same WS-ID, different titles |
| **Conflicting state** | Memory file shows `complete` but GitHub issue is still open | `workstream-WS-42-state.json` has `status: complete` but issue #47 is open and active |
| **Orphan with recent writes** | Memory file modified in last 48h but no matching issue | Could be in-flight work whose issue was accidentally closed |
| **Cross-workstream impact** | Closing an issue would affect 3+ linked workstreams or PRs | Issue has multiple linked PRs, closing it may break references |
| **Non-standard naming** | Issue or memory file uses non-standard naming that makes matching ambiguous | Can't determine if `workstream-auth-v2-state.json` matches issue #42 or #55 |

## Escalation Pattern

When a trigger is detected, spawn the engineering-manager for judgment:

```yaml
# For ambiguous duplicate or conflicting state
Task:
  subagent_type: engineering-manager
  prompt: |
    [ESCALATED - mg-tidy reconciliation requires judgment]
    Issue: {describe the ambiguity or conflict}
    Options: {list the choices}
    Context: {relevant issue numbers, memory file paths, state values}
    Decision needed: {what judgment call is required — which to keep, what state to trust}
```

## What Stays on Sonnet

- Confirmed duplicate detection (exact title match after normalization)
- Stale issue flagging (date arithmetic)
- Orphaned memory detection (no matching open issue)
- Missing memory detection (open issue with no state file)
- Output formatting and report generation
- Creating minimal memory stubs for missing files
- Mechanical issue closes where duplicates are unambiguous

## What Escalates to Engineering Manager

- Ambiguous duplicate sets (same workstream ID, different titles)
- Memory files that conflict with GitHub issue state
- Orphaned memory with recent modification timestamps
- Any situation where the safe choice is unclear and making the wrong call could lose work

## Non-Escalation Rule

mg-tidy never escalates to CEO or CTO — this is an operational housekeeping task, not a strategic or architectural decision. All escalations go to engineering-manager only.
