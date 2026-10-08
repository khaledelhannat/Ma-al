import Dexie from 'dexie';
import type {
  AssetId,
  CategoryId,
  Month,
  RecurringRuleId,
  Transaction,
  TransactionId,
  TransactionType,
  WishlistItemId,
} from '../../domain';
import type { AppDatabase } from '../db';
import { guard } from '../errors';
import { fromTransactionRecord, toTransactionRecord } from '../records';
import { createEntityStore } from './entity-store';
import { inRange, lowerKey, monthBounds, upperKey } from './ranges';
import type { DateRange } from './ranges';

/**
 * Persistence of the Transaction ledger. All list methods return
 * transactions ordered by date (then createdAt, then id). Totals, balances
 * and category breakdowns are Financial Engine work and are not computed here.
 */
export interface TransactionRepository {
  get(id: TransactionId): Promise<Transaction | undefined>;
  add(transaction: Transaction): Promise<void>;
  put(transaction: Transaction): Promise<void>;
  addMany(transactions: readonly Transaction[]): Promise<void>;
  putMany(transactions: readonly Transaction[]): Promise<void>;
  delete(id: TransactionId): Promise<void>;
  listByDateRange(range: DateRange): Promise<Transaction[]>;
  listByMonth(month: Month): Promise<Transaction[]>;
  /** Income/expense on the asset AND transfers into or out of it. */
  listByAsset(assetId: AssetId, range?: DateRange): Promise<Transaction[]>;
  listByCategory(
    categoryId: CategoryId,
    range?: DateRange,
  ): Promise<Transaction[]>;
  listByType(type: TransactionType, range?: DateRange): Promise<Transaction[]>;
  listByRecurringRule(ruleId: RecurringRuleId): Promise<Transaction[]>;
  listBySourceWishlistItem(itemId: WishlistItemId): Promise<Transaction[]>;
}

function sortLedger(transactions: Transaction[]): Transaction[] {
  return transactions.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function createTransactionRepository(
  db: AppDatabase,
): TransactionRepository {
  const entity = 'Transaction';
  const table = db.transactions;
  const store = createEntityStore({
    entity,
    db,
    table,
    toRecord: toTransactionRecord,
    fromRecord: fromTransactionRecord,
  });

  function betweenDates(range: DateRange | undefined) {
    return guard(entity, () =>
      table
        .where('date')
        .between(lowerKey(range?.from), upperKey(range?.to), true, true)
        .toArray(),
    );
  }

  return {
    get: store.get,
    add: store.add,
    put: store.put,
    addMany: store.addMany,
    putMany: store.putMany,
    delete: store.remove,
    async listByDateRange(range) {
      return store.decodeAll(await betweenDates(range));
    },
    async listByMonth(month) {
      const { from, to } = monthBounds(month);
      const records = await guard(entity, () =>
        table.where('date').between(from, to, true, true).toArray(),
      );
      return store.decodeAll(records);
    },
    async listByAsset(assetId, range) {
      const records = await guard(entity, () =>
        table.where('assetIds').equals(assetId).toArray(),
      );
      return sortLedger(
        store.decodeAll(records.filter((r) => inRange(r.date, range))),
      );
    },
    async listByCategory(categoryId, range) {
      const records = await guard(entity, () =>
        table
          .where('[categoryId+date]')
          .between(
            [categoryId, lowerKey(range?.from)],
            [categoryId, upperKey(range?.to)],
            true,
            true,
          )
          .toArray(),
      );
      return store.decodeAll(records);
    },
    async listByType(type, range) {
      const records = await guard(entity, () =>
        table
          .where('[type+date]')
          .between(
            [type, lowerKey(range?.from)],
            [type, upperKey(range?.to)],
            true,
            true,
          )
          .toArray(),
      );
      return store.decodeAll(records);
    },
    async listByRecurringRule(ruleId) {
      const records = await guard(entity, () =>
        table
          .where('[recurringRuleId+date]')
          .between([ruleId, Dexie.minKey], [ruleId, Dexie.maxKey], true, true)
          .toArray(),
      );
      return store.decodeAll(records);
    },
    async listBySourceWishlistItem(itemId) {
      const records = await guard(entity, () =>
        table.where('sourceWishlistItemId').equals(itemId).toArray(),
      );
      return sortLedger(store.decodeAll(records));
    },
  };
}
