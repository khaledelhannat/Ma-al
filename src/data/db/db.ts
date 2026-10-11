import Dexie from 'dexie';
import type { DexieOptions, Table } from 'dexie';
import type {
  AllocationRecord,
  AssetRecord,
  BudgetRecord,
  CategoryRecord,
  GoalRecord,
  GoldHoldingStorageRecord,
  GoldPriceStorageRecord,
  MonthlySnapshotRecord,
  RecurringRuleRecord,
  SettingsRecord,
  TransactionRecord,
  WishlistItemRecord,
} from '../records';
import { SCHEMA_V1 } from './schema';

export const DATABASE_NAME = 'personal-financial-intelligence-system';

/**
 * The single Dexie definition. Nothing else in the app calls `new Dexie`.
 * Tables hold storage records (see `../records`), never domain objects; only
 * repositories read or write them. The Gemini API key is intentionally not
 * stored here (Step 0: it is kept separate from the financial dataset).
 */
export class AppDatabase extends Dexie {
  declare readonly transactions: Table<TransactionRecord, string>;
  declare readonly categories: Table<CategoryRecord, string>;
  declare readonly assets: Table<AssetRecord, string>;
  declare readonly goldPriceRecords: Table<GoldPriceStorageRecord, string>;
  declare readonly goldHoldingRecords: Table<GoldHoldingStorageRecord, string>;
  declare readonly allocations: Table<AllocationRecord, string>;
  declare readonly goals: Table<GoalRecord, string>;
  declare readonly wishlistItems: Table<WishlistItemRecord, string>;
  declare readonly budgets: Table<BudgetRecord, string>;
  declare readonly monthlySnapshots: Table<MonthlySnapshotRecord, string>;
  declare readonly recurringRules: Table<RecurringRuleRecord, string>;
  declare readonly settings: Table<SettingsRecord, string>;

  constructor(name: string = DATABASE_NAME, options?: DexieOptions) {
    super(name, options);
    this.version(1).stores(SCHEMA_V1);
  }
}

/** Shared application instance. Opens lazily on first use. */
export const db = new AppDatabase();
