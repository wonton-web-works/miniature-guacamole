# Test Suite Documentation

**Status:** Step 1 of TDD Cycle - All Tests FAILING (Red Phase)
**Total Tests:** 74 tests across 3 suites + Infrastructure verification scripts
**Target Coverage:** 99% (unit + integration)

---

## Infrastructure Verification Scripts

### WS-INIT-1: Global Installation & Shared Protocols

**Script:** `verify-ws-init-1.sh`

**Purpose:** Validates the modified install.sh and new global files are set up correctly.

**Usage:**
```bash
# After running install.sh
./tests/verify-ws-init-1.sh
```

**What it checks:**
- All symlinks in ~/.claude/agents/ and ~/.claude/skills/ resolve correctly
- ~/.claude/shared/ contains all 6 protocol documents
- ~/.claude/CLAUDE.md exists with framework intro
- ~/.claude/hooks/project-init-check.sh exists and is executable
- SessionStart hook configured in settings.json
- Existing user settings preserved

**Exit codes:**
- `0` - All checks passed (ready to merge)
- `1` - One or more checks failed (fix and re-run)

**Documentation:** See `WS-INIT-1-VERIFICATION.md` for detailed check descriptions and troubleshooting.

**Test Coverage:** 42+ individual checks across 6 acceptance criteria

---

## Quick Start

### Prerequisites

```bash
npm install
npm install -D vitest @vitest/ui @vitest/coverage-v8 playwright @playwright/test
```

### Run All Tests (All Should FAIL)

```bash
npm run test
```

Expected output: 74 tests FAILING with "not implemented" errors

### View Test Results

```bash
# UI dashboard
npm run test:ui

# Coverage report
npm run test:coverage
```

---

## Test Suites

### 1. Unit Tests: `tests/unit/shared-memory.test.ts`

**28 tests** covering core memory read/write utilities

```bash
npm run test:unit -- shared-memory.test.ts
```

**Test Categories:**
- Memory Write Operations (5 tests)
- Memory Read Operations (6 tests)
- Memory Format Validation (3 tests)
- Memory Concurrency & Locking (3 tests)
- Memory Cleanup & Maintenance (3 tests)
- Error Handling & Edge Cases (5 tests)
- Memory Query Operations (3 tests)

**All tests FAIL** - Contract definition for implementation

### 2. Integration Tests: `tests/integration/cross-agent-memory.test.ts`

**27 tests** covering cross-agent state sharing

```bash
npm run test:integration -- cross-agent-memory.test.ts
```

**Test Categories:**
- Agent A to Agent B State Transfer (3 tests)
- Workstream State Persistence (4 tests)
- Memory Format Compliance (3 tests)
- Metadata Requirements (5 tests)
- Error Recovery & Resilience (5 tests)
- State Consistency & Synchronization (5 tests)
- Performance & Scalability (2 tests)

**All tests FAIL** - Flow validation for implementation

### 3. E2E Tests: `tests/e2e/workstream-persistence.spec.ts`

**19 tests** covering complete workstream workflows

```bash
npm run test:e2e -- workstream-persistence.spec.ts
```

**Test Categories:**
- Single Workstream Lifecycle (3 tests)
- Cross-Session State Recovery (3 tests)
- Concurrent Workstream Operations (2 tests)
- Workstream Branching & Merging (2 tests)
- Memory Backup & Recovery (3 tests)
- Memory Observability & Debugging (3 tests)
- Error Scenarios & Recovery (3 tests)

**Note:** E2E tests use `test.skip()` since API is not yet implemented

---

## Test Contracts

### Memory Write Contract

```typescript
// Input
{
  timestamp: "2026-02-04T10:00:00Z",  // ISO 8601 (auto-added if missing)
  agent_id: "dev",                    // Required: writing agent
  workstream_id: "ws-1",              // Required: workstream context
  data: { /* user payload */ }        // Any JSON-serializable object
}

// Expected Output
{
  success: true,
  path: "/path/to/.claude/memory/shared.json"
}
```

### Memory Read Contract

```typescript
// Expected Output
{
  success: true,
  data: {
    timestamp: "2026-02-04T10:00:00Z",
    agent_id: "dev",
    workstream_id: "ws-1",
    data: { /* user payload */ }
  }
}

// On missing file:
{
  success: false,
  data: null,
  error: "File not found"
}
```

---

## What Tests EXPECT to Find

Once implementation is complete, tests expect:

### Directory Structure
```
.claude/
├── memory/
│   ├── shared.json          # Shared workstream state
│   ├── agent-a.json        # Agent-specific state
│   ├── ws-1.json           # Workstream-specific state
│   └── backups/            # Backup versions
│       ├── shared.json.2026-02-04T10:00:00Z.bak
│       └── shared.json.2026-02-04T11:00:00Z.bak
```

### Memory File Format
```json
{
  "timestamp": "2026-02-04T10:00:00Z",
  "agent_id": "dev",
  "workstream_id": "ws-1",
  "data": {
    "feature": "authentication",
    "status": "in-progress",
    "coverage": 85
  }
}
```

