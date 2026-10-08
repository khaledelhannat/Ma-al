import type { Goal, GoalId, Priority } from '../../domain';
import type { AppDatabase } from '../db';
import { guard } from '../errors';
import { fromGoalRecord, toGoalRecord } from '../records';
import { createEntityStore } from './entity-store';
import { assertUnreferenced, countByCompoundPrefix } from './reference-guard';
import { lowerKey, upperKey } from './ranges';
import type { DateRange } from './ranges';

/**
 * Stored Goal state only; funded amount, progress and status are derived by
 * the engine from Allocations and never stored.
 */
export interface GoalRepository {
  get(id: GoalId): Promise<Goal | undefined>;
  add(goal: Goal): Promise<void>;
  put(goal: Goal): Promise<void>;
  addMany(goals: readonly Goal[]): Promise<void>;
  putMany(goals: readonly Goal[]): Promise<void>;
  /** Ordered by deadline. */
  list(): Promise<Goal[]>;
  listByPriority(priority: Priority): Promise<Goal[]>;
  /** Deadlines within the inclusive range, ordered by deadline. */
  listByDeadlineRange(range: DateRange): Promise<Goal[]>;
  /**
   * Deletes only a goal no Allocation (open or historical) links to;
   * otherwise throws ReferencedRecordError. Allocations may exist without a
   * goal, so detach them first.
   */
  deleteIfUnreferenced(id: GoalId): Promise<void>;
}

export function createGoalRepository(db: AppDatabase): GoalRepository {
  const entity = 'Goal';
  const table = db.goals;
  const store = createEntityStore({
    entity,
    db,
    table,
    toRecord: toGoalRecord,
    fromRecord: fromGoalRecord,
  });

  return {
    get: store.get,
    add: store.add,
    put: store.put,
    addMany: store.addMany,
    putMany: store.putMany,
    async list() {
      return store.decodeAll(
        await guard(entity, () => table.orderBy('deadline').toArray()),
      );
    },
    async listByPriority(priority) {
      return store.decodeAll(
        await guard(entity, () =>
          table.where('priority').equals(priority).sortBy('deadline'),
        ),
      );
    },
    async listByDeadlineRange(range) {
      return store.decodeAll(
        await guard(entity, () =>
          table
            .where('deadline')
            .between(lowerKey(range.from), upperKey(range.to), true, true)
            .toArray(),
        ),
      );
    },
    async deleteIfUnreferenced(id) {
      await guard(entity, () =>
        db.transaction('rw', [db.goals, db.allocations], async () => {
          await assertUnreferenced(entity, id, [
            {
              label: 'allocations',
              count: () =>
                countByCompoundPrefix(db.allocations, '[goalId+startDate]', id),
            },
          ]);
          await table.delete(id);
        }),
      );
    },
  };
}
