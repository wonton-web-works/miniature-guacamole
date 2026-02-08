import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NavigationTabs } from '@/components/layout/navigation-tabs';

describe('NavigationTabs', () => {
  it('renders both tabs', () => {
    render(<NavigationTabs activeTab="activity" onTabChange={vi.fn()} />);
    expect(screen.getByText('Activity Feed')).toBeInTheDocument();
    expect(screen.getByText('Workstreams')).toBeInTheDocument();
  });

  it('shows pending question count badge when > 0', () => {
    render(<NavigationTabs activeTab="activity" onTabChange={vi.fn()} pendingQuestionCount={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not show badge when count is 0', () => {
    render(<NavigationTabs activeTab="activity" onTabChange={vi.fn()} pendingQuestionCount={0} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('renders workstreams tab as clickable', () => {
    render(<NavigationTabs activeTab="activity" onTabChange={vi.fn()} />);
    const wsTab = screen.getByText('Workstreams');
    expect(wsTab).toBeInTheDocument();
    expect(wsTab.closest('button')).toBeTruthy();
  });
});
