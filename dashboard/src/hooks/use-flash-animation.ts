'use client';

import { useState, useCallback, useRef } from 'react';

const FLASH_DURATION = 1000;

export function useFlashAnimation(): {
  flashingIds: Set<string>;
  triggerFlash: (ids: string[]) => void;
} {
  const [flashingIds, setFlashingIds] = useState<Set<string>>(new Set());
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const triggerFlash = useCallback((ids: string[]) => {
    setFlashingIds(new Set(ids));

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setFlashingIds(new Set());
    }, FLASH_DURATION);
  }, []);

  return { flashingIds, triggerFlash };
}
