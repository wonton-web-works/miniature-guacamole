import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityItemSkeleton } from '@/components/activity/activity-item-skeleton';

describe('ActivityItemSkeleton', () => {
  it('renders with data-testid', () => {
    render(<ActivityItemSkeleton />);
    expect(screen.getByTestId('activity-item-skeleton')).toBeInTheDocument();
  });

  it('has pulse animation', () => {
    render(<ActivityItemSkeleton />);
    expect(screen.getByTestId('activity-item-skeleton')).toHaveClass('animate-pulse');
  });
});
