# Prompt Audit Report — miniature-guacamole Agent & Skill System

**Date:** 2026-03-22
**Auditor:** Principal AI Engineer
**Scope:** 22 agents, 19 skills, 6 shared protocols
**Purpose:** Identify behavioral alignment gaps, token waste, missing guardrails, and cross-cutting quality issues.

---

## Executive Summary

The framework is architecturally sound and shows clear design intent. The shared protocols (development-workflow, tdd-workflow, memory-protocol) are the strongest assets — dense, precise, and operationally complete. The agent layer is more uneven. Several agents function as thin wrappers around role descriptions without meaningful behavioral anchors. The skill layer is generally good but carries significant redundancy that inflates token budgets across the board.

**Top five findings:**

1. **Redundant constitution clause in every skill file** — "Follow output format — See `references/output-format.md` for standard visual patterns" appears in every skill constitution (5+ tokens each, 19 skills). Move it to skill-base.md where it belongs.

2. **CEO and engineering-director agents are behaviorally inert** — Their constitutions are three-bullet lists of self-evident truisms ("Decide quickly", "Delivery focus"). No activation criteria, no decision heuristics, no escalation triggers. They will produce generic executive-speak.

3. **The Orchestrator duplicates the supervisor's job description without clear division** — Both monitor quality and enforce process. The distinction (Orchestrator acts, supervisor observes) is buried 200 lines into Orchestrator's AGENT.md and not mentioned anywhere in supervisor's file.

4. **Technical-writer's escalation target is a skill, not an agent** — `ESCALATES TO: mg-document` is structurally wrong. Skills don't receive escalations; agents do. Same issue with copywriter escalating to `mg-write`.

5. **Studio-director is pinned to a specific model version** (`claude-opus-4-6`) inline, which will silently break when that model is deprecated. It also lacks the standard frontmatter format used by all other agents.

---

## Per-Agent Assessment

Scoring: 1 = poor, 5 = excellent

