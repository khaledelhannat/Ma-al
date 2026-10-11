// @vitest-environment node
import {
  asCalendarDate,
  asId,
  asMonth,
  asMoney,
  asTimestamp,
} from '../../domain';
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

describe('TransactionRepository.listByAsset (canonical asset indexes)', () => {
  const tid = (n: number) =>
    asId<'Transaction'>(
      `00000000-0000-4000-8000-0000000001${n.toString(16).padStart(2, '0')}`,
    );
  const at = (hh: string) => asTimestamp(`2026-09-01T${hh}:00:00.000Z`);

  it('finds income and expense through assetId', async () => {
    const { repos } = createTestRepositories();
    const income = buildIncome({ date: d('2026-09-01') });
    const expense = buildExpense({ date: d('2026-09-02') });
    const elsewhere = buildExpense({ assetId: other });
    await repos.transactions.addMany([expense, elsewhere, income]);

    const found = await repos.transactions.listByAsset(ids.bank);
    expect(found.map((t) => t.id)).toEqual([income.id, expense.id]);
    expect(found.map((t) => t.type)).toEqual(['income', 'expense']);
  });

  it('finds a transfer through sourceAssetId or destinationAssetId, once each', async () => {
    const { repos } = createTestRepositories();
    const transfer = buildTransfer(); // bank -> cash
    await repos.transactions.add(transfer);

    for (const asset of [ids.bank, ids.cash]) {
      const found = await repos.transactions.listByAsset(asset);
      expect(found).toHaveLength(1);
      expect(found[0]).toStrictEqual(transfer);
    }
    expect(await repos.transactions.listByAsset(other)).toEqual([]);
  });

  it('never repeats a transaction when one asset has income, expense and transfers both ways', async () => {
    const { repos } = createTestRepositories();
    const all = [
      buildIncome({ date: d('2026-09-01') }),
      buildExpense({ date: d('2026-09-02') }),
      buildTransfer({ date: d('2026-09-03') }), // bank -> cash
      buildTransfer({
        date: d('2026-09-04'),
        sourceAssetId: ids.cash,
        destinationAssetId: ids.bank,
      }),
    ];
    await repos.transactions.addMany(all);
    const found = await repos.transactions.listByAsset(ids.bank);
    expect(found.map((t) => t.id)).toEqual(all.map((t) => t.id));
    expect(new Set(found.map((t) => t.id)).size).toBe(found.length);
  });

  it('applies an inclusive date range to every source of matches', async () => {
    const { repos } = createTestRepositories();
    const before = buildExpense({ date: d('2026-08-31') });
    const first = buildExpense({ date: d('2026-09-01') });
    const mid = buildTransfer({ date: d('2026-09-15') }); // bank is the source
    const incoming = buildTransfer({
      date: d('2026-09-30'),
      sourceAssetId: ids.cash,
      destinationAssetId: ids.bank,
    });
    const after = buildIncome({ date: d('2026-10-01') });
    await repos.transactions.addMany([after, incoming, before, mid, first]);

    const range = { from: d('2026-09-01'), to: d('2026-09-30') };
    expect(
      (await repos.transactions.listByAsset(ids.bank, range)).map((t) => t.id),
    ).toEqual([first.id, mid.id, incoming.id]);
    expect(
      (
        await repos.transactions.listByAsset(ids.bank, {
          from: d('2026-09-30'),
        })
      ).map((t) => t.id),
    ).toEqual([incoming.id, after.id]);
  });

  it('orders by date, then createdAt, then id, whichever index matched the row', async () => {
    const { repos } = createTestRepositories();
    const date = d('2026-09-10');
    // Same date. Matched via assetId (expense), sourceAssetId (outgoing
    // transfer) and destinationAssetId (incoming transfer).
    const lateExpense = buildExpense({
      id: tid(1),
      date,
      createdAt: at('12'),
      updatedAt: at('12'),
    });
    const earlyOutgoing = buildTransfer({
      id: tid(2),
      date,
      createdAt: at('08'),
      updatedAt: at('08'),
    });
    const incoming = buildTransfer({
      id: tid(3),
      date,
      sourceAssetId: ids.cash,
      destinationAssetId: ids.bank,
      createdAt: at('10'),
      updatedAt: at('10'),
    });
    const tieA = buildExpense({
      id: tid(4),
      date,
      createdAt: at('10'),
      updatedAt: at('10'),
    });
    await repos.transactions.addMany([
      lateExpense,
      tieA,
      incoming,
      earlyOutgoing,
    ]);

    const found = await repos.transactions.listByAsset(ids.bank);
    expect(found.map((t) => t.id)).toEqual([
      earlyOutgoing.id, // 08:00
      incoming.id, // 10:00, id ...03
      tieA.id, // 10:00, id ...04 (id breaks the tie)
      lateExpense.id, // 12:00
    ]);
  });

  it('does not duplicate or hide a malformed self-transfer: it is reported as corrupt', async () => {
    const { repos, db } = createTestRepositories();
    const transfer = buildTransfer();
    await repos.transactions.add(transfer);
    await db.transactions
      .where('id')
      .equals(transfer.id)
      .modify((row) => {
        Object.assign(row, { destinationAssetId: ids.bank });
      });
    await expect(
      repos.transactions.listByAsset(ids.bank),
    ).rejects.toBeInstanceOf(CorruptRecordError);
  });

  it('keeps no derived asset data on the stored row', async () => {
    const { repos, db } = createTestRepositories();
    const transfer = buildTransfer();
    await repos.transactions.add(transfer);
    const raw = await db.transactions.get(transfer.id);
    expect(Object.hasOwn(raw ?? {}, 'assetIds')).toBe(false);
  });
});

