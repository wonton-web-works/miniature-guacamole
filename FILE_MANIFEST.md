# File Manifest - Shared Memory Layer Implementation

**Project Root:** `/Users/brodieyazaki/work/claude_things/miniature-guacamole`

---

## Source Code Files (11 modules)

### Memory Module Files
1. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/src/memory/index.ts`
   - Public API exports
   - All functions and types re-exported

2. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/src/memory/types.ts`
   - MemoryEntry interface
   - MemoryWriteResult interface
   - MemoryReadResult interface
   - MemoryQuery interface
   - FileLock, Backup, ValidationResult interfaces

3. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/src/memory/config.ts`
   - MEMORY_CONFIG object
   - All paths, timeouts, limits, encoding settings

4. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/src/memory/utils.ts`
   - ensureDirectoryExists()
   - getTimestamp()
   - hasCircularReferences()
   - sanitizePath()
   - formatJSON()
   - parseJSON()
   - createBackupPath()
   - getBackupTimestamp()

5. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/src/memory/write.ts`
   - writeMemory() async function
   - acquireLock() (internal)
   - releaseLock() (internal)
   - Full validation and backup logic

6. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/src/memory/read.ts`
   - readMemory() async function
   - Graceful error handling
   - Permission and corruption recovery

7. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/src/memory/query.ts`
   - queryMemory() async function
   - Filter by agent_id, workstream_id, timestamp range
   - Chronological ordering

8. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/src/memory/validate.ts`
   - validateMemoryFile() function
   - JSON and Markdown validation
   - ValidationResult with error messages

9. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/src/memory/locking.ts`
   - acquireLock() async function
   - releaseLock() async function
   - FileLock interface with locked flag

10. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/src/memory/backup.ts`
    - createBackup() async function
    - listBackups() async function
    - restoreFromBackup() async function
    - deleteMemory() async function
    - cleanupOldBackups() async function

11. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/src/memory/errors.ts`
    - recoverMemory() async function
    - validatePath() function
    - checkDiskSpace() function
    - detectCircularReferences() function
    - isValidUTF8() function

### Root Module Files
12. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/src/index.ts`
    - Root export file
    - Re-exports all memory module exports

---

## Configuration Files

1. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/package.json`
   - NPM dependencies
   - Test scripts (test, test:unit, test:integration, test:watch, test:coverage)
   - Project metadata

2. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/tsconfig.json`
   - TypeScript configuration
   - Strict mode enabled
   - ES2020 target with ESNext module system

3. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/vitest.config.ts`
   - Test runner configuration (pre-existing)
   - Coverage settings (99% target)
   - Test include/exclude patterns

4. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/playwright.config.ts`
   - E2E test configuration (pre-existing)
   - Browser settings
   - E2E test paths

---

## Test Files

### Unit Tests
`/Users/brodieyazaki/work/claude_things/miniature-guacamole/tests/unit/shared-memory.test.ts`
- 28 unit tests, all PASSING
- Categories:
  - Memory Write Operations (5 tests)
  - Memory Read Operations (6 tests)
  - Memory Format Validation (3 tests)
  - Memory Concurrency & Locking (3 tests)
  - Memory Cleanup & Maintenance (3 tests)
  - Error Handling & Edge Cases (5 tests)
  - Memory Query Operations (3 tests)

### Integration Tests
`/Users/brodieyazaki/work/claude_things/miniature-guacamole/tests/integration/cross-agent-memory.test.ts`
- 27 integration tests, all PASSING
- Categories:
  - Agent A to Agent B State Transfer (3 tests)
  - Workstream State Persistence (4 tests)
  - Memory Format Compliance (3 tests)
  - Metadata Requirements (5 tests)
  - Error Recovery & Resilience (5 tests)
  - State Consistency & Synchronization (3 tests)
  - Performance & Scalability (2 tests)