| Agent | Behavioral Alignment | Initiative | Quality | Token Efficiency | Key Issues |
|-------|---------------------|------------|---------|-----------------|------------|
| orchestrator | 5 | 5 | 5 | 3 | Long but justified. Research evaluation protocol is excellent. Specialist persistence pattern is novel and valuable. Token cost is high but this is the top-level orchestrator. |
| ceo | 2 | 2 | 3 | 5 | Three-bullet constitution says nothing actionable. No criteria for when CEO activates vs stays quiet. Will produce platitudes. Extremely token-efficient but behaviorally weak. |
| cto | 2 | 2 | 3 | 5 | Same problem as CEO. "Technical excellence — Maintain high standards" is not a behavioral instruction. No guidance on how to evaluate tradeoffs, what architecture patterns to prefer, or how to structure a recommendation. |
| engineering-director | 2 | 2 | 3 | 5 | "Delivery focus — Keep workstreams moving" gives Claude nothing to act on. No heuristics for prioritization, no blocker escalation thresholds, no capacity planning guidance. |
| engineering-manager | 4 | 4 | 4 | 4 | Strong memory protocol and delegation rules. Escalation triggers are specific and useful (">2 cycles on same issue"). Could add: what to do when requirements are unclear after PM clarification (currently listed as an escalation trigger but the response is just "escalate" — to where, with what framing?). |
| product-owner | 3 | 3 | 3 | 5 | "Prioritize ruthlessly — Say no to protect focus" is good instinct but no framework for how to say no. No guidance on what makes a feature worth doing. Memory reads `user-feedback.json` which is rarely populated by any workflow. |
| product-manager | 4 | 4 | 4 | 5 | Clean and functional. BDD emphasis is well-placed. The delegation note "Implementation | dev (via engineering-manager)" is awkward — PM doesn't directly interact with dev at all. Could be simplified. |
| staff-engineer | 5 | 4 | 5 | 3 | Spike Research Protocol is excellent — the tiered approach and negative result verification are operationally rigorous. The Tier 1/Tier 2 section is detailed but could be condensed by 40% without losing substance. Review checklist is good. |
| dev | 4 | 4 | 4 | 4 | MECHANICAL mode distinction is well-handled. The "Peer Consultation" fire-and-forget pattern is correctly described. One gap: no guidance on what to do when tests are poorly written (ARCHITECTURAL track) — dev currently has no mechanism to challenge QA test quality. |
| qa | 4 | 4 | 4 | 4 | Misuse-first ordering is correct but only mentioned implicitly. The agent constitution doesn't mention it — it's in tdd-workflow.md. Add "Misuse first — security before boundary before happy path" to the QA constitution so it's always loaded. The visual regression item in the constitution ("Visual regression — Playwright screenshots for UI") may mislead QA into always running Playwright even on non-UI work. |
| design | 3 | 3 | 4 | 3 | Asset generation tooling is well-documented. The "Production-ready — Your code ships, not just mockups" clause contradicts the project feedback memory that says design agents produce visual specs, not code. This is a behavioral alignment risk: the agent will try to write React components when it should stop at specs. |
| art-director | 3 | 3 | 4 | 4 | Approval checklist for generated assets is useful. The constitution's "Approve changes — Visual regressions need sign-off" doesn't tell the art-director _when_ to activate. It's a permanent standing order with no trigger condition. |
| devops-engineer | 3 | 3 | 3 | 2 | The "Infrastructure Areas" and "Common Tools" sections are reference material that Claude already knows — they burn tokens explaining what Kubernetes is. That section could be replaced with "use standard industry tools appropriate to the stack" and save ~300 tokens. No escalation trigger specificity. |
| deployment-engineer | 5 | 4 | 5 | 5 | Best-in-class for what it does. The pre-deployment checklist is concrete and non-negotiable. The approval-required guardrail is enforced in the memory protocol itself (read approvals.json first). Haiku model selection is correct for this role. |
| data-engineer | 3 | 3 | 4 | 3 | Design checklist is solid. "Database Patterns" section is textbook content Claude already knows. Cut the Schema Design / Migrations / Query Optimization prose (~150 tokens) — these are platitudes at the level Claude operates. Keep the checklist, remove the tutorial content. |
| api-designer | 3 | 3 | 4 | 3 | Same issue as data-engineer. "API Design Patterns" section explains what REST and GraphQL are. Claude knows this. The content that actually matters (checklist, versioning, error format) is solid. Remove the tutorial prose. |
| security-engineer | 5 | 4 | 5 | 2 | The domain selection system (web/systems/cloud/crypto) is architecturally excellent. OWASP Top 10 is enumerated in full in the AGENT.md but also referenced from domain files — double-loading. The Security Review Areas section (auth, input validation, data protection, OWASP, code security) is useful framing but runs ~200 tokens of content Claude already knows. Recommend collapsing to a reference to domain files only. |
| technical-writer | 3 | 3 | 4 | 2 | "Documentation Workflow" is good process. The README Structure template and API Documentation template are copy-pasted content that Claude doesn't need — it already knows how to write JSDoc. These templates burn ~200 tokens to replicate something Claude does natively. Escalation target `mg-document` is a skill, not an agent — structurally wrong. |
| copywriter | 5 | 5 | 5 | 3 | The anti-AI-patterns list and voice transformation examples are the most operationally effective instruction in the entire framework. They're specific, testable, and produce measurable behavior change. Token cost is justified. The "Tone Calibration Guide" section could be trimmed by 30% — the sentence length examples repeat themselves. Escalation target `mg-write` is a skill, not an agent — structurally wrong. |
| ai-artist | 4 | 4 | 5 | 4 | Constitution principles are clear and non-negotiable. Pipeline workflow is concrete. The Asset Categories / Model Selection Guide has some redundancy with the tool matrix reference — the quick reference table replicates content that's already in the authoritative source at `docs/design-decisions/ai-generation-tool-matrix.md`. |
| studio-director | 2 | 3 | 3 | 3 | Highly specific to a single use case (YouTube episodes). Pinned to `claude-opus-4-6` by model version name — will silently break. Missing frontmatter fields (tools, memory, maxTurns). Constitution section appears _after_ the role description, violating the pattern every other agent follows. No escalation path defined. Missing Boundaries section entirely. |
| supervisor | 4 | 3 | 4 | 5 | Detection rules are concrete. The "Observe, don't act" constitution is clearly stated and enforced by CANNOT boundaries. One gap: no guidance on what to do when alerts are ignored. If engineering-director doesn't respond to a supervisor alert, what does supervisor do? Currently it just... stops. |

