'use client';

import { useState, useCallback } from 'react';
import { Header } from './header';
import { NavigationTabs, type TabValue } from './navigation-tabs';

interface DashboardLayoutProps {
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
  pendingQuestionCount?: number;
  activityContent: React.ReactNode;
  workstreamsContent: React.ReactNode;
}

export function DashboardLayout({
  connectionStatus,
  pendingQuestionCount = 0,
  activityContent,
  workstreamsContent,
}: DashboardLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('activity');

  const handleTabChange = useCallback((tab: TabValue) => {
    setActiveTab(tab);
  }, []);

  return (
    <div className="flex min-h-screen flex-col" data-testid="dashboard-layout">
      <Header connectionStatus={connectionStatus} />
      <div className="flex flex-1 flex-col">
        <div className="border-b px-6 py-3">
          <NavigationTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            pendingQuestionCount={pendingQuestionCount}
          />
        </div>
        <main className="flex-1">
          {activeTab === 'activity' && activityContent}
          {activeTab === 'workstreams' && workstreamsContent}
        </main>
      </div>
    </div>
  );
}
