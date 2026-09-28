import type { AssetId } from './asset';
import type { GoalId } from './goal';
import type { CalendarDate, Id, Money, Timestamp } from '../values';

export type AllocationId = Id<'Allocation'>;

/**
 * Money on an asset that is earmarked and therefore not spendable.
 * Active over [startDate, endDate): active on startDate, inactive on
 * endDate. Changing/moving/releasing closes this record and opens a new
 * one; history is never mutated. A goal is optional: an allocation may
 * exist for any meaningful `reason` (emergency reserve, tax reserve, ...).
 * Goal funding is derived from allocations, never edited directly.
 */
export interface Allocation {
  readonly id: AllocationId;
  readonly assetId: AssetId;
  readonly amount: Money;
  readonly goalId?: GoalId;
  readonly reason: string;
  readonly startDate: CalendarDate;
  readonly endDate?: CalendarDate;
  readonly createdAt: Timestamp;
}
