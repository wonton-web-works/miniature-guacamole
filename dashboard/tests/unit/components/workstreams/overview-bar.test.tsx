import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OverviewBar } from '@/components/workstreams/overview-bar';
import type { WorkstreamCounts } from '@/lib/types';

const makeCounts = (overrides: Partial<WorkstreamCounts> = {}): WorkstreamCounts => ({
  total: 10,
  planning: 1,
  in_progress: 3,
  ready_for_review: 1,
  blocked: 2,
  complete: 3,
  unknown: 0,
  ...overrides,
});

describe('OverviewBar', () => {
  it('renders total count', () => {
    render(<OverviewBar counts={makeCounts()} />);
    expect(screen.getByText('10 workstreams')).toBeInTheDocument();
  });

  it('renders non-zero segments', () => {
    render(<OverviewBar counts={makeCounts()} />);
    expect(screen.getByText(/3 active/)).toBeInTheDocument();
    expect(screen.getByText(/2 blocked/)).toBeInTheDocument();
    expect(screen.getByText(/3 complete/)).toBeInTheDocument();
    expect(screen.getByText(/1 planning/)).toBeInTheDocument();
    expect(screen.getByText(/1 review/)).toBeInTheDocument();
  });

  it('hides zero-count segments', () => {
    render(<OverviewBar counts={makeCounts({ unknown: 0, planning: 0 })} />);
    expect(screen.queryByText(/0 planning/)).not.toBeInTheDocument();
  });

  it('has aria-label', () => {
    render(<OverviewBar counts={makeCounts()} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', '10 total workstreams');
  });

  it('has data-testid', () => {
    render(<OverviewBar counts={makeCounts()} />);
    expect(screen.getByTestId('overview-bar')).toBeInTheDocument();
  });
});
