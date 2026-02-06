'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

const FADE_DURATION = 300;

export function useFadeIn(): {
  newIds: Set<string>;
  markAsNew: (ids: string[]) => void;
} {
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const markAsNew = useCallback((ids: string[]) => {
    setNewIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setNewIds(new Set());
    }, FADE_DURATION);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { newIds, markAsNew };
}
