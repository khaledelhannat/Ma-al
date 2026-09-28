import { PRIORITIES } from '../entities/goal';
import type { Goal } from '../entities/goal';
import {
  checkDate,
  checkEnum,
  checkId,
  checkNonBlank,
  checkPositiveMoney,
  checkTimestamp,
} from './checks';
import type { ValidationIssue } from './issue';

export function validateGoal(goal: Goal): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  checkId(issues, 'id', goal.id);
  checkNonBlank(issues, 'name', goal.name);
  checkPositiveMoney(issues, 'targetAmount', goal.targetAmount);
  checkDate(issues, 'deadline', goal.deadline);
  checkEnum(issues, 'priority', PRIORITIES, goal.priority);
  checkTimestamp(issues, 'createdAt', goal.createdAt);
  return issues;
}