---

## Per-Skill Assessment

| Skill | Behavioral Alignment | Initiative | Quality | Token Efficiency | Key Issues |
|-------|---------------------|------------|---------|-----------------|------------|
| mg | 5 | 5 | 5 | 5 | Exemplary. The dispatcher role is tightly scoped, routing table is complete, natural language fallback is well-handled. `/mg plan` and `/mg review` sub-commands are particularly clean. |
| mg-accessibility-review | 4 | 4 | 5 | 3 | WCAG criteria reference is useful — specific criterion IDs (1.4.3, 2.1.1) are not known to everyone. However, the Key Checks section duplicates what's already in the WCAG criteria list. Consider collapsing into one reference structure. |
| mg-add-context | 4 | 4 | 4 | 2 | The "Agent Usage of Contexts" section shows Python tool-call examples — these are illustrative but unnecessary. Claude doesn't need to be shown how to call Read, Glob, or Grep. The implementation notes about V1/V2 are developer documentation that shouldn't be in a live prompt. Saves ~200 tokens if removed. |
| mg-assess | 5 | 5 | 5 | 4 | Auto-detection logic and intake mode are well-designed. The intake prompts are conversational and will produce good behavior. The ASCII flowchart is useful for model comprehension of the branching logic. Minor: "request: &lt;original request&gt;" appears as a duplicate field in the memory write block alongside "original_request". |
| mg-assess-tech | 4 | 4 | 4 | 4 | Solid. The evaluation criteria table is useful scaffolding. The spawn pattern YAML examples are redundant with the delegation table above them — pick one format. |
| mg-build | 5 | 5 | 5 | 4 | One of the strongest skills. Classification before spawning is correctly enforced. Step 3.5 dual-specialist review is thoughtful. The `--force-mechanical` / `--force-architectural` flags are valuable escape hatches. Minor: timing section says "Record `Date.now()` at invocation start" — this is JavaScript-specific guidance in a context that should be language-agnostic. |
| mg-code-review | 4 | 4 | 4 | 3 | Review areas are well-chosen. The workflow step "Spawn security-engineer for security review" is not in the delegation table — delegation table says spawn `staff-engineer` and `security-engineer`, but security-engineer is missing from the Spawn Pattern section. Fix the gap. |
| mg-debug | 4 | 4 | 4 | 4 | The debug cycle is clearly sequenced. Security lens escalation is correctly placed as optional. Minor: the output format shows `[DEV]` tags for reproduction and root cause steps — these are QA and Dev steps respectively, but the labels are inconsistent with which agent performs each step. |
| mg-design | 3 | 3 | 4 | 3 | The "Build UI — Recommend `/frontend-design`" delegation target doesn't exist as a defined skill in this framework. This will confuse the model. Either define the skill or change the recommendation. Brand Kit mode is useful but the wireframe quality benchmark reference ("the wonton project") is project-specific context that won't exist in most deployments. |
| mg-design-review | 4 | 4 | 4 | 3 | Review criteria are well-organized. The "micro-interactions" section is more detailed than necessary given that this is a review skill, not an implementation skill. Could be condensed. |
| mg-document | 4 | 4 | 4 | 4 | Clean, minimal, delegates correctly. The documentation types table is useful framing. Minor: workflow step 3 "Review for clarity, completeness, accuracy" is unattributed — who does the review? The skill itself? That's vague for an orchestration skill. |
| mg-init | 5 | 5 | 5 | 3 | Architecture decisions (DEC-INIT-002, etc.) are well-embedded. The idempotency guarantee is correctly enforced in the constitution. Example execution flow with exact output format is excellent for model comprehension. The "Implementation Notes" section at the bottom duplicates what's already in "What This Skill Does" — remove the duplication. |
| mg-leadership-team | 5 | 5 | 5 | 4 | State sync checklist after approval is excellent — prevents the most common drift problem. The post-approval state sync protocol makes this more than just a review gate; it's a system synchronization step. Minor: "Workstream clarity" constitution clause should specify what "testable workstreams" means (currently undefined). |
| mg-refactor | 5 | 5 | 5 | 4 | Characterization tests first is correctly enforced. "No behavior changes" guardrail is clear. Step 4 code review is optional but well-flagged. The spawn pattern prompt for step 2 includes "No functional changes" — correct and necessary. |
| mg-security-review | 5 | 5 | 5 | 3 | Domain inference heuristics table is one of the best-designed pieces in the framework. Auto-detecting security domain from file patterns removes a friction point that would otherwise cause shallow reviews. The severity level action table (CRITICAL → block deployment) is correctly specified. The domains_reviewed memory field should match the security-engineer agent's memory schema — verify these are in sync. |
| mg-spec | 4 | 4 | 5 | 4 | External dependency policy (Tier 1/Tier 2 classification before writing specs) is excellent — prevents the "spec against non-existent APIs" failure mode. Financial data warning (never fabricate figures) is a strong guardrail. |
| mg-ticket | 5 | 5 | 5 | 3 | Error handling is comprehensive. The preview-before-filing step protects against accidentally posting private memory to GitHub. Graceful degradation for missing context is correctly implemented. Minor: the constitution clause "Title truncation" (first 100 chars) contradicts the error handling section which says "Description over 500 chars" — the truncation operates at the 500-char level for the body preview, not 100. The relationship between these two limits should be clarified. |
| mg-tidy | 5 | 5 | 5 | 3 | The "keep highest-numbered duplicate" heuristic is a concrete, testable rule. Dry-run by default is correct for a destructive operation. The stale detection logic (14 days, no linked PR) is well-specified. Minor: the "Agents Used" section at the bottom lists `engineering-manager` and `supervisor` but neither is spawned in the workflow — this is aspirational documentation rather than operational reality. |
| mg-write | 4 | 4 | 4 | 3 | Art Director review checklist overlaps significantly with the copywriter agent's anti-AI-patterns list. Since mg-write spawns the copywriter, and the copywriter self-checks against these patterns, the checklist in mg-write is a duplicate. Consider deferring to the copywriter's built-in self-check rather than re-enumerating it. |

