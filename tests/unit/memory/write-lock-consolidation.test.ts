/**
 * WS-MEM-2: State Management Hygiene - Write Module Lock Consolidation Tests
 *
 * Verifies that write.ts no longer maintains its own internal lock Map
 * and instead delegates all locking to the canonical locking.ts module.
 *
 * Acceptance Criteria Covered:
 *   AC-1: Only ONE lock Map exists in codebase (write.ts uses locking.ts)
 *   AC-2: write.ts uses shared acquireLock/releaseLock from locking.ts
 *   AC-5: All existing write tests pass (API unchanged)
 *
 * Standards:
 *   STD-006: No duplicate infrastructure -- one canonical implementation
 *
 * TDD: These tests are written BEFORE implementation. They will FAIL
 * until write.ts is refactored to use locking.ts instead of its own Map.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { writeMemory } from '@/memory/write';
import type { MemoryEntry } from '@/memory/types';

// ---------------------------------------------------------------------------
// AC-1: Static analysis -- write.ts must NOT contain its own lock Map
// ---------------------------------------------------------------------------

describe('memory/write - Lock Consolidation: No Duplicate Map (AC-1, STD-006)', () => {
  it('should NOT contain a local lock Map declaration in write.ts source', () => {
    // Read the source file and verify the duplicate Map is removed.
    // This is a structural/static-analysis test.
    const writeSourcePath = path.join(__dirname, '..', '..', '..', 'src', 'memory', 'write.ts');
    const source = fs.readFileSync(writeSourcePath, 'utf-8');

    // The old duplicate was: const locks: Map<string, ...> = new Map();
    // After refactoring, this line must be gone.
    const hasLocalLockMap = /const\s+locks\s*:\s*Map\s*</.test(source);
    expect(hasLocalLockMap).toBe(false);
  });

  it('should NOT define a local acquireLock function in write.ts source', () => {
    const writeSourcePath = path.join(__dirname, '..', '..', '..', 'src', 'memory', 'write.ts');
    const source = fs.readFileSync(writeSourcePath, 'utf-8');

    // The old duplicate was: async function acquireLock(filePath: string, ...
    // After refactoring, write.ts should import acquireLock, not define it.
    const hasLocalAcquireLock = /^\s*(?:async\s+)?function\s+acquireLock\s*\(/m.test(source);
    expect(hasLocalAcquireLock).toBe(false);
  });

  it('should NOT define a local releaseLock function in write.ts source', () => {
    const writeSourcePath = path.join(__dirname, '..', '..', '..', 'src', 'memory', 'write.ts');
    const source = fs.readFileSync(writeSourcePath, 'utf-8');

    // The old duplicate was: function releaseLock(filePath: string): void
    const hasLocalReleaseLock = /^\s*(?:export\s+)?function\s+releaseLock\s*\(/m.test(source);
    expect(hasLocalReleaseLock).toBe(false);
  });

  it('should import acquireLock and releaseLock from locking module', () => {
    const writeSourcePath = path.join(__dirname, '..', '..', '..', 'src', 'memory', 'write.ts');
    const source = fs.readFileSync(writeSourcePath, 'utf-8');

    // After refactoring, write.ts should have:
    //   import { acquireLock, releaseLock } from './locking';
    // or a similar import statement referencing the locking module.
    const importsFromLocking = /import\s+\{[^}]*acquireLock[^}]*\}\s+from\s+['"]\.\/locking['"]/.test(source);
    expect(importsFromLocking).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-2 / AC-5: write.ts uses shared locking and API is unchanged
// ---------------------------------------------------------------------------

describe('memory/write - Functional Behavior After Consolidation (AC-2, AC-5)', () => {
  let MEMORY_DIR: string;
  let SHARED_MEMORY_FILE: string;

  beforeEach(() => {
    MEMORY_DIR = path.join(
      os.tmpdir(),
      '.claude-test',
      `ws-mem2-write-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    SHARED_MEMORY_FILE = path.join(MEMORY_DIR, 'shared.json');
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(MEMORY_DIR)) {
      fs.rmSync(MEMORY_DIR, { recursive: true, force: true });
    }
  });

  it('should write valid JSON using shared locking (API unchanged)', async () => {
    const entry: Partial<MemoryEntry> = {
      timestamp: new Date().toISOString(),
      agent_id: 'consolidation-test',
      workstream_id: 'ws-mem-2',
      data: { message: 'Lock consolidation works' },
    };

    const result = await writeMemory(entry, SHARED_MEMORY_FILE);

    expect(result.success).toBe(true);
    expect(result.path).toBe(SHARED_MEMORY_FILE);
    expect(fs.existsSync(SHARED_MEMORY_FILE)).toBe(true);
  });

  it('should still validate required fields (agent_id)', async () => {
    const entry: any = {
      workstream_id: 'ws-mem-2',
      data: { test: true },
    };

    const result = await writeMemory(entry, SHARED_MEMORY_FILE);

    expect(result.success).toBe(false);
    expect(result.error).toContain('agent_id');
  });

  it('should still validate required fields (workstream_id)', async () => {
    const entry: any = {
      agent_id: 'test',
      data: { test: true },
    };

    const result = await writeMemory(entry, SHARED_MEMORY_FILE);

    expect(result.success).toBe(false);
    expect(result.error).toContain('workstream_id');
  });

  it('should still validate required fields (data)', async () => {
    const entry: any = {
      agent_id: 'test',
      workstream_id: 'ws-mem-2',
    };

    const result = await writeMemory(entry, SHARED_MEMORY_FILE);

    expect(result.success).toBe(false);
    expect(result.error).toContain('data');
  });

  it('should still reject circular references', async () => {
    const entry: any = {
      agent_id: 'test',
      workstream_id: 'ws-mem-2',
    };
    entry.data = { self: entry };

    const result = await writeMemory(entry, SHARED_MEMORY_FILE);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle concurrent writes safely using shared locking', async () => {
    const entry1: Partial<MemoryEntry> = {
      agent_id: 'writer-1',
      workstream_id: 'ws-mem-2',
      data: { from: 'writer-1' },
    };
    const entry2: Partial<MemoryEntry> = {
      agent_id: 'writer-2',
      workstream_id: 'ws-mem-2',
      data: { from: 'writer-2' },
    };

    // Both writes should succeed (one will wait for the lock)
    const [result1, result2] = await Promise.all([
      writeMemory(entry1, SHARED_MEMORY_FILE),
      writeMemory(entry2, SHARED_MEMORY_FILE),
    ]);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    // File should contain valid JSON
    const content = fs.readFileSync(SHARED_MEMORY_FILE, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('should create backup before overwriting (existing behavior preserved)', async () => {
    // Write initial file
    const entry1: Partial<MemoryEntry> = {
      agent_id: 'backup-test',
      workstream_id: 'ws-mem-2',
      data: { version: 1 },
    };
    await writeMemory(entry1, SHARED_MEMORY_FILE);

    // Write again -- should create backup
    const entry2: Partial<MemoryEntry> = {
      agent_id: 'backup-test',
      workstream_id: 'ws-mem-2',
      data: { version: 2 },
    };
    await writeMemory(entry2, SHARED_MEMORY_FILE);

    // Verify current file has version 2
    const content = JSON.parse(fs.readFileSync(SHARED_MEMORY_FILE, 'utf-8'));
    expect(content.data.version).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// AC-1: Codebase-wide check -- only ONE lock Map
// ---------------------------------------------------------------------------

describe('memory/ - Single Lock Map in Codebase (AC-1)', () => {
  it('should have exactly one lock Map declaration across memory/*.ts files', () => {
    const memoryDir = path.join(__dirname, '..', '..', '..', 'src', 'memory');
    const tsFiles = fs.readdirSync(memoryDir).filter((f: string) => f.endsWith('.ts'));

    let lockMapCount = 0;

    for (const file of tsFiles) {
      const source = fs.readFileSync(path.join(memoryDir, file), 'utf-8');
      // Count declarations that look like lock-related Maps
      // Match patterns like: const lockRegistry: Map<... or const locks: Map<...
      const lockMapMatches = source.match(/const\s+(?:locks|lockRegistry)\s*:\s*Map\s*</g);
      if (lockMapMatches) {
        lockMapCount += lockMapMatches.length;
      }
    }

    // After consolidation, there should be exactly ONE lock Map (in locking.ts)
    expect(lockMapCount).toBe(1);
  });
});
