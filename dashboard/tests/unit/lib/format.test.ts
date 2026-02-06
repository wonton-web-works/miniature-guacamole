import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatRelativeTime, formatCoverage, truncateText } from '@/lib/format';

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-05T12:00:00Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns "just now" for recent timestamps', () => {
    const timestamp = new Date('2026-02-05T11:59:50Z').toISOString();
    expect(formatRelativeTime(timestamp)).toBe('just now');
  });

  it('formats minutes ago correctly', () => {
    const timestamp = new Date('2026-02-05T11:55:00Z').toISOString();
    expect(formatRelativeTime(timestamp)).toBe('5m ago');
  });

  it('formats single minute correctly', () => {
    const timestamp = new Date('2026-02-05T11:59:00Z').toISOString();
    expect(formatRelativeTime(timestamp)).toBe('1m ago');
  });

  it('formats hours ago correctly', () => {
    const timestamp = new Date('2026-02-05T09:00:00Z').toISOString();
    expect(formatRelativeTime(timestamp)).toBe('3h ago');
  });

  it('formats single hour correctly', () => {
    const timestamp = new Date('2026-02-05T11:00:00Z').toISOString();
    expect(formatRelativeTime(timestamp)).toBe('1h ago');
  });

  it('formats days ago correctly', () => {
    const timestamp = new Date('2026-02-02T12:00:00Z').toISOString();
    expect(formatRelativeTime(timestamp)).toBe('3d ago');
  });

  it('formats single day correctly', () => {
    const timestamp = new Date('2026-02-04T12:00:00Z').toISOString();
    expect(formatRelativeTime(timestamp)).toBe('1d ago');
  });

  it('formats months ago correctly', () => {
    const timestamp = new Date('2025-11-05T12:00:00Z').toISOString();
    expect(formatRelativeTime(timestamp)).toBe('3mo ago');
  });

  it('formats single month correctly', () => {
    const timestamp = new Date('2026-01-05T12:00:00Z').toISOString();
    expect(formatRelativeTime(timestamp)).toBe('1mo ago');
  });

  it('handles invalid date strings', () => {
    expect(formatRelativeTime('invalid-date')).toBe('Invalid date');
  });

  it('handles future dates', () => {
    const timestamp = new Date('2026-02-05T13:00:00Z').toISOString();
    expect(formatRelativeTime(timestamp)).toBe('just now');
  });
});

describe('formatCoverage', () => {
  it('formats number as percentage', () => {
    expect(formatCoverage(0.8542)).toBe('85.4%');
  });

  it('formats zero correctly', () => {
    expect(formatCoverage(0)).toBe('0.0%');
  });

  it('formats one correctly', () => {
    expect(formatCoverage(1)).toBe('100.0%');
  });

  it('handles undefined', () => {
    expect(formatCoverage(undefined)).toBe('N/A');
  });

  it('handles null', () => {
    expect(formatCoverage(null)).toBe('N/A');
  });

  it('rounds to one decimal place', () => {
    expect(formatCoverage(0.12345)).toBe('12.3%');
  });
});

describe('truncateText', () => {
  it('returns text unchanged when shorter than maxLength', () => {
    expect(truncateText('Hello', 10)).toBe('Hello');
  });

  it('returns text unchanged when equal to maxLength', () => {
    expect(truncateText('Hello', 5)).toBe('Hello');
  });

  it('truncates text and adds ellipsis when longer than maxLength', () => {
    expect(truncateText('Hello World', 8)).toBe('Hello...');
  });

  it('handles empty string', () => {
    expect(truncateText('', 10)).toBe('');
  });

  it('handles very short maxLength', () => {
    expect(truncateText('Hello', 3)).toBe('...');
  });

  it('truncates long text correctly', () => {
    const longText = 'This is a very long piece of text that needs to be truncated';
    expect(truncateText(longText, 20)).toBe('This is a very lo...');
  });
});
