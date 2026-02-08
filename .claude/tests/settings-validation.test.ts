import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Settings.json - Agent Teams Enablement (WS-TEAMS-1)', () => {
  let settingsContent: string;
  let settings: any;
  const settingsPath = join(__dirname, '..', 'settings.json');

  // Original permissions that must be preserved
  const expectedAllowPermissions = [
    'Read',
    'Glob',
    'Grep',
    'Edit',
    'Write',
    'WebFetch',
    'WebSearch',
    'Task',
    'Bash(npm:*)',
    'Bash(git:*)',
    'Bash(node:*)',
    'Bash(npx:*)',
    'Bash(pnpm:*)',
    'Bash(yarn:*)',
    'Bash(vitest:*)',
    'Bash(playwright:*)',
    'Bash(tsc:*)',
    'Bash(eslint:*)',
    'Bash(prettier:*)',
    'Bash(ls:*)',
    'Bash(mkdir:*)',
    'Bash(cp:*)',
    'Bash(mv:*)',
    'Bash(cat:*)',
    'Bash(echo:*)',
    'Bash(pwd:*)',
    'Bash(which:*)',
    'Bash(head:*)',
    'Bash(tail:*)',
    'Bash(wc:*)',
    'Bash(sort:*)',
    'Bash(uniq:*)',
    'Bash(diff:*)',
    'Bash(touch:*)',
    'Bash(jq:*)',
    'Bash(sed:*)',
    'Bash(awk:*)',
    'Bash(xargs:*)',
    'Bash(find:*)',
    'Bash(rm:*)',
    'Bash(grep:*)',
    'Bash(tree:*)',
    'Bash(test:*)',
    'Bash(bash:*)',
  ];

  const expectedDenyPermissions = [
    'Bash(rm -rf /)*',
    'Bash(rm -rf ~)*',
    'Bash(rm -rf $HOME)*',
    'Bash(chmod -R 777)*',
    'Bash(dd if=)*',
    'Bash(mkfs)*',
    'Bash(> /dev/)*',
  ];

  beforeAll(() => {
    settingsContent = readFileSync(settingsPath, 'utf-8');
    settings = JSON.parse(settingsContent);
  });

  describe('Requirement 1: settings.json structure validation', () => {
    it('should be valid JSON', () => {
      expect(() => JSON.parse(settingsContent)).not.toThrow();
    });

    it('should contain top-level "env" field', () => {
      expect(settings).toHaveProperty('env');
      expect(settings.env).toBeDefined();
    });

    it('should contain top-level "teammateMode" field', () => {
      expect(settings).toHaveProperty('teammateMode');
      expect(settings.teammateMode).toBeDefined();
    });

    it('should contain top-level "permissions" field', () => {
      expect(settings).toHaveProperty('permissions');
      expect(settings.permissions).toBeDefined();
    });

    it('should have permissions object with allow and deny arrays', () => {
      expect(settings.permissions).toHaveProperty('allow');
      expect(settings.permissions).toHaveProperty('deny');
      expect(Array.isArray(settings.permissions.allow)).toBe(true);
      expect(Array.isArray(settings.permissions.deny)).toBe(true);
    });
  });

  describe('Requirement 2: Agent Teams enablement', () => {
    it('should have env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS set to "1"', () => {
      expect(settings.env).toHaveProperty('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS');
      expect(settings.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
    });

    it('should have teammateMode set to "auto"', () => {
      expect(settings.teammateMode).toBe('auto');
    });

    it('should have env as an object type', () => {
      expect(typeof settings.env).toBe('object');
      expect(settings.env).not.toBeNull();
      expect(Array.isArray(settings.env)).toBe(false);
    });

    it('should have teammateMode as a string type', () => {
      expect(typeof settings.teammateMode).toBe('string');
    });
  });

  describe('Requirement 3: Permissions preservation', () => {
    it('should preserve all original permissions.allow entries', () => {
      const actualAllow = settings.permissions.allow;

      // Check that all expected permissions exist
      expectedAllowPermissions.forEach((permission) => {
        expect(actualAllow).toContain(permission);
      });

      // Check that no extra permissions were added
      expect(actualAllow.length).toBe(expectedAllowPermissions.length);
    });

    it('should preserve all original permissions.deny entries', () => {
      const actualDeny = settings.permissions.deny;

      // Check that all expected denials exist
      expectedDenyPermissions.forEach((permission) => {
        expect(actualDeny).toContain(permission);
      });

      // Check that no extra denials were added
      expect(actualDeny.length).toBe(expectedDenyPermissions.length);
    });

    it('should maintain permissions object structure', () => {
      expect(settings.permissions).toEqual(
        expect.objectContaining({
          allow: expect.any(Array),
          deny: expect.any(Array),
        })
      );
    });

    it('should have no duplicate entries in permissions.allow', () => {
      const actualAllow = settings.permissions.allow;
      const uniqueAllow = [...new Set(actualAllow)];
      expect(actualAllow.length).toBe(uniqueAllow.length);
    });

    it('should have no duplicate entries in permissions.deny', () => {
      const actualDeny = settings.permissions.deny;
      const uniqueDeny = [...new Set(actualDeny)];
      expect(actualDeny.length).toBe(uniqueDeny.length);
    });
  });

  describe('Integration: Complete settings validation', () => {
    it('should have all required fields with correct types and values', () => {
      // Structure validation
      expect(settings).toMatchObject({
        env: expect.any(Object),
        teammateMode: expect.any(String),
        permissions: expect.objectContaining({
          allow: expect.any(Array),
          deny: expect.any(Array),
        }),
      });

      // Agent Teams enablement
      expect(settings.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
      expect(settings.teammateMode).toBe('auto');

      // Permissions preservation
      expect(settings.permissions.allow).toHaveLength(expectedAllowPermissions.length);
      expect(settings.permissions.deny).toHaveLength(expectedDenyPermissions.length);
    });

    it('should be formatted as valid JSON with proper indentation', () => {
      // Verify it can be pretty-printed (indicates proper structure)
      expect(() => JSON.stringify(settings, null, 2)).not.toThrow();

      // Verify the file maintains consistent formatting (2-space indentation)
      const lines = settingsContent.split('\n');
      const indentedLines = lines.filter(line => line.match(/^\s{2}"/));
      expect(indentedLines.length).toBeGreaterThan(0);
    });
  });
});
