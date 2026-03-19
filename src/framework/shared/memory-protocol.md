# Memory Protocol Reference

Detailed reference for the shared memory system. Agents should use the compact YAML format in their definitions; this document provides full examples.

## File Patterns

| Pattern | Purpose | Written By |
|---------|---------|------------|
| `workstream-{id}-state.json` | Phase, progress, blockers | mg-build |
| `agent-{name}-decisions.json` | Agent outputs and decisions | Each agent |
| `tasks-{agent_id}.json` | Task queue for agent | Orchestrators |
| `escalations.json` | Issues needing attention | Any agent |
| `supervisor-alerts.json` | System health alerts | supervisor |

## Memory Entry Format

```typescript
interface MemoryEntry {
  timestamp: string;      // ISO 8601
  agent_id: string;       // Who wrote this
  workstream_id?: string; // Which workstream
  data: {
    phase?: string;
    // ... agent-specific fields
  };
}
```

## TypeScript Usage

```typescript
import { readMemory, writeMemory } from '@/memory';

// Read
const state = await readMemory('memory/workstream-ws-1-state.json');

// Write
await writeMemory({
  agent_id: 'dev',
  workstream_id: 'ws-1',
  data: {
    phase: 'implementation_complete',
    files_modified: ['src/auth.ts'],
    tests_passing: true,
    coverage: 99.2,
  }
}, 'memory/agent-dev-decisions.json');
```

## Common Patterns

### Reading Before Acting
```typescript
// Always read context before making decisions
const leadership = await readMemory('memory/agent-leadership-decisions.json');
const requirements = leadership.data?.acceptance_criteria;
```

### Writing Phase Transitions
```typescript
// Document when moving between phases
await writeMemory({
  agent_id: 'mg-build',
  workstream_id: 'ws-1',
  data: {
    phase_transition: 'test_spec -> implementation',
    gate_passed: 'tests_written',
    next_owner: 'dev',
  }
}, 'memory/workstream-ws-1-state.json');
```

### Logging Blockers
```typescript
// Surface issues early
await writeMemory({
  agent_id: 'dev',
  workstream_id: 'ws-1',
  data: {
    blocker: true,
    issue: 'Cannot reach 99% coverage due to external API',
    required_from: 'engineering-manager',
    suggested_action: 'Mock external API in tests',
  }
}, 'memory/workstream-ws-1-state.json');
```

### Approval Decisions
```typescript
// Document approval for downstream agents
await writeMemory({
  agent_id: 'leadership',
  workstream_id: 'ws-1',
  data: {
    phase: 'approved',
    decision: 'approved_for_merge',
    approved_by: ['ceo', 'cto', 'engineering-director'],
    next_step: 'deployment-engineer',
  }
}, 'memory/agent-leadership-decisions.json');
```

## Configuration

```typescript
import { MEMORY_CONFIG } from '@/memory';

MEMORY_CONFIG.SHARED_MEMORY_DIR  // './memory' (default)
MEMORY_CONFIG.BACKUP_DIR         // './memory/backups'
MEMORY_CONFIG.LOCK_TIMEOUT       // 5000ms
MEMORY_CONFIG.BACKUP_RETENTION   // 7 days
```

## File Rotation

Global memory files accumulate entries across many workstreams and are never cleaned up by `mg-db-sync`. Without a size limit, files like `agent-leadership-decisions.json` grow unbounded (89KB+ observed in practice). This section defines the rotation protocol agents follow to keep global files manageable.

### What Gets Rotated

Rotation applies to global files — files with no workstream scope that accumulate entries over time:

- `agent-leadership-decisions.json`
- `agent-*-decisions.json` (any agent decision log)
- `architecture-decisions.json`
- `*-feature-specs.json`

These files are not handled by `mg-db-sync` archival (see **Hybrid Storage Lifecycle** below). Rotation is their only cleanup path.

### What Does NOT Get Rotated

- **`workstream-{id}-state.json` for in-progress workstreams** — never rotate active work. If a workstream's status is `in_progress`, `blocked`, or any non-terminal state, its state file is off-limits.
- **Any file referenced by an in-progress workstream** — if an active workstream depends on a file, skip rotation for that file.
- **Workstream-scoped files** (`test-results-{id}.*`, `qa-report-{id}.*`, `staff-engineer-review-{id}.*`, etc.) — these follow `mg-db-sync` archival rules, not size-based rotation.
- **`tasks-{agent_id}.json`** — ephemeral task queues, reset per session; size-based rotation doesn't apply.
- **`escalations.json`** — small by nature and rarely exceeds the size threshold; not subject to rotation.

### Size Threshold

**50KB per file.** When an agent is about to write to a memory file that is at or above 50KB, it triggers rotation before writing.

### Agent-Triggered Rotation (Check-Before-Write)

Rotation is triggered by agents on the write path only — not on reads. The pattern:

1. Agent is about to write a new entry to a global file.
2. Agent checks the file size. If below 50KB, write normally — no rotation needed.
3. If at or above 50KB, rotate before writing:
   a. Read all entries from the file.
   b. Identify entries tied to in-progress workstreams — carry those forward unconditionally.
   c. Keep all active entries plus up to N recent non-active entries, where N depends on the file type (see Entry Counts below). The file can exceed N entries total if there are many active workstreams — never drop active work.
   d. Write the older entries (the removed ones) to `.claude/memory/.archive/{filename}.{YYYY-MM-DD}.json`. Create `.archive/` if it doesn't exist.
   e. Write the retained entries back to the original file.
4. Write the new entry to the (now-rotated) file.

