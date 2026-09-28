import { TRANSACTION_TYPES } from '../entities/transaction';
import type { Transaction } from '../entities/transaction';
import type { TransactionTemplate } from '../entities/recurring-rule';
import {
  checkDate,
  checkEnum,
  checkId,
  checkNonBlank,
  checkPositiveMoney,
  checkTimestampPair,
  hasValue,
} from './checks';
import { issue } from './issue';
import type { ValidationIssue } from './issue';
import type { AssetLookup, CategoryLookup } from './references';

/**
 * Rules shared by a Transaction and a RecurringRule's template: amount and
 * the type-specific asset/category fields. `prefix` is prepended to issue
 * paths (e.g. `transactionTemplate.`).
 *
 * The type system already forbids most illegal combinations; these runtime
 * checks exist because imported or stored data is untrusted.
 */
export function validateTransactionCore(
  value: TransactionTemplate,
  prefix = '',
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const at = (field: string) => `${prefix}${field}`;

  checkEnum(issues, at('type'), TRANSACTION_TYPES, value.type);
  checkPositiveMoney(issues, at('amount'), value.amount);

  const type: unknown = value.type;
  if (type === 'income' || type === 'expense') {
    checkId(issues, at('assetId'), value.assetId);
    checkId(issues, at('categoryId'), value.categoryId);
    checkNonBlank(issues, at('paymentMethod'), value.paymentMethod);
    if (
      hasValue(value, 'sourceAssetId') ||
      hasValue(value, 'destinationAssetId')
    ) {
      issues.push(
        issue(
          'TRANSACTION_HAS_TRANSFER_FIELDS',
          at('type'),
          'Only a transfer may have sourceAssetId or destinationAssetId.',
        ),
      );
    }
  } else if (type === 'transfer') {
    checkId(issues, at('sourceAssetId'), value.sourceAssetId);
    checkId(issues, at('destinationAssetId'), value.destinationAssetId);
    if (
      value.sourceAssetId !== undefined &&
      value.sourceAssetId === value.destinationAssetId
    ) {
      issues.push(
        issue(
          'TRANSFER_SAME_ASSET',
          at('destinationAssetId'),
          'A transfer needs two different assets.',
        ),
      );
    }
    if (hasValue(value, 'categoryId')) {
      issues.push(
        issue(
          'TRANSFER_HAS_CATEGORY',
          at('categoryId'),
          'A transfer has no category.',
        ),
      );
    }
    if (hasValue(value, 'assetId')) {
      issues.push(
        issue(
          'TRANSFER_HAS_ASSET_ID',
          at('assetId'),
          'A transfer uses sourceAssetId and destinationAssetId, not assetId.',
        ),
      );
    }
    if (value.paymentMethod !== undefined) {
      checkNonBlank(issues, at('paymentMethod'), value.paymentMethod);
    }
  }
  return issues;
}

/** Intrinsic validation of a Transaction (no lookups needed). */
export function validateTransaction(tx: Transaction): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  checkId(issues, 'id', tx.id);
  checkDate(issues, 'date', tx.date);
  checkTimestampPair(issues, tx.createdAt, tx.updatedAt);
  if (tx.sourceWishlistItemId !== undefined) {
    checkId(issues, 'sourceWishlistItemId', tx.sourceWishlistItemId);
  }
  if (tx.recurringRuleId !== undefined) {
    checkId(issues, 'recurringRuleId', tx.recurringRuleId);
  }
  issues.push(...validateTransactionCore(tx));
  return issues;
}

export interface TransactionReferences {
  readonly assets: AssetLookup;
  readonly categories: CategoryLookup;
}

/**
 * Cross-entity rules: referenced assets and category must exist, and an
 * income/expense's category type must match the transaction type.
 * Accepts a Transaction or a RecurringRule template.
 */
export function validateTransactionReferences(
  value: TransactionTemplate,
  refs: TransactionReferences,
  prefix = '',
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const at = (field: string) => `${prefix}${field}`;

  if (value.type === 'income' || value.type === 'expense') {
    if (!refs.assets(value.assetId)) {
      issues.push(
        issue('ASSET_NOT_FOUND', at('assetId'), 'Asset does not exist.'),
      );
    }
    const category = refs.categories(value.categoryId);
    if (!category) {
      issues.push(
        issue(
          'CATEGORY_NOT_FOUND',
          at('categoryId'),
          'Category does not exist.',
        ),
      );
    } else if (category.type !== value.type) {
      issues.push(
        issue(
          'CATEGORY_TYPE_MISMATCH',
          at('categoryId'),
          `A ${value.type} needs a ${value.type} category, but this one is ${category.type}.`,
        ),
      );
    }
  } else if (value.type === 'transfer') {
    if (!refs.assets(value.sourceAssetId)) {
      issues.push(
        issue(
          'ASSET_NOT_FOUND',
          at('sourceAssetId'),
          'Source asset does not exist.',
        ),
      );
    }
    if (!refs.assets(value.destinationAssetId)) {
      issues.push(
        issue(
          'ASSET_NOT_FOUND',
          at('destinationAssetId'),
          'Destination asset does not exist.',
        ),
      );
    }
  }
  return issues;
}
