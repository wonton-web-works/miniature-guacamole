/**
 * Unit Tests for Studio ElevenLabs HTTP Client
 *
 * Tests the elevenlabs-client.ts module that wraps the ElevenLabs REST API.
 * WS-STUDIO-1: YouTube production pipeline tooling
 *
 * fetch is stubbed globally via vi.stubGlobal — no real HTTP calls.
 * Test order: misuse → boundary → golden path
 * @target 99% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ElevenLabsClient } from '../../src/studio/elevenlabs-client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockResponse(opts: {
  ok: boolean;
  status: number;
  statusText: string;
  body?: ArrayBuffer;
}): Response {
  return {
    ok: opts.ok,
    status: opts.status,
    statusText: opts.statusText,
    arrayBuffer: vi.fn().mockResolvedValue(opts.body ?? new ArrayBuffer(0)),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// SECTION 1: MISUSE CASES
// ---------------------------------------------------------------------------

describe('ElevenLabsClient — Misuse Cases', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('textToSpeech() — API error responses', () => {
    it('throws with statusCode when API returns 401 Unauthorized', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({ ok: false, status: 401, statusText: 'Unauthorized' }));

      const client = new ElevenLabsClient('invalid-key');
      let caughtError: any = null;
      try {
        await client.textToSpeech({ text: 'Hello', voiceId: 'voice-123' });
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError.statusCode).toBe(401);
    });

    it('throws with statusCode when API returns 429 Rate Limited', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({ ok: false, status: 429, statusText: 'Too Many Requests' }));

      const client = new ElevenLabsClient('test-key');
      let caughtError: any = null;
      try {
        await client.textToSpeech({ text: 'Hello', voiceId: 'voice-123' });
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError.statusCode).toBe(429);
    });

    it('throws with statusCode when API returns 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({ ok: false, status: 500, statusText: 'Internal Server Error' }));

      const client = new ElevenLabsClient('test-key');
      let caughtError: any = null;
      try {
        await client.textToSpeech({ text: 'Hello', voiceId: 'voice-123' });
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError.statusCode).toBe(500);
    });

    it('throws when fetch itself rejects (network failure)', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      const client = new ElevenLabsClient('test-key');
      await expect(
        client.textToSpeech({ text: 'Hello', voiceId: 'voice-123' })
      ).rejects.toThrow('ECONNREFUSED');
    });
  });
});

// ---------------------------------------------------------------------------
// SECTION 2: BOUNDARY CASES
// ---------------------------------------------------------------------------

describe('ElevenLabsClient — Boundary Cases', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('textToSpeech() — request body contents', () => {
    it('sends the correct model_id when modelId is provided', async () => {
      const audioBytes = new Uint8Array([0x49, 0x44, 0x33]).buffer;
      mockFetch.mockResolvedValue(makeMockResponse({ ok: true, status: 200, statusText: 'OK', body: audioBytes }));

      const client = new ElevenLabsClient('test-key');
      await client.textToSpeech({ text: 'Hello', voiceId: 'voice-123', modelId: 'eleven_multilingual_v2' });

      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body as string);
      expect(requestBody.model_id).toBe('eleven_multilingual_v2');
    });

    it('defaults to eleven_monolingual_v1 when modelId is not provided', async () => {
      const audioBytes = new Uint8Array([0x49, 0x44, 0x33]).buffer;
      mockFetch.mockResolvedValue(makeMockResponse({ ok: true, status: 200, statusText: 'OK', body: audioBytes }));

      const client = new ElevenLabsClient('test-key');
      await client.textToSpeech({ text: 'Hello', voiceId: 'voice-123' });

      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body as string);
      expect(requestBody.model_id).toBe('eleven_monolingual_v1');
    });

    it('sends the correct voice ID in the URL', async () => {
      const audioBytes = new Uint8Array([1, 2, 3]).buffer;
      mockFetch.mockResolvedValue(makeMockResponse({ ok: true, status: 200, statusText: 'OK', body: audioBytes }));

      const client = new ElevenLabsClient('test-key');
      await client.textToSpeech({ text: 'Hello', voiceId: 'my-voice-id-abc' });

      const requestUrl = mockFetch.mock.calls[0][0] as string;
      expect(requestUrl).toContain('my-voice-id-abc');
    });

    it('sends the API key in xi-api-key header', async () => {
      const audioBytes = new Uint8Array([1, 2, 3]).buffer;
      mockFetch.mockResolvedValue(makeMockResponse({ ok: true, status: 200, statusText: 'OK', body: audioBytes }));

      const client = new ElevenLabsClient('my-secret-api-key');
      await client.textToSpeech({ text: 'Hello', voiceId: 'voice-123' });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers['xi-api-key']).toBe('my-secret-api-key');
    });

    it('sends text in the request body', async () => {
      const audioBytes = new Uint8Array([1, 2, 3]).buffer;
      mockFetch.mockResolvedValue(makeMockResponse({ ok: true, status: 200, statusText: 'OK', body: audioBytes }));

      const client = new ElevenLabsClient('test-key');
      await client.textToSpeech({ text: 'The exact narration text here.', voiceId: 'voice-123' });

      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body as string);
      expect(requestBody.text).toBe('The exact narration text here.');
    });
  });
});

// ---------------------------------------------------------------------------
// SECTION 3: GOLDEN PATH
// ---------------------------------------------------------------------------

describe('ElevenLabsClient — Golden Path', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('textToSpeech() — successful call', () => {
    it('returns a Buffer containing the MP3 bytes on success', async () => {
      const fakeAudio = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00]).buffer;
      mockFetch.mockResolvedValue(makeMockResponse({ ok: true, status: 200, statusText: 'OK', body: fakeAudio }));

      const client = new ElevenLabsClient('test-api-key');
      const result = await client.textToSpeech({ text: 'Hello world', voiceId: 'voice-cto' });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(5);
    });

    it('calls the correct ElevenLabs endpoint URL', async () => {
      const audioBytes = new Uint8Array([1, 2, 3]).buffer;
      mockFetch.mockResolvedValue(makeMockResponse({ ok: true, status: 200, statusText: 'OK', body: audioBytes }));

      const client = new ElevenLabsClient('test-key');
      await client.textToSpeech({ text: 'Hello', voiceId: 'abc-voice-id' });

      const requestUrl = mockFetch.mock.calls[0][0] as string;
      expect(requestUrl).toBe('https://api.elevenlabs.io/v1/text-to-speech/abc-voice-id');
    });

    it('uses POST method', async () => {
      const audioBytes = new Uint8Array([1, 2, 3]).buffer;
      mockFetch.mockResolvedValue(makeMockResponse({ ok: true, status: 200, statusText: 'OK', body: audioBytes }));

      const client = new ElevenLabsClient('test-key');
      await client.textToSpeech({ text: 'Hello', voiceId: 'voice-123' });

      expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    });

    it('sends voice_settings with stability and similarity_boost', async () => {
      const audioBytes = new Uint8Array([1, 2, 3]).buffer;
      mockFetch.mockResolvedValue(makeMockResponse({ ok: true, status: 200, statusText: 'OK', body: audioBytes }));

      const client = new ElevenLabsClient('test-key');
      await client.textToSpeech({ text: 'Hello', voiceId: 'voice-123' });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(requestBody.voice_settings.stability).toBe(0.5);
      expect(requestBody.voice_settings.similarity_boost).toBe(0.75);
    });
  });
});
