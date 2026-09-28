import { describe, expect, it } from 'vitest';
import {
  asCalendarDate,
  asMoney,
  asTimestamp,
  validateTransaction,
  validateTransactionReferences,
} from '..';
import type { ExpenseTransaction, TransferTransaction } from '..';
import {
  assetLookup,
  buildAsset,
  buildCategory,
  buildExpense,
  buildIncome,
  buildTransfer,
  categoryLookup,
  ids,
  untyped,
} from '../test-support/builders';
import { codes } from '../test-support/codes';

describe('validateTransaction', () => {
  it('accepts a valid income, expense and transfer', () => {
    expect(validateTransaction(buildIncome())).toEqual([]);
    expect(validateTransaction(buildExpense())).toEqual([]);
    expect(validateTransaction(buildTransfer())).toEqual([]);
  });

  it('accepts a transfer without a payment method, and one with it', () => {
    expect(
      validateTransaction(buildTransfer({ paymentMethod: undefined })),
    ).toEqual([]);
    expect(
      validateTransaction(buildTransfer({ paymentMethod: 'instapay' })),
    ).toEqual([]);
  });

  describe('amount is always a positive whole number of piastres', () => {
    it('rejects zero', () => {
      const result = validateTransaction(buildExpense({ amount: asMoney(0) }));
      expect(codes(result)).toEqual(['AMOUNT_NOT_POSITIVE']);
    });

    it('rejects a negative amount (direction comes from type, not sign)', () => {
      const result = validateTransaction(
        buildIncome({ amount: asMoney(-100) }),
      );
      expect(codes(result)).toEqual(['AMOUNT_NOT_POSITIVE']);
    });

    it('rejects a fractional amount from untrusted data', () => {
      const bad = buildExpense({ amount: untyped(12.5) });
      expect(codes(validateTransaction(bad))).toEqual(['INVALID_MONEY']);
    });

    it('applies to transfers too', () => {
      const result = validateTransaction(buildTransfer({ amount: asMoney(0) }));
      expect(codes(result)).toEqual(['AMOUNT_NOT_POSITIVE']);
    });
  });

  describe('transfers', () => {
    it('requires two distinct assets', () => {
      const result = validateTransaction(
        buildTransfer({
          sourceAssetId: ids.bank,
          destinationAssetId: ids.bank,
        }),
      );
      expect(codes(result)).toEqual(['TRANSFER_SAME_ASSET']);
    });

    it('cannot contain a category, even if untyped data sneaks one in', () => {
      const bad = untyped<TransferTransaction>({
        ...buildTransfer(),
        categoryId: ids.food,
      });
      expect(codes(validateTransaction(bad))).toEqual([
        'TRANSFER_HAS_CATEGORY',
      ]);
    });

    it('cannot carry a single assetId', () => {
      const bad = untyped<TransferTransaction>({
        ...buildTransfer(),
        assetId: ids.bank,
      });
      expect(codes(validateTransaction(bad))).toEqual([
        'TRANSFER_HAS_ASSET_ID',
      ]);
    });

    it('treats a null category (how Step 0 describes it) as "no category"', () => {
      const fromStorage = untyped<TransferTransaction>({
        ...buildTransfer(),
        categoryId: null,
      });
      expect(validateTransaction(fromStorage)).toEqual([]);
    });
  });

  describe('income and expense', () => {
    it('cannot carry transfer endpoints', () => {
      const bad = untyped<ExpenseTransaction>({
        ...buildExpense(),
        sourceAssetId: ids.bank,
        destinationAssetId: ids.cash,
      });
      expect(codes(validateTransaction(bad))).toEqual([
        'TRANSACTION_HAS_TRANSFER_FIELDS',
      ]);
    });

    it('requires a category and asset', () => {
      const bad = untyped<ExpenseTransaction>({
        ...buildExpense(),
        categoryId: undefined,
        assetId: undefined,
      });
      expect(codes(validateTransaction(bad))).toEqual([
        'INVALID_ID',
        'INVALID_ID',
      ]);
    });

    it('requires a non-blank payment method', () => {
      const result = validateTransaction(buildExpense({ paymentMethod: '  ' }));
      expect(codes(result)).toEqual(['BLANK_TEXT']);
    });
  });

  it('rejects an unknown transaction type', () => {
    const bad = untyped<ExpenseTransaction>({
      ...buildExpense(),
      type: 'refund',
    });
    expect(codes(validateTransaction(bad))).toContain('INVALID_ENUM_VALUE');
  });

  describe('date and timestamp conventions', () => {
    it('rejects an impossible calendar date', () => {
      const bad = buildExpense({ date: untyped('2026-02-30') });
      expect(codes(validateTransaction(bad))).toEqual(['INVALID_DATE']);
    });

    it('rejects a date carrying a time', () => {
      const bad = buildExpense({ date: untyped('2026-09-10T10:00:00.000Z') });
      expect(codes(validateTransaction(bad))).toEqual(['INVALID_DATE']);
    });

    it('rejects a non-canonical createdAt', () => {
      const bad = buildExpense({ createdAt: untyped('2026-09-10 10:00') });
      expect(codes(validateTransaction(bad))).toContain('INVALID_TIMESTAMP');
    });

    it('rejects updatedAt earlier than createdAt', () => {
      const bad = buildExpense({
        createdAt: asTimestamp('2026-09-10T10:00:00.000Z'),
        updatedAt: asTimestamp('2026-09-09T10:00:00.000Z'),
      });
      expect(codes(validateTransaction(bad))).toEqual([
        'TIMESTAMPS_OUT_OF_ORDER',
      ]);
    });

    it('accepts a leap-day transaction date', () => {
      expect(
        validateTransaction(
          buildExpense({ date: asCalendarDate('2028-02-29') }),
        ),
      ).toEqual([]);
    });
  });
});

