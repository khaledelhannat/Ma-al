import { describe, expect, it } from 'vitest';
import {
  asCalendarDate,
  asMoney,
  validateAsset,
  validateGoldHoldingHistory,
  validateGoldHoldingRecord,
  validateGoldHoldingReferences,
  validateGoldPriceRecord,
} from '..';
import type { Asset, GoldAsset } from '..';
import {
  assetLookup,
  buildAsset,
  buildGoldAsset,
  buildGoldHolding,
  buildGoldPrice,
  ids,
  untyped,
} from '../test-support/builders';
import { codes } from '../test-support/codes';

describe('validateAsset', () => {
  it('accepts valid non-gold and gold assets', () => {
    expect(validateAsset(buildAsset())).toEqual([]);
    expect(validateAsset(buildGoldAsset())).toEqual([]);
  });

  it('allows a negative opening balance (e.g. an overdrawn account)', () => {
    expect(
      validateAsset(buildAsset({ openingBalance: asMoney(-100_000) })),
    ).toEqual([]);
  });

  it('rejects a fractional opening balance', () => {
    const bad = buildAsset({ openingBalance: untyped(10.5) });
    expect(codes(validateAsset(bad))).toEqual(['INVALID_MONEY']);
  });

  it('requires a real openingBalanceDate', () => {
    const bad = buildAsset({ openingBalanceDate: untyped('2026-02-30') });
    expect(codes(validateAsset(bad))).toEqual(['INVALID_DATE']);
  });

  it('requires a valid asset type and liquidity', () => {
    const bad = untyped<Asset>({
      ...buildAsset(),
      type: 'crypto',
      liquidity: 'sort-of',
    });
    expect(codes(validateAsset(bad))).toEqual([
      'INVALID_ENUM_VALUE',
      'INVALID_ENUM_VALUE',
    ]);
  });

  describe('gold-specific data only applies to gold assets', () => {
    it('rejects a karat on a non-gold asset', () => {
      const bad = untyped<Asset>({ ...buildAsset(), karat: 21 });
      expect(codes(validateAsset(bad))).toEqual([
        'GOLD_DATA_ON_NON_GOLD_ASSET',
      ]);
    });

    it('requires a karat on a gold asset', () => {
      const bad = untyped<GoldAsset>({ ...buildGoldAsset(), karat: undefined });
      expect(codes(validateAsset(bad))).toEqual(['INVALID_KARAT']);
    });

    it.each([0, 25, 21.5, Number.NaN])('rejects karat %s', (karat) => {
      expect(codes(validateAsset(buildGoldAsset({ karat })))).toEqual([
        'INVALID_KARAT',
      ]);
    });
  });
});

describe('validateGoldPriceRecord', () => {
  it('accepts a valid record', () => {
    expect(validateGoldPriceRecord(buildGoldPrice())).toEqual([]);
  });

  it('rejects a negative price', () => {
    const result = validateGoldPriceRecord(
      buildGoldPrice({ pricePerGram: asMoney(-1) }),
    );
    expect(codes(result)).toEqual(['INVALID_GOLD_PRICE']);
  });

  it('rejects a fractional piastre price', () => {
    const bad = buildGoldPrice({ pricePerGram: untyped(450_050.5) });
    expect(codes(validateGoldPriceRecord(bad))).toEqual(['INVALID_GOLD_PRICE']);
  });

  it('requires a valid karat and effective date', () => {
    const bad = buildGoldPrice({
      karat: 30,
      effectiveDate: untyped('2026-13-01'),
    });
    expect(codes(validateGoldPriceRecord(bad))).toEqual([
      'INVALID_KARAT',
      'INVALID_DATE',
    ]);
  });
});