---

## Cross-Cutting Issues

### 1. Skill → Agent Escalation Misrouting (HIGH)

Three agents escalate to skills instead of agents:
- `technical-writer` escalates to `mg-document`
- `copywriter` escalates to `mg-write`
- `supervisor` lacks a defined escalation for ignored alerts

Skills cannot receive escalations in the framework architecture. When an agent escalates to a skill, the skill will attempt to start a new workflow rather than receive a handoff. Fix: route technical-writer to `engineering-manager`, copywriter to `art-director`.

### 2. Constitution Boilerplate in Every Skill (MEDIUM)

The clause `"Follow output format — See references/output-format.md for standard visual patterns"` appears as the last item in every skill's constitution. This belongs in `skill-base.md` under Shared Constitution. Moving it saves ~5 tokens × 19 skills = ~95 tokens per invocation at no cost to behavior. More importantly, it signals to every skill that this is inherited behavior, not local policy.

### 3. Tutorial Content in Technical Agents (MEDIUM)

`devops-engineer`, `data-engineer`, `api-designer`, and `security-engineer` all contain explanatory sections that describe well-known concepts (what Kubernetes is, how REST works, what OWASP covers). Claude at Sonnet+ capability doesn't need these explained. These sections serve as developer documentation for humans reading the AGENT.md files, not as behavioral instructions for Claude. Estimated waste: 400–600 tokens across these four agents per invocation.

**Recommendation:** Move tutorial/reference content to comments or separate docs/ files. Keep only what changes Claude's behavior — checklists, specific rules, project-specific constraints.

### 4. C-Suite Agent Behavioral Weakness (HIGH)

