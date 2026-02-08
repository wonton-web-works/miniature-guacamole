import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityFeed } from '@/components/activity/activity-feed';
import type { Activity } from '@/lib/types';

const makeActivity = (id: string): Activity => ({
  id,
  timestamp: new Date().toISOString(),
  type: 'workstream_updated',
  agent_id: 'agent',
  agent_hierarchy: 'engineering',
  workstream_id: 'ws-1',
  workstream_name: 'Test',
  description: `Activity ${id}`,
});

describe('ActivityFeed', () => {
  it('renders activity items', () => {
    render(
      <ActivityFeed
        activities={[makeActivity('a1'), makeActivity('a2')]}
        isLoading={false}
        hasMore={false}
        onLoadMore={vi.fn()}
      />
    );
    expect(screen.getByText('Activity a1')).toBeInTheDocument();
    expect(screen.getByText('Activity a2')).toBeInTheDocument();
  });

  it('shows skeletons when loading with no items', () => {
    render(
      <ActivityFeed
        activities={[]}
        isLoading={true}
        hasMore={false}
        onLoadMore={vi.fn()}
      />
    );
    expect(screen.getAllByTestId('activity-item-skeleton')).toHaveLength(5);
  });

  it('shows empty message when not loading and no items', () => {
    render(
      <ActivityFeed
        activities={[]}
        isLoading={false}
        hasMore={false}
        onLoadMore={vi.fn()}
      />
    );
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });

  it('shows load more button when hasMore', () => {
    render(
      <ActivityFeed
        activities={[makeActivity('a1')]}
        isLoading={false}
        hasMore={true}
        onLoadMore={vi.fn()}
      />
    );
    expect(screen.getByTestId('load-more')).toBeInTheDocument();
  });

  it('calls onLoadMore when button clicked', () => {
    const onLoadMore = vi.fn();
    render(
      <ActivityFeed
        activities={[makeActivity('a1')]}
        isLoading={false}
        hasMore={true}
        onLoadMore={onLoadMore}
      />
    );
    fireEvent.click(screen.getByTestId('load-more'));
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('has data-testid', () => {
    render(
      <ActivityFeed activities={[]} isLoading={false} hasMore={false} onLoadMore={vi.fn()} />
    );
    expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
  });
});
