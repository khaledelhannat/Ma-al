import type { Asset, AssetId, AssetType, Liquidity } from '../../domain';
import type { AppDatabase } from '../db';
import { guard } from '../errors';
import { fromAssetRecord, toAssetRecord } from '../records';
import { createEntityStore } from './entity-store';
import { assertUnreferenced, countByCompoundPrefix } from './reference-guard';

/**
 * Assets own no balance (it is derived from the ledger by the engine), so the
 * repository stores only the Step 0 fields. Deleting an asset that still has
 * ledger history would corrupt every derived balance, hence the guarded
 * delete only.
 */
export interface AssetRepository {
  get(id: AssetId): Promise<Asset | undefined>;
  add(asset: Asset): Promise<void>;
  put(asset: Asset): Promise<void>;
  addMany(assets: readonly Asset[]): Promise<void>;
  putMany(assets: readonly Asset[]): Promise<void>;
  list(): Promise<Asset[]>;
  listByType(type: AssetType): Promise<Asset[]>;
  listByLiquidity(liquidity: Liquidity): Promise<Asset[]>;
  /**
   * Deletes only an asset with no Transactions (either side of a transfer),
   * Allocations, GoldHoldingRecords or RecurringRule templates; otherwise
   * throws ReferencedRecordError.
   */
  deleteIfUnreferenced(id: AssetId): Promise<void>;
}

export function createAssetRepository(db: AppDatabase): AssetRepository {
  const entity = 'Asset';
  const table = db.assets;
  const store = createEntityStore({
    entity,
    db,
    table,
    toRecord: toAssetRecord,
    fromRecord: fromAssetRecord,
  });

  return {
    get: store.get,
    add: store.add,
    put: store.put,
    addMany: store.addMany,
    putMany: store.putMany,
    list: store.list,
    async listByType(type) {
      return store.decodeAll(
        await guard(entity, () => table.where('type').equals(type).toArray()),
      );
    },
    async listByLiquidity(liquidity) {
      return store.decodeAll(
        await guard(entity, () =>
          table.where('liquidity').equals(liquidity).toArray(),
        ),
      );
    },
    async deleteIfUnreferenced(id) {
      await guard(entity, () =>
        db.transaction(
          'rw',
          [
            db.assets,
            db.transactions,
            db.allocations,
            db.goldHoldingRecords,
            db.recurringRules,
          ],
          async () => {
            await assertUnreferenced(entity, id, [
              {
                label: 'transactions',
                count: () =>
                  db.transactions.where('assetIds').equals(id).count(),
              },
              {
                label: 'allocations',
                count: () =>
                  countByCompoundPrefix(
                    db.allocations,
                    '[assetId+startDate]',
                    id,
                  ),
              },
              {
                label: 'gold holdings',
                count: () =>
                  countByCompoundPrefix(
                    db.goldHoldingRecords,
                    '[assetId+startDate]',
                    id,
                  ),
              },
              {
                label: 'recurring rules',
                count: () =>
                  db.recurringRules
                    .filter((rule) => {
                      const t = rule.transactionTemplate;
                      return t.type === 'transfer'
                        ? t.sourceAssetId === id || t.destinationAssetId === id
                        : t.assetId === id;
                    })
                    .count(),
              },
            ]);
            await table.delete(id);
          },
        ),
      );
    },
  };
}
