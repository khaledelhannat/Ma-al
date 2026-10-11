import { CATEGORY_TYPES, asId, asTimestamp } from '../../domain';
import { validateCategory } from '../../domain';
import type { Category } from '../../domain';
import { fromFlag, requireEnum, toFlag } from './codec';
import type { Flag } from './codec';
import { assertValid } from './validate';

export interface CategoryRecord {
  id: string;
  name: string;
  type: string;
  parentId?: string;
  essential: boolean;
  /** 0/1 so it can be indexed (IndexedDB cannot index booleans). */
  archived: Flag;
  createdAt: string;
}

export function toCategoryRecord(category: Category): CategoryRecord {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    ...(category.parentId !== undefined ? { parentId: category.parentId } : {}),
    essential: category.essential,
    archived: toFlag(category.archived),
    createdAt: category.createdAt,
  };
}

export function fromCategoryRecord(record: CategoryRecord): Category {
  const value: Category = {
    id: asId<'Category'>(record.id),
    name: record.name,
    type: requireEnum(CATEGORY_TYPES, record.type, 'type'),
    ...(record.parentId !== undefined
      ? { parentId: asId<'Category'>(record.parentId) }
      : {}),
    essential: record.essential,
    archived: fromFlag(record.archived, 'archived'),
    createdAt: asTimestamp(record.createdAt),
  };
  return assertValid('Category', value, validateCategory);
}
