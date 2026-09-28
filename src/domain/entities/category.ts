import type { Id, Timestamp } from '../values';

export type CategoryId = Id<'Category'>;

export const CATEGORY_TYPES = ['income', 'expense'] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

/**
 * Category is the sole owner of the category list (Settings never holds
 * categories). Once referenced by a Transaction, Budget or WishlistItem it
 * is archived, never hard-deleted.
 */
export interface Category {
  readonly id: CategoryId;
  readonly name: string;
  readonly type: CategoryType;
  readonly parentId?: CategoryId;
  readonly essential: boolean;
  readonly archived: boolean;
  readonly createdAt: Timestamp;
}
