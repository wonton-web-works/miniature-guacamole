import type {
  AgentStatus,
  AgentMetrics,
  AgentResult,
  EscalationInfo,
  AgentReturn
} from './types';

export function validateAgentReturn(envelope: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Type check - must be an object
  if (typeof envelope !== 'object' || envelope === null) {
    return { valid: false, errors: ['Envelope must be an object'] };
  }

  const env = envelope as any;

  // Check required fields exist
  if (typeof env.status !== 'string') {
    errors.push('status field is required and must be a string');
  } else {
    // Validate status is one of the allowed values
    const validStatuses: AgentStatus[] = ['success', 'failure', 'partial', 'escalate'];
    if (!validStatuses.includes(env.status)) {
      errors.push(`status must be one of: ${validStatuses.join(', ')}`);
    }
  }

  if (typeof env.agent_id !== 'string' || env.agent_id === '') {
    errors.push('agent_id field is required and must be a non-empty string');
  }

  if (typeof env.timestamp !== 'string') {
    errors.push('timestamp field is required and must be a string');
  } else {
    // Validate timestamp is ISO format
    const date = new Date(env.timestamp);
    if (isNaN(date.getTime())) {
      errors.push('timestamp must be in ISO 8601 format');
    }
  }

  // Validate optional fields
  if (env.metrics !== undefined) {
    if (typeof env.metrics !== 'object' || env.metrics === null || Array.isArray(env.metrics)) {
      errors.push('metrics must be an object');
    } else {
      const metricsError = validateMetrics(env.metrics);
      if (metricsError) {
        errors.push(metricsError);
      }
    }
  }

  if (env.result !== undefined) {
    if (typeof env.result !== 'object' || env.result === null || Array.isArray(env.result)) {
      errors.push('result must be an object');
    } else {
      const resultError = validateResult(env.result);
      if (resultError) {
        errors.push(resultError);
      }
    }
  }

  // If status is escalate, escalation field must exist and be valid
  if (env.status === 'escalate') {
    if (env.escalation === undefined) {
      errors.push('escalation field is required when status is "escalate"');
    } else {
      const escalationError = validateEscalation(env.escalation);
      if (escalationError) {
        errors.push(escalationError);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateMetrics(metrics: any): string | null {
  const metricsFields = [
    'tests_passed',
    'tests_failed',
    'coverage',
    'files_changed',
    'lines_added',
    'lines_removed',
    'duration_ms'
  ];

  for (const field of metricsFields) {
    if (field in metrics) {
      if (typeof metrics[field] !== 'number' || metrics[field] < 0) {
        return `metrics.${field} must be a non-negative number`;
      }
    }
  }

  return null;
}

function validateResult(result: any): string | null {
  if (typeof result.summary !== 'string') {
    return 'result.summary is required and must be a string';
  }

  if (result.deliverables !== undefined) {
    if (!Array.isArray(result.deliverables)) {
      return 'result.deliverables must be an array of strings';
    }
    if (!result.deliverables.every((d: any) => typeof d === 'string')) {
      return 'result.deliverables must contain only strings';
    }
  }

  if (result.next_steps !== undefined) {
    if (!Array.isArray(result.next_steps)) {
      return 'result.next_steps must be an array of strings';
    }
    if (!result.next_steps.every((s: any) => typeof s === 'string')) {
      return 'result.next_steps must contain only strings';
    }
  }

  return null;
}

function validateEscalation(escalation: any): string | null {
  if (typeof escalation.reason !== 'string') {
    return 'escalation.reason is required and must be a string';
  }

  if (typeof escalation.required_from !== 'string') {
    return 'escalation.required_from is required and must be a string';
  }

  return null;
}

export function createAgentReturn(options: {
  status: AgentStatus;
  agent_id: string;
  workstream_id?: string;
  timestamp?: string;
  metrics?: AgentMetrics;
  result?: AgentResult;
  escalation?: EscalationInfo;
}): AgentReturn {
  return {
    status: options.status,
    agent_id: options.agent_id,
    workstream_id: options.workstream_id,
    timestamp: options.timestamp || new Date().toISOString(),
    metrics: options.metrics,
    result: options.result,
    escalation: options.escalation
  };
}
