import { asId, asMonth, asMoney } from '../../domain';
import type { Budget } from '../../domain';

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
  return {
    id: asId<'Budget'>(record.id),
    categoryId: asId<'Category'>(record.categoryId),
    month: asMonth(record.month),
    amount: asMoney(record.amount),
  };
}
