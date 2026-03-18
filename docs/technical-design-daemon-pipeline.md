# Technical Design: MG Daemon Full Pipeline

## Overview

Extend the existing daemon (`daemon/`) from a Jira-only poller to a full autonomous pipeline supporting Jira, Linear, and GitHub Issues as ticket sources, with MG team orchestration and ticket tracker write-back.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      mg-daemon process                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Poll Loop (polling.intervalSeconds)   │   │
│  │                                                       │   │
│  │  TicketProvider.poll()                                │   │
│  │       │                                               │   │
│  │       ▼                                               │   │
│  │  NormalizedTicket[]                                   │   │
│  │       │                                               │   │
│  │       ▼                                               │   │
│  │  Orchestrator.process(ticket)                         │   │
│  │       │                                               │   │
│  │       ├── 1. TicketProvider.transitionStatus(IN_PROG) │   │
│  │       ├── 2. Plan: claude --print /mg-leadership-team │   │
│  │       ├── 3. TicketProvider.createSubtask() per WS    │   │
│  │       ├── 4. Execute: claude --print /mg-build per WS │   │
│  │       ├── 5. Git: commit, push, create draft PR       │   │
│  │       ├── 6. TicketProvider.linkPR()                   │   │
│  │       └── 7. TicketProvider.transitionStatus(IN_REVIEW)│   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Module Structure

```
daemon/src/
├── providers/
│   ├── types.ts          # TicketProvider interface, NormalizedTicket
│   ├── jira.ts           # JiraProvider (refactored from ../jira.ts)
│   ├── linear.ts         # LinearProvider (new)
│   ├── github.ts         # GitHubProvider (new)
│   └── factory.ts        # createProvider(config) → TicketProvider
├── orchestrator.ts       # Plan + Execute pipeline
├── planner.ts            # claude --print planning invocation + output parser
├── executor.ts           # claude --print /mg-build per worktree
├── config.ts             # Updated config loader (multi-provider)
├── types.ts              # Updated config types
├── cli.ts                # Updated CLI (new commands: dashboard, install, etc.)
├── process.ts            # Existing (unchanged)
├── tracker.ts            # Existing (minor updates for multi-provider)
├── git.ts                # Existing (add worktree support)
├── github-pr.ts          # Renamed from github.ts (PR creation only)
└── launchd.ts            # macOS launchd plist generation
```

## WS-DAEMON-10: Provider Abstraction

### Interface

```typescript
// providers/types.ts

export type TicketSource = 'jira' | 'linear' | 'github';

export type TicketStatus = 'todo' | 'in_progress' | 'in_review' | 'done';

export interface NormalizedTicket {
  id: string;              // PROJ-123, GH-45, LIN-abc
  source: TicketSource;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  labels: string[];
  url: string;
  raw: unknown;
}

export interface SubtaskInput {
  title: string;
  description: string;
  parentId: string;
}

export interface TicketProvider {
  poll(since?: Date): Promise<NormalizedTicket[]>;
  createSubtask(parent: string, task: SubtaskInput): Promise<string>;
  transitionStatus(ticketId: string, status: TicketStatus): Promise<void>;
  addComment(ticketId: string, body: string): Promise<void>;
  linkPR(ticketId: string, prUrl: string): Promise<void>;
}
```

### Provider Implementations

**JiraProvider** — Wraps existing `jira.ts` logic. Maps Jira priority names to normalized enum. Uses REST API v3 for write-back (create sub-task, transition, add comment, add remote link).

**LinearProvider** — Linear GraphQL API. Auth: `Authorization: Bearer <apiKey>`. Queries: `issues(filter: ...)` for polling. Mutations: `issueCreate`, `issueUpdate` for write-back. Maps Linear priority (0-4) to normalized enum.

**GitHubProvider** — Uses `gh` CLI exclusively. `gh issue list --json` for polling. `gh issue create` for subtasks. `gh issue edit` for status (via labels). `gh issue comment` for comments. PR linkage is automatic via branch naming.

### Config Schema (Updated)

