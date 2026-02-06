'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkstreamDetail } from '@/hooks/use-workstream-detail';
import { OverviewSection } from './detail/overview-section';
import { DescriptionSection } from './detail/description-section';
import { AcceptanceCriteria } from './detail/acceptance-criteria';
import { ImplementationSteps } from './detail/implementation-steps';
import { RelatedFiles } from './detail/related-files';
import { RecentActivity } from './detail/recent-activity';

interface DetailModalProps {
  workstreamId: string | null;
  onClose: () => void;
}

export function DetailModal({ workstreamId, onClose }: DetailModalProps) {
  const { detail, activities, isLoading, error } = useWorkstreamDetail(workstreamId);

  return (
    <Dialog open={workstreamId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh]" data-testid="detail-modal">
        {isLoading && (
          <div className="flex items-center justify-center py-12" data-testid="detail-loading">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {error && (
          <div className="py-12 text-center text-sm text-destructive" data-testid="detail-error">
            {error}
          </div>
        )}
        {detail && (
          <>
            <DialogHeader>
              <DialogTitle>{detail.name}</DialogTitle>
              <p className="text-xs text-muted-foreground font-mono">{detail.workstream_id}</p>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh] pr-4">
              <div className="space-y-6">
                <OverviewSection workstream={detail} />
                <DescriptionSection description={detail.description} />
                <AcceptanceCriteria criteria={detail.acceptance_criteria} />
                <ImplementationSteps tddCycle={detail.tdd_cycle} />
                <RelatedFiles dependencies={detail.dependencies} />
                <RecentActivity activities={activities} />
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
