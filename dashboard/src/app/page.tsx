'use client';

import { useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { EventSourceProvider, useEventSourceContext } from '@/components/providers/event-source-provider';
import { ActivityFeedTab } from '@/components/activity/activity-feed-tab';
import { WorkstreamTable } from '@/components/workstreams/workstream-table';
import { OverviewBar } from '@/components/workstreams/overview-bar';
import { Filters } from '@/components/workstreams/filters';
import { DetailModal } from '@/components/workstreams/detail-modal';
import { PendingQuestions } from '@/components/questions/pending-questions';
import { useWorkstreams } from '@/hooks/use-workstreams';
import { useWorkstreamFilters } from '@/hooks/use-workstream-filters';
import { useActivities } from '@/hooks/use-activities';
import { useQuestions } from '@/hooks/use-questions';
import { useAnswerQuestion } from '@/hooks/use-answer-question';
import { useFlashAnimation } from '@/hooks/use-flash-animation';
import { useFadeIn } from '@/hooks/use-fade-in';
import { useState } from 'react';

function DashboardContent() {
  const { status: connectionStatus } = useEventSourceContext();
  const { workstreams, counts } = useWorkstreams();
  const { activities, isLoading: isLoadingActivities, hasMore, loadMore } = useActivities();
  const { openQuestions, answeredQuestions, refresh: refreshQuestions } = useQuestions();
  const { submitAnswer, submittingId } = useAnswerQuestion(refreshQuestions);
  const { flashingIds } = useFlashAnimation();
  const { newIds: newActivityIds } = useFadeIn();

  const [selectedWorkstreamId, setSelectedWorkstreamId] = useState<string | null>(null);

  const filters = useWorkstreamFilters(workstreams);

  const handleRowClick = useCallback((id: string) => {
    setSelectedWorkstreamId(id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedWorkstreamId(null);
  }, []);

  const workstreamsContent = (
    <div className="p-6 space-y-4">
      <OverviewBar counts={counts} />
      <Filters
        search={filters.search}
        onSearchChange={filters.setSearch}
        statusFilter={filters.statusFilter}
        onStatusChange={filters.setStatusFilter}
        phaseFilter={filters.phaseFilter}
        onPhaseChange={filters.setPhaseFilter}
        phases={filters.availablePhases}
        onClear={filters.clearFilters}
      />
      <WorkstreamTable
        workstreams={filters.filteredWorkstreams}
        sortField={filters.sortField}
        sortDirection={filters.sortDirection}
        onSort={filters.handleSort}
        onRowClick={handleRowClick}
        flashingIds={flashingIds}
      />
      <DetailModal
        workstreamId={selectedWorkstreamId}
        onClose={handleCloseDetail}
      />
    </div>
  );

  const pendingQuestionsContent = (
    <PendingQuestions
      openQuestions={openQuestions}
      answeredQuestions={answeredQuestions}
      onAnswer={submitAnswer}
      submittingId={submittingId}
    />
  );

  const activityContent = (
    <ActivityFeedTab
      activities={activities}
      isLoadingActivities={isLoadingActivities}
      hasMoreActivities={hasMore}
      onLoadMore={loadMore}
      workstreams={workstreams}
      pendingQuestions={pendingQuestionsContent}
      newActivityIds={newActivityIds}
    />
  );

  return (
    <DashboardLayout
      connectionStatus={connectionStatus}
      pendingQuestionCount={openQuestions.length}
      activityContent={activityContent}
      workstreamsContent={workstreamsContent}
    />
  );
}

export default function Home() {
  const handleWorkstreamUpdate = useCallback(() => {}, []);
  const handleActivityAdded = useCallback(() => {}, []);
  const handleQuestionUpdate = useCallback(() => {}, []);

  return (
    <EventSourceProvider
      onWorkstreamUpdate={handleWorkstreamUpdate}
      onActivityAdded={handleActivityAdded}
      onQuestionUpdate={handleQuestionUpdate}
    >
      <DashboardContent />
    </EventSourceProvider>
  );
}
