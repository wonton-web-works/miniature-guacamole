# Technical Design: Agent Communication MCP (Phase 2)

## Status: DESIGN — not yet implemented

## Overview

Phase 2 evolves the file-based message bus (Phase 1) into an MCP server that provides real-time agent state queries and structured communication.

## MCP Resources

### agent://state/{role}
Returns the current state of an agent (from their decisions file).

### agent://state/{role}/{workstream}
Returns agent state filtered to a specific workstream.

### agent://messages/{role}
Returns pending messages for an agent.

## MCP Tools

### agent.send(to, message)
Sends a structured message to another agent. Message is written to the message bus file and available immediately.

### agent.query(role, question)
Asks a question to another agent's context. Returns a structured response based on the agent's decision history and current state. Does NOT spawn the agent — just queries their persisted state.

### agent.handoff(to, workstream, summary)
Formal handoff with workstream context. Writes handoff message and updates workstream state.

## Architecture

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Agent A    │────▶│  MCP Server     │────▶│   Agent B    │
│  (claude)    │     │  (node process) │     │  (claude)    │
└──────────────┘     │                 │     └──────────────┘
                     │  Resources:     │
                     │  - agent://     │
                     │                 │
                     │  Tools:         │
                     │  - agent.send   │
                     │  - agent.query  │
                     │  - agent.handoff│
                     │                 │
                     │  Storage:       │
                     │  .claude/memory/│
                     └─────────────────┘
```

## Implementation Notes

- MCP server reads/writes the same `.claude/memory/` files as Phase 1
- Backward compatible — agents without MCP can still use file-based messages
- Server process started by mg-build orchestrator, stopped after workstream completes
- No external dependencies — uses Claude Code's built-in MCP support

## Migration Path

Phase 1 (current): File-based message bus, manual reads
Phase 2 (this design): MCP server wrapping file-based storage
Phase 3 (future): Persistent conversation threads, async discussion
