import type {
  CalendarDate,
  RecurringRule,
  RecurringRuleId,
} from '../../domain';
import type { AppDatabase } from '../db';
import { guard } from '../errors';
import { fromRecurringRuleRecord, toRecurringRuleRecord } from '../records';
import { toFlag } from '../records/codec';
import { createEntityStore } from './entity-store';
import Dexie from 'dexie';

/**
 * Stores rules only. Generating (or backfilling) Transactions from them is a
 * later workflow. Deleting a rule never touches the Transactions it already
 * generated: they are ordinary ledger entries that keep their recurringRuleId.
 */
export interface RecurringRuleRepository {
  get(id: RecurringRuleId): Promise<RecurringRule | undefined>;
  add(rule: RecurringRule): Promise<void>;
  put(rule: RecurringRule): Promise<void>;
  addMany(rules: readonly RecurringRule[]): Promise<void>;
  putMany(rules: readonly RecurringRule[]): Promise<void>;
  delete(id: RecurringRuleId): Promise<void>;
  /** Ordered by nextRunDate. */
  list(): Promise<RecurringRule[]>;
  listByActive(active: boolean): Promise<RecurringRule[]>;
  /** Active rules whose nextRunDate is on or before `date`, oldest first. */
  listActiveDueOnOrBefore(date: CalendarDate): Promise<RecurringRule[]>;
}

export function createRecurringRuleRepository(
  db: AppDatabase,
): RecurringRuleRepository {
  const entity = 'RecurringRule';
  const table = db.recurringRules;
  const store = createEntityStore({
    entity,
    db,
    table,
    toRecord: toRecurringRuleRecord,
    fromRecord: fromRecurringRuleRecord,
  });

  return {
    get: store.get,
    add: store.add,
    put: store.put,
    addMany: store.addMany,
    putMany: store.putMany,
    delete: store.remove,
    async list() {
      const rules = await store.list();
      return rules.sort((a, b) =>
        a.nextRunDate !== b.nextRunDate
          ? a.nextRunDate < b.nextRunDate
            ? -1
            : 1
          : a.id < b.id
            ? -1
            : 1,
      );
    },
    async listByActive(active) {
      return store.decodeAll(
        await guard(entity, () =>
          table.where('active').equals(toFlag(active)).toArray(),
        ),
      );
    },
    async listActiveDueOnOrBefore(date) {
      return store.decodeAll(
        await guard(entity, () =>
          table
            .where('[active+nextRunDate]')
            .between(
              [toFlag(true), Dexie.minKey],
              [toFlag(true), date],
              true,
              true,
            )
            .toArray(),
        ),
      );
    },
  };
}
