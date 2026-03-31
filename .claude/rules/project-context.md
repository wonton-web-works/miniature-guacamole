# Project Context

## Project

- **Name:** miniature-guacamole
- **Description:** AI-powered product development organization for Claude Code
- **Repository:** github.com/wonton-web-works/miniature-guacamole
- **License:** MIT
- **Current version:** 6.1.3

## Purpose

miniature-guacamole is an agent framework that transforms Claude Code into a complete product development team. It provides 22 specialized agents, 19 collaborative skills, and shared protocols for coordinated software development.

## Structure

This repo is the framework source — `.claude/` uses symlinks to `src/framework/` for development. When installed in other projects, files are copied (not symlinked).

## Key Directories

- `src/framework/` — Agent definitions, skills, shared protocols, scripts
- `src/installer/` — Install, uninstall, web-install, mg-init, mg-migrate
- `src/memory/` — Shared memory TypeScript layer
- `src/audit/` — Audit logging TypeScript layer
- `tests/` — Unit and integration tests (vitest, 99% coverage target)
- `docs/` — Documentation site (VitePress)
