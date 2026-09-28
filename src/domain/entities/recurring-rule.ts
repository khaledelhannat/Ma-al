import type {
  ExpenseTransaction,
  IncomeTransaction,
  TransferTransaction,
} from './transaction';
import type { CalendarDate, Id } from '../values';

export type RecurringRuleId = Id<'RecurringRule'>;

export const RECURRENCE_FREQUENCIES = ['weekly', 'monthly', 'yearly'] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

/**
 * The transaction a rule generates, per transaction type. Derived from the
 * Transaction types themselves (Pick), so a template can never allow a
 * combination a real Transaction forbids, e.g. a transfer with a category.
 *
 * `paymentMethod` is included beyond the fields Step 0 lists for a
 * template, because a concrete income/expense Transaction requires one and
 * could not otherwise be generated from the template.
 */
export type IncomeTransactionTemplate = Pick<
  IncomeTransaction,
  | 'type'
  | 'amount'
  | 'categoryId'
  | 'assetId'
  | 'description'
  | 'paymentMethod'
  | 'sourceAssetId'
  | 'destinationAssetId'
>;

export type ExpenseTransactionTemplate = Pick<
  ExpenseTransaction,
  | 'type'
  | 'amount'
  | 'categoryId'
  | 'assetId'
  | 'description'
  | 'paymentMethod'
  | 'sourceAssetId'
  | 'destinationAssetId'
>;

export type TransferTransactionTemplate = Pick<
  TransferTransaction,
  | 'type'
  | 'amount'
  | 'sourceAssetId'
  | 'destinationAssetId'
  | 'description'
  | 'paymentMethod'
  | 'assetId'
  | 'categoryId'
>;

export type TransactionTemplate =
  | IncomeTransactionTemplate
  | ExpenseTransactionTemplate
  | TransferTransactionTemplate;

/** Generates concrete Transactions; never counted in totals itself. */
export interface RecurringRule {
  readonly id: RecurringRuleId;
  readonly transactionTemplate: TransactionTemplate;
  readonly frequency: RecurrenceFrequency;
  readonly nextRunDate: CalendarDate;
  readonly active: boolean;
}
