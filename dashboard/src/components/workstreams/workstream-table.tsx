'use client';

import { useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { WorkstreamRow } from './workstream-row';
import { EmptyState } from './empty-state';
import type { WorkstreamSummary } from '@/lib/types';

type SortField = 'name' | 'status' | 'phase' | 'agent_id' | 'timestamp';
type SortDirection = 'asc' | 'desc';

interface WorkstreamTableProps {
  workstreams: WorkstreamSummary[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onRowClick: (id: string) => void;
  flashingIds?: Set<string>;
}

const STATUS_ORDER: Record<string, number> = {
  blocked: 0,
  in_progress: 1,
  ready_for_review: 2,
  planning: 3,
  complete: 4,
  unknown: 5,
};

export function WorkstreamTable({
  workstreams,
  sortField,
  sortDirection,
  onSort,
  onRowClick,
  flashingIds,
}: WorkstreamTableProps) {
  const sorted = useMemo(() => {
    const items = [...workstreams];

    // Always pin blocked items to top
    items.sort((a, b) => {
      const aBlocked = a.status === 'blocked' ? 0 : 1;
      const bBlocked = b.status === 'blocked' ? 0 : 1;
      if (aBlocked !== bBlocked) return aBlocked - bBlocked;

      let cmp = 0;
      if (sortField === 'status') {
        cmp = (STATUS_ORDER[a.status] ?? 5) - (STATUS_ORDER[b.status] ?? 5);
      } else if (sortField === 'timestamp') {
        cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      } else {
        const aVal = String(a[sortField] ?? '').toLowerCase();
        const bVal = String(b[sortField] ?? '').toLowerCase();
        cmp = aVal.localeCompare(bVal);
      }

      return sortDirection === 'desc' ? -cmp : cmp;
    });

    return items;
  }, [workstreams, sortField, sortDirection]);

  const renderSortIndicator = useCallback(
    (field: SortField) => {
      if (sortField !== field) return null;
      return sortDirection === 'asc' ? ' \u2191' : ' \u2193';
    },
    [sortField, sortDirection]
  );

  if (workstreams.length === 0) {
    return <EmptyState />;
  }

  const headers: { field: SortField; label: string }[] = [
    { field: 'name', label: 'Name' },
    { field: 'status', label: 'Status' },
    { field: 'phase', label: 'Phase' },
    { field: 'agent_id', label: 'Agent' },
    { field: 'timestamp', label: 'Updated' },
  ];

  return (
    <div className="rounded-md border" data-testid="workstream-table">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map(({ field, label }) => (
              <TableHead
                key={field}
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => onSort(field)}
                data-testid={`sort-${field}`}
              >
                {label}
                {renderSortIndicator(field)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((ws) => (
            <WorkstreamRow
              key={ws.workstream_id}
              workstream={ws}
              onClick={onRowClick}
              isFlashing={flashingIds?.has(ws.workstream_id)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export type { SortField, SortDirection };
