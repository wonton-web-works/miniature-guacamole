# Product Requirements Document: MG Daemon Full Pipeline

## Problem

Teams using miniature-guacamole can run `/mg-build` interactively, but there is no autonomous mode. Developers must manually:

1. Check their ticket tracker (Jira, Linear, or GitHub Issues) for new work
2. Start a Claude Code session and invoke MG skills to plan and implement
3. Create PRs and link them back to tickets
4. Update ticket status and create subtasks

This manual loop limits throughput to one human's attention. A dedicated Mac Mini running 24/7 could process tickets autonomously, producing draft PRs for human review — turning the bottleneck from "developer starts work" to "developer reviews PR."

The existing daemon (`daemon/`) has Jira polling, git operations, and GitHub PR creation, but lacks: (a) Linear and GitHub Issues as ticket sources, (b) MG team orchestration (planning + building via `claude --print`), (c) write-back to ticket trackers, (d) production hardening for 24/7 operation.

---

## Users

- **Primary: Development teams** — Teams with a backlog of well-defined tickets who want autonomous implementation. They review PRs rather than writing first drafts. Technical proficiency: high. They configure the daemon per-project and monitor its output.
- **Secondary: Engineering leads** — Monitor pipeline health, approve PRs, and adjust ticket priority to influence what the daemon picks up next.

---

## Success Criteria

- Daemon processes a ticket end-to-end (poll → plan → build → PR) without human intervention
- All three ticket providers (Jira, Linear, GitHub Issues) pass identical contract tests
- Subtasks/sub-issues appear in the source tracker with correct parent linkage
- Daemon survives macOS reboot and resumes processing
- No data loss on crash (atomic state persistence)
- PR descriptions include workstream breakdown, test results, and ticket links

---

## User Stories

### WS-DAEMON-10: Ticket Provider Abstraction Layer

As a team using Linear, I want the daemon to poll Linear for tickets so that I don't need to switch to Jira to use MG automation.

As a team using GitHub Issues, I want the daemon to poll GitHub Issues so that I can use MG automation with zero additional tooling.

As a developer configuring the daemon, I want to switch ticket providers by changing one config field so that I don't need to modify code.

### WS-DAEMON-11: MG Orchestration Engine

As a developer, I want the daemon to automatically plan workstreams from a ticket description so that implementation begins without manual intervention.

As a developer, I want the daemon to execute each workstream using `/mg-build` via `claude --print` so that code is written with tests, reviews, and quality gates.

### WS-DAEMON-12: Ticket Tracker Write-Back

As a project manager, I want subtasks created in my tracker for each workstream so that I can see progress without checking GitHub.

As a developer, I want PRs automatically linked to their source ticket so that traceability is maintained.

### WS-DAEMON-13: Mac Mini Setup & Process Hardening

As an ops engineer, I want the daemon to auto-start on boot so that the Mac Mini recovers from power outages without intervention.

As an ops engineer, I want log rotation so that disk space isn't exhausted by daemon logs.

### WS-DAEMON-14: Pipeline Observability & Safety

As a team lead, I want a dry-run mode so that I can preview what the daemon would do before enabling autonomous operation.

As a team lead, I want a dashboard showing in-flight tickets and PR status so that I can monitor pipeline health at a glance.

---

## Acceptance Criteria

### WS-DAEMON-10: Ticket Provider Abstraction

- [ ] `TicketProvider` interface exported from `daemon/src/providers/types.ts` with methods: `poll`, `createSubtask`, `transitionStatus`, `addComment`, `linkPR`
- [ ] `NormalizedTicket` type is the only ticket type the orchestrator consumes
- [ ] `JiraProvider` implements `TicketProvider`, wrapping existing `jira.ts` logic
- [ ] `LinearProvider` implements `TicketProvider` using Linear GraphQL API with API key auth
- [ ] `GitHubProvider` implements `TicketProvider` using `gh` CLI (zero new deps)
- [ ] Config schema updated: `"provider": "jira" | "linear" | "github"` field selects active provider
- [ ] Provider-specific config sections: `jira: {...}`, `linear: {...}`, `github: {...}` — only active provider's section is validated
- [ ] All three providers pass identical contract test suite (same test cases, parameterized by provider)
- [ ] Existing Jira-specific tests continue to pass (no regression)
- [ ] 99%+ test coverage on all provider code

