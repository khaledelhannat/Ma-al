// @vitest-environment node
import { asId, asMonth, asMoney } from '../../domain';
import {
  buildBudget,
  buildSnapshot,
  ids,
} from '../../domain/test-support/builders';
import { ConstraintViolationError } from '../errors';
import { createTestRepositories } from '../test-support/test-database';

const sep = asMonth('2026-09');
const oct = asMonth('2026-10');

describe('Budget uniqueness (categoryId + month)', () => {
  it('rejects a second budget for the same category and month', async () => {
    const { repos } = createTestRepositories();
    await repos.budgets.add(buildBudget());
    await expect(
      repos.budgets.add(buildBudget({ amount: asMoney(1) })),
    ).rejects.toBeInstanceOf(ConstraintViolationError);
    expect(await repos.budgets.listByMonth(sep)).toHaveLength(1);
  });

  it('allows the same category in another month and another category in the same month', async () => {
    const { repos } = createTestRepositories();
    await repos.budgets.add(buildBudget());
    await repos.budgets.add(buildBudget({ month: oct }));
    await repos.budgets.add(buildBudget({ categoryId: ids.salary }));
    expect(await repos.budgets.listByCategory(ids.food)).toHaveLength(2);
  });

  it('rejects an update that would collide with another budget', async () => {
    const { repos } = createTestRepositories();
    const sepBudget = buildBudget();
    const octBudget = buildBudget({ month: oct });
    await repos.budgets.addMany([sepBudget, octBudget]);
    await expect(
      repos.budgets.put({ ...octBudget, month: sep }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);
    expect((await repos.budgets.get(octBudget.id))?.month).toBe(oct);
  });

  it('rejects a batch containing a duplicate pair and stores nothing', async () => {
    const { repos } = createTestRepositories();
    await expect(
      repos.budgets.addMany([buildBudget(), buildBudget()]),
    ).rejects.toBeInstanceOf(ConstraintViolationError);
    expect(await repos.budgets.listByMonth(sep)).toHaveLength(0);
  });

  it('upsert inserts, then updates in place keeping the stored id', async () => {
    const { repos } = createTestRepositories();
    const first = buildBudget({ amount: asMoney(100) });
    expect(await repos.budgets.upsertForCategoryMonth(first)).toStrictEqual(
      first,
    );

    const second = buildBudget({ amount: asMoney(250) }); // different id, same pair
    const stored = await repos.budgets.upsertForCategoryMonth(second);
    expect(stored).toStrictEqual({ ...second, id: first.id });
    expect(await repos.budgets.listByMonth(sep)).toEqual([stored]);
    expect(await repos.budgets.get(second.id)).toBeUndefined();
  });

  it('upsert never overwrites an unrelated budget that shares the id', async () => {
    const { repos } = createTestRepositories();
    const existing = buildBudget();
    await repos.budgets.add(existing);
    const clash = buildBudget({ id: existing.id, month: oct });
    await expect(
      repos.budgets.upsertForCategoryMonth(clash),
    ).rejects.toBeInstanceOf(ConstraintViolationError);
    expect(await repos.budgets.get(existing.id)).toStrictEqual(existing);
  });

  it('looks up and deletes budgets', async () => {
    const { repos } = createTestRepositories();
    const budget = buildBudget();
    await repos.budgets.add(budget);
    expect(
      await repos.budgets.getByCategoryAndMonth(ids.food, sep),
    ).toStrictEqual(budget);
    expect(
      await repos.budgets.getByCategoryAndMonth(ids.food, oct),
    ).toBeUndefined();
    await repos.budgets.delete(budget.id);
    expect(
      await repos.budgets.getByCategoryAndMonth(ids.food, sep),
    ).toBeUndefined();
  });
});

describe('MonthlySnapshot uniqueness (month)', () => {
  it('rejects a second snapshot for the same month', async () => {
    const { repos } = createTestRepositories();
    await repos.monthlySnapshots.add(buildSnapshot());
    await expect(
      repos.monthlySnapshots.add(buildSnapshot()),
    ).rejects.toBeInstanceOf(ConstraintViolationError);
    expect(await repos.monthlySnapshots.list()).toHaveLength(1);
  });

  it('rejects an update that moves a snapshot onto an occupied month', async () => {
    const { repos } = createTestRepositories();
    const a = buildSnapshot();
    const b = { ...buildSnapshot(), month: oct };
    await repos.monthlySnapshots.add(a);
    await repos.monthlySnapshots.add(b);
    await expect(
      repos.monthlySnapshots.put({ ...b, month: sep }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);
  });

  it('upsertForMonth replaces the cached snapshot and keeps its id', async () => {
    const { repos } = createTestRepositories();
    const original = { ...buildSnapshot(), dirty: true };
    await repos.monthlySnapshots.add(original);

    const rebuilt = { ...buildSnapshot(), dirty: false };
    const stored = await repos.monthlySnapshots.upsertForMonth(rebuilt);
    expect(stored.id).toBe(original.id);
    expect(stored.dirty).toBe(false);
    expect(await repos.monthlySnapshots.list()).toEqual([stored]);
  });
});

describe('MonthlySnapshotRepository queries', () => {
  it('orders by month, lists from a month onward, and finds dirty ones', async () => {
    const { repos } = createTestRepositories();
    const aug = { ...buildSnapshot(), month: asMonth('2026-08') };
    const sepS = { ...buildSnapshot(), dirty: true };
    const octS = { ...buildSnapshot(), month: oct, dirty: true };
    await repos.monthlySnapshots.putMany([octS, aug, sepS]);

    expect((await repos.monthlySnapshots.list()).map((s) => s.month)).toEqual([
      '2026-08',
      '2026-09',
      '2026-10',
    ]);
    expect(
      (await repos.monthlySnapshots.listFromMonth(sep)).map((s) => s.month),
    ).toEqual(['2026-09', '2026-10']);
    expect(
      (await repos.monthlySnapshots.listDirty()).map((s) => s.month),
    ).toEqual(['2026-09', '2026-10']);
    expect((await repos.monthlySnapshots.getByMonth(oct))?.id).toBe(octS.id);
  });
});

it('keeps ids as distinct branded values at runtime strings', () => {
  expect(typeof asId<'Budget'>('00000000-0000-4000-8000-0000000000f1')).toBe(
    'string',
  );
});