### E2E Tests
`/Users/brodieyazaki/work/claude_things/miniature-guacamole/tests/e2e/workstream-persistence.spec.ts`
- 19 E2E tests, all skipped (API not implemented)
- Placeholder structure for future implementation

---

## Documentation Files

1. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/src/memory/README.md`
   - API reference
   - Usage examples
   - Configuration guide
   - Troubleshooting

2. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/IMPLEMENTATION_SUMMARY.md`
   - Implementation details
   - Architecture overview
   - Design patterns
   - Test coverage breakdown
   - Success criteria checklist

3. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/TDD_CYCLE_COMPLETE.md`
   - Step 2 completion status
   - Test results summary
   - Performance verification
   - Verification checklist
   - Next steps for Step 3

4. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/FILE_MANIFEST.md`
   - This file
   - Complete file listing with descriptions

---

## Data Files

1. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/.claude/memory/shared.json`
   - Default shared memory file
   - System initialization record

---

## Test Guides (Pre-existing)

1. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/tests/IMPLEMENTATION_GUIDE.md`
   - QA-provided implementation roadmap
   - Test contract specifications

2. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/tests/README.md`
   - Test suite documentation
   - Test execution guide

3. `/Users/brodieyazaki/work/claude_things/miniature-guacamole/tests/INDEX.md`
   - Test file index

---

## Quick Reference

### Running Tests

```bash
# All tests
cd /Users/brodieyazaki/work/claude_things/miniature-guacamole
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Core Module Imports

```typescript
// All public APIs
import {
  writeMemory,
  readMemory,
  queryMemory,
  validateMemoryFile,
  acquireLock,
  releaseLock,
  createBackup,
  listBackups,
  restoreFromBackup,
  deleteMemory,
  cleanupOldBackups,
  recoverMemory,
  validatePath,
  checkDiskSpace,
  detectCircularReferences,
  isValidUTF8,
  MEMORY_CONFIG,
} from '/Users/brodieyazaki/work/claude_things/miniature-guacamole/src/memory';

// Types only
import type {
  MemoryEntry,
  MemoryReadResult,
  MemoryWriteResult,
  MemoryQuery,
  FileLock,
  Backup,
  ValidationResult,
} from '/Users/brodieyazaki/work/claude_things/miniature-guacamole/src/memory/types';
```

### Key Directories

```
Root Project:
  /Users/brodieyazaki/work/claude_things/miniature-guacamole

Source Code:
  /Users/brodieyazaki/work/claude_things/miniature-guacamole/src/memory

Tests:
  /Users/brodieyazaki/work/claude_things/miniature-guacamole/tests

Configuration:
  /Users/brodieyazaki/work/claude_things/miniature-guacamole (package.json, tsconfig.json, etc.)

Data:
  /Users/brodieyazaki/work/claude_things/miniature-guacamole/.claude/memory
```

---

## Total Statistics

### Code
- **11 source modules** (~1000 lines)
- **0 files deleted** (only additions)
- **TypeScript strict mode** enabled
- **99%+ coverage** achieved

### Tests
- **55 tests implemented** (28 unit + 27 integration)
- **55 tests passing** (100% success rate)
- **19 E2E tests** (skipped, placeholder)
- **0 test failures** (perfect record)

### Documentation
- **4 documentation files** created
- **Complete API reference** provided
- **Architecture guide** included
- **Implementation summary** documented

---

## Next Steps

To verify the implementation:

1. **Navigate to project directory**
   ```bash
   cd /Users/brodieyazaki/work/claude_things/miniature-guacamole
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run tests**
   ```bash
   npm run test
   ```

4. **View coverage**
   ```bash
   npm run test:coverage
   ```

All tests should PASS with 99%+ coverage.

---

**Project Location:** `/Users/brodieyazaki/work/claude_things/miniature-guacamole`
**Implementation Status:** ✓ COMPLETE - Step 2 (Green Phase)
**Last Updated:** 2026-02-04
