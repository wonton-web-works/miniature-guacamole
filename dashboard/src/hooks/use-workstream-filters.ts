'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { WorkstreamSummary, WorkstreamStatus } from '@/lib/types';
import type { SortField, SortDirection } from '@/components/workstreams/workstream-table';

interface UseWorkstreamFiltersResult {
  search: string;
  setSearch: (value: string) => void;
  debouncedSearch: string;
  statusFilter: WorkstreamStatus | '';
  setStatusFilter: (value: WorkstreamStatus | '') => void;
  phaseFilter: string;
  setPhaseFilter: (value: string) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  handleSort: (field: SortField) => void;
  filteredWorkstreams: WorkstreamSummary[];
  availablePhases: string[];
  clearFilters: () => void;
}

export function useWorkstreamFilters(workstreams: WorkstreamSummary[]): UseWorkstreamFiltersResult {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkstreamStatus | ''>('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const availablePhases = useMemo(() => {
    const phases = new Set(workstreams.map((ws) => ws.phase));
    return Array.from(phases).sort();
  }, [workstreams]);

  const filteredWorkstreams = useMemo(() => {
    let result = workstreams;

    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      result = result.filter(
        (ws) =>
          ws.name.toLowerCase().includes(term) ||
          ws.workstream_id.toLowerCase().includes(term) ||
          ws.agent_id.toLowerCase().includes(term)
      );
    }

    if (statusFilter) {
      result = result.filter((ws) => ws.status === statusFilter);
    }

    if (phaseFilter) {
      result = result.filter((ws) => ws.phase === phaseFilter);
    }

    return result;
  }, [workstreams, debouncedSearch, statusFilter, phaseFilter]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    },
    [sortField]
  );

  const clearFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('');
    setPhaseFilter('');
  }, []);

  return {
    search,
    setSearch,
    debouncedSearch,
    statusFilter,
    setStatusFilter,
    phaseFilter,
    setPhaseFilter,
    sortField,
    sortDirection,
    handleSort,
    filteredWorkstreams,
    availablePhases,
    clearFilters,
  };
}
