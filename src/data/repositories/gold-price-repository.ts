import Dexie from 'dexie';
import type {
  CalendarDate,
  GoldPriceRecord,
  GoldPriceRecordId,
  Karat,
} from '../../domain';
import type { AppDatabase } from '../db';
import { guard } from '../errors';
import { fromGoldPriceRecord, toGoldPriceRecord } from '../records';
import { createEntityStore } from './entity-store';
import { lowerKey, upperKey } from './ranges';
import type { DateRange } from './ranges';

/**
 * Historical price observations. There is no uniqueness rule in Step 0, so
 * several records may share a karat and effective date (e.g. a correction).
 * This repository retrieves records; valuing gold is the engine's job.
 */
export interface GoldPriceRepository {
  get(id: GoldPriceRecordId): Promise<GoldPriceRecord | undefined>;
  add(record: GoldPriceRecord): Promise<void>;
  put(record: GoldPriceRecord): Promise<void>;
  addMany(records: readonly GoldPriceRecord[]): Promise<void>;
  putMany(records: readonly GoldPriceRecord[]): Promise<void>;
  delete(id: GoldPriceRecordId): Promise<void>;
  /** Ordered by effectiveDate, then createdAt. */
  listByKarat(karat: Karat): Promise<GoldPriceRecord[]>;
  listByEffectiveDateRange(range: DateRange): Promise<GoldPriceRecord[]>;
  /**
   * The record with the greatest effectiveDate <= `date` for the karat.
   * Ties on the same effectiveDate resolve to the latest createdAt, then the
   * greatest id, so the answer is deterministic.
   */
  findLatestOnOrBefore(
    karat: Karat,
    date: CalendarDate,
  ): Promise<GoldPriceRecord | undefined>;
}

function newest(records: GoldPriceRecord[]): GoldPriceRecord | undefined {
  return records.reduce<GoldPriceRecord | undefined>((best, candidate) => {
    if (best === undefined) return candidate;
    if (candidate.createdAt !== best.createdAt) {
      return candidate.createdAt > best.createdAt ? candidate : best;
    }
    return candidate.id > best.id ? candidate : best;
  }, undefined);
}

export function createGoldPriceRepository(
  db: AppDatabase,
): GoldPriceRepository {
  const entity = 'GoldPriceRecord';
  const table = db.goldPriceRecords;
  const store = createEntityStore({
    entity,
    db,
    table,
    toRecord: toGoldPriceRecord,
    fromRecord: fromGoldPriceRecord,
  });

  return {
    get: store.get,
    add: store.add,
    put: store.put,
    addMany: store.addMany,
    putMany: store.putMany,
    delete: store.remove,
    async listByKarat(karat) {
      const records = await guard(entity, () =>
        table
          .where('[karat+effectiveDate]')
          .between([karat, Dexie.minKey], [karat, Dexie.maxKey], true, true)
          .toArray(),
      );
      return store
        .decodeAll(records)
        .sort((a, b) =>
          a.effectiveDate !== b.effectiveDate
            ? a.effectiveDate < b.effectiveDate
              ? -1
              : 1
            : a.createdAt < b.createdAt
              ? -1
              : a.createdAt > b.createdAt
                ? 1
                : 0,
        );
    },
    async listByEffectiveDateRange(range) {
      const records = await guard(entity, () =>
        table
          .where('effectiveDate')
          .between(lowerKey(range.from), upperKey(range.to), true, true)
          .toArray(),
      );
      return store.decodeAll(records);
    },
    async findLatestOnOrBefore(karat, date) {
      const latest = await guard(entity, () =>
        table
          .where('[karat+effectiveDate]')
          .between([karat, Dexie.minKey], [karat, date], true, true)
          .reverse()
          .first(),
      );
      if (latest === undefined) return undefined;
      const sameDay = await guard(entity, () =>
        table
          .where('[karat+effectiveDate]')
          .equals([karat, latest.effectiveDate])
          .toArray(),
      );
      return newest(store.decodeAll(sameDay));
    },
  };
}
