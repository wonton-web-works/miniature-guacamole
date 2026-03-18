# Product Requirements Document: WS-DAEMON-15 — Ticket Triage Gate

**GitHub Issue:** https://github.com/wonton-web-works/miniature-guacamole/issues/16
**Status:** Draft
**Author:** Product Manager
**Date:** 2026-03-18
**Depends on:** WS-DAEMON-10 (Provider Abstraction), WS-DAEMON-11 (Orchestration Engine)

---

## Problem

The MG daemon pipeline polls ticket trackers, plans workstreams via Claude, executes them, and creates PRs — all without any quality gate before committing resources. Every ticket that enters the poll result is attempted.

This blind processing has three concrete failure modes:

1. **Wasted API spend.** Planning and execution each invoke `claude --print`. A ticket that says "make it better" wastes 30+ minutes of Claude subprocess time and token budget before failing at the planning or build step.

2. **Junk PRs.** Vague or infeasible tickets produce PRs that fail review and erode trust in the daemon's output. Engineering leads begin ignoring PR notifications, which defeats the purpose of autonomous operation.

3. **Scope creep and safety risk.** Tickets intended for a different repo, or tickets touching authentication/secrets/migrations, can slip through and produce commits in areas the daemon should never touch autonomously.

The root cause is that `processTicket()` in `orchestrator.ts` goes directly from `poll()` to `planTicket()` — there is no step that asks "should this ticket be attempted at all?"

The fix is a discrete triage step: one short Claude call that evaluates each ticket against five criteria and produces a structured verdict before any planning or execution occurs.

---

## Users

- **Primary: Development teams running the daemon autonomously.** These teams have configured the daemon to process their backlog unattended. They review PRs, not first drafts. Their expectation is that every PR they see represents a real, completable ticket. Triage protects that expectation by filtering noise before it reaches their PR queue.

- **Secondary: Engineering leads monitoring pipeline health.** They watch the dashboard for pipeline output quality and error rates. Triage gives them visibility into why specific tickets were skipped — the daemon comments on the ticket with a reason, and the dashboard surfaces triage outcomes. Without triage, a skipped ticket is invisible; with triage, it is traceable.

---

## Success Criteria

- Triage verdicts are correct: a GO ticket proceeds to planning and produces a PR; a REJECT ticket never reaches planning; a NEEDS_CLARIFICATION ticket receives a comment with specific questions.
- Triage does not materially slow the pipeline: median triage latency is under 10 seconds per ticket (one short Claude call, no build step).
- Triage can be disabled with a single config change (`triage.enabled: false`) and the pipeline behaves identically to the pre-triage state — no regression.
- Triage comments are actionable: a developer reading a NEEDS_CLARIFICATION comment knows exactly what information to add for the ticket to pass on the next poll cycle.
- After triage ships, the rate of "empty workstream plan" failures in `processTicket()` drops measurably, because under-specified tickets are caught before planning.

---

## User Stories

### WS-DAEMON-15-A: Automatic filtering of out-of-scope tickets

As a development team using the daemon on a frontend repo, I want tickets intended for backend or infrastructure work to be rejected automatically so that the daemon does not attempt to implement backend changes in a frontend codebase.

**BDD Scenario — out-of-scope ticket rejected:**

```
Given the daemon polls and retrieves a ticket titled "Migrate Postgres to RDS"
  And the codebase is a TypeScript frontend repo with no database code
When triage evaluates the ticket
Then the verdict is REJECT
  And the daemon posts a comment on the ticket explaining the scope mismatch
  And the daemon applies a "mg-daemon:rejected" label
  And processTicket() is not called for this ticket
```

### WS-DAEMON-15-B: Requesting clarification on vague tickets

As a product manager, I want the daemon to ask clarifying questions on tickets that lack sufficient detail so that I can provide the missing information and have the ticket auto-processed on the next poll cycle.

**BDD Scenario — vague ticket triggers clarification request:**

