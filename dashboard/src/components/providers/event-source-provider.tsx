'use client';

import { createContext, useContext, useMemo } from 'react';
import { useEventSource } from '@/hooks/use-event-source';
import type { SSEEvent, SSEEventType } from '@/lib/types/events';

interface EventSourceContextValue {
  status: 'connected' | 'reconnecting' | 'disconnected';
  lastEvent: SSEEvent | null;
}

const EventSourceContext = createContext<EventSourceContextValue>({
  status: 'reconnecting',
  lastEvent: null,
});

export function useEventSourceContext() {
  return useContext(EventSourceContext);
}

interface EventSourceProviderProps {
  children: React.ReactNode;
  onWorkstreamUpdate?: () => void;
  onActivityAdded?: () => void;
  onQuestionUpdate?: () => void;
}

export function EventSourceProvider({
  children,
  onWorkstreamUpdate,
  onActivityAdded,
  onQuestionUpdate,
}: EventSourceProviderProps) {
  const handlers = useMemo(
    () => ({
      workstream_updated: () => onWorkstreamUpdate?.(),
      activity_added: () => onActivityAdded?.(),
      question_added: () => onQuestionUpdate?.(),
      question_answered: () => onQuestionUpdate?.(),
    }),
    [onWorkstreamUpdate, onActivityAdded, onQuestionUpdate]
  ) as Partial<Record<SSEEventType, (event: SSEEvent) => void>>;

  const { status, lastEvent } = useEventSource('/api/events', handlers);

  const value = useMemo(() => ({ status, lastEvent }), [status, lastEvent]);

  return (
    <EventSourceContext.Provider value={value}>
      {children}
    </EventSourceContext.Provider>
  );
}