describe('TransactionRepository ordering: date, then createdAt, then id', () => {
  const tid = (n: number) =>
    asId<'Transaction'>(
      `00000000-0000-4000-8000-0000000002${n.toString(16).padStart(2, '0')}`,
    );
  const at = (hh: string) => asTimestamp(`2026-09-01T${hh}:00:00.000Z`);
  const ruleId = asId<'RecurringRule'>('00000000-0000-4000-8000-0000000002f1');
  const sameDay = d('2026-09-10');

  /**
   * IndexedDB orders equal index keys by primary key (id). Here ids ascend
   * while createdAt descends, so index order is the REVERSE of the required
   * order, and 03/04 tie on createdAt so only the id can break that tie.
   */
  async function seed() {
    const { repos, db } = createTestRepositories();
    const make = (
      n: number,
      date: ReturnType<typeof d>,
      createdAt: ReturnType<typeof at>,
    ) =>
      buildExpense({
        id: tid(n),
        date,
        createdAt,
        updatedAt: createdAt,
        recurringRuleId: ruleId,
      });

    const earlierDate = make(9, d('2026-09-09'), at('23')); // latest createdAt, earliest date
    const a = make(1, sameDay, at('12'));
    const b = make(2, sameDay, at('08'));
    const c = make(3, sameDay, at('10'));
    const e = make(4, sameDay, at('10')); // ties with c on createdAt
    const laterDate = make(5, d('2026-09-11'), at('01')); // earliest createdAt, latest date
    await repos.transactions.addMany([a, laterDate, e, b, earlierDate, c]);

    return {
      repos,
      db,
      expected: [earlierDate, b, c, e, a, laterDate].map((t) => t.id),
    };
  }

  it('listByDateRange', async () => {
    const { repos, expected } = await seed();
    const found = await repos.transactions.listByDateRange({
      from: d('2026-09-09'),
      to: d('2026-09-11'),
    });
    expect(found.map((t) => t.id)).toEqual(expected);
  });

  it('listByDateRange with an open range', async () => {
    const { repos, expected } = await seed();
    expect(
      (await repos.transactions.listByDateRange({})).map((t) => t.id),
    ).toEqual(expected);
  });

  it('listByMonth', async () => {
    const { repos, expected } = await seed();
    expect(
      (await repos.transactions.listByMonth(asMonth('2026-09'))).map(
        (t) => t.id,
      ),
    ).toEqual(expected);
  });

  it('listByCategory', async () => {
    const { repos, expected } = await seed();
    expect(
      (await repos.transactions.listByCategory(ids.food)).map((t) => t.id),
    ).toEqual(expected);
  });

  it('listByCategory with a date range', async () => {
    const { repos, expected } = await seed();
    const found = await repos.transactions.listByCategory(ids.food, {
      from: sameDay,
      to: sameDay,
    });
    // only the same-day rows: b(08), c(10), e(10, later id), a(12)
    expect(found.map((t) => t.id)).toEqual(expected.slice(1, 5));
  });

  it('listByType', async () => {
    const { repos, expected } = await seed();
    expect(
      (await repos.transactions.listByType('expense')).map((t) => t.id),
    ).toEqual(expected);
  });

  it('listByRecurringRule', async () => {
    const { repos, expected } = await seed();
    expect(
      (await repos.transactions.listByRecurringRule(ruleId)).map((t) => t.id),
    ).toEqual(expected);
  });

  it('the already-sorted methods agree on the same order', async () => {
    const { repos, expected } = await seed();
    expect(
      (await repos.transactions.listByAsset(ids.bank)).map((t) => t.id),
    ).toEqual(expected);
  });

  it('still reports a corrupt row as CorruptRecordError rather than sorting it', async () => {
    const { repos, db } = await seed();
    await db.transactions.update(tid(2), { paymentMethod: '' });
    await expect(
      repos.transactions.listByType('expense'),
    ).rejects.toBeInstanceOf(CorruptRecordError);
    await expect(
      repos.transactions.listByRecurringRule(ruleId),
    ).rejects.toBeInstanceOf(CorruptRecordError);
  });
});
