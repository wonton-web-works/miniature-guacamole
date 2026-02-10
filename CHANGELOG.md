# Changelog

All notable changes to the miniature-guacamole framework are documented here.

Versioning follows [Semantic Versioning](https://semver.org/): MAJOR.MINOR.PATCH
- **MAJOR** = Architectural redesign or breaking changes
- **MINOR** = New capabilities, agents, or skills
- **PATCH** = Fixes, docs, and polish

---

## [3.1.0] - 2026-02-09 — Unified Installation

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

## [3.0.0] - 2026-02-09 — Production Architecture

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

## [2.0.0] - 2026-02-08 — Operations Infrastructure

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

## [1.5.0] - 2026-02-07/08 — Teams & Dashboard

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

## [1.4.0] - 2026-02-06 — Open Source Readiness

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

## [1.3.0] - 2026-02-05 — Observability & Optimization

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

## [1.2.0] - 2026-02-04 (evening) — Visual Generation

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

## [1.1.0] - 2026-02-04 (afternoon) — Skills & Visual Standards

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

## [1.0.0] - 2026-02-04 (morning) — Genesis

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
| 1.0.0   | 2026-02-04 | Genesis                | 18 agents, shared memory, 6 skills         |
| 1.1.0   | 2026-02-04 | Skills & Visual        | +7 skills (13 total), visual standards      |
| 1.2.0   | 2026-02-04 | Visual Generation      | Puppeteer engine, art director workflow     |
| 1.3.0   | 2026-02-05 | Observability          | Memory hygiene, model optimization, dashboard|
| 1.4.0   | 2026-02-06 | Open Source Ready      | OSS prep, copywriter agent, CI/CD          |
| 1.5.0   | 2026-02-07 | Teams & Dashboard      | Agent teams, full dashboard, daemon system  |
| 2.0.0   | 2026-02-08 | Operations             | 9 mg-* scripts, global distribution, cost tracking |
| 3.0.0   | 2026-02-09 | Production Architecture| src/build/install pipeline, CAD, permission hygiene |
| 3.1.0   | 2026-02-09 | Unified Installation   | mg-util command, init/audit shipped, 284 tests      |