describe('validateTransactionReferences', () => {
  const bank = buildAsset();
  const cash = buildAsset({ id: ids.cash, name: 'Wallet', type: 'cash' });
  const food = buildCategory();
  const salary = buildCategory({
    id: ids.salary,
    name: 'Salary',
    type: 'income',
  });
  const refs = {
    assets: assetLookup(bank, cash),
    categories: categoryLookup(food, salary),
  };

  it('accepts matching category types and existing assets', () => {
    expect(validateTransactionReferences(buildExpense(), refs)).toEqual([]);
    expect(validateTransactionReferences(buildIncome(), refs)).toEqual([]);
    expect(validateTransactionReferences(buildTransfer(), refs)).toEqual([]);
  });

  it('rejects an expense in an income category', () => {
    const result = validateTransactionReferences(
      buildExpense({ categoryId: ids.salary }),
      refs,
    );
    expect(codes(result)).toEqual(['CATEGORY_TYPE_MISMATCH']);
  });

  it('rejects an income in an expense category', () => {
    const result = validateTransactionReferences(
      buildIncome({ categoryId: ids.food }),
      refs,
    );
    expect(codes(result)).toEqual(['CATEGORY_TYPE_MISMATCH']);
  });

  it('rejects unknown assets and categories', () => {
    const result = validateTransactionReferences(
      buildExpense({ assetId: ids.gold, categoryId: buildCategory().id }),
      { assets: assetLookup(bank), categories: categoryLookup() },
    );
    expect(codes(result)).toEqual(['ASSET_NOT_FOUND', 'CATEGORY_NOT_FOUND']);
  });

  it('rejects a transfer whose destination does not exist', () => {
    const result = validateTransactionReferences(
      buildTransfer({ destinationAssetId: ids.gold }),
      refs,
    );
    expect(codes(result)).toEqual(['ASSET_NOT_FOUND']);
    expect(result[0]?.path).toBe('destinationAssetId');
  });
});
