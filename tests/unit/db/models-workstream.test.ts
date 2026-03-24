import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const MODELS_PATH = join(process.cwd(), 'src', 'schema', 'models.ts');

let src: string;
// Scoped to the Workstream interface block for field-level optionality checks
let wsBlock: string;

beforeAll(() => {
  if (existsSync(MODELS_PATH)) {
    src = readFileSync(MODELS_PATH, 'utf-8');
    // Extract the Workstream interface block for scoped assertions
    const match = src.match(/export\s+interface\s+Workstream\s*\{[^}]*\}/s);
    wsBlock = match ? match[0] : '';
  }
});

describe.skipIf(!existsSync(MODELS_PATH))(
  'src/schema/models.ts — Workstream interface',
  () => {
    // -----------------------------------------------------------------------
    // MISUSE CASES
    // -----------------------------------------------------------------------

    it('M-9: workstream_id is required (not optional)', () => {
      // Check within the Workstream interface block only (other interfaces may
      // have workstream_id? e.g. AgentEventExtended)
      expect(wsBlock).not.toMatch(/workstream_id\s*\?/);
    });

    it('M-10: phase is required (not optional)', () => {
      expect(wsBlock).not.toMatch(/phase\s*\?/);
    });

    it('M-11: created_at and updated_at are required (not optional)', () => {
      expect(wsBlock).not.toMatch(/created_at\s*\?/);
      expect(wsBlock).not.toMatch(/updated_at\s*\?/);
    });

    it('M-12: phase is typed as string (not a restricted union)', () => {
      expect(wsBlock).toMatch(/phase:\s*string/);
    });

    it('M-13: data field is not typed as any', () => {
      expect(wsBlock).not.toMatch(/data\s*\??\s*:\s*any/);
    });

    // -----------------------------------------------------------------------
    // BOUNDARY TESTS
    // -----------------------------------------------------------------------

    it('B-7: Workstream interface is exported', () => {
      expect(src).toMatch(/export\s+(interface|type)\s+Workstream/);
    });

    it('B-8: Workstream does not extend unrelated types', () => {
      expect(src).not.toMatch(/Workstream\s+extends/);
    });

    it('B-9: optional fields are correctly marked optional', () => {
      expect(src).toMatch(/name\s*\?/);
      expect(src).toMatch(/gate_status\s*\?/);
      expect(src).toMatch(/blocker\s*\?/);
      expect(src).toMatch(/agent_id\s*\?/);
      expect(src).toMatch(/data\s*\?/);
      expect(src).toMatch(/synced_at\s*\?/);
    });

    it('B-10: Workstream is in models.ts, not a separate file', () => {
      expect(src).toContain('Workstream');
      const separateFilePath = join(process.cwd(), 'enterprise', 'src', 'schema', 'workstream.ts');
      expect(existsSync(separateFilePath)).toBe(false);
    });

    // -----------------------------------------------------------------------
    // GOLDEN PATH TESTS
    // -----------------------------------------------------------------------

    it('G-10: Workstream interface has all 10 fields', () => {
      expect(src).toContain('workstream_id');
      expect(src).toContain('name');
      expect(src).toContain('phase');
      expect(src).toContain('gate_status');
      expect(src).toContain('blocker');
      expect(src).toContain('agent_id');
      expect(src).toContain('data');
      expect(src).toContain('synced_at');
      expect(src).toContain('created_at');
      expect(src).toContain('updated_at');
    });

    it('G-11: timestamp fields typed as string (ISO 8601 convention)', () => {
      expect(src).toMatch(/created_at:\s*string/);
      expect(src).toMatch(/updated_at:\s*string/);
    });

    it('G-12: data field uses Record<string, unknown>', () => {
      expect(src).toMatch(/data\s*\?\s*:\s*Record<string,\s*unknown>/);
    });

    it('G-13: existing models are undisturbed', () => {
      expect(src).toContain('interface Project');
      expect(src).toContain('interface User');
      expect(src).toContain('interface Role');
      expect(src).toContain('interface Permission');
      expect(src).toContain('interface Asset');
      expect(src).toContain('interface UserRole');
      expect(src).toContain('interface RolePermission');
      expect(src).toContain('interface AgentEventExtended');
    });
  }
);
