'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { StatusBadge } from '@/components/shared/status-badge';
import type { StepStatus, WorkstreamStatus } from '@/lib/types';

interface ImplementationStepsProps {
  tddCycle?: Record<string, StepStatus>;
}

function stepStatusToWorkstreamStatus(status: StepStatus['status']): WorkstreamStatus {
  switch (status) {
    case 'complete': return 'complete';
    case 'in_progress': return 'in_progress';
    case 'blocked': return 'blocked';
    default: return 'planning';
  }
}

export function ImplementationSteps({ tddCycle }: ImplementationStepsProps) {
  if (!tddCycle || Object.keys(tddCycle).length === 0) return null;

  const entries = Object.entries(tddCycle);

  return (
    <div data-testid="implementation-steps">
      <h3 className="text-sm font-medium mb-2">Implementation Steps</h3>
      <Accordion type="multiple" className="w-full">
        {entries.map(([stepName, step]) => (
          <AccordionItem key={stepName} value={stepName}>
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <span>{stepName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                <StatusBadge status={stepStatusToWorkstreamStatus(step.status)} />
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Assigned to: {step.assigned_to}</p>
                {step.started && <p>Started: {new Date(step.started).toLocaleDateString()}</p>}
                {step.completed && <p>Completed: {new Date(step.completed).toLocaleDateString()}</p>}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
