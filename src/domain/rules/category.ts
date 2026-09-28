import { CATEGORY_TYPES } from '../entities/category';
import type { Category, CategoryId } from '../entities/category';
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

/**
 * Collection rule: the category hierarchy is a forest (any number of
 * independent trees), never a cyclic graph. Reports one issue for every
 * category that lies on a parent cycle: A -> A, A -> B -> A, A -> B -> C -> A.
 *
 * A category that merely descends from a cycle is not itself on it and is
 * not reported; fixing the cycle fixes it too. A parent that is not in the
 * collection simply ends the chain (existence of the parent is a separate
 * concern). `validateCategory` still reports the single-record
 * CATEGORY_SELF_PARENT; this rule also covers it so it holds for a
 * collection on its own.
 */
export function validateCategoryHierarchy(
  categories: readonly Category[],
): ValidationIssue[] {
  const parentOf = new Map<CategoryId, CategoryId | undefined>();
  for (const category of categories) {
    parentOf.set(category.id, category.parentId);
  }

  const issues: ValidationIssue[] = [];
  for (const category of categories) {
    if (isOnParentCycle(category.id, parentOf)) {
      issues.push(
        issue(
          'CATEGORY_CYCLE',
          'parentId',
          `Category ${category.id} is part of a parent cycle.`,
        ),
      );
    }
  }
  return issues;
}

/** Walks up from `start`; true if the walk comes back to `start`. */
function isOnParentCycle(
  start: CategoryId,
  parentOf: ReadonlyMap<CategoryId, CategoryId | undefined>,
): boolean {
  const seen = new Set<CategoryId>();
  let current = parentOf.get(start);
  while (current !== undefined) {
    if (current === start) return true;
    // Entered a cycle that does not include `start`: stop, not on it.
    if (seen.has(current)) return false;
    seen.add(current);
    current = parentOf.get(current);
  }
  return false;
}
