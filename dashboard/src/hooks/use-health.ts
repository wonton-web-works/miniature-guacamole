'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

interface UseHealthResult {
  status: ConnectionStatus;
  lastCheck: string | null;
}

export function useHealth(pollingInterval = 10000): UseHealthResult {
  const [status, setStatus] = useState<ConnectionStatus>('reconnecting');
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const failCountRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        failCountRef.current = 0;
        setStatus('connected');
        setLastCheck(new Date().toISOString());
      } else {
        failCountRef.current++;
        setStatus(failCountRef.current >= 3 ? 'disconnected' : 'reconnecting');
      }
    } catch {
      failCountRef.current++;
      setStatus(failCountRef.current >= 3 ? 'disconnected' : 'reconnecting');
    }
  }, []);

  useEffect(() => {
    checkHealth();
    intervalRef.current = setInterval(checkHealth, pollingInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkHealth, pollingInterval]);

  return { status, lastCheck };
}
