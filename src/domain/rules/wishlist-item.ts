import { WISHLIST_STATUSES } from '../entities/wishlist-item';
import type { WishlistItem } from '../entities/wishlist-item';
import { PRIORITIES } from '../entities/goal';
import {
  checkDate,
  checkEnum,
  checkId,
  checkNonBlank,
  checkPositiveMoney,
} from './checks';
import { issue } from './issue';
import type { ValidationIssue } from './issue';
import type { CategoryLookup } from './references';

export function validateWishlistItem(item: WishlistItem): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  checkId(issues, 'id', item.id);
  checkNonBlank(issues, 'name', item.name);
  checkPositiveMoney(issues, 'estimatedPrice', item.estimatedPrice);
  checkEnum(issues, 'priority', PRIORITIES, item.priority);
  if (item.categoryId !== undefined) {
    checkId(issues, 'categoryId', item.categoryId);
  }
  checkDate(issues, 'targetDate', item.targetDate);
  checkDate(issues, 'dateAdded', item.dateAdded);
  checkEnum(issues, 'status', WISHLIST_STATUSES, item.status);
  return issues;
}

export function validateWishlistItemReferences(
  item: WishlistItem,
  refs: { readonly categories: CategoryLookup },
): ValidationIssue[] {
  if (item.categoryId !== undefined && !refs.categories(item.categoryId)) {
    return [
      issue('CATEGORY_NOT_FOUND', 'categoryId', 'Category does not exist.'),
    ];
  }
  return [];
}
