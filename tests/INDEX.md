# Shared Memory Layer Test Suite - Complete Index

**Status:** Step 1 of TDD Cycle - ALL TESTS FAILING (Red Phase)
**Test Count:** 74 tests across 3 suites
**Coverage Target:** 99% (unit + integration combined)
**Created:** 2026-02-04

---

## Quick Navigation

### For Developers (Implementation)
1. Start here: [`IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md)
   - What to implement
   - Function signatures
   - Step-by-step roadmap

2. Then read: [`SHARED_MEMORY_TESTS.md`](./SHARED_MEMORY_TESTS.md)
   - Full test specifications
   - Test contracts
   - Acceptance criteria

### For QA Team (Verification)
1. Start here: [`README.md`](./README.md)
   - How to run tests
   - Test scenarios
   - Debug tips

2. Then read: [`SHARED_MEMORY_TESTS.md`](./SHARED_MEMORY_TESTS.md)
   - Coverage goals
   - Performance targets
   - Test matrix

### For Leadership (Code Review)
1. Start here: [`../. claude/tests/qa-summary.md`](../.claude/tests/qa-summary.md)
   - Executive summary
   - Metrics and acceptance criteria
   - Handoff status

2. Then read: [`SHARED_MEMORY_TESTS.md`](./SHARED_MEMORY_TESTS.md)
   - Full specifications
   - TDD workflow phases
   - Success metrics

---

## File Structure

```
tests/
├── INDEX.md (this file)
├── README.md
│   ├── Quick start guide
│   ├── NPM scripts
│   ├── Test scenarios
│   └── Debugging tips
│
├── SHARED_MEMORY_TESTS.md
│   ├── Test overview (28 unit, 27 integration, 19 E2E)
│   ├── Test execution plan
│   ├── Acceptance criteria
│   ├── Coverage goals
│   └── Implementation checklist
│
├── IMPLEMENTATION_GUIDE.md
│   ├── High-level architecture
│   ├── What to implement (5 modules)
│   ├── Function signatures
│   ├── File structure
│   ├── Cross-agent scenarios
│   ├── Performance targets
│   └── Step-by-step roadmap
│
├── unit/
│   └── shared-memory.test.ts
│       ├── Memory Write Operations (5 tests)
│       ├── Memory Read Operations (6 tests)
│       ├── Memory Format Validation (3 tests)
│       ├── Memory Concurrency & Locking (3 tests)
│       ├── Memory Cleanup & Maintenance (3 tests)
│       ├── Error Handling & Edge Cases (5 tests)
│       └── Memory Query Operations (3 tests)
│       Total: 28 tests (all FAILING)
│
├── integration/
│   └── cross-agent-memory.test.ts
│       ├── Agent A to Agent B State Transfer (3 tests)
│       ├── Workstream State Persistence (4 tests)
│       ├── Memory Format Compliance (3 tests)
│       ├── Metadata Requirements (5 tests)
│       ├── Error Recovery & Resilience (5 tests)
│       ├── State Consistency & Synchronization (5 tests)
│       └── Performance & Scalability (2 tests)
│       Total: 27 tests (all FAILING)
│
└── e2e/
    └── workstream-persistence.spec.ts
        ├── Single Workstream Lifecycle (3 tests)
        ├── Cross-Session State Recovery (3 tests)
        ├── Concurrent Workstream Operations (2 tests)
        ├── Workstream Branching & Merging (2 tests)
        ├── Memory Backup & Recovery (3 tests)
        ├── Memory Observability & Debugging (3 tests)
        └── Error Scenarios & Recovery (3 tests)
        Total: 19 tests (all FAILING/SKIPPED)

Configuration:
├── vitest.config.ts
│   ├── Unit/integration test configuration
│   ├── 99% coverage target
│   └── Parallel execution (4 workers)
│
└── playwright.config.ts
    ├── E2E test configuration
    ├── Cross-browser testing
    └── HTML/JSON/JUnit reporting

Documentation:
└── ../.claude/tests/qa-summary.md
    ├── QA handoff document
    ├── Test statistics
    └── Phase completion status
```

---

## Test Summary

### Unit Tests (28 tests - all FAILING)

| Category | Tests | File | Status |
|----------|-------|------|--------|
| Memory Write Operations | 5 | `shared-memory.test.ts` | FAIL |
| Memory Read Operations | 6 | `shared-memory.test.ts` | FAIL |
| Memory Format Validation | 3 | `shared-memory.test.ts` | FAIL |
| Memory Concurrency & Locking | 3 | `shared-memory.test.ts` | FAIL |
| Memory Cleanup & Maintenance | 3 | `shared-memory.test.ts` | FAIL |
| Error Handling & Edge Cases | 5 | `shared-memory.test.ts` | FAIL |
| Memory Query Operations | 3 | `shared-memory.test.ts` | FAIL |
| **TOTAL** | **28** | | **FAIL** |

### Integration Tests (27 tests - all FAILING)

| Category | Tests | File | Status |
|----------|-------|------|--------|
| Agent A to Agent B State Transfer | 3 | `cross-agent-memory.test.ts` | FAIL |
| Workstream State Persistence | 4 | `cross-agent-memory.test.ts` | FAIL |
| Memory Format Compliance | 3 | `cross-agent-memory.test.ts` | FAIL |
| Metadata Requirements | 5 | `cross-agent-memory.test.ts` | FAIL |
| Error Recovery & Resilience | 5 | `cross-agent-memory.test.ts` | FAIL |
| State Consistency & Synchronization | 5 | `cross-agent-memory.test.ts` | FAIL |
| Performance & Scalability | 2 | `cross-agent-memory.test.ts` | FAIL |
| **TOTAL** | **27** | | **FAIL** |

### E2E Tests (19 tests - all FAILING/SKIPPED)

| Category | Tests | File | Status |
|----------|-------|------|--------|
| Single Workstream Lifecycle | 3 | `workstream-persistence.spec.ts` | SKIP |
| Cross-Session State Recovery | 3 | `workstream-persistence.spec.ts` | SKIP |
| Concurrent Workstream Operations | 2 | `workstream-persistence.spec.ts` | SKIP |
| Workstream Branching & Merging | 2 | `workstream-persistence.spec.ts` | SKIP |
| Memory Backup & Recovery | 3 | `workstream-persistence.spec.ts` | SKIP |
| Memory Observability & Debugging | 3 | `workstream-persistence.spec.ts` | SKIP |
| Error Scenarios & Recovery | 3 | `workstream-persistence.spec.ts` | SKIP |
| **TOTAL** | **19** | | **SKIP** |

### Overall Summary

```
┌─────────────────────────────────────────┐
│    SHARED MEMORY TEST SUITE SUMMARY     │
├─────────────────────────────────────────┤
│ Unit Tests:        28 │ all FAILING     │
│ Integration Tests: 27 │ all FAILING     │
│ E2E Tests:         19 │ all SKIPPED     │
├─────────────────────────────────────────┤
│ TOTAL:             74 │ all FAILING     │
│                                         │
│ Coverage Target:   99% (unit + integ)   │
│ Phase:             Step 1 of TDD (RED)  │
│ Status:            Contract Defined     │
└─────────────────────────────────────────┘
```

---

## Key Concepts

### TDD Cycle (3 Phases)

1. **RED (Step 1) - Current**
   - Write failing tests
   - Define contract
   - Status: COMPLETE (74 tests FAILING)

2. **GREEN (Step 2) - Next**
   - Implement features
   - Make tests PASS
   - Status: Dev team responsibility

3. **REFACTOR (Step 3) - After Green**
   - Optimize code
   - Maintain coverage
   - Status: Post-implementation

### Memory Architecture

```
User/Agent
    ↓
Claude Code CLI
    ↓
Agent (dev/qa/design)
    ↓
Memory API (to implement)
    ├─ writeMemory()    ← Persist state
    ├─ readMemory()     ← Retrieve state
    ├─ queryMemory()    ← Filter state
    └─ File Locking     ← Protect concurrency
    ↓
Filesystem (.claude/memory/)
    ├─ shared.json      ← Main state file
    ├─ ws-1.json        ← Workstream-specific
    ├─ agent-a.json     ← Agent-specific
    └─ backups/         ← Version history
```

### Metadata Enforcement

Every memory entry MUST have:
- `timestamp` (ISO 8601, auto-added if missing)
- `agent_id` (identifies writing agent)
- `workstream_id` (identifies workstream)
- `data` (user payload)

---

## Running Tests

### All tests (should FAIL)
```bash
npm run test
# Expected: 74 tests FAIL with "not implemented" errors
# Duration: ~5 seconds
```

### Unit tests only
```bash
npm run test:unit -- shared-memory.test.ts
# Expected: 28 tests FAIL
```

### Integration tests only
```bash
npm run test:integration -- cross-agent-memory.test.ts
# Expected: 27 tests FAIL
```

### E2E tests only
```bash
npm run test:e2e -- workstream-persistence.spec.ts
# Expected: 19 tests SKIPPED
```

### Watch mode
```bash
npm run test:watch
# Re-runs on file changes
```

### Coverage report
```bash
npm run test:coverage
# Generates HTML report (coverage/)
```

---

## Test Contracts

### Memory Write Contract

**Input:**
```typescript
{
  timestamp: "2026-02-04T10:00:00Z",  // Optional (auto-added)
  agent_id: "dev",                    // Required
  workstream_id: "ws-1",              // Required
  data: { coverage: 85 }              // Required
}
```

**Expected Output (Success):**
```typescript
{
  success: true,
  path: "/path/to/.claude/memory/shared.json"
}
```

**Expected Output (Failure):**
```typescript
{
  success: false,
  error: "Permission denied" // or other error
}
```

### Memory Read Contract

**Expected Output (File Exists):**
```typescript
{
  success: true,
  data: {
    timestamp: "2026-02-04T10:00:00Z",
    agent_id: "dev",
    workstream_id: "ws-1",
    data: { coverage: 85 }
  }
}
```

**Expected Output (File Missing - Graceful):**
```typescript
{
  success: false,
  data: null,
  error: "File not found"
}
```

---

## Acceptance Criteria

### Step 1: RED (Current - COMPLETE)
- [x] 74 tests created and FAILING
- [x] All test files are valid TypeScript
- [x] Configuration files created
- [x] Implementation guide provided
- [x] Contracts clearly defined

### Step 2: GREEN (Dev Team Responsibility)
- [ ] All 74 tests PASS
- [ ] Coverage >99%
- [ ] Memory utilities implemented
- [ ] Cross-agent features working
- [ ] API endpoints functional

### Step 3: REFACTOR (After Implementation)
- [ ] Code optimized
- [ ] All tests still PASS
- [ ] Coverage maintained >99%
- [ ] Code review approved
- [ ] Ready for merge to main

---

## Performance Targets

| Operation | Target | Constraint |
|-----------|--------|-----------|
| **Write** | <100ms | Single write, 1KB payload |
| **Read** | <50ms | Single read, existing file |
| **Query** | <500ms | 100 entries, with filtering |
| **Backup** | <200ms | Created before each write |
| **Recovery** | <1s | From corrupted state |

---

## Related Documentation

### In This Project
- [`tests/README.md`](./README.md) - Quick start and test scenarios
- [`tests/SHARED_MEMORY_TESTS.md`](./SHARED_MEMORY_TESTS.md) - Full test specifications
- [`tests/IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md) - Implementation roadmap
- [`../.claude/tests/qa-summary.md`](../.claude/tests/qa-summary.md) - QA handoff

