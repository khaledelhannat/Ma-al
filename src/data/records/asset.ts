import {
  ASSET_TYPES,
  LIQUIDITIES,
  asCalendarDate,
  asId,
  asMoney,
  asTimestamp,
} from '../../domain';
import type { Asset } from '../../domain';
import { requireDefined, requireEnum, requireNumber } from './codec';

export interface AssetRecord {
  id: string;
  name: string;
  type: string;
  liquidity: string;
  openingBalance: number;
  openingBalanceDate: string;
  createdAt: string;
  updatedAt: string;
  karat?: number;
}

export function toAssetRecord(asset: Asset): AssetRecord {
  return {
    id: asset.id,
    name: asset.name,
    type: asset.type,
    liquidity: asset.liquidity,
    openingBalance: asset.openingBalance,
    openingBalanceDate: asset.openingBalanceDate,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    ...(asset.type === 'gold' ? { karat: asset.karat } : {}),
  };
}

export function fromAssetRecord(record: AssetRecord): Asset {
  const type = requireEnum(ASSET_TYPES, record.type, 'type');
  const base = {
    id: asId<'Asset'>(record.id),
    name: record.name,
    liquidity: requireEnum(LIQUIDITIES, record.liquidity, 'liquidity'),
    openingBalance: asMoney(record.openingBalance),
    openingBalanceDate: asCalendarDate(record.openingBalanceDate),
    createdAt: asTimestamp(record.createdAt),
    updatedAt: asTimestamp(record.updatedAt),
  };
  if (type === 'gold') {
    return {
      ...base,
      type,
      karat: requireNumber(requireDefined(record.karat, 'karat'), 'karat'),
    };
  }
  return { ...base, type };
}