```typescript
// Pseudocode: check-before-write rotation
async function writeWithRotation(file: string, newEntry: MemoryEntry): Promise<void> {
  const stats = await fs.stat(file).catch(() => null);
  const sizeKB = stats ? stats.size / 1024 : 0;

  if (sizeKB >= 50) {
    const entries: MemoryEntry[] = await readMemory(file);

    // Always preserve entries for in-progress workstreams
    const active = entries.filter(e => isActiveWorkstream(e.workstream_id));
    const rest = entries.filter(e => !isActiveWorkstream(e.workstream_id));

    // Use type-specific limit: 10 for feature-spec files, 20 for all others
    const limit = file.includes('feature-specs') ? 10 : 20;
    const keep = [...active, ...rest.slice(-limit)];          // keep all active + up to limit recent non-active
    const archive = rest.slice(0, rest.length - Math.min(limit, rest.length)); // older non-active

    if (archive.length > 0) {
      const today = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD
      const basename = path.basename(file);
      const archivePath = `.claude/memory/.archive/${basename}.${today}.json`;
      await fs.mkdir('.claude/memory/.archive', { recursive: true });
      // If an archive file already exists for today, merge rather than overwrite
      const existingArchive = await readMemory(archivePath).catch(() => []);
      await writeMemory([...existingArchive, ...archive], archivePath);
    }

    await writeMemory(keep, file);  // overwrite with retained entries
  }

  await writeMemory(newEntry, file);  // now write the new entry
}
```

Example: `agent-leadership-decisions.json` rotates to `.claude/memory/.archive/agent-leadership-decisions.2026-03-04.json`.

### Archive Path and Naming

- Archive destination: `.claude/memory/.archive/` (within the project, not `/tmp/` or `~/.claude/`)
- Filename format: `{original-filename}.{YYYY-MM-DD}.json`
- Example: `agent-leadership-decisions.json` → `.archive/agent-leadership-decisions.2026-03-04.json`
- Create `.archive/` automatically if it doesn't exist
- If an archive file already exists for today's date, append to it rather than overwriting.
- This co-exists with the mg-db-sync workstream archive convention (`.archive/{ws-id}/`). Both live under `.archive/` but use different naming schemes — rotation creates dated files, mg-db-sync creates workstream subdirectories.

### Retention

Archives are kept for 30 days. Files older than 30 days in `.archive/` can be deleted — they've been superseded by Postgres sync or are no longer operationally relevant.

### Entry Counts

For decision files (`agent-*-decisions.json`, `architecture-decisions.json`): keep the most recent **20 entries** in the live file.
For feature spec files (`*-feature-specs.json`): keep the most recent **10 entries** in the live file.
In both cases, in-progress workstream entries are always preserved regardless of the count limit.

## Agent Message Bus

Agents can send structured messages to other agents via memory files.

### Message Format

Messages are written to `.claude/memory/messages-{from}-{to}.json`:

```json
{
  "messages": [
    {
      "id": "msg-001",
      "from": "qa",
      "to": "dev",
      "workstream_id": "WS-42",
      "timestamp": "2026-03-19T15:00:00Z",
      "type": "info|question|blocker|handoff",
      "subject": "Test spec clarification",
      "body": "The acceptance criteria for edge case X is ambiguous. Using strict validation.",
      "requires_response": false
    }
  ]
}
```

### Message Types

| Type | Purpose | Requires Response |
|------|---------|-------------------|
| `info` | Status update, FYI | No |
| `question` | Needs clarification | Yes |
| `blocker` | Blocked, needs help | Yes |
| `handoff` | Task complete, passing to next agent | No |

### Reading Messages

Before starting work, agents SHOULD check for pending messages:
```yaml
read: .claude/memory/messages-*-{my-role}.json
```

### Writing Messages

After completing work or encountering a blocker:
```yaml
write: .claude/memory/messages-{my-role}-{target-role}.json
```

### Agent State Query

Any agent can read another agent's decision file to understand their state:
```yaml
# Query another agent's state
read: .claude/memory/agent-{role}-decisions.json
```

This replaces fire-and-forget consultation with structured state sharing.

## Hybrid Storage Lifecycle

Agents write to `.claude/memory/` files during execution (fast, no dependencies).
At workstream completion, sync to Postgres for queryable history and clean up the files.

### During Execution (File-Based)
Task agents (qa, dev, staff-engineer) use `mg-memory-write` and `mg-memory-read`.
Coordination agents (leadership, engineering-manager) may write directly to Postgres
for planning decisions and workstream state using `mg-db-setup` tables.

### At Workstream Completion (Postgres Sync)
When a workstream reaches `complete`, `merged`, or `closed` status:

```bash
mg-db-sync <ws-id>          # Sync one workstream
mg-db-sync --all-complete   # Sync all completed workstreams
```

This script:
1. Collects all operational artifacts (test results, QA reports, reviews, agent events)
2. Builds a consolidated JSONB summary in `memory_entries` (key: `workstream-sync-{id}`)
3. Records a `workstream_synced` event in `agent_events`
4. Archives operational files to `.claude/memory/.archive/{ws-id}/`
5. Keeps `workstream-{id}-state.json` in place with `synced_to_postgres: true`

### What Stays as Files
- `workstream-{id}-state.json` — kept for tool compatibility (mg-workstream-status, etc.)
- Global memory (leadership-decisions, architecture-decisions, feature-specs) — not workstream-scoped

### What Gets Archived
- `test-results-{id}.*`
- `test-specs-{id}.*`
- `qa-report-{id}.*`
- `staff-engineer-review-{id}.*`
- `agent-{role}-{id}.*`

### Options
- `--dry-run` — preview without writing to Postgres or archiving
- `--no-cleanup` — sync to Postgres but skip archival
- `--force` — re-sync even if already synced (re-inserts agent_events)
