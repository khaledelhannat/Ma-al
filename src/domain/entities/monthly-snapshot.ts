import type { CategoryId, CategoryType } from './category';
import type { GoalId, GoalStatus } from './goal';
import type { Id, Money, Month, Timestamp } from '../values';

export type MonthlySnapshotId = Id<'MonthlySnapshot'>;

export interface CategoryBreakdownEntry {
  readonly categoryId: CategoryId;
  readonly type: CategoryType;
  readonly total: Money;
}

export interface GoalProgressSummaryEntry {
  readonly goalId: GoalId;
  readonly fundedAmount: Money;
  /** Capped at 1 (100%) by the engine. */
  readonly progressRatio: number;
  readonly status: GoalStatus;
}

/**
 * Derived figures for one month, as produced by the Financial Engine.
 * Step 0 lists these fields followed by "etc."; this is the listed set and
 * may grow. Because a snapshot is a rebuildable cache, growing it only
 * requires marking snapshots dirty.
 */
export interface MonthlySnapshotData {
  readonly totalNetWorth: Money;
  readonly spendableMoney: Money;
  readonly income: Money;
  readonly expenses: Money;
  /** income - expenses; may be negative. */
  readonly savings: Money;
  /** savings / income, or null when income is zero (never Infinity/NaN). */
  readonly savingsRate: number | null;
  readonly categoryBreakdown: readonly CategoryBreakdownEntry[];
  readonly goalProgressSummary: readonly GoalProgressSummaryEntry[];
}

/**
 * A materialized cache of engine output. NEVER authoritative: it can be
 * dirty and must always be rebuildable from raw data.
 */
export interface MonthlySnapshot {
  readonly id: MonthlySnapshotId;
  readonly month: Month;
  readonly computedAt: Timestamp;
  readonly dirty: boolean;
  readonly data: MonthlySnapshotData;
}
