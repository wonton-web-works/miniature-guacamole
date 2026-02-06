'use client';

import { TableRow, TableCell } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/status-badge';
import { PhaseBadge } from '@/components/shared/phase-badge';
import { RelativeTime } from '@/components/shared/relative-time';
import { GateIcon } from './gate-icon';
import { cn } from '@/lib/utils';
import type { WorkstreamSummary } from '@/lib/types';

interface WorkstreamRowProps {
  workstream: WorkstreamSummary;
  onClick: (id: string) => void;
  isFlashing?: boolean;
}

export function WorkstreamRow({ workstream, onClick, isFlashing }: WorkstreamRowProps) {
  return (
    <TableRow
      className={cn(
        'cursor-pointer hover:bg-muted/50 transition-colors',
        workstream.status === 'blocked' && 'bg-status-blocked/5',
        isFlashing && 'animate-flash-yellow'
      )}
      onClick={() => onClick(workstream.workstream_id)}
      data-testid={`workstream-row-${workstream.workstream_id}`}
      data-workstream-id={workstream.workstream_id}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span className="truncate max-w-[250px]">{workstream.name}</span>
          <GateIcon gateStatus={workstream.gate_status} />
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge status={workstream.status} />
      </TableCell>
      <TableCell>
        <PhaseBadge phase={workstream.phase} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {workstream.agent_id}
      </TableCell>
      <TableCell>
        <RelativeTime timestamp={workstream.timestamp} />
      </TableCell>
    </TableRow>
  );
}
