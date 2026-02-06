'use client';

import { ConnectionHealth } from '@/components/shared/connection-health';

interface HeaderProps {
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
}

export function Header({ connectionStatus }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      data-testid="header"
    >
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Agent-C</h1>
          <span className="text-sm text-muted-foreground">Dashboard</span>
        </div>
        <ConnectionHealth status={connectionStatus} />
      </div>
    </header>
  );
}
