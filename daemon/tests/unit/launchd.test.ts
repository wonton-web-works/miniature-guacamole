import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { execSync, spawnSync } from 'child_process';
import { homedir } from 'os';

import { join } from 'path';

import {
  generatePlist,
  installService,
  uninstallService,
  getServiceStatus,
} from '../../src/launchd';
import type { LaunchdConfig } from '../../src/launchd';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: vi.fn(),
  spawnSync: vi.fn(),
}));

vi.mock('os', () => ({
  homedir: vi.fn(),
}));

const mockConfig: LaunchdConfig = {
  label: 'com.mg-daemon.my-project',
  projectPath: '/Users/testuser/projects/my-project',
  daemonPath: '/Users/testuser/projects/my-project/daemon/dist/cli.js',
  nodePath: '/usr/local/bin/node',
};

describe('launchd module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(homedir).mockReturnValue('/Users/testuser');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generatePlist()', () => {
    it('GIVEN valid config WHEN generatePlist() called THEN returns XML string', () => {
      const result = generatePlist(mockConfig);
      expect(typeof result).toBe('string');
      expect(result).toContain('<?xml');
      expect(result).toContain('plist');
    });

    it('GIVEN valid config WHEN generatePlist() called THEN includes the label', () => {
      const result = generatePlist(mockConfig);
      expect(result).toContain('com.mg-daemon.my-project');
    });

    it('GIVEN valid config WHEN generatePlist() called THEN RunAtLoad is true', () => {
      const result = generatePlist(mockConfig);
      expect(result).toContain('<key>RunAtLoad</key>');
      expect(result).toContain('<true/>');
    });

    it('GIVEN valid config WHEN generatePlist() called THEN KeepAlive is true', () => {
      const result = generatePlist(mockConfig);
      expect(result).toContain('<key>KeepAlive</key>');
    });

    it('GIVEN valid config WHEN generatePlist() called THEN WorkingDirectory is projectPath', () => {
      const result = generatePlist(mockConfig);
      expect(result).toContain('<key>WorkingDirectory</key>');
      expect(result).toContain(mockConfig.projectPath);
    });

    it('GIVEN valid config WHEN generatePlist() called THEN StandardOutPath points to daemon.log', () => {
      const result = generatePlist(mockConfig);
      expect(result).toContain('<key>StandardOutPath</key>');
      expect(result).toContain('daemon.log');
      expect(result).toContain('.mg-daemon');
    });

    it('GIVEN valid config WHEN generatePlist() called THEN StandardErrorPath points to daemon.err', () => {
      const result = generatePlist(mockConfig);
      expect(result).toContain('<key>StandardErrorPath</key>');
      expect(result).toContain('daemon.err');
    });

    it('GIVEN valid config WHEN generatePlist() called THEN ProgramArguments includes node, daemonPath, start, --foreground', () => {
      const result = generatePlist(mockConfig);
      expect(result).toContain('<key>ProgramArguments</key>');
      expect(result).toContain(mockConfig.nodePath);
      expect(result).toContain(mockConfig.daemonPath);
      expect(result).toContain('start');
      expect(result).toContain('--foreground');
    });

    it('GIVEN valid config WHEN generatePlist() called THEN plist is valid XML structure', () => {
      const result = generatePlist(mockConfig);
      expect(result).toContain('<!DOCTYPE plist');
      expect(result).toContain('<plist version="1.0">');
      expect(result).toContain('</plist>');
      expect(result).toContain('<dict>');
      expect(result).toContain('</dict>');
    });

    // P0-1: UserName support
    it('GIVEN config with username WHEN generatePlist() called THEN includes UserName key', () => {
      const configWithUser: LaunchdConfig = { ...mockConfig, username: 'mg-daemon' };
      const result = generatePlist(configWithUser);
      expect(result).toContain('<key>UserName</key>');
      expect(result).toContain('<string>mg-daemon</string>');
    });

    it('GIVEN config without username WHEN generatePlist() called THEN omits UserName key', () => {
      const result = generatePlist(mockConfig);
      expect(result).not.toContain('<key>UserName</key>');
    });

    // P0-1: XML escaping
    it('GIVEN label with XML special chars WHEN generatePlist() called THEN label is XML-escaped', () => {
      const configWithSpecial: LaunchdConfig = {
        ...mockConfig,
        label: 'com.mg-daemon.a&b',
      };
      const result = generatePlist(configWithSpecial);
      expect(result).toContain('a&amp;b');
      expect(result).not.toContain('a&b<');
    });

    it('GIVEN projectPath with < and > WHEN generatePlist() called THEN path is XML-escaped', () => {
      const configWithSpecial: LaunchdConfig = {
        ...mockConfig,
        projectPath: '/path/to/<project>',
      };
      const result = generatePlist(configWithSpecial);
      expect(result).toContain('&lt;project&gt;');
    });

    it('GIVEN username with & WHEN generatePlist() called THEN username is XML-escaped', () => {
      const configWithSpecial: LaunchdConfig = {
        ...mockConfig,
        username: 'mg&daemon',
      };
      const result = generatePlist(configWithSpecial);
      expect(result).toContain('mg&amp;daemon');
    });

    it('GIVEN nodePath with " WHEN generatePlist() called THEN nodePath is XML-escaped', () => {
      const configWithSpecial: LaunchdConfig = {
        ...mockConfig,
        nodePath: '/usr/local/bin/node"special',
      };
      const result = generatePlist(configWithSpecial);
      expect(result).toContain('node&quot;special');
    });
  });

  describe('installService()', () => {
    it('GIVEN valid config WHEN installService() called THEN writes plist to ~/Library/LaunchAgents/', () => {
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(execSync).mockReturnValue(Buffer.from(''));

      installService(mockConfig);

      expect(writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const filePath = writeCall[0] as string;
      expect(filePath).toContain('Library/LaunchAgents');
      expect(filePath).toContain('com.mg-daemon.my-project.plist');
    });

    it('GIVEN valid config WHEN installService() called THEN plist content is written', () => {
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(execSync).mockReturnValue(Buffer.from(''));

      installService(mockConfig);

      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const content = writeCall[1] as string;
      expect(content).toContain('com.mg-daemon.my-project');
      expect(content).toContain('<?xml');
    });

    it('GIVEN valid config WHEN installService() called THEN runs launchctl load', () => {
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(execSync).mockReturnValue(Buffer.from(''));

      installService(mockConfig);

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('launchctl load'),
        expect.any(Object)
      );
    });

    it('GIVEN valid config WHEN installService() called THEN launchctl load targets the correct plist', () => {
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(execSync).mockReturnValue(Buffer.from(''));

      installService(mockConfig);

      const execCall = vi.mocked(execSync).mock.calls[0];
      const cmd = execCall[0] as string;
      expect(cmd).toContain('com.mg-daemon.my-project.plist');
    });

    it('GIVEN execSync throws WHEN installService() called THEN error propagates', () => {
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('launchctl failed');
      });

      expect(() => installService(mockConfig)).toThrow('launchctl failed');
    });
  });

  describe('uninstallService()', () => {
    const label = 'com.mg-daemon.my-project';
    const expectedPlistPath = join(
      '/Users/testuser',
      'Library',
      'LaunchAgents',
      `${label}.plist`
    );

    it('GIVEN installed service WHEN uninstallService() called THEN runs launchctl unload', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(execSync).mockReturnValue(Buffer.from(''));
      vi.mocked(unlinkSync).mockImplementation(() => {});

      uninstallService(label);

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('launchctl unload'),
        expect.any(Object)
      );
    });

    it('GIVEN installed service WHEN uninstallService() called THEN launchctl unload targets the correct plist', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(execSync).mockReturnValue(Buffer.from(''));
      vi.mocked(unlinkSync).mockImplementation(() => {});

      uninstallService(label);

      const execCall = vi.mocked(execSync).mock.calls[0];
      const cmd = execCall[0] as string;
      expect(cmd).toContain(`${label}.plist`);
    });

    it('GIVEN installed service WHEN uninstallService() called THEN deletes plist file', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(execSync).mockReturnValue(Buffer.from(''));
      vi.mocked(unlinkSync).mockImplementation(() => {});

      uninstallService(label);

      expect(unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining(`${label}.plist`)
      );
    });

    it('GIVEN plist file does not exist WHEN uninstallService() called THEN does not call unlinkSync', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(execSync).mockReturnValue(Buffer.from(''));
      vi.mocked(unlinkSync).mockImplementation(() => {});

      uninstallService(label);

      expect(unlinkSync).not.toHaveBeenCalled();
    });

    it('GIVEN launchctl unload fails WHEN uninstallService() called THEN still attempts file deletion', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('launchctl unload failed');
      });
      vi.mocked(unlinkSync).mockImplementation(() => {});

      // Should not throw, gracefully handles launchctl failure
      expect(() => uninstallService(label)).not.toThrow();
      expect(unlinkSync).toHaveBeenCalled();
    });
  });

  describe('getServiceStatus()', () => {
    const label = 'com.mg-daemon.my-project';

    it('GIVEN service loaded and running WHEN getServiceStatus() called THEN returns loaded: true, running: true', () => {
      // launchctl list output format: PID  Status  Label
      vi.mocked(spawnSync).mockReturnValue({
        status: 0,
        stdout: '12345\t0\tcom.mg-daemon.my-project\n',
        stderr: '',
      } as any);

      const result = getServiceStatus(label);

      expect(result.loaded).toBe(true);
      expect(result.running).toBe(true);
    });

    it('GIVEN service loaded and running WHEN getServiceStatus() called THEN returns correct PID', () => {
      vi.mocked(spawnSync).mockReturnValue({
        status: 0,
        stdout: '12345\t0\tcom.mg-daemon.my-project\n',
        stderr: '',
      } as any);

      const result = getServiceStatus(label);

      expect(result.pid).toBe(12345);
    });

    it('GIVEN service loaded but not running WHEN getServiceStatus() called THEN returns loaded: true, running: false', () => {
      // When not running, PID column is "-"
      vi.mocked(spawnSync).mockReturnValue({
        status: 0,
        stdout: '-\t0\tcom.mg-daemon.my-project\n',
        stderr: '',
      } as any);

      const result = getServiceStatus(label);

      expect(result.loaded).toBe(true);
      expect(result.running).toBe(false);
      expect(result.pid).toBeUndefined();
    });

    it('GIVEN service not loaded WHEN getServiceStatus() called THEN returns loaded: false, running: false', () => {
      // Label not found in launchctl list output
      vi.mocked(spawnSync).mockReturnValue({
        status: 0,
        stdout: '99\t0\tcom.other-daemon.other\n',
        stderr: '',
      } as any);

      const result = getServiceStatus(label);

      expect(result.loaded).toBe(false);
      expect(result.running).toBe(false);
      expect(result.pid).toBeUndefined();
    });

    it('GIVEN spawnSync returns non-zero WHEN getServiceStatus() called THEN returns loaded: false', () => {
      vi.mocked(spawnSync).mockReturnValue({
        status: 1,
        stdout: '',
        stderr: 'launchctl failed',
      } as any);

      const result = getServiceStatus(label);

      expect(result.loaded).toBe(false);
      expect(result.running).toBe(false);
    });

    it('GIVEN spawnSync returns empty output WHEN getServiceStatus() called THEN returns loaded: false', () => {
      vi.mocked(spawnSync).mockReturnValue({
        status: 0,
        stdout: '',
        stderr: '',
      } as any);

      const result = getServiceStatus(label);

      expect(result.loaded).toBe(false);
      expect(result.running).toBe(false);
    });

    // Lines 163-164: PID column is not "-" but is non-numeric (isNaN check)
    it('GIVEN service line has non-numeric non-dash PID WHEN getServiceStatus() called THEN returns loaded: true, running: false', () => {
      vi.mocked(spawnSync).mockReturnValue({
        status: 0,
        stdout: 'notanumber\t0\tcom.mg-daemon.my-project\n',
        stderr: '',
      } as any);

      const result = getServiceStatus(label);

      expect(result.loaded).toBe(true);
      expect(result.running).toBe(false);
      expect(result.pid).toBeUndefined();
    });

    // Lines 168-169: spawnSync throws (catch block)
    it('GIVEN spawnSync throws an error WHEN getServiceStatus() called THEN returns loaded: false, running: false', () => {
      vi.mocked(spawnSync).mockImplementation(() => {
        throw new Error('spawnSync failed');
      });

      const result = getServiceStatus(label);

      expect(result.loaded).toBe(false);
      expect(result.running).toBe(false);
    });
  });

  describe('generatePlist() with extraPath', () => {
    // Line 52: extraPath branch for PATH value
    it('GIVEN config with extraPath WHEN generatePlist() called THEN PATH includes extraPath prefix', () => {
      const configWithExtraPath: LaunchdConfig = {
        ...mockConfig,
        extraPath: '/opt/homebrew/opt/volta/bin',
      };

      const result = generatePlist(configWithExtraPath);

      expect(result).toContain('/opt/homebrew/opt/volta/bin:/usr/local/bin:/usr/bin:/bin');
    });

    it('GIVEN config without extraPath WHEN generatePlist() called THEN PATH uses default Homebrew prefix', () => {
      const result = generatePlist(mockConfig);

      expect(result).toContain('/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin');
    });
  });
});
