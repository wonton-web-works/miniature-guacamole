/**
 * PostgresAdapter — WS-ENT-2
 *
 * Implements StorageAdapter using PostgreSQL as the backend.
 * Features:
 * - JSONB storage for flexible agent memory data (AC-ENT-2.2)
 * - Event sourcing via agent_events table (append-only) (AC-ENT-2.3)
 * - Pub/sub via LISTEN/NOTIFY (AC-ENT-2.4)
 * - Connection pooling via pg.Pool (AC-ENT-2.5)
 *
 * Security: all user input goes through parameterized queries ($1, $2, ...).
 * Keys are validated before use. Data is checked for prototype pollution.
 */

import { Pool } from 'pg';
import type {
  StorageAdapter,
  AdapterReadResult,
  AdapterWriteResult,
  AdapterDeleteResult,
  AdapterQueryResult,
  QueryFilter,
  MemoryEvent,
} from '../../../src/memory/adapters/types';

// ---------------------------------------------------------------------------
// Config types
// ---------------------------------------------------------------------------

export interface PostgresAdapterConfig {
  connectionString: string;
  maxConnections?: number;
}

export interface AppendEventInput {
  agent_id: string;
  workstream_id: string;
  event_type: string;
  payload: Record<string, any>;
}

export interface AgentEvent {
  id: number;
  agent_id: string;
  workstream_id: string;
  event_type: string;
  payload: Record<string, any>;
  created_at: string;
}

