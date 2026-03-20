# Daemon Configuration and Deployment Guide

The miniature-guacamole daemon (`mg-daemon`) is an autonomous pipeline that polls ticket trackers, plans workstreams, executes builds via Claude Code, and creates pull requests — all without human intervention.

This guide covers configuration, deployment, ticket provider setup, and troubleshooting.

---

## Table of Contents

1. [Configuration](#configuration)
2. [Config Schema Reference](#config-schema-reference)
3. [Ticket Provider Setup](#ticket-provider-setup)
4. [CLI Commands](#cli-commands)
5. [launchd Deployment (macOS)](#launchd-deployment-macos)
6. [Error Budget and Safety](#error-budget-and-safety)
7. [Runtime Files](#runtime-files)
8. [Post-PR Pipeline](#post-pr-pipeline)
9. [Troubleshooting](#troubleshooting)

---

## Configuration

The daemon reads its configuration from `.mg-daemon.json` at the project root. This file contains ticket provider credentials, polling settings, and orchestration parameters.

### Initializing Configuration

```bash
mg-daemon init
```

This creates a template `.mg-daemon.json` with placeholder values for all providers.

### File Permissions

The config file may contain API tokens and secrets. The daemon enforces **0o600 permissions** (owner read/write only) on `.mg-daemon.json`. If the file has group or world-readable bits set, the daemon automatically restricts permissions on load.

---

## Config Schema Reference

### Complete Example

```json
{
  "provider": "github",
  "jira": {
    "host": "https://your-domain.atlassian.net",
    "email": "you@example.com",
    "apiToken": "YOUR_JIRA_API_TOKEN",
    "project": "PROJ",
    "jql": "project = PROJ AND status = \"To Do\""
  },
  "linear": {
    "apiKey": "YOUR_LINEAR_API_KEY",
    "teamId": "YOUR_LINEAR_TEAM_ID",
    "filter": "state[name][eq]: \"Todo\""
  },
  "github": {
    "repo": "owner/repository",
    "baseBranch": "main",
    "issueFilter": "label:mg-daemon state:open"
  },
  "polling": {
    "intervalSeconds": 300,
    "batchSize": 5
  },
  "orchestration": {
    "claudeTimeout": 1800000,
    "concurrency": 1,
    "delayBetweenTicketsMs": 5000,
    "dryRun": false,
    "errorBudget": 3
  },
  "triage": {
    "enabled": true,
    "autoReject": false,
    "maxTicketSizeChars": 10000
  }
}
```

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | `"jira" \| "linear" \| "github"` | Yes | Active ticket provider. Only this provider's config section is validated. |

### Jira Configuration (`jira`)

Required when `provider` is `"jira"`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `jira.host` | string | Yes | Jira instance URL (e.g., `https://your-domain.atlassian.net`). Must be a valid URL, no trailing slash. |
| `jira.email` | string | Yes | Email associated with your Jira account. |
| `jira.apiToken` | string | Yes | Jira API token. Generate at: https://id.atlassian.com/manage-profile/security/api-tokens |
| `jira.project` | string | Yes | Jira project key (e.g., `PROJ`, `DEV`). |
| `jira.jql` | string | Yes | JQL query to find work items (e.g., `project = PROJ AND status = "To Do"`). |

### Linear Configuration (`linear`)

Required when `provider` is `"linear"`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `linear.apiKey` | string | Yes | Linear API key. Generate at Settings > API in Linear. |
| `linear.teamId` | string | Yes | Linear team ID. Find in team settings URL. |
| `linear.projectId` | string | No | Optional project ID to scope queries. |
| `linear.filter` | string | Yes | Filter expression for issue queries. |

Linear uses a GraphQL API (`https://api.linear.app/graphql`) with Bearer token authentication.

### GitHub Configuration (`github`)

Always required (used for PR creation regardless of ticket provider).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `github.repo` | string | Yes | Repository in `owner/name` format. |
| `github.baseBranch` | string | Yes | Base branch for PRs (usually `main`). |
| `github.issueFilter` | string | No | Search filter for `gh issue list --search` (e.g., `label:mg-daemon state:open`). |

The GitHub provider uses the `gh` CLI exclusively (zero additional dependencies). Priority is determined by labels: `priority:critical`, `priority:high`, `priority:medium`, `priority:low`.

### Polling Configuration (`polling`)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `polling.intervalSeconds` | number | Yes | 300 | How often to check for new tickets (in seconds). |
| `polling.batchSize` | number | Yes | 5 | Maximum tickets to process per poll cycle. |

### Orchestration Configuration (`orchestration`)

Optional. Controls build execution behavior.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `claudeTimeout` | number | 1800000 | Timeout for Claude calls in milliseconds (default: 30 minutes). |
| `concurrency` | number | 1 | Maximum concurrent ticket processing. |
| `delayBetweenTicketsMs` | number | 5000 | Delay between processing tickets (in ms). |
| `dryRun` | boolean | false | When true, polls and plans but does not execute builds or create PRs. |
| `errorBudget` | number | 3 | Consecutive failures before auto-pause. |

### Triage Configuration (`triage`)

Optional. Controls the ticket triage gate that runs before planning.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `triage.enabled` | boolean | true | Enable/disable the triage gate. |
| `triage.autoReject` | boolean | false | Automatically reject tickets that fail triage (vs. requesting info). |
| `triage.maxTicketSizeChars` | number | 10000 | Maximum ticket description size in characters. |

---

## Ticket Provider Setup

### GitHub (Recommended for Getting Started)

GitHub Issues is the simplest provider to set up — it uses the `gh` CLI already installed on most developer machines.

**Prerequisites:**
- `gh` CLI installed and authenticated (`gh auth login`)
- Repository with GitHub Issues enabled

**Configuration:**
```json
{
  "provider": "github",
  "github": {
    "repo": "your-org/your-repo",
    "baseBranch": "main",
    "issueFilter": "label:mg-daemon state:open"
  }
}
```

**Priority mapping:** Add labels to issues to control priority:
- `priority:critical` — Processed first
- `priority:high`
- `priority:medium` (default if no label)
- `priority:low`

**Status tracking:** The daemon uses labels for status transitions: `status:todo`, `status:in_progress`, `status:in_review`, `status:done`.

**Auth requirements:** The `gh` CLI must be authenticated with access to the target repository. Run `gh auth status` to verify.

### Jira

**Prerequisites:**
- Jira Cloud instance (Jira Server/DC may work but is untested)
- API token for your Jira account

**Generate an API token:**
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Copy the token value

**Configuration:**
```json
{
  "provider": "jira",
  "jira": {
    "host": "https://your-domain.atlassian.net",
    "email": "you@example.com",
    "apiToken": "ATATT3xFfGF...",
    "project": "PROJ",
    "jql": "project = PROJ AND status = \"Ready for Dev\""
  }
}
```

**Auth requirements:** Uses Basic auth with email + API token. The token must have read/write access to the configured project.

### Linear

**Prerequisites:**
- Linear workspace with API access enabled
- API key (personal or workspace-level)

**Generate an API key:**
1. Go to Linear Settings > API
2. Create a personal API key
3. Copy the key value

**Configuration:**
```json
{
  "provider": "linear",
  "linear": {
    "apiKey": "lin_api_...",
    "teamId": "TEAM-ID-HERE",
    "filter": "state[name][eq]: \"Todo\""
  }
}
```

**Auth requirements:** Uses Bearer token authentication against the Linear GraphQL API. The API key must have access to the configured team.

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `mg-daemon init` | Create a template `.mg-daemon.json` config file. |
| `mg-daemon start` | Start the daemon in background mode. Prints PID. |
| `mg-daemon start --foreground` | Run in foreground with stdout logging. |
| `mg-daemon start --dry-run` | Poll and plan, but skip builds and PR creation. |
| `mg-daemon stop` | Gracefully stop the daemon. |
| `mg-daemon status` | Show running state, PID, uptime, and heartbeat status. |
| `mg-daemon logs` | Show last 50 lines from daemon.log. |
| `mg-daemon logs --tail 100` | Show last N lines from daemon.log. |
| `mg-daemon install` | Install as a macOS launchd service. |
| `mg-daemon install --user mg-daemon` | Install with a dedicated system user. |
| `mg-daemon uninstall` | Remove the launchd service. |
| `mg-daemon setup-mac` | Check prerequisites (node, gh, claude, git). |
| `mg-daemon setup-user` | Create a dedicated `mg-daemon` system user. |
| `mg-daemon dashboard` | Show real-time pipeline status in ASCII. |
| `mg-daemon resume` | Reset error budget and resume processing. |

---

## launchd Deployment (macOS)

The daemon runs as a macOS launchd user agent for persistent, crash-resilient operation.

### Installing the Service

```bash
mg-daemon install
```

This generates a plist file and writes it to:

```
~/Library/LaunchAgents/com.mg-daemon.<project-name>.plist
```

Then loads it via `launchctl load`.

### Plist Configuration

The generated plist includes these key settings:

| Key | Value | Description |
|-----|-------|-------------|
| `RunAtLoad` | `true` | Auto-start when the user logs in or on boot. |
| `KeepAlive` | `true` | Automatically restart if the process exits or crashes. |
| `ThrottleInterval` | `30` | Minimum seconds between restart attempts (prevents tight crash loops). |
| `ProcessType` | `Background` | macOS scheduler hint — won't compete with foreground apps. |
| `LowPriorityIO` | `true` | Reduces I/O priority to avoid starving the system. |

### Environment Variables

launchd runs with a minimal environment (`/usr/bin:/bin:/usr/sbin:/sbin`). The daemon plist injects:

- **PATH**: Includes `/opt/homebrew/bin` (Apple Silicon Homebrew), `/usr/local/bin` (Intel Homebrew), plus the user's current PATH at install time. This ensures `gh`, `claude`, `git`, and `node` are all discoverable.
- **HOME**: Set to the installing user's home directory. Required for `gh` auth, SSH keys, and `~/.claude` configuration.

### Log Paths

| File | Path | Description |
|------|------|-------------|
| stdout | `.mg-daemon/daemon.log` | Main daemon log output (rotated at 10 MB, 5 rotations). |
| stderr | `.mg-daemon/daemon.err` | Stderr capture for unexpected errors. |

### Working Directory

The plist sets `WorkingDirectory` to the project root, so all relative paths (`.mg-daemon/`, `.claude/`) resolve correctly.

### Dedicated System User

For production deployments, run the daemon as a dedicated user to limit blast radius:

```bash
# Create the user (requires sudo)
sudo mg-daemon setup-user

# Install with the dedicated user
mg-daemon install --user mg-daemon
```

The dedicated user runs with a `UserName` key in the plist, restricting file access to only what the daemon needs.

### Uninstalling

```bash
mg-daemon uninstall
```

This runs `launchctl unload` and removes the plist file from `~/Library/LaunchAgents`.

---

## Error Budget and Safety

### Error Budget

The daemon tracks consecutive failures. After **3** consecutive failures (configurable via `orchestration.errorBudget`), processing is automatically paused.

**State file:** `.mg-daemon/error-budget.json`

```json
{
  "consecutiveFailures": 0,
  "paused": false,
  "lastFailure": "2026-03-19T22:11:41.198Z",
  "pausedAt": null
}
```

- **On success:** Resets `consecutiveFailures` to 0. Does NOT auto-resume if paused.
- **On failure:** Increments counter. If threshold reached, sets `paused: true`.
- **To resume:** Run `mg-daemon resume` to clear the pause flag and reset failures.

When paused, the daemon continues running its poll loop but skips all ticket processing, logging:
```
ERROR BUDGET EXHAUSTED — daemon paused. Run "mg-daemon resume" to continue.
```

### Emergency Stop

Create the sentinel file to halt the daemon immediately:

```bash
touch .mg-daemon/STOP
```

The daemon checks for `.mg-daemon/STOP` at the start of every poll cycle. If it exists, the cycle is skipped entirely. Remove the file to resume:

```bash
rm .mg-daemon/STOP
```

### Disk Space Guard

The daemon refuses to create worktrees if free disk space drops below **5 GB**. This prevents the daemon from filling the disk during large builds.

### Heartbeat Monitoring

The daemon writes a heartbeat file (`.mg-daemon/heartbeat`) after every poll cycle. The `mg-daemon status` command checks heartbeat freshness — if the heartbeat is stale (older than the polling interval), it warns that the daemon may be unresponsive.

---

## Runtime Files

All runtime state lives in the `.mg-daemon/` directory at the project root:

| File | Description |
|------|-------------|
| `daemon.log` | Main log file (rotated at 10 MB, max 5 rotations). |
| `daemon.err` | Stderr capture. |
| `daemon.pid` | Process ID file for the running daemon. |
| `error-budget.json` | Current error budget state (failure count, pause status). |
| `heartbeat` | Timestamp of the last successful poll cycle. |
| `dry-run` | Marker file — presence indicates dry-run mode. |
| `STOP` | Emergency stop sentinel — presence halts all processing. |
| `worktrees/` | Git worktrees created for ticket processing. Each ticket gets an isolated worktree. |
| `.claude/memory/workstream-{id}-state.json` | Lifecycle state for each workstream (phase, track, review results, merge results). |
| `.claude/memory/decisions.json` | Append-only log of leadership review decisions. |

---

## Post-PR Pipeline

After creating a draft PR, the daemon enters the post-PR pipeline: code review, merge automation, and state synchronization. This section describes what happens at each stage.

### Code Review

Once a PR is created, the daemon invokes Claude with a leadership review prompt against the diff. Claude's response is parsed for one of two decisions:

- **APPROVED** — the changes meet quality standards and are ready to merge
- **REQUEST_CHANGES** — the changes need revision before merging

Review routing depends on the workstream track:

| Track | Review behavior |
|-------|-----------------|
| MECHANICAL | All tests passed during execution — auto-approved, leadership review is skipped |
| ARCHITECTURAL | Always requires full leadership review — no auto-approval |

Review results (decision, rationale, timestamp) are stored in daemon state and appended to `.claude/memory/decisions.json`.

### Merge Automation

The daemon acts on the review decision automatically.

**On APPROVED:**

The daemon merges the PR branch into the base branch and cleans up the worktree. The workstream state transitions to `merged`.

**On REQUEST_CHANGES:**

The daemon extracts the specific feedback from the review response and loops back to the dev agent with targeted fix instructions. The dev agent pushes new commits to the existing PR branch. After the fix, the daemon re-requests leadership review.

This fix-and-re-review loop has a maximum of **2 rejection cycles**. After 2 rejections the daemon escalates to a human.

**Escalation:**

When the rejection limit is reached, the daemon leaves the PR open as a draft and posts an escalation comment summarizing the review history and outstanding feedback. No further automated action is taken on that workstream — a human must intervene.

Example escalation comment:

```
mg-daemon: Escalating to human review after 2 rejected cycles.

Final review feedback:
  - The retry logic in fetchUser() does not handle 429 responses
  - Test coverage for the error branch is missing

Please review the PR and either merge, close, or push a fix manually.
```

### Lifecycle State Sync

The daemon writes state files at every phase transition so that the pipeline is observable and resumable.

**Phases:**

```
planning → executing → reviewing → approved / changes_requested → merged / failed
```

**Files written:**

`.claude/memory/workstream-{id}-state.json` — updated at every transition:

```json
{
  "workstreamId": "WS-42",
  "track": "ARCHITECTURAL",
  "phase": "merged",
  "prNumber": 187,
  "reviewDecision": "APPROVED",
  "reviewCycles": 1,
  "mergedAt": "2026-03-20T14:22:11.000Z"
}
```

`.claude/memory/decisions.json` — append-only log, one entry per review decision:

```json
[
  {
    "workstreamId": "WS-42",
    "decision": "REQUEST_CHANGES",
    "cycle": 1,
    "rationale": "Missing error handling for 429 responses.",
    "timestamp": "2026-03-20T14:18:03.000Z"
  },
  {
    "workstreamId": "WS-42",
    "decision": "APPROVED",
    "cycle": 2,
    "rationale": "Retry logic and tests look good.",
    "timestamp": "2026-03-20T14:22:08.000Z"
  }
]
```

Tracker subtask statuses are updated in the ticket provider at each transition (In Progress, Complete, Blocked).

### Full Pipeline Diagram

```
Ticket → Triage → Plan → Execute → PR → Review → Merge → State Sync
                                         |
                                         v (if rejected)
                                    Fix → Re-review (max 2x)
                                         |
                                         v (if still rejected)
                                    Escalate to human
```

---

## Troubleshooting

### PATH Issues: Commands Not Found

**Symptom:** Daemon logs show `gh: command not found`, `claude: command not found`, or `node: command not found`.

**Cause:** launchd runs with a minimal PATH (`/usr/bin:/bin:/usr/sbin:/sbin`). If the daemon was installed before Homebrew tools were available, the PATH in the plist may be incomplete.

**Fix:**
1. Ensure the tools are installed and accessible in your current shell:
   ```bash
   which gh claude node git
   ```
2. Re-install the launchd service to capture your current PATH:
   ```bash
   mg-daemon uninstall
   mg-daemon install
   ```
3. Verify the plist contains the correct PATH:
   ```bash
   cat ~/Library/LaunchAgents/com.mg-daemon.*.plist | grep -A1 PATH
   ```

### Authentication Failures

**Symptom:** `401 Unauthorized`, `gh auth error`, or `token invalid` errors in daemon.log.

**Jira auth failure:**
- Verify your API token is still valid at https://id.atlassian.com/manage-profile/security/api-tokens
- Check that `jira.email` matches the account that generated the token
- Ensure `jira.host` uses HTTPS (HTTP is rejected by validation)

**GitHub auth failure:**
- Run `gh auth status` to check authentication
- If using a PAT, ensure it has `repo` scope
- The `gh` CLI must be authenticated as the user running the daemon (check HOME env var)

**Linear auth failure:**
- Verify the API key is still active in Linear Settings > API
- Ensure the key has access to the configured team

### Crash Recovery

**Symptom:** Daemon stops running unexpectedly.

The launchd service has `KeepAlive` set to `true`, so macOS automatically restarts the daemon if it crashes. The `ThrottleInterval` of 30 seconds prevents tight restart loops.

**Check if the service is loaded:**
```bash
launchctl list | grep mg-daemon
```

**Check daemon status:**
```bash
mg-daemon status
```

**Review logs for crash cause:**
```bash
mg-daemon logs --tail 100
cat .mg-daemon/daemon.err
```

**If the daemon is paused due to error budget exhaustion:**
```bash
mg-daemon resume
```

### Error Budget Exhaustion

**Symptom:** Daemon is running but not processing tickets. Logs show "ERROR BUDGET EXHAUSTED".

**Diagnose:**
```bash
cat .mg-daemon/error-budget.json
```

**Fix the underlying issue** (check logs for the 3 consecutive failures), then resume:
```bash
mg-daemon resume
```

### Stale Heartbeat Warning

**Symptom:** `mg-daemon status` shows "WARNING: Heartbeat is stale. Daemon may be unresponsive."

**Possible causes:**
- Daemon process is stuck (e.g., waiting on a long Claude call)
- Daemon was killed without launchd noticing
- Polling interval is very long and the daemon hasn't completed a cycle yet

**Fix:**
```bash
mg-daemon stop
mg-daemon start --foreground  # Run in foreground to observe behavior
```

### Worktree Cleanup

**Symptom:** Stale worktrees accumulating in `.mg-daemon/worktrees/`.

The daemon cleans up worktrees after each ticket, but if a crash occurs mid-processing, orphaned worktrees may remain.

**Manual cleanup:**
```bash
# List worktrees
git worktree list

# Remove orphaned worktrees
git worktree prune
rm -rf .mg-daemon/worktrees/<stale-worktree>
```