CEO, CTO, and engineering-director agents all follow the same pattern: three-bullet constitutions with high-level role descriptions. None of them contain:
- Decision heuristics ("when technical debt is mentioned, always ask for a payoff timeline")
- Activation criteria ("spawn only when X type of work is involved")
- Output formats (unlike most agents, their outputs are described in the SKILL.md of mg-leadership-team, not in their own AGENT.md)
- Conflict resolution approaches

This means that when these agents are spawned, Claude will produce polished-sounding but generic executive assessments. The mg-leadership-team skill partially compensates by providing structured output formats, but the agent definitions themselves provide no differentiation between CEO and CTO perspectives beyond job title.

**Recommendation:** Add 3-5 lines to each C-Suite agent specifying what that role uniquely contributes to a decision. For CEO: business model impact, market timing, resource trade-offs. For CTO: build-vs-buy, technical debt horizon, team capability alignment. For engineering-director: delivery risk, capacity, dependency sequencing.

### 5. Orchestrator/Supervisor Role Boundary Ambiguity (MEDIUM)

The Orchestrator constitution says it "challenges shallow work, enforces process, monitors context usage." The supervisor constitution says it "monitors the agent system, enforces limits, detects issues." Both are watching the system. The Orchestrator additionally acts on what it sees; the supervisor only alerts.

The problem: the boundary is defined in Orchestrator's AGENT.md ("supervisor observes, Orchestrator acts") but the supervisor's own AGENT.md makes no mention of this relationship. If supervisor is spawned directly (not via Orchestrator), it has no awareness that its alerts go to the Orchestrator.

**Recommendation:** Add one line to supervisor's constitution: "Report alerts to orchestrator — supervisor observes and alerts; orchestrator decides and acts." This creates a bidirectional reference.

### 6. Model Version Hardcoding (LOW)

`studio-director` is pinned to `model: claude-opus-4-6`. All other opus-model agents use `model: opus` (generic). This will silently break when the specific version is deprecated. Change to `model: opus`.

### 7. Missing `[ART]` Color in Visual Formatting (LOW)

`visual-formatting.md` defines ANSI colors for `[EM]`, `[CTO]`, `[CEO]`, `[PO]`, `[QA]`, `[SE]`, `[DEV]`, `[GATE]`, `[TIDY]`, `[ED]` — but not `[ART]`, `[DOC]`, `[SEC]`, `[COPY]` even though all four appear in skill output format blocks. These will render without color.

### 8. Design Agent Contradiction with Project Feedback (HIGH)

The design agent's constitution says "Production-ready — Your code ships, not just mockups." The project memory contains a feedback note that design agents produce visual specs, not code — engineers develop against those specs. These are directly contradictory. The AGENT.md should reflect the actual intended behavior.

**Recommendation:** Remove "Your code ships" from design's constitution. Replace with "Specs first — Produce wireframes and component specs; implementation is for dev." The design agent still has access to code tools (Bash is not in its toolset, but Edit and Write are), which can remain for cases where design does prototype frontend code — but the default behavior should be spec production.

### 9. Missing Agent for `mg-design` Skill's `/frontend-design` Reference (MEDIUM)

`mg-design` SKILL.md references `/frontend-design` as the skill to invoke for UI building: "Build UI — Recommend `/frontend-design` with specs". This skill does not exist in the framework. The closest is `mg-build` with a design task. This is a dead reference that will confuse the model.

### 10. Handoff Protocol vs. Actual Practice Mismatch (LOW)

`handoff-protocol.md` defines a formal envelope format (YAML with uuid, chain depth, context limits). No agent AGENT.md or skill SKILL.md actually references or uses this format — they use the simplified `messages-{from}-{to}.json` pattern from `memory-protocol.md`. The formal protocol exists as a spec but is not behaviorally active. This is not necessarily a problem, but it should be acknowledged: the formal handoff envelope is aspirational documentation, not current practice.

---

## Token Budget Analysis

### Current Estimated Token Costs (per spawn, approximate)