describe('validateGoldHoldingRecord', () => {
  it('accepts fractional grams, an open record and a closed record', () => {
    expect(
      validateGoldHoldingRecord(buildGoldHolding({ weightGrams: 12.75 })),
    ).toEqual([]);
    expect(
      validateGoldHoldingRecord(
        buildGoldHolding({ endDate: asCalendarDate('2026-06-01') }),
      ),
    ).toEqual([]);
  });

  it('allows zero weight (everything sold) but not negative weight', () => {
    expect(
      validateGoldHoldingRecord(buildGoldHolding({ weightGrams: 0 })),
    ).toEqual([]);
    const result = validateGoldHoldingRecord(
      buildGoldHolding({ weightGrams: -0.5 }),
    );
    expect(codes(result)).toEqual(['INVALID_GOLD_WEIGHT']);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects weight %s',
    (weightGrams) => {
      const result = validateGoldHoldingRecord(
        buildGoldHolding({ weightGrams }),
      );
      expect(codes(result)).toEqual(['INVALID_GOLD_WEIGHT']);
    },
  );

  it('requires endDate to be strictly after startDate', () => {
    const same = buildGoldHolding({
      startDate: asCalendarDate('2026-06-01'),
      endDate: asCalendarDate('2026-06-01'),
    });
    const before = buildGoldHolding({
      startDate: asCalendarDate('2026-06-01'),
      endDate: asCalendarDate('2026-05-31'),
    });
    expect(codes(validateGoldHoldingRecord(same))).toEqual([
      'DATE_RANGE_INVALID',
    ]);
    expect(codes(validateGoldHoldingRecord(before))).toEqual([
      'DATE_RANGE_INVALID',
    ]);
  });
});

describe('validateGoldHoldingReferences', () => {
  it('accepts holdings of a gold asset', () => {
    const refs = { assets: assetLookup(buildGoldAsset()) };
    expect(validateGoldHoldingReferences(buildGoldHolding(), refs)).toEqual([]);
  });

  it('rejects holdings of a non-gold asset', () => {
    const refs = { assets: assetLookup(buildAsset()) };
    const result = validateGoldHoldingReferences(
      buildGoldHolding({ assetId: ids.bank }),
      refs,
    );
    expect(codes(result)).toEqual(['ASSET_NOT_GOLD']);
  });

  it('rejects holdings of a missing asset', () => {
    const result = validateGoldHoldingReferences(buildGoldHolding(), {
      assets: assetLookup(),
    });
    expect(codes(result)).toEqual(['ASSET_NOT_FOUND']);
  });
});

describe('validateGoldHoldingHistory', () => {
  const d = asCalendarDate;

  it('accepts close-and-open on the same day (half-open intervals do not overlap)', () => {
    const history = [
      buildGoldHolding({
        startDate: d('2026-01-01'),
        endDate: d('2026-10-01'),
        weightGrams: 20,
      }),
      buildGoldHolding({ startDate: d('2026-10-01'), weightGrams: 15 }),
    ];
    expect(validateGoldHoldingHistory(history)).toEqual([]);
  });

  it('rejects a new record opened while the previous one is still open', () => {
    const history = [
      buildGoldHolding({ startDate: d('2026-01-01'), weightGrams: 20 }),
      buildGoldHolding({ startDate: d('2026-10-01'), weightGrams: 15 }),
    ];
    expect(codes(validateGoldHoldingHistory(history))).toEqual([
      'OVERLAPPING_GOLD_HOLDINGS',
    ]);
  });

  it('rejects overlapping closed intervals regardless of input order', () => {
    const history = [
      buildGoldHolding({
        startDate: d('2026-06-01'),
        endDate: d('2026-12-01'),
      }),
      buildGoldHolding({
        startDate: d('2026-01-01'),
        endDate: d('2026-07-01'),
      }),
    ];
    expect(codes(validateGoldHoldingHistory(history))).toEqual([
      'OVERLAPPING_GOLD_HOLDINGS',
    ]);
  });

  it('checks each asset independently', () => {
    const otherGold = buildGoldAsset({ id: ids.cash });
    const history = [
      buildGoldHolding({ startDate: d('2026-01-01') }),
      buildGoldHolding({ assetId: otherGold.id, startDate: d('2026-01-01') }),
    ];
    expect(validateGoldHoldingHistory(history)).toEqual([]);
  });
});