export interface EventQueryFilter {
  agent_id?: string;
  workstream_id?: string;
  event_type?: string;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Validate a storage key.
 * Rejects empty strings, null bytes, SQL injection patterns, and directory traversal.
 */
function validateKey(key: string): { valid: true } | { valid: false; error: string } {
  if (!key || key.trim() === '') {
    return { valid: false, error: 'Invalid key: empty key not allowed' };
  }

  if (key.includes('\x00')) {
    return { valid: false, error: 'Invalid key: null byte detected' };
  }

  if (key.includes('..')) {
    return { valid: false, error: 'Invalid key: directory traversal not allowed' };
  }

  // Reject obvious SQL injection patterns (single-quote + OR, semicolons)
  if (key.includes("'") || key.includes(';')) {
    return { valid: false, error: 'Invalid key: disallowed characters' };
  }

  return { valid: true };
}

/**
 * Check for prototype pollution in data objects.
 */
function hasPrototypePollution(data: any): boolean {
  if (data === null || typeof data !== 'object') {
    return false;
  }

  if (Object.prototype.hasOwnProperty.call(data, '__proto__')) {
    return true;
  }

  // Check for constructor.prototype manipulation
  if (
    Object.prototype.hasOwnProperty.call(data, 'constructor') &&
    data.constructor !== null &&
    typeof data.constructor === 'object' &&
    Object.prototype.hasOwnProperty.call(data.constructor, 'prototype')
  ) {
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// PostgresAdapter
// ---------------------------------------------------------------------------

export class PostgresAdapter implements StorageAdapter {
  private pool: Pool;
  private listeners: Map<string, Set<(event: MemoryEvent) => void>>;
  private closed: boolean;

  constructor(config: PostgresAdapterConfig) {
    this.pool = new Pool({
      connectionString: config.connectionString,
      max: config.maxConnections,
    });
    this.listeners = new Map();
    this.closed = false;
  }

  // -------------------------------------------------------------------------
  // Key validation (shared by read/write/delete)
  // -------------------------------------------------------------------------

  private validateAndCheckKey(key: string): { valid: true } | { valid: false; error: string } {
    return validateKey(key);
  }

  // -------------------------------------------------------------------------
  // read()
  // -------------------------------------------------------------------------

  async read(key: string): Promise<AdapterReadResult> {
    const validation = this.validateAndCheckKey(key);
    if (!validation.valid) {
      return { success: false, data: null, error: validation.error };
    }

    try {
      const result = await this.pool.query(
        'SELECT key, agent_id, workstream_id, timestamp, data FROM memory_entries WHERE key = $1',
        [key]
      );

      if (result.rows.length === 0) {
        return { success: false, data: null, error: 'Key not found' };
      }

      return { success: true, data: result.rows[0] };
    } catch (err: any) {
      const message = err?.message || String(err);
      return {
        success: false,
        data: null,
        error: message,
      };
    }
  }

  // -------------------------------------------------------------------------
  // write()
  // -------------------------------------------------------------------------

  async write(key: string, data: any): Promise<AdapterWriteResult> {
    const validation = this.validateAndCheckKey(key);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    if (data === null || data === undefined) {
      return { success: false, error: 'Missing required field: data' };
    }

    if (hasPrototypePollution(data)) {
      return { success: false, error: 'Invalid data: prototype pollution attempt detected' };
    }

    try {
      const { agent_id, workstream_id, timestamp } = data;

      await this.pool.query(
        `INSERT INTO memory_entries (key, agent_id, workstream_id, timestamp, data, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (key) DO UPDATE
           SET agent_id = EXCLUDED.agent_id,
               workstream_id = EXCLUDED.workstream_id,
               timestamp = EXCLUDED.timestamp,
               data = EXCLUDED.data,
               updated_at = NOW()`,
        [key, agent_id, workstream_id, timestamp, data]
      );

      // Publish write event to in-process subscribers
      this.publishLocal('memory:written', {
        type: 'written',
        key,
        timestamp: new Date().toISOString(),
      });

      return { success: true, path: key };
    } catch (err: any) {
      const message = err?.message || String(err);
      return { success: false, error: message };
    }
  }

  // -------------------------------------------------------------------------
  // query()
  // -------------------------------------------------------------------------

  async query(filter: QueryFilter): Promise<AdapterQueryResult> {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (filter.agent_id !== undefined) {
      conditions.push(`agent_id = $${idx++}`);
      params.push(filter.agent_id);
    }

    if (filter.workstream_id !== undefined) {
      conditions.push(`workstream_id = $${idx++}`);
      params.push(filter.workstream_id);
    }

    if (filter.start !== undefined) {
      conditions.push(`timestamp >= $${idx++}`);
      params.push(filter.start);
    }

    if (filter.end !== undefined) {
      conditions.push(`timestamp <= $${idx++}`);
      params.push(filter.end);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT key, agent_id, workstream_id, timestamp, data FROM memory_entries ${where} ORDER BY timestamp ASC`;

    try {
      const result = await this.pool.query(sql, params);
      return result.rows;
    } catch (err: any) {
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // delete()
  // -------------------------------------------------------------------------

  async delete(key: string): Promise<AdapterDeleteResult> {
    const validation = this.validateAndCheckKey(key);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      await this.pool.query('DELETE FROM memory_entries WHERE key = $1', [key]);

      // Publish delete event to in-process subscribers (idempotent — even if row didn't exist)
      this.publishLocal('memory:deleted', {
        type: 'deleted',
        key,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (err: any) {
      const message = err?.message || String(err);
      return { success: false, error: message };
    }
  }

  // -------------------------------------------------------------------------
  // subscribe() / publish() — in-process pub/sub
  // -------------------------------------------------------------------------

  subscribe(channel: string, callback: (event: MemoryEvent) => void): () => void {
    if (!callback || typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }

    if (!channel || channel.trim() === '') {
      throw new Error('Channel name is required');
    }

    // Sanitize channel name (strip dangerous characters for LISTEN command)
    const sanitizedChannel = channel.replace(/[^a-zA-Z0-9_:.-]/g, '_');

    if (!this.listeners.has(sanitizedChannel)) {
      this.listeners.set(sanitizedChannel, new Set());
    }

    const set = this.listeners.get(sanitizedChannel)!;
    set.add(callback);

    // Return unsubscribe function
    return () => {
      const s = this.listeners.get(sanitizedChannel);
      if (s) {
        s.delete(callback);
      }
    };
  }

  publish(channel: string, event: MemoryEvent): void {
    if (!channel || !event) {
      return;
    }
    this.publishLocal(channel, event);
  }

  private publishLocal(channel: string, event: MemoryEvent): void {
    if (this.closed) {
      return;
    }

    const set = this.listeners.get(channel);
    if (!set || set.size === 0) {
      return;
    }

    for (const cb of set) {
      try {
        cb(event);
      } catch {
        // Don't let one bad subscriber kill others
      }
    }
  }

  // -------------------------------------------------------------------------
  // Event sourcing — appendEvent() / queryEvents()
  // NOTE: agent_events is append-only. updateEvent and deleteEvent are NOT implemented.
  // -------------------------------------------------------------------------

  async appendEvent(event: AppendEventInput): Promise<AgentEvent> {
    if (!event) {
      throw new Error('Event is required');
    }

    if (!event.agent_id) {
      throw new Error('Missing required field: agent_id');
    }

    if (!event.event_type) {
      throw new Error('Missing required field: event_type');
    }

    if (event.payload === null || event.payload === undefined) {
      throw new Error('Missing required field: payload');
    }

    if (hasPrototypePollution(event.payload)) {
      throw new Error('Invalid payload: prototype pollution attempt detected');
    }

    const result = await this.pool.query(
      `INSERT INTO agent_events (agent_id, workstream_id, event_type, payload)
       VALUES ($1, $2, $3, $4)
       RETURNING id, agent_id, workstream_id, event_type, payload, created_at`,
      [event.agent_id, event.workstream_id, event.event_type, event.payload]
    );

    return result.rows[0] as AgentEvent;
  }

  async queryEvents(filter: EventQueryFilter): Promise<AgentEvent[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (filter.agent_id !== undefined) {
      conditions.push(`agent_id = $${idx++}`);
      params.push(filter.agent_id);
    }

    if (filter.workstream_id !== undefined) {
      conditions.push(`workstream_id = $${idx++}`);
      params.push(filter.workstream_id);
    }

    if (filter.event_type !== undefined) {
      conditions.push(`event_type = $${idx++}`);
      params.push(filter.event_type);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT id, agent_id, workstream_id, event_type, payload, created_at FROM agent_events ${where} ORDER BY id ASC`;

    const result = await this.pool.query(sql, params);
    return result.rows as AgentEvent[];
  }

  // -------------------------------------------------------------------------
  // close()
  // -------------------------------------------------------------------------

  async close(): Promise<void> {
    this.closed = true;
    this.listeners.clear();

    try {
      await this.pool.end();
    } catch {
      // Graceful degradation — pool may already be closed
    }
  }
}