```
Given the daemon polls and retrieves a ticket with description "fix the bug"
When triage evaluates the ticket
Then the verdict is NEEDS_CLARIFICATION
  And the daemon posts a comment listing specific missing details
    (e.g., "Which bug? What is the expected vs. actual behavior? Which file or component?")
  And the daemon applies a "mg-daemon:needs-clarification" label
  And processTicket() is not called for this ticket
```

**BDD Scenario — clarified ticket proceeds on next poll:**

```
Given a ticket previously labeled "mg-daemon:needs-clarification"
  And the description has been updated with the requested details
When the daemon polls and retrieves the ticket again
  And triage evaluates the updated ticket
Then the verdict is GO (assuming all other criteria pass)
  And the daemon removes the "mg-daemon:needs-clarification" label
  And the ticket proceeds to planning
```

### WS-DAEMON-15-C: Blocking daemon from touching sensitive areas

As an engineering lead, I want certain files and directories to be marked as off-limits so that the daemon never autonomously modifies authentication, secrets management, or database migration code.

**BDD Scenario — ticket touching sensitive paths is blocked:**

```
Given the config defines safeguarded paths: ["src/auth/**", "migrations/**", ".env*"]
  And the daemon retrieves a ticket: "Update JWT expiry to 24 hours"
When triage evaluates the ticket
Then the verdict is REJECT with reason "touches safeguarded path: src/auth"
  And a comment is posted explaining the daemon does not modify authentication code autonomously
  And the ticket is labeled "mg-daemon:rejected"
```

### WS-DAEMON-15-D: Rejecting tickets that are too large for autonomous implementation

As a development team, I want the daemon to decline tickets that describe multi-week epics so that I don't receive a PR for a partial, broken implementation of something that requires deliberate human design.

**BDD Scenario — oversized ticket rejected:**

```
Given the daemon retrieves a ticket whose description exceeds maxTicketSizeChars
  OR whose triage evaluation indicates multi-sprint scope
When triage evaluates the ticket
Then the verdict is REJECT with reason "ticket scope exceeds autonomous implementation threshold"
  And the daemon posts a comment suggesting the ticket be broken into smaller sub-tickets
```

### WS-DAEMON-15-E: Conservative mode — convert hard rejects to soft clarification requests

As an engineering lead who is cautious about autonomous rejections, I want `autoReject: false` to convert hard REJECT verdicts into NEEDS_CLARIFICATION so that the daemon never permanently skips a ticket without human review.

**BDD Scenario — autoReject: false downgrades REJECT to NEEDS_CLARIFICATION:**

```
Given the config has triage.autoReject: false
  And triage evaluates a ticket and reaches a REJECT verdict
When the triage module applies the autoReject override
Then the final outcome is NEEDS_CLARIFICATION, not REJECT
  And the comment explains why the ticket would have been rejected
    and asks the author to confirm or provide clarification
  And the label applied is "mg-daemon:needs-clarification", not "mg-daemon:rejected"
```

### WS-DAEMON-15-F: Disabling triage for backward compatibility

As a team that was using the daemon before WS-DAEMON-15 shipped, I want to disable triage entirely so that the pipeline behaves exactly as it did before.

**BDD Scenario — triage disabled, all tickets proceed:**

```
Given the config has triage.enabled: false
When the daemon polls and retrieves tickets
Then no triage call is made for any ticket
  And every ticket proceeds directly to processTicket() as before
  And no triage labels or comments are posted
```

### WS-DAEMON-15-G: Triage results visible in dashboard

As an engineering lead, I want the dashboard to show triage outcomes so that I can see at a glance how many tickets were skipped and why.

**BDD Scenario — dashboard surfaces triage stats:**

```
Given the daemon has processed 10 tickets in the last poll cycle
  And 4 were GO, 3 were NEEDS_CLARIFICATION, 3 were REJECT
When I run "mg-daemon dashboard"
Then the dashboard shows a triage summary row:
  "Triage: 4 GO / 3 needs-info / 3 rejected"
  And I can view the reason for each non-GO verdict
```

---

## Acceptance Criteria

### Triage module (`daemon/src/triage.ts`)

