'use client';

import { QuickStats } from './quick-stats';
import { ActiveAgents } from './active-agents';
import type { WorkstreamSummary, Activity } from '@/lib/types';

interface SidebarProps {
  workstreams: WorkstreamSummary[];
  activities: Activity[];
}

export function Sidebar({ workstreams, activities }: SidebarProps) {
  return (
    <aside className="p-4 space-y-6" data-testid="sidebar">
      <QuickStats workstreams={workstreams} />
      <ActiveAgents activities={activities} />
    </aside>
  );
}
