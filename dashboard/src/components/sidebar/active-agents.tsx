'use client';

import { useMemo } from 'react';
import { AgentItem } from './agent-item';
import type { Activity } from '@/lib/types';

interface ActiveAgentsProps {
  activities: Activity[];
}

interface AgentInfo {
  agentId: string;
  lastSeen: string;
  isActive: boolean;
}

export function ActiveAgents({ activities }: ActiveAgentsProps) {
  const agents = useMemo(() => {
    const agentMap = new Map<string, string>();

    for (const activity of activities) {
      const existing = agentMap.get(activity.agent_id);
      if (!existing || new Date(activity.timestamp) > new Date(existing)) {
        agentMap.set(activity.agent_id, activity.timestamp);
      }
    }

    const now = Date.now();
    const ACTIVE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    const agentList: AgentInfo[] = Array.from(agentMap.entries()).map(([agentId, lastSeen]) => ({
      agentId,
      lastSeen,
      isActive: now - new Date(lastSeen).getTime() < ACTIVE_THRESHOLD,
    }));

    agentList.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
    });

    return agentList;
  }, [activities]);

  const activeCount = agents.filter((a) => a.isActive).length;

  return (
    <div data-testid="active-agents">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Agents ({activeCount} active)
      </h3>
      <div className="mt-2 space-y-0.5">
        {agents.length === 0 && (
          <p className="text-xs text-muted-foreground">No agent activity</p>
        )}
        {agents.map((agent) => (
          <AgentItem
            key={agent.agentId}
            agentId={agent.agentId}
            isActive={agent.isActive}
            lastSeen={agent.lastSeen}
          />
        ))}
      </div>
    </div>
  );
}
