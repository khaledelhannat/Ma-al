// @vitest-environment node
import { asId } from '../../domain';
import {
  buildAllocation,
  buildAsset,
  buildBudget,
  buildCategory,
  buildExpense,
  buildGoal,
  buildGoldAsset,
  buildGoldHolding,
  buildRecurringRule,
  buildTransfer,
  buildWishlistItem,
  ids,
} from '../../domain/test-support/builders';
import { ReferencedRecordError } from '../errors';
import { createTestRepositories } from '../test-support/test-database';

async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('Category deletion', () => {
  it('deletes an unreferenced category', async () => {
    const { repos } = createTestRepositories();
    await repos.categories.add(buildCategory());
    await repos.categories.deleteIfUnreferenced(ids.food);
    expect(await repos.categories.get(ids.food)).toBeUndefined();
  });

  it.each([
    [
      'transactions',
      (r: ReturnType<typeof createTestRepositories>['repos']) =>
        r.transactions.add(buildExpense()),
    ],
    [
      'budgets',
      (r: ReturnType<typeof createTestRepositories>['repos']) =>
        r.budgets.add(buildBudget()),
    ],
    [
      'wishlist items',
      (r: ReturnType<typeof createTestRepositories>['repos']) =>
        r.wishlistItems.add(buildWishlistItem({ categoryId: ids.food })),
    ],
    [
      'recurring rules',
      (r: ReturnType<typeof createTestRepositories>['repos']) =>
        r.recurringRules.add(
          buildRecurringRule({
            transactionTemplate: {
              type: 'expense',
              amount: buildExpense().amount,
              categoryId: ids.food,
              assetId: ids.bank,
              description: 'x',
              paymentMethod: 'card',
            },
          }),
        ),
    ],
    [
      'child categories',
      (r: ReturnType<typeof createTestRepositories>['repos']) =>
        r.categories.add(
          buildCategory({
            id: asId<'Category'>('00000000-0000-4000-8000-0000000000c9'),
            parentId: ids.food,
          }),
        ),
    ],
  ])('refuses while %s reference it', async (label, reference) => {
    const { repos } = createTestRepositories();
    await repos.categories.add(buildCategory());
    await reference(repos);

    const error = await rejection(
      repos.categories.deleteIfUnreferenced(ids.food),
    );
    expect(error).toBeInstanceOf(ReferencedRecordError);
    expect((error as ReferencedRecordError).referencedBy).toContain(label);
    expect(await repos.categories.get(ids.food)).toBeDefined();
  });

  it('can still be archived through put and found by archived flag', async () => {
    const { repos } = createTestRepositories();
    const category = buildCategory();
    await repos.categories.add(category);
    await repos.categories.put({ ...category, archived: true });
    expect(await repos.categories.listByArchived(true)).toHaveLength(1);
    expect(await repos.categories.listByArchived(false)).toHaveLength(0);
  });

  it('has no unconditional delete', () => {
    const { repos } = createTestRepositories();
    expect('delete' in repos.categories).toBe(false);
  });
});

describe('Asset deletion', () => {
  it('deletes an unreferenced asset', async () => {
    const { repos } = createTestRepositories();
    await repos.assets.add(buildAsset());
    await repos.assets.deleteIfUnreferenced(ids.bank);
    expect(await repos.assets.get(ids.bank)).toBeUndefined();
  });

  it('refuses when only the destination side of a transfer references it', async () => {
    const { repos } = createTestRepositories();
    await repos.assets.add(buildAsset());
    await repos.transactions.add(
      buildTransfer({ sourceAssetId: ids.cash, destinationAssetId: ids.bank }),
    );
    const error = await rejection(repos.assets.deleteIfUnreferenced(ids.bank));
    expect(error).toBeInstanceOf(ReferencedRecordError);
    expect((error as ReferencedRecordError).referencedBy).toEqual([
      'transactions',
    ]);
  });

  it('refuses while allocations or gold holdings exist', async () => {
    const { repos } = createTestRepositories();
    await repos.assets.addMany([buildAsset(), buildGoldAsset()]);
    await repos.allocations.add(buildAllocation());
    await repos.goldHoldings.add(buildGoldHolding());
    expect(
      await rejection(repos.assets.deleteIfUnreferenced(ids.bank)),
    ).toBeInstanceOf(ReferencedRecordError);
    expect(
      await rejection(repos.assets.deleteIfUnreferenced(ids.gold)),
    ).toBeInstanceOf(ReferencedRecordError);
  });
});

describe('Goal deletion', () => {
  it('refuses while an allocation links to the goal, then allows it after detaching', async () => {
    const { repos } = createTestRepositories();
    await repos.goals.add(buildGoal());
    const linked = buildAllocation({ goalId: ids.goal });
    await repos.allocations.add(linked);

    expect(
      await rejection(repos.goals.deleteIfUnreferenced(ids.goal)),
    ).toBeInstanceOf(ReferencedRecordError);

    // Same allocation, no longer linked to a goal.
    await repos.allocations.put(buildAllocation({ id: linked.id }));
    await repos.goals.deleteIfUnreferenced(ids.goal);
    expect(await repos.goals.get(ids.goal)).toBeUndefined();
  });
});

describe('Provenance back-references are never blocked or cascaded', () => {
  it('deleting a wishlist item leaves its purchase transaction intact (Step 0 rule 6)', async () => {
    const { repos } = createTestRepositories();
    const item = buildWishlistItem({ status: 'purchased' });
    const purchase = buildExpense({ sourceWishlistItemId: item.id });
    await repos.wishlistItems.add(item);
    await repos.transactions.add(purchase);

    await repos.wishlistItems.delete(item.id);
    expect(await repos.wishlistItems.get(item.id)).toBeUndefined();
    expect(await repos.transactions.get(purchase.id)).toStrictEqual(purchase);
  });

  it('deleting a recurring rule leaves generated transactions intact', async () => {
    const { repos } = createTestRepositories();
    const rule = buildRecurringRule();
    const generated = buildExpense({ recurringRuleId: rule.id });
    await repos.recurringRules.add(rule);
    await repos.transactions.add(generated);
    await repos.recurringRules.delete(rule.id);
    expect(await repos.transactions.get(generated.id)).toStrictEqual(generated);
  });
});
