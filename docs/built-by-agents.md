# Built by Agents

miniature-guacamole was built using its own framework. Every commit went through the same CAD workflow that ships to users — leadership review, test-first development, code review gates, and automated deployment.

## By the Numbers

| Metric | Value |
|--------|-------|
| Commits shipped | 150+ |
| Lines written by agents | 220,000+ |
| Tests passing | 2,300+ |
| Code coverage | 99%+ enforced |
| Major releases | v1.0 → v4.1 |
| Net lines in v2.1 | -6,900 (more features, less code) |

## Real Example: Architecture Decision in 18 Minutes

When the team needed to decide whether to keep the MCP server or switch to CLI-primary architecture:

- **Minute 0** — Question asked
- **Minute 2** — 3 research agents deployed in parallel
- **Minute 8** — Research complete: old system had 10-32x higher costs, 72% reliability vs 99%+
- **Minute 10** — Leadership review (CEO, CTO, Eng Dir in parallel)
- **Minute 18** — Decision made, PRD and technical design written, build phase began

The resulting release removed 80+ dependencies and 6,900 lines of code while adding new features.

## What Agents Built

Recent autonomous work includes:

- Security domain reference files (web, systems, cloud, crypto)
- CLI command reference documentation
- Framework glossary
- Coverage hardening across test suites

Every PR linked to a `[GH-*]` prefix in the commit history was created by agents running the full CAD cycle.
