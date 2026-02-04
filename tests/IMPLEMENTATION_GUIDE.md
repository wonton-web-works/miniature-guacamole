# Shared Memory Layer - Implementation Guide

**Status:** Step 1 of TDD Cycle - FAILING TESTS (Red Phase)
**Created:** 2026-02-04
**For:** Development Team (Step 2)

---

## Overview

This guide helps the development team understand what to implement based on the TDD test suite. All 74 tests are currently FAILING - they define the contract that implementation must satisfy.

---

## High-Level Architecture

```
User/Agent
    ↓
Claude Code CLI
    ↓
Agent (dev/qa/design)
    ↓
Memory API (to implement)
    ↓
Filesystem (.claude/memory/)
```

The memory layer sits between agents and the filesystem, providing:
- **Write Operations:** Persist state to JSON/Markdown files
- **Read Operations:** Retrieve persisted state
- **Queries:** Filter state by agent_id, workstream_id, timestamp
- **Concurrency Control:** Safe concurrent reads/writes
- **Backup & Recovery:** Protect against data loss

---

## What to Implement

### Phase 1: Core Memory Utilities

#### 1.1 Write Function

**Location:** `src/memory/write.ts`

**Signature:**
```typescript
async function writeMemory(
  entry: MemoryEntry,
  filePath?: string
): Promise<MemoryWriteResult>
```

**Requirements:**
1. Accept MemoryEntry with timestamp, agent_id, workstream_id, data
2. Auto-add timestamp if missing (ISO 8601 format)
3. Create `.claude/memory/` directory if it doesn't exist
4. Write to `shared.json` or specified path
5. Validate JSON structure before writing
6. Use file locking to prevent concurrent write corruption
7. Create backup before overwriting existing file
8. Return success/failure result with file path

**Tests that validate this:**
- `FAIL: Should write valid JSON to shared.json`
- `FAIL: Should create memory directories if they do not exist`
- `FAIL: Should include metadata (timestamp, agent_id, workstream_id) in writes`
- `FAIL: Should handle large JSON payloads (>1MB)`
- `FAIL: Should validate JSON structure before writing`

#### 1.2 Read Function

**Location:** `src/memory/read.ts`

**Signature:**
```typescript
async function readMemory(
  filePath?: string
): Promise<MemoryReadResult>
```

**Requirements:**
1. Read from `shared.json` or specified path
2. Return null/empty gracefully if file doesn't exist (no exception)
3. Parse JSON with error handling for corrupted files
4. Extract and return metadata (timestamp, agent_id, workstream_id)
5. Handle permission errors gracefully
6. Support concurrent reads without blocking
7. Return empty result rather than throwing on errors

**Tests that validate this:**
- `FAIL: Should read valid JSON from shared.json`
- `FAIL: Should return null/empty gracefully when file does not exist`
- `FAIL: Should handle corrupted/invalid JSON gracefully`
- `FAIL: Should parse metadata from file (timestamp, agent_id)`
- `FAIL: Should handle permission errors on read`

#### 1.3 Query Function

**Location:** `src/memory/query.ts`

**Signature:**
```typescript
async function queryMemory(
  filters: MemoryQuery
): Promise<MemoryEntry[]>
```

**Requirements:**
1. Filter by `agent_id` if provided
2. Filter by `workstream_id` if provided
3. Filter by timestamp range (start/end) if provided
4. Return results in chronological order
5. Return empty array if no matches (not error)
6. Support combining multiple filters

**Tests that validate this:**
- `FAIL: Should query memory by agent_id`
- `FAIL: Should query memory by workstream_id`
- `FAIL: Should query memory by timestamp range`

#### 1.4 Validation Function

**Location:** `src/memory/validate.ts`

**Signature:**
```typescript
function validateMemoryFile(
  filePath: string,
  format: 'json' | 'markdown'
): ValidationResult
```

**Requirements:**
1. Validate JSON structure and syntax
2. Validate Markdown syntax
3. Check for required fields
4. Return validation results with any errors
5. Support both formats

**Tests that validate this:**
- `FAIL: Should validate markdown memory files`
- `FAIL: Should validate JSON memory files`
- `FAIL: Should reject invalid format files`

### Phase 2: Concurrency Control

#### 2.1 File Locking

**Location:** `src/memory/locking.ts`

**Signature:**
```typescript
async function acquireLock(filePath: string): Promise<FileLock>
async function releaseLock(lock: FileLock): Promise<void>
```

**Requirements:**
1. Prevent concurrent writes from corrupting data
2. Allow multiple concurrent reads
3. Queue writes when lock is held
4. Handle lock timeouts
5. Prevent deadlocks
6. Clean up locks on process exit

**Tests that validate this:**
- `FAIL: Should handle concurrent read operations safely`
- `FAIL: Should prevent concurrent writes from corrupting data`
- `FAIL: Should implement file locking mechanism`

