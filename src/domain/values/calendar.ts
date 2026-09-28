import type { Brand } from './brand';

/**
 * Convention: a financial date that means "a calendar day" (transaction
 * date, deadline, startDate, ...) is a date-only string `YYYY-MM-DD` with
 * no time zone. Because the format is fixed-width and zero-padded,
 * lexicographic string comparison equals chronological comparison.
 */
export type CalendarDate = Brand<string, 'CalendarDate'>;

/**
 * Convention: a financial period is a month string `YYYY-MM`.
 */
export type Month = Brand<string, 'Month'>;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function isCalendarDate(value: unknown): value is CalendarDate {
  if (typeof value !== 'string') return false;
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return (
    month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
  );
}

export function asCalendarDate(value: string): CalendarDate {
  if (!isCalendarDate(value)) {
    throw new RangeError(
      `Invalid calendar date (expected YYYY-MM-DD): ${value}`,
    );
  }
  return value;
}

export function isMonth(value: unknown): value is Month {
  if (typeof value !== 'string') return false;
  const match = MONTH_PATTERN.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

export function asMonth(value: string): Month {
  if (!isMonth(value)) {
    throw new RangeError(`Invalid month (expected YYYY-MM): ${value}`);
  }
  return value;
}

/** The month a calendar day belongs to. */
export function monthOf(date: CalendarDate): Month {
  return asMonth(date.slice(0, 7));
}

/** Chronological comparison of two calendar days: -1, 0 or 1. */
export function compareCalendarDates(
  a: CalendarDate,
  b: CalendarDate,
): -1 | 0 | 1 {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
