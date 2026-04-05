# Git Hygiene Protocol — Fetch Before Work

**Version:** 1.0
**Status:** MANDATORY for all agents and skills that touch versioned repositories
**Origin:** Introduced 2026-04-05 after a near-miss where work was built on a wonton repo that was 6 commits behind origin. One of those commits (`774e14f`) was a large self-hosting infrastructure change that could have forced major rework. The divergence was only caught by luck — the conflicts were orthogonal. This protocol exists so that next time we don't need luck.

---

## The Rule

**Before reading for decisions, editing, committing, or amending in any git-versioned repository, the agent MUST snapshot the repo state.** The snapshot is two commands:

```bash
git fetch
git status -sb
```

This is **non-negotiable**. It cannot be skipped for "trivial" changes, "quick fixes", or "I already know what state it's in". A stale working tree is the cheapest bug to prevent and one of the most expensive to unwind.

---

## Divergence Handling

After `git fetch && git status -sb`, read the `## branch...origin/branch` header and take the correct action:

| State | Meaning | Action |
|-------|---------|--------|
| `## main` (no tracking) | Local only | Proceed normally |
| `## main...origin/main` | Equal to origin | Proceed normally |
| `## main...origin/main [ahead N]` | Local ahead only | Proceed normally |
| `## main...origin/main [behind N]` | **Local behind** | **STOP.** Report to orchestrator/user. Do not start work. User decides: fast-forward pull, rebase, or merge. |
| `## main...origin/main [ahead N, behind M]` | **Diverged** | **STOP.** Escalate to user. Never auto-rebase without explicit approval. |

"Proceed normally" still means you must have run the commands. The read itself is the gate, not the outcome.

---

## Additional Requirements

### 1. Amend safety

Before any `git commit --amend`, re-run `git fetch && git status -sb`. A fresh fetch is cheap; an amend on stale history that has already been shared is painful. If anyone else has touched the branch on origin, do NOT amend — create a new commit and escalate.

### 2. Cross-repo workstreams

If a workstream touches **multiple repositories** (e.g. a client project plus a shared library repo, or a frontend repo plus a backend repo), fetch **all of them** at session start — not just the primary. Report divergence state for each repo before starting work. A stale sibling repo will bite you just as hard as a stale primary.

### 3. Read-for-decisions

When reading code to make architectural decisions (not just to understand the local working tree), and the local branch is not equal to `origin/<branch>`, prefer `git show origin/<branch>:path/to/file` over the working-tree version. Architectural decisions should be based on the shared reality (origin), not one worktree's drift.

### 4. Red-flag phrases — mandatory fetch trigger

Any of these phrases in a user request are a mandatory trigger for a fresh `git fetch && git status -sb` on every repo in scope, even if you already fetched earlier in the session:

- "continue the workstream"
- "finish up"
- "pick up where we left off"
- "push it"
- "keep going"
- "ship it"
- anything that assumes continuity from a prior session

These phrases imply time has passed and someone else may have moved origin. Verify before you build on top of it.

### 5. Session-start discipline

At the start of every agent session that will touch a git repo, the **first** tool call on that repo should be `git fetch && git status -sb`. Not the second. Not after "orienting". First.

---

## Why This Exists (the anecdote)

On 2026-04-05, during a client-portal workstream, an agent opened a wonton repo and started building. No fetch. The local branch was six commits behind origin. One of those six was a large self-hosting infrastructure commit (`774e14f`) that could have forced major rework if it had touched adjacent files. It didn't — pure luck.

A two-command snapshot at session start would have caught it. The cost of that snapshot is ~1 second and three lines of terminal output. The cost of not doing it is an unbounded rework bill paid by whoever reviews the PR.

---

## Enforcement

Skills and agents that reference this protocol are process-bound by it. Skipping the fetch step is a **process violation** that:

1. Blocks work at the next review gate
2. Requires a written acknowledgment in memory before work can resume
3. Counts as a repeat finding if it happens twice in the same workstream

Code review agents must verify the reviewed changes are based on current `origin/<branch>`, not stale history. A PR built on a stale base is a REQUEST_CHANGES, not an APPROVE.
