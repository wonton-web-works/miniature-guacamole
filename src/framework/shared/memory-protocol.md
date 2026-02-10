# Memory Protocol Reference

Detailed reference for the shared memory system. Agents should use the compact YAML format in their definitions; this document provides full examples.

## File Patterns

| Pattern | Purpose | Written By |
|---------|---------|------------|
| `workstream-{id}-state.json` | Phase, progress, blockers | engineering-team |
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
  agent_id: 'engineering-team',
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
