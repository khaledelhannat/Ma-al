import Dexie from 'dexie';
import { isActiveOn } from '../../domain';
import type {
  Allocation,
  AllocationId,
  AssetId,
  CalendarDate,
  GoalId,
} from '../../domain';
import type { AppDatabase } from '../db';
import { guard } from '../errors';
import { fromAllocationRecord, toAllocationRecord } from '../records';
import { createEntityStore } from './entity-store';
import { byKeyThenId } from './ranges';

export interface AllocationFilter {
  readonly assetId?: AssetId;
  readonly goalId?: GoalId;
}

/**
 * Time-aware allocations ([startDate, endDate) intervals). Close-and-open
 * moves, reductions and releases are workflows for a later step; here each
 * record is stored and retrieved as-is. Funding sums, coverage and spendable
 * amounts are engine calculations.
 */
export interface AllocationRepository {
  get(id: AllocationId): Promise<Allocation | undefined>;
  add(allocation: Allocation): Promise<void>;
  put(allocation: Allocation): Promise<void>;
  addMany(allocations: readonly Allocation[]): Promise<void>;
  putMany(allocations: readonly Allocation[]): Promise<void>;
  delete(id: AllocationId): Promise<void>;
  /** Full history (open and closed), ordered by startDate. */
  listByAsset(assetId: AssetId): Promise<Allocation[]>;
  listByGoal(goalId: GoalId): Promise<Allocation[]>;
  /** Allocations active on `date` under the [startDate, endDate) rule. */
  listActiveOn(
    date: CalendarDate,
    filter?: AllocationFilter,
  ): Promise<Allocation[]>;
  /** Allocations with no endDate ("currently open"), optionally filtered. */
  listOpen(filter?: AllocationFilter): Promise<Allocation[]>;
}

export function createAllocationRepository(
  db: AppDatabase,
): AllocationRepository {
  const entity = 'Allocation';
  const table = db.allocations;
  const store = createEntityStore({
    entity,
    db,
    table,
    toRecord: toAllocationRecord,
    fromRecord: fromAllocationRecord,
  });
  const byStart = byKeyThenId<Allocation>((a) => a.startDate);

  async function fetch(
    filter: AllocationFilter | undefined,
    upTo: CalendarDate | undefined,
  ): Promise<Allocation[]> {
    const upper = upTo ?? Dexie.maxKey;
    const records = await guard(entity, () => {
      if (filter?.assetId !== undefined) {
        return table
          .where('[assetId+startDate]')
          .between(
            [filter.assetId, Dexie.minKey],
            [filter.assetId, upper],
            true,
            true,
          )
          .toArray();
      }
      if (filter?.goalId !== undefined) {
        return table
          .where('[goalId+startDate]')
          .between(
            [filter.goalId, Dexie.minKey],
            [filter.goalId, upper],
            true,
            true,
          )
          .toArray();
      }
      return upTo === undefined
        ? table.toArray()
        : table.where('startDate').belowOrEqual(upTo).toArray();
    });
    return store
      .decodeAll(records)
      .filter((a) => filter?.goalId === undefined || a.goalId === filter.goalId)
      .filter(
        (a) => filter?.assetId === undefined || a.assetId === filter.assetId,
      )
      .sort(byStart);
  }

  return {
    get: store.get,
    add: store.add,
    put: store.put,
    addMany: store.addMany,
    putMany: store.putMany,
    delete: store.remove,
    listByAsset: (assetId) => fetch({ assetId }, undefined),
    listByGoal: (goalId) => fetch({ goalId }, undefined),
    async listActiveOn(date, filter) {
      return (await fetch(filter, date)).filter((a) => isActiveOn(a, date));
    },
    async listOpen(filter) {
      return (await fetch(filter, undefined)).filter(
        (a) => a.endDate === undefined,
      );
    },
  };
}
