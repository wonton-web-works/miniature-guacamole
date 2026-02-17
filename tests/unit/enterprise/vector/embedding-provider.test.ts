/**
 * EmbeddingProvider Unit Tests — WS-ENT-6
 *
 * Tests for MockEmbeddingProvider, NomicEmbeddingProvider, and
 * OpenAIEmbeddingProvider. No real HTTP calls or DB connections.
 *
 * AC-ENT-6.2: EmbeddingProvider interface (nomic local, OpenAI hosted)
 * AC-ENT-6.4: Async embedding generation (non-blocking)
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — null/empty text, API key exposure, prototype pollution,
 *                      dimension mismatch, injection via text input
 *   2. BOUNDARY TESTS — zero-length strings, single char, max batch size,
 *                       whitespace-only, empty batch arrays
 *   3. GOLDEN PATH   — normal single/batch embedding generation, metadata accessors
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock global fetch before any imports that use it
// ---------------------------------------------------------------------------
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import from paths that do NOT exist yet — tests will be RED until implementation
import {
  MockEmbeddingProvider,
  NomicEmbeddingProvider,
  OpenAIEmbeddingProvider,
} from '../../../../enterprise/src/vector/embedding-provider';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNomicOkResponse(embeddings: number[][]): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ embeddings }),
  } as unknown as Response;
}

function makeOpenAIOkResponse(embeddings: number[][]): Response {
  const data = embeddings.map((e, i) => ({ index: i, embedding: e, object: 'embedding' }));
  return {
    ok: true,
    status: 200,
    json: async () => ({ data, model: 'text-embedding-3-small', usage: { total_tokens: 10 } }),
  } as unknown as Response;
}

function makeErrorResponse(status: number, body: object): Response {
  return {
    ok: false,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function makeVector(dimensions: number, value = 0.1): number[] {
  return Array(dimensions).fill(value);
}

// ===========================================================================
// MISUSE CASES
// ===========================================================================

describe('EmbeddingProvider — MISUSE CASES', () => {
  // ---- MockEmbeddingProvider misuse ----

  describe('MockEmbeddingProvider — null/undefined inputs', () => {
    let provider: MockEmbeddingProvider;
    beforeEach(() => {
      provider = new MockEmbeddingProvider();
    });

    it('Given null text, When generateEmbedding() called, Then throws or rejects', async () => {
      // AC-ENT-6.2: provider must reject null
      await expect(provider.generateEmbedding(null as any)).rejects.toThrow();
    });

    it('Given undefined text, When generateEmbedding() called, Then throws or rejects', async () => {
      await expect(provider.generateEmbedding(undefined as any)).rejects.toThrow();
    });

    it('Given null texts array, When generateEmbeddings() called, Then throws or rejects', async () => {
      await expect(provider.generateEmbeddings(null as any)).rejects.toThrow();
    });

    it('Given array containing null text, When generateEmbeddings() called, Then throws or rejects', async () => {
      await expect(provider.generateEmbeddings([null as any])).rejects.toThrow();
    });
  });

  describe('MockEmbeddingProvider — invalid dimensions config', () => {
    it('Given negative dimensions, When constructed, Then throws', () => {
      expect(() => new MockEmbeddingProvider({ dimensions: -1 })).toThrow();
    });

    it('Given zero dimensions, When constructed, Then throws', () => {
      expect(() => new MockEmbeddingProvider({ dimensions: 0 })).toThrow();
    });

    it('Given non-integer dimensions, When constructed, Then throws', () => {
      expect(() => new MockEmbeddingProvider({ dimensions: 1.5 })).toThrow();
    });
  });

  // ---- NomicEmbeddingProvider misuse ----

  describe('NomicEmbeddingProvider — connection errors', () => {
    let provider: NomicEmbeddingProvider;
    beforeEach(() => {
      mockFetch.mockReset();
      provider = new NomicEmbeddingProvider({ apiUrl: 'http://localhost:11434' });
    });

    it('Given network timeout, When generateEmbedding() called, Then rejects with descriptive error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      await expect(provider.generateEmbedding('hello')).rejects.toThrow(/ECONNREFUSED|connection|network/i);
    });

    it('Given server returns 500, When generateEmbedding() called, Then rejects', async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse(500, { error: 'Internal Server Error' }));
      await expect(provider.generateEmbedding('hello')).rejects.toThrow();
    });

    it('Given server returns 429 rate limit, When generateEmbedding() called, Then rejects with rate limit error', async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse(429, { error: 'Too Many Requests' }));
      await expect(provider.generateEmbedding('hello')).rejects.toThrow(/rate.?limit|429|too many/i);
    });

    it('Given null text, When generateEmbedding() called, Then throws without calling fetch', async () => {
      await expect(provider.generateEmbedding(null as any)).rejects.toThrow();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('Given empty apiUrl in constructor, When constructed, Then throws', () => {
      expect(() => new NomicEmbeddingProvider({ apiUrl: '' })).toThrow();
    });
  });

  // ---- OpenAIEmbeddingProvider misuse ----

  describe('OpenAIEmbeddingProvider — API key handling', () => {
    let provider: OpenAIEmbeddingProvider;
    beforeEach(() => {
      mockFetch.mockReset();
      provider = new OpenAIEmbeddingProvider({ apiKey: 'sk-test-key' });
    });

    it('Given empty API key, When constructed, Then throws', () => {
      expect(() => new OpenAIEmbeddingProvider({ apiKey: '' })).toThrow();
    });

    it('Given null API key, When constructed, Then throws', () => {
      expect(() => new OpenAIEmbeddingProvider({ apiKey: null as any })).toThrow();
    });

    it('Given 401 auth error, When generateEmbedding() called, Then rejects and error message does NOT expose the API key', async () => {
      mockFetch.mockResolvedValueOnce(
        makeErrorResponse(401, { error: { message: 'Incorrect API key provided: sk-test-key' } })
      );
      let caught: Error | null = null;
      try {
        await provider.generateEmbedding('hello');
      } catch (e: any) {
        caught = e;
      }
      expect(caught).not.toBeNull();
      // API key must NOT appear in error message
      expect(caught!.message).not.toContain('sk-test-key');
    });

    it('Given 429 quota exceeded, When generateEmbedding() called, Then rejects with quota error', async () => {
      mockFetch.mockResolvedValueOnce(
        makeErrorResponse(429, { error: { message: 'You exceeded your current quota' } })
      );
      await expect(provider.generateEmbedding('hello')).rejects.toThrow(/quota|rate.?limit|429/i);
    });

    it('Given API response with wrong dimensions, When generateEmbedding() called, Then rejects with dimension mismatch error', async () => {
      // Provider configured for 1536 dims but API returns 768
      const wrongDimVector = makeVector(768);
      mockFetch.mockResolvedValueOnce(makeOpenAIOkResponse([wrongDimVector]));
      const strictProvider = new OpenAIEmbeddingProvider({ apiKey: 'sk-test-key', dimensions: 1536 });
      await expect(strictProvider.generateEmbedding('hello')).rejects.toThrow(/dimension/i);
    });

    it('Given null text, When generateEmbedding() called, Then throws without calling fetch', async () => {
      await expect(provider.generateEmbedding(null as any)).rejects.toThrow();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('OpenAIEmbeddingProvider — injection via text input', () => {
    let provider: OpenAIEmbeddingProvider;
    beforeEach(() => {
      mockFetch.mockReset();
      provider = new OpenAIEmbeddingProvider({ apiKey: 'sk-test-key' });
    });

    it('Given SQL injection attempt in text, When generateEmbedding() called, Then text is sent as-is to embedding API (no SQL execution)', async () => {
      // The text goes to HTTP body only, never SQL. Verify fetch is called with the text in body.
      const injectionText = "'; DROP TABLE memory_entries; --";
      const vec = makeVector(1536);
      mockFetch.mockResolvedValueOnce(makeOpenAIOkResponse([vec]));
      const result = await provider.generateEmbedding(injectionText);
      expect(result).toHaveLength(1536);
      // fetch body should include the injection text as string input (not executed)
      const [[, init]] = mockFetch.mock.calls;
      const bodyParsed = JSON.parse(init.body as string);
      expect(bodyParsed.input).toBe(injectionText);
    });

    it('Given prototype pollution object-shaped text, When generateEmbedding() called, Then handled safely', async () => {
      // text must be a string, not an object
      const maliciousInput = { __proto__: { isAdmin: true } } as any;
      await expect(provider.generateEmbedding(maliciousInput)).rejects.toThrow();
    });
  });

  // ---- Dimension mismatch security ----

  describe('NomicEmbeddingProvider — dimension validation', () => {
    it('Given API returns fewer dimensions than configured, When generateEmbedding() called, Then rejects', async () => {
      mockFetch.mockReset();
      const wrongVec = makeVector(384); // wrong: provider expects 768
      mockFetch.mockResolvedValueOnce(makeNomicOkResponse([wrongVec]));
      const provider = new NomicEmbeddingProvider({ apiUrl: 'http://localhost:11434', dimensions: 768 });
      await expect(provider.generateEmbedding('test')).rejects.toThrow(/dimension/i);
    });
  });
});

// ===========================================================================
// BOUNDARY TESTS
// ===========================================================================

describe('EmbeddingProvider — BOUNDARY TESTS', () => {
  // ---- MockEmbeddingProvider boundaries ----

  describe('MockEmbeddingProvider — edge case inputs', () => {
    let provider: MockEmbeddingProvider;
    beforeEach(() => {
      provider = new MockEmbeddingProvider();
    });

    it('Given empty string, When generateEmbedding() called, Then returns vector of correct length', async () => {
      const result = await provider.generateEmbedding('');
      expect(result).toHaveLength(provider.getDimensions());
      expect(result.every((v) => typeof v === 'number')).toBe(true);
    });

    it('Given whitespace-only string, When generateEmbedding() called, Then returns vector of correct length', async () => {
      const result = await provider.generateEmbedding('   ');
      expect(result).toHaveLength(provider.getDimensions());
    });

    it('Given single character, When generateEmbedding() called, Then returns valid vector', async () => {
      const result = await provider.generateEmbedding('a');
      expect(result).toHaveLength(provider.getDimensions());
    });

    it('Given very long text (10k chars), When generateEmbedding() called, Then returns valid vector', async () => {
      const longText = 'x'.repeat(10000);
      const result = await provider.generateEmbedding(longText);
      expect(result).toHaveLength(provider.getDimensions());
    });

    it('Given same text twice, When generateEmbedding() called twice, Then returns identical vectors (deterministic)', async () => {
      const text = 'hello world';
      const r1 = await provider.generateEmbedding(text);
      const r2 = await provider.generateEmbedding(text);
      expect(r1).toEqual(r2);
    });

    it('Given different texts, When generateEmbedding() called, Then returns different vectors', async () => {
      const r1 = await provider.generateEmbedding('cat');
      const r2 = await provider.generateEmbedding('dog');
      expect(r1).not.toEqual(r2);
    });

    it('Given empty array, When generateEmbeddings() called, Then returns empty array', async () => {
      const result = await provider.generateEmbeddings([]);
      expect(result).toEqual([]);
    });

    it('Given single-element array, When generateEmbeddings() called, Then returns array of one vector', async () => {
      const result = await provider.generateEmbeddings(['hello']);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(provider.getDimensions());
    });

    it('Given custom dimensions (1536), When constructed, Then getDimensions() returns 1536', () => {
      const customProvider = new MockEmbeddingProvider({ dimensions: 1536 });
      expect(customProvider.getDimensions()).toBe(1536);
    });
  });

  // ---- NomicEmbeddingProvider boundaries ----

  describe('NomicEmbeddingProvider — batch limits and edge cases', () => {
    let provider: NomicEmbeddingProvider;
    beforeEach(() => {
      mockFetch.mockReset();
      provider = new NomicEmbeddingProvider({ apiUrl: 'http://localhost:11434' });
    });

    it('Given batch of 1 text, When generateEmbeddings() called, Then returns 1 vector', async () => {
      const vec = makeVector(768);
      mockFetch.mockResolvedValueOnce(makeNomicOkResponse([vec]));
      const result = await provider.generateEmbeddings(['test']);
      expect(result).toHaveLength(1);
    });

    it('Given batch of 100 texts, When generateEmbeddings() called, Then returns 100 vectors', async () => {
      const vecs = Array.from({ length: 100 }, (_, i) => makeVector(768, i * 0.01));
      mockFetch.mockResolvedValueOnce(makeNomicOkResponse(vecs));
      const texts = Array.from({ length: 100 }, (_, i) => `text-${i}`);
      const result = await provider.generateEmbeddings(texts);
      expect(result).toHaveLength(100);
    });

    it('Given API returns empty embeddings array, When generateEmbedding() called, Then rejects', async () => {
      mockFetch.mockResolvedValueOnce(makeNomicOkResponse([]));
      await expect(provider.generateEmbedding('hello')).rejects.toThrow();
    });

    it('Given text with special Unicode, When generateEmbedding() called, Then sends correctly', async () => {
      const vec = makeVector(768);
      mockFetch.mockResolvedValueOnce(makeNomicOkResponse([vec]));
      const result = await provider.generateEmbedding('Hello \u4e16\u754c\ud83d\ude00');
      expect(result).toHaveLength(768);
    });

    it('Given custom model name, When generateEmbedding() called, Then sends model in request body', async () => {
      const customProvider = new NomicEmbeddingProvider({
        apiUrl: 'http://localhost:11434',
        model: 'nomic-embed-text-v1',
      });
      const vec = makeVector(768);
      mockFetch.mockResolvedValueOnce(makeNomicOkResponse([vec]));
      await customProvider.generateEmbedding('test');
      const [[, init]] = mockFetch.mock.calls;
      const body = JSON.parse(init.body as string);
      expect(body.model).toBe('nomic-embed-text-v1');
    });
  });

  // ---- OpenAIEmbeddingProvider boundaries ----

  describe('OpenAIEmbeddingProvider — edge cases', () => {
    let provider: OpenAIEmbeddingProvider;
    beforeEach(() => {
      mockFetch.mockReset();
      provider = new OpenAIEmbeddingProvider({ apiKey: 'sk-test-key' });
    });

    it('Given empty texts array, When generateEmbeddings() called, Then returns empty array without HTTP call', async () => {
      const result = await provider.generateEmbeddings([]);
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('Given API response with NaN in vector, When generateEmbedding() called, Then rejects or sanitizes', async () => {
      const nanVec = [NaN, ...makeVector(1535)];
      mockFetch.mockResolvedValueOnce(makeOpenAIOkResponse([nanVec]));
      // Implementation should reject NaN embeddings as invalid
      await expect(provider.generateEmbedding('hello')).rejects.toThrow();
    });

    it('Given similarity threshold = 0.0, When configured, Then does not error', () => {
      // Just validating the provider constructor accepts no dimension issues here
      const p = new OpenAIEmbeddingProvider({ apiKey: 'sk-test-key', dimensions: 1536 });
      expect(p.getDimensions()).toBe(1536);
    });
  });
});

// ===========================================================================
// GOLDEN PATH
// ===========================================================================

describe('EmbeddingProvider — GOLDEN PATH', () => {
  // ---- MockEmbeddingProvider golden path ----

  describe('MockEmbeddingProvider — normal operations', () => {
    let provider: MockEmbeddingProvider;
    beforeEach(() => {
      provider = new MockEmbeddingProvider();
    });

    it('Given valid text, When generateEmbedding() called, Then returns float vector of default 384 dimensions', async () => {
      const result = await provider.generateEmbedding('agent memory search');
      expect(result).toHaveLength(384);
      expect(result.every((v) => typeof v === 'number' && isFinite(v))).toBe(true);
    });

    it('Given multiple texts, When generateEmbeddings() called, Then returns correct count of vectors', async () => {
      const texts = ['workstream WS-ENT-6', 'pgvector embeddings', 'semantic search'];
      const result = await provider.generateEmbeddings(texts);
      expect(result).toHaveLength(3);
      result.forEach((vec) => {
        expect(vec).toHaveLength(384);
      });
    });

    it('Given any text, When getDimensions() called, Then returns 384 (default nomic dimensions)', () => {
      expect(provider.getDimensions()).toBe(384);
    });

    it('Given any text, When getModelName() called, Then returns descriptive model name', () => {
      const name = provider.getModelName();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });

    it('Given custom dimensions, When generateEmbedding() called, Then returns vector of custom length', async () => {
      const customProvider = new MockEmbeddingProvider({ dimensions: 768 });
      const result = await customProvider.generateEmbedding('hello');
      expect(result).toHaveLength(768);
    });

    it('Given texts, When generateEmbeddings() called, Then each vector matches getDimensions()', async () => {
      const result = await provider.generateEmbeddings(['a', 'b', 'c']);
      result.forEach((vec) => expect(vec).toHaveLength(provider.getDimensions()));
    });
  });

  // ---- NomicEmbeddingProvider golden path ----

  describe('NomicEmbeddingProvider — normal operations', () => {
    let provider: NomicEmbeddingProvider;
    beforeEach(() => {
      mockFetch.mockReset();
      provider = new NomicEmbeddingProvider({ apiUrl: 'http://localhost:11434' });
    });

    it('Given valid text, When generateEmbedding() called, Then returns 768-dimensional vector', async () => {
      const vec = makeVector(768, 0.05);
      mockFetch.mockResolvedValueOnce(makeNomicOkResponse([vec]));
      const result = await provider.generateEmbedding('vector search is useful');
      expect(result).toHaveLength(768);
      expect(result).toEqual(vec);
    });

    it('Given valid texts, When generateEmbeddings() called, Then sends POST to nomic API', async () => {
      const vecs = [makeVector(768), makeVector(768, 0.2)];
      mockFetch.mockResolvedValueOnce(makeNomicOkResponse(vecs));
      await provider.generateEmbeddings(['hello', 'world']);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [[url, init]] = mockFetch.mock.calls;
      expect(url).toContain('/api/embeddings');
      expect(init.method).toBe('POST');
    });

    it('Given provider, When getDimensions() called, Then returns 768', () => {
      expect(provider.getDimensions()).toBe(768);
    });

    it('Given provider, When getModelName() called, Then returns nomic-embed-text-v1.5', () => {
      expect(provider.getModelName()).toBe('nomic-embed-text-v1.5');
    });

    it('Given valid API response, When generateEmbedding() called, Then Content-Type is application/json', async () => {
      const vec = makeVector(768);
      mockFetch.mockResolvedValueOnce(makeNomicOkResponse([vec]));
      await provider.generateEmbedding('test');
      const [[, init]] = mockFetch.mock.calls;
      expect(init.headers?.['Content-Type'] ?? init.headers?.['content-type']).toBe('application/json');
    });
  });

  // ---- OpenAIEmbeddingProvider golden path ----

  describe('OpenAIEmbeddingProvider — normal operations', () => {
    let provider: OpenAIEmbeddingProvider;
    beforeEach(() => {
      mockFetch.mockReset();
      provider = new OpenAIEmbeddingProvider({ apiKey: 'sk-test-key' });
    });

    it('Given valid text, When generateEmbedding() called, Then returns 1536-dimensional vector', async () => {
      const vec = makeVector(1536, 0.1);
      mockFetch.mockResolvedValueOnce(makeOpenAIOkResponse([vec]));
      const result = await provider.generateEmbedding('semantic similarity');
      expect(result).toHaveLength(1536);
      expect(result).toEqual(vec);
    });

    it('Given multiple texts, When generateEmbeddings() called, Then returns matching count of vectors', async () => {
      const vecs = [makeVector(1536), makeVector(1536, 0.2), makeVector(1536, 0.3)];
      mockFetch.mockResolvedValueOnce(makeOpenAIOkResponse(vecs));
      const result = await provider.generateEmbeddings(['a', 'b', 'c']);
      expect(result).toHaveLength(3);
    });

    it('Given provider, When getDimensions() called, Then returns 1536', () => {
      expect(provider.getDimensions()).toBe(1536);
    });

    it('Given provider, When getModelName() called, Then returns text-embedding-3-small', () => {
      expect(provider.getModelName()).toBe('text-embedding-3-small');
    });

    it('Given API call, When request sent, Then Authorization header uses Bearer scheme with API key', async () => {
      const vec = makeVector(1536);
      mockFetch.mockResolvedValueOnce(makeOpenAIOkResponse([vec]));
      await provider.generateEmbedding('test');
      const [[, init]] = mockFetch.mock.calls;
      const auth = init.headers?.['Authorization'] ?? init.headers?.['authorization'];
      expect(auth).toBe('Bearer sk-test-key');
    });

    it('Given custom model, When generateEmbedding() called, Then model is sent in request body', async () => {
      const customProvider = new OpenAIEmbeddingProvider({
        apiKey: 'sk-test-key',
        model: 'text-embedding-ada-002',
        dimensions: 1536,
      });
      const vec = makeVector(1536);
      mockFetch.mockResolvedValueOnce(makeOpenAIOkResponse([vec]));
      await customProvider.generateEmbedding('hello');
      const [[, init]] = mockFetch.mock.calls;
      const body = JSON.parse(init.body as string);
      expect(body.model).toBe('text-embedding-ada-002');
    });

    it('Given provider, When generateEmbedding() called, Then returns Promise (async non-blocking)', async () => {
      const vec = makeVector(1536);
      mockFetch.mockResolvedValueOnce(makeOpenAIOkResponse([vec]));
      // AC-ENT-6.4: must be a Promise
      const resultPromise = provider.generateEmbedding('async test');
      expect(resultPromise).toBeInstanceOf(Promise);
      await resultPromise;
    });
  });

  // ---- Branch coverage: batch error paths ----

  describe('NomicEmbeddingProvider — batch error branches', () => {
    let provider: NomicEmbeddingProvider;
    beforeEach(() => {
      mockFetch.mockReset();
      provider = new NomicEmbeddingProvider({ apiUrl: 'http://localhost:11434' });
    });

    it('Given server returns 500, When generateEmbeddings() called, Then rejects', async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse(500, { error: 'Internal Server Error' }));
      await expect(provider.generateEmbeddings(['hello'])).rejects.toThrow();
    });

    it('Given server returns 429, When generateEmbeddings() called, Then rejects with rate limit error', async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse(429, { error: 'Too Many Requests' }));
      await expect(provider.generateEmbeddings(['hello'])).rejects.toThrow(/rate.?limit|429/i);
    });

    it('Given API returns empty embeddings array, When generateEmbeddings() called, Then rejects', async () => {
      mockFetch.mockResolvedValueOnce(makeNomicOkResponse([]));
      await expect(provider.generateEmbeddings(['hello'])).rejects.toThrow();
    });
  });

  describe('OpenAIEmbeddingProvider — batch error branches', () => {
    let provider: OpenAIEmbeddingProvider;
    beforeEach(() => {
      mockFetch.mockReset();
      provider = new OpenAIEmbeddingProvider({ apiKey: 'sk-test-key' });
    });

    it('Given 401 auth error, When generateEmbeddings() called, Then rejects with auth error that does NOT expose API key', async () => {
      mockFetch.mockResolvedValueOnce(
        makeErrorResponse(401, { error: { message: 'Incorrect API key provided: sk-test-key' } })
      );
      let caught: Error | null = null;
      try {
        await provider.generateEmbeddings(['hello']);
      } catch (e: any) {
        caught = e;
      }
      expect(caught).not.toBeNull();
      expect(caught!.message).not.toContain('sk-test-key');
    });

    it('Given 429 quota exceeded, When generateEmbeddings() called, Then rejects with quota error', async () => {
      mockFetch.mockResolvedValueOnce(
        makeErrorResponse(429, { error: { message: 'You exceeded your current quota' } })
      );
      await expect(provider.generateEmbeddings(['hello'])).rejects.toThrow(/quota|rate.?limit|429/i);
    });

    it('Given server error with unparseable body, When generateEmbeddings() called, Then rejects with status code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => { throw new Error('not JSON'); },
        text: async () => 'Service Unavailable',
      } as unknown as Response);
      await expect(provider.generateEmbeddings(['hello'])).rejects.toThrow(/503/);
    });
  });

  describe('OpenAIEmbeddingProvider — _stripApiKey edge case', () => {
    it('Given empty error message from API, When error processed, Then handles empty message without crashing', async () => {
      mockFetch.mockReset();
      const provider = new OpenAIEmbeddingProvider({ apiKey: 'sk-test-key' });
      mockFetch.mockResolvedValueOnce(
        makeErrorResponse(500, { error: {} })
      );
      // error.message is undefined → _stripApiKey should handle it
      await expect(provider.generateEmbedding('hello')).rejects.toThrow();
    });
  });
});
