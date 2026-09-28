import type {
  Allocation,
  Asset,
  AssetId,
  Budget,
  Category,
  CategoryId,
  ExpenseTransaction,
  GoldAsset,
  GoldHoldingRecord,
  GoldPriceRecord,
  Goal,
  IncomeTransaction,
  MonthlySnapshot,
  NonGoldAsset,
  RecurringRule,
  TransferTransaction,
  WishlistItem,
} from '..';
import { asCalendarDate, asId, asMonth, asMoney, asTimestamp } from '..';

/** Test-only helpers: valid entities that individual tests then break. */

export const ids = {
  bank: asId<'Asset'>('00000000-0000-4000-8000-0000000000a1'),
  cash: asId<'Asset'>('00000000-0000-4000-8000-0000000000a2'),
  gold: asId<'Asset'>('00000000-0000-4000-8000-0000000000a3'),
  salary: asId<'Category'>('00000000-0000-4000-8000-0000000000c1'),
  food: asId<'Category'>('00000000-0000-4000-8000-0000000000c2'),
  goal: asId<'Goal'>('00000000-0000-4000-8000-0000000000e1'),
};

let counter = 0;
function nextId<E extends string>() {
  counter += 1;
  return asId<E>(
    `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`,
  );
}

const created = asTimestamp('2026-09-01T10:00:00.000Z');

export function buildExpense(
  overrides: Partial<ExpenseTransaction> = {},
): ExpenseTransaction {
  return {
    id: nextId<'Transaction'>(),
    type: 'expense',
    amount: asMoney(125_000),
    date: asCalendarDate('2026-09-10'),
    assetId: ids.bank,
    categoryId: ids.food,
    description: 'Groceries',
    paymentMethod: 'card',
    createdAt: created,
    updatedAt: created,
    ...overrides,
  };
}

export function buildIncome(
  overrides: Partial<IncomeTransaction> = {},
): IncomeTransaction {
  return {
    ...buildExpense(),
    type: 'income',
    categoryId: ids.salary,
    description: 'Salary',
    ...overrides,
  };
}

export function buildTransfer(
  overrides: Partial<TransferTransaction> = {},
): TransferTransaction {
  return {
    id: nextId<'Transaction'>(),
    type: 'transfer',
    amount: asMoney(50_000),
    date: asCalendarDate('2026-09-11'),
    sourceAssetId: ids.bank,
    destinationAssetId: ids.cash,
    description: 'ATM withdrawal',
    createdAt: created,
    updatedAt: created,
    ...overrides,
  };
}

export function buildCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: ids.food,
    name: 'Food',
    type: 'expense',
    essential: true,
    archived: false,
    createdAt: created,
    ...overrides,
  };
}

export function buildAsset(overrides: Partial<NonGoldAsset> = {}): Asset {
  return {
    id: ids.bank,
    name: 'Main bank account',
    type: 'bank',
    liquidity: 'liquid',
    openingBalance: asMoney(5_000_000),
    openingBalanceDate: asCalendarDate('2026-01-01'),
    createdAt: created,
    updatedAt: created,
    ...overrides,
  };
}

export function buildGoldAsset(overrides: Partial<GoldAsset> = {}): GoldAsset {
  return {
    id: ids.gold,
    name: 'Gold jewelry',
    type: 'gold',
    karat: 21,
    liquidity: 'nonLiquid',
    openingBalance: asMoney(0),
    openingBalanceDate: asCalendarDate('2026-01-01'),
    createdAt: created,
    updatedAt: created,
    ...overrides,
  };
}

export function buildGoldPrice(
  overrides: Partial<GoldPriceRecord> = {},
): GoldPriceRecord {
  return {
    id: nextId<'GoldPriceRecord'>(),
    karat: 21,
    pricePerGram: asMoney(450_050),
    effectiveDate: asCalendarDate('2026-09-01'),
    createdAt: created,
    ...overrides,
  };
}

export function buildGoldHolding(
  overrides: Partial<GoldHoldingRecord> = {},
): GoldHoldingRecord {
  return {
    id: nextId<'GoldHoldingRecord'>(),
    assetId: ids.gold,
    weightGrams: 12.5,
    startDate: asCalendarDate('2026-01-01'),
    createdAt: created,
    ...overrides,
  };
}

export function buildAllocation(
  overrides: Partial<Allocation> = {},
): Allocation {
  return {
    id: nextId<'Allocation'>(),
    assetId: ids.bank,
    amount: asMoney(2_000_000),
    reason: 'Emergency reserve',
    startDate: asCalendarDate('2026-09-01'),
    createdAt: created,
    ...overrides,
  };
}

export function buildGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: ids.goal,
    name: 'New laptop',
    targetAmount: asMoney(6_000_000),
    deadline: asCalendarDate('2027-06-30'),
    priority: 'medium',
    notes: '',
    createdAt: created,
    ...overrides,
  };
}

export function buildWishlistItem(
  overrides: Partial<WishlistItem> = {},
): WishlistItem {
  return {
    id: nextId<'WishlistItem'>(),
    name: 'Headphones',
    estimatedPrice: asMoney(300_000),
    priority: 'low',
    targetDate: asCalendarDate('2026-12-01'),
    dateAdded: asCalendarDate('2026-09-01'),
    notes: '',
    status: 'pending',
    ...overrides,
  };
}

export function buildBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: nextId<'Budget'>(),
    categoryId: ids.food,
    month: asMonth('2026-09'),
    amount: asMoney(400_000),
    ...overrides,
  };
}

export function buildRecurringRule(
  overrides: Partial<RecurringRule> = {},
): RecurringRule {
  return {
    id: nextId<'RecurringRule'>(),
    transactionTemplate: {
      type: 'income',
      amount: asMoney(1_500_000),
      categoryId: ids.salary,
      assetId: ids.bank,
      description: 'Salary',
      paymentMethod: 'bank transfer',
    },
    frequency: 'monthly',
    nextRunDate: asCalendarDate('2026-10-01'),
    active: true,
    ...overrides,
  };
}

export function buildSnapshot(): MonthlySnapshot {
  return {
    id: nextId<'MonthlySnapshot'>(),
    month: asMonth('2026-09'),
    computedAt: created,
    dirty: false,
    data: {
      totalNetWorth: asMoney(10_000_000),
      spendableMoney: asMoney(8_000_000),
      income: asMoney(1_500_000),
      expenses: asMoney(900_000),
      savings: asMoney(600_000),
      savingsRate: 0.4,
      categoryBreakdown: [],
      goalProgressSummary: [],
    },
  };
}

/** Lookup helpers backed by plain in-memory records. */
export function assetLookup(...assets: Asset[]) {
  const byId = new Map<AssetId, Asset>(assets.map((a) => [a.id, a]));
  return (id: AssetId) => byId.get(id);
}

export function categoryLookup(...categories: Category[]) {
  const byId = new Map<CategoryId, Category>(categories.map((c) => [c.id, c]));
  return (id: CategoryId) => byId.get(id);
}

/**
 * Deliberately bypasses the type system to simulate untrusted data (import,
 * storage) that violates a rule the compiler would normally forbid.
 */
export function untyped<T>(value: unknown): T {
  return value as T;
}
