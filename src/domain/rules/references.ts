import type { Asset, AssetId } from '../entities/asset';
import type { Category, CategoryId } from '../entities/category';
import type { Goal, GoalId } from '../entities/goal';

/**
 * Cross-entity rules need to look other records up. The domain stays
 * independent of storage by taking plain lookup functions; Step 3 will
 * supply implementations backed by persistence, tests supply in-memory ones.
 */
export type AssetLookup = (id: AssetId) => Asset | undefined;
export type CategoryLookup = (id: CategoryId) => Category | undefined;
export type GoalLookup = (id: GoalId) => Goal | undefined;
