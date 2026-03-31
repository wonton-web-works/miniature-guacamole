# Project Rules

This directory contains modular project context files that agents read to understand the project. Each file covers a specific topic.

## Files

- `project-context.md` — Project overview, purpose, and repository info
- `tech-stack.md` — Detected languages, frameworks, and tools

## Usage

Agents read these files automatically when they need project context. You can customize any file to provide more specific guidance. Custom files (e.g., `architecture.md`, `conventions.md`) are also supported — agents will discover and read them.

## Preservation

`/mg-init` will never overwrite existing rules files. Your customizations are safe.
