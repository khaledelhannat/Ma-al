import Dexie from 'dexie';
import type { Budget, BudgetId, CategoryId, Month } from '../../domain';
import type { AppDatabase } from '../db';
import { guard } from '../errors';
import { fromBudgetRecord, toBudgetRecord } from '../records';
import { createEntityStore } from './entity-store';

/**
 * One budget per (categoryId, month) is enforced by a unique compound index,
 * so a duplicate `add`/`put`/`addMany` fails with ConstraintViolationError
 * instead of silently creating a second budget. Actual spend, remaining and
 * variance are engine calculations.
 */
export interface BudgetRepository {
  get(id: BudgetId): Promise<Budget | undefined>;
  getByCategoryAndMonth(
    categoryId: CategoryId,
    month: Month,
  ): Promise<Budget | undefined>;
  listByMonth(month: Month): Promise<Budget[]>;
  listByCategory(categoryId: CategoryId): Promise<Budget[]>;
  /** Insert; throws ConstraintViolationError on a duplicate id or pair. */
  add(budget: Budget): Promise<void>;
  /** Atomic: if any budget is rejected, none are stored. */
  addMany(budgets: readonly Budget[]): Promise<void>;
  /** Replace by id; throws ConstraintViolationError if it would collide. */
  put(budget: Budget): Promise<void>;
  /**
   * "Set the budget for this category and month". If one already exists it is
   * updated in place and KEEPS ITS EXISTING ID (the given id is ignored);
   * otherwise the budget is inserted with the given id. Never overwrites an
   * unrelated budget that happens to share the id. Returns what is stored.
   */
  upsertForCategoryMonth(budget: Budget): Promise<Budget>;
  delete(id: BudgetId): Promise<void>;
}

export function createBudgetRepository(db: AppDatabase): BudgetRepository {
  const entity = 'Budget';
  const table = db.budgets;
  const store = createEntityStore({
    entity,
    db,
    table,
    toRecord: toBudgetRecord,
    fromRecord: fromBudgetRecord,
  });

  return {
    get: store.get,
    add: store.add,
    addMany: store.addMany,
    put: store.put,
    delete: store.remove,
    async getByCategoryAndMonth(categoryId, month) {
      const record = await guard(entity, () =>
        table.where('[categoryId+month]').equals([categoryId, month]).first(),
      );
      return record === undefined ? undefined : store.decode(record);
    },
    async listByMonth(month) {
      return store.decodeAll(
        await guard(entity, () => table.where('month').equals(month).toArray()),
      );
    },
    async listByCategory(categoryId) {
      const records = await guard(entity, () =>
        table
          .where('[categoryId+month]')
          .between(
            [categoryId, Dexie.minKey],
            [categoryId, Dexie.maxKey],
            true,
            true,
          )
          .toArray(),
      );
      return store.decodeAll(records);
    },
    async upsertForCategoryMonth(budget) {
      return guard(entity, () =>
        db.transaction('rw', table, async () => {
          const existing = await table
            .where('[categoryId+month]')
            .equals([budget.categoryId, budget.month])
            .first();
          if (existing === undefined) {
            await table.add(toBudgetRecord(budget));
            return budget;
          }
          const merged: Budget = { ...budget, id: store.decode(existing).id };
          await table.put(toBudgetRecord(merged));
          return merged;
        }),
      );
    },
  };
}
