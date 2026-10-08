import {
  RECURRENCE_FREQUENCIES,
  asCalendarDate,
  asId,
  asMoney,
} from '../../domain';
import type { RecurringRule } from '../../domain';
import { fromFlag, requireEnum, toFlag } from './codec';
import type { Flag } from './codec';

export type TransactionTemplateRecord =
  | {
      type: 'income' | 'expense';
      amount: number;
      categoryId: string;
      assetId: string;
      description: string;
      paymentMethod: string;
    }
  | {
      type: 'transfer';
      amount: number;
      sourceAssetId: string;
      destinationAssetId: string;
      description: string;
      paymentMethod?: string;
    };

export interface RecurringRuleRecord {
  id: string;
  transactionTemplate: TransactionTemplateRecord;
  frequency: string;
  nextRunDate: string;
  /** 0/1 so it can be indexed. */
  active: Flag;
}

function toTemplateRecord(
  template: RecurringRule['transactionTemplate'],
): TransactionTemplateRecord {
  if (template.type === 'transfer') {
    return {
      type: 'transfer',
      amount: template.amount,
      sourceAssetId: template.sourceAssetId,
      destinationAssetId: template.destinationAssetId,
      description: template.description,
      ...(template.paymentMethod !== undefined
        ? { paymentMethod: template.paymentMethod }
        : {}),
    };
  }
  return {
    type: template.type,
    amount: template.amount,
    categoryId: template.categoryId,
    assetId: template.assetId,
    description: template.description,
    paymentMethod: template.paymentMethod,
  };
}

function fromTemplateRecord(
  record: TransactionTemplateRecord,
): RecurringRule['transactionTemplate'] {
  if (record.type === 'transfer') {
    return {
      type: 'transfer',
      amount: asMoney(record.amount),
      sourceAssetId: asId<'Asset'>(record.sourceAssetId),
      destinationAssetId: asId<'Asset'>(record.destinationAssetId),
      description: record.description,
      ...(record.paymentMethod !== undefined
        ? { paymentMethod: record.paymentMethod }
        : {}),
    };
  }
  const fields = {
    amount: asMoney(record.amount),
    categoryId: asId<'Category'>(record.categoryId),
    assetId: asId<'Asset'>(record.assetId),
    description: record.description,
    paymentMethod: record.paymentMethod,
  };
  const type = requireEnum(['income', 'expense'] as const, record.type, 'type');
  return type === 'income'
    ? { ...fields, type: 'income' }
    : { ...fields, type: 'expense' };
}

export function toRecurringRuleRecord(
  rule: RecurringRule,
): RecurringRuleRecord {
  return {
    id: rule.id,
    transactionTemplate: toTemplateRecord(rule.transactionTemplate),
    frequency: rule.frequency,
    nextRunDate: rule.nextRunDate,
    active: toFlag(rule.active),
  };
}

export function fromRecurringRuleRecord(
  record: RecurringRuleRecord,
): RecurringRule {
  return {
    id: asId<'RecurringRule'>(record.id),
    transactionTemplate: fromTemplateRecord(record.transactionTemplate),
    frequency: requireEnum(
      RECURRENCE_FREQUENCIES,
      record.frequency,
      'frequency',
    ),
    nextRunDate: asCalendarDate(record.nextRunDate),
    active: fromFlag(record.active, 'active'),
  };
}
