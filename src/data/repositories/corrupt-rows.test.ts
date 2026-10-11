// @vitest-environment node
import {
  buildAllocation,
  buildAsset,
  buildBudget,
  buildCategory,
  buildExpense,
  buildGoal,
  buildGoldHolding,
  buildGoldPrice,
  buildRecurringRule,
  buildSnapshot,
  buildWishlistItem,
  ids,
} from '../../domain/test-support/builders';
import { createDefaultSettings } from '../../domain';
import { CorruptRecordError } from '../errors';
import { RecordValidationError } from '../records/validate';
import { createTestRepositories } from '../test-support/test-database';

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected the repository to reject');
}

/** The error must be a CorruptRecordError that keeps the validator error as its cause. */
function expectCorruptByValidation(
  error: unknown,
  entity: string,
  key: string,
) {
  expect(error).toBeInstanceOf(CorruptRecordError);
  expect(Array.isArray(error)).toBe(false);
  const corrupt = error as CorruptRecordError;
  expect(corrupt.entity).toBe(entity);
  expect(corrupt.key).toBe(key);
  expect(corrupt.cause).toBeInstanceOf(RecordValidationError);
  expect(
    (corrupt.cause as RecordValidationError).issues.length,
  ).toBeGreaterThan(0);
}

describe('repositories reject corrupt stored rows as CorruptRecordError', () => {
  it('Category: invalid essential flag (get and list)', async () => {
    const { repos, db } = createTestRepositories();
    await repos.categories.add(buildCategory());
    await db.categories.update(ids.food, {
      essential: 'yes' as unknown as boolean,
    });

    expectCorruptByValidation(
      await rejection(repos.categories.get(ids.food)),
      'Category',
      ids.food,
    );
    expectCorruptByValidation(
      await rejection(repos.categories.list()),
      'Category',
      ids.food,
    );
    expectCorruptByValidation(
      await rejection(repos.categories.listByType('expense')),
      'Category',
      ids.food,
    );
  });

  it('Transaction: blank paymentMethod, found through every query path', async () => {
    const { repos, db } = createTestRepositories();
    const tx = buildExpense();
    await repos.transactions.add(tx);
    await db.transactions.update(tx.id, { paymentMethod: '' });

    for (const read of [
      () => repos.transactions.get(tx.id),
      () => repos.transactions.listByDateRange({}),
      () => repos.transactions.listByAsset(ids.bank),
      () => repos.transactions.listByCategory(ids.food),
    ]) {
      expectCorruptByValidation(await rejection(read()), 'Transaction', tx.id);
    }
  });

  it('Asset: gold row with an impossible karat', async () => {
    const { repos, db } = createTestRepositories();
    await repos.assets.add(buildAsset({ type: 'bank' }));
    await db.assets.update(ids.bank, { karat: 21 });
    // A non-gold row that carries gold data is corrupt too (RangeError cause).
    const error = await rejection(repos.assets.get(ids.bank));
    expect(error).toBeInstanceOf(CorruptRecordError);
    expect((error as CorruptRecordError).cause).toBeInstanceOf(RangeError);
  });

  it('Allocation: interval that does not move forward', async () => {
    const { repos, db } = createTestRepositories();
    const a = buildAllocation();
    await repos.allocations.add(a);
    await db.allocations.update(a.id, { endDate: '2000-01-01' });
    expectCorruptByValidation(
      await rejection(repos.allocations.get(a.id)),
      'Allocation',
      a.id,
    );
    expectCorruptByValidation(
      await rejection(repos.allocations.listByAsset(ids.bank)),
      'Allocation',
      a.id,
    );
  });

  it('Goal, Budget, WishlistItem, GoldPrice, GoldHolding: invalid ordinary fields', async () => {
    const { repos, db } = createTestRepositories();
    const goal = buildGoal();
    const budget = buildBudget();
    const item = buildWishlistItem();
    const price = buildGoldPrice();
    const holding = buildGoldHolding();
    await repos.goals.add(goal);
    await repos.budgets.add(budget);
    await repos.wishlistItems.add(item);
    await repos.goldPrices.add(price);
    await repos.goldHoldings.add(holding);
    await db.goals.update(goal.id, { targetAmount: 0 });
    await db.budgets.update(budget.id, { amount: 0 });
    await db.wishlistItems.update(item.id, { name: '' });
    await db.goldPriceRecords.update(price.id, { pricePerGram: 0 });
    await db.goldHoldingRecords.update(holding.id, { weightGrams: -5 });

    expectCorruptByValidation(
      await rejection(repos.goals.get(goal.id)),
      'Goal',
      goal.id,
    );
    expectCorruptByValidation(
      await rejection(
        repos.budgets.getByCategoryAndMonth(budget.categoryId, budget.month),
      ),
      'Budget',
      budget.id,
    );
    expectCorruptByValidation(
      await rejection(repos.wishlistItems.get(item.id)),
      'WishlistItem',
      item.id,
    );
    expectCorruptByValidation(
      await rejection(
        repos.goldPrices.findLatestOnOrBefore(price.karat, price.effectiveDate),
      ),
      'GoldPriceRecord',
      price.id,
    );
    expectCorruptByValidation(
      await rejection(
        repos.goldHoldings.findActiveOn(holding.assetId, holding.startDate),
      ),
      'GoldHoldingRecord',
      holding.id,
    );
  });

  it('RecurringRule: corrupt nested template', async () => {
    const { repos, db } = createTestRepositories();
    const rule = buildRecurringRule();
    await repos.recurringRules.add(rule);
    const stored = await db.recurringRules.get(rule.id);
    if (!stored) throw new Error('setup failed');
    await db.recurringRules.update(rule.id, {
      transactionTemplate: { ...stored.transactionTemplate, amount: 0 },
    });
    expectCorruptByValidation(
      await rejection(repos.recurringRules.get(rule.id)),
      'RecurringRule',
      rule.id,
    );
    expectCorruptByValidation(
      await rejection(
        repos.recurringRules.listActiveDueOnOrBefore(rule.nextRunDate),
      ),
      'RecurringRule',
      rule.id,
    );
  });

  it('MonthlySnapshot: corrupt nested data', async () => {
    const { repos, db } = createTestRepositories();
    const snapshot = buildSnapshot();
    await repos.monthlySnapshots.add(snapshot);
    await db.monthlySnapshots
      .where('id')
      .equals(snapshot.id)
      .modify((row) => {
        row.data.income = 1.5;
      });
    const error = await rejection(
      repos.monthlySnapshots.getByMonth(snapshot.month),
    );
    expect(error).toBeInstanceOf(CorruptRecordError);
    expect((error as CorruptRecordError).key).toBe(snapshot.id);
  });

  it('Settings: invalid stored preferences', async () => {
    const { repos, db } = createTestRepositories();
    await repos.settings.save(createDefaultSettings());
    await db.settings.update('app', { baseCurrency: 'USD' });
    const error = await rejection(repos.settings.get());
    expect(error).toBeInstanceOf(CorruptRecordError);
    expect((error as CorruptRecordError).key).toBe('app');
  });

  it('decoding never needs other rows: a valid transaction with a missing asset/category still loads', async () => {
    const { repos } = createTestRepositories();
    const tx = buildExpense(); // no Asset or Category rows exist at all
    await repos.transactions.add(tx);
    expect(await repos.transactions.get(tx.id)).toStrictEqual(tx);
  });
});
