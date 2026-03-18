# Product Requirements Document: Agent Skill Expansions — Security Domain Coverage

**GitHub Issue:** [#15 Agent Skill Expansions](https://github.com/wonton-web-works/miniature-guacamole/issues/15)
**Author:** Product Manager
**Date:** 2026-03-18
**Status:** Draft

---

## Problem

During the daemon pipeline build (`WS-DAEMON-13`, Mac Mini hardening), the existing `security-engineer` agent was invoked for a security audit. The review caught web-layer issues — command injection, token exposure, input validation gaps — but completely missed a second class of vulnerabilities that only surfaced when the user explicitly requested a non-web review:

- OS-level process isolation failures (daemon subprocess not sandboxed)
- macOS-specific attack surface (launchd plist permissions, `/tmp` path traversal)
- Environment variable leakage across subprocess boundaries
- Blast radius from a compromised daemon process (no permission scoping)
- Supply chain exposure (no lockfile integrity verification)

The root cause is structural: the current `security-engineer` agent is oriented around the OWASP Top 10 — a web application framework. Its constitution, review checklist, tool recommendations, and peer consultation pattern are all web-centric. Systems/infrastructure security represents a fundamentally different threat model with different tooling, different standards bodies (CIS Benchmarks, NIST SP 800-190, macOS Security Guide), and different remediation paths.

The gap was only discovered after a second manual request. In autonomous daemon operation, that second pass will never happen unless the framework requests it automatically.

This PRD evaluates three architectural options and recommends a direction for closing the coverage gap — including how the self-improving daemon research loop can keep security knowledge current over time.

---

## Users

**Primary: Developers invoking security reviews via `/mg-security-review` or `security-engineer` agent**
These users are typically mid-to-senior engineers who want assurance that a workstream is safe to ship. They have enough security literacy to act on findings but do not specialize in security. They expect the agent to know what questions to ask — they should not need to specify the security domain themselves. The daemon pipeline revealed the failure mode: users who don't know to ask about systems security won't ask, and the agent won't raise it unprompted.

**Secondary: Engineering leads and CTOs running autonomous daemon pipelines**
These users rely on the daemon to process tickets without human oversight. If a security review is part of the pipeline, it must cover all relevant domains for the artifact being reviewed — not just the domain the agent defaults to. A single missed domain in autonomous operation means a missed vulnerability class ships to production without review.

**Tertiary: Framework contributors maintaining agent definitions**
These are developers who write and update AGENT.md files. Any solution must be maintainable: domain-specific security knowledge should be easy to extend or correct without forking the agent system.

---

## Success Criteria

- A security review of daemon/systems code surfaces OS-level, process isolation, and supply chain concerns without the user specifying a domain — baseline: these concerns were missed in the daemon pipeline audit
- A security review of a web API surfaces OWASP Top 10 concerns at equal or greater depth to the current `security-engineer` — no regression from present behavior
- The agent system can acquire new domain reference material through the daemon research loop and apply it on the next review without an agent definition rewrite
- The user does not need to know which security domain applies to the artifact they are reviewing — the system routes or escalates automatically
- Adding a new security domain (e.g., ML model supply chain) requires no new AGENT.md file; only a new reference document in the correct location

---

## User Stories

### WS-SEC-01: Full-Spectrum Review Without Domain Selection

As a developer, I want to invoke a security review without specifying a domain so that I don't miss vulnerabilities in areas I didn't think to ask about.

**BDD Scenarios:**

```
Given a codebase that includes a macOS daemon with subprocess management
When I invoke security-engineer with no domain argument
Then the review covers both web-layer concerns (injection, token exposure)
  And systems-layer concerns (process isolation, launchd permissions, environment leakage)
  And the findings report distinguishes findings by domain

Given a codebase that is a pure REST API with no system-level components
When I invoke security-engineer with no domain argument
Then the review focuses on OWASP Top 10 without noise from irrelevant systems checks
  And the report does not reference inapplicable standards

Given a codebase that is a CLI tool with both file I/O and an embedded HTTP server
When I invoke security-engineer with no domain argument
Then the review covers both input validation (web) and path traversal / file permission concerns (systems)
```

### WS-SEC-02: Domain-Targeted Review When Needed

As a security-conscious developer, I want to request a domain-specific deep dive so that I can get maximum depth on one area during a focused audit.

**BDD Scenarios:**

```
Given I am performing a pre-release systems hardening audit
When I invoke security-engineer --domain systems
Then the review focuses exclusively on OS hardening, process isolation, file permissions,
  daemon configuration, and supply chain integrity
  And does not dilute output with web concerns irrelevant to the artifact

Given I invoke security-engineer --domain cloud
Then the review covers IAM policy scope, secrets management, network policy,
  and supply chain (lockfile integrity, dependency provenance)
  And references relevant standards (CIS Benchmarks, NIST, SOC 2 relevant controls)
```

### WS-SEC-03: Domain Knowledge Grows Over Time via Research Loop

As a framework maintainer, I want the daemon's daily research tasks to expand security domain coverage so that agents stay current without manual rewriting.

**BDD Scenarios:**

```
Given the daemon has a pending research ticket "Investigate macOS Sequoia sandbox API changes"
When the research task completes
Then the output is written to security-engineer/references/systems-macos.md
  And the next security review of a macOS artifact uses the updated reference material
  And no AGENT.md file was modified

Given a new security domain emerges (e.g., LLM prompt injection)
When a research ticket for that domain is processed by the daemon
Then a new reference file is created at security-engineer/references/llm-security.md
  And the agent automatically loads it when reviewing LLM-adjacent code
  And no new specialized agent is created
```

### WS-SEC-04: Autonomous Pipeline Coverage

As an engineering lead running the daemon autonomously, I want security reviews to automatically cover all domains relevant to each workstream so that no vulnerability class is silently skipped in autonomous operation.

**BDD Scenarios:**

```
Given the daemon is processing a ticket to build a new launchd daemon
When the mg-build pipeline reaches the security gate
Then security-engineer is invoked and performs a systems + supply-chain review
  Not only a web review
  And the PR is not created until all high/critical findings are addressed

Given the daemon is processing a ticket to build a new REST endpoint
When the mg-build pipeline reaches the security gate
Then security-engineer is invoked and performs a web + auth review
  And findings are written to security-findings.json before the PR gate passes
```

---

## Option Evaluation

### Option A — Specialized SME Agents (Rejected)

Create `security-engineer-web`, `security-engineer-systems`, `security-engineer-cloud`, `security-engineer-crypto` as separate AGENT.md files.

**Strengths:**
- Maximum depth per domain; agent constitution, tooling, and checklist are fully focused
- Clear delineation of scope — no agent tries to be everything

**Weaknesses:**
- Roster grows from 20 to 24+ agents, accelerating the catalog management problem
- The user (or the daemon) must decide which agent to invoke — this is the original failure mode restated at a higher level
- Shared knowledge (e.g., "secrets should never be hardcoded") is duplicated across four files with no single source of truth
- The self-improving research loop becomes harder: a research finding about systems security must know to update `security-engineer-systems`, not `security-engineer`
- Maintenance burden compounds: any protocol change (memory format, handoff pattern, visual formatting) must be applied across all four files

**Verdict:** Rejected. Multiplying agents is the wrong axis of specialization. Domain expertise in this case is a property of the review scope, not the identity of the reviewer.

---

### Option B — Single Adaptive Agent with Domain Loading (Recommended)

One `security-engineer` agent that auto-detects relevant domains from the artifact under review and loads domain reference material from `security-engineer/references/` at invocation time. Accepts an optional `--domain` flag for explicit deep-dive requests.

**Strengths:**
- No roster bloat — one agent, one AGENT.md, one place to update protocols
- Domain coverage scales with reference files, not with agent count: adding a new domain requires only a new `.md` file in `references/`
- The daemon research loop has a clear write target: research findings go into `security-engineer/references/<domain>.md`
- The agent can read multiple reference files and compose a multi-domain review from a single invocation
- Optional `--domain` flag preserves the ability to request targeted deep dives
- Consistent with how `devops-engineer` currently works — one agent with broad infrastructure scope

**Weaknesses:**
- The agent must determine which reference files are relevant to the artifact — this is a new reasoning step that could be done incorrectly
- A very large review (e.g., 5 domains) may produce an overwhelming output
- Reference files need an agreed schema so the agent knows how to interpret them

**Mitigations:**
- Provide a detection heuristic in the agent's constitution (e.g., "if Bash subprocess calls exist, load systems reference; if HTTP handlers exist, load web reference")
- Cap output verbosity: high/critical findings always shown, lower severity summarized by domain
- Define a standard reference file schema (frontmatter: `domain`, `standards`, `checklist`, `tools`)

**Verdict:** Recommended. See full design below.

---

### Option C — Tiered Model with Sub-Agent Spawning (Deferred)

`security-engineer` as a generalist that spawns domain-specific sub-agents when deeper expertise is needed.

**Strengths:**
- Intelligent routing; user never needs to specify domain
- Deep domain expertise available on demand

**Weaknesses:**
- Requires a sub-agent decision layer that reliably detects when to spawn — this is brittle; the generalist must correctly classify the artifact before it knows what it doesn't know
- Spawning sub-agents adds latency and API cost per security review in the normal pipeline
- Sub-agents are session-local spawns, not persistent agents, so the domain specialization adds complexity without adding persistent learning
- The failure mode (generalist misclassifies artifact, doesn't spawn the right sub-agent) is identical to the current bug, just one layer deeper

**Verdict:** Deferred. Option C is the right long-term architecture if domain-specific agents need to take actions (not just advise), but is over-engineered for the current problem scope. Revisit if security-engineer needs write capabilities per domain in the future.

---

## Recommendation: Option B — Adaptive Agent with Domain Loading

**Summary:** Extend the existing `security-engineer` with a `references/` directory pattern. The agent reads domain reference files appropriate to the artifact under review and composes a multi-domain security report. Domain knowledge is expanded via the daemon research loop, which writes new and updated reference files directly. No new agents are created.

---

## Design Requirements

### Agent Constitution Changes

The `security-engineer` constitution must be updated to include:

1. **Domain detection logic** — Before beginning a review, the agent scans the artifact and identifies which domain reference files are relevant. Detection heuristics:

   | Artifact Signal | Domain Reference Loaded |
   |---|---|
   | HTTP handler, REST endpoint, GraphQL schema, web framework imports | `references/web-owasp.md` |
   | `subprocess`, `Popen`, `execSync`, launchd plist, systemd unit, daemon process | `references/systems-hardening.md` |
   | Cloud SDK imports, IAM policy files, Dockerfile, Kubernetes manifests | `references/cloud-iam.md` |
   | Cryptographic library usage, TLS config, key storage | `references/crypto-standards.md` |
   | `package-lock.json`, `go.sum`, `requirements.txt`, dependency manifests | `references/supply-chain.md` |

2. **Domain reference schema** — Each reference file uses a standard front matter:

   ```markdown
   ---
   domain: web | systems | cloud | crypto | supply-chain
   standards: [OWASP Top 10, CIS Benchmarks, NIST SP 800-190, ...]
   last_updated: YYYY-MM-DD
   ---
   ## Checklist
   ## Tools
   ## Common Findings
   ## Remediation Patterns
   ```

3. **Optional `--domain` flag** — When invoked with `--domain <name>`, the agent loads only that reference file and produces a focused report. When invoked without the flag, all relevant reference files are loaded.

4. **Report structure** — Findings are grouped by domain in the output. Each finding includes its domain label so the reader knows which lens surfaced it.

### Research Loop Integration

The daemon research pipeline connects to the `security-engineer` reference directory as follows:

```
[Daily Research Ticket]
  "Research: macOS Sequoia sandbox API changes relevant to daemon security"
        |
        v
[Research Agent processes ticket]
        |
        v
[Output written to]
  security-engineer/references/systems-macos-updates.md
        |
        v
[Next security review of macOS artifacts]
  security-engineer loads systems-hardening.md + systems-macos-updates.md
  Review applies updated knowledge automatically
```

Research tickets for security domain expansion should follow this naming convention:
`Research: [domain] — [topic]` so the daemon can route output to the correct references subdirectory.

### Memory Protocol Changes

The existing memory write schema for `security-findings.json` is extended with a `domain` field per finding:

```yaml
write: .claude/memory/security-findings.json
  workstream_id: <id>
  status: secure | vulnerable | needs_review
  domains_reviewed: [web, systems, supply-chain]   # NEW
  findings:
    - severity: critical | high | medium | low
      domain: web | systems | cloud | crypto | supply-chain   # NEW
      category: <standard category (e.g., OWASP A03, CIS 5.1)>
      description: <issue details>
      location: <file:line>
      recommendation: <how to fix>
  scan_date: <auto>
```

### Boundaries Update

The `security-engineer` peer consultation table needs one addition:

| Peer | Purpose |
|---|---|
| `dev` | Remediation implementation |
| `devops-engineer` | Infrastructure security concerns |
| `staff-engineer` | Architecture security patterns |
| `research-agent` (daemon) | Domain reference expansion (fire-and-forget) |

---

## Acceptance Criteria

### WS-SEC-01: Core Agent Refactor

- [ ] `security-engineer/references/` directory exists and contains at minimum: `web-owasp.md`, `systems-hardening.md`, `supply-chain.md`
- [ ] Each reference file conforms to the domain reference schema (frontmatter with `domain`, `standards`, `last_updated`)
- [ ] `security-engineer` AGENT.md constitution includes domain detection heuristics table
- [ ] When reviewing a file containing `subprocess.run` or `execSync`, the agent loads `systems-hardening.md` without being asked
- [ ] When reviewing a file containing HTTP route definitions, the agent loads `web-owasp.md` without being asked
- [ ] When reviewing a file with both signals, the agent loads both reference files and produces a combined report

### WS-SEC-02: Domain Flag

- [ ] `security-engineer --domain systems` loads only `systems-hardening.md` and produces a systems-focused report
- [ ] `security-engineer --domain web` loads only `web-owasp.md` and produces an OWASP-focused report
- [ ] `security-engineer --domain <unknown>` returns an error listing available domains rather than silently falling back to web-only
- [ ] Existing invocations without `--domain` continue to work and now automatically load relevant reference files

### WS-SEC-03: findings.json Schema

- [ ] `security-findings.json` output includes `domains_reviewed` array listing which domains were checked
- [ ] Each finding includes a `domain` field
- [ ] QA agent can consume `domains_reviewed` to verify coverage before approving the security gate

### WS-SEC-04: Research Loop Integration

- [ ] A research ticket with naming convention `Research: systems — <topic>` results in output written to `security-engineer/references/`
- [ ] The new reference file passes schema validation (frontmatter fields present and non-empty)
- [ ] The `security-engineer` agent reads the new file on the next invocation without any AGENT.md change
- [ ] Acceptance test: add a mock reference file to `references/`, invoke `security-engineer` on a matching artifact, verify the new file's checklist items appear in the output

### WS-SEC-05: No Regression

- [ ] All existing security review acceptance criteria from prior workstreams continue to pass
- [ ] Web-only codebases do not receive spurious systems-domain findings
- [ ] Agent roster count remains at 20 (no new AGENT.md files created)

---

## Workstream Breakdown

```
WS-SEC-01  Core agent refactor + initial reference files
  [#####-----]  Est: 1 day
  Owner: dev (with security-engineer self-review)
  Deliverables:
    - security-engineer AGENT.md updated (constitution, detection heuristics, report structure)
    - security-engineer/references/web-owasp.md
    - security-engineer/references/systems-hardening.md
    - security-engineer/references/supply-chain.md
    - security-engineer/references/cloud-iam.md
    - security-engineer/references/crypto-standards.md

WS-SEC-02  findings.json schema extension
  [###-------]  Est: 0.5 day
  Owner: dev
  Deliverables:
    - memory-protocol.md updated with new finding fields
    - security-findings.json schema documented
    - QA agent updated to check domains_reviewed in security gate

WS-SEC-03  Research loop integration spec
  [####------]  Est: 0.5 day
  Owner: product-manager -> dev
  Deliverables:
    - Research ticket naming convention documented in daemon pipeline PRD
    - Reference file schema published to shared/
    - One end-to-end test: mock research output -> reference file -> agent picks it up

WS-SEC-04  Daemon pipeline security gate update
  [###-------]  Est: 0.5 day
  Owner: dev (daemon pipeline)
  Deliverables:
    - mg-build security gate passes domains_reviewed to QA gate
    - QA gate rejects if domains_reviewed is empty or single-domain on multi-domain artifacts
```

---

## Business Case

**Strategic fit:** miniature-guacamole's value proposition is a complete product development team. A security team that only reviews web surfaces is not a complete security team. As the framework is used for more systems-level work (daemons, CLI tools, infrastructure scripts), the web-only security gap becomes a credibility and liability issue. The daemon pipeline build exposed this concretely.

**Opportunity:** The research loop is the unique differentiator here. No existing AI coding assistant has an agent that gets smarter about security over time by running its own research tasks. Option B directly enables this: domain reference files are the update mechanism, and the daemon already knows how to run research tickets. The architecture is already in place; this PRD formalizes the contract between the daemon output and the agent's knowledge base.

**Expected impact:**
- Security reviews catch systems and infrastructure vulnerabilities that are currently invisible to the agent — the daemon pipeline gap is closed
- Future security domain expansions (LLM security, ML supply chain) require only a new reference file, not a new agent or a framework update — maintenance cost approaches zero for new domains
- Engineering leads running autonomous pipelines gain confidence that the security gate covers the full artifact surface area, not just the web layer

**Risks and assumptions:**

| Risk | Likelihood | Mitigation |
|---|---|---|
| Agent domain detection heuristics miss signals in novel code patterns | Medium | Default to loading all reference files when confidence is low; explicit `--domain` flag as override |
| Reference files grow too large for a single context window | Low-Medium | Split large domains into sub-files (e.g., `systems-hardening-macos.md`, `systems-hardening-linux.md`) |
| Research loop writes low-quality reference material | Medium | Research output must pass schema validation; engineering-manager reviews first batch of research-generated references |
| Option C becomes necessary if security domains need different tool access | Low | Architecture supports graduating to Option C: reference files could become sub-agent prompts if spawn capability is needed later |

**Key assumption:** The daemon research loop is operational and capable of writing structured output to the repository. This PRD is scoped to the agent-side contract; the daemon-side research ticket runner is covered in the daemon pipeline PRD (WS-DAEMON-14 and successor workstreams).

---

## Open Questions

1. **Who owns the initial reference file content?** The first versions of `web-owasp.md` and `systems-hardening.md` need to be written by a human or via a dedicated research task before the loop can maintain them. Does the user want to write these directly or have a research task produce v1?

2. **Schema validation enforcement:** Should the QA agent or a CI check validate reference file frontmatter before merging? This prevents malformed research output from silently degrading the agent.

3. **Scope of `--domain` flag:** Should other agents (e.g., `devops-engineer`) adopt the same references pattern for their own domain specialization? This PRD covers `security-engineer` only, but the pattern is generalizable.

4. **Crypto domain boundary:** There is overlap between `security-engineer --domain crypto` and existing `security-engineer` coverage of TLS and key management. Should crypto be a sub-section of web/systems rather than a standalone domain?
