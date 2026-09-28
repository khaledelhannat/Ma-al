import type { CalendarDate, Id, Money, Timestamp } from '../values';

export type GoalId = Id<'Goal'>;

export const PRIORITIES = ['low', 'medium', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];

/**
 * Stored state of a Goal only. fundedAmount, progress, pace, required
 * monthly contribution and projected completion are DERIVED by the
 * Financial Engine from Allocations and must never be stored here.
 */
export interface Goal {
  readonly id: GoalId;
  readonly name: string;
  readonly targetAmount: Money;
  readonly deadline: CalendarDate;
  readonly priority: Priority;
  readonly notes: string;
  readonly createdAt: Timestamp;
}

/**
 * Derived (never stored on Goal): the engine-computed status of a goal.
 * Exists as a value type so derived outputs, such as a snapshot's goal
 * summary, can refer to it.
 */
export const GOAL_STATUSES = [
  'onTrack',
  'needsAttention',
  'offTrack',
  'fullyFunded',
  'overdue',
] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];
