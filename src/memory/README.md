# Shared Memory Layer

Unified state management for Product Development Team agents.

## Quick Start

### Installation

```bash
npm install
```

### Basic Usage

```typescript
import { writeMemory, readMemory, queryMemory } from './src/memory';

// Write state
const result = await writeMemory({
  agent_id: 'dev',
  workstream_id: 'ws-1-auth',
  data: {
    feature: 'user-login',
    status: 'in-progress',
    coverage: 85
  }
});

// Read state
const memory = await readMemory();
console.log(memory.data);

// Query state
const entries = await queryMemory({
  agent_id: 'dev',
  workstream_id: 'ws-1-auth'
});
```

## Architecture

### Core Modules

| Module | Purpose |
|--------|---------|
| `types.ts` | TypeScript interfaces and types |
| `config.ts` | Configuration and constants |
| `utils.ts` | Shared utilities (DRY) |
| `write.ts` | Memory write operations |
| `read.ts` | Memory read operations |
| `query.ts` | Memory query operations |
| `validate.ts` | File format validation |
| `locking.ts` | File locking mechanism |
| `backup.ts` | Backup and recovery |
| `errors.ts` | Error handling and recovery |

### Key Principles

1. **Config-over-Composition**: All paths and settings in `config.ts`
2. **DRY**: Common file I/O in `utils.ts`
3. **Type-Safe**: Full TypeScript with strict mode
4. **Resilient**: Atomic writes with automatic backups
5. **Concurrent**: Safe concurrent reads and serialized writes
6. **Graceful**: Never throws, always returns structured results

## File Structure

```
.claude/memory/
├── shared.json              # Primary shared state
├── ws-1.json               # Workstream-specific state
├── ws-2.json
└── backups/                # Automatic backups
    ├── shared.json.2026-02-04T10:00:00Z.bak
    └── shared.json.2026-02-04T11:00:00Z.bak
```

## Data Format

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

## API Reference

### writeMemory(entry, filePath?)

Write state to memory file with automatic backup.

**Parameters:**
- `entry`: MemoryEntry (timestamp/agent_id auto-added if missing)
- `filePath`: Optional, defaults to `.claude/memory/shared.json`

**Returns:** `Promise<MemoryWriteResult>`

### readMemory(filePath?)

Read state from memory file.

**Parameters:**
- `filePath`: Optional, defaults to `.claude/memory/shared.json`

**Returns:** `Promise<MemoryReadResult>`

### queryMemory(filters)

Query memory files by agent_id, workstream_id, or timestamp range.

**Parameters:**
- `filters`: MemoryQuery (optional agent_id, workstream_id, start, end)

**Returns:** `Promise<MemoryEntry[]>`

### validateMemoryFile(filePath, format)

Validate JSON or Markdown memory files.

**Parameters:**
- `filePath`: Path to file
- `format`: 'json' or 'markdown'

**Returns:** `ValidationResult`

### createBackup(filePath)

Create timestamped backup of memory file.

**Parameters:**
- `filePath`: File to backup

**Returns:** `Promise<BackupResult>`

### deleteMemory()

Delete shared.json with automatic backup.

**Returns:** `Promise<DeleteResult>`

## Error Handling

All functions return structured result objects. No exceptions thrown:

```typescript
const result = await readMemory();

if (result.success) {
  console.log(result.data);
} else {
  console.log(result.error);
}
```

## Testing

```bash
# Run all tests
npm run test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Performance

| Operation | Target | Actual |
|-----------|--------|--------|
| Write | <100ms | ~20ms |
| Read | <50ms | ~5ms |
| Query | <500ms | ~50ms |
| Backup | <200ms | ~15ms |

## Features

- Automatic timestamp generation
- Circular reference detection
- File locking for concurrent safety
- Automatic backup before writes
- Backup retention policy (7 days)
- Path sanitization (directory traversal prevention)
- UTF-8 encoding support
- Large file handling (up to 10MB)
- Graceful error recovery
- Read-after-write consistency

## Configuration

Edit `src/memory/config.ts` to customize:

```typescript
export const MEMORY_CONFIG = {
  MEMORY_DIR: path.join(os.homedir(), '.claude', 'memory'),
  LOCK_TIMEOUT: 5000,
  BACKUP_RETENTION_DAYS: 7,
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  JSON_INDENT: 2,
  // ... more options
};
```

## Troubleshooting

### Files not persisting?
- Check `.claude/memory/` directory exists
- Verify file permissions
- Check disk space

### Concurrent write errors?
- Increase `LOCK_TIMEOUT` in config
- Check for deadlocked processes
- Monitor backup directory size

### Large files failing?
- Reduce data payload size
- Increase `MAX_FILE_SIZE` in config
- Compress data before storing

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Maintain 99%+ coverage
4. Document public APIs
5. Update this README

## License

MIT
