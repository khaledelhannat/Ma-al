import type { Month, MonthlySnapshot, MonthlySnapshotId } from '../../domain';
import type { AppDatabase } from '../db';
import { guard } from '../errors';
import { fromMonthlySnapshotRecord, toMonthlySnapshotRecord } from '../records';
import { toFlag } from '../records/codec';
import { createEntityStore } from './entity-store';

/**
 * A snapshot is a rebuildable cache, never authoritative. At most one exists
 * per month, enforced by a unique index on `month`. Dirty propagation to later
 * months (Step 0 section 7) is engine logic; it can be built on
 * `listFromMonth` + `putMany` and is intentionally not encoded here.
 */
export interface MonthlySnapshotRepository {
  get(id: MonthlySnapshotId): Promise<MonthlySnapshot | undefined>;
  getByMonth(month: Month): Promise<MonthlySnapshot | undefined>;
  /** Ordered by month. */
  list(): Promise<MonthlySnapshot[]>;
  /** Snapshots for `month` and every later month, ordered by month. */
  listFromMonth(month: Month): Promise<MonthlySnapshot[]>;
  listDirty(): Promise<MonthlySnapshot[]>;
  /** Insert; throws ConstraintViolationError if the month already has one. */
  add(snapshot: MonthlySnapshot): Promise<void>;
  /** Replace by id; throws ConstraintViolationError if it would collide. */
  put(snapshot: MonthlySnapshot): Promise<void>;
  /** Atomic bulk replace by id. */
  putMany(snapshots: readonly MonthlySnapshot[]): Promise<void>;
  /**
   * Store the snapshot as THE snapshot of its month: replaces an existing one
   * (keeping its id) or inserts. Returns what is stored.
   */
  upsertForMonth(snapshot: MonthlySnapshot): Promise<MonthlySnapshot>;
  delete(id: MonthlySnapshotId): Promise<void>;
}

export function createMonthlySnapshotRepository(
  db: AppDatabase,
): MonthlySnapshotRepository {
  const entity = 'MonthlySnapshot';
  const table = db.monthlySnapshots;
  const store = createEntityStore({
    entity,
    db,
    table,
    toRecord: toMonthlySnapshotRecord,
    fromRecord: fromMonthlySnapshotRecord,
  });

  return {
    get: store.get,
    add: store.add,
    put: store.put,
    putMany: store.putMany,
    delete: store.remove,
    async getByMonth(month) {
      const record = await guard(entity, () =>
        table.where('month').equals(month).first(),
      );
      return record === undefined ? undefined : store.decode(record);
    },
    async list() {
      return store.decodeAll(
        await guard(entity, () => table.orderBy('month').toArray()),
      );
    },
    async listFromMonth(month) {
      return store.decodeAll(
        await guard(entity, () =>
          table.where('month').aboveOrEqual(month).toArray(),
        ),
      );
    },
    async listDirty() {
      return store.decodeAll(
        await guard(entity, () =>
          table.where('dirty').equals(toFlag(true)).sortBy('month'),
        ),
      );
    },
    async upsertForMonth(snapshot) {
      return guard(entity, () =>
        db.transaction('rw', table, async () => {
          const existing = await table
            .where('month')
            .equals(snapshot.month)
            .first();
          if (existing === undefined) {
            await table.add(toMonthlySnapshotRecord(snapshot));
            return snapshot;
          }
          const merged: MonthlySnapshot = {
            ...snapshot,
            id: store.decode(existing).id,
          };
          await table.put(toMonthlySnapshotRecord(merged));
          return merged;
        }),
      );
    },
  };
}