| Agent | Current Tokens | Estimated Reducible | Notes |
|-------|---------------|--------------------|----|
| orchestrator | ~2,200 | ~400 | Research protocol is dense but justified; specialist persistence format could be shorter |
| ceo | ~250 | ~0 | Already lean; problem is undercontent, not overcontent |
| cto | ~250 | ~0 | Same as CEO |
| engineering-director | ~250 | ~0 | Same |
| engineering-manager | ~450 | ~50 | Well-calibrated |
| product-owner | ~280 | ~30 | user-feedback.json read is wasted on most invocations |
| product-manager | ~280 | ~20 | Minor cleanup |
| staff-engineer | ~750 | ~200 | Spike protocol Tier 1/2 detail; negative verification steps repeat |
| dev | ~350 | ~30 | Well-calibrated |
| qa | ~400 | ~50 | Misuse ordering should be in constitution; test types table is boilerplate |
| design | ~450 | ~80 | Asset generation pipeline section partially duplicates tool matrix |
| art-director | ~350 | ~50 | Approval checklist is good; reference duplication |
| devops-engineer | ~700 | ~300 | Infrastructure areas and tools sections are reference material Claude knows |
| deployment-engineer | ~250 | ~0 | Near-optimal |
| data-engineer | ~550 | ~200 | Database Patterns tutorial prose is redundant |
| api-designer | ~500 | ~200 | API Design Patterns tutorial prose is redundant |
| security-engineer | ~850 | ~250 | OWASP list + domain files = double-load; review areas prose is reference material |
| technical-writer | ~600 | ~200 | README/JSDoc templates are redundant for Claude |
| copywriter | ~800 | ~150 | Tone calibration section has internal repetition |
| ai-artist | ~550 | ~80 | Model quick reference duplicates tool matrix |
| studio-director | ~600 | ~100 | Missing fields, pinned model version |
| supervisor | ~300 | ~20 | Well-calibrated for its role |

**Agent subtotal:** ~11,160 tokens if all agents loaded simultaneously (never happens in practice)
**Per-spawn cost (typical 3-4 agent invocations):** ~2,000–3,500 tokens from agent definitions

### Skill Token Analysis

| Skill | Current Tokens | Reducible | Primary Waste |
|-------|---------------|-----------|---------------|
| mg | ~400 | ~0 | Lean |
| mg-accessibility-review | ~700 | ~150 | Key Checks duplicates WCAG reference |
| mg-add-context | ~650 | ~200 | Python examples, V1/V2 notes |
| mg-assess | ~600 | ~50 | Minor duplicate field in memory |
| mg-assess-tech | ~500 | ~80 | Spawn YAML duplicates delegation table |
| mg-build | ~700 | ~80 | Date.now() language-specific note |
| mg-code-review | ~550 | ~50 | Security spawn step missing |
| mg-debug | ~450 | ~30 | Minor label inconsistency |
| mg-design | ~450 | ~80 | /frontend-design dead reference, wonton reference |
| mg-design-review | ~550 | ~80 | Micro-interactions section too detailed |
| mg-document | ~300 | ~30 | Review attribution gap |
| mg-init | ~700 | ~100 | Implementation Notes duplicates What This Skill Does |
| mg-leadership-team | ~600 | ~50 | "testable workstreams" undefined |
| mg-refactor | ~500 | ~30 | Minor |
| mg-security-review | ~650 | ~80 | Severity table detail level |
| mg-spec | ~500 | ~30 | Minor |
| mg-ticket | ~650 | ~60 | Title/body truncation limit ambiguity |
| mg-tidy | ~700 | ~80 | Agents Used section is aspirational |
| mg-write | ~700 | ~150 | Anti-AI checklist duplicates copywriter |

**Skill subtotal (all loaded):** ~10,400 tokens
**Realistic per-invocation cost (1-2 skills active):** ~500–1,400 tokens

### Total Reducible Tokens

Across all agents and skills: approximately **2,700–3,200 tokens** of reducible content. This is content that either:
- Claude already knows (REST principles, Kubernetes concepts, JSDoc syntax)
- Duplicates content defined in another file
- Is developer documentation that doesn't change model behavior

At 3 spawns per workflow invocation, this represents ~1,000 tokens of avoidable spend per workflow execution.

