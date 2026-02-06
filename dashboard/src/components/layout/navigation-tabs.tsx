'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type TabValue = 'activity' | 'workstreams';

interface NavigationTabsProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  pendingQuestionCount?: number;
}

export function NavigationTabs({ activeTab, onTabChange, pendingQuestionCount = 0 }: NavigationTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as TabValue)} data-testid="navigation-tabs">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="activity" className="relative">
          Activity Feed
          {pendingQuestionCount > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {pendingQuestionCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="workstreams">Workstreams</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
