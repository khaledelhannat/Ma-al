import { asCalendarDate, asId, asMoney, asTimestamp } from '../../domain';
import type { Allocation } from '../../domain';

export interface AllocationRecord {
  id: string;
  assetId: string;
  amount: number;
  goalId?: string;
  reason: string;
  startDate: string;
  endDate?: string;
  createdAt: string;
}

export function toAllocationRecord(allocation: Allocation): AllocationRecord {
  return {
    id: allocation.id,
    assetId: allocation.assetId,
    amount: allocation.amount,
    ...(allocation.goalId !== undefined ? { goalId: allocation.goalId } : {}),
    reason: allocation.reason,
    startDate: allocation.startDate,
    ...(allocation.endDate !== undefined
      ? { endDate: allocation.endDate }
      : {}),
    createdAt: allocation.createdAt,
  };
}

export function fromAllocationRecord(record: AllocationRecord): Allocation {
  return {
    id: asId<'Allocation'>(record.id),
    assetId: asId<'Asset'>(record.assetId),
    amount: asMoney(record.amount),
    ...(record.goalId !== undefined
      ? { goalId: asId<'Goal'>(record.goalId) }
      : {}),
    reason: record.reason,
    startDate: asCalendarDate(record.startDate),
    ...(record.endDate !== undefined
      ? { endDate: asCalendarDate(record.endDate) }
      : {}),
    createdAt: asTimestamp(record.createdAt),
  };
}
