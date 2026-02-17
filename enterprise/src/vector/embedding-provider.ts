/**
 * EmbeddingProvider — WS-ENT-6
 *
 * Providers for generating vector embeddings:
 * - MockEmbeddingProvider: deterministic, for testing
 * - NomicEmbeddingProvider: local Ollama/nomic
 * - OpenAIEmbeddingProvider: hosted OpenAI API
 *
 * AC-ENT-6.2: EmbeddingProvider interface (nomic local, OpenAI hosted)
 * AC-ENT-6.4: Async embedding generation (non-blocking)
 */

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
  getModelName(): string;
}

// ---------------------------------------------------------------------------
// MockEmbeddingProvider
// ---------------------------------------------------------------------------

export interface MockEmbeddingProviderConfig {
  dimensions?: number;
}

export class MockEmbeddingProvider implements EmbeddingProvider {
  private readonly dimensions: number;

  constructor(config: MockEmbeddingProviderConfig = {}) {
    const dims = config.dimensions ?? 384;
    if (dims <= 0 || !Number.isInteger(dims)) {
      throw new Error(`dimensions must be a positive integer, got: ${dims}`);
    }
    this.dimensions = dims;
  }

  getDimensions(): number {
    return this.dimensions;
  }

  getModelName(): string {
    return 'mock-embedding-model';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (text === null || text === undefined) {
      throw new Error('text must not be null or undefined');
    }
    if (typeof text !== 'string') {
      throw new Error('text must be a string');
    }
    return this._deterministicVector(text);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts === null || texts === undefined) {
      throw new Error('texts array must not be null or undefined');
    }
    for (const t of texts) {
      if (t === null || t === undefined) {
        throw new Error('texts array must not contain null or undefined elements');
      }
    }
    return Promise.all(texts.map((t) => this.generateEmbedding(t)));
  }

  /**
   * Deterministic vector from text: hash the text to seed, then produce
   * stable float values per dimension. Same text always produces same vector.
   * Different texts produce different vectors (with very high probability).
   */
  private _deterministicVector(text: string): number[] {
    // Simple but effective deterministic hash
    let seed = 0;
    for (let i = 0; i < text.length; i++) {
      seed = (Math.imul(31, seed) + text.charCodeAt(i)) | 0;
    }

    const vec = new Array(this.dimensions);
    let state = seed;
    for (let i = 0; i < this.dimensions; i++) {
      // LCG-style PRNG for deterministic per-dimension values
      state = (Math.imul(1664525, state) + 1013904223) | 0;
      // Normalize to [-1, 1]
      vec[i] = (state / 0x80000000);
    }
    return vec;
  }
}

// ---------------------------------------------------------------------------
// NomicEmbeddingProvider
// ---------------------------------------------------------------------------

export interface NomicEmbeddingProviderConfig {
  apiUrl: string;
  model?: string;
  dimensions?: number;
}

export class NomicEmbeddingProvider implements EmbeddingProvider {
  private readonly apiUrl: string;
  private readonly model: string;
  private readonly dimensions: number;

  constructor(config: NomicEmbeddingProviderConfig) {
    if (!config.apiUrl || config.apiUrl.trim() === '') {
      throw new Error('apiUrl must not be empty');
    }
    this.apiUrl = config.apiUrl;
    this.model = config.model ?? 'nomic-embed-text-v1.5';
    this.dimensions = config.dimensions ?? 768;
  }

  getDimensions(): number {
    return this.dimensions;
  }

  getModelName(): string {
    return this.model;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (text === null || text === undefined) {
      throw new Error('text must not be null or undefined');
    }
    if (typeof text !== 'string') {
      throw new Error('text must be a string');
    }

    const response = await fetch(`${this.apiUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: text }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(`rate limit exceeded: HTTP 429 Too Many Requests`);
      }
      throw new Error(`Nomic API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    const embeddings: number[][] = data.embeddings;

    if (!embeddings || embeddings.length === 0) {
      throw new Error('Nomic API returned empty embeddings array');
    }

    const embedding = embeddings[0];
    if (embedding.length !== this.dimensions) {
      throw new Error(
        `dimension mismatch: expected ${this.dimensions}, got ${embedding.length}`
      );
    }

    return embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    const response = await fetch(`${this.apiUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: texts }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(`rate limit exceeded: HTTP 429 Too Many Requests`);
      }
      throw new Error(`Nomic API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    const embeddings: number[][] = data.embeddings;

    if (!embeddings || embeddings.length === 0) {
      throw new Error('Nomic API returned empty embeddings array');
    }

    return embeddings;
  }
}

// ---------------------------------------------------------------------------
// OpenAIEmbeddingProvider
// ---------------------------------------------------------------------------

export interface OpenAIEmbeddingProviderConfig {
  apiKey: string;
  model?: string;
  dimensions?: number;
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly dimensions: number;

  constructor(config: OpenAIEmbeddingProviderConfig) {
    if (!config.apiKey || config.apiKey === null || config.apiKey === '') {
      throw new Error('apiKey must not be null or empty');
    }
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'text-embedding-3-small';
    this.dimensions = config.dimensions ?? 1536;
  }

  getDimensions(): number {
    return this.dimensions;
  }

  getModelName(): string {
    return this.model;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (text === null || text === undefined) {
      throw new Error('text must not be null or undefined');
    }
    if (typeof text !== 'string') {
      throw new Error('text must be a string');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, input: text }),
    });

    if (!response.ok) {
      let errorBody: any = {};
      try {
        errorBody = await response.json();
      } catch {
        // ignore parse failure
      }

      // CRITICAL: strip API key from any error message before surfacing
      let message = errorBody?.error?.message ?? `OpenAI API error: HTTP ${response.status}`;
      message = this._stripApiKey(message);

      if (response.status === 401) {
        throw new Error(`Authentication failed: invalid API key`);
      }
      if (response.status === 429) {
        throw new Error(`quota or rate limit exceeded: ${this._stripApiKey(message)}`);
      }
      throw new Error(this._stripApiKey(message));
    }

    const data = await response.json();
    const embedding: number[] = data.data[0].embedding;

    if (!embedding || embedding.some((v) => typeof v !== 'number' || isNaN(v))) {
      throw new Error('OpenAI API returned invalid embedding values (NaN detected)');
    }

    if (embedding.length !== this.dimensions) {
      throw new Error(
        `dimension mismatch: expected ${this.dimensions}, got ${embedding.length}`
      );
    }

    return embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, input: texts }),
    });

    if (!response.ok) {
      let errorBody: any = {};
      try {
        errorBody = await response.json();
      } catch {
        // ignore
      }
      let message = errorBody?.error?.message ?? `OpenAI API error: HTTP ${response.status}`;
      message = this._stripApiKey(message);

      if (response.status === 401) {
        throw new Error(`Authentication failed: invalid API key`);
      }
      if (response.status === 429) {
        throw new Error(`quota or rate limit exceeded: ${message}`);
      }
      throw new Error(message);
    }

    const data = await response.json();
    return data.data.map((item: any) => item.embedding as number[]);
  }

  /** Remove the API key from any string to prevent key leakage in errors. */
  private _stripApiKey(message: string): string {
    if (!message) return message;
    return message.split(this.apiKey).join('[REDACTED]');
  }
}
