# WS-PITCH-07: Demo Script — Slide 6 Live Demo
# TheEngOrg $3M Seed Pitch

**Prepared by:** CTO
**Date:** 2026-03-22
**Classification:** Internal / Confidential
**Total runtime target:** 2 minutes 45 seconds (hard cap: 3 minutes)

---

## Narrative Position

Slides 1-3 made the VC feel the problem. Slide 4 reframed it ("the problem is the org chart, not the model"). Slide 5 showed the terminal and set up the visual language. Now the founder switches to a live terminal. The demo proves the reframe is real. The slides that follow (7-14) convert the demo conviction into deal conviction.

The demo answers one question: **"Does this actually work?"**

---

## Pre-Demo State

Before the pitch begins, the terminal is prepared with:

1. A staged project directory (`~/demo/acme-api/`) with a workstream in progress
2. A ticket (GH issue) for WS-DEMO-01: "Add rate limiting to the public API"
3. A developer has already started implementing — but they drifted. They added authentication token rotation to the rate limiter, which was NOT in the approved spec. This is the injected drift.
4. The terminal is open, font size 18pt, dark theme, positioned so the audience can read the `[ROLE]` prefixes clearly
5. Two terminal tabs are pre-loaded:
   - **Tab 1:** Community mode (no Sage installed)
   - **Tab 2:** Enterprise mode (Sage installed)

---

## Setup (30 seconds)

**Founder says (transitioning from slide 5):**

> "I can talk about organizational intelligence all day. Let me show you instead. I have a project here — a startup's API. A developer was assigned to add rate limiting. Simple feature. But the developer got creative. They started adding authentication token rotation inside the rate limiter. That was not in the spec. In a human team, this gets caught at code review — maybe. Two days later. After three other features have built on top of the drift. Let me show you what happens with TheEngOrg."

**On screen:** Terminal showing the project directory. The audience sees a normal-looking codebase. Nothing fancy yet.

---

## Act 1: Community Mode — See the Problem (45 seconds)

**Founder says:**

> "First, the community edition. This is free. Open source. Twenty-three agents."

**Founder runs:**
```
/mg-build WS-DEMO-01
```

**Terminal output (community mode — no Sage):**
```
[EM]    Classifying... ARCHITECTURAL                    0.3s

[CEO]   Business alignment — approved
[CTO]   Technical approach — CONCERN: scope includes auth token rotation, not in spec
[ED]    Operational readiness — approved                 7.1s

[QA]    Writing tests — 18 specs                        5.8s
[DEV]   Implementing — 14 of 18 tests passing          28.4s
[QA]    Verification — 2 auth-related tests unresolved   3.1s

[SE]    Code review — WARNING: auth changes exceed workstream scope

[CEO]   Final review — APPROVED WITH CONCERNS            4.9s
[EM]    Done — 1 warning unresolved                   49.6s
```

**Founder narrates as it runs:**

> "Watch the CTO — it caught the drift. 'Scope includes auth token rotation, not in spec.' Good. The Staff Engineer flagged it too. But look at the outcome: APPROVED WITH CONCERNS. The community edition sees the problem. It flags it. But it cannot stop the train. The work ships with a warning. In a real team, that warning gets buried. The drift propagates. Two weeks later, three features depend on auth logic that was never approved."

**Founder pauses. Then:**

> "Now watch what happens with the enterprise edition."

---

## Act 2: Enterprise Mode — Prevent the Problem (60 seconds)

**Founder switches to Tab 2.**

**Founder says:**

> "Same project. Same drift. But now the Sage is watching."

**Founder runs:**
```
/mg-build WS-DEMO-01
```

