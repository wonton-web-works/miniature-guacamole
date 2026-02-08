import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoverageCell } from '@/components/workstreams/coverage-cell';

describe('CoverageCell', () => {
  it('renders dash for undefined', () => {
    render(<CoverageCell />);
    expect(screen.getByTestId('coverage-cell')).toHaveTextContent('—');
  });

  it('renders dash for null', () => {
    render(<CoverageCell value={null} />);
    expect(screen.getByTestId('coverage-cell')).toHaveTextContent('—');
  });

  it('renders percentage for value', () => {
    render(<CoverageCell value={95} />);
    expect(screen.getByTestId('coverage-cell')).toHaveTextContent('95%');
  });

  it('rounds percentage', () => {
    render(<CoverageCell value={87.6} />);
    expect(screen.getByTestId('coverage-cell')).toHaveTextContent('88%');
  });

  it('applies green color for >= 90', () => {
    render(<CoverageCell value={95} />);
    expect(screen.getByTestId('coverage-cell')).toHaveClass('text-status-complete');
  });

  it('applies amber color for 70-89', () => {
    render(<CoverageCell value={80} />);
    expect(screen.getByTestId('coverage-cell')).toHaveClass('text-status-ready-for-review');
  });

  it('applies red color for < 70', () => {
    render(<CoverageCell value={50} />);
    expect(screen.getByTestId('coverage-cell')).toHaveClass('text-status-blocked');
  });
});
