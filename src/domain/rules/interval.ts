import { compareCalendarDates } from '../values';
import type { CalendarDate } from '../values';

/** Any record active over a half-open `[startDate, endDate)` interval. */
export interface DateInterval {
  readonly startDate: CalendarDate;
  readonly endDate?: CalendarDate;
}

/**
 * The single definition of "active on a date" for time-aware records
 * (Allocation, GoldHoldingRecord): active on startDate, INACTIVE on
 * endDate. An open interval (no endDate) is active from startDate onward.
 * This guarantees that when a record is closed and a successor opened on
 * the same day, exactly one of them covers that day.
 */
export function isActiveOn(
  interval: DateInterval,
  date: CalendarDate,
): boolean {
  if (compareCalendarDates(date, interval.startDate) < 0) return false;
  if (interval.endDate === undefined) return true;
  return compareCalendarDates(date, interval.endDate) < 0;
}
