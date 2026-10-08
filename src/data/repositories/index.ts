import type { AppDatabase } from '../db';
import { db } from '../db';
import { createAllocationRepository } from './allocation-repository';
import { createAssetRepository } from './asset-repository';
import { createBudgetRepository } from './budget-repository';
import { createCategoryRepository } from './category-repository';
import { createGoalRepository } from './goal-repository';
import { createGoldHoldingRepository } from './gold-holding-repository';
import { createGoldPriceRepository } from './gold-price-repository';
import { createMonthlySnapshotRepository } from './monthly-snapshot-repository';
import { createRecurringRuleRepository } from './recurring-rule-repository';
import { createSettingsRepository } from './settings-repository';
import { createTransactionRepository } from './transaction-repository';
import { createWishlistItemRepository } from './wishlist-item-repository';

export type {
  AllocationFilter,
  AllocationRepository,
} from './allocation-repository';
export type { AssetRepository } from './asset-repository';
export type { BudgetRepository } from './budget-repository';
export type { CategoryRepository } from './category-repository';
export type { GoalRepository } from './goal-repository';
export type { GoldHoldingRepository } from './gold-holding-repository';
export type { GoldPriceRepository } from './gold-price-repository';
export type { MonthlySnapshotRepository } from './monthly-snapshot-repository';
export type { DateRange } from './ranges';
export type { RecurringRuleRepository } from './recurring-rule-repository';
export type { SettingsRepository } from './settings-repository';
export type { TransactionRepository } from './transaction-repository';
export type { WishlistItemRepository } from './wishlist-item-repository';

export function createRepositories(database: AppDatabase) {
  return {
    transactions: createTransactionRepository(database),
    categories: createCategoryRepository(database),
    assets: createAssetRepository(database),
    goldPrices: createGoldPriceRepository(database),
    goldHoldings: createGoldHoldingRepository(database),
    allocations: createAllocationRepository(database),
    goals: createGoalRepository(database),
    wishlistItems: createWishlistItemRepository(database),
    budgets: createBudgetRepository(database),
    monthlySnapshots: createMonthlySnapshotRepository(database),
    recurringRules: createRecurringRuleRepository(database),
    settings: createSettingsRepository(database),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;

/** Application-wide repositories bound to the shared database instance. */
export const repositories: Repositories = createRepositories(db);
