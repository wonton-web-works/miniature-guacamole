# Glossary

**TheEngOrg / miniature-guacamole**
*Technical Due Diligence Package -- Terminology*

---

## Agent

A specialized role defined by a markdown file (its constitution) that constrains how Claude Code behaves when spawned for a specific function. Each agent has a name, model tier, tool permissions, memory protocol, and delegation authority. Example agents: CEO, CTO, Dev, QA, Supervisor. There are 24 agents in the framework. An agent is not a separate model or service -- it is a structured prompt that shapes a single Claude Code invocation.

## Agent Constitution

The markdown document that defines an agent's behavior. Contains numbered decision heuristics with concrete thresholds, mandatory output format fields, explicit scope boundaries, delegation rules, and memory read/write protocols. The constitution is the core IP of the framework -- the quality of the constitution determines the quality of agent output, independent of model tier (within the opus/sonnet range). See `defensibility.md` for why this is the moat.

## Artifact Bundle

A pre-computed, compressed context package sent to task agents (Dev, QA) at spawn time. Instead of giving task agents full memory access, the orchestrator reads all relevant context and extracts only what the agent needs. QA receives ~8K tokens; Dev receives ~12K tokens. This reduces context from ~75K to ~16K per spawn (79% reduction) and improves signal-to-noise ratio by 16x.

## CAD (Constraint-Driven Agentic Development)

The development workflow methodology used by the framework. Builds on TDD/BDD with three additions: (1) classification at intake before any agent spawns, (2) misuse-first test ordering (security cases before happy paths), and (3) artifact bundles with curated context for task agents. CAD defines the MECHANICAL and ARCHITECTURAL tracks.

## Config C

The production model allocation strategy. Sage runs on opus; C-Suite agents (CEO, CTO, CMO, CFO) run on sonnet; Directors and ICs run on sonnet; Supervisor runs on haiku. Achieves a 1.000 (perfect) benchmark score at approximately 60% of the all-opus cost. Named "Config C" because it was the third configuration tested during the benchmark campaign (A = weak constitutions on opus, B = strong constitutions on opus, C = strong constitutions on tiered models, D = all sonnet).

## Community Edition

The open-source distribution of the framework. Includes 23 agents (all except Sage), all 16 skills, and all 6 protocols. Skills detect the edition at runtime by checking for the Sage agent file. Community mode spawns CEO + CTO + Engineering Director for all planning tasks regardless of scope.

## Delegation Chain

The sequence of agents involved in completing a task, tracked by the handoff protocol. Each delegation increments a depth counter. Maximum depth is 3. The Supervisor monitors chains and blocks further delegation at the cap. Circular delegation (agent A delegates to B, which delegates back to A) is prevented at the protocol level.

## Edition Detection

The mechanism by which skills determine whether to run in Community or Enterprise mode. Implemented as a filesystem check: if `agents/sage/AGENT.md` exists, the skill runs in Enterprise mode. If absent, Community mode. No feature flags, no license keys, no runtime checks. The Sage file is excluded from the community build at distribution time.

## Enterprise Edition

The paid distribution of the framework. Adds the Sage agent, which provides selective C-Suite spawning, session management, research evaluation, drift detection, specialist persistence, and real-time execution monitoring. The Sage is the primary differentiator between tiers -- see `defensibility.md` for the capability gap analysis.

## Handoff Protocol

The structured envelope format for passing context between agents during delegation. Includes routing metadata (UUID, type, timestamp), chain tracking (depth, path, origin), task specification (objective, success criteria, deliverable), and a context payload (essential facts, references, explicitly excluded information). Ensures minimal-but-sufficient context transfer.

## MECHANICAL Track

The lightweight development track for simple, low-risk workstreams. A single Dev agent handles the full TDD cycle (write tests, implement, refactor) followed by an automated bash gate that verifies tests pass, coverage is 99%+, changes are under 200 lines, and no framework files were modified. No leadership review required. Handles approximately 60% of workstreams.

## ARCHITECTURAL Track

The full development track for complex or risky workstreams. Involves 5-6 agent spawns: leadership planning, QA test specification, Dev implementation, Staff Engineer review, leadership code review, and deployment. Used when any R-rule matches (package changes, security paths, new directories, CI/CD changes, etc.) or when classification is uncertain (conservative bias).

## Memory Protocol

The convention by which agents read and write state to project-local JSON files in `.claude/memory/`. Each agent's constitution specifies which files it reads before acting and which files it writes after. Memory is project-scoped, never crosses between clients or projects, and supports atomic writes with automatic backups.

## Sage (The Sage)

The enterprise-only orchestrator agent at the top of the hierarchy. Runs on opus. The Sage is the entry point for all enterprise-mode work. It assesses scope, selectively spawns C-Suite agents (only the roles the work requires), manages multi-session initiatives, evaluates research depth, detects process violations, and prevents context drift. The Sage does not build -- it orchestrates, evaluates, and enforces quality. It is the technical embodiment of the brand's "monk capybara" -- see `brand-narrative-technical.md`.

## Skill

A markdown file that defines a multi-step workflow involving multiple agents. Skills are invoked by the user (e.g., `/mg-build`, `/mg-leadership-team`) and orchestrate agent spawning, handoffs, and gate enforcement. There are 16 skills in the framework. A skill is to an agent what a process is to a role -- it defines the sequence of work, not the expertise applied at each step.

## State Sync

The mandatory post-approval checklist that runs after every leadership decision. Creates or updates GitHub issues for each workstream, writes decision records to memory, ensures workstreams have acceptance criteria and classification, and produces a handoff report. Prevents drift between what was decided and what the system knows.

## Supervisor

The lightweight monitoring agent that runs on haiku (the smallest model). Reads all memory files but cannot write code, spawn agents, or make decisions. Detects depth violations (delegation > 3), loops (same task appearing 3+ times), agent failures, and timeouts. Writes alerts to `supervisor-alerts.json`. In Enterprise mode, alerts go to the Sage for action. In Community mode, alerts go to the Engineering Director.

## Swap Test

A benchmark evaluation method. After all C-Suite agents produce their outputs independently, evaluators check whether any agent's output could have been written by a different agent. If outputs are role-interchangeable, the constitutions have failed to differentiate the agents. TheEngOrg's agents consistently PASS the swap test -- each output contains domain-specific reasoning that only that role would produce.

## Workstream

A discrete unit of work with defined acceptance criteria, a classification (MECHANICAL or ARCHITECTURAL), and a lifecycle tracked in memory. Workstreams are created during leadership planning, executed via `/mg-build`, and tracked in `workstream-{id}-state.json`. Branch naming follows the pattern `feature/ws-{number}-{short-name}`.
