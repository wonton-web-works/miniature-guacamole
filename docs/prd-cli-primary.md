# PRD: CLI-Primary Architecture

**Status:** Approved — DEC-003
**Version:** v1.0
**Date:** 2026-03-16
**Workstreams:** WS-CLI-1 (active), WS-CLI-2 (deferred)

---

## The Problem

We built an MCP server for miniature-guacamole, shipped it at v0.1.0, and then never wired it into anything.

Zero agents consume it. Zero skills call it. It exposes workstream state as read-only MCP resources, but everything it does is already covered by the 17 `mg-*` bash scripts — which also handle writes. The MCP server is pure overhead: 80+ npm dependencies including `pg`, growing CVE surface with no mitigation plan, and a separate Node process to start and maintain.

At the same time, industry benchmarks show MCP is 10-32x more expensive in tokens than equivalent CLI calls, with 72% reliability vs 100% for CLI. We're paying that cost for nothing.

The `mg-*` scripts are already the real integration layer. The decision is to make that official: deprecate the MCP server, unify the scripts under a single `mg` router, and add `--json` output so agents and external tools can consume the output programmatically.

---

## Users

**Framework developers** — People working inside miniature-guacamole itself. They run `mg-workstream-status`, `mg-gate-check`, `mg-memory-read` daily. Right now each script is a separate invocation. A unified `mg` entry point is easier to tab-complete, document, and extend.

**Claude Code agents** — The product-manager, engineering-manager, dev, qa agents that orchestrate workstreams. They run CLI scripts to check state, read memory, and validate gates. They need structured output they can parse without screen-scraping.

**External integrations (future)** — CI pipelines or other tools that might call into miniature-guacamole. The `--json` flag covers this without any protocol overhead.

---

## Success Criteria

- `mcp-server/` directory is removed from the repo
- MCP-specific test assertions are cleaned up from `mg-memory-audit.bats`
- `mg <subcommand> [args]` dispatches correctly to each of the 17 existing scripts
- `mg workstream status WS-42 --json` returns valid, parseable JSON
- `mg-memory-read --json` and `mg-gate-check --json` return valid JSON
- All existing `mg-*` script behavior is unchanged — the router is a thin dispatcher
- Docs updated: MCP server page removed or archived, architecture diagram reflects CLI-primary model
- Version bumped to v2.1.0

---

## User Stories

**US-1:** As a framework developer, I want to run `mg help` and see a list of all available subcommands, so that I don't have to remember each individual script name.

**US-2:** As a framework developer, I want to run `mg workstream status WS-42` instead of `mg-workstream-status WS-42`, so that the CLI surface feels unified and I can tab-complete from a single entry point.

**US-3:** As a Claude Code agent, I want to run `mg workstream status WS-42 --json` and get structured JSON output, so that I can parse workstream state without screen-scraping formatted text.

**US-4:** As a framework developer, I want the mcp-server directory gone from the repo, so that we're not accumulating CVEs in 80+ unused dependencies.

**US-5:** As a framework developer, I want `mg gate-check --json` to return machine-readable gate status, so that CI scripts and agents can act on pass/fail without parsing human text.

---

## Acceptance Criteria

### WS-CLI-1: MCP Deprecation

- [ ] `mcp-server/` directory is deleted from the repo
- [ ] `docs/mcp-server.md` is removed or replaced with a deprecation notice pointing to CLI docs
- [ ] Sidebar and architecture docs no longer reference MCP as a live feature
- [ ] `mg-memory-audit.bats` passes cleanly with no MCP-specific assertions remaining
- [ ] No broken references to mcp-server in the remaining docs or build scripts

### WS-CLI-1: mg Router

- [ ] `mg` script installed alongside existing `mg-*` scripts during framework install
- [ ] `mg <subcommand> [args]` correctly dispatches to the corresponding `mg-<subcommand>` script
- [ ] `mg help` lists all available subcommands with one-line descriptions
- [ ] `mg help <subcommand>` proxies to `<subcommand> --help`
- [ ] Unknown subcommands exit 1 with a clear error message and suggestion to run `mg help`
- [ ] The router adds zero new dependencies (pure bash)
- [ ] All 17 existing `mg-*` scripts continue to work independently — the router does not break direct invocation

### WS-CLI-1: --json Flag

- [ ] `mg workstream status <ws-id> --json` outputs valid JSON with the same fields as human-readable output
- [ ] `mg memory read <file> --json` outputs the raw JSON content of the memory file
- [ ] `mg gate-check <ws-id> --json` outputs `{"gate": "PASS"|"FAIL", "reason": "..."}` or equivalent
- [ ] `--json` flag is documented in each script's `--help` output
- [ ] Human-readable output (no `--json`) is unchanged from current behavior
- [ ] Exit codes remain the same regardless of `--json` presence

### Version Bump

- [ ] `package.json` version updated to `2.1.0`
- [ ] `CHANGELOG.md` entry added for CLI-primary promotion

---

## BDD Scenarios

