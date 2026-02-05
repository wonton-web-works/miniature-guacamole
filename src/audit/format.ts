/**
 * WS-16: Token Usage Audit Log - Format Module
 *
 * Formats API responses into JSONL audit entries.
 * Handles missing data gracefully with null values.
 */

export interface ApiResponse {
  model: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  session_id: string;
  total_cost_usd?: number;
  duration_ms?: number;
  duration_api_ms?: number;
  models_used?: string[];
}

export interface AuditEntry {
  timestamp: string;
  session_id: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_creation_tokens: number | null;
  cache_read_tokens: number | null;
  total_cost_usd: number | null;
  duration_ms: number | null;
  duration_api_ms?: number | null;
  models_used?: string[];
  warning?: string;
}

/**
 * Formats an API response into a JSONL audit entry.
 * Returns a single-line JSON string (no newlines).
 * Adds warning field if usage data is missing.
 */
export function formatAuditEntry(response: ApiResponse): string {
  const hasMissingUsage = !response.usage;

  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    session_id: response.session_id,
    model: response.model,
    input_tokens: response.usage?.input_tokens ?? null,
    output_tokens: response.usage?.output_tokens ?? null,
    cache_creation_tokens: response.usage?.cache_creation_input_tokens ?? null,
    cache_read_tokens: response.usage?.cache_read_input_tokens ?? null,
    total_cost_usd: response.total_cost_usd ?? null,
    duration_ms: response.duration_ms ?? null,
  };

  // Add optional fields only if present
  if (response.duration_api_ms !== undefined) {
    entry.duration_api_ms = response.duration_api_ms;
  }

  if (response.models_used !== undefined) {
    entry.models_used = response.models_used;
  }

  // Add warning if usage data is missing
  if (hasMissingUsage) {
    entry.warning = 'missing_usage_data';
  }

  // Return single-line JSON (JSONL format)
  return JSON.stringify(entry);
}

/**
 * Validates that an audit entry has all required fields.
 * Returns false if validation fails (does not throw).
 */
export function validateEntry(entry: string | Record<string, any>): boolean {
  try {
    let parsed: Record<string, any>;
    let entryString: string;

    if (typeof entry === 'string') {
      parsed = JSON.parse(entry);
      entryString = entry;
    } else {
      parsed = entry;
      entryString = JSON.stringify(entry);
    }

    const requiredFields = [
      'timestamp',
      'session_id',
      'model',
      'input_tokens',
      'output_tokens',
      'cache_creation_tokens',
      'cache_read_tokens',
      'total_cost_usd',
      'duration_ms'
    ];

    for (const field of requiredFields) {
      if (!(field in parsed)) {
        return false;
      }
    }

    // Validate timestamp format (ISO 8601)
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(parsed.timestamp)) {
      return false;
    }

    // Ensure no newlines (JSONL requirement)
    if (typeof entry === 'string' && (entry.includes('\n') || entry.includes('\r'))) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}
