import {
  CATEGORY_TYPES,
  GOAL_STATUSES,
  asId,
  asMonth,
  asMoney,
  asTimestamp,
} from '../../domain';
import { validateMonthlySnapshot } from '../../domain';
import type { MonthlySnapshot, MonthlySnapshotData } from '../../domain';
import {
  fromFlag,
  requireArray,
  requireEnum,
  requireNumber,
  toFlag,
} from './codec';
import { assertValid } from './validate';
import type { Flag } from './codec';

interface MonthlySnapshotDataRecord {
  totalNetWorth: number;
  spendableMoney: number;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number | null;
  categoryBreakdown: { categoryId: string; type: string; total: number }[];
  goalProgressSummary: {
    goalId: string;
    fundedAmount: number;
    progressRatio: number;
    status: string;
  }[];
}

export interface MonthlySnapshotRecord {
  id: string;
  month: string;
  computedAt: string;
  /** 0/1 so dirty snapshots can be found through an index. */
  dirty: Flag;
  data: MonthlySnapshotDataRecord;
}

function toDataRecord(data: MonthlySnapshotData): MonthlySnapshotDataRecord {
  return {
    totalNetWorth: data.totalNetWorth,
    spendableMoney: data.spendableMoney,
    income: data.income,
    expenses: data.expenses,
    savings: data.savings,
    savingsRate: data.savingsRate,
    categoryBreakdown: data.categoryBreakdown.map((entry) => ({
      categoryId: entry.categoryId,
      type: entry.type,
      total: entry.total,
    })),
    goalProgressSummary: data.goalProgressSummary.map((entry) => ({
      goalId: entry.goalId,
      fundedAmount: entry.fundedAmount,
      progressRatio: entry.progressRatio,
      status: entry.status,
    })),
  };
}

function fromDataRecord(
  record: MonthlySnapshotDataRecord,
): MonthlySnapshotData {
  const rate = record.savingsRate;
  return {
    totalNetWorth: asMoney(record.totalNetWorth),
    spendableMoney: asMoney(record.spendableMoney),
    income: asMoney(record.income),
    expenses: asMoney(record.expenses),
    savings: asMoney(record.savings),
    savingsRate: rate === null ? null : requireNumber(rate, 'savingsRate'),
    categoryBreakdown: requireArray(
      record.categoryBreakdown,
      'categoryBreakdown',
    ).map((entry) => ({
      categoryId: asId<'Category'>(entry.categoryId),
      type: requireEnum(CATEGORY_TYPES, entry.type, 'categoryBreakdown.type'),
      total: asMoney(entry.total),
    })),
    goalProgressSummary: requireArray(
      record.goalProgressSummary,
      'goalProgressSummary',
    ).map((entry) => ({
      goalId: asId<'Goal'>(entry.goalId),
      fundedAmount: asMoney(entry.fundedAmount),
      progressRatio: requireNumber(entry.progressRatio, 'progressRatio'),
      status: requireEnum(GOAL_STATUSES, entry.status, 'status'),
    })),
  };
}

export function toMonthlySnapshotRecord(
  snapshot: MonthlySnapshot,
): MonthlySnapshotRecord {
  return {
    id: snapshot.id,
    month: snapshot.month,
    computedAt: snapshot.computedAt,
    dirty: toFlag(snapshot.dirty),
    data: toDataRecord(snapshot.data),
  };
}

export function fromMonthlySnapshotRecord(
  record: MonthlySnapshotRecord,
): MonthlySnapshot {
  const snapshot: MonthlySnapshot = {
    id: asId<'MonthlySnapshot'>(record.id),
    month: asMonth(record.month),
    computedAt: asTimestamp(record.computedAt),
    dirty: fromFlag(record.dirty, 'dirty'),
    data: fromDataRecord(record.data),
  };
  // Step 2 validates the envelope only (the contents are rebuildable engine
  // output); the nested data was strictly reconstructed above.
  return assertValid('MonthlySnapshot', snapshot, validateMonthlySnapshot);
}
