# Agent Message Bus — Schema Reference

Agents communicate via structured JSON files in `.claude/memory/`. This document is the authoritative schema reference for the Phase 1 file-based message bus.

**Source of truth:** `.claude/shared/memory-protocol.md` § Agent Message Bus
**Phase 2 MCP design:** [docs/technical-design-agent-comms.md](technical-design-agent-comms.md)

---

## Envelope Schema

Messages are stored in `.claude/memory/messages-{from}-{to}.json`.

```json
{
  "messages": [
    {
      "id": "msg-001",
      "from": "qa",
      "to": "dev",
      "workstream_id": "WS-42",
      "timestamp": "2026-03-19T15:00:00Z",
      "type": "info",
      "subject": "Test run complete",
      "body": "All 47 tests passing. Coverage at 99.3%.",
      "requires_response": false
    }
  ]
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique message identifier. Convention: `msg-{NNN}` scoped to the file. |
| `from` | string | yes | Sending agent role (e.g. `qa`, `dev`, `engineering-manager`). |
| `to` | string | yes | Receiving agent role. Must match the `{to}` in the filename. |
| `workstream_id` | string | yes | Workstream this message belongs to (e.g. `WS-42`). |
| `timestamp` | string | yes | ISO 8601 UTC timestamp of when the message was written. |
| `type` | string | yes | One of: `info`, `question`, `blocker`, `handoff`. See Message Types below. |
| `subject` | string | yes | One-line summary — used for quick scanning without parsing `body`. |
| `body` | string | yes | Full message content. May be multi-line. |
| `requires_response` | boolean | yes | `true` if the sender needs a reply before proceeding. |

---

## Message Types

### info

Status update or FYI. No response needed.

```json
{
  "id": "msg-001",
  "from": "dev",
  "to": "engineering-manager",
  "workstream_id": "WS-42",
  "timestamp": "2026-03-19T16:00:00Z",
  "type": "info",
  "subject": "Implementation complete",
  "body": "Feature implemented. Tests passing at 99.4% coverage. Ready for review.",
  "requires_response": false
}
```

### question

Needs clarification before proceeding. Sender is blocked until answered.

```json
{
  "id": "msg-002",
  "from": "qa",
  "to": "dev",
  "workstream_id": "WS-42",
  "timestamp": "2026-03-19T15:30:00Z",
  "type": "question",
  "subject": "Edge case handling for empty payload",
  "body": "Should an empty `messages` array be treated as valid or an error? Acceptance criteria is ambiguous.",
  "requires_response": true
}
```

### blocker

Agent cannot continue. Requires action from the recipient.

```json
{
  "id": "msg-003",
  "from": "dev",
  "to": "engineering-manager",
  "workstream_id": "WS-42",
  "timestamp": "2026-03-19T17:00:00Z",
  "type": "blocker",
  "subject": "Cannot reach 99% coverage — external API",
  "body": "The payment gateway integration has no testable interface. Coverage stuck at 94%. Need approval to mock or skip this path.",
  "requires_response": true
}
```

### handoff

Work complete, passing responsibility to next agent.

```json
{
  "id": "msg-004",
  "from": "qa",
  "to": "dev",
  "workstream_id": "WS-42",
  "timestamp": "2026-03-19T14:00:00Z",
  "type": "handoff",
  "subject": "Test specs ready — WS-42",
  "body": "Specs written in .claude/memory/test-specs-WS-42.json. 23 test cases covering misuse, boundaries, and golden paths. Ready for implementation.",
  "requires_response": false
}
```

---

## Read/Write Patterns

### When to Read

Read at the start of every work session, before acting:

```yaml
read: .claude/memory/messages-*-{my-role}.json
```

Process any `requires_response: true` messages before beginning new work. If a `blocker` message is addressed to you, resolve it first.

### When to Write

Write after completing a phase or encountering a blocker:

| Situation | Type to send |
|-----------|-------------|
| Finished a phase, passing work forward | `handoff` |
| Need clarification before proceeding | `question` |
| Cannot continue without help | `blocker` |
| Sharing status without needing a reply | `info` |

```yaml
write: .claude/memory/messages-{my-role}-{target-role}.json
```

Append to the `messages` array — do not overwrite existing messages.

### File Naming Convention

```
.claude/memory/messages-{from}-{to}.json
```

- `{from}` — the sending agent's role slug (e.g. `qa`, `dev`, `engineering-manager`)
- `{to}` — the receiving agent's role slug
- One file per directed pair. Multiple workstreams share the same file; use `workstream_id` to filter.

---

## Phase 2: MCP Design

The file-based bus (Phase 1) will be wrapped by an MCP server in Phase 2, adding real-time queries and structured tools (`agent.send`, `agent.query`, `agent.handoff`). Phase 2 is backward compatible — agents without MCP can continue using file-based messages.

See [docs/technical-design-agent-comms.md](technical-design-agent-comms.md) for the full design.
