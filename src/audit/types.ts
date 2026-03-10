/**
 * WS-16: Token Usage Audit Log — Type Definitions
 */

export interface AuditEntry {
  timestamp: string;
  session_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  total_cost_usd: number;
  duration_ms: number;
  models_used: string[];
}

export interface AuditConfig {
  enabled: boolean;
  log_path: string;
  max_size_mb: number;
  keep_backups: number;
}
