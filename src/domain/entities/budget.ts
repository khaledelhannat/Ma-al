import type { CategoryId } from './category';
import type { Id, Money, Month } from '../values';

export type BudgetId = Id<'Budget'>;

/**
 * A monthly spending limit for one expense category. At most one Budget
 * exists per (categoryId, month). Actuals, remaining, percent used and
 * variance are derived by the Financial Engine.
 */
export interface Budget {
  readonly id: BudgetId;
  readonly categoryId: CategoryId;
  readonly month: Month;
  readonly amount: Money;
}
