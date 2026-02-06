import type { ApiResponse } from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: ApiResponse<unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const json: ApiResponse<T> = await response.json();

  if (!response.ok || !json.success) {
    throw new ApiError(
      json.error || `Request failed with status ${response.status}`,
      response.status,
      json as ApiResponse<unknown>
    );
  }

  return json.data as T;
}

export function getWorkstreams(status?: string) {
  const params = status ? `?status=${encodeURIComponent(status)}` : '';
  return fetchApi<import('./types').WorkstreamSummary[]>(`/api/workstreams${params}`);
}

export function getWorkstreamById(id: string) {
  return fetchApi<import('./types').WorkstreamDetail>(`/api/workstreams/${encodeURIComponent(id)}`);
}

export function getActivities(options?: { limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  const qs = params.toString();
  return fetchApi<import('./types').Activity[]>(`/api/activities${qs ? `?${qs}` : ''}`);
}

export function getQuestions(status?: string) {
  const params = status ? `?status=${encodeURIComponent(status)}` : '';
  return fetchApi<import('./types').AgentQuestion[]>(`/api/questions${params}`);
}

export function getHealth() {
  return fetchApi<import('./types').HealthCheck>('/api/health');
}

export async function answerQuestion(
  questionId: string,
  answer: string,
  action: 'approve' | 'reject' | 'respond'
) {
  return fetchApi<{ success: boolean }>(`/api/questions/${encodeURIComponent(questionId)}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer, action }),
  });
}
