# WS-PITCH-07: Demo Environment Setup
# TheEngOrg $3M Seed Pitch

**Prepared by:** CTO
**Date:** 2026-03-22
**Classification:** Internal / Confidential

---

## Decision: Staged Project, Real Execution

```
[CTO] Decision: Use a staged demo project with real TheEngOrg execution — not a mock, not a production client repo.
[CTO] Alternatives considered:
      A) Real client pilot repo — authentic but risks exposing client code, NDA issues, unpredictable codebase state
      B) TheEngOrg's own repo — authentic but too meta ("a demo of the product built by the product")
      C) Staged demo project with real execution — controlled scenario, real agent behavior, reproducible
[CTO] Rationale: Option C gives full control over the drift scenario while running real agents. The output is genuine — Sage actually reads the spec, actually detects the drift, actually produces the recovery plan. The scenario is staged; the execution is real.
[CTO] Migration path: If a VC asks "is this staged?" the answer is honest: "The scenario is staged. The execution is real. I can run it on any codebase — including yours." Option to pivot to WS-DEMO-03 (alternate drift) proves this is not canned output.
```

---

## Demo Project: `acme-api`

### Repository Structure

Create a minimal but realistic Node.js API project:

```
~/demo/acme-api/
  .claude/
    agents/         (full enterprise install — includes sage/)
    skills/
    shared/
    memory/
      workstream-DEMO-01-state.json    (workstream: rate limiting)
      agent-leadership-decisions.json  (approved spec for WS-DEMO-01)
      project-context-acme.md          (project context snapshot)
  src/
    routes/
      api.ts          (existing API routes)
      rate-limiter.ts  (developer's WIP — contains the injected drift)
    middleware/
      auth.ts          (existing auth middleware — the drift touches this)
    db/
      connection.ts
  tests/
    routes/
      api.test.ts
  package.json
  tsconfig.json
  README.md
```

### Pre-Staged State

**The approved spec (in memory):**
- WS-DEMO-01: "Add rate limiting to the public API"
- Acceptance criteria: sliding window rate limiter, 100 requests/minute per API key, 429 response with Retry-After header
- Scope: `src/routes/rate-limiter.ts` and `tests/routes/rate-limiter.test.ts` only
- Explicitly out of scope: authentication changes, token management, middleware modifications

**The injected drift (in code):**
- `src/routes/rate-limiter.ts` contains ~40 lines of rate limiting logic AND ~25 lines of auth token rotation logic
- The auth rotation imports from `src/middleware/auth.ts` and modifies the token refresh flow
- This is realistic drift — a developer who thought "while I am in here, the rate limiter needs to know about token expiry, so let me add rotation"

**The second drift scenario (backup):**
- WS-DEMO-03: "Add database connection pooling"
- Developer added a caching layer (Redis) inside the connection pool manager
- Same pattern: legitimate feature, unauthorized scope expansion

### GH Issues (pre-created)

```
#1  WS-DEMO-01: Add rate limiting to public API         [open, labeled mg-daemon]
#2  WS-DEMO-02: (does not exist yet — Sage will recommend creating it)
#3  WS-DEMO-03: Add database connection pooling          [open, labeled mg-daemon]
```

---

## Terminal Configuration

### Display Settings

