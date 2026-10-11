import Dexie from 'dexie';
import { isActiveOn } from '../../domain';
import type {
  AssetId,
  CalendarDate,
  GoldHoldingRecord,
  GoldHoldingRecordId,
} from '../../domain';
import type { AppDatabase } from '../db';
import { guard } from '../errors';
import { fromGoldHoldingRecord, toGoldHoldingRecord } from '../records';
import { createEntityStore } from './entity-store';
import { byKeyThenId } from './ranges';

/**
 * Time-aware gold weight history ([startDate, endDate) intervals). Closing
 * and reopening a record on a weight change is a workflow for a later step;
 * this repository only stores and retrieves the records. Non-overlap is a
 * domain collection rule (validateGoldHoldingHistory), not a storage constraint.
 */
export interface GoldHoldingRepository {
  get(id: GoldHoldingRecordId): Promise<GoldHoldingRecord | undefined>;
  add(record: GoldHoldingRecord): Promise<void>;
  put(record: GoldHoldingRecord): Promise<void>;
  addMany(records: readonly GoldHoldingRecord[]): Promise<void>;
  putMany(records: readonly GoldHoldingRecord[]): Promise<void>;
  delete(id: GoldHoldingRecordId): Promise<void>;
  /** Full history of one asset, ordered by startDate. */
  listByAsset(assetId: AssetId): Promise<GoldHoldingRecord[]>;
  /** The record active on `date` for the asset, if any. */
  findActiveOn(
    assetId: AssetId,
    date: CalendarDate,
  ): Promise<GoldHoldingRecord | undefined>;
  /** Every record active on `date`, across all gold assets. */
  listActiveOn(date: CalendarDate): Promise<GoldHoldingRecord[]>;
}

export function createGoldHoldingRepository(
  db: AppDatabase,
): GoldHoldingRepository {
  const entity = 'GoldHoldingRecord';
  const table = db.goldHoldingRecords;
  const store = createEntityStore({
    entity,
    db,
    table,
    toRecord: toGoldHoldingRecord,
    fromRecord: fromGoldHoldingRecord,
  });
  const byStart = byKeyThenId<GoldHoldingRecord>((r) => r.startDate);

  async function startedOnOrBefore(assetId: AssetId, date: CalendarDate) {
    const records = await guard(entity, () =>
      table
        .where('[assetId+startDate]')
        .between([assetId, Dexie.minKey], [assetId, date], true, true)
        .toArray(),
    );
    return store.decodeAll(records);
  }

  return {
    get: store.get,
    add: store.add,
    put: store.put,
    addMany: store.addMany,
    putMany: store.putMany,
    delete: store.remove,
    async listByAsset(assetId) {
      const records = await guard(entity, () =>
        table
          .where('[assetId+startDate]')
          .between([assetId, Dexie.minKey], [assetId, Dexie.maxKey], true, true)
          .toArray(),
      );
      return store.decodeAll(records).sort(byStart);
    },
    async findActiveOn(assetId, date) {
      const active = (await startedOnOrBefore(assetId, date)).filter((r) =>
        isActiveOn(r, date),
      );
      return active.sort(byStart).at(-1);
    },
    async listActiveOn(date) {
      const records = await guard(entity, () =>
        table.where('startDate').belowOrEqual(date).toArray(),
      );
      return store
        .decodeAll(records)
        .filter((r) => isActiveOn(r, date))
        .sort(byStart);
    },
  };
}