### Phase 3: Backup & Recovery

#### 3.1 Backup Functions

**Location:** `src/memory/backup.ts`

**Signatures:**
```typescript
async function createBackup(filePath: string): Promise<BackupResult>
async function listBackups(filePath: string): Promise<Backup[]>
async function restoreFromBackup(backupId: string): Promise<RestoreResult>
async function deleteMemory(): Promise<DeleteResult>
```

**Requirements:**
1. Create timestamped backups before writes
2. Store backups in `.claude/memory/backups/`
3. Maintain backup history with timestamps
4. Support rollback to previous versions
5. Manage backup retention (keep ~7 days)
6. Delete memory files with backup creation

**Tests that validate this:**
- `FAIL: Should delete memory files on cleanup`
- `FAIL: Should support versioning of memory files`
- `FAIL: Should support rollback to previous memory state`
- `FAIL: Should provide backup before destructive operations`

### Phase 4: Error Handling

#### 4.1 Error Recovery

**Location:** `src/memory/errors.ts`

**Requirements:**
1. Detect and recover from corrupted files
2. Handle disk space exhaustion
3. Sanitize file paths to prevent directory traversal
4. Detect and reject circular JSON references
5. Handle encoding issues (UTF-8, binary)
6. Create recovery backups before destructive operations

**Tests that validate this:**
- `FAIL: Should handle disk space exhaustion gracefully`
- `FAIL: Should sanitize file paths to prevent directory traversal`
- `FAIL: Should handle circular references in JSON`
- `FAIL: Should handle encoding issues (UTF-8, binary)`
- `FAIL: Recovers from corrupted memory file`
- `FAIL: Handles deletion of active workstream state gracefully`

---

## Memory Entry Structure

### MemoryEntry Interface

```typescript
interface MemoryEntry {
  // Metadata (required)
  timestamp: string;           // ISO 8601 format: "2026-02-04T10:00:00Z"
  agent_id: string;           // Agent identifier: "dev", "qa", "design", etc.
  workstream_id: string;      // Workstream identifier: "ws-1", "ws-2", etc.

  // Payload (required)
  data: Record<string, any>;  // User-defined state payload
}
```

### Example Memory Entry

```json
{
  "timestamp": "2026-02-04T10:00:00Z",
  "agent_id": "dev",
  "workstream_id": "ws-1-authentication",
  "data": {
    "feature": "user-login",
    "status": "in-progress",
    "tests_passing": 45,
    "coverage": 85,
    "files_modified": [
      "src/auth/login.ts",
      "src/auth/session.ts"
    ],
    "next_tasks": [
      "Add edge case tests",
      "Implement logout endpoint"
    ]
  }
}
```

---

## File Locations

### Primary Memory File
```
.claude/memory/shared.json
```

### Workstream-Specific Files (Optional)
```
.claude/memory/ws-1.json
.claude/memory/ws-2.json
.claude/memory/agent-a.json
```

### Backup Directory
```
.claude/memory/backups/
├── shared.json.2026-02-04T10:00:00Z.bak
├── shared.json.2026-02-04T11:30:45Z.bak
└── shared.json.2026-02-04T13:15:22Z.bak
```

---

## Cross-Agent Scenarios

### Scenario 1: Agent A Writes, Agent B Reads

```
┌──────────────────────────────────────────────────────┐
│ Session 1: Developer                                 │
│                                                      │
│ 1. writeMemory({                                     │
│      agent_id: 'dev',                               │
│      workstream_id: 'ws-1',                          │
│      data: { coverage: 85 }                          │
│    })                                                │
│                                                      │
│ File: .claude/memory/shared.json created ✓          │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│ Session 2: QA Engineer                               │
│                                                      │
│ 1. readMemory()                                      │
│    → Returns Agent A's data (coverage: 85) ✓        │
│                                                      │
│ 2. writeMemory({                                     │
│      agent_id: 'qa',                                │
│      workstream_id: 'ws-1',                          │
│      data: { coverage: 85, tests_passing: 100 }    │
│    })                                                │
│                                                      │
│ File: .claude/memory/shared.json updated ✓          │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│ Session 3: Developer (returns)                       │
│                                                      │
│ 1. readMemory()                                      │
│    → Returns Agent B's update ✓                     │
│    → coverage: 85, tests_passing: 100               │
│                                                      │
│ State was persisted across sessions ✓               │
└──────────────────────────────────────────────────────┘
```

### Scenario 2: Concurrent Writes (Protected)

```
Agent A Write (concurrent)     Agent B Write (concurrent)
        ↓                              ↓
    Acquire Lock 1              Acquire Lock 2 (waits)
        ↓                              ↓
    Write Data A            (queued, waiting for lock)
        ↓                              ↓
    Release Lock 1              Acquire Lock 2
        ↓                              ↓
   Backup created           Write Data B
        ↓                              ↓
   File valid ✓             Release Lock 2
                                   ↓
                            Backup created
                                   ↓
                            File valid ✓

Result: No data corruption, both writes succeeded
```

