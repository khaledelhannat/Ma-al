// @vitest-environment node
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
  buildRecurringRule,
  buildSnapshot,
  buildTransfer,
  buildWishlistItem,
  ids,
} from '../../domain/test-support/builders';
import { createDefaultSettings } from '../../domain';
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
import { RecordValidationError } from './validate';

/** A stored row with some fields overwritten by arbitrary (corrupt) values. */
function corrupt<T extends object>(row: T, patch: Record<string, unknown>): T {
  return Object.assign({}, row, patch);
}

function failure(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error('expected the mapper to reject the row');
}

/** Asserts the Step 2 validator (not a primitive check) rejected the row. */
function expectInvalid(run: () => unknown, ...paths: string[]) {
  const error = failure(run);
  expect(error).toBeInstanceOf(RecordValidationError);
  const issues = (error as RecordValidationError).issues.map((i) => i.path);
  for (const path of paths) expect(issues).toContain(path);
}

describe('stored rows that only the Step 2 validators can reject', () => {
  describe('Category', () => {
    const row = toCategoryRecord(buildCategory());
    it('rejects a non-boolean essential flag', () => {
      expectInvalid(
        () => fromCategoryRecord(corrupt(row, { essential: 'yes' })),
        'essential',
      );
    });
    it('rejects a blank name', () => {
      expectInvalid(
        () => fromCategoryRecord(corrupt(row, { name: '   ' })),
        'name',
      );
    });
    it('rejects a category that is its own parent', () => {
      expectInvalid(
        () => fromCategoryRecord(corrupt(row, { parentId: row.id })),
        'parentId',
      );
    });
  });

  describe('Transaction', () => {
    const expense = toTransactionRecord(buildExpense());
    it('rejects a blank paymentMethod', () => {
      expectInvalid(
        () => fromTransactionRecord(corrupt(expense, { paymentMethod: '' })),
        'paymentMethod',
      );
    });
    it('rejects a zero amount (amount is always positive)', () => {
      expectInvalid(
        () => fromTransactionRecord(corrupt(expense, { amount: 0 })),
        'amount',
      );
    });
    it('rejects updatedAt earlier than createdAt', () => {
      expectInvalid(
        () =>
          fromTransactionRecord(
            corrupt(expense, { updatedAt: '2026-08-01T00:00:00.000Z' }),
          ),
        'updatedAt',
      );
    });
    it('rejects a transfer from an asset to itself', () => {
      const transfer = toTransactionRecord(buildTransfer());
      expect(() =>
        fromTransactionRecord(
          corrupt(transfer, {
            destinationAssetId: ids.bank,
            sourceAssetId: ids.bank,
          }),
        ),
      ).toThrow(RecordValidationError);
    });
    it('rejects a transfer row that still carries an assetId or a category', () => {
      const transfer = toTransactionRecord(buildTransfer());
      expect(() =>
        fromTransactionRecord(corrupt(transfer, { assetId: ids.bank })),
      ).toThrow(RangeError);
      expect(() =>
        fromTransactionRecord(corrupt(transfer, { categoryId: ids.food })),
      ).toThrow(RangeError);
    });
    it('rejects an income/expense row that carries transfer-only fields', () => {
      expect(() =>
        fromTransactionRecord(corrupt(expense, { sourceAssetId: ids.cash })),
      ).toThrow(RangeError);
    });
    it('rejects a non-string description (Step 2 has no description rule)', () => {
      expect(() =>
        fromTransactionRecord(corrupt(expense, { description: 42 })),
      ).toThrow(RangeError);
    });
  });

  describe('Asset', () => {
    it('rejects a blank name and out-of-order timestamps', () => {
      const row = toAssetRecord(buildAsset());
      expectInvalid(() => fromAssetRecord(corrupt(row, { name: '' })), 'name');
      expectInvalid(
        () =>
          fromAssetRecord(
            corrupt(row, { updatedAt: '2020-01-01T00:00:00.000Z' }),
          ),
        'updatedAt',
      );
    });
    it('rejects an impossible karat on a gold asset', () => {
      const row = toAssetRecord(buildGoldAsset());
      expectInvalid(
        () => fromAssetRecord(corrupt(row, { karat: 25 })),
        'karat',
      );
      expectInvalid(
        () => fromAssetRecord(corrupt(row, { karat: 21.5 })),
        'karat',
      );
    });
    it('rejects a non-gold row carrying gold data instead of dropping it', () => {
      const row = toAssetRecord(buildAsset());
      expect(() => fromAssetRecord(corrupt(row, { karat: 21 }))).toThrow(
        RangeError,
      );
    });
  });

  describe('Allocation, Goal, Budget, Wishlist', () => {
    it('rejects a blank allocation reason, zero amount, and a non-forward interval', () => {
      const row = toAllocationRecord(buildAllocation());
      expectInvalid(
        () => fromAllocationRecord(corrupt(row, { reason: ' ' })),
        'reason',
      );
      expectInvalid(
        () => fromAllocationRecord(corrupt(row, { amount: 0 })),
        'amount',
      );
      expectInvalid(
        () => fromAllocationRecord(corrupt(row, { endDate: row.startDate })),
        'endDate',
      );
      expectInvalid(
        () => fromAllocationRecord(corrupt(row, { endDate: '2020-01-01' })),
        'endDate',
      );
    });
    it('rejects a goal with a zero target or blank name, and non-string notes', () => {
      const row = toGoalRecord(buildGoal());
      expectInvalid(
        () => fromGoalRecord(corrupt(row, { targetAmount: 0 })),
        'targetAmount',
      );
      expectInvalid(() => fromGoalRecord(corrupt(row, { name: '' })), 'name');
      expect(() => fromGoalRecord(corrupt(row, { notes: null }))).toThrow(
        RangeError,
      );
    });
    it('rejects a budget with a non-positive amount', () => {
      const row = toBudgetRecord(buildBudget());
      expect(() => fromBudgetRecord(corrupt(row, { amount: 0 }))).toThrow(
        RecordValidationError,
      );
    });
    it('rejects a wishlist item with a zero price, blank name, or non-string notes', () => {
      const row = toWishlistItemRecord(buildWishlistItem());
      expectInvalid(
        () => fromWishlistItemRecord(corrupt(row, { estimatedPrice: 0 })),
        'estimatedPrice',
      );
      expectInvalid(
        () => fromWishlistItemRecord(corrupt(row, { name: '' })),
        'name',
      );
      expect(() => fromWishlistItemRecord(corrupt(row, { notes: 7 }))).toThrow(
        RangeError,
      );
    });
  });

  describe('Gold records', () => {
    it('rejects a zero price and an impossible karat', () => {
      const row = toGoldPriceRecord(buildGoldPrice());
      expectInvalid(
        () => fromGoldPriceRecord(corrupt(row, { pricePerGram: 0 })),
        'pricePerGram',
      );
      expectInvalid(
        () => fromGoldPriceRecord(corrupt(row, { karat: 0 })),
        'karat',
      );
    });
    it('rejects a negative weight and a holding that ends before it starts', () => {
      const row = toGoldHoldingRecord(buildGoldHolding());
      expectInvalid(
        () => fromGoldHoldingRecord(corrupt(row, { weightGrams: -1 })),
        'weightGrams',
      );
      expectInvalid(
        () => fromGoldHoldingRecord(corrupt(row, { endDate: '2000-01-01' })),
        'endDate',
      );
    });
  });

  describe('RecurringRule (nested template)', () => {
    const row = toRecurringRuleRecord(buildRecurringRule());
    it('rejects an invalid field INSIDE the template, not just the outer rule', () => {
      const error = failure(() =>
        fromRecurringRuleRecord(
          corrupt(row, {
            transactionTemplate: { ...row.transactionTemplate, amount: 0 },
          }),
        ),
      );
      expect(error).toBeInstanceOf(RecordValidationError);
      expect(
        (error as RecordValidationError).issues.some((i) =>
          i.path.includes('amount'),
        ),
      ).toBe(true);
    });
    it('rejects a blank template paymentMethod', () => {
      expect(() =>
        fromRecurringRuleRecord(
          corrupt(row, {
            transactionTemplate: {
              ...row.transactionTemplate,
              paymentMethod: '',
            },
          }),
        ),
      ).toThrow(RecordValidationError);
    });
    it('rejects a transfer template that carries a category or asset', () => {
      const transfer = toRecurringRuleRecord(
        buildRecurringRule({
          transactionTemplate: {
            type: 'transfer',
            amount: buildExpense().amount,
            sourceAssetId: ids.bank,
            destinationAssetId: ids.cash,
            description: 'x',
          },
        }),
      );
      expect(() =>
        fromRecurringRuleRecord(
          corrupt(transfer, {
            transactionTemplate: {
              ...transfer.transactionTemplate,
              categoryId: ids.food,
            },
          }),
        ),
      ).toThrow(RangeError);
    });
  });

  describe('MonthlySnapshot (nested data)', () => {
    const row = toMonthlySnapshotRecord(buildSnapshot());
    it('rejects a missing data object', () => {
      expect(() =>
        fromMonthlySnapshotRecord(corrupt(row, { data: undefined })),
      ).toThrow(TypeError);
    });
    it('rejects non-array nested collections', () => {
      expect(() =>
        fromMonthlySnapshotRecord(
          corrupt(row, { data: { ...row.data, categoryBreakdown: 'none' } }),
        ),
      ).toThrow(RangeError);
    });
    it('rejects invalid nested ids, money and enum values', () => {
      const entry = { categoryId: 'nope', type: 'expense', total: 1 };
      expect(() =>
        fromMonthlySnapshotRecord(
          corrupt(row, { data: { ...row.data, categoryBreakdown: [entry] } }),
        ),
      ).toThrow(RangeError);
      expect(() =>
        fromMonthlySnapshotRecord(
          corrupt(row, { data: { ...row.data, income: 1.5 } }),
        ),
      ).toThrow(RangeError);
    });
    it('rejects an invalid dirty flag', () => {
      expect(() =>
        fromMonthlySnapshotRecord(corrupt(row, { dirty: true })),
      ).toThrow(RangeError);
    });
  });

  describe('Settings', () => {
    const row = toSettingsRecord(createDefaultSettings());
    it('rejects missing or invalid preferences', () => {
      expect(() =>
        fromSettingsRecord(corrupt(row, { defaultViews: undefined })),
      ).toThrow(TypeError);
      expect(() =>
        fromSettingsRecord(
          corrupt(row, { defaultViews: { startPage: 'nowhere' } }),
        ),
      ).toThrow(RangeError);
    });
  });

  it('accepts every valid row unchanged (the validators add no false positives)', () => {
    expect(fromCategoryRecord(toCategoryRecord(buildCategory()))).toStrictEqual(
      buildCategory(),
    );
  });
});
