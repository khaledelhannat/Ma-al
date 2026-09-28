/**
 * Every rule violation carries a stable machine-readable code (so tests and
 * future UI can react to it) plus a human-readable English message.
 */
export type ValidationCode =
  // value-level
  | 'INVALID_ID'
  | 'INVALID_MONEY'
  | 'AMOUNT_NOT_POSITIVE'
  | 'INVALID_DATE'
  | 'INVALID_MONTH'
  | 'INVALID_TIMESTAMP'
  | 'TIMESTAMPS_OUT_OF_ORDER'
  | 'INVALID_ENUM_VALUE'
  | 'INVALID_BOOLEAN'
  | 'BLANK_TEXT'
  // interval
  | 'DATE_RANGE_INVALID'
  // transaction
  | 'TRANSFER_SAME_ASSET'
  | 'TRANSFER_HAS_CATEGORY'
  | 'TRANSFER_HAS_ASSET_ID'
  | 'TRANSACTION_HAS_TRANSFER_FIELDS'
  // category
  | 'CATEGORY_SELF_PARENT'
  // gold
  | 'INVALID_KARAT'
  | 'GOLD_DATA_ON_NON_GOLD_ASSET'
  | 'INVALID_GOLD_WEIGHT'
  | 'INVALID_GOLD_PRICE'
  | 'ASSET_NOT_GOLD'
  // references
  | 'ASSET_NOT_FOUND'
  | 'CATEGORY_NOT_FOUND'
  | 'CATEGORY_TYPE_MISMATCH'
  | 'GOAL_NOT_FOUND'
  // collections
  | 'DUPLICATE_BUDGET'
  | 'OVERLAPPING_GOLD_HOLDINGS';

export interface ValidationIssue {
  readonly code: ValidationCode;
  /** Dotted path of the offending field, e.g. `transactionTemplate.amount`. */
  readonly path: string;
  readonly message: string;
}

export function issue(
  code: ValidationCode,
  path: string,
  message: string,
): ValidationIssue {
  return { code, path, message };
}
