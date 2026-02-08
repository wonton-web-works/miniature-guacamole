import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFadeIn } from '@/hooks/use-fade-in';

describe('useFadeIn', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with empty set', () => {
    const { result } = renderHook(() => useFadeIn());
    expect(result.current.newIds.size).toBe(0);
  });

  it('adds ids on markAsNew', () => {
    const { result } = renderHook(() => useFadeIn());
    act(() => {
      result.current.markAsNew(['act-1', 'act-2']);
    });
    expect(result.current.newIds.has('act-1')).toBe(true);
    expect(result.current.newIds.has('act-2')).toBe(true);
  });

  it('clears ids after timeout', () => {
    const { result } = renderHook(() => useFadeIn());
    act(() => {
      result.current.markAsNew(['act-1']);
    });
    expect(result.current.newIds.size).toBe(1);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.newIds.size).toBe(0);
  });
});