- [ ] `triageTicket(ticket, config, execClaudeFn)` function exported from `daemon/src/triage.ts`
- [ ] Return type is `TriageResult`: `{ verdict: 'GO' | 'NEEDS_CLARIFICATION' | 'REJECT'; reason: string; questions?: string[] }`
- [ ] Triage prompt wraps all ticket content in `<UNTRUSTED_TICKET_CONTENT>` tags (same pattern as `planner.ts`) to prevent prompt injection
- [ ] Triage prompt explicitly evaluates all five lenses: scope, clarity, feasibility, size, safety
- [ ] Triage prompt instructs Claude to output a structured response parseable without heuristics (e.g., `VERDICT: GO`, `REASON: <text>`, `QUESTIONS: <line-separated>`)
- [ ] `parseTriageResult(output: string): TriageResult` function exported and unit-tested in isolation
- [ ] Triage call uses a short timeout (configurable, default 30 seconds) — it is a classification call, not a build call
- [ ] If the triage Claude call fails or times out, the ticket is treated as NEEDS_CLARIFICATION (fail safe, not fail open)
- [ ] `execClaudeFn` is dependency-injectable (same pattern as `planner.ts`) for test isolation
- [ ] 99%+ test coverage on `triage.ts`

### Orchestrator integration (`daemon/src/orchestrator.ts`)

- [ ] `processTicket()` calls `triageTicket()` as step 0, before `transitionStatus('in_progress')` and before `planTicket()`
- [ ] If verdict is GO: pipeline continues unchanged
- [ ] If verdict is NEEDS_CLARIFICATION: `provider.addComment()` called with questions, `provider.applyLabel()` called with `"mg-daemon:needs-clarification"`, function returns early with `{ success: false, skipped: true, reason: 'needs_clarification' }`
- [ ] If verdict is REJECT and `autoReject: true`: `provider.addComment()` called with reason, `provider.applyLabel()` called with `"mg-daemon:rejected"`, function returns early with `{ success: false, skipped: true, reason: 'rejected' }`
- [ ] If verdict is REJECT and `autoReject: false`: behavior is identical to NEEDS_CLARIFICATION (downgrade to soft skip)
- [ ] Triage step is skipped entirely when `triage.enabled: false`
- [ ] `PipelineResult` type extended with `triageVerdict?: 'GO' | 'NEEDS_CLARIFICATION' | 'REJECT'` and `skipped?: boolean`
- [ ] All existing orchestrator tests continue to pass (no regression)
- [ ] New orchestrator tests cover all triage branches (GO, NEEDS_CLARIFICATION, REJECT, disabled, autoReject override)

### Config schema (`daemon/src/types.ts`)

- [ ] `DaemonConfig` extended with optional `triage?: TriageConfig` field
- [ ] `TriageConfig` interface: `{ enabled: boolean; autoReject: boolean; maxTicketSizeChars: number }`
- [ ] Defaults when `triage` key is absent: `{ enabled: true, autoReject: false, maxTicketSizeChars: 10000 }`
- [ ] `maxTicketSizeChars` pre-check runs before the Claude call — if `ticket.description.length > maxTicketSizeChars`, verdict is immediately REJECT (no Claude call needed)
- [ ] Config validation rejects `maxTicketSizeChars < 100` with a descriptive error

### Ticket provider integration

- [ ] `TicketProvider` interface extended with `applyLabel(ticketId: string, label: string): Promise<void>` and `removeLabel(ticketId: string, label: string): Promise<void>`
- [ ] `JiraProvider`, `LinearProvider`, and `GitHubProvider` each implement `applyLabel` and `removeLabel`
- [ ] Label operations are idempotent: applying an already-present label does not error; removing an absent label does not error
- [ ] Contract test suite updated to include `applyLabel` and `removeLabel` test cases

### Dashboard

- [ ] `mg-daemon dashboard` output includes a triage summary line showing counts by verdict for the most recent poll cycle
- [ ] Dashboard shows per-ticket triage reason for any ticket that was not GO

### Performance

- [ ] Median triage latency (wall clock, measured in tests with mocked Claude) is documented; real-world target is under 10 seconds per ticket
- [ ] Triage timeout is separate from `orchestration.claudeTimeout` and defaults to 30 seconds

