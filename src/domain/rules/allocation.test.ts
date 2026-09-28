import { describe, expect, it } from 'vitest';
import {
  asCalendarDate,
  asMoney,
  isActiveOn,
  validateAllocation,
  validateAllocationReferences,
} from '..';
import {
  assetLookup,
  buildAllocation,
  buildAsset,
  buildGoal,
  ids,
} from '../test-support/builders';
import { codes } from '../test-support/codes';

const d = asCalendarDate;

describe('validateAllocation', () => {
  it('accepts an allocation with no goal (e.g. an emergency reserve)', () => {
    expect(validateAllocation(buildAllocation())).toEqual([]);
  });

  it('accepts an allocation linked to a goal, open or closed', () => {
    expect(validateAllocation(buildAllocation({ goalId: ids.goal }))).toEqual(
      [],
    );
    expect(
      validateAllocation(buildAllocation({ endDate: d('2026-10-10') })),
    ).toEqual([]);
  });

  it('requires a positive amount', () => {
    expect(
      codes(validateAllocation(buildAllocation({ amount: asMoney(0) }))),
    ).toEqual(['AMOUNT_NOT_POSITIVE']);
    expect(
      codes(validateAllocation(buildAllocation({ amount: asMoney(-5) }))),
    ).toEqual(['AMOUNT_NOT_POSITIVE']);
  });

  it('requires a meaningful reason', () => {
    expect(
      codes(validateAllocation(buildAllocation({ reason: '   ' }))),
    ).toEqual(['BLANK_TEXT']);
  });

  it('rejects endDate on or before startDate', () => {
    const sameDay = buildAllocation({
      startDate: d('2026-09-01'),
      endDate: d('2026-09-01'),
    });
    const before = buildAllocation({
      startDate: d('2026-09-01'),
      endDate: d('2026-08-01'),
    });
    expect(codes(validateAllocation(sameDay))).toEqual(['DATE_RANGE_INVALID']);
    expect(codes(validateAllocation(before))).toEqual(['DATE_RANGE_INVALID']);
  });
});

describe('validateAllocationReferences', () => {
  it('accepts an existing asset and goal', () => {
    const result = validateAllocationReferences(
      buildAllocation({ goalId: ids.goal }),
      {
        assets: assetLookup(buildAsset()),
        goals: (id) => (id === ids.goal ? buildGoal() : undefined),
      },
    );
    expect(result).toEqual([]);
  });

  it('rejects a missing asset and a missing goal', () => {
    const result = validateAllocationReferences(
      buildAllocation({ goalId: ids.goal }),
      {
        assets: assetLookup(),
        goals: () => undefined,
      },
    );
    expect(codes(result)).toEqual(['ASSET_NOT_FOUND', 'GOAL_NOT_FOUND']);
  });
});

describe('isActiveOn: the [startDate, endDate) interval', () => {
  const closed = buildAllocation({
    startDate: d('2026-09-01'),
    endDate: d('2026-10-10'),
  });

  it('is active on its startDate', () => {
    expect(isActiveOn(closed, d('2026-09-01'))).toBe(true);
  });

  it('is active the day before its endDate', () => {
    expect(isActiveOn(closed, d('2026-10-09'))).toBe(true);
  });

  it('is NOT active on its endDate', () => {
    expect(isActiveOn(closed, d('2026-10-10'))).toBe(false);
  });

  it('is not active before its startDate', () => {
    expect(isActiveOn(closed, d('2026-08-31'))).toBe(false);
  });

  it('an open record is active from startDate onward, indefinitely', () => {
    const open = buildAllocation({ startDate: d('2026-10-10') });
    expect(isActiveOn(open, d('2026-10-09'))).toBe(false);
    expect(isActiveOn(open, d('2026-10-10'))).toBe(true);
    expect(isActiveOn(open, d('2099-01-01'))).toBe(true);
  });

  it('on a move day exactly one of the closed/opened records covers the date', () => {
    // Step 0 example: Sep 1 - Oct 10 closed; Oct 10 - open opened.
    const oldRecord = buildAllocation({
      startDate: d('2026-09-01'),
      endDate: d('2026-10-10'),
    });
    const newRecord = buildAllocation({ startDate: d('2026-10-10') });
    const moveDay = d('2026-10-10');
    expect([
      isActiveOn(oldRecord, moveDay),
      isActiveOn(newRecord, moveDay),
    ]).toEqual([false, true]);
  });
});
