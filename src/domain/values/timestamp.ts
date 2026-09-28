import type { Brand } from './brand';

/**
 * Convention: an instant in time (createdAt, updatedAt, computedAt) is a
 * canonical UTC ISO 8601 string with millisecond precision, exactly the
 * output of `Date.prototype.toISOString()`: `YYYY-MM-DDTHH:mm:ss.sssZ`.
 * A single canonical form keeps string comparison chronological and makes
 * export/import byte-stable.
 */
export type Timestamp = Brand<string, 'Timestamp'>;

const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function isTimestamp(value: unknown): value is Timestamp {
  if (typeof value !== 'string' || !TIMESTAMP_PATTERN.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

export function asTimestamp(value: string): Timestamp {
  if (!isTimestamp(value)) {
    throw new RangeError(
      `Invalid timestamp (expected canonical UTC ISO 8601): ${value}`,
    );
  }
  return value;
}

/** Converts a Date instant to a canonical Timestamp. Pure given its input. */
export function timestampFromDate(date: Date): Timestamp {
  return asTimestamp(date.toISOString());
}
