// @vitest-environment node
import {
  buildAsset,
  buildExpense,
  buildGoldAsset,
  buildIncome,
  buildRecurringRule,
  buildTransfer,
  ids,
} from '../../domain/test-support/builders';
import { asMoney } from '../../domain';
import { createTestRepositories } from '../test-support/test-database';
import { CorruptRecordError } from '../errors';
import { forbidFields } from './codec';
import {
  fromAssetRecord,
  fromRecurringRuleRecord,
  fromTransactionRecord,
  toAssetRecord,
  toRecurringRuleRecord,
  toTransactionRecord,
} from '.';

function withFields<T extends object>(
  row: T,
  patch: Record<string, unknown>,
): T {
  return Object.assign({}, row, patch);
}

describe('forbidFields (helper)', () => {
  it('rejects a forbidden key whatever its value, including null and undefined', () => {
    for (const value of ['x', 0, false, '', null, undefined]) {
      expect(() => forbidFields({ karat: value }, ['karat'], 'row')).toThrow(
        RangeError,
      );
    }
  });

  it('accepts a row where the forbidden key is truly absent', () => {
    expect(() => forbidFields({ other: 1 }, ['karat'], 'row')).not.toThrow();
  });

  it('allows null only for a field opted in, and only the exact value null', () => {
    const opt = ['categoryId'];
    expect(() =>
      forbidFields({ categoryId: null }, ['categoryId'], 'row', opt),
    ).not.toThrow();
    expect(() =>
      forbidFields({ categoryId: undefined }, ['categoryId'], 'row', opt),
    ).toThrow(RangeError);
    expect(() =>
      forbidFields({ categoryId: 'abc' }, ['categoryId'], 'row', opt),
    ).toThrow(RangeError);
  });

  it('does not extend the null exception to other fields', () => {
    expect(() =>
      forbidFields({ assetId: null }, ['assetId', 'categoryId'], 'row', [
        'categoryId',
      ]),
    ).toThrow(/assetId/);
  });
});

describe('Transfer transactions', () => {
  // Builders mint a fresh id per call: keep one instance to compare with.
  const original = buildTransfer();
  const transfer = toTransactionRecord(original);

  it('REGRESSION: categoryId: null stays valid and round-trips', () => {
    expect(transfer.categoryId).toBeNull();
    expect('categoryId' in transfer).toBe(true);
    const back = fromTransactionRecord(transfer);
    expect(back).toStrictEqual(original);
    expect('categoryId' in back).toBe(false);
  });

  it('REGRESSION: a transfer with a payment method also still round-trips', () => {
    const tx = buildTransfer({ paymentMethod: 'ATM' });
    expect(fromTransactionRecord(toTransactionRecord(tx))).toStrictEqual(tx);
  });

  it('rejects a non-null categoryId, and an explicit undefined one', () => {
    expect(() =>
      fromTransactionRecord(withFields(transfer, { categoryId: ids.food })),
    ).toThrow(RangeError);
    expect(() =>
      fromTransactionRecord(withFields(transfer, { categoryId: undefined })),
    ).toThrow(RangeError);
  });

  it('rejects assetId on a transfer, even when null or undefined', () => {
    for (const assetId of [ids.bank, null, undefined]) {
      expect(() =>
        fromTransactionRecord(withFields(transfer, { assetId })),
      ).toThrow(RangeError);
    }
  });
});

describe('Income/expense transactions', () => {
  it.each([
    ['expense', toTransactionRecord(buildExpense())],
    ['income', toTransactionRecord(buildIncome())],
  ])(
    '%s rejects transfer-only fields when explicitly present, even null/undefined',
    (_t, row) => {
      for (const field of ['sourceAssetId', 'destinationAssetId']) {
        for (const value of [ids.cash, null, undefined]) {
          expect(() =>
            fromTransactionRecord(withFields(row, { [field]: value })),
          ).toThrow(RangeError);
        }
      }
    },
  );

  it('valid income/expense round-trips are unaffected', () => {
    for (const tx of [buildExpense(), buildIncome()]) {
      expect(fromTransactionRecord(toTransactionRecord(tx))).toStrictEqual(tx);
    }
  });
});

describe('Assets', () => {
  it('rejects a non-gold asset with karat present, including null and undefined', () => {
    const row = toAssetRecord(buildAsset());
    for (const karat of [21, null, undefined]) {
      expect(() => fromAssetRecord(withFields(row, { karat }))).toThrow(
        RangeError,
      );
    }
  });

  it('accepts a non-gold asset with no karat key, and a gold asset with one', () => {
    expect(fromAssetRecord(toAssetRecord(buildAsset()))).toStrictEqual(
      buildAsset(),
    );
    expect(fromAssetRecord(toAssetRecord(buildGoldAsset()))).toStrictEqual(
      buildGoldAsset(),
    );
  });
});

describe('RecurringRule transaction templates', () => {
  const transferRule = buildRecurringRule({
    transactionTemplate: {
      type: 'transfer',
      amount: asMoney(500_000),
      sourceAssetId: ids.bank,
      destinationAssetId: ids.cash,
      description: 'Top-up',
    },
  });
  const transferRow = toRecurringRuleRecord(transferRule);
  const incomeRule = buildRecurringRule();
  const incomeRow = toRecurringRuleRecord(incomeRule);

  it('rejects categoryId/assetId on a transfer template, null included (no null exception here)', () => {
    for (const field of ['categoryId', 'assetId']) {
      for (const value of [ids.food, null, undefined]) {
        expect(() =>
          fromRecurringRuleRecord(
            withFields(transferRow, {
              transactionTemplate: {
                ...transferRow.transactionTemplate,
                [field]: value,
              },
            }),
          ),
        ).toThrow(RangeError);
      }
    }
  });

  it('rejects transfer-only fields on an income template, null included', () => {
    for (const field of ['sourceAssetId', 'destinationAssetId']) {
      for (const value of [ids.cash, null, undefined]) {
        expect(() =>
          fromRecurringRuleRecord(
            withFields(incomeRow, {
              transactionTemplate: {
                ...incomeRow.transactionTemplate,
                [field]: value,
              },
            }),
          ),
        ).toThrow(RangeError);
      }
    }
  });

  it('valid templates still round-trip', () => {
    expect(fromRecurringRuleRecord(transferRow)).toStrictEqual(transferRule);
    expect(fromRecurringRuleRecord(incomeRow)).toStrictEqual(incomeRule);
  });
});

describe('through the repositories', () => {
  it('a stored transfer (categoryId: null) loads; a stray null assetId or karat is CorruptRecordError', async () => {
    const { repos, db } = createTestRepositories();
    const transfer = buildTransfer();
    await repos.transactions.add(transfer);
    expect(await repos.transactions.get(transfer.id)).toStrictEqual(transfer);
    expect((await db.transactions.get(transfer.id))?.categoryId).toBeNull();

    await db.transactions
      .where('id')
      .equals(transfer.id)
      .modify((row) => {
        Object.assign(row, { assetId: null });
      });
    await expect(repos.transactions.get(transfer.id)).rejects.toBeInstanceOf(
      CorruptRecordError,
    );

    await repos.assets.add(buildAsset());
    await db.assets
      .where('id')
      .equals(ids.bank)
      .modify((row) => {
        Object.assign(row, { karat: null });
      });
    await expect(repos.assets.get(ids.bank)).rejects.toBeInstanceOf(
      CorruptRecordError,
    );
  });
});
