import { CATEGORY_TYPES } from '../entities/category';
import type { Category } from '../entities/category';
import {
  checkBoolean,
  checkEnum,
  checkId,
  checkNonBlank,
  checkTimestamp,
} from './checks';
import { issue } from './issue';
import type { ValidationIssue } from './issue';

export function validateCategory(category: Category): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  checkId(issues, 'id', category.id);
  checkNonBlank(issues, 'name', category.name);
  checkEnum(issues, 'type', CATEGORY_TYPES, category.type);
  checkBoolean(issues, 'essential', category.essential);
  checkBoolean(issues, 'archived', category.archived);
  checkTimestamp(issues, 'createdAt', category.createdAt);
  if (category.parentId !== undefined) {
    checkId(issues, 'parentId', category.parentId);
    if (category.parentId === category.id) {
      issues.push(
        issue(
          'CATEGORY_SELF_PARENT',
          'parentId',
          'A category cannot be its own parent.',
        ),
      );
    }
  }
  return issues;
}
