import type { CategoryId } from './category';
import type { Priority } from './goal';
import type { CalendarDate, Id, Money } from '../values';

export type WishlistItemId = Id<'WishlistItem'>;

export const WISHLIST_STATUSES = ['pending', 'purchased'] as const;
export type WishlistStatus = (typeof WISHLIST_STATUSES)[number];

/**
 * Independent of Goal. A purchase later produces exactly one Transaction
 * that back-references this item via sourceWishlistItemId; that behavior is
 * not part of this contract.
 */
export interface WishlistItem {
  readonly id: WishlistItemId;
  readonly name: string;
  readonly estimatedPrice: Money;
  readonly priority: Priority;
  readonly categoryId?: CategoryId;
  readonly targetDate: CalendarDate;
  readonly dateAdded: CalendarDate;
  readonly notes: string;
  readonly status: WishlistStatus;
}
