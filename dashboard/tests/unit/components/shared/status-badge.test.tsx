import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/shared/status-badge';
import type { WorkstreamStatus } from '@/lib/types';

describe('StatusBadge', () => {
  it('renders planning status correctly', () => {
    render(<StatusBadge status="planning" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Planning');
    expect(badge).toHaveAttribute('data-status', 'planning');
  });

  it('renders in_progress status correctly', () => {
    render(<StatusBadge status="in_progress" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('In Progress');
    expect(badge).toHaveAttribute('data-status', 'in_progress');
  });

  it('renders ready_for_review status correctly', () => {
    render(<StatusBadge status="ready_for_review" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('Review');
    expect(badge).toHaveAttribute('data-status', 'ready_for_review');
  });

  it('renders blocked status correctly', () => {
    render(<StatusBadge status="blocked" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('Blocked');
    expect(badge).toHaveAttribute('data-status', 'blocked');
  });

  it('renders complete status correctly', () => {
    render(<StatusBadge status="complete" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('Complete');
    expect(badge).toHaveAttribute('data-status', 'complete');
  });

  it('renders unknown status correctly', () => {
    render(<StatusBadge status="unknown" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('Unknown');
    expect(badge).toHaveAttribute('data-status', 'unknown');
  });

  it('falls back to unknown for invalid status', () => {
    render(<StatusBadge status={'invalid_status' as WorkstreamStatus} />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('Unknown');
  });

  it('applies custom className', () => {
    render(<StatusBadge status="planning" className="custom-class" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveClass('custom-class');
  });
});
