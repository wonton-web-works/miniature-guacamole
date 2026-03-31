# Tech Stack

## Languages

- **TypeScript** — Primary language for memory, audit, supervisor, and test code
- **Shell (Bash)** — Installer scripts, mg-init, mg-migrate, build system
- **Markdown** — Agent definitions, skill definitions, shared protocols

## Frameworks & Tools

- **Vitest** — Test runner (unit + integration)
- **VitePress** — Documentation site
- **Node.js 20+** — Runtime

## Build System

- `build.sh` — Produces distribution artifacts in `dist/`
- `npm test` — Runs full test suite

## Testing

- **Framework:** Vitest
- **Coverage target:** 99%
- **Test ordering:** Misuse-first (misuse -> boundary -> golden path)
- **Location:** `tests/unit/`, `tests/integration/`
