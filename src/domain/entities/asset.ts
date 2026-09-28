import type { CalendarDate, Id, Money, Timestamp } from '../values';

export type AssetId = Id<'Asset'>;

export const ASSET_TYPES = [
  'cash',
  'bank',
  'savings',
  'gold',
  'other',
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];
export type NonGoldAssetType = Exclude<AssetType, 'gold'>;

export const LIQUIDITIES = ['liquid', 'nonLiquid'] as const;
export type Liquidity = (typeof LIQUIDITIES)[number];

/** MVP defaults; liquidity is still a stored, explicit field on each Asset. */
export const DEFAULT_LIQUIDITY: Readonly<Record<AssetType, Liquidity>> = {
  cash: 'liquid',
  bank: 'liquid',
  savings: 'liquid',
  gold: 'nonLiquid',
  other: 'nonLiquid',
};

/** Gold purity in karats (1-24), e.g. 24, 21, 18. */
export type Karat = number;

interface AssetBase {
  readonly id: AssetId;
  readonly name: string;
  readonly liquidity: Liquidity;
  /**
   * Balance at the start of `openingBalanceDate`. Only Transactions dated on
   * or after that day affect the derived balance. There is deliberately NO
   * mutable current-balance field: current value is derived by the Financial
   * Engine from the Transaction ledger (or, for gold, from holdings x price).
   * For gold assets, value comes from GoldHoldingRecord x GoldPriceRecord;
   * the engine must not use openingBalance for them.
   */
  readonly openingBalance: Money;
  readonly openingBalanceDate: CalendarDate;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface NonGoldAsset extends AssetBase {
  readonly type: NonGoldAssetType;
  /** Gold-only data cannot exist on a non-gold asset. */
  readonly karat?: never;
}

export interface GoldAsset extends AssetBase {
  readonly type: 'gold';
  readonly karat: Karat;
}

export type Asset = NonGoldAsset | GoldAsset;