### MCP Deprecation

```
Given the mcp-server/ directory exists in the repo
When WS-CLI-1 is complete
Then mcp-server/ does not exist in the repo
And no test file references MCP-specific behavior
And docs no longer include a live MCP server page
```

### mg Router — Happy Path

```
Given the mg router is installed in .claude/scripts/
When a developer runs: mg workstream status WS-42
Then the router dispatches to mg-workstream-status WS-42
And the output is identical to running mg-workstream-status WS-42 directly
And the exit code is 0
```

### mg Router — Unknown Subcommand

```
Given the mg router is installed
When a developer runs: mg frobnicate
Then the router exits with code 1
And prints: "Unknown command: frobnicate"
And suggests: "Run 'mg help' to see available commands"
```

### mg Router — Help

```
Given the mg router is installed
When a developer runs: mg help
Then all 17 mg-* subcommand names are listed
And each has a one-line description
```

### --json Flag — Workstream Status

```
Given a workstream WS-42 with a valid state file in .claude/memory/
When a developer runs: mg workstream status WS-42 --json
Then the output is valid JSON
And it contains fields: workstream_id, name, status, phase, gate_status, coverage
And exit code is 0
```

### --json Flag — Gate Check Failure

```
Given a workstream WS-42 where tests are failing
When an agent runs: mg gate-check WS-42 --json
Then the output is valid JSON
And contains: {"gate": "FAIL", "reason": "tests failing: 3 failures"}
And exit code is 1
```

### --json Flag — Missing Workstream

```
Given no state file exists for WS-MISSING
When a developer runs: mg workstream status WS-MISSING --json
Then the output is valid JSON: {"error": "Workstream not found: WS-MISSING"}
And exit code is 1
```

---

## Phases

### Phase 1 — Cleanup (WS-CLI-1a)

Remove the dead weight first.

- Delete `mcp-server/`
- Remove MCP assertions from `mg-memory-audit.bats`
- Update docs (mcp-server.md, sidebar, architecture.md, index.md)
- Verify all tests still pass

Deliverable: clean repo with no MCP artifacts.

### Phase 2 — Router (WS-CLI-1b)

Build the `mg` dispatcher.

- Write `mg` bash script as a thin dispatcher
- Map subcommands to existing scripts
- Implement `mg help` and `mg help <subcommand>`
- Add tests for dispatch, unknown commands, help output

Deliverable: `mg workstream status WS-42` works.

### Phase 3 — JSON Output (WS-CLI-1c)

Add `--json` to the scripts agents need most.

- `mg-workstream-status --json`
- `mg-memory-read --json`
- `mg-gate-check --json`
- Add bats tests for JSON output and exit codes

Deliverable: agents can parse CLI output without screen-scraping.

### Phase 4 — Docs + Version Bump (WS-CLI-1d)

- Update architecture docs to describe CLI-primary model
- Update README / getting started
- Bump to v2.1.0

---

## Out of Scope

These are not part of this initiative:

- **cli2mcp adapter** — Deferred to v3.0. Only build if external demand materializes.
- **WS-CLI-2 observability layer** — Hook-based JSONL event log. Deferred. Only build if someone needs to tail events externally.
- **Adding new CLI commands** — This is about unifying and exposing what already exists, not building new functionality.
- **REST or GraphQL API** — Not under consideration. CLI is the contract.
- **--json on all 17 scripts** — Only the three agents use most: workstream-status, memory-read, gate-check. Others can get it later if needed.
- **Removing the mg-* direct scripts** — The router is additive. mg-workstream-status still works. We're not forcing a migration.

---

## Edge Cases

| Case | Mitigation |
|------|-----------|
| `mg` called from a directory with no `.claude/memory/` | Dispatcher passes args through; individual scripts handle the error and exit 1 with existing messages |
| `--json` passed to a script that doesn't support it yet | Script exits 1 with: "JSON output not supported for this command. Use human-readable output or update the script." |
| JSON output from `--json` contains newlines in string fields | Test explicitly for valid JSON parse, not just presence of `{` |
| Router installed but underlying script missing from PATH | Exit 1 with: "Command not found: mg-<subcommand>. Reinstall or run mg-help to see available commands." |
| User has a local `mg` binary elsewhere in PATH | Installer adds `.claude/scripts/` to PATH; document the resolution order |

---

## Dependencies

- No new npm dependencies. The router is bash.
- `jq` — already required by existing scripts.
- Existing 17 `mg-*` scripts must remain unchanged for the router to work correctly.
- Docs site build must not reference removed MCP pages in sidebar config.

---

## What Success Looks Like

Six months after shipping:

- No one mentions the MCP server. It's not in the onboarding docs, not in the install guide, not in agent prompts.
- Agents run `mg workstream status WS-42 --json` in skill flows without any wrapper code.
- New contributors learn one entry point (`mg`) instead of 17 independent scripts.
- The dependency count for the repo drops by 80+ packages and the CVE surface area for MCP-related packages goes to zero.
