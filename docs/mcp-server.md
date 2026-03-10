# MCP Server

## Overview

`mg-mcp-server` reads your project state and exposes it two ways:

- **MCP transport (stdio)** — for Claude Desktop, Cursor, and any MCP-compatible client
- **HTTP REST API** — on port 7842 by default, for direct queries or dashboard integration

The server is read-only and local-only. It doesn't write to memory, invoke skills, or require authentication. It connects to Postgres if `MG_POSTGRES_URL` is set, and falls back to the filesystem (`.claude/memory/`) if not.

## Quick Start

Run directly with npx:

```bash
npx mg-mcp-server
```

Or from the installed binary:

```bash
mg-mcp-server
```

The server starts both the stdio MCP transport and the HTTP server on port 7842 simultaneously.

## Claude Desktop Configuration

Add this to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "miniature-guacamole": {
      "command": "npx",
      "args": ["mg-mcp-server"],
      "env": {
        "MG_POSTGRES_URL": "postgresql://mg:mg@localhost:5432/mg_memory"
      }
    }
  }
}
```

Leave out `MG_POSTGRES_URL` if you're running file-only mode — the server will read from `.claude/memory/` automatically.

## MCP Resources

| Resource URI | Description |
|---|---|
| `mg://workstreams` | All workstreams in the project |
| `mg://workstreams/{id}` | Single workstream by ID |
| `mg://workstreams/counts` | Workstream counts grouped by status |
| `mg://memory` | All memory entries |
| `mg://memory/{key}` | Single memory entry by key |
| `mg://events` | Recent event log |

## HTTP API

Base URL: `http://localhost:7842`

| Method | Path | Description |
|---|---|---|
| GET | `/api/workstreams` | List all workstreams |
| GET | `/api/workstreams/:id` | Get a single workstream |
| GET | `/api/workstreams/counts` | Workstream counts by status |
| GET | `/api/memory` | List all memory entries |
| GET | `/api/memory/:key` | Get a single memory entry |
| GET | `/api/events` | Recent events |

Example:

```bash
curl http://localhost:7842/api/workstreams | jq .
curl http://localhost:7842/api/workstreams/counts | jq .
```

### Changing the Port

Set `MG_HTTP_PORT` to use a different port:

```bash
MG_HTTP_PORT=8080 mg-mcp-server
```

## Configuration

| Environment Variable | Default | Description |
|---|---|---|
| `MG_POSTGRES_URL` | none | Postgres connection string. Falls back to filesystem if not set. |
| `MG_HTTP_PORT` | `7842` | Port for the HTTP REST API. |

## What It Does Not Do

- No write operations — all endpoints and resources are read-only
- No skill invocation via MCP — you can't trigger `/mg-build` through the server
- No authentication — don't expose port 7842 outside localhost
- No per-project installation replacement — agents and skills still require the framework installed in `.claude/`
