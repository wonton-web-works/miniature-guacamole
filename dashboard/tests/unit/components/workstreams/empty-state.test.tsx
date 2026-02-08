import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/workstreams/empty-state';

describe('EmptyState', () => {
  it('renders default message', () => {
    render(<EmptyState />);
    expect(screen.getByText('No workstreams found')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<EmptyState message="No results" />);
    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('has data-testid', () => {
    render(<EmptyState />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });
});
