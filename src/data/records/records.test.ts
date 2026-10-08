// @vitest-environment node
import {
  asCalendarDate,
  asId,
  asMoney,
  asMonth,
  asTimestamp,
  createDefaultSettings,
} from '../../domain';
import {
  buildAllocation,
  buildAsset,
  buildBudget,
  buildCategory,
  buildExpense,
  buildGoal,
  buildGoldAsset,
  buildGoldHolding,
  buildGoldPrice,
  buildIncome,
  buildRecurringRule,
  buildSnapshot,
  buildTransfer,
  buildWishlistItem,
  ids,
} from '../../domain/test-support/builders';
import {
  fromAllocationRecord,
  fromAssetRecord,
  fromBudgetRecord,
  fromCategoryRecord,
  fromGoalRecord,
  fromGoldHoldingRecord,
  fromGoldPriceRecord,
  fromMonthlySnapshotRecord,
  fromRecurringRuleRecord,
  fromSettingsRecord,
  fromTransactionRecord,
  fromWishlistItemRecord,
  toAllocationRecord,
  toAssetRecord,
  toBudgetRecord,
  toCategoryRecord,
  toGoalRecord,
  toGoldHoldingRecord,
  toGoldPriceRecord,
  toMonthlySnapshotRecord,
  toRecurringRuleRecord,
  toSettingsRecord,
  toTransactionRecord,
  toWishlistItemRecord,
} from '.';

describe('transaction records', () => {
  it('round-trips income and expense', () => {
    for (const tx of [buildIncome(), buildExpense()]) {
      expect(fromTransactionRecord(toTransactionRecord(tx))).toStrictEqual(tx);
    }
  });

  it('round-trips a transfer, storing categoryId as null and indexing both assets', () => {
    const tx = buildTransfer();
    const record = toTransactionRecord(tx);
    expect(record.categoryId).toBeNull();
    expect(record.assetIds).toEqual([ids.bank, ids.cash]);
    const back = fromTransactionRecord(record);
    expect(back).toStrictEqual(tx);
    expect('categoryId' in back).toBe(false);
    expect('assetId' in back).toBe(false);
  });

  it('indexes the single asset of income/expense', () => {
    expect(toTransactionRecord(buildExpense()).assetIds).toEqual([ids.bank]);
  });

  it('keeps optional back-references and omits them when absent', () => {
    const plain = toTransactionRecord(buildExpense());
    expect('sourceWishlistItemId' in plain).toBe(false);
    expect('recurringRuleId' in plain).toBe(false);

    const linked = buildExpense({
      sourceWishlistItemId: asId<'WishlistItem'>(
        '00000000-0000-4000-8000-0000000000b1',
      ),
      recurringRuleId: asId<'RecurringRule'>(
        '00000000-0000-4000-8000-0000000000b2',
      ),
    });
    expect(fromTransactionRecord(toTransactionRecord(linked))).toStrictEqual(
      linked,
    );
  });

  it('preserves transfer paymentMethod when present', () => {
    const tx = buildTransfer({ paymentMethod: 'ATM' });
    expect(fromTransactionRecord(toTransactionRecord(tx))).toStrictEqual(tx);
  });

  it('preserves Money exactly, including extremes and values float math would break', () => {
    for (const piastres of [
      1,
      10,
      29,
      1_999_999_999_999,
      Number.MAX_SAFE_INTEGER,
    ]) {
      const tx = buildExpense({ amount: asMoney(piastres) });
      const record = toTransactionRecord(tx);
      expect(record.amount).toBe(piastres);
      expect(Number.isInteger(record.amount)).toBe(true);
      expect(fromTransactionRecord(record).amount).toBe(piastres);
    }
  });

  it('stores dates and timestamps in their canonical string form', () => {
    const record = toTransactionRecord(buildExpense());
    expect(record.date).toBe('2026-09-10');
    expect(record.createdAt).toBe('2026-09-01T10:00:00.000Z');
    expect(typeof record.date).toBe('string');
  });

  it('rejects an unknown type and malformed values as corrupt data', () => {
    const record = toTransactionRecord(buildExpense());
    const refund = { ...record, type: 'refund' };
    expect(() =>
      fromTransactionRecord(refund as unknown as typeof record),
    ).toThrow(RangeError);
    expect(() => fromTransactionRecord({ ...record, amount: 1.5 })).toThrow(
      RangeError,
    );
    expect(() =>
      fromTransactionRecord({ ...record, date: '2026-02-30' }),
    ).toThrow(RangeError);
    expect(() => fromTransactionRecord({ ...record, id: 'nope' })).toThrow(
      RangeError,
    );
  });
});

