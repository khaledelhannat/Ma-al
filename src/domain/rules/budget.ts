import type { Budget } from '../entities/budget';
import { checkId, checkMonth, checkPositiveMoney } from './checks';
import { issue } from './issue';
import type { ValidationIssue } from './issue';
import type { CategoryLookup } from './references';

export function validateBudget(budget: Budget): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  checkId(issues, 'id', budget.id);
  checkId(issues, 'categoryId', budget.categoryId);
  checkMonth(issues, 'month', budget.month);
  checkPositiveMoney(issues, 'amount', budget.amount);
  return issues;
}

/** A budget applies to an existing expense category. */
export function validateBudgetReferences(
  budget: Budget,
  refs: { readonly categories: CategoryLookup },
): ValidationIssue[] {
  const category = refs.categories(budget.categoryId);
  if (!category) {
    return [
      issue('CATEGORY_NOT_FOUND', 'categoryId', 'Category does not exist.'),
    ];
  }
  if (category.type !== 'expense') {
    return [
      issue(
        'CATEGORY_TYPE_MISMATCH',
        'categoryId',
        'A budget can only be set on an expense category.',
      ),
    ];
  }
  return [];
}

/** Collection rule: at most one budget per category per month. */
export function validateBudgetUniqueness(
  budgets: readonly Budget[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  for (const budget of budgets) {
    const key = `${budget.categoryId}|${budget.month}`;
    if (seen.has(key)) {
      issues.push(
        issue(
          'DUPLICATE_BUDGET',
          'month',
          `More than one budget for category ${budget.categoryId} in ${budget.month}.`,
        ),
      );
    }
    seen.add(key);
  }
  return issues;
}
