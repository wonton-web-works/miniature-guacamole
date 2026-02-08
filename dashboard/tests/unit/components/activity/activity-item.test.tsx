import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityItem } from '@/components/activity/activity-item';
import type { Activity } from '@/lib/types';

const makeActivity = (overrides: Partial<Activity> = {}): Activity => ({
  id: 'act-1',
  timestamp: new Date().toISOString(),
  type: 'workstream_updated',
  agent_id: 'qa-agent',
  agent_hierarchy: 'engineering',
  workstream_id: 'ws-1',
  workstream_name: 'Test WS',
  description: 'Updated test coverage',
  ...overrides,
});

describe('ActivityItem', () => {
  it('renders description', () => {
    render(<ActivityItem activity={makeActivity()} />);
    expect(screen.getByText('Updated test coverage')).toBeInTheDocument();
  });

  it('renders agent id', () => {
    render(<ActivityItem activity={makeActivity()} />);
    expect(screen.getByText('qa-agent')).toBeInTheDocument();
  });

  it('renders hierarchy label', () => {
    render(<ActivityItem activity={makeActivity({ agent_hierarchy: 'leadership' })} />);
    expect(screen.getByText('Leadership')).toBeInTheDocument();
  });

  it('does not render hierarchy label for unknown', () => {
    render(<ActivityItem activity={makeActivity({ agent_hierarchy: 'unknown' })} />);
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
  });

  it('has data-testid with activity id', () => {
    render(<ActivityItem activity={makeActivity()} />);
    expect(screen.getByTestId('activity-item-act-1')).toBeInTheDocument();
  });

  it('applies fade-in animation when isNew', () => {
    render(<ActivityItem activity={makeActivity()} isNew />);
    expect(screen.getByTestId('activity-item-act-1')).toHaveClass('animate-fade-in');
  });
});
