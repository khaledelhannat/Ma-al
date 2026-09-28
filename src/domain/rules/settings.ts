import { START_PAGES } from '../entities/settings';
import type { Settings } from '../entities/settings';
import { checkEnum } from './checks';
import type { ValidationIssue } from './issue';

export function validateSettings(settings: Settings): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  checkEnum(issues, 'baseCurrency', ['EGP'], settings.baseCurrency);
  checkEnum(
    issues,
    'defaultViews.startPage',
    START_PAGES,
    settings.defaultViews.startPage,
  );
  return issues;
}
