# Changelog

All notable changes to the miniature-guacamole framework are documented here.

Versioning follows [Semantic Versioning](https://semver.org/): MAJOR.MINOR.PATCH
- **MAJOR** = Architectural redesign or breaking changes
- **MINOR** = New capabilities, agents, or skills
- **PATCH** = Fixes, docs, and polish

---

## [6.1.2] — 2026-03-24

### Fixed
- Version references updated across README, package.json (was stuck at v5.0/6.0.0)
- Agent count corrected: 24 → 22 across all docs (README, architecture, agents, index)
- CFO model corrected: sonnet → opus in docs/agents.md
- CTO tool access corrected: removed Edit/Write (not in source)
- "Adding a New Agent" contribution guide fixed (was creating skill dir, not agent dir)
- Genericized premium feature descriptions in v5.0.0 changelog per IP policy
- Collapsed .claude/CLAUDE.md from 4 stacked duplicates to 1 authoritative copy
- Removed `bin.mg-studio` from package.json (daemon moved to private repo)

---

## [6.1.1] — 2026-03-24

### Fixed
- Removed product feature names from supervisor tests and audit docs (red team hygiene pass)

---

## [6.1.0] — 2026-03-24

### Added
- **Brand file schemas** — `brand-guidelines.json` and `design-system.json` schemas defined in memory protocol. `mg-init` creates templates on project setup. `mg-design --brand` generates structured JSON that agents read programmatically. (#246, PR #264)
- **Gitignore protection** — `mg-init` now appends `.gitignore` patterns for `.claude/` transient files (agent memory, session backups, install markers). Only adds patterns not already present. (#259, PR #263)
- **Routing preference** — `mg-init` offers routing preference configuration during install (`/mg` vs manual skill invocation). (#260, PR #263)
- **Custom agent documentation** — `/mg` SKILL.md documents the two-step pattern for spawning non-built-in agents via `subagent_type: "general-purpose"` with prompt-loaded identity. (#261, PR #262)

### Fixed
- **`/mg` dispatch now invokes directly** — `/mg` calls the Skill tool to run matched skills instead of just suggesting them. Users no longer need to re-type the command. (#258, PR #262)
- **Core tables migration** — `001-core-tables.sql` updated with missing columns and indexes to match spec. (#247, PR #252)
- **5 release blockers resolved** — doc accuracy, agent/skill counts, build exclusions, installer detection. (#243, PR #249)

### Changed
- **Community/premium separation complete** — All references to proprietary components removed from codebase, documentation, benchmarks, tests, and git history. Git history rewritten via `git-filter-repo` (WS-7). Proprietary components live exclusively in private repo.
- **Site removed** — Marketing site source (`site/`) removed from community repo. Product site deployed separately.
- **Daemon migrated** — Daemon source moved to private repo. Community repo retains framework agents and skills only.
- **Visual Output Protocol v2** — Shipped in this release cycle (PR #248).

### Infrastructure
- GitHub Pages deploy workflow added for docs site
- Premium-named branches and tags cleaned from repo history

---

## [6.0.0] — 2026-03-23

### Breaking Changes
- **`/mg` is the new front door** — `/mg-leadership-team` merged into `/mg` as its leadership mode. Use `/mg plan` for planning and `/mg review` for code review. The old `/mg-leadership-team` remains as a legacy alias.
- **Visual Output Protocol v2** — `silent` mode removed (no diagnostic trail), `full` renamed to `verbose`. Two modes only: `compact` (default) and `verbose` (opt-in via `--verbose`).
- **Badge Identity System** — All 24 agents assigned to 5 colored badge categories (LEAD/ENG/QA/CREATE/COORD). Compact output now includes badge prefixes.
- **Columnar Activity Feed** — Boxed Style 1 and inline Style 2 replaced with columnar format using `>>` `<<` `..` `!!` prefixes.
- **Border Hierarchy** — Medium-weight borders (┏━) retired. Two weights: double (╔═) for team/error, thin (┌─) for agent/gate.
- **Installer behavior** — `install.sh` now detects global `~/.claude/` and skips framework copy. Use `--standalone` to override.

### Added
- Columnar activity feed with directional prefixes and badge identity
- `--standalone` flag for `install.sh` to force project-local copy
- 32 new tests (mode-simplification, border-hierarchy, badge-system, build-exclusions, install-global-detect)

### Changed
- `visual-formatting.md`: 336 → 195 lines (42% token reduction)
- Agent/skill counts corrected across all docs: 24 agents, 19 skills
- Documentation updated to teach `/mg plan` and `/mg review` as primary commands
- CI pipeline: removed stale `dashboard` job (moved to premium)
- Premium content (Orchestrator, MG skills) excluded from community distribution

### Migration Guide
- Replace `output_mode: silent` → remove (no longer supported)
- Replace `output_mode: full` → `output_mode: verbose`
- Replace `/mg-leadership-team plan` → `/mg plan`
- Replace `/mg-leadership-team review` → `/mg review`
- If using `install.sh` with a global `~/.claude/`, framework files are no longer copied project-locally. Use `--standalone` if you need project-local copies.

---

## [5.0.0] — 2026-03-22

### Added
- **The Orchestrator** — premium-only orchestrator agent (details in private repo)
- **CMO/COO agent** — operations, marketing, go-to-market, brand consistency
- **CFO agent** — cost analysis, token budget management, ROI assessment
- **Config C** — validated production config (opus Orchestrator, sonnet C-Suite, 40% cost savings)
- **Premium auth pipeline** — mg login/logout/upgrade/status CLI commands (details in private repo)
- **Benchmark harness** — 7 task types, 4 model configs, drift cost analysis
- **Premium boundary tests** — community/premium isolation verified
- **Session management** — session management protocol (details in private repo)
- **Research specialist persistence** — research specialist persistence (details in private repo)

### Changed
- Agent count: 20 → 24 (added Orchestrator, CMO, CFO; all existing agents upgraded)
- CEO, CTO, ED constitutions strengthened with 5-6 concrete decision heuristics each
- /mg-leadership-team v2.0 — dual premium/community mode with edition detection
- Supervisor: upgraded as community quality watchdog, escalates to Orchestrator in premium
- 19 skill constitutions: "Follow output format" consolidated to skill-base.md
- ~169 lines of tutorial content removed from technical agents (devops, data, api, security, technical-writer)
- Design agent: "your code ships" → "specs first"
- Visual formatting: 4 new color codes ([ART], [DOC], [SEC], [COPY])

### Security
- LICENSE.ext for proprietary Orchestrator distribution
- build.sh excludes Orchestrator from community distribution
- Premium session validation
- Security headers (_headers), robots.txt, pilot gate hardened

## [4.2.0] — 2026-03-20

### Added
- Value CTA section on marketing site
- v4.2.0 changelog on site

---

## [4.1.0] - 2026-03-19 — Output Parity

Runtime output now matches the marketing site terminal animation.

### Added
- **Compact output protocol** — `[ROLE]  Status message    elapsed` format across all 19 skills
- **Timing instrumentation** — per-step and total elapsed time in mg-build output
- **ANSI color codes** — agent prefixes colored to brand palette (with NO_COLOR fallback)
- **Marketing site** — Astro dark-first single-page site with terminal hero, org chart, changelog

### Changed
- `visual-formatting.md` rewritten — removed ASCII box art, defined compact protocol
- All 19 skill output format sections updated to compact [ROLE] prefix blocks
- Agent base template gains "Compact output" constitution item
- Terminal animation updated to show real mg-build output with timing

---

## [4.0.1] - 2026-03-19

### Fixed
- **Test expectations** — updated test counts and assertions for v4.0.0 framework changes

---

## [4.0.0] - 2026-03-19 — Framework Hardening

Architectural overhaul: base template inheritance, 2-track development cycle, and inter-agent communication.

### Added
- **Base template inheritance** — `agents/_base/agent-base.md` and `skills/_base/skill-base.md` extract shared boilerplate (Memory-first, Visual standards, memory protocol, boundaries format) (#92)
- **Development cycle v2** — classification at intake, MECHANICAL track (1 spawn + bash gate), ARCHITECTURAL track (5-6 spawns down from 11) (#93)
- **`--force-mechanical` / `--force-architectural`** flags on `/mg-build`
- **Agent message bus** — `messages-{from}-{to}.json` for structured inter-agent communication (#94)
- **Message types** — `info`, `question`, `blocker`, `handoff` with formal schema
- **Phase 2 MCP design** — `docs/technical-design-agent-comms.md` for future `agent://` resources

### Changed
- All 20 agents inherit base template (removed duplicated constitution items)
- All 19 skills inherit base template
- `development-workflow.md` — complete rewrite with dual-track diagram
- `tdd-workflow.md` — rewrite with MECHANICAL solo TDD and ARCHITECTURAL parallel QA+Dev
- `mg-build` SKILL.md — v2.0 with intake classification, flag support, message bus coordination
- Dev agent gains MECHANICAL Mode (writes tests AND implements)

### Impact
- **Speed**: MECHANICAL work drops from 11 spawns → 1 spawn (10x faster)
- **Tokens**: ~42% reduction in per-agent/skill boilerplate via inheritance
- **Quality**: Coverage requirements unchanged (99%), classification rules unchanged

---

## [3.1.0] - 2026-03-19 — State Reconciliation

### Added
- **`/mg-tidy` skill** — reconciles project state across GitHub issues and `.claude/memory/` workstream files (#89)
  - Duplicate issue detection and bulk close (keeps highest-numbered)
  - Orphaned memory detection and cleanup
  - Missing memory stub creation
  - Stale issue flagging (14+ days no activity)
  - Modes: default (confirm), `--dry-run` (audit only), `--auto` (auto-apply)
- **`/mg` dispatcher** — routes `tidy`, `clean up state`, `reconcile`, `sync state` to `/mg-tidy`
- **Workstream memory files** — initialized state for STUDIO, DAEMON, SECURITY, FRAMEWORK workstreams

### Fixed
- Closed 38 duplicate/stale GitHub issues (#90)
- Issue tracker reduced from 52 → 18 canonical open issues

---

## [2.2.0] - 2026-03-18 — Two-Phase Install

Global CLI installer + per-project init. Install once, init anywhere.

### Changed
- **`web-install.sh`** — now installs globally to `~/.miniature-guacamole/` and symlinks scripts to `~/.local/bin/`
- **`mg-init`** — reads from global bundle instead of downloading from GitHub. No network required.
- **BASH_SOURCE guards** — fixed unbound variable in `mg`, `mg-help`, `mg-workstream-transition`, `uninstall.sh`
- **Location validation** — removed `.claude/scripts/` path check from `mg`, `mg-help`, `mg-workstream-transition` (scripts now run via symlink from `~/.local/bin/`)

### Added
- **Templates in dist** — `build.sh` now copies `src/framework/templates/` to dist for mg-init scaffolding
- **VitePress srcExclude** — internal PRD/tech-design docs excluded from site build (fixes build failure)
- **Contributing docs** — "Building and Testing Your Changes" section

### Fixed
- **Docs site build** — `prd-cli-primary.md` angle brackets caused Vue compiler failure; excluded internal docs from build

### Workstreams
`WS-INSTALL-1`

---

## [2.1.0] - 2026-03-16 — CLI-Primary Architecture

MCP server deprecated, `mg` CLI router added as unified entrypoint. Closes
DEC-003. Zero consumers of the MCP server; 17 existing scripts already cover
all functionality at 10-32x lower token cost.

### Removed
- **MCP server** (v0.1.0) — archived per DEC-003. Zero consumers, 10-32x token overhead vs CLI, 80+ unused dependencies

### Added
- **`mg` CLI router** — unified entrypoint dispatching to 17 mg-* scripts. Short aliases (`ws`, `mem`)
- **`--json` output flag** — on mg-workstream-status, mg-memory-read, mg-gate-check for machine-readable output

### Fixed
- **Step 4A/4B label collision** (#13) — label conflict between mg-build and development-workflow resolved
- **mg-gate-check infinite loop** — flag parsing loop now exits correctly

### Workstreams
`WS-CLI-1`

---

## [1.2.0] - 2026-03-10 — Platform Expansion

MCP server, token audit logging, Docker Compose support, and skill spec
compliance. The framework now exposes a machine-readable API alongside stdio.

### Added
- **MCP server** (`WS-MCP-0A..0D`) — new `mcp-server/` package with stdio transport, workstream/memory/agent event resources, executable binary, and HTTP API + REST endpoints running alongside stdio
- **Token audit log** (`WS-16`) — JSONL rotating logger with per-session token tracking and configurable limits
- **Docker Compose** (`WS-DASH-1`) — `docker compose up` starts Postgres + Next.js dashboard together; migrations run automatically on first start

### Changed
- **Skill frontmatter compliance** (`WS-COMPAT-1`) — `tools:` → `allowed-tools:`, added `metadata.version` and `compatibility:` fields across all 16 SKILL.md files
- **Skill content organization** (`WS-COMPAT-2`) — extracted Model Escalation and verbose Output Format sections from 11 skills into `references/` companion files (14 new files); progressive disclosure pattern

### Workstreams
`WS-MCP-0A..0D`, `WS-16`, `WS-DASH-1`, `WS-COMPAT-1`, `WS-COMPAT-2`

---

## [1.1.0] - 2026-02-10 — Premium Adapter Boundary

Premium and OSS builds split at a clean plugin boundary. CI hardened to
run cleanly without premium dependencies.

### Added
- **Premium adapter API** (`WS-SPLIT-4`) — `registerAdapter()` plugin boundary; premium extensions attach without touching OSS core

### Changed
- **CI hardening** (`WS-SPLIT-3`) — removed `pg` and `aws-sdk` from OSS `package.json`; resolved 3 CI-environment test failures

### Workstreams
`WS-SPLIT-3`, `WS-SPLIT-4`

---

## [1.0.0] - 2026-02-10 — Initial Release

The first public release of miniature-guacamole. Action-based skill system with
`mg-` prefix, 16 skills, 19 agents, project-local architecture, and mechanical
quality gates.

### Added
- **mg-debug skill** — Structured debugging workflow (Reproduce → Investigate → Fix → Verify)
- **mg-refactor skill** — TDD-safe refactoring (Characterize → Refactor → Verify → Review)
- **Spawn cap enforcement** — All 16 skills enforce a maximum of 6 agent spawns per invocation

### Changed
- **All 14 existing skills renamed** with `mg-` prefix (ADR-SKILL-02):
  - `/leadership-team` → `/mg-leadership-team`
  - `/engineering-team` + `/implement` → `/mg-build` (merged, ADR-SKILL-06)
  - `/product-team` → `/mg-spec`
  - `/design-team` → `/mg-design`
  - `/docs-team` → `/mg-document`
  - `/content-team` → `/mg-write`
  - `/feature-assessment` → `/mg-assess`
  - `/technical-assessment` → `/mg-assess-tech`
  - `/code-review` → `/mg-code-review`
  - `/design-review` → `/mg-design-review`
  - `/security-review` → `/mg-security-review`
  - `/accessibility-review` → `/mg-accessibility-review`
  - `/init-project` → `/mg-init`
  - `/add-project-context` → `/mg-add-context`
- **80+ files updated** — shared protocols, agent files, installer, README, CLAUDE.md, 48 test files
- **MG_SKILLS array** updated to 16 mg-prefixed entries

### Removed
- `/engineering-team` skill (merged into `/mg-build`)
- `/implement` skill (merged into `/mg-build`)
- All old skill directory names (hard cutover, ADR-SKILL-03)

### Architecture Decisions
- ADR-SKILL-01: Prompt-only implementation (SKILL.md changes only)
- ADR-SKILL-02: `mg-` prefix on all skills
- ADR-SKILL-03: Hard cutover, no backwards compatibility
- ADR-SKILL-04: Prompt-based chaining
- ADR-SKILL-05: Spawn cap of 6 per skill
- ADR-SKILL-06: engineering-team + implement → mg-build
- ADR-SKILL-07: mg-debug + mg-refactor added; mg-deploy + mg-qa deferred

### Workstreams
`WS-SKILLS-0..8`

---

## Pre-Release History

The following versions were used internally during development. They are
documented here for historical reference and are not part of the public
release series.

---

## [3.1.0-pre] - 2026-02-09 — Unified Installation

Introduces `mg-util`, the unified command-line interface for managing
miniature-guacamole installations across projects.

### Added
- **`mg-util` unified command** (`WS-INSTALL-0/1/2`):
  - `mg-util init [project-dir]` — project initialization with idempotent memory setup (100% tests passing)
  - `mg-util audit [--project | --global]` — settings bloat check + cost reporting with global aggregation (94% tests passing)
  - `mg-util install` — core installation to `~/.miniature-guacamole/` with PATH integration (100% tests passing)
  - `mg-util update` — version management, project tracking, memory preservation (100% tests passing)
  - `mg-util configure` — interactive configuration with YAML management (100% tests passing)
  - `mg-util status` — installation health with broken symlink detection (100% tests passing)
  - `mg-util uninstall` — clean removal with confirmation (100% tests passing)
- **266 BATS tests** across 5 test suites, 263 passing (99%)
- **4 audit test fixtures** for cost reporting edge cases
- **Project template** (`src/framework/templates/project/CLAUDE.md`)

### Fixed (v3.1.1)
- Bash arithmetic trap: `(( count++ ))` returns exit 1 under `set -e` when count=0
- Source directory validation (readable, writable, exists checks)
- Broken symlink detection in `mg-util status`
- `--source` flag for local directory updates
- `--dry-run` mode for update preview
- Project memory preservation during `mg-util update`
- Config file YAML validation and backup before modification

### Workstreams
`WS-INSTALL-0` (shipped), `WS-INSTALL-1` (shipped), `WS-INSTALL-2` (shipped)

---

## [3.0.0-pre] - 2026-02-09 — Production Architecture

The framework graduates from a monolithic `.claude/` directory to a proper
source-build-install pipeline with CI/CD, mechanical quality gates, and
permission hygiene tooling.

### Added
- `src/framework/` source tree — canonical location for all agents, skills, shared protocols, scripts
- `src/installer/` — install.sh, uninstall.sh, web-install.sh, mg-init, mg-migrate (1,031-line migration tool)
- `build.sh` — single-command build producing `dist/` bundle
- `.github/workflows/ci.yml` + `release.yml` — CI pipeline with BATS test runner
- `mg-settings-check` utility — detects and cleans permission bloat in settings.local.json
  - Flags patterns >200 chars and files >5K total
  - `--fix` mode with backup, confirmation, and atomic writes
  - 43 BATS tests (misuse-first ordering)
- Script-First Pattern standard — agents must use Write tool for file creation, never bash heredocs
  - Documented in `engineering-principles.md`, `qa/agent.md`, `dev/agent.md`, `tdd-workflow.md`
- Project-local architecture — `.claude/` uses symlinks to `src/framework/`, keeping source of truth in `src/`
- Constraint-Driven Agentic Development (CAD) system:
  - WS-CAD-0: Misuse-first TDD ordering (misuse -> boundary -> golden path)
  - WS-CAD-1: Artifact bundles for task agents (pre-computed INPUTS, GATE, CONSTRAINTS)
  - WS-CAD-2: Curated context protocol (75K -> 16K tokens per task agent, 79% reduction)
  - WS-CAD-3: Mechanical quality gates with classification rules (R1-R8/M1-M5)

### Changed
- Repository structure: `.claude/` agents/skills/scripts -> `src/framework/` (source of truth)
- `templates/` removed, replaced by `src/installer/`
- `scripts/build-dist.sh`, `scripts/build-templates.sh` -> unified `build.sh`
- Test paths updated to reference `src/framework/scripts/`
- Settings permission extraction uses `permissions.allow/deny/ask` (not `disabledSkills.patterns`)

### Removed
- `scripts/install-config-cache.sh` and `scripts/test-config-cache.sh`
- `templates/` directory (migrated to `src/installer/`)
- `WS-LOCAL-6-SUMMARY.md` working document

### Workstreams
`WS-LOCAL-0..6`, `WS-SETTINGS-1+2`, `WS-0..7`, `WS-CAD-0..3`

---

## [2.0.0-pre] - 2026-02-08 — Operations Infrastructure

The framework becomes self-distributing and self-monitoring. Script utilities
replace fragile inline JSON manipulation, installation becomes automated,
and cost tracking gets cross-project aggregation.

### Added
- **9 mg-* script utilities** (`WS-SCRIPTS-0..3`):
  - `mg-memory-read` — read and pretty-print JSON memory files
  - `mg-memory-write` — atomic JSON updates with backup management
  - `mg-workstream-status` — display workstream state and progress
  - `mg-workstream-create` — create new workstream tracking files
  - `mg-workstream-transition` — move workstreams between lifecycle phases
  - `mg-gate-check` — run mechanical quality gate checks
  - `mg-git-summary` — repository status summary
  - `mg-diff-summary` — diff summary for commits
  - `mg-help` — unified help for all mg-* commands
  - Each script has a BATS test suite
- **Global distribution** (`WS-INIT-1/2/3`):
  - `mg-init` project initializer — creates `.claude/memory/` structure, project CLAUDE.md
  - Automated installer with PATH integration
  - Auto project initialization via hooks
- **Cost estimation and ROI reporting** (`WS-AUDIT-1+2`):
  - Per-workstream cost estimation based on token usage
  - ROI reporting with cross-project aggregation
  - Human-equivalent hour calculations

### Workstreams
`WS-SCRIPTS-0..3`, `WS-INIT-1/2/3`, `WS-AUDIT-1+2`

---

## [1.5.0-pre] - 2026-02-07/08 — Teams & Dashboard

Agent Teams support enables multi-agent collaboration within Claude Code's
native team infrastructure. The React dashboard reaches feature-complete
with real-time integration.

### Added
- **Agent Teams** (`WS-TEAMS-1..3`):
  - Team-aware agent definitions with frontmatter metadata
  - Quality gate hooks: `project-init-check.sh`, `safety-check.sh`, `task-completed.sh`, `teammate-idle.sh`
  - Agent frontmatter modernization across all 18 agents
- **Dashboard completion** (`WS-DASH-1..6`):
  - Foundation & data layer (React + TypeScript)
  - Component library with chart visualizations
  - Agent question routing and real-time integration
  - Activity feed with live updates
  - Test hardening with full coverage
- **Daemon system** (`WS-DAEMON-0..5`, `ARCH-006`):
  - Process manager for long-running agent coordination
  - CLI interface for daemon control
  - Jira client integration
  - GitHub client integration

### Workstreams
`WS-TEAMS-1..3`, `WS-DASH-1..6`, `WS-DAEMON-0..5`

---

## [1.4.0-pre] - 2026-02-06 — Open Source Readiness

Repository sanitized and documented for public release. Governance model
established, CI/CD pipeline added, and launch readiness validated.

### Added
- **Copywriter agent + Content-Team skill** (`WS-CONTENT-1+2`):
  - Brand-aligned copywriting agent for marketing, narration, web, and scripts
  - `/content-team` collaborative workflow skill
- **OSS launch preparation** (`WS-OSS-1..5`):
  - Repository sanitization — removed credentials, internal references
  - Documentation & governance — CONTRIBUTING.md, CODE_OF_CONDUCT.md, LICENSE
  - Landing page for framework showcase
  - CI/CD pipeline for automated testing
  - Launch validation & readiness checklist

### Workstreams
`WS-OSS-1..5`, `WS-CONTENT-1+2`

---

## [1.3.0-pre] - 2026-02-05 — Observability & Optimization

Memory management hardened, model usage optimized with Sonnet+escalation,
per-workstream cost tracking added, and the dashboard foundation laid.

### Added
- **Process lifecycle management** (`WS-MEM-1`):
  - Resource cleanup on agent termination
  - Orphan process detection and recovery
- **State management hygiene** (`WS-MEM-2`):
  - Memory file validation and corruption recovery
  - Stale state detection and cleanup protocols
- **Diagram generation module** (`WS-DIAGRAMS`):
  - Programmatic diagram generation for architecture visuals
- **Per-workstream usage tracking** (`WS-TRACKING-P1/P2`):
  - Phase 1: Audit tagging per workstream
  - Phase 2: Basic reporting with agent-level breakdowns
- **Dashboard foundation** (`WS-DASH-1+2`):
  - React + TypeScript data layer
  - Initial component library

### Changed
- **Model optimization** — skills now default to Sonnet with escalation protocol to Opus only for complex analysis (`refactor(skills)`)
- **NDA-safe isolation** — Opus reserved for analysis skills, broader permissions scoped per project

### Workstreams
`WS-MEM-1`, `WS-MEM-2`, `WS-DIAGRAMS`, `WS-TRACKING-P1/P2`, `WS-DASH-1+2`

---

## [1.2.0-pre] - 2026-02-04 (evening) — Visual Generation

Visual artifact pipeline from generation through art director approval
to Git LFS storage. Comprehensive audit logging documented.

### Added
- **Visual generation infrastructure** (`WS-17`):
  - Template-based visual generation system
  - Asset management and output directory structure
- **Puppeteer generation engine** (`WS-18/19`):
  - Headless Chrome rendering for visual artifacts
  - Metadata tracking for generated assets
- **Art director approval workflow** (`WS-20`):
  - Review queue for visual artifacts before release
  - Approval/rejection with feedback loop
- **Git LFS integration** (`WS-21`):
  - Large visual assets stored via Git LFS
  - Automated LFS tracking rules
- **Audit logging documentation** (`WS-16-DOCS`):
  - Comprehensive guide for token usage audit system
- **Utility permissions** (`WS-PERMS`):
  - Pre-approved permission patterns to reduce TDD prompt interruptions

### Workstreams
`WS-17..21`, `WS-16-DOCS`, `WS-PERMS`

---

## [1.1.0-pre] - 2026-02-04 (afternoon) — Skills & Visual Standards

The framework expands from 5 to 13 skills, gains visual output standards,
and adds token usage auditing.

### Added
- **7 new workflow skills** (`WS-8..14`):
  - `/feature-assessment` — feature intake and evaluation
  - `/technical-assessment` — architecture decision evaluation
  - `/security-review` — OWASP and vulnerability auditing
  - `/accessibility-review` — WCAG 2.1 AA/AAA compliance
  - `/design-review` — visual quality and UX assessment
  - `/code-review` — code quality and standards compliance
  - `/implement` — TDD cycle execution (qa -> dev -> staff-engineer)
- **Centralized visual output format** (`WS-15`):
  - Standardized ASCII art output across all skills
  - Consistent progress reporting format
- **Token usage audit log** (`WS-16`):
  - Per-session and per-agent token tracking
  - ASCII visual progress indicators
- **Visual standards** applied to all 18 agents

### Workstreams
`WS-8..16`

---

## [1.0.0-pre] - 2026-02-04 (morning) — Genesis

The initial release of miniature-guacamole. A product development team
simulation with 18 specialized agents, shared memory, and structured
communication protocols.

### Added
- **18 specialized agents**:
  - Leadership: CEO, CTO, Engineering Director, Product Owner
  - Management: Engineering Manager, Product Manager, Art Director
  - Engineering: Staff Engineer, Dev, QA, DevOps, Security Engineer, Data Engineer, API Designer
  - Delivery: Deployment Engineer, Technical Writer, Design, Supervisor
- **Shared memory layer** (`WS-1`):
  - `tasks-{role}.json` — per-agent task queues
  - `handoffs-{from}-{to}.json` — agent-to-agent coordination
  - `workstream-{id}-state.json` — workstream lifecycle tracking
  - `decisions.json` — architecture and design decisions
- **Role reinforcement anchors** (`WS-2`):
  - Identity anchoring in all skill prompts to prevent role drift
- **Structured return envelopes** (`WS-3`):
  - Consistent JSON response format across all agent types
- **Agent/skill separation** (refactor):
  - Individual roles migrated from monolithic skills to standalone agents
- **5 domain agents** (`WS-5/6/7`):
  - docs-team, security, devops, API designer, data engineer
- **6 initial skills**:
  - `/leadership-team`, `/engineering-team`, `/product-team`, `/design-team`, `/docs-team`, `/content-team`
- **Shared protocols**:
  - `development-workflow.md` — gate-based development process
  - `tdd-workflow.md` — test-driven development cycle
  - `memory-protocol.md` — agent memory read/write conventions
  - `handoff-protocol.md` — agent coordination patterns
  - `engineering-principles.md` — code quality standards
  - `visual-formatting.md` — ASCII art progress reports

### Workstreams
`WS-1..7`

---

## Version Summary

| Version | Date       | Codename               | Key Milestone                              |
|---------|------------|------------------------|--------------------------------------------|
| **5.0.0** | **2026-03-22** | **Orchestrator & C-Suite** | **Orchestrator agent, CMO/COO, CFO, Config C, 52 boundary tests, 24 agents** |
| **4.2.0** | **2026-03-20** | **Value CTA** | **Marketing value section, daemon docs, site changelog** |
| **4.1.0** | **2026-03-19** | **Output Parity** | **Compact output protocol, ANSI colors, timing, marketing site** |
| **4.0.0** | **2026-03-19** | **Framework Hardening** | **Base template inheritance, 2-track dev cycle, agent message bus** |
| **3.1.0** | **2026-03-19** | **State Reconciliation** | **`/mg-tidy`, base template inheritance, security domain expansion** |
| **3.0.0** | **2026-03-19** | **Autonomous Daemon** | **24/7 ticket-to-PR pipeline, Jira/Linear/GitHub, 1082 tests** |
| **2.2.0** | **2026-03-18** | **Two-Phase Install** | **Global CLI installer + per-project init** |
| **2.1.0** | **2026-03-16** | **CLI-Primary** | **MCP server removed, mg router added, --json output** |
| **1.2.0** | **2026-03-10** | **Platform Expansion** | **MCP server, token audit log, Docker Compose, skill spec compliance** |
| **1.1.0** | **2026-02-10** | **Adapter Registry** | **registerAdapter() plugin boundary, CI hardening** |
| **1.0.0** | **2026-02-10** | **Initial Release** | **16 mg-prefixed skills, 19 agents, project-local architecture** |

### Pre-Release Versions

| Version | Date       | Codename               | Key Milestone                              |
|---------|------------|------------------------|--------------------------------------------|
| 1.0.0-pre | 2026-02-04 | Genesis              | 18 agents, shared memory, 6 skills         |
| 1.1.0-pre | 2026-02-04 | Skills & Visual      | +7 skills (13 total), visual standards      |
| 1.2.0-pre | 2026-02-04 | Visual Generation    | Puppeteer engine, art director workflow     |
| 1.3.0-pre | 2026-02-05 | Observability        | Memory hygiene, model optimization, dashboard|
| 1.4.0-pre | 2026-02-06 | Open Source Ready    | OSS prep, copywriter agent, CI/CD          |
| 1.5.0-pre | 2026-02-07 | Teams & Dashboard    | Agent teams, full dashboard, daemon system  |
| 2.0.0-pre | 2026-02-08 | Operations           | 9 mg-* scripts, global distribution, cost tracking |
| 3.0.0-pre | 2026-02-09 | Production Architecture| src/build/install pipeline, CAD, permission hygiene |
| 3.1.0-pre | 2026-02-09 | Unified Installation | mg-util command, init/audit shipped, 284 tests      |
