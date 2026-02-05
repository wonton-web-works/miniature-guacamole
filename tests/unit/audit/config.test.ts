/**
 * WS-16: Token Usage Audit Log - Config Module Tests
 *
 * BDD Scenarios:
 * - US-2: Standard log location
 * - US-4: Opt-in configuration
 * - Config validation and defaults
 *
 * Target: 100% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';

// Mock fs and os modules at the top level
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('os', () => ({
  homedir: vi.fn(),
}));

import { loadAuditConfig, validateAuditConfig, resolveLogPath } from '@/audit/config';
import * as fs from 'fs';
import * as os from 'os';

describe('audit/config - loadAuditConfig()', () => {
  let mockHomeDir: string;
  let mockConfigPath: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHomeDir = '/home/testuser';
    vi.mocked(os.homedir).mockReturnValue(mockHomeDir);
    mockConfigPath = path.join(mockHomeDir, '.claude', 'config.json');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given no config file exists (US-4: Default disabled)', () => {
    it('When loading config, Then returns defaults with enabled=false', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const config = loadAuditConfig();

      expect(config.enabled).toBe(false);
      expect(config.log_path).toBe('~/.claude/audit.log');
      expect(config.max_size_mb).toBe(10);
      expect(config.keep_backups).toBe(1);
    });

    it('When loading config, Then does not throw error', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => loadAuditConfig()).not.toThrow();
    });
  });

  describe('Given config file with audit_logging enabled (US-4: Explicitly enabled)', () => {
    it('When loading config, Then returns enabled=true', () => {
      const mockConfig = {
        audit_logging: {
          enabled: true
        }
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const config = loadAuditConfig();

      expect(config.enabled).toBe(true);
    });

    it('When loading config with custom path, Then uses custom path', () => {
      const mockConfig = {
        audit_logging: {
          enabled: true,
          log_path: '~/custom/path/audit.log'
        }
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const config = loadAuditConfig();

      expect(config.log_path).toBe('~/custom/path/audit.log');
    });

    it('When loading config with custom max_size_mb, Then uses custom size', () => {
      const mockConfig = {
        audit_logging: {
          enabled: true,
          max_size_mb: 5
        }
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const config = loadAuditConfig();

      expect(config.max_size_mb).toBe(5);
    });
  });

  describe('Given config file with audit_logging disabled (US-4: Explicitly disabled)', () => {
    it('When loading config, Then returns enabled=false', () => {
      const mockConfig = {
        audit_logging: {
          enabled: false
        }
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const config = loadAuditConfig();

      expect(config.enabled).toBe(false);
    });
  });

  describe('Given config file without audit_logging section', () => {
    it('When loading config, Then returns defaults with enabled=false', () => {
      const mockConfig = {
        other_setting: 'value'
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const config = loadAuditConfig();

      expect(config.enabled).toBe(false);
      expect(config.log_path).toBe('~/.claude/audit.log');
      expect(config.max_size_mb).toBe(10);
    });
  });

  describe('Given malformed JSON config file', () => {
    it('When loading config, Then logs error and returns defaults', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }');

      const config = loadAuditConfig();

      expect(config.enabled).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Cannot parse config.json')
      );

      consoleErrorSpy.mockRestore();
    });

    it('When loading config with malformed JSON, Then does not throw', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }');

      expect(() => loadAuditConfig()).not.toThrow();
    });
  });

  describe('Given project-level .clauderc override (US-4: Project-level override)', () => {
    it('When project config has enabled=true, Then overrides global config', () => {
      const globalConfig = {
        audit_logging: {
          enabled: false
        }
      };

      const projectConfig = {
        audit_logging: {
          enabled: true
        }
      };

      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return true; // Both configs exist
      });

      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (path.toString().includes('.clauderc')) {
          return JSON.stringify(projectConfig);
        }
        return JSON.stringify(globalConfig);
      });

      const config = loadAuditConfig();

      expect(config.enabled).toBe(true);
    });

    it('When project config has custom settings, Then merges with global config', () => {
      const globalConfig = {
        audit_logging: {
          enabled: true,
          max_size_mb: 10
        }
      };

      const projectConfig = {
        audit_logging: {
          max_size_mb: 5
        }
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (path.toString().includes('.clauderc')) {
          return JSON.stringify(projectConfig);
        }
        return JSON.stringify(globalConfig);
      });

      const config = loadAuditConfig();

      expect(config.enabled).toBe(true);
      expect(config.max_size_mb).toBe(5);
    });
  });
});

describe('audit/config - validateAuditConfig()', () => {
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Given valid config values', () => {
    it('When validating, Then returns config unchanged', () => {
      const config = {
        enabled: true,
        log_path: '~/.claude/audit.log',
        max_size_mb: 10,
        keep_backups: 1
      };

      const validated = validateAuditConfig(config);

      expect(validated).toEqual(config);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('When validating with custom max_size_mb, Then accepts value', () => {
      const config = {
        enabled: true,
        log_path: '~/.claude/audit.log',
        max_size_mb: 50,
        keep_backups: 1
      };

      const validated = validateAuditConfig(config);

      expect(validated.max_size_mb).toBe(50);
    });
  });

  describe('Given invalid max_size_mb (US-4: Invalid config handling)', () => {
    it('When max_size_mb is string, Then uses default and warns', () => {
      const config = {
        enabled: true,
        log_path: '~/.claude/audit.log',
        max_size_mb: 'invalid-string' as any,
        keep_backups: 1
      };

      const validated = validateAuditConfig(config);

      expect(validated.max_size_mb).toBe(10);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: Invalid max_size_mb')
      );
    });

    it('When max_size_mb is negative, Then uses default and warns', () => {
      const config = {
        enabled: true,
        log_path: '~/.claude/audit.log',
        max_size_mb: -5,
        keep_backups: 1
      };

      const validated = validateAuditConfig(config);

      expect(validated.max_size_mb).toBe(10);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: Invalid max_size_mb')
      );
    });

    it('When max_size_mb is zero, Then uses default and warns', () => {
      const config = {
        enabled: true,
        log_path: '~/.claude/audit.log',
        max_size_mb: 0,
        keep_backups: 1
      };

      const validated = validateAuditConfig(config);

      expect(validated.max_size_mb).toBe(10);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('When max_size_mb exceeds 1000, Then caps at 1000 and warns', () => {
      const config = {
        enabled: true,
        log_path: '~/.claude/audit.log',
        max_size_mb: 5000,
        keep_backups: 1
      };

      const validated = validateAuditConfig(config);

      expect(validated.max_size_mb).toBe(1000);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARNING')
      );
    });
  });

  describe('Given missing fields', () => {
    it('When log_path missing, Then applies default', () => {
      const config = {
        enabled: true,
        max_size_mb: 10,
        keep_backups: 1
      } as any;

      const validated = validateAuditConfig(config);

      expect(validated.log_path).toBe('~/.claude/audit.log');
    });

    it('When max_size_mb missing, Then applies default', () => {
      const config = {
        enabled: true,
        log_path: '~/.claude/audit.log',
        keep_backups: 1
      } as any;

      const validated = validateAuditConfig(config);

      expect(validated.max_size_mb).toBe(10);
    });

    it('When keep_backups missing, Then applies default', () => {
      const config = {
        enabled: true,
        log_path: '~/.claude/audit.log',
        max_size_mb: 10
      } as any;

      const validated = validateAuditConfig(config);

      expect(validated.keep_backups).toBe(1);
    });
  });

  describe('Given invalid keep_backups', () => {
    it('When keep_backups is not 1, Then uses default and warns (MVP limitation)', () => {
      const config = {
        enabled: true,
        log_path: '~/.claude/audit.log',
        max_size_mb: 10,
        keep_backups: 5
      };

      const validated = validateAuditConfig(config);

      expect(validated.keep_backups).toBe(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARNING')
      );
    });
  });
});

describe('audit/config - resolveLogPath()', () => {
  let mockHomeDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHomeDir = '/home/testuser';
    vi.mocked(os.homedir).mockReturnValue(mockHomeDir);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given path with tilde (US-2: Default log location)', () => {
    it('When resolving ~/.claude/audit.log, Then expands to home directory', () => {
      const resolved = resolveLogPath('~/.claude/audit.log');

      expect(resolved).toBe('/home/testuser/.claude/audit.log');
    });

    it('When resolving ~/custom/path/audit.log, Then expands to home directory', () => {
      const resolved = resolveLogPath('~/custom/path/audit.log');

      expect(resolved).toBe('/home/testuser/custom/path/audit.log');
    });
  });

  describe('Given absolute path', () => {
    it('When resolving /var/log/audit.log, Then returns unchanged', () => {
      const resolved = resolveLogPath('/var/log/audit.log');

      expect(resolved).toBe('/var/log/audit.log');
    });
  });

  describe('Given relative path', () => {
    it('When resolving relative path, Then treats as relative to ~/.claude/', () => {
      const resolved = resolveLogPath('custom/audit.log');

      expect(resolved).toBe('/home/testuser/.claude/custom/audit.log');
    });

    it('When resolving ./audit.log, Then treats as relative to ~/.claude/', () => {
      const resolved = resolveLogPath('./audit.log');

      expect(resolved).toBe('/home/testuser/.claude/audit.log');
    });
  });
});
