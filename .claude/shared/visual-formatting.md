# Visual Formatting Standards

All agents should use these visual elements for consistent terminal feedback.

## Agent Invocation Banner

When an agent starts, display:

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🎯 AGENT: [Agent Name]                                       ┃
┃  📋 TASK: [Brief task description]                            ┃
┃  ⏱️  STATUS: [Starting | In Progress | Complete]              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
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

### Delegation Chain
```
┌─────────────────────────────────────────────────────────────┐
│  📊 DELEGATION CHAIN                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [USER] ──▶ [leadership-team] ──▶ [engineering-team]       │
│                                          │                  │
│                                          ├──▶ [qa] ✅       │
│                                          └──▶ [dev] 🔄      │
│                                                             │
│  Depth: 2/3  •  Status: In Progress                        │
└─────────────────────────────────────────────────────────────┘
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

## Agent Spawning Feedback

Three styles available based on context:

### Style 1: Live Activity Feed (for Teams)

Use this for team skills (engineering-team, leadership-team, design-team):

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  LIVE AGENT ACTIVITY                                        ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                              ┃
┃  13:45:01  >> SPAWN   qa (sonnet)                           ┃
┃            |  Task: Write test specifications                ┃
┃            |  Parent: engineering-team                       ┃
┃            |  Depth: 2/3                                     ┃
┃                                                              ┃
┃  13:45:32  << RETURN  qa -> engineering-team                ┃
┃            |  Status: completed                              ┃
┃            |  Result: 28 tests created                       ┃
┃            |  Duration: 31s                                  ┃
┃                                                              ┃
┃  13:45:33  >> SPAWN   dev (sonnet)                          ┃
┃            |  Task: Implement to pass tests                  ┃
┃            |  Parent: engineering-team                       ┃
┃            |  Depth: 2/3                                     ┃
┃                                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
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
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🚦 QUALITY GATE: [Gate Name]                               ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  ✅ Tests passing: 47/47                                    ┃
┃  ✅ Coverage: 99.2% (target: 99%)                           ┃
┃  ✅ No linting errors                                       ┃
┃  ⚠️  Visual changes detected (pending design review)        ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  RESULT: ⚠️ CONDITIONAL PASS (awaiting design approval)     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
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

## Error Display

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ❌ ERROR: [Error Type]                                     ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  Message: [Error message]                                   ┃
┃  Location: [file:line or agent]                             ┃
┃  Action: [What to do next]                                  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

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
