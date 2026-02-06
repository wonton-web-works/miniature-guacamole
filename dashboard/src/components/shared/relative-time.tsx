'use client';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/format';

interface RelativeTimeProps {
  timestamp: string;
  className?: string;
  refreshInterval?: number;
}

export function RelativeTime({ timestamp, className, refreshInterval = 60000 }: RelativeTimeProps) {
  const [display, setDisplay] = useState(() => formatRelativeTime(timestamp));

  useEffect(() => {
    setDisplay(formatRelativeTime(timestamp));
    const interval = setInterval(() => {
      setDisplay(formatRelativeTime(timestamp));
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [timestamp, refreshInterval]);

  return (
    <time
      dateTime={timestamp}
      className={cn('text-xs text-muted-foreground', className)}
      data-testid="relative-time"
      title={new Date(timestamp).toLocaleString()}
    >
      {display}
    </time>
  );
}
