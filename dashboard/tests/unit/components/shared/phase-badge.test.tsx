import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhaseBadge } from '@/components/shared/phase-badge';

describe('PhaseBadge', () => {
  it('renders phase with underscore formatting', () => {
    render(<PhaseBadge phase="data_collection" />);
    const badge = screen.getByTestId('phase-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Data Collection');
  });

  it('renders phase with title case formatting', () => {
    render(<PhaseBadge phase="implementation" />);
    const badge = screen.getByTestId('phase-badge');
    expect(badge).toHaveTextContent('Implementation');
  });

  it('handles multiple underscores correctly', () => {
    render(<PhaseBadge phase="code_review_complete" />);
    const badge = screen.getByTestId('phase-badge');
    expect(badge).toHaveTextContent('Code Review Complete');
  });

  it('handles single word phase', () => {
    render(<PhaseBadge phase="planning" />);
    const badge = screen.getByTestId('phase-badge');
    expect(badge).toHaveTextContent('Planning');
  });

  it('applies custom className', () => {
    render(<PhaseBadge phase="testing" className="custom-phase-class" />);
    const badge = screen.getByTestId('phase-badge');
    expect(badge).toHaveClass('custom-phase-class');
  });
});
