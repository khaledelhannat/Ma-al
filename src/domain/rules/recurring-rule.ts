import { RECURRENCE_FREQUENCIES } from '../entities/recurring-rule';
import type { RecurringRule } from '../entities/recurring-rule';
import { checkBoolean, checkDate, checkEnum, checkId } from './checks';
import type { ValidationIssue } from './issue';
import type { TransactionReferences } from './transaction';
import {
  validateTransactionCore,
  validateTransactionReferences,
} from './transaction';

const TEMPLATE = 'transactionTemplate.';

export function validateRecurringRule(rule: RecurringRule): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  checkId(issues, 'id', rule.id);
  checkEnum(issues, 'frequency', RECURRENCE_FREQUENCIES, rule.frequency);
  checkDate(issues, 'nextRunDate', rule.nextRunDate);
  checkBoolean(issues, 'active', rule.active);
  issues.push(...validateTransactionCore(rule.transactionTemplate, TEMPLATE));
  return issues;
}

export function validateRecurringRuleReferences(
  rule: RecurringRule,
  refs: TransactionReferences,
): ValidationIssue[] {
  return validateTransactionReferences(
    rule.transactionTemplate,
    refs,
    TEMPLATE,
  );
}