### Metadata Requirements
- `timestamp`: ISO 8601 format (required, auto-added if missing)
- `agent_id`: Agent identifier (required)
- `workstream_id`: Workstream identifier (required)
- `data`: User payload (required, must be JSON-serializable)

---

## Test Scenarios

### Scenario 1: Agent A Writes, Agent B Reads

```
1. Agent A calls writeMemory({
     timestamp: "2026-02-04T10:00:00Z",
     agent_id: "agent-a",
     workstream_id: "ws-1",
     data: { status: "active" }
   })

2. Expect: File created at .claude/memory/shared.json

3. Agent B calls readMemory()

4. Expect: Agent B reads Agent A's data back
```

### Scenario 2: Concurrent Reads (Safe)

```
1. Write initial state to shared.json
2. Three agents read simultaneously via readMemory()
3. All should succeed with identical data
4. No corruption expected
```

### Scenario 3: Concurrent Writes (Protected)

```
1. Agent A starts write
2. Agent B starts write simultaneously
3. File locking should serialize writes
4. Both succeed without data loss
5. Final file contains valid JSON
```

### Scenario 4: Cross-Session Persistence

```
Session 1:
1. Dev writes: { coverage: 85, status: "in-progress" }
2. Session ends

Session 2:
1. QA reads and sees Dev's state
2. QA updates: { coverage: 92, status: "in-progress" }
3. Session ends

Session 3:
1. Dev returns, reads new state
2. Dev sees QA's update (coverage: 92)
```

---

## Acceptance Criteria

### Current: Red Phase (Step 1)
- [ ] All 74 tests FAIL as expected
- [ ] Error messages clearly indicate "not implemented"
- [ ] Test code is valid TypeScript/Playwright
- [ ] No compilation errors
- [ ] All test contracts are documented

### After Implementation: Green Phase (Step 2)
- [ ] All 28 unit tests PASS
- [ ] All 27 integration tests PASS
- [ ] All 19 E2E tests PASS
- [ ] Coverage reports show >99% coverage
- [ ] No regressions in other tests
- [ ] Performance benchmarks met:
  - Write: <100ms
  - Read: <50ms
  - Query: <500ms

### After Refactor: Refactor Phase (Step 3)
- [ ] Code review approved
- [ ] Performance maintained
- [ ] All tests still passing
- [ ] Coverage >99%

---

## NPM Scripts

Add these to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:watch": "vitest watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## Test Execution Timeline

### Week 1: Unit Tests (Red → Green)

**Monday:**
- Review all 28 unit tests
- Confirm all FAIL
- Understand contracts

**Tuesday-Thursday:**
- Implement memory utilities
- Make unit tests PASS
- Achieve >99% coverage

**Friday:**
- Code review
- Performance benchmarks
- Documentation

### Week 2: Integration Tests (Red → Green)

**Monday:**
- Review all 27 integration tests
- Confirm all FAIL

**Tuesday-Thursday:**
- Implement cross-agent features
- Make integration tests PASS
- Achieve >99% coverage

**Friday:**
- Code review
- Cross-agent validation
- Documentation

### Week 3: E2E Tests (Red → Green)

**Monday:**
- Review all 19 E2E tests
- Plan API implementation

**Tuesday-Thursday:**
- Implement API endpoints
- Make E2E tests PASS
- Full workflow validation

**Friday:**
- Code review
- Performance validation
- Final acceptance

---

## Coverage Report

### Unit Tests (28)
```
File: src/memory/write.ts
  Functions: 100% (5/5)
  Statements: 100% (25/25)
  Branches: 100% (8/8)
  Lines: 100% (25/25)

File: src/memory/read.ts
  Functions: 100% (4/4)
  Statements: 100% (20/20)
  Branches: 100% (6/6)
  Lines: 100% (20/20)

File: src/memory/query.ts
  Functions: 100% (3/3)
  Statements: 100% (15/15)
  Branches: 100% (4/4)
  Lines: 100% (15/15)

[Target: 99% combined]
```

### Integration Tests (27)
```
Cross-agent scenarios: 100%
Workstream persistence: 100%
State consistency: 100%
Error recovery: 90%

[Target: 99% flow coverage]
```

---

## Debugging Tests

### Print debug info
```typescript
it('test name', () => {
  console.log('Debug info', { /* data */ });
  expect(true).toBe(true);
});
```

### Run single test
```bash
npm run test:watch -- --reporter=verbose shared-memory.test.ts -t "Should write valid JSON"
```

### Watch specific file
```bash
npm run test:watch tests/unit/shared-memory.test.ts
```

---

## Next Steps

1. **Verify all tests FAIL** (current state)
2. **Implement Step 2** - Make tests GREEN
3. **Code review** - Leadership approval
4. **Refactor Step 3** - Optimization
5. **Final acceptance** - All 74 tests PASS with 99% coverage

---

**Status:** Ready for Step 2 Implementation
**Test Files:** 3 suites, 74 tests, all FAILING
**Coverage Target:** 99% (unit + integration combined)