| Setting | Value | Reason |
|---------|-------|--------|
| Font | JetBrains Mono | Matches brand, renders `[ROLE]` prefixes cleanly |
| Font size | 18pt | Readable from 15 feet / projector |
| Theme | Dark (#171E28 background) | Matches deck slides |
| Terminal app | iTerm2 or Ghostty | Full ANSI color support for agent prefixes |
| Columns | 100 | Wide enough for full output lines, narrow enough to prevent wrap |
| Rows | 30 | Shows full Act 1 or Act 2 output without scrolling |
| Cursor | Block, non-blinking | Does not distract |
| Scrollback | Cleared before demo | No stale output visible if audience looks up |

### Pre-Demo Terminal Layout

**Tab 1 label:** `Community`
**Tab 2 label:** `Enterprise`

Both tabs start in `~/demo/acme-api/`. Tab 1 has Sage removed (community mode). Tab 2 has Sage installed (enterprise mode).

Before the pitch, verify both tabs:
```bash
# Tab 1 — confirm community mode
ls .claude/agents/sage/ 2>/dev/null || echo "Community mode confirmed"

# Tab 2 — confirm enterprise mode
ls .claude/agents/sage/AGENT.md && echo "Enterprise mode confirmed"
```

### What Is Visible When Demo Starts

The audience sees a clean terminal prompt in Tab 1:
```
~/demo/acme-api $
```

Nothing else. No previous output. The simplicity communicates: this is a terminal tool. No dashboard. No browser.

---

## Commands to Run

### Act 1 (Community — Tab 1)

```bash
/mg-build WS-DEMO-01
```

Expected duration: 45-55 seconds of agent execution. The founder narrates during execution.

### Act 2 (Enterprise — Tab 2)

Switch to Tab 2 (Cmd+2 or click). Then:

```bash
/mg-build WS-DEMO-01
```

Expected duration: 8-12 seconds to the BLOCKED decision. Significantly faster because Sage short-circuits — it does not proceed to QA/Dev/SE when it detects a scope violation at intake.

This speed differential IS the demo. Community mode runs the full pipeline and flags at the end. Enterprise mode catches it at the top and stops immediately.

### Backup: Alternate Drift (if asked to re-run)

```bash
/mg-build WS-DEMO-03
```

Different workstream, different drift type (caching inside connection pooling). Proves the behavior is not scenario-specific.

---

## Failure Modes and Recovery

### Failure 1: API Latency (agents slow)

**Symptom:** Agent output takes >15 seconds per step instead of the expected 3-8 seconds.

**Recovery:** The founder narrates more. "The agents are thinking — this is the CTO evaluating the architecture. In production this takes a few seconds. Today we are sharing an API with the rest of the world." Keep talking. The output will appear. If it exceeds 90 seconds total, say: "Let me show you a recording of the typical experience" and switch to the pre-recorded backup.

**Prevention:** Run a warm-up invocation 10 minutes before the pitch (`/mg-build WS-WARMUP-01` on a trivial workstream). This primes any connection pools and verifies API connectivity.

### Failure 2: Unexpected Agent Output

**Symptom:** An agent says something off-script — different wording, different structure, catches a different issue.

**Recovery:** This is actually fine. The demo is real execution, not playback. If the CTO flags something different, the founder adapts: "Interesting — the CTO caught [X] instead of what I usually see. That is because this is live. Every run evaluates the code fresh." Variation proves authenticity.

**Boundary:** If the Sage does NOT detect the drift at all (fails to block), this is a critical failure. Switch to pre-recorded backup immediately. Do not try to explain it.

### Failure 3: API Down / Network Failure

**Symptom:** Connection error or timeout.

**Recovery:** Switch to pre-recorded backup within 5 seconds. "Let me show you a recording — same scenario, captured earlier today." Never apologize for more than one sentence. The backup IS the demo; the live attempt was a bonus.

**Prevention:** Test API connectivity from the demo machine 30 minutes before. Have a mobile hotspot as network backup.

### Failure 4: Wrong Tab / Wrong State

**Symptom:** Ran enterprise mode first, or community mode has Sage installed.

**Recovery:** If caught immediately: "Actually, let me start with the community edition" — switch tabs. If the output already appeared: narrate what happened and proceed. The audience does not know the planned order.

---

## Pre-Recorded Backup Plan

### Recording Tool

Use **asciinema** for terminal recording:

```bash
# Install
brew install asciinema

# Record Act 1 (community)
cd ~/demo/acme-api
# Switch to community mode first
asciinema rec demo-community.cast

# Run the demo, then exit recording
/mg-build WS-DEMO-01
# Ctrl+D to stop recording

# Record Act 2 (enterprise)
# Switch to enterprise mode first
asciinema rec demo-enterprise.cast

/mg-build WS-DEMO-01
# Ctrl+D to stop recording
```

### Playback

```bash
# Playback at real speed
asciinema play demo-community.cast

# Playback at 1.5x (if time is tight)
asciinema play -s 1.5 demo-enterprise.cast
```

### Alternative: Screen Recording

If asciinema playback does not render well on the projector, record with QuickTime (screen recording of the terminal). Export as `.mov`. Play with QuickTime Player in fullscreen.

The recording must be from the same day or day before the pitch. The terminal theme, font, and colors must match the live terminal exactly.

### When to Use Backup

| Trigger | Action |
|---------|--------|
| API down at demo start | Use backup for both acts |
| API slow (>90s for Act 1) | Narrate Act 1, use backup for Act 2 |
| Sage fails to detect drift | Use backup for Act 2 only |
| Everything works | Do not use backup — live is always stronger |

---

## Pre-Pitch Checklist (Day of)

Run this checklist 60 minutes before the pitch:

- [ ] Demo machine charged / plugged in
- [ ] Network connectivity confirmed (test API call)
- [ ] Mobile hotspot available as backup
- [ ] Terminal font/theme verified (18pt JetBrains Mono, dark theme)
- [ ] Tab 1: community mode confirmed (no sage/)
- [ ] Tab 2: enterprise mode confirmed (sage/AGENT.md exists)
- [ ] Warm-up build run on both tabs (verify output format)
- [ ] Pre-recorded backups accessible (both .cast or .mov files)
- [ ] Projector/display tested (terminal readable from back of room)
- [ ] Scrollback cleared on both tabs
- [ ] GH issues visible (if VC asks to see the ticket)
- [ ] Backup drift scenario (WS-DEMO-03) tested once

---

## Technical Architecture Note

```
[CTO] The demo exploits a genuine architectural difference between community and enterprise editions.

Community mode: Supervisor observes and writes alerts. Agents see the alerts but are not gated by them. The build pipeline runs to completion and surfaces concerns in the final review. Drift is flagged, not blocked.

Enterprise mode: Sage reads the approved spec at intake, before any agents spawn. It performs scope assessment against the spec. If scope violations are detected, Sage issues a BLOCKED decision with a challenge and recovery plan. The build pipeline never starts. Drift is prevented at intake.

This is not a staged behavior difference. This is the actual architectural difference between the two editions. The demo shows it honestly.

Break-even: This demo pattern works as long as the drift is detectable from the spec + code diff. If the drift is subtle enough that it requires running tests to detect (e.g., a performance regression), the Sage would not catch it at intake — QA would catch it later. For the pitch, we use a clear scope violation (auth changes in a rate-limiter workstream) that is unambiguously detectable from code inspection.
```
