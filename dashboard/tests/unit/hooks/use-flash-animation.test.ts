import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlashAnimation } from '@/hooks/use-flash-animation';

describe('useFlashAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with empty set', () => {
    const { result } = renderHook(() => useFlashAnimation());
    expect(result.current.flashingIds.size).toBe(0);
  });

  it('adds ids on triggerFlash', () => {
    const { result } = renderHook(() => useFlashAnimation());
    act(() => {
      result.current.triggerFlash(['ws-1', 'ws-2']);
    });
    expect(result.current.flashingIds.has('ws-1')).toBe(true);
    expect(result.current.flashingIds.has('ws-2')).toBe(true);
  });

  it('clears ids after timeout', () => {
    const { result } = renderHook(() => useFlashAnimation());
    act(() => {
      result.current.triggerFlash(['ws-1']);
    });
    expect(result.current.flashingIds.size).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.flashingIds.size).toBe(0);
  });
});
