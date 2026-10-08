// @vitest-environment node
import { asCalendarDate, createDefaultSettings } from '../../domain';
import {
  buildAsset,
  buildCategory,
  buildGoal,
  buildGoldAsset,
  buildRecurringRule,
  buildWishlistItem,
  ids,
} from '../../domain/test-support/builders';
import { asId } from '../../domain';
import { CorruptRecordError } from '../errors';
import { createTestRepositories } from '../test-support/test-database';

const d = asCalendarDate;

describe('CategoryRepository queries', () => {
  it('lists by type, by parent and by archived flag', async () => {
    const { repos } = createTestRepositories();
    const food = buildCategory();
    const salary = buildCategory({
      id: ids.salary,
      name: 'Salary',
      type: 'income',
    });
    const restaurants = buildCategory({
      id: asId<'Category'>('00000000-0000-4000-8000-0000000000c9'),
      name: 'Restaurants',
      parentId: ids.food,
      archived: true,
    });
    await repos.categories.addMany([food, salary, restaurants]);

    expect(
      (await repos.categories.listByType('income')).map((c) => c.id),
    ).toEqual([ids.salary]);
    expect(
      (await repos.categories.listByParent(ids.food)).map((c) => c.id),
    ).toEqual([restaurants.id]);
    expect(
      (await repos.categories.listByArchived(true)).map((c) => c.id),
    ).toEqual([restaurants.id]);
    expect(await repos.categories.list()).toHaveLength(3);
  });
});

describe('AssetRepository queries', () => {
  it('lists by type and liquidity and round-trips gold karat', async () => {
    const { repos } = createTestRepositories();
    const bank = buildAsset();
    const gold = buildGoldAsset({ karat: 18 });
    await repos.assets.addMany([bank, gold]);

    expect((await repos.assets.listByType('gold')).map((a) => a.id)).toEqual([
      gold.id,
    ]);
    expect(
      (await repos.assets.listByLiquidity('liquid')).map((a) => a.id),
    ).toEqual([bank.id]);
    expect(await repos.assets.get(gold.id)).toStrictEqual(gold);
  });

  it('reports a damaged gold record without karat as corrupt', async () => {
    const { repos, db } = createTestRepositories();
    await repos.assets.add(buildGoldAsset());
    await db.assets
      .where('id')
      .equals(ids.gold)
      .modify((r) => {
        delete r.karat;
      });
    await expect(repos.assets.get(ids.gold)).rejects.toBeInstanceOf(
      CorruptRecordError,
    );
  });
});

describe('GoalRepository', () => {
  it('orders by deadline and filters by priority and deadline range', async () => {
    const { repos } = createTestRepositories();
    const soon = buildGoal({
      id: asId<'Goal'>('00000000-0000-4000-8000-0000000000e2'),
      deadline: d('2026-12-31'),
      priority: 'high',
    });
    const later = buildGoal({ deadline: d('2027-06-30') });
    await repos.goals.addMany([later, soon]);

    expect((await repos.goals.list()).map((g) => g.id)).toEqual([
      soon.id,
      later.id,
    ]);
    expect((await repos.goals.listByPriority('high')).map((g) => g.id)).toEqual(
      [soon.id],
    );
    expect(
      (await repos.goals.listByDeadlineRange({ to: d('2026-12-31') })).map(
        (g) => g.id,
      ),
    ).toEqual([soon.id]);
  });
});

describe('WishlistItemRepository', () => {
  it('filters by status, priority, target date and category', async () => {
    const { repos } = createTestRepositories();
    const pending = buildWishlistItem({
      targetDate: d('2026-12-01'),
      categoryId: ids.food,
    });
    const bought = buildWishlistItem({
      status: 'purchased',
      priority: 'high',
      targetDate: d('2026-09-15'),
    });
    await repos.wishlistItems.addMany([pending, bought]);

    expect((await repos.wishlistItems.list()).map((i) => i.id)).toEqual([
      bought.id,
      pending.id,
    ]);
    expect(
      (await repos.wishlistItems.listByStatus('pending')).map((i) => i.id),
    ).toEqual([pending.id]);
    expect(
      (await repos.wishlistItems.listByPriority('high')).map((i) => i.id),
    ).toEqual([bought.id]);
    expect(
      (
        await repos.wishlistItems.listByTargetDateRange({
          from: d('2026-10-01'),
        })
      ).map((i) => i.id),
    ).toEqual([pending.id]);
    expect(
      (await repos.wishlistItems.listByCategory(ids.food)).map((i) => i.id),
    ).toEqual([pending.id]);
  });
});

describe('RecurringRuleRepository', () => {
  it('filters by active flag and due date', async () => {
    const { repos } = createTestRepositories();
    const dueSoon = buildRecurringRule({ nextRunDate: d('2026-10-01') });
    const dueLater = buildRecurringRule({ nextRunDate: d('2026-11-01') });
    const paused = buildRecurringRule({
      nextRunDate: d('2026-09-01'),
      active: false,
    });
    await repos.recurringRules.addMany([dueLater, paused, dueSoon]);

    expect(
      (await repos.recurringRules.listByActive(false)).map((r) => r.id),
    ).toEqual([paused.id]);
    expect(
      (await repos.recurringRules.listActiveDueOnOrBefore(d('2026-10-01'))).map(
        (r) => r.id,
      ),
    ).toEqual([dueSoon.id]); // inactive rule excluded, boundary inclusive
    expect((await repos.recurringRules.list()).map((r) => r.id)).toEqual([
      paused.id,
      dueSoon.id,
      dueLater.id,
    ]);
  });

  it('stores and updates a rule', async () => {
    const { repos } = createTestRepositories();
    const rule = buildRecurringRule();
    await repos.recurringRules.add(rule);
    const advanced = { ...rule, nextRunDate: d('2026-11-01') };
    await repos.recurringRules.put(advanced);
    expect(await repos.recurringRules.get(rule.id)).toStrictEqual(advanced);
  });
});

describe('SettingsRepository', () => {
  it('returns defaults before anything is saved, without writing', async () => {
    const { repos, db } = createTestRepositories();
    expect(await repos.settings.get()).toStrictEqual(createDefaultSettings());
    expect(await db.settings.count()).toBe(0);
  });

  it('saves and reloads a single settings record', async () => {
    const { repos, db } = createTestRepositories();
    const changed = {
      ...createDefaultSettings(),
      defaultViews: { startPage: 'budgets' as const },
    };
    await repos.settings.save(changed);
    await repos.settings.save(changed);
    expect(await repos.settings.get()).toStrictEqual(changed);
    expect(await db.settings.count()).toBe(1);
  });

  it('never stores AI configuration', async () => {
    const { repos, db } = createTestRepositories();
    await repos.settings.save(createDefaultSettings());
    const raw = await db.settings.toArray();
    expect(JSON.stringify(raw)).not.toMatch(/gemini|apikey/i);
  });
});