**Terminal output (enterprise mode — Sage active):**
```
[SAGE]  Intake — reading WS-DEMO-01 spec                0.4s
[SAGE]  Scope assessment — pure engineering, auth layer adjacent
[SAGE]  C-Suite routing — CTO only (no business/brand signals)   0.8s

[CTO]   Technical approach — REJECTED: auth token rotation is not in the approved spec
[CTO]   Decision: scope violation detected — auth changes must be a separate workstream
[ED]    Operational readiness — blocked pending scope resolution   5.2s

[SAGE]  Drift detected — developer introduced auth token rotation into rate-limiting workstream
[SAGE]  Challenge: "This diverges from the approved spec. Auth token rotation requires its own workstream with security review. Why was this included?"
[SAGE]  Recovery plan:
        1. Strip auth changes from WS-DEMO-01
        2. Create WS-DEMO-02: auth token rotation (requires security review)
        3. Resume rate limiting implementation against original spec
[SAGE]  Decision: BLOCKED — scope violation, recovery plan issued   8.1s
```

**Founder narrates as it runs:**

> "Watch the Sage. First thing — it reads the spec. It knows what was approved. Now look at the routing: CTO only. It did not spawn the CEO or the CMO because this is a pure engineering task. That is selective routing — it is not wasting tokens on agents that have nothing to contribute."

*[As the CTO line appears:]*

> "The CTO rejected it outright. Not 'approved with concerns' — rejected. The drift stops here."

*[As the SAGE challenge appears:]*

> "And here is the enterprise difference. The Sage does not just flag it. It challenges the developer: 'Why was this included?' And it produces a recovery plan. Strip the auth changes. Create a new workstream. Route that workstream through security review. The drift is not just detected — it is contained and remediated. Before a single line of drifted code reaches a PR."

**Founder pauses for effect. Then:**

> "The community edition saw the problem. The enterprise edition prevented it. That is the difference between a monitoring tool and an engineering organization."

---

## Act 3: The Multiplier (30 seconds)

**Founder says (staying on the enterprise terminal):**

> "One more thing. Watch how fast that was."

**Founder points to the timing on screen.**

> "Eight seconds from intake to a recovery plan with three workstreams and a security review assignment. The Sage read the spec, assessed scope, routed to the CTO — skipped three other C-suite agents it did not need — detected the drift, challenged it, and produced a plan. Eight seconds."

> "A five-person startup just got the judgment of a thirty-person engineering org. The CTO caught an architectural scope violation. The Sage enforced organizational process. A recovery plan was produced with proper separation of concerns. No human coordination required."

**Pause.**

> "That is five thousand dollars a month in API costs replacing five million in headcount."

---

## Wrap (15 seconds)

**Founder transitions back to slides (Slide 7: The Moat).**

> "So it works. You just saw it work. Now let me show you why no one can copy it — and why the gap gets wider every month."

---

## Timing Summary

| Act | Duration | Cumulative |
|-----|----------|------------|
| Setup | 0:30 | 0:30 |
| Act 1: Community | 0:45 | 1:15 |
| Act 2: Enterprise | 1:00 | 2:15 |
| Act 3: Multiplier | 0:30 | 2:45 |
| Wrap | 0:15 | 3:00 |

---

## Key Narration Beats

The founder is telling a story with three emotional peaks:

1. **Community flags it** — "Oh, it caught it. That is pretty good." (Audience nods.)
2. **Enterprise blocks it** — "Wait, it actually stopped the developer. And it challenged them." (Audience leans forward.)
3. **Eight seconds** — "Eight seconds for a scope violation, a rejection, and a recovery plan." (Audience looks at each other.)

The third beat is the gasp moment. The 8-second number is concrete, memorable, and repeatable in a partner meeting.

---

## Fallback: What If Questions

**"Can you change the drift and run it again?"**
Yes. The demo repo has a second injected drift scenario: a developer adds a caching layer to a database migration workstream. Founder can switch to WS-DEMO-03 and re-run. Same structure, different domain. This proves it is not scripted.

**"What if the developer pushes back on the Sage?"**
The founder can type a response: "The auth rotation is needed for the rate limiter to work correctly." The Sage will evaluate the claim against the spec and either accept the justification (updating scope) or maintain the block with reasoning. Either outcome demonstrates organizational judgment.

**"Does this work with our portfolio company's codebase?"**
"Yes. It runs in the terminal on any codebase. The customer brings their API key. There is no server, no integration, no onboarding. One command installs it. I am happy to set up a pilot with any portfolio company."