---

## Priority Recommendations

Ordered by impact (behavioral × token efficiency × frequency of use).

### P0 — Fix Before Next Release

**1. Fix C-Suite agent behavioral weakness**
Add 3-5 concrete decision heuristics to CEO, CTO, and engineering-director AGENT.md files. These agents are spawned on every architectural workstream. Generic assessments from C-Suite undermine the entire framework's value proposition.

**2. Fix design agent contradiction**
Remove "Production-ready — Your code ships" from design's constitution. This directly contradicts stated project norms. Every design spawn with this instruction active risks the agent writing frontend code instead of specs.

**3. Fix escalation misrouting**
Change `technical-writer`'s escalation from `mg-document` → `engineering-manager`.
Change `copywriter`'s escalation from `mg-write` → `art-director`.

**4. Fix `/frontend-design` dead reference in mg-design**
Either define the skill or change the recommendation to `/mg-build`.

### P1 — High Value, Low Risk

**5. Move constitution boilerplate to skill-base.md**
Remove "Follow output format" from all 19 skill constitutions. Add once to `skill-base.md`. Net: 95 tokens saved per full-skill-load scenario; more importantly, signals correct inheritance.

**6. Add misuse-first ordering to QA agent constitution**
The QA constitution doesn't mention misuse-first. It's only in tdd-workflow.md. QA is spawned independently of tdd-workflow — the instruction must be present in the QA agent itself.

**7. Fix studio-director AGENT.md structure**
Change `model: claude-opus-4-6` → `model: opus`. Add missing frontmatter fields (tools, memory, maxTurns). Add Boundaries section. Move constitution section to correct position.

**8. Add supervisor → orchestrator reference**
One line in supervisor's constitution: "Alert orchestrator — supervisor observes and writes alerts; orchestrator interprets and acts."

### P2 — Quality Improvement

**9. Remove tutorial content from technical IC agents**
Cut devops-engineer's "Infrastructure Areas" and "Common Tools" tutorial sections (~300 tokens).
Cut data-engineer's "Database Patterns" prose (~150 tokens).
Cut api-designer's "API Design Patterns" prose (~150 tokens).
Cut security-engineer's "Security Review Areas" prose (~200 tokens) and replace with domain file references only.

**10. Cut technical-writer's template content**
Remove the embedded README structure template and JSDoc documentation template (~150 tokens). These replicate Claude's native knowledge.

**11. Deduplicate mg-write anti-AI checklist**
The Art Director review checklist in mg-write duplicates the copywriter's built-in self-check. Remove from mg-write or replace with: "Anti-AI check — see copywriter constitution for banned patterns."

**12. Add color codes for missing prefix types**
Add `[ART]`, `[DOC]`, `[SEC]`, `[COPY]` to visual-formatting.md ANSI color section.

### P3 — Completeness

**13. Add C-Suite output format ownership**
CEO, CTO, and engineering-director currently have no output format defined in their own AGENT.md — they inherit it from mg-leadership-team SKILL.md. Consider adding a minimal "Expected Output" section to each so they can be spawned outside the leadership-team skill context.

**14. Clarify dual-specialist review activation in mg-build**
Step 3.5 triggers on "fenced code blocks" in deliverables. This is correct but the term "deliverable" is ambiguous — is this the dev output file, the workstream state file, or the PR description? Specify: "If any file modified by dev contains fenced code blocks."

**15. Add "what if alerts are ignored" to supervisor**
Supervisor has no fallback when its alerts go unacknowledged. Add: "If alert is unacknowledged after 2 workstream state transitions, escalate to engineering-director directly."

**16. Verify security-engineer and mg-security-review memory schema alignment**
`security-engineer` writes to `security-findings.json` with `domains_reviewed: [web, systems, cloud, crypto]`.
`mg-security-review` writes to `agent-security-review-decisions.json` with `domains_reviewed: [web, systems, cloud, crypto]`.
These are different files and both are written. Clarify which is authoritative and which is derived.

---

*Report generated by Principal AI Engineer role. Recommend prioritizing P0 and P1 items before the next feature expansion cycle.*
