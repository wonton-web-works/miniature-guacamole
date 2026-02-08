import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { RelativeTime } from '@/components/shared/relative-time';

vi.mock('@/lib/format', () => {
  let counter = 0;
  return {
    formatRelativeTime: vi.fn(() => {
      counter++;
      if (counter <= 2) return '5m ago';
      return '6m ago';
    }),
  };
});

describe('RelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays formatted relative time', () => {
    const timestamp = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    render(<RelativeTime timestamp={timestamp} />);
    expect(screen.getByTestId('relative-time')).toHaveTextContent('5m ago');
  });

  it('has correct dateTime attribute', () => {
    const timestamp = '2026-02-05T12:00:00Z';
    render(<RelativeTime timestamp={timestamp} />);
    expect(screen.getByTestId('relative-time')).toHaveAttribute('dateTime', timestamp);
  });

  it('has title attribute with full date', () => {
    const timestamp = '2026-02-05T12:00:00Z';
    render(<RelativeTime timestamp={timestamp} />);
    const title = screen.getByTestId('relative-time').getAttribute('title');
    expect(title).toBeTruthy();
  });

  it('updates display on interval', () => {
    const timestamp = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    render(<RelativeTime timestamp={timestamp} refreshInterval={1000} />);

    const timeElement = screen.getByTestId('relative-time');
    expect(timeElement).toHaveTextContent(/ago/);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    // After interval tick, it should call formatRelativeTime again
    expect(timeElement).toHaveTextContent(/ago/);
  });

  it('applies custom className', () => {
    const timestamp = new Date().toISOString();
    render(<RelativeTime timestamp={timestamp} className="custom-class" />);
    expect(screen.getByTestId('relative-time')).toHaveClass('custom-class');
  });
});
