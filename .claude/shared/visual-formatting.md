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

## Subagent Invocation Notice

When delegating to a subagent:

```
  ┌──────────────────────────────────────────────────────────┐
  │  🔀 DELEGATING TO: [agent-name]                          │
  │  📝 Task: [brief description]                            │
  │  ⏱️  Waiting for response...                             │
  └──────────────────────────────────────────────────────────┘
```

## Subagent Return Notice

When subagent returns:

```
  ┌──────────────────────────────────────────────────────────┐
  │  ✅ RECEIVED FROM: [agent-name]                          │
  │  📊 Status: [completed | blocked | needs_escalation]     │
  │  📄 Summary: [one-line summary]                          │
  └──────────────────────────────────────────────────────────┘
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
