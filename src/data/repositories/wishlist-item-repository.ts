import type {
  CategoryId,
  Priority,
  WishlistItem,
  WishlistItemId,
  WishlistStatus,
} from '../../domain';
import type { AppDatabase } from '../db';
import { guard } from '../errors';
import { fromWishlistItemRecord, toWishlistItemRecord } from '../records';
import { createEntityStore } from './entity-store';
import { lowerKey, upperKey } from './ranges';
import type { DateRange } from './ranges';

/**
 * Wishlist items are independent of Goals. Deleting one is always allowed: a
 * purchase Transaction keeps its sourceWishlistItemId back-reference
 * permanently (Step 0 rule 6), so nothing is cascaded. The purchase workflow
 * itself belongs to a later step.
 */
export interface WishlistItemRepository {
  get(id: WishlistItemId): Promise<WishlistItem | undefined>;
  add(item: WishlistItem): Promise<void>;
  put(item: WishlistItem): Promise<void>;
  addMany(items: readonly WishlistItem[]): Promise<void>;
  putMany(items: readonly WishlistItem[]): Promise<void>;
  delete(id: WishlistItemId): Promise<void>;
  /** Ordered by targetDate. */
  list(): Promise<WishlistItem[]>;
  listByStatus(status: WishlistStatus): Promise<WishlistItem[]>;
  listByPriority(priority: Priority): Promise<WishlistItem[]>;
  listByTargetDateRange(range: DateRange): Promise<WishlistItem[]>;
  listByCategory(categoryId: CategoryId): Promise<WishlistItem[]>;
}

export function createWishlistItemRepository(
  db: AppDatabase,
): WishlistItemRepository {
  const entity = 'WishlistItem';
  const table = db.wishlistItems;
  const store = createEntityStore({
    entity,
    db,
    table,
    toRecord: toWishlistItemRecord,
    fromRecord: fromWishlistItemRecord,
  });

  return {
    get: store.get,
    add: store.add,
    put: store.put,
    addMany: store.addMany,
    putMany: store.putMany,
    delete: store.remove,
    async list() {
      return store.decodeAll(
        await guard(entity, () => table.orderBy('targetDate').toArray()),
      );
    },
    async listByStatus(status) {
      return store.decodeAll(
        await guard(entity, () =>
          table.where('status').equals(status).sortBy('targetDate'),
        ),
      );
    },
    async listByPriority(priority) {
      return store.decodeAll(
        await guard(entity, () =>
          table.where('priority').equals(priority).sortBy('targetDate'),
        ),
      );
    },
    async listByTargetDateRange(range) {
      return store.decodeAll(
        await guard(entity, () =>
          table
            .where('targetDate')
            .between(lowerKey(range.from), upperKey(range.to), true, true)
            .toArray(),
        ),
      );
    },
    async listByCategory(categoryId) {
      return store.decodeAll(
        await guard(entity, () =>
          table.where('categoryId').equals(categoryId).sortBy('targetDate'),
        ),
      );
    },
  };
}
