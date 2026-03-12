---
name: mg-ticket
description: "File a GitHub Issue from a CLI or co-work session. Attaches MG version, current workstream, and recent errors automatically."
model: sonnet
allowed-tools: Bash, Read, Glob
compatibility: "Requires Claude Code and gh CLI"
metadata:
  version: "1.0.0"
---

# mg-ticket

Files a GitHub Issue directly from a Claude Code session. Assembles context automatically — MG version, current workstream, recent errors — and posts via `gh issue create`.

## Constitution

1. **Context attachment** - Auto-attach MG version (from package.json), current workstream, and recent errors before filing. User should not have to hunt for this.
2. **gh dependency** - This skill requires `gh` (GitHub CLI). Check it is installed and authenticated before attempting to create an issue.
3. **Graceful degradation** - If `.claude/memory/` is missing or unreadable, skip context attachment and proceed without it. Never block issue creation because of missing context.
4. **Template system** - Apply `--bug`, `--feature`, or `--question` templates to set labels and body structure. Default = `--bug` when no flag given.
5. **Title truncation** - The issue title is the first 100 chars of the description. When the description exceeds 100 chars, the title is capped at 100 chars but the full description goes into the issue body.
6. **Visual standards** - Follow `_shared/output-format.md` for all output. Works identically whether invoked from CLI or as a sub-skill inside a co-work session (mg-build, mg-debug, etc.).

## Usage

```
/mg-ticket <description>
/mg-ticket --bug <description>
/mg-ticket --feature <description>
/mg-ticket --question <description>
```

Default = `--bug` when no flag is provided.

## Templates

### --bug (default)

Applies label: `bug`

Issue body structure:
- **Description** — the description passed by the user
- **Steps to reproduce** — numbered repro steps placeholder
- **Expected behavior** — what should happen
- **Actual behavior** — what actually happens
- **Context** — auto-attached MG version, current workstream, recent errors

### --feature

Applies label: `enhancement`

Issue body structure:
- **Description** — the description passed by the user
- **Use case / motivation** — why this feature is needed, who benefits
- **Proposed behavior** — how it should work
- **Context** — auto-attached MG version, current workstream

### --question

Applies label: `question`

Issue body structure:
- **Description** — the description passed by the user
- **Background / context** — relevant background for the discussion
- **What we've tried** — prior investigation or approaches
- **Context** — auto-attached MG version, current workstream

All three templates produce different labels (`bug`, `enhancement`, `question`) and distinct body sections tailored to the issue type.

## Context Assembly

Before filing, the skill assembles a context block to attach to the issue body:

1. **MG version** — read from `package.json` at the project root. Attached as `mg-version: <version>`.
2. **Current workstream** — read from `.claude/memory/`. Looks for the most recently modified `workstream-*-state.json`. Attached as `workstream: <id>`.
3. **Recent errors** — if recent errors are present in session context or `.claude/memory/`, errors are attached to the issue body under a `## Recent Errors` section.

Graceful omission rules:
- If `package.json` is missing or unreadable, omit the `mg-version` line.
- If `.claude/memory/` is not found or no workstream file exists, omit the workstream line. Context becomes unavailable / context attachment is skipped — the skill proceeds in degraded mode without crashing.
- If no workstream is active, `no workstream` is noted but does not block filing.
- Workstream context is omitted gracefully rather than erroring out.

## Error Handling

### `gh` not installed

If `gh` is not found in PATH:

```
Error: gh is not installed or not in PATH.
Install it from https://cli.github.com/ then re-run /mg-ticket.

Manual fallback URL: https://github.com/<owner>/<repo>/issues/new
```

The skill surfaces the error and provides the manual fallback URL so the user can file the issue themselves without the CLI.

### `gh` not authenticated

If `gh auth status` fails:

```
Error: gh is not authenticated with GitHub.
Run: gh auth login
Then re-run /mg-ticket.

Authentication is required to create issues via the GitHub CLI.
```

### Empty or missing description

If no description is provided or the description is an empty string / blank description:

```
Usage: /mg-ticket <description>
       /mg-ticket --bug <description>

A description is required. Please describe the issue in a few words.
```

The skill emits a usage hint and stops — it does not create an issue with an empty title.

### Unknown flag

If the user passes a flag that is not `--bug`, `--feature`, or `--question`:

```
Error: unrecognized flag "<flag>".
Valid flags: --bug, --feature, --question
Default (no flag): --bug
```

### Description over 500 chars

If the description exceeds 500 chars, the skill truncates it to 500 chars with a warning before filing:

```
Warning: description exceeds 500 chars — truncated to 500 chars for the issue title and body preview.
The full text is preserved in the issue body.
```

## Issue Creation Flow

```
Step 1: Validate inputs (description, flag)
Step 2: Check gh installed + authenticated
Step 3: Assemble context from package.json + .claude/memory/
Step 4: Select template (--bug / --feature / --question)
Step 5: Build issue title (first 100 chars) + full body
Step 6: Preview assembled issue body — show title, labels, and full body to the user and ask for confirmation before filing. No memory content is posted publicly without the user seeing it first.
Step 7: gh issue create --title "<title>" --body "<body>" --label "<label>" (only after confirmation)
Step 8: Write issue record to .claude/memory/tickets.json
Step 9: Return issue URL to user
```

On success, `gh issue create` prints the issue URL (e.g., `https://github.com/<owner>/<repo>/issues/<n>`). The skill returns that URL so the user can open it immediately.

## Memory Protocol

On successful issue creation, write a record to `.claude/memory/tickets.json`:

```yaml
# Write on success
write: .claude/memory/tickets.json
  - url: <issue URL>
    type: bug | feature | question
    description: <first 100 chars>
    filed_at: <timestamp>
```

If `.claude/memory/` does not exist, skip the write silently (graceful degradation).

## Boundaries

**CAN:** Read package.json and .claude/memory/ for context, run `gh issue create` via Bash, apply templates, truncate titles to 100 chars, preview assembled issue body for user confirmation, write issue records to .claude/memory/tickets.json, return issue URL on success
**CANNOT:** Push code, create PRs, modify repository settings, run destructive gh commands
**ESCALATES TO:** engineering-manager if issue filing is blocked by repo permissions or org policy
