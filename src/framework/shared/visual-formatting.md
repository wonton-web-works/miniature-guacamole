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

Agents replace their previous status output instead of appending. Each status update overwrites the prior one.

**Applies to:** Status boxes, progress indicators, and workstream status boards.

**Error exception:** Error output is NEVER replaced — errors accumulate. This is consistent with the error-always-shown rule in Output Modes and the Error Display section. Errors are additive regardless of mode.

**Compact mode:** Each agent's single-line status output replaces its previous line.

**Verbose mode:** Replacement is still the default. Verbose mode may optionally retain history for verbose debugging when explicitly requested, but replacement is the baseline behavior — not the exception.

**First render:** When there is no prior status to replace, render normally. No prior output is not an error condition.

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
>> [Agent Name]: [task description]
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

### Stage Progress
```
═══════════════════════════════════════════════════════════════
  WORKFLOW PROGRESS
═══════════════════════════════════════════════════════════════

  [✅] Step 1: Test Specification     ████████████████████ 100%
  [🔄] Step 2: Implementation         ████████░░░░░░░░░░░░  40%
  [⏳] Step 3: Verification           ░░░░░░░░░░░░░░░░░░░░   0%
  [⏳] Step 4: Review                 ░░░░░░░░░░░░░░░░░░░░   0%

═══════════════════════════════════════════════════════════════
```

**Compact variant** (exactly 1 line):
```
progress: Step [n]/4 [status]
```

### Delegation Chain
```
┌─────────────────────────────────────────────────────────────┐
│  📊 DELEGATION CHAIN                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [USER] ──▶ [mg-leadership-team] ──▶ [mg-build]       │
│                                          │                  │
│                                          ├──▶ [qa] ✅       │
│                                          └──▶ [dev] 🔄      │
│                                                             │
│  Depth: 2/3  •  Status: In Progress                        │
└─────────────────────────────────────────────────────────────┘
```

**Compact variant** (exactly 1 line):
```
[parent] -> [child]: [task]
```

## Status Icons

| Icon | Meaning |
|------|---------|
| ⏳ | Pending / Waiting |
| 🔄 | In Progress |
| ✅ | Complete / Success |
| ❌ | Failed / Error |
| ⚠️ | Warning / Attention |
| 🚫 | Blocked |
| 🎯 | Current Target |
| 📋 | Task |
| 👥 | Team |
| 🔧 | Dev / Implementation |
| 🧪 | QA / Testing |
| 🎨 | Design |
| 👔 | Leadership |
| 📊 | Analytics / Status |
| 🚀 | Deployment |
| 💾 | Memory / State |

## Section Headers

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📋 SECTION TITLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Compact variant** (exactly 1 line):
```
--- [SECTION TITLE] ---
```

## Agent Spawning Feedback

Three styles available based on context:

### Style 1: Live Activity Feed (for Teams)

Use this for team skills (mg-build, mg-leadership-team, mg-design):

```
┌────────────────────────────────────────────────────────────┐
│  LIVE AGENT ACTIVITY                                        │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  13:45:01  >> SPAWN   qa (sonnet)                           │
│            |  Task: Write test specifications                │
│            |  Parent: mg-build                       │
│            |  Depth: 2/3                                     │
│                                                              │
│  13:45:32  << RETURN  qa -> mg-build                │
│            |  Status: completed                              │
│            |  Result: 28 tests created                       │
│            |  Duration: 31s                                  │
│                                                              │
│  13:45:33  >> SPAWN   dev (sonnet)                          │
│            |  Task: Implement to pass tests                  │
│            |  Parent: mg-build                       │
│            |  Depth: 2/3                                     │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

### Style 2: Minimal Inline (for ICs)

Use this for IC agents (dev, qa, design, etc.):

```
  >> spawn: qa (sonnet) -> "Write test specs for auth"
  << recv:  qa completed in 45s -> 28 tests created
  >> spawn: dev (sonnet) -> "Implement auth feature"
  .. running: dev (sonnet) [████████░░░░░░░░░░░░] 40%
  << recv:  dev completed in 120s -> impl ready
```

### Style 3: Debug Dashboard (for verbose/debug mode)

Use when DEBUG=true or --verbose flag. ASCII-focused, data-rich:

```
+===============================================================+
|                     AGENT DASHBOARD [DEBUG]                    |
+===============+===============+===============+================+
| AGENT         | MODEL         | STATUS        | TASK           |
+---------------+---------------+---------------+----------------+
| leadership    | opus          | idle          | --             |
| engineering   | sonnet        | active        | coordinating   |
| dev           | sonnet        | running       | implementing   |
| qa            | sonnet        | complete      | 28 tests       |
| design        | sonnet        | waiting       | --             |
| deploy        | haiku         | idle          | --             |
+---------------+---------------+---------------+----------------+
| SPAWN HISTORY                                                  |
+---------------+---------------+---------------+----------------+
| TIME          | ACTION        | AGENT         | PARENT         |
+---------------+---------------+---------------+----------------+
| 13:45:01.234  | spawn         | qa            | engineering    |
| 13:45:32.891  | return        | qa            | engineering    |
| 13:45:33.102  | spawn         | dev           | engineering    |
+---------------+---------------+---------------+----------------+
| METRICS                                                        |
+---------------+---------------+---------------+----------------+
| Total Spawns: 3    | Active: 1    | Completed: 1  | Failed: 0  |
| Avg Duration: 31s  | Max Depth: 2 | Token Est: ~50k            |
+===============================================================+
```

## Legacy Delegation Notices (deprecated, use above)

Simple delegation notice (still supported):

```
  >> delegating: [agent-name] -> "[task]"
```

Simple return notice:

```
  << received: [agent-name] ([status]) -> "[summary]"
```

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

```
  ⚠️ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

     ESCALATION REQUIRED

     Reason: [Why escalation is needed]
     From: [current-agent]
     To: [escalation-target]

     Decision needed: [What needs to be decided]

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ⚠️
```

**Compact variant** (exactly 1 line):
```
⚠ ESCALATION: [reason] → [target]
```

## Completion Summary

```
╔══════════════════════════════════════════════════════════════╗
║                    ✅ TASK COMPLETE                          ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Agent: [agent-name]                                         ║
║  Task: [task description]                                    ║
║  Duration: [time]                                            ║
║                                                              ║
║  Deliverables:                                               ║
║  • [deliverable 1]                                           ║
║  • [deliverable 2]                                           ║
║                                                              ║
║  Next: [recommended next action]                             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

**Compact variant** (exactly 2 lines):
```
✓ [agent-name]: [task] ([duration])
  next: [recommended next action]
```
