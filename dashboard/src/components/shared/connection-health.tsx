'use client';
import { cn } from '@/lib/utils';

type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

const STATUS_CONFIG: Record<ConnectionStatus, { color: string; label: string }> = {
  connected: { color: 'bg-green-500', label: 'Connected' },
  reconnecting: { color: 'bg-amber-500', label: 'Reconnecting' },
  disconnected: { color: 'bg-red-500', label: 'Disconnected' },
};

interface ConnectionHealthProps {
  status: ConnectionStatus;
  className?: string;
}

export function ConnectionHealth({ status, className }: ConnectionHealthProps) {
  const config = STATUS_CONFIG[status];
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      data-testid="connection-health"
      data-status={status}
      role="status"
      aria-label={`Connection status: ${config.label}`}
    >
      <span className={cn('h-2 w-2 rounded-full', config.color, status === 'reconnecting' && 'animate-pulse')} />
      <span className="text-xs text-muted-foreground">{config.label}</span>
    </div>
  );
}
