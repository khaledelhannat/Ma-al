import type { ValidationIssue } from '../rules';

export function codes(issues: readonly ValidationIssue[]) {
  return issues.map((entry) => entry.code);
}