describe('category records', () => {
  it('round-trips, storing archived as 0/1 and omitting an absent parent', () => {
    const root = buildCategory();
    const rootRecord = toCategoryRecord(root);
    expect(rootRecord.archived).toBe(0);
    expect('parentId' in rootRecord).toBe(false);
    expect(fromCategoryRecord(rootRecord)).toStrictEqual(root);

    const child = buildCategory({
      id: asId<'Category'>('00000000-0000-4000-8000-0000000000c9'),
      parentId: ids.food,
      archived: true,
    });
    const childRecord = toCategoryRecord(child);
    expect(childRecord.archived).toBe(1);
    expect(fromCategoryRecord(childRecord)).toStrictEqual(child);
  });

  it('rejects an invalid archived flag', () => {
    const record = toCategoryRecord(buildCategory());
    expect(() => fromCategoryRecord({ ...record, archived: 2 as 0 })).toThrow(
      RangeError,
    );
  });
});

describe('asset records', () => {
  it('round-trips a non-gold asset without a karat key', () => {
    const asset = buildAsset();
    const record = toAssetRecord(asset);
    expect('karat' in record).toBe(false);
    expect(fromAssetRecord(record)).toStrictEqual(asset);
  });

  it('round-trips a gold asset with its karat', () => {
    const asset = buildGoldAsset({ karat: 18 });
    const back = fromAssetRecord(toAssetRecord(asset));
    expect(back).toStrictEqual(asset);
    expect(back.type === 'gold' && back.karat).toBe(18);
  });

  it('rejects a gold record without a karat', () => {
    const record = toAssetRecord(buildGoldAsset());
    delete record.karat;
    expect(() => fromAssetRecord(record)).toThrow(RangeError);
  });

  it('preserves a zero opening balance and a past date', () => {
    const asset = buildAsset({
      openingBalance: asMoney(0),
      openingBalanceDate: asCalendarDate('2024-02-29'),
    });
    expect(fromAssetRecord(toAssetRecord(asset))).toStrictEqual(asset);
  });
});

describe('gold records', () => {
  it('round-trips a price record with exact piastres per gram', () => {
    const price = buildGoldPrice({ pricePerGram: asMoney(450_050) });
    const record = toGoldPriceRecord(price);
    expect(record.pricePerGram).toBe(450_050);
    expect(fromGoldPriceRecord(record)).toStrictEqual(price);
  });

  it('round-trips open and closed holdings, with fractional weight', () => {
    const open = buildGoldHolding({ weightGrams: 12.375 });
    const closed = buildGoldHolding({
      weightGrams: 0,
      endDate: asCalendarDate('2026-10-01'),
    });
    const openRecord = toGoldHoldingRecord(open);
    expect('endDate' in openRecord).toBe(false);
    expect(fromGoldHoldingRecord(openRecord)).toStrictEqual(open);
    expect(fromGoldHoldingRecord(toGoldHoldingRecord(closed))).toStrictEqual(
      closed,
    );
  });
});

describe('allocation records', () => {
  it('round-trips with and without goal and endDate', () => {
    const bare = buildAllocation();
    const bareRecord = toAllocationRecord(bare);
    expect('goalId' in bareRecord).toBe(false);
    expect('endDate' in bareRecord).toBe(false);
    expect(fromAllocationRecord(bareRecord)).toStrictEqual(bare);

    const full = buildAllocation({
      goalId: ids.goal,
      endDate: asCalendarDate('2026-10-10'),
    });
    expect(fromAllocationRecord(toAllocationRecord(full))).toStrictEqual(full);
  });
});

describe('goal, wishlist and budget records', () => {
  it('round-trips a goal', () => {
    const goal = buildGoal();
    expect(fromGoalRecord(toGoalRecord(goal))).toStrictEqual(goal);
  });

  it('round-trips a wishlist item with and without a category', () => {
    const plain = buildWishlistItem();
    expect('categoryId' in toWishlistItemRecord(plain)).toBe(false);
    expect(fromWishlistItemRecord(toWishlistItemRecord(plain))).toStrictEqual(
      plain,
    );
    const categorized = buildWishlistItem({
      categoryId: ids.food,
      status: 'purchased',
    });
    expect(
      fromWishlistItemRecord(toWishlistItemRecord(categorized)),
    ).toStrictEqual(categorized);
  });

  it('round-trips a budget and keeps the month canonical', () => {
    const budget = buildBudget({ month: asMonth('2027-01') });
    const record = toBudgetRecord(budget);
    expect(record.month).toBe('2027-01');
    expect(fromBudgetRecord(record)).toStrictEqual(budget);
  });
});

