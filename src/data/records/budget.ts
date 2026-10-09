import { asId, asMonth, asMoney } from '../../domain';
import { validateBudget } from '../../domain';
import type { Budget } from '../../domain';
import { assertValid } from './validate';

export interface BudgetRecord {
  id: string;
  categoryId: string;
  month: string;
  amount: number;
}

export function toBudgetRecord(budget: Budget): BudgetRecord {
  return {
    id: budget.id,
    categoryId: budget.categoryId,
    month: budget.month,
    amount: budget.amount,
  };
}

export function fromBudgetRecord(record: BudgetRecord): Budget {
  const value: Budget = {
    id: asId<'Budget'>(record.id),
    categoryId: asId<'Category'>(record.categoryId),
    month: asMonth(record.month),
    amount: asMoney(record.amount),
  };
  return assertValid('Budget', value, validateBudget);
}
