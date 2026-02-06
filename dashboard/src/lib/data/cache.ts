import { CACHE_TTL_MS } from '../constants';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheMetadata {
  cacheAge: number;
}

interface CacheResult<T> {
  data: T;
  meta: CacheMetadata;
}

export class MemoryCache {
  private store: Map<string, CacheEntry<unknown>>;
  public readonly ttl: number;

  constructor(ttlMs: number = CACHE_TTL_MS) {
    this.store = new Map();
    this.ttl = ttlMs;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.ttl;
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  getWithMeta<T>(key: string): CacheResult<T> | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.store.delete(key);
      return null;
    }

    return {
      data: entry.data,
      meta: {
        cacheAge: age,
      },
    };
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidateAll(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}
