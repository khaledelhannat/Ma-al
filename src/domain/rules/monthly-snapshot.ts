import type { MonthlySnapshot } from '../entities/monthly-snapshot';
import { checkBoolean, checkId, checkMonth, checkTimestamp } from './checks';
import type { ValidationIssue } from './issue';

/**
 * Shallow by design: a snapshot is a rebuildable cache, so only its
 * envelope is validated. The contents are the Financial Engine's output
 * and are regenerated, not trusted.
 */
export function validateMonthlySnapshot(
  snapshot: MonthlySnapshot,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  checkId(issues, 'id', snapshot.id);
  checkMonth(issues, 'month', snapshot.month);
  checkTimestamp(issues, 'computedAt', snapshot.computedAt);
  checkBoolean(issues, 'dirty', snapshot.dirty);
  return issues;
}
