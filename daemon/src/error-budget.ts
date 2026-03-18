// Error budget tracking with auto-pause for the mg-daemon pipeline
// WS-DAEMON-14: Pipeline Observability & Safety

import { existsSync, readFileSync, writeFileSync, renameSync } from 'fs';

export interface ErrorBudgetConfig {
  threshold: number; // consecutive failures before pause, default 3
}

export interface ErrorBudgetState {
  consecutiveFailures: number;
  paused: boolean;
  lastFailure?: string;  // ISO timestamp
  pausedAt?: string;     // ISO timestamp
}

/**
 * Track consecutive failures and pause when threshold exceeded.
 * State can be persisted to disk using atomic write-tmp-then-rename.
 */
export class ErrorBudget {
  private readonly _threshold: number;
  private _state: ErrorBudgetState;

  constructor(config: ErrorBudgetConfig) {
    this._threshold = config.threshold;
    this._state = { consecutiveFailures: 0, paused: false };
  }

  /**
   * Record a successful operation. Resets the consecutive failure counter.
   * Does NOT automatically unpause — resume() must be called explicitly.
   */
  recordSuccess(): void {
    this._state = {
      ...this._state,
      consecutiveFailures: 0,
      lastFailure: this._state.lastFailure,
    };
    // Note: paused stays as-is; success does not auto-resume
  }

  /**
   * Record a failure. Increments counter; pauses if threshold is exceeded.
   */
  recordFailure(error: string): void {
    const now = new Date().toISOString();
    const newCount = this._state.consecutiveFailures + 1;
    const exceedsThreshold = newCount >= this._threshold;

    this._state = {
      consecutiveFailures: newCount,
      paused: this._state.paused || exceedsThreshold,
      lastFailure: now,
      pausedAt: (this._state.paused || exceedsThreshold)
        ? (this._state.pausedAt ?? now)
        : undefined,
    };
  }

  /** Whether processing should continue. */
  get canProcess(): boolean {
    return !this._state.paused;
  }

  /**
   * Resume processing after manual intervention.
   * Clears the paused flag and resets the failure counter.
   */
  resume(): void {
    this._state = {
      consecutiveFailures: 0,
      paused: false,
      lastFailure: this._state.lastFailure,
      pausedAt: undefined,
    };
  }

  /** Get current state for dashboard/logging. */
  getState(): ErrorBudgetState {
    return { ...this._state };
  }

  /**
   * Persist state to disk using atomic write-tmp-then-rename.
   */
  save(filePath: string): void {
    const tmpPath = `${filePath}.tmp`;
    const content = JSON.stringify(this._state, null, 2);
    writeFileSync(tmpPath, content, 'utf-8');
    renameSync(tmpPath, filePath);
  }

  /**
   * Load state from disk. Returns a fresh ErrorBudget if the file is
   * missing or corrupted.
   */
  static load(filePath: string, config: ErrorBudgetConfig): ErrorBudget {
    const budget = new ErrorBudget(config);

    if (!existsSync(filePath)) {
      return budget;
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      const state = JSON.parse(content) as ErrorBudgetState;
      budget._state = state;
    } catch {
      // Corrupted file — start fresh
    }

    return budget;
  }
}
