// Concurrency limiter and rate limiter for the mg-daemon pipeline
// WS-DAEMON-14: Pipeline Observability & Safety

export interface ConcurrencyConfig {
  maxConcurrent: number;         // default 1
  delayBetweenTicketsMs: number; // default 5000
}

/**
 * Semaphore-style concurrency limiter.
 * Controls how many claude processes run simultaneously.
 */
export class ConcurrencyLimiter {
  private readonly _max: number;
  private readonly _delayMs: number;
  private _active: number = 0;
  /** Queue of resolve callbacks waiting for a free slot */
  private readonly _queue: Array<() => void> = [];

  constructor(config: ConcurrencyConfig) {
    this._max = config.maxConcurrent;
    this._delayMs = config.delayBetweenTicketsMs;
  }

  /**
   * Acquire a slot. Resolves immediately when a slot is available,
   * or waits in FIFO order until one is released.
   */
  acquire(): Promise<void> {
    if (this._active < this._max) {
      this._active++;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this._queue.push(() => {
        this._active++;
        resolve();
      });
    });
  }

  /**
   * Release a slot after work completes.
   * If callers are waiting, the first in line is unblocked immediately.
   */
  release(): void {
    if (this._active > 0) {
      this._active--;
    }

    const next = this._queue.shift();
    if (next !== undefined) {
      next();
    }
  }

  /** Current number of active slots. */
  get active(): number {
    return this._active;
  }

  /** Whether all slots are in use. */
  get full(): boolean {
    return this._active >= this._max;
  }

  /** Apply inter-ticket delay. */
  delay(): Promise<void> {
    if (this._delayMs <= 0) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => setTimeout(resolve, this._delayMs));
  }
}
