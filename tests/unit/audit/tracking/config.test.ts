/**
 * WS-TRACKING Phase 1: Tracking Config Module Tests
 *
 * BDD Scenarios:
 * - AC-1.3: Workstream ID loaded from .clauderc or config
 * - AC-1.4: Agent name auto-detected from script/module name
 * - TRACK-BDD-2: Workstream ID from .clauderc
 * - TRACK-BDD-3: Agent name auto-detection
 * - CTO Condition: Schema versioning with schema_version field
 *
 * Target: 100% coverage of tracking/config.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('os', () => ({
  homedir: vi.fn(),
}));

import {
  loadTrackingConfig,
  detectAgentName,
  TrackingConfig,
  TRACKING_CONFIG_DEFAULTS,
  SCHEMA_VERSION,
} from '@/audit/tracking/config';
import * as fs from 'fs';
import * as os from 'os';

describe('audit/tracking/config - loadTrackingConfig()', () => {
  let mockHomeDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHomeDir = '/home/testuser';
    vi.mocked(os.homedir).mockReturnValue(mockHomeDir);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given no config file exists (AC-1.5: backward compatibility)', () => {
    it('When loading tracking config, Then returns defaults with tracking disabled', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const config = loadTrackingConfig();

      expect(config.enabled).toBe(false);
      expect(config.workstream_id).toBeNull();
      expect(config.agent_name).toBeNull();
      expect(config.feature_name).toBeNull();
    });

    it('When loading tracking config, Then schema_version is set (CTO condition)', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const config = loadTrackingConfig();

      expect(config.schema_version).toBe('1.0');
    });

    it('When loading tracking config, Then does not throw', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => loadTrackingConfig()).not.toThrow();
    });
  });

  describe('Given .clauderc with tracking config (AC-1.3, TRACK-BDD-2)', () => {
    it('When .clauderc has workstream_id, Then uses that value', () => {
      const projectConfig = {
        tracking: {
          enabled: true,
          workstream_id: 'WS-21'
        }
      };

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        return p.toString().includes('.clauderc');
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(projectConfig));

      const config = loadTrackingConfig();

      expect(config.workstream_id).toBe('WS-21');
      expect(config.enabled).toBe(true);
    });

    it('When .clauderc has agent_name, Then uses that value', () => {
      const projectConfig = {
        tracking: {
          enabled: true,
          agent_name: 'mg-code-review'
        }
      };

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        return p.toString().includes('.clauderc');
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(projectConfig));

      const config = loadTrackingConfig();

      expect(config.agent_name).toBe('mg-code-review');
    });

    it('When .clauderc has feature_name, Then uses that value', () => {
      const projectConfig = {
        tracking: {
          enabled: true,
          feature_name: 'dark-mode'
        }
      };

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        return p.toString().includes('.clauderc');
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(projectConfig));

      const config = loadTrackingConfig();

      expect(config.feature_name).toBe('dark-mode');
    });

    it('When .clauderc has invalid workstream_id, Then logs warning and sets null', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const projectConfig = {
        tracking: {
          enabled: true,
          workstream_id: 'invalid-id'
        }
      };

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        return p.toString().includes('.clauderc');
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(projectConfig));

      const config = loadTrackingConfig();

      expect(config.workstream_id).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARNING')
      );

      consoleWarnSpy.mockRestore();
    });

    it('When .clauderc has invalid agent_name, Then logs warning and sets null', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const projectConfig = {
        tracking: {
          enabled: true,
          agent_name: 'Code-Review@2'
        }
      };

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        return p.toString().includes('.clauderc');
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(projectConfig));

      const config = loadTrackingConfig();

      expect(config.agent_name).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARNING')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Given global config with tracking (AC-1.3)', () => {
    it('When global config has tracking settings, Then uses them', () => {
      const globalConfig = {
        tracking: {
          enabled: true,
          workstream_id: 'WS-18'
        }
      };

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        return p.toString().includes('config.json');
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(globalConfig));

      const config = loadTrackingConfig();

      expect(config.workstream_id).toBe('WS-18');
    });

    it('When project config overrides global config, Then project wins', () => {
      const globalConfig = {
        tracking: {
          enabled: true,
          workstream_id: 'WS-18'
        }
      };
      const projectConfig = {
        tracking: {
          workstream_id: 'WS-21'
        }
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        if (p.toString().includes('.clauderc')) {
          return JSON.stringify(projectConfig);
        }
        return JSON.stringify(globalConfig);
      });

      const config = loadTrackingConfig();

      expect(config.workstream_id).toBe('WS-21');
    });
  });

  describe('Given malformed config file', () => {
    it('When JSON is invalid, Then returns defaults without throwing', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }');

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const config = loadTrackingConfig();

      expect(config.enabled).toBe(false);
      expect(config.workstream_id).toBeNull();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Given config without tracking section', () => {
    it('When config has no tracking key, Then returns defaults', () => {
      const config_data = {
        audit_logging: { enabled: true }
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(config_data));

      const config = loadTrackingConfig();

      expect(config.enabled).toBe(false);
      expect(config.workstream_id).toBeNull();
    });
  });
});

describe('audit/tracking/config - detectAgentName()', () => {
  describe('Given a script path (AC-1.4, TRACK-BDD-3)', () => {
    it('When script is src/agents/qa.ts, Then detects "qa"', () => {
      const agentName = detectAgentName('/path/to/src/agents/qa.ts');
      expect(agentName).toBe('qa');
    });

    it('When script is src/agents/mg-code-review.ts, Then detects "mg-code-review"', () => {
      const agentName = detectAgentName('/path/to/src/agents/mg-code-review.ts');
      expect(agentName).toBe('mg-code-review');
    });

    it('When script is src/agents/mg-design-review.js, Then detects "mg-design-review"', () => {
      const agentName = detectAgentName('/path/to/src/agents/mg-design-review.js');
      expect(agentName).toBe('mg-design-review');
    });
  });

  describe('Given no identifiable script path', () => {
    it('When path is empty, Then returns null', () => {
      const agentName = detectAgentName('');
      expect(agentName).toBeNull();
    });

    it('When path is undefined, Then returns null', () => {
      const agentName = detectAgentName(undefined);
      expect(agentName).toBeNull();
    });

    it('When path has no recognizable agent file, Then returns null', () => {
      const agentName = detectAgentName('/path/to/index.ts');
      expect(agentName).toBeNull();
    });

    it('When path has main.ts, Then returns null (generic file)', () => {
      const agentName = detectAgentName('/path/to/main.ts');
      expect(agentName).toBeNull();
    });

    it('When filename has invalid agent name pattern (uppercase), Then returns null', () => {
      const agentName = detectAgentName('/path/to/MyAgent.ts');
      expect(agentName).toBeNull();
    });

    it('When filename has special characters, Then returns null', () => {
      const agentName = detectAgentName('/path/to/agent@v2.ts');
      expect(agentName).toBeNull();
    });
  });
});

describe('audit/tracking/config - Constants', () => {
  it('SCHEMA_VERSION is "1.0" (CTO condition)', () => {
    expect(SCHEMA_VERSION).toBe('1.0');
  });

  it('TRACKING_CONFIG_DEFAULTS has expected structure', () => {
    expect(TRACKING_CONFIG_DEFAULTS).toEqual({
      enabled: false,
      schema_version: '1.0',
      workstream_id: null,
      agent_name: null,
      feature_name: null,
    });
  });
});
