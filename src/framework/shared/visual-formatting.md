# Visual Formatting Standards

All agents should use these visual elements for consistent terminal feedback.

## Output Modes

All visual output supports an `output_mode` flag:

```
output_mode: compact | verbose
```

- `compact` — single-line per event, no banners, no ASCII art (exception: errors always use the full box regardless of mode). Default. Reduces per-build output from ~60 lines to ≤10 lines. Unknown or undefined `output_mode` values default to compact.
- `verbose` — all banners, ASCII art, status boxes, progress bars. Use for verbose/debug sessions or when explicitly requested.

To request verbose mode: include "verbose" or `output_mode: verbose` in your invocation. Unknown values default to compact.

## Status Replacement

Agents replace their previous status output instead of appending. Each status update overwrites the prior one. Errors are the exception — error output is NEVER replaced and always accumulates regardless of mode.

## Agent Badge Identity System

All agents are assigned a colored badge based on their category. Badges appear in compact-mode output as: `{emoji} [{CATEGORY}] {agent-name}: {action}`.

| Badge | Agents |
|-------|--------|
| 🟡 [LEAD] | ceo, cto, engineering-director, product-owner |
| 🔵 [ENG] | dev, staff-engineer, devops-engineer, data-engineer, deployment-engineer |
| 🟢 [QA] | qa, security-engineer |
| 🟣 [CREATE] | design, art-director, copywriter, ai-artist, technical-writer, studio-director |
| ⚪ [COORD] | supervisor, engineering-manager, product-manager, api-designer |

This is the canonical badge mapping. Downstream files reference this table — they do not duplicate it.

## Agent Invocation Banner

When an agent starts, display:

```
┌──────────────────────────────────────────────────────────────────┐
│  🎯 AGENT: [Agent Name]                                          │
│  📋 TASK: [Brief task description]                               │
│  ⏱️  STATUS: [Starting | In Progress | Complete]                 │
└──────────────────────────────────────────────────────────────────┘
```

**Compact variant** (exactly 1 line):
```
🔵 [ENG] dev: implement auth endpoint (120s)
```

## Team Invocation Banner

For composite teams:

```
╔══════════════════════════════════════════════════════════════╗
║  👥 TEAM: [Team Name]                                        ║
╠══════════════════════════════════════════════════════════════╣
║  Members: [Agent 1] • [Agent 2] • [Agent 3]                  ║
║  Mode: [Planning | Execution | Review]                       ║
╚══════════════════════════════════════════════════════════════╝
```

**Compact variant** (exactly 1 line):
```
>> team:[Team Name] members:[Agent 1, Agent 2, Agent 3] mode:[mode]
```

## Progress Indicators

**Compact** (default):
```
progress: Step [n]/4 [status]
[parent] -> [child]: [task]
```

**Verbose:** Uses full ASCII progress bars and delegation chain boxes (see verbose mode).

## Status Icons

| Icon | Meaning |
|------|---------|
| ⏳ | Pending / Waiting |
| 🔄 | In Progress |
| ✅ | Complete / Success |
| ❌ | Failed / Error |
| ⚠️ | Warning / Attention |
| 🚫 | Blocked |

## Section Headers

**Compact:** `--- [SECTION TITLE] ---`

## Agent Spawning Feedback

Two styles: columnar (default) and debug dashboard (verbose-only).

### Columnar Activity Feed (default)

The standard activity feed for all agent spawning. Uses directional prefixes and badge identity:

```
>> 🔵 [ENG]  dev      spawn   "implement auth"         depth:2/3
<< 🟢 [QA]   qa       done    "28 tests created"       31s
>> 🔵 [ENG]  dev      spawn   "implement to pass"      depth:2/3
.. 🔵 [ENG]  dev      running                           40%
<< 🔵 [ENG]  dev      done    "impl ready"             120s
!! ⚪ [COORD] em       blocked "waiting on qa"          depth:1/3
```

**Prefix key:**
| Prefix | Meaning |
|--------|---------|
| `>>` | Spawn / delegate |
| `<<` | Return / complete |
| `..` | In progress |
| `!!` | Error / blocked |

### Debug Dashboard (verbose-only)

Use when DEBUG=true or --verbose flag. Shows a full ASCII table with columns: AGENT | MODEL | STATUS | TASK, plus SPAWN HISTORY and METRICS sections.

## Gate Check Display

```
┌────────────────────────────────────────────────────────────┐
│  🚦 QUALITY GATE: [Gate Name]                               │
├────────────────────────────────────────────────────────────┤
│  ✅ Tests passing: 47/47                                    │
│  ✅ Coverage: 99.2% (target: 99%)                           │
│  ✅ No linting errors                                       │
│  ⚠️  Visual changes detected (pending design review)        │
├────────────────────────────────────────────────────────────┤
│  RESULT: ⚠️ CONDITIONAL PASS (awaiting design approval)     │
└────────────────────────────────────────────────────────────┘
```

**Compact variant** (exactly 1 line):
```
gate:[Gate Name] [PASS|FAIL] tests:[n/n] coverage:[n%]
```

## Workstream Status Board

```
╔══════════════════════════════════════════════════════════════╗
║                    WORKSTREAM STATUS                         ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  WS-1: Shared Memory         [✅ COMPLETE]    ████████████  ║
║  WS-2: Role Anchors          [🔄 IN PROGRESS] ████████░░░░  ║
║  WS-3: Structured Returns    [🔄 IN PROGRESS] ██████░░░░░░  ║
║  WS-4: Supervisor Agent      [🚫 BLOCKED]     ░░░░░░░░░░░░  ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  Overall Progress: 45%  •  Active: 2  •  Blocked: 1         ║
╚══════════════════════════════════════════════════════════════╝
```

**Compact variant** (single line per workstream):
```
[WS-id]: [name] [[STATUS]]
```

## Error Display

```
╔════════════════════════════════════════════════════════════╗
║  ❌ ERROR: [Error Type]                                     ║
╠════════════════════════════════════════════════════════════╣
║  Message: [Error message]                                   ║
║  Location: [file:line or agent]                             ║
║  Action: [What to do next]                                  ║
╚════════════════════════════════════════════════════════════╝
```

**Note:** Error display uses the full box in all modes. Errors are always shown regardless of mode.

## Escalation Notice

**Compact:** `⚠ ESCALATION: [reason] → [target]`

**Verbose:** Full box with reason, from, to, and decision needed fields.

## Completion Summary

**Compact** (exactly 2 lines):
```
✓ [agent-name]: [task] ([duration])
  next: [recommended next action]
```

**Verbose:** Double-border box (╔═) with agent, task, duration, deliverables, and next action.
