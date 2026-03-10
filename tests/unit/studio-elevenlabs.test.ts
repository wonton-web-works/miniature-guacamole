/**
 * Unit Tests for Studio ElevenLabs Module
 *
 * Tests the elevenlabs.ts module that generates narration MP3s per scene.
 * WS-STUDIO-1: YouTube production pipeline tooling
 *
 * External deps mocked: ElevenLabs HTTP client, fs (for cache checks)
 * Test order: misuse → boundary → golden path
 * @target 99% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock ElevenLabs HTTP client — no real API calls in tests
vi.mock('../../src/studio/elevenlabs-client', () => ({
  ElevenLabsClient: vi.fn().mockImplementation(() => ({
    textToSpeech: vi.fn().mockResolvedValue(Buffer.from('fake-mp3-audio-data')),
  })),
}));

// Mock crypto for deterministic hash testing
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  return {
    ...actual,
    default: actual,
    createHash: actual.createHash,
  };
});

import {
  generateNarration,
  getCacheKey,
  isCached,
  loadStudioConfig,
  getVoiceId,
} from '../../src/studio/elevenlabs';
import type { NarrationResult, StudioConfig } from '../../src/studio/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_STUDIO_CONFIG: StudioConfig = {
  voices: {
    cto: 'voice-cto-id',
    'product-owner': 'voice-po-id',
    'engineering-manager': 'voice-em-id',
    qa: 'voice-qa-id',
    'staff-engineer': 'voice-se-id',
  },
  elevenlabs: {
    apiKey: 'test-api-key-123',
    model: 'eleven_monolingual_v1',
  },
};

const VALID_AGENTS = ['cto', 'product-owner', 'engineering-manager', 'qa', 'staff-engineer'];

// ---------------------------------------------------------------------------
// SECTION 1: MISUSE CASES
// ---------------------------------------------------------------------------

describe('elevenlabs.ts — Misuse Cases', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `studio-elevenlabs-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('generateNarration() — invalid narrator_agent', () => {
    it('rejects when narrator_agent is not one of the 5 valid roles', async () => {
      await expect(
        generateNarration('Some narration', 'unknown-agent', 'scene-01', testDir, MOCK_STUDIO_CONFIG)
      ).rejects.toThrow();
    });

    it('rejects when narrator_agent is empty string', async () => {
      await expect(
        generateNarration('Some narration', '', 'scene-01', testDir, MOCK_STUDIO_CONFIG)
      ).rejects.toThrow();
    });

    it('rejects when narrator_agent is null', async () => {
      await expect(
        generateNarration('Some narration', null as any, 'scene-01', testDir, MOCK_STUDIO_CONFIG)
      ).rejects.toThrow();
    });

    it('rejects when narrator_agent is "engineer" (close but not valid)', async () => {
      await expect(
        generateNarration('Some narration', 'engineer', 'scene-01', testDir, MOCK_STUDIO_CONFIG)
      ).rejects.toThrow();
    });
  });

  describe('generateNarration() — invalid narration text', () => {
    it('rejects when narration text is empty string', async () => {
      await expect(
        generateNarration('', 'cto', 'scene-01', testDir, MOCK_STUDIO_CONFIG)
      ).rejects.toThrow();
    });

    it('rejects when narration text is null', async () => {
      await expect(
        generateNarration(null as any, 'cto', 'scene-01', testDir, MOCK_STUDIO_CONFIG)
      ).rejects.toThrow();
    });

    it('rejects when narration text is only whitespace', async () => {
      await expect(
        generateNarration('   \n\t  ', 'cto', 'scene-01', testDir, MOCK_STUDIO_CONFIG)
      ).rejects.toThrow();
    });

    it('rejects when narration text exceeds 5000 characters', async () => {
      const tooLong = 'x'.repeat(5001);
      await expect(
        generateNarration(tooLong, 'cto', 'scene-01', testDir, MOCK_STUDIO_CONFIG)
      ).rejects.toThrow();
    });
  });

  describe('generateNarration() — invalid scene_id', () => {
    it('rejects when scene_id is empty string', async () => {
      await expect(
        generateNarration('Valid narration text', 'cto', '', testDir, MOCK_STUDIO_CONFIG)
      ).rejects.toThrow();
    });

    it('rejects when scene_id is null', async () => {
      await expect(
        generateNarration('Valid narration text', 'cto', null as any, testDir, MOCK_STUDIO_CONFIG)
      ).rejects.toThrow();
    });
  });

  describe('generateNarration() — missing config', () => {
    it('rejects when studio config is null', async () => {
      await expect(
        generateNarration('Valid narration', 'cto', 'scene-01', testDir, null as any)
      ).rejects.toThrow();
    });

    it('rejects when voices config is missing the requested agent', async () => {
      const badConfig: StudioConfig = {
        ...MOCK_STUDIO_CONFIG,
        voices: {}, // no voices configured
      };
      await expect(
        generateNarration('Valid narration', 'cto', 'scene-01', testDir, badConfig)
      ).rejects.toThrow();
    });

    it('rejects when API key is empty in config', async () => {
      const badConfig: StudioConfig = {
        ...MOCK_STUDIO_CONFIG,
        elevenlabs: { ...MOCK_STUDIO_CONFIG.elevenlabs, apiKey: '' },
      };
      await expect(
        generateNarration('Valid narration', 'cto', 'scene-01', testDir, badConfig)
      ).rejects.toThrow();
    });
  });

  describe('generateNarration() — output directory problems', () => {
    it('rejects when output directory path is empty', async () => {
      await expect(
        generateNarration('Valid narration', 'cto', 'scene-01', '', MOCK_STUDIO_CONFIG)
      ).rejects.toThrow();
    });

    it('rejects when output path is a file instead of a directory', async () => {
      const filePath = path.join(testDir, 'notadir.txt');
      fs.writeFileSync(filePath, 'i am a file');
      await expect(
        generateNarration('Valid narration', 'cto', 'scene-01', filePath, MOCK_STUDIO_CONFIG)
      ).rejects.toThrow();
    });
  });

  describe('loadStudioConfig() — missing or malformed config file', () => {
    it('rejects when studio-config.yaml does not exist', async () => {
      const nonExistent = path.join(testDir, 'studio-config.yaml');
      await expect(loadStudioConfig(nonExistent)).rejects.toThrow();
    });

    it('rejects when studio-config.yaml is empty', async () => {
      const configPath = path.join(testDir, 'studio-config.yaml');
      fs.writeFileSync(configPath, '');
      await expect(loadStudioConfig(configPath)).rejects.toThrow();
    });

    it('rejects when studio-config.yaml has invalid YAML', async () => {
      const configPath = path.join(testDir, 'studio-config.yaml');
      fs.writeFileSync(configPath, '{ broken: yaml: ::\n  - invalid');
      await expect(loadStudioConfig(configPath)).rejects.toThrow();
    });

    it('rejects when voices section is missing from config', async () => {
      const configPath = path.join(testDir, 'studio-config.yaml');
      fs.writeFileSync(configPath, 'elevenlabs:\n  apiKey: "some-key"\n  model: "v1"\n');
      await expect(loadStudioConfig(configPath)).rejects.toThrow();
    });

    it('rejects when a required agent voice is missing from voices map', async () => {
      const configPath = path.join(testDir, 'studio-config.yaml');
      // Missing 'qa' and 'staff-engineer' voice IDs
      fs.writeFileSync(configPath, `
voices:
  cto: voice-cto-id
  product-owner: voice-po-id
  engineering-manager: voice-em-id
elevenlabs:
  apiKey: "some-key"
  model: "v1"
`.trim());
      await expect(loadStudioConfig(configPath)).rejects.toThrow();
    });
  });

  describe('getVoiceId() — invalid lookup', () => {
    it('throws when narrator_agent is not in voices map', () => {
      expect(() => getVoiceId('design-lead', MOCK_STUDIO_CONFIG)).toThrow();
    });

    it('throws when voices map is empty', () => {
      const emptyConfig: StudioConfig = { ...MOCK_STUDIO_CONFIG, voices: {} };
      expect(() => getVoiceId('cto', emptyConfig)).toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// SECTION 2: BOUNDARY CASES
// ---------------------------------------------------------------------------

describe('elevenlabs.ts — Boundary Cases', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `studio-elevenlabs-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('getCacheKey()', () => {
    it('returns a non-empty string for valid inputs', () => {
      const key = getCacheKey('Some narration text', 'cto');
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });

    it('returns different keys for different narration text', () => {
      const key1 = getCacheKey('Text A', 'cto');
      const key2 = getCacheKey('Text B', 'cto');
      expect(key1).not.toBe(key2);
    });

    it('returns different keys for different narrator_agents with same text', () => {
      const key1 = getCacheKey('Same text', 'cto');
      const key2 = getCacheKey('Same text', 'qa');
      expect(key1).not.toBe(key2);
    });

    it('returns the same key for identical inputs (deterministic)', () => {
      const key1 = getCacheKey('Deterministic text', 'engineering-manager');
      const key2 = getCacheKey('Deterministic text', 'engineering-manager');
      expect(key1).toBe(key2);
    });

    it('handles narration text of exactly 5000 characters', () => {
      const maxText = 'a'.repeat(5000);
      expect(() => getCacheKey(maxText, 'cto')).not.toThrow();
    });

    it('handles narration with unicode and special characters', () => {
      const unicodeText = '日本語テスト — "quoted" & <special>';
      expect(() => getCacheKey(unicodeText, 'qa')).not.toThrow();
    });
  });

  describe('isCached()', () => {
    it('returns false when cache file does not exist', () => {
      const key = 'nonexistent-cache-key';
      expect(isCached(key, testDir)).toBe(false);
    });

    it('returns true when a matching cache file exists', () => {
      const key = getCacheKey('Cached narration', 'cto');
      const cacheFilePath = path.join(testDir, `${key}.mp3`);
      fs.writeFileSync(cacheFilePath, Buffer.from('fake-audio'));
      expect(isCached(key, testDir)).toBe(true);
    });

    it('returns false when cache file exists but is empty (zero bytes)', () => {
      const key = 'empty-cache-entry';
      const cacheFilePath = path.join(testDir, `${key}.mp3`);
      fs.writeFileSync(cacheFilePath, Buffer.alloc(0));
      // An empty file is not a valid cached result
      expect(isCached(key, testDir)).toBe(false);
    });
  });

  describe('generateNarration() — caching boundary', () => {
    it('does not call the ElevenLabs API when cached MP3 exists for same text+agent', async () => {
      const { ElevenLabsClient } = await import('../../src/studio/elevenlabs-client');
      const mockTextToSpeech = vi.fn().mockResolvedValue(Buffer.from('audio'));
      (ElevenLabsClient as any).mockImplementation(() => ({ textToSpeech: mockTextToSpeech }));

      // Pre-seed the cache
      const narration = 'This is already cached.';
      const agent = 'cto';
      const key = getCacheKey(narration, agent);
      const cachedPath = path.join(testDir, `${key}.mp3`);
      fs.writeFileSync(cachedPath, Buffer.from('cached-audio-data'));

      await generateNarration(narration, agent, 'scene-cached', testDir, MOCK_STUDIO_CONFIG);

      expect(mockTextToSpeech).not.toHaveBeenCalled();
    });

    it('calls the API when same text is requested for a different agent (different cache key)', async () => {
      const { ElevenLabsClient } = await import('../../src/studio/elevenlabs-client');
      const mockTextToSpeech = vi.fn().mockResolvedValue(Buffer.from('audio'));
      (ElevenLabsClient as any).mockImplementation(() => ({ textToSpeech: mockTextToSpeech }));

      const narration = 'Same text, different agent.';
      // Cache exists for 'cto'
      const ctoKey = getCacheKey(narration, 'cto');
      fs.writeFileSync(path.join(testDir, `${ctoKey}.mp3`), Buffer.from('cto-audio'));

      // Request for 'qa' — should hit API
      await generateNarration(narration, 'qa', 'scene-01', testDir, MOCK_STUDIO_CONFIG);

      expect(mockTextToSpeech).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateNarration() — dry-run mode', () => {
    it('returns a result object without calling the API in dry-run mode', async () => {
      const { ElevenLabsClient } = await import('../../src/studio/elevenlabs-client');
      const mockTextToSpeech = vi.fn();
      (ElevenLabsClient as any).mockImplementation(() => ({ textToSpeech: mockTextToSpeech }));

      const result = await generateNarration(
        'Dry run narration',
        'qa',
        'scene-01',
        testDir,
        MOCK_STUDIO_CONFIG,
        { dryRun: true }
      );

      expect(mockTextToSpeech).not.toHaveBeenCalled();
      expect(result.dryRun).toBe(true);
    });

    it('dry-run result includes character count', async () => {
      const narration = 'Dry run narration text.';
      const result = await generateNarration(
        narration,
        'cto',
        'scene-01',
        testDir,
        MOCK_STUDIO_CONFIG,
        { dryRun: true }
      );
      expect(result.characterCount).toBe(narration.length);
    });
  });

  describe('output filename', () => {
    it('output MP3 filename follows narration-scene-{scene_id}.mp3 pattern', async () => {
      const result = await generateNarration(
        'Test narration',
        'cto',
        '01-hook',
        testDir,
        MOCK_STUDIO_CONFIG
      );
      expect(path.basename(result.mp3Path)).toBe('narration-scene-01-hook.mp3');
    });
  });
});

// ---------------------------------------------------------------------------
// SECTION 3: GOLDEN PATH
// ---------------------------------------------------------------------------

describe('elevenlabs.ts — Golden Path', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `studio-elevenlabs-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('getVoiceId()', () => {
    it('returns the correct voice ID for each of the 5 valid agents', () => {
      expect(getVoiceId('cto', MOCK_STUDIO_CONFIG)).toBe('voice-cto-id');
      expect(getVoiceId('product-owner', MOCK_STUDIO_CONFIG)).toBe('voice-po-id');
      expect(getVoiceId('engineering-manager', MOCK_STUDIO_CONFIG)).toBe('voice-em-id');
      expect(getVoiceId('qa', MOCK_STUDIO_CONFIG)).toBe('voice-qa-id');
      expect(getVoiceId('staff-engineer', MOCK_STUDIO_CONFIG)).toBe('voice-se-id');
    });
  });

  describe('loadStudioConfig()', () => {
    it('loads a valid studio-config.yaml and returns a StudioConfig object', async () => {
      const configPath = path.join(testDir, 'studio-config.yaml');
      fs.writeFileSync(configPath, `
voices:
  cto: voice-cto-id
  product-owner: voice-po-id
  engineering-manager: voice-em-id
  qa: voice-qa-id
  staff-engineer: voice-se-id
elevenlabs:
  apiKey: "real-api-key"
  model: "eleven_monolingual_v1"
`.trim());

      const config = await loadStudioConfig(configPath);

      expect(config.voices.cto).toBe('voice-cto-id');
      expect(config.voices.qa).toBe('voice-qa-id');
      expect(config.elevenlabs.apiKey).toBe('real-api-key');
    });
  });

  describe('generateNarration()', () => {
    it('calls the ElevenLabs API with the correct text and voice ID', async () => {
      const { ElevenLabsClient } = await import('../../src/studio/elevenlabs-client');
      const mockTextToSpeech = vi.fn().mockResolvedValue(Buffer.from('mp3-audio-bytes'));
      (ElevenLabsClient as any).mockImplementation(() => ({ textToSpeech: mockTextToSpeech }));

      const narration = 'What if your Claude Code had a full team?';
      await generateNarration(narration, 'engineering-manager', 'scene-01', testDir, MOCK_STUDIO_CONFIG);

      expect(mockTextToSpeech).toHaveBeenCalledWith({
        text: narration,
        voiceId: 'voice-em-id',
        modelId: MOCK_STUDIO_CONFIG.elevenlabs.model,
      });
    });

    it('writes the MP3 bytes to disk at the correct path', async () => {
      const { ElevenLabsClient } = await import('../../src/studio/elevenlabs-client');
      const audioBytes = Buffer.from('fake-mp3-audio-bytes');
      (ElevenLabsClient as any).mockImplementation(() => ({
        textToSpeech: vi.fn().mockResolvedValue(audioBytes),
      }));

      const result = await generateNarration(
        'Test narration for disk write',
        'qa',
        '02-setup',
        testDir,
        MOCK_STUDIO_CONFIG
      );

      expect(fs.existsSync(result.mp3Path)).toBe(true);
      const written = fs.readFileSync(result.mp3Path);
      expect(written).toEqual(audioBytes);
    });

    it('returns a NarrationResult with mp3Path and characterCount', async () => {
      const { ElevenLabsClient } = await import('../../src/studio/elevenlabs-client');
      (ElevenLabsClient as any).mockImplementation(() => ({
        textToSpeech: vi.fn().mockResolvedValue(Buffer.from('audio')),
      }));

      const narration = 'Here is the narration text.';
      const result: NarrationResult = await generateNarration(
        narration,
        'cto',
        'scene-03',
        testDir,
        MOCK_STUDIO_CONFIG
      );

      expect(result.mp3Path).toContain('narration-scene-scene-03.mp3');
      expect(result.characterCount).toBe(narration.length);
      expect(result.cached).toBe(false);
    });

    it('returns cached=true and skips API call on second request for same text+agent', async () => {
      const { ElevenLabsClient } = await import('../../src/studio/elevenlabs-client');
      const mockTextToSpeech = vi.fn().mockResolvedValue(Buffer.from('audio'));
      (ElevenLabsClient as any).mockImplementation(() => ({ textToSpeech: mockTextToSpeech }));

      const narration = 'Cache this narration.';
      const agent = 'staff-engineer';

      // First call — populates cache
      await generateNarration(narration, agent, 'scene-01', testDir, MOCK_STUDIO_CONFIG);
      // Second call — should use cache
      const result = await generateNarration(narration, agent, 'scene-01', testDir, MOCK_STUDIO_CONFIG);

      expect(mockTextToSpeech).toHaveBeenCalledTimes(1);
      expect(result.cached).toBe(true);
    });

    it('logs character count (result.characterCount matches narration.length)', async () => {
      const { ElevenLabsClient } = await import('../../src/studio/elevenlabs-client');
      (ElevenLabsClient as any).mockImplementation(() => ({
        textToSpeech: vi.fn().mockResolvedValue(Buffer.from('audio')),
      }));

      const narration = 'Character count logging test narration.';
      const result = await generateNarration(narration, 'qa', 'scene-char', testDir, MOCK_STUDIO_CONFIG);

      expect(result.characterCount).toBe(39);
    });
  });
});
