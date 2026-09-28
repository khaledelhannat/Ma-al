import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PIASTRES_PER_EGP,
  addMoney,
  asCalendarDate,
  asId,
  asMoney,
  asMonth,
  asTimestamp,
  compareCalendarDates,
  isCalendarDate,
  isId,
  isMonth,
  isTimestamp,
  monthOf,
  newId,
  subtractMoney,
  timestampFromDate,
} from '..';

describe('Money (integer piastres)', () => {
  it('represents 1,250.00 EGP as 125,000 piastres', () => {
    expect(asMoney(1250 * PIASTRES_PER_EGP)).toBe(125_000);
  });

  it('rejects fractional, non-finite and unsafe numbers', () => {
    expect(() => asMoney(12.5)).toThrow(RangeError);
    expect(() => asMoney(Number.NaN)).toThrow(RangeError);
    expect(() => asMoney(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => asMoney(2 ** 53)).toThrow(RangeError);
  });

  it('allows negative values (a type-level fact; positivity is a validation rule)', () => {
    expect(asMoney(-500)).toBe(-500);
  });

  it('adds and subtracts exactly, where floating-point pounds would drift', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(addMoney(asMoney(10), asMoney(20))).toBe(30);
    expect(subtractMoney(asMoney(10), asMoney(20))).toBe(-10);
  });

  it('refuses arithmetic that would leave the safe-integer range', () => {
    expect(() =>
      addMoney(asMoney(Number.MAX_SAFE_INTEGER), asMoney(1)),
    ).toThrow(RangeError);
  });
});

describe('Ids', () => {
  it('accepts UUID strings and rejects everything else', () => {
    expect(isId('00000000-0000-4000-8000-000000000001')).toBe(true);
    expect(isId('not-a-uuid')).toBe(false);
    expect(isId('')).toBe(false);
    expect(isId(42)).toBe(false);
    expect(() => asId('food')).toThrow(RangeError);
  });

  it('generates unique, well-formed v4 UUIDs', () => {
    const generated = new Set(
      Array.from({ length: 1000 }, () => newId<'Asset'>()),
    );
    expect(generated.size).toBe(1000);
    for (const id of generated) {
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    }
  });

  describe('outside a secure context (no crypto.randomUUID)', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('still generates ids via getRandomValues', () => {
      vi.stubGlobal('crypto', {
        getRandomValues: globalThis.crypto.getRandomValues.bind(
          globalThis.crypto,
        ),
      });
      expect(isId(newId<'Asset'>())).toBe(true);
    });
  });
});

describe('Calendar dates (YYYY-MM-DD)', () => {
  it('accepts real dates, including leap days', () => {
    expect(isCalendarDate('2026-09-10')).toBe(true);
    expect(isCalendarDate('2028-02-29')).toBe(true);
    expect(isCalendarDate('2000-02-29')).toBe(true);
  });

  it('rejects impossible dates and non-canonical shapes', () => {
    expect(isCalendarDate('2026-02-29')).toBe(false); // not a leap year
    expect(isCalendarDate('1900-02-29')).toBe(false); // century, not leap
    expect(isCalendarDate('2026-02-30')).toBe(false);
    expect(isCalendarDate('2026-13-01')).toBe(false);
    expect(isCalendarDate('2026-00-10')).toBe(false);
    expect(isCalendarDate('2026-09-00')).toBe(false);
    expect(isCalendarDate('2026-9-1')).toBe(false);
    expect(isCalendarDate('2026-09-10T00:00:00.000Z')).toBe(false);
    expect(isCalendarDate(20260910)).toBe(false);
    expect(() => asCalendarDate('10/09/2026')).toThrow(RangeError);
  });

  it('orders chronologically', () => {
    const early = asCalendarDate('2026-09-09');
    const late = asCalendarDate('2026-10-01');
    expect(compareCalendarDates(early, late)).toBe(-1);
    expect(compareCalendarDates(late, early)).toBe(1);
    expect(compareCalendarDates(early, early)).toBe(0);
  });

  it('derives the month a day belongs to', () => {
    expect(monthOf(asCalendarDate('2026-09-30'))).toBe('2026-09');
  });
});

describe('Months (YYYY-MM)', () => {
  it('accepts 01-12 and rejects the rest', () => {
    expect(isMonth('2026-09')).toBe(true);
    expect(isMonth('2026-12')).toBe(true);
    expect(isMonth('2026-13')).toBe(false);
    expect(isMonth('2026-00')).toBe(false);
    expect(isMonth('2026-9')).toBe(false);
    expect(isMonth('2026-09-01')).toBe(false);
    expect(() => asMonth('September')).toThrow(RangeError);
  });
});

describe('Timestamps (canonical UTC ISO 8601)', () => {
  it('accepts exactly what toISOString produces', () => {
    const iso = new Date(Date.UTC(2026, 8, 10, 12, 30, 15, 123)).toISOString();
    expect(isTimestamp(iso)).toBe(true);
    expect(timestampFromDate(new Date(iso))).toBe(iso);
  });

  it('rejects offsets, missing milliseconds and date-only values', () => {
    expect(isTimestamp('2026-09-10T12:00:00.000+02:00')).toBe(false);
    expect(isTimestamp('2026-09-10T12:00:00Z')).toBe(false);
    expect(isTimestamp('2026-09-10')).toBe(false);
    expect(isTimestamp('2026-02-30T12:00:00.000Z')).toBe(false);
    expect(() => asTimestamp('yesterday')).toThrow(RangeError);
  });
});
