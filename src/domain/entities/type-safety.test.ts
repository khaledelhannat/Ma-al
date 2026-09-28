/**
 * These tests are mostly compile-time: each `@ts-expect-error` proves the
 * compiler REJECTS an invalid state. If someone loosens a type so the state
 * becomes representable, the directive becomes unused and `npm run
 * typecheck` fails.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_LIQUIDITY, createDefaultSettings } from '..';
import type {
  Asset,
  AssetId,
  Goal,
  Money,
  RecurringRule,
  Settings,
  Transaction,
} from '..';
import {
  buildAsset,
  buildExpense,
  buildGoal,
  buildGoldAsset,
  buildRecurringRule,
  buildTransfer,
  ids,
} from '../test-support/builders';

describe('Transaction cannot represent invalid combinations', () => {
  it('rejects a transfer that carries a category', () => {
    // @ts-expect-error a transfer has no categoryId
    const bad: Transaction = { ...buildTransfer(), categoryId: ids.food };
    expect(bad.type).toBe('transfer');
  });

  it('rejects a transfer with both assetId and categoryId (the Step 2 example)', () => {
    // @ts-expect-error a transfer has neither assetId nor categoryId
    const bad: Transaction = {
      ...buildTransfer(),
      assetId: ids.bank,
      categoryId: ids.food,
    };
    expect(bad.type).toBe('transfer');
  });

  it('rejects an expense that carries transfer endpoints', () => {
    // @ts-expect-error only a transfer has source/destination endpoints
    const bad: Transaction = {
      ...buildExpense(),
      sourceAssetId: ids.bank,
      destinationAssetId: ids.cash,
    };
    expect(bad.type).toBe('expense');
  });

  it('requires a category on an expense', () => {
    // @ts-expect-error categoryId is required on an expense
    const bad: Transaction = {
      id: buildExpense().id,
      type: 'expense',
      amount: buildExpense().amount,
      date: buildExpense().date,
      assetId: ids.bank,
      description: 'x',
      paymentMethod: 'card',
      createdAt: buildExpense().createdAt,
      updatedAt: buildExpense().updatedAt,
    };
    expect(bad.type).toBe('expense');
  });
});

describe('Branded primitives cannot be mixed up', () => {
  it('rejects a CategoryId where an AssetId is expected', () => {
    // @ts-expect-error a CategoryId is not an AssetId
    const bad: AssetId = ids.food;
    expect(bad).toBe(ids.food);
  });

  it('rejects a bare number where Money is expected', () => {
    // @ts-expect-error money must go through asMoney()
    const bad: Money = 5;
    expect(bad).toBe(5);
  });
});

describe('Asset gold-specific data', () => {
  it('rejects a karat on a non-gold asset', () => {
    // @ts-expect-error only gold assets have a karat
    const bad: Asset = { ...buildAsset(), karat: 21 };
    expect(bad.type).toBe('bank');
  });

  it('requires a karat on a gold asset', () => {
    const { karat, ...withoutKarat } = buildGoldAsset();
    expect(karat).toBe(21);
    // @ts-expect-error a gold asset requires a karat
    const bad: Asset = withoutKarat;
    expect(bad.type).toBe('gold');
  });

  it('has no mutable balance field', () => {
    // @ts-expect-error balance is derived, never stored
    const bad: Asset = { ...buildAsset(), currentBalance: 1 };
    expect(bad.type).toBe('bank');
  });

  it('defaults liquidity per Step 0 (cash/bank/savings liquid; gold/other not)', () => {
    expect(DEFAULT_LIQUIDITY).toEqual({
      cash: 'liquid',
      bank: 'liquid',
      savings: 'liquid',
      gold: 'nonLiquid',
      other: 'nonLiquid',
    });
  });
});

describe('Stored state vs derived state', () => {
  it('does not let a Goal store its funded amount', () => {
    // @ts-expect-error fundedAmount is derived from Allocations
    const bad: Goal = { ...buildGoal(), fundedAmount: 1 as Money };
    expect(bad.name).toBe('New laptop');
  });
});

describe('RecurringRule template', () => {
  it('rejects a transfer template that carries a category', () => {
    const bad: RecurringRule = {
      ...buildRecurringRule(),
      // @ts-expect-error a transfer template has no categoryId
      transactionTemplate: {
        type: 'transfer',
        amount: buildTransfer().amount,
        sourceAssetId: ids.bank,
        destinationAssetId: ids.cash,
        description: 'x',
        categoryId: ids.food,
      },
    };
    expect(bad.frequency).toBe('monthly');
  });

  it('rejects an expense template shaped like a transfer', () => {
    const bad: RecurringRule = {
      ...buildRecurringRule(),
      // @ts-expect-error only a transfer has sourceAssetId
      transactionTemplate: {
        type: 'expense',
        amount: buildExpense().amount,
        categoryId: ids.food,
        assetId: ids.bank,
        description: 'x',
        paymentMethod: 'card',
        sourceAssetId: ids.bank,
      },
    };
    expect(bad.frequency).toBe('monthly');
  });
});

describe('Settings', () => {
  it('defaults to EGP and cannot hold categories or an AI key', () => {
    const defaults = createDefaultSettings();
    expect(defaults.baseCurrency).toBe('EGP');

    // @ts-expect-error categories are owned by Category, not Settings
    const withCategories: Settings = { ...defaults, categories: [] };
    // @ts-expect-error the Gemini key is never part of exportable Settings
    const withKey: Settings = { ...defaults, geminiApiKey: 'secret' };
    // @ts-expect-error the base currency is fixed to EGP for the MVP
    const otherCurrency: Settings = { ...defaults, baseCurrency: 'USD' };
    expect([withCategories, withKey, otherCurrency]).toHaveLength(3);
  });
});
