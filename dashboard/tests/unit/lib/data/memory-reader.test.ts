import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as path from 'node:path';

// AC-DASH-1.2: Memory reader handles valid, missing, malformed, and permission-denied files

// Mock node:fs at module level (project standard)
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
}));

describe('MemoryReader', () => {
  let readJsonFile: any;
  let listJsonFiles: any;
  let fs: any;

  const fixturesDir = path.join(__dirname, '../../../fixtures');

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    fs = await import('node:fs');
    // @ts-expect-error - module not implemented yet
    const module = await import('../../../../src/lib/data/memory-reader');
    readJsonFile = module.readJsonFile;
    listJsonFiles = module.listJsonFiles;
  });

  describe('readJsonFile', () => {
    describe('valid files', () => {
      it('should parse and return valid JSON', () => {
        const validJson = { workstream_id: 'WS-1', status: 'active' };
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(validJson));

        const result = readJsonFile('/path/to/file.json');

        expect(result).toEqual(validJson);
      });

      it('should handle complex nested objects', () => {
        const complexJson = {
          workstream_id: 'WS-1',
          nested: {
            deep: {
              array: [1, 2, 3],
              object: { key: 'value' }
            }
          }
        };
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(complexJson));

        const result = readJsonFile('/path/to/file.json');

        expect(result).toEqual(complexJson);
      });

      it('should handle empty JSON object', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('{}');

        const result = readJsonFile('/path/to/file.json');

        expect(result).toEqual({});
      });

      it('should handle JSON arrays', () => {
        const arrayJson = [{ id: 1 }, { id: 2 }, { id: 3 }];
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(arrayJson));

        const result = readJsonFile('/path/to/file.json');

        expect(result).toEqual(arrayJson);
      });

      it('should handle JSON with null values', () => {
        const jsonWithNull = { key: null, nested: { value: null } };
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(jsonWithNull));

        const result = readJsonFile('/path/to/file.json');

        expect(result).toEqual(jsonWithNull);
      });
    });

    describe('missing files', () => {
      it('should return null for non-existent file (no throw)', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = readJsonFile('/path/to/nonexistent.json');

        expect(result).toBeNull();
      });

      it('should not call readFileSync for missing file', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        readJsonFile('/path/to/nonexistent.json');

        expect(fs.readFileSync).not.toHaveBeenCalled();
      });

      it('should handle multiple missing file checks', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        expect(readJsonFile('/path/1.json')).toBeNull();
        expect(readJsonFile('/path/2.json')).toBeNull();
        expect(readJsonFile('/path/3.json')).toBeNull();
      });
    });

    describe('malformed JSON', () => {
      it('should return null for malformed JSON (no throw)', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }');

        const result = readJsonFile('/path/to/malformed.json');

        expect(result).toBeNull();
      });

      it('should return null for incomplete JSON', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('{ "key": "value"');

        const result = readJsonFile('/path/to/incomplete.json');

        expect(result).toBeNull();
      });

      it('should return null for JSON with trailing comma', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('{ "key": "value", }');

        const result = readJsonFile('/path/to/trailing.json');

        expect(result).toBeNull();
      });

      it('should return null for empty string', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('');

        const result = readJsonFile('/path/to/empty.json');

        expect(result).toBeNull();
      });

      it('should return null for whitespace only', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('   \n\t  ');

        const result = readJsonFile('/path/to/whitespace.json');

        expect(result).toBeNull();
      });

      it('should return null for non-JSON text', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('This is not JSON');

        const result = readJsonFile('/path/to/text.json');

        expect(result).toBeNull();
      });
    });

    describe('permission denied', () => {
      it('should return null for permission-denied (no throw)', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockImplementation(() => {
          const error: any = new Error('EACCES: permission denied');
          error.code = 'EACCES';
          throw error;
        });

        const result = readJsonFile('/path/to/restricted.json');

        expect(result).toBeNull();
      });

      it('should return null for EPERM error', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockImplementation(() => {
          const error: any = new Error('EPERM: operation not permitted');
          error.code = 'EPERM';
          throw error;
        });

        const result = readJsonFile('/path/to/restricted.json');

        expect(result).toBeNull();
      });
    });

    describe('error handling', () => {
      it('should return null for ENOENT during read', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockImplementation(() => {
          const error: any = new Error('ENOENT: no such file or directory');
          error.code = 'ENOENT';
          throw error;
        });

        const result = readJsonFile('/path/to/file.json');

        expect(result).toBeNull();
      });

      it('should return null for generic file system errors', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockImplementation(() => {
          throw new Error('Unknown file system error');
        });

        const result = readJsonFile('/path/to/file.json');

        expect(result).toBeNull();
      });

      it('should handle UTF-8 encoding issues gracefully', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from([0xFF, 0xFE, 0x00]));

        const result = readJsonFile('/path/to/binary.json');

        expect(result).toBeNull();
      });
    });

    describe('path handling', () => {
      it('should handle absolute paths', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('{"id": 1}');

        const result = readJsonFile('/absolute/path/to/file.json');

        expect(result).toEqual({ id: 1 });
        expect(fs.readFileSync).toHaveBeenCalledWith('/absolute/path/to/file.json', 'utf-8');
      });

      it('should handle paths with spaces', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('{"id": 1}');

        const result = readJsonFile('/path with spaces/file.json');

        expect(result).toEqual({ id: 1 });
      });

      it('should handle paths with special characters', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('{"id": 1}');

        const result = readJsonFile('/path/with-dashes_underscores.dots/file.json');

        expect(result).toEqual({ id: 1 });
      });
    });
  });

  describe('listJsonFiles', () => {
    describe('valid directories', () => {
      it('should return all .json filenames', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue([
          'file1.json',
          'file2.json',
          'file3.json',
          'readme.md',
          'script.ts'
        ] as any);

        const result = listJsonFiles('/path/to/dir');

        expect(result).toEqual(['file1.json', 'file2.json', 'file3.json']);
      });

      it('should filter out non-JSON files', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue([
          'data.json',
          'image.png',
          'style.css',
          'config.yaml',
          'state.json'
        ] as any);

        const result = listJsonFiles('/path/to/dir');

        expect(result).toEqual(['data.json', 'state.json']);
      });

      it('should return empty array for directory with no JSON files', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue([
          'readme.md',
          'script.ts',
          'image.png'
        ] as any);

        const result = listJsonFiles('/path/to/dir');

        expect(result).toEqual([]);
      });

      it('should handle empty directory', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue([] as any);

        const result = listJsonFiles('/path/to/empty');

        expect(result).toEqual([]);
      });

      it('should handle case-insensitive .json extension', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue([
          'file.json',
          'FILE.JSON',
          'File.Json',
          'data.txt'
        ] as any);

        const result = listJsonFiles('/path/to/dir');

        expect(result.length).toBeGreaterThan(0);
        expect(result).toContain('file.json');
      });
    });

    describe('non-existent directories', () => {
      it('should return empty array for non-existent directory (no throw)', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = listJsonFiles('/path/to/nonexistent');

        expect(result).toEqual([]);
      });

      it('should not call readdirSync for missing directory', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        listJsonFiles('/path/to/nonexistent');

        expect(fs.readdirSync).not.toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should return empty array for permission denied', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockImplementation(() => {
          const error: any = new Error('EACCES: permission denied');
          error.code = 'EACCES';
          throw error;
        });

        const result = listJsonFiles('/path/to/restricted');

        expect(result).toEqual([]);
      });

      it('should return empty array for generic errors', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockImplementation(() => {
          throw new Error('Unknown error');
        });

        const result = listJsonFiles('/path/to/dir');

        expect(result).toEqual([]);
      });
    });

    describe('file filtering', () => {
      it('should include files with .json extension only', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue([
          'valid.json',
          'invalid.jsonl',
          'file.json.bak',
          'test.json'
        ] as any);

        const result = listJsonFiles('/path/to/dir');

        expect(result).toContain('valid.json');
        expect(result).toContain('test.json');
        expect(result).not.toContain('invalid.jsonl');
        expect(result).not.toContain('file.json.bak');
      });

      it('should handle hidden files', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue([
          '.hidden.json',
          'visible.json'
        ] as any);

        const result = listJsonFiles('/path/to/dir');

        expect(result).toContain('.hidden.json');
        expect(result).toContain('visible.json');
      });

      it('should handle files with multiple dots', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue([
          'file.backup.json',
          'data.v2.json',
          'config.test.json'
        ] as any);

        const result = listJsonFiles('/path/to/dir');

        expect(result).toEqual(['file.backup.json', 'data.v2.json', 'config.test.json']);
      });
    });
  });
});