### In Project Structure
- `.claude/PLAN.md` - Overall architecture plan
- `.claude/team-config.json` - Agent/team definitions
- `.claude/shared/handoff-protocol.md` - Agent handoff protocol
- `.claude/shared/engineering-principles.md` - TDD/BDD principles

---

## Checklist for Dev Team

Before starting implementation:
- [ ] Read `IMPLEMENTATION_GUIDE.md`
- [ ] Understand all 74 test contracts
- [ ] Run tests to confirm they all FAIL
- [ ] Create `src/memory/` directory
- [ ] Plan implementation phases
- [ ] Set up Git feature branch

During implementation:
- [ ] Implement one module at a time
- [ ] Run tests after each module
- [ ] Track coverage percentage
- [ ] Document any design decisions
- [ ] Commit frequently with clear messages

Before code review:
- [ ] All 74 tests PASS
- [ ] Coverage >99%
- [ ] No TypeScript errors
- [ ] Performance benchmarks met
- [ ] Documentation complete

---

## Support & Questions

### For Implementation Questions
- See: [`IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md)
- Look at specific test case for expected behavior
- Each test is a specification document

### For Test Execution Questions
- See: [`README.md`](./README.md)
- Run: `npm run test:help` (if available)
- Check: Vitest documentation

### For Architecture Questions
- See: [`SHARED_MEMORY_TESTS.md`](./SHARED_MEMORY_TESTS.md)
- Look at: "High-Level Architecture" section
- Review: `.claude/README.md` for agent system

---

## Timeline Estimate

| Phase | Duration | Responsible | Status |
|-------|----------|-------------|--------|
| Step 1: Red (Test Creation) | 4 hours | QA | COMPLETE |
| Step 2: Green (Implementation) | 8 hours | Dev | PENDING |
| Step 3: Code Review | 2 hours | Leadership | PENDING |
| Step 4: Refactor (Optimization) | 2 hours | Dev | PENDING |
| **TOTAL** | **16 hours** | | |

---

## Success Criteria Summary

```
Step 1: RED (COMPLETE)
├─ 74 tests written: ✓
├─ All FAILING: ✓
├─ Contract defined: ✓
└─ Handed to Dev: ✓

Step 2: GREEN (IN PROGRESS)
├─ Implementation complete: ⏳
├─ 74 tests PASS: ⏳
├─ Coverage >99%: ⏳
└─ Ready for review: ⏳

Step 3: REFACTOR (PENDING)
├─ Code optimized: ⏳
├─ Tests still PASS: ⏳
├─ Coverage maintained: ⏳
└─ Approved for merge: ⏳

Step 4: VERIFY (PENDING)
├─ All tests re-run: ⏳
├─ Coverage verified: ⏳
├─ Performance checked: ⏳
└─ Feature complete: ⏳
```

---

**Index Complete**
**Status: Ready for Implementation (Step 2)**
**Next: Developer Review & Implementation**
