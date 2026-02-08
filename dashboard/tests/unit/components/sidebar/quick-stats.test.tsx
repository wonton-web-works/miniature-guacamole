import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickStats } from '@/components/sidebar/quick-stats';
import type { WorkstreamSummary } from '@/lib/types';

const makeWs = (status: string): WorkstreamSummary => ({
  workstream_id: `ws-${status}`,
  name: `WS ${status}`,
  status: status as WorkstreamSummary['status'],
  phase: 'planning',
  agent_id: 'agent',
  timestamp: new Date().toISOString(),
  created_at: '2025-01-01',
});

describe('QuickStats', () => {
  it('renders total count', () => {
    render(<QuickStats workstreams={[makeWs('in_progress'), makeWs('blocked')]} />);
    expect(screen.getByText('Workstreams (2)')).toBeInTheDocument();
  });

  it('renders status labels', () => {
    render(
      <QuickStats
        workstreams={[
          makeWs('in_progress'),
          makeWs('in_progress'),
          makeWs('blocked'),
          makeWs('complete'),
        ]}
      />
    );
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText('Planning')).toBeInTheDocument();
  });

  it('has data-testid', () => {
    render(<QuickStats workstreams={[]} />);
    expect(screen.getByTestId('quick-stats')).toBeInTheDocument();
  });
});
