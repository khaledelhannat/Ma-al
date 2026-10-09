import {
  TRANSACTION_TYPES,
  asCalendarDate,
  asId,
  asMoney,
  asTimestamp,
} from '../../domain';
import { validateTransaction } from '../../domain';
import type { Transaction } from '../../domain';
import {
  forbidFields,
  requireEnum,
  requireNullField,
  requireString,
} from './codec';
import { assertValid } from './validate';

interface TransactionRecordBase {
  id: string;
  amount: number;
  date: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  sourceWishlistItemId?: string;
  recurringRuleId?: string;
  /**
   * Persistence-only. Every asset the transaction touches (one for
   * income/expense, two for a transfer), indexed multi-entry so "all
   * transactions of asset X" is a single query. Derived on write, dropped on
   * read.
   */
  assetIds: string[];
}

export interface IncomeExpenseTransactionRecord extends TransactionRecordBase {
  type: 'income' | 'expense';
  assetId: string;
  categoryId: string;
  paymentMethod: string;
}

export interface TransferTransactionRecord extends TransactionRecordBase {
  type: 'transfer';
  sourceAssetId: string;
  destinationAssetId: string;
  /** Always null for transfers (domain: absent). Not indexed by IndexedDB. */
  categoryId: null;
  paymentMethod?: string;
}

export type TransactionRecord =
  IncomeExpenseTransactionRecord | TransferTransactionRecord;

export function toTransactionRecord(tx: Transaction): TransactionRecord {
  const base = {
    id: tx.id,
    amount: tx.amount,
    date: tx.date,
    description: tx.description,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
    ...(tx.sourceWishlistItemId !== undefined
      ? { sourceWishlistItemId: tx.sourceWishlistItemId }
      : {}),
    ...(tx.recurringRuleId !== undefined
      ? { recurringRuleId: tx.recurringRuleId }
      : {}),
  };
  if (tx.type === 'transfer') {
    return {
      ...base,
      type: 'transfer',
      sourceAssetId: tx.sourceAssetId,
      destinationAssetId: tx.destinationAssetId,
      categoryId: null,
      assetIds: [tx.sourceAssetId, tx.destinationAssetId],
      ...(tx.paymentMethod !== undefined
        ? { paymentMethod: tx.paymentMethod }
        : {}),
    };
  }
  return {
    ...base,
    type: tx.type,
    assetId: tx.assetId,
    categoryId: tx.categoryId,
    paymentMethod: tx.paymentMethod,
    assetIds: [tx.assetId],
  };
}

export function fromTransactionRecord(record: TransactionRecord): Transaction {
  return assertValid(
    'Transaction',
    reconstructTransaction(record),
    validateTransaction,
  );
}

function reconstructTransaction(record: TransactionRecord): Transaction {
  const type = requireEnum(TRANSACTION_TYPES, record.type, 'type');
  const base = {
    id: asId<'Transaction'>(record.id),
    amount: asMoney(record.amount),
    date: asCalendarDate(record.date),
    // Step 2 has no description rule, so only its primitive type is checked.
    description: requireString(record.description, 'description'),
    createdAt: asTimestamp(record.createdAt),
    updatedAt: asTimestamp(record.updatedAt),
    ...(record.sourceWishlistItemId !== undefined
      ? {
          sourceWishlistItemId: asId<'WishlistItem'>(
            record.sourceWishlistItemId,
          ),
        }
      : {}),
    ...(record.recurringRuleId !== undefined
      ? { recurringRuleId: asId<'RecurringRule'>(record.recurringRuleId) }
      : {}),
  };
  if (record.type === 'transfer') {
    // Persisted transfer contract: categoryId is an own property with the
    // exact value null (its storage form of "no category"); an assetId is
    // corruption. Null is not accepted for any other forbidden field.
    requireNullField(record, 'categoryId', 'transfer');
    forbidFields(record, ['assetId'], 'transfer');
    return {
      ...base,
      type: 'transfer',
      sourceAssetId: asId<'Asset'>(record.sourceAssetId),
      destinationAssetId: asId<'Asset'>(record.destinationAssetId),
      ...(record.paymentMethod !== undefined
        ? { paymentMethod: record.paymentMethod }
        : {}),
    };
  }
  forbidFields(record, ['sourceAssetId', 'destinationAssetId'], type);
  const fields = {
    assetId: asId<'Asset'>(record.assetId),
    categoryId: asId<'Category'>(record.categoryId),
    paymentMethod: record.paymentMethod,
  };
  return type === 'income'
    ? { ...base, ...fields, type: 'income' }
    : { ...base, ...fields, type: 'expense' };
}
