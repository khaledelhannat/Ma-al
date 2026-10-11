import type { Table } from 'dexie';
import { CorruptRecordError, guard } from '../errors';
import type { AppDatabase } from '../db';

export interface EntityStoreConfig<TDomain, TRecord extends { id: string }> {
  /** Human-readable entity name used in error messages. */
  entity: string;
  db: AppDatabase;
  table: Table<TRecord, string>;
  toRecord: (value: TDomain) => TRecord;
  fromRecord: (record: TRecord) => TDomain;
}

/**
 * Shared plumbing for id-keyed entities: encode/decode at the boundary,
 * typed error translation, and atomic bulk writes. Repositories pick only the
 * operations that make sense for their entity; this is not a base class.
 */
export function createEntityStore<TDomain, TRecord extends { id: string }>(
  config: EntityStoreConfig<TDomain, TRecord>,
) {
  const { entity, db, table, toRecord, fromRecord } = config;

  function decode(record: TRecord): TDomain {
    try {
      return fromRecord(record);
    } catch (error) {
      throw new CorruptRecordError(entity, record.id, error);
    }
  }

  function decodeAll(records: readonly TRecord[]): TDomain[] {
    return records.map(decode);
  }

  return {
    decode,
    decodeAll,
    async get(id: string): Promise<TDomain | undefined> {
      const record = await guard(entity, () => table.get(id));
      return record === undefined ? undefined : decode(record);
    },
    async list(): Promise<TDomain[]> {
      return decodeAll(await guard(entity, () => table.toArray()));
    },
    async add(value: TDomain): Promise<void> {
      await guard(entity, () => table.add(toRecord(value)));
    },
    async put(value: TDomain): Promise<void> {
      await guard(entity, () => table.put(toRecord(value)));
    },
    /** All-or-nothing: one rejected record rolls back the whole batch. */
    async addMany(values: readonly TDomain[]): Promise<void> {
      const records = values.map(toRecord);
      await guard(entity, () =>
        db.transaction('rw', table, () => table.bulkAdd(records)),
      );
    },
    async putMany(values: readonly TDomain[]): Promise<void> {
      const records = values.map(toRecord);
      await guard(entity, () =>
        db.transaction('rw', table, () => table.bulkPut(records)),
      );
    },
    async remove(id: string): Promise<void> {
      await guard(entity, () => table.delete(id));
    },
  };
}
