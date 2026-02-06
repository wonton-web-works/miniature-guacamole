'use client';

import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { WorkstreamStatus } from '@/lib/types';

const STATUS_OPTIONS: { value: WorkstreamStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'planning', label: 'Planning' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ready_for_review', label: 'Review' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'complete', label: 'Complete' },
];

interface FiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: WorkstreamStatus | '';
  onStatusChange: (value: WorkstreamStatus | '') => void;
  phaseFilter: string;
  onPhaseChange: (value: string) => void;
  phases: string[];
  onClear: () => void;
  className?: string;
}

export function Filters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  phaseFilter,
  onPhaseChange,
  phases,
  onClear,
  className,
}: FiltersProps) {
  const hasFilters = search !== '' || statusFilter !== '' || phaseFilter !== '';

  const handleStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onStatusChange(e.target.value as WorkstreamStatus | '');
    },
    [onStatusChange]
  );

  const handlePhaseChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onPhaseChange(e.target.value);
    },
    [onPhaseChange]
  );

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)} data-testid="filters">
      <Input
        type="search"
        placeholder="Search workstreams..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-xs"
        data-testid="filter-search"
        aria-label="Search workstreams"
      />
      <select
        value={statusFilter}
        onChange={handleStatusChange}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        data-testid="filter-status"
        aria-label="Filter by status"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        value={phaseFilter}
        onChange={handlePhaseChange}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        data-testid="filter-phase"
        aria-label="Filter by phase"
      >
        <option value="">All Phases</option>
        {phases.map((phase) => (
          <option key={phase} value={phase}>
            {phase.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </option>
        ))}
      </select>
      {hasFilters && (
        <button
          onClick={onClear}
          className="text-sm text-muted-foreground hover:text-foreground"
          data-testid="filter-clear"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
