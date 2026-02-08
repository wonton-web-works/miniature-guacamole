import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEventSource } from '@/hooks/use-event-source';

// Mock EventSource
class MockEventSource {
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  private listeners: Map<string, Set<(event: MessageEvent) => void>> = new Map();
  readyState: number = 0;
  CONNECTING = 0;
  OPEN = 1;
  CLOSED = 2;

  constructor(url: string) {
    this.url = url;
    this.readyState = this.CONNECTING;
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  close() {
    this.readyState = this.CLOSED;
  }

  // Test helper methods
  simulateOpen() {
    this.readyState = this.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateMessage(type: string, data: any) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const event = new MessageEvent('message', {
        data: JSON.stringify(data),
      });
      listeners.forEach(listener => listener(event));
    }
  }
}

describe('useEventSource', () => {
  let mockEventSource: MockEventSource | null = null;

  beforeEach(() => {
    vi.clearAllMocks();

    (global as any).EventSource = vi.fn((url: string) => {
      mockEventSource = new MockEventSource(url);
      return mockEventSource;
    });
  });

  describe('connection establishment', () => {
    it('should connect to SSE endpoint', () => {
      renderHook(() => useEventSource('/api/events', {}));

      expect(global.EventSource).toHaveBeenCalledWith('/api/events');
    });

    it('should start in reconnecting state', () => {
      const { result } = renderHook(() => useEventSource('/api/events', {}));

      expect(result.current.status).toBe('reconnecting');
    });

    it('should transition to connected on successful open', async () => {
      const { result } = renderHook(() => useEventSource('/api/events', {}));

      mockEventSource?.simulateOpen();

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });
    });
  });

  describe('event handling', () => {
    it('should dispatch events to handlers', () => {
      const handler = vi.fn();
      renderHook(() =>
        useEventSource('/api/events', { workstream_updated: handler })
      );

      mockEventSource?.simulateOpen();

      const eventData = {
        type: 'workstream_updated' as const,
        data: { workstream_id: 'WS-1' },
        timestamp: '2026-02-07T10:00:00Z',
      };

      mockEventSource?.simulateMessage('workstream_updated', eventData);

      expect(handler).toHaveBeenCalledWith(eventData);
    });

    it('should update lastEvent when event is received', async () => {
      const { result } = renderHook(() => useEventSource('/api/events', {}));

      mockEventSource?.simulateOpen();

      const eventData = {
        type: 'workstream_updated' as const,
        data: { workstream_id: 'WS-1' },
        timestamp: '2026-02-07T10:00:00Z',
      };

      mockEventSource?.simulateMessage('workstream_updated', eventData);

      await waitFor(() => {
        expect(result.current.lastEvent).toEqual(eventData);
      });
    });

    it('should ignore invalid JSON in events', () => {
      const handler = vi.fn();
      renderHook(() =>
        useEventSource('/api/events', { workstream_updated: handler })
      );

      mockEventSource?.simulateOpen();

      // Simulate invalid JSON
      const listeners = (mockEventSource as any).listeners.get('workstream_updated');
      if (listeners) {
        const event = new MessageEvent('message', { data: '{ invalid json }' });
        listeners.forEach((listener: any) => listener(event));
      }

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('reconnection handling', () => {
    it('should attempt reconnection on error', async () => {
      const { result } = renderHook(() => useEventSource('/api/events', {}));

      mockEventSource?.simulateOpen();
      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      mockEventSource?.simulateError();
      await waitFor(() => {
        expect(result.current.status).toBe('reconnecting');
      });
    });

    it('should give up after MAX_RETRIES attempts', async () => {
      const { result } = renderHook(() => useEventSource('/api/events', {}));

      vi.useFakeTimers();

      // Simulate 5 failed connection attempts
      for (let i = 0; i < 5; i++) {
        mockEventSource?.simulateError();
        await vi.runAllTimersAsync();
      }

      expect(result.current.status).toBe('disconnected');
      vi.useRealTimers();
    });

    it('should reset retry count on successful connection', async () => {
      const { result } = renderHook(() => useEventSource('/api/events', {}));

      vi.useFakeTimers();

      // First connection fails
      mockEventSource?.simulateError();
      await vi.runAllTimersAsync();

      // Second connection succeeds
      vi.useRealTimers();
      mockEventSource?.simulateOpen();
      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      // Third connection fails - should start from retry 1 again
      mockEventSource?.simulateError();
      await waitFor(() => {
        expect(result.current.status).toBe('reconnecting');
      });

      // Should not be disconnected yet (retry count was reset)
      expect(result.current.status).not.toBe('disconnected');
    });
  });

  describe('cleanup', () => {
    it('should close EventSource on unmount', () => {
      const { unmount } = renderHook(() => useEventSource('/api/events', {}));

      const closeSpy = vi.spyOn(mockEventSource!, 'close');

      unmount();

      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
