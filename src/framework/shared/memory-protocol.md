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
