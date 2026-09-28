import type { AssetId } from './asset';
import type { Karat } from './asset';
import type { CalendarDate, Id, Money, Timestamp } from '../values';

export type GoldPriceRecordId = Id<'GoldPriceRecord'>;
export type GoldHoldingRecordId = Id<'GoldHoldingRecord'>;

/**
 * A historical price observation (manual entry in the MVP). Never a single
 * mutable "current price": the engine picks the record applicable to the
 * karat and date being valued.
 */
export interface GoldPriceRecord {
  readonly id: GoldPriceRecordId;
  readonly karat: Karat;
  /** EGP per gram, in piastres (see Money). */
  readonly pricePerGram: Money;
  readonly effectiveDate: CalendarDate;
  readonly createdAt: Timestamp;
}

/**
 * A recorded ownership state for a gold asset over [startDate, endDate).
 * A weight change closes the previous record (sets endDate) and opens a new
 * one; history is never overwritten. Not a Transaction.
 */
export interface GoldHoldingRecord {
  readonly id: GoldHoldingRecordId;
  readonly assetId: AssetId;
  /** Weight in grams; fractional grams are expected. Zero is allowed. */
  readonly weightGrams: number;
  readonly startDate: CalendarDate;
  readonly endDate?: CalendarDate;
  readonly createdAt: Timestamp;
}
