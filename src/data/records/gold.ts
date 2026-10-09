import { asCalendarDate, asId, asMoney, asTimestamp } from '../../domain';
import {
  validateGoldHoldingRecord,
  validateGoldPriceRecord,
} from '../../domain';
import type { GoldHoldingRecord, GoldPriceRecord } from '../../domain';
import { assertValid } from './validate';
import { requireNumber } from './codec';

export interface GoldPriceStorageRecord {
  id: string;
  karat: number;
  pricePerGram: number;
  effectiveDate: string;
  createdAt: string;
}

export interface GoldHoldingStorageRecord {
  id: string;
  assetId: string;
  weightGrams: number;
  startDate: string;
  endDate?: string;
  createdAt: string;
}

export function toGoldPriceRecord(
  price: GoldPriceRecord,
): GoldPriceStorageRecord {
  return {
    id: price.id,
    karat: price.karat,
    pricePerGram: price.pricePerGram,
    effectiveDate: price.effectiveDate,
    createdAt: price.createdAt,
  };
}

export function fromGoldPriceRecord(
  record: GoldPriceStorageRecord,
): GoldPriceRecord {
  const value: GoldPriceRecord = {
    id: asId<'GoldPriceRecord'>(record.id),
    karat: requireNumber(record.karat, 'karat'),
    pricePerGram: asMoney(record.pricePerGram),
    effectiveDate: asCalendarDate(record.effectiveDate),
    createdAt: asTimestamp(record.createdAt),
  };
  return assertValid('GoldPriceRecord', value, validateGoldPriceRecord);
}

export function toGoldHoldingRecord(
  holding: GoldHoldingRecord,
): GoldHoldingStorageRecord {
  return {
    id: holding.id,
    assetId: holding.assetId,
    weightGrams: holding.weightGrams,
    startDate: holding.startDate,
    ...(holding.endDate !== undefined ? { endDate: holding.endDate } : {}),
    createdAt: holding.createdAt,
  };
}

export function fromGoldHoldingRecord(
  record: GoldHoldingStorageRecord,
): GoldHoldingRecord {
  const value: GoldHoldingRecord = {
    id: asId<'GoldHoldingRecord'>(record.id),
    assetId: asId<'Asset'>(record.assetId),
    weightGrams: requireNumber(record.weightGrams, 'weightGrams'),
    startDate: asCalendarDate(record.startDate),
    ...(record.endDate !== undefined
      ? { endDate: asCalendarDate(record.endDate) }
      : {}),
    createdAt: asTimestamp(record.createdAt),
  };
  return assertValid('GoldHoldingRecord', value, validateGoldHoldingRecord);
}
