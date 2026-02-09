/**
 * WS-AUDIT-2: ROI Reporting & Cross-Project Aggregation - Periodic Rollups
 *
 * Purpose: Aggregate audit entries into time-based periods (daily, weekly, monthly)
 * AC-1: --period=daily|weekly|monthly groups data into time buckets
 */

import type { TrackedAuditEntry } from './reader';
import type { WorkstreamSummary } from './aggregation';
import { aggregateByWorkstream } from './aggregation';

/**
 * Time period for rollups
 */
export type TimePeriod = 'daily' | 'weekly' | 'monthly';

/**
 * Time bucket for periodic aggregation
 */
export interface TimeBucket {
  period: TimePeriod;
  start_date: string; // ISO 8601 date (YYYY-MM-DD)
  end_date: string;   // ISO 8601 date (YYYY-MM-DD)
  label: string;      // Human-readable label
}

/**
 * Periodic workstream summary (extends WorkstreamSummary with time bucket)
 */
export interface PeriodicWorkstreamSummary extends WorkstreamSummary {
  time_bucket: TimeBucket;
}

/**
 * Validates that period is one of the allowed values.
 */
function validatePeriod(period: any): asserts period is TimePeriod {
  if (!period || typeof period !== 'string') {
    throw new Error('Invalid period: period must be a non-empty string');
  }

  const validPeriods: TimePeriod[] = ['daily', 'weekly', 'monthly'];
  if (!validPeriods.includes(period as TimePeriod)) {
    throw new Error(`Invalid period: ${period}. Must be one of: daily, weekly, monthly`);
  }
}

/**
 * Validates that entries is a valid array.
 */
function validateEntries(entries: any): asserts entries is TrackedAuditEntry[] {
  if (!Array.isArray(entries)) {
    throw new Error('Invalid entries: must be an array');
  }
}

/**
 * Validates that a date string is valid ISO 8601.
 */
function validateDateString(dateStr: string): void {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new Error('Invalid date: date must be a non-empty string');
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr} is not a valid date string`);
  }
}

/**
 * Gets ISO week number and year for a date (UTC).
 * ISO weeks start on Monday and week 1 contains the first Thursday of the year.
 *
 * Custom implementation (zero dependencies) per ARCH-001.
 * Algorithm: Find nearest Thursday, then calculate week number from Jan 4.
 */
function getISOWeek(date: Date): { year: number; week: number } {
  const target = new Date(date.valueOf());
  const dayNr = (date.getUTCDay() + 6) % 7; // Monday = 0, Sunday = 6
  target.setUTCDate(target.getUTCDate() - dayNr + 3); // Nearest Thursday
  const jan4 = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const dayDiff = (target.getTime() - jan4.getTime()) / 86400000;
  const weekNum = 1 + Math.ceil(dayDiff / 7);

  return {
    year: target.getUTCFullYear(),
    week: weekNum,
  };
}

/**
 * Gets the Monday of the ISO week for a given date (UTC).
 */
function getISOWeekStart(date: Date): Date {
  const target = new Date(date.valueOf());
  const dayNr = (date.getUTCDay() + 6) % 7; // Monday = 0, Sunday = 6
  target.setUTCDate(target.getUTCDate() - dayNr);
  target.setUTCHours(0, 0, 0, 0);
  return target;
}

/**
 * Gets the Sunday of the ISO week for a given date (UTC).
 */
function getISOWeekEnd(date: Date): Date {
  const target = new Date(date.valueOf());
  const dayNr = (date.getUTCDay() + 6) % 7; // Monday = 0, Sunday = 6
  target.setUTCDate(target.getUTCDate() - dayNr + 6);
  target.setUTCHours(23, 59, 59, 999);
  return target;
}

/**
 * Formats a date as YYYY-MM-DD in UTC.
 */
function formatDate(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets the time bucket for a given date and period.
 */
export function getTimeBucketForDate(dateStr: string, period: TimePeriod): TimeBucket {
  validatePeriod(period);
  validateDateString(dateStr);

  const date = new Date(dateStr);

  switch (period) {
    case 'daily': {
      const dayStart = new Date(date);
      dayStart.setUTCHours(0, 0, 0, 0);
      const startDate = formatDate(dayStart);

      return {
        period: 'daily',
        start_date: startDate,
        end_date: startDate,
        label: startDate,
      };
    }

    case 'weekly': {
      const weekStart = getISOWeekStart(date);
      const weekEnd = getISOWeekEnd(date);
      const { year, week } = getISOWeek(date);

      return {
        period: 'weekly',
        start_date: formatDate(weekStart),
        end_date: formatDate(weekEnd),
        label: `Week ${year}-W${String(week).padStart(2, '0')}`,
      };
    }

    case 'monthly': {
      const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
      const monthEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNames[date.getUTCMonth()];

      return {
        period: 'monthly',
        start_date: formatDate(monthStart),
        end_date: formatDate(monthEnd),
        label: `${monthName} ${date.getUTCFullYear()}`,
      };
    }

    default:
      throw new Error(`Invalid period: ${period}`);
  }
}

/**
 * Formats a time bucket label.
 */
export function formatTimeBucketLabel(
  startDate: string,
  endDate: string,
  period: TimePeriod
): string {
  validatePeriod(period);
  validateDateString(startDate);
  validateDateString(endDate);

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw new Error('Start date cannot be after end date');
  }

  switch (period) {
    case 'daily':
      return startDate;

    case 'weekly': {
      const { year, week } = getISOWeek(start);
      return `Week ${year}-W${String(week).padStart(2, '0')}`;
    }

    case 'monthly': {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNames[start.getUTCMonth()];
      return `${monthName} ${start.getUTCFullYear()}`;
    }

    default:
      throw new Error(`Invalid period: ${period}`);
  }
}

/**
 * Groups entries by time period.
 * Returns a map of bucket key -> entries.
 */
export function groupEntriesByPeriod(
  entries: TrackedAuditEntry[],
  period: TimePeriod
): Record<string, TrackedAuditEntry[]> {
  validatePeriod(period);
  validateEntries(entries);

  const groups: Record<string, TrackedAuditEntry[]> = {};

  for (const entry of entries) {
    // Skip entries with invalid timestamps
    if (!entry.timestamp || typeof entry.timestamp !== 'string') {
      continue;
    }

    try {
      const bucket = getTimeBucketForDate(entry.timestamp, period);
      const key = bucket.start_date;

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(entry);
    } catch (error) {
      // Skip entries with invalid dates
      continue;
    }
  }

  return groups;
}

/**
 * Aggregates entries by workstream within time periods.
 */
export function aggregateByWorkstreamPeriodic(
  entries: TrackedAuditEntry[],
  period: TimePeriod
): PeriodicWorkstreamSummary[] {
  validatePeriod(period);
  validateEntries(entries);

  // Group entries by time period
  const periodGroups = groupEntriesByPeriod(entries, period);

  const results: PeriodicWorkstreamSummary[] = [];

  // For each time period, aggregate by workstream
  for (const [bucketKey, periodEntries] of Object.entries(periodGroups)) {
    const summaries = aggregateByWorkstream(periodEntries);

    // Get the time bucket for the first entry in this period
    const firstEntry = periodEntries[0];
    const timeBucket = getTimeBucketForDate(firstEntry.timestamp, period);

    // Add time bucket to each workstream summary
    for (const summary of summaries) {
      results.push({
        ...summary,
        time_bucket: timeBucket,
      });
    }
  }

  return results;
}
