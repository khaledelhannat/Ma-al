// @vitest-environment node
import { asCalendarDate, asId, asMonth, asMoney } from '../../domain';
import {
  buildExpense,
  buildIncome,
  buildTransfer,
  ids,
} from '../../domain/test-support/builders';
import { ConstraintViolationError, CorruptRecordError } from '../errors';
import { createTestRepositories } from '../test-support/test-database';

const d = asCalendarDate;
const other = asId<'Asset'>('00000000-0000-4000-8000-0000000000a9');

describe('TransactionRepository', () => {
  it('adds, gets, updates and deletes', async () => {
    const { repos } = createTestRepositories();
    const tx = buildExpense();
    await repos.transactions.add(tx);
    expect(await repos.transactions.get(tx.id)).toStrictEqual(tx);

    const edited = { ...tx, amount: asMoney(99), description: 'Edited' };
    await repos.transactions.put(edited);
    expect(await repos.transactions.get(tx.id)).toStrictEqual(edited);

    await repos.transactions.delete(tx.id);
    expect(await repos.transactions.get(tx.id)).toBeUndefined();
  });

  it('rejects adding the same id twice with a typed error', async () => {
    const { repos } = createTestRepositories();
    const tx = buildExpense();
    await repos.transactions.add(tx);
    await expect(repos.transactions.add(tx)).rejects.toBeInstanceOf(
      ConstraintViolationError,
    );
  });

  it('bulk-adds atomically: one duplicate rolls back the whole batch', async () => {
    const { repos } = createTestRepositories();
    const existing = buildExpense();
    await repos.transactions.add(existing);
    const fresh = buildExpense();
    await expect(
      repos.transactions.addMany([fresh, existing]),
    ).rejects.toBeInstanceOf(ConstraintViolationError);
    expect(await repos.transactions.get(fresh.id)).toBeUndefined();
  });

  it('bulk-puts', async () => {
    const { repos } = createTestRepositories();
    const a = buildExpense();
    const b = buildIncome();
    await repos.transactions.putMany([a, b]);
    expect(await repos.transactions.listByDateRange({})).toHaveLength(2);
  });

  it('lists by inclusive date range, ordered by date', async () => {
    const { repos } = createTestRepositories();
    const sep1 = buildExpense({ date: d('2026-09-01') });
    const sep15 = buildExpense({ date: d('2026-09-15') });
    const sep30 = buildExpense({ date: d('2026-09-30') });
    const oct1 = buildExpense({ date: d('2026-10-01') });
    await repos.transactions.addMany([oct1, sep30, sep1, sep15]);

    const inRange = await repos.transactions.listByDateRange({
      from: d('2026-09-01'),
      to: d('2026-09-30'),
    });
    expect(inRange.map((t) => t.id)).toEqual([sep1.id, sep15.id, sep30.id]);

    const openEnded = await repos.transactions.listByDateRange({
      from: d('2026-09-30'),
    });
    expect(openEnded.map((t) => t.id)).toEqual([sep30.id, oct1.id]);
  });

  it('lists a month without leaking neighbouring months', async () => {
    const { repos } = createTestRepositories();
    const aug31 = buildExpense({ date: d('2026-08-31') });
    const feb28 = buildExpense({ date: d('2026-02-28') });
    const mar1 = buildExpense({ date: d('2026-03-01') });
    const sep1 = buildExpense({ date: d('2026-09-01') });
    const sep30 = buildExpense({ date: d('2026-09-30') });
    const oct1 = buildExpense({ date: d('2026-10-01') });
    await repos.transactions.addMany([aug31, feb28, mar1, sep1, sep30, oct1]);

    expect(
      (await repos.transactions.listByMonth(asMonth('2026-09'))).map(
        (t) => t.id,
      ),
    ).toEqual([sep1.id, sep30.id]);
    expect(
      (await repos.transactions.listByMonth(asMonth('2026-02'))).map(
        (t) => t.id,
      ),
    ).toEqual([feb28.id]);
  });

  it('lists by asset including both sides of a transfer', async () => {
    const { repos } = createTestRepositories();
    const onBank = buildExpense({ date: d('2026-09-02') });
    const onOther = buildExpense({ assetId: other });
    const outOfBank = buildTransfer({ date: d('2026-09-03') }); // bank -> cash
    const intoBank = buildTransfer({
      date: d('2026-09-04'),
      sourceAssetId: ids.cash,
      destinationAssetId: ids.bank,
    });
    await repos.transactions.addMany([onBank, onOther, outOfBank, intoBank]);

    const bank = await repos.transactions.listByAsset(ids.bank);
    expect(bank.map((t) => t.id)).toEqual([
      onBank.id,
      outOfBank.id,
      intoBank.id,
    ]);

    const cash = await repos.transactions.listByAsset(ids.cash);
    expect(cash.map((t) => t.id)).toEqual([outOfBank.id, intoBank.id]);

    const ranged = await repos.transactions.listByAsset(ids.bank, {
      from: d('2026-09-03'),
    });
    expect(ranged.map((t) => t.id)).toEqual([outOfBank.id, intoBank.id]);
  });

  it('lists by category and excludes transfers (null category)', async () => {
    const { repos } = createTestRepositories();
    const food1 = buildExpense({ date: d('2026-09-01') });
    const food2 = buildExpense({ date: d('2026-09-20') });
    const salary = buildIncome();
    const transfer = buildTransfer();
    await repos.transactions.addMany([food2, salary, transfer, food1]);

    expect(
      (await repos.transactions.listByCategory(ids.food)).map((t) => t.id),
    ).toEqual([food1.id, food2.id]);
    expect(
      (
        await repos.transactions.listByCategory(ids.food, {
          from: d('2026-09-10'),
          to: d('2026-09-30'),
        })
      ).map((t) => t.id),
    ).toEqual([food2.id]);
  });

  it('lists by type with a date range', async () => {
    const { repos } = createTestRepositories();
    const e1 = buildExpense({ date: d('2026-09-01') });
    const e2 = buildExpense({ date: d('2026-10-05') });
    const i1 = buildIncome({ date: d('2026-09-01') });
    const t1 = buildTransfer({ date: d('2026-09-01') });
    await repos.transactions.addMany([e2, i1, t1, e1]);

    expect(
      (await repos.transactions.listByType('expense')).map((t) => t.id),
    ).toEqual([e1.id, e2.id]);
    expect(
      (
        await repos.transactions.listByType('expense', {
          to: d('2026-09-30'),
        })
      ).map((t) => t.id),
    ).toEqual([e1.id]);
    expect(
      (await repos.transactions.listByType('transfer')).map((t) => t.id),
    ).toEqual([t1.id]);
  });

  it('finds generated transactions by recurring rule, ordered by date', async () => {
    const { repos } = createTestRepositories();
    const ruleId = asId<'RecurringRule'>(
      '00000000-0000-4000-8000-0000000000d1',
    );
    const aug = buildIncome({ recurringRuleId: ruleId, date: d('2026-08-01') });
    const jul = buildIncome({ recurringRuleId: ruleId, date: d('2026-07-01') });
    const manual = buildIncome({ date: d('2026-07-01') });
    await repos.transactions.addMany([aug, manual, jul]);
    expect(
      (await repos.transactions.listByRecurringRule(ruleId)).map((t) => t.id),
    ).toEqual([jul.id, aug.id]);
  });

  it('finds the purchase transaction of a wishlist item', async () => {
    const { repos } = createTestRepositories();
    const itemId = asId<'WishlistItem'>('00000000-0000-4000-8000-0000000000d2');
    const purchase = buildExpense({ sourceWishlistItemId: itemId });
    await repos.transactions.addMany([purchase, buildExpense()]);
    expect(await repos.transactions.listBySourceWishlistItem(itemId)).toEqual([
      purchase,
    ]);
  });

  it('reports a damaged stored record as CorruptRecordError', async () => {
    const { repos, db } = createTestRepositories();
    const tx = buildExpense();
    await repos.transactions.add(tx);
    await db.transactions.update(tx.id, { amount: 1.5 });
    await expect(repos.transactions.get(tx.id)).rejects.toBeInstanceOf(
      CorruptRecordError,
    );
  });

  it('stores exact integer piastres in IndexedDB', async () => {
    const { repos, db } = createTestRepositories();
    const tx = buildExpense({ amount: asMoney(1_999_999_999_999) });
    await repos.transactions.add(tx);
    const raw = await db.transactions.get(tx.id);
    expect(raw?.amount).toBe(1_999_999_999_999);
    expect(raw?.date).toBe('2026-09-10');
  });
});
