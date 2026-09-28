import type { Allocation } from '../entities/allocation';
import {
  checkId,
  checkInterval,
  checkNonBlank,
  checkPositiveMoney,
  checkTimestamp,
} from './checks';
import { issue } from './issue';
import type { ValidationIssue } from './issue';
import type { AssetLookup, GoalLookup } from './references';

/**
 * An allocation needs a positive amount, a meaningful reason, and a valid
 * [startDate, endDate) interval. A goal is optional.
 */
export function validateAllocation(allocation: Allocation): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  checkId(issues, 'id', allocation.id);
  checkId(issues, 'assetId', allocation.assetId);
  checkPositiveMoney(issues, 'amount', allocation.amount);
  if (allocation.goalId !== undefined) {
    checkId(issues, 'goalId', allocation.goalId);
  }
  checkNonBlank(issues, 'reason', allocation.reason);
  checkInterval(issues, allocation.startDate, allocation.endDate);
  checkTimestamp(issues, 'createdAt', allocation.createdAt);
  return issues;
}

export function validateAllocationReferences(
  allocation: Allocation,
  refs: { readonly assets: AssetLookup; readonly goals: GoalLookup },
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!refs.assets(allocation.assetId)) {
    issues.push(issue('ASSET_NOT_FOUND', 'assetId', 'Asset does not exist.'));
  }
  if (allocation.goalId !== undefined && !refs.goals(allocation.goalId)) {
    issues.push(issue('GOAL_NOT_FOUND', 'goalId', 'Goal does not exist.'));
  }
  return issues;
}
