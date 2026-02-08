import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWorkstreamCounts } from '@/hooks/use-workstream-counts';
import type { WorkstreamSummary } from '@/lib/types';

const makeWs = (status: string): WorkstreamSummary => ({
  workstream_id: `ws-${status}-${Math.random()}`,
  name: `WS ${status}`,
  status: status as WorkstreamSummary['status'],
  phase: 'planning',
  agent_id: 'agent',
  timestamp: new Date().toISOString(),
  created_at: '2025-01-01',
});

describe('useWorkstreamCounts', () => {
  it('returns zero counts for empty array', () => {
    const { result } = renderHook(() => useWorkstreamCounts([]));
    expect(result.current.total).toBe(0);
    expect(result.current.in_progress).toBe(0);
    expect(result.current.blocked).toBe(0);
  });

  it('counts workstreams by status', () => {
    const workstreams = [
      makeWs('in_progress'),
      makeWs('in_progress'),
      makeWs('blocked'),
      makeWs('complete'),
      makeWs('planning'),
    ];

    const { result } = renderHook(() => useWorkstreamCounts(workstreams));
    expect(result.current.total).toBe(5);
    expect(result.current.in_progress).toBe(2);
    expect(result.current.blocked).toBe(1);
    expect(result.current.complete).toBe(1);
    expect(result.current.planning).toBe(1);
    expect(result.current.ready_for_review).toBe(0);
  });

  it('updates when workstreams change', () => {
    const { result, rerender } = renderHook(
      ({ workstreams }) => useWorkstreamCounts(workstreams),
      { initialProps: { workstreams: [makeWs('in_progress')] } }
    );

    expect(result.current.total).toBe(1);

    rerender({ workstreams: [makeWs('in_progress'), makeWs('blocked')] });
    expect(result.current.total).toBe(2);
  });
});