### WS-DAEMON-11: MG Orchestration Engine

- [ ] `orchestrator.ts` module coordinates the full ticket-to-PR pipeline
- [ ] For each ticket: invokes `claude --print` with leadership-team planning prompt
- [ ] Parses planning output into structured workstreams (ID, name, acceptance criteria)
- [ ] For each workstream: creates git worktree, invokes `claude --print` with `/mg-build` prompt
- [ ] Captures stdout/stderr from each `claude` subprocess into daemon logs
- [ ] Timeout per `claude` invocation: configurable, default 30 minutes
- [ ] Failed workstream does not block other workstreams in the same ticket
- [ ] Orchestrator calls `TicketProvider.createSubtask()` for each planned workstream
- [ ] Final PR aggregates all workstream changes with structured description
- [ ] 99%+ test coverage with mocked `claude --print` subprocess

### WS-DAEMON-12: Ticket Tracker Write-Back

- [ ] `JiraProvider.createSubtask()` creates sub-task issue type linked to parent
- [ ] `LinearProvider.createSubtask()` creates sub-issue linked to parent
- [ ] `GitHubProvider.createSubtask()` creates issue with `parent: #N` reference in body
- [ ] `transitionStatus()` moves ticket through workflow (To Do → In Progress → In Review)
- [ ] `addComment()` posts progress updates to ticket (workstream started, completed, failed)
- [ ] `linkPR()` attaches PR URL to ticket (Jira: remote link, Linear: attachment, GitHub: cross-reference)
- [ ] All write-back operations are idempotent (safe to retry on failure)
- [ ] 99%+ test coverage

### WS-DAEMON-13: Mac Mini Setup & Process Hardening

- [ ] `launchd` plist template generated by `mg-daemon install` command
- [ ] Plist configures: auto-start on boot, restart on crash, working directory, stdout/stderr log paths
- [ ] `mg-daemon uninstall` removes the launchd service
- [ ] Log rotation: daemon.log capped at 10MB, 5 rotations (logrotate config or built-in)
- [ ] Heartbeat file updated every polling interval (`.mg-daemon/heartbeat`)
- [ ] Stale heartbeat (>3x polling interval) triggers alert in `mg-daemon status`
- [ ] Multi-project support: one daemon instance per project directory (PID files already scoped)
- [ ] `mg-daemon setup-mac` command: validates prerequisites (node, gh, claude CLI) and guides setup

### WS-DAEMON-14: Pipeline Observability & Safety

- [ ] `--dry-run` flag: polls tickets, runs planning, but does NOT execute builds, create PRs, or write back
- [ ] `mg-daemon dashboard` shows: in-flight tickets, workstream progress, PR URLs, last poll time
- [ ] Max concurrent `claude` subprocesses: configurable (`concurrency` field), default 1
- [ ] Rate limiting: configurable delay between ticket processing (`delayBetweenTicketsMs`)
- [ ] Notification hooks: `onPRCreated`, `onFailure` — shell commands executed with context env vars
- [ ] Error budget: if >N consecutive tickets fail, daemon pauses and alerts (configurable threshold)
- [ ] All observability features have tests

---

## Design Requirements

**UX Requirements:**
- CLI-only interface — no web UI. All interaction via `mg-daemon <command>`
- Config file is the single source of truth — no interactive prompts during operation
- Logs are structured (timestamp, level, ticket key, message) for grep-ability
- `mg-daemon dashboard` output fits in a standard 80-column terminal

**Accessibility Requirements:**
- N/A (CLI tool, no UI)

---

## Business Case

**Strategic fit:** This is the flagship autonomous mode for miniature-guacamole. It demonstrates that MG can run unattended, converting a backlog of tickets into reviewed PRs. This is the primary value proposition for teams adopting MG at scale.

**Opportunity:** Teams with large backlogs (100+ tickets) currently can't leverage MG without a developer in the loop. The daemon removes that constraint.

**Risks and assumptions:**
- `claude --print` subprocess model is validated (Phase 0 confirmed)
- Linear API is stable and well-documented (GraphQL, API key auth)
- GitHub Issues API via `gh` CLI covers all needed operations
- Claude Code token costs are acceptable for autonomous operation (user-managed)
- Assumes tickets are well-defined enough for autonomous planning (garbage in → garbage out)