describe('monthly snapshot records', () => {
  it('round-trips, storing dirty as 0/1', () => {
    const snapshot = buildSnapshot();
    const record = toMonthlySnapshotRecord(snapshot);
    expect(record.dirty).toBe(0);
    expect(fromMonthlySnapshotRecord(record)).toStrictEqual(snapshot);
    expect(toMonthlySnapshotRecord({ ...snapshot, dirty: true }).dirty).toBe(1);
  });

  it('keeps a null savingsRate, negative savings and nested entries', () => {
    const base = buildSnapshot();
    const snapshot = {
      ...base,
      data: {
        ...base.data,
        savings: asMoney(-250_000),
        savingsRate: null,
        categoryBreakdown: [
          {
            categoryId: ids.food,
            type: 'expense' as const,
            total: asMoney(900_000),
          },
        ],
        goalProgressSummary: [
          {
            goalId: ids.goal,
            fundedAmount: asMoney(100),
            progressRatio: 1,
            status: 'fullyFunded' as const,
          },
        ],
      },
    };
    const back = fromMonthlySnapshotRecord(toMonthlySnapshotRecord(snapshot));
    expect(back).toStrictEqual(snapshot);
    expect(back.data.savingsRate).toBeNull();
  });

  it('rejects an unknown goal status', () => {
    const base = buildSnapshot();
    const record = toMonthlySnapshotRecord({
      ...base,
      data: {
        ...base.data,
        goalProgressSummary: [
          {
            goalId: ids.goal,
            fundedAmount: asMoney(1),
            progressRatio: 0.1,
            status: 'onTrack',
          },
        ],
      },
    });
    const bad = record.data.goalProgressSummary[0];
    if (bad) bad.status = 'winning';
    expect(() => fromMonthlySnapshotRecord(record)).toThrow(RangeError);
  });
});

describe('recurring rule records', () => {
  it('round-trips an income template and stores active as 0/1', () => {
    const rule = buildRecurringRule();
    const record = toRecurringRuleRecord(rule);
    expect(record.active).toBe(1);
    expect(fromRecurringRuleRecord(record)).toStrictEqual(rule);
  });

  it('round-trips expense and transfer templates', () => {
    const expense = buildRecurringRule({
      transactionTemplate: {
        type: 'expense',
        amount: asMoney(99_900),
        categoryId: ids.food,
        assetId: ids.bank,
        description: 'Gym',
        paymentMethod: 'card',
      },
      active: false,
      frequency: 'yearly',
    });
    expect(
      fromRecurringRuleRecord(toRecurringRuleRecord(expense)),
    ).toStrictEqual(expense);

    const transfer = buildRecurringRule({
      transactionTemplate: {
        type: 'transfer',
        amount: asMoney(500_000),
        sourceAssetId: ids.bank,
        destinationAssetId: ids.cash,
        description: 'Monthly top-up',
      },
    });
    const record = toRecurringRuleRecord(transfer);
    expect('categoryId' in record.transactionTemplate).toBe(false);
    expect(fromRecurringRuleRecord(record)).toStrictEqual(transfer);
  });
});

describe('settings records', () => {
  it('round-trips under the singleton key', () => {
    const settings = createDefaultSettings();
    const record = toSettingsRecord(settings);
    expect(record.key).toBe('app');
    expect(fromSettingsRecord(record)).toStrictEqual(settings);
  });

  it('rejects a non-EGP currency', () => {
    const record = toSettingsRecord(createDefaultSettings());
    expect(() =>
      fromSettingsRecord({ ...record, baseCurrency: 'USD' }),
    ).toThrow(RangeError);
  });
});

it('timestamps survive as exact strings', () => {
  const ts = asTimestamp('2026-12-31T23:59:59.999Z');
  const tx = buildExpense({ createdAt: ts, updatedAt: ts });
  const back = fromTransactionRecord(toTransactionRecord(tx));
  expect(back.createdAt).toBe('2026-12-31T23:59:59.999Z');
});
