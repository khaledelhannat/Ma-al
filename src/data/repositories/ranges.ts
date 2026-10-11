import Dexie from 'dexie';
import type { CalendarDate, Month } from '../../domain';

/** Inclusive on both ends; an omitted bound is open. */
export interface DateRange {
  readonly from?: CalendarDate;
  readonly to?: CalendarDate;
}

/**
 * Bounds of a month as plain strings. `YYYY-MM-31` is not always a real day,
 * but it is a correct inclusive upper bound for string comparison: every real
 * day of the month sorts between `-01` and `-31`, and no other month does.
 */
export function monthBounds(month: Month): { from: string; to: string } {
  return { from: `${month}-01`, to: `${month}-31` };
}

export function lowerKey(from: string | undefined) {
  return from ?? Dexie.minKey;
}

export function upperKey(to: string | undefined) {
  return to ?? Dexie.maxKey;
}

export function inRange(date: string, range: DateRange | undefined): boolean {
  if (range?.from !== undefined && date < range.from) return false;
  if (range?.to !== undefined && date > range.to) return false;
  return true;
}

/** Deterministic ordering helper: by key, then by id. */
export function byKeyThenId<T extends { id: string }>(
  key: (value: T) => string,
) {
  return (a: T, b: T) => {
    const ka = key(a);
    const kb = key(b);
    if (ka !== kb) return ka < kb ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  };
}
