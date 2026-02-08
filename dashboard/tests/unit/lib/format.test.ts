import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatRelativeTime, formatCoverage, truncateText } from '@/lib/format';

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-05T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('formats days ago correctly', () => {
    const timestamp = new Date('2026-02-02T12:00:00Z').toISOString();
    expect(formatRelativeTime(timestamp)).toBe('3d ago');
  });

  it('formats months ago correctly', () => {
    const timestamp = new Date('2025-11-05T12:00:00Z').toISOString();
    expect(formatRelativeTime(timestamp)).toBe('3mo ago');
  });

  it('handles invalid date strings', () => {
    expect(formatRelativeTime('invalid-date')).toBe('unknown');
  });

  it('handles future dates', () => {
    const timestamp = new Date('2026-02-05T13:00:00Z').toISOString();
    expect(formatRelativeTime(timestamp)).toBe('just now');
  });
});

describe('formatCoverage', () => {
  it('formats number as rounded percentage', () => {
    expect(formatCoverage(85)).toBe('85%');
  });

  it('formats zero correctly', () => {
    expect(formatCoverage(0)).toBe('0%');
  });

  it('formats 100 correctly', () => {
    expect(formatCoverage(100)).toBe('100%');
  });

  it('handles undefined', () => {
    expect(formatCoverage(undefined)).toBe('\u2014');
  });

  it('handles null', () => {
    expect(formatCoverage(null)).toBe('\u2014');
  });

  it('rounds to nearest integer', () => {
    expect(formatCoverage(87.6)).toBe('88%');
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
    const result = truncateText('Hello World', 8);
    expect(result).toHaveLength(8);
    expect(result.endsWith('\u2026')).toBe(true);
  });

  it('handles empty string', () => {
    expect(truncateText('', 10)).toBe('');
  });

  it('handles very short maxLength', () => {
    const result = truncateText('Hello', 2);
    expect(result).toHaveLength(2);
    expect(result.endsWith('\u2026')).toBe(true);
  });

  it('truncates long text correctly', () => {
    const longText = 'This is a very long piece of text that needs to be truncated';
    const result = truncateText(longText, 20);
    expect(result).toHaveLength(20);
    expect(result.endsWith('\u2026')).toBe(true);
  });
});
