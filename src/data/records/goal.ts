import {
  PRIORITIES,
  asCalendarDate,
  asId,
  asMoney,
  asTimestamp,
} from '../../domain';
import { validateGoal } from '../../domain';
import type { Goal } from '../../domain';
import { requireEnum, requireString } from './codec';
import { assertValid } from './validate';

export interface GoalRecord {
  id: string;
  name: string;
  targetAmount: number;
  deadline: string;
  priority: string;
  notes: string;
  createdAt: string;
}

export function toGoalRecord(goal: Goal): GoalRecord {
  return {
    id: goal.id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    deadline: goal.deadline,
    priority: goal.priority,
    notes: goal.notes,
    createdAt: goal.createdAt,
  };
}

export function fromGoalRecord(record: GoalRecord): Goal {
  const value: Goal = {
    id: asId<'Goal'>(record.id),
    name: record.name,
    targetAmount: asMoney(record.targetAmount),
    deadline: asCalendarDate(record.deadline),
    priority: requireEnum(PRIORITIES, record.priority, 'priority'),
    notes: requireString(record.notes, 'notes'),
    createdAt: asTimestamp(record.createdAt),
  };
  return assertValid('Goal', value, validateGoal);
}
