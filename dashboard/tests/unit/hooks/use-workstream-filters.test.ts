import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkstreamFilters } from '@/hooks/use-workstream-filters';
import type { WorkstreamSummary } from '@/lib/types';

const makeWs = (overrides: Partial<WorkstreamSummary> = {}): WorkstreamSummary => ({
  workstream_id: `ws-${Math.random()}`,
  name: 'Test WS',
  status: 'in_progress',
  phase: 'planning',
  agent_id: 'agent',
  timestamp: new Date().toISOString(),
  created_at: '2025-01-01',
  ...overrides,
});

const workstreams = [
  makeWs({ workstream_id: 'ws-1', name: 'Alpha', status: 'in_progress', phase: 'planning', agent_id: 'agent-a' }),
  makeWs({ workstream_id: 'ws-2', name: 'Beta', status: 'blocked', phase: 'step_1_test_spec', agent_id: 'agent-b' }),
  makeWs({ workstream_id: 'ws-3', name: 'Gamma', status: 'complete', phase: 'complete', agent_id: 'agent-a' }),
];

describe('useWorkstreamFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns all workstreams with no filters', () => {
    const { result } = renderHook(() => useWorkstreamFilters(workstreams));
    expect(result.current.filteredWorkstreams).toHaveLength(3);
  });

  it('filters by status', () => {
    const { result } = renderHook(() => useWorkstreamFilters(workstreams));
    act(() => {
      result.current.setStatusFilter('blocked');
    });
    expect(result.current.filteredWorkstreams).toHaveLength(1);
    expect(result.current.filteredWorkstreams[0].workstream_id).toBe('ws-2');
  });

  it('filters by phase', () => {
    const { result } = renderHook(() => useWorkstreamFilters(workstreams));
    act(() => {
      result.current.setPhaseFilter('planning');
    });
    expect(result.current.filteredWorkstreams).toHaveLength(1);
  });

  it('filters by search with debounce', () => {
    const { result } = renderHook(() => useWorkstreamFilters(workstreams));
    act(() => {
      result.current.setSearch('alpha');
    });
    // Before debounce fires, still all results
    expect(result.current.filteredWorkstreams).toHaveLength(3);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    // After debounce, filtered
    expect(result.current.filteredWorkstreams).toHaveLength(1);
    expect(result.current.filteredWorkstreams[0].name).toBe('Alpha');
  });

  it('searches by name, id, and agent_id', () => {
    const { result } = renderHook(() => useWorkstreamFilters(workstreams));
    act(() => {
      result.current.setSearch('agent-b');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.filteredWorkstreams).toHaveLength(1);
    expect(result.current.filteredWorkstreams[0].workstream_id).toBe('ws-2');
  });

  it('computes available phases', () => {
    const { result } = renderHook(() => useWorkstreamFilters(workstreams));
    expect(result.current.availablePhases).toEqual(['complete', 'planning', 'step_1_test_spec']);
  });

  it('toggles sort direction on same field', () => {
    const { result } = renderHook(() => useWorkstreamFilters(workstreams));
    expect(result.current.sortDirection).toBe('asc');
    act(() => {
      result.current.handleSort('status');
    });
    expect(result.current.sortDirection).toBe('desc');
  });

  it('resets sort direction on new field', () => {
    const { result } = renderHook(() => useWorkstreamFilters(workstreams));
    act(() => {
      result.current.handleSort('name');
    });
    expect(result.current.sortField).toBe('name');
    expect(result.current.sortDirection).toBe('asc');
  });

  it('clears all filters', () => {
    const { result } = renderHook(() => useWorkstreamFilters(workstreams));
    act(() => {
      result.current.setSearch('test');
      result.current.setStatusFilter('blocked');
      result.current.setPhaseFilter('planning');
      vi.advanceTimersByTime(300);
    });

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.search).toBe('');
    expect(result.current.statusFilter).toBe('');
    expect(result.current.phaseFilter).toBe('');
    expect(result.current.filteredWorkstreams).toHaveLength(3);
  });
});