---

## Test-Driven Development Flow

### Step 1: RED (Current)
All 74 tests FAIL
- Run: `npm run test`
- Expected: All FAIL with "not implemented" errors
- Duration: ~5 seconds

### Step 2: GREEN
Implement to make tests PASS
- Duration: ~4 hours (core utilities)
- Target: >99% coverage
- Run: `npm run test` after each change

### Step 3: REFACTOR
Optimize and clean up
- Duration: ~1 hour
- Maintain >99% coverage
- Code review and approval

---

## Performance Targets

| Operation | Target | Constraint |
|-----------|--------|-----------|
| **Write** | <100ms | Single-threaded, 1KB payload |
| **Read** | <50ms | Single-threaded, existing file |
| **Query** | <500ms | 100 entries, filtering |
| **Backup** | <200ms | Before each write |
| **Recovery** | <1s | From corrupted state |

---

## Dependencies to Add

Add to `package.json`:

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "@playwright/test": "^1.40.0",
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0"
  }
}
```

---

## Step-by-Step Implementation

### Step 1: Set up project structure (30 minutes)
```bash
mkdir -p src/memory
mkdir -p tests/unit tests/integration tests/e2e
npm install  # Install dependencies
```

### Step 2: Implement core write (1 hour)
- `src/memory/write.ts`
- Tests: 5 unit tests should PASS
- Coverage: ~20% of target

### Step 3: Implement core read (1 hour)
- `src/memory/read.ts`
- Tests: 6 unit tests should PASS
- Coverage: ~30% of target

### Step 4: Implement queries (30 minutes)
- `src/memory/query.ts`
- Tests: 3 unit tests should PASS
- Coverage: ~35% of target

### Step 5: Implement validation (30 minutes)
- `src/memory/validate.ts`
- Tests: 3 unit tests should PASS
- Coverage: ~40% of target

### Step 6: Implement locking (1 hour)
- `src/memory/locking.ts`
- Tests: 3 unit tests should PASS
- Coverage: ~50% of target

### Step 7: Implement backup/recovery (1.5 hours)
- `src/memory/backup.ts`
- Tests: 5 unit tests should PASS
- Coverage: ~65% of target

### Step 8: Implement error handling (1 hour)
- `src/memory/errors.ts`
- Tests: 5 unit tests should PASS
- Coverage: ~75% of target

### Step 9: Integration features (2 hours)
- Cross-agent state sharing
- Workstream persistence
- Metadata enforcement
- Tests: 27 integration tests should PASS
- Coverage: ~99% of target

### Step 10: E2E workflows (2 hours)
- API endpoints implementation
- Session management
- Backup/restore API
- Tests: 19 E2E tests should PASS
- Coverage: 100% of workflows

---

## Verification Checklist

Before code review:

```
Unit Tests
- [ ] All 28 unit tests PASS
- [ ] Coverage report shows >99%
- [ ] No console warnings or errors
- [ ] Performance benchmarks met

Integration Tests
- [ ] All 27 integration tests PASS
- [ ] Cross-agent scenarios work
- [ ] Workstream persistence verified
- [ ] Metadata validation confirmed

E2E Tests
- [ ] All 19 E2E tests PASS
- [ ] Complete workflows tested
- [ ] Session recovery works
- [ ] Backup/restore verified

Code Quality
- [ ] No TypeScript errors
- [ ] No linting violations
- [ ] Code review approved
- [ ] Documentation complete
```

---

## References

- **Test Suite:** `tests/SHARED_MEMORY_TESTS.md`
- **Unit Tests:** `tests/unit/shared-memory.test.ts`
- **Integration Tests:** `tests/integration/cross-agent-memory.test.ts`
- **E2E Tests:** `tests/e2e/workstream-persistence.spec.ts`
- **Configuration:** `vitest.config.ts`, `playwright.config.ts`

---

## Questions & Support

When implementing, refer back to specific test cases:

1. **"How should writes work?"**
   → See `tests/unit/shared-memory.test.ts` - "Memory Write Operations"

2. **"What happens if file doesn't exist?"**
   → See `tests/unit/shared-memory.test.ts` - "Should return null/empty gracefully"

3. **"How do concurrent writes not corrupt?"**
   → See `tests/integration/cross-agent-memory.test.ts` - "Concurrency & Locking"

4. **"What about backups?"**
   → See `tests/integration/cross-agent-memory.test.ts` - "Error Recovery"

5. **"How do sessions persist?"**
   → See `tests/integration/cross-agent-memory.test.ts` - "Workstream State Persistence"

Every test is a specification document!

---

**Ready for Step 2: Implementation**
**All tests FAILING - contract defined**
**Target: 99% coverage once implemented**
