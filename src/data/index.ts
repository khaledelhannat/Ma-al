/**
 * Public surface of the persistence layer. The rest of the app imports from
 * here (or `./repositories`) and never touches Dexie, `db` or storage records.
 */
export {
  ConstraintViolationError,
  CorruptRecordError,
  PersistenceError,
  ReferencedRecordError,
} from './errors';
export { createRepositories, repositories } from './repositories';
export type {
  AllocationFilter,
  AllocationRepository,
  AssetRepository,
  BudgetRepository,
  CategoryRepository,
  DateRange,
  GoalRepository,
  GoldHoldingRepository,
  GoldPriceRepository,
  MonthlySnapshotRepository,
  RecurringRuleRepository,
  Repositories,
  SettingsRepository,
  TransactionRepository,
  WishlistItemRepository,
} from './repositories';
