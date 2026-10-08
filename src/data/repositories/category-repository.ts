import type { Category, CategoryId, CategoryType } from '../../domain';
import type { AppDatabase } from '../db';
import { guard } from '../errors';
import { fromCategoryRecord, toCategoryRecord } from '../records';
import { toFlag } from '../records/codec';
import { createEntityStore } from './entity-store';
import { assertUnreferenced, countByCompoundPrefix } from './reference-guard';

/**
 * Categories are archived, not deleted, once referenced (Step 0 rule 5).
 * There is deliberately no unconditional delete: `deleteIfUnreferenced` is the
 * only removal and it refuses while anything points at the category.
 * Archiving is an ordinary `put` of the category with `archived: true`.
 */
export interface CategoryRepository {
  get(id: CategoryId): Promise<Category | undefined>;
  add(category: Category): Promise<void>;
  put(category: Category): Promise<void>;
  addMany(categories: readonly Category[]): Promise<void>;
  putMany(categories: readonly Category[]): Promise<void>;
  list(): Promise<Category[]>;
  listByType(type: CategoryType): Promise<Category[]>;
  listByParent(parentId: CategoryId): Promise<Category[]>;
  listByArchived(archived: boolean): Promise<Category[]>;
  /**
   * Deletes only a category no Transaction, Budget, WishlistItem,
   * RecurringRule template or child category refers to; otherwise throws
   * ReferencedRecordError. Missing id is a no-op.
   */
  deleteIfUnreferenced(id: CategoryId): Promise<void>;
}

export function createCategoryRepository(db: AppDatabase): CategoryRepository {
  const entity = 'Category';
  const table = db.categories;
  const store = createEntityStore({
    entity,
    db,
    table,
    toRecord: toCategoryRecord,
    fromRecord: fromCategoryRecord,
  });

  return {
    get: store.get,
    add: store.add,
    put: store.put,
    addMany: store.addMany,
    putMany: store.putMany,
    list: store.list,
    async listByType(type) {
      return store.decodeAll(
        await guard(entity, () => table.where('type').equals(type).toArray()),
      );
    },
    async listByParent(parentId) {
      return store.decodeAll(
        await guard(entity, () =>
          table.where('parentId').equals(parentId).toArray(),
        ),
      );
    },
    async listByArchived(archived) {
      return store.decodeAll(
        await guard(entity, () =>
          table.where('archived').equals(toFlag(archived)).toArray(),
        ),
      );
    },
    async deleteIfUnreferenced(id) {
      await guard(entity, () =>
        db.transaction(
          'rw',
          [
            db.categories,
            db.transactions,
            db.budgets,
            db.wishlistItems,
            db.recurringRules,
          ],
          async () => {
            await assertUnreferenced(entity, id, [
              {
                label: 'transactions',
                count: () =>
                  countByCompoundPrefix(
                    db.transactions,
                    '[categoryId+date]',
                    id,
                  ),
              },
              {
                label: 'budgets',
                count: () =>
                  countByCompoundPrefix(db.budgets, '[categoryId+month]', id),
              },
              {
                label: 'wishlist items',
                count: () =>
                  db.wishlistItems.where('categoryId').equals(id).count(),
              },
              {
                label: 'child categories',
                count: () => table.where('parentId').equals(id).count(),
              },
              {
                label: 'recurring rules',
                count: () =>
                  db.recurringRules
                    .filter(
                      (rule) =>
                        rule.transactionTemplate.type !== 'transfer' &&
                        rule.transactionTemplate.categoryId === id,
                    )
                    .count(),
              },
            ]);
            await table.delete(id);
          },
        ),
      );
    },
  };
}
