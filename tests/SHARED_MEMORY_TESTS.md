# Shared Memory Layer - TDD/BDD Test Suite

**Status:** Step 1 of TDD Cycle - FAILING TESTS (Red Phase)
**Created:** 2026-02-04
**Target Coverage:** 99% (unit + integration combined)

---

## Overview

This document describes the comprehensive test suite for the Shared Memory Layer (Gap #2 from engineering evaluation). All tests are written BEFORE implementation, following TDD/BDD principles.

## Test Files

### 1. Unit Tests: `/tests/unit/shared-memory.test.ts`

**Purpose:** Test individual memory read/write utilities in isolation
**Framework:** Vitest
**Coverage Target:** 99% function coverage

#### Test Categories

| Category | Tests | Status | Purpose |
|----------|-------|--------|---------|
| **Memory Write Operations** | 5 | FAIL | Core write functionality, directory creation, metadata handling |
| **Memory Read Operations** | 6 | FAIL | Core read functionality, error handling, metadata parsing |
| **Memory Format Validation** | 3 | FAIL | JSON/Markdown validation, format checking |
| **Memory Concurrency & Locking** | 3 | FAIL | Concurrent read/write safety, file locking |
| **Memory Cleanup & Maintenance** | 3 | FAIL | Deletion, versioning, rollback support |
| **Error Handling & Edge Cases** | 5 | FAIL | Disk space, path traversal, encoding, circular refs |
| **Memory Query Operations** | 3 | FAIL | Query by agent_id, workstream_id, timestamp range |

**Total Unit Tests:** 28 tests, all FAILING

#### Key Unit Test Examples

```typescript
// Test: Write valid JSON to shared.json
it('FAIL: Should write valid JSON to shared.json', () => {
  const memory = {
    timestamp: new Date().toISOString(),
    agent_id: 'agent-a',
    workstream_id: 'ws-1',
    data: { message: 'Test message' }
  };

  // When implemented:
  // const result = await writeMemory(memory);
  // expect(result.success).toBe(true);
  // expect(result.path).toBe(SHARED_MEMORY_FILE);
});

// Test: Graceful failure on missing files
it('FAIL: Should return null/empty gracefully when file does not exist', () => {
  // When implemented:
  // const result = await readMemory();
  // expect(result.success).toBe(false);
  // expect(result.data).toBeNull();
});
```

### 2. Integration Tests: `/tests/integration/cross-agent-memory.test.ts`

**Purpose:** Test agent-to-agent state sharing and workstream persistence
**Framework:** Vitest
**Coverage Target:** 99% flow coverage

#### Test Categories

| Category | Tests | Status | Purpose |
|----------|-------|--------|---------|
| **Agent A to Agent B State Transfer** | 3 | FAIL | Cross-agent reads/writes, multi-agent updates |
| **Workstream State Persistence** | 4 | FAIL | Cross-session persistence, isolation, history |
| **Memory Format Compliance** | 3 | FAIL | JSON validity, formatting, Markdown support |
| **Metadata Requirements** | 5 | FAIL | Timestamp, agent_id, workstream_id enforcement |
| **Error Recovery & Resilience** | 5 | FAIL | Concurrent writes, corruption recovery, backups |
| **State Consistency & Synchronization** | 5 | FAIL | RAW consistency, staleness detection, merge strategy |
| **Performance & Scalability** | 2 | FAIL | Large payloads, query performance |

**Total Integration Tests:** 27 tests, all FAILING

#### Key Integration Test Examples

```typescript
// Test: Cross-agent state transfer
it('FAIL: Agent A writes state that Agent B can read', async () => {
  // 1. Agent A writes
  // const writeResult = await writeMemory(agentAState);
  // expect(writeResult.success).toBe(true);

  // 2. Agent B reads
  // const readResult = await readMemory();
  // expect(readResult.data.agent_id).toBe('agent-a');
});

// Test: Workstream persistence across sessions
it('FAIL: Workstream state persists across session boundaries', async () => {
  // Session 1: Write state
  // await writeMemory(session1State);

  // Session 2: Read updated state
  // const session2Result = await readMemory();
  // expect(session2Result.data.data.coverage).toBe(92);
});
```

### 3. E2E Tests: `/tests/e2e/workstream-persistence.spec.ts`

**Purpose:** Test complete workflows across agent sessions
**Framework:** Playwright
**Coverage Target:** Full workflow coverage

#### Test Categories

| Category | Tests | Status | Purpose |
|----------|-------|--------|---------|
| **Single Workstream Lifecycle** | 3 | FAIL | Creation, multi-agent updates, state queries |
| **Cross-Session State Recovery** | 3 | FAIL | Session restoration, history queries |
| **Concurrent Workstream Operations** | 2 | FAIL | Simultaneous workstreams, write serialization |
| **Workstream Branching & Merging** | 2 | FAIL | Git-like branching, conflict resolution |
| **Memory Backup & Recovery** | 3 | FAIL | Auto-backups, restoration, space management |
| **Memory Observability & Debugging** | 3 | FAIL | History view, export, integrity validation |
| **Error Scenarios & Recovery** | 3 | FAIL | Corruption handling, invalid transitions, offline fallback |

**Total E2E Tests:** 19 tests, all FAILING

#### Key E2E Test Examples

```typescript
// Test: Single workstream lifecycle
test('FAIL: Workstream state persists from creation to completion', async ({ request }) => {
  // When implemented with API:
  // const ws = await request.post(`${MEMORY_API_URL}/workstreams`, {...});
  // const update1 = await request.put(`${MEMORY_API_URL}/workstreams/ws-e2e-1`, {...});
  // const final = await request.get(`${MEMORY_API_URL}/workstreams/ws-e2e-1`);
});
```

---

## Test Execution Plan

### Phase 1: Unit Tests (Red → Green)

1. Run unit tests to confirm all FAIL
   ```bash
   npm run test:unit -- shared-memory.test.ts
   ```

2. Expected output: 28 tests FAIL with "not implemented" errors

3. Implement memory utilities:
   - `writeMemory(data)` - Write to `.claude/memory/shared.json`
   - `readMemory()` - Read from `.claude/memory/shared.json`
   - `validateMemoryFile(path)` - Validate JSON/Markdown format
   - `queryMemory(filters)` - Query by agent_id, workstream_id, timestamp

4. Tests should PASS with >99% coverage

### Phase 2: Integration Tests (Red → Green)

1. Run integration tests to confirm all FAIL
   ```bash
   npm run test:integration -- cross-agent-memory.test.ts
   ```

2. Expected output: 27 tests FAIL

3. Implement cross-agent features:
   - Shared memory access patterns
   - Workstream state isolation
   - Metadata enforcement
   - Concurrency control & locking
   - Backup & recovery

4. Tests should PASS with >99% coverage

### Phase 3: E2E Tests (Red → Green)

1. Run E2E tests to confirm all FAIL
   ```bash
   npm run test:e2e -- workstream-persistence.spec.ts
   ```

2. Expected output: 19 tests FAIL (skipped initially)

3. Implement REST API for memory operations:
   - `POST /api/memory/workstreams` - Create workstream
   - `GET /api/memory/workstreams/{id}` - Read workstream state
   - `PUT /api/memory/workstreams/{id}` - Update workstream state
   - Session management endpoints
   - Backup/restore endpoints

4. Tests should PASS with full workflow coverage

---

## Acceptance Criteria

### Step 1: Red Phase (Current)
All tests FAIL as expected, defining the contract for implementation.

**Success Criteria:**
- [ ] 28 unit tests FAIL with "not implemented" errors
- [ ] 27 integration tests FAIL with "not implemented" errors
- [ ] 19 E2E tests FAIL or SKIP with "not implemented" messages
- [ ] All test files created and valid TypeScript/Playwright syntax
- [ ] Total: 74 tests, all FAILING

### Step 2: Green Phase (Implementation)
Implement utilities to make tests PASS.

**Success Criteria:**
- [ ] 28 unit tests PASS (99%+ coverage)
- [ ] 27 integration tests PASS (99%+ coverage)
- [ ] 19 E2E tests PASS (full workflow coverage)
- [ ] No regressions in existing agent tests
- [ ] Total: 74 tests, all PASSING

### Step 3: Refactor Phase (Optimization)
Refactor for readability, performance, and maintainability.

**Success Criteria:**
- [ ] Code coverage remains >99%
- [ ] Performance benchmarks met:
  - Single write: <100ms
  - Single read: <50ms
  - Query: <500ms
- [ ] Code review approved by leadership
- [ ] All tests still PASSING

---

## Key Test Contracts

### Memory Write Contract

```typescript
interface MemoryWriteRequest {
  timestamp: string;           // ISO 8601 format (auto-added if missing)
  agent_id: string;           // Required: identifies writing agent
  workstream_id: string;      // Required: identifies workstream
  data: Record<string, any>;  // Actual state payload
}

interface MemoryWriteResult {
  success: boolean;
  path?: string;              // File path on success
  error?: string;             // Error message on failure
}
```

### Memory Read Contract

```typescript
interface MemoryReadRequest {
  workstream_id?: string;
  agent_id?: string;
}

interface MemoryReadResult {
  success: boolean;
  data?: MemoryEntry;         // null if file doesn't exist
  error?: string;
}

interface MemoryEntry {
  timestamp: string;
  agent_id: string;
  workstream_id: string;
  data: Record<string, any>;
}
```

### Query Contract

```typescript
interface MemoryQuery {
  agent_id?: string;
  workstream_id?: string;
  start?: string;             // ISO 8601 timestamp
  end?: string;               // ISO 8601 timestamp
}

type QueryResult = MemoryEntry[];
```

---

## Coverage Goals

### Unit Tests Coverage

| Category | Target | Metric |
|----------|--------|--------|
| **Functions** | 99% | All memory utils covered |
| **Statements** | 99% | All code paths tested |
| **Branches** | 99% | All conditionals tested |
| **Lines** | 99% | All lines executed |

### Integration Tests Coverage

| Category | Target | Metric |
|----------|--------|--------|
| **Flows** | 99% | Agent → Memory → Agent |
| **Workstream Lifecycle** | 100% | Create → Update → Complete |
| **State Transitions** | 100% | All valid transitions |
| **Error Paths** | 90% | Major error scenarios |

### E2E Tests Coverage

| Category | Target | Metric |
|----------|--------|--------|
| **User Workflows** | 100% | Complete scenarios |
| **Session Persistence** | 100% | Cross-session flows |
| **Concurrent Operations** | 85% | Multi-agent scenarios |
| **Error Recovery** | 80% | Failure scenarios |

---

## Implementation Checklist

### Memory Write Utilities
- [ ] `writeMemory(data: MemoryEntry): Promise<MemoryWriteResult>`
- [ ] Auto-create `.claude/memory/` directory if missing
- [ ] Validate JSON structure
- [ ] Add timestamp if missing
- [ ] Implement file locking for concurrent writes
- [ ] Create backups before updates
- [ ] Handle disk space errors gracefully

### Memory Read Utilities
- [ ] `readMemory(workstreamId?: string): Promise<MemoryReadResult>`
- [ ] Return null gracefully if file missing
- [ ] Parse JSON with error handling
- [ ] Extract metadata (timestamp, agent_id, workstream_id)
- [ ] Handle permission errors
- [ ] Support UTF-8 and special characters

### Memory Format Validation
- [ ] `validateMemoryFile(path: string, format: 'json' | 'markdown'): ValidationResult`
- [ ] Validate JSON structure
- [ ] Validate Markdown syntax
- [ ] Check for required fields
- [ ] Reject invalid formats

### Memory Queries
- [ ] `queryMemory(filters: MemoryQuery): Promise<MemoryEntry[]>`
- [ ] Filter by agent_id
- [ ] Filter by workstream_id
- [ ] Filter by timestamp range
- [ ] Return results in sorted order

### Concurrency & Locking
- [ ] Implement file-level locking mechanism
- [ ] Support concurrent reads
- [ ] Serialize concurrent writes safely
- [ ] Prevent data corruption
- [ ] Handle lock timeouts

### Backup & Recovery
- [ ] Auto-backup before writes
- [ ] Support versioning/history
- [ ] Implement rollback functionality
- [ ] Manage backup retention
- [ ] Provide recovery from corruption

---

## Test Matrix Summary

```
┌─────────────────────────────────────────┐
│        SHARED MEMORY TEST SUITE         │
├─────────────────────────────────────────┤
│ Unit Tests (28)     ████████████████░░░ │  All FAILING
│ Integration (27)    ████████████████░░░ │  All FAILING
│ E2E Tests (19)      ████████████████░░░ │  All FAILING
├─────────────────────────────────────────┤
│ TOTAL: 74 tests                         │
│ STATUS: Red Phase (Step 1 of TDD)       │
│ COVERAGE TARGET: 99% (unit + integration)│
└─────────────────────────────────────────┘
```

---

## Running the Tests

### Run all tests (should all FAIL)
```bash
npm run test
```

### Run unit tests only
```bash
npm run test:unit -- shared-memory.test.ts
```

### Run integration tests only
```bash
npm run test:integration -- cross-agent-memory.test.ts
```

### Run E2E tests only
```bash
npm run test:e2e -- workstream-persistence.spec.ts
```

### Watch mode during development
```bash
npm run test:watch -- shared-memory.test.ts
```

### Generate coverage report
```bash
npm run test:coverage
```

---

## Next Steps

1. **Step 2: Implement Memory Layer**
   - Create `.claude/memory/` utilities
   - Implement all 74 test contracts
   - Achieve >99% coverage
   - All tests PASS

2. **Step 3: Integration Testing**
   - Test with actual agent invocations
   - Verify cross-session persistence
   - Validate workstream state isolation

3. **Step 4: Documentation**
   - Document memory API
   - Create implementation guide
   - Add usage examples

---

## References

- **Gap #2:** Shared Memory Layer (from engineering evaluation)
- **TDD Cycle:** Red → Green → Refactor
- **Coverage Target:** 99% (unit + integration combined)
- **Test Framework:** Vitest (unit/integration), Playwright (E2E)
- **Memory Location:** `.claude/memory/`
- **Shared File:** `.claude/memory/shared.json`

---

**Created by:** QA Engineer (TDD/BDD Tests)
**Date:** 2026-02-04
**Status:** Ready for Implementation (Step 2 of TDD Cycle)