### Backward compatibility

- [ ] Setting `triage.enabled: false` produces identical pipeline behavior to the pre-WS-DAEMON-15 state
- [ ] No breaking changes to `processTicket()` call signature or `PipelineResult` shape (only additive)

---

## Design Requirements

**UX Requirements:**

The triage gate is invisible to teams that don't need it and transparent to teams that do. Key interaction patterns:

- A ticket author who receives a NEEDS_CLARIFICATION comment should be able to read it, add the requested information to the ticket, and trust that the daemon will pick it up on the next poll cycle with no manual re-queuing. The comment must therefore be specific — not "this ticket lacks detail" but "please add: expected behavior, steps to reproduce, and the affected file or component."

- A REJECT comment must not feel hostile. It should explain the specific criterion that failed and, where possible, suggest remediation (e.g., "This ticket appears to span multiple repositories. Create a child ticket scoped to this repo and the daemon will pick it up.").

- The `triage.enabled: false` escape hatch must work with zero other config changes — it is a one-line rollback.

**Visual Requirements:**

CLI-only interface, consistent with the rest of the daemon. Triage comments posted to ticket trackers should use plain text with no markdown formatting assumptions (Jira, Linear, and GitHub Issues all render markdown differently). Structure comments with labeled sections instead:

```
[MG Daemon] This ticket was skipped — needs clarification

Criterion: Clarity
Issue: The description does not specify expected behavior or reproduction steps.

Please add the following to the ticket description:
- What is the current (broken) behavior?
- What is the expected behavior?
- Which file, component, or endpoint is affected?

This ticket will be picked up automatically on the next poll cycle once these details are added.
```

**Accessibility Requirements:**

N/A — CLI tool and ticket tracker comments, no UI.

---

## Business Case

**Strategic fit:** The daemon's value proposition is "PRs worth reviewing." A single junk PR from a vague ticket undermines confidence in the entire pipeline. Triage is the quality gate that makes the daemon's output trustworthy enough for engineering leads to keep PR notifications enabled. Without it, teams must whittle down the daemon's ticket scope manually, or disable it after the first bad experience.

The main daemon PRD itself acknowledges this risk with the note "garbage in, garbage out." Triage is the architectural answer to that acknowledged assumption.

**Opportunity:** The daemon is being adopted by teams with large backlogs. Backlogs are not uniformly well-specified — they contain epics, duplicates, out-of-scope items, and placeholders. A team that enables the daemon on a 100-ticket backlog without triage will likely see 20-40% of those tickets produce bad outcomes. Triage converts those outcomes from "failed PR" or "junk PR" into "comment requesting clarification" — a far more recoverable state.

**Expected impact:**

- Reduction in "Planning produced no workstreams" errors in `processTicket()` — triage catches the upstream cause.
- Reduction in failed or abandoned PRs — tickets that would have failed late in the pipeline are stopped early at a low cost (one short Claude call vs. a 30-minute build invocation).
- Increased engineering lead trust in daemon output — triage reasons surfaced in the dashboard make pipeline behavior legible.

**Risks and assumptions:**

- Triage accuracy depends on Claude's ability to evaluate the five lenses from ticket text alone, without codebase context. For ambiguous tickets, false positives (GO verdicts on tickets that should be NEEDS_CLARIFICATION) are more likely than false negatives. The `autoReject: false` default is calibrated for this — it prefers asking over rejecting when uncertain.
- The `applyLabel` and `removeLabel` additions to `TicketProvider` require implementation in all three providers (Jira, Linear, GitHub). If label operations are not available in a provider (e.g., a Linear plan restriction), the triage label step should fail silently and log a warning, not fail the triage verdict.
- Teams with fully curated, well-specified backlogs will see minimal benefit from triage. For them, `triage.enabled: false` is the appropriate default. Documentation should make the tradeoff clear.
- Prompt injection via ticket content is a real attack surface — a malicious ticket description could attempt to override triage instructions. The `<UNTRUSTED_TICKET_CONTENT>` wrapper (already established in `planner.ts`) must be applied consistently in the triage prompt.
