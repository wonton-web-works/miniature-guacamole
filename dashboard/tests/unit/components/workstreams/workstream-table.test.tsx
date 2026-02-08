import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkstreamTable } from '@/components/workstreams/workstream-table';
import type { WorkstreamSummary } from '@/lib/types';

const makeWs = (overrides: Partial<WorkstreamSummary> = {}): WorkstreamSummary => ({
  workstream_id: 'ws-1',
  name: 'Test Workstream',
  status: 'in_progress',
  phase: 'planning',
  agent_id: 'dev-agent',
  timestamp: new Date().toISOString(),
  created_at: '2025-01-01',
  ...overrides,
});

describe('WorkstreamTable', () => {
  const defaultProps = {
    workstreams: [
      makeWs({ workstream_id: 'ws-1', name: 'First' }),
      makeWs({ workstream_id: 'ws-2', name: 'Second', status: 'blocked' as const }),
    ],
    sortField: 'status' as const,
    sortDirection: 'asc' as const,
    onSort: vi.fn(),
    onRowClick: vi.fn(),
  };

  it('renders the table', () => {
    render(<WorkstreamTable {...defaultProps} />);
    expect(screen.getByTestId('workstream-table')).toBeInTheDocument();
  });

  it('renders all column headers', () => {
    render(<WorkstreamTable {...defaultProps} />);
    expect(screen.getByTestId('sort-name')).toBeInTheDocument();
    expect(screen.getByTestId('sort-status')).toBeInTheDocument();
    expect(screen.getByTestId('sort-phase')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByTestId('sort-timestamp')).toBeInTheDocument();
  });

  it('renders workstream rows', () => {
    render(<WorkstreamTable {...defaultProps} />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('shows empty state when no workstreams', () => {
    render(<WorkstreamTable {...defaultProps} workstreams={[]} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('calls onSort when header clicked', () => {
    const onSort = vi.fn();
    render(<WorkstreamTable {...defaultProps} onSort={onSort} />);
    fireEvent.click(screen.getByTestId('sort-name'));
    expect(onSort).toHaveBeenCalledWith('name');
  });

  it('shows sort indicator for active sort field', () => {
    render(<WorkstreamTable {...defaultProps} sortField="name" sortDirection="asc" />);
    expect(screen.getByTestId('sort-name')).toHaveTextContent('Name \u2191');
  });

  it('pins blocked items to top', () => {
    render(<WorkstreamTable {...defaultProps} />);
    const rows = screen.getAllByRole('row');
    // Header is first row, blocked ws-2 should be second (pinned)
    expect(rows[1]).toHaveAttribute('data-workstream-id', 'ws-2');
  });
});