```typescript
export interface DaemonConfig {
  provider: 'jira' | 'linear' | 'github';
  jira?: JiraConfig;
  linear?: LinearConfig;
  github: GitHubConfig;     // Always required (for PR creation)
  polling: PollingConfig;
  orchestration: OrchestrationConfig;
  notifications?: NotificationConfig;
}

export interface LinearConfig {
  apiKey: string;
  teamId: string;
  projectId?: string;
  filter: string;  // Linear filter string
}

export interface GitHubConfig {
  repo: string;
  baseBranch: string;
  issueFilter?: string;  // e.g. "label:mg-daemon state:open"
  // Note: auth via gh CLI login, no token needed in config
}

export interface OrchestrationConfig {
  claudeTimeout: number;      // ms, default 1800000 (30 min)
  concurrency: number;        // max parallel claude processes, default 1
  delayBetweenTicketsMs: number; // throttle, default 5000
  dryRun: boolean;            // plan but don't execute
  errorBudget: number;        // consecutive failures before pause, default 3
}

export interface NotificationConfig {
  onPRCreated?: string;       // shell command
  onFailure?: string;         // shell command
}
```

## WS-DAEMON-11: Orchestration Engine

### Planning Phase

```typescript
// planner.ts
export async function planTicket(
  ticket: NormalizedTicket,
  options: { timeout: number; dryRun: boolean }
): Promise<WorkstreamPlan[]> {
  const prompt = buildPlanningPrompt(ticket);
  const output = await execClaude(prompt, options.timeout);
  return parseWorkstreamPlan(output);
}

function buildPlanningPrompt(ticket: NormalizedTicket): string {
  return `You are planning implementation for ticket ${ticket.id}: ${ticket.title}

## Description
${ticket.description}

Break this into concrete workstreams. For each workstream output EXACTLY this format:

WS: <name>
AC: <acceptance criteria>
---

Do not include any other text.`;
}
```

### Execution Phase

```typescript
// executor.ts
export async function executeWorkstream(
  ws: WorkstreamPlan,
  ticket: NormalizedTicket,
  worktreePath: string,
  options: { timeout: number }
): Promise<ExecutionResult> {
  const prompt = buildExecutionPrompt(ws, ticket);
  const output = await execClaude(prompt, options.timeout, worktreePath);
  return { success: !output.includes('FAILED'), output };
}
```

### Git Worktree Isolation

Each ticket gets its own worktree:
```
.mg-daemon/worktrees/
├── PROJ-123/     # git worktree for ticket PROJ-123
├── PROJ-124/     # git worktree for ticket PROJ-124
```

Created via: `git worktree add .mg-daemon/worktrees/PROJ-123 -b feature/PROJ-123-slug`
Cleaned up after PR creation: `git worktree remove .mg-daemon/worktrees/PROJ-123`

## WS-DAEMON-13: macOS Hardening

### launchd Plist

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.mg-daemon.${project-slug}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>${daemon-path}/dist/cli.js</string>
    <string>start</string>
    <string>--foreground</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${project-path}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${project-path}/.mg-daemon/daemon.log</string>
  <key>StandardErrorPath</key>
  <string>${project-path}/.mg-daemon/daemon.err</string>
</dict>
</plist>
```

### Log Rotation

Built-in rotation in the logger module:
- Check log size before each write
- If >10MB: rename `daemon.log` → `daemon.log.1`, shift existing rotations
- Keep max 5 rotations

## Execution Order & Dependencies

```
Phase 1 (parallel):
  WS-DAEMON-10 — Provider Abstraction
  WS-DAEMON-13 — Mac Mini Hardening

Phase 2 (depends on WS-10):
  WS-DAEMON-11 — Orchestration Engine

Phase 3 (depends on WS-11):
  WS-DAEMON-12 — Write-Back
  WS-DAEMON-14 — Observability
```

## Testing Strategy

- All provider implementations share a contract test suite (parameterized)
- Orchestrator tests mock `claude --print` subprocess (exec stub)
- Integration tests use real `gh` CLI against a test repo
- Existing 3500+ lines of tests must continue passing (no regression)
- Target: 99%+ coverage on all new modules

## Dependencies

- No new npm dependencies for GitHub provider (uses `gh` CLI)
- No new npm dependencies for Linear provider (uses native `fetch`)
- `js-yaml` already present for config parsing
- `node:child_process` for `claude --print` subprocess
