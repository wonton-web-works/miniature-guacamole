import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RelativeTime } from '@/components/shared/relative-time';

vi.mock('@/lib/format', () => ({
  formatRelativeTime: vi.fn((timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }),
}));

describe('RelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('displays formatted relative time', () => {
    const timestamp = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    render(<RelativeTime timestamp={timestamp} />);
    const timeElement = screen.getByTestId('relative-time');
    expect(timeElement).toBeInTheDocument();
    expect(timeElement).toHaveTextContent('5m ago');
  });

  it('has correct dateTime attribute', () => {
    const timestamp = '2026-02-05T12:00:00Z';
    render(<RelativeTime timestamp={timestamp} />);
    const timeElement = screen.getByTestId('relative-time');
    expect(timeElement).toHaveAttribute('dateTime', timestamp);
  });

  it('has title attribute with full date', () => {
    const timestamp = '2026-02-05T12:00:00Z';
    render(<RelativeTime timestamp={timestamp} />);
    const timeElement = screen.getByTestId('relative-time');
    const expectedTitle = new Date(timestamp).toLocaleString();
    expect(timeElement).toHaveAttribute('title', expectedTitle);
  });

  it('updates display on interval', () => {
    const { formatRelativeTime } = vi.mocked(await import('@/lib/format'));
    let callCount = 0;
    formatRelativeTime.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? '5m ago' : '6m ago';
    });

    const timestamp = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    render(<RelativeTime timestamp={timestamp} refreshInterval={1000} />);

    const timeElement = screen.getByTestId('relative-time');
    expect(timeElement).toHaveTextContent('5m ago');

    vi.advanceTimersByTime(1000);
    expect(timeElement).toHaveTextContent('6m ago');
  });

  it('applies custom className', () => {
    const timestamp = new Date().toISOString();
    render(<RelativeTime timestamp={timestamp} className="custom-time-class" />);
    const timeElement = screen.getByTestId('relative-time');
    expect(timeElement).toHaveClass('custom-time-class');
  });

  it('uses default refresh interval of 60000ms', () => {
    const { formatRelativeTime } = vi.mocked(await import('@/lib/format'));
    formatRelativeTime.mockReturnValue('5m ago');

    const timestamp = new Date().toISOString();
    render(<RelativeTime timestamp={timestamp} />);

    expect(formatRelativeTime).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(59999);
    expect(formatRelativeTime).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(formatRelativeTime).toHaveBeenCalledTimes(2);
  });
});
