import {
  PRIORITIES,
  WISHLIST_STATUSES,
  asCalendarDate,
  asId,
  asMoney,
} from '../../domain';
import { validateWishlistItem } from '../../domain';
import type { WishlistItem } from '../../domain';
import { requireEnum, requireString } from './codec';
import { assertValid } from './validate';

export interface WishlistItemRecord {
  id: string;
  name: string;
  estimatedPrice: number;
  priority: string;
  categoryId?: string;
  targetDate: string;
  dateAdded: string;
  notes: string;
  status: string;
}

export function toWishlistItemRecord(item: WishlistItem): WishlistItemRecord {
  return {
    id: item.id,
    name: item.name,
    estimatedPrice: item.estimatedPrice,
    priority: item.priority,
    ...(item.categoryId !== undefined ? { categoryId: item.categoryId } : {}),
    targetDate: item.targetDate,
    dateAdded: item.dateAdded,
    notes: item.notes,
    status: item.status,
  };
}

export function fromWishlistItemRecord(
  record: WishlistItemRecord,
): WishlistItem {
  const value: WishlistItem = {
    id: asId<'WishlistItem'>(record.id),
    name: record.name,
    estimatedPrice: asMoney(record.estimatedPrice),
    priority: requireEnum(PRIORITIES, record.priority, 'priority'),
    ...(record.categoryId !== undefined
      ? { categoryId: asId<'Category'>(record.categoryId) }
      : {}),
    targetDate: asCalendarDate(record.targetDate),
    dateAdded: asCalendarDate(record.dateAdded),
    notes: requireString(record.notes, 'notes'),
    status: requireEnum(WISHLIST_STATUSES, record.status, 'status'),
  };
  return assertValid('WishlistItem', value, validateWishlistItem);
}
