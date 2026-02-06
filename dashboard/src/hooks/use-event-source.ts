'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SSEEvent, SSEEventType } from '@/lib/types/events';

type EventHandler = (event: SSEEvent) => void;

interface UseEventSourceResult {
  status: 'connected' | 'reconnecting' | 'disconnected';
  lastEvent: SSEEvent | null;
}

const MAX_RETRIES = 5;
const BASE_DELAY = 1000;

export function useEventSource(
  url: string,
  handlers: Partial<Record<SSEEventType, EventHandler>>
): UseEventSourceResult {
  const [status, setStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('reconnecting');
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const retryCountRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setStatus('connected');
      retryCountRef.current = 0;
    };

    es.onerror = () => {
      es.close();
      retryCountRef.current++;

      if (retryCountRef.current >= MAX_RETRIES) {
        setStatus('disconnected');
        return;
      }

      setStatus('reconnecting');
      const delay = Math.min(BASE_DELAY * Math.pow(2, retryCountRef.current), 30000);
      setTimeout(connect, delay);
    };

    // Register handlers for each event type
    const eventTypes: SSEEventType[] = [
      'workstream_updated',
      'activity_added',
      'question_added',
      'question_answered',
      'health_changed',
      'heartbeat',
    ];

    for (const eventType of eventTypes) {
      es.addEventListener(eventType, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as SSEEvent;
          setLastEvent(data);
          handlers[eventType]?.(data);
        } catch {
          // Invalid JSON
        }
      });
    }
  }, [url, handlers]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);

  return { status, lastEvent };
}
