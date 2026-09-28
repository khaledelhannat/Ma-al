import {
  compareCalendarDates,
  isCalendarDate,
  isId,
  isMoney,
  isMonth,
  isOneOf,
  isTimestamp,
} from '../values';
import { issue } from './issue';
import type { ValidationIssue } from './issue';

/**
 * Small reusable field checks. They accept `unknown` on purpose: types say
 * what a value should be, but data from import or storage is untrusted, so
 * the runtime rules must not depend on the compiler having been right.
 */

export function checkId(
  issues: ValidationIssue[],
  path: string,
  value: unknown,
) {
  if (!isId(value)) {
    issues.push(issue('INVALID_ID', path, `${path} must be a UUID id.`));
  }
}

export function checkMoney(
  issues: ValidationIssue[],
  path: string,
  value: unknown,
) {
  if (!isMoney(value)) {
    issues.push(
      issue(
        'INVALID_MONEY',
        path,
        `${path} must be a whole number of piastres.`,
      ),
    );
  }
}

export function checkPositiveMoney(
  issues: ValidationIssue[],
  path: string,
  value: unknown,
) {
  if (!isMoney(value)) {
    issues.push(
      issue(
        'INVALID_MONEY',
        path,
        `${path} must be a whole number of piastres.`,
      ),
    );
  } else if (value <= 0) {
    issues.push(
      issue('AMOUNT_NOT_POSITIVE', path, `${path} must be greater than zero.`),
    );
  }
}

export function checkNonBlank(
  issues: ValidationIssue[],
  path: string,
  value: unknown,
) {
  if (typeof value !== 'string' || value.trim() === '') {
    issues.push(issue('BLANK_TEXT', path, `${path} must not be blank.`));
  }
}

export function checkBoolean(
  issues: ValidationIssue[],
  path: string,
  value: unknown,
) {
  if (typeof value !== 'boolean') {
    issues.push(
      issue('INVALID_BOOLEAN', path, `${path} must be true or false.`),
    );
  }
}

export function checkDate(
  issues: ValidationIssue[],
  path: string,
  value: unknown,
) {
  if (!isCalendarDate(value)) {
    issues.push(
      issue('INVALID_DATE', path, `${path} must be a real date (YYYY-MM-DD).`),
    );
  }
}

export function checkMonth(
  issues: ValidationIssue[],
  path: string,
  value: unknown,
) {
  if (!isMonth(value)) {
    issues.push(
      issue('INVALID_MONTH', path, `${path} must be a month (YYYY-MM).`),
    );
  }
}

export function checkTimestamp(
  issues: ValidationIssue[],
  path: string,
  value: unknown,
) {
  if (!isTimestamp(value)) {
    issues.push(
      issue(
        'INVALID_TIMESTAMP',
        path,
        `${path} must be a canonical UTC ISO 8601 timestamp.`,
      ),
    );
  }
}

export function checkEnum<const T extends readonly string[]>(
  issues: ValidationIssue[],
  path: string,
  allowed: T,
  value: unknown,
) {
  if (!isOneOf(allowed, value)) {
    issues.push(
      issue(
        'INVALID_ENUM_VALUE',
        path,
        `${path} must be one of: ${allowed.join(', ')}.`,
      ),
    );
  }
}

/** createdAt and updatedAt must be valid, and updatedAt must not precede createdAt. */
export function checkTimestampPair(
  issues: ValidationIssue[],
  createdAt: unknown,
  updatedAt: unknown,
) {
  checkTimestamp(issues, 'createdAt', createdAt);
  checkTimestamp(issues, 'updatedAt', updatedAt);
  if (
    isTimestamp(createdAt) &&
    isTimestamp(updatedAt) &&
    updatedAt < createdAt
  ) {
    issues.push(
      issue(
        'TIMESTAMPS_OUT_OF_ORDER',
        'updatedAt',
        'updatedAt must not be earlier than createdAt.',
      ),
    );
  }
}

/**
 * Validates a `[startDate, endDate)` pair: startDate is required and valid;
 * endDate, when present, must be valid and strictly after startDate.
 */
export function checkInterval(
  issues: ValidationIssue[],
  startDate: unknown,
  endDate: unknown,
) {
  checkDate(issues, 'startDate', startDate);
  if (endDate === undefined) return;
  checkDate(issues, 'endDate', endDate);
  if (
    isCalendarDate(startDate) &&
    isCalendarDate(endDate) &&
    compareCalendarDates(endDate, startDate) <= 0
  ) {
    issues.push(
      issue(
        'DATE_RANGE_INVALID',
        'endDate',
        'endDate must be after startDate.',
      ),
    );
  }
}

/** Gold purity in whole karats, 1-24. */
export function checkKarat(
  issues: ValidationIssue[],
  path: string,
  value: unknown,
) {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 24
  ) {
    issues.push(
      issue(
        'INVALID_KARAT',
        path,
        `${path} must be a whole number from 1 to 24.`,
      ),
    );
  }
}

/** True when `key` is present on `target` with a non-null, non-undefined value. */
export function hasValue(target: object, key: string): boolean {
  if (!Object.hasOwn(target, key)) return false;
  const value: unknown = Reflect.get(target, key);
  return value !== undefined && value !== null;
}
