/**
 * Dexie schema, version 1. Primary key first; `&` = unique, `*` = multiEntry,
 * `[a+b]` = compound. Only fields with a real access path are indexed.
 *
 * IndexedDB facts that shape these definitions:
 *  - Records whose indexed value is absent/null are simply left out of that
 *    index, so optional fields (goalId, recurringRuleId, ...) give small,
 *    sparse indexes for free.
 *  - Booleans are not valid keys, so indexed flags are stored as 0/1.
 *  - `endDate` is deliberately NOT indexed: it is absent on open records, and
 *    as-of-date queries use `startDate <= date` followed by the domain's
 *    `isActiveOn` ([startDate, endDate) rule).
 *
 * Versioning: this is the first released schema. To change it, ADD a
 * `version(n+1)` in `db.ts` that lists only the changed stores (plus an
 * `.upgrade()` when data must be rewritten); never edit a released version.
 */
export const SCHEMA_VERSION = 1;

export const SCHEMA_V1 = {
  // date ranges; type+date; category+date (budget actuals, reference check);
  // assetId (income/expense) + sourceAssetId/destinationAssetId (transfer) =
  // the canonical asset references, each a sparse index; there is no derived
  // copy to drift out of sync;
  // recurringRule+date = generated occurrences; wishlist back-reference.
  transactions:
    'id, date, [type+date], [categoryId+date], assetId, sourceAssetId, destinationAssetId, [recurringRuleId+date], sourceWishlistItemId',
  categories: 'id, type, parentId, archived',
  assets: 'id, type, liquidity',
  goldPriceRecords: 'id, [karat+effectiveDate], effectiveDate',
  goldHoldingRecords: 'id, [assetId+startDate], startDate',
  allocations: 'id, [assetId+startDate], [goalId+startDate], startDate',
  goals: 'id, deadline, priority',
  wishlistItems: 'id, status, targetDate, priority, categoryId',
  // Step 0: one budget per category per month -> unique compound index.
  budgets: 'id, &[categoryId+month], month',
  // Step 0: at most one snapshot per month -> unique index.
  monthlySnapshots: 'id, &month, dirty',
  recurringRules: 'id, active, [active+nextRunDate]',
  settings: 'key',
} as const;
